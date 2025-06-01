import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Clock, 
  Shield, 
  PieChart,
  BarChart3,
  FileText,
  ArrowRight
} from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      title: "Task Performance Analytics",
      description: "Comprehensive analysis of task completion rates, efficiency scores, and member performance metrics",
      href: "/reports/task-performance",
      icon: <TrendingUp className="h-8 w-8 text-blue-600" />,
      color: "bg-blue-50 border-blue-200",
      metrics: ["Task Efficiency", "Completion Rates", "Performance Trends"]
    },
    {
      title: "Compliance Overview",
      description: "Monitor regulatory deadlines, compliance rates, and risk assessment across all jurisdictions",
      href: "/reports/compliance-overview",
      icon: <AlertTriangle className="h-8 w-8 text-orange-600" />,
      color: "bg-orange-50 border-orange-200",
      metrics: ["Regulatory Deadlines", "Compliance Rates", "Risk Levels"]
    },
    {
      title: "Team Efficiency Report",
      description: "Detailed insights into team productivity, workload distribution, and performance ratings",
      href: "/reports/team-efficiency",
      icon: <Target className="h-8 w-8 text-green-600" />,
      color: "bg-green-50 border-green-200",
      metrics: ["Team Productivity", "Workload Balance", "Efficiency Scores"]
    },
    {
      title: "Task Lifecycle Analysis",
      description: "Track task progression from creation to completion with detailed timeline analysis",
      href: "/reports/task-lifecycle",
      icon: <Clock className="h-8 w-8 text-purple-600" />,
      color: "bg-purple-50 border-purple-200",
      metrics: ["Lifecycle Tracking", "Time Analysis", "Bottleneck Identification"]
    },
    {
      title: "Risk Assessment Report",
      description: "Comprehensive risk analysis including regulatory violations and deadline management",
      href: "/reports/risk-assessment",
      icon: <Shield className="h-8 w-8 text-red-600" />,
      color: "bg-red-50 border-red-200",
      metrics: ["Risk Scoring", "Violation Tracking", "Critical Issues"]
    },
    {
      title: "Jurisdiction Analysis",
      description: "Multi-jurisdiction compliance tracking with country-specific regulatory insights",
      href: "/reports/jurisdiction-analysis",
      icon: <PieChart className="h-8 w-8 text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-200",
      metrics: ["Country Analysis", "Jurisdiction Compliance", "Regional Trends"]
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-600">Comprehensive business intelligence and data analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Real-Time Analytics</h3>
            <p className="text-sm text-blue-700">All reports use live data from your firm's operations for accurate insights</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.href} className={`hover:shadow-lg transition-shadow duration-200 ${report.color}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {report.icon}
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {report.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Key Metrics:</h4>
                  <div className="flex flex-wrap gap-1">
                    {report.metrics.map((metric, index) => (
                      <span 
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-white/60 text-slate-600 rounded border"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
                
                <Link href={report.href}>
                  <Button className="w-full group">
                    View Report
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-50 border border-slate-200 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Report Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-slate-600">Real-time data integration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Advanced filtering options</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-slate-600">Interactive visualizations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-slate-600">Export capabilities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-slate-600">Detailed insights</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span className="text-slate-600">Historical comparisons</span>
          </div>
        </div>
      </div>
    </div>
  );
}