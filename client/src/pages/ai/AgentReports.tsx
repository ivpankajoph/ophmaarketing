import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  Phone,
  Calendar,
  Bot,
  Target,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  BarChart3,
  PieChart
} from "lucide-react";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Safe date formatting helper
const formatDate = (dateStr: string | undefined | null, formatStr: string): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (!isValid(date)) return "N/A";
  return format(date, formatStr);
};

interface Qualification {
  id: string;
  contactId: string;
  phone: string;
  name: string;
  source: string;
  campaignId?: string;
  campaignName?: string;
  agentId?: string;
  agentName?: string;
  category: 'interested' | 'not_interested' | 'pending';
  score: number;
  totalMessages: number;
  lastMessageAt: string;
  firstContactAt: string;
  keywords: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface QualificationStats {
  total: number;
  interested: number;
  notInterested: number;
  pending: number;
  interestedPercent: number;
  notInterestedPercent: number;
  pendingPercent: number;
}

interface QualificationReport {
  bySource: Record<string, QualificationStats>;
  byCampaign: Record<string, QualificationStats & { campaignName: string }>;
  byAgent: Record<string, QualificationStats & { agentName: string }>;
  overall: QualificationStats;
}

export default function AgentReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedQualification, setSelectedQualification] = useState<Qualification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");

  const { data: qualifications = [], isLoading: loadingQualifications } = useQuery<Qualification[]>({
    queryKey: ["/api/ai-analytics/qualifications"],
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<QualificationStats>({
    queryKey: ["/api/ai-analytics/qualifications/stats"],
    refetchInterval: 5000,
  });

  const { data: report } = useQuery<QualificationReport>({
    queryKey: ["/api/ai-analytics/qualifications/report"],
    refetchInterval: 10000,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, category, notes }: { id: string; category: string; notes?: string }) => {
      const response = await fetch(`/api/ai-analytics/qualifications/${id}/category`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, notes }),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analytics/qualifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analytics/qualifications/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-analytics/qualifications/report"] });
      toast({ title: "Category Updated", description: "Lead qualification updated successfully" });
      setEditOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    },
  });

  const filteredQualifications = qualifications.filter(q => {
    if (filterCategory !== "all" && q.category !== filterCategory) return false;
    if (filterSource !== "all" && q.source !== filterSource) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        q.name.toLowerCase().includes(search) ||
        q.phone.includes(search) ||
        q.keywords.some(k => k.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const interestedLeads = filteredQualifications.filter(q => q.category === 'interested');
  const notInterestedLeads = filteredQualifications.filter(q => q.category === 'not_interested');
  const pendingLeads = filteredQualifications.filter(q => q.category === 'pending');

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'interested':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Interested</Badge>;
      case 'not_interested':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Not Interested</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      ai_chat: "bg-blue-500",
      campaign: "bg-purple-500",
      ad: "bg-orange-500",
      lead_form: "bg-green-500",
      manual: "bg-gray-500"
    };
    const labels: Record<string, string> = {
      ai_chat: "AI Chat",
      campaign: "Campaign",
      ad: "Ad",
      lead_form: "Lead Form",
      manual: "Manual"
    };
    return <Badge className={colors[source] || "bg-gray-500"}>{labels[source] || source}</Badge>;
  };

  const handleViewDetails = (qual: Qualification) => {
    setSelectedQualification(qual);
    setDetailsOpen(true);
  };

  const handleEditCategory = (qual: Qualification) => {
    setSelectedQualification(qual);
    setEditCategory(qual.category);
    setEditNotes(qual.notes || "");
    setEditOpen(true);
  };

  const handleSaveCategory = () => {
    if (selectedQualification && editCategory) {
      updateCategoryMutation.mutate({
        id: selectedQualification.id,
        category: editCategory,
        notes: editNotes,
      });
    }
  };

  const exportToCSV = (data: Qualification[], filename: string) => {
    const headers = ["Name", "Phone", "Category", "Source", "Score", "Messages", "Keywords", "First Contact", "Last Message", "Notes"];
    const rows = data.map(q => [
      q.name,
      q.phone,
      q.category,
      q.source,
      q.score.toString(),
      q.totalMessages.toString(),
      q.keywords.join("; "),
      formatDate(q.firstContactAt, "yyyy-MM-dd HH:mm"),
      formatDate(q.lastMessageAt, "yyyy-MM-dd HH:mm"),
      q.notes || ""
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const LeadTable = ({ leads, title }: { leads: Qualification[]; title: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{leads.length} leads</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(leads, title.toLowerCase().replace(/\s+/g, "_"))}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No leads in this category
                </TableCell>
              </TableRow>
            ) : (
              leads.map(qual => (
                <TableRow key={qual.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{qual.name}</TableCell>
                  <TableCell>{qual.phone}</TableCell>
                  <TableCell>{getSourceBadge(qual.source)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${qual.score >= 70 ? 'bg-green-500' : qual.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${qual.score}%` }}
                        />
                      </div>
                      <span className="text-sm">{qual.score}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {qual.totalMessages}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(qual.lastMessageAt, "MMM dd, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {qual.keywords.slice(0, 2).map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                      ))}
                      {qual.keywords.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{qual.keywords.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(qual)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditCategory(qual)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Reports</h1>
          <p className="text-muted-foreground">Track lead qualification from AI conversations</p>
        </div>
        <Button variant="outline" onClick={() => exportToCSV(qualifications, "all_qualifications")}>
          <Download className="w-4 h-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
                <p className="text-3xl font-bold">{stats?.total || 0}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Interested</p>
                <p className="text-3xl font-bold text-green-700">{stats?.interested || 0}</p>
                <p className="text-sm text-green-600">{stats?.interestedPercent || 0}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Not Interested</p>
                <p className="text-3xl font-bold text-red-700">{stats?.notInterested || 0}</p>
                <p className="text-sm text-red-600">{stats?.notInterestedPercent || 0}%</p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-700">{stats?.pending || 0}</p>
                <p className="text-sm text-yellow-600">{stats?.pendingPercent || 0}%</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="ai_chat">AI Chat</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="ad">Ad</SelectItem>
                  <SelectItem value="lead_form">Lead Form</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interested" className="text-green-600">Interested</TabsTrigger>
          <TabsTrigger value="not_interested" className="text-red-600">Not Interested</TabsTrigger>
          <TabsTrigger value="pending" className="text-yellow-600">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* By Agent Report */}
          {report?.byAgent && Object.keys(report.byAgent).length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <CardTitle>By AI Agent</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-green-600">Interested</TableHead>
                      <TableHead className="text-red-600">Not Interested</TableHead>
                      <TableHead className="text-yellow-600">Pending</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.byAgent).map(([agentId, agentStats]) => (
                      <TableRow key={agentId}>
                        <TableCell className="font-medium">{agentStats.agentName}</TableCell>
                        <TableCell>{agentStats.total}</TableCell>
                        <TableCell className="text-green-600">{agentStats.interested}</TableCell>
                        <TableCell className="text-red-600">{agentStats.notInterested}</TableCell>
                        <TableCell className="text-yellow-600">{agentStats.pending}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${agentStats.interestedPercent}%` }} />
                            </div>
                            <span className="text-sm font-medium">{agentStats.interestedPercent}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* By Source Report */}
          {report?.bySource && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <CardTitle>By Source</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-green-600">Interested</TableHead>
                      <TableHead className="text-red-600">Not Interested</TableHead>
                      <TableHead className="text-yellow-600">Pending</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.bySource)
                      .filter(([_, stats]) => stats.total > 0)
                      .map(([source, sourceStats]) => (
                        <TableRow key={source}>
                          <TableCell>{getSourceBadge(source)}</TableCell>
                          <TableCell>{sourceStats.total}</TableCell>
                          <TableCell className="text-green-600">{sourceStats.interested}</TableCell>
                          <TableCell className="text-red-600">{sourceStats.notInterested}</TableCell>
                          <TableCell className="text-yellow-600">{sourceStats.pending}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${sourceStats.interestedPercent}%` }} />
                              </div>
                              <span className="text-sm font-medium">{sourceStats.interestedPercent}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* By Campaign Report */}
          {report?.byCampaign && Object.keys(report.byCampaign).length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  <CardTitle>By Campaign</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-green-600">Interested</TableHead>
                      <TableHead className="text-red-600">Not Interested</TableHead>
                      <TableHead className="text-yellow-600">Pending</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(report.byCampaign).map(([campaignId, campaignStats]) => (
                      <TableRow key={campaignId}>
                        <TableCell className="font-medium">{campaignStats.campaignName}</TableCell>
                        <TableCell>{campaignStats.total}</TableCell>
                        <TableCell className="text-green-600">{campaignStats.interested}</TableCell>
                        <TableCell className="text-red-600">{campaignStats.notInterested}</TableCell>
                        <TableCell className="text-yellow-600">{campaignStats.pending}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{ width: `${campaignStats.interestedPercent}%` }} />
                            </div>
                            <span className="text-sm font-medium">{campaignStats.interestedPercent}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* All Leads Table */}
          <LeadTable leads={filteredQualifications} title="All Leads" />
        </TabsContent>

        <TabsContent value="interested">
          <LeadTable leads={interestedLeads} title="Interested Leads" />
        </TabsContent>

        <TabsContent value="not_interested">
          <LeadTable leads={notInterestedLeads} title="Not Interested Leads" />
        </TabsContent>

        <TabsContent value="pending">
          <LeadTable leads={pendingLeads} title="Pending Leads" />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>
              Complete information about this lead
            </DialogDescription>
          </DialogHeader>
          {selectedQualification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <p className="font-medium">{selectedQualification.name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Phone</label>
                  <p className="font-medium">{selectedQualification.phone}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Category</label>
                  <div className="mt-1">{getCategoryBadge(selectedQualification.category)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Source</label>
                  <div className="mt-1">{getSourceBadge(selectedQualification.source)}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Score</label>
                  <p className="font-medium">{selectedQualification.score}%</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Total Messages</label>
                  <p className="font-medium">{selectedQualification.totalMessages}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">First Contact</label>
                  <p className="font-medium">{formatDate(selectedQualification.firstContactAt, "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Last Message</label>
                  <p className="font-medium">{formatDate(selectedQualification.lastMessageAt, "MMM dd, yyyy HH:mm")}</p>
                </div>
              </div>
              {selectedQualification.agentName && (
                <div>
                  <label className="text-sm text-muted-foreground">AI Agent</label>
                  <p className="font-medium">{selectedQualification.agentName}</p>
                </div>
              )}
              {selectedQualification.campaignName && (
                <div>
                  <label className="text-sm text-muted-foreground">Campaign</label>
                  <p className="font-medium">{selectedQualification.campaignName}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground">Keywords Detected</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedQualification.keywords.length > 0 ? (
                    selectedQualification.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline">{kw}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No keywords detected</span>
                  )}
                </div>
              </div>
              {selectedQualification.notes && (
                <div>
                  <label className="text-sm text-muted-foreground">Notes</label>
                  <p className="text-sm mt-1">{selectedQualification.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            <Button onClick={() => {
              setDetailsOpen(false);
              if (selectedQualification) handleEditCategory(selectedQualification);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Lead Category</DialogTitle>
            <DialogDescription>
              Change the qualification category for {selectedQualification?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Interested
                    </div>
                  </SelectItem>
                  <SelectItem value="not_interested">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Not Interested
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      Pending
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
