# Blog TEAM OP — file des sujets

La tâche planifiée « Article du blog » (du lundi au vendredi) prend le **premier sujet non coché**, écrit l'article, le
coche ici avec sa date et son slug, et ouvre une demande de fusion. **La publication est automatique** (Justin, 26 octobre
2026 : « je veux que les publications soient automatiques et que les images soient gérées avec Gemini ») :
`.github/workflows/blog-publication.yml` fait dessiner les images par Gemini, refait les pages, repasse les bancs du blog,
fusionne et publie. Une demande qui touche autre chose que le blog, ou un banc qui tombe, n'est PAS fusionnée.
Quand il reste moins de cinq sujets non cochés, la tâche ajoute les DEUX SEMAINES suivantes, selon la règle « Un métier
par semaine » ci-dessous (recherche des questions que posent les patrons de ce métier, mots-clés que le site ne couvre pas
encore), à la fin de la file.

## Un métier par semaine (Justin, 9 novembre 2026)

« Choisis un métier qu'on n'a pas encore fait, et ça serait bien qu'on varie toutes les semaines un métier. » La file se
range par SEMAINE : les trois articles d'une semaine (lundi, mercredi, vendredi) parlent du MÊME métier, et la semaine
suivante passe à un autre. Un sujet commun à tous les métiers (pointage, bon de commande, devis…) s'écrit sous l'angle du
métier de la semaine, avec ses exemples. On prend d'abord les métiers qu'aucun article n'a encore traités (liste « Métiers
à venir », dans l'ordre), parmi ceux qu'OP GESTION propose. Chaque semaine commence par un titre `### Semaine du <date> —
<métier>` ; la tâche continue de prendre simplement le premier sujet non coché.

Déjà traités : interventions et planning (tous métiers), plomberie (6 novembre), 3D (9 novembre).

Métiers à venir, dans l'ordre : sécurité incendie, ramonage, paysagiste / espaces verts, assainissement / vidange,
portes et portails automatiques, photovoltaïque et bornes de recharge, froid commercial / frigoriste, menuiserie,
peinture / revêtements, couverture / zinguerie, maçonnerie / gros œuvre, multiservices / maintenance, ascenseurs.
Pour un métier sans page `logiciel-….html`, citer `/metiers.html`, `/op-gestion.html` et la page du thème (planning,
devis-factures, pointage…).

Ajouter un sujet : une ligne `- [ ] mot-clé visé — angle — page du site à citer`. L'ordre de la liste est l'ordre de
publication.

## Règles d'écriture (les mêmes que le site)

- Français, vouvoiement, phrases courtes. Pas de tics d'IA (« ce n'est pas X, c'est Y », listes de trois négations,
  phrases qui traînent en virgules).
- **Rien qu'OP GESTION ne fasse pas** : pas de hors-ligne, pas de GPS en temps réel, pas de SMS automatiques, pas de
  signature électronique des devis. En cas de doute, relire `op-gestion.html` et les pages `logiciel-*.html`.
- Un abonnement = un utilisateur. Prix lus dans `tarifs.html` (Pro 15 €, Business 25 €, Business Premium 50 € par mois
  et par utilisateur, TVA non applicable, article 293 B du CGI). OP MESSAGES : « bientôt disponible ».
- Contact : `contact@teamop.fr` seul. Jamais de téléphone.
- Chaque chiffre, chaque règle de droit cite sa source officielle (Légifrance, service-public.fr, URSSAF, impots.gouv,
  CNIL, ANSES…) vérifiée le jour même. Pas de statistique inventée.
- Structure : un paragraphe d'introduction qui répond à la question, « En bref » (4 à 6 puces), « Table des matières »,
  sections h2/h3, un encart « Le point de vue de TEAM OP » signé (`<p class="signature">— Justin Biret, fondateur de
  TEAM OP</p>`), des exemples par métier, « FAQ » (4 ou 5 questions en h3), « Sources ». 1 800 à 2 500 mots.
- 2 ou 3 liens vers les pages du site (`/op-gestion.html`, `/logiciel-….html`, `/tarifs.html`) et 1 ou 2 vers les
  articles déjà publiés (`/blog/<slug>.html`).
- Images : une couverture 1200 × 675 et une ou deux images dans le texte, WebP, dans `blog/img/`. Pas de marque, de
  logo ni de personnage connus. Texte alternatif qui décrit vraiment l'image.
  · la couverture : `python3 scripts/blog-couverture.py <slug> "<titre>"` (le panneau seul) ; à la publication, Gemini
    dessine la photo de droite. Pour orienter la scène, un champ `"photo"` dans la fiche (en anglais, une phrase) ;
  · une image dans le texte que Gemini dessinera : `python3 scripts/blog-images.py --attente blog/img/<nom>.webp`, puis
    `<figure><img alt="…" data-gemini="la scène, en anglais, une phrase" decoding="async" height="675" loading="lazy"
    src="/blog/img/<nom>.webp" width="1200"/></figure>`. Si Gemini ne peut pas la dessiner, la figure est retirée ;
  · les consignes fixes de chaque image (personnes fictives, tenue bleu marine, ni texte, ni logo) sont dans
    `scripts/blog-gemini.js` : inutile de les répéter.

## File

- [x] gestion des interventions — 2026-10-21 — `gestion-des-interventions`
- [x] ordre de travail — 2026-10-22 — `ordre-de-travail`
- [x] suivi des interventions — 2026-10-23 — `suivi-des-interventions`
- [x] signature électronique devis — 2026-10-24 — `signature-electronique-devis`
- [x] bon d'intervention — 2026-10-25 — `bon-d-intervention`
- [x] planning des techniciens — 2026-10-28 — `planning-des-techniciens`
- [x] gestion de stock camionnette — 2026-11-02 — `gestion-de-stock-camionnette`
- [x] facture d'intervention — 2026-11-04 — `facture-d-intervention`
- [x] logiciel plombier — 2026-11-06 — `logiciel-plombier`
- [x] registre sanitaire 3D — 2026-11-09 — `registre-sanitaire-3d`

### Semaine du 9 novembre — Électricité (le lundi : registre sanitaire 3D, déjà parti ; mardi 10, exceptionnellement, un article de plus)
- [x] logiciel électricien — 2026-11-10 — `logiciel-electricien`
- [x] attestation de conformité Consuel — 2026-11-11 — `attestation-de-conformite-consuel` — quand l'électricien en a besoin, comment la préparer, ce qu'il garde au dossier — /logiciel-electricien.html
- [ ] mise en conformité électrique d'un logement — diagnostic, travaux, ce que l'électricien remet au client — /logiciel-electricien.html

### Semaine du 16 novembre — Nettoyage / propreté
- [ ] logiciel entreprise de nettoyage — passages récurrents, contrôle qualité, sites multiples — /logiciel-nettoyage.html
- [ ] contrat de nettoyage de bureaux — fréquences, cahier des charges, contrôle qualité, révision du prix — /logiciel-nettoyage.html
- [ ] pointage des heures des agents de propreté — horaires décalés, plusieurs sites, durée légale — /logiciel-pointage.html

### Semaine du 23 novembre — Chauffage
- [ ] contrat d'entretien de chaudière — obligation annuelle, relances, planification des visites — /logiciel-chauffage-climatisation.html
- [ ] attestation d'entretien de chaudière — ce qu'elle contient, le délai pour la remettre, combien de temps la garder — /logiciel-chauffage-climatisation.html
- [ ] devis chauffagiste — mentions obligatoires, TVA des travaux de rénovation, acompte, durée de validité — /logiciel-devis-factures.html

### Semaine du 30 novembre — Climatisation / pompes à chaleur
- [ ] entretien de climatisation et de pompe à chaleur — ce qui est obligatoire, à quelle fréquence, chez qui — /logiciel-chauffage-climatisation.html
- [ ] fluides frigorigènes — attestation de capacité, fiche d'intervention, contrôle d'étanchéité — /logiciel-chauffage-climatisation.html
- [ ] bon de commande fournisseur pour un climaticien — pièces, délais, suivi des livraisons, lien avec le stock — /logiciel-bons-de-commande.html

### Semaine du 7 décembre — Serrurerie
- [ ] dépannage en serrurerie — information du client avant l'intervention, devis, prix — /logiciel-devis-factures.html
- [ ] logiciel serrurier — urgences, planning des dépanneurs, devis et factures sur place — /metiers.html
- [ ] facture de dépannage — mentions, déplacement, main-d'œuvre, pièces, délai de paiement — /logiciel-devis-factures.html
