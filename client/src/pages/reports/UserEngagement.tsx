import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Star, Download, Search, TrendingUp, Eye, MessageSquare, ArrowUp, ArrowDown, Users, Trophy, Loader2 } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface EngagedUser {
  id: string;
  name: string;
  phone: string;
  messagesReceived: number;
  messagesRead: number;
  replies: number;
  readRate: number;
  replyRate: number;
  engagement: number;
}

interface DistributionItem {
  range: string;
  count: number;
  color: string;
}

interface UserEngagementData {
  users: EngagedUser[];
  distribution: DistributionItem[];
  summary: {
    totalUsers: number;
    avgReadRate: number;
    avgReplyRate: number;
    totalReplies: number;
    totalMessages: number;
  };
  period: string;
}

export default function UserEngagement() {
  const [period, setPeriod] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"engagement" | "readRate" | "replyRate">("engagement");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { data, isLoading, error } = useQuery<UserEngagementData>({
    queryKey: ["/api/reports/user-engagement", period],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/reports/user-engagement?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch user engagement");
      return res.json();
    },
  });

  const filteredUsers = (data?.users || [])
    .filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 90) return "text-green-600";
    if (engagement >= 75) return "text-lime-600";
    if (engagement >= 60) return "text-yellow-600";
    if (engagement >= 45) return "text-orange-600";
    return "text-red-600";
  };

  const getEngagementBadge = (engagement: number) => {
    if (engagement >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (engagement >= 75) return <Badge className="bg-lime-500">Good</Badge>;
    if (engagement >= 60) return <Badge className="bg-yellow-500">Average</Badge>;
    if (engagement >= 45) return <Badge className="bg-orange-500">Low</Badge>;
    return <Badge variant="destructive">Very Low</Badge>;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="w-5 text-center text-muted-foreground">{index + 1}</span>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500" />
              User Engagement Report
            </h2>
            <p className="text-muted-foreground">See which users engage most with your messages.</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Failed to load engagement data</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.summary.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Active recipients</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    Avg Read Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{data?.summary.avgReadRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Across all users</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    Avg Reply Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{data?.summary.avgReplyRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Across all users</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Total Replies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{data?.summary.totalReplies || 0}</div>
                  <p className="text-xs text-muted-foreground">From {data?.summary.totalMessages || 0} messages</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top Engaged Users</CardTitle>
                      <CardDescription>Users ranked by engagement score</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Engagement %</SelectItem>
                          <SelectItem value="readRate">Read Rate %</SelectItem>
                          <SelectItem value="replyRate">Reply Rate %</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                      >
                        {sortOrder === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Rank</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Messages</TableHead>
                          <TableHead className="text-right">Read %</TableHead>
                          <TableHead className="text-right">Reply %</TableHead>
                          <TableHead className="text-right">Engagement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.slice(0, 10).map((user, index) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center justify-center">
                                {getRankIcon(index)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-muted-foreground">{user.phone}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">{user.messagesReceived}</div>
                              <div className="text-xs text-muted-foreground">{user.replies} replies</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={user.readRate} className="w-16 h-2" />
                                <span className="text-sm font-medium text-blue-600">{user.readRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={user.replyRate} className="w-16 h-2" />
                                <span className="text-sm font-medium text-purple-600">{user.replyRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-lg font-bold ${getEngagementColor(user.engagement)}`}>
                                  {user.engagement}%
                                </span>
                                {getEngagementBadge(user.engagement)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No engagement data found for this period.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Distribution</CardTitle>
                  <CardDescription>How users are distributed across engagement levels</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.distribution && data.distribution.length > 0 ? (
                    <>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.distribution} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={70} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                              formatter={(value: number) => [`${value} users`, 'Count']}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {data.distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium text-sm">Legend</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Excellent (90%+)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-lime-500" />
                            <span>Good (80-89%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span>Average (70-79%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span>Low (60-69%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Very Low (&lt;60%)</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No distribution data available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
