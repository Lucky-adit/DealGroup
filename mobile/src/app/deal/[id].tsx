import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { daysLeft, formatINR, nextTier } from "@shared/pricing";
import * as svc from "@shared/services";
import { Button, Card, Field, H1, H2, Loading, Message, Notice, P, PhasePill, Pill, Progress, Row, Screen, Tag, styles } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { shareDeal, shareOnWhatsApp } from "@/lib/share";
import { radius, space, useTheme } from "@/lib/theme";

export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, user, t, lang, run, isDemo } = useApp();
  const c = useTheme();
  const wide = useWindowDimensions().width >= 900;
  const { data, loading } = useData(async () => {
    const deal = await repo.getDeal(String(id));
    const mine = deal && user ? await repo.getMyPledge(deal.id, user.id) : null;
    const winner = deal?.winningSellerId ? (await repo.listSellers()).find((s) => s.id === deal.winningSellerId) ?? null : null;
    return { deal, mine, winner };
  }, [id, user?.id]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("1");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);
  useEffect(() => {
    if (!data) return;
    setName(data.mine?.name ?? user?.name ?? "");
    setPhone(data.mine?.phone ?? user?.phone ?? "");
    setQty(String(data.mine?.quantity ?? 1));
  }, [data, user]);

  if (loading && !data) return <Loading />;
  const deal = data?.deal;
  if (!deal) return <View style={{ padding: space.lg }}><Notice>{t("not_found")}</Notice></View>;
  const { mine, winner } = data!;
  const open = deal.phase === "pledging" || deal.phase === "bidding";
  const next = nextTier(deal.tiers, deal.pledged);
  const stepIndex = { pledging: 0, bidding: deal.bidCount ? 2 : 1, locked: 3, expired: 0 }[deal.phase];

  const left = (
    <View style={{ gap: space.lg, flex: wide ? 1.4 : undefined }}>
      <Card>
        <Row>
          <View>
            <P muted style={{ fontSize: 13 }}>{deal.phase === "locked" ? t("locked_price") : t("group_price")}</P>
            <Text style={[{ color: c.fg, fontSize: 30, fontWeight: "700" }, styles.num]}>{formatINR(deal.currentPrice)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <P muted style={{ fontSize: 13 }}>{t("market_price")}</P>
            <Text style={[{ color: c.muted, textDecorationLine: "line-through" }, styles.num]}>{formatINR(deal.marketPrice)}</Text>
          </View>
        </Row>
        <Progress value={deal.pledged} max={deal.target} />
        <P style={styles.num}>{deal.pledged} {t("of")} {deal.target} {t("joined")}{open ? ` · ${daysLeft(deal.closesAt)} ${t("days_left")}` : ""}</P>
        <P style={{ color: c.good, fontWeight: "600" }}>{t("savings")}: {formatINR((deal.marketPrice - deal.currentPrice) * deal.pledged)}</P>
        {next && open && <P style={{ color: c.brand }}>{t("next_tier", { n: next.minBuyers - deal.pledged, price: formatINR(next.price) })}</P>}
      </Card>

      <Card>
        <H2>{t("ladder")}</H2>
        {deal.tiers.map((tier) => {
          const hit = deal.pledged >= tier.minBuyers;
          return (
            <View key={tier.minBuyers} style={{ flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: hit ? c.good : c.line, borderRadius: radius.sm, padding: space.md }}>
              <P>{hit ? "✓ " : ""}{tier.minBuyers}+ {t("buyers")}</P>
              <P style={styles.num}>{formatINR(tier.price)}</P>
            </View>
          );
        })}
      </Card>

      <Card>
        <H2>{t("bids_title")}</H2>
        {deal.phase === "locked" && winner ? (
          <P>{t("winner")}: <Text style={{ fontWeight: "700" }}>{winner.company}</Text>{winner.verified ? ` ✓ ${t("verified")}` : ""} · {formatINR(deal.lockedPrice!)}</P>
        ) : <P muted>{deal.phase === "bidding" ? t("bids_sealed", { n: deal.bidCount }) : t("bids_waiting")}</P>}
      </Card>
    </View>
  );

  const right = (
    <View style={{ gap: space.lg, flex: wide ? 1 : undefined }}>
      {mine && deal.phase === "locked" && mine.status === "active" && (
        <Card tone="brand">
          <H2>{t("confirm_title")}</H2>
          <P muted>{t("confirm_sub")}</P>
          <Button title={t("accept")} onPress={() => run((x) => svc.respondToLock(x, mine.id, true))} />
          <Button variant="secondary" title={t("decline")} onPress={() => run((x) => svc.respondToLock(x, mine.id, false))} />
        </Card>
      )}
      {mine?.status === "accepted" && <Notice good>{t("accepted")}</Notice>}
      {mine?.status === "declined" && <Notice>{t("declined")}</Notice>}

      <Card>
        <H2>{t("join_title")}</H2>
        {!open ? <P muted>{t("pledge_closed")}</P> : !user ? (
          <Button title={t("sign_in_to_join")} onPress={() => router.push("/login")} />
        ) : (
          <>
            {mine && <P style={{ color: c.good, fontWeight: "600" }}>{t("you_pledged", { n: mine.quantity })}</P>}
            <Field label={t("your_name")} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
            <Field label={t("phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
            <Field label={t("quantity")} value={qty} onChangeText={setQty} keyboardType="number-pad" maxLength={1} />
            <Row><P muted>{t("deposit")}</P><P style={[{ fontWeight: "700" }, styles.num]}>{formatINR(deal.deposit)}</P></Row>
            {isDemo && <P style={{ color: c.warn, fontSize: 12 }}>{t("demo_payment")}</P>}
            <Button
              title={mine ? t("update_btn") : t("pledge_btn")}
              onPress={async () => {
                const r = await run((x) => svc.pledge(x, { dealId: deal.id, name, phone, quantity: qty }));
                setMsg(r?.error ? { code: r.error } : { ok: t("you_pledged", { n: qty }) });
              }}
            />
            <Message code={msg?.code} ok={msg?.ok} />
            {mine && <Button variant="secondary" title={t("leave_btn")} onPress={() => run((x) => svc.withdraw(x, deal.id)).then(() => setMsg(null))} />}
          </>
        )}
        <Row style={{ justifyContent: "flex-start" }}>
          <Button small variant="secondary" title={t("share")} onPress={() => shareDeal(deal.id, t("share_text"))} />
          <Button small variant="secondary" title="WhatsApp" onPress={() => shareOnWhatsApp(deal.id, t("share_text"))} />
        </Row>
      </Card>

      <Card>
        <H2>{t("trust_title")}</H2>
        {(["trust_1", "trust_2", "trust_3", "trust_4"] as const).map((k) => <P key={k} style={{ fontSize: 14 }}>🛡  {t(k)}</P>)}
      </Card>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: deal.title[lang] }} />
      <Screen>
        <View style={{ gap: space.sm }}>
          <Row style={{ justifyContent: "flex-start" }}>
            <Tag>{t(`cat_${deal.category}`)} · {deal.area[lang]}</Tag>
            {deal.isExample && <Pill text={t("example")} />}
            <PhasePill phase={deal.phase} />
          </Row>
          <H1>{deal.title[lang]}</H1>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }} accessibilityLabel={t("steps_title")}>
          {([1, 2, 3, 4] as const).map((n, i) => (
            <View key={n} style={{ flexGrow: 1, flexBasis: "45%", backgroundColor: c.chip, borderRadius: radius.sm, padding: space.sm, borderWidth: i === stepIndex ? 1 : 0, borderColor: c.brand }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: i < stepIndex ? c.good : i === stepIndex ? c.brand : c.muted }}>{i < stepIndex ? "✓" : n} {t(`how_${n}`)}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: wide ? "row" : "column", gap: space.lg, alignItems: "flex-start" }}>
          <View style={{ width: wide ? undefined : "100%", flex: wide ? 1.4 : undefined }}>{left}</View>
          <View style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }}>{right}</View>
        </View>
      </Screen>
    </>
  );
}

