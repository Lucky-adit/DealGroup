import { router } from "expo-router";
import { View } from "react-native";
import { useApp } from "@/lib/app";
import { space } from "@/lib/theme";
import { Button } from "./ui";

export function HeaderActions() {
  const { lang, setLang, user, signOut, t } = useApp();
  return (
    <View style={{ flexDirection: "row", gap: space.sm, marginRight: space.md }}>
      <Button small variant="secondary" title={lang === "en" ? "हिन्दी" : "English"} onPress={() => setLang(lang === "en" ? "hi" : "en")} />
      {user ? <Button small variant="secondary" title={t("nav_logout")} onPress={signOut} /> : <Button small title={t("nav_login")} onPress={() => router.push("/login")} />}
    </View>
  );
}
