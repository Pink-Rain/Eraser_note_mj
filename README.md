# Eraser Note MJ

Extension d'[Eraser](https://github.com/Pink-Rain/Eraser) : les notes du MJ.

> **État : ossature.** L'extension se construit, se teste et se publie ; ses fonctions arrivent.

## Comment l'extension se branche sur Eraser

- C'est une extension de l'**API 5** d'Eraser : un module de démarrage (`boot`, `activate(eraser)`)
  et une partie serveur (`/api/extensions/note-mj/serveur/…`).
- Réservée au **MJ** et à l'**administrateur** : un joueur ne voit rien et le serveur lui refuse tout.
- Ses données sont gardées sur le serveur partagé, dans la portée `extension:note-mj`. Elle n'appelle
  jamais Google elle-même.

## Publier

Comme les autres extensions d'Eraser : une Release GitHub qui joint `eraser-extension.json` et
`eraser-extension.pack.gz`, fabriqués par `scripts/pack-extension.mjs`. Eraser d'abord quand
l'extension dépend d'un changement d'Eraser, puis l'extension.
