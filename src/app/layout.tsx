import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Entete } from "@/components/entete";
import { Pied } from "@/components/pied";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Esprit Critique",
    template: "%s · Esprit Critique",
  },
  description:
    "Espace de travail pour les formations en prise de parole, argumentation et esprit critique.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4
                     focus:z-50 focus:rounded focus:bg-fond-eleve focus:px-3 focus:py-2
                     focus:text-sm focus:shadow-carte"
        >
          Aller au contenu
        </a>
        <Suspense fallback={<SquelletteEntete />}>
          <Entete />
        </Suspense>
        {children}
        <Pied />
      </body>
    </html>
  );
}

/** Gabarit d'en-tête affiché le temps que la session soit lue. */
function SquelletteEntete() {
  return (
    <header className="border-b border-bordure bg-fond-eleve">
      <div className="mx-auto flex h-[57px] max-w-5xl items-center px-4">
        <span className="font-semibold tracking-tight">Esprit Critique</span>
      </div>
    </header>
  );
}
