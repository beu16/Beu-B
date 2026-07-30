export interface TranslationKeys {
  appName: string;
  appSubtitle: string;
  apiStatus: string;
  themeLabel: string;
  langLabel: string;
  scanTab: string;
  manualTab: string;
  skipSuffixTitle: string;
  skipSuffixDesc: string;
  merchantGuideTitle: string;
  merchantGuideStep1: string;
  merchantGuideStep2: string;
  merchantGuideStep3: string;
  autoScanActive: string;
  secureEndpointLabel: string;
  
  // Manual Form
  transactionDetails: string;
  secureEndpointBadge: string;
  bankSelectLabel: string;
  refInputLabel: string;
  bypassedIfQr: string;
  refInputPlaceholder: string;
  accountSuffixLabel: string;
  accountSuffixHelp: string;
  accountSuffixPlaceholder: string;
  accountSuffixHelpBOA?: string;
  accountSuffixHelpCBE?: string;
  phoneLabel: string;
  phoneRequired: string;
  phoneOptional: string;
  phonePlaceholder: string;
  phoneHelp?: string;
  verifyBtn: string;
  verifyingBtn: string;
  
  // QR Scanner
  uploadTab: string;
  liveScanTab: string;
  dragDropTitle: string;
  dragDropSubtitle: string;
  dragDropFormats: string;
  browseBtn: string;
  cameraAccessDenied: string;
  cameraBlockedTitle: string;
  retryAccessBtn: string;
  useUploadTabBtn: string;
  scanningQRLoader: string;
  
  // Result Display
  verifiedAmount: string;
  etbSuffix: string;
  fromSender: string;
  toReceiver: string;
  transactionDate: string;
  transactionStatus: string;
  pollingLiveAPI: string;
  pollingDesc: string;
  clearScanNextBtn: string;
  unknownPayer: string;
  defaultReceiver: string;
  syncingDate: string;
  timeElapsedLabel: string;
  noDelayLabel: string;
  
  // Financial Dashboard
  dashboardTitle: string;
  todayTotalCalculated: string;
  todayTotalCalculatedDesc: string;
  totalVerifiedTxns: string;
  successRateLabel: string;
  topChannelLabel: string;
  insightTitle: string;
  avgTxnSizeLabel: string;
  insightsPeakHour: string;
  insightsSafeRate: string;
  distributionTitle: string;
  
  // History Logs
  historyTitle: string;
  historySubtitle: string;
  recordedLogs: string;
  noLogsYet: string;
  viewLogBtn: string;
  clearHistoryBtn: string;
  justNow: string;
  minsAgo: string;
  hoursAgo: string;
  daysAgo: string;
  
  // Alerts
  duplicateAlertTitle: string;
  duplicateAlertDesc: string;
  successTitle: string;
  successDesc: string;
  failedTitle: string;
  failedDesc: string;
  pendingTitle: string;
  pendingDesc: string;
  errorRefRequired: string;
  errorBOASuffix: string;
  errorCBESuffix: string;
  errorPhoneInvalid: string;
}

export type Locale = "en" | "am";

export const TRANSLATIONS: Record<Locale, TranslationKeys> = {
  en: {
    appName: "BEU",
    appSubtitle: "VERIFY",
    apiStatus: "API STATUS",
    themeLabel: "THEME",
    langLabel: "LANGUAGE",
    scanTab: "SCAN / UPLOAD QR",
    manualTab: "MANUAL REF VERIFY",
    skipSuffixTitle: "Skip Account Suffixes Entirely",
    skipSuffixDesc: "By scanning or uploading the receipt QR code, BEU VERIFY captures the full bank verification link. This bypasses the need for manual CBE/BOA account suffixes completely. Always prefer scanning for high accuracy and speed!",
    merchantGuideTitle: "MERCHANT GUIDE",
    merchantGuideStep1: "CBE receipt QR codes contain web-links. Parsing them allows verification with zero bank suffixes.",
    merchantGuideStep2: "BEU Verify verifies the transaction live. PENDING states are polled automatically by BEU VERIFY.",
    merchantGuideStep3: "Transactions older than 3 minutes are flagged with an orange alert box to protect you from duplicate receipt fraud.",
    autoScanActive: "AUTO-SCAN ACTIVE",
    secureEndpointLabel: "Verified Secure Endpoint: BEU Verify Secure Connection",
    
    // Manual Form
    transactionDetails: "TRANSACTION DETAILS",
    secureEndpointBadge: "SECURE ENDPOINT",
    bankSelectLabel: "Bank / Receipt Provider",
    refInputLabel: "Reference Number or Receipt Link",
    bypassedIfQr: "Bypassed if QR used",
    refInputPlaceholder: "CBE Receipt URL, SMS text, or Reference Code",
    accountSuffixLabel: "Account Suffix Number (Optional)",
    accountSuffixHelp: "Account Suffix",
    accountSuffixPlaceholder: "e.g., 5-8 digits",
    accountSuffixHelpBOA: "For Bank of Abyssinia, entering the receiver's last 5 account digits secures verification.",
    accountSuffixHelpCBE: "For CBE traditional references. Skipped if you scanned the QR code.",
    phoneLabel: "Payer Phone Number (Optional)",
    phoneRequired: "(Required)",
    phoneOptional: "(Optional)",
    phonePlaceholder: "e.g., 0912345678 or 251912345678",
    phoneHelp: "Required for CBE Birr to route the transaction to the specific user wallet.",
    verifyBtn: "Verify Reference Now",
    verifyingBtn: "VERIFYING...",
    
    // QR Scanner
    uploadTab: "Upload Image",
    liveScanTab: "Scan QR",
    dragDropTitle: "Drag & drop your CBE/BOA receipt image here",
    dragDropSubtitle: "Drag & drop your CBE/BOA receipt image here",
    dragDropFormats: "Supports JPEG, PNG and GIF. Decoded instantly client-side.",
    browseBtn: "Browse Files",
    cameraAccessDenied: "Camera access was denied or is unavailable. Please check browser site permissions, open this app in a new tab, or use the 'Upload Image' tab to process your receipt.",
    cameraBlockedTitle: "Camera Access Blocked",
    retryAccessBtn: "Retry Access",
    useUploadTabBtn: "Use Upload Tab",
    scanningQRLoader: "Scanning Receipt QR...",
    
    // Result Display
    verifiedAmount: "Verified Amount",
    etbSuffix: "ETB",
    fromSender: "From (Sender)",
    toReceiver: "To (Receiver)",
    transactionDate: "Transaction Date",
    transactionStatus: "Transaction Status",
    pollingLiveAPI: "Polling live API...",
    pollingDesc: "Establishing handshake with core nodes. Normally completes within 3 to 15 seconds. Please keep this screen open.",
    clearScanNextBtn: "Clear and Scan Next",
    unknownPayer: "Unknown Payer",
    defaultReceiver: "BEU Verify Payments Corp.",
    syncingDate: "Syncing...",
    timeElapsedLabel: "Time Elapsed",
    noDelayLabel: "No delay calculated",
    
    // Financial Dashboard
    dashboardTitle: "TODAY'S METRICS",
    todayTotalCalculated: "Today's Total Volume",
    todayTotalCalculatedDesc: "Sum of successfully verified transactions today",
    totalVerifiedTxns: "Verified Transactions",
    successRateLabel: "Verification Success",
    topChannelLabel: "Top Channel Share",
    insightTitle: "Smart Financial Insights",
    avgTxnSizeLabel: "Average Txn Size",
    insightsPeakHour: "⚡ Business peak hours: 9AM - 11AM",
    insightsSafeRate: "🛡️ 100% of volume processed securely via BEU Verify",
    distributionTitle: "VOLUME DISTRIBUTION BY BANK",
    
    // History Logs
    historyTitle: "VERIFICATION HISTORY",
    historySubtitle: "RECORDED",
    recordedLogs: "Recorded Logs",
    noLogsYet: "No transactions processed yet in this session.",
    viewLogBtn: "View",
    clearHistoryBtn: "Clear History",
    justNow: "Just now",
    minsAgo: "{mins}m ago",
    hoursAgo: "{hours}h ago",
    daysAgo: "{days}d ago",
    
    // Alerts
    duplicateAlertTitle: "DUPLICATE RECEIPT WARNING (FRAUD ALERT)",
    duplicateAlertDesc: "This transaction occurred over 3 minutes ago ({timeAgo}). Please verify this receipt is not being reused by a customer for a duplicate payment scan!",
    successTitle: "TRANSACTION VERIFIED & AUTHENTICATED",
    successDesc: "This receipt matches a real, cleared bank transfer. Funds are safely in your account.",
    failedTitle: "VERIFICATION FAILED / UNABLE TO MATCH",
    failedDesc: "We could not find a matching cleared bank transaction. Double check reference suffix or bank details.",
    pendingTitle: "TRANSACTION IN PROGRESS (PENDING STATE)",
    pendingDesc: "Handshake initialized. The transaction is registered but still awaiting bank finalization. We are polling the live API.",
    errorRefRequired: "Reference, receipt number, or URL is required.",
    errorBOASuffix: "Bank of Abyssinia (BOA) account suffix must be exactly 5 digits.",
    errorCBESuffix: "CBE legacy account suffix must be exactly 8 digits.",
    errorPhoneInvalid: "Please enter a valid Ethiopian phone number.",
  },
  am: {
    appName: "ቢዩ",
    appSubtitle: "ቬሪፋይ",
    apiStatus: "የኤፒአይ ሁኔታ",
    themeLabel: "ዲዛይን",
    langLabel: "ቋንቋ",
    scanTab: "ስካን / ፎቶ አስገባ",
    manualTab: "በማጣቀሻ ቁጥር ማረጋገጫ",
    skipSuffixTitle: "የሂሳብ ማጠቃለያ ቁጥርን ሙሉ በሙሉ ይለፉ",
    skipSuffixDesc: "ደረሰኙን ስካን ሲያደርጉ ወይም ፎቶ ሲያስገቡ የግብይት ማረጋገጫ ሊንኩን ሙሉ በሙሉ እናገኘዋለን። ይህም የሂሳብ ቁጥር ማጠቃለያ ማስገባት ሳያስፈልግዎ በከፍተኛ ፍጥነት እና ትክክለኛነት ለማረጋገጥ ያስችላል። ሁልጊዜም ለተሻለ ትክክለኛነት በስካን መጠቀም ይመረጣል!",
    merchantGuideTitle: "የነጋዴዎች መመሪያ",
    merchantGuideStep1: "የሲቢኢ ደረሰኝ ኪውአር ሊንኮችን ይይዛሉ። እነሱን ማንበብ ያለ ተጨማሪ የባንክ ሂሳብ ቁጥር ማጠቃለያ ለማረጋገጥ ያስችላል።",
    merchantGuideStep2: "ቢዩ ቬሪፋይ ግብይቶችን በቀጥታ ያረጋግጣል። 'PENDING' ሲሆኑ ቢዩ ቬሪፋይ ራሱ በየሴኮንዱ ይፈትሻል።",
    merchantGuideStep3: "ማጭበርበርን ለመከላከል ግብይቱ ከተፈጸመ ከ 3 ደቂቃ በላይ የሆኑት በብርቱካናማ ቀለም የደህንነት ማሳሰቢያ ይበራባቸዋል።",
    autoScanActive: "ራስ-ሰር ስካን ንቁ ነው",
    secureEndpointLabel: "የተረጋገጠ አስተማማኝ አድራሻ: ቢዩ ቬሪፋይ ሴኪዩር ኮኔክሽን",
    
    // Manual Form
    transactionDetails: "የግብይት ዝርዝሮች",
    secureEndpointBadge: "ደህንነቱ የተጠበቀ",
    bankSelectLabel: "ባንክ / የሂሳብ ፎርም ይምረጡ",
    refInputLabel: "ማመሳከሪያ ቁጥር ወይም ደረሰኝ ሊንክ",
    bypassedIfQr: "በኪውአር ካለፉ መሙላት አይጠበቅብዎትም",
    refInputPlaceholder: "CBE Receipt URL, SMS text, or Reference Code",
    accountSuffixLabel: "የሂሳብ ማጠቃለያ ቁጥር (አማራጭ)",
    accountSuffixHelp: "የሂሳብ ማጠቃለያ ቁጥር",
    accountSuffixPlaceholder: "e.g., 5-8 digits",
    accountSuffixHelpBOA: "ባንክ ኦፍ አቢሲኒያ (BOA) ለመጠቀም የሂሳብ ቁጥር መጨረሻ 5 አሃዞችን እዚህ ያስገቡ።",
    accountSuffixHelpCBE: "የሲቢኢ የድሮ ፎርማት ማጣቀሻዎችን ለመጠቀም 8 አሃዝ ያስገቡ። ኪውአር ስካን ካደረጉ አያስፈልግም።",
    phoneLabel: "የከፋይ ስልክ ቁጥር (አማራጭ)",
    phoneRequired: "(የግድ ነው)",
    phoneOptional: "(አማራጭ)",
    phonePlaceholder: "ለማብራሪያ: 0912345678 ወይም 251912345678",
    phoneHelp: "ሲቢኢ ብር (CBE Birr) ግብይት ለማረጋገጥ የከፋዩን ስልክ ቁጥር ማስገባት ግዴታ ነው።",
    verifyBtn: "ማመሳከሪያውን አሁን አረጋግጥ",
    verifyingBtn: "በማረጋገጥ ላይ...",
    
    // QR Scanner
    uploadTab: "ፎቶ አስገባ",
    liveScanTab: "በቀጥታ ስካን",
    dragDropTitle: "የደረሰኝ ፎቶ እዚህ ያስገቡ ወይም ይጎትቱ",
    dragDropSubtitle: "የደረሰኝ ፎቶ እዚህ ያስገቡ ወይም ይጎትቱ",
    dragDropFormats: "ጄፒጂ፣ ፒኤንጂ እና ጂአይኤፍ ይደገፋሉ። ኪውአር ኮዱን በስልኮዎ ላይ በቀጥታ እናነባለን።",
    browseBtn: "ፎቶዎችን ፈልግ",
    cameraAccessDenied: "የካሜራ ፈቃድ አልተሰጠም ወይም ካሜራው ስራ ላይ ነው። እባክዎ በምትኩ 'ፎቶ አስገባ / Upload Image' በሚለው አማራጭ ደረሰኙን ያስገቡ።",
    cameraBlockedTitle: "ካሜራው አልተገኘም",
    retryAccessBtn: "እንደገና ሞክር",
    useUploadTabBtn: "ፎቶ አስገባ መጠቀም",
    scanningQRLoader: "ኪውአር በመፈለግ ላይ...",
    
    // Result Display
    verifiedAmount: "የተረጋገጠ የገንዘብ መጠን",
    etbSuffix: "ብር",
    fromSender: "ከማን (ላኪ)",
    toReceiver: "ለማን (ተቀባይ)",
    transactionDate: "የግብይት ቀን",
    transactionStatus: "የግብይት ሁኔታ",
    pollingLiveAPI: "በቀጥታ በመፈተሽ ላይ...",
    pollingDesc: "ከባንክ መረጃዎችን በማገናኘት ላይ ነው። ከ3 እስከ 15 ሰከንድ ሊወስድ ይችላል። እባክዎ አይዝጉት።",
    clearScanNextBtn: "አጽዳ እና የሚቀጥለውን ስካን አድርግ",
    unknownPayer: "ያልታወቀ ላኪ",
    defaultReceiver: "ቢዩ ቬሪፋይ ክፍያዎች ኮርፖሬሽን",
    syncingDate: "በማስተካከል ላይ...",
    timeElapsedLabel: "ያለፈው ጊዜ",
    noDelayLabel: "ያለፈው ጊዜ አልተሰላም",
    
    // Financial Dashboard
    dashboardTitle: "የዛሬ የክፍያ ሁኔታ",
    todayTotalCalculated: "የዛሬ ጠቅላላ ገቢ",
    todayTotalCalculatedDesc: "ዛሬ በትክክል የተረጋገጡ የገንዘብ መጠኖች ድምር",
    totalVerifiedTxns: "የተረጋገጡ ግብይቶች",
    successRateLabel: "የማረጋገጫ ስኬት",
    topChannelLabel: "ዋና የክፍያ መንገድ",
    insightTitle: "ብልጥ የፋይናንስ መረጃዎች",
    avgTxnSizeLabel: "የአንድ ግብይት አማካኝ",
    insightsPeakHour: "⚡ የሚበዛበት ሰዓት፡ ከጠዋቱ 3:00 - 5:00",
    insightsSafeRate: "🛡️ ሁሉም ግብይቶች በ ቢዩ ቬሪፋይ በኩል የተጠበቁ ናቸው",
    distributionTitle: "የባንኮች የገቢ ክፍፍል",
    
    // History Logs
    historyTitle: "የማረጋገጫ ታሪክ",
    historySubtitle: "የተመዘገቡ",
    recordedLogs: "የተመዘገቡ",
    noLogsYet: "በዚህ ክፍለ ጊዜ እስካሁን የተመዘገበ ግብይት የለም።",
    viewLogBtn: "እይ",
    clearHistoryBtn: "ታሪክ አጽዳ",
    justNow: "አሁን",
    minsAgo: "{mins} ደቂቃ በፊት",
    hoursAgo: "{hours} ሰዓት በፊት",
    daysAgo: "{days} ቀን በፊት",
    
    // Alerts
    duplicateAlertTitle: "ደህንነት ማሳሰቢያ (የተደጋገመ ደረሰኝ ስጋት)",
    duplicateAlertDesc: "ይህ ግብይት የተፈጸመው ከ 3 ደቂቃ በፊት ነው ({timeAgo})። ይህ ደረሰኝ ለሌላ ክፍያ የተደገመ አለመሆኑን እባክዎ ያረጋግጡ!",
    successTitle: "ግብይቱ ተረጋግጧል እና ትክክለኛ ነው",
    successDesc: "ይህ ደረሰኝ ከትክክለኛ የባንክ ማስተላለፊያ ጋር ይዛመዳል። ገንዘቡ በሂሳብዎ ውስጥ ገብቷል።",
    failedTitle: "ማረጋገጥ አልተቻለም / አልተገኘም",
    failedDesc: "ተዛማጅ የሆነ የተጠናቀቀ የባንክ ግብይት ማግኘት አልቻልንም። እባክዎ የማጣቀሻ ቁጥሩን ወይም የባንክ ዝርዝሩን በድጋሚ ያረጋግጡ።",
    pendingTitle: "ግብይቱ በመከናወን ላይ ነው (በመጠባበቅ ላይ)",
    pendingDesc: "ማረጋገጫ ተጀምሯል። ግብይቱ ተመዝግቧል ነገር ግን አሁንም ባንኩን በማጠናቀቅ ላይ ነው። በቀጥታ በመፈተሽ ላይ ነን።",
    errorRefRequired: "የማጣቀሻ ቁጥር፣ የደረሰኝ ቁጥር ወይም ሊንክ ማስገባት ያስፈልጋል።",
    errorBOASuffix: "የባንክ ኦፍ አቢሲኒያ (BOA) ማጠቃለያ ቁጥር በትክክል 5 ዲጂት መሆን አለበት።",
    errorCBESuffix: "የሲቢኢ የድሮ ማጠቃለያ ቁጥር በትክክል 8 ዲጂት መሆን አለበት።",
    errorPhoneInvalid: "እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ።"
  }
};
