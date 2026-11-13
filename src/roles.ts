/**
 * Qui peut tenir des notes de MJ. Commun au démarrage et à la partie serveur (aucun import) : le
 * serveur vérifie toujours, l'affichage ne fait que suivre.
 */
export type Role = "admin" | "mj" | "joueur"

export function canTakeNotes(role: Role | string | undefined): boolean {
  return role === "mj" || role === "admin"
}
