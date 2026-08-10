import * as cheerio from "cheerio";
import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { NormalizedReceiptData, ProviderOptions } from "./types.js";

export class TelebirrProvider extends BaseReceiptProvider {
  readonly bankName = "Telebirr (Ethio Telecom)";
  readonly bankCode = "Telebirr";
  readonly supportedDomains = ["transactioninfo.ethiotelecom.et", "telebirr.et", "ethiotelecom.et"];

  canHandle(input: string, options?: ProviderOptions): boolean {
    if (!input) return false;
    const clean = input.trim().toLowerCase();

    // Domain match
    if (this.supportedDomains.some(d => clean.includes(d))) return true;

    // Telebirr transaction reference format (typically 10 numeric digits, or alphanumeric starting with DH/RFT/CL/TB)
    if (
      /^\d{9,12}$/.test(clean) ||
      /^DH[0-9A-Z]{7,12}$/i.test(clean) ||
      /^RFT[0-9A-Z]{7,12}$/i.test(clean) ||
      /^CL[0-9A-Z]{7,12}$/i.test(clean) ||
      /^TB[0-9A-Z]{7,12}$/i.test(clean) ||
      (/^[A-Z0-9]{9,12}$/i.test(clean) && !clean.startsWith("ft") && !clean.startsWith("boa") && !clean.startsWith("ds") && !clean.startsWith("aw"))
    ) {
      return true;
    }

    // Telebirr SMS text format
    if (clean.includes("telebirr") || clean.includes("transferred") && clean.includes("etb")) {
      return true;
    }

    return false;
  }

  buildReceiptUrl(input: string, options?: ProviderOptions): string {
    const clean = input.trim();

    // If complete URL, return as is
    if (/^https?:\/\//i.test(clean)) {
      return clean;
    }

    // Extract transaction/receipt number from URL or raw text
    const numMatch = clean.match(/\b\d{9,12}\b/) || clean.match(/\b[A-Z0-9]{9,14}\b/i);
    const receiptNo = numMatch ? numMatch[0] : clean.replace(/[^a-zA-Z0-9]/g, "");

    return `https://transactioninfo.ethiotelecom.et/receipt/${receiptNo}`;
  }

  parseReceipt(content: string, url: string, options?: ProviderOptions): NormalizedReceiptData | null {
    if (!content) return null;

    try {
      const $ = cheerio.load(content);
      const fullText = $.text().replace(/\s+/g, " ");

      // Check if not found or invalid
      if (
        fullText.toLowerCase().includes("receipt not found") ||
        fullText.toLowerCase().includes("no transaction found") ||
        fullText.toLowerCase().includes("invalid receipt") ||
        fullText.toLowerCase().includes("404")
      ) {
        return null;
      }

      let transactionId = "";
      let payer = "";
      let receiver = "";
      let amountStr = "";
      let dateStr = "";

      // 1. Direct Regex extractions from full text
      const idMatch = fullText.match(/(?:receipt no|transaction no|ref)[:\s]*([a-zA-Z0-9]{8,15})/i) || fullText.match(/\b(?:DH|RFT|CL|TB)[0-9A-Z]{6,12}\b/i) || fullText.match(/\b\d{9,12}\b/) || url.match(/\/receipt\/([a-zA-Z0-9]+)/);
      if (idMatch) transactionId = idMatch[1] || idMatch[0];

      const amtMatch = fullText.match(/(?:transferred amount|amount|etb)[:\s]*([0-9,]+\.?[0-9]*)/i) || fullText.match(/([0-9,]+\.[0-9]{2})\s*ETB/i);
      if (amtMatch) amountStr = amtMatch[1];

      const payerMatch = fullText.match(/(?:payer|sender|from)[:\s]+([A-Za-z\s]{3,30})/i);
      if (payerMatch) payer = payerMatch[1].trim();

      const receiverMatch = fullText.match(/(?:receiver|payee|merchant|to)[:\s]+([A-Za-z\s]{3,30})/i);
      if (receiverMatch) receiver = receiverMatch[1].trim();

      const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})/);
      if (dateMatch) dateStr = dateMatch[0];

      // 2. Element iteration as fallback
      $(".item, .info-row, tr, p").each((_, el) => {
        if ($(el).children().length > 2) return; // ignore large wrapper elements
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const lower = text.toLowerCase();

        if (!transactionId && (lower.includes("receipt no") || lower.includes("transaction no"))) {
          const m = text.match(/\b\d{9,12}\b/);
          if (m) transactionId = m[0];
        }
        if (!payer && (lower.includes("payer") || lower.includes("sender"))) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val) payer = val;
        }
        if (!receiver && (lower.includes("receiver") || lower.includes("merchant"))) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val) receiver = val;
        }
        if (!amountStr && (lower.includes("amount") || lower.includes("etb"))) {
          const m = text.match(/([0-9,]+\.[0-9]{2}|[0-9,]+)/);
          if (m) amountStr = m[1];
        }
      });

      const parsedAmount = this.parseAmountNumber(amountStr);

      if (!transactionId && parsedAmount === 0) {
        return null;
      }

      return {
        verified: true,
        bank: this.bankCode,
        transaction_id: transactionId || "TELEBIRR_REF",
        payer: this.cleanString(payer) || "Telebirr Customer",
        receiver: this.cleanString(receiver) || options?.expectedReceiver || "Merchant",
        amount: parsedAmount > 0 ? parsedAmount.toFixed(2) : amountStr || "0.00",
        currency: "ETB",
        date: dateStr || new Date().toISOString(),
        reference: transactionId,
        receipt_url: url,
        raw_details: {
          extractedTextSnippet: fullText.substring(0, 300)
        }
      };
    } catch (err: any) {
      console.error("Error parsing Telebirr receipt:", err);
      return null;
    }
  }
}
