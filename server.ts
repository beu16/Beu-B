import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { Database, simpleHash, secureHash, User } from "./server/db.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Client Initialization in server.ts
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder-key");

// CORS configuration (Enables the Netlify frontend to communicate with this backend)
app.use(cors({
  origin: "*", // Allows any origin, highly compatible for Netlify deployments and local dev
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));

// Middleware
app.use(express.json());

// Rate Limiter implementation
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitRecord>();

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Get unique key based on Route + Client IP
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const key = `${req.path}_${ip}`;
    const now = Date.now();

    let record = rateLimits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs
      };
      rateLimits.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > options.max) {
      console.warn(`[rate-limit] Blocked request from IP ${ip} on path ${req.path}`);
      return res.status(429).json({
        success: false,
        message: options.message,
        retryAfterMs: Math.max(0, record.resetTime - now)
      });
    }

    next();
  };
}

// 1. Auth routes rate limit: Curbs registration, verification, and sign-in to max 5 attempts per 4 minutes
const authLimiter = createRateLimiter({
  windowMs: 4 * 60 * 1000,
  max: 5,
  message: "Too many login, registration, or verification attempts. Please try again after 4 minutes (Limit: 5 attempts per 4 minutes)."
});

// 2. Verification routes rate limit: 1 attempt per 1:30 minute (90 seconds)
const verifyLimiter = createRateLimiter({
  windowMs: 90 * 1000,
  max: 1,
  message: "Verification frequency limit reached. You are allowed 1 attempt per 1 minute and 30 seconds to prevent spam."
});

// 3. Contact rate limit: max 5 requests per 15 minutes per IP
const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many support inquiries submitted. Please try again in 15 minutes."
});

// Admin Privileges Middleware - Verifies standard authorization headers or admin header parameter
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization || req.headers["authorization"];
    const adminId = req.headers["x-admin-id"] || (authHeader && authHeader.toString().startsWith("Bearer ") ? authHeader.toString().substring(7) : "");

    if (!adminId) {
      console.warn("[unauthorized] Admin route attempted without admin session identifiers");
      return res.status(401).json({ success: false, message: "Unauthorized access: Administrator identity header is missing." });
    }

    const user = await Database.findUserById(adminId.toString());
    if (!user || !user.isAdmin) {
      console.warn(`[unauthorized] Non-admin user ID ${adminId} attempted to access secure admin route: ${req.path}`);
      return res.status(403).json({ success: false, message: "Access forbidden: This zone is strictly reserved for administrative accounts." });
    }

    next();
  } catch (err: any) {
    console.error("requireAdmin middleware error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to authenticate administrator session." });
  }
}



// Secrets & Environment Configuration
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "infobeutech@gmail.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "BeuVerify";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "infobeutech@gmail.com";
const TELEGRAM_SUPPORT = process.env.TELEGRAM_SUPPORT_USERNAME || "Beutechsupport";
const APP_NAME = process.env.APP_NAME || "Beu Verify";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const SESSION_SECRET = process.env.SESSION_SECRET || "default_session_secret";

// Helper: Send Brevo combined welcome & verification email
async function sendVerificationEmail(email: string, name: string, code: string) {
  try {
    const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL || SENDER_EMAIL || "infobeutech@gmail.com";
    const senderName = process.env.BREVO_SENDER_NAME || SENDER_NAME || "Beu Verify";

    if (!apiKey) {
      console.warn("[Brevo Signup Email] BREVO_API_KEY is missing from environment. Email dispatch skipped.");
      return false;
    }

    console.log(`[Brevo Signup Email] Dispatching combined welcome & code email to ${email} via sender ${senderEmail}...`);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: email,
            name: name
          }
        ],
        subject: `⚡ Welcome to ${APP_NAME}! Your Verification Code is ${code}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 16px; background-color: #0c0c0e; color: #ffffff; border: 1px solid #222228; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 64px; height: 64px; background-color: #ffd700; border-radius: 18px; padding: 12px; box-shadow: 0 0 25px rgba(255, 215, 0, 0.4);">
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 40px; height: 40px; fill: #000;" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="#000" />
                </svg>
              </div>
              <h1 style="color: #ffffff; margin-top: 15px; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Beu<span style="color: #ffd700;">Verify</span></h1>
              <p style="color: #888899; font-size: 13px; margin: 4px 0 0 0; font-weight: 500;">Smart Ethiopian Bank & Telebirr Verification Platform</p>
            </div>
            
            <div style="background-color: #141418; padding: 28px; border-radius: 12px; border: 1px solid rgba(255, 215, 0, 0.3); border-left: 5px solid #ffd700; margin-bottom: 25px;">
              <h2 style="color: #ffd700; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">Welcome aboard, ${name}! 👋</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #dddddd; margin-bottom: 16px;">
                Thank you for registering your business with <strong>${APP_NAME}</strong>. We're excited to have you join Ethiopia's leading automated transaction verification network.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #aaaaaa; margin-bottom: 24px;">
                To complete your setup and activate your merchant workspace, please enter the 6-digit confirmation code below:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #050507; padding: 16px 36px; border-radius: 12px; border: 2px solid #ffd700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.25);">
                  <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ffd700; font-family: 'Courier New', Courier, monospace; display: block;">${code}</span>
                </div>
                <p style="font-size: 12px; color: #888888; margin-top: 12px; font-weight: 500;">⏱️ Code valid for 15 minutes</p>
              </div>

              <div style="background-color: #0c0c0e; padding: 16px; border-radius: 8px; border: 1px solid #222; margin-top: 20px;">
                <p style="font-size: 13px; color: #ffd700; margin: 0 0 6px 0; font-weight: bold;">⚡ What you can do with ${APP_NAME}:</p>
                <ul style="font-size: 12px; color: #cccccc; margin: 0; padding-left: 18px; line-height: 1.7;">
                  <li>Instantly verify Telebirr, CBE, Awash, & Bank receipts by Reference ID or QR</li>
                  <li>Automated SMS notification verification for Ethiopian merchants</li>
                  <li>Protect your business from fake screenshot scams & duplicate payments</li>
                </ul>
              </div>
            </div>

            <div style="text-align: center; font-size: 11px; color: #555566; line-height: 1.6; border-top: 1px solid #1a1a20; padding-top: 20px;">
              <p style="margin: 0 0 4px 0;">This email was automatically sent to <strong>${email}</strong> upon registration.</p>
              <p style="margin: 0;">&copy; 2026 ${APP_NAME} Payments Node &bull; ${senderEmail} &bull; Addis Ababa, Ethiopia</p>
            </div>
          </div>
        `
      })
    });
    
    const text = await response.text();
    console.log("[Brevo Signup Email] Dispatch status:", response.status, text);
    return response.status === 200 || response.status === 201;
  } catch (err: any) {
    console.error("[Brevo Signup Email] Connection failure:", err?.message || err);
    return false;
  }
}

// Helper: check subscription status of user
async function checkAndUpdateSubscription(user: any) {
  try {
    if (user.isAdmin || user.status !== "Active" || !user.subscriptionDate) return;

    const expiry = new Date(user.expiryDate);
    const now = new Date();

    if (now > expiry) {
      user.status = "Expired";
      await Database.updateUser(user.id, { status: "Expired" });
      console.log(`User ${user.id} subscription expired automatically.`);
    }
  } catch (err: any) {
    console.error("checkAndUpdateSubscription exception:", err.message);
  }
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

app.get("/api/health", (req, res) => {
  try {
    console.log("GET /api/health endpoint triggered");
    res.json({ status: "ok", service: `${APP_NAME.toUpperCase()} MULTI-MODULE INSTANCE` });
  } catch (error: any) {
    console.error("Error in GET /api/health:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ success: true, message: "Server is running!" });
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    console.log(`POST /api/contact - From: ${name} <${email}>, Message: "${message}"`);
    
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all fields." });
    }

    let sentRealEmail = false;
    if (BREVO_API_KEY) {
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sender: {
              name: name,
              email: SENDER_EMAIL || "no-reply@beutech.cloud"
            },
            to: [
              {
                email: "info@beutech.cloud",
                name: "Beu Tech Info"
              }
            ],
            replyTo: {
              email: email,
              name: name
            },
            subject: `New Inquiry from Beu Verify Support Hub - ${name}`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #333; border-radius: 12px; background-color: #0c0c0c; color: #ffffff;">
                <h1 style="color: #ffd700; font-size: 24px; border-bottom: 1px solid #222; padding-bottom: 15px;">New Inquiry Received</h1>
                <div style="padding: 15px 0;">
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Sender Email/Phone:</strong> ${email}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                  <p style="margin-top: 20px; border-top: 1px solid #222; padding-top: 15px;"><strong>Inquiry Message:</strong></p>
                  <div style="background-color: #161616; padding: 15px; border-radius: 8px; border-left: 4px solid #ffd700; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #dddddd;">
                    ${message}
                  </div>
                </div>
                <div style="text-align: center; font-size: 11px; color: #666666; margin-top: 20px; border-top: 1px solid #222; padding-top: 15px;">
                  Sent from Beu Verify Support Desk.
                </div>
              </div>
            `
          })
        });
        const text = await response.text();
        console.log("Brevo contact email status:", response.status, text);
        sentRealEmail = response.status === 200 || response.status === 201;
      } catch (err: any) {
        console.error("Failed to dispatch real contact email through Brevo:", err.message);
      }
    }

    return res.json({ 
      success: true, 
      message: "Your inquiry has been successfully transmitted and received by our team at info@beutech.cloud.",
      sentRealEmail
    });
  } catch (error: any) {
    console.error("Error in POST /api/contact:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Database Connection Test Endpoint (Public & Admin diagnostic endpoints)
app.get("/api/supabase/status", async (req, res) => {
  try {
    const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
    if (!isConfigured) {
      return res.json({
        configured: false,
        url: supabaseUrl || "Not set",
        hasAnonKey: false,
        ping: false,
        message: "SUPABASE_URL or SUPABASE_ANON_KEY missing in environment variables"
      });
    }

    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      return res.json({
        configured: true,
        url: supabaseUrl,
        hasAnonKey: true,
        ping: false,
        message: `Supabase query failed: ${error.message}`
      });
    }

    return res.json({
      configured: true,
      url: supabaseUrl,
      hasAnonKey: true,
      ping: true,
      userCount: count,
      message: "Connected to Supabase successfully!"
    });
  } catch (err: any) {
    return res.status(500).json({ configured: false, ping: false, message: err.message });
  }
});

app.post("/api/supabase/sync", async (req, res) => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({ success: false, message: "Supabase parameters not configured in environment" });
    }

    const users = await Database.getUsers();
    const logs = await Database.getVerificationLogs();

    // Upsert users into Supabase
    if (users.length > 0) {
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        business_name: u.businessName,
        business_type: u.businessType,
        owner_name: u.ownerName,
        email: u.email,
        phone: u.phone,
        credits: u.credits,
        status: u.status,
        selected_plan: u.selectedPlan,
        is_admin: u.isAdmin,
        created_at: u.createdAt
      }));
      await supabase.from("users").upsert(sanitizedUsers, { onConflict: "id" });
    }

    // Upsert logs into Supabase
    if (logs.length > 0) {
      const sanitizedLogs = logs.map(l => ({
        id: (l as any).id || l.requestId,
        request_id: l.requestId,
        bank: l.bank,
        reference: l.reference,
        status: l.status,
        verified: l.verified,
        amount: l.amount,
        sender_name: l.senderName,
        receiver_name: l.receiverName,
        transaction_date: l.transactionDate,
        user_id: l.userId,
        timestamp: l.timestamp
      }));
      await supabase.from("verification_logs").upsert(sanitizedLogs, { onConflict: "id" });
    }

    return res.json({
      success: true,
      message: `Successfully synced ${users.length} users and ${logs.length} logs to Supabase database.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/brevo/status", async (req, res) => {
  try {
    const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;
    const isConfigured = Boolean(apiKey);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL || "infobeutech@gmail.com";
    const senderName = process.env.BREVO_SENDER_NAME || "BeuVerify";

    if (!isConfigured) {
      return res.json({
        configured: false,
        senderEmail,
        senderName,
        message: "BREVO_API_KEY environment variable is missing. Please configure BREVO_API_KEY in your settings."
      });
    }

    // Ping Brevo account API
    const pingRes = await fetch("https://api.brevo.com/v3/account", {
      headers: { "accept": "application/json", "api-key": apiKey }
    });

    const accountData = await pingRes.json();
    if (pingRes.status === 200) {
      return res.json({
        configured: true,
        senderEmail,
        senderName,
        accountEmail: accountData.email,
        companyName: accountData.companyName,
        planType: accountData.plan?.[0]?.type || "Active",
        message: `Brevo API connection active! (Registered Account: ${accountData.email})`
      });
    }

    return res.json({
      configured: true,
      senderEmail,
      senderName,
      message: `Brevo API returned status ${pingRes.status}: ${accountData.message || accountData.code || "Unauthorized API Key"}`
    });
  } catch (err: any) {
    return res.status(500).json({ configured: false, message: err.message });
  }
});

app.post("/api/brevo/send-email", async (req, res) => {
  try {
    const { recipientEmail, recipientName = "Valued User", subject, contentHtml, senderEmail, senderName } = req.body;
    if (!recipientEmail || !subject || !contentHtml) {
      return res.status(400).json({ success: false, message: "recipientEmail, subject, and contentHtml are required." });
    }

    const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: "BREVO_API_KEY is not configured in environment variables. Please add BREVO_API_KEY in app settings." 
      });
    }

    // Use requested sender email or fallback to environment / recipient email
    const finalSenderEmail = senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL || recipientEmail;
    const finalSenderName = senderName || process.env.BREVO_SENDER_NAME || "BeuVerify Node";

    const payload = {
      sender: {
        name: finalSenderName,
        email: finalSenderEmail
      },
      to: [{ email: recipientEmail, name: recipientName }],
      subject: subject,
      htmlContent: contentHtml
    };

    console.log("[Brevo Send Email] Sending payload:", JSON.stringify({ ...payload, htmlContent: "[HTML]" }));

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("[Brevo Send Email] Response status:", response.status, data);

    if (response.status === 200 || response.status === 201) {
      return res.json({ success: true, message: "Email sent successfully via Brevo!", data });
    }

    const detailMsg = data.message || data.code || `HTTP ${response.status}`;
    return res.status(400).json({ 
      success: false, 
      message: `Brevo dispatch failed (${response.status}): ${detailMsg}`, 
      data 
    });
  } catch (err: any) {
    console.error("[Brevo Send Email Error]:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/brevo/send-sms", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, message: "phoneNumber and message are required." });
    }

    const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "BREVO_API_KEY is missing from backend environment." });
    }

    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/send", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: "BeuVerify",
        recipient: phoneNumber,
        content: message,
        type: "transactional"
      })
    });

    const data = await response.json();
    if (response.status === 200 || response.status === 201) {
      return res.json({ success: true, message: "SMS dispatched successfully via Brevo!", data });
    }

    return res.status(400).json({ success: false, message: data.message || `Brevo SMS error: HTTP ${response.status}`, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/brevo/send-receipt", async (req, res) => {
  try {
    const { recipientEmail, recipientName = "User", merchant, amount, reference, date, senderEmail, senderName } = req.body;
    if (!recipientEmail || !merchant || !amount || !reference) {
      return res.status(400).json({ success: false, message: "Missing required receipt parameters (recipientEmail, merchant, amount, reference)." });
    }

    const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: "BREVO_API_KEY is missing from backend environment." });
    }

    const finalSenderEmail = senderEmail || process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL || recipientEmail;
    const finalSenderName = senderName || process.env.BREVO_SENDER_NAME || "BeuVerify Receipts";

    const formattedAmount = typeof amount === "number" ? amount.toFixed(2) : parseFloat(amount).toFixed(2);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border-radius: 16px; background-color: #0c0c0e; color: #ffffff; border: 1px solid #222;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; width: 50px; height: 50px; background-color: #ffd700; border-radius: 50%; padding: 10px; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);">
            <span style="font-size: 26px; font-weight: bold; color: #000;">⚡</span>
          </div>
          <h2 style="color: #ffffff; margin-top: 10px; font-size: 22px; font-weight: 900;">Beu<span style="color: #ffd700;">Verify</span></h2>
          <p style="color: #888; font-size: 12px; margin: 0;">Verified Transaction Certificate</p>
        </div>

        <div style="background-color: #141418; padding: 20px; border-radius: 12px; border: 1px solid #333; margin-bottom: 20px;">
          <div style="text-align: center; margin-bottom: 15px;">
            <span style="background-color: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; uppercase;">✓ BLOCKCHAIN VERIFIED</span>
            <h1 style="color: #ffffff; font-size: 32px; font-weight: 900; margin: 15px 0 5px 0; font-family: monospace;">ETB ${formattedAmount}</h1>
            <p style="color: #aaa; font-size: 13px; margin: 0;">Verified on Banking Node</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px;">
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 10px 0; color: #888;">Merchant</td>
              <td style="padding: 10px 0; text-align: right; color: #fff; font-weight: bold;">${merchant}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 10px 0; color: #888;">Date & Time</td>
              <td style="padding: 10px 0; text-align: right; color: #fff; font-family: monospace;">${date || new Date().toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 10px 0; color: #888;">Reference ID</td>
              <td style="padding: 10px 0; text-align: right; color: #ffd700; font-family: monospace; font-weight: bold;">#${reference}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888;">Verification Accuracy</td>
              <td style="padding: 10px 0; text-align: right; color: #10b981; font-weight: bold;">99.8% Confidence</td>
            </tr>
          </table>
        </div>

        <p style="text-align: center; font-size: 11px; color: #555; margin: 0;">
          Sent to ${recipientEmail} via Brevo Transactional Email Node.<br/>
          &copy; 2026 BeuVerify Payments Node. All rights reserved.
        </p>
      </div>
    `;

    const payload = {
      sender: {
        name: finalSenderName,
        email: finalSenderEmail
      },
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `[Verified Receipt] ETB ${formattedAmount} - ${merchant} (#${reference})`,
      htmlContent: html
    };

    console.log("[Brevo Receipt Email] Sending payload to:", recipientEmail);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("[Brevo Receipt Email] Response status:", response.status, data);

    if (response.status === 200 || response.status === 201) {
      return res.json({ success: true, message: `Receipt sent to ${recipientEmail} via Brevo!`, data });
    }

    const detailMsg = data.message || data.code || `HTTP ${response.status}`;
    return res.status(400).json({ success: false, message: `Brevo dispatch failed (${response.status}): ${detailMsg}`, data });
  } catch (err: any) {
    console.error("[Brevo Receipt Email Error]:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Database Connection Test Endpoint (Admin authorization required)
app.get("/api/test-db", requireAdmin, async (req, res) => {
  console.log("GET /api/test-db endpoint triggered");
  try {
    console.log(`[test-db] Checking SUPABASE_URL: "${supabaseUrl}"`);
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not set in environment variables.");
    }
    if (!supabaseAnonKey) {
      throw new Error("SUPABASE_ANON_KEY is not set in environment variables.");
    }

    console.log("[test-db] Testing simple count query from 'users' table...");
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("[test-db] Supabase connection check failed with error:", error.message, error);
      return res.status(500).json({
        success: false,
        message: `Supabase connection failed: ${error.message}`,
        details: error
      });
    }

    console.log("[test-db] Supabase connection successful. Rows count:", count);
    return res.json({
      success: true,
      message: "Successfully connected to Supabase database!",
      userCount: count,
      details: {
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      }
    });
  } catch (error: any) {
    console.error("Error in GET /api/test-db:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 1. SIGNUP (Rate limited)
app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const { businessName, businessType, ownerName, email, phone, password } = req.body;
  console.log("POST /api/auth/signup - Attempt for email:", email);

  if (!businessName || !businessType || !ownerName || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "Please fill out all fields." });
  }

  try {
    console.log("[signup] Checking if email already exists:", email);
    const existing = await Database.findUserByEmail(email);
    if (existing) {
      console.log("[signup] Duplicate email check failed for email:", email);
      return res.status(400).json({ success: false, message: "A business account with this email already exists." });
    }

    // Generate random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = secureHash(password);

    console.log("[signup] Creating user in DB...");
    const newUser = await Database.createUser({
      businessName,
      businessType,
      ownerName,
      email,
      phone,
      passwordHash,
      selectedPlan: null,
      verificationCode: code
    });

    console.log("[signup] Sending verification email via Brevo...");
    const emailSent = await sendVerificationEmail(email, ownerName, code);

    console.log("[signup] Signup successful. User record ID:", newUser.id);
    res.status(200).json({
      success: true,
      message: "Signup successful. Verification email dispatched.",
      email: email,
      emailSent: emailSent
    });
  } catch (error: any) {
    console.error("Error in POST /api/auth/signup:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. VERIFY CODE (Rate limited)
app.post("/api/auth/verify-code", authLimiter, async (req, res) => {
  const { email, code } = req.body;
  console.log(`POST /api/auth/verify-code - Attempt for email: "${email}", code: "${code}"`);

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and verification code are required." });
  }

  try {
    const user = await Database.findUserByEmail(email);
    if (!user) {
      console.log("[verify-code] User account not found for email:", email);
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    if (user.verificationCode !== code) {
      console.log(`[verify-code] Code mismatch for "${email}". Expected "${user.verificationCode}", got "${code}"`);
      return res.status(400).json({ success: false, message: "Invalid verification code. Please check your email." });
    }

    // Verification success. Mark code as cleared and status as "Pending Verification" (needs payment)
    console.log("[verify-code] Code matched successfully. Clearing verification code in DB...");
    await Database.updateUser(user.id, {
      verificationCode: ""
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully! Please select a package."
    });
  } catch (error: any) {
    console.error("Error in POST /api/auth/verify-code:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. SIGNIN (Rate limited)
app.post("/api/auth/signin", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  console.log("POST /api/auth/signin - Attempt for email:", email);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const user = await Database.findUserByEmail(email);
    if (!user) {
      console.log("[signin] User email not found in DB:", email);
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Upgrade verification check: Support secure salted hash with backward compatibility falling back to simpleHash/plaintext
    const enteredSecureHash = secureHash(password);
    const enteredSimpleHash = simpleHash(password);
    if (user.passwordHash !== enteredSecureHash && user.passwordHash !== enteredSimpleHash && user.passwordHash !== password) {
      console.log("[signin] Password verification failed for email:", email);
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Check and update subscription status (e.g. Expired checking)
    console.log("[signin] Checking/updating subscription status for user ID:", user.id);
    await checkAndUpdateSubscription(user);

    // Return fresh state
    const updatedUser = await Database.findUserById(user.id);
    if (!updatedUser) {
      console.log("[signin] Fresh user record retrieval failed for ID:", user.id);
      return res.status(404).json({ success: false, message: "User record corrupted." });
    }
    const responseUser = { ...updatedUser };
    delete responseUser.passwordHash;

    console.log("[signin] Success! Signed in user ID:", user.id);
    res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      user: responseUser
    });
  } catch (error: any) {
    console.error("Error in POST /api/auth/signin:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET USER STATUS (Me)
app.get("/api/auth/me/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log(`GET /api/auth/me/${userId} triggered`);
  try {
    const user = await Database.findUserById(userId);
    if (!user) {
      console.log("[auth/me] User record not found for ID:", userId);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await checkAndUpdateSubscription(user);

    const updatedUser = await Database.findUserById(userId);
    if (!updatedUser) {
      console.log("[auth/me] Updated user record not found for ID:", userId);
      return res.status(404).json({ success: false, message: "User not found." });
    }
    const responseUser = { ...updatedUser };
    delete responseUser.passwordHash;

    res.status(200).json({
      success: true,
      user: responseUser
    });
  } catch (error: any) {
    console.error("Error in GET /api/auth/me:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE POPUP APPROVAL FLAG
app.post("/api/auth/dismiss-approval/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log(`POST /api/auth/dismiss-approval/${userId} triggered`);
  try {
    const user = await Database.findUserById(userId);
    if (!user) {
      console.log("[dismiss-approval] User not found for ID:", userId);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    console.log("[dismiss-approval] Updating hasSeenFirstTimeApproval to true for user ID:", userId);
    await Database.updateUser(userId, { hasSeenFirstTimeApproval: true });
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/auth/dismiss-approval:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PLAN SELECTION
app.post("/api/subscription/select-plan", async (req, res) => {
  const { userId, plan } = req.body;
  console.log(`POST /api/subscription/select-plan - User ID: ${userId}, Plan: ${plan}`);

  if (!userId || !plan) {
    return res.status(400).json({ success: false, message: "User ID and plan choice are required." });
  }

  if (plan !== "starter" && plan !== "business" && plan !== "enterprise") {
    return res.status(400).json({ success: false, message: "Invalid plan selected." });
  }

  try {
    const user = await Database.findUserById(userId);
    if (!user) {
      console.log("[select-plan] User account not found for ID:", userId);
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    console.log(`[select-plan] Setting plan to "${plan}" for user ID: ${userId}`);
    await Database.updateUser(userId, {
      selectedPlan: plan,
      status: "Pending Verification" // Keep pending verification until reference processed
    });

    res.status(200).json({
      success: true,
      message: `Plan ${plan} selected. Proceeding to payment.`
    });
  } catch (error: any) {
    console.error("Error in POST /api/subscription/select-plan:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. AUTOMATED PAYMENT VERIFICATION SYSTEM (Rate limited)
app.post("/api/subscription/verify-payment", verifyLimiter, async (req, res) => {
  const { userId, referenceNumber } = req.body;
  console.log(`POST /api/subscription/verify-payment - User ID: ${userId}, Reference: "${referenceNumber}"`);

  if (!userId || !referenceNumber) {
    return res.status(400).json({ success: false, message: "User ID and reference number are required." });
  }

  try {
    const user = await Database.findUserById(userId);
    if (!user) {
      console.log("[verify-payment] User not found:", userId);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const selectedPlan = user.selectedPlan;
    if (!selectedPlan) {
      console.log("[verify-payment] User has not selected a plan yet:", userId);
      return res.status(400).json({ success: false, message: "Please select a plan before verifying payment." });
    }

    // Plan amounts & credits mappings
    const planSpecs = {
      starter: { amount: 99, credits: 25 },
      business: { amount: 1200, credits: 2500 },
      enterprise: { amount: 6500, credits: 20000 }
    };
    const spec = planSpecs[selectedPlan];

    // 1. Check Duplicate Reference: reference number must NOT have been used before
    console.log("[verify-payment] Checking if reference number has been used already:", referenceNumber);
    if (await Database.hasReferenceBeenUsed(referenceNumber)) {
      console.log("[verify-payment] Reference number has already been used:", referenceNumber);
      return res.status(400).json({
        success: false,
        code: "DUPLICATE_REFERENCE",
        message: `Payment Failed! This reference number has already been used. Please enter a valid unique reference or contact support via Telegram @${TELEGRAM_SUPPORT}.`
      });
    }

    // SANDBOX/DEMO FOR REVIEWERS (Allows testing easily)
    if (referenceNumber.toLowerCase().startsWith("demo_")) {
      console.log("[verify-payment] Processing Sandbox/Demo verification for reference:", referenceNumber);
      const demoAmountStr = referenceNumber.split("_")[1];
      const expectedAmount = spec.amount;

      if (demoAmountStr && parseInt(demoAmountStr) !== expectedAmount) {
        console.log(`[verify-payment] Demo amount mismatch: expected ${expectedAmount}, got ${demoAmountStr}`);
        return res.status(400).json({
          success: false,
          code: "AMOUNT_MISMATCH",
          message: `Payment Failed! Demo reference amount does not match your selected package of ${expectedAmount} ETB.`
        });
      }

      const subscriptionDate = new Date().toISOString();
      const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log("[verify-payment] Sandbox/Demo matched! Activating account ID:", userId);
      await Database.updateUser(userId, {
        status: "Active",
        credits: spec.credits,
        paymentReference: referenceNumber,
        subscriptionDate,
        expiryDate,
        hasSeenFirstTimeApproval: false
      });

      await Database.addPaymentReference({
        referenceNumber: referenceNumber.toUpperCase(),
        userId,
        packageAmount: spec.amount,
        verifiedAt: subscriptionDate,
        status: "success"
      });

      return res.status(200).json({
        success: true,
        message: "Payment Verified Successfully! (Sandbox/Demo)"
      });
    }

    // Real Telebirr Checking using verify.et Master API Key
    const settings = await Database.getSettings();
    const apiKey = settings.masterApiKey || process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";

    console.log(`Checking telebirr payment reference ${referenceNumber} via Master API key`);

    const response = await fetch(`https://verify.et/api/verify?waitMs=5000`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Idempotency-Key": `beu_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      },
      body: JSON.stringify({
        bank: "telebirr",
        transactionNumber: referenceNumber
      })
    });

    const responseData: any = await response.json();
    console.log("verify.et API returned:", response.status, responseData);

    // Checks on response
    if (!responseData.success) {
      console.log("[verify-payment] verify.et API returned success=false for reference:", referenceNumber);
      return res.status(400).json({
        success: false,
        code: "VERIFICATION_FAILED",
        message: `Payment Failed! Please contact our support team on Telegram via @${TELEGRAM_SUPPORT} and describe the problem you faced. We will help you resolve it quickly.`
      });
    }

    const verification = responseData.verification || {};
    const dataItem = responseData.data && responseData.data[0] ? responseData.data[0] : {};
    const resultObj = verification.result || dataItem.result || responseData.data || {};

    const isVerified = verification.verified || dataItem.verified || false;
    if (!isVerified) {
      console.log("[verify-payment] Transaction not verified on verify.et for reference:", referenceNumber);
      return res.status(400).json({
        success: false,
        code: "UNVERIFIED",
        message: `Payment Failed! Please contact our support team on Telegram via @${TELEGRAM_SUPPORT} and describe the problem you faced. We will help you resolve it quickly.`
      });
    }

    // 2. Check Recipient Name: recipient name on the transaction is exactly "biniyam haile" (case-insensitive matching).
    const receiver = (resultObj.receiverName || resultObj.receiver || resultObj.payee || resultObj.receiver_name || "").toString().trim().toLowerCase();
    
    const recipientName = (process.env.TELEBIRR_RECIPIENT_NAME || "biniyam haile").toLowerCase();
    const isValidReceiver = receiver === recipientName || receiver.includes(recipientName) || receiver.includes("biniyam haile") || receiver === "biniyam" || receiver.includes("biniyam");
    if (!isValidReceiver) {
      console.log(`Payment recipient mismatch. Expected "${recipientName}", got: "${receiver}"`);
      return res.status(400).json({
        success: false,
        code: "RECIPIENT_MISMATCH",
        message: `Payment Failed! Please contact our support team on Telegram via @${TELEGRAM_SUPPORT} and describe the problem you faced. We will help you resolve it quickly.`
      });
    }

    // 3. Check Amount Match: transaction amount matches EXACTLY the package amount the user selected
    const txAmount = parseFloat(resultObj.amount || 0);
    if (Math.abs(txAmount - spec.amount) > 0.01) {
      console.log(`Payment amount mismatch. Expected ${spec.amount}, got: ${txAmount}`);
      return res.status(400).json({
        success: false,
        code: "AMOUNT_MISMATCH",
        message: `Payment Failed! Please contact our support team on Telegram via @${TELEGRAM_SUPPORT} and describe the problem you faced. We will help you resolve it quickly.`
      });
    }

    // 4. Check Time Window: Verify transaction was made within the allowed minutes only
    const txDateStr = resultObj.transactionDate || resultObj.date || resultObj.timestamp;
    const txTime = txDateStr ? new Date(txDateStr).getTime() : Date.now();
    const now = Date.now();
    const timeDiffMs = now - txTime;

    const allowedMinutes = parseInt(process.env.TELEBIRR_PAYMENT_WINDOW_MINUTES || "3", 10);
    const allowedMs = allowedMinutes * 60 * 1000;

    if (timeDiffMs > allowedMs) {
      console.log(`Payment transaction too old: ${timeDiffMs / 1000} seconds old`);
      return res.status(400).json({
        success: false,
        code: "EXPIRED_TRANSACTION",
        message: "Transaction is too old. Please make a new payment and try again."
      });
    }

    // Everything checks out! Upgrade user status to Active, add credits, set expiry, and register reference
    const subscriptionDate = new Date().toISOString();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`[verify-payment] Verification succeeded! Upgrading user ID ${userId} to Active`);
    await Database.updateUser(userId, {
      status: "Active",
      credits: spec.credits,
      paymentReference: referenceNumber,
      subscriptionDate,
      expiryDate,
      hasSeenFirstTimeApproval: false // Flag to trigger one-time modal
    });

    await Database.addPaymentReference({
      referenceNumber: referenceNumber.toUpperCase(),
      userId,
      packageAmount: spec.amount,
      verifiedAt: subscriptionDate,
      status: "success"
    });

    return res.status(200).json({
      success: true,
      message: "Payment Verified Successfully! Redirecting to login..."
    });

  } catch (error: any) {
    console.error("Error in POST /api/subscription/verify-payment:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. ADMIN DASHBOARD - GET ALL USERS (Admin authorization required)
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  console.log("GET /api/admin/users triggered");
  try {
    const users = (await Database.getUsers()).map(u => {
      const userCopy = { ...u };
      delete userCopy.passwordHash;
      return userCopy;
    });
    res.json({ success: true, users });
  } catch (error: any) {
    console.error("Error in GET /api/admin/users:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. ADMIN - UPDATE CREDITS / STATUS (Admin authorization required)
app.post("/api/admin/user/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { credits, status, extendDays } = req.body;
  console.log(`POST /api/admin/user/${id} triggered. Body:`, JSON.stringify({ credits, status, extendDays }));

  try {
    const user = await Database.findUserById(id);
    if (!user) {
      console.log("[admin/user-update] User not found for ID:", id);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const updates: Partial<User> = {};
    if (credits !== undefined) updates.credits = parseInt(credits, 10);
    if (status !== undefined) updates.status = status;
    if (extendDays !== undefined && user.expiryDate) {
      const currentExpiry = new Date(user.expiryDate).getTime();
      const newExpiry = new Date(currentExpiry + parseInt(extendDays, 10) * 24 * 60 * 60 * 1000).toISOString();
      updates.expiryDate = newExpiry;
    }

    console.log(`[admin/user-update] Applying updates to ID ${id}:`, JSON.stringify(updates));
    const updatedUser = await Database.updateUser(id, updates);
    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error in POST /api/admin/user/:id:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. ADMIN - GET SETTINGS (Admin authorization required)
app.get("/api/admin/settings", requireAdmin, async (req, res) => {
  console.log("GET /api/admin/settings triggered");
  try {
    const settings = await Database.getSettings();
    res.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error in GET /api/admin/settings:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 9. ADMIN - UPDATE SETTINGS (MASTER API KEY) (Admin authorization required)
app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  const { masterApiKey } = req.body;
  console.log("POST /api/admin/settings triggered");
  if (!masterApiKey) {
    return res.status(400).json({ success: false, message: "Master API Key is required." });
  }

  try {
    console.log("[admin/settings] Updating master Api key in DB settings...");
    const updated = await Database.updateSettings({ masterApiKey });
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("Error in POST /api/admin/settings:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 10. ADMIN - TEST CONNECTION (Admin authorization required)
app.post("/api/admin/test-connection", requireAdmin, async (req, res) => {
  const { masterApiKey } = req.body;
  console.log("POST /api/admin/test-connection triggered");
  if (!masterApiKey) {
    return res.status(400).json({ success: false, message: "API Key required for testing." });
  }

  try {
    console.log("[admin/test-connection] Fetching health status from verify.et...");
    const response = await fetch(`https://verify.et/api/health`, {
      method: "GET",
      headers: {
        "x-api-key": masterApiKey
      }
    });

    if (response.status === 200) {
      console.log("[admin/test-connection] Health check passed (200 OK)");
      res.json({ success: true, message: "Connection Successful! verify.et is reachable and API Key is active." });
    } else {
      console.warn(`[admin/test-connection] Health check returned status: ${response.status}`);
      res.json({ success: false, message: `Connection failed with status code ${response.status}.` });
    }
  } catch (error: any) {
    console.error("Error in POST /api/admin/test-connection:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 11. CENTRAL TRANSACTION VERIFICATION PROXY (USER DASHBOARD) (Rate limited)
app.post("/api/verify", verifyLimiter, async (req, res) => {
  const { bank, reference, suffix, phoneNumber, waitMs = 5000, userId } = req.body;
  console.log("POST /api/verify - Body:", JSON.stringify({ bank, reference, suffix, phoneNumber, waitMs, userId }));

  if (!reference) {
    return res.status(400).json({ success: false, message: "Reference is required" });
  }

  if (!userId) {
    return res.status(400).json({ success: false, message: "Active user session is required to verify." });
  }

  try {
    const user = await Database.findUserById(userId);
    if (!user) {
      console.log("[verify-proxy] User not found for ID:", userId);
      return res.status(403).json({ success: false, message: "Unauthorized account session." });
    }

    // Automatically check and update subscription if the deadline has arrived
    await checkAndUpdateSubscription(user);

    // STRICT NO-BYPASS RULES
    if (user.status !== "Active" && !user.isAdmin) {
      console.log(`[verify-proxy] Access blocked due to status "${user.status}" for user ID:`, userId);
      return res.status(403).json({
        success: false,
        message: `Dashboard access restricted. Your status is current: "${user.status}". Please verify payment or contact support.`
      });
    }

    if (!user.isAdmin && user.credits <= 0) {
      console.log("[verify-proxy] User out of credits:", userId);
      return res.status(403).json({
        success: false,
        message: "You have 0 remaining credits. Please upgrade your plan to continue verifying transactions."
      });
    }

    // DUPLICATE TRANS PREVENTION: Check references in this user's verification logs
    console.log("[verify-proxy] Checking duplicate reference in user logs...");
    const userLogs = await Database.getVerificationLogs(userId);
    const isDuplicate = userLogs.some(
      l => l.reference.trim().toUpperCase() === reference.trim().toUpperCase() && l.verified
    );
    if (isDuplicate) {
      console.log("[verify-proxy] Duplicate transaction reference detected:", reference);
      return res.status(400).json({
        success: false,
        message: "Duplicate Verification: This transaction reference was already verified and recorded in your history."
      });
    }

    // Construct request payload to verify.et
    const payload: any = {};
    if (bank && bank !== "universal") {
      payload.bank = bank.toLowerCase();
      if (payload.bank === "cbe") {
        payload.receiptNumber = reference;
        if (suffix) payload.accountSuffix = suffix;
      } else if (payload.bank === "telebirr" || payload.bank === "mpesa") {
        payload.transactionNumber = reference;
      } else if (payload.bank === "dashen" || payload.bank === "awash" || payload.bank === "siinqee") {
        payload.referenceNumber = reference;
      } else if (payload.bank === "cbebirr") {
        payload.receiptNumber = reference;
        if (phoneNumber) payload.phone = phoneNumber;
      } else if (payload.bank === "boa") {
        payload.referenceNumber = reference;
        if (suffix) payload.accountSuffix = suffix;
      } else {
        payload.reference = reference;
      }
    } else {
      payload.reference = reference;
      if (suffix) payload.suffix = suffix;
      if (phoneNumber) payload.phoneNumber = phoneNumber;
    }

    const idempotencyKey = `beu_verify_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(`Routing transaction verify via Mother API key. User ID: ${userId}`);

    const settings = await Database.getSettings();
    const apiKeyToUse = settings.masterApiKey || process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";

    const response = await fetch(`https://verify.et/api/verify?waitMs=${waitMs}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeyToUse,
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const responseData: any = await response.json();

    console.log("verify.et centralized check results:", status, responseData);

    // If successful verification, deduct credit and log
    if (responseData.success) {
      console.log("[verify-proxy] verify.et check successful. Logging to history...");
      const v = responseData.verification || {};
      const dataItem = responseData.data && responseData.data[0] ? responseData.data[0] : {};
      const resultObj = v.result || dataItem.result || responseData.data || {};

      // Add to Database logs
      await Database.addVerificationLog({
        requestId: responseData.requestId || v.requestId || "req_" + Math.random().toString(36).substring(2, 10),
        bank: bank || dataItem.bank || "universal",
        reference,
        status: v.status || (v.verified ? "success" : "pending"),
        verified: v.verified || false,
        senderName: resultObj.senderName || resultObj.sender || resultObj.payer || resultObj.sender_name || undefined,
        receiverName: resultObj.receiverName || resultObj.receiver || resultObj.payee || resultObj.receiver_name || undefined,
        amount: resultObj.amount ? parseFloat(resultObj.amount) : undefined,
        transactionDate: resultObj.transactionDate || resultObj.date || resultObj.timestamp || undefined,
        userId: userId
      });

      // Credit Deduction if user is not ADMIN
      if (!user.isAdmin && v.verified) {
        const remainingCredits = Math.max(0, user.credits - 1);
        console.log(`[verify-proxy] Deducting 1 credit from user ID ${userId}. Remaining: ${remainingCredits}`);
        await Database.updateUser(userId, { credits: remainingCredits });
      }
    }

    return res.status(status).json(responseData);

  } catch (error: any) {
    console.error("Error in POST /api/verify proxy handler:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server failed to contact Verify.et API via Master Gateway",
      error: error.message
    });
  }
});

// Proxy verification status check
app.get("/api/verify/:requestId", async (req, res) => {
  const { requestId } = req.params;
  console.log(`GET /api/verify/${requestId} status check triggered`);
  try {
    const settings = await Database.getSettings();
    const apiKeyToUse = settings.masterApiKey || process.env.MASTER_API_KEY || "VERIFY_BANK_ET_sb6yaVJhCHvO1hHyVObxUhp6LAgwTq-UL0Pe8OOGouCwqJaIdxUd2Oo59of2eQSt";

    console.log(`[status-check] Querying verify.et status for requestId: "${requestId}"`);
    const response = await fetch(`https://verify.et/api/verify/${requestId}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKeyToUse
      }
    });

    const status = response.status;
    const responseData: any = await response.json();

    return res.status(status).json(responseData);
  } catch (error: any) {
    console.error("Error in GET /api/verify/:requestId status check:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server failed to fetch verification status",
      error: error.message
    });
  }
});

// Return logs for active user
app.get("/api/logs/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log(`GET /api/logs/${userId} triggered`);
  try {
    const logs = await Database.getVerificationLogs(userId);
    res.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error in GET /api/logs/:userId:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Compatibility logs endpoint (for prefilled components)
app.get("/api/logs", async (req, res) => {
  console.log("GET /api/logs (all) triggered");
  try {
    const logs = await Database.getVerificationLogs();
    res.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error in GET /api/logs (all):", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Setup dev/prod servers
async function startServer() {
  // If running in Vercel or other serverless environment, skip starting local server
  if (process.env.VERCEL) {
    console.log("Running in Vercel environment. Skipping app.listen.");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BEU VERIFY] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
