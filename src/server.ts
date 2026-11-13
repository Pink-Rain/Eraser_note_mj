/**
 * La partie serveur de l'extension (`/api/extensions/note-mj/serveur/<chemin>`). Eraser lui confie
 * la requête avec `eraser` : le compte qui demande, le chemin et `store` (ses données sur le serveur
 * partagé, portée `extension:note-mj`). Elle n'appelle jamais Google elle-même.
 *
 *   GET    notes        les notes du compte
 *   PUT    notes/<id>   créer ou remplacer une note (nettoyée par `normalizeNote`)
 *   DELETE notes/<id>   l'effacer
 *
 * Réservé au MJ et à l'admin ; chacun ne lit et n'écrit que ses propres notes (clé
 * `note:<compte>:<id>`). Un joueur n'a accès à rien.
 */
import { LIMITS, MAX_STORED, normalizeNote, sortNotes, type Note } from "./model"
import { canTakeNotes } from "./roles"

type Store = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  list(): Promise<Array<{ key: string; value: string; updatedAt: string }>>
}
export type ServerEraser = {
  api: number
  account: { uid: string; displayName: string; role: "admin" | "mj" | "joueur" }
  path: string[]
  store: Store
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } })
const refuse = (message: string, status: number) => json({ error: message }, status)
const prefix = (uid: string) => `note:${uid}:`

async function readBody(request: Request): Promise<unknown> {
  try { return await request.json() } catch { return null }
}

export async function handle(request: Request, eraser: ServerEraser): Promise<Response> {
  if (!canTakeNotes(eraser.account.role)) return refuse("Réservé au MJ.", 403)
  const { uid } = eraser.account
  const [first, id, ...rest] = eraser.path
  if (first !== "notes" || rest.length) return refuse("Adresse inconnue.", 404)
  try {
    if (!id) {
      if (request.method !== "GET") return refuse("Méthode refusée.", 405)
      const own = (await eraser.store.list()).filter((entry) => entry.key.startsWith(prefix(uid)))
      const notes: Note[] = []
      for (const entry of own) {
        try {
          const note = normalizeNote(JSON.parse(entry.value))
          if (note) notes.push(note)
        } catch { /* une note illisible est ignorée, jamais effacée */ }
      }
      return json({ notes: sortNotes(notes) })
    }
    const key = `${prefix(uid)}${id}`
    if (request.method === "PUT") {
      const body = await readBody(request)
      // Trop long : refusé, jamais coupé en silence (la fin de la note se perdrait).
      const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>
      if ((["title", "body", "quote"] as const).some((field) => typeof raw[field] === "string" && (raw[field] as string).length > LIMITS[field])) return refuse("Cette note est trop longue : coupe-la en deux.", 413)
      const note = normalizeNote({ ...raw, id, updatedAt: new Date().toISOString() })
      if (!note) return refuse("Note illisible.", 400)
      const known = await eraser.store.get(key)
      if (known) {
        try { note.createdAt = normalizeNote(JSON.parse(known))?.createdAt ?? note.createdAt } catch { /* garde la date reçue */ }
      }
      const value = JSON.stringify(note)
      if (value.length > MAX_STORED) return refuse("Cette note est trop longue : coupe-la en deux.", 413)
      await eraser.store.set(key, value)
      return json({ note })
    }
    if (request.method === "DELETE") {
      await eraser.store.remove(key)
      return json({ ok: true })
    }
    return refuse("Méthode refusée.", 405)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("UNAVAILABLE")) return refuse("Le serveur partagé ne répond pas : réessaie dans un instant.", 503)
    if (message.includes("TOO_LARGE")) return refuse("Cette note est trop longue : coupe-la en deux.", 413)
    throw error
  }
}

export default { fetch: handle }
