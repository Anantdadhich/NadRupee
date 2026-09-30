import { NextRequest, NextResponse } from "next/server";
import {
  onmetaFetchKycStatus,
  getStandaloneKycWidgetUrl,
} from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    const kyc = await onmetaFetchKycStatus(email);
    const standaloneWidgetUrl = getStandaloneKycWidgetUrl(email);

    return NextResponse.json({
      ...kyc,
      standaloneWidgetUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch KYC status." },
      { status: 500 }
    );
  }
}
