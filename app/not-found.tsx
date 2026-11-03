import Link from "next/link";
import { getT } from "@/lib/lang";

export default function NotFound() {
  const { t } = getT();
  return (
    <div className="card flex flex-col items-start gap-3">
      <h1 className="text-xl font-semibold">{t("not_found")}</h1>
      <Link href="/" className="btn">{t("back")}</Link>
    </div>
  );
}
