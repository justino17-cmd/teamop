# SŒUR 6 : arrêtée (19 novembre 2026)

Voie final-rejeu, familles coque, planning, restes, recontrole, relire.
- Étape 0 (scripts de rejeu) : faite et poussée (final/rejeu-coque.json, 30 constats).
- Étape 1 (`depuis: 1`, rejeu + tri des constats) : interrompue par l'arrêt du chef, workflow wr2nvg973 stoppé.
- Commité à l'arrêt : retouche de sonde planning-gestes.js (le fond « Plan » est remis avant chaque geste de la vue carte : le satellite grisait « Auto / Jour / Nuit »), planning-tout.sh (gestes iphone coupés en deux exécutions), sorties JSON de planning. Aucune mutation laissée, `git diff --stat apercu/` vide.
- Reste : rejouer les 5 familles, trier les 30 constats (sonde périmée → mise à jour dite ; vrai défaut → correction avec mutation : titre de carte à 9 px du bord, aperçu plein écran 794 px dans 390/320, « Dupliquer » absent du menu iPhone, barre du bas de l'espace client), recontrôle par un agent neuf.
- Reprise : même voie, args `{"voie":"final-rejeu","familles":["coque","planning","restes","recontrole","relire"],"depuis":1,"arbre":"/home/user/wt-soeur"}`.
