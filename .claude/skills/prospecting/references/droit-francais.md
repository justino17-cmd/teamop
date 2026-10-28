# Prospecter en France — ce que le droit demande

> ⚠️ **Écrit le 28 octobre 2026 pour TeamOP, d'après la connaissance générale du sujet — AUCUN texte n'a été relu à la source pour cette rédaction.**
> Ce n'est pas un conseil juridique. Chaque point renvoie au texte à relire (Légifrance, cnil.fr, fiches « prospection commerciale »
> de la CNIL). Avant toute campagne d'une certaine ampleur : relecture par Nina (l'agent RGPD de la Tour, qui tient déjà le délai légal des demandes) PUIS validation de Justin,
> ou d'un juriste. Quand ils seront fusionnés, l'agent `juriste` (branche `agent/juriste`, grille `.claude/juridique/GRILLE.md`) et le skill `rechercher-droit`
> sont faits pour relire ce fichier contre les textes officiels. Un point marqué **[à vérifier]** est un point sur lequel je n'ai pas de certitude ; il ne s'applique pas
> « parce que c'est écrit ici ».
>
> Ce fichier REMPLACE `compliance.md` de la source américaine (CAN-SPAM, CASL, UWG allemand, PECR) : ces régimes ne sont pas le nôtre.
> Il est lu par `prospecting`, `cold-email`, `sales-enablement`, `lead-magnets` et `directory-submissions`.

## 1. Quatre questions avant d'écrire une ligne

1. **À qui ?** Une personne morale ou un professionnel qui agit pour son entreprise (B2B), ou un **particulier** (B2C) ?
2. **Par quel canal ?** Courriel · SMS/MMS · téléphone · courrier postal · message privé d'un réseau social.
3. **Quelle adresse ?** Générique (`contact@`, `info@`) ou **nominative** (`prenom.nom@entreprise.fr`) — une adresse nominative désigne une
   personne : c'est une donnée personnelle, même sur un domaine d'entreprise. Une adresse générique d'une personne morale n'en est pas une.
4. **Le message a-t-il un rapport avec l'activité professionnelle de la personne ?** C'est la condition du régime « entre professionnels » :
   proposer un logiciel de gestion d'interventions à un plombier, oui ; lui proposer une assurance auto personnelle, non.

## 2. Le tableau qui décide du geste

| Canal | Destinataire | Consentement préalable ? | Ce qui est exigé |
|---|---|---|---|
| **Courriel** | Professionnel, adresse professionnelle, message en rapport avec son activité | **Non** (régime « B2B » reconnu par la CNIL — **[à relire sur la fiche CNIL « prospection par courrier électronique »]**) | Information claire sur le traitement (RGPD art. 13 ou 14), **droit d'opposition simple et gratuit annoncé dès le premier message et dans chaque message** (RGPD art. 21 ; CPCE L34-5), expéditeur identifié, objet fidèle |
| **Courriel** | Particulier (ou personne physique à adresse manifestement personnelle) | **OUI** — consentement libre, spécifique, éclairé, préalable (CPCE **L34-5**). Exception : clients, pour des produits ou services **analogues**, coordonnées recueillies lors de la vente, opposition offerte dès la collecte et à chaque envoi | Mêmes mentions + preuve du consentement (qui, quand, comment, pour quoi) |
| **SMS / MMS** | Tous | **Règle TeamOP : OUI, toujours, sans exception B2B** (plus stricte que le minimum légal) — même régime que le courriel (L34-5 vise « tout système automatisé de communications électroniques ») | Consentement conservé avec sa preuve ; « STOP » gratuit ; l'agent n'envoie JAMAIS de SMS de prospection tout seul |
| **Téléphone** | Particulier | Voir §4 | Bloctel, créneaux horaires, opt-in annoncé en 2026 — **[à vérifier]** |
| **Téléphone** | Professionnel | Non (Bloctel ne protège que les consommateurs) | Droit d'opposition (RGPD art. 21) dit dès l'appel ; **TeamOP : aucun agent n'appelle** — un humain seulement |
| **Courrier postal** | Tous | Non, mais droit d'opposition (RGPD art. 21) | Source des données, moyen simple de ne plus recevoir |
| **Message privé d'un réseau social** | Tous | Selon la plateforme et le cas — **[à vérifier]** | Conditions d'utilisation de la plateforme. **TeamOP : aucune automatisation** de LinkedIn ou d'un autre réseau |

### Le cas qui nous concerne le plus : l'artisan, l'entrepreneur individuel
Plombiers, électriciens, nettoyeurs indépendants sont souvent des **personnes physiques** qui exercent en nom propre. La CNIL les rattache au
régime professionnel quand l'adresse est professionnelle et que le message touche leur activité **[à relire sur la fiche CNIL]**. Règle TeamOP
pour trancher dans le doute : *adresse nominative sur un fournisseur grand public (gmail, orange, free…) sans lien visible avec l'activité,
ou numéro de mobile personnel* = on traite comme un particulier : **pas de prospection sans consentement**. Une adresse publiée sur le site
professionnel de l'entreprise ou dans son annuaire professionnel est une adresse professionnelle.

## 3. Ce que doit contenir un courriel de prospection (B2B)

1. **Qui écrit, pour le compte de qui.** L'expéditeur est identifiable : TEAM OP. **Il est interdit de dissimuler l'identité** de la
   personne pour le compte de laquelle le message est émis (CPCE L34-5), et la publicité par voie électronique doit être clairement
   identifiable comme telle (loi n° 2004-575, **LCEN art. 20**). → pas de fausse « personne », pas de photo ni de prénom fictifs, pas de
   « Re: » ou « Fwd: » inventés, pas d'objet sans rapport avec la prestation proposée (L34-5 l'interdit aussi).
2. **Que c'est un assistant automatique.** Le règlement européen sur l'IA (art. 50) demande de dire à la personne qu'elle échange avec
   une IA : le serveur de TeamOP pose la ligne `MENTION_IA` sous la signature de CHAQUE agent (`server/agents-signature.js`). Un texte
   rédigé pour un agent ne porte jamais sa propre signature ni son propre « Cordialement » : le serveur les écrit.
3. **D'où vient l'adresse** (RGPD art. 14, au plus tard au premier message) : « Votre adresse figure sur le site de votre entreprise. »
   Une phrase suffit. Si on ne peut pas dire d'où elle vient, on n'écrit pas.
4. **Pourquoi** (la finalité : vous présenter OP GESTION) et **sur quelle base** (intérêt légitime — RGPD art. 6, 1, f et considérant 47,
   qui cite la prospection directe). La mise en balance (« mon intérêt contre ses droits ») s'écrit une fois, dans le registre
   (`registre-traitements.html`, § prospection) — pas dans chaque courriel.
5. **Le droit de s'y opposer, dit clairement et à part** (RGPD art. 21 §4 : « explicitement porté à l'attention de la personne […] présenté
   clairement et séparément de toute autre information ») : une ligne à elle, pas noyée dans la signature. Moyen **gratuit et simple** :
   répondre « stop » suffit **si quelqu'un traite vraiment la réponse** (aujourd'hui personne ne le fait automatiquement : voir §5) ; un lien de désinscription est préférable.
6. **Un objet fidèle** et un message **court** (voir `cold-email`).
7. Pas de pièce jointe, pas de pixel de suivi (voir `cold-email/references/delivrabilite.md`).

## 4. Le téléphone (B2C seulement, et TeamOP n'en fait pas faire à un agent)

- Liste d'opposition au démarchage téléphonique **Bloctel** : un consommateur inscrit ne se démarche pas (Code de la consommation,
  L223-1 et suivants).
- Créneaux horaires et fréquence encadrés par arrêté (**arrêté du 29 décembre 2022**, appliqué depuis 2023) — jours ouvrables, plages
  limitées, nombre de tentatives par consommateur borné **[chiffres à relire dans l'arrêté]**.
- **[à vérifier]** Le démarchage téléphonique au consommateur est annoncé en **consentement préalable (opt-in)** à partir du
  **11 août 2026** (loi du 30 juin 2025 contre la fraude aux aides publiques). Si c'est bien en vigueur : plus aucun appel à un particulier
  sans accord préalable.
- En B2B : pas de Bloctel, mais le droit d'opposition (RGPD art. 21) se dit dans l'appel. Voir `sales-enablement/references/appels-france.md`.

## 5. Un refus se respecte tout de suite, et pour toujours

- Une opposition (« stop », « retirez-moi », « ne m'écrivez plus ») = **plus aucune prospection**, sur tous les canaux, immédiatement.
  La réponse à la personne (confirmer, effacer ou garder le minimum) se fait dans le délai du RGPD art. 12 (un mois **au plus** ; viser
  le jour même).
- On garde le **strict nécessaire pour ne pas la recontacter** (l'adresse, ou mieux son empreinte, et la date du refus) : c'est la
  liste de suppression. La CNIL admet ce minimum pour honorer l'opposition **[à relire]**. Pauline range déjà ces cas à l'état `refus`
  (relevé de la Tour). ⚠️ Une réponse « stop » arrive dans le Courrier ; Camille n'a PAS de catégorie « opposition » (28 octobre 2026) : selon son jugement elle la range « ignorer » ou en fait un brouillon, et rien ne la range
  tout seul en liste de suppression (à vérifier dans « à traiter » de la Tour). Tant que ce n'est pas fait, un humain (Justin) range la personne en `refus` le jour même.
- Une suppression se propage : une personne qui se désinscrit d'un courriel de prospection ne reçoit plus de lettre d'information
  commerciale non plus, sauf consentement distinct donné après coup.

## 6. D'où viennent les adresses — et d'où elles ne viennent jamais

| Permis | Interdit chez TeamOP |
|---|---|
| Le site de l'entreprise elle-même (page contact, mentions légales) | Fichiers achetés ou loués sans traçabilité de l'origine |
| Un annuaire professionnel public, dans ses conditions d'utilisation | Liste fuitée, base « trouvée » |
| Un contact qui a donné sa carte, répondu à un message, rempli un formulaire de TeamOP | Aspiration en masse de LinkedIn, de Google Maps, d'un annuaire dont les conditions l'interdisent |
| L'API publique de l'Annuaire des entreprises / base SIRENE pour VÉRIFIER une entreprise | **Deviner** une adresse nominative (`prenom.nom@`) : c'est créer une donnée sur une personne qui ne l'a pas donnée |
| | Une entreprise **non diffusible** (statut INSEE) : elle ne se prospecte pas |

Pour chaque coordonnée gardée : **la source (adresse web) et la date** — sans cela, on ne peut pas répondre à « comment avez-vous mon adresse ? »
(RGPD art. 14 et droit d'accès art. 15). Les outils d'aspiration respectent `robots.txt` et les conditions d'utilisation (voir
`scripts/web/LISEZMOI.md`). **Aucune donnée sensible** (santé, opinions, religion, difficultés financières…) ne sert à qualifier ou à personnaliser.

## 7. Combien de temps on garde un prospect

Repère courant de la CNIL pour la gestion commerciale : **3 ans** à compter de la collecte, ou du dernier contact **venant du prospect**
(une simple ouverture de courriel n'est pas un contact du prospect) **[à relire dans le référentiel CNIL « gestion commerciale »]**.
Le relevé de Pauline sur le serveur de la Tour est conservé 90 jours (`registre-traitements.html`) : ce sont deux durées différentes,
ne pas les confondre. Passé le délai : effacer, ou ne garder que la liste de suppression.

## 8. Sanctions (ordres de grandeur, à relire)

- RGPD : manquement aux droits des personnes (art. 12 à 22) = jusqu'à **20 M€ ou 4 % du chiffre d'affaires mondial** (art. 83 §5). La CNIL
  sanctionne régulièrement la prospection sans opposition ou sans information.
- CPCE L34-5 : contrôle et sanctions administratives par la DGCCRF **[montants à relire]**.
- Le premier risque réel d'une petite entreprise n'est pas l'amende : c'est la **plainte d'un destinataire** (à la CNIL, ou signalée à
  l'hébergeur de messagerie) qui fait classer le domaine en spam.

## 9. Les textes à relire (liste de travail, pas une garantie)

- **RGPD** (règlement UE 2016/679) : art. 6 §1 f et considérant 47 · art. 12, 13, 14, 15, 17, 21 · art. 83.
- **Code des postes et des communications électroniques** : **L34-5** (prospection directe par système automatisé de communications
  électroniques ; consentement des personnes physiques ; exception clients ; identité et objet ; moyen de s'opposer).
- **Loi n° 2004-575 du 21 juin 2004 (LCEN)**, art. 20 : publicité par voie électronique identifiable, annonceur identifié.
- **Code de la consommation** : L223-1 et suivants (Bloctel) ; L111-7-2 (information sur les avis en ligne) ; L121-1 et suivants (pratiques
  commerciales trompeuses).
- **Règlement (UE) 2024/1689 sur l'IA**, art. 50 (information de la personne qui échange avec une IA ; en vigueur pour cet article depuis le
  2 août 2026 — c'est la date que donne `server/agents-signature.js`).
- **CNIL** : fiches « La prospection commerciale par courrier électronique », « Prospection commerciale : les règles à respecter »,
  référentiel « gestion commerciale » (cnil.fr).
- **Arrêté du 29 décembre 2022** (créneaux de démarchage téléphonique) ; **loi du 30 juin 2025** (démarchage téléphonique, opt-in) **[à vérifier]**.

## 10. Ce que TeamOP fait déjà — pour ne pas le refaire ni le contredire

- `registre-traitements.html` (§ « prospection commerciale de TEAM OP ») : données, base (intérêt légitime), opposition respectée, relevé de 90 jours.
- Pauline (Harvey, sur le Mac de Justin) : **rien ne part sans l'accord de Justin** dans la messagerie de la Tour ; plafond du jour et montée en
  charge (« chauffe »), état `refus` ; chaque courriel dit sous sa signature que c'est un assistant automatique.
- `scripts/web/LISEZMOI.md` : cadre de la lecture du web (robots.txt, conditions d'utilisation, pas de donnée sensible).
- Charte des agents : « repondre_client » fermée par défaut, Justin l'ouvre depuis la Tour.
