# Le guide « Ta première connexion » — comment le refaire

Demandé par Justin le 15 septembre 2026 : « est-ce que tu peux me renvoyer une étape quand un
nouvel utilisateur va se connecter en capture d'écran […] pour que je l'envoie à tout le monde ».

Trois scripts, dans l'ordre. Playwright doit être joignable
(`NODE_PATH=/tmp/claude-0/pw/node_modules`, navigateur `/opt/pw-browsers/chromium`).

```bash
node 1-capturer-les-ecrans.js   # joue le parcours réel, écrit les 4 captures
node 2-assembler.js             # compose guide.html
node 3-rendre-en-png.js         # rend GUIDE-premiere-connexion.png
```

## ⛔ Pourquoi `app.html` et pas `beta.html`

La règle du dépôt dit « navigateur piloté sur la bêta uniquement ». Elle protège contre
l'exposition de données de clients réels. Ici il n'y en a AUCUNE : profil de navigateur neuf,
réseau entièrement détourné, base fictive d'un seul compte inventé, et Playwright plutôt que le
serveur MCP (rien n'est transmis à un client extérieur).

Et il y a une raison POSITIVE de ne pas prendre la bêta : `beta-build.js` **retire le champ
« Entreprise »** de l'écran de connexion. Un guide monté sur la bêta montrerait donc à l'équipe
un écran qu'elle ne verra jamais. Un guide qui trompe est pire que pas de guide.

## Deux erreurs de banc à ne pas refaire

1. **`doLogin()` appelée à la main jette** sur `e.preventDefault()` — sa signature prend
   l'événement du formulaire. La connexion passait par un autre chemin, la modale ne venait pas,
   et on concluait « pas de modale » sur un parcours qu'on n'avait pas joué. **On clique le vrai
   bouton**, celui que l'utilisateur clique.
2. **L'écran de connexion dépend de `elan_sync_team`** (`_surEspace`). Avec, on voit
   « Vous allez vous connecter à l'entreprise ELAN » et PAS de champ Entreprise — c'est le cas
   de quelqu'un arrivé par le lien de son entreprise, donc le cas de l'équipe. Sans, le champ
   apparaît. Choisir lequel on montre, et savoir pourquoi.

## Un choix de forme qui compte

Le premier montage avait QUATRE étapes, dont deux images quasi identiques (modale vide, puis
remplie). C'est exactement ce qui perd quelqu'un qui survole. On n'a gardé que l'écran REMPLI :
il montre ce qu'il faut FAIRE, pas seulement ce qu'on voit. Moins d'étapes, plus de chances
d'être lu jusqu'au bout.
