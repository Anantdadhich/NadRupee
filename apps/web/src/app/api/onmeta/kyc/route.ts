import { NextRequest, NextResponse } from "next/server";
import {
  onmetaFetchKycStatus,
  onmetaUploadKyc,
  getStandaloneKycWidgetUrl,
} from "@/lib/onmeta/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email") || "user@nadrupee.eth";

    const kyc = await onmetaFetchKycStatus(email);
    const widgetUrl = getStandaloneKycWidgetUrl(email);

    return NextResponse.json({
      ...kyc,
      standaloneWidgetUrl: widgetUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch KYC status." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    // If uploading new KYC details
    if (body.action === "upload" || body.panNumber) {
      if (!body.panNumber || !body.fullName) {
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
    }

    // Default: fetch status
    const kyc = await onmetaFetchKycStatus(email);
    const widgetUrl = getStandaloneKycWidgetUrl(email);

    return NextResponse.json({
      ...kyc,
      standaloneWidgetUrl: widgetUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "KYC operation failed." },
      { status: 500 }
    );
  }
}
