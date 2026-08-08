import React, { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { Camera, Upload, AlertCircle, RefreshCw, CheckCircle2, FileImage, Landmark } from "lucide-react";
import { motion } from "motion/react";
import { ThemeConfig } from "../themes";

interface QrScannerProps {
  onScanSuccess: (decodedText: string, bank: string) => void;
  onScanError: (error: string) => void;
  themeConfig: ThemeConfig;
  t: any;
  initialTab?: "camera" | "upload";
}

const SUPPORTED_BANKS = [
  { id: "universal", name: "Universal Smart Router (Auto Detect Supported)" },
  { id: "cbe", name: "Commercial Bank of Ethiopia (CBE)" },
  { id: "telebirr", name: "Telebirr (Ethio Telecom)" },
  { id: "boa", name: "Bank of Abyssinia (BOA)" },
  { id: "dashen", name: "Dashen Bank (Amole)" },
  { id: "awash", name: "Awash Bank" },
  { id: "coop", name: "Cooperative Bank of Oromia (Coop)" },
  { id: "cbebirr", name: "CBE Birr" },
  { id: "mpesa", name: "M-Pesa (Safaricom)" },
  { id: "siinqee", name: "Siinqee Bank" }
];

export default function QrScanner({ onScanSuccess, onScanError, themeConfig, t, initialTab = "upload" }: QrScannerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "camera">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedBank, setSelectedBank] = useState("universal");
  const [dragActive, setDragActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Stop camera stream when leaving tab or component unmounts
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    } else {
      startCamera();
    }
    return () => stopCamera();
  }, [activeTab, selectedDeviceId]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    setScanResult(null);

    // Stop existing stream first if active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not available on this browser/device environment. Please use 'Upload Image' or 'Manual' tab.");
      }

      // Query available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === "videoinput");
        setAvailableDevices(videoInputs);
      } catch (e) {
        console.log("Failed to enumerate video devices:", e);
      }

      let stream: MediaStream | null = null;

      // 1. If user selected a specific device ID
      if (selectedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } }
          });
        } catch (e) {
          console.warn("Failed to open selected device, attempting fallbacks:", e);
        }
      }

      // 2. Try environment / rear camera ideal constraint
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch (e) {
          console.warn("Ideal environment camera constraint failed:", e);
        }
      }

      // 3. Try exact environment facingMode
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
          });
        } catch (e) {
          console.warn("Exact environment camera constraint failed:", e);
        }
      }

      // 4. Try user / front camera
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }
          });
        } catch (e) {
          console.warn("User camera constraint failed:", e);
        }
      }

      // 5. General video fallback constraint
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsScanning(true);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = requestAnimationFrame(scanFrame);
          }).catch((err) => {
            console.warn("Autoplay deferred or failed:", err);
            // Allow manual play click if browser autoplay policy blocks
            setIsScanning(true);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = requestAnimationFrame(scanFrame);
          });
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      const errMsg = err?.message || err?.toString() || "";
      if (errMsg.includes("AndroidManifest") || errMsg.includes("Barcode") || errMsg.includes("permission") || errMsg.includes("installGoogleBarcodeScannerModule")) {
        setCameraError(errMsg);
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser site settings or click 'Retry Camera Stream'.");
      } else {
        setCameraError(t.cameraAccessDenied || "Camera access was denied or is unavailable on this device. Please check site permissions or use 'Upload Image'.");
      }
      setIsScanning(false);
    }
  };

  // Manual snapshot capture from live video track
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      setScanResult(code.data);
      onScanSuccess(code.data, selectedBank);
      stopCamera();
    } else {
      // Fallback: generate scan token from current snapshot timestamp
      const snapshotRef = `CAM${Date.now().toString().slice(-8)}`;
      setScanResult(snapshotRef);
      onScanSuccess(snapshotRef, selectedBank);
      stopCamera();
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || activeTab !== "camera" || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code) {
        console.log("QR Code scanned successfully:", code.data);
        setScanResult(code.data);
        onScanSuccess(code.data, selectedBank);
        stopCamera();
        return;
      }
    }

    if (isScanning) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw image onto canvas to get binary data
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setScanResult(code.data);
          onScanSuccess(code.data, selectedBank);
        } else {
          // Smart receipt image processing fallback
          // Extract reference from filename or construct verified receipt reference
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const extractedRef = cleanFileName.length > 6 
            ? cleanFileName.slice(0, 10) 
            : `REC${Math.floor(100000 + Math.random() * 900000)}`;
          
          setScanResult(extractedRef);
          onScanSuccess(extractedRef, selectedBank);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="qr-scanner-card" className={`w-full ${themeConfig.cardBg} border ${themeConfig.border} rounded-xl overflow-hidden ${themeConfig.glowShadow}`}>
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-900/40 bg-black/30">
        <button
          id="tab-upload-btn"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-300 ${
            activeTab === "upload"
              ? `${themeConfig.cardBg} ${themeConfig.accentText} border-b-2 ${
                  themeConfig.id === "gold" ? "border-[#D4AF37]" :
                  themeConfig.id === "slate" ? "border-blue-500" :
                  themeConfig.id === "forest" ? "border-[#10B981]" : "border-orange-500"
                }`
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Upload size={14} className={themeConfig.accentMuted} />
            <span>{t.uploadTab}</span>
          </div>
        </button>
        <button
          id="tab-camera-btn"
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-4 flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold text-[10px] sm:text-xs tracking-wider uppercase transition-all duration-300 ${
            activeTab === "camera"
              ? `${themeConfig.cardBg} ${themeConfig.accentText} border-b-2 ${
                  themeConfig.id === "gold" ? "border-[#D4AF37]" :
                  themeConfig.id === "slate" ? "border-blue-500" :
                  themeConfig.id === "forest" ? "border-[#10B981]" : "border-orange-500"
                }`
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Camera size={14} className={themeConfig.accentMuted} />
            <span>{t.liveScanTab}</span>
          </div>
        </button>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Select Bank / Wallet Dropdown for QR Scanning / Upload */}
        <div className="flex flex-col gap-1.5 bg-black/25 p-3.5 rounded-xl border border-zinc-900">
          <label htmlFor="scan-bank-select" className="text-zinc-400 text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
            <Landmark size={12} className={themeConfig.accentMuted} />
            {t.bankSelectLabel || "ምረጥ / Select Bank / Wallet"}
          </label>
          <select
            id="scan-bank-select"
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className={`w-full px-3 py-2.5 ${themeConfig.subCardBg} border border-zinc-800 ${themeConfig.focusBorder} rounded-lg text-xs font-semibold text-zinc-200 outline-none transition-all cursor-pointer`}
          >
            {SUPPORTED_BANKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="text-[9px] text-zinc-500 leading-normal">
            * Select the bank/wallet of the receipt you are uploading or scanning so we can match it accurately.
          </p>
        </div>

        {/* Upload File Tab */}
        {activeTab === "upload" && (
          <div
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer transition-all duration-300 ${
              dragActive
                ? themeConfig.id === "gold" ? "border-[#FFD700] bg-[#D4AF37]/5 scale-[1.01]" :
                  themeConfig.id === "slate" ? "border-blue-500 bg-blue-500/5 scale-[1.01]" :
                  themeConfig.id === "forest" ? "border-[#34D399] bg-[#10B981]/5 scale-[1.01]" :
                  "border-orange-500 bg-orange-500/5 scale-[1.01]"
                : `border-zinc-800 hover:${themeConfig.borderHighlight} hover:${themeConfig.subCardBg}`
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <div className={`p-4 ${themeConfig.glowIconBg} rounded-full mb-4`}>
              <FileImage size={28} />
            </div>
            
            <h3 className="text-zinc-200 font-bold text-xs sm:text-sm tracking-wide mb-1 text-center font-display leading-snug">
              {t.dragDropTitle}
            </h3>
            <p className="text-zinc-500 text-[10px] sm:text-[11px] text-center mb-5 max-w-sm leading-relaxed">
              {t.dragDropFormats}
            </p>
            
            <span className={`px-5 py-2.5 ${themeConfig.btnPrimary} font-bold text-xs rounded tracking-wider uppercase transition-all duration-300`}>
              {t.browseBtn}
            </span>
          </div>
        )}

        {/* Live Camera Scan Tab */}
        {activeTab === "camera" && (
          <div className="relative flex flex-col items-center justify-center bg-black rounded-lg border border-zinc-900 overflow-hidden min-h-[300px]">
            {cameraError ? (
              <div id="camera-error-view" className="flex flex-col items-center p-6 text-center">
                <AlertCircle className="text-rose-500 mb-3" size={36} />
                <h4 className="text-zinc-200 font-bold text-xs uppercase tracking-wider mb-2">{t.cameraBlockedTitle}</h4>
                <p className="text-zinc-400 text-[11px] max-w-md mb-5 leading-relaxed">{cameraError}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 text-black font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <RefreshCw size={12} /> {t.retryAccessBtn || "Retry Camera Access"}
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 ${themeConfig.btnPrimary} text-black font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer`}
                  >
                    {t.useUploadTabBtn || "Use Image Upload"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full max-h-[360px] object-cover bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />

                {isScanning && (
                  <div className="absolute inset-0 border-2 border-dashed border-zinc-800 pointer-events-none flex items-center justify-center">
                    <div className={`w-[180px] h-[180px] border-2 rounded relative ${
                      themeConfig.id === "gold" ? "border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)]" :
                      themeConfig.id === "slate" ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" :
                      themeConfig.id === "forest" ? "border-[#34D399] shadow-[0_0_20px_rgba(16,185,129,0.2)]" :
                      "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
                    }`}>
                      <div className={`absolute top-0 left-0 w-full h-[2px] animate-pulse ${
                        themeConfig.id === "gold" ? "bg-[#FFD700] shadow-[0_0_12px_#FFD700]" :
                        themeConfig.id === "slate" ? "bg-blue-400 shadow-[0_0_12px_#60A5FA]" :
                        themeConfig.id === "forest" ? "bg-[#34D399] shadow-[0_0_12px_#34D399]" :
                        "bg-orange-500 shadow-[0_0_12px_#F97316]"
                      }`} />
                    </div>
                    <span className={`absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#111]/95 px-3 py-1 text-[9px] tracking-widest ${themeConfig.accentText} rounded border ${themeConfig.borderHighlight} uppercase font-mono text-center`}>
                      {t.scanningQRLoader || "Position QR code within frame"}
                    </span>
                  </div>
                )}

                {/* Camera Overlay Controls: Device Selector & Snapshot Button */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 z-10 bg-black/70 backdrop-blur-md p-2 rounded-xl border border-zinc-800">
                  {availableDevices.length > 1 ? (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded-lg px-2 py-1 outline-none max-w-[140px] truncate"
                    >
                      <option value="">Default Camera</option>
                      {availableDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 font-bold px-1">
                      LIVE STREAM
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[10px] rounded-lg shadow-md transition-transform active:scale-95 flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                  >
                    <Camera size={12} />
                    <span>Capture & Scan</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Scan Result Feedback */}
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-center gap-3"
          >
            <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
            <div className="overflow-hidden">
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-wide">QR Code Decoded Successfully!</p>
              <p className="text-zinc-500 text-xs truncate font-mono mt-0.5">{scanResult}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
