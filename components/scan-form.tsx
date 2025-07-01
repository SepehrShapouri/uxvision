"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Zap, AlertCircle } from "lucide-react";
import { z } from "zod";

const urlSchema = z.string().url("Please enter a valid URL");

interface ScanFormProps {
  userId: string;
}

export function ScanForm({ userId }: ScanFormProps) {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate URL
    try {
      urlSchema.parse(url);
    } catch (err) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsScanning(true);
    
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan website");
      }

      const result = await response.json();
      setScanResult(result);
      
      // Refresh the page to show updated scan history
      router.refresh();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsScanning(false);
    }
  };

  const formatUrl = (url: string) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-sm font-medium">
            Website URL
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="url"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(formatUrl(e.target.value));
                setError(null);
              }}
              className="pl-10"
              disabled={isScanning}
            />
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isScanning || !url}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing UX...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Start UX Scan
            </>
          )}
        </Button>
      </form>

      {/* Scan Progress */}
      {isScanning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <h4 className="font-medium text-foreground">
                  Scanning in progress...
                </h4>
                <p className="text-sm text-muted-foreground">
                  Analyzing layout, accessibility, conversions, and mobile experience
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: isScanning ? "75%" : "0%" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Scan Result Preview */}
      {scanResult && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  Scan completed successfully!
                </h4>
                <div className="flex items-center space-x-4 text-sm">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {scanResult.issuesFound || 0} issues found
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {scanResult.recommendations || 0} recommendations
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/scan/${scanResult.id}`)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example URLs */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Try these examples:
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "stripe.com", 
            "airbnb.com", 
            "notion.so"
          ].map((exampleUrl) => (
            <Button
              key={exampleUrl}
              variant="outline"
              size="sm"
              onClick={() => setUrl(`https://${exampleUrl}`)}
              disabled={isScanning}
              className="text-xs"
            >
              {exampleUrl}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
} 