import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, ThumbsUp, ThumbsDown, Minus, AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Reply {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  message: string;
  fullMessage: string;
  time: string;
  timestamp: string;
  type: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
}

interface CustomerRepliesData {
  replies: Reply[];
  summary: {
    totalReplies: number;
    positiveSentiment: number;
    unsubscribeRequests: number;
    sentimentBreakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  period: string;
}

export default function CustomerReplies() {
  const [period, setPeriod] = useState("week");

  const { data, isLoading, error } = useQuery<CustomerRepliesData>({
    queryKey: ["/api/reports/customer-replies", period],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/reports/customer-replies?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch customer replies");
      return res.json();
    },
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'Negative':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const variants: Record<string, string> = {
      'Positive': 'text-green-600 bg-green-50 border-green-200',
      'Negative': 'text-red-600 bg-red-50 border-red-200',
      'Neutral': 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return (
      <Badge variant="outline" className={variants[sentiment] || variants['Neutral']}>
        <span className="flex items-center gap-1">
          {getSentimentIcon(sentiment)}
          {sentiment}
        </span>
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Customers Who Replied</h2>
            <p className="text-muted-foreground">Track incoming messages and customer sentiment.</p>
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
              <p className="text-center text-muted-foreground">Failed to load customer replies data</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Replies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.summary.totalReplies || 0}</div>
                  <p className="text-xs text-muted-foreground">This {period}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    Positive Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{data?.summary.positiveSentiment || 0}%</div>
                  <p className="text-xs text-muted-foreground">{data?.summary.sentimentBreakdown?.positive || 0} positive replies</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    Negative Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{data?.summary.sentimentBreakdown?.negative || 0}</div>
                  <p className="text-xs text-muted-foreground">Negative replies</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Unsubscribe Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{data?.summary.unsubscribeRequests || 0}</div>
                  <p className="text-xs text-muted-foreground">Stop/unsubscribe requests</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Replies</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.replies && data.replies.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.replies.map((reply) => (
                        <TableRow key={reply.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {reply.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{reply.name}</div>
                                <div className="text-xs text-muted-foreground">{reply.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[300px] truncate">
                            "{reply.message}"
                          </TableCell>
                          <TableCell className="text-muted-foreground">{reply.time}</TableCell>
                          <TableCell>
                            {getSentimentBadge(reply.sentiment)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="mr-2 h-4 w-4" /> Reply
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No customer replies found for this period.</p>
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
