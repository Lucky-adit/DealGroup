import { beforeEach, describe, expect, it } from "vitest";
import { demoRepo } from "@/lib/data/demo";
import * as svc from "@/lib/services";
import type { SessionUser } from "@/lib/types";

const buyer: SessionUser = { id: "t-buyer", role: "buyer", phone: null, name: "T" };
const admin: SessionUser = { id: "t-admin", role: "admin", phone: null, name: "A" };
const ctx = (user: SessionUser | null) => ({ repo: demoRepo, user });

describe("services (demo repo)", () => {
  beforeEach(async () => { await svc.withdraw(ctx(buyer), "solar-satellite"); });

  it("requires sign-in to pledge", async () => {
    expect(await svc.pledge(ctx(null), { dealId: "solar-satellite", name: "x", phone: "9876543210", quantity: 1 })).toEqual({ error: "need_login" });
  });
  it("rejects bad phone numbers", async () => {
    expect((await svc.pledge(ctx(buyer), { dealId: "solar-satellite", name: "x", phone: "123", quantity: 1 }))?.error).toBe("bad_phone");
  });
  it("pledges and counts", async () => {
    const before = (await demoRepo.getDeal("solar-satellite"))!.pledged;
    expect((await svc.pledge(ctx(buyer), { dealId: "solar-satellite", name: "x", phone: "9876543210", quantity: 2 }))?.ok).toBe(true);
    expect((await demoRepo.getDeal("solar-satellite"))!.pledged).toBe(before + 2);
  });
  it("blocks pledges on a locked deal", async () => {
    expect((await svc.pledge(ctx(buyer), { dealId: "solar-prahladnagar", name: "x", phone: "9876543210", quantity: 1 }))?.error).toBe("pledge_closed");
  });
  it("only admins create deals or verify sellers", async () => {
    expect((await svc.createDeal(ctx(buyer), { category: "solar", titleEn: "x", area: "y", marketPrice: 1, target: 2, deposit: 0, days: 1 }))?.error).toBe("forbidden");
    expect((await svc.setVerified(ctx(buyer), "seller-demo", true))?.error).toBe("forbidden");
    expect((await svc.createDeal(ctx(admin), { category: "solar", titleEn: "x", area: "y", marketPrice: 100, target: 2, deposit: 0, days: 1 }))?.ok).toBe(true);
  });
  it("sellers cannot mark an install complete", async () => {
    const seller: SessionUser = { id: "demo-seller-2", role: "seller", phone: null, name: "S" };
    expect((await svc.sellerSetInstallStage(ctx(seller), { dealId: "solar-prahladnagar", pledgeId: "pledge-demo-locked", stage: "complete" }))?.error).toBe("forbidden");
    expect((await svc.sellerSetInstallStage(ctx(seller), { dealId: "solar-prahladnagar", pledgeId: "pledge-demo-locked", stage: "subsidy_filed" }))?.ok).toBe(true);
  });
  it("locks only with a verified bid once target is hit", async () => {
    expect((await svc.lockDeal(ctx(admin), "solar-satellite"))?.error).toBe("lock_not_ready");
    expect((await svc.lockDeal(ctx(admin), "solar-bopal"))?.ok).toBe(true);
  });
});
