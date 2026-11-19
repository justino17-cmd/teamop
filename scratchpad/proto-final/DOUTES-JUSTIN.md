# Ce que tu dois trancher sur le prototype OP GESTION

Compilé le 19 novembre 2026 à partir des comptes rendus de la nuit. Écrans validés par toi (Accueil, Planning, Absences, Interventions, Clients, Devis, Comptabilité, Équipe) : on n'y touche pas sans ton mot ; les doutes qui les concernent sont des « si tu veux ». Chaque ligne : la question, les choix, et ma recommandation entre parenthèses quand les comptes rendus en donnent une. La source est en fin de ligne, en `code`.

**TOTAL : 97 doutes** (le décompte par écran est en bas du fichier).

---

## 1. Comptabilité (en premier)

1. **A ou B : une seule comptabilité, ou deux ?** La Comptabilité d'OP GESTION et la fenêtre « OP COMPTABLE » ne disent pas les mêmes chiffres pour octobre (TVA déductible 320 € contre 4 313 €, crédit de TVA 837 € contre 3 830 €, paie 24 593 € contre 26 734 €, banque, fournisseurs). Cause : la fenêtre garde ses propres chiffres d'exemple.
   **A** = une seule comptabilité complète (la fenêtre lit les achats, la banque et la paie d'OP GESTION) : juste, mais gros chantier, et ça change le semis que tu as validé. **B** = la fenêtre reste une comptabilité d'exemple plus riche, et on écrit « chiffres d'exemple » sur ses tuiles banque, fournisseurs, TVA et paie : petit, réversible. (Recommandation : B pour le prototype, A seulement pour la vraie application.) `final/restes-compta-coherence.json`, `…-recontrole.json`
2. **Arrondi de la TVA : par paiement ou par taux ?** Les deux côtés arrondissent différemment : 1 centime d'écart sur les ventes d'octobre (479,16 contre 479,17). À fixer en même temps que le 1. (Recommandation : par taux, comme le fait la facture.) `final/restes-compta-coherence-recontrole.json`
3. **L'argent reçu sur place par un technicien compte-t-il dans la caisse du bureau ?** Aujourd'hui oui (40 € d'espèces entrent dans « argent en banque et caisse » alors qu'ils sont chez le technicien). Options : on garde ; ou une caisse « chez le technicien » à part. (Recommandation : garder pour le prototype, la caisse à part vient avec le choix A.) `final/restes-compta-coherence-2-recontrole.json`
4. **Texte du crédit de TVA : à faire relire par l'expert-comptable.** « L'État te doit 3 830 € » laisse croire à un virement automatique ; la règle est le report sur la déclaration suivante, remboursement sur demande. Autre point : l'écran de l'hôte écrit « à payer −837 € » quand les achats dépassent les ventes. (Recommandation : adoucir « te doit » et faire valider la phrase.) `final/restes-compta-coherence-2-recontrole.json`
5. **Asymétrie des remboursements.** Facture payée à moitié puis annulée : une tâche « Rembourser 500 € » est créée. Facture payée en entier puis annulée : aucune tâche, seulement la note « le remboursement se note à part ». Options : même tâche dans les deux cas ; ou garder (un avoir peut aussi se déduire de la facture suivante). `final/restes-compta-ventes-tour2.json#8`
6. **« OP COMPTABLE » ou « Comptabilité » ?** La fenêtre s'appelle OP COMPTABLE, le menu dit Comptabilité. Un seul nom partout, lequel ? `final/restes-compta-ventes-tour2.json#10`
7. **« Paiement en ligne » montre des factures d'exemple.** L'onglet dit « Exemples » mais n'est pas relié aux vraies factures d'OP GESTION (chantier de la taille du module). Options : relier maintenant ; laisser « Exemples » pour le prototype. `final/restes-compta-ventes-tour1.json#10`
8. **Les droits ferment-ils aussi le livre de comptes ?** Une personne sans « Ventes › Voir » voit encore l'onglet Ventes de la Comptabilité, et les numéros de facture (FAC-…) apparaissent dans Paiements et Banque sans ce droit. Options : une case par rubrique (comme aujourd'hui) ; ou la case Ventes ferme aussi ces vues. `final/parcours.json#defauts/9`
9. **Le solde bancaire du journal et du grand livre reste hors de la double authentification.** Faut-il le protéger comme les autres écrans sensibles ?
10. **Un ticket de carte photographié reste « sans justificatif »** et la TVA n'est récupérée que quand la facture est ajoutée. Bon mot ? (Recommandation : garder la règle, changer le mot en « ticket sans facture ».) `final/parcours.json#defauts/11`
11. **Un prix à trois décimales est accepté sur une facture** (la commande l'affiche tel quel). Refuser ou accepter ? Et la commande fournisseur : champ « Prix HT » à côté de la quantité, total de ligne non arrondi. `final/restes-compta-ventes-tour6.json#5`, `…tour4.json#3`
12. **Tarif au kilomètre : 0,603 €/km à 3 décimales.** On garde 3 décimales (barème officiel) ou on arrondit à 2 ? « 0,60 € par kilomètre » écrit avec le mot est aujourd'hui refusé avec « Indique un tarif, par exemple 0,60 ». `final/restes-achats-tour3.json#9`

## 2. Accueil, Interventions, Planning, Tâches

13. **Accueil : « À faire maintenant » = 16 à 17 lignes de même poids.** Piste du testeur : 6 lignes triées « En retard » d'abord, puis « Voir les 11 autres ». (Recommandation : l'essayer si tu trouves l'écran chargé.) `campagne/accueil-corrections.json#accueil-07`
14. **Accueil : les chiffres des Statistiques d'un mois d'avant octobre sont fabriqués par le prototype.** Les garder (démo) ou les masquer ? `final/restes-accueil-tour1.json#7`
15. **Un paiement par carte ou virement noté sur place doit-il apparaître « reçu sur place » dans l'Historique ?** Aujourd'hui seuls les espèces y sont. `final/restes-accueil-tour2.json#3`
16. **Facture déjà payée en entier, et le technicien note des espèces en plus :** rien n'est compté (voulu), mais le bureau n'est pas prévenu d'un possible double paiement. Une alerte, une tâche, ou rien ? `final/restes-accueil-tour4.json#5`
17. **Bilan en PDF avec un montant de 7 chiffres (1 234 567 €) à 320 px :** la tuile déborde. Cas irréaliste ici : à corriger quand même ? `final/restes-accueil-tour4.json#3`
18. **Numéro de téléphone : la règle des 20 chiffres.** Un numéro « +33 (0)5 … » fait 22 caractères et est refusé. Accepter jusqu'à 22 (ou normaliser) ? (Recommandation : accepter les numéros avec +33 et (0).) `final/restes-interventions-tour2.json#3`, `…entreprise-tour4.json#3`
19. **Durée : « 1 h 30 » (avec espaces) ou « 1h30 » (collé) ?** La règle écrite dit collé, l'écran écrit avec espaces, 34 endroits la lisent. `final/restes-interventions-tour2.json#4`
20. **Limites de vraisemblance d'un relevé :** « 1200 » est accepté comme température de soufflage en °C. Poser un plafond (par grandeur) ? Et « 1.200,5 » est refusé alors que c'est un nombre à la française. `final/restes-interventions-tour5-recontrole.json`
21. **Registre biocide sur une intervention annulée :** la fiche annulée propose encore des gestes (Terminer, etc.). Verrouiller une intervention annulée ? (Recommandation : oui, aucun geste d'écriture.) `final/parcours-recontrole.json#nouveaux`
22. **Planning : les chiffres du bandeau comptent toute l'équipe même quand des personnes sont masquées** (« 9 interventions » pour 6 cartes). (Recommandation : suivre les personnes affichées et l'écrire : « Chiffres des personnes affichées ».) `final/restes-planning-tour1.json#7`
23. **Planning : une option « libre sous 48 h » tenue par un collègue reste dessinée sur le créneau choisi** après confirmation. La retirer ? `final/restes-entreprise-tour5.json#7`
24. **Pastille du menu Tâches : « 1 » quand l'écran dit « Aujourd'hui 7 · En retard 2 ».** Le chiffre est juste (ce qui demande une action) mais jamais expliqué. (Recommandation : « 1 à régler ».) `final/restes-taches-absences-tour1.json#11`
25. **Absences : abréviation « 3 jours dispo. »** coupée à 320 px dans le champ Type. Abréger ou écrire en entier sur deux lignes ? `final/regard-technicien-a-recontrole.json`

## 3. Clients et espace client

26. **Retirer le premier appareil d'un client :** les fiches d'intervention et comptes rendus lisent toujours « le premier ». Autoriser et réordonner, ou interdire de retirer le premier ? `final/restes-clients-tour3.json#4`
27. **La saisie rapide d'une tâche peut rattacher un client archivé** (« Relancer Mme X »). Garder ? `final/restes-clients-tour3.json#7`
28. **« Se déconnecter » avec une saisie non enregistrée dans Infos :** prévenir ou non ? À jouer sur un vrai appareil. `final/restes-clients-tour3.json#6`
29. **Suggestions d'adresse à 320 px :** 3 propositions sur 5 visibles. À confirmer sur un vrai téléphone. `final/restes-clients-tour3.json#5`
30. **Trois façons de nommer l'appel d'une copropriété** (« Appeler le syndic », « Prévenir la copropriété », « Appeler la copropriété : facture… »). Un seul verbe ? `final/restes-client-tour3.json#3`
31. **Espace client : la carte « Votre demande est envoyée » disparaît** quand le bureau a fait « Proposer un contrat » sans créer de contrat : le client revoit « Demander un contrat ». Garder la règle ? `final/restes-client-tour3.json#5`
32. **Formule de politesse :** « Bonjour M. Pierre Delmas » (nom complet) ou « Bonjour M. Delmas » ? Et pour un organisme dont l'adresse ne porte pas le nom (Pôle Emploi écrivant de francetravail.fr) : « Bonjour Pôle Emploi » ? `final/restes-client-tour3.json#6, #7`
33. **« M. et Mme Durand » est coupé à 320 px dans l'onglet Factures** (tableau trop large). Empiler l'état sous le numéro sur petit téléphone ? `final/regard-bureau-a-recontrole.json`
34. **Menu de l'espace client affichant le compte du gérant qui teste** (« Mon compte · Se déconnecter ») : bloc de la session de revue, à confirmer comme normal. `final/restes-client-tour2.json#3`

## 4. Devis, contrats et atelier

35. **Un devis ou un contrat composé dans l'atelier ne crée rien dans OP GESTION** (ni intervention à planifier, ni facture d'acompte, ni contrat, ni visites). Relier, ou laisser l'atelier comme éditeur de documents ? (Recommandation : relier, sinon l'utilisateur recopie à la main.) `final/restes-devis-atelier-tour2.json#3`
36. **Deux devis, deux jeux de conditions :** devis rapide (10 jours, acompte 0) contre devis composé (3 semaines, acompte 30 %). Une valeur unique : laquelle ? `final/restes-devis-atelier-tour2.json#3`
37. **Le mot « exemple » est retiré des boutons de l'atelier.** Reste ailleurs dans OP GESTION (« Lien copié (exemple) », « Plan du client (exemple) », numéro d'AMM du stock, IBAN et QR du paiement). Le retirer partout ? `final/restes-devis-atelier-tour2.json#5`
38. **« Créer avec l'IA » : seulement dans « Documents sur mesure »** ou aussi dans les compositeurs de devis et de contrat ? `final/restes-devis-atelier-tour2.json`
39. **Signature d'un devis : seuil de validité du tracé** (40 unités sur 600, cumulées) : un petit trait valide la signature. Durcir ? `final/restes-devis-atelier-tour2.json#4`
40. **Compositeur au téléphone :** l'aperçu s'ouvre à 100 % (lisible, la page glisse de côté) ou la page entière à 45 % (texte de 5 px) ? (Recommandation : garder 100 %.) `final/restes-compositeur-tour1.json#8`
41. **Fiche facture : désignation d'une ligne tassée sur téléphone** (colonne de 95 px, quatre lignes). Empiler la désignation au-dessus des prix ? `final/regard-gerant-b.json`
42. **Une personne « Voir + Créer » (sans Modifier) compose un devis ou un contrat mais ne peut pas le rouvrir.** Logique des cases, surprenante. Garder ? `final/restes-entreprise-tour1.json#9`
43. **« Créer le client et son devis » ne lit que la case Devis,** pas celle de Clients : avec Clients en lecture seule, le geste crée quand même un client. Un geste peut-il exiger deux cases ? `final/restes-entreprise-tour4.json#8`
44. **Une facture peut partir avec le seul SIRET** (sans forme juridique, capital, TVA, IBAN). Point juridique : à faire valider par l'agent juriste avant toute règle. `final/restes-entreprise-tour4.json#4`

## 5. Achats et frais

45. **« Sans justificatif » (tuile Achats) et « sans facture » (Comptabilité) :** deux mots pour des listes qui se recoupent. Un seul mot ? `final/restes-achats-tour2.json#4`
46. **La première demande à décider est sous deux écrans de tuiles et de réglages** (écran gérant). Remonter les demandes en premier ? `final/regard-gerant-b.json`
47. **Pastilles de personnes dans Achats :** passent à la ligne sur iPhone, défilent sur Android et à 320 px. Un seul comportement ? `final/restes-achats-tour3.json#6`
48. **Sur iPhone, les trois onglets de Comptabilité › Achats tiennent sur deux lignes** (le troisième seul, centré). Garder ? `final/restes-achats-tour3.json#8`
49. **« 12 € . » (point final) est refusé** avec « Ce montant ne se lit pas ». Accepter ? `final/restes-technicien-tour3.json#3`

## 6. Mon camion, Matériel, Véhicules, Temps de travail

50. **Mon camion sur ordinateur : colonne de 720 px,** moitié droite vide. Passer en deux colonnes (À bord / Mes envois) ou garder ? `final/regard-technicien-b.json`
51. **Mon camion à 320 px :** « Noter un plein » commence plus bas que l'écran. Réduire les cartes du haut ? `final/restes-vehtemps-tour1-recontrole.json`
52. **Deux largeurs de feuille** (« J'ai utilisé / J'ai pris / Il me manque » grandes, « Plein / Compteur / Souci » étroites). Même largeur ? `final/regard-technicien-b.json`
53. **Mon camion hors réseau :** après « Je l'ai pris », la ligne ne change pas (seul un message de 2,5 s le dit). Marquer la ligne « part dès que le réseau revient » ? (Recommandation : oui.) `final/restes-technicien-tour3.json#2`
54. **« Manque à bord » :** mot choisi par le chef de chantier (« Il manque à bord · 3 », « 3 articles manquent à bord »). À confirmer. `final/vus-par-le-chef.md`
55. **L'unité « u » au Matériel reste** (c'est celle de la vraie application et d'une facture). À confirmer. `final/restes-technicien-tour2.json`
56. **Véhicules : la tuile « payés en octobre (hors taxes) »** ne répartit pas l'assurance sur les mois. L'étaler, ou garder le montant payé ? `final/restes-vehtemps-tour1.json`
57. **Un technicien voit-il les passages de ses collègues sur la fiche d'un client ?** Et le chef d'équipe n'a-t-il que les six écrans du technicien ? (Recommandation : un chef d'équipe a le planning de son équipe.) `final/restes-technicien-tour2.json#11`
58. **La puce « N messages du bureau › » s'affiche aussi sur ordinateur,** où les messages sont déjà visibles. Garder pour que l'écran soit le même ? `final/restes-technicien-tour2.json#15`
59. **Paie (étape 1) et Temps de travail › Mois disent la même chose avec d'autres mots** (« journée restée ouverte » / « journée à terminer » ; « Demander aux salariés de confirmer » / « Demander de confirmer »). Aligner ? `final/restes-vehtemps-tour1.json#11`
60. **Temps de travail : la secrétaire (droit « voir les heures de toute l'équipe ») voit les heures de tous, donc les salaires.** Séparer « heures » et « salaires » en deux droits ? (Recommandation : oui.) `final/restes-equipe-tour1.json#8`
61. **Registre sanitaire (technicienne) : pas de bouton PDF.** Le lui donner ? `final/regard-gerant-f-retouches.json`
62. **Registre : un bouton pour ajouter un client au suivi** ? L'écran vide ne propose aucun geste ; on ne sait pas encore par quel geste un client devient « suivi » (contrat ? première intervention ?). À définir avant de poser le bouton. `final/regard-gerant-f.json`
63. **Registre, graphique des passages :** trois barres serrées à gauche d'une grande carte (se remplit avec 8 à 12 passages). Redessiner ? `final/regard-gerant-f.json`

## 7. Boîte mail

64. **La secrétaire voit-elle la Boîte mail ?** (Recommandation du chef : oui, la boîte de l'entreprise seulement, pas la boîte personnelle du gérant.) `final/restes-mail-tour1.json#entrees/8`
65. **Avec « Voir + Créer » (sans Modifier), le bouton s'appelle « Répondre »** mais le menu ne propose que « Transférer » et « Annuler ». Renommer ou garder ? `final/restes-entreprise-tour4.json#7`
66. **« Renommer… » et « Changer le logo… » d'une boîte restent proposés en « Voir seul ».** Les masquer ? `final/restes-entreprise-tour4.json#2`
67. **Glisser une ligne pour archiver ou supprimer au téléphone :** le module d'origine ne le fait pas. L'ajouter ? `final/restes-mail-tour1.json#entrees/9`
68. **Un mot sous chaque icône des barres du bas ; « Écrire » proposé deux fois au téléphone** (bouton en haut et icône en bas). À regarder sur ton iPhone. `final/restes-mail-tour1.json#entrees/10`
69. **À 1280 × 720, la liste ne montre que deux e-mails entiers.** Alléger l'en-tête ? `final/restes-mail-tour1.json#entrees/6`
70. **Retour avec le menu « Principal » de la Boîte mail ouvert :** décidé par le chef selon ta règle (« Retour ferme ce qui est ouvert par-dessus ») — le Retour ferme le menu et on reste dans la Boîte mail ; même règle pour un panneau ouvert sous « < OP GESTION ». À confirmer. `final/restes-retour-tour1.json#6`

## 8. Équipe, Mon entreprise et droits

71. **Aucun chemin pour nommer un 2e administrateur.** Ajouter un geste « Donner le profil Administrateur » ? (Recommandation : oui, sinon le gérant est seul point de panne.) `final/restes-equipe-tour1.json#9`
72. **Le départ guidé peut confier une intervention à une technicienne seulement invitée, jamais connectée.** L'interdire ? `final/restes-equipe-tour1.json#10`
73. **« Rôle (un simple nom) » à côté de « Ses droits de départ » peut dérouter ;** « Planifier la formation » visible d'un Responsable en lecture. Reformuler ? `final/restes-equipe-tour1.json#11`
74. **Compte désactivé :** « Nouveau téléphone » et « Déconnecter partout » restent à côté de « Réactiver ». Les masquer ? Et un compte verrouillé ET désactivé : dans quel ordre proposer les gestes ? `final/restes-equipe-tour2.json#4, #5`
75. **L'ordre d'ouverture :** une personne du Secrétariat sans « Accueil » s'ouvre sur la Comptabilité avant ses Clients. Un ordre d'ouverture par métier ? `final/parcours.json#defauts/10`
76. **Refus de champ avec le vrai clavier d'un iPhone ouvert :** le message pourrait passer sous le clavier. À vérifier sur ton iPhone. `final/restes-entreprise-tour4.json#6`

## 9. Métier (3D) et exemples

77. **metier-3d-06 : le Devis xylophage s'ouvre prérempli** (« Charpente 42 m² », 970,72 € TTC) : on peut envoyer un devis chiffré sur des mesures inventées. (Recommandation : l'ouvrir sans zone.) `campagne/metier-3d-recontrole.json`
78. **metier-3d-08 : aucun moyen de demander un autre métier en mode application.** « Réglé par TEAM OP à l'ouverture de ton compte », sans contact. Qui règle le métier, par quel message ou lien ? (Et le nom vu par l'entreprise est OP GESTION, pas TEAM OP.) `campagne/metier-3d-recontrole.json`
79. **metier-3d-09 : « RAS » et « N° d'AMM » sans explication** pour un débutant. Ajouter une aide courte ? `campagne/metier-3d-recontrole.json`
80. **metier-3d-10 : les types d'intervention gardent les noms de la climatisation** pour tous les métiers (un nettoyeur « fait » une « Installation »). À rapprocher de la facturation et des statistiques. `campagne/metier-3d-recontrole.json`
81. **Les clients, interventions et produits d'exemple sont ceux d'une entreprise de climatisation pour tous les métiers** (82 mots de clim). Normal pour un prototype ; à décider pour la vraie application (semis par métier). Et une entreprise 3D + clim reçoit des exemples neutres, moins parlants. `campagne/metier-3d-recontrole.json`

## 10. Guide, coque, nuit et apparence

82. **Guide tout-05 :** la carte « Accueil : ce qui attend ta décision » n'est pas écrite ; il faut en retirer une des six cartes. Laquelle ? `refonte/guide-recontrole.json`
83. **Guide tout-08 :** la première carte du technicien dit « Mes notes de frais → Mes frais » au lieu de « Boxes → Mon camion ». Laquelle ? `refonte/guide-recontrole.json`
84. **De nuit, bouton principal bleu des pages paiement, documents et courrier :** le reste est noir ou blanc. Décidé par le chef pour l'application ; ces pages gardent leur bleu. Aligner (jeton à régler, jour ET nuit) ? Au guide, deux boutons principaux ; aux véhicules, un par ligne. `final/restes-nuit-tour1.json`
85. **Recherche : « auto » ouvre un client avant « Mode automatique ».** Quel ordre ? Et « Rien ne correspond » ne dit pas qu'une rubrique est fermée au compte de la secrétaire. Le dire ? `final/restes-coque-tour2.json#4, #5`
86. **Échap ne ferme pas la visite parlée** (seule la croix ou Retour la ferme). L'ajouter ? `final/restes-coque-tour2.json#3`
87. **Accueil, haut de page : sept lignes d'aide avant la grille.** Les replier derrière un « ? » ? Et deux boutons côte à côte sur deux lignes chacun à 320 px : les empiler ? `final/regard-gerant-a.json`
88. **Menu : au téléphone, la Comptabilité plein écran porte deux boutons à trois traits** (« Menu » et le ≡ de la fenêtre). Garder les deux ? `final/restes-taches-absences-tour2.json#8`
89. **Cases de jour de 37 à 39 px de haut** (plancher d'un doigt : 44), dans une bande de l'année. Garder ? `final/regard-gerant-a.json`
90. **Noms de jours fériés à 9 px dans le calendrier d'absences** (tiennent, mais petits). Agrandir ? `final/regard-technicien-a-recontrole.json`

## 11. Sécurité et plateforme (en une phrase chacune)

91. **En-têtes de sécurité du site et authenticité de l'expéditeur des e-mails :** à décider avec le serveur (hors prototype). `final/restes-securite-tour3.json#3`
92. **Nettoyage des textes tapés :** les guillemets droits d'un nom sont retirés (« Café "Chez Léa" » → « Café Chez Léa »). Garder ? `final/restes-securite-tour3.json#2`
93. **Les polices du compositeur** se chargent chez un tiers dans le prototype ; dans la vraie application elles seront servies par notre serveur (règle de sécurité). À confirmer. `final/vus-par-le-chef.md`
94. **Téléchargement du PDF d'un devis depuis l'atelier :** à essayer une fois sur l'artefact publié ; si « pas disponible » alors que le FEC marche, une petite correction suffit. `final/restes-artefact-tour1.json#6`
94b. **Petits restes de la saisie (nuit du 19), à corriger ou non :** Ctrl+Z après un texte collé trop long et coupé ne fait rien ; 5 textes libres (appareil, motif, note de tâche) gardent l'écriture décomposée des accents ; les refus du devis nouveau et du client seul ne mettent pas le champ en rouge, et à 360 px leur phrase tombe sous le pli ; la phrase de refus n'est pas reliée au champ pour les lecteurs d'écran ; le caractère U+FFFC compte comme une ligne d'accès. (Recommandation : les corriger avec la vraie application.) `final/restes-securite-tour5bis-recontrole.json`

## 12. Divers (à connaître, pas à corriger)

95. **Contrats :** le PDF et l'e-mail réels d'un contrat n'ont pas pu être testés (pas de serveur) ; le jour est figé au 31 octobre. Test à refaire sur la vraie application. `final/restes-contrats-tour1.json#20`
96. **Appareils réels :** Windows, Android, iPad et clavier virtuel n'ont été vus que dans des émulations ; à regarder sur tes appareils avant publication. `campagne/metier-3d-recontrole.json`

---

### Décompte par écran
Comptabilité 12 · Accueil/Interventions/Planning/Tâches 13 · Clients et espace client 9 · Devis, contrats, atelier 10 · Achats et frais 5 · Mon camion, Matériel, Véhicules, Temps de travail 14 · Boîte mail 7 · Équipe, Mon entreprise, droits 6 · Métier 3D 5 · Guide, coque, nuit, apparence 9 · Sécurité et plateforme 4 · Divers 2 = **96**.

### Déjà tranchés (retirés de la liste)
Unité inconnue refusée sur une ligne de facture (décidé et fait) ; les cinq points Clients du 17/11 ; l'écran Boîte mail en « Voir seul » (corrigé) ; la règle « un nettoyage à l'entrée, un échappement à la sortie ». Les points 54, 55, 84 et 93 sont des décisions du chef de chantier que tu peux défaire en une ligne.
