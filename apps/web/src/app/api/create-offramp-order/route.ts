import { NextRequest, NextResponse } from "next/server";
import { onmetaCreateOfframpOrder } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
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
      { success: false, error: err?.message || "Failed to create offramp order." },
      { status: 500 }
    );
  }
}
