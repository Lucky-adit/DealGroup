import { uid as randomUUID } from "../uid";
import type { Bid, Deal, DealRequest, Install, Pledge, Review, Seller } from "../types";
import type { Repo } from "./repo";
import { withStats } from "./stats";

/**
 * In-memory demo data. Resets when the server restarts. Every deal here is marked as an example.
 * Prices are rough illustrations, not real quotes.
 */
type Store = {
  deals: Deal[]; pledges: Pledge[]; sellers: Seller[]; bids: Bid[];
  requests: DealRequest[]; installs: Install[]; reviews: Review[];
  basePledges: Record<string, number>; // example pledges so demo deals are not empty
};

const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

function seed(): Store {
  const now = iso(new Date());
  const deals: Deal[] = [
    { id: "solar-satellite", category: "solar", title: { en: "3 kW rooftop solar · Satellite societies", hi: "3 kW रूफटॉप सोलर · सैटेलाइट सोसाइटी" },
      area: { en: "Satellite, Ahmedabad", hi: "सैटेलाइट, अहमदाबाद" }, city: "Ahmedabad", marketPrice: 190000, target: 40, deposit: 5000,
      closesAt: daysFromNow(12), tiers: [{ minBuyers: 10, price: 180000 }, { minBuyers: 25, price: 172000 }, { minBuyers: 40, price: 165000 }],
      lockedPrice: null, winningSellerId: null, lockedAt: null, isExample: true, createdAt: now },
    { id: "solar-bopal", category: "solar", title: { en: "5 kW rooftop solar · Bopal bungalows", hi: "5 kW रूफटॉप सोलर · बोपल बंगले" },
      area: { en: "Bopal, Ahmedabad", hi: "बोपल, अहमदाबाद" }, city: "Ahmedabad", marketPrice: 290000, target: 30, deposit: 5000,
      closesAt: daysFromNow(5), tiers: [{ minBuyers: 10, price: 281000 }, { minBuyers: 20, price: 272000 }, { minBuyers: 30, price: 261000 }],
      lockedPrice: null, winningSellerId: null, lockedAt: null, isExample: true, createdAt: now },
    { id: "solar-prahladnagar", category: "solar", title: { en: "3 kW rooftop solar · Prahlad Nagar", hi: "3 kW रूफटॉप सोलर · प्रह्लाद नगर" },
      area: { en: "Prahlad Nagar, Ahmedabad", hi: "प्रह्लाद नगर, अहमदाबाद" }, city: "Ahmedabad", marketPrice: 185000, target: 20, deposit: 3000,
      closesAt: daysFromNow(-2), tiers: [{ minBuyers: 10, price: 176000 }, { minBuyers: 20, price: 166000 }],
      lockedPrice: 162000, winningSellerId: "seller-sun", lockedAt: daysFromNow(-1), isExample: true, createdAt: now },
  ];
  const sellers: Seller[] = [
    { id: "seller-sun", userId: "demo-seller-2", company: "Example Sun Power", gstNumber: "24AAAAA0000A1Z5", empanelmentId: "DEMO-001", city: "Ahmedabad", verified: true, createdAt: now },
    { id: "seller-demo", userId: "demo-seller", company: "Demo Solar Installers", gstNumber: "24BBBBB1111B1Z5", empanelmentId: "DEMO-002", city: "Ahmedabad", verified: false, createdAt: now },
  ];
  const bids: Bid[] = [
    { id: randomUUID(), dealId: "solar-bopal", sellerId: "seller-sun", pricePerUnit: 258000, terms: "25-year panel warranty, 5-year service", createdAt: now },
    { id: randomUUID(), dealId: "solar-prahladnagar", sellerId: "seller-sun", pricePerUnit: 162000, terms: "Includes net-meter paperwork", createdAt: now },
  ];
  const pledges: Pledge[] = [
    { id: "pledge-demo-locked", dealId: "solar-prahladnagar", userId: "demo-buyer", quantity: 1, name: "Demo Buyer", phone: "+919800000000",
      status: "accepted", depositStatus: "held", createdAt: now },
  ];
  return {
    deals, sellers, bids, pledges, requests: [], reviews: [],
    installs: [{ pledgeId: "pledge-demo-locked", stage: "installed", updatedAt: now }],
    basePledges: { "solar-satellite": 27, "solar-bopal": 30, "solar-prahladnagar": 19 },
  };
}

// Survive hot reloads in dev (web) and fast refresh (mobile).
const g = globalThis as unknown as { __dealgroupStore?: Store };
const db = (g.__dealgroupStore ??= seed());

const pledgedFor = (dealId: string) =>
  (db.basePledges[dealId] ?? 0) +
  db.pledges.filter((p) => p.dealId === dealId && !["withdrawn", "declined", "refunded"].includes(p.status)).reduce((s, p) => s + p.quantity, 0);

const sellerById = (id: string) => db.sellers.find((s) => s.id === id) ?? null;

function stats(deal: Deal) {
  const bids = db.bids.filter((b) => b.dealId === deal.id);
  const verified = bids.filter((b) => sellerById(b.sellerId)?.verified).map((b) => b.pricePerUnit);
  return withStats(deal, pledgedFor(deal.id), bids.length, verified.length ? Math.min(...verified) : null);
}

export const demoRepo: Repo = {
  async listDeals() {
    return db.deals.map(stats).sort((a, b) => order(a.phase) - order(b.phase));
  },
  async getDeal(id) {
    const d = db.deals.find((x) => x.id === id);
    return d ? stats(d) : null;
  },
  async createDeal(input) {
    const deal: Deal = { ...input, id: randomUUID(), lockedPrice: null, winningSellerId: null, lockedAt: null, isExample: false, createdAt: iso(new Date()) };
    db.deals.unshift(deal);
    return deal;
  },
  async lockDeal(dealId) {
    const deal = db.deals.find((d) => d.id === dealId);
    if (!deal) return { ok: false, reason: "not_ready" };
    const s = stats(deal);
    if (s.phase !== "bidding") return { ok: false, reason: "not_ready" };
    const best = db.bids.filter((b) => b.dealId === dealId && sellerById(b.sellerId)?.verified).sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];
    if (!best) return { ok: false, reason: "no_verified_bid" };
    Object.assign(deal, { lockedPrice: best.pricePerUnit, winningSellerId: best.sellerId, lockedAt: iso(new Date()) });
    return { ok: true };
  },

  async getMyPledge(dealId, userId) {
    return db.pledges.find((p) => p.dealId === dealId && p.userId === userId && p.status !== "withdrawn") ?? null;
  },
  async upsertPledge(input) {
    const existing = db.pledges.find((p) => p.dealId === input.dealId && p.userId === input.userId);
    if (existing) {
      Object.assign(existing, { quantity: input.quantity, name: input.name, phone: input.phone, status: "active", depositStatus: "held" });
      return existing;
    }
    const p: Pledge = { id: randomUUID(), ...input, status: "active", depositStatus: "held", createdAt: iso(new Date()) };
    db.pledges.push(p);
    return p;
  },
  async withdrawPledge(dealId, userId) {
    const p = db.pledges.find((x) => x.dealId === dealId && x.userId === userId);
    if (p) Object.assign(p, { status: "withdrawn", depositStatus: "refunded" });
  },
  async respondToLock(pledgeId, userId, accept) {
    const p = db.pledges.find((x) => x.id === pledgeId && x.userId === userId);
    if (!p) return;
    Object.assign(p, accept ? { status: "accepted" } : { status: "declined", depositStatus: "refunded" });
    if (accept && !db.installs.some((i) => i.pledgeId === pledgeId)) db.installs.push({ pledgeId, stage: "survey", updatedAt: iso(new Date()) });
  },
  async listMyPledges(userId) {
    return db.pledges
      .filter((p) => p.userId === userId && p.status !== "withdrawn")
      .map((p) => {
        const deal = db.deals.find((d) => d.id === p.dealId)!;
        return {
          ...p,
          deal: stats(deal),
          install: db.installs.find((i) => i.pledgeId === p.id) ?? null,
          review: db.reviews.find((r) => r.pledgeId === p.id) ?? null,
          winner: deal.winningSellerId ? { company: sellerById(deal.winningSellerId)?.company ?? "" } : null,
        };
      });
  },
  async listDealPledges(dealId) {
    return db.pledges.filter((p) => p.dealId === dealId && p.status !== "withdrawn").map((p) => ({ ...p, install: db.installs.find((i) => i.pledgeId === p.id) ?? null }));
  },

  async getSellerByUser(userId) {
    return db.sellers.find((s) => s.userId === userId) ?? null;
  },
  async upsertSeller(input) {
    const existing = db.sellers.find((s) => s.userId === input.userId);
    if (existing) {
      const changedId = existing.gstNumber !== input.gstNumber || existing.empanelmentId !== input.empanelmentId;
      Object.assign(existing, input, changedId ? { verified: false } : {});
      return existing;
    }
    const s: Seller = { id: randomUUID(), ...input, verified: false, createdAt: iso(new Date()) };
    db.sellers.push(s);
    return s;
  },
  async listSellers() {
    return db.sellers.map((s) => {
      const rs = db.reviews.filter((r) => r.sellerId === s.id);
      return { ...s, reviewCount: rs.length, avgRating: rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : null };
    });
  },
  async setSellerVerified(sellerId, verified) {
    const s = sellerById(sellerId);
    if (s) s.verified = verified;
  },

  async upsertBid(input) {
    const existing = db.bids.find((b) => b.dealId === input.dealId && b.sellerId === input.sellerId);
    if (existing) {
      Object.assign(existing, { pricePerUnit: input.pricePerUnit, terms: input.terms });
      return existing;
    }
    const b: Bid = { id: randomUUID(), ...input, createdAt: iso(new Date()) };
    db.bids.push(b);
    return b;
  },
  async listBidsForDeal(dealId) {
    return db.bids
      .filter((b) => b.dealId === dealId)
      .map((b) => {
        const s = sellerById(b.sellerId)!;
        return { ...b, seller: { id: s.id, company: s.company, verified: s.verified } };
      })
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit);
  },
  async listBidsBySeller(sellerId) {
    return db.bids.filter((b) => b.sellerId === sellerId);
  },

  async createRequest(input) {
    const r: DealRequest = { id: randomUUID(), ...input, createdAt: iso(new Date()) };
    db.requests.unshift(r);
    return r;
  },
  async listRequests() {
    return db.requests;
  },
  async listMyRequests(userId) {
    return db.requests.filter((r) => r.userId === userId);
  },

  async setInstallStage(pledgeId, stage) {
    const i = db.installs.find((x) => x.pledgeId === pledgeId);
    if (i) Object.assign(i, { stage, updatedAt: iso(new Date()) });
    else db.installs.push({ pledgeId, stage, updatedAt: iso(new Date()) });
    const p = db.pledges.find((x) => x.id === pledgeId);
    if (p && stage === "complete") p.depositStatus = "applied";
  },
  async addReview(input) {
    const p = db.pledges.find((x) => x.id === input.pledgeId && x.userId === input.userId);
    const deal = p && db.deals.find((d) => d.id === p.dealId);
    if (!p || !deal?.winningSellerId) throw new Error("not_allowed");
    const existing = db.reviews.find((r) => r.pledgeId === input.pledgeId);
    if (existing) {
      Object.assign(existing, { rating: input.rating, comment: input.comment });
      return existing;
    }
    const r: Review = { id: randomUUID(), pledgeId: input.pledgeId, sellerId: deal.winningSellerId, rating: input.rating, comment: input.comment, createdAt: iso(new Date()) };
    db.reviews.push(r);
    return r;
  },
};

function order(phase: string) {
  return { pledging: 0, bidding: 1, locked: 2, expired: 3 }[phase] ?? 4;
}
