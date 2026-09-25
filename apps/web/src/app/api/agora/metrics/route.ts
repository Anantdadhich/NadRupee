import { NextResponse } from "next/server";
import { getMonadAusdMetrics } from "@/lib/agora/metrics";

export async function GET() {
  try {
    const metrics = await getMonadAusdMetrics();
    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Agora API] Error fetching metrics:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch Agora metrics",
      },
      { status: 500 }
    );
  }
}
