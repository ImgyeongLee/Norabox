import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-6xl font-bold text-moss">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t.notFound.title}</h1>
      <p className="mt-2 muted">{t.notFound.body}</p>
      <Link href="/" className="btn-primary mt-6">
        {t.common.backHome}
      </Link>
    </div>
  );
}
