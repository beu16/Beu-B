import React, { useEffect } from "react";
import { Zap } from "lucide-react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2000 }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, duration);

    return () => clearTimeout(timer);
  }, [onFinish, duration]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full h-full bg-[#070709] text-white flex flex-col items-center justify-between p-8 relative overflow-hidden select-none font-sans z-50"
    >
      {/* Background Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Spacer */}
      <div className="pt-8" />

      {/* Main Logo & Brand (Centered) */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="flex flex-col items-center text-center space-y-4"
      >
        <div className="w-20 h-20 bg-amber-400 rounded-3xl flex items-center justify-center text-black shadow-[0_0_40px_rgba(250,204,21,0.5)]">
          <Zap size={44} className="fill-black" />
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-white font-display">
            Beu<span className="text-amber-400">Verify</span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono tracking-wider mt-1 uppercase">
            Fintech Node App
          </p>
        </div>
      </motion.div>

      {/* Bottom Loading Indicator & Tagline */}
      <div className="flex flex-col items-center space-y-6 pb-6 text-center">
        {/* Spinner */}
        <div className="w-7 h-7 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
        
        <p className="text-[11px] font-medium text-zinc-500 font-mono tracking-widest uppercase">
          Secure. Verify. Empower.
        </p>
      </div>
    </motion.div>
  );
}
