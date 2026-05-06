import { NextResponse } from "next/server";
import { getTodayPayload } from "@/lib/today";

export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    const payload = await getTodayPayload();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load today's parasha", detail: message },
      { status: 500 },
    );
  }
}
