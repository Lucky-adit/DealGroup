import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { formatINR } from "@shared/pricing";
import * as svc from "@shared/services";
import type { MyPledgeRow } from "@shared/data/repo";
import { InstallTracker } from "@/components/InstallTracker";
import { Button, Card, Choice, Field, Grid, H1, H2, Loading, Message, P, PhasePill, Row, Screen, Tag } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { space, useTheme } from "@/lib/theme";

export default function MyDealsScreen() {
  const { repo, user, t } = useApp();
  const { data, loading, reload } = useData(() => (user ? repo.listMyPledges(user.id) : Promise.resolve([])), [user?.id]);
  if (!user) return <Screen><Button title={t("nav_login")} onPress={() => router.push("/login")} /></Screen>;
  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <H1>{t("my_title")}</H1>
      {loading && !data ? <Loading /> : data?.length ? <Grid>{data.map((p) => <PledgeCard key={p.id} p={p} />)}</Grid> : (
        <Card><P muted>{t("my_empty")}</P><Button variant="secondary" title={t("hero_cta")} onPress={() => router.push("/")} /></Card>
      )}
    </Screen>
  );
}

function PledgeCard({ p }: { p: MyPledgeRow }) {
  const { t, lang, run } = useApp();
  const c = useTheme();
  const [rating, setRating] = useState(p.review?.rating ?? 5);
  const [comment, setComment] = useState(p.review?.comment ?? "");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);
  return (
    <Card>
      <Row><Tag>{t(`cat_${p.deal.category}`)} · {p.deal.area[lang]}</Tag><PhasePill phase={p.deal.phase} /></Row>
      <Text onPress={() => router.push(`/deal/${p.dealId}`)} style={{ color: c.fg, fontSize: 17, fontWeight: "600" }}>{p.deal.title[lang]}</Text>
      <P>×{p.quantity} · {formatINR(p.deal.currentPrice)} {t("per_unit")}</P>
      <P muted style={{ fontSize: 13 }}>{t(`deposit_${p.depositStatus}`)} · {formatINR(p.deal.deposit)}</P>
      {p.winner && <P>{t("winner")}: <Text style={{ fontWeight: "700" }}>{p.winner.company}</Text></P>}
      {p.deal.phase === "locked" && p.status === "active" && <Button title={t("confirm_title")} onPress={() => router.push(`/deal/${p.dealId}`)} />}
      {p.install && (
        <View style={{ gap: space.sm }}>
          <H2 style={{ fontSize: 15 }}>{t("install_title")}</H2>
          <InstallTracker stage={p.install.stage} />
          {p.install.stage === "subsidy_filed" && <Button title={t("confirm_install")} onPress={() => run((x) => svc.confirmInstall(x, p.id))} />}
          {p.install.stage === "complete" && <P style={{ color: c.good }}>{t("install_confirmed")}</P>}
        </View>
      )}
      {p.install?.stage === "complete" && (
        <View style={{ gap: space.sm }}>
          <H2 style={{ fontSize: 15 }}>{t("review_title")}</H2>
          <Choice label={t("rating")} value={rating} onChange={setRating} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: `★ ${n}` }))} />
          <Field label={t("comment")} value={comment} onChangeText={setComment} multiline />
          <Button title={t("send_review")} onPress={async () => {
            const r = await run((x) => svc.review(x, { pledgeId: p.id, rating, comment }));
            setMsg(r?.error ? { code: r.error } : { ok: t("review_saved") });
          }} />
          <Message code={msg?.code} ok={msg?.ok} />
        </View>
      )}
    </Card>
  );
}
