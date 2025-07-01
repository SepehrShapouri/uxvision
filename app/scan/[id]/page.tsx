import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Globe, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  ExternalLink,
  Download,
  Share,
  Camera
} from "lucide-react";
import Link from "next/link";

interface ScanData {
  id: string;
  url: string;
  status: string;
  score: number;
  issues_found: number;
  recommendations_count: number;
  summary: string;
  created_at: string;
  completed_at: string;
  ux_issues: UXIssue[];
  recommendations: UXRecommendation[];
}

interface UXIssue {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  element?: string;
  impact: string;
  screenshot?: string;
  bounds_x?: number;
  bounds_y?: number;
  bounds_width?: number;
  bounds_height?: number;
}

interface UXRecommendation {
  id: string;
  priority: string;
  title: string;
  description: string;
  implementation: string;
  expected_impact: string;
  effort: string;
  screenshot?: string;
  is_implemented: boolean;
}

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  // Fetch scan data with related issues and recommendations
  const { data: scanData, error: scanError } = await supabase
    .from("scans")
    .select(`
      *,
      ux_issues (*),
      recommendations (*)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (scanError || !scanData) {
    notFound();
  }

  const scan: ScanData = scanData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 border-green-300";
    if (score >= 60) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-100 text-red-700 border-red-300";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "low": return "bg-blue-100 text-blue-700 border-blue-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-purple-100 text-purple-700 border-purple-300";
      case "medium": return "bg-blue-100 text-blue-700 border-blue-300";
      case "low": return "bg-green-100 text-green-700 border-green-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const categoryIcons = {
    layout: Target,
    accessibility: CheckCircle,
    conversion: TrendingUp,
    mobile: Globe,
    performance: Clock,
  };

  const issuesByCategory = scan.ux_issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, UXIssue[]>);

  const recommendationsByPriority = scan.recommendations.reduce((acc, rec) => {
    if (!acc[rec.priority]) acc[rec.priority] = [];
    acc[rec.priority].push(rec);
    return acc;
  }, {} as Record<string, UXRecommendation[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share Report
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Scan Overview */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {getDomainFromUrl(scan.url)}
              </h1>
              <p className="text-muted-foreground">
                Scanned on {formatDate(scan.created_at)}
              </p>
            </div>
          </div>

          {/* Overall Score */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Overall UX Score
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {scan.summary}
                  </p>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className="text-foreground">
                        {scan.issues_found} issues found
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-500" />
                      <span className="text-foreground">
                        {scan.recommendations_count} recommendations
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(scan.score)}`}>
                    {scan.score}
                  </div>
                  <div className="text-lg text-muted-foreground">
                    / 100
                  </div>
                  <Progress value={scan.score} className="w-24 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* UX Issues */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center text-foreground">
              <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
              UX Issues ({scan.issues_found})
            </h2>
            
            <div className="space-y-6">
              {Object.entries(issuesByCategory).map(([category, issues]) => {
                const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Target;
                
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center capitalize text-lg">
                        <IconComponent className="h-5 w-5 mr-2 text-primary" />
                        {category} ({issues.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {issues.map((issue) => (
                          <div key={issue.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-foreground">
                                {issue.title}
                              </h4>
                              <Badge className={`${getSeverityColor(issue.severity)} text-xs`}>
                                {issue.severity}
                              </Badge>
                            </div>
                            
                            {/* Mini-screenshot showing the issue */}
                            {issue.screenshot && (
                              <div className="mb-3">
                                <div className="border rounded-lg overflow-hidden bg-gray-50">
                                  <img 
                                    src={`data:image/png;base64,${issue.screenshot}`}
                                    alt={`Screenshot showing: ${issue.title}`}
                                    className="w-full h-auto"
                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                  <Camera className="h-3 w-3 mr-1" />
                                  Issue location on page
                                </p>
                              </div>
                            )}
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {issue.description}
                            </p>
                            {issue.element && (
                              <div className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono mb-2">
                                {issue.element}
                              </div>
                            )}
                            <div className="text-sm text-orange-600">
                              <strong>Impact:</strong> {issue.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {scan.ux_issues.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Issues Found!
                  </h3>
                  <p className="text-muted-foreground">
                    This website follows UX best practices well.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center text-foreground">
              <Lightbulb className="h-6 w-6 text-blue-500 mr-2" />
              Recommendations ({scan.recommendations_count})
            </h2>
            
            <div className="space-y-6">
              {["high", "medium", "low"].map((priority) => {
                const recommendations = recommendationsByPriority[priority] || [];
                if (recommendations.length === 0) return null;

                return (
                  <Card key={priority}>
                    <CardHeader>
                      <CardTitle className="flex items-center capitalize text-lg">
                        <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                        {priority} Priority ({recommendations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {recommendations.map((rec) => (
                          <div key={rec.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-foreground">
                                {rec.title}
                              </h4>
                              <div className="flex items-center space-x-2">
                                <Badge className={`${getPriorityColor(rec.priority)} text-xs`}>
                                  {rec.priority}
                                </Badge>
                                <Badge className={`${getEffortColor(rec.effort)} text-xs`}>
                                  {rec.effort} effort
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Mini-screenshot showing what to improve */}
                            {rec.screenshot && (
                              <div className="mb-3">
                                <div className="border rounded-lg overflow-hidden bg-gray-50">
                                  <img 
                                    src={`data:image/png;base64,${rec.screenshot}`}
                                    alt={`Screenshot for recommendation: ${rec.title}`}
                                    className="w-full h-auto"
                                    style={{ maxHeight: '200px', objectFit: 'contain' }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                  <Camera className="h-3 w-3 mr-1" />
                                  Area to improve
                                </p>
                              </div>
                            )}
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {rec.description}
                            </p>
                            <div className="space-y-2 text-sm">
                              <div>
                                <strong className="text-foreground">Implementation:</strong>
                                <p className="text-muted-foreground">{rec.implementation}</p>
                              </div>
                              <div>
                                <strong className="text-green-600">Expected Impact:</strong>
                                <p className="text-muted-foreground">{rec.expected_impact}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className={rec.is_implemented ? "bg-green-50 text-green-700 border-green-200" : ""}
                              >
                                {rec.is_implemented ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Implemented
                                  </>
                                ) : (
                                  "Mark as Implemented"
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {scan.recommendations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Recommendations
                  </h3>
                  <p className="text-muted-foreground">
                    This website is optimized well for UX.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 text-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            Scan Another Website
          </Button>
        </div>
      </div>
    </div>
  );
} 