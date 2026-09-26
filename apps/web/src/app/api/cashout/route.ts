import { NextRequest, NextResponse } from "next/server";
import { keccak256, toHex, encodePacked } from "viem";
import { getRelayerWalletClient, checkRelayerHealth } from "@/lib/relayer/service";
import { monadTestnet, publicClient } from "@/lib/monad/chain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { freelancerAddress, amountUsd, lockedRate, upiId, sourceTxHash } = body;

    if (!freelancerAddress || typeof freelancerAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid freelancer identifier." },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amountUsd);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount. Must be greater than 0." },
        { status: 400 }
      );
    }

    const parsedRate = Number(lockedRate);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid locked exchange rate." },
        { status: 400 }
      );
    }

    if (!upiId || typeof upiId !== "string" || !upiId.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid UPI ID. Format should be user@bank or name@okhdfcbank." },
        { status: 400 }
      );
    }

    const amountInr = Number((parsedAmount * parsedRate).toFixed(2));
    const now = new Date();
    const timestamp = now.toUTCString();
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const receiptId = `REC-${Date.now().toString().slice(-6)}-${randomHex}`;
    const referenceCode = `IMPS-${Date.now().toString().slice(-8)}-${randomHex.slice(0, 4)}`;

    let onchainTxHash: `0x${string}` | null = null;

    // 1. If an authentic on-chain transaction hash was provided (e.g. from an escrow release or transfer)
    if (
      sourceTxHash &&
      typeof sourceTxHash === "string" &&
      sourceTxHash.startsWith("0x") &&
      sourceTxHash.length === 66
    ) {
      onchainTxHash = sourceTxHash as `0x${string}`;
    }

    // 2. Otherwise, if relayer is configured and funded on Monad Testnet, broadcast the settlement transaction
    if (!onchainTxHash) {
      const relayerHealth = await checkRelayerHealth();
      if (relayerHealth.isConfigured && parseFloat(relayerHealth.balanceMon) > 0) {
        try {
          const walletClient = getRelayerWalletClient();
          const memo = encodePacked(
            ["string", "string", "uint256"],
            ["SANDBOX_CASHOUT:", receiptId, BigInt(Math.floor(parsedAmount))]
          );
          onchainTxHash = await walletClient.sendTransaction({
            chain: monadTestnet,
            to: freelancerAddress as `0x${string}`,
            value: BigInt(0),
            data: memo,
          });
          await publicClient.waitForTransactionReceipt({ hash: onchainTxHash });
        } catch (broadcastErr: any) {
          console.error("[Cashout] Monad broadcast error:", broadcastErr);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to broadcast on Monad Testnet: ${broadcastErr?.message || broadcastErr}`,
            },
            { status: 502 }
          );
        }
      }
    }

    // 3. If still no valid on-chain tx hash is available, fail cleanly with a production error
    if (!onchainTxHash) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No verified on-chain transaction found for this cashout. Please release funds from an on-chain contract first or configure a funded relayer wallet.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      receiptId,
      onchainTxHash,
      amountUsd: parsedAmount,
      lockedRate: parsedRate,
      amountInr,
      upiId,
      timestamp,
      status: "Completed (Sandbox)",
      referenceCode,
      note: "Sandbox payout confirmation screen — testnet evaluation only. In production, settled via Onmeta licensed INR rails.",
    });
  } catch (error: any) {
    console.error("[Cashout API] Internal error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during cashout." },
      { status: 500 }
    );
  }
}
