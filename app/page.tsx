import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Target, TrendingUp, Clock, Users } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center border-b">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">UX</span>
          </div>
          <span className="text-xl font-bold text-foreground">
            UX-ray
          </span>
        </div>
        <AuthButton />
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          🚀 AI-Powered UX Analysis
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
          Stop hunting for 
          <br />UX problems
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          AI assistant that automatically scans your interfaces, identifies friction points, 
          and delivers actionable recommendations in <strong>minutes instead of days</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/dashboard">
            <Button size="lg" className="px-8 py-4 text-lg">
              Start Free Scan
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
            View Demo
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">15-30%</div>
            <div className="text-muted-foreground">Conversion Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">90%</div>
            <div className="text-muted-foreground">Time Saved</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">24/7</div>
            <div className="text-muted-foreground">UX Monitoring</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
          Like having a UX expert reviewing your product 24/7
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Target className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Instant UX Audits</CardTitle>
              <CardDescription>
                Automatically scan your interfaces against proven UX best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Layout Analysis</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Accessibility Issues</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Conversion Blockers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Actionable Recommendations</CardTitle>
              <CardDescription>
                Get specific, implementable fixes prioritized by business impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Impact Scoring</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Implementation Guide</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />ROI Estimates</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Ship Better, Faster</CardTitle>
              <CardDescription>
                Transform limited design resources into maximum product impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />90% Time Savings</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Continuous Monitoring</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Team Collaboration</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20 bg-muted/50">
        <h2 className="text-4xl font-bold text-center mb-16 text-foreground">Simple, transparent pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Startup */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Startup</CardTitle>
              <div className="text-4xl font-bold text-foreground">$99<span className="text-lg text-muted-foreground">/mo</span></div>
              <CardDescription>Perfect for early-stage teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Up to 25 pages</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Weekly scans</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Basic reports</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Email support</li>
              </ul>
              <Button className="w-full">Get Started</Button>
            </CardContent>
          </Card>

          {/* Growth */}
          <Card className="border-primary relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge>Most Popular</Badge>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Growth</CardTitle>
              <div className="text-4xl font-bold text-foreground">$249<span className="text-lg text-muted-foreground">/mo</span></div>
              <CardDescription>For growing design teams</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Up to 100 pages</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Daily scans</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Advanced reports</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Team collaboration</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Priority support</li>
              </ul>
              <Button className="w-full">Get Started</Button>
            </CardContent>
          </Card>

          {/* Scale */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Scale</CardTitle>
              <div className="text-4xl font-bold text-foreground">$499<span className="text-lg text-muted-foreground">/mo</span></div>
              <CardDescription>For complex products</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Unlimited pages</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Real-time monitoring</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Custom integrations</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />Dedicated success manager</li>
                <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-600 mr-2" />White-label reports</li>
              </ul>
              <Button className="w-full" variant="outline">Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="border-primary bg-primary text-primary-foreground">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold mb-4">Transform every designer into a UX expert</h2>
            <p className="text-xl mb-8 opacity-90">
              Start identifying and fixing UX issues that are costing you conversions right now
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="px-8 py-4 text-lg">
                  Start Free Trial
                  <Users className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 py-4 text-lg">
                Book a Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2024 UX-ray. Making every pixel count.</p>
        </div>
      </footer>
    </div>
  );
}
