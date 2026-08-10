import * as cheerio from "cheerio";
import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { NormalizedReceiptData, ProviderOptions } from "./types.js";

export class DashenProvider extends BaseReceiptProvider {
  readonly bankName = "Dashen Bank";
  readonly bankCode = "Dashen";
  readonly supportedDomains = ["dashensuperapp.com", "dashenbanksc.com", "receipt.dashensuperapp.com"];

  canHandle(input: string, options?: ProviderOptions): boolean {
    if (!input) return false;
    const clean = input.trim().toLowerCase();

    if (this.supportedDomains.some(d => clean.includes(d))) return true;

    if (/^DS[A-Z0-9]{5,14}$/i.test(clean) || /^DASH[A-Z0-9]{5,12}$/i.test(clean)) {
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

    return `https://receipt.dashensuperapp.com/receipt?ref=${reference}`;
  }

  parseReceipt(content: string, url: string, options?: ProviderOptions): NormalizedReceiptData | null {
    if (!content) return null;

    try {
      const $ = cheerio.load(content);
      $("script, style, noscript, svg, head, iframe, link, meta").remove();
      const fullText = $.text().replace(/\s+/g, " ");

      if (
        fullText.toLowerCase().includes("not found") ||
        fullText.toLowerCase().includes("invalid reference") ||
        fullText.toLowerCase().includes("no transaction")
      ) {
        return null;
      }

      let transactionId = "";
      let payer = "";
      let receiver = "";
      let amountStr = "";
      let dateStr = "";

      $("tr, div, p, span").each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const lower = text.toLowerCase();

        if (lower.includes("reference") || lower.includes("transaction id")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !transactionId) transactionId = val;
        }
        if (lower.includes("sender") || lower.includes("payer") || lower.includes("from")) {
          const val = text.split(/[:\-]/)[1]?.trim();
          if (val && !payer) payer = val;
        }
        if (lower.includes("receiver") || lower.includes("beneficiary") || lower.includes("to")) {
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
        transaction_id: transactionId || url.split("=")[1] || "DASHEN_REF",
        payer: this.cleanString(payer) || "Dashen Bank Customer",
        receiver: this.cleanString(receiver) || options?.expectedReceiver || "Merchant",
        amount: parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00",
        currency: "ETB",
        date: dateStr || new Date().toISOString(),
        reference: transactionId || "DASHEN_REF",
        receipt_url: url
      };
    } catch (err: any) {
      console.error("Error parsing Dashen receipt:", err);
      return null;
    }
  }
}
