import { registry, ReceiptProviderRegistry } from "./providers/ReceiptProviderRegistry.js";
import { CBEProvider } from "./providers/CBEProvider.js";
import { TelebirrProvider } from "./providers/TelebirrProvider.js";
import { BOAProvider } from "./providers/BOAProvider.js";
import { DashenProvider } from "./providers/DashenProvider.js";
import { AwashProvider } from "./providers/AwashProvider.js";
import { CoopProvider } from "./providers/CoopProvider.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("\n==========================================");
  console.log("  RUNNING ETHIOPIAN BANK PROVIDER TESTS   ");
  console.log("==========================================\n");

  // 1. CBE Provider Tests
  console.log("▶ Testing CBEProvider...");
  const cbe = new CBEProvider();
  assert(cbe.canHandle("FT24012A3B94"), "CBE canHandle FT reference");
  assert(cbe.canHandle("https://apps.cbe.com.et:100/?id=FT24012A3B94"), "CBE canHandle apps.cbe URL");
  assert(
    cbe.buildReceiptUrl("FT24012A3B94", { accountSuffix: "0920" }) ===
      "https://apps.cbe.com.et:100/?id=FT24012A3B940920",
    "CBE buildReceiptUrl constructs correct apps.cbe.com.et URL"
  );

  const mockCbeHtml = `
    <html>
      <body>
        <table>
          <tr><td>Transaction ID:</td><td>FT24012A3B94</td></tr>
          <tr><td>Payer:</td><td>Kebede Tassew</td></tr>
          <tr><td>Beneficiary:</td><td>Biniyam Haile</td></tr>
          <tr><td>Amount:</td><td>ETB 1,200.00</td></tr>
          <tr><td>Date:</td><td>2026-08-05 10:15:00</td></tr>
        </table>
      </body>
    </html>
  `;
  const parsedCbe = cbe.parseReceipt(mockCbeHtml, "https://apps.cbe.com.et:100/?id=FT24012A3B94");
  assert(parsedCbe !== null && parsedCbe.verified === true, "CBE parseReceipt returned verified object");
  assert(parsedCbe?.transaction_id === "FT24012A3B94", "CBE parsed correct transaction ID");
  assert(parsedCbe?.amount === "1200.00", "CBE parsed correct amount 1200.00");
  assert(parsedCbe?.payer === "Kebede Tassew", "CBE parsed correct payer");
  assert(parsedCbe?.bank === "CBE", "CBE provider bank code is CBE");

  // 2. Telebirr Provider Tests
  console.log("\n▶ Testing TelebirrProvider...");
  const telebirr = new TelebirrProvider();
  assert(telebirr.canHandle("1014389271"), "Telebirr canHandle 10-digit numeric ID");
  assert(telebirr.canHandle("https://transactioninfo.ethiotelecom.et/receipt/1014389271"), "Telebirr canHandle public receipt URL");
  assert(
    telebirr.buildReceiptUrl("1014389271") === "https://transactioninfo.ethiotelecom.et/receipt/1014389271",
    "Telebirr buildReceiptUrl constructs official public receipt endpoint"
  );

  const mockTelebirrHtml = `
    <div class="receipt-container">
      <div class="item">Receipt No: 1014389271</div>
      <div class="item">Payer: Solomon Desta</div>
      <div class="item">Receiver: Beu Verify Merchant</div>
      <div class="item">Transferred Amount: 99.00 ETB</div>
      <div class="item">Date: 2026-08-06</div>
    </div>
  `;
  const parsedTelebirr = telebirr.parseReceipt(mockTelebirrHtml, "https://transactioninfo.ethiotelecom.et/receipt/1014389271");
  assert(parsedTelebirr !== null && parsedTelebirr.verified === true, "Telebirr parseReceipt returned verified object");
  assert(parsedTelebirr?.transaction_id === "1014389271", "Telebirr parsed correct transaction ID");
  assert(parsedTelebirr?.amount === "99.00", "Telebirr parsed correct amount 99.00");
  assert(parsedTelebirr?.bank === "Telebirr", "Telebirr bank code is Telebirr");

  // 3. BOA Provider Tests
  console.log("\n▶ Testing BOAProvider...");
  const boa = new BOAProvider();
  assert(boa.canHandle("BOA98124719"), "BOA canHandle BOA reference");
  assert(
    boa.buildReceiptUrl("BOA98124719", { accountSuffix: "87654" }) ===
      "https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=BOA9812471987654",
    "BOA buildReceiptUrl constructs correct API endpoint"
  );

  const mockBoaJson = JSON.stringify({
    success: true,
    data: {
      reference: "BOA98124719",
      payer: "Tigist Alemu",
      payee: "Beu Store",
      amount: "6500.00",
      date: "2026-08-06T09:00:00Z"
    }
  });
  const parsedBoa = boa.parseReceipt(mockBoaJson, "https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=BOA98124719");
  assert(parsedBoa !== null && parsedBoa.verified === true, "BOA JSON parseReceipt succeeded");
  assert(parsedBoa?.amount === "6500.00", "BOA parsed correct amount 6500.00");

  // 4. Dashen Provider Tests
  console.log("\n▶ Testing DashenProvider...");
  const dashen = new DashenProvider();
  assert(dashen.canHandle("DS912048912"), "Dashen canHandle DS reference");
  assert(
    dashen.buildReceiptUrl("DS912048912") === "https://receipt.dashensuperapp.com/receipt?ref=DS912048912",
    "Dashen buildReceiptUrl constructs correct URL"
  );

  // 5. Awash Provider Tests
  console.log("\n▶ Testing AwashProvider...");
  const awash = new AwashProvider();
  assert(awash.canHandle("AW8124098"), "Awash canHandle AW reference");
  assert(
    awash.buildReceiptUrl("AW8124098") === "https://awashpay.awashbank.com:8225/-AW8124098",
    "Awash buildReceiptUrl constructs correct URL"
  );

  // 6. Registry Auto-Detection & Verification Tests
  console.log("\n▶ Testing ReceiptProviderRegistry Auto-Detection...");
  const cbeMatched = registry.selectProvider("FT24012A3B94");
  assert(cbeMatched?.bankCode === "CBE", "Registry auto-detected CBE from FT reference");

  const telebirrMatched = registry.selectProvider("1014389271");
  assert(telebirrMatched?.bankCode === "Telebirr", "Registry auto-detected Telebirr from numeric ID");

  const boaMatched = registry.selectProvider("BOA98124719");
  assert(boaMatched?.bankCode === "BOA", "Registry auto-detected BOA from BOA prefix");

  // 7. Demo Mode Simulation Verification
  console.log("\n▶ Testing Registry Demo Mode Verification...");
  const demoResult = await registry.verifyReceipt("demo_1200_cbe", "CBE");
  assert(demoResult.status === "Verified", "Registry verified demo reference with Verified status");
  assert(demoResult.data?.bank === "CBE", "Demo result returns CBE bank code");
  assert(demoResult.data?.amount === "1200.00", "Demo result returns expected amount 1200.00");

  console.log("\n==========================================");
  console.log("  ALL PROVIDER TESTS PASSED SUCCESSFULLY!  ");
  console.log("==========================================\n");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
