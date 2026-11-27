import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ============================================================
   Primitives d'interface.

   Regroupées dans un seul fichier à dessein : l'ensemble est
   petit, et le chercher à un seul endroit vaut mieux qu'une
   arborescence de fichiers d'une vingtaine de lignes.
   ============================================================ */

type Variante = "principal" | "secondaire" | "discret" | "danger";

const VARIANTES: Record<Variante, string> = {
  principal:
    "bg-accent text-white hover:bg-accent-encre border border-transparent",
  secondaire:
    "bg-fond-eleve text-encre border border-bordure-forte hover:bg-fond-enfonce",
  discret:
    "bg-transparent text-encre-douce border border-transparent hover:bg-fond-enfonce hover:text-encre",
  danger:
    "bg-transparent text-danger border border-bordure hover:bg-danger-faible",
};

const BASE_BOUTON =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium " +
  "transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={`${BASE_BOUTON} ${VARIANTES[variante]} ${className}`}
    />
  );
}

export function LienBouton({
  variante = "secondaire",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link
      {...props}
      className={`${BASE_BOUTON} ${VARIANTES[variante]} ${className}`}
    />
  );
}

export function Carte({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-bordure bg-fond-eleve shadow-carte ${className}`}
    >
      {children}
    </div>
  );
}

export function Titre({
  niveau = 1,
  children,
  className = "",
}: {
  niveau?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const tailles = {
    1: "text-2xl font-semibold tracking-tight",
    2: "text-lg font-semibold tracking-tight",
    3: "text-sm font-semibold uppercase tracking-wide text-encre-douce",
  };
  const Balise = `h${niveau}` as "h1" | "h2" | "h3";
  return <Balise className={`${tailles[niveau]} ${className}`}>{children}</Balise>;
}

export function Champ({
  label,
  aide,
  erreur,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  aide?: string;
  erreur?: string;
}) {
  const id = props.id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {props.required && <span className="text-danger"> *</span>}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={aide ? `${id}-aide` : undefined}
        aria-invalid={erreur ? true : undefined}
        className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2
                   text-sm placeholder:text-encre-tres-douce"
      />
      {aide && (
        <p id={`${id}-aide`} className="text-xs text-encre-douce">
          {aide}
        </p>
      )}
      {erreur && <p className="text-xs text-danger">{erreur}</p>}
    </div>
  );
}

export function ZoneTexte({
  label,
  aide,
  ...props
}: ComponentProps<"textarea"> & { label: string; aide?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {props.required && <span className="text-danger"> *</span>}
      </label>
      <textarea
        {...props}
        id={id}
        className="w-full rounded-md border border-bordure-forte bg-fond-eleve px-3 py-2
                   text-sm placeholder:text-encre-tres-douce"
      />
      {aide && <p className="text-xs text-encre-douce">{aide}</p>}
    </div>
  );
}

type TonMessage = "info" | "succes" | "alerte" | "danger";

const TONS: Record<TonMessage, string> = {
  info: "border-bordure bg-accent-faible text-encre",
  succes: "border-succes/30 bg-succes-faible text-encre",
  alerte: "border-alerte/30 bg-alerte-faible text-encre",
  danger: "border-danger/30 bg-danger-faible text-encre",
};

export function Message({
  ton = "info",
  titre,
  children,
}: {
  ton?: TonMessage;
  titre?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-md border px-3.5 py-3 text-sm ${TONS[ton]}`} role="status">
      {titre && <p className="font-medium">{titre}</p>}
      {children && <div className={titre ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function Etiquette({
  ton = "neutre",
  children,
}: {
  ton?: "neutre" | "accent" | "succes" | "alerte" | "danger";
  children: ReactNode;
}) {
  const tons = {
    neutre: "bg-fond-enfonce text-encre-douce border-bordure",
    accent: "bg-accent-faible text-accent-encre border-accent/25",
    succes: "bg-succes-faible text-succes border-succes/25",
    alerte: "bg-alerte-faible text-alerte border-alerte/25",
    danger: "bg-danger-faible text-danger border-danger/25",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${tons[ton]}`}
    >
      {children}
    </span>
  );
}

export function Vide({
  titre,
  children,
}: {
  titre: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-bordure-forte px-6 py-10 text-center">
      <p className="text-sm font-medium">{titre}</p>
      {children && <div className="mt-2 text-sm text-encre-douce">{children}</div>}
    </div>
  );
}

/** Formate une date en français, sans dépendance externe. */
export function dateFr(valeur: string | null | undefined, avecHeure = false): string {
  if (!valeur) return "—";
  const d = new Date(valeur);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(avecHeure ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Taille de fichier lisible. */
export function tailleFr(octets: number | null | undefined): string {
  if (octets == null) return "—";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
