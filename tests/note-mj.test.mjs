// La partie serveur et ce qu'elle attend d'Eraser, avec les modules d'Eraser comme à l'exécution.
import assert from "node:assert/strict"
import { after, test } from "node:test"

import { loadEraser, loadOwn, vite } from "./eraser.mjs"

after(() => vite.close())

function fakeEraser({ role = "mj", path = [] } = {}) {
  const data = new Map()
  return {
    api: 5,
    account: { uid: "u1", displayName: "Lou", role },
    path,
    store: {
      get: async (key) => data.get(key) ?? null,
      set: async (key, value) => { data.set(key, value) },
      remove: async (key) => { data.delete(key) },
    },
  }
}

test("un joueur n'a accès à rien", async () => {
  const { handle } = await loadOwn("src/server.ts")
  const response = await handle(new Request("http://x/etat"), fakeEraser({ role: "joueur", path: ["etat"] }))
  assert.equal(response.status, 403)
})

test("le MJ et l'admin lisent l'état", async () => {
  const { handle } = await loadOwn("src/server.ts")
  for (const role of ["mj", "admin"]) {
    const response = await handle(new Request("http://x/etat"), fakeEraser({ role, path: ["etat"] }))
    assert.equal(response.status, 200, role)
  }
})

test("Eraser offre l'API dont l'extension a besoin", async () => {
  const { EXTENSION_API_VERSION } = await loadEraser("/lib/extensions.ts")
  const { eraserExtension } = (await import("../package.json", { with: { type: "json" } })).default
  assert.ok(EXTENSION_API_VERSION >= eraserExtension.api)
})
