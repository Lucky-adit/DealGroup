import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "@/lib/app";
import { useTheme } from "@/lib/theme";

function RootStack() {
  const c = useTheme();
  const { t } = useApp();
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: c.surface }, headerTintColor: c.fg, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="deal/[id]" options={{ title: t("nav_deals"), headerBackTitle: t("nav_deals") }} />
      <Stack.Screen name="login" options={{ title: t("login_title"), presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <RootStack />
      </AppProvider>
    </SafeAreaProvider>
  );
}
