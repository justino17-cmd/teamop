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
> - **La forme des courriels des agents du serveur** (Léa, Camille, Chloé : `server/agents-connaissance.js`) : vouvoiement, « Bonjour, » / « Bien cordialement, », texte brut, courts paragraphes, **ni lien, ni adresse,
>   ni téléphone dans le corps**, pas de signature (le serveur l'écrit). Ce skill ne la contredit pas pour eux : il aide à choisir QUOI écrire dans cette forme.
> - **Pauline fait exception, depuis le 29 octobre 2026 (Justin : « le but, c'est de contacter l'entreprise, leur proposer ce qu'on fait, d'expliquer tout en détail »).** Elle n'est pas sur le serveur
>   (c'est Harvey) : ni `FORME` ni aucun contrôle de `server/pauline.js` ou d'`outils/pauline-releve.py` ne borne la longueur, le nombre de phrases ou de questions d'un courriel — le serveur ne
>   garde que le texte (20 000 caractères au plus) et l'accord de Justin. La forme courte et la question unique venaient de CE skill. Le premier courriel de Pauline est donc **complet**
>   (section « Le premier courriel de Pauline »), avec les liens `teamop.fr/tarifs.html` et `teamop.fr/demo.html` ; ses relances sont brèves. Exemples : `../prospecting/references/exemples-courriels.md`.
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
Si une phrase ne sert pas le lecteur, la couper. **Deux formats, deux longueurs** : une réponse d'agent du serveur, une relance, un message de segment restent **brefs** (80 mots environ, hors lignes d'information) ;
**le PREMIER courriel de Pauline est complet** : il présente, détaille et propose (voir plus bas) — long, mais chaque phrase dit un fait vrai du produit ou aide à répondre. Longueur normale : 250 à 400 mots.

### La personnalisation doit toucher le problème
Si on retire l'accroche personnalisée et que le message tient encore, elle ne sert à rien. L'observation mène à la raison d'écrire (`references/personnalisation-et-structures.md`).
**Jamais d'accroche inventée** (« j'ai admiré votre engagement »). Si la recherche n'a rien donné de précis : message de segment, honnête.

### Partir de leur monde
« Vous / votre » plus que « nous » dans l'accroche. Réponse d'agent ou relance : ne pas ouvrir par qui nous sommes. **Premier courriel de Pauline** : une phrase sur leur métier (ce que le site dit), puis on se présente tout de suite — TeamOP et OP GESTION doivent être clairs dès le premier paragraphe. (La mention « assistant automatique » et l'origine de l'adresse viennent en bas, dans les lignes d'information.)

### Une demande, peu coûteuse
Une demande claire, peu coûteuse, qui est un vrai appel à l'action. Réponse d'agent : une question dont la réponse tient en une ligne (« Est-ce un sujet chez vous ? »). **Premier courriel de Pauline** : on propose une démonstration (en ligne, `teamop.fr/demo.html`, ou commentée par appel) et on dit comment répondre (« répondez à ce message en indiquant un créneau, ou dites-nous simplement que vous voulez la voir ») ; ce n'est PAS une question en l'air du type « comment faites-vous aujourd'hui ? », qui n'apprend rien au lecteur et ne lui donne rien. Pas de réunion de 30 minutes. Une seule demande, qui peut être formulée de deux façons (démonstration ou appel).

## Ton

L'ami compétent qui a remarqué quelque chose d'utile. Plus l'interlocuteur est un dirigeant occupé (c'est le cas d'un artisan), plus c'est bref. **Ce que ça ne doit PAS être** : un gabarit dont on a changé le prénom,
un argumentaire comprimé en paragraphe, un message qui imite un message interne ou personnel, un texte à tournures d'IA (« Il ne s'agit pas de X, mais de Y », listes « ni X, ni Y, ni Z », question posée puis résolue
dans la même phrase, tournures creuses ; liste complète : `../copywriting/references/ai-tells.md`, en anglais — le principe vaut en français).

## Structure

Pas de structure unique ; choisir celle qui convient (`references/personnalisation-et-structures.md`) : Observation → Problème → Preuve → Demande · Question → Valeur → Demande · Signe → Éclairage → Demande.

## Le premier courriel de Pauline : présenter, détailler, proposer

Posé par Justin le 29 octobre 2026 après des courriels jugés « complètement débiles » (une question seule, puis une relance « nous en restons là »). Un dirigeant de PME qui reçoit un message d'un éditeur
inconnu ne répond pas à une devinette : il répond à une offre qu'il comprend. Le premier courriel contient, dans cet ordre (textes complets : `../prospecting/references/exemples-courriels.md`) :

1. **Objet fidèle**, 3 à 6 mots, qui décrit l'offre : « OP GESTION pour le nettoyage », « Logiciel de gestion pour plombiers ». Pas de « Re: », pas de question vague.
2. **Qui nous sommes** (2 phrases) : TEAM OP, éditeur français ; OP GESTION, application de gestion pour les entreprises de terrain, sur téléphone et sur ordinateur, sans installation. Une phrase sur leur métier, tirée de ce que leur site dit vraiment (jamais inventée).
3. **Ce que ça change pour LEUR métier, en détail** (4 à 6 puces, ou courts paragraphes) : choisir dans les fonctions réelles — planning des interventions par agent, jour/semaine/mois, conflits et absences signalés ;
   rapport d'intervention sur place (prestations cochées, photos avant et après, signature du client sur l'écran) envoyé en PDF au client au nom de l'entreprise ; devis et factures, devis accepté transformé en facture,
   suivi des factures envoyées/payées/en retard ; contrats d'entretien et récurrences ; suivi des produits et du stock avec seuils d'alerte et bons de commande (Business) ; pointage des heures ; et les documents propres au métier
   (registre sanitaire et biocides pour les anti-nuisibles, relevés de passage pour le nettoyage…). Sources à reprendre mot pour mot : `contexte-teamop.md` et `logiciel-<métier>.html`. **Aucune fonction qui n'y figure pas.**
4. **Les tarifs publics**, tels quels : Pro 15 € / mois par utilisateur, Business 25 €, Business Premium 50 € ; un abonnement = un utilisateur ; sans engagement de durée ; TVA non applicable (art. 293 B du CGI). Ce qu'ajoute chaque formule en une ligne
   (Business : stock, bons de commande, comptabilité ; Premium : toutes les fonctions du métier, accompagnement). Lien : `https://teamop.fr/tarifs.html`. **Relire `tarifs.html` avant d'écrire un chiffre.**
5. **Voir avant de décider** : la démonstration `https://teamop.fr/demo.html`, et la proposition d'un appel ou d'une démonstration commentée, avec la façon de répondre. **Pas** « 14 jours gratuits », pas de semaine d'essai (elle se propose après le retour de la personne), pas de remise.
6. **Les lignes d'information, à part** : d'où vient l'adresse (une phrase, avec la source), pourquoi on écrit (présenter OP GESTION, intérêt légitime), comment ne plus être contacté (« répondez “stop” »). Le serveur ajoute la signature et la mention « assistant automatique ».

Interdits inchangés : aucun client cité, aucun chiffre de gain de temps, aucune promesse sur OP MESSAGES, aucun mot « gratuit/offert/garanti/remise », aucune fausse familiarité, aucun « Re: ».

### Exemple de forme d'une réponse d'agent du serveur (brève, sans lien — pas celle du premier courriel de Pauline)

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

Chaque relance apporte quelque chose de nouveau (un autre angle, une précision utile) ; « je me permets de relancer » ne vaut rien. Chaque message tient seul. **Relances de Pauline** : 5 à 8 lignes qui RAPPELLENT l'offre (OP GESTION en une phrase, `tarifs.html` et `demo.html`) avec **un bénéfice concret différent à chaque fois** (relance 1 : le rapport d'intervention en PDF envoyé au client ; relance 2 : devis et factures, ou le stock, ou le document du métier), et la même proposition de démonstration. Plus de « nous en restons là pour le moment » ni de « un simple mot suffira pour reprendre » : ces phrases ne disent rien de l'offre. **Total : 3 messages au plus par entreprise** (premier + 2 relances, espacées de plusieurs jours), puis on s'arrête —
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
- L'accroche mène-t-elle au problème ? Y a-t-il **une** demande claire (premier courriel de Pauline : présentation, détail du métier, tarifs, démonstration — rien de tout cela ne manque) ?
- Les deux lignes d'information (origine de l'adresse, désinscription) sont-elles là, à part ?
- Aucun prix autre que ceux du site ; aucune preuve inventée ; aucune promesse sur OP MESSAGES (non ouverte).
- Aucune adresse électronique, aucun numéro de téléphone, aucun Markdown ; pas de signature écrite à la main. Agents du serveur : aucun lien. Pauline : seuls `https://teamop.fr/tarifs.html` et `https://teamop.fr/demo.html` (aucun autre site).

## À éviter

- « J'espère que ce message vous trouve bien », « Je me permets de vous contacter ».
- Jargon commercial ; majuscules, points d'exclamation. (La liste de fonctions est permise dans le premier courriel de Pauline, mais seulement celles du métier visé et seulement les vraies.)
- Un premier courriel réduit à une question (« comment faites-vous aujourd'hui ? ») ou une relance de clôture sèche : c'est ce qui a été jugé « complètement débile » le 29 octobre 2026.
- Gabarits identiques avec seulement le nom changé ; fausse urgence ; fausse familiarité.
- Demander un appel de 30 minutes au premier message ; relances du type « avez-vous vu mon message ? » ou « nous en restons là ».
- Tout ce qui feint un humain ou un échange antérieur.

## Skills voisins

- **prospecting** (en amont : cible, liste, droit) · **sales-enablement** (objections, démonstration, appels) · **copywriting**, **copy-editing** (pages et relecture) · **customer-research** (les mots des clients) · **product-marketing** (positionnement).
- Non installés ici : `emails` (courriels de cycle de vie), `sms`, `revops`, `social`, `marketing-loops`.
