export interface ThemeConfig {
  id: "gold" | "slate" | "forest" | "cyber";
  mode?: "light" | "dark";
  name: string;
  nameAmh: string;
  bg: string;          // Main window background
  cardBg: string;      // Panel background
  border: string;      // Panel borders
  borderMuted: string; // Internal sub-borders/dividers
  accentText: string;  // High contrast highlighted text (e.g. text-[#FFD700])
  accentMuted: string; // Muted/secondary highlighted text (e.g. text-[#D4AF37])
  accentHex: string;   // Hex code of main accent
  focusBorder: string; // Focus border style for inputs
  borderHighlight: string; // Subtle highlight border for sub-cards
  subCardBg: string;   // Nested containers/details blocks
  badgeBg: string;     // Small badges/labels style
  btnPrimary: string;  // Primary submission action button style
  glowShadow: string;  // Ambient glow shadow
  glowIconBg: string;  // Icon background glows
  statusBarBg: string; // Bottom bar background
  statusBarText: string; // Bottom bar text color
  logoBg: string;      // Logo box background
}

export const THEMES: Record<"gold" | "slate" | "forest" | "cyber", ThemeConfig> = {
  gold: {
    id: "gold",
    name: "Royal Gold",
    nameAmh: "የንጉሳዊ ወርቅ",
    bg: "bg-[#0A0A0A]",
    cardBg: "bg-[#111111]",
    border: "border-[#D4AF37]/20",
    borderMuted: "border-[#D4AF37]/10",
    accentText: "text-[#FFD700]",
    accentMuted: "text-[#D4AF37]",
    accentHex: "#D4AF37",
    focusBorder: "focus:border-[#FFD700]",
    borderHighlight: "border-[#D4AF37]/15",
    subCardBg: "bg-[#151515]",
    badgeBg: "bg-[#D4AF37]/10 text-[#FFD700] border border-[#D4AF37]/20",
    btnPrimary: "bg-gradient-to-r from-[#D4AF37] to-[#FFD700] hover:from-white hover:to-white text-black hover:text-black font-extrabold shadow-[0_4px_15px_rgba(212,175,55,0.25)]",
    glowShadow: "shadow-[0_10px_30px_rgba(0,0,0,0.6)]",
    glowIconBg: "bg-[#D4AF37]/10 text-[#FFD700] shadow-[0_0_10px_rgba(212,175,55,0.15)]",
    statusBarBg: "bg-[#FFD700]",
    statusBarText: "text-black",
    logoBg: "bg-[#FFD700]"
  },
  slate: {
    id: "slate",
    name: "Slate Minimalist",
    nameAmh: "ዘಮናዊ ስሌት",
    bg: "bg-[#0B0F17]",
    cardBg: "bg-[#151B26]",
    border: "border-zinc-800",
    borderMuted: "border-zinc-850",
    accentText: "text-blue-400",
    accentMuted: "text-blue-500",
    accentHex: "#3B82F6",
    focusBorder: "focus:border-blue-500",
    borderHighlight: "border-blue-500/10",
    subCardBg: "bg-[#10141D]",
    badgeBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    btnPrimary: "bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_4px_15px_rgba(59,130,246,0.25)]",
    glowShadow: "shadow-[0_10px_30px_rgba(11,15,23,0.8)]",
    glowIconBg: "bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
    statusBarBg: "bg-blue-600",
    statusBarText: "text-white",
    logoBg: "bg-blue-600"
  },
  forest: {
    id: "forest",
    name: "Forest Trust",
    nameAmh: "የታመነ አረንጓዴ",
    bg: "bg-[#060A08]",
    cardBg: "bg-[#0F1612]",
    border: "border-[#1E3024]",
    borderMuted: "border-[#1E3024]/40",
    accentText: "text-[#34D399]",
    accentMuted: "text-[#10B981]",
    accentHex: "#10B981",
    focusBorder: "focus:border-[#34D399]",
    borderHighlight: "border-[#10B981]/15",
    subCardBg: "bg-[#141F19]",
    badgeBg: "bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/20",
    btnPrimary: "bg-[#10B981] hover:bg-[#34D399] text-black font-extrabold shadow-[0_4px_15px_rgba(16,185,129,0.25)]",
    glowShadow: "shadow-[0_10px_30px_rgba(0,0,0,0.7)]",
    glowIconBg: "bg-[#10B981]/10 text-[#34D399] shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    statusBarBg: "bg-[#10B981]",
    statusBarText: "text-black",
    logoBg: "bg-[#10B981]"
  },
  cyber: {
    id: "cyber",
    name: "Cyber Orange",
    nameAmh: "ሳይበር ብርቱካናማ",
    bg: "bg-[#040406]",
    cardBg: "bg-[#0C0B12]",
    border: "border-orange-500/30",
    borderMuted: "border-orange-500/15",
    accentText: "text-orange-400",
    accentMuted: "text-orange-500",
    accentHex: "#F97316",
    focusBorder: "focus:border-orange-500",
    borderHighlight: "border-orange-500/15",
    subCardBg: "bg-[#14121E]",
    badgeBg: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    btnPrimary: "bg-orange-500 hover:bg-orange-400 text-black font-extrabold shadow-[0_4px_15px_rgba(249,115,22,0.25)]",
    glowShadow: "shadow-[0_10px_30px_rgba(0,0,0,0.8)]",
    glowIconBg: "bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.15)]",
    statusBarBg: "bg-orange-500",
    statusBarText: "text-black",
    logoBg: "bg-orange-500"
  }
};
