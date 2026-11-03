import { currentPrice, dealPhase } from "../pricing";
import type { Deal, DealWithStats } from "../types";

export function withStats(deal: Deal, pledged: number, bidCount: number, bestVerifiedBid: number | null): DealWithStats {
  return {
    ...deal,
    pledged,
    bidCount,
    bestVerifiedBid,
    phase: dealPhase(deal, pledged),
    currentPrice: currentPrice(deal, pledged),
  };
}
