# Une session sœur : une voie du chantier sur une AUTRE machine

Écrit le 17 novembre 2026 à 11 h 35 (machine). Justin : « Tu peux pas mettre plus d'agent pour aller plus vite ? ». Sur la machine
du chef de chantier, non : quatre cœurs, et vingt-quatre agents font la queue pour les navigateurs. Une session sœur (outil
`create_session` du serveur `claude-code-remote`) a SA machine : c'est le seul moyen d'aller vraiment plus vite.

## Ce que fait une session sœur

Elle joue UNE voie de `voies.js` (mêmes consignes, mêmes agents en Sonnet, mêmes sauvegardes toutes les 20 minutes), pousse sur
`claude/op-gestion-interface-yb6p32`, puis rend compte à la session chef (`session_01Cw6RN2Nf56UygsM6AYoN1P`) par `send_message`.

1. `cd /home/user/teamop && git fetch origin claude/op-gestion-interface-yb6p32 && git merge -m "Fusion de la branche [skip ci]" FETCH_HEAD`
2. `mkdir -p /tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap` (le dossier de captures que les
   consignes citent ; hors dépôt) ; `git worktree add --detach /home/user/wt-soeur HEAD` (l'arbre de la voie ; un second arbre
   `/home/user/wt-soeur-2` si elle joue deux voies).
3. Lancer la voie par l'outil **Workflow** : `scriptPath: "scratchpad/proto-final/workflows/voies.js"`, `args` = ceux qu'on lui a
   donnés (toujours avec `"arbre": "/home/user/wt-soeur"`). C'est la demande de Justin (plusieurs agents, par workflow).
   Si l'outil Workflow n'est pas ouvert à la session : la consigne complète de chaque étape s'imprime par
   `node scratchpad/proto-final/workflows/consigne.js '<args en JSON>'` ; la session joue alors les étapes UNE À UNE, chacune
   par un sous-agent (outil Agent, type `general-purpose`, modèle `sonnet`) à qui elle passe la consigne telle quelle.
4. Pas de boucle d'attente : la fin du workflow prévient. Après un redémarrage de la machine ou un échec : relancer avec les mêmes
   args plus `"depuis"` (la dernière étiquette `voie:N:nom` du journal dit l'étape N interrompue : `depuis` = N − 1).
5. À la fin : tout est poussé (`git -C /home/user/wt-soeur status --short` vide, rien en avance sur `origin`), puis UN message à la
   session chef qui commence par « SŒUR <nom> : » — la voie et ses args, les fichiers rendus, les chiffres, ce qui reste ouvert.
6. Puis elle s'arrête. La session chef peut lui envoyer « VOIE SUIVANTE : <args> » : elle la joue de la même façon.

## Ses règles

Français partout. Elle ne pousse que sur `claude/op-gestion-interface-yb6p32` : jamais `main`, jamais de poussée forcée, jamais de
demande de fusion. Jamais `git add -A`. Elle ne touche ni à `app.html`, `beta.html`, `sw.js`, `server/`, `opcourrier.js`, ni à
`REPRISE.md`, `CLAUDE.md`, `VOIES-EN-COURS.md` (tenus par le chef). Navigateur sur 127.0.0.1 seulement. Elle n'écrit pas à Justin
et ne lui demande rien : elle rend compte à la session chef. Elle ne crée ni session, ni tâche planifiée, ni artefact.

## Côté chef de chantier

`create_session` : `source_url` https://github.com/justino17-cmd/teamop, `source_revision` et `outcome_branch`
`claude/op-gestion-interface-yb6p32`, `model` `claude-sonnet-5-5`, `effort` `high`, `clone_depth` 500, un `title` qui dit la voie.
Suivre : `list_sessions {children:true}`, `get_session`, `list_events {kinds:["assistant","result"]}`. Noter chaque sœur (identifiant,
voie, args) dans `VOIES-EN-COURS.md`. ⚠️ Le forfait de Justin était en alerte de limite hebdomadaire le 17 novembre à 11 h 30
(`rate_limit_info.status: allowed_warning`, remise à zéro le 18 vers 21 h, heure de la machine) : le lui avoir dit.
