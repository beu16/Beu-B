export interface BrevoStatusResponse {
  configured: boolean;
  senderEmail: string;
  senderName: string;
  accountStatus?: any;
  message: string;
}

export async function checkBrevoStatus(): Promise<BrevoStatusResponse> {
  try {
    const res = await fetch("/api/brevo/status");
    if (!res.ok) {
      return {
        configured: false,
        senderEmail: "",
        senderName: "",
        message: `HTTP ${res.status}: Server endpoint failed`
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      senderEmail: "",
      senderName: "",
      message: err?.message || "Failed to contact Brevo status API"
    };
  }
}

export async function sendEmailViaBrevo(data: {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  contentHtml: string;
  senderEmail?: string;
  senderName?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/brevo/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "Email dispatch failed" };
  }
}

export async function sendSmsViaBrevo(data: {
  phoneNumber: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/brevo/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "SMS dispatch failed" };
  }
}

export async function sendReceiptEmailViaBrevo(data: {
  recipientEmail: string;
  recipientName?: string;
  merchant: string;
  amount: number;
  reference: string;
  date: string;
  senderEmail?: string;
  senderName?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/brevo/send-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || "Receipt email dispatch failed" };
  }
}
