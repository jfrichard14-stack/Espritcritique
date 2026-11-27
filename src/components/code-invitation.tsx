"use client";

import { useState } from "react";
import { Bouton } from "@/components/ui";

/**
 * Affiche le code d'inscription et permet de le copier.
 * La copie est un confort : le code reste lisible et dictable
 * à l'oral si le presse-papiers n'est pas disponible.
 */
export function CodeInvitation({ code }: { code: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded border border-bordure-forte bg-fond-enfonce px-3 py-1.5
                       font-mono text-lg tracking-[0.2em]">
        {code}
      </code>
      <Bouton type="button" variante="secondaire" onClick={copier}>
        {copie ? "Copié" : "Copier"}
      </Bouton>
    </div>
  );
}
