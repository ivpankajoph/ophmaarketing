import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  ThumbsUp, 
  ThumbsDown, 
  Minus, 
  Star, 
  Bot,
  Clock,
  MessageCircle,
  Search,
  RefreshCw,
  TrendingUp,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface AgentInteraction {
  agentId: string;
  agentName: string;
  messagesCount: number;
  firstInteraction: string;
  lastInteraction: string;
  durationMinutes: number;
}

interface ContactAnalytics {
  id: string;
  contactId: string;
  phone: string;
  contactName: string;
  interestLevel: 'interested' | 'not_interested' | 'neutral' | 'highly_interested' | 'pending';
  interestScore: number;
  interestReason: string;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  aiAgentInteractions: AgentInteraction[];
  firstContactTime: string;
  lastContactTime: string;
  conversationDuration: number;
  keyTopics: string[];
  objections: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  lastAnalyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsSummary {
  total: number;
  byInterestLevel: { level: string; count: number; percentage: number }[];
  averageScore: number;
  topAgents: { agentName: string; contactsHandled: number }[];
}

const INTEREST_COLORS = {
  highly_interested: '#22c55e',
  interested: '#84cc16',
  neutral: '#f59e0b',
  not_interested: '#ef4444',
  pending: '#94a3b8',
};

const INTEREST_LABELS = {
  highly_interested: 'Highly Interested',
  interested: 'Interested',
  neutral: 'Neutral',
  not_interested: 'Not Interested',
  pending: 'Pending Analysis',
};

const getInterestIcon = (level: string) => {
  switch (level) {
    case 'highly_interested':
      return <Star className="h-4 w-4 text-green-500" />;
    case 'interested':
      return <ThumbsUp className="h-4 w-4 text-lime-500" />;
    case 'neutral':
      return <Minus className="h-4 w-4 text-amber-500" />;
    case 'not_interested':
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
};

const getInterestBadge = (level: string) => {
  const color = INTEREST_COLORS[level as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.pending;
  return (
    <Badge 
      className="flex items-center gap-1"
      style={{ backgroundColor: color, color: 'white' }}
    >
      {getInterestIcon(level)}
      {INTEREST_LABELS[level as keyof typeof INTEREST_LABELS] || 'Unknown'}
    </Badge>
  );
};

export default function ContactReports() {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactAnalytics | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ reports: ContactAnalytics[]; total: number }>({
    queryKey: ["/api/contact-analytics/reports", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("interestLevel", filter);
      params.set("limit", "100");
      const response = await fetch(`/api/contact-analytics/reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/contact-analytics/summary"],
    queryFn: async () => {
      const response = await fetch("/api/contact-analytics/summary");
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  const analyzeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/contact-analytics/analyze-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to analyze contacts");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.analyzed} contacts`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-analytics"] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredReports = reportsData?.reports?.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.phone.includes(query) ||
      report.contactName.toLowerCase().includes(query)
    );
  }) || [];

  const pieData = summary?.byInterestLevel?.map(item => ({
    name: INTEREST_LABELS[item.level as keyof typeof INTEREST_LABELS] || item.level,
    value: item.count,
    color: INTEREST_COLORS[item.level as keyof typeof INTEREST_COLORS] || INTEREST_COLORS.pending,
  })) || [];

  const agentData = summary?.topAgents?.map(agent => ({
    name: agent.agentName,
    contacts: agent.contactsHandled,
  })) || [];

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Contact Analytics</h1>
            <p className="text-muted-foreground">
              AI-powered analysis of contact interest levels and conversation insights
            </p>
          </div>
          <Button 
            onClick={() => analyzeAllMutation.mutate()}
            disabled={analyzeAllMutation.isPending}
          >
            {analyzeAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Analyze All Contacts
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Interest Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{summary?.averageScore || 0}</div>
                <Progress value={summary?.averageScore || 0} className="w-20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interested Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(summary?.byInterestLevel?.find(l => l.level === 'interested')?.count || 0) +
                 (summary?.byInterestLevel?.find(l => l.level === 'highly_interested')?.count || 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Not Interested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {summary?.byInterestLevel?.find(l => l.level === 'not_interested')?.count || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interest Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top AI Agents by Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {agentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="contacts" fill="#8b5cf6" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No agent data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                <CardTitle>Contact Reports</CardTitle>
                <CardDescription>
                  Click on a contact to view detailed analysis
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by interest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contacts</SelectItem>
                    <SelectItem value="highly_interested">Highly Interested</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="pending">Pending Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contact reports found</p>
                <p className="text-sm mt-2">Click "Analyze All Contacts" to generate reports</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Interest Level</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>AI Agents</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow 
                      key={report.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedContact(report)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.contactName}</div>
                          <div className="text-sm text-muted-foreground">{report.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getInterestBadge(report.interestLevel)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{report.interestScore}</span>
                          <Progress value={report.interestScore} className="w-16 h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          <span>{report.totalMessages}</span>
                          <span className="text-muted-foreground text-xs">
                            ({report.inboundMessages} in / {report.outboundMessages} out)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Bot className="h-4 w-4 text-purple-500" />
                          <span>{report.aiAgentInteractions?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(report.conversationDuration)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(report.lastContactTime)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Contact Detail Dialog */}
        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>{selectedContact?.contactName || 'Unknown'}</span>
                {selectedContact && getInterestBadge(selectedContact.interestLevel)}
              </DialogTitle>
              <DialogDescription>{selectedContact?.phone}</DialogDescription>
            </DialogHeader>
            
            {selectedContact && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-6 pr-4">
                  {/* Interest Analysis */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Interest Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold">{selectedContact.interestScore}</div>
                          <Progress value={selectedContact.interestScore} className="flex-1" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Conversation Duration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span className="text-2xl font-bold">
                            {formatDuration(selectedContact.conversationDuration)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Interest Reason */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">AI Analysis Reason</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedContact.interestReason}</p>
                    </CardContent>
                  </Card>

                  {/* Signals */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedContact.positiveSignals?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            Positive Signals
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {selectedContact.positiveSignals.map((signal, i) => (
                              <li key={i} className="text-sm text-green-600">+ {signal}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {selectedContact.negativeSignals?.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            Negative Signals
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {selectedContact.negativeSignals.map((signal, i) => (
                              <li key={i} className="text-sm text-red-600">- {signal}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Key Topics */}
                  {selectedContact.keyTopics?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Key Topics Discussed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.keyTopics.map((topic, i) => (
                            <Badge key={i} variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Objections */}
                  {selectedContact.objections?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Objections Raised</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {selectedContact.objections.map((objection, i) => (
                            <li key={i} className="text-sm text-amber-600">{objection}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Separator />

                  {/* AI Agent Interactions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        AI Agent Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedContact.aiAgentInteractions?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedContact.aiAgentInteractions.map((interaction, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <div className="font-medium">{interaction.agentName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {interaction.messagesCount} messages | Duration: {formatDuration(interaction.durationMinutes)}
                                </div>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <div>First: {formatDate(interaction.firstInteraction)}</div>
                                <div>Last: {formatDate(interaction.lastInteraction)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No AI agent interactions recorded</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Message Stats */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Message Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{selectedContact.totalMessages}</div>
                          <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{selectedContact.inboundMessages}</div>
                          <div className="text-sm text-muted-foreground">Inbound</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{selectedContact.outboundMessages}</div>
                          <div className="text-sm text-muted-foreground">Outbound</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Contact Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">First Contact:</span>
                          <div>{formatDate(selectedContact.firstContactTime)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Contact:</span>
                          <div>{formatDate(selectedContact.lastContactTime)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Analyzed:</span>
                          <div>{selectedContact.lastAnalyzedAt ? formatDate(selectedContact.lastAnalyzedAt) : 'Never'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
