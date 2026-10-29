# Skills venus de coreyhaines31/marketingskills (28 octobre 2026)

Demandés par Justin (28 octobre 2026, 22 h 10 : « tu installes tous les skills […] vu que tu vas corriger et améliorer les agents, ça permet, avec les skills, de le faire »),
d'après la recherche `agents-github.md` (proposition n° 3). Source : https://github.com/coreyhaines31/marketingskills, commit `0cd9b3a0ef4c411a1d690419ce843f2a1da32cce` (27 octobre 2026, étiquette `v2.13.9`).
Licence : **MIT**, « Copyright (c) 2025 Corey Haines » — texte dans `LICENSE-marketingskills`.

## Ce qui a été fait — et ce qui n'est PAS une copie

Les six skills sont **traduits en français et adaptés**, pas recopiés. Ils sont écrits pour TeamOP (entreprises de terrain françaises, nos agents Pauline / Léa / Camille / Chloé, nos formules et nos règles) et soumis au droit français.
Chacun commence par un bloc « Adaptation TeamOP » qui dit ce qui a changé et pourquoi. La structure et l'esprit de chaque skill d'origine sont gardés ; les parties propres au marché américain sont réécrites ou retirées.

| Skill | Version d'origine | Repris | Retiré ou remplacé |
|---|---|---|---|
| `prospecting` | 1.5.0 | Les cinq phases (cible, découverte, qualification, notation, fiche), niveaux de confiance, garde-fous, erreurs fréquentes | Branche SaaS ; outils d'enrichissement américains ; `compliance.md` (CAN-SPAM, CASL, PECR, UWG) **remplacé** par `references/droit-francais.md` ; 9 fichiers de références remplacés par 4 (`droit-francais`, `contexte-teamop`, `entreprises-de-terrain`, `sources-et-verification`) |
| `cold-email` | 2.2.1 | Principes d'écriture, structures, relances, réponses, délivrabilité | Statistiques américaines ; boîtes « à l'allure de vraies personnes » ; objets « camouflage interne » ; adresse postale CAN-SPAM ; SMS 10DLC ; cadences LinkedIn / appels / vidéo / annonces ; 9 références remplacées par 4 |
| `sales-enablement` | 2.4.0 | Principes, objections, démonstration, proposition, fiches concurrents, gagnées/perdues, calculateur | Deck de 12 diapositives ; cartes de personas à cinq rôles ; playbook d'équipe ; scripts d'appel à froid (remplacés par des repères français à relire) ; 6 références remplacées par 3 |
| `customer-research` | 2.0.5 | Les trois modes, extraction, garde-fous de confiance, personas, entretiens, enquête de référence | Sources américaines (Reddit, G2, Hacker News, SparkToro) ; montants d'incitation ; 2 références remplacées par 1 |
| `directory-submissions` | 2.1.4 | Trois règles fermes, vérification du lien, avis, pages d'arrivée | Catalogue de 180 annuaires (IA, MCP, start-up) **remplacé** par une liste courte « à vérifier » ; protocole d'avis contre cadeau ; tous les objectifs chiffrés américains ; Product Hunt en annexe |
| `lead-magnets` | 2.1.1 | Principes, types, mise à disposition, page, mesure | `content-to-skill*.md` (cours transformé en skill installable), repères de conversion américains, tous les nombres de téléchargements « comme preuve » |

**Aucun fichier `evals/` n'a été recopié** (jeux d'essai de l'auteur, en anglais). Les fichiers `.csv` ne sont pas repris : seul un tableau de suivi vide (`directory-submissions/references/suivi-inscriptions.csv`) a été écrit.
Le texte original de chaque skill reste dans le dépôt d'origine au commit ci-dessus, pour qui veut comparer.

## Skills déjà présents, donc NON recopiés une seconde fois

Douze skills de la même source étaient déjà dans `.claude/skills/` avant ce travail : `copywriting` (2.3.1), `copy-editing` (2.2.0), `signup` (2.0.1), `onboarding` (2.0.2), `paywalls` (2.0.0), `churn-prevention` (2.0.3),
`pricing` (2.1.4), `analytics` (2.2.0), `product-marketing` (2.2.0), `programmatic-seo` (2.1.0), `schema` (2.0.2), `seo-audit` (2.2.1). Les six skills de ce lot s'appuient sur eux (liens « skills voisins »).
Constaté : certains sont **en retard sur la source actuelle** (`copywriting` 2.3.1 contre 2.3.2, `paywalls` 2.0.0 contre 2.1.1, `analytics` 2.2.0 contre 2.2.2, `seo-audit` 2.2.1 contre 2.2.2, `copy-editing`, `programmatic-seo`), et tous diffèrent du texte d'origine à la ligne près.
Ils n'ont **pas** été mis à jour ici (hors de la demande, et leurs adaptations seraient perdues) ; `LICENSE-marketingskills` les couvre aussi, puisqu'ils viennent de cette source et n'avaient ni licence ni provenance jusqu'à ce jour.

## Les 34 autres skills de la source — non installés, exprès

`ab-testing, ad-creative, ads, ai-seo, aso, attribution, co-marketing, community-marketing, competitor-profiling, competitors, content-strategy, conversion-tracking, cro, emails, events, free-tools, image, influencer-marketing, launch, link-building,
marketing-council, marketing-ideas, marketing-loops, marketing-plan, marketing-psychology, offers, popups, public-relations, referrals, revops, site-architecture, sms, social, video` (52 skills dans la source = 6 de ce lot + 12 déjà présents + ces 34) :
hors demande, et chaque description chargée à chaque session alourdit le contexte (la consommation hebdomadaire de Justin). Les `tools/integrations/` de la source (Converly, Ploy, AIsa, Omnia, Instantly, Apollo, Clay…) sont des services tiers à comptes et clés : **non branchés**.

## Ce qui a été relu avant l'adaptation — et ce qui ne l'a PAS été

- ⚠️ **Le scanner prévu n'a pas tourné.** SkillSpector (NVIDIA) n'a pas pu être installé : la commande `uv venv` puis `uv pip install` du dépôt cloné a été REFUSÉE par le classifieur de permissions de la session (« Code from External ») et n'a pas été contournée.
  **Il n'y a donc ni score ni verdict SAFE / CAUTION / DO_NOT_INSTALL pour ces six skills.** Aucune phrase de ce fichier ne dit « scanné SkillSpector ». À refaire dès que Justin l'autorise : `bash scripts/scanner-skills.sh`.
- Ce qui a été fait : **relu à la main** et **balayé par un script statique maison** (8 familles de motifs grossières : réseau, exécution, installation, identifiants, obfuscation, injection de prompt, écriture de configuration, caractères invisibles — lecture seule, stdlib), le 28 octobre 2026, avec relecture de chaque constat en contexte.
  Résultat : des faux positifs seulement — la phrase « ignore previous instructions » dans `lead-magnets` est un EXEMPLE d'attaque que le skill dit de traiter comme donnée ; les mentions de webhooks et de `POST` sont de la prose sur des outils d'envoi ; `directory-submissions` donne des `curl` et un `brew install` **à un humain** (rien n'est exécuté par le skill).
  **Aucun script, aucun binaire, aucun caractère invisible** dans les six dossiers. Le même balayage (`scripts/balayage-skills-grossier.py`) a été relancé sur les TEXTES ADAPTÉS : il ne reste que des mentions de `.claude/…` (le fichier de contexte produit), un `curl -fsSL` donné à un humain dans `directory-submissions`, et le mot « post » (un message public) dans `prospecting`. Le risque de sécurité est faible ; le vrai travail était juridique (adaptation au droit français).
- ⚠️ **Le droit français n'a PAS été relu à la source pour cette adaptation** : `prospecting/references/droit-francais.md` le dit en tête et marque **[à vérifier]** ce dont je n'ai pas de certitude. Avant une campagne d'ampleur : Nina, puis Justin ou un juriste.
