export const getStoredServerUrl = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("BEU_SERVER_URL") || "";
  }
  return "";
};

export const setStoredServerUrl = (url: string): void => {
  if (typeof window !== "undefined") {
    if (!url.trim()) {
      localStorage.removeItem("BEU_SERVER_URL");
    } else {
      let clean = url.trim();
      if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
        clean = `https://${clean}`;
      }
      if (clean.endsWith("/")) {
        clean = clean.slice(0, -1);
      }
      localStorage.setItem("BEU_SERVER_URL", clean);
    }
  }
};

export const getApiUrl = (endpoint: string): string => {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // 1. Check explicitly set environment variables
  const envBackend = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envBackend) {
    const base = envBackend.endsWith("/") ? envBackend.slice(0, -1) : envBackend;
    return `${base}${cleanEndpoint}`;
  }

  // 2. Check stored custom server URL in mobile settings
  if (typeof window !== "undefined") {
    const savedServer = localStorage.getItem("BEU_SERVER_URL");
    if (savedServer && savedServer.trim()) {
      const base = savedServer.trim().endsWith("/") ? savedServer.trim().slice(0, -1) : savedServer.trim();
      return `${base}${cleanEndpoint}`;
    }

    // 3. Mobile WebView / APK scheme detection (file://, capacitor://, ionic://, android-app:)
    const origin = window.location.origin || "";
    const isMobileScheme = origin.startsWith("file:") || origin.startsWith("capacitor:") || origin.startsWith("ionic:") || origin.startsWith("content:") || (window.location.hostname === "localhost" && window.location.port !== "3000");

    if (isMobileScheme) {
      // Connect to the official production hosted backend server URL
      const defaultBackend = "https://ais-pre-dydrdwywttbcz2jlgbntx2-283283379149.europe-west2.run.app";
      return `${defaultBackend}${cleanEndpoint}`;
    }
  }

  return cleanEndpoint;
};
