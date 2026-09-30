import { NextRequest, NextResponse } from "next/server";
import { onmetaLinkBankAccount } from "@/lib/onmeta/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || (body.address ? `${body.address.toLowerCase()}@nadrupee.eth` : "user@nadrupee.eth");

    if (!body.accountNumber || !body.ifsc || !body.accountHolderName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required bank account fields: accountNumber, ifsc, accountHolderName.",
        },
        { status: 400 }
      );
    }

    const data = await onmetaLinkBankAccount({
      email,
      bankName: body.bankName || "Partner Bank",
      accountNumber: body.accountNumber,
      ifsc: body.ifsc,
      accountHolderName: body.accountHolderName,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to link bank account." },
      { status: 500 }
    );
  }
}
