import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Filter, RefreshCw, MessageSquare, CheckCircle, XCircle, Clock, Reply } from "lucide-react";
import { format } from "date-fns";

interface BroadcastLog {
  id: string;
  campaignName: string;
  contactName: string;
  contactPhone: string;
  messageType: 'template' | 'custom' | 'ai_agent';
  templateName?: string;
  message?: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
  timestamp: string;
  replied?: boolean;
  repliedAt?: string;
}

export default function BroadcastReports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch } = useQuery<BroadcastLog[]>({
    queryKey: ["/api/broadcast/logs"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast/logs?limit=500");
      if (!res.ok) throw new Error("Failed to fetch broadcast logs");
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const uniqueCampaigns = Array.from(new Set(logs.map(l => l.campaignName)));

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === "" || 
      log.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contactPhone.includes(searchQuery) ||
      log.campaignName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesCampaign = campaignFilter === "all" || log.campaignName === campaignFilter;
    
    return matchesSearch && matchesStatus && matchesCampaign;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent').length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
    replied: logs.filter(l => l.replied).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'template':
        return <Badge variant="outline">Template</Badge>;
      case 'custom':
        return <Badge variant="outline" className="bg-purple-50">Custom</Badge>;
      case 'ai_agent':
        return <Badge variant="outline" className="bg-orange-50">AI Agent</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Campaign', 'Contact Name', 'Phone', 'Type', 'Template', 'Status', 'Replied', 'Replied At', 'Message ID', 'Error'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        `"${log.campaignName}"`,
        `"${log.contactName}"`,
        log.contactPhone,
        log.messageType,
        log.templateName || '',
        log.status,
        log.replied ? 'Yes' : 'No',
        log.repliedAt ? format(new Date(log.repliedAt), 'yyyy-MM-dd HH:mm:ss') : '',
        log.messageId || '',
        `"${log.error || ''}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-report-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Broadcast Reports</h2>
            <p className="text-muted-foreground">View and analyze your broadcast message history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Replied</CardTitle>
              <Reply className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.replied}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {uniqueCampaigns.map(campaign => (
                    <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Log</CardTitle>
            <CardDescription>Showing {filteredLogs.length} of {logs.length} messages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No broadcast messages found.</p>
                <p className="text-sm">Send your first broadcast to see logs here.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Campaign</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Replied</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">
                            {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {log.campaignName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">{log.contactName}</div>
                            <div className="text-xs text-muted-foreground">{log.contactPhone}</div>
                          </td>
                          <td className="px-4 py-3">
                            {getMessageTypeBadge(log.messageType)}
                            {log.templateName && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {log.templateName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="px-4 py-3">
                            {log.replied ? (
                              <Badge variant="default" className="bg-purple-500">
                                <Reply className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">No</Badge>
                            )}
                            {log.repliedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(log.repliedAt), 'MMM d, HH:mm')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {log.messageId && (
                              <div className="text-xs text-muted-foreground">
                                ID: {log.messageId.substring(0, 20)}...
                              </div>
                            )}
                            {log.error && (
                              <div className="text-xs text-red-500">
                                {log.error.substring(0, 50)}...
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
