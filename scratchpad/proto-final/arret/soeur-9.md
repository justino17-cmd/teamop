# Sœur 9 — arrêt propre du 17/11
- Args : {"voie":"retour","depuis":1,"arbre":"/home/user/wt-soeur"} (workflow wf_43c7c0e5-7a4, arrêté par TaskStop).
- Étape en cours : 2/« recontroler » (agent retour:2:recontroler), NON finie : il rejouait les sondes retour-calques.js par profil via retour-tout.sh (processus tués à l'arrêt).
- Dernier commit de la voie : « retour : travail en cours à l'arrêt du 17/11 » (sonde retour-recontrole.js, +9 lignes) ; l'avant-dernier : 8f2b3d3d (recontrôle 1/2, 6 mutations sur 6 tombent).
- Contrôles de sauvegarde tous à 0 ✗ (compiler-pages, verifier-syntaxe, 835, 836, 837, 1008, 2994, verif-secrets).
- Reste : finir les passes retour-calques par profil, consigner le constat adverse, pousser. Reprise : mêmes args avec "depuis":1 (relancer l'étape 2).
- Rien mis de côté (pas de stash), rien perdu hors résultats des sondes en cours. Temps passé : environ 20 minutes.
