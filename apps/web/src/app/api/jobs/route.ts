import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";
import { getJobsForAccount, getAusdBalance } from "@/lib/contracts/escrowClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Monad address." },
        { status: 400 }
      );
    }

    const cleanAddress = address as Address;

    // Fetch both freelancer and client jobs for this address
    const [freelancerJobs, clientJobs, balanceInfo] = await Promise.all([
      getJobsForAccount(cleanAddress, "freelancer").catch(() => []),
      getJobsForAccount(cleanAddress, "client").catch(() => []),
      getAusdBalance(cleanAddress).catch(() => ({ balanceFormatted: "0.00", balanceWei: BigInt(0) })),
    ]);

    // Deduplicate jobs by jobId
    const map = new Map<string, any>();
    for (const job of [...freelancerJobs, ...clientJobs]) {
      const idStr = job.jobId.toString();
      if (!map.has(idStr)) {
        map.set(idStr, {
          id: idStr,
          title: job.deliverableTitle || `Escrow Contract #${idStr}`,
          client: job.client,
          freelancer: job.freelancer,
          amountUsd: parseFloat(job.amountFormatted),
          partialAmountUsd: parseFloat(job.partialAmountFormatted),
          remainderAmountUsd: parseFloat(job.remainderAmountFormatted),
          state: job.state,
          createdAt: job.createdAt ? new Date(Number(job.createdAt) * 1000).toLocaleDateString() : "Active",
          txHash: job.txHash,
        });
      }
    }

    const jobs = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));

    return NextResponse.json({
      success: true,
      address: cleanAddress,
      ausdBalance: parseFloat(balanceInfo.balanceFormatted) || 0,
      jobs,
    });
  } catch (error: any) {
    console.error("[API /api/jobs] Error fetching jobs:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to query on-chain jobs." },
      { status: 500 }
    );
  }
}
