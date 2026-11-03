import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { formatINR } from "@shared/pricing";
import * as svc from "@shared/services";
import { INSTALL_STAGES, type Bid, type DealWithStats, type InstallStage } from "@shared/types";
import type { AdminPledgeRow } from "@shared/data/repo";
import { InstallTracker } from "@/components/InstallTracker";
import { Button, Card, Choice, Field, H1, H2, Loading, Message, Notice, P, PhasePill, Pill, Row, Screen, Tag } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { useWide } from "@/lib/layout";
import { space, useTheme } from "@/lib/theme";

export default function SellerScreen() {
  const { repo, user, t, run } = useApp();
  const c = useTheme();
  const wide = useWide(900);
  const { data, loading, reload } = useData(async () => {
    const seller = user ? await repo.getSellerByUser(user.id) : null;
    const deals = await repo.listDeals();
    const bids = seller ? await repo.listBidsBySeller(seller.id) : [];
    const won = seller ? deals.filter((d) => d.winningSellerId === seller.id) : [];
    const wonPledges = await Promise.all(won.map(async (d) => ({ deal: d, pledges: (await repo.listDealPledges(d.id)).filter((p) => p.status === "accepted") })));
    return { seller, deals, bids, wonPledges };
  }, [user?.id]);

  const [company, setCompany] = useState("");
  const [gst, setGst] = useState("");
  const [emp, setEmp] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);
  useEffect(() => {
    const s = data?.seller;
    if (s) { setCompany(s.company); setGst(s.gstNumber); setEmp(s.empanelmentId); setCity(s.city); }
  }, [data?.seller]);

  if (!user) return <Screen><H1>{t("seller_title")}</H1><P muted>{t("seller_sub")}</P><Button title={t("nav_login")} onPress={() => router.push("/login")} /></Screen>;
  if (!data) return <Loading />;
  const { seller, deals, bids, wonPledges } = data;
  const open = deals.filter((d) => d.phase === "bidding" || d.phase === "pledging");

  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <View style={{ gap: space.sm }}><H1>{t("seller_title")}</H1><P muted>{t("seller_sub")}</P></View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: space.lg, alignItems: "flex-start" }}>
        <Card style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }}>
          <Row>
            <H2>{t("seller_register")}</H2>
            {seller && <Pill text={seller.verified ? `✓ ${t("verified")}` : t("unverified")} color={seller.verified ? c.good : c.warn} />}
          </Row>
          {seller && !seller.verified && <Notice>{t("verify_note")}</Notice>}
          <Field label={t("company")} value={company} onChangeText={setCompany} />
          <Field label={t("gst")} value={gst} onChangeText={setGst} autoCapitalize="characters" maxLength={15} />
          <Field label={t("empanelment")} value={emp} onChangeText={setEmp} />
          <Field label={t("city")} value={city} onChangeText={setCity} />
          <Button title={t("save")} onPress={async () => {
            const r = await run((x) => svc.saveSeller(x, { company, gst, empanelment: emp, city }));
            setMsg(r?.error ? { code: r.error } : { ok: t("saved") });
          }} />
          <Message code={msg?.code} ok={msg?.ok} />
        </Card>

        <View style={{ width: wide ? undefined : "100%", flex: wide ? 1.6 : undefined, gap: space.lg }}>
          <H2>{t("open_for_bids")}</H2>
          {open.length ? open.map((d) => <BidCard key={d.id} deal={d} bid={bids.find((b) => b.dealId === d.id)} canBid={!!seller} />) : <Card><P muted>{t("no_open")}</P></Card>}
          {wonPledges.map(({ deal, pledges }) => <WonCard key={deal.id} deal={deal} pledges={pledges} />)}
        </View>
      </View>
    </Screen>
  );
}

function BidCard({ deal, bid, canBid }: { deal: DealWithStats; bid?: Bid; canBid: boolean }) {
  const { t, lang, run } = useApp();
  const [price, setPrice] = useState(bid ? String(bid.pricePerUnit) : "");
  const [terms, setTerms] = useState(bid?.terms ?? "");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);
  return (
    <Card>
      <Row><Tag>{t(`cat_${deal.category}`)} · {deal.area[lang]}</Tag><PhasePill phase={deal.phase} /></Row>
      <H2 style={{ fontSize: 16 }}>{deal.title[lang]}</H2>
      <P>{deal.phase === "bidding" ? t("demand") : t("upcoming")}: {deal.pledged} {t("buyers")} · {t("market_price")} {formatINR(deal.marketPrice)}</P>
      {deal.phase === "bidding" && canBid && (
        <>
          <Field label={t("bid_price")} value={price} onChangeText={setPrice} keyboardType="number-pad" />
          <Field label={t("terms")} value={terms} onChangeText={setTerms} />
          <Button title={bid ? `${t("your_bid")}: ${formatINR(bid.pricePerUnit)} ✎` : t("submit_bid")} onPress={async () => {
            const r = await run((x) => svc.placeBid(x, { dealId: deal.id, price, terms }));
            setMsg(r?.error ? { code: r.error } : { ok: t("bid_saved") });
          }} />
          <Message code={msg?.code} ok={msg?.ok} />
        </>
      )}
    </Card>
  );
}

function WonCard({ deal, pledges }: { deal: DealWithStats; pledges: AdminPledgeRow[] }) {
  const { t, lang } = useApp();
  return (
    <Card tone="good">
      <H2 style={{ fontSize: 16 }}>✓ {deal.title[lang]} · {formatINR(deal.lockedPrice ?? 0)}</H2>
      {pledges.map((p) => <InstallRow key={p.id} p={p} dealId={deal.id} />)}
    </Card>
  );
}

function InstallRow({ p, dealId }: { p: AdminPledgeRow; dealId: string }) {
  const { t, run } = useApp();
  const [stage, setStage] = useState<InstallStage>(p.install?.stage ?? "survey");
  return (
    <View style={{ gap: space.sm }}>
      <Row><P style={{ fontWeight: "600" }}>{p.name}</P><P>{p.phone} · ×{p.quantity}</P></Row>
      {p.install && <InstallTracker stage={p.install.stage} />}
      <Choice value={stage} onChange={setStage} options={INSTALL_STAGES.filter((s) => s !== "complete").map((s) => ({ value: s, label: t(`stage_${s}`) }))} />
      <Button small variant="secondary" title={t("set_stage")} onPress={() => run((x) => svc.sellerSetInstallStage(x, { dealId, pledgeId: p.id, stage }))} />
    </View>
  );
}
