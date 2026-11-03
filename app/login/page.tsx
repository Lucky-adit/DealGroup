import { PageHeader } from "@/components/ui";
import { demoLogin } from "@/lib/actions";
import { isDemo } from "@/lib/data";
import { getT } from "@/lib/lang";
import { OtpForm } from "./OtpForm";

export default function LoginPage() {
  const { t } = getT();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageHeader title={t("login_title")} sub={isDemo() ? t("demo_login") : t("login_sub")} />
      <section className="card flex flex-col gap-3">
        {isDemo() ? (
          (["buyer", "seller", "admin"] as const).map((role) => (
            <form key={role} action={demoLogin}>
              <input type="hidden" name="role" value={role} />
              <button className={role === "buyer" ? "btn-primary w-full" : "btn w-full"}>{t(`as_${role}`)}</button>
            </form>
          ))
        ) : (
          <OtpForm labels={{ phone: t("phone"), send: t("send_code"), code: t("code"), verify: t("verify_code"), sent: t("code_sent"), bad_phone: t("bad_phone"), bad_code: t("bad_code"), error: t("error") }} />
        )}
      </section>
    </div>
  );
}
