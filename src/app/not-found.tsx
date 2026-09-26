import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-6xl font-bold text-moss">404</p>
      <h1 className="mt-4 text-2xl font-bold">Nothing here</h1>
      <p className="mt-2 text-lime/60">That room or page doesn&apos;t exist. Check the invite code and try again.</p>
      <Link href="/" className="btn-primary mt-6">
        Back home
      </Link>
    </div>
  );
}
