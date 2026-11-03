import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { normalizeIndianPhone } from "@shared/pricing";
import type { Role } from "@shared/types";
import { Button, Card, Field, H1, Message, P, Screen } from "@/components/ui";
import { useApp } from "@/lib/app";
import { supabase } from "@/lib/supabase";
import { space } from "@/lib/theme";

export default function LoginScreen() {
  const { t, isDemo, demoLogin } = useApp();
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <Screen>
      <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: space.lg }}>
        <H1>{t("login_title")}</H1>
        <P muted>{isDemo ? t("demo_login") : t("login_sub")}</P>
        <Card>
          {isDemo ? (
            (["buyer", "seller", "admin"] as Role[]).map((r) => (
              <Button key={r} variant={r === "buyer" ? "primary" : "secondary"} title={t(`as_${r}`)} onPress={async () => { await demoLogin(r); done(); }} />
            ))
          ) : !sentTo ? (
            <>
              <Field label={t("phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="98765 43210" />
              <Button title={t("send_code")} onPress={async () => {
                const p = normalizeIndianPhone(phone);
                if (!p) return setErr("bad_phone");
                const { error } = await supabase!.auth.signInWithOtp({ phone: p });
                if (error) return setErr("error");
                setErr(null);
                setSentTo(p);
              }} />
            </>
          ) : (
            <>
              <P style={{ fontSize: 14 }}>{t("code_sent", { phone: sentTo })}</P>
              <Field label={t("code")} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
              <Button title={t("verify_code")} onPress={async () => {
                if (!/^\d{6}$/.test(code)) return setErr("bad_code");
                const { error } = await supabase!.auth.verifyOtp({ phone: sentTo, token: code, type: "sms" });
                if (error) return setErr("bad_code");
                done();
              }} />
            </>
          )}
          <Message code={err} />
        </Card>
      </View>
    </Screen>
  );
}
