import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot, MessageSquare, Clock, Zap } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Agent {
  id: string;
  name: string;
  model: string;
  chatsHandled: number;
  messagesGenerated: number;
  avgResponseTime: string;
  avgResponseTimeMs: number;
  isActive: boolean;
  temperature: number;
}

interface AgentPerformanceData {
  agents: Agent[];
  summary: {
    totalAgents: number;
    activeAgents: number;
    totalChats: number;
    totalMessages: number;
    avgResponseTime: string;
  };
  period: string;
}

export default function AgentPerformance() {
  const [period, setPeriod] = useState("week");

  const { data, isLoading, error } = useQuery<AgentPerformanceData>({
    queryKey: ["/api/reports/ai-agents", period],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/reports/ai-agents?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch agent performance");
      return res.json();
    },
  });

  const getModelBadge = (model: string) => {
    if (model.startsWith('gemini')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Gemini</Badge>;
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OpenAI</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8 text-primary" />
              AI Agent Performance
            </h2>
            <p className="text-muted-foreground">Track AI agent productivity and response metrics.</p>
          </div>
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Failed to load agent performance data</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Total Agents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.summary.totalAgents || 0}</div>
                  <p className="text-xs text-muted-foreground">{data?.summary.activeAgents || 0} active</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chats Handled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.summary.totalChats || 0}</div>
                  <p className="text-xs text-muted-foreground">Unique conversations</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Messages Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.summary.totalMessages || 0}</div>
                  <p className="text-xs text-muted-foreground">AI responses sent</p>
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
                  <div className="text-2xl font-bold">{data?.summary.avgResponseTime || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Time to respond</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Agent Leaderboard</CardTitle>
                <CardDescription>Top performing AI agents this {period === 'today' ? 'day' : period === 'yesterday' ? 'day' : period}.</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.agents && data.agents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-center">Chats</TableHead>
                        <TableHead className="text-center">Messages</TableHead>
                        <TableHead>Avg Response</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{agent.name}</div>
                                <div className="text-xs text-muted-foreground">Temp: {agent.temperature}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getModelBadge(agent.model)}
                              <span className="text-xs text-muted-foreground">{agent.model}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-lg font-semibold">{agent.chatsHandled}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="text-lg font-semibold">{agent.messagesGenerated}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{agent.avgResponseTime}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={agent.isActive ? "default" : "secondary"}>
                              {agent.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No AI agents found. Create your first agent to see performance data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
