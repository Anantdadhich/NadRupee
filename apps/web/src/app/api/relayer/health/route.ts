import { NextResponse } from "next/server";
import { checkRelayerHealth } from "@/lib/relayer/service";
import { ESCROW_CONTRACT_ADDRESS, AUSD_CONTRACT_ADDRESS, MONAD_CHAIN_ID } from "@/lib/contracts/config";

export async function GET() {
  try {
    const health = await checkRelayerHealth();

    const response = {
      ...health,
      chainId: MONAD_CHAIN_ID,
      chainName: "Monad Testnet",
      escrowContract: ESCROW_CONTRACT_ADDRESS,
      ausdContract: AUSD_CONTRACT_ADDRESS,
      timestamp: new Date().toISOString(),
    };

    // If unconfigured or RPC failure, return 503 so monitoring alerts immediately
    if (health.status === "unconfigured") {
      return NextResponse.json(response, { status: 503 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error?.message || "Internal server error checking relayer health",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
