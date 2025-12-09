export type AuthType = 'api_key' | 'oauth' | 'credentials';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'expired';

export interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'messaging' | 'social' | 'ai' | 'crm' | 'marketing' | 'payment' | 'other';
  authType: AuthType;
  requiredFields: RequiredField[];
  optionalFields?: RequiredField[];
  capabilities: string[];
  documentationUrl?: string;
  webhookSupport: boolean;
  oauthConfig?: OAuthConfig;
}

export interface RequiredField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  callbackPath: string;
}

export interface ConnectedAccountData {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  status: IntegrationStatus;
  credentials: Record<string, string>;
  metadata: Record<string, any>;
  isDefault: boolean;
  lastVerifiedAt?: string;
  lastSyncAt?: string;
  expiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectIntegrationInput {
  providerId: string;
  credentials: Record<string, string>;
  metadata?: Record<string, any>;
  setAsDefault?: boolean;
}

export interface VerifyConnectionResult {
  success: boolean;
  message: string;
  metadata?: Record<string, any>;
}
