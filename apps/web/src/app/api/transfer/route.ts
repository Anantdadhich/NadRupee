import { NextRequest, NextResponse } from "next/server";
import { parseUnits, parseSignature, type Address } from "viem";
import {
  checkRelayerHealth,
  getRelayerWalletClient,
} from "@/lib/relayer/service";
import {
  AUSD_CONTRACT_ADDRESS,
  AUSD_DECIMALS,
} from "@/lib/contracts/config";
import { ausdAbi } from "@/lib/contracts/ausdAbi";
import { publicClient } from "@/lib/monad/chain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { owner, recipient, amountUsd, deadline, signature } = body;

    // 1. Parameter Validation
    if (!owner || typeof owner !== "string" || !owner.startsWith("0x") || owner.length !== 42) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'owner' address." },
        { status: 400 }
      );
    }

    if (!recipient || typeof recipient !== "string" || !recipient.startsWith("0x") || recipient.length !== 42) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'recipient' address." },
        { status: 400 }
      );
    }

    if (owner.toLowerCase() === recipient.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Sender and recipient cannot be the same address." },
        { status: 400 }
      );
    }

    if (amountUsd === undefined || isNaN(Number(amountUsd)) || Number(amountUsd) <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid 'amountUsd'. Must be greater than 0." },
        { status: 400 }
      );
    }

    if (!deadline || isNaN(Number(deadline))) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing 'deadline'." },
        { status: 400 }
      );
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Number(deadline) < currentTimestamp) {
      return NextResponse.json(
        { success: false, error: "Permit signature has expired." },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== "string" || !signature.startsWith("0x")) {
      return NextResponse.json(
        { success: false, error: "Invalid signature format." },
        { status: 400 }
      );
    }

    // 2. Relayer Health & Availability Check
    const relayerHealth = await checkRelayerHealth();
    if (!relayerHealth.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Gasless relayer is unconfigured. Set RELAYER_PRIVATE_KEY on server.",
        },
        { status: 503 }
      );
    }

    if (parseFloat(relayerHealth.balanceMon) === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Relayer wallet (${relayerHealth.address}) has 0 MON. Cannot sponsor gas.`,
        },
        { status: 503 }
      );
    }

    const amountWei = parseUnits(amountUsd.toString(), AUSD_DECIMALS);
    const numericDeadline = BigInt(deadline);
    const parsedSig = parseSignature(signature as `0x${string}`);
    const v = Number(parsedSig.v);
    const r = parsedSig.r;
    const s = parsedSig.s;

    // 3. Check Sender Balance
    const balance = await publicClient.readContract({
      address: AUSD_CONTRACT_ADDRESS,
      abi: ausdAbi,
      functionName: "balanceOf",
      args: [owner as Address],
    });

    if (balance < amountWei) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient AUSD balance. Available: ${Number(balance) / 1e6}, Required: ${amountUsd}`,
        },
        { status: 400 }
      );
    }

    // 4. Relayer Broadcasts: permit + transferFrom
    const relayerWallet = getRelayerWalletClient();
    const relayerAddress = relayerWallet.account.address;

    // Step 4a: Call permit
    try {
      const permitTxHash = await relayerWallet.writeContract({
        address: AUSD_CONTRACT_ADDRESS,
        abi: ausdAbi,
        functionName: "permit",
        args: [
          owner as Address,
          relayerAddress,
          amountWei,
          numericDeadline,
          v,
          r,
          s,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: permitTxHash });
    } catch (permitErr: any) {
      console.error("[Relayer Permit Error]:", permitErr);
      return NextResponse.json(
        {
          success: false,
          error: permitErr?.shortMessage || permitErr?.message || "Failed to execute AUSD permit.",
        },
        { status: 500 }
      );
    }

    // Step 4b: Call transferFrom(owner, recipient, amount)
    let transferTxHash: `0x${string}`;
    try {
      transferTxHash = await relayerWallet.writeContract({
        address: AUSD_CONTRACT_ADDRESS,
        abi: ausdAbi,
        functionName: "transferFrom",
        args: [owner as Address, recipient as Address, amountWei],
      });
    } catch (transferErr: any) {
      console.error("[Relayer TransferFrom Error]:", transferErr);
      return NextResponse.json(
        {
          success: false,
          error: transferErr?.shortMessage || transferErr?.message || "Failed to execute AUSD transferFrom.",
        },
        { status: 500 }
      );
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transferTxHash,
      timeout: 30_000,
    });

    return NextResponse.json(
      {
        success: receipt.status === "success",
        txHash: transferTxHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        amountUsd,
        recipient,
        sender: owner,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Transfer Route Exception]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error executing gasless transfer.",
      },
      { status: 500 }
    );
  }
}
