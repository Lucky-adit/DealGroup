import type { Deal, DealPhase, Tier } from "./types";

/** Best tier price reached for a pledged count, or market price if no tier is reached. */
export function tierPrice(marketPrice: number, tiers: Tier[], pledged: number): number {
  let price = marketPrice;
  for (const t of [...tiers].sort((a, b) => a.minBuyers - b.minBuyers)) {
    if (pledged >= t.minBuyers) price = Math.min(price, t.price);
  }
  return price;
}

/** The next tier still to unlock, if any. */
export function nextTier(tiers: Tier[], pledged: number): Tier | null {
  return [...tiers].sort((a, b) => a.minBuyers - b.minBuyers).find((t) => pledged < t.minBuyers) ?? null;
}

export function dealPhase(deal: Pick<Deal, "lockedPrice" | "target" | "closesAt">, pledged: number, now = new Date()): DealPhase {
  if (deal.lockedPrice != null) return "locked";
  if (pledged >= deal.target) return "bidding";
  if (new Date(deal.closesAt).getTime() < now.getTime()) return "expired";
  return "pledging";
}

/** Price buyers see now: the locked price after lock, otherwise the tier price reached so far. */
export function currentPrice(deal: Pick<Deal, "lockedPrice" | "marketPrice" | "tiers">, pledged: number): number {
  return deal.lockedPrice ?? tierPrice(deal.marketPrice, deal.tiers, pledged);
}

export function daysLeft(closesAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(closesAt).getTime() - now.getTime()) / 86_400_000));
}

/** Default tiers for a new deal: 3%, 6% and 10% off at one third, two thirds and the full target. */
export function defaultTiers(marketPrice: number, target: number): Tier[] {
  return [
    { minBuyers: Math.max(1, Math.ceil(target / 3)), price: Math.round(marketPrice * 0.97) },
    { minBuyers: Math.max(1, Math.ceil((target * 2) / 3)), price: Math.round(marketPrice * 0.94) },
    { minBuyers: target, price: Math.round(marketPrice * 0.9) },
  ];
}

export const formatINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Indian mobile number: optional +91, then 10 digits starting 6-9. Returns E.164 or null. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? "+91" + local : null;
}
