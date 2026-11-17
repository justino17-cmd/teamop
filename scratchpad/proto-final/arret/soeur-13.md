# Arrêt propre — sœur 13 (17/11, ~12 h 35 machine)
- Args : {"voie":"final-rejeu","familles":["metier","hote"],"jusqua":0,"arbre":"/home/user/wt-soeur"} ; avant elle : voie « restes » compositeur depuis 3, rendue et poussée (c5418d15).
- Étape en cours : « scripts-de-rejeu » (étape 0), NON finie — workflow arrêté (TaskStop) quelques minutes après son lancement ; un travail partiel de `metier-tout.sh` était déjà dans le dépôt (6cd8df45).
- Dernier commit de la voie : celui de ce fichier et son prédécesseur « final-rejeu : travail en cours à l'arrêt » (`campagne/sondes/metier-tout.sh`, 16 lignes ajoutées, syntaxe bash ok ; huit contrôles de sauvegarde à 0 ✗).
- Reste à faire : finir `metier-tout.sh` (boucle sur les fichiers de la famille, table d'arguments, sonde arrivée après coup rejouée), écrire/mesurer le script de la famille « hote », puis les jouer.
- Mis de côté / perdu : rien (pas de stash).
- Temps : ~35 min cette session (recontrôle compositeur 31 min, puis rejeu ~5 min avant l'arrêt).
