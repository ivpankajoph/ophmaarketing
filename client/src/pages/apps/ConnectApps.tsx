import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, MessageCircle, Facebook, Sparkles, Bot, Mail, CreditCard, 
  CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, Trash2, RefreshCw
} from "lucide-react";
import { getAuthHeaders } from "@/contexts/AuthContext";

interface RequiredField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  authType: string;
  requiredFields: RequiredField[];
  optionalFields?: RequiredField[];
  capabilities: string[];
  documentationUrl?: string;
  webhookSupport: boolean;
}

interface ConnectedAccount {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending' | 'expired';
  credentials: Record<string, string>;
  metadata: Record<string, any>;
  isDefault: boolean;
  lastVerifiedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionWithStatus {
  provider: IntegrationProvider;
  connection: ConnectedAccount | null;
  isConnected: boolean;
}

const iconMap: Record<string, any> = {
  MessageCircle,
  Facebook,
  Sparkles,
  Bot,
  Mail,
  CreditCard,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || MessageCircle;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    messaging: 'bg-green-600',
    social: 'bg-blue-600',
    ai: 'bg-purple-600',
    marketing: 'bg-orange-600',
    payment: 'bg-emerald-600',
    crm: 'bg-indigo-600',
  };
  return colors[category] || 'bg-gray-600';
}

function getStatusBadge(status: string | undefined) {
  if (!status) return null;

  switch (status) {
    case 'connected':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
    case 'error':
      return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
    case 'expired':
      return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
    default:
      return null;
  }
}

export default function ConnectApps() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connectionsWithStatus, isLoading } = useQuery<ConnectionWithStatus[]>({
    queryKey: ['/api/integrations/connections/status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations/connections/status', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch connections');
      const originalData: ConnectionWithStatus[] = await response.json();

      // Inject hardcoded demo connections for WhatsApp and Facebook
      return originalData.map(item => {
        if (item.provider.id === 'whatsapp') {
          return {
            ...item,
            isConnected: true,
            connection: {
              id: 'conn_whatsapp_demo',
              userId: 'user_123',
              providerId: 'whatsapp',
              providerName: 'WhatsApp',
              status: 'connected',
              credentials: {},
              metadata: {
                displayPhoneNumber: '+1 (555) 123-4567',
                verifiedName: 'Your Business',
                phoneNumberId: '848441401690739',
                whatsappBusinessAccountId: '3646219455517188',
              },
              isDefault: true,
              lastVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          };
        }

        if (item.provider.id === 'facebook') {
          return {
            ...item,
            isConnected: true,
            connection: {
              id: 'conn_facebook_demo',
              userId: 'user_123',
              providerId: 'facebook',
              providerName: 'Facebook',
              status: 'connected',
              credentials: {},
              metadata: {
                verifiedName: 'Life changing Networks',
                pageId: '123456789012345',
              },
              isDefault: false,
              lastVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          };
        }

        // Ensure non-connected integrations stay unconnected
        if (!item.isConnected) {
          return {
            ...item,
            isConnected: false,
            connection: null,
          };
        }

        return item;
      });
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { providerId: string; credentials: Record<string, string> }) => {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Connection failed');
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Connected Successfully",
        description: data.message || "Your account has been connected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/connections/status'] });
      setSelectedProvider(null);
      setCredentials({});
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/integrations/connections/${connectionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Disconnect failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "The integration has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/connections/status'] });
      setDisconnectId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnect Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/integrations/connections/${connectionId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Verification Successful" : "Verification Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/connections/status'] });
    }
  });

  const handleConnect = async () => {
    if (!selectedProvider) return;

    for (const field of selectedProvider.requiredFields) {
      if (!credentials[field.key]) {
        toast({
          title: "Missing Required Field",
          description: `Please enter ${field.label}`,
          variant: "destructive"
        });
        return;
      }
    }

    setIsConnecting(true);
    try {
      await connectMutation.mutateAsync({
        providerId: selectedProvider.id,
        credentials
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredConnections = connectionsWithStatus?.filter(item => 
    item.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.provider.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const categories = Array.from(new Set(filteredConnections.map(item => item.provider.category)));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connected Apps</h2>
          <p className="text-muted-foreground">Connect your business accounts and services to enable features.</p>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search integrations..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          categories.map(category => (
            <div key={category} className="space-y-4">
              <h3 className="text-lg font-semibold capitalize">{category}</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredConnections
                  .filter(item => item.provider.category === category)
                  .map(({ provider, connection, isConnected }) => {
                    const IconComponent = getIconComponent(provider.icon);
                    return (
                      <Card key={provider.id} className="hover:shadow-md transition-shadow relative">
                        {connection && (
                          <div className="absolute top-4 right-4">
                            {getStatusBadge(connection.status)}
                          </div>
                        )}
                        <CardHeader className="flex flex-row items-start gap-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-white ${getCategoryColor(provider.category)}`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{provider.name}</CardTitle>
                            {provider.documentationUrl && (
                              <a 
                                href={provider.documentationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                              >
                                View Docs <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CardDescription className="h-10">{provider.description}</CardDescription>

                          {connection?.status === 'connected' && connection.metadata && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              {connection.metadata.displayPhoneNumber && (
                                <p>Phone: {connection.metadata.displayPhoneNumber}</p>
                              )}
                              {connection.metadata.verifiedName && (
                                <p>Name: {connection.metadata.verifiedName}</p>
                              )}
                              {connection.metadata.phoneNumberId && (
                                <p>Phone number ID: {connection.metadata.phoneNumberId}</p>
                              )}
                              {connection.metadata.whatsappBusinessAccountId && (
                                <p>WhatsApp Business Account ID: {connection.metadata.whatsappBusinessAccountId}</p>
                              )}
                              {connection.lastVerifiedAt && (
                                <p>Verified: {new Date(connection.lastVerifiedAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          )}

                          {connection?.status === 'error' && connection.errorMessage && (
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                              {connection.errorMessage}
                            </p>
                          )}

                          {/* Show hint for unconnected integrations */}
                          {!isConnected && (
                            <p className="text-xs text-muted-foreground italic">
                              API credentials required to connect.
                            </p>
                          )}

                          <div className="flex gap-2">
                            {isConnected ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => connection && verifyMutation.mutate(connection.id)}
                                  disabled={verifyMutation.isPending}
                                >
                                  <RefreshCw className={`w-4 h-4 mr-1 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                                  Verify
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => connection && setDisconnectId(connection.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Disconnect
                                </Button>
                              </>
                            ) : (
                              <Button 
                                className="w-full"
                                onClick={() => {
                                  setSelectedProvider(provider);
                                  setCredentials({});
                                }}
                              >
                                Connect
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Modal */}
      <Dialog open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to connect {selectedProvider?.name}. Your credentials are encrypted and stored securely.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedProvider?.requiredFields.map(field => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label} *</Label>
                {field.type === 'select' && field.options ? (
                  <Select
                    value={credentials[field.key] || ''}
                    onValueChange={(value) => setCredentials(prev => ({ ...prev, [field.key]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={credentials[field.key] || ''}
                    onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}

            {selectedProvider?.optionalFields && selectedProvider.optionalFields.length > 0 && (
              <>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Optional Settings</p>
                </div>
                {selectedProvider.optionalFields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === 'select' && field.options ? (
                      <Select
                        value={credentials[field.key] || ''}
                        onValueChange={(value) => setCredentials(prev => ({ ...prev, [field.key]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.key}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credentials[field.key] || ''}
                        onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProvider(null)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Modal */}
      <Dialog open={!!disconnectId} onOpenChange={(open) => !open && setDisconnectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Integration</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this integration? This will remove the stored credentials and may affect features that depend on it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => disconnectId && disconnectMutation.mutate(disconnectId)}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}