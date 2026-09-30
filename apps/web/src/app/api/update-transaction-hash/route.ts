import { NextRequest, NextResponse } from "next/server";
import { onmetaUpdateTransactionHash } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.orderId || !body.txHash) {
      return NextResponse.json(
        { success: false, error: "Missing required orderId or txHash." },
        { status: 400 }
      );
    }

    const order = await onmetaUpdateTransactionHash(body.orderId, body.txHash);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update transaction hash." },
      { status: 500 }
    );
  }
}
