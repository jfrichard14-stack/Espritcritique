import Link from "next/link";

export function Pied() {
  return (
    <footer className="mt-auto border-t border-bordure">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs text-encre-douce">
        <span>Esprit Critique</span>
        <Link href="/confidentialite" className="hover:text-encre hover:underline">
          Données personnelles
        </Link>
        <Link href="/mentions-legales" className="hover:text-encre hover:underline">
          Mentions légales
        </Link>
      </div>
    </footer>
  );
}
