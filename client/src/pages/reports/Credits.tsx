import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Coins, MessageCircle } from "lucide-react";

// Hardcoded WhatsApp account details from your prompt
const whatsappAccount = {
  connected: true,
  name: "Life Changing Networks",
  displayPhoneNumber: "+91 98765 43210",
  phoneNumberId: "848441401690739",
  whatsappBusinessAccountId: "3646219455517188",
};

const transactions = [
  { id: 1, date: "27 Nov 2025", type: "Recharge", amount: "+₹4,150", balance: "₹6,170", status: "Success" },
  { id: 2, date: "26 Nov 2025", type: "Usage - Marketing", amount: "-₹1,025", balance: "₹2,025", status: "Success" },
  { id: 3, date: "25 Nov 2025", type: "Usage - Utility", amount: "-₹430", balance: "₹3,050", status: "Success" },
  { id: 4, date: "20 Nov 2025", type: "Recharge", amount: "+₹1,660", balance: "₹3,485", status: "Success" },
  { id: 5, date: "15 Nov 2025", type: "Monthly Subscription", amount: "-₹2,405", balance: "₹1,825", status: "Success" },
];

// Current balance in INR (₹74.50 ≈ ₹6,170 at ~₹82.8/USD)
const currentBalance = "₹6,170";

export default function Credits() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Credits & Transactions</h2>
            <p className="text-muted-foreground">Monitor your wallet balance and WhatsApp usage.</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Credits
          </Button>
        </div>

        {/* WhatsApp Account Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Connected WhatsApp</CardTitle>
              <CardDescription>Business account details</CardDescription>
            </div>
            <MessageCircle className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            {whatsappAccount.connected ? (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Business:</span> {whatsappAccount.name}</p>
                <p><span className="font-medium">Phone:</span> {whatsappAccount.displayPhoneNumber}</p>
                <p><span className="font-medium">Phone ID:</span> {whatsappAccount.phoneNumberId}</p>
                <p><span className="font-medium">WABA ID:</span> {whatsappAccount.whatsappBusinessAccountId}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No WhatsApp account connected.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{currentBalance}</div>
              <p className="text-primary-foreground/80 mt-2">Auto-recharge disabled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Balance Alert</CardTitle>
              <CardDescription>
                Get notified when your balance falls below a threshold.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Current threshold: <span className="font-bold text-foreground">₹830</span>
              </div>
              <Button variant="outline" size="sm">
                Configure Alert
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <Button variant="ghost" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
            <CardDescription>All credit purchases and WhatsApp usage charges.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>{tx.type}</TableCell>
                    <TableCell
                      className={
                        tx.amount.startsWith('+')
                          ? 'text-green-600 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {tx.amount}
                    </TableCell>
                    <TableCell>{tx.balance}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          * All amounts in Indian Rupees (₹). 1 credit ≈ ₹0.01 per WhatsApp message.
        </p>
      </div>
    </DashboardLayout>
  );
}