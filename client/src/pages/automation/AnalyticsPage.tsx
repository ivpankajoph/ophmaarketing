import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Zap,
  GitBranch,
  Mail,
  Users,
  Download,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight
} from "lucide-react";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TriggerPerformance {
  triggerId: string;
  triggerName: string;
  executions: number;
  successes: number;
  failures: number;
  successRate: number;
}

interface FlowPerformance {
  flowId: string;
  flowName: string;
  instances: number;
  completed: number;
  failed: number;
  completionRate: number;
}

interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  enrolled: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  converted: number;
  deliveryRate: number;
  readRate: number;
  conversionRate: number;
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
  createdAt: string;
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: triggerAnalytics } = useQuery<{ triggers: TriggerPerformance[] }>({
    queryKey: ["/api/automation/analytics/triggers", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/automation/analytics/triggers`, { headers: getAuthHeaders() });
      if (!res.ok) return { triggers: [] };
      return res.json();
    }
  });

  const { data: flowAnalytics } = useQuery<{ flows: FlowPerformance[] }>({
    queryKey: ["/api/automation/analytics/flows", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/automation/analytics/flows`, { headers: getAuthHeaders() });
      if (!res.ok) return { flows: [] };
      return res.json();
    }
  });

  const { data: campaignAnalytics } = useQuery<{ campaigns: CampaignPerformance[] }>({
    queryKey: ["/api/automation/analytics/campaigns", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/automation/analytics/campaigns`, { headers: getAuthHeaders() });
      if (!res.ok) return { campaigns: [] };
      return res.json();
    }
  });

  const { data: insights, refetch: refetchInsights } = useQuery<AIInsight[]>({
    queryKey: ["/api/automation/analytics/insights"],
    queryFn: async () => {
      const res = await fetch(`/api/automation/analytics/insights`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: heatmap } = useQuery({
    queryKey: ["/api/automation/analytics/heatmap"],
    queryFn: async () => {
      const res = await fetch(`/api/automation/analytics/heatmap?period=week`, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return res.json();
    }
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/automation/analytics/insights/generate", {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to generate insights");
      return res.json();
    },
    onSuccess: () => {
      refetchInsights();
      toast.success("AI insights generated");
    },
    onError: () => toast.error("Failed to generate insights")
  });

  const exportMutation = useMutation({
    mutationFn: async (format: string) => {
      const res = await fetch("/api/automation/analytics/export", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "overall", format })
      });
      if (!res.ok) throw new Error("Failed to export");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Report exported: ${data.filename}`);
    },
    onError: () => toast.error("Failed to export report")
  });

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
      case 'actioned': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'dismissed': return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'viewed': return <Eye className="h-4 w-4 text-blue-500" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Automation Analytics
            </h1>
            <p className="text-gray-500 mt-1">Performance metrics and AI-powered insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => exportMutation.mutate("csv")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="triggers">Triggers</TabsTrigger>
            <TabsTrigger value="flows">Flows</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{triggerAnalytics?.triggers?.length || 0}</div>
                      <div className="text-sm text-gray-500">Active Triggers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GitBranch className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{flowAnalytics?.flows?.length || 0}</div>
                      <div className="text-sm text-gray-500">Active Flows</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{campaignAnalytics?.campaigns?.length || 0}</div>
                      <div className="text-sm text-gray-500">Active Campaigns</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{insights?.filter(i => i.status === 'new').length || 0}</div>
                      <div className="text-sm text-gray-500">New Insights</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {heatmap && (
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Heatmap</CardTitle>
                  <CardDescription>Activity distribution by day and hour</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Heatmap visualization will appear here</p>
                    <p className="text-sm">Based on automation engagement data</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="triggers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trigger Performance</CardTitle>
                <CardDescription>Execution metrics for all triggers</CardDescription>
              </CardHeader>
              <CardContent>
                {triggerAnalytics?.triggers && triggerAnalytics.triggers.length > 0 ? (
                  <div className="space-y-4">
                    {triggerAnalytics.triggers.map((trigger) => (
                      <div key={trigger.triggerId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{trigger.triggerName}</div>
                          <div className="text-sm text-gray-500">{trigger.executions} executions</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm">Success Rate</div>
                            <div className="font-bold text-green-600">{trigger.successRate}%</div>
                          </div>
                          <Progress value={trigger.successRate} className="w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No trigger data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flow Performance</CardTitle>
                <CardDescription>Completion metrics for all flows</CardDescription>
              </CardHeader>
              <CardContent>
                {flowAnalytics?.flows && flowAnalytics.flows.length > 0 ? (
                  <div className="space-y-4">
                    {flowAnalytics.flows.map((flow) => (
                      <div key={flow.flowId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{flow.flowName}</div>
                          <div className="text-sm text-gray-500">{flow.instances} instances</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm">Completion Rate</div>
                            <div className="font-bold text-blue-600">{flow.completionRate}%</div>
                          </div>
                          <Progress value={flow.completionRate} className="w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No flow data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Delivery and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {campaignAnalytics?.campaigns && campaignAnalytics.campaigns.length > 0 ? (
                  <div className="space-y-4">
                    {campaignAnalytics.campaigns.map((campaign) => (
                      <div key={campaign.campaignId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{campaign.campaignName}</div>
                          <Badge variant="outline">{campaign.enrolled} enrolled</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Sent</div>
                            <div className="font-medium">{campaign.sent}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Delivered</div>
                            <div className="font-medium text-green-600">{campaign.deliveryRate}%</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Read</div>
                            <div className="font-medium text-blue-600">{campaign.readRate}%</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Converted</div>
                            <div className="font-medium text-purple-600">{campaign.conversionRate}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No campaign data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      AI-Powered Insights
                    </CardTitle>
                    <CardDescription>Recommendations based on your automation data</CardDescription>
                  </div>
                  <Button onClick={() => generateInsightsMutation.mutate()} disabled={generateInsightsMutation.isPending}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${generateInsightsMutation.isPending ? 'animate-spin' : ''}`} />
                    Generate Insights
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {insights && insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div key={insight._id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(insight.status)}
                            <Badge className={getSeverityColor(insight.severity)}>{insight.severity}</Badge>
                            <Badge variant="outline">{insight.scope}</Badge>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(insight.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-500 mb-1">Suggested Actions:</div>
                            <ul className="text-sm space-y-1">
                              {insight.suggestedActions.map((action, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No insights available</p>
                    <p className="text-sm mt-1">Click "Generate Insights" to get AI-powered recommendations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
