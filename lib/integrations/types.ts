/**
 * Integration Types and Interfaces
 */

export interface IntegrationCredentials {
  id: string;
  userId: string;
  integrationType: 'XERO' | 'MYOB' | 'QUICKBOOKS' | 'BILLIONMAIL' | 'MAUTIC' | 'STRIPE' | 'PAYPAL';
  integrationName: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  apiKey?: string;
  apiSecret?: string;
  customData?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  syncError?: string;
}

export interface SyncResult {
  success: boolean;
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  errors?: string[];
  duration: number;
  message: string;
}

export interface InvoiceSyncData {
  externalId: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: string;
  invoiceDate: Date;
  dueDate: Date;
  contactName?: string;
  description?: string;
}

export interface ContactSyncData {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
}

export interface PaymentSyncData {
  externalId: string;
  amount: number;
  currency: string;
  status: string;
  paymentDate: Date;
  description?: string;
  invoiceId?: string;
}

export interface CampaignSyncData {
  externalId: string;
  campaignName: string;
  status: string;
  recipientsCount?: number;
  contactsCount?: number;
}

export interface BaseIntegrationService {
  authenticate(): Promise<boolean>;
  refreshToken?(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  syncData(dataType: string): Promise<SyncResult>;
}

export interface XeroAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface MyobAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface QuickBooksAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in: number;
}

export interface BillionMailResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MauticResponse {
  success: boolean;
  data?: any;
  errors?: any;
}

export interface StripeResponse {
  success: boolean;
  data?: any;
  error?: any;
}

export interface PayPalResponse {
  success: boolean;
  data?: any;
  error?: any;
}
