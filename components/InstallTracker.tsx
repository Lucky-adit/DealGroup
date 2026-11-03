import { INSTALL_STAGES, type InstallStage } from "@/lib/types";
import type { T } from "@/lib/i18n";

export function InstallTracker({ stage, t }: { stage: InstallStage; t: T }) {
  const idx = INSTALL_STAGES.indexOf(stage);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label={t("install_title")}>
      {INSTALL_STAGES.map((s, i) => (
        <li key={s} className="flex flex-col gap-1">
          <span className={`h-1.5 rounded ${i <= idx ? "bg-good" : "bg-chip"}`} />
          <span className={`text-[10px] leading-tight sm:text-xs ${i <= idx ? "text-fg" : "text-muted"}`}>{t(`stage_${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}
