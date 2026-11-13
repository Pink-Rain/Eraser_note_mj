/**
 * Le modèle d'une note du MJ, commun à l'affichage et à la partie serveur (aucun import) : le
 * serveur nettoie tout ce qu'il reçoit avec `normalizeNote`, l'affichage suit.
 *
 * Une note est un post-it : un titre, un texte, une couleur, épinglée ou non, rattachée ou non à
 * une campagne, et accrochée ou non à quelque chose d'Eraser (`anchor`) :
 *   - `page`  : une page d'Eraser (adresse, avec `?session=` pour une session) ;
 *   - `index` : une ligne d'un index (créature, item, lieu…), par son identifiant stable ;
 * `quote` garde le texte sélectionné au moment de la prise de note.
 *
 * Ne jamais renommer un champ ni une valeur déjà enregistrés (`kind`, couleurs).
 */
export const NOTE_COLORS = ["jaune", "rose", "bleu", "vert", "gris"] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export type NoteAnchor =
  | { kind: "page"; href: string; label: string }
  | { kind: "index"; href: string; label: string; index: string; rowId: string }

export type Note = {
  id: string
  campaignId: string | null
  /** Le nom de la campagne vu au moment de la note (la campagne garde son nom ailleurs). */
  campaignLabel: string
  title: string
  body: string
  quote: string
  color: NoteColor
  pinned: boolean
  anchor: NoteAnchor | null
  createdAt: string
  updatedAt: string
}

export const LIMITS = { title: 200, body: 12_000, quote: 1_000, label: 200, href: 500 } as const
/** Ce que le serveur partagé accepte pour une valeur (Worker : 20 000 caractères). */
export const MAX_STORED = 19_500

const ID = /^[\w-]{1,80}$/
const ROW_ID = /^[\w:.-]{1,120}$/

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\r\n?/g, "\n").slice(0, max) : "")
const line = (value: unknown, max: number) => text(value, max).replace(/\s+/g, " ").trim()
const date = (value: unknown, fallback: string) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : fallback)
/** Une adresse d'Eraser, jamais une adresse extérieure. */
const href = (value: unknown) => {
  const raw = line(value, LIMITS.href)
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : ""
}

export function normalizeAnchor(value: unknown): NoteAnchor | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const link = href(raw.href)
  const label = line(raw.label, LIMITS.label)
  if (!link) return null
  if (raw.kind === "page") return { kind: "page", href: link, label: label || link }
  if (raw.kind === "index") {
    const index = line(raw.index, 80)
    const rowId = line(raw.rowId, 120)
    if (!ID.test(index) || !ROW_ID.test(rowId)) return null
    return { kind: "index", href: link, label: label || rowId, index, rowId }
  }
  return null
}

/** Une note propre, ou null si elle n'a pas d'identifiant valable. */
export function normalizeNote(value: unknown, now = new Date().toISOString()): Note | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const id = typeof raw.id === "string" ? raw.id.trim() : ""
  if (!ID.test(id)) return null
  const campaignId = typeof raw.campaignId === "string" && ID.test(raw.campaignId.trim()) ? raw.campaignId.trim() : null
  const createdAt = date(raw.createdAt, now)
  return {
    id,
    campaignId,
    campaignLabel: campaignId ? line(raw.campaignLabel, LIMITS.label) : "",
    title: line(raw.title, LIMITS.title),
    body: text(raw.body, LIMITS.body).trimEnd(),
    quote: text(raw.quote, LIMITS.quote).trim(),
    color: NOTE_COLORS.includes(raw.color as NoteColor) ? (raw.color as NoteColor) : "jaune",
    pinned: raw.pinned === true,
    anchor: normalizeAnchor(raw.anchor),
    createdAt,
    updatedAt: date(raw.updatedAt, createdAt),
  }
}

/** Une note sans rien dedans ne s'enregistre pas. */
export const isEmptyNote = (note: Note) => !note.title && !note.body.trim() && !note.quote

/** Les épinglées d'abord, puis les plus récentes. */
export function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
}

/** La campagne d'une adresse d'Eraser (« /campagne/<id>/… »). */
export function campaignOfPath(pathname: string): string | null {
  const match = /^\/campagne\/([^/?#]+)/.exec(pathname)
  if (!match) return null
  const id = decodeURIComponent(match[1])
  return ID.test(id) ? id : null
}

/** Deux adresses désignent-elles la même page (le `?session=` compte, le reste non) ? */
export function samePage(a: string, b: string) {
  const key = (value: string) => {
    const [path, query = ""] = value.split("#")[0].split("?")
    const session = new URLSearchParams(query).get("session")
    return `${path.replace(/\/+$/, "") || "/"}${session ? `?session=${session}` : ""}`
  }
  return key(a) === key(b)
}

/** Le premier morceau lisible d'une note, pour un titre absent. */
export function noteHeading(note: Note) {
  return note.title || note.body.split("\n").find((part) => part.trim())?.trim().slice(0, 80) || (note.quote ? `« ${note.quote.slice(0, 60)} »` : "Note sans titre")
}
