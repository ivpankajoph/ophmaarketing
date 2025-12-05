import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface DailySpending {
  date: string;
  fullDate: string;
  marketing: number;
  utility: number;
  service: number;
  total: number;
}

interface SpendingData {
  dailySpending: DailySpending[];
  summary: {
    totalSpend: number;
    avgDailySpend: number;
    projectedMonthly: number;
    totalMarketing: number;
    totalUtility: number;
    totalService: number;
    marketingRate: number;
    utilityRate: number;
    serviceRate: number;
  };
  period: string;
}

export default function Spending() {
  const [period, setPeriod] = useState("week");

  const { data, isLoading, error } = useQuery<SpendingData>({
    queryKey: ["/api/reports/spending", period],
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/reports/spending?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch spending data");
      return res.json();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              WhatsApp Spending
            </h2>
            <p className="text-muted-foreground">Track your daily expenditure on WhatsApp conversations.</p>
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
              <p className="text-center text-muted-foreground">Failed to load spending data</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.totalSpend?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">This {period}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Avg Daily Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.avgDailySpend?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Per day average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Projected Monthly
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.projectedMonthly?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Based on current usage</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Category</CardTitle>
                <CardDescription>Daily spend split by conversation type (Marketing, Utility, Service).</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.dailySpending && data.dailySpending.length > 0 ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.dailySpending} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                        />
                        <Legend />
                        <Bar dataKey="marketing" name="Marketing" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="utility" name="Utility" stackId="a" fill="hsl(var(--chart-2))" />
                        <Bar dataKey="service" name="Service" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No spending data available for this period.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Marketing Conversations
                    <Badge variant="outline" className="bg-primary/10">${data?.summary.totalMarketing?.toFixed(2) || '0.00'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.marketingRate?.toFixed(2) || '0.08'} <span className="text-sm font-normal text-muted-foreground">/ conv</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Promotions, offers, updates</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Utility Conversations
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600">${data?.summary.totalUtility?.toFixed(2) || '0.00'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.utilityRate?.toFixed(2) || '0.05'} <span className="text-sm font-normal text-muted-foreground">/ conv</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Transaction updates, post-purchase</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    Service Conversations
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">${data?.summary.totalService?.toFixed(2) || '0.00'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data?.summary.serviceRate?.toFixed(2) || '0.03'} <span className="text-sm font-normal text-muted-foreground">/ conv</span></div>
                  <p className="text-xs text-muted-foreground mt-1">User-initiated support inquiries</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
