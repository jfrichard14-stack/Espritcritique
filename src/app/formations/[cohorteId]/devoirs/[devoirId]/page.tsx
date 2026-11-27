import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Carte,
  Etiquette,
  Message,
  Titre,
  Vide,
  dateFr,
  tailleFr,
} from "@/components/ui";
import { FormulaireDepot, FormulaireRetour } from "@/components/formulaires-formations";
import { exigerSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Devoir" };

export default async function PageDevoir({
  params,
}: {
  params: Promise<{ cohorteId: string; devoirId: string }>;
}) {
  const { cohorteId, devoirId } = await params;
  const profil = await exigerSession(`/formations/${cohorteId}/devoirs/${devoirId}`);
  const supabase = await createSupabaseServerClient();

  const { data: devoir } = await supabase
    .from("assignments")
    .select("*, cohorts(id, name, owner_id)")
    .eq("id", devoirId)
    .maybeSingle();

  if (!devoir) notFound();

  const cohorte = devoir.cohorts as { id: string; name: string; owner_id: string } | null;
  const estProprietaire = cohorte?.owner_id === profil.id;
  const echeanceDepassee = devoir.due_at ? new Date(devoir.due_at) < new Date() : false;

  return (
    <main id="contenu" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <nav className="text-sm text-encre-douce">
        <Link href="/tableau-de-bord" className="hover:underline">
          Tableau de bord
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={`/formations/${cohorteId}`} className="hover:underline">
          {cohorte?.name}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{devoir.title}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Titre>{devoir.title}</Titre>
        {!devoir.published_at && <Etiquette ton="alerte">Brouillon</Etiquette>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-encre-douce">
        {devoir.due_at ? (
          <span>
            Échéance : {dateFr(devoir.due_at, true)}
            {echeanceDepassee && " — dépassée"}
          </span>
        ) : (
          <span>Sans échéance</span>
        )}
        {echeanceDepassee && !devoir.late_allowed && (
          <Etiquette ton="danger">Dépôts tardifs refusés</Etiquette>
        )}
      </div>

      {devoir.instructions && (
        <Carte className="mt-6 p-5">
          <Titre niveau={3}>Consignes</Titre>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {devoir.instructions}
          </div>
        </Carte>
      )}

      {estProprietaire ? (
        <DepotsRecus devoirId={devoirId} />
      ) : (
        <MonDepot
          devoirId={devoirId}
          accepteTexte={devoir.accepts_text}
          accepteFichier={devoir.accepts_file}
          depotBloque={echeanceDepassee && !devoir.late_allowed}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------
   Côté étudiant
   ------------------------------------------------------------ */

async function MonDepot({
  devoirId,
  accepteTexte,
  accepteFichier,
  depotBloque,
}: {
  devoirId: string;
  accepteTexte: boolean;
  accepteFichier: boolean;
  depotBloque: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: depot } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", devoirId)
    .maybeSingle();

  return (
    <div className="mt-8 space-y-6">
      {depot?.feedback && (
        <Carte className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Titre niveau={3}>Retour du formateur</Titre>
            <span className="text-xs text-encre-tres-douce">
              {dateFr(depot.feedback_at, true)}
            </span>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {depot.feedback}
          </div>
        </Carte>
      )}

      {depot?.submitted_at && (
        <Message ton="succes">
          Production remise le {dateFr(depot.submitted_at, true)}.
          {depot.storage_path && (
            <>
              {" "}
              <a
                href={`/telecharger?c=submissions&p=${encodeURIComponent(depot.storage_path)}`}
                className="underline"
              >
                Télécharger le fichier envoyé ({depot.file_name})
              </a>
            </>
          )}
        </Message>
      )}

      {depotBloque ? (
        <Message ton="danger" titre="Dépôt fermé">
          L&apos;échéance est dépassée et ce devoir n&apos;accepte pas les
          dépôts tardifs.
        </Message>
      ) : (
        <Carte className="p-5">
          <Titre niveau={2}>
            {depot?.submitted_at ? "Modifier votre production" : "Déposer votre production"}
          </Titre>
          <div className="mt-4">
            <FormulaireDepot
              devoirId={devoirId}
              accepteTexte={accepteTexte}
              accepteFichier={accepteFichier}
              texteInitial={depot?.body ?? ""}
              dejaRemis={Boolean(depot?.submitted_at)}
            />
          </div>
        </Carte>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   Côté formateur
   ------------------------------------------------------------ */

async function DepotsRecus({ devoirId }: { devoirId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: depots } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_profile_id_fkey(full_name)")
    .eq("assignment_id", devoirId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true });

  return (
    <section className="mt-8">
      <Titre niveau={2}>
        Productions remises{" "}
        <span className="font-normal text-encre-douce">({depots?.length ?? 0})</span>
      </Titre>

      {!depots || depots.length === 0 ? (
        <div className="mt-3">
          <Vide titre="Aucune production remise">
            Les brouillons des étudiants ne sont pas visibles ici : seules les
            productions effectivement remises apparaissent.
          </Vide>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {depots.map((depot) => (
            <li key={depot.id}>
              <Carte className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Titre niveau={2} className="text-base">
                    {(depot.profiles as { full_name: string } | null)?.full_name || "Sans nom"}
                  </Titre>
                  <span className="text-xs text-encre-tres-douce">
                    remis le {dateFr(depot.submitted_at, true)}
                  </span>
                  {depot.feedback ? (
                    <Etiquette ton="succes">Corrigé</Etiquette>
                  ) : (
                    <Etiquette ton="alerte">À corriger</Etiquette>
                  )}
                </div>

                {depot.body && (
                  <div className="mt-3 rounded-md border border-bordure bg-fond-enfonce p-3.5">
                    <div className="stimulus whitespace-pre-wrap">{depot.body}</div>
                  </div>
                )}

                {depot.storage_path && (
                  <p className="mt-3 text-sm">
                    <a
                      href={`/telecharger?c=submissions&p=${encodeURIComponent(depot.storage_path)}`}
                      className="text-accent-encre underline"
                    >
                      {depot.file_name}
                    </a>{" "}
                    <span className="text-xs text-encre-tres-douce">
                      ({tailleFr(depot.size_bytes)})
                    </span>
                  </p>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {depot.feedback ? "Modifier le retour" : "Écrire un retour"}
                  </summary>
                  <div className="mt-3">
                    <FormulaireRetour depotId={depot.id} retourInitial={depot.feedback ?? ""} />
                  </div>
                </details>
              </Carte>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
