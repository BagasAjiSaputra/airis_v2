import { NextRequest, NextResponse } from "next/server";

// Model Lite dengan latensi terendah untuk respon secepat kilat (< 1.5 detik)
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
];

const SYSTEM_PROMPT = `Identifikasi objek, simbol, atau rintangan utama yang ada di depan kamera untuk navigasi tunanetra AIRIS.
ATURAN WAJIB:
- JAWAB HANYA 1 SAMPAI 3 KATA SAJA! Langsung nama objeknya.
- DILARANG membuat kalimat panjang atau penjelasan.
- Contoh jawaban yang benar:
  - Toilet
  - Pria
  - Wanita
  - Tangga turun
  - Tangga naik
  - Pintu keluar
  - Pintu masuk
  - Kursi
  - Meja
  - Orang
  - Tiang
  - Jalan berlubang
  - Lampu merah`;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Kunci layanan belum dikonfigurasi di Server",
          speech_text: "Layanan server belum siap.",
        },
        { status: 500, headers: corsHeaders }
      );
    }

    let base64Image = "";
    let mimeType = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = (formData.get("image") || formData.get("file")) as File | null;
      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: "File gambar tidak ditemukan",
            speech_text: "Gambar kosong.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = buffer.toString("base64");
    } else {
      const body = await req.json();
      if (!body.image) {
        return NextResponse.json(
          {
            success: false,
            error: "Field 'image' wajib disertakan",
            speech_text: "Gambar kosong.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      base64Image = body.image;
      if (body.mimeType) {
        mimeType = body.mimeType;
      }

      if (base64Image.includes(",")) {
        const parts = base64Image.split(",");
        const match = parts[0].match(/:(.*?);/);
        if (match && match[1]) {
          mimeType = match[1];
        }
        base64Image = parts[1];
      }
    }

    let detectedName = "";
    let successfulModel = "";
    let lastError: any = null;

    // Coba model prioritas flash-lite untuk respon super cepat
    for (const model of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: SYSTEM_PROMPT },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 25, // Token sedikit = respon instan (< 1 detik)
            },
          }),
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          lastError = errData;
          console.warn(`Model ${model} gagal:`, errData);
          continue;
        }

        const data = await geminiRes.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (rawText && rawText.trim().length > 0) {
          // Bersihkan teks agar langsung jadi kata singkat yang siap diucapkan TTS
          detectedName = rawText
            .replace(/["`*#]/g, "")
            .replace(/^objek\s*:\s*/i, "")
            .replace(/^terdeteksi\s*:\s*/i, "")
            .trim()
            .replace(/\.$/, "");

          successfulModel = model;
          break; // Sukses secepat mungkin!
        }
      } catch (err: any) {
        lastError = err?.message || err;
        console.warn(`Error ${model}:`, err);
      }
    }

    if (!detectedName) {
      return NextResponse.json(
        {
          success: false,
          error: "Gagal mendeteksi objek",
          details: lastError,
          speech_text: "Tidak terdeteksi, coba lagi.",
        },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        speech_text: detectedName,
        main_object: detectedName,
        details: detectedName,
        has_hazard: false,
        hazard_warning: null,
        model_used: "AIRIS-Engine",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        speech_text: "Terjadi kesalahan server.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
