import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import OpenAI from "openai";
import sharp from "sharp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UXAnalysisResult {
  score: number;
  issues: UXIssue[];
  recommendations: UXRecommendation[];
  summary: string;
}

interface UXIssue {
  category: "layout" | "accessibility" | "conversion" | "mobile" | "performance";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  element?: string;
  impact: string;
  bounds?: { // Element position on screen
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshot?: string; // Base64 mini-screenshot of the specific issue
}

interface UXRecommendation {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  implementation: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  screenshot?: string; // Base64 mini-screenshot showing what to improve
}

export async function POST(request: Request) {
  try {
    const { url, userId } = await request.json();

    if (!url || !userId) {
      return NextResponse.json(
        { error: "URL and userId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create initial scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        user_id: userId,
        url: url,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanError) {
      console.error("Database error:", scanError);
      return NextResponse.json(
        { error: "Failed to create scan" },
        { status: 500 }
      );
    }

    // Perform the actual scan (this could be moved to a background job in production)
    try {
      const analysisResult = await performUXAnalysis(url);
      
      // Update scan with results
      const { error: updateError } = await supabase
        .from("scans")
        .update({
          status: "completed",
          score: analysisResult.score,
          issues_found: analysisResult.issues.length,
          recommendations_count: analysisResult.recommendations.length,
          summary: analysisResult.summary,

          completed_at: new Date().toISOString(),
        })
        .eq("id", scan.id);

      if (updateError) {
        console.error("Failed to update scan:", updateError);
      }

      // Store issues with validation
      if (analysisResult.issues.length > 0) {
        // Validate and sanitize issues before inserting
        const validCategories = ['layout', 'accessibility', 'conversion', 'mobile', 'performance'];
        const validSeverities = ['high', 'medium', 'low'];
        
        const validatedIssues = analysisResult.issues
          .map(issue => ({
            scan_id: scan.id,
            category: validCategories.includes(issue.category.toLowerCase().trim()) 
              ? issue.category.toLowerCase().trim() 
              : 'layout', // Default fallback
            severity: validSeverities.includes(issue.severity.toLowerCase().trim()) 
              ? issue.severity.toLowerCase().trim() 
              : 'medium', // Default fallback
            title: issue.title || 'UX Issue',
            description: issue.description || 'No description provided',
            element: issue.element || null,
            impact: issue.impact || 'Impact on user experience',
            screenshot: issue.screenshot || null,
            bounds_x: issue.bounds?.x || null,
            bounds_y: issue.bounds?.y || null,
            bounds_width: issue.bounds?.width || null,
            bounds_height: issue.bounds?.height || null,
          }))
          .filter(issue => issue.title && issue.description); // Only include issues with required fields

        if (validatedIssues.length > 0) {
          const { error: issuesError } = await supabase
            .from("ux_issues")
            .insert(validatedIssues);

          if (issuesError) {
            console.error("Failed to store issues:", issuesError);
          }
        }
      }

      // Store recommendations with validation
      if (analysisResult.recommendations.length > 0) {
        // Validate and sanitize recommendations before inserting
        const validPriorities = ['high', 'medium', 'low'];
        const validEfforts = ['low', 'medium', 'high'];
        
        const validatedRecommendations = analysisResult.recommendations
          .map(rec => ({
            scan_id: scan.id,
            priority: validPriorities.includes(rec.priority.toLowerCase().trim()) 
              ? rec.priority.toLowerCase().trim() 
              : 'medium', // Default fallback
            title: rec.title || 'UX Recommendation',
            description: rec.description || 'No description provided',
            implementation: rec.implementation || 'Implementation details not provided',
            expected_impact: rec.expectedImpact || 'Expected improvement in user experience',
            effort: validEfforts.includes(rec.effort.toLowerCase().trim()) 
              ? rec.effort.toLowerCase().trim() 
              : 'medium', // Default fallback
            screenshot: rec.screenshot || null,
          }))
          .filter(rec => rec.title && rec.description && rec.implementation); // Only include recs with required fields

        if (validatedRecommendations.length > 0) {
          const { error: recsError } = await supabase
            .from("recommendations")
            .insert(validatedRecommendations);

          if (recsError) {
            console.error("Failed to store recommendations:", recsError);
          }
        }
      }

      return NextResponse.json({
        id: scan.id,
        url: scan.url,
        status: "completed",
        score: analysisResult.score,
        issuesFound: analysisResult.issues.length,
        recommendations: analysisResult.recommendations.length,
        summary: analysisResult.summary,
      });

    } catch (analysisError) {
      console.error("Analysis failed:", analysisError);
      
      // Update scan status to failed
      await supabase
        .from("scans")
        .update({ status: "failed" })
        .eq("id", scan.id);

      return NextResponse.json({
        id: scan.id,
        status: "failed",
        error: "Analysis failed",
      });
    }

  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function performUXAnalysis(url: string): Promise<UXAnalysisResult> {
  let browser;
  
  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set longer timeouts and better defaults
    page.setDefaultTimeout(60000); // 60 seconds
    page.setDefaultNavigationTimeout(60000);
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`Starting scan of: ${url}`);
    
    // Navigate to the URL with multiple fallback strategies
    let pageLoaded = false;
    let screenshot: string | null = null;
    let pageData: any = null;
    
    try {
      // Try with networkidle2 first (preferred)
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 45000 
      });
      pageLoaded = true;
      console.log('Page loaded with networkidle2');
         } catch (error) {
       console.log('networkidle2 failed, trying domcontentloaded...', (error as Error).message);
      
      try {
        // Fallback to domcontentloaded
        await page.goto(url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
                 // Wait a bit for dynamic content
         await new Promise(resolve => setTimeout(resolve, 3000));
         pageLoaded = true;
         console.log('Page loaded with domcontentloaded');
       } catch (fallbackError) {
         console.log('domcontentloaded failed, trying basic load...', (fallbackError as Error).message);
        
        try {
          // Last resort - just basic load
          await page.goto(url, { 
            waitUntil: 'load', 
            timeout: 20000 
          });
                     pageLoaded = true;
           console.log('Page loaded with basic load');
         } catch (finalError) {
           throw new Error(`Failed to load page after multiple attempts: ${(finalError as Error).message}`);
        }
      }
    }
    
    if (!pageLoaded) {
      throw new Error('Page failed to load with all strategies');
    }
    
         // Wait a moment for any dynamic content to settle
     await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Get full page screenshot for AI analysis
      screenshot = await page.screenshot({ 
        encoding: 'base64',
        fullPage: true // Full page for complete analysis
      });
      console.log('Full page screenshot captured successfully');
     } catch (screenshotError) {
       console.log('Screenshot failed:', (screenshotError as Error).message);
      // Continue without screenshot - we can still analyze structure
    }
    
    // Extract page content and structure with element bounds
    try {
      pageData = await page.evaluate(() => {
        const getElementInfo = (selector: string) => {
          try {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).slice(0, 20).map(el => { // Limit to first 20 to avoid huge payloads
              const rect = el.getBoundingClientRect();
              return {
                tagName: el.tagName,
                text: (el.textContent || '').substring(0, 100).trim(),
                attributes: {
                  id: el.id || '',
                  class: (el.className || '').toString().substring(0, 100),
                  href: (el as HTMLAnchorElement).href || '',
                },
                bounds: {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height)
                }
              };
            });
          } catch (e) {
            return [];
          }
        };

        // Get element bounds for common problematic areas
        const getElementBounds = (selector: string) => {
          try {
            const element = document.querySelector(selector);
            if (element) {
              const rect = element.getBoundingClientRect();
              return {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              };
            }
          } catch (e) {
            return null;
          }
          return null;
        };

        return {
          title: document.title || 'No title',
          url: window.location.href,
          headings: getElementInfo('h1, h2, h3'),
          buttons: getElementInfo('button, [role="button"], input[type="submit"], .btn'),
          links: getElementInfo('a[href]'),
          forms: getElementInfo('form'),
          images: getElementInfo('img'),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          bodyText: (document.body?.innerText || '').substring(0, 2000),
          hasNavigation: !!document.querySelector('nav, [role="navigation"], .navbar, .nav'),
          hasHeader: !!document.querySelector('header, [role="banner"], .header'),
          hasFooter: !!document.querySelector('footer, [role="contentinfo"], .footer'),
          hasSidebar: !!document.querySelector('aside, [role="complementary"], .sidebar'),
          // Common element bounds for annotation
          elementBounds: {
            navigation: getElementBounds('nav, [role="navigation"], .navbar, .nav'),
            header: getElementBounds('header, [role="banner"], .header'),
            footer: getElementBounds('footer, [role="contentinfo"], .footer'),
            mainContent: getElementBounds('main, [role="main"], .main-content'),
            primaryCTA: getElementBounds('button[type="submit"], .btn-primary, .cta-button'),
            forms: getElementBounds('form:first-of-type')
          }
        };
      });
             console.log('Page data extracted successfully');
     } catch (extractError) {
       console.log('Data extraction failed:', (extractError as Error).message);
      // Provide minimal fallback data
      pageData = {
        title: 'Analysis Error',
        url: url,
        headings: [],
        buttons: [],
        links: [],
        forms: [],
        images: [],
        viewport: { width: 1920, height: 1080 },
        bodyText: 'Unable to extract page content',
        hasNavigation: false,
        hasHeader: false,
        hasFooter: false,
        hasSidebar: false,
      };
    }

    // Analyze with OpenAI
    const analysisPrompt = `
You are a UX expert analyzing a website. Based on the following data, provide a comprehensive UX analysis:

URL: ${url}
Page Title: ${pageData.title}
Screenshot: ${screenshot ? '[Screenshot provided]' : '[No screenshot available]'}

Page Structure:
- Has Navigation: ${pageData.hasNavigation}
- Has Header: ${pageData.hasHeader}
- Has Footer: ${pageData.hasFooter}
- Has Sidebar: ${pageData.hasSidebar}
- Headings: ${JSON.stringify(pageData.headings.slice(0, 5), null, 2)}
- Buttons/CTAs: ${JSON.stringify(pageData.buttons.slice(0, 5), null, 2)}
- Navigation Links: ${JSON.stringify(pageData.links.slice(0, 5), null, 2)}
- Forms: ${JSON.stringify(pageData.forms, null, 2)}

Content Preview: ${pageData.bodyText}

Please analyze this website for UX issues and provide:

1. Overall UX Score (0-100)
2. Specific UX Issues found (categorize as: layout, accessibility, conversion, mobile, performance)
3. Actionable Recommendations with implementation details
4. Brief summary of main findings

Focus on:
- Visual hierarchy and layout
- Conversion optimization opportunities  
- Accessibility concerns
- Mobile responsiveness indicators
- Clear CTAs and user flows
- Information architecture
- Navigation usability

Return the analysis in this JSON format:
{
  "score": number,
  "issues": [
    {
      "category": "layout|accessibility|conversion|mobile|performance",
      "severity": "high|medium|low", 
      "title": "Issue title",
      "description": "Detailed description",
      "element": "CSS selector or description of element",
      "impact": "Impact on user experience"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "Recommendation title", 
      "description": "What to change",
      "implementation": "How to implement the change",
      "expectedImpact": "Expected improvement",
      "effort": "low|medium|high"
    }
  ],
  "summary": "Brief 2-3 sentence summary of key findings"
}
`;

    const messages: any[] = [
      {
        role: "user", 
        content: screenshot ? [
          {
            type: "text",
            text: analysisPrompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${screenshot}`
            }
          }
        ] : analysisPrompt
      }
    ];

    console.log('Sending to OpenAI for analysis...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 4000,
      temperature: 0.3,
    });

    const analysisContent = completion.choices[0]?.message?.content;
    if (!analysisContent) {
      throw new Error("No analysis content received from OpenAI");
    }

    console.log('Analysis received from OpenAI');

    // Parse the JSON response
    const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('Raw OpenAI response:', analysisContent);
      throw new Error("Could not extract JSON from OpenAI response");
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.log('JSON parse error:', parseError);
      console.log('Raw JSON:', jsonMatch[0]);
      
      // Provide fallback analysis
      analysis = {
        score: 70,
        issues: [
          {
            category: "performance",
            severity: "medium",
            title: "Analysis Timeout",
            description: "The website took too long to load completely, which may indicate performance issues.",
            element: "Page load",
            impact: "Users may experience slow loading times"
          }
        ],
        recommendations: [
          {
            priority: "medium",
            title: "Optimize Page Load Speed",
            description: "Improve website performance to reduce loading times",
            implementation: "Optimize images, minify CSS/JS, use CDN, enable compression",
            expectedImpact: "Faster loading times and better user experience",
            effort: "medium"
          }
        ],
        summary: "Analysis was partially successful. The website appears to have some performance considerations that should be addressed."
      };
    }
    
    // Create individual element screenshots for issues and recommendations
    if (screenshot && analysis.issues && analysis.issues.length > 0) {
      console.log('Creating individual issue screenshots...');
      
      for (let i = 0; i < analysis.issues.length; i++) {
        const issue = analysis.issues[i];
        
        // Try to find element bounds for this issue
        let elementBounds = null;
        switch (issue.category) {
          case 'layout':
            elementBounds = pageData.elementBounds?.navigation || pageData.elementBounds?.header;
            break;
          case 'conversion':
            elementBounds = pageData.elementBounds?.primaryCTA || pageData.elementBounds?.forms;
            break;
          case 'accessibility':
            elementBounds = pageData.elementBounds?.navigation || pageData.elementBounds?.mainContent;
            break;
          case 'mobile':
            elementBounds = pageData.elementBounds?.header || pageData.elementBounds?.navigation;
            break;
          case 'performance':
            // For performance, capture top of page
            elementBounds = { x: 0, y: 0, width: pageData.viewport.width, height: 400 };
            break;
        }
        
        if (elementBounds && elementBounds.width > 0 && elementBounds.height > 0) {
          try {
            const elementScreenshot = await captureElementScreenshot(
              screenshot,
              elementBounds,
              pageData.viewport
            );
            if (elementScreenshot) {
              analysis.issues[i].screenshot = elementScreenshot;
              analysis.issues[i].bounds = elementBounds;
            }
          } catch (error) {
            console.log(`Failed to capture screenshot for issue ${i}:`, error);
          }
        }
      }
      
      // Create screenshots for top priority recommendations too
      if (analysis.recommendations && analysis.recommendations.length > 0) {
        for (let i = 0; i < Math.min(analysis.recommendations.length, 3); i++) { // Limit to top 3
          const rec = analysis.recommendations[i];
          
          // Map recommendation to element bounds based on content
          let elementBounds = null;
          if (rec.title.toLowerCase().includes('button') || rec.title.toLowerCase().includes('cta')) {
            elementBounds = pageData.elementBounds?.primaryCTA;
          } else if (rec.title.toLowerCase().includes('navigation') || rec.title.toLowerCase().includes('nav')) {
            elementBounds = pageData.elementBounds?.navigation;
          } else if (rec.title.toLowerCase().includes('form')) {
            elementBounds = pageData.elementBounds?.forms;
          } else if (rec.title.toLowerCase().includes('header')) {
            elementBounds = pageData.elementBounds?.header;
          }
          
          if (elementBounds && elementBounds.width > 0 && elementBounds.height > 0) {
            try {
              const elementScreenshot = await captureElementScreenshot(
                screenshot,
                elementBounds,
                pageData.viewport
              );
              if (elementScreenshot) {
                analysis.recommendations[i].screenshot = elementScreenshot;
              }
            } catch (error) {
              console.log(`Failed to capture screenshot for recommendation ${i}:`, error);
            }
          }
        }
      }
    }

    return {
      score: analysis.score || 70,
      issues: analysis.issues || [],
      recommendations: analysis.recommendations || [], 
      summary: analysis.summary || "Analysis completed with some limitations due to page loading issues.",
    };

  } catch (error) {
    console.error('UX Analysis Error:', error);
    
    // Return a meaningful fallback analysis instead of failing completely
    return {
      score: 65,
      issues: [
        {
          category: "performance",
          severity: "high",
          title: "Website Loading Issues",
          description: "The website failed to load properly during analysis, indicating potential performance or accessibility problems.",
          element: "Page load",
          impact: "Users may be unable to access the website or experience significant delays"
        }
      ],
      recommendations: [
        {
          priority: "high",
          title: "Investigate Loading Issues",
          description: "Debug why the website fails to load reliably",
          implementation: "Check server response times, fix broken resources, optimize critical path",
          expectedImpact: "Improved reliability and accessibility",
          effort: "high"
        }
      ],
      summary: "Website analysis could not be completed due to loading issues. This suggests fundamental performance problems that should be addressed."
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Capture a specific element screenshot from the full page screenshot
async function captureElementScreenshot(
  fullPageScreenshot: string,
  elementBounds: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number }
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(fullPageScreenshot, 'base64');
    
    // Add some padding around the element (but keep it reasonable)
    const padding = 20;
    const cropX = Math.max(0, elementBounds.x - padding);
    const cropY = Math.max(0, elementBounds.y - padding);
    const cropWidth = Math.min(
      viewport.width - cropX, 
      elementBounds.width + (padding * 2)
    );
    const cropHeight = Math.min(
      elementBounds.height + (padding * 2),
      400 // Max height to keep images manageable
    );

    // Crop the specific element area
    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight
      })
      .png()
      .toBuffer();

    // Convert back to base64
    return croppedBuffer.toString('base64');
    
  } catch (error) {
    console.error('Failed to capture element screenshot:', error);
    return null;
  }
} 