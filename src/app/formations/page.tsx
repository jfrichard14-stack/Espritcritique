import { redirect } from "next/navigation";

/** Les formations sont listées sur le tableau de bord. */
export default function PageFormations() {
  redirect("/tableau-de-bord");
}
