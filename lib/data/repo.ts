import type {
  Bid, Category, Deal, DealRequest, DealWithStats, Install, InstallStage, Localized, Pledge, Review, Seller, Tier,
} from "../types";

export type NewDeal = {
  category: Category;
  title: Localized;
  area: Localized;
  city: string;
  marketPrice: number;
  target: number;
  deposit: number;
  closesAt: string;
  tiers: Tier[];
};

export type PledgeInput = { dealId: string; userId: string; quantity: number; name: string; phone: string };
export type SellerInput = { userId: string; company: string; gstNumber: string; empanelmentId: string; city: string };
export type BidInput = { dealId: string; sellerId: string; pricePerUnit: number; terms: string };
export type RequestInput = { userId: string; product: string; city: string; quantity: number; budget: number | null };
export type ReviewInput = { pledgeId: string; userId: string; rating: number; comment: string };

export type AdminPledgeRow = Pledge & { install: Install | null };
export type BidWithSeller = Bid & { seller: Pick<Seller, "id" | "company" | "verified"> };
export type MyPledgeRow = Pledge & { deal: DealWithStats; install: Install | null; review: Review | null; winner: Pick<Seller, "company"> | null };

/**
 * Everything the app reads or writes. Two implementations:
 * - demo (in-memory, used when Supabase env vars are missing)
 * - supabase (Postgres + row-level security)
 * Callers must check permissions before calling write methods (see lib/actions.ts).
 */
export interface Repo {
  listDeals(): Promise<DealWithStats[]>;
  getDeal(id: string): Promise<DealWithStats | null>;
  createDeal(input: NewDeal): Promise<Deal>;
  lockDeal(dealId: string): Promise<{ ok: true } | { ok: false; reason: "no_verified_bid" | "not_ready" }>;

  getMyPledge(dealId: string, userId: string): Promise<Pledge | null>;
  upsertPledge(input: PledgeInput): Promise<Pledge>;
  withdrawPledge(dealId: string, userId: string): Promise<void>;
  respondToLock(pledgeId: string, userId: string, accept: boolean): Promise<void>;
  listMyPledges(userId: string): Promise<MyPledgeRow[]>;
  listDealPledges(dealId: string): Promise<AdminPledgeRow[]>;

  getSellerByUser(userId: string): Promise<Seller | null>;
  upsertSeller(input: SellerInput): Promise<Seller>;
  listSellers(): Promise<(Seller & { avgRating: number | null; reviewCount: number })[]>;
  setSellerVerified(sellerId: string, verified: boolean): Promise<void>;

  upsertBid(input: BidInput): Promise<Bid>;
  listBidsForDeal(dealId: string): Promise<BidWithSeller[]>;
  listBidsBySeller(sellerId: string): Promise<Bid[]>;

  createRequest(input: RequestInput): Promise<DealRequest>;
  listRequests(): Promise<DealRequest[]>;
  listMyRequests(userId: string): Promise<DealRequest[]>;

  setInstallStage(pledgeId: string, stage: InstallStage): Promise<void>;
  addReview(input: ReviewInput): Promise<Review>;
}
