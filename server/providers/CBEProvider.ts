import * as cheerio from "cheerio";
import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { NormalizedReceiptData, ProviderOptions } from "./types.js";

export class CBEProvider extends BaseReceiptProvider {
  readonly bankName = "Commercial Bank of Ethiopia";
  readonly bankCode = "CBE";
  readonly supportedDomains = ["apps.cbe.com.et", "cbe.com.et", "mbreciept.cbe.com.et"];

  canHandle(input: string, options?: ProviderOptions): boolean {
    if (!input) return false;
    const clean = input.trim().toLowerCase();

    // Check domain match
    if (this.supportedDomains.some(d => clean.includes(d))) return true;

    // Check FT reference format (e.g., FT24012A3B94)
    if (/^FT[A-Z0-9]{5,14}$/i.test(clean) || clean.includes("ft") && /\bFT[A-Z0-9]{5,14}\b/i.test(clean)) {
      return true;
    }

    // Explicit bank selection
    if (options?.accountSuffix && (clean.startsWith("ft") || clean.length >= 8)) {
      return true;
    }

    return false;
  }

  buildReceiptUrl(input: string, options?: ProviderOptions): string {
    const clean = input.trim();

    // If already a complete http/https URL, return as is
    if (/^https?:\/\//i.test(clean)) {
      return clean;
    }

    // Extract clean FT number or reference code
    const ftMatch = clean.match(/\bFT[A-Z0-9]{8,14}\b/i);
    const reference = ftMatch ? ftMatch[0].toUpperCase() : clean.replace(/[^a-zA-Z0-9]/g, "");

    // Check if account suffix provided for classic CBE portal
    const suffix = options?.accountSuffix ? options.accountSuffix.trim() : "";

    if (reference.toUpperCase().startsWith("FT")) {
      return `https://apps.cbe.com.et:100/?id=${reference}${suffix}`;
    }

    // Mobile slip shortcut
    return `https://mbreciept.cbe.com.et/receipt/${reference}`;
  }

  parseReceipt(content: string, url: string, options?: ProviderOptions): NormalizedReceiptData | null {
    if (!content) return null;

    try {
      const $ = cheerio.load(content);
      const fullText = $.text().replace(/\s+/g, " ");

      // Check if page indicates not found or invalid
      if (
        fullText.toLowerCase().includes("receipt not found") ||
        fullText.toLowerCase().includes("invalid transaction") ||
        fullText.toLowerCase().includes("no record found")
      ) {
        return null;
      }

      let transactionId = "";
      let payer = "";
      let receiver = "";
      let amountStr = "";
      let dateStr = "";
      let reference = "";

      // Extract from table rows or key-value pairs using Cheerio
      $("tr, div, p").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const lower = text.toLowerCase();

        if (lower.includes("transaction id") || lower.includes("ft number") || lower.includes("reference")) {
          const match = text.match(/FT[A-Z0-9]{8,14}/i) || text.split(/[:\-]/)[1]?.trim();
          if (match && !transactionId) {
            transactionId = typeof match === "string" ? match : match[0];
          }
        }

        if (lower.includes("payer") || lower.includes("sender") || lower.includes("debited account") || lower.includes("from")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !payer) payer = val;
        }

        if (lower.includes("receiver") || lower.includes("beneficiary") || lower.includes("credited account") || lower.includes("to")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !receiver) receiver = val;
        }

        if (lower.includes("amount") || lower.includes("transfer amount") || lower.includes("etb")) {
          const match = text.match(/([0-9,]+\.?[0-9]*)/);
          if (match && !amountStr) amountStr = match[1];
        }

        if (lower.includes("date") || lower.includes("time")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !dateStr) dateStr = val;
        }
      });

      // Regex fallbacks if Cheerio table parsing missed any fields
      if (!transactionId) {
        const ftMatch = fullText.match(/\bFT[A-Z0-9]{8,14}\b/i) || url.match(/\bFT[A-Z0-9]{8,14}\b/i);
        if (ftMatch) transactionId = ftMatch[0].toUpperCase();
      }

      if (!amountStr) {
        const amtMatch = fullText.match(/(?:ETB|Birr|Amount)[:\s]*([0-9,]+\.?[0-9]*)/i) || fullText.match(/([0-9,]+\.[0-9]{2})/);
        if (amtMatch) amountStr = amtMatch[1];
      }

      if (!payer) {
        const payerMatch = fullText.match(/(?:Payer|Sender|From)[:\s]+([A-Za-z\s]{3,30})/i);
        if (payerMatch) payer = payerMatch[1].trim();
      }

      if (!receiver) {
        const recMatch = fullText.match(/(?:Beneficiary|Receiver|Credited|To)[:\s]+([A-Za-z\s]{3,30})/i);
        if (recMatch) receiver = recMatch[1].trim();
      }

      if (!dateStr) {
        const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
        if (dateMatch) dateStr = dateMatch[0];
      }

      reference = transactionId || url.split("=")[1] || "CBE_REF";

      // Calculate numeric amount
      const parsedAmount = this.parseAmountNumber(amountStr);

      // Require at least a transaction ID or amount to consider parsed receipt valid
      if (!transactionId && parsedAmount === 0) {
        return null;
      }

      return {
        verified: true,
        bank: this.bankCode,
        transaction_id: transactionId || reference,
        payer: this.cleanString(payer) || "CBE Customer",
        receiver: this.cleanString(receiver) || options?.expectedReceiver || "Merchant",
        amount: parsedAmount > 0 ? parsedAmount.toFixed(2) : amountStr || "0.00",
        currency: "ETB",
        date: dateStr || new Date().toISOString(),
        reference: reference,
        receipt_url: url,
        raw_details: {
          extractedTextSnippet: fullText.substring(0, 300)
        }
      };
    } catch (err: any) {
      console.error("Error parsing CBE receipt:", err);
      return null;
    }
  }
}
