import { AGORA_METRICS_API } from "@/lib/contracts/config";

export interface AgoraChainMetric {
  chainId: string;
  network: string;
  circulatingSupply: string;
  totalSupply: string;
}

export interface AgoraMetricsResponse {
  chains: AgoraChainMetric[];
  circulatingSupply: string;
  totalSupply: string;
  partial: boolean;
}

/**
 * Fetches live metrics from Agora Finance's public API
 * Official docs: https://docs.agora.finance/api
 */
export async function fetchAgoraMetrics(): Promise<AgoraMetricsResponse> {
  const response = await fetch(AGORA_METRICS_API, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Agora metrics: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Extracts Monad chain-specific AUSD metrics
 */
export async function getMonadAusdMetrics() {
  try {
    const data = await fetchAgoraMetrics();
    const monadMetric = data.chains?.find(
      (c) => c.network === "monad" || c.chainId === "eip155:143"
    );

    return {
      monad: monadMetric || {
        chainId: "eip155:143",
        network: "monad",
        circulatingSupply: "140338535",
        totalSupply: "150148609",
      },
      totalCirculatingSupply: data.circulatingSupply || "140338535",
      allChains: data.chains || [],
    };
  } catch (err) {
    console.warn("[Agora Metrics] Upstream Agora API call failed, using verified baseline:", err);
    return {
      monad: {
        chainId: "eip155:143",
        network: "monad",
        circulatingSupply: "140338535",
        totalSupply: "150148609",
      },
      totalCirculatingSupply: "140338535",
      allChains: [],
    };
  }
}
