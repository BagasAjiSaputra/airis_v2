"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!imageSrc) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.speech_text || "Gagal mendeteksi gambar");
      }

      setResult(data);

      if ("speechSynthesis" in window && data.speech_text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.speech_text);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131F24] text-white flex flex-col font-sans selection:bg-[#58CC02]/30">
      {/* Duolingo-Style Header */}
      <header className="border-b-2 border-[#2B3D47] bg-[#19272E] sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] flex items-center justify-center font-black text-xl text-white shadow-sm">
            AI
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-white uppercase">AIRIS AI Vision</h1>
            <p className="text-xs font-bold text-[#8B9FA8]">Deteksi Objek Kilat (Gemini Flash Lite)</p>
          </div>
        </div>

        {/* Status Pill ala Duolingo */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-[#58CC02] bg-[#58CC02]/15">
          <span className="w-2.5 h-2.5 rounded-full bg-[#58CC02] animate-pulse"></span>
          <span className="text-xs font-black text-[#58CC02] uppercase tracking-wider">Online</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Banner ala Duolingo */}
        <div className="bg-[#19272E] border-2 border-[#2B3D47] border-b-4 rounded-3xl p-6 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-black text-white uppercase tracking-wide">
              Mode Cepat (1-3 Kata Saja)
            </h2>
          </div>
          <p className="text-sm font-medium text-[#8B9FA8] leading-relaxed">
            AI dilatih untuk langsung menyebutkan nama objek utama di depan secara singkat dan instan (contoh: <strong className="text-white">&quot;Toilet&quot;</strong>, <strong className="text-white">&quot;Tangga turun&quot;</strong>, <strong className="text-white">&quot;Pintu&quot;</strong>, <strong className="text-white">&quot;Kursi&quot;</strong>).
          </p>
        </div>

        {/* 2-Column Tester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel 1: Upload / Ambil Gambar */}
          <div className="bg-[#19272E] border-2 border-[#2B3D47] border-b-4 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>📸</span> Gambar Kamera
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2B3D47] hover:border-[#1CB0F6] transition-all rounded-2xl min-h-[220px] flex flex-col items-center justify-center p-4 cursor-pointer bg-[#131F24] hover:bg-[#152329]"
            >
              {imageSrc ? (
                <div className="relative w-full h-[200px] flex items-center justify-center">
                  <img
                    src={imageSrc}
                    alt="Preview"
                    className="max-h-full max-w-full rounded-xl object-contain shadow-md"
                  />
                </div>
              ) : (
                <div className="text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#19272E] border-2 border-[#2B3D47] flex items-center justify-center text-xl">
                    📁
                  </div>
                  <p className="text-sm font-bold text-white">
                    Pilih / Foto Gambar
                  </p>
                  <p className="text-xs font-semibold text-[#8B9FA8]">
                    JPG, PNG, atau WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#19272E] border-2 border-[#2B3D47] border-b-4 hover:border-b-2 active:border-b-0 active:translate-y-1 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
              >
                Ganti Foto
              </button>
              <button
                onClick={handleScan}
                disabled={!imageSrc || loading}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#1CB0F6] border-b-4 border-[#1899D6] hover:brightness-105 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-[#1CB0F6]/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Menganalisis...
                  </>
                ) : (
                  <>🔍 Pindai Cepat</>
                )}
              </button>
            </div>
          </div>

          {/* Panel 2: Hasil Deteksi */}
          <div className="bg-[#19272E] border-2 border-[#2B3D47] border-b-4 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🎯</span> Hasil Deteksi
            </h3>

            {error && (
              <div className="bg-[#FF4B4B]/15 border-2 border-[#FF4B4B] rounded-2xl p-4 text-xs font-bold text-[#FF4B4B]">
                ⚠️ {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#8B9FA8]">
                <span className="text-4xl mb-3">👁️</span>
                <p className="text-sm font-bold">
                  Pilih gambar lalu klik &quot;Pindai Cepat&quot; untuk melihat deteksi instan 1-3 kata.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 border-4 border-[#1CB0F6]/20 border-t-[#1CB0F6] rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-black text-[#1CB0F6] uppercase tracking-wider">
                  Mendeteksi Objek...
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                {/* Result Card ala Duolingo */}
                <div className="bg-[#131F24] border-2 border-[#58CC02] border-b-4 rounded-2xl p-6 text-center">
                  <span className="text-xs font-black text-[#58CC02] uppercase tracking-widest block mb-2">
                    ✅ Objek Terdeteksi
                  </span>
                  <p className="text-3xl font-black text-white tracking-wide uppercase">
                    &quot;{result.main_object}&quot;
                  </p>
                </div>

                <button
                  onClick={() => {
                    if ("speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(result.speech_text);
                      u.lang = "id-ID";
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] hover:brightness-105 active:border-b-0 active:translate-y-1 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  🔊 Putar Ulang Suara
                </button>

                <div className="text-[11px] font-bold text-[#8B9FA8] flex justify-between pt-2 border-t border-[#2B3D47]">
                  <span>Model: {result.model_used}</span>
                  <span>Endpoint: POST /api/detect</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#2B3D47] py-4 text-center text-xs font-bold text-[#8B9FA8]">
        AIRIS Smart Assistive Navigation System © 2026
      </footer>
    </div>
  );
}
