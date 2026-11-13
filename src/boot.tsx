/**
 * Le démarrage de l'extension (API 5) : `activate(eraser)`, lancé sur chaque ordinateur au
 * premier moment libre. Il reste petit : il pose ce que l'extension ajoute à l'application
 * (`eraser.slots.add`, emplacements de `extensionSlots` dans lib/extensions.ts d'Eraser) et
 * charge ses fenêtres au premier clic (`import()` → dist/parts/).
 *
 * Rien n'est posé pour l'instant : l'ossature attend sa première fonction.
 */
import type { Eraser } from "@/lib/extension-api"

import { canTakeNotes } from "./roles"

export function activate(eraser: Eraser) {
  // Les notes du MJ ne concernent pas les joueurs : rien n'est posé chez eux.
  if (!canTakeNotes(eraser.account.role)) return
}
