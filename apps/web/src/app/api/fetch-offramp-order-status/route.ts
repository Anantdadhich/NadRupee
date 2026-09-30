import { NextRequest, NextResponse } from "next/server";
import { onmetaFetchOrderStatus } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required orderId." },
        { status: 400 }
      );
    }

    const order = await onmetaFetchOrderStatus(orderId);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch offramp order status." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required orderId." },
        { status: 400 }
      );
    }

    const order = await onmetaFetchOrderStatus(orderId);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch offramp order status." },
      { status: 500 }
    );
  }
}
