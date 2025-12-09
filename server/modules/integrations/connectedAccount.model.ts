import mongoose, { Schema, Document } from 'mongoose';
import { ConnectedAccountData, IntegrationStatus } from './integration.types';

export interface IConnectedAccount extends Document {
  id: string;
  userId: string;
  providerId: string;
  providerName: string;
  status: IntegrationStatus;
  credentials: Map<string, string>;
  metadata: Map<string, any>;
  isDefault: boolean;
  lastVerifiedAt?: Date;
  lastSyncAt?: Date;
  expiresAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  providerId: { type: String, required: true, index: true },
  providerName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['connected', 'disconnected', 'error', 'pending', 'expired'],
    default: 'pending'
  },
  credentials: { type: Map, of: String, required: true },
  metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  isDefault: { type: Boolean, default: false },
  lastVerifiedAt: { type: Date },
  lastSyncAt: { type: Date },
  expiresAt: { type: Date },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { 
  collection: 'connected_accounts',
  timestamps: true
});

ConnectedAccountSchema.index({ userId: 1, providerId: 1 });
ConnectedAccountSchema.index({ userId: 1, providerId: 1, isDefault: 1 });

export const ConnectedAccount = mongoose.models.ConnectedAccount || 
  mongoose.model<IConnectedAccount>('ConnectedAccount', ConnectedAccountSchema);

export function toConnectedAccountData(doc: IConnectedAccount): ConnectedAccountData {
  const credentialsObj: Record<string, string> = {};
  if (doc.credentials) {
    doc.credentials.forEach((value, key) => {
      credentialsObj[key] = value;
    });
  }
  
  const metadataObj: Record<string, any> = {};
  if (doc.metadata) {
    doc.metadata.forEach((value, key) => {
      metadataObj[key] = value;
    });
  }
  
  return {
    id: doc.id,
    userId: doc.userId,
    providerId: doc.providerId,
    providerName: doc.providerName,
    status: doc.status,
    credentials: credentialsObj,
    metadata: metadataObj,
    isDefault: doc.isDefault,
    lastVerifiedAt: doc.lastVerifiedAt?.toISOString(),
    lastSyncAt: doc.lastSyncAt?.toISOString(),
    expiresAt: doc.expiresAt?.toISOString(),
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}
