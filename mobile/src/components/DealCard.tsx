import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { daysLeft, formatINR } from "@shared/pricing";
import type { DealWithStats } from "@shared/types";
import { useApp } from "@/lib/app";
import { radius, space, useTheme } from "@/lib/theme";
import { P, PhasePill, Pill, Progress, Row, Tag, styles } from "./ui";

export function DealCard({ deal }: { deal: DealWithStats }) {
  const { t, lang } = useApp();
  const c = useTheme();
  const open = deal.phase === "pledging" || deal.phase === "bidding";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={deal.title[lang]}
      onPress={() => router.push(`/deal/${deal.id}`)}
      style={({ pressed }) => ({ backgroundColor: c.surface, borderColor: pressed ? c.brand : c.line, borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.md })}
    >
      <Row>
        <Tag>{t(`cat_${deal.category}`)} · {deal.area[lang]}</Tag>
        <View style={{ flexDirection: "row", gap: space.xs }}>
          {deal.isExample && <Pill text={t("example")} />}
          <PhasePill phase={deal.phase} />
        </View>
      </Row>
      <Text style={{ color: c.fg, fontSize: 17, fontWeight: "600" }}>{deal.title[lang]}</Text>
      <Row>
        <Text style={[{ color: c.fg, fontSize: 24, fontWeight: "700" }, styles.num]}>{formatINR(deal.currentPrice)}</Text>
        <Text style={[{ color: c.muted, textDecorationLine: "line-through" }, styles.num]}>{formatINR(deal.marketPrice)}</Text>
      </Row>
      <Progress value={deal.pledged} max={deal.target} />
      <Row>
        <P muted style={styles.num}>{deal.pledged} {t("of")} {deal.target} {t("joined")}</P>
        <P muted>{open ? `${daysLeft(deal.closesAt)} ${t("days_left")}` : t("closed")}</P>
      </Row>
    </Pressable>
  );
}
