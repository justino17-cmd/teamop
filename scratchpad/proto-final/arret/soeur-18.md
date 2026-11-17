# Sœur 18 : arrêt du 17/11 (12 h 55)
- Args : {"voie":"restes","noms":["planning"],"tours":3,"depuis":4,"arbre":"/home/user/wt-soeur"} (relancer avec les mêmes args ; l'étape interrompue est l'étiquette `restes:5:corriger-restes-3`).
- Étape en cours : 5 « corriger-restes-3 » (tour 3 du Planning, correction des 4 points) — NON finie ; le recontrôle adverse du tour 3 n'est pas commencé. Étape 4 (recontrôle du tour 2) finie : c6e8c657.
- Dernier commit poussé de la voie : b0242463 « travail en cours à l'arrêt » (apercu/prototype-op-gestion.html + sonde restes-planning-3.js) ; décisions du chef notées avant : fa4e849f.
- Déjà fait dans la page : compte des personnes (« N sur M » sans « Non assigné ») et phrase unique `kpiPhrase()` (note + panneau, jours écartés nommés). Contrôles de sauvegarde à 0 ✗ (compilation, syntaxe, tests 835/836/837/1008/2994, secrets).
- Reste à faire : iPad portrait 768–890 px (vue « Carte » hors de vue : les six vues tiennent ou fondu + onglet ramené) ; en-tête 320–420 px (« Rendez-vous en ligne » / « ＋ Nouvelle intervention » sur une ligne chacun) — la règle `.actions:has(> [data-rrouvrir])` a été retirée dans le diff, à revérifier ; rejouer restes-planning-3.js ; livrable restes-planning-tour3.json ; recontrôle ; cocher vus-par-le-chef.
- Rien mis de côté (pas de stash), rien perdu. Temps : ≈ 1 h 10 sur la machine sœur (dont 15 min du tour 3).
