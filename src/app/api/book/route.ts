import { NextRequest, NextResponse } from "next/server";

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
];

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
    const body = await req.json().catch(() => ({}));
    const rawBarcode = (body.barcode || body.isbn || "").toString().trim();
    const cleanBarcode = rawBarcode.replace(/[^0-9X]/gi, "");

    if (!cleanBarcode) {
      return NextResponse.json(
        {
          success: false,
          error: "Barcode atau ISBN tidak valid",
          speech_text: "Barcode tidak terdeteksi. Silakan coba lagi.",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    let title = "";
    let author = "";
    let publisher = "";
    let description = "";
    let found = false;
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Coba cari di OpenLibrary API terlebih dahulu (sangat cepat & tanpa kuota ketat)
    try {
      const olRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanBarcode}&format=json&jscmd=data`,
        { headers: { "User-Agent": "OCTUS-Assistive/1.0" }, next: { revalidate: 86400 } }
      );
      if (olRes.ok) {
        const olData = await olRes.json();
        const bookData = olData[`ISBN:${cleanBarcode}`];
        if (bookData && bookData.title) {
          title = bookData.title;
          if (Array.isArray(bookData.authors) && bookData.authors.length > 0) {
            author = bookData.authors.map((a: any) => a.name).join(", ");
          }
          if (Array.isArray(bookData.publishers) && bookData.publishers.length > 0) {
            publisher = bookData.publishers.map((p: any) => p.name).join(", ");
          }
          description =
            typeof bookData.notes === "string"
              ? bookData.notes
              : bookData.excerpts?.[0]?.text || "";
          found = true;
        }
      }
    } catch (e) {
      console.warn("Gagal fetch OpenLibrary:", e);
    }

    // 2. Jika belum ditemukan, coba Google Books API (dengan API Key jika tersedia)
    if (!found) {
      try {
        const keyParam = apiKey ? `&key=${apiKey}` : "";
        const gBooksRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanBarcode}${keyParam}`,
          { next: { revalidate: 86400 } }
        );
        if (gBooksRes.ok) {
          const gData = await gBooksRes.json();
          if (gData.totalItems > 0 && gData.items?.[0]?.volumeInfo) {
            const info = gData.items[0].volumeInfo;
            title = info.title || "";
            author = Array.isArray(info.authors) ? info.authors.join(", ") : info.authors || "";
            publisher = info.publisher || "";
            description = info.description || "";
            found = true;
          }
        }
      } catch (e) {
        console.warn("Gagal fetch Google Books:", e);
      }
    }

    // 3. Ringkas sinopsis dalam Bahasa Indonesia via AI Engine internal
    let synopsis = "";

    if (apiKey) {
      const prompt = found
        ? `Anda adalah sistem asisten tunanetra OCTUS.
Buat sinopsis atau ringkasan sangat singkat (maksimal 2-3 kalimat, santun, padat dan menarik dalam Bahasa Indonesia) untuk buku berikut agar nyaman didengar saat dibacakan melalui Text-to-Speech:
Judul: ${title}
Penulis: ${author}
Deskripsi Sumber: ${description || "Tidak ada deskripsi rinci. Berikan gambaran umum buku ini jika Anda mengetahuinya."}

ATURAN WAJIB:
- Jawab HANYA 2 sampai 3 kalimat sinopsis saja!
- Langsung menceritakan inti cerita / gagasan utama buku.
- DILARANG menggunakan tanda bintang (* atau **), markdown, atau pembuka/penutup basa-basi.`
        : `Anda adalah sistem asisten tunanetra OCTUS.
Pengguna mendeteksi barcode nomor: ${cleanBarcode}.
Apakah nomor ini adalah ISBN buku yang Anda ketahui?
Jika ya, berikan respon dengan format persis:
JUDUL: [Judul Buku]
PENULIS: [Nama Penulis]
SINOPSIS: [Ringkasan 2 kalimat tentang isi buku dalam Bahasa Indonesia]

Jika ini bukan buku yang Anda kenali, jawab:
TIDAK DIKETAHUI`;

      for (const model of CANDIDATE_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const aiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 150,
              },
            }),
          });

          if (!aiRes.ok) continue;

          const data = await aiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

          if (rawText.trim().length > 0) {
            if (!found) {
              if (rawText.includes("JUDUL:")) {
                const matchTitle = rawText.match(/JUDUL:\s*(.+)/i);
                const matchAuthor = rawText.match(/PENULIS:\s*(.+)/i);
                const matchSynopsis = rawText.match(/SINOPSIS:\s*([\s\S]+)/i);

                if (matchTitle && matchTitle[1]) {
                  title = matchTitle[1].trim();
                  author = matchAuthor ? matchAuthor[1].trim() : "Penulis tidak diketahui";
                  synopsis = matchSynopsis
                    ? matchSynopsis[1].replace(/[*_#]/g, "").trim()
                    : "Buku terdaftar dalam katalog.";
                  found = true;
                }
              }
            } else {
              synopsis = rawText.replace(/[*_#]/g, "").trim();
            }
            if (synopsis) break;
          }
        } catch (e) {
          console.warn("AI generation error:", e);
        }
      }
    }

    // Fallback jika tidak ada sinopsis dari AI
    if (found && !synopsis) {
      synopsis = description
        ? description.slice(0, 200).replace(/<[^>]*>?/gm, "").trim() + "..."
        : "Sinopsis rinci belum tersedia untuk buku ini.";
    }

    if (!found) {
      return NextResponse.json(
        {
          success: true,
          found: false,
          barcode: cleanBarcode,
          title: `Barcode ${cleanBarcode}`,
          author: "-",
          publisher: "-",
          synopsis: "Informasi buku untuk barcode ini belum ditemukan di database.",
          speech_text: `Barcode terdeteksi dengan kode ${cleanBarcode}. Informasi buku belum ditemukan.`,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const speechText = author
      ? `Buku terdeteksi: ${title}, karya ${author}. Sinopsis singkat: ${synopsis}`
      : `Buku terdeteksi: ${title}. Sinopsis singkat: ${synopsis}`;

    return NextResponse.json(
      {
        success: true,
        found: true,
        barcode: cleanBarcode,
        title,
        author: author || "Penulis tidak diketahui",
        publisher: publisher || "-",
        synopsis,
        speech_text: speechText,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error in /api/book:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        speech_text: "Terjadi kesalahan saat mencari data buku.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
