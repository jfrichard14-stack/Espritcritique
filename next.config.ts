import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `cacheComponents` (le modèle de cache de Next 16) est
   * volontairement laissé désactivé : chaque page de cette
   * application dépend de la session, donc rien n'est
   * mutualisable entre utilisateurs. L'activer imposerait une
   * barrière `Suspense` ou une annotation d'exception à chaque
   * accès aux données, sans gain. Réactivable en une ligne si
   * des pages publiques mutualisables apparaissent.
   */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
