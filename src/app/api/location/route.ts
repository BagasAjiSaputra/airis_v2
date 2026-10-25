import { NextRequest, NextResponse } from "next/server";

// Simpan koordinat lokasi terbaru di memory
let latestCoordinate = "Belum ada koordinat yang diterima";
let lastUpdated: string | null = null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      coordinate_airis: latestCoordinate,
      last_updated: lastUpdated,
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Format request harus berupa JSON yang valid",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.coordinate_airis) {
      return NextResponse.json(
        {
          success: false,
          message: "Field 'coordinate_airis' tidak ditemukan dalam JSON",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    latestCoordinate = String(body.coordinate_airis);
    lastUpdated = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message: "Koordinat berhasil diupdate",
        coordinate_airis: latestCoordinate,
        last_updated: lastUpdated,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
