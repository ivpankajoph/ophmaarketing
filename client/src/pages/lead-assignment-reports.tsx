import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getAuthHeaders } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Users, UserCheck, Clock, TrendingUp, AlertTriangle, Loader2, RefreshCw, Calendar, Filter } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface AssignmentSummary {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  averageResponseTime: number;
  byUser: UserAssignmentSummary[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

interface UserAssignmentSummary {
  userId: string;
  userName: string;
  userRole: string;
  totalAssigned: number;
  active: number;
  completed: number;
  inProgress: number;
  avgResponseTime: number;
  lastActivityAt?: string;
}

interface AssignmentDetail {
  _id: string;
  contactId: string;
  phone: string;
  contactName: string;
  assignedToUserId: string;
  assignedToUserName: string;
  assignedByUserId: string;
  assignedByUserName: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function LeadAssignmentReportsPage() {
  const [dateRange, setDateRange] = useState("7");
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<AssignmentSummary>({
    queryKey: ["/api/lead-management/reports/summary", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const res = await fetch(`/api/lead-management/reports/summary?startDate=${startDate.toISOString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const { data: assignments, isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery<AssignmentDetail[]>({
    queryKey: ["/api/lead-management/reports/assignments", dateRange, filterUserId, filterPriority, filterStatus],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(dateRange));
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
      });
      if (filterUserId !== "all") params.append("userId", filterUserId);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      if (filterStatus !== "all") params.append("status", filterStatus);
      
      const res = await fetch(`/api/lead-management/reports/assignments?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  const { data: users } = useQuery<{id: string; name: string; role: string}[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchAssignments();
  };

  const handleExportCSV = () => {
    if (!assignments) return;
    
    const headers = ["Contact Name", "Phone", "Assigned To", "Assigned By", "Priority", "Status", "Created At"];
    const rows = assignments.map(a => [
      a.contactName,
      a.phone,
      a.assignedToUserName,
      a.assignedByUserName,
      a.priority,
      a.status,
      format(new Date(a.createdAt), "yyyy-MM-dd HH:mm"),
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-assignments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-100 text-red-700 border-red-200",
      high: "bg-orange-100 text-orange-700 border-orange-200",
      medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
      low: "bg-green-100 text-green-700 border-green-200",
    };
    return <Badge variant="outline" className={colors[priority] || ""}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      assigned: "bg-blue-100 text-blue-700 border-blue-200",
      in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-green-100 text-green-700 border-green-200",
      transferred: "bg-purple-100 text-purple-700 border-purple-200",
    };
    const labels: Record<string, string> = {
      assigned: "Active",
      in_progress: "In Progress",
      completed: "Completed",
      transferred: "Transferred",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{labels[status] || status.replace("_", " ")}</Badge>;
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hrs`;
    return `${Math.round(minutes / 1440)} days`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lead Assignment Reports</h1>
            <p className="text-muted-foreground">Track lead distribution and team performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {summaryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalAssignments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    In selected period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Active Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.activeAssignments}</div>
                  <Progress 
                    value={(summary.activeAssignments / Math.max(summary.totalAssignments, 1)) * 100} 
                    className="mt-2 h-2" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{summary.completedAssignments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.totalAssignments > 0 
                      ? `${Math.round((summary.completedAssignments / summary.totalAssignments) * 100)}% completion rate`
                      : "No data"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatResponseTime(summary.averageResponseTime || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    First contact after assignment
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="by-user">
              <TabsList>
                <TabsTrigger value="by-user">By Team Member</TabsTrigger>
                <TabsTrigger value="by-priority">By Priority</TabsTrigger>
                <TabsTrigger value="all-assignments">All Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value="by-user" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Member Performance</CardTitle>
                    <CardDescription>Lead distribution and response metrics per team member</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summary.byUser.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No assignments found in selected period
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Team Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead className="text-center">In Progress</TableHead>
                            <TableHead className="text-center">Completed</TableHead>
                            <TableHead className="text-center">Avg Response</TableHead>
                            <TableHead>Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.byUser.map((user) => (
                            <TableRow key={user.userId}>
                              <TableCell className="font-medium">{user.userName}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{user.userRole}</Badge>
                              </TableCell>
                              <TableCell className="text-center">{user.totalAssigned}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">{user.active}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{user.inProgress}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="bg-green-50 text-green-700">{user.completed}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {formatResponseTime(user.avgResponseTime || 0)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {user.lastActivityAt 
                                  ? format(new Date(user.lastActivityAt), "MMM d, HH:mm")
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="by-priority" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Priority Distribution</CardTitle>
                      <CardDescription>Assignments by priority level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {["urgent", "high", "medium", "low"].map((priority) => {
                          const item = summary.byPriority.find(p => p.priority === priority);
                          const count = item?.count || 0;
                          const percentage = summary.totalAssignments > 0 
                            ? (count / summary.totalAssignments) * 100 
                            : 0;
                          return (
                            <div key={priority} className="space-y-2">
                              <div className="flex items-center justify-between">
                                {getPriorityBadge(priority)}
                                <span className="text-sm font-medium">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Status Distribution</CardTitle>
                      <CardDescription>Assignments by current status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {["assigned", "in_progress", "completed", "transferred"].map((status) => {
                          const item = summary.byStatus.find(s => s.status === status);
                          const count = item?.count || 0;
                          const percentage = summary.totalAssignments > 0 
                            ? (count / summary.totalAssignments) * 100 
                            : 0;
                          return (
                            <div key={status} className="space-y-2">
                              <div className="flex items-center justify-between">
                                {getStatusBadge(status)}
                                <span className="text-sm font-medium">{count} ({Math.round(percentage)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="all-assignments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Assignments</CardTitle>
                    <CardDescription>Detailed list of all lead assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Filters:</Label>
                      </div>
                      <Select value={filterUserId} onValueChange={setFilterUserId}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="assigned">Active</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {assignmentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : !assignments || assignments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No assignments found matching filters
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contact</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Assigned To</TableHead>
                              <TableHead>Assigned By</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignments.map((assignment) => (
                              <TableRow key={assignment._id}>
                                <TableCell className="font-medium">{assignment.contactName}</TableCell>
                                <TableCell className="text-muted-foreground">{assignment.phone}</TableCell>
                                <TableCell>{assignment.assignedToUserName}</TableCell>
                                <TableCell className="text-muted-foreground">{assignment.assignedByUserName}</TableCell>
                                <TableCell>{getPriorityBadge(assignment.priority)}</TableCell>
                                <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {format(new Date(assignment.createdAt), "MMM d, HH:mm")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load report data. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
