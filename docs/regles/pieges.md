# Pièges rencontrés — à ne pas refaire

> Déplacé tel quel de `CLAUDE.md` le 18 novembre 2026 (allègement : chaque session et chaque agent relit `CLAUDE.md` d'office). Rien n'a été réécrit. 


- **Ne jamais figer les données d'un client dans le code.** `REPORT_TEMPLATES`
  portait les ~90 agences d'un seul client et les servait à tous les autres.
  Vidée le 5 septembre 2026.
- **Deux routes de même chemin : la première enregistrée gagne.** `/api/devis/etat`
  était déclarée dans `agent-devis.js` (monté ligne 232) et dans `index.js`
  (ligne 2842) ; la seconde, plus riche, n'a jamais répondu. Panne silencieuse.
- **Vérifier qu'un registre est peuplé avant de bâtir dessus.** `espacesReg` n'est
  alimenté que par une inscription manuelle ; `cnxData` se remplit tout seul à
  chaque connexion. C'est le second qui sert de source de vérité.
- **Le champ de configuration s'appelle `anthropic.cleApi`**, pas `apiKey`.
- **Ne jamais attendre une tâche de fond avec une boucle `until … done`.** Le harnais
  réveille tout seul quand une tâche se termine ; la boucle n'apporte rien et fuit. Le
  7 septembre 2026, six boucles attendaient des conditions devenues impossibles — l'une
  guettait un motif jamais écrit dans un journal, deux surveillaient des fichiers de sortie
  périmés, trois attendaient un fichier `.jamais` que personne ne crée. Jusqu'à 3 h 51
  d'attente pour des résultats déjà reçus.
- ⛔⛔ **UN CORRECTIF LANCÉ EN ARRIÈRE-PLAN AVALE SA PROPRE SORTIE — ET ON CROIT L'AVOIR
  APPLIQUÉ.** Le 22 septembre 2026, deux correctifs de sonde ont été écrits dans une commande
  mise en arrière-plan : leur `print('patch écrit')` n'a jamais été lu, une assertion échouait
  en silence, et l'audit qui suivait dans la MÊME commande tournait sur le fichier d'origine.
  Deux passes complètes (deux fois vingt minutes) ont rendu des chiffres identiques au tour
  précédent — c'est ce qui a fini par trahir la chose. **Un patch se lance au PREMIER PLAN, et
  on relit le fichier (`grep -c` sur un motif du nouveau code) avant de s'en servir.** Le signe
  qui ne trompe pas : deux exécutions censées différer rendent exactement le même total.
  ⚠️ Corollaire : ne jamais enchaîner « je modifie » et « je mesure » dans une seule commande
  de fond — la mesure part que le patch ait réussi ou non.
- ⛔ **ET UNE TRANCHE DE REMPLACEMENT PEUT AVALER CE QU'ON COMPTAIT MODIFIER APRÈS.** Dans le
  même fichier, `p[:d] + neuf + p[fin:]` a supprimé un bloc `const cibles` qui vivait ENTRE les
  deux ancres, et le `replace` censé le réécrire n'a plus rien trouvé. On vérifie donc ce que la
  tranche contient (`assert 'const cibles' in p[d:fin]`) avant de la remplacer.
- ⛔⛔ **UN AGENT DE WORKFLOW EN `isolation: 'worktree'` PART DE `origin/main`, PAS DE LA BRANCHE DE TRAVAIL.** Campagne de test
  du 16-17 octobre 2026 : deux vagues de correcteurs d'OP GESTION et vingt et un lots d'OP MESSAGES ont écrit sur l'ancien `main`
  (`ecc9de23`), justes chacun et en partie à côté de ce que la branche avait déjà. Seul le re-test sur le code FUSIONNÉ l'a montré.
  La consigne d'un correcteur commence donc par `git checkout -b fix/<lot> <branche de travail>`, et il vérifie sa base avant
  d'écrire. Et l'on re-teste toujours le code fusionné, jamais la branche d'un lot.
- ⛔⛔ **DEUX LOTS FUSIONNÉS SANS UN CONFLIT PEUVENT DÉCLARER DEUX FOIS LE MÊME NOM — ET LA PAGE ENTIÈRE MEURT.** Même campagne :
  `phraseNonAjoutes` et `motRetire` déclarés chacun par deux lots dans la même portée du script d'OP MESSAGES. Git a fusionné sans
  rien dire (les lignes étaient loin l'une de l'autre) ; au chargement, SyntaxError, page blanche. Aucun banc ne l'a vu : chacun
  compile SA tranche, et `verifier-syntaxe.js` ne lit que les pages de la racine. `tests/test-2610.js` compile la page source et ce
  que le service sert. Après toute fusion de lots écrits en parallèle : compiler la page ENTIÈRE.
- **Une commande qui dépasse son délai et bascule en arrière-plan reçoit un NOUVEL
  identifiant.** Sa sortie va dans le nouveau fichier ; l'ancien reste figé sur une capture
  partielle. Surveiller l'ancien, c'est attendre pour toujours.
- **`pkill -f <motif>` se tue lui-même** quand le motif figure dans sa propre ligne de
  commande — le reste de la ligne n'est jamais exécuté (code 144). Passer par le PID.
- **Si le serveur MCP `chrome-devtools` ne répond pas au démarrage d'une session, le navigateur
  reste mesurable** : le Chromium de l'image est là (`/opt/pw-browsers/chromium`, testé en
  141.0.7390.37) et Node 22 a un `WebSocket` intégré. On le lance avec
  `--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --remote-debugging-port=<p>`,
  on ouvre une cible par `PUT /json/new?<url>`, et on parle CDP (`Runtime.evaluate` avec
  `awaitPromise:true, returnByValue:true`). Une quarantaine de lignes, aucune dépendance —
  Playwright n'est PAS installé dans cette image, seulement ses navigateurs. Les mêmes règles
  s'appliquent : **bêta uniquement, 127.0.0.1 uniquement.**
- **`FOURNISSEURS_ELAN` (renommée `FOURNISSEURS_3D` le 10 septembre 2026, v621 — le nom mentait) N'EST PAS la faute de `REPORT_TEMPLATES`** — cette
  fiche l'a affirmé du 8 septembre 2026 au matin, à tort, et la phrase a suffi à lancer une
  suppression. Vérifié champ par champ avant de toucher : les cinq entrées (ARMOSA, ENSYSTEX,
  SODIF, MABI, ORCAD) sont les fournisseurs **du métier de la 3D**, entreprises publiques,
  contact nominatif vide partout, adresses génériques (`info-3d@`, `contact@`), notes reprises
  de leurs sites. Aucune donnée propre à ELAN. C'est un pack métier offert au démarrage —
  `REPORT_TEMPLATES` portait les 90 agences d'un client, des données d'exploitation privées.
  Rien à voir.

  Le nom mentait (corrigé en v621). ✅ **Et « le pack part chez TOUTES les entreprises » est
  devenu FAUX sans que cette page le sache** — mesuré au navigateur le 22 septembre 2026, un
  appareil neuf reçoit **0 produit et 0 fournisseur**, avec ou sans métier réglé :
  `PACK_METIER_AUTO` vaut `false` et ferme les trois portes automatiques.

  **La leçon, plus large que ce cas :** un nom n'est pas un contenu. Ouvrir les données avant
  de croire l'étiquette — y compris celle écrite dans ce fichier.
- ⛔⛔ **UN ZÉRO MESURÉ NE PROUVE RIEN TANT QU'ON N'A PAS OUVERT LA PORTE — LA CONTRE-ÉPREUVE
  EST LA MESURE, PAS SON SUPPLÉMENT.** Le 22 septembre 2026, ce `0 produit · 0 fournisseur`
  pouvait vouloir dire « l'aiguillage est bon » comme « la sonde ne regarde rien ». Copie mutée
  avec `PACK_METIER_AUTO=true`, métier « nettoyage », pack du métier à 0 et 0 : **0 produit et
  5 fournisseurs anti-nuisibles arrivaient quand même**. `cataloguePoser` avait été rebranché
  sur `metierPackDe` le 8 septembre ; les deux autres portes lisaient `FOURNISSEURS_3D` en
  direct, et le commentaire de l'une promettait pourtant « la même règle que les deux autres ».
  Inerte tant que le drapeau est fermé — mais ce drapeau existe pour être rebasculé, son propre
  commentaire le dit. **Un défaut derrière un interrupteur est un défaut ; le banc doit jouer
  l'interrupteur OUVERT, sinon il garde le drapeau et pas l'aiguillage** (`test-635`, v716).
- ⚠️ **UN APPAREIL VRAIMENT NEUF NE REÇOIT AUCUNE DÉMONSTRATION — cette page disait le
  contraire.** `seed()` construit bien 160 produits, 5 fournisseurs, 2 box, 2 devis et 2
  factures, et le drapeau `elan_vierge_v1` les efface **tous**, sans condition, au premier
  chargement de l'appareil. Seul le compte de connexion survit. Une entreprise qui découvre
  OP GESTION ouvre donc une application **entièrement vide**. C'est peut-être ce qui est voulu —
  c'est une décision de produit, pas une correction à faire tout seul. Voir `REPRISE.md`.

