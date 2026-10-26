# Blog TEAM OP — file des sujets

La tâche planifiée « Article du blog » (du lundi au vendredi) prend le **premier sujet non coché**, écrit l'article, le
coche ici avec sa date et son slug, et ouvre une demande de fusion. **La publication est automatique** (Justin, 26 octobre
2026 : « je veux que les publications soient automatiques et que les images soient gérées avec Gemini ») :
`.github/workflows/blog-publication.yml` fait dessiner les images par Gemini, refait les pages, repasse les bancs du blog,
fusionne et publie. Une demande qui touche autre chose que le blog, ou un banc qui tombe, n'est PAS fusionnée.
Quand il reste moins de cinq sujets non cochés, la tâche en ajoute dix (recherche des questions que posent les entreprises
de terrain, mots-clés que le site ne couvre pas encore), à la fin de la file.

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
- [ ] planning des techniciens — organiser une semaine d'équipe, urgences, tournées — /logiciel-planning-interventions.html
- [ ] gestion de stock camionnette — suivre ce que chaque technicien emporte, inventaire, réassort — /logiciel-gestion-de-stock.html
- [ ] facture d'intervention — mentions obligatoires, délais, facturation électronique 2026-2027 — /logiciel-devis-factures.html
- [ ] registre sanitaire 3D — obligations, contenu, contrôles, biocides — /logiciel-registre-sanitaire.html
- [ ] logiciel plombier — ce qu'un plombier doit attendre d'un logiciel, devis, dépannage, SAV — /logiciel-plombier.html
- [ ] contrat d'entretien — chaudière, climatisation : obligations, relances, planification — /logiciel-chauffage-climatisation.html
- [ ] pointage des heures techniciens — feuille d'heures, durée légale, nuits, équipes — /logiciel-pointage.html
- [ ] bon de commande fournisseur — mentions, suivi des livraisons, lien avec le stock — /logiciel-bons-de-commande.html
- [ ] logiciel entreprise de nettoyage — passages récurrents, contrôle qualité, sites multiples — /logiciel-nettoyage.html
- [ ] devis artisan — mentions obligatoires, durée de validité, acompte — /logiciel-devis-factures.html
- [ ] logiciel électricien — interventions, conformité, devis — /logiciel-electricien.html
