import * as cheerio from "cheerio";
import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { NormalizedReceiptData, ProviderOptions } from "./types.js";

export class BOAProvider extends BaseReceiptProvider {
  readonly bankName = "Bank of Abyssinia";
  readonly bankCode = "BOA";
  readonly supportedDomains = ["cs.bankofabyssinia.com", "bankofabyssinia.com"];

  canHandle(input: string, options?: ProviderOptions): boolean {
    if (!input) return false;
    const clean = input.trim().toLowerCase();

    if (this.supportedDomains.some(d => clean.includes(d))) return true;

    if (/^BOA[A-Z0-9]{5,12}$/i.test(clean) || /^AT[A-Z0-9]{5,12}$/i.test(clean)) {
      return true;
    }

    if (options?.accountSuffix && (clean.startsWith("boa") || clean.startsWith("at") || clean.length >= 8)) {
      return true;
    }

    return false;
  }

  buildReceiptUrl(input: string, options?: ProviderOptions): string {
    const clean = input.trim();

    if (/^https?:\/\//i.test(clean)) {
      return clean;
    }

    const refMatch = clean.match(/\b[A-Z0-9]{8,14}\b/i);
    const reference = refMatch ? refMatch[0].toUpperCase() : clean.replace(/[^a-zA-Z0-9]/g, "");
    const suffix = options?.accountSuffix ? options.accountSuffix.trim() : "";

    return `https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=${reference}${suffix}`;
  }

  parseReceipt(content: string, url: string, options?: ProviderOptions): NormalizedReceiptData | null {
    if (!content) return null;

    try {
      // 1. Try parsing JSON response from BOA API
      let jsonObj: any = null;
      try {
        jsonObj = JSON.parse(content);
      } catch {
        jsonObj = null;
      }

      if (jsonObj) {
        const data = jsonObj.data || jsonObj.details || jsonObj.result || jsonObj;
        if (!data || jsonObj.success === false || jsonObj.status === "error") {
          return null;
        }

        const transactionId = data.reference || data.transactionId || data.id || url.split("=")[1] || "BOA_REF";
        const payer = data.payer || data.senderName || data.debitedAccountName || "BOA Account Holder";
        const receiver = data.payee || data.receiverName || data.creditedAccountName || options?.expectedReceiver || "Merchant";
        const amountNum = this.parseAmountNumber(data.amount || data.transferAmount || 0);
        const dateStr = data.date || data.transactionDate || new Date().toISOString();

        if (amountNum === 0 && !data.reference) {
          return null;
        }

        return {
          verified: true,
          bank: this.bankCode,
          transaction_id: transactionId,
          payer: this.cleanString(payer),
          receiver: this.cleanString(receiver),
          amount: amountNum.toFixed(2),
          currency: "ETB",
          date: dateStr,
          reference: transactionId,
          receipt_url: url,
          raw_details: data
        };
      }

      // 2. HTML Slip fallback parsing
      const $ = cheerio.load(content);
      const fullText = $.text().replace(/\s+/g, " ");

      if (fullText.toLowerCase().includes("not found") || fullText.toLowerCase().includes("invalid")) {
        return null;
      }

      let transactionId = "";
      let payer = "";
      let receiver = "";
      let amountStr = "";
      let dateStr = "";

      $("tr, div, p").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const lower = text.toLowerCase();

        if (lower.includes("reference") || lower.includes("transaction id")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !transactionId) transactionId = val;
        }
        if (lower.includes("payer") || lower.includes("sender") || lower.includes("debited")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !payer) payer = val;
        }
        if (lower.includes("receiver") || lower.includes("payee") || lower.includes("credited")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !receiver) receiver = val;
        }
        if (lower.includes("amount") || lower.includes("etb")) {
          const match = text.match(/([0-9,]+\.?[0-9]*)/);
          if (match && !amountStr) amountStr = match[1];
        }
        if (lower.includes("date") || lower.includes("time")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !dateStr) dateStr = val;
        }
      });

      const parsedAmount = this.parseAmountNumber(amountStr);

      if (!transactionId && parsedAmount === 0) {
        return null;
      }

      return {
        verified: true,
        bank: this.bankCode,
        transaction_id: transactionId || url.split("=")[1] || "BOA_REF",
        payer: this.cleanString(payer) || "BOA Customer",
        receiver: this.cleanString(receiver) || options?.expectedReceiver || "Merchant",
        amount: parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00",
        currency: "ETB",
        date: dateStr || new Date().toISOString(),
        reference: transactionId || "BOA_REF",
        receipt_url: url
      };
    } catch (err: any) {
      console.error("Error parsing BOA receipt:", err);
      return null;
    }
  }
}
