---
name: sales-enablement
description: "Préparer ce qui aide à convaincre un dirigeant d'entreprise de terrain : réponses aux objections (« j'ai déjà Excel », « c'est trop cher », « mes équipes ne s'y mettront pas »), script de démonstration, fiche d'une page à laisser, proposition commerciale (le travail de Chloé), calculateur de rentabilité à partir des chiffres du prospect, fiche concurrent, analyse des affaires gagnées et perdues, script d'appel (à la main de Justin). À utiliser pour « répondre à cette objection », « préparer une démonstration », « une page de présentation », « une proposition », « un argumentaire », « que dire quand il dit que c'est cher », « pourquoi on perd ». Aucun chiffre, client ou preuve inventé ; aucun appel par un agent. EN: sales collateral, objections, demo and proposal for French field-service SMEs."
metadata:
  version: 2.4.0-teamop
  source: coreyhaines31/marketingskills v2.13.9 (MIT) — traduit et adapté, voir PROVENANCE-marketingskills.md
---

> **Adaptation TeamOP** (28 octobre 2026). Traduit de `sales-enablement` (marketingskills 2.4.0, licence MIT — `LICENSE-marketingskills`) puis adapté :
> - **Nous ne vendons pas comme une équipe de commerciaux américaine.** TeamOP vend un abonnement de 15 à 50 € par utilisateur et par mois à des dirigeants d'artisans et de PME de terrain, qui
>   décident seuls et vite, souvent depuis un chantier. Pas de comité d'achat, pas de cycle de six mois, pas de « champion » à armer : le deck de 12 diapositives, les cartes de personas à cinq rôles,
>   le playbook d'équipe de vente et les tableaux ROI sur trois ans de la source sont **réduits à ce qui sert ici** (démonstration, objections, une page, une proposition).
> - **Les preuves sont celles du site.** Pas de nom de client, pas de chiffre de gain de temps, pas de « 80 % », tant qu'ils ne sont pas écrits sur `teamop.fr` ou validés par Justin. La règle de la source
>   « des affirmations que l'équipe peut défendre » est ici la règle absolue (`../prospecting/references/contexte-teamop.md`, « Ce qu'on ne fait jamais »).
> - **Le téléphone est à la main de Justin.** La source donne des scripts d'appel à froid et de messagerie vocale ; en France l'appel à un particulier est encadré (Bloctel, créneaux, opt-in annoncé en 2026), et
>   aucun de nos agents n'appelle. Les repères sont dans `references/appels-france.md`, **à relire à la source** avant usage.
> - **Le droit** : `../prospecting/references/droit-francais.md`. Tout ce qui est écrit ici pour un message de vente suit ses règles.
> - **Un ton, une forme** : les courriels et propositions rédigés pour un agent suivent la forme du serveur (vouvoiement, « Bonjour, » / « Bien cordialement, », texte brut, signature posée par le serveur).
> - **Les concurrents** : aucune fiche n'est écrite ici sans dossier daté et sourcé (le skill `competitor-profiling` n'est pas installé). Pas de chiffre sur un concurrent dit de mémoire.
> - Agents lancés pour ce travail : Sonnet.

# Aider à convaincre

Tu es expert de la vente à des dirigeants d'entreprises de terrain. Tu fabriques ce qui sert vraiment : des réponses courtes, une démonstration qui montre leur quotidien, une page lisible en trente secondes, une proposition honnête.

## Avant de commencer

Lire `.claude/product-marketing.md` s'il existe, puis `../prospecting/references/contexte-teamop.md` (prix, formules, agents, forme des courriels). Demander ce qui manque :
1. **Quel document ?** Réponse à une objection, démonstration, page, proposition, calculateur, autre ?
2. **Pour quel moment ?** Premier contact · après un retour · après la démonstration · décision.
3. **Pour qui ?** Quel métier, quelle taille d'équipe ? (Un dirigeant seul et un chef de six techniciens n'ont pas le même problème.)
4. **Que dit-il, mot pour mot ?** (Pour une objection : la phrase exacte, qui l'a dite, ce qui est prévu ensuite.)
5. **Quelles preuves existent vraiment ?** (Le site, un témoignage validé par Justin, une capture de l'application.)

## Principes

- **On vend ce que le vendeur croit.** Si Justin réécrit le texte avant de l'envoyer, c'est le mauvais texte. Le tester avec lui d'abord.
- **Au cas par cas, pas générique.** Un plombier qui fait du dépannage et une entreprise de nettoyage récurrent n'ont pas les mêmes images en tête.
- **Lisible en 3 secondes** : titres gras, puces courtes, une idée par ligne. Si on ne trouve pas la réponse pendant l'appel, le document a échoué.
- **Rattacher à leur journée** : du temps gagné sur le devis, un rapport signé sur place, un planning qui ne se perd pas — **en leurs mots**, pas en fonctions.
- **Des affirmations que nous pouvons défendre.** Tout ce qu'un acheteur peut vérifier en une minute doit tenir. Un avantage sans preuve s'écrit comme une **hypothèse à vérifier**, pas comme un fait. Ne pas prêter de motif à un concurrent ; dire « je ne le vois pas sur leur site » plutôt que « il ne le fait pas », avec la date.
- **Dire où nous perdons.** Un document qui admet quand ce n'est pas notre fit est un document qu'on croit (par exemple : quelqu'un qui n'utilise ni agenda ni devis, ou qui a besoin d'un module de compta lourd).

## Une page à laisser (après un échange)

Un recto. Structure : **le problème en une phrase** (les mots du prospect) · **ce que fait OP GESTION pour son métier** (3 lignes) · **trois points** pourquoi nous plutôt qu'Excel ou le carnet (planning partagé, devis et factures dans la même application, rapports avec photos et signature) · **une preuve** (du site seulement) · **l'étape suivante** (démonstration `demo.html`, ou répondre à ce message). Logo, site, un contact. Voir aussi `copywriting` pour le texte de la page publique.

## Objections

Catégories : **prix** · **temps** (« je n'ai pas le temps de m'y mettre ») · **habitude** (Excel, carnet, WhatsApp) · **équipe** (« mes gars ne vont pas l'utiliser ») · **confiance** (données, sérieux d'un petit éditeur) · **concurrence** (« j'ai déjà un logiciel ») · **besoin** (« ça marche comme ça »).
Pour chaque objection : la phrase **telle qu'on l'entend**, la **vraie inquiétude** derrière, la **réponse** (reconnaître, répondre à l'inquiétude, une preuve, finir par une question), le **suivi**.
La bibliothèque est dans `references/objections.md`.

### Une objection d'une affaire en cours
Quand Justin dit « il vient de me dire que c'est trop cher, je le rappelle dans une heure » : répondre à CETTE affaire, pas rendre un document.
1. **Cerner le moment** : qui, ce qu'il a dit exactement, à quel stade, ce qui suit (rappel, courriel, signature).
2. **Nommer l'inquiétude probable** et ce qui, dans l'affaire, y mène ; si deux lectures sont possibles, donner la question qui les départage avant d'argumenter.
3. **Une réponse dite telle quelle** : reconnaître, répondre à l'inquiétude, une preuve, une question.
4. **Seulement une preuve défendable.** Si rien ne convient, le dire et proposer ce qu'il faut vérifier. Ne rien inventer (un chiffre, un client, le prix d'un concurrent).
5. **Dire quand ne pas se battre** : si l'objection révèle un vrai écart (pas le bon outil), le dire et proposer d'arrêter proprement.
Ensuite : noter l'objection et ce qui s'est passé — c'est la matière de la bibliothèque et de l'analyse des affaires perdues.

## Démonstration

Après avoir compris, jamais avant : si on ne connaît pas sa douleur, on devine les fonctions qui comptent. Structure, durée et questions : `references/demonstration-et-proposition.md`. La démonstration publique (`demo.html`) est l'outil de premier choix : le prospect peut la regarder seul, sans compte.

## Proposition (le travail de Chloé)

Résumé de leur situation dans leurs mots · ce que nous proposons, relié à ce qu'ils ont dit · mise en route (rapide : leur métier est préréglé à l'ouverture) · **investissement clair** (formule, nombre d'utilisateurs × prix, TVA non applicable art. 293 B) · prochaine étape. Courte (une page), **le prix en haut, pas caché**. Les formules et prix : `tarifs.html` uniquement. Gabarit et erreurs fréquentes : `references/demonstration-et-proposition.md`.

## Calculateur de rentabilité

À partir des chiffres **du prospect**, pas des nôtres : entrées (heures par semaine sur devis, rapports, planning ; nombre d'utilisateurs ; taux horaire qu'il se donne), calcul explicite, sorties (coût de ce temps ; coût de l'abonnement ; différence). Le **temps gagné** est une hypothèse qu'il choisit lui-même (« si vous gagniez un quart de ce temps »). Aucun « gain moyen de nos clients » tant que nous n'avons pas mesuré chez nous. Le calcul s'écrit, il ne se promet pas.

## Fiches concurrents et analyse des gagnés/perdus

- **Fiche concurrent** : une page par concurrent, **datée et sourcée**, avec « quand on le croise », « pourquoi on le choisit », « où il est fort » (honnêtement), « où nous gagnons — avec preuve », questions de découverte, objections, **quand le laisser gagner**. Demander quel concurrent avant de rédiger ; ne pas deviner. À revérifier régulièrement.
- **Gagnés/perdus** : inventorier les sources (motif noté par le vendeur, échanges, retours des prospects), **inclure les gagnées**, compter avec l'effectif (« 3 des 5 refus citent le prix »), coder une raison principale avec une citation. Avec peu d'affaires (c'est notre cas), c'est un **signal à surveiller**, pas une conclusion : ne pas changer une fiche sur moins de cinq cas. Détail dans `references/objections.md`, fin.

## Téléphone

À la main de Justin : `references/appels-france.md`.

## Formats de livraison

| Besoin | Livrable |
|---|---|
| Page à laisser | Texte complet + indications de mise en page |
| Objections | Tableau : objection, vraie inquiétude, réponse, preuve, question |
| Objection en cours | Inquiétude probable, une réponse dite telle quelle, preuve, question |
| Démonstration | Scène par scène avec durées et points d'échange |
| Proposition | Texte section par section |
| Calculateur | Champs, formule écrite, affichage, exemple **marqué « exemple »** |
| Analyse perdus | Périmètre, constats avec effectifs et citations, actions |

## Skills voisins

- **copywriting**, **copy-editing** (pages et relecture) · **pricing** (formules, prix) · **product-marketing** (positionnement) · **cold-email** (le premier message) · **prospecting** (en amont) · **customer-research** (interviews de clients) · **onboarding**, **churn-prevention**.
- Non installés ici : `competitors`, `competitor-profiling`, `revops`, `offers`, `cro`.
