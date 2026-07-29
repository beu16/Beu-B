import React, { useState, useEffect } from "react";
import { Users, Shield, Landmark, Edit, Key, Settings, Play, Database as DbIcon, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, Trash, Save, Check, Power, Calendar, Zap } from "lucide-react";
import { motion } from "motion/react";
import { getApiUrl } from "../api";
import { IntegrationsModal } from "./IntegrationsModal";

interface AdminPanelProps {
  adminUser: any;
  onGoBack: () => void;
  locale: "am" | "en";
}

export default function AdminPanel({ adminUser, onGoBack, locale }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ masterApiKey: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingCredits, setEditingCredits] = useState<number>(0);
  const [editingExtendDays, setEditingExtendDays] = useState<number>(30);

  // API testing state
  const [testKey, setTestKey] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setMsg(null);
    try {
      // Fetch users with proper admin validation headers
      const usersRes = await fetch(getApiUrl("/api/admin/users"), {
        headers: {
          "x-admin-id": adminUser.id
        }
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        setUsers(usersData.users);
      }

      // Fetch settings with proper admin validation headers
      const settingsRes = await fetch(getApiUrl("/api/admin/settings"), {
        headers: {
          "x-admin-id": adminUser.id
        }
      });
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.settings);
        setTestKey(settingsData.settings.masterApiKey);
      }
    } catch (err) {
      setMsg({ type: "error", text: "Failed to pull Admin panel logs." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}`), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "User Status toggled successfully." });
        fetchAdminData();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Action failed." });
    }
  };

  const handleSaveCredits = async (userId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}`), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ credits: editingCredits })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "User credits updated successfully." });
        setEditingUserId(null);
        fetchAdminData();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Save failed." });
    }
  };

  const handleExtendSubscription = async (userId: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}`), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ extendDays: editingExtendDays })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: `Subscription extended by ${editingExtendDays} days.` });
        fetchAdminData();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Extension failed." });
    }
  };

  const handleSaveSettings = async () => {
    if (!testKey) {
      setMsg({ type: "error", text: "Mother API Key cannot be left empty." });
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/admin/settings"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ masterApiKey: testKey })
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Master Central API Settings saved globally." });
        fetchAdminData();
      } else {
        setMsg({ type: "error", text: data.message });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Failed to save settings." });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(getApiUrl("/api/admin/test-connection"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-id": adminUser.id
        },
        body: JSON.stringify({ masterApiKey: testKey })
      });
      const data = await res.json();
      setTestResult(data.message);
    } catch (err: any) {
      setTestResult(`Failed to reach: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const formatShortDate = (isoStr?: string) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 text-white space-y-8">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950 border border-amber-400/20 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center text-black shadow-lg shadow-amber-400/10">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full">
                ADMIN GOD MODE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-display mt-1">
              Beu Verify Central Operations
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIntegrations(true)}
            className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-400/20"
          >
            <Zap size={15} className="fill-black" />
            Supabase & Brevo Node
          </button>

          <button
            onClick={onGoBack}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Verification Tool
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {msg && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          msg.type === "success" 
            ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-200" 
            : "bg-red-950/40 border-red-900/50 text-red-200"
        }`}>
          {msg.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400 mt-0.5" /> : <AlertTriangle size={18} className="text-red-400 mt-0.5" />}
          <div className="text-xs leading-relaxed font-semibold">{msg.text}</div>
        </div>
      )}

      {/* Grid Layout: Config Mother API (Left) + Users (Right/Main) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* API Config Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 space-y-5 shadow-lg">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Key size={18} className="text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Mother API Key Config
              </h2>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Every payment reference checking and end-user transaction verification routes globally through this single key.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">
                  BEU Verify central Master Key
                </label>
                <input
                  type="password"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  placeholder="Paste external API Key..."
                  className="w-full bg-[#121212] border border-zinc-800 focus:border-amber-400 text-xs px-3.5 py-3 rounded-lg text-white placeholder-zinc-700 focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900">
                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-black font-extrabold uppercase tracking-wider py-2.5 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow shadow-amber-400/10"
                >
                  <Save size={12} />
                  Save Key Globally
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-extrabold uppercase tracking-wider py-2.5 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 border border-zinc-800 transition-all cursor-pointer"
                >
                  {isTesting ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                  Test BEU Verify Gateway
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg text-[10px] border leading-relaxed ${
                  testResult.toLowerCase().includes("successful") 
                    ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                    : "bg-red-950/20 border-red-900/40 text-red-300"
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Block */}
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Operations Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">TOTAL USERS</span>
                <span className="text-xl font-black text-white mt-1 block">{users.length}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 block uppercase font-bold">ACTIVE SUBS</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">
                  {users.filter(u => u.status === "Active").length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-8 bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-5 overflow-hidden flex flex-col shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Client Base & Subscriptions
              </h2>
            </div>

            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="text-zinc-500 hover:text-white transition-all"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Responsive Table Wrapper */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 uppercase tracking-wider font-extrabold">
                  <th className="pb-3 pr-4">Business Details</th>
                  <th className="pb-3 px-4">Selected Plan</th>
                  <th className="pb-3 px-4">Credits</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Telebirr Ref</th>
                  <th className="pb-3 pl-4">Dates</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs">
                {users.map((u) => {
                  const isExpired = u.status === "Expired" || (u.expiryDate && new Date() > new Date(u.expiryDate));
                  
                  return (
                    <tr 
                      key={u.id}
                      className={`hover:bg-zinc-950/40 transition-colors ${
                        isExpired ? "bg-red-950/5 border-l-2 border-l-red-500" : ""
                      }`}
                    >
                      {/* Name / Contact */}
                      <td className="py-4 pr-4">
                        <div className="font-bold text-white">{u.businessName}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{u.ownerName} &bull; {u.email}</div>
                        <div className="text-[10px] text-zinc-600 font-mono">{u.phone}</div>
                      </td>

                      {/* Chosen Plan */}
                      <td className="py-4 px-4 font-bold uppercase text-[10px] tracking-wider">
                        {u.isAdmin ? (
                          <span className="text-purple-400">GOD MODE</span>
                        ) : (
                          u.selectedPlan || <span className="text-zinc-600 italic">None selected</span>
                        )}
                      </td>

                      {/* Credits Counter */}
                      <td className="py-4 px-4 font-mono font-bold">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-1.5 max-w-[100px]">
                            <input
                              type="number"
                              value={editingCredits}
                              onChange={(e) => setEditingCredits(Math.max(0, parseInt(e.target.value) || 0))}
                              className="bg-zinc-900 border border-zinc-800 text-xs text-white p-1 rounded font-mono w-16"
                            />
                            <button
                              onClick={() => handleSaveCredits(u.id)}
                              className="bg-emerald-500 text-black p-1 rounded hover:bg-emerald-400"
                            >
                              <Check size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{u.credits}</span>
                            {!u.isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingUserId(u.id);
                                  setEditingCredits(u.credits);
                                }}
                                className="text-zinc-600 hover:text-white transition-all"
                              >
                                <Edit size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Checkbox / badge */}
                      <td className="py-4 px-4">
                        {isExpired ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            Expired
                          </span>
                        ) : u.status === "Active" ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            Active
                          </span>
                        ) : u.status === "Inactive" ? (
                          <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            Inactive
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                            Pending Pay
                          </span>
                        )}
                      </td>

                      {/* Telebirr Reference code */}
                      <td className="py-4 px-4 font-mono font-bold text-[10px] text-zinc-400 uppercase select-all">
                        {u.paymentReference || "-"}
                      </td>

                      {/* Date Fields */}
                      <td className="py-4 pl-4 font-mono text-[9px] text-zinc-500 space-y-0.5">
                        <div>Start: {formatShortDate(u.subscriptionDate)}</div>
                        <div className={isExpired ? "text-red-400 font-bold" : ""}>
                          Expiry: {formatShortDate(u.expiryDate)}
                        </div>
                      </td>

                      {/* Manual Operations */}
                      <td className="py-4 text-right">
                        {!u.isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle active / inactive */}
                            <button
                              onClick={() => handleUpdateUserStatus(u.id, u.status)}
                              className={`p-1.5 rounded border transition-all cursor-pointer ${
                                u.status === "Active"
                                  ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                              }`}
                              title={u.status === "Active" ? "Deactivate User" : "Activate User"}
                            >
                              <Power size={11} />
                            </button>

                            {/* Add 30 Days extend */}
                            <button
                              onClick={() => {
                                if (window.confirm("Extend subscription expiry by 30 days?")) {
                                  setEditingExtendDays(30);
                                  handleExtendSubscription(u.id);
                                }
                              }}
                              className="p-1.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                              title="Extend subscription 30 Days"
                            >
                              <Calendar size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-600 italic">
                      No customer files exist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <IntegrationsModal
        isOpen={showIntegrations}
        onClose={() => setShowIntegrations(false)}
        userEmail={adminUser?.email || "admin@beutech.cloud"}
        userName={adminUser?.ownerName || "System Admin"}
      />
    </div>
  );
}
