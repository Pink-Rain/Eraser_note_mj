/**
 * La partie serveur de l'extension (`/api/extensions/note-mj/serveur/<chemin>`). Eraser lui confie
 * la requête avec `eraser` : le compte qui demande, le chemin, `store` (ses données sur le serveur
 * partagé, portée `extension:note-mj`) et `indexes` (la lecture des index par Eraser). Elle
 * n'appelle jamais Google elle-même.
 *
 *   GET  etat     la version de l'extension et ce que le compte peut faire (MJ et admin)
 *
 * Un joueur n'a accès à rien : les notes du MJ ne lui sont jamais servies.
 */
import { canTakeNotes } from "./roles"

type Store = { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void> }
type IndexSummary = { key: string; title: string; tabs: Array<{ name: string; columns: string[] }> }
type IndexContent = { key: string; title: string; tabs: Array<{ name: string; headers: string[]; rows: string[][] }> }
export type ServerEraser = {
  api: number
  account: { uid: string; displayName: string; role: "admin" | "mj" | "joueur" }
  path: string[]
  store: Store
  indexes?: { list(): Promise<IndexSummary[]>; read(key: string): Promise<IndexContent | null> }
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } })
const refuse = (message: string, status: number) => json({ error: message }, status)

export async function handle(request: Request, eraser: ServerEraser): Promise<Response> {
  if (!canTakeNotes(eraser.account.role)) return refuse("Réservé au MJ.", 403)
  const [first] = eraser.path
  if (first === "etat" && request.method === "GET") return json({ ok: true, role: eraser.account.role })
  return refuse("Adresse inconnue.", 404)
}

export default { fetch: handle }
