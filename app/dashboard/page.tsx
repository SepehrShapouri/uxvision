import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScanForm } from "@/components/scan-form";
import { ScanHistory } from "@/components/scan-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Target, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">UX</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                UX-ray
              </span>
            </Link>
            <Badge variant="secondary">
              Dashboard
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Welcome, {user.email}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            UX Analysis Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Scan any website to identify UX issues and get actionable recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scan Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 text-primary mr-2" />
                  New UX Scan
                </CardTitle>
                <CardDescription>
                  Enter a website URL to analyze its UX and get AI-powered recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScanForm userId={user.id} />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <div className="text-sm text-muted-foreground">Total Scans</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">12</div>
                  <div className="text-sm text-muted-foreground">Issues Found</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">8</div>
                  <div className="text-sm text-muted-foreground">Fixed</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scan History Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Scans</CardTitle>
                <CardDescription>
                  Your latest UX analysis results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScanHistory userId={user.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-foreground">What UX-ray analyzes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Layout & Visual Hierarchy</h3>
                <p className="text-sm text-muted-foreground">
                  Spacing, alignment, typography, and visual flow
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Conversion Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  CTAs, forms, checkout flows, and user journeys
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Accessibility</h3>
                <p className="text-sm text-muted-foreground">
                  WCAG compliance, color contrast, keyboard navigation
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Mobile Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Responsive design, touch targets, mobile usability
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 