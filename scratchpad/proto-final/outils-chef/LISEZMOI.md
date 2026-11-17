# Outils du chef de chantier (sauvegarde du 17 novembre 2026)

Ces scripts vivent normalement dans `/home/user/` de la machine de la session chef — hors du dépôt, donc PERDUS si la
machine est rendue. Copie de sauvegarde, à reposer après un redémarrage :
`cp scratchpad/proto-final/outils-chef/*.sh /home/user/ && chmod +x /home/user/*.sh`.

- `pousser-chef.sh` : pousse les commits du chef par un arbre à part (`/home/user/wt-chef`), sans fusionner dans l'arbre principal.
- `noter-soeur.sh <n> <session> '<voie et args>' '<motif de ligne locale à retirer>'` : inscrit une session sœur au tableau.
- `etat-soeur.sh <n> '<état>' […]` : met à jour la colonne « État » d'une sœur (`@H` = l'heure qu'il est).
- `etat-voies.sh`, `guetter-etapes.sh`, `attendre-etape.sh`, `suivi-machine.sh` : relevé des voies lancées ICI (inutiles
  quand tout tourne sur des sœurs).
