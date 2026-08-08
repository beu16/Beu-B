import React, { useEffect } from "react";
import { Zap } from "lucide-react";
import { motion } from "motion/react";

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 2400 }: SplashScreenProps) {
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
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.9);
      }
    } catch (e) {
      // Ignore if autoplay restricted
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full h-full min-h-screen bg-[#050507] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none font-sans z-50 transform-gpu"
      style={{ willChange: "opacity, transform" }}
    >
      {/* Hardware-Accelerated Ambient Radial Gradient Background (Zero GPU Lag) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 transform-gpu"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.08) 40%, transparent 75%)"
        }}
      />

      {/* Lightweight Shockwave Ring (GPU Accelerated Scale & Opacity) */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 2.2], opacity: [0, 0.4, 0] }}
        transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
        className="absolute w-44 h-44 border border-amber-400/50 rounded-full pointer-events-none transform-gpu"
        style={{ willChange: "transform, opacity" }}
      />

      {/* Main Logo Container */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1.05, 1, 1.02, 1.15], 
          opacity: [0, 1, 1, 1, 0]
        }}
        transition={{ 
          duration: 2.3, 
          times: [0, 0.25, 0.5, 0.8, 1],
          ease: "easeInOut" 
        }}
        className="flex flex-col items-center text-center relative z-10 space-y-6 transform-gpu"
        style={{ willChange: "transform, opacity" }}
      >
        {/* Glowing Logo Badge */}
        <div className="relative">
          <div className="w-22 h-22 sm:w-24 sm:h-24 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 rounded-3xl flex items-center justify-center text-black relative z-10 shadow-[0_0_50px_rgba(251,191,36,0.6)] border border-amber-200/50">
            <Zap size={52} className="fill-black stroke-black drop-shadow-sm" />
          </div>

          {/* Light Sweep Overlay */}
          <motion.div
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: ["-120%", "120%"], opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.0, delay: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12 rounded-3xl z-20 pointer-events-none transform-gpu"
            style={{ willChange: "transform, opacity" }}
          />
        </div>

        {/* Brand Typography */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            y: [10, 0, 0, -5]
          }}
          transition={{ duration: 2.2, delay: 0.2, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            BEU <span className="text-amber-400">VERIFY</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.25em] text-amber-300/80 font-bold">
            Smart Fintech Node
          </p>
        </motion.div>
      </motion.div>

      {/* Smooth Progress Indicator Bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-36 h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.3, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transform-gpu"
          style={{ willChange: "width" }}
        />
      </div>
    </motion.div>
  );
}

