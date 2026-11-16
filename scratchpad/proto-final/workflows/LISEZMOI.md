# Les scripts de workflow du chantier « prototype OP GESTION, version finale »

Rangés ici pour qu'un redémarrage de la machine ne les efface pas (le dossier de la session est temporaire).
Ils se relancent par l'outil Workflow (`scriptPath`), avec les `args` indiqués.

| Script | Ce qu'il fait | Arguments |
|---|---|---|
| `deux-lots.js` | atelier de devis et contrats + menu final : appliquer → relire → corriger → recontrôler | aucun (arbres `/home/user/wt-atelier`, `/home/user/wt-menu`) |
| `refonte-conception.js` | étude, dessins, synthèse des écrans à refaire ; `args:{seul:'mail'}` = étude de la boîte mail seule | arbres `/home/user/wt-c-materiel`, `/home/user/wt-c-vehicules-temps`, `/home/user/wt-c-mail` |
| `mon-entreprise-droits-conception.js` | conception de « Mon entreprise », des droits d'Équipe, d'« Achats et frais » (lecture seule) | aucun ; le résultat (champ `synth.spec`) est à ranger dans `refonte/MON-ENTREPRISE-ET-DROITS.md` |
| `refonte-lot.js` | applique UNE refonte par étapes poussées une à une, puis relecture adverse, corrections, recontrôle | `{cle, arbre, spec, etude, note, etapes:[{nom, quoi}], angles:[[cle, quoi]]}` |

## Les deux lancements de `refonte-lot.js` du 16 novembre (22 h 40)

**Matériel** — `cle:'materiel'`, `arbre:'/home/user/wt-c-materiel'`, `spec:'scratchpad/proto-final/refonte/MATERIEL.md'`,
`etude:'…/materiel-etude.md'`. Étapes = les lots du § 14 de la spécification : (1) lots 0 et 1 — pièces communes, Mon camion ;
(2) lot 2 — Stock, bureau ouvert à Stock ; (3) lots 3 et 4 — Dépôts et camions, Fournisseurs, matériel & produits ;
(4) lots 5 et 6 — voisins, guides, suppressions, recette. Relecteurs : `bureau-ordinateur` (gérant et bureau, mac / windows /
ipad), `technicien-telephone` (Mon camion, puis le gérant au téléphone, puis le diff). Note : le bureau voit Stock et
Fournisseurs ; « Achats et frais » garde son nom avec une phrase ; photo et scan plus tard ; laisser dans « Mon camion » un
emplacement `id="mc-vehicule"` pour l'autre lot.

**Véhicules et Temps de travail** — `cle:'vehtemps'`, `arbre:'/home/user/wt-c-vehicules-temps'`,
`spec:'scratchpad/proto-final/refonte/VEHICULES-TEMPS.md'`, `etude:'…/vehicules-temps-etude.md'`. Étapes : (1) Temps de travail,
§ 4.1 à 4.5 (cadre, Aujourd'hui, Semaine, Mois) ; (2) § 4.6 et 4.7 (journée d'une personne, feuilles, salarié) ;
(3) Véhicules § 3.1 à 3.3 et 3.5 (liste, fiche, feuilles) ; (4) § 3.4 (partie véhicule de « Mon camion », APRÈS fusion du lot
Matériel), § 8 voisins, § 7.3 suppressions, recette. Relecteurs : `gerant-ordinateur`, `salarie-telephone`. Note : les
recommandations du § 11 sont appliquées (bureau, paie non tranchée, un seul geste).

Après un redémarrage : `git log` dit quelles étapes sont déjà poussées (un commit par étape) ; relancer `refonte-lot.js` avec
les seules étapes restantes, après `git worktree add --detach <arbre> HEAD`.
