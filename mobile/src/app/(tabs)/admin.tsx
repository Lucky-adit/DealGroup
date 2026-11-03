import { useState } from "react";
import { View } from "react-native";
import { formatINR } from "@shared/pricing";
import * as svc from "@shared/services";
import { INSTALL_STAGES, type Category, type InstallStage } from "@shared/types";
import type { AdminPledgeRow } from "@shared/data/repo";
import { InstallTracker } from "@/components/InstallTracker";
import { Button, Card, Choice, Field, Grid, H1, H2, Loading, Message, Notice, P, PhasePill, Row, Screen } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { useWide } from "@/lib/layout";
import { space, useTheme } from "@/lib/theme";

export default function AdminScreen() {
  const { repo, user, t, lang, run } = useApp();
  const c = useTheme();
  const wide = useWide(900);
  const [notice, setNotice] = useState<{ code?: string; ok?: string } | null>(null);
  const { data, loading, reload } = useData(async () => {
    if (user?.role !== "admin") return null;
    const [deals, sellers, requests] = await Promise.all([repo.listDeals(), repo.listSellers(), repo.listRequests()]);
    const pledges = await Promise.all(deals.map(async (d) => ({ deal: d, pledges: await repo.listDealPledges(d.id) })));
    return { deals, sellers, requests, pledges };
  }, [user?.id]);

  if (user?.role !== "admin") return <Screen><Notice>{user ? t("forbidden") : t("need_login")}</Notice></Screen>;
  // The saved sign-in can arrive after the first render, so wait for admin data before drawing.
  if (!data) return <Loading />;
  const { deals, sellers, requests, pledges } = data;

  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <View style={{ gap: space.sm }}><H1>{t("admin_title")}</H1><P muted>{t("admin_sub")}</P></View>
      <Message code={notice?.code} ok={notice?.ok} />

      <H2>{t("deals_table")}</H2>
      <Grid>
        {deals.map((d) => (
          <Card key={d.id}>
            <Row><P style={{ fontWeight: "600", flex: 1 }}>{d.title[lang]}</P><PhasePill phase={d.phase} /></Row>
            <P muted style={{ fontSize: 13 }}>
              {d.pledged} / {d.target} · {formatINR(d.currentPrice)} · {t("bids_title")}: {d.bidCount}{d.bestVerifiedBid ? ` · ${formatINR(d.bestVerifiedBid)}` : ""}
            </P>
            {d.phase === "bidding" && (
              <Button small title={t("lock")} onPress={async () => {
                const r = await run((x) => svc.lockDeal(x, d.id));
                setNotice(r?.error ? { code: r.error } : { ok: t("lock_ok") });
              }} />
            )}
          </Card>
        ))}
      </Grid>

      <View style={{ flexDirection: wide ? "row" : "column", gap: space.lg, alignItems: "flex-start" }}>
        <Card style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }}>
          <H2>{t("sellers_table")}</H2>
          {sellers.length ? sellers.map((s) => (
            <View key={s.id} style={{ gap: space.xs, borderBottomWidth: 1, borderColor: c.line, paddingBottom: space.sm }}>
              <Row>
                <P style={{ fontWeight: "600", flex: 1 }}>{s.company}</P>
                <Button small variant="secondary" title={s.verified ? t("unverify") : t("verify")} onPress={() => run((x) => svc.setVerified(x, s.id, !s.verified))} />
              </Row>
              <P style={{ color: s.verified ? c.good : c.warn, fontSize: 13 }}>{s.verified ? `✓ ${t("verified")}` : t("unverified")}</P>
              <P muted style={{ fontSize: 12 }}>GST {s.gstNumber} · {s.empanelmentId} · {s.city}{s.avgRating ? ` · ★ ${s.avgRating.toFixed(1)} (${s.reviewCount})` : ""}</P>
            </View>
          )) : <P muted>{t("none_yet")}</P>}
        </Card>
        <NewDealCard style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }} />
      </View>

      <Card>
        <H2>{t("pledges_table")}</H2>
        {pledges.some((x) => x.pledges.length) ? pledges.filter((x) => x.pledges.length).map(({ deal, pledges: ps }) => (
          <View key={deal.id} style={{ gap: space.sm }}>
            <P style={{ fontWeight: "600" }}>{deal.title[lang]}</P>
            {ps.map((p) => <AdminPledge key={p.id} p={p} />)}
          </View>
        )) : <P muted>{t("none_yet")}</P>}
      </Card>

      <Card>
        <H2>{t("requests_table")}</H2>
        {requests.length ? requests.map((r) => (
          <Row key={r.id}><P style={{ flex: 1 }}>{r.product} · {r.city}{r.budget ? ` · ${formatINR(r.budget)}` : ""}</P><P>×{r.quantity}</P></Row>
        )) : <P muted>{t("none_yet")}</P>}
      </Card>
    </Screen>
  );
}

function AdminPledge({ p }: { p: AdminPledgeRow }) {
  const { t, run } = useApp();
  const c = useTheme();
  const [stage, setStage] = useState<InstallStage>(p.install?.stage ?? "survey");
  return (
    <View style={{ gap: space.sm, borderWidth: 1, borderColor: c.line, borderRadius: 8, padding: space.md }}>
      <Row><P style={{ fontWeight: "600" }}>{p.name} · {p.phone}</P><P>×{p.quantity} · {p.status}</P></Row>
      {p.install && (
        <>
          <InstallTracker stage={p.install.stage} />
          <Choice value={stage} onChange={setStage} options={INSTALL_STAGES.map((s) => ({ value: s, label: t(`stage_${s}`) }))} />
          <Button small variant="secondary" title={t("set_stage")} onPress={() => run((x) => svc.adminSetInstallStage(x, p.id, stage))} />
        </>
      )}
    </View>
  );
}

function NewDealCard({ style }: { style?: object }) {
  const { t, run } = useApp();
  const [f, setF] = useState({ titleEn: "3 kW rooftop solar · Vastrapur", titleHi: "", area: "Vastrapur, Ahmedabad", marketPrice: "190000", target: "30", deposit: "5000", days: "21" });
  const [category, setCategory] = useState<Category>("solar");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Card style={style}>
      <H2>{t("new_deal")}</H2>
      <Field label={t("title_en")} value={f.titleEn} onChangeText={set("titleEn")} />
      <Field label={t("title_hi")} value={f.titleHi} onChangeText={set("titleHi")} />
      <Choice label={t("category")} value={category} onChange={setCategory} options={[
        { value: "solar", label: t("cat_solar") }, { value: "car", label: t("cat_car") }, { value: "tw", label: t("cat_tw") },
      ]} />
      <Field label={t("area")} value={f.area} onChangeText={set("area")} />
      <Field label={`${t("market_price")} (₹)`} value={f.marketPrice} onChangeText={set("marketPrice")} keyboardType="number-pad" />
      <Field label={t("target")} value={f.target} onChangeText={set("target")} keyboardType="number-pad" />
      <Field label={`${t("deposit")} (₹)`} value={f.deposit} onChangeText={set("deposit")} keyboardType="number-pad" />
      <Field label={t("days_open")} value={f.days} onChangeText={set("days")} keyboardType="number-pad" />
      <Button title={t("create")} onPress={async () => {
        const r = await run((x) => svc.createDeal(x, { ...f, category, city: "Ahmedabad" }));
        setMsg(r?.error ? { code: r.error } : { ok: t("created") });
      }} />
      <Message code={msg?.code} ok={msg?.ok} />
    </Card>
  );
}
