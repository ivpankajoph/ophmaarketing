import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Download, Plus, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: "purchase" | "usage";
  amount: number;
  description: string;
  createdAt: string;
}

interface Billing {
  id: string;
  credits: number;
  transactions: Transaction[];
}

// Hardcoded WhatsApp account details (from your prompt)
const whatsappAccount = {
  connected: true,
  name: "Life Changing Networks",
  displayPhoneNumber: "+91 98765 43210",
  phoneNumberId: "848441401690739",
  whatsappBusinessAccountId: "3646219455517188",
};

export default function BillingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: billing, isLoading } = useQuery<Billing>({
    queryKey: ["/api/billing"],
    queryFn: async () => {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error("Failed to fetch billing");
      return res.json();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/billing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to purchase credits");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing"] });
      setIsDialogOpen(false);
      setPurchaseAmount("");
      toast.success("Credits purchased successfully!");
    },
    onError: () => {
      toast.error("Failed to purchase credits");
    },
  });

  const handlePurchase = () => {
    const amount = parseInt(purchaseAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    purchaseMutation.mutate(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getUsedCredits = () => {
    if (!billing) return 0;
    return billing.transactions
      .filter(t => t.type === "usage")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const totalCredits = (billing?.credits || 0) + getUsedCredits();
  const usedCredits = getUsedCredits();
  const usagePercent = totalCredits > 0 ? Math.min((usedCredits / totalCredits) * 100, 100) : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing & Credits</h2>
          <p className="text-muted-foreground">Manage your credits and connected WhatsApp account.</p>
        </div>

        {/* WhatsApp Account Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">WhatsApp Account</CardTitle>
              <CardDescription>Connected business profile</CardDescription>
            </div>
            <MessageCircle className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            {whatsappAccount.connected ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Business Name:</span> {whatsappAccount.name}</p>
                <p><span className="font-medium">Phone:</span> {whatsappAccount.displayPhoneNumber}</p>
                <p><span className="font-medium">Phone Number ID:</span> {whatsappAccount.phoneNumberId}</p>
                <p><span className="font-medium">WABA ID:</span> {whatsappAccount.whatsappBusinessAccountId}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No WhatsApp account connected.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Available Credits */}
          <Card className="bg-primary text-primary-foreground border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium opacity-90">Available Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{billing?.credits?.toLocaleString('en-IN') || 0}</div>
              <p className="text-xs opacity-80 mt-1">Each credit ≈ ₹0.01 per message*</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="w-full mt-4 text-primary">
                    <Plus className="mr-2 h-4 w-4" /> Recharge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Purchase Credits</DialogTitle>
                    <DialogDescription>
                      Add credits to your account. Pricing starts at ₹5 for 500 credits.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Credits to Add</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 1000"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[500, 1000, 2000].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          onClick={() => setPurchaseAmount(amount.toString())}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePurchase} disabled={purchaseMutation.isPending}>
                      {purchaseMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Purchase
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Usage & Graph */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Credits Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{usedCredits.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                of {totalCredits.toLocaleString('en-IN')} total
              </p>
              {/* Enhanced Usage Bar */}
              <div className="mt-3 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-right text-xs text-muted-foreground mt-1">
                {Math.round(usagePercent)}% used
              </p>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">INR (₹) Billing</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => toast.info("UPI, Cards & NetBanking supported")}
              >
                Manage Payment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent credit purchases and usage.</CardDescription>
          </CardHeader>
          <CardContent>
            {billing?.transactions && billing.transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount (Credits)</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.transactions.slice().reverse().map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === "purchase" ? "default" : "secondary"}>
                          {transaction.type === "purchase" ? "Purchase" : "Usage"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toast.success("Invoice downloaded")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet.
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          * Actual pricing may vary. 1 credit ≈ 1 outbound message on WhatsApp (INR-based).
        </p>
      </div>
    </DashboardLayout>
  );
}