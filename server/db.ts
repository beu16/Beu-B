import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Check if valid Supabase URL and Key are provided
export const hasValidSupabaseConfig = (): boolean => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  return Boolean(
    url && 
    key && 
    !url.includes("placeholder") && 
    !key.includes("placeholder") &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
};

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder-key");

export interface User {
  id: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  email: string;
  phone: string;
  passwordHash: string;
  credits: number;
  selectedPlan: "starter" | "business" | "enterprise" | null;
  status: "Active" | "Inactive" | "Pending Verification" | "Expired";
  isAdmin: boolean;
  verificationCode?: string;
  paymentReference?: string;
  subscriptionDate?: string; // ISO String
  expiryDate?: string; // ISO String
  hasSeenFirstTimeApproval?: boolean;
  createdAt: string;
}

export interface PaymentReference {
  referenceNumber: string;
  userId: string;
  packageAmount: number;
  verifiedAt: string;
  status: string;
}

export interface VerificationLog {
  requestId: string;
  bank: string;
  reference: string;
  status: "success" | "failed" | "pending" | "not_found";
  verified: boolean;
  senderName?: string;
  receiverName?: string;
  amount?: number;
  transactionDate?: string;
  timestamp: string;
  userId: string;
}

export interface AppSettings {
  masterApiKey: string;
}

// Map database row to JS User object
const mapToUser = (row: any): User => {
  return {
    id: String(row.id),
    businessName: row.business_name || row.businessName || "",
    businessType: row.business_type || row.businessType || "",
    ownerName: row.owner_name || row.ownerName || "",
    email: row.email || "",
    phone: row.phone || "",
    passwordHash: row.password || row.password_hash || row.passwordHash || "",
    credits: Number(row.credits || 0),
    selectedPlan: row.selected_plan || row.selectedPlan || null,
    status: row.status || "Pending Verification",
    isAdmin: Boolean(row.is_admin ?? row.isAdmin ?? false),
    verificationCode: row.verification_code || row.verificationCode || undefined,
    paymentReference: row.payment_reference || row.paymentReference || undefined,
    subscriptionDate: row.subscription_date || row.subscriptionDate || undefined,
    expiryDate: row.expiry_date || row.expiryDate || undefined,
    hasSeenFirstTimeApproval: row.has_seen_first_time_approval ?? row.hasSeenFirstTimeApproval ?? undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString()
  };
};

// Map partial User object to database row
const mapToDbUser = (user: Partial<User>): any => {
  const row: any = {};
  if (user.businessName !== undefined) row.business_name = user.businessName;
  if (user.businessType !== undefined) row.business_type = user.businessType;
  if (user.ownerName !== undefined) row.owner_name = user.ownerName;
  if (user.email !== undefined) row.email = user.email;
  if (user.phone !== undefined) row.phone = user.phone;
  if (user.passwordHash !== undefined) row.password = user.passwordHash;
  if (user.credits !== undefined) row.credits = user.credits;
  if (user.selectedPlan !== undefined) row.selected_plan = user.selectedPlan;
  if (user.status !== undefined) row.status = user.status;
  if (user.isAdmin !== undefined) row.is_admin = user.isAdmin;
  if (user.verificationCode !== undefined) row.verification_code = user.verificationCode;
  if (user.paymentReference !== undefined) row.payment_reference = user.paymentReference;
  if (user.subscriptionDate !== undefined) row.subscription_date = user.subscriptionDate;
  if (user.expiryDate !== undefined) row.expiry_date = user.expiryDate;
  if (user.hasSeenFirstTimeApproval !== undefined) row.has_seen_first_time_approval = user.hasSeenFirstTimeApproval;
  if (user.createdAt !== undefined) row.created_at = user.createdAt;
  return row;
};

// Map database row to PaymentReference
const mapToPaymentReference = (row: any): PaymentReference => {
  return {
    referenceNumber: row.reference_number || "",
    userId: String(row.user_id),
    packageAmount: Number(row.package_amount || 0),
    verifiedAt: row.verified_at || new Date().toISOString(),
    status: row.status || ""
  };
};

// Map PaymentReference to database row
const mapToDbPaymentReference = (ref: PaymentReference): any => {
  return {
    reference_number: ref.referenceNumber,
    user_id: parseInt(ref.userId, 10) || null,
    package_amount: ref.packageAmount,
    verified_at: ref.verifiedAt,
    status: ref.status
  };
};

// Map database row to VerificationLog
const mapToVerificationLog = (row: any): VerificationLog => {
  try {
    const parsed = JSON.parse(row.transaction_id);
    if (parsed && typeof parsed === "object" && parsed.reference) {
      return {
        requestId: parsed.requestId || String(row.id),
        bank: parsed.bank || "universal",
        reference: parsed.reference,
        status: parsed.status || "success",
        verified: parsed.verified !== undefined ? parsed.verified : true,
        senderName: parsed.senderName,
        receiverName: parsed.receiverName,
        amount: parsed.amount,
        transactionDate: parsed.transactionDate,
        timestamp: row.verified_at || new Date().toISOString(),
        userId: String(row.user_id)
      };
    }
  } catch (e) {
    // Fallback if not JSON
  }
  return {
    requestId: String(row.id),
    bank: "universal",
    reference: row.transaction_id || "",
    status: "success",
    verified: true,
    timestamp: row.verified_at || new Date().toISOString(),
    userId: String(row.user_id)
  };
};

// Map VerificationLog to database row (using transaction_id column to store full log metadata as JSON)
const mapToDbVerificationLog = (log: Omit<VerificationLog, "timestamp">): any => {
  const serialized = JSON.stringify({
    requestId: log.requestId,
    bank: log.bank,
    reference: log.reference,
    status: log.status,
    verified: log.verified,
    senderName: log.senderName,
    receiverName: log.receiverName,
    amount: log.amount,
    transactionDate: log.transactionDate
  });
  return {
    transaction_id: serialized,
    user_id: parseInt(log.userId, 10) || null,
    verified_at: new Date().toISOString()
  };
};

// Parse user id safely
const safeParseId = (id: string): number | null => {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
};

export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export const secureHash = (str: string): string => {
  const salt = process.env.PASSWORD_SALT || "beu_verify_secure_salt_2026";
  return crypto.createHmac("sha256", salt).update(str).digest("hex");
};

// In-memory Fallback Storage (when Supabase database is offline or unconfigured)
const inMemoryUsers = new Map<string, User>();
const inMemoryPaymentReferences: PaymentReference[] = [];
const inMemoryVerificationLogs: VerificationLog[] = [];

function ensureInMemoryAdminUser(): User {
  const adminEmail = (process.env.ADMIN_EMAIL || "infobeutech@gmail.com").toLowerCase().trim();
  let existingAdmin = Array.from(inMemoryUsers.values()).find(u => u.email.toLowerCase() === adminEmail || u.email.toLowerCase() === "biniamh79@gmail.com");
  if (!existingAdmin) {
    const adminPasswordHash = secureHash(process.env.ADMIN_PASSWORD || "bini212311@!");
    existingAdmin = {
      id: "1",
      businessName: "Beu Tech Admin",
      businessType: "Other",
      ownerName: "Biniyam Haile",
      email: adminEmail,
      phone: process.env.TELEBIRR_PHONE_NUMBER || "0920017478",
      passwordHash: adminPasswordHash,
      credits: 999999,
      selectedPlan: "enterprise",
      status: "Active",
      isAdmin: true,
      createdAt: new Date().toISOString()
    };
    inMemoryUsers.set(existingAdmin.id, existingAdmin);
  }
  return existingAdmin;
}

// Ensure default Admin user exists in Supabase
export async function ensureAdminExists() {
  ensureInMemoryAdminUser();
  if (!hasValidSupabaseConfig()) {
    return;
  }
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "infobeutech@gmail.com";
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", adminEmail.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.warn("[db.ts] Notice: Supabase admin query returned error:", error.message);
      return;
    }

    if (!data) {
      const adminPasswordHash = secureHash(process.env.ADMIN_PASSWORD || "bini212311@!");
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          business_name: "Beu Tech Admin",
          business_type: "Other",
          owner_name: "Biniyam Haile",
          email: adminEmail,
          phone: process.env.TELEBIRR_PHONE_NUMBER || "0920017478",
          password: adminPasswordHash,
          credits: 999999,
          selected_plan: "enterprise",
          status: "Active",
          is_admin: true,
          created_at: new Date().toISOString()
        });
      if (insertError) {
        console.warn("[db.ts] Notice: Supabase insert admin error:", insertError.message);
      }
    }
  } catch (err: any) {
    console.warn("[db.ts] ensureAdminExists fallback:", err.message);
  }
}

export class Database {
  static async getUsers(): Promise<User[]> {
    ensureInMemoryAdminUser();
    try {
      if (!hasValidSupabaseConfig()) return Array.from(inMemoryUsers.values());
      await ensureAdminExists();
      const { data, error } = await supabase
        .from("users")
        .select("*");
      if (error) {
        return Array.from(inMemoryUsers.values());
      }
      const users = (data || []).map(mapToUser);
      users.forEach(u => inMemoryUsers.set(u.id, u));
      return users;
    } catch (err: any) {
      return Array.from(inMemoryUsers.values());
    }
  }

  static async findUserByEmail(email: string): Promise<User | undefined> {
    ensureInMemoryAdminUser();
    const normalizedEmail = email.toLowerCase().trim();
    const isAdminEmail = normalizedEmail === "infobeutech@gmail.com" || 
                         normalizedEmail === "biniamh79@gmail.com" || 
                         normalizedEmail === (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

    try {
      if (!hasValidSupabaseConfig()) {
        const found = Array.from(inMemoryUsers.values()).find(u => u.email.toLowerCase().trim() === normalizedEmail);
        if (found && isAdminEmail) found.isAdmin = true;
        return found;
      }
      
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (error || !data) {
        // Try trimming / wildcard match if exact ilike missed
        const { data: listData } = await supabase
          .from("users")
          .select("*")
          .ilike("email", `%${normalizedEmail}%`);
        if (listData && listData.length > 0) {
          data = listData[0];
        }
      }

      if (!data) {
        const found = Array.from(inMemoryUsers.values()).find(u => u.email.toLowerCase().trim() === normalizedEmail);
        if (found && isAdminEmail) found.isAdmin = true;
        return found;
      }

      const user = mapToUser(data);
      if (isAdminEmail) user.isAdmin = true;
      inMemoryUsers.set(user.id, user);
      return user;
    } catch (err: any) {
      const found = Array.from(inMemoryUsers.values()).find(u => u.email.toLowerCase().trim() === normalizedEmail);
      if (found && isAdminEmail) found.isAdmin = true;
      return found;
    }
  }

  static async findUserById(id: string): Promise<User | undefined> {
    ensureInMemoryAdminUser();
    try {
      if (id === "admin_id" || id === "1") {
        const inMemAdmin = inMemoryUsers.get(id) || Array.from(inMemoryUsers.values()).find(u => u.isAdmin);
        if (inMemAdmin) return inMemAdmin;
        const adminEmail = process.env.ADMIN_EMAIL || "infobeutech@gmail.com";
        return await this.findUserByEmail(adminEmail);
      }
      const inMemUser = inMemoryUsers.get(id);
      if (inMemUser) return inMemUser;

      if (!hasValidSupabaseConfig()) return inMemUser;

      const parsedId = safeParseId(id);
      const query = parsedId !== null 
        ? supabase.from("users").select("*").eq("id", parsedId).maybeSingle()
        : supabase.from("users").select("*").eq("id", id).maybeSingle();

      const { data, error } = await query;
      if (error || !data) {
        return inMemUser || Array.from(inMemoryUsers.values()).find(u => u.id === id);
      }
      const user = mapToUser(data);
      inMemoryUsers.set(user.id, user);
      return user;
    } catch (err: any) {
      return inMemoryUsers.get(id) || Array.from(inMemoryUsers.values()).find(u => u.id === id);
    }
  }

  static async createUser(user: Omit<User, "id" | "credits" | "status" | "isAdmin" | "createdAt"> & { isAdmin?: boolean }): Promise<User> {
    const mappedObj = {
      ...user,
      credits: 0,
      status: "Pending Verification" as const,
      isAdmin: user.isAdmin ?? false,
      createdAt: new Date().toISOString()
    };
    try {
      if (!hasValidSupabaseConfig()) throw new Error("Supabase URL not configured");
      const dbUser = mapToDbUser(mappedObj);
      const { data, error } = await supabase
        .from("users")
        .insert(dbUser)
        .select()
        .single();
      if (error) {
        throw error;
      }
      const newUser = mapToUser(data);
      inMemoryUsers.set(newUser.id, newUser);
      return newUser;
    } catch (err: any) {
      const newId = String(Date.now());
      const newUser: User = {
        ...mappedObj,
        id: newId
      };
      inMemoryUsers.set(newId, newUser);
      return newUser;
    }
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const currentInMem = inMemoryUsers.get(id);
    if (currentInMem) {
      Object.assign(currentInMem, updates);
    }
    try {
      if (!hasValidSupabaseConfig()) return currentInMem;
      const parsedId = safeParseId(id);
      if (parsedId === null) return currentInMem;
      const dbUpdates = mapToDbUser(updates);
      const { data, error } = await supabase
        .from("users")
        .update(dbUpdates)
        .eq("id", parsedId)
        .select()
        .maybeSingle();
      if (error || !data) return currentInMem;
      const updated = mapToUser(data);
      inMemoryUsers.set(updated.id, updated);
      return updated;
    } catch (err: any) {
      return currentInMem;
    }
  }

  static async getPaymentReferences(): Promise<PaymentReference[]> {
    try {
      if (!hasValidSupabaseConfig()) return [...inMemoryPaymentReferences];
      const { data, error } = await supabase
        .from("transaction_references")
        .select("*");
      if (error) return [...inMemoryPaymentReferences];
      return (data || []).map(mapToPaymentReference);
    } catch (err: any) {
      return [...inMemoryPaymentReferences];
    }
  }

  static async hasReferenceBeenUsed(ref: string): Promise<boolean> {
    const normalizedRef = ref.trim().toUpperCase();
    const inMemExists = inMemoryPaymentReferences.some(r => r.referenceNumber.trim().toUpperCase() === normalizedRef);
    if (inMemExists) return true;
    try {
      if (!hasValidSupabaseConfig()) return false;
      const { data, error } = await supabase
        .from("transaction_references")
        .select("reference_number")
        .eq("reference_number", normalizedRef)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } catch (err: any) {
      return false;
    }
  }

  static async addPaymentReference(ref: PaymentReference): Promise<void> {
    inMemoryPaymentReferences.push(ref);
    try {
      if (!hasValidSupabaseConfig()) return;
      const dbRef = mapToDbPaymentReference(ref);
      await supabase.from("transaction_references").insert(dbRef);
    } catch (err: any) {
      // In-memory fallback stored
    }
  }

  static async getVerificationLogs(userId?: string): Promise<VerificationLog[]> {
    const getFilteredInMemoryLogs = () => {
      let logs = [...inMemoryVerificationLogs];
      if (userId) {
        logs = logs.filter(l => l.userId === userId);
      }
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    try {
      if (!hasValidSupabaseConfig()) return getFilteredInMemoryLogs();
      let query = supabase.from("verified_transactions").select("*");
      if (userId) {
        const parsedUserId = safeParseId(userId);
        if (parsedUserId !== null) {
          query = query.eq("user_id", parsedUserId);
        } else {
          return getFilteredInMemoryLogs();
        }
      }
      const { data, error } = await query.order("verified_at", { ascending: false });
      if (error) return getFilteredInMemoryLogs();
      const logs = (data || []).map(mapToVerificationLog);
      return logs.length > 0 ? logs : getFilteredInMemoryLogs();
    } catch (err: any) {
      return getFilteredInMemoryLogs();
    }
  }

  static async addVerificationLog(log: Omit<VerificationLog, "timestamp">): Promise<void> {
    const fullLog: VerificationLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    inMemoryVerificationLogs.unshift(fullLog);
    try {
      if (!hasValidSupabaseConfig()) return;
      const dbLog = mapToDbVerificationLog(log);
      await supabase.from("verified_transactions").insert(dbLog);
    } catch (err: any) {
      // In-memory fallback stored
    }
  }

  static async getSettings(): Promise<AppSettings> {
    console.log("[db.ts] getSettings called");
    try {
      if (hasValidSupabaseConfig()) {
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (!error && data && data.master_api_key) {
          process.env.MASTER_API_KEY = data.master_api_key;
          return { masterApiKey: data.master_api_key };
        }
      }
      const key = process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";
      return { masterApiKey: key };
    } catch (err: any) {
      console.error("[db.ts] getSettings failed:", err.message);
      const key = process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";
      return { masterApiKey: key };
    }
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    console.log("[db.ts] updateSettings called with updates:", JSON.stringify(settings));
    try {
      if (settings.masterApiKey) {
        process.env.MASTER_API_KEY = settings.masterApiKey;
        if (hasValidSupabaseConfig()) {
          const { error } = await supabase
            .from("app_settings")
            .upsert({ id: 1, master_api_key: settings.masterApiKey }, { onConflict: "id" });
          if (error) {
            console.warn("[db.ts] Supabase app_settings upsert error:", error.message);
          }
        }
      }
      const key = process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";
      return { masterApiKey: key };
    } catch (err: any) {
      console.error("[db.ts] updateSettings failed:", err.message);
      throw err;
    }
  }
}
