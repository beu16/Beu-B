export enum ProcessingStatus {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Failed = "failed"
}

export enum VerificationStatus {
  Success = "success",
  Pending = "pending",
  NotFound = "not_found",
  Failed = "failed"
}

export interface VerificationLog {
  requestId: string;
  bank: string;
  reference: string;
  suffix?: string;
  phoneNumber?: string;
  status: "success" | "failed" | "pending" | "not_found";
  verified: boolean;
  senderName?: string;
  receiverName?: string;
  amount?: number;
  transactionDate?: string;
  timestamp: string;
}

export interface ActiveVerification {
  requestId: string;
  bank: string;
  reference: string;
  suffix?: string;
  phoneNumber?: string;
  processingStatus: ProcessingStatus;
  status: VerificationStatus;
  verified: boolean;
  senderName?: string;
  receiverName?: string;
  amount?: number;
  transactionDate?: string;
  errorMessage?: string;
  retryable?: boolean;
}
