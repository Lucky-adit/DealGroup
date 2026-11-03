import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { HeaderActions } from "@/components/HeaderActions";
import { useApp } from "@/lib/app";
import { useTheme } from "@/lib/theme";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  const { t, user } = useApp();
  const c = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.surface }, headerTintColor: c.fg, headerTitleStyle: { fontWeight: "700" },
        headerRight: () => <HeaderActions />,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarActiveTintColor: c.brand, tabBarInactiveTintColor: c.muted,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("nav_deals"), headerTitle: t("brand"), tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="requests" options={{ title: t("nav_request"), tabBarIcon: icon("＋") }} />
      <Tabs.Screen name="me" options={{ title: t("nav_my"), tabBarIcon: icon("☆"), href: user ? undefined : null }} />
      <Tabs.Screen name="seller" options={{ title: t("nav_seller"), tabBarIcon: icon("⚒") }} />
      <Tabs.Screen name="admin" options={{ title: t("nav_admin"), tabBarIcon: icon("⚙"), href: user?.role === "admin" ? undefined : null }} />
    </Tabs>
  );
}
