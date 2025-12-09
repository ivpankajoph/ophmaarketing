import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  GitBranch, 
  Mail, 
  Users, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Play,
  Pause,
  Plus,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Lightbulb,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { getAuthHeaders } from "@/contexts/AuthContext";

interface DashboardMetrics {
  triggers: { total: number; active: number; executions24h: number; successRate: number };
  flows: { total: number; published: number; instances24h: number; completionRate: number };
  campaigns: { total: number; active: number; sent24h: number; deliveryRate: number };
  segments: { total: number; totalMembers: number };
  overall: { messagesDelivered: number; messagesRead: number; conversions: number; engagementRate: number };
}

interface AIInsight {
  _id: string;
  insightType: string;
  scope: string;
  title: string;
  description: string;
  severity: string;
  actionable: boolean;
  suggestedActions?: string[];
  status: string;
}

interface RecentActivity {
  _id: string;
  eventId: string;
  sourceType: string;
  eventType: string;
  receivedAt: string;
  status: string;
  triggerMatches: any[];
}

export default function AutomationDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/automation/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/automation/dashboard", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    }
  });

  const { data: insights } = useQuery<AIInsight[]>({
    queryKey: ["/api/automation/analytics/insights"],
    queryFn: async () => {
      const res = await fetch("/api/automation/analytics/insights?limit=5", { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: recentActivity } = useQuery<RecentActivity[]>({
    queryKey: ["/api/automation/triggers/activity"],
    queryFn: async () => {
      const res = await fetch("/api/automation/triggers/activity?limit=10", { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const statCards = [
    {
      title: "Triggers",
      icon: Zap,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      metrics: metrics?.triggers,
      link: "/automation/triggers",
      stats: [
        { label: "Active", value: metrics?.triggers?.active || 0 },
        { label: "Executions (24h)", value: metrics?.triggers?.executions24h || 0 },
        { label: "Success Rate", value: `${metrics?.triggers?.successRate || 0}%` }
      ]
    },
    {
      title: "Flows",
      icon: GitBranch,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      metrics: metrics?.flows,
      link: "/automation/flows",
      stats: [
        { label: "Published", value: metrics?.flows?.published || 0 },
        { label: "Instances (24h)", value: metrics?.flows?.instances24h || 0 },
        { label: "Completion Rate", value: `${metrics?.flows?.completionRate || 0}%` }
      ]
    },
    {
      title: "Drip Campaigns",
      icon: Mail,
      color: "text-green-600",
      bgColor: "bg-green-50",
      metrics: metrics?.campaigns,
      link: "/automation/campaigns",
      stats: [
        { label: "Active", value: metrics?.campaigns?.active || 0 },
        { label: "Sent (24h)", value: metrics?.campaigns?.sent24h || 0 },
        { label: "Delivery Rate", value: `${metrics?.campaigns?.deliveryRate || 0}%` }
      ]
    },
    {
      title: "Segments",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      metrics: metrics?.segments,
      link: "/automation/segments",
      stats: [
        { label: "Total", value: metrics?.segments?.total || 0 },
        { label: "Members", value: metrics?.segments?.totalMembers || 0 }
      ]
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Automation Dashboard</h1>
            <p className="text-gray-500 mt-1">Real-time automation monitoring and control center</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/automation/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button asChild>
              <Link href="/automation/triggers/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Trigger
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <Link href={card.link}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-lg mt-2">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {card.stats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-500">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Overall Performance</CardTitle>
                  <CardDescription>Key metrics across all automations</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{metrics?.overall?.messagesDelivered || 0}</div>
                  <div className="text-sm text-gray-500 mt-1">Messages Delivered</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{metrics?.overall?.messagesRead || 0}</div>
                  <div className="text-sm text-gray-500 mt-1">Messages Read</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{metrics?.overall?.conversions || 0}</div>
                  <div className="text-sm text-gray-500 mt-1">Conversions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{metrics?.overall?.engagementRate || 0}%</div>
                  <div className="text-sm text-gray-500 mt-1">Engagement Rate</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Trigger Success Rate</span>
                    <span className="font-medium">{metrics?.triggers?.successRate || 0}%</span>
                  </div>
                  <Progress value={metrics?.triggers?.successRate || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Flow Completion Rate</span>
                    <span className="font-medium">{metrics?.flows?.completionRate || 0}%</span>
                  </div>
                  <Progress value={metrics?.flows?.completionRate || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Campaign Delivery Rate</span>
                    <span className="font-medium">{metrics?.campaigns?.deliveryRate || 0}%</span>
                  </div>
                  <Progress value={metrics?.campaigns?.deliveryRate || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  AI Insights
                </CardTitle>
                <Link href="/automation/analytics">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {insights && insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.slice(0, 4).map((insight) => (
                    <div key={insight._id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityColor(insight.severity)}>{insight.severity}</Badge>
                            <span className="text-xs text-gray-500">{insight.scope}</span>
                          </div>
                          <p className="text-sm font-medium">{insight.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No insights yet</p>
                  <p className="text-xs mt-1">Start automating to get AI-powered recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Feed
                </CardTitle>
                <CardDescription>Real-time trigger executions and events</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((event) => (
                  <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{event.eventType}</span>
                          <Badge variant="outline" className="text-xs">{event.sourceType}</Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(event.receivedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{event.triggerMatches?.length || 0} triggers matched</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-xs mt-1">Events will appear here when triggers execute</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/automation/triggers'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Trigger</h3>
                  <p className="text-sm text-gray-500">Set up event-based automations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/automation/flows'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <GitBranch className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Build Flow</h3>
                  <p className="text-sm text-gray-500">Design visual automation pipelines</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/automation/campaigns'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Campaign</h3>
                  <p className="text-sm text-gray-500">Launch drip messaging sequences</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
