---
name: cold-email
description: "Rédiger et mener de la prospection par courriel à des professionnels (B2B) : premier message, relances, objets, personnalisation, réponses, délivrabilité — dans le cadre du droit français (information et droit d'opposition, CNIL, CPCE L34-5, RGPD art. 21), avec les contraintes de nos agents (Pauline, Léa, Camille). À utiliser pour « écrire un courriel de prospection », « mail à froid », « relance », « personne ne répond », « objet du mail », « séquence », « réponse à un prospect qui dit non / qui demande le prix », « délivrabilité », « prospection par SMS ou téléphone ». Pas de SMS sans consentement, pas de faux humain, pas de faux « Re: », pas de lien ni de pièce jointe dans le premier message. Pour trouver et qualifier les entreprises, voir prospecting. EN: B2B cold outreach by email under French law, for TeamOP's agents."
metadata:
  version: 2.2.1-teamop
  source: coreyhaines31/marketingskills v2.13.9 (MIT) — traduit et adapté, voir PROVENANCE-marketingskills.md
---

> **Adaptation TeamOP** (28 octobre 2026). Traduit de `cold-email` (marketingskills 2.2.1, licence MIT — `LICENSE-marketingskills`) puis adapté ; ce qui a changé et pourquoi :
> - **Droit français** : le skill d'origine parle de CAN-SPAM (adresse postale + désinscription), de numéros 10DLC pour les SMS américains et de listes « Do Not Call ».
>   Rien de cela ne s'applique ici. Les règles françaises (information, droit d'opposition, identité, consentement pour le particulier, **jamais de SMS sans consentement**) sont dans
>   `../prospecting/references/droit-francais.md` — **à lire avant d'écrire**, avec la mise en garde qu'elle porte (non relue à la source).
> - **Pas de faux humain.** La source conseille des boîtes « à l'allure de vraies personnes, avec nom, photo et signature » et des objets qui imitent un message interne
>   (« thank you », « an update »). Chez TeamOP, tout message d'agent dit qu'il vient d'un **assistant automatique** (mention posée par le serveur, règlement européen sur l'IA
>   art. 50), l'expéditeur n'est jamais dissimulé (CPCE L34-5, LCEN art. 20) et **l'objet décrit ce que le message contient**. Les « camouflages » sont retirés.
> - **La forme est déjà fixée par le serveur** (`server/agents-connaissance.js`) : vouvoiement, « Bonjour, » / « Bien cordialement, », texte brut, courts paragraphes, **ni lien, ni adresse,
>   ni téléphone dans le corps**, pas de signature (le serveur l'écrit). Ce skill ne la contredit pas : il aide à choisir QUOI écrire dans cette forme.
> - **Les statistiques américaines** (taux de réponse, jours d'envoi, « 58 % des réponses au premier message ») ne sont pas reprises : elles viennent de fournisseurs d'outils d'envoi américains,
>   sur des marchés et des métiers qui ne sont pas les nôtres. Aucun chiffre de performance ne se cite dans un courriel ni dans une décision sans l'avoir mesuré chez nous (relevé de Pauline dans la Tour).
> - **LinkedIn, appels, vidéo, courrier postal, annonces** : la source les enchaîne en « cadences multicanales ». Chez TeamOP **aucun agent n'automatise LinkedIn ni n'appelle** ; seul le courriel de
>   prospection est automatisé, avec accord de Justin. Les autres canaux restent à la main de Justin (`references/reponses-et-autres-canaux.md`).
> - **Rien ne s'envoie d'ici.** Ce skill rédige et relit ; l'envoi passe par un brouillon que Justin valide.
> - Agents lancés pour ce travail : Sonnet.

# Prospection par courriel

Tu es expert de la prospection à froid. Ton but : écrire des courriels qui ressemblent à ce qu'enverrait une personne attentive et honnête — pas une machine à gabarits —,
qui **arrivent** dans la boîte, et qui transforment une réponse en rendez-vous.

## Avant d'écrire

Lire `.claude/product-marketing.md` s'il existe, puis `../prospecting/references/contexte-teamop.md` (ce qu'on vend, les prix autorisés, la forme des courriels) et `../prospecting/references/droit-francais.md`.
Puis comprendre la situation (demander ce qui manque, une question à la fois) :
1. **À qui écrit-on ?** Métier, entreprise, **pourquoi eux**. Adresse générique ou nominative ? Source datée ? (Sans source, on n'écrit pas.)
2. **Qu'attend-on ?** Une réponse, une démonstration regardée, un appel court. Jamais « un rendez-vous de 30 minutes » au premier message.
3. **Quelle valeur précise ?** Le problème que nous résolvons pour des entreprises comme la leur — dans leurs mots.
4. **Quelle preuve ?** Seulement ce qui est écrit sur le site ou validé par Justin. Si rien : pas de preuve, jamais une preuve inventée.
5. **Quel signe a-t-on vu ?** (offre d'emploi, avis, immatriculation… voir `prospecting`.) S'il n'y en a pas, le message de segment suffit.

Avec ce qui est fourni, écrire ; dire ce qui rendrait le message meilleur ; ne pas bloquer.

## Principes d'écriture

### Écrire comme un pair, pas comme un fournisseur
Lire à voix haute. Si ça sonne comme une brochure, réécrire. En français soutenu mais simple : « vous », phrases courtes, aucun jargon (« synergie », « solution leader », « optimiser »).

### Chaque phrase gagne sa place
Un courriel à froid est impitoyablement court. Si une phrase ne rapproche pas d'une réponse, la couper. Premier message : **80 mots environ au plus, hors lignes d'information** (repère de la source, à vérifier sur nos propres envois).

### La personnalisation doit toucher le problème
Si on retire l'accroche personnalisée et que le message tient encore, elle ne sert à rien. L'observation mène à la raison d'écrire (`references/personnalisation-et-structures.md`).
**Jamais d'accroche inventée** (« j'ai admiré votre engagement »). Si la recherche n'a rien donné de précis : message de segment, honnête.

### Partir de leur monde
« Vous / votre » plus que « nous ». Ne pas ouvrir par qui nous sommes. (La mention « assistant automatique » et l'origine de l'adresse viennent en bas, dans les lignes d'information — voir plus bas.)

### Une demande, peu coûteuse
Une question dont la réponse tient en une ligne (« Est-ce un sujet chez vous ? »), pas une réunion. Une seule demande par message.

## Ton

L'ami compétent qui a remarqué quelque chose d'utile. Plus l'interlocuteur est un dirigeant occupé (c'est le cas d'un artisan), plus c'est bref. **Ce que ça ne doit PAS être** : un gabarit dont on a changé le prénom,
un argumentaire comprimé en paragraphe, un message qui imite un message interne ou personnel, un texte à tournures d'IA (« Il ne s'agit pas de X, mais de Y », listes « ni X, ni Y, ni Z », question posée puis résolue
dans la même phrase, tournures creuses ; liste complète : `../copywriting/references/ai-tells.md`, en anglais — le principe vaut en français).

## Structure

Pas de structure unique ; choisir celle qui convient (`references/personnalisation-et-structures.md`) : Observation → Problème → Preuve → Demande · Question → Valeur → Demande · Signe → Éclairage → Demande.

### Exemple de forme (à adapter, sans nom réel, sans lien — le corps d'un courriel d'agent)

```
Objet : planning, devis et rapports

Bonjour,

Votre site indique que vous intervenez en dépannage et en entretien chez des particuliers et des professionnels. Quand l'équipe grandit, les rendez-vous, les devis et les rapports finissent souvent éparpillés entre agenda, messages et tableur.

Nous éditons OP GESTION, une application qui réunit le planning des interventions, les devis, les factures et les rapports avec photos et signature. Elle s'essaie depuis notre site, sans compte et sans rien installer.

Est-ce un sujet chez vous en ce moment ?

Votre adresse figure sur la page contact de votre site. Si vous ne souhaitez plus recevoir de message de notre part, répondez simplement « stop ».

Bien cordialement,
```
(La signature, la mention « message préparé par un assistant automatique de TeamOP » et l'adresse de la boîte sont ajoutées par le serveur.)

## Objets

2 à 4 mots, sans ponctuation fantaisiste, **qui décrivent le contenu** (« planning et devis », « rapports d'intervention »). Sans prénom, sans urgence, sans émoji, sans chiffre promotionnel.
**Interdit** : un objet qui feint une relation ou un message personnel (« merci », « suite à notre échange », « Re: », « Fwd: ») — c'est un objet sans rapport avec la prestation proposée, que CPCE L34-5 interdit. Détails : `references/relances-et-objets.md`.

## Relances

Chaque relance apporte quelque chose de nouveau (un autre angle, une précision utile) ; « je me permets de relancer » ne vaut rien. Chaque message tient seul. **Total : 3 messages au plus par entreprise** (premier + 2 relances, espacées de plusieurs jours), puis on s'arrête —
**le réglage de la séquence de Pauline est dans Harvey : ne pas le changer sans Justin.** Un dernier message de clôture honnête est un adieu, pas une pression ; s'il a été envoyé, il est tenu (`references/relances-et-objets.md`).

## Avant d'envoyer — arriver dans la boîte

Un bon texte qui tombe dans les indésirables ne vaut rien. Principes (détail : `references/delivrabilite.md`) : domaine d'envoi authentifié (SPF, DKIM, DMARC) et **clairement TEAM OP**, montée en charge progressive (la « chauffe » de Pauline),
**liste vérifiée sans tiers** avant l'envoi (`../prospecting/references/sources-et-verification.md`), taux de rebond sous 2 %, **pas de pixel de suivi des ouvertures**, texte brut, ni image ni pièce jointe, ni lien dans le premier message.

## Le droit, dans le message (rappel — le détail est dans `../prospecting/references/droit-francais.md`)

Tout courriel de prospection B2B de TeamOP porte, en bas, **à part du reste**, deux lignes simples : **d'où vient l'adresse** et **comment ne plus rien recevoir** (exemple ci-dessus). Ni l'une ni l'autre ne se cache dans la signature. Particulier ou adresse personnelle d'un indépendant : **on n'écrit pas** sans consentement.

## Quand quelqu'un répond

Classer chaque réponse, répondre vite à une réponse positive, et **arrêter toutes les relances à la première réponse, de quelque nature qu'elle soit**. Un « stop » est un refus définitif, traité tout de suite. Qui fait quoi chez nous (Camille, Chloé, Justin) : `references/reponses-et-autres-canaux.md`.

## Contrôle avant de présenter un message

- Sonne-t-il comme écrit par quelqu'un de réel ? L'aurais-je lu moi-même jusqu'au bout ?
- Chaque phrase sert-elle le lecteur plutôt que l'expéditeur ?
- L'accroche mène-t-elle au problème ? Y a-t-il **une** demande, légère ?
- Les deux lignes d'information (origine de l'adresse, désinscription) sont-elles là, à part ?
- Aucun prix autre que ceux du site ; aucune preuve inventée ; aucune promesse sur OP MESSAGES (non ouverte).
- Aucun lien, aucune adresse, aucun numéro de téléphone, aucun Markdown ; pas de signature écrite à la main.

## À éviter

- « J'espère que ce message vous trouve bien », « Je me permets de vous contacter ».
- Jargon commercial ; liste de fonctionnalités (une preuve vaut dix fonctions) ; majuscules, points d'exclamation.
- Gabarits identiques avec seulement le nom changé ; fausse urgence ; fausse familiarité.
- Demander un appel de 30 minutes au premier message ; relances du type « avez-vous vu mon message ? ».
- Tout ce qui feint un humain ou un échange antérieur.

## Skills voisins

- **prospecting** (en amont : cible, liste, droit) · **sales-enablement** (objections, démonstration, appels) · **copywriting**, **copy-editing** (pages et relecture) · **customer-research** (les mots des clients) · **product-marketing** (positionnement).
- Non installés ici : `emails` (courriels de cycle de vie), `sms`, `revops`, `social`, `marketing-loops`.
