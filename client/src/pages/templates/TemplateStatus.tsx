import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  status: "pending" | "approved" | "rejected";
  language?: string;
  metaTemplateId?: string;
  metaStatus?: string;
  rejectionReason?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateStatus() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, refetch, isRefetching } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/templates/sync-meta", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to sync templates");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast.success(data.message || "Templates synced from Meta", {
        description: `${data.synced || 0} new, ${data.updated || 0} updated`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync templates", {
        description: error.message,
        duration: 5000,
      });
    },
  });

  const getStatusBadge = (status: string, metaStatus?: string) => {
    const displayStatus = metaStatus || status;
    switch (displayStatus.toLowerCase()) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "in_appeal":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="mr-1 h-3 w-3" />
            In Appeal
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {displayStatus}
          </Badge>
        );
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "Never";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const approvedCount = templates.filter(t => t.status === "approved" || t.metaStatus === "APPROVED").length;
  const pendingCount = templates.filter(t => t.status === "pending" || t.metaStatus === "PENDING").length;
  const rejectedCount = templates.filter(t => t.status === "rejected" || t.metaStatus === "REJECTED").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Template Status</h2>
            <p className="text-muted-foreground">View approval status of your WhatsApp message templates</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isRefetching}
          >
            {(syncMutation.isPending || isRefetching) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync from Meta
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{approvedCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{rejectedCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
            <CardDescription>
              Status of all templates synced from Meta. Click "Sync from Meta" to get the latest status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates found. Click "Sync from Meta" to import your templates.</p>
                <p className="text-sm mt-2">Make sure your WhatsApp API credentials are configured in Settings.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Synced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.language || "en"}</TableCell>
                      <TableCell>
                        {getStatusBadge(template.status, template.metaStatus)}
                        {template.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">{template.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(template.lastSyncedAt || template.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
