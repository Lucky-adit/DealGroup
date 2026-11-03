import { useState } from "react";
import { View } from "react-native";
import type { Category } from "@shared/types";
import { DealCard } from "@/components/DealCard";
import { Card, Choice, Grid, H1, H2, Loading, Notice, P, Screen } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { space, useTheme } from "@/lib/theme";

export default function DealsScreen() {
  const { repo, t, isDemo } = useApp();
  const c = useTheme();
  const [cat, setCat] = useState<Category | "all">("all");
  const { data, loading, error, reload } = useData(() => repo.listDeals());
  const deals = (data ?? []).filter((d) => cat === "all" || d.category === cat);
  const steps = [1, 2, 3, 4] as const;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      {isDemo && <Notice>{t("demo_banner")}</Notice>}
      <View style={{ gap: space.sm }}>
        <H1 style={{ fontSize: 30, lineHeight: 36 }}>{t("hero_title")}</H1>
        <P muted>{t("hero_sub")}</P>
      </View>

      <H2>{t("how_title")}</H2>
      <Grid>
        {steps.map((n) => (
          <Card key={n} style={{ flexDirection: "row", gap: space.md }}>
            <P style={{ color: c.accent, fontSize: 22, fontWeight: "700" }}>{n}</P>
            <View style={{ flex: 1 }}>
              <P style={{ fontWeight: "600" }}>{t(`how_${n}`)}</P>
              <P muted style={{ fontSize: 13 }}>{t(`how_${n}d`)}</P>
            </View>
          </Card>
        ))}
      </Grid>

      <H2>{t("nav_deals")}</H2>
      <Choice
        value={cat}
        onChange={setCat}
        options={[
          { value: "all", label: t("filter_all") }, { value: "solar", label: t("cat_solar") },
          { value: "car", label: t("cat_car") }, { value: "tw", label: t("cat_tw") },
        ]}
      />
      {loading && !data ? <Loading /> : error ? <Notice>{t("error")}</Notice> : deals.length ? (
        <Grid>{deals.map((d) => <DealCard key={d.id} deal={d} />)}</Grid>
      ) : <Card><P muted>{t("none_yet")}</P></Card>}
    </Screen>
  );
}
