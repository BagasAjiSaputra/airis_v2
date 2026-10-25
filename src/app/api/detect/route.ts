import { NextRequest, NextResponse } from "next/server";

// Daftar model prioritas untuk menjamin ketersediaan tinggi
const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
];

const SYSTEM_PROMPT = `Anda adalah asisten AI sistem navigasi AIRIS untuk membantu pengguna tunanetra / gangguan penglihatan.
Tugas Anda adalah menganalisis gambar pemandangan di depan pengguna secara akurat, cepat, dan ringkas.

Pedoman Penjelasan:
1. Identifikasi objek utama, rintangan, atau fasilitas yang ada tepat di depan atau sekitar pengguna (misalnya: tangga, pintu, kursi, meja, orang, kendaraan, trotoar, lubang, tiang).
2. Sebutkan posisi atau arah objek (misal: tepat di depan, di sebelah kiri, di sebelah kanan).
3. Berikan peringatan bahaya (hazard) jika ada hal yang membahayakan (misal: lantai licin, anak tangga turun curam, kabel melintang, jalan berlubang, rintangan setinggi kepala).
4. Buat 'speech_text' yang to-the-point, santun, dan alami dalam Bahasa Indonesia, dengan panjang maksimal 1-2 kalimat agar nyaman didengarkan via Text-to-Speech (TTS).

Format response WAJIB berupa JSON murni dengan format:
{
  "speech_text": "1-2 kalimat ringkas untuk dibacakan lewat TTS",
  "main_object": "Nama objek/rintangan utama (misal: Tangga Turun, Pintu Kaca, Orang Berjalan)",
  "details": "Deskripsi singkat kondisi sekitar",
  "has_hazard": true atau false,
  "hazard_warning": "Peringatan bahaya jika ada, atau null jika aman"
}`;

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
          error: "GEMINI_API_KEY belum dikonfigurasi di file .env server",
          speech_text: "API Key Gemini belum disetting di server.",
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
            error: "File gambar tidak ditemukan dalam field 'image' atau 'file'",
            speech_text: "Gambar tidak ditemukan dalam pengiriman.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = buffer.toString("base64");
    } else {
      // JSON payload
      const body = await req.json();
      if (!body.image) {
        return NextResponse.json(
          {
            success: false,
            error: "Field 'image' (base64) wajib disertakan dalam request body",
            speech_text: "Data gambar kosong.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      base64Image = body.image;
      if (body.mimeType) {
        mimeType = body.mimeType;
      }

      // Bersihkan prefix data:image/...;base64, jika ada
      if (base64Image.includes(",")) {
        const parts = base64Image.split(",");
        const match = parts[0].match(/:(.*?);/);
        if (match && match[1]) {
          mimeType = match[1];
        }
        base64Image = parts[1];
      }
    }

    // Panggil Gemini API dengan fallback model jika model sedang sibuk (503 spike)
    let lastError: any = null;
    let geminiResponseJson: any = null;
    let successfulModel = "";

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
              responseMimeType: "application/json",
              temperature: 0.2,
              maxOutputTokens: 500,
            },
          }),
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          lastError = errData;
          console.warn(`Model ${model} gagal:`, errData);
          continue; // coba model berikutnya
        }

        const data = await geminiRes.json();
        const candidate = data.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (rawText) {
          // Bersihkan markdown code block jika ada
          const cleanedText = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          geminiResponseJson = JSON.parse(cleanedText);
          successfulModel = model;
          break; // Sukses!
        }
      } catch (err: any) {
        lastError = err?.message || err;
        console.warn(`Error saat memanggil ${model}:`, err);
      }
    }

    if (!geminiResponseJson) {
      console.error("Semua model Gemini gagal:", lastError);
      return NextResponse.json(
        {
          success: false,
          error: "Gagal memproses gambar dengan AI Gemini",
          details: lastError,
          speech_text: "Maaf, sistem AI sedang sibuk. Silakan coba tahan kembali.",
        },
        { status: 502, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        speech_text:
          geminiResponseJson.speech_text ||
          `Terdeteksi ${geminiResponseJson.main_object || "objek di depan"}.`,
        main_object: geminiResponseJson.main_object || "Objek Tidak Dikenal",
        details: geminiResponseJson.details || "",
        has_hazard: !!geminiResponseJson.has_hazard,
        hazard_warning: geminiResponseJson.hazard_warning || null,
        model_used: successfulModel,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Unhandled error di /api/detect:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        speech_text: "Terjadi kesalahan pada server saat mendeteksi objek.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
