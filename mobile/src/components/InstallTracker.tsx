import { Text, View } from "react-native";
import { INSTALL_STAGES, type InstallStage } from "@shared/types";
import { useApp } from "@/lib/app";
import { space, useTheme } from "@/lib/theme";

export function InstallTracker({ stage }: { stage: InstallStage }) {
  const { t } = useApp();
  const c = useTheme();
  const idx = INSTALL_STAGES.indexOf(stage);
  return (
    <View style={{ flexDirection: "row", gap: space.xs }} accessibilityLabel={`${t("install_title")}: ${t(`stage_${stage}`)}`}>
      {INSTALL_STAGES.map((s, i) => (
        <View key={s} style={{ flex: 1, gap: space.xs }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= idx ? c.good : c.chip }} />
          <Text style={{ fontSize: 10, color: i <= idx ? c.fg : c.muted }} numberOfLines={2}>{t(`stage_${s}`)}</Text>
        </View>
      ))}
    </View>
  );
}
