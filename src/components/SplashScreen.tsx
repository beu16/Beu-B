import React, { useEffect } from "react";
import { Zap } from "lucide-react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 3000 }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, duration);

    return () => clearTimeout(timer);
  }, [onFinish, duration]);

  // Audio effect simulator (Plays a sleek subtle synth bass bump if Web Audio is allowed)
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        // Netflix signature frequency dip: start around 120Hz, swell down to 50Hz
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.8);

        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.3);
      }
    } catch (e) {
      // Ignore if autoplay restricted
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.15 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans z-50"
    >
      {/* Background Netflix-Style Vertical Light Streaks */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        {[...Array(9)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ 
              scaleY: [0, 1.2, 0.9, 0],
              opacity: [0, 0.8, 0.4, 0],
              x: (i - 4) * 28
            }}
            transition={{
              duration: 1.8,
              delay: 0.2 + i * 0.04,
              ease: [0.16, 1, 0.3, 1]
            }}
            className={`w-3 h-full rounded-full ${
              i % 2 === 0 ? "bg-gradient-to-t from-amber-600 via-amber-400 to-transparent" : "bg-gradient-to-t from-yellow-500 via-amber-300 to-transparent"
            } blur-md`}
          />
        ))}
      </div>

      {/* Cinematic Ambient Radial Glow */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ 
          scale: [0.2, 1.8, 1.2, 2.5], 
          opacity: [0, 0.6, 0.3, 0] 
        }}
        transition={{ duration: 2.8, ease: "easeInOut" }}
        className="absolute w-96 h-96 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none"
      />

      {/* Shockwave Energy Ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2.5, 4], opacity: [0, 0.5, 0] }}
        transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
        className="absolute w-40 h-40 border-2 border-amber-400/60 rounded-full pointer-events-none shadow-[0_0_50px_rgba(251,191,36,0.5)]"
      />

      {/* Main Logo Box Container with Netflix Zoom-In & Flash */}
      <motion.div 
        initial={{ scale: 0.2, opacity: 0, filter: "brightness(0)" }}
        animate={{ 
          scale: [0.2, 1.2, 1.0, 1.08, 3.5], 
          opacity: [0, 1, 1, 1, 0],
          filter: ["brightness(0)", "brightness(2)", "brightness(1)", "brightness(1.5)", "brightness(3)"]
        }}
        transition={{ 
          duration: 2.9, 
          times: [0, 0.3, 0.5, 0.85, 1],
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="flex flex-col items-center text-center relative z-10 space-y-6"
      >
        {/* Glowing Logo Icon */}
        <div className="relative">
          {/* Subtle Outer Glowing Aura */}
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(251, 191, 36, 0.3)",
                "0 0 80px rgba(251, 191, 36, 0.9)",
                "0 0 40px rgba(251, 191, 36, 0.5)",
                "0 0 120px rgba(251, 191, 36, 1)"
              ]
            }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "mirror" }}
            className="w-24 h-24 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-black relative z-10 shadow-2xl"
          >
            <Zap size={56} className="fill-black stroke-black drop-shadow-md" />
          </motion.div>

          {/* Light Sweep / Lens Flare overlay across logo */}
          <motion.div
            initial={{ x: "-150%", opacity: 0 }}
            animate={{ x: ["-150%", "150%"], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-12 rounded-3xl z-20 pointer-events-none"
          />
        </div>

        {/* Brand Text with Cinematic Spacing Animation */}
        <motion.div
          initial={{ opacity: 0, y: 15, letterSpacing: "0.4em" }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            y: [15, 0, 0, -10],
            letterSpacing: ["0.4em", "0.05em", "0.08em", "0.2em"]
          }}
          transition={{ duration: 2.6, delay: 0.3, ease: "easeOut" }}
          className="space-y-1"
        >
          <h1 className="text-4xl font-black tracking-tight text-white font-display drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            BEU <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">VERIFY</span>
          </h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 2.2, delay: 0.6 }}
            className="text-[11px] font-mono uppercase tracking-[0.3em] text-amber-300/80 font-bold"
          >
            Smart Fintech Node
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Sleek Progress Indicator at bottom */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.8, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
        />
      </div>
    </motion.div>
  );
}
