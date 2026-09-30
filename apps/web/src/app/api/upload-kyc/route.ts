import { NextRequest, NextResponse } from "next/server";
import { onmetaUploadKyc } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    if (!body.fullName || !body.panNumber) {
      return NextResponse.json(
        { success: false, error: "Missing required KYC fields: fullName and panNumber." },
        { status: 400 }
      );
    }

    const updated = await onmetaUploadKyc({
      email,
      fullName: body.fullName,
      panNumber: body.panNumber,
      aadhaarNumber: body.aadhaarNumber,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to upload KYC." },
      { status: 500 }
    );
  }
}
