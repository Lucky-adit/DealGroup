import { useState } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DealPhase } from "@shared/types";
import { useApp } from "@/lib/app";
import { radius, space, useTheme } from "@/lib/theme";

/** Columns for card grids: 1 on phones, 2 on small tablets, 3 on large tablets. */
export function useColumns() {
  const { width } = useWindowDimensions();
  return width >= 1024 ? 3 : width >= 700 ? 2 : 1;
}

/** Scrollable page with safe-area padding and a readable max width on tablets. */
export function Screen({ children, onRefresh, refreshing = false }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: space.xl + insets.bottom, paddingHorizontal: Math.max(space.lg, insets.left, insets.right), paddingTop: space.lg }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center", gap: space.lg }}>{children}</View>
    </ScrollView>
  );
}

export function Grid({ children }: { children: React.ReactNode[] }) {
  const cols = useColumns();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -space.sm / 2 }}>
      {children.map((child, i) => (
        <View key={i} style={{ width: `${100 / cols}%`, padding: space.sm / 2 }}>{child}</View>
      ))}
    </View>
  );
}

export function Card({ children, style, tone }: { children: React.ReactNode; style?: ViewStyle; tone?: "brand" | "good" }) {
  const c = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderColor: tone === "brand" ? c.brand : tone === "good" ? c.good : c.line, borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.md }, style]}>
      {children}
    </View>
  );
}

type TxtProps = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export function H1({ children, style }: TxtProps) {
  const c = useTheme();
  return <Text accessibilityRole="header" style={[{ color: c.fg, fontSize: 26, fontWeight: "700", lineHeight: 32 }, style]}>{children}</Text>;
}
export function H2({ children, style }: TxtProps) {
  const c = useTheme();
  return <Text accessibilityRole="header" style={[{ color: c.fg, fontSize: 18, fontWeight: "600" }, style]}>{children}</Text>;
}
export function P({ children, style, muted, numberOfLines }: TxtProps & { muted?: boolean }) {
  const c = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ color: muted ? c.muted : c.fg, fontSize: 15, lineHeight: 21 }, style]}>{children}</Text>;
}
export function Tag({ children }: TxtProps) {
  const c = useTheme();
  return <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>{children}</Text>;
}

export function Button({ title, onPress, variant = "primary", disabled, small }: {
  title: string; onPress: () => void | Promise<unknown>; variant?: "primary" | "secondary"; disabled?: boolean; small?: boolean;
}) {
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={async () => {
        setBusy(true);
        try { await onPress(); } finally { setBusy(false); }
      }}
      style={({ pressed }) => ({
        minHeight: small ? 36 : 48, paddingHorizontal: small ? space.md : space.lg, borderRadius: radius.sm, borderWidth: 1,
        alignItems: "center", justifyContent: "center", flexDirection: "row",
        backgroundColor: primary ? c.brand : c.surface, borderColor: primary ? c.brand : c.line,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {busy ? <ActivityIndicator color={primary ? c.brandFg : c.fg} /> : (
        <Text style={{ color: primary ? c.brandFg : c.fg, fontWeight: "600", fontSize: small ? 13 : 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[{ minHeight: 48, borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingHorizontal: space.md, color: c.fg, backgroundColor: c.bg, fontSize: 16 }, props.multiline && { minHeight: 90, paddingTop: space.md, textAlignVertical: "top" }]}
      />
    </View>
  );
}

/** Pick one of a few options (category, install stage, rating). */
export function Choice<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {label && <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
              style={{ minHeight: 36, paddingHorizontal: space.md, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : c.surface }}>
              <Text style={{ color: on ? c.brandFg : c.fg, fontSize: 13, fontWeight: "500" }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Pill({ text, color }: { text: string; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: c.chip, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
      <Text style={{ color: color ?? c.muted, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function PhasePill({ phase }: { phase: DealPhase }) {
  const { t } = useApp();
  const c = useTheme();
  const color = { pledging: c.brand, bidding: c.warn, locked: c.good, expired: c.muted }[phase];
  return <Pill text={t(`phase_${phase}`)} color={color} />;
}

export function Progress({ value, max }: { value: number; max: number }) {
  const c = useTheme();
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }} style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: c.brand, borderRadius: 4 }} />
    </View>
  );
}

export function Message({ code, ok }: { code?: string | null; ok?: string }) {
  const { t } = useApp();
  const c = useTheme();
  if (!code && !ok) return null;
  const text = code ? (t as (k: string) => string)(code) || t("error") : ok;
  return <Text accessibilityLiveRegion="polite" style={{ color: code ? c.warn : c.good, fontSize: 14 }}>{text}</Text>;
}

export function Notice({ children, good }: { children: React.ReactNode; good?: boolean }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: c.chip, borderRadius: radius.sm, padding: space.md }}>
      <Text style={{ color: good ? c.good : c.warn, fontSize: 14 }}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space.sm }, style]}>{children}</View>;
}

export function Loading() {
  const c = useTheme();
  return <View style={{ padding: space.xl }}><ActivityIndicator color={c.brand} /></View>;
}

export const styles = StyleSheet.create({ num: { fontVariant: ["tabular-nums"] } });
