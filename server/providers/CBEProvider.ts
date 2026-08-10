import * as cheerio from "cheerio";
import { BaseReceiptProvider } from "./BaseReceiptProvider.js";
import { NormalizedReceiptData, ProviderOptions } from "./types.js";

export class CBEProvider extends BaseReceiptProvider {
  readonly bankName = "Commercial Bank of Ethiopia";
  readonly bankCode = "CBE";
  readonly supportedDomains = ["apps.cbe.com.et", "cbe.com.et", "mbreciept.cbe.com.et", "cbepay.cbe.com.et", "mreceipt.cbe.com.et"];

  canHandle(input: string, options?: ProviderOptions): boolean {
    if (!input) return false;
    const clean = input.trim().toLowerCase();

    // Check domain match
    if (this.supportedDomains.some(d => clean.includes(d))) return true;

    // Check FT reference format (e.g., FT24012A3B94 or FT...)
    if (/^FT[A-Z0-9]{5,16}$/i.test(clean) || clean.includes("ft") || /\bFT[A-Z0-9]{5,16}\b/i.test(clean)) {
      return true;
    }

    // Explicit bank selection or general CBE references
    if (clean.includes("cbe") || clean.includes("cbepay") || (options?.accountSuffix && clean.length >= 6)) {
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
    const ftMatch = clean.match(/\bFT[A-Z0-9]{8,16}\b/i) || clean.match(/\b[A-Z0-9]{8,16}\b/i);
    const reference = ftMatch ? ftMatch[0].toUpperCase() : clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    // Check if account suffix provided for classic CBE portal
    const suffix = options?.accountSuffix ? options.accountSuffix.trim() : "";

    if (reference.startsWith("FT")) {
      return `https://apps.cbe.com.et/mreceipt/${reference}${suffix ? `?suffix=${suffix}` : ""}`;
    }

    // Mobile slip shortcut
    return `https://cbepay.cbe.com.et/receipt?id=${reference}`;
  }

  parseReceipt(content: string, url: string, options?: ProviderOptions): NormalizedReceiptData | null {
    if (!content) return null;

    try {
      const $ = cheerio.load(content);
      
      // Clean DOM by removing scripts, styles, SVGs, and iframe elements that contain CSS noise
      $("script, style, noscript, svg, head, iframe, link, meta").remove();

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

      const isNoise = (s: string) => {
        if (!s) return true;
        const l = s.toLowerCase();
        return (
          l.includes("emoji") ||
          l.includes("font") ||
          l.includes("sans-serif") ||
          l.includes("border") ||
          l.includes("padding") ||
          l.includes("color") ||
          l.includes("margin") ||
          l.includes("display") ||
          l.includes("flex") ||
          l.includes("width") ||
          l.includes("height")
        );
      };

      // 1. Extract from standard <tr> table rows: <td>label</td><td>value</td>
      $("tr").each((_, tr) => {
        const tds = $(tr).find("td, th");
        if (tds.length >= 2) {
          const label = $(tds[0]).text().trim().toLowerCase();
          const val = $(tds[1]).text().trim();

          if (val && !isNoise(val)) {
            if ((label.includes("transaction") || label.includes("ft number") || label.includes("reference") || label.includes("receipt")) && !transactionId) {
              transactionId = val;
            }
            if ((label.includes("payer") || label.includes("sender") || label.includes("from") || label.includes("debited")) && !payer) {
              payer = val;
            }
            if ((label.includes("receiver") || label.includes("beneficiary") || label.includes("to") || label.includes("credited")) && !receiver) {
              receiver = val;
            }
            if ((label.includes("amount") || label.includes("transfer amount")) && !amountStr) {
              amountStr = val;
            }
            if ((label.includes("date") || label.includes("time")) && !dateStr) {
              dateStr = val;
            }
          }
        }
      });

      // 2. Key-value element iteration
      $("div, p, span, li").each((_, el) => {
        if ($(el).children().length > 3) return; // Skip large parent wrappers
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (isNoise(text)) return;
        const lower = text.toLowerCase();

        if (!transactionId && (lower.includes("transaction id") || lower.includes("ft number") || lower.includes("reference"))) {
          const parts = text.split(/[:\-]/);
          if (parts[1]) {
            const val = parts[1].trim();
            if (!isNoise(val)) transactionId = val;
          }
        }
        if (!payer && (lower.includes("payer") || lower.includes("sender") || lower.includes("debited account") || lower.includes("from"))) {
          const parts = text.split(/[:\-]/);
          if (parts[1]) {
            const val = parts[1].trim();
            if (!isNoise(val)) payer = val;
          }
        }
        if (!receiver && (lower.includes("receiver") || lower.includes("beneficiary") || lower.includes("credited account") || lower.includes("to"))) {
          const parts = text.split(/[:\-]/);
          if (parts[1]) {
            const val = parts[1].trim();
            if (!isNoise(val)) receiver = val;
          }
        }
        if (!amountStr && (lower.includes("amount") || lower.includes("transfer amount"))) {
          const match = text.match(/(?:ETB|Birr|Amount)?[:\s]*([0-9,]+\.[0-9]{2})/i);
          if (match) amountStr = match[1];
        }
        if (!dateStr && (lower.includes("date") || lower.includes("time"))) {
          const parts = text.split(/[:\-]/);
          if (parts[1]) {
            const val = parts[1].trim();
            if (!isNoise(val)) dateStr = val;
          }
        }
      });

      // 3. Regex fallbacks
      if (!transactionId) {
        const ftMatch = fullText.match(/\bFT[A-Z0-9]{8,14}\b/i) || url.match(/\/v2-([A-Za-z0-9_-]+)/i) || url.match(/\/receipt\/([A-Za-z0-9_-]+)/i);
        if (ftMatch) transactionId = ftMatch[1] ? (ftMatch[1].startsWith("v2-") ? ftMatch[1] : `v2-${ftMatch[1]}`).toUpperCase() : ftMatch[0].toUpperCase();
      }

      if (!amountStr) {
        const amtMatch = fullText.match(/(?:ETB|Birr|Amount)[:\s]*([0-9,]+\.[0-9]{2})/i) || fullText.match(/([0-9,]+\.[0-9]{2})\s*(?:ETB|Birr)/i);
        if (amtMatch) amountStr = amtMatch[1];
      }

      if (!payer || isNoise(payer)) {
        const payerMatch = fullText.match(/(?:Payer|Sender|Debited Account|From)[:\s]+([A-Za-z\s]{3,35})/i);
        payer = payerMatch && !isNoise(payerMatch[1]) ? payerMatch[1].trim() : "";
      }

      if (!receiver || isNoise(receiver)) {
        const recMatch = fullText.match(/(?:Beneficiary|Receiver|Credited Account|To)[:\s]+([A-Za-z\s]{3,35})/i);
        receiver = recMatch && !isNoise(recMatch[1]) ? recMatch[1].trim() : "";
      }

      if (!dateStr) {
        const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
        if (dateMatch) dateStr = dateMatch[0];
      }

      // Extract url token as reference fallback
      const urlTokenMatch = url.match(/\/v2-([A-Za-z0-9_-]+)/i) || url.match(/\/receipt\/([A-Za-z0-9_-]+)/i) || url.match(/[?&]id=([A-Za-z0-9_-]+)/i);
      const urlToken = urlTokenMatch ? urlTokenMatch[1] : "";

      reference = transactionId || urlToken || "CBE_REF";

      // Calculate numeric amount
      const parsedAmount = this.parseAmountNumber(amountStr);

      // Require at least a valid transaction ID or positive amount to consider parsed receipt valid
      if (!transactionId && parsedAmount === 0) {
        return null;
      }

      const finalPayer = (!payer || isNoise(payer)) ? (options?.extractedPayer || "CBE Customer") : this.cleanString(payer);
      const finalReceiver = (!receiver || isNoise(receiver)) ? (options?.extractedReceiver || options?.expectedReceiver || "Merchant") : this.cleanString(receiver);

      return {
        verified: true,
        bank: this.bankCode,
        transaction_id: transactionId || reference,
        payer: finalPayer,
        receiver: finalReceiver,
        amount: parsedAmount > 0 ? parsedAmount.toFixed(2) : (options?.extractedAmount ? options.extractedAmount.toFixed(2) : "0.00"),
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
