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
          <div className="w-10 h-10 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] flex items-center justify-center text-white shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide text-white uppercase">OCTUS Vision</h1>
            <p className="text-xs font-bold text-[#8B9FA8]">Deteksi Objek Cepat &amp; Presisi</p>
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
            <svg className="w-6 h-6 text-[#FF9600]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h2 className="text-lg font-black text-white uppercase tracking-wide">
              Mode Cepat (1-3 Kata Saja)
            </h2>
          </div>
          <p className="text-sm font-medium text-[#8B9FA8] leading-relaxed">
            Sistem langsung menyebutkan nama objek utama di depan secara singkat dan instan (contoh: <strong className="text-white">&quot;Toilet&quot;</strong>, <strong className="text-white">&quot;Tangga turun&quot;</strong>, <strong className="text-white">&quot;Pintu&quot;</strong>, <strong className="text-white">&quot;Kursi&quot;</strong>).
          </p>
        </div>

        {/* 2-Column Tester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel 1: Upload / Ambil Gambar */}
          <div className="bg-[#19272E] border-2 border-[#2B3D47] border-b-4 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-[#1CB0F6]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gambar Kamera
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
                  <div className="w-12 h-12 rounded-2xl bg-[#19272E] border-2 border-[#2B3D47] flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#8B9FA8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
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
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Pindai Cepat
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Panel 2: Hasil Deteksi */}
          <div className="bg-[#19272E] border-2 border-[#2B3D47] border-b-4 rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-[#58CC02]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Hasil Deteksi
            </h3>

            {error && (
              <div className="bg-[#FF4B4B]/15 border-2 border-[#FF4B4B] rounded-2xl p-4 text-xs font-bold text-[#FF4B4B] flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!result && !error && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#8B9FA8]">
                <div className="w-16 h-16 rounded-full bg-[#131F24] border-2 border-[#2B3D47] flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-[#8B9FA8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
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
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <svg className="w-4 h-4 text-[#58CC02]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-black text-[#58CC02] uppercase tracking-widest">
                      Objek Terdeteksi
                    </span>
                  </div>
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
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Putar Ulang Suara
                </button>

                <div className="text-[11px] font-bold text-[#8B9FA8] flex justify-between pt-2 border-t border-[#2B3D47]">
                  <span>Mesin: OCTUS Neural Vision</span>
                  <span>Endpoint: POST /api/detect</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#2B3D47] py-4 text-center text-xs font-bold text-[#8B9FA8]">
        OCTUS Smart Assistive Navigation System © 2026
      </footer>
    </div>
  );
}
