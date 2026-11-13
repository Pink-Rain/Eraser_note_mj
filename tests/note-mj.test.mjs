// Le modèle des notes, la partie serveur et ce qu'elle attend d'Eraser, avec les modules d'Eraser
// comme à l'exécution.
import assert from "node:assert/strict"
import { after, test } from "node:test"

import { loadEraser, loadOwn, vite } from "./eraser.mjs"

after(() => vite.close())

function fakeEraser({ role = "mj", uid = "u1", path = [], data = new Map() } = {}) {
  return {
    data,
    eraser: {
      api: 5,
      account: { uid, displayName: "Lou", role },
      path,
      store: {
        get: async (key) => data.get(key) ?? null,
        set: async (key, value) => { data.set(key, value) },
        remove: async (key) => { data.delete(key) },
        list: async () => [...data].map(([key, value]) => ({ key, value, updatedAt: "" })),
      },
    },
  }
}
const put = (body) => new Request("http://x", { method: "PUT", body: JSON.stringify(body) })

test("une note abîmée est nettoyée ; une adresse extérieure n'est jamais gardée", async () => {
  const { normalizeNote } = await loadOwn("src/model.ts")
  assert.equal(normalizeNote({ title: "sans id" }), null)
  const note = normalizeNote({ id: "n1", title: "  Le   traître  ", color: "violet", pinned: "oui", anchor: { kind: "page", href: "https://ailleurs.fr" } })
  assert.equal(note.title, "Le traître")
  assert.equal(note.color, "jaune")
  assert.equal(note.pinned, false)
  assert.equal(note.anchor, null)
  const row = normalizeNote({ id: "n2", anchor: { kind: "index", href: "/reference/creatures/CRE-3F9A1C2B", index: "creatures", rowId: "CRE-3F9A1C2B", label: "Goule" } })
  assert.deepEqual(row.anchor, { kind: "index", href: "/reference/creatures/CRE-3F9A1C2B", label: "Goule", index: "creatures", rowId: "CRE-3F9A1C2B" })
})

test("campagne d'une adresse, même page avec ou sans détour", async () => {
  const { campaignOfPath, samePage } = await loadOwn("src/model.ts")
  assert.equal(campaignOfPath("/campagne/3f2a-b1/pnjs"), "3f2a-b1")
  assert.equal(campaignOfPath("/ressources/index"), null)
  assert.ok(samePage("/campagne/a/lieux-et-rencontres?session=s1&x=2", "/campagne/a/lieux-et-rencontres/?session=s1"))
  assert.ok(!samePage("/campagne/a/lieux-et-rencontres?session=s1", "/campagne/a/lieux-et-rencontres?session=s2"))
})

test("un joueur n'a accès à rien", async () => {
  const { handle } = await loadOwn("src/server.ts")
  const { eraser } = fakeEraser({ role: "joueur", path: ["notes"] })
  assert.equal((await handle(new Request("http://x"), eraser)).status, 403)
})

test("chacun ne lit que ses propres notes ; la date de création est gardée", async () => {
  const { handle } = await loadOwn("src/server.ts")
  const data = new Map()
  const mj = (path, uid = "u1") => fakeEraser({ uid, path, data }).eraser
  assert.equal((await handle(put({ title: "Secret", createdAt: "2026-01-01T00:00:00.000Z" }), mj(["notes", "n1"]))).status, 200)
  assert.equal((await handle(put({ title: "À l'autre" }), mj(["notes", "n2"], "u2"))).status, 200)
  await handle(put({ title: "Secret bis", createdAt: "2030-01-01T00:00:00.000Z" }), mj(["notes", "n1"]))
  const { notes } = await (await handle(new Request("http://x"), mj(["notes"]))).json()
  assert.deepEqual(notes.map((note) => note.title), ["Secret bis"])
  assert.equal(notes[0].createdAt, "2026-01-01T00:00:00.000Z")
  assert.equal((await handle(new Request("http://x", { method: "DELETE" }), mj(["notes", "n1"]))).status, 200)
  assert.equal(data.has("note:u1:n1"), false)
  assert.equal(data.has("note:u2:n2"), true)
})

test("une note trop longue pour le serveur partagé est refusée", async () => {
  const { handle } = await loadOwn("src/server.ts")
  const { eraser, data } = fakeEraser({ path: ["notes", "n1"] })
  assert.equal((await handle(put({ body: "a".repeat(12_001) }), eraser)).status, 413)
  // Dans les limites, mais trop gros une fois écrit (guillemets échappés) : refusé aussi.
  assert.equal((await handle(put({ body: "\"".repeat(10_000) }), eraser)).status, 413)
  assert.equal(data.size, 0)
})

test("Eraser offre l'API dont l'extension a besoin", async () => {
  const { EXTENSION_API_VERSION } = await loadEraser("/lib/extensions.ts")
  const { eraserExtension } = (await import("../package.json", { with: { type: "json" } })).default
  assert.ok(EXTENSION_API_VERSION >= eraserExtension.api)
})
