import { NextRequest, NextResponse } from "next/server";
import { onmetaFetchSellQuotation } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.cryptoAmount || body.amount || 100);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid crypto amount. Must be greater than 0." },
        { status: 400 }
      );
    }

    const quote = await onmetaFetchSellQuotation({
      cryptoToken: body.cryptoToken || "AUSD",
      chainId: body.chainId ? Number(body.chainId) : 10143,
      cryptoAmount: amount,
      liveRate: body.liveRate ? Number(body.liveRate) : undefined,
    });

    return NextResponse.json(quote);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch sell quotation." },
      { status: 500 }
    );
  }
}
