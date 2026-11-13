# Instructions pour les IA travaillant sur Eraser Note MJ

Eraser Note MJ est une extension d'Eraser (dépôt principal : `Pink-Rain/Eraser`). Le contrat des
extensions est décrit dans la section « Extensions » de l'`ARCHITECTURE.md` d'Eraser ; elle
demande l'**API 5**. Identifiant : **`note-mj`** — il nomme son dossier, son adresse
`/extension/note-mj` et ses données (`extension:note-mj`) : ne jamais le renommer.

## Ce qui vit où

- `src/boot.tsx` : `activate(eraser)`, petit. Ne pose rien chez un joueur. Les fenêtres se chargent
  au premier clic (`import()` → `dist/parts/`).
- `src/model.ts` : la note (titre, texte, citation, couleur, épingle, campagne, accroche `page` ou
  `index`) et son nettoyage `normalizeNote`, commun à l'affichage et au serveur (aucun import).
  Ne jamais renommer un champ ni une valeur enregistrés.
- `src/server.ts` (→ `dist/server.mjs`) : `GET notes`, `PUT notes/<id>`, `DELETE notes/<id>`.
  Refuse tout compte qui n'est ni MJ ni admin ; chacun ne voit que ses notes (clé
  `note:<compte>:<id>` dans `extension:note-mj`). Trop long : refusé, jamais coupé en silence.
- `src/roles.ts` : qui peut tenir des notes, commun à l'affichage et au serveur (aucun import).

## Règles

- Les notes du MJ ne sont **jamais** servies à un joueur : le serveur vérifie le rôle à chaque
  requête, l'affichage ne fait que suivre.
- Jamais d'appel à Google : on passe par les API d'Eraser (porte du quota, lectures partagées).
- Rien dans Eraser qui ne serve qu'à cette extension : si un emplacement manque, Eraser ajoute un
  `<ExtensionSlot>` générique, jamais un code qui nomme `note-mj`.
- Le CSS vise `data-eraser-part` / `data-eraser-slot`, jamais les classes d'Eraser.
- Une action d'un clic s'affiche d'abord et s'enregistre ensuite, avec retour en arrière visible
  si le serveur refuse.

## Construire, vérifier, publier

- Copie d'Eraser avec ses dépendances : `ERASER_DIR=/chemin/vers/Eraser` ou `./eraser`.
- `npm run build`, `npm run check`, `npm test`, `npm run pack`.
- Publier : incrémenter `version`, réécrire `RELEASE.md`, pousser sur `main` (le workflow publie
  la Release). Si l'extension a besoin d'un Eraser plus récent, publier Eraser d'abord.
