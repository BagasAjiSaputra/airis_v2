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

      // Mainkan suara Text-to-Speech di browser jika didukung
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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
            AI
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">AIRIS AI Vision Server</h1>
            <p className="text-xs text-neutral-400">Gemini-Powered Object & Obstacle Detection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-neutral-300 font-medium">Server Ready</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-neutral-900 border border-blue-900/40 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-blue-200 mb-1">
            Endpoint API Pendeteksi Objek Depan (Mobile App)
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Endpoint <code className="bg-neutral-800 px-2 py-0.5 rounded text-blue-300">/api/detect</code> siap menerima request gambar dari aplikasi mobile AIRIS (gesture swipe 4 jari &amp; tahan 3 detik). Endpoint ini memindai gambar menggunakan Gemini Flash AI untuk mendeskripsikan rintangan dan fasilitas di depan pengguna dalam format Text-to-Speech (TTS).
          </p>
        </div>

        {/* Live Playground / Tester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload / Camera Panel */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-neutral-200 flex items-center gap-2">
              <span>📸</span> Pengujian Gambar
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
              className="border-2 border-dashed border-neutral-700 hover:border-blue-500/80 transition-all rounded-xl min-h-[260px] flex flex-col items-center justify-center p-4 cursor-pointer bg-neutral-950/50 hover:bg-neutral-950"
            >
              {imageSrc ? (
                <div className="relative w-full h-[240px] flex items-center justify-center">
                  <img
                    src={imageSrc}
                    alt="Preview"
                    className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-2xl text-neutral-400">
                    ⬆️
                  </div>
                  <p className="text-sm font-medium text-neutral-300">
                    Klik untuk memilih atau mengambil gambar
                  </p>
                  <p className="text-xs text-neutral-500">
                    Format didukung: JPG, PNG, WEBP
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-medium transition text-neutral-200"
              >
                Ganti Gambar
              </button>
              <button
                onClick={handleScan}
                disabled={!imageSrc || loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Menganalisis...
                  </>
                ) : (
                  <>🔍 Pindai Objek</>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-neutral-200 flex items-center gap-2">
              <span>🧠</span> Hasil Analisis Gemini AI
            </h3>

            {error && (
              <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-4 text-sm text-red-300">
                ⚠️ {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                <span className="text-3xl mb-2">👁️</span>
                <p className="text-sm">
                  Pilih gambar dan klik tombol &quot;Pindai Objek&quot; untuk melihat deteksi rintangan dan teks TTS.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-blue-300">
                  Gemini sedang menganalisis objek dan jalur di depan...
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                {/* Speech Box */}
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">
                      🔊 Suara Text-To-Speech (TTS)
                    </span>
                    <button
                      onClick={() => {
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                          const u = new SpeechSynthesisUtterance(result.speech_text);
                          u.lang = "id-ID";
                          window.speechSynthesis.speak(u);
                        }
                      }}
                      className="text-xs text-blue-300 hover:text-white underline cursor-pointer"
                    >
                      Putar Ulang
                    </button>
                  </div>
                  <p className="text-base font-medium text-white leading-relaxed">
                    &quot;{result.speech_text}&quot;
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
                    <span className="text-xs text-neutral-400 block mb-1">Objek Utama</span>
                    <span className="text-sm font-bold text-neutral-100">
                      {result.main_object}
                    </span>
                  </div>
                  <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
                    <span className="text-xs text-neutral-400 block mb-1">Status Bahaya</span>
                    <span
                      className={`text-sm font-bold ${
                        result.has_hazard ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {result.has_hazard ? "⚠️ Ada Rintangan/Bahaya" : "✅ Aman"}
                    </span>
                  </div>
                </div>

                {result.hazard_warning && (
                  <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 text-xs text-red-200">
                    <strong>Peringatan:</strong> {result.hazard_warning}
                  </div>
                )}

                {result.details && (
                  <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                    <span className="text-neutral-400 font-semibold block mb-1">Deskripsi Tambahan:</span>
                    {result.details}
                  </div>
                )}

                <div className="text-[11px] text-neutral-500 flex justify-between pt-2 border-t border-neutral-800">
                  <span>Model: {result.model_used}</span>
                  <span>Endpoint: POST /api/detect</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Specification for Mobile App */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-neutral-200 mb-3">
            📋 Spesifikasi Request Mobile App (Android)
          </h3>
          <div className="bg-black/60 rounded-xl p-4 font-mono text-xs text-neutral-300 overflow-x-auto">
            <p className="text-blue-400 font-bold mb-2">POST /api/detect</p>
            <p className="text-neutral-400 mb-1">// Header:</p>
            <p className="text-emerald-400 mb-3">Content-Type: application/json (atau multipart/form-data)</p>
            <p className="text-neutral-400 mb-1">// Body (JSON):</p>
            <p>{JSON.stringify({ image: "<base64_string_jpeg>", mimeType: "image/jpeg" }, null, 2)}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 px-6 py-4 text-center text-xs text-neutral-500">
        AIRIS Smart Assistive Navigation System © 2026
      </footer>
    </div>
  );
}
