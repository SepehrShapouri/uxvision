"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Clock, TrendingUp, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Scan {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
  score: number;
  issues_found: number;
  recommendations_count: number;
  created_at: string;
}

interface ScanHistoryProps {
  userId: string;
}

export function ScanHistory({ userId }: ScanHistoryProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScans();
  }, [userId]);

  const fetchScans = async () => {
    try {
      const response = await fetch(`/api/scans?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans || []);
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No scans yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Start by entering a website URL above to get your first UX analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => (
        <Card key={scan.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {getDomainFromUrl(scan.url)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(scan.created_at)}</span>
                </div>
              </div>
              <Badge className={getStatusColor(scan.status)} variant="secondary">
                {scan.status}
              </Badge>
            </div>

            {scan.status === "completed" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">UX Score</span>
                  <span className={`text-lg font-bold ${getScoreColor(scan.score)}`}>
                    {scan.score}/100
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {scan.issues_found} issues
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {scan.recommendations_count} recommendations
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/scan/${scan.id}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {scan.status === "pending" && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                <span>Analysis in progress...</span>
              </div>
            )}

            {scan.status === "failed" && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Scan failed - please try again</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {scans.length > 0 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            View All Scans
          </Button>
        </div>
      )}
    </div>
  );
} 