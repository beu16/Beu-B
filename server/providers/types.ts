export type ReceiptVerificationStatus =
  | "Verified"
  | "Receipt Not Found"
  | "Receipt Mismatch"
  | "Invalid Receipt"
  | "Bank Unavailable"
  | "Unsupported Bank";

export interface NormalizedReceiptData {
  verified: boolean;
  bank: string; // e.g. "CBE", "Telebirr", "BOA", "Dashen", "Awash", "COOP"
  transaction_id: string;
  payer: string;
  receiver: string;
  amount: string;
  currency: string;
  date: string;
  reference: string;
  receipt_url: string;
  raw_details?: Record<string, any>;
  error_message?: string;
}

export interface VerificationResult {
  status: ReceiptVerificationStatus;
  success: boolean;
  message: string;
  data?: NormalizedReceiptData;
  raw_response?: string;
}

export interface ProviderOptions {
  accountSuffix?: string;
  phoneNumber?: string;
  expectedAmount?: number;
  expectedReceiver?: string;
  timeoutMs?: number;
}
