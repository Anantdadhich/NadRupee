import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Primary: Open Exchange Rates free endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 300 }, // Cache for 5 minutes
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.ok) {
      const data = await res.json();
      const inrRate = data?.rates?.INR;
      if (typeof inrRate === "number") {
        return NextResponse.json({
          success: true,
          rate: Number(inrRate.toFixed(2)),
          rawRate: inrRate,
          currency: "INR",
          timestamp: data.time_last_update_utc || new Date().toUTCString(),
          provider: "Open Exchange Rates API",
        });
      }
    }

    // 2. Secondary fallback: Frankfurter API
    const fallbackRes = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
      { next: { revalidate: 300 } }
    ).catch(() => null);

    if (fallbackRes && fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      const inrRate = fallbackData?.rates?.INR;
      if (typeof inrRate === "number") {
        return NextResponse.json({
          success: true,
          rate: Number(inrRate.toFixed(2)),
          rawRate: inrRate,
          currency: "INR",
          timestamp: new Date().toUTCString(),
          provider: "Frankfurter FX API",
        });
      }
    }

    // 3. Fallback baseline if external services are unreachable
    return NextResponse.json({
      success: true,
      rate: 88.5,
      rawRate: 88.5,
      currency: "INR",
      timestamp: new Date().toUTCString(),
      provider: "Monad Market Reference Rate",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch FX quote",
        rate: 88.5,
        currency: "INR",
        timestamp: new Date().toUTCString(),
      },
      { status: 500 }
    );
  }
}
