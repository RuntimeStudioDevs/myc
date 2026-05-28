import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">MYC</h1>
      <Link
        href="/login"
        className="rounded bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Iniciar sesion
      </Link>
    </main>
  );
}
