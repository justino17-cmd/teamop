---
name: prospecting
description: "Trouver, qualifier et préparer une liste d'entreprises à contacter pour TeamOP (artisans et entreprises de terrain : nettoyage, plomberie, électricité, chauffage-climatisation, anti-nuisibles…), dans le cadre du droit français (RGPD, CPCE L34-5, CNIL). À utiliser pour « prospecter », « construire une liste de prospects », « trouver des entreprises », « cibler un métier ou une ville », « qualifier ce prospect », « rechercher cette entreprise avant de lui écrire », « signaux d'achat », « revoir le travail de Pauline », « qui contacter en premier ». Toujours vérifier la base légale et la source avant d'écrire à quelqu'un ; ne jamais aspirer LinkedIn ni Google Maps en masse ; ne jamais deviner une adresse nominative. Pour rédiger le message lui-même, voir cold-email et references/exemples-courriels.md. EN: find, qualify and prepare a French B2B prospect list under French rules."
metadata:
  version: 1.5.0-teamop
  source: coreyhaines31/marketingskills v2.13.9 (MIT) — traduit et adapté, voir PROVENANCE-marketingskills.md
---

> **Adaptation TeamOP** (28 octobre 2026). Traduit de `prospecting` (marketingskills 1.5.0, licence MIT — `LICENSE-marketingskills`), puis adapté :
> - **Le droit américain est remplacé par le droit français** : `references/droit-francais.md` remplace `compliance.md` (CAN-SPAM, CASL, PECR, UWG). Ce skill est
>   écrit pour que la question « puis-je lui écrire, par quel canal, sur quelle base ? » soit posée AVANT la liste, pas après.
> - **Branches** : la source en a quatre (SaaS, B2B, PME locales, signaux de demande). TeamOP vend à des entreprises de terrain : on garde « entreprises de
>   terrain » (la branche des PME locales, réécrite pour la France) et « signaux de demande » (premiers clients d'un métier neuf). La branche SaaS n'est pas reprise.
> - **Les outils de la source** (Apollo, ZoomInfo, Clay, RB2B, Sales Navigator…) sont des services payants et américains, dont plusieurs recoupent des données
>   personnelles sans que nous sachions d'où elles viennent : **non branchés ici**, et non utilisés sans décision de Justin. TeamOP lit des sources publiques à la
>   main (`references/sources-et-verification.md`) ; Pauline fait la même chose avec Harvey sur le Mac de Justin.
> - **Une liste de prospects est faite de données réelles** : elle se travaille dans le dossier temporaire de la session, **jamais dans le dépôt** (aucun nom,
>   adresse ni téléphone d'une entreprise réelle dans un fichier suivi par git).
> - **Ce skill ne contacte personne.** Il prépare. L'envoi passe par Pauline ou Léa, donc par l'accord de Justin (`references/contexte-teamop.md`).
> - Les agents lancés pour ce travail tournent en Sonnet.

# Prospecting — construire une liste qu'on a le droit de contacter

Tu es un expert de la prospection d'entreprises de terrain. Ton but : transformer une définition de cible en une liste **vérifiée, notée et
juridiquement contactable**, avec la source de chaque information.

## Avant de commencer

Si `.claude/product-marketing.md` (ou `.agents/product-marketing.md`) existe, le lire d'abord. Lire ensuite **`references/contexte-teamop.md`**
(ce que TeamOP vend, à qui, ce qui est interdit de promettre) et **`references/droit-francais.md`** (les règles — à relire à chaque campagne).

## Choisir la branche

| Branche | Vendre à | « Qualifié » veut dire | Sources principales |
|---|---|---|---|
| **Entreprises de terrain** | Artisans et PME de service (plomberie, électricité, chauffage, nettoyage, anti-nuisibles, serrurerie…) | Activité réelle + métier dans nos packs + zone + signe de besoin + coordonnée **publique et contactable** | Site de l'entreprise, annuaires professionnels, répertoires publics (`references/entreprises-de-terrain.md`) |
| **Signaux de demande** | Premiers clients d'un métier neuf, partenaires de conception | Une preuve **citée et publique** du besoin (forum, avis, offre d'emploi), pas seulement un bon profil | Forums de métier, avis publics, groupes professionnels — lus en lecture seule |

Branche mixte : prendre la dominante, emprunter les signaux de l'autre.

## Le cadre en cinq phases

### Phase 1 — Définir la cible (ICP)
Ne pas commencer la découverte sans elle. Rédiger un paragraphe et une liste de critères réussi/échec :
1. **Métier** (l'un des packs de `metiers.html`, ou « autre métier de terrain » avec le réglage général).
2. **Taille** : travailleur seul, équipe de 2 à 10, plus. (Un abonnement = un utilisateur : plus l'équipe est grande, plus le panier l'est.)
3. **Zone** : département, ville, rayon. (Une prospection locale se fait mieux avec des preuves locales.)
4. **Pourquoi maintenant** : recrute, vient de s'immatriculer, avis de clients qui parlent de retards ou de devis tardifs, ouvre une agence…
5. **Qui décide** : le dirigeant, presque toujours. Dans une entreprise de terrain, c'est la même personne qui lit le courriel et qui est sur un chantier.
6. **À écarter** : ce qui fait dire « on passe » (entreprise en cessation, non diffusible, métier sans pack ET sans réglage utile, déjà cliente, a déjà refusé).

### Phase 2 — Bâtir la liste (découverte)
Chercher 2 à 3 fois plus de candidats que de contacts voulus : la qualification en éliminera beaucoup. Mieux vaut 25 vérifiés que 250 douteux.
Recouper au moins deux sources pour une même entreprise (`references/sources-et-verification.md`). La navigation est celle d'un visiteur : on lit, on ne
vide pas un site, on respecte `robots.txt` et les conditions d'utilisation, on n'écarte aucun CAPTCHA ni mur de connexion.

### Phase 3 — Qualifier chaque candidat
Noter chaque critère de la phase 1 **avec une preuve** (une adresse web, une date). Niveaux de confiance, partout :
- **Haute** : confirmée par deux sources indépendantes, ou par la page officielle de l'entreprise elle-même ;
- **Moyenne** : une source crédible + des recherches concordantes ;
- **Basse** : incomplète ou ambiguë — dire ce qui reste incertain.

**Puis, pour chaque candidat, répondre aux quatre questions de `references/droit-francais.md` §1** : professionnel ou particulier ? adresse générique ou nominative ?
canal autorisé ? rapport avec l'activité ? Un candidat dont on ne peut pas répondre est « Écarter » ou « À vérifier », jamais « Chaud ».

### Phase 4 — Noter et classer
| Note | Définition |
|---|---|
| **Chaud** | Bon profil + signe de besoin clair + dirigeant joignable + coordonnée professionnelle publique + canal autorisé |
| **Tiède** | Bon profil + signe plus faible ou plus ancien + coordonnée vérifiable |
| **Froid** | Profil lâche, ou aucun signe, ou coordonnée non vérifiée |
| **Écarter** | Critère d'exclusion : hors cible, fermé, doublon, non diffusible, déjà refusé, canal non autorisé (adresse de particulier), confiance basse |

Ratio d'ordre de grandeur : environ 20 % chauds, 30 % tièdes, le reste froid ou écarté. Un « Chaud » sans signe de besoin n'existe pas : le bon profil
seul ne donne pas le bon moment. Palier de recherche : les 10 à 25 meilleures entreprises reçoivent une fiche de recherche sourcée avant tout message
(`references/entreprises-de-terrain.md` § fiche) ; les autres reçoivent un message de segment.

### Phase 5 — La fiche de prospects
Un tableau dans la conversation (≤ 25 lignes), un fichier CSV **dans le dossier temporaire de la session** au-delà ou sur demande. Colonnes :

```
note · entreprise · métier · ville · signe de besoin · coordonnée (générique | nominative | aucune) · canal permis · source (adresse web) ·
date de relevé · confiance · base du contact · remarque
```
Après le tableau, toujours : **Premiers à contacter** (3 à 5 « chauds », une phrase chacun : le signe et le pourquoi maintenant) · **Paramètres de la
recherche** (branche, cible, zone, date) · **Ce que je n'ai pas pu vérifier**.

## Garde-fous (à relire à chaque fois)

1. **Pas d'aspiration en masse** de LinkedIn, de Google Maps, d'un annuaire payant ou limité en débit. Le navigateur est un outil de recherche assistée, pas un robot.
2. **Pas de contournement** de CAPTCHA, de mur de connexion ou de protection. Ce qui n'est pas visible publiquement n'existe pas pour nous.
3. **Coordonnées professionnelles publiées par l'entreprise elle-même seulement.** Pas de devinette d'adresse nominative, pas d'adresse perso.
4. **Source + date pour chaque coordonnée** : sans elles, on ne peut pas répondre à « comment avez-vous mon adresse ? » (RGPD art. 14 et 15).
5. **Aucune donnée sensible** (santé, opinions, religion, difficultés financières…) pour qualifier ou personnaliser, même si un post public la montre.
6. **Pas de revente** des données relevées ; une liste construite pour nos propres envois reste interne.
7. **Pas de données issues d'une fuite, d'un fichier acheté sans origine, d'un courtier sans traçabilité.**
8. **Se limiter soi-même** : espacer les requêtes, ne pas se faire passer pour un robot qu'on n'est pas.
9. **Un refus est définitif** : toute entreprise ou personne qui a dit non est « Écarter » pour toujours (`references/droit-francais.md` §5).

## Ce que Pauline écrit (29 octobre 2026)

Le premier courriel de Pauline n'est pas une question : il **présente TeamOP et OP GESTION, détaille ce que l'application apporte au métier visé, donne les tarifs publics et propose une démonstration**. Ses relances rappellent l'offre avec un bénéfice
différent à chaque fois. Deux exemples complets (nettoyage, plomberie) et leur grille de contrôle : `references/exemples-courriels.md`. Aucun contrôle du serveur ni de la relève ne borne la longueur ; la règle est dans `cold-email/SKILL.md`.

## Revoir le travail de Pauline

Pauline (Harvey, sur le Mac de Justin) envoie à la Tour un relevé toutes les 15 minutes : recherches, entreprises trouvées, courriels, réponses, chiffres du jour.
Quand Justin demande « qu'est-ce qu'elle a fait / est-ce que c'est bien » : lire ce relevé, puis vérifier **sur cinq entreprises prises au hasard** — la coordonnée
est-elle publique et professionnelle ? la source est-elle datée ? l'entreprise est-elle dans la cible ? le texte dit-il d'où vient l'adresse et comment se
désinscrire ? présente-t-il TeamOP et OP GESTION, les fonctions du métier, les tarifs et la démonstration (grille de `references/exemples-courriels.md`) ? Rendre un constat chiffré (« 4 sur 5 conformes, la cinquième : adresse nominative sans source »), jamais « ça a l'air bien ».

## Erreurs fréquentes

1. **Chercher sans cible.** On qualifie n'importe quoi.
2. **Croire un annuaire.** Ils sont souvent périmés : recouper avant de noter « Chaud ».
3. **Écrire avant d'avoir répondu aux quatre questions du droit.** On ne répare pas un message parti.
4. **« Chaud » sans signe de besoin.**
5. **Mélanger les cibles** (noter un électricien comme on note une agence de communication).
6. **Pas de source, pas de date.**
7. **Oublier la liste de suppression** : réécrire à quelqu'un qui a déjà dit non est la faute qui coûte le plus cher.
8. **Fichier de prospects dans le dépôt.** Données réelles : dossier temporaire, effacées quand la campagne est finie.

## Questions à poser (une ou deux à la fois)

1. Quel métier, quelle zone ? 2. Combien de prospects, dans quel délai ? 3. Quel signe de besoin compte le plus ? 4. Pour Pauline, pour Léa, ou pour un
contact de Justin à la main ? 5. Tableau dans la conversation ou fichier ?

## Skills voisins

- **cold-email** : rédiger le message et la séquence (étape suivante). · **customer-research** : comprendre pourquoi les clients achètent (nourrit la cible).
- **sales-enablement** : fiches, objections, scripts. · **product-marketing** : le positionnement qui ancre la cible. · **directory-submissions** : être trouvé à notre tour.
- Non installés ici : `competitor-profiling`, `revops` (acheminement et CRM).
