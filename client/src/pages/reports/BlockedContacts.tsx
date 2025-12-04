import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Ban, UserCheck, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BlockedContact {
  id: string;
  userId: string;
  phone: string;
  name: string;
  reason: string;
  blockedAt: string;
  isActive: boolean;
}

export default function BlockedContacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<BlockedContact | null>(null);
  const queryClient = useQueryClient();

  const { data: blockedContacts = [], isLoading } = useQuery<BlockedContact[]>({
    queryKey: ["/api/contacts/blocked"],
    queryFn: async () => {
      const res = await fetch("/api/contacts/blocked");
      if (!res.ok) throw new Error("Failed to fetch blocked contacts");
      return res.json();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await fetch("/api/contacts/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error("Failed to unblock contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/blocked"] });
      setUnblockDialogOpen(false);
      setSelectedContact(null);
      toast.success("Contact unblocked successfully");
    },
    onError: () => {
      toast.error("Failed to unblock contact");
    },
  });

  const filteredContacts = blockedContacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.phone.toLowerCase().includes(query) ||
      contact.name.toLowerCase().includes(query) ||
      contact.reason.toLowerCase().includes(query)
    );
  });

  const formatPhone = (phone: string) => {
    if (phone.startsWith("+")) return phone;
    return `+${phone}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Blocked Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage contacts you've blocked from sending messages
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Blocked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blockedContacts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {blockedContacts.filter(c => c.reason).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {blockedContacts.filter(c => {
                  const blockDate = new Date(c.blockedAt);
                  const now = new Date();
                  return blockDate.getMonth() === now.getMonth() && 
                         blockDate.getFullYear() === now.getFullYear();
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Blocked Contacts List</CardTitle>
            <CardDescription>
              View and manage all blocked contacts. Unblock contacts to resume receiving their messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone, name, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Ban className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No blocked contacts</p>
                <p className="text-sm">
                  {searchQuery ? "No contacts match your search" : "You haven't blocked any contacts yet"}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {formatPhone(contact.phone)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {contact.reason ? (
                            <span className="text-sm text-muted-foreground truncate block">
                              {contact.reason}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">No reason provided</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.blockedAt ? format(new Date(contact.blockedAt), "MMM d, yyyy h:mm a") : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
                            <Ban className="h-3 w-3 mr-1" />
                            Blocked
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedContact(contact);
                              setUnblockDialogOpen(true);
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock {selectedContact?.name || formatPhone(selectedContact?.phone || "")}? 
              You will start receiving messages from this contact again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedContact) {
                  unblockMutation.mutate(selectedContact.phone);
                }
              }}
            >
              Unblock Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
