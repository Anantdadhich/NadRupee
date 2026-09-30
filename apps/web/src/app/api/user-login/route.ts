import { NextRequest, NextResponse } from "next/server";
import { onmetaUserLogin } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    const result = await onmetaUserLogin(email);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "User login failed." },
      { status: 500 }
    );
  }
}
