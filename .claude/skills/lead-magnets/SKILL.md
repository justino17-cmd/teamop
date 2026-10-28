---
name: lead-magnets
description: "Concevoir un contenu utile offert en échange d'une adresse (ou sans contrepartie) pour des entreprises de terrain : check-list, modèle de rapport d'intervention, modèle de devis, registre, calendrier d'entretien, guide court. Choisir le format, le moment du parcours, la façon de le proposer, la page, la mesure — dans le cadre RGPD (case de consentement non cochée d'avance, finalité claire, désinscription). À utiliser pour « idée de contenu à offrir », « check-list à télécharger », « modèle gratuit », « récupérer des adresses », « article avec bonus », « que donner pour inscrire quelqu'un ». Pas de chiffres de téléchargements inventés, pas d'essai gratuit inventé. EN: lead magnets for French field-service SMEs, GDPR-aware."
metadata:
  version: 2.1.1-teamop
  source: coreyhaines31/marketingskills v2.13.9 (MIT) — traduit et adapté, voir PROVENANCE-marketingskills.md
---

> **Adaptation TeamOP** (28 octobre 2026). Traduit de `lead-magnets` (marketingskills 2.1.1, licence MIT — `LICENSE-marketingskills`) puis adapté :
> - **Droit français sur la collecte d'adresses.** Une adresse donnée pour recevoir un document n'autorise pas l'envoi de lettres commerciales ensuite. Pour recevoir la suite : **case séparée, non cochée d'avance**, finalité dite
>   (« recevoir nos conseils et nos nouveautés »), désinscription dans chaque message, et rien d'autre dans le message de livraison que ce qui a été promis. Voir `../prospecting/references/droit-francais.md` (la section « particulier » vaut pour un indépendant
>   qui donne une adresse personnelle). **L'accueil sur le site respecte déjà le bandeau de consentement** (`cookies.js`) : toute mesure d'audience d'une page de téléchargement passe par lui.
> - **Pas de preuve inventée.** La source recommande « téléchargé par 5 000+ personnes » et « essai gratuit de 14 jours » : TeamOP n'affiche ni l'un ni l'autre tant qu'ils ne sont pas vrais. La démonstration publique sans compte (`demo.html`) est déjà notre meilleur contenu offert.
> - **Pour nos clients, le contenu offert doit être exact.** Un modèle de devis ou de facture qui oublie une mention légale met l'artisan qui l'utilise en faute : les contenus qui touchent au droit (mentions obligatoires, registre sanitaire, biocides) passent par l'agent `comptable` (devis, factures, comptabilité d'OP GESTION ; défini sur la branche `claude/agent-comptable`, pas encore fusionnée ici) ou par Justin avant d'être publiés.
> - **Non repris de la source** : les trois fichiers « transformer un cours en skill installable » (`content-to-skill*.md` — hors sujet pour nous), les repères de taux de conversion américains (`benchmarks.md`), les intégrations d'outils tiers. Le guide des formats est condensé.
> - Agents lancés pour ce travail : Sonnet.

# Contenus offerts

Tu es expert en stratégie de contenus offerts. Ton but : planifier ce qui **aide vraiment** un dirigeant d'entreprise de terrain, donne envie d'en savoir plus, et mène naturellement à l'application.

## Avant de planifier
Lire `.claude/product-marketing.md` s'il existe, puis `../prospecting/references/contexte-teamop.md`. Demander (une ou deux questions à la fois) : ce que fait l'entreprise et pour qui · comment on capte aujourd'hui · quel contenu existe déjà (le blog, les pages métier `logiciel-*.html`) · le but (adresses, qualité des prospects, formation) · le délai et les moyens.

## Principes
1. **Résoudre un problème précis**, un seul. « Les mentions obligatoires d'une facture d'artisan » plutôt que « guide de gestion ».
2. **Épouser le moment** : sensibiliser (un problème qu'on ne voyait pas), comparer (comment choisir), décider (prêt à l'emploi).
3. **Valeur perçue haute, temps de consommation bas** : lisible en moins de dix minutes, utilisable aujourd'hui, même sur un téléphone, sur un chantier.
4. **Chemin naturel vers le produit** : le contenu résout un problème que l'application résout aussi, sans devenir une publicité.
5. **Facile à consommer** : un seul format, adapté au mobile, sans logiciel particulier, imprimable.

## Types
| Type | Convient à | Effort |
|---|---|---|
| Check-list | gestes à ne pas oublier (avant un chantier, à la remise des clés) | faible |
| Fiche pratique | rappel d'une règle, d'un calcul | faible |
| **Modèle** (devis, rapport d'intervention, fiche de passage, planning d'entretien) | processus répété | faible à moyen |
| Guide court (10 à 20 pages) | autorité, sujet complexe (par exemple le registre sanitaire en anti-nuisibles) | élevé |
| Mini-série de courriels | éducation et suivi | moyen |
| Question-test | situer son organisation, segmenter | moyen |
| **Démonstration publique** | voir l'application sans compte | existe (`demo.html`) |
| Essai | expérience du produit | **à décider** : l'essai est proposé APRÈS un retour (consigne de Justin) |

Idées de départ **à faire valider par métier** : *anti-nuisibles* — check-list du registre sanitaire, modèle de fiche de traitement · *chauffage-climatisation* — calendrier d'un contrat d'entretien · *nettoyage* — fiche de contrôle qualité d'un site · *plomberie, électricité* — modèle de rapport signé sur place · *tous* — modèle de devis conforme, check-list de facture.
(La liste des mentions légales d'un devis ou d'une facture n'est PAS à reprendre de mémoire : voir l'encadré ci-dessus.)

Guide des formats (structure, longueur, outils) : `references/formats.md`.

## Selon l'étape
- **Sensibiliser** : check-list, fiche pratique. · **Comparer** : modèle d'organisation, « comment choisir un logiciel de gestion d'interventions » (honnête, y compris pour un autre outil quand c'est le cas). · **Décider** : modèle prêt à l'emploi, démonstration, guide de mise en route (« passer du carnet à l'application en une journée »).

## Mise à disposition
| Approche | Quand | Compromis |
|---|---|---|
| **Libre, sans formulaire** | Contenu de sensibilisation, le blog | Portée maximale, aucune adresse |
| **Aperçu libre + version complète contre une adresse** | Un guide plus long | Équilibre portée / capture |
| **Bonus d'un article** (amélioration de contenu) | Un article du blog avec une check-list à télécharger | Contextuel, forte intention |
| **Formulaire complet** | Rarement : contenu à forte valeur, bas de parcours | Capture maximale, portée réduite |

Demander **le minimum** : l'adresse, et au plus le prénom ou le métier. Chaque champ en plus fait perdre des gens et grossit les données à protéger. **Case de consentement pour recevoir la suite : séparée, non cochée.**

### Page de téléchargement
1. Titre = le bénéfice précis. 2. Aperçu (couverture, page type). 3. Ce qu'il y a dedans (3 à 5 puces). 4. Une preuve **réelle** si elle existe. 5. Le formulaire minimal. 6. Une foire aux questions (« est-ce vraiment gratuit ? quel format ? que faites-vous de mon adresse ? »).
Ajouter l'**information RGPD** près du bouton : qui collecte, pourquoi, combien de temps, comment se désinscrire. Livrer **par courriel ET sur la page de remerciement** (accès immédiat + copie par courriel).
Page de remerciement : confirmer l'envoi, proposer **une** suite (la démonstration, répondre à ce message), pas de pression.

## Faire connaître
Blog (bonus d'un article, appel à l'action en fin de texte), pages métier (`logiciel-*.html`), réseaux sociaux (extraits), référencement local, bouche-à-oreille. Pas de fenêtre qui surgit à la sortie sans tenir compte du consentement et du mobile. Les annonces payantes sont une décision de Justin.

## Mesurer
| Mesure | Ce qu'elle dit |
|---|---|
| Conversion de la page | Attrait de l'offre |
| Téléchargements par source | Où ça marche |
| Passage à la démonstration ou à l'inscription | Qualité des adresses |
| Désinscriptions après la livraison | Respect de la promesse |
Les repères de taux de la source sont américains : **mesurer les nôtres** (Search Console, mesure d'audience consentie). Tests possibles : titre, format, niveau de formulaire, texte du bouton — un à la fois.

## Livrable attendu d'un plan
1. Recommandation (format, sujet, étape, pourquoi, effort) · 2. Plan du contenu · 3. Capture (formulaire, case de consentement, page) · 4. Diffusion · 5. Mesure.

## Skills voisins
**copywriting**, **copy-editing** (le texte) · **onboarding**, **signup** (après capture) · **seo-audit**, **programmatic-seo**, **schema** (les pages) · **analytics** (mesure) · **product-marketing** · **prospecting** (droit et cible) · **cold-email**.
Non installés ici : `free-tools`, `emails`, `cro`, `popups`, `content-strategy`, `ads`, `social`.
