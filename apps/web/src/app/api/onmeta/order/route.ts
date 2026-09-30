import { NextRequest, NextResponse } from "next/server";
import {
  onmetaCreateOfframpOrder,
  onmetaUpdateTransactionHash,
  onmetaFetchOrderStatus,
} from "@/lib/onmeta/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required orderId parameter." },
        { status: 400 }
      );
    }

    const order = await onmetaFetchOrderStatus(orderId);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch order status." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Action 1: Update transaction hash
    if (body.action === "update-tx-hash" || (body.orderId && body.txHash)) {
      const order = await onmetaUpdateTransactionHash(body.orderId, body.txHash);
      return NextResponse.json({ success: true, order });
    }

    // Action 2: Fetch order status
    if (body.action === "fetch-status" || (body.orderId && !body.quotationId)) {
      const order = await onmetaFetchOrderStatus(body.orderId);
      return NextResponse.json({ success: true, order });
    }

    // Action 3: Create offramp order
    const order = await onmetaCreateOfframpOrder({
      email: body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth"),
      quotationId: body.quotationId || "QTE-AUTO",
      cryptoToken: body.cryptoToken || "AUSD",
      chainId: body.chainId ? Number(body.chainId) : 10143,
      cryptoAmount: Number(body.cryptoAmount || 100),
      exchangeRate: Number(body.exchangeRate || 95.92),
      fiatAmount: Number(body.fiatAmount || 9592),
      netPayoutInr: Number(body.netPayoutInr || 9448.12),
      bankAccountId: body.bankAccountId,
      upiId: body.upiId,
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Order operation failed." },
      { status: 500 }
    );
  }
}
