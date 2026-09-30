import { NextRequest, NextResponse } from "next/server";
import { onmetaFetchBankAccounts } from "@/lib/onmeta/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "user@nadrupee.eth";

    const data = await onmetaFetchBankAccounts(email);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch bank accounts." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    const data = await onmetaFetchBankAccounts(email);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch bank accounts." },
      { status: 500 }
    );
  }
}
