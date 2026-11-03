import { describe, expect, it } from "vitest";
import { currentPrice, daysLeft, dealPhase, defaultTiers, nextTier, normalizeIndianPhone, tierPrice } from "@/lib/pricing";

const tiers = [
  { minBuyers: 10, price: 180000 },
  { minBuyers: 25, price: 172000 },
  { minBuyers: 40, price: 165000 },
];

describe("pricing", () => {
  it("uses market price below the first tier", () => expect(tierPrice(190000, tiers, 9)).toBe(190000));
  it("unlocks tiers at the threshold", () => {
    expect(tierPrice(190000, tiers, 10)).toBe(180000);
    expect(tierPrice(190000, tiers, 39)).toBe(172000);
    expect(tierPrice(190000, tiers, 40)).toBe(165000);
  });
  it("finds the next tier", () => {
    expect(nextTier(tiers, 12)?.minBuyers).toBe(25);
    expect(nextTier(tiers, 40)).toBeNull();
  });
  it("locked price wins", () => expect(currentPrice({ lockedPrice: 160000, marketPrice: 190000, tiers }, 5)).toBe(160000));
  it("computes phase", () => {
    const now = new Date("2026-11-03");
    expect(dealPhase({ lockedPrice: null, target: 40, closesAt: "2026-11-20" }, 12, now)).toBe("pledging");
    expect(dealPhase({ lockedPrice: null, target: 40, closesAt: "2026-11-20" }, 40, now)).toBe("bidding");
    expect(dealPhase({ lockedPrice: null, target: 40, closesAt: "2026-11-01" }, 12, now)).toBe("expired");
    expect(dealPhase({ lockedPrice: 1, target: 40, closesAt: "2026-11-01" }, 12, now)).toBe("locked");
  });
  it("counts days left", () => expect(daysLeft("2026-11-05T00:00:00Z", new Date("2026-11-03T00:00:00Z"))).toBe(2));
  it("builds default tiers", () => expect(defaultTiers(100000, 30).map((t) => t.minBuyers)).toEqual([10, 20, 30]));
  it("normalizes Indian phones", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5876543210")).toBeNull();
  });
});
