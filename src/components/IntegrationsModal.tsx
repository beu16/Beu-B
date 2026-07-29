import React, { useState, useEffect } from "react";
import { 
  Database as DatabaseIcon, 
  Mail, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Smartphone, 
  Zap, 
  Radio, 
  Server,
  FileText
} from "lucide-react";
import { checkSupabaseServerStatus, syncStateToSupabase, SupabaseStatusResponse } from "../lib/supabase";
import { checkBrevoStatus, sendEmailViaBrevo, sendSmsViaBrevo, sendReceiptEmailViaBrevo, BrevoStatusResponse } from "../lib/brevo";

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  userEmail = "user@example.com",
  userName = "Valued Business User"
}) => {
  const [activeTab, setActiveTab] = useState<"supabase" | "brevo">("supabase");

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusResponse | null>(null);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [supabaseMessage, setSupabaseMessage] = useState<string | null>(null);

  // Brevo State
  const [brevoStatus, setBrevoStatus] = useState<BrevoStatusResponse | null>(null);
  const [loadingBrevo, setLoadingBrevo] = useState(false);
  
  // Brevo Test Form State
  const [senderEmailInput, setSenderEmailInput] = useState("infobeutech@gmail.com");
  const [testEmail, setTestEmail] = useState(userEmail || "infobeutech@gmail.com");
  const [testSubject, setTestSubject] = useState("⚡ Test Verification Alert from BeuVerify Node");
  const [testMessage, setTestMessage] = useState("Your Supabase & Brevo integration node is operational and fully synchronized!");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // SMS Test Form State
  const [testPhone, setTestPhone] = useState("+251911223344");
  const [testSmsMessage, setTestSmsMessage] = useState("BeuVerify Node: Your receipt #BVF98201 has been verified on Supabase.");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoadingSupabase(true);
    setLoadingBrevo(true);

    const supStatus = await checkSupabaseServerStatus();
    setSupabaseStatus(supStatus);
    setLoadingSupabase(false);

    const brvStatus = await checkBrevoStatus();
    setBrevoStatus(brvStatus);
    setLoadingBrevo(false);
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    setSupabaseMessage(null);
    const res = await syncStateToSupabase();
    setSyncingSupabase(false);
    setSupabaseMessage(res.message);
    fetchStatus();
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setEmailResult(null);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; background: #0b0b0d; color: #fff; border-radius: 12px; border: 1px solid #ffd700/30;">
        <h2 style="color: #ffd700; margin-top: 0;">⚡ ${testSubject}</h2>
        <p style="font-size: 14px; color: #ddd; line-height: 1.6;">Hello ${userName},</p>
        <p style="font-size: 14px; color: #bbb; line-height: 1.6;">${testMessage}</p>
        <div style="margin-top: 20px; padding: 12px; background: #15151a; border-radius: 8px; font-size: 12px; color: #888;">
          Sender Node: BeuVerify Cloud Engine • Time: ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    const res = await sendEmailViaBrevo({
      recipientEmail: testEmail,
      recipientName: userName,
      subject: testSubject,
      contentHtml: htmlContent,
      senderEmail: senderEmailInput
    });

    setSendingEmail(false);
    setEmailResult(res);
  };

  const handleSendReceiptSample = async () => {
    setSendingEmail(true);
    setEmailResult(null);

    const res = await sendReceiptEmailViaBrevo({
      recipientEmail: testEmail,
      recipientName: userName,
      merchant: "SuperMart Addis",
      amount: 245.50,
      reference: "BVF8K9D2A1",
      date: new Date().toLocaleString(),
      senderEmail: senderEmailInput
    });

    setSendingEmail(false);
    setEmailResult(res);
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingSms(true);
    setSmsResult(null);

    const res = await sendSmsViaBrevo({
      phoneNumber: testPhone,
      message: testSmsMessage
    });

    setSendingSms(false);
    setSmsResult(res);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="bg-[#0b0b0e] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#101014] px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FFD700] rounded-xl flex items-center justify-center text-black font-black shadow-[0_0_12px_rgba(255,215,0,0.3)]">
              <Zap size={18} className="fill-black" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white font-display leading-tight">
                Integrations Hub
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                SUPABASE & BREVO CLOUD NODES
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 bg-[#121216] border-b border-zinc-800/80 p-1 shrink-0">
          <button
            onClick={() => setActiveTab("supabase")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "supabase"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <DatabaseIcon size={15} />
            <span>Supabase Database</span>
          </button>

          <button
            onClick={() => setActiveTab("brevo")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "brevo"
                ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Mail size={15} />
            <span>Brevo Email & SMS</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans">
          
          {/* SUPABASE TAB */}
          {activeTab === "supabase" && (
            <div className="space-y-4">
              
              {/* Connection Card */}
              <div className="p-3.5 bg-[#141419] border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server size={18} className="text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Supabase Status</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">Real-time PostgreSQL Engine</p>
                    </div>
                  </div>

                  {loadingSupabase ? (
                    <RefreshCw size={16} className="text-zinc-400 animate-spin" />
                  ) : supabaseStatus?.ping ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      CONNECTED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-full">
                      <AlertCircle size={12} />
                      {supabaseStatus?.configured ? "QUERY FAILED" : "ENV NOT SET"}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Supabase Endpoint URL:</span>
                    <span className="text-zinc-200 truncate max-w-[200px]">{supabaseStatus?.url || "Not configured"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Anon API Key:</span>
                    <span className="text-emerald-400 font-bold">{supabaseStatus?.hasAnonKey ? "Present (Secured)" : "Missing"}</span>
                  </div>
                  {supabaseStatus?.userCount !== undefined && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Recorded Database Rows:</span>
                      <span className="text-white font-bold">{supabaseStatus.userCount} rows</span>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleSyncSupabase}
                    disabled={syncingSupabase}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncingSupabase ? "animate-spin" : ""} />
                    <span>{syncingSupabase ? "Syncing to Supabase..." : "Sync Local Data to Supabase"}</span>
                  </button>
                </div>

                {supabaseMessage && (
                  <p className="text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-900/60 p-2 rounded-xl text-center">
                    {supabaseMessage}
                  </p>
                )}
              </div>

              {/* Table Info */}
              <div className="p-3 bg-[#111115] border border-zinc-800/80 rounded-2xl space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-400" />
                  <span>Configured Supabase Tables</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <p className="font-mono font-bold text-amber-400">table: users</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Stores accounts, roles & ETB credit balances.</p>
                  </div>
                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <p className="font-mono font-bold text-emerald-400">table: verification_logs</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Stores scanned receipts & bank node proof.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* BREVO TAB */}
          {activeTab === "brevo" && (
            <div className="space-y-4">
              
              {/* Connection Status */}
              <div className="p-3.5 bg-[#141419] border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-amber-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Brevo Email & SMS</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">Transactional Dispatch Node</p>
                    </div>
                  </div>

                  {loadingBrevo ? (
                    <RefreshCw size={16} className="text-zinc-400 animate-spin" />
                  ) : brevoStatus?.configured ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-full">
                      <AlertCircle size={12} />
                      API KEY NEEDED
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-1 font-mono text-[11px] text-zinc-400 border-t border-zinc-800/80">
                  <div className="flex justify-between">
                    <span>Sender Name:</span>
                    <span className="text-white font-bold">{brevoStatus?.senderName || "BeuVerify Node"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sender Email:</span>
                    <span className="text-amber-400 font-bold">{brevoStatus?.senderEmail || "info@beutech.cloud"}</span>
                  </div>
                </div>
              </div>

              {/* Test Email Dispatch Form */}
              <form onSubmit={handleSendTestEmail} className="p-3.5 bg-[#111115] border border-zinc-800/80 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send size={14} className="text-amber-400" />
                    Send Test Email via Brevo
                  </span>
                  <button
                    type="button"
                    onClick={handleSendReceiptSample}
                    disabled={sendingEmail}
                    className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full hover:bg-amber-900 cursor-pointer"
                  >
                    Send Receipt Sample
                  </button>
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">Sender Email (Brevo Account / Verified Sender)</label>
                    <input
                      type="email"
                      required
                      value={senderEmailInput}
                      onChange={e => setSenderEmailInput(e.target.value)}
                      placeholder="e.g. dannbeu@gmail.com"
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">Recipient Email Address</label>
                    <input
                      type="email"
                      required
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">Email Subject</label>
                    <input
                      type="text"
                      required
                      value={testSubject}
                      onChange={e => setTestSubject(e.target.value)}
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">Message Body</label>
                    <textarea
                      rows={2}
                      required
                      value={testMessage}
                      onChange={e => setTestMessage(e.target.value)}
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full py-2.5 bg-[#FFD700] hover:bg-amber-300 text-black font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} className={sendingEmail ? "animate-pulse" : ""} />
                  <span>{sendingEmail ? "Dispatching Email..." : "Send Test Email"}</span>
                </button>

                {emailResult && (
                  <p className={`text-[11px] p-2 rounded-xl text-center border ${
                    emailResult.success 
                      ? "text-emerald-400 bg-emerald-950/60 border-emerald-800" 
                      : "text-red-400 bg-red-950/60 border-red-800"
                  }`}>
                    {emailResult.message}
                  </p>
                )}
              </form>

              {/* Test SMS Dispatch Form */}
              <form onSubmit={handleSendTestSms} className="p-3.5 bg-[#111115] border border-zinc-800/80 rounded-2xl space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Smartphone size={14} className="text-amber-400" />
                  <span>Send Transactional SMS via Brevo</span>
                </h4>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">Phone Number (International Format)</label>
                    <input
                      type="text"
                      required
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      placeholder="+251911223344"
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-medium">SMS Message</label>
                    <input
                      type="text"
                      required
                      value={testSmsMessage}
                      onChange={e => setTestSmsMessage(e.target.value)}
                      className="w-full bg-[#18181f] border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 mt-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingSms}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Smartphone size={14} className={sendingSms ? "animate-bounce" : ""} />
                  <span>{sendingSms ? "Sending SMS..." : "Dispatch SMS"}</span>
                </button>

                {smsResult && (
                  <p className={`text-[11px] p-2 rounded-xl text-center border ${
                    smsResult.success 
                      ? "text-emerald-400 bg-emerald-950/60 border-emerald-800" 
                      : "text-amber-400 bg-amber-950/60 border-amber-800"
                  }`}>
                    {smsResult.message}
                  </p>
                )}
              </form>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#101014] px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 shrink-0 font-mono">
          <span>BeuVerify Integration Node</span>
          <button 
            onClick={fetchStatus}
            className="flex items-center gap-1 text-amber-400 hover:underline cursor-pointer"
          >
            <RefreshCw size={12} />
            Refresh Nodes
          </button>
        </div>

      </div>
    </div>
  );
};
