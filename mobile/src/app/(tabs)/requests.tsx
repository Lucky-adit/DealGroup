import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { formatINR } from "@shared/pricing";
import * as svc from "@shared/services";
import { Button, Card, Field, H1, H2, Message, P, Row, Screen } from "@/components/ui";
import { useApp, useData } from "@/lib/app";
import { useWide } from "@/lib/layout";
import { space } from "@/lib/theme";

export default function RequestsScreen() {
  const { repo, user, t, run } = useApp();
  const wide = useWide();
  const { data } = useData(() => (user ? repo.listMyRequests(user.id) : Promise.resolve([])), [user?.id]);
  const [product, setProduct] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [qty, setQty] = useState("1");
  const [budget, setBudget] = useState("");
  const [msg, setMsg] = useState<{ code?: string; ok?: string } | null>(null);

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <H1>{t("req_title")}</H1>
        <P muted>{t("req_sub")}</P>
      </View>
      <View style={{ flexDirection: wide ? "row" : "column", gap: space.lg, alignItems: "flex-start" }}>
        <Card style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }}>
          {user ? (
            <>
              <Field label={t("product")} value={product} onChangeText={setProduct} placeholder="5 kW solar, Hyundai Creta…" />
              <Field label={t("city")} value={city} onChangeText={setCity} />
              <Field label={t("quantity")} value={qty} onChangeText={setQty} keyboardType="number-pad" />
              <Field label={t("budget")} value={budget} onChangeText={setBudget} keyboardType="number-pad" />
              <Button
                title={t("send_req")}
                onPress={async () => {
                  const r = await run((x) => svc.requestDeal(x, { product, city, quantity: qty, budget }));
                  setMsg(r?.error ? { code: r.error } : { ok: t("req_sent") });
                  if (r?.ok) { setProduct(""); setBudget(""); }
                }}
              />
              <Message code={msg?.code} ok={msg?.ok} />
            </>
          ) : <Button title={t("nav_login")} onPress={() => router.push("/login")} />}
        </Card>
        <Card style={{ width: wide ? undefined : "100%", flex: wide ? 1 : undefined }}>
          <H2>{t("your_requests")}</H2>
          {data?.length ? data.map((r) => (
            <Row key={r.id}><P style={{ flex: 1 }}>{r.product} · {r.city}{r.budget ? ` · ${formatINR(r.budget)}` : ""}</P><P>×{r.quantity}</P></Row>
          )) : <P muted>{t("none_yet")}</P>}
        </Card>
      </View>
    </Screen>
  );
}
