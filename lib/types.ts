export type Lang = "en" | "hi";
export type Localized = { en: string; hi: string };
export type Category = "solar" | "car" | "tw";
export type Role = "buyer" | "seller" | "admin";

/** A price tier: once `minBuyers` units are pledged, the group target price is `price` (₹ per unit). */
export type Tier = { minBuyers: number; price: number };

export type Deal = {
  id: string;
  category: Category;
  title: Localized;
  area: Localized;
  city: string;
  marketPrice: number;
  target: number;
  deposit: number;
  closesAt: string; // ISO date
  tiers: Tier[];
  lockedPrice: number | null;
  winningSellerId: string | null;
  lockedAt: string | null;
  isExample: boolean;
  createdAt: string;
};

export type DealPhase = "pledging" | "bidding" | "locked" | "expired";

export type DealWithStats = Deal & {
  pledged: number; // total units pledged (non-withdrawn)
  bidCount: number;
  bestVerifiedBid: number | null; // only exposed to admin and after lock
  phase: DealPhase;
  currentPrice: number;
};

export type PledgeStatus = "active" | "accepted" | "declined" | "refunded" | "withdrawn";
export type DepositStatus = "held" | "refunded" | "applied";

export type Pledge = {
  id: string;
  dealId: string;
  userId: string;
  quantity: number;
  name: string;
  phone: string;
  status: PledgeStatus;
  depositStatus: DepositStatus;
  createdAt: string;
};

export type Seller = {
  id: string;
  userId: string;
  company: string;
  gstNumber: string;
  empanelmentId: string;
  city: string;
  verified: boolean;
  createdAt: string;
};

export type Bid = {
  id: string;
  dealId: string;
  sellerId: string;
  pricePerUnit: number;
  terms: string;
  createdAt: string;
};

export type DealRequest = {
  id: string;
  userId: string;
  product: string;
  city: string;
  quantity: number;
  budget: number | null;
  createdAt: string;
};

export const INSTALL_STAGES = ["survey", "installed", "net_meter", "subsidy_filed", "complete"] as const;
export type InstallStage = (typeof INSTALL_STAGES)[number];

export type Install = {
  pledgeId: string;
  stage: InstallStage;
  updatedAt: string;
};

export type Review = {
  id: string;
  pledgeId: string;
  sellerId: string;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
};

export type SessionUser = { id: string; role: Role; phone: string | null; name: string | null };
