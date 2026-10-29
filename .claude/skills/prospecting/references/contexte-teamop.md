# Contexte TeamOP pour la vente et la prospection

> Lu par `prospecting`, `cold-email`, `sales-enablement`, `customer-research`, `lead-magnets` et `directory-submissions`. Fait le
> 28 octobre 2026 d'après `tarifs.html`, `metiers.html`, `llms.txt`, `server/agents-connaissance.js` et `server/agents-signature.js`.
> ⚠️ **Les prix et les formules vieillissent : relire `tarifs.html` avant de citer un chiffre**, et ne jamais en inventer un autre.
> Les prix « autorisés » dans un courriel sont ceux de `PRIX_FORMULES` (`server/agents-connaissance.js`) — le contrôle qualité des agents refuse le reste.

## Qui est TeamOP

- **TEAM OP** vend des applications pour **entreprises de terrain** (nettoyage, plomberie, électricité, chauffage/climatisation,
  anti-nuisibles « 3D », serrurerie, maçonnerie, menuiserie, peinture… : 22 packs métier préconfigurés + un réglage général, d'après
  `metiers.html`). Un éditeur français, des clients réels, des données réelles : on ne promet que ce qui existe.
- **OP GESTION** : interventions et planning, fiches clients, rapports avec photos et signatures, **devis et factures**, stock et bons de
  commande, pointage, registre sanitaire (métier 3D), exports. Application web et mobile, sans installation, données chiffrées AES-256.
- **OP MESSAGES** : la messagerie. **Pas encore ouverte** (`messages.html` fermée, en travaux) : ne jamais la vendre comme disponible ;
  elle est annoncée « bientôt », incluse avec Business Premium à sa réouverture.
- **Prix OP GESTION (28 octobre 2026)** : Pro **15 €**, Business **25 €**, Business Premium **50 €** par mois **et par utilisateur**, sans
  engagement, **TVA non applicable (art. 293 B du CGI)**. Un abonnement = un utilisateur ; une équipe de cinq prend cinq abonnements.
- **Démonstration publique** : `https://teamop.fr/demo.html`. **La semaine d'essai se propose APRÈS le retour de la personne, pas dans le
  premier message** (consigne de Justin à Léa, 23 octobre 2026). Le but d'un premier contact est de comprendre l'entreprise, pas d'enrôler.
- Création sur mesure d'une application : réservée à Business Premium, « demande étudiée, devis écrit accepté avant tout travail ».

## Les agents qui parlent aux prospects et aux clients

| Agent | Rôle | Particularité |
|---|---|---|
| **Pauline** | Prospection à froid d'entreprises | N'est pas sur le serveur : c'est **Harvey, sur le Mac de Justin**. Chaque courriel attend l'accord de Justin dans la messagerie de la Tour ; plafond du jour et montée en charge (« chauffe »). |
| **Léa** | Première réponse commerciale à une inscription ou une demande d'application | Se renseigne sur l'entreprise (recherche web bornée), rédige, passe le contrôle qualité, dépose un brouillon. Une réponse par adresse sur 30 jours. |
| **Camille** | Courrier et support (contact@, support@) | Lit tout ce qui arrive ; répond aux questions avec les seuls faits de l'offre ; passe la main à Chloé (propositions), Margaux (facturation de TeamOP : relances d'impayé), Jules (technique), Hugo (résiliation), Nina (demandes RGPD). |
| **Chloé** | Rédige la proposition à un prospect qui répond | |
| **Nina** | Sécurité, RGPD, contrats | Reçoit de Camille les demandes RGPD (délai légal d'un mois tenu et surveillé). Ne valide pas une campagne : c'est Justin ; on lui montre quand même une campagne neuve. |
| **Victor** | Chef d'équipe des agents | Rend compte à Justin. |

**Justin décide.** Aucun de ces skills n'envoie quoi que ce soit : ils aident à RÉDIGER, à QUALIFIER, à PRÉPARER. L'envoi passe par un
brouillon que Justin valide (ou par la charte « repondre_client » qu'il a ouverte lui-même dans la Tour).

## La forme d'un courriel d'agent (déjà imposée par le serveur — ne pas la contredire)

⚠️ **Valable pour Léa, Camille, Chloé (agents du serveur). PAULINE (Harvey) fait exception depuis le 29 octobre 2026** : son premier courriel est complet (présentation, fonctions du métier, tarifs publics, démonstration, appel à l'action,
avec les liens `https://teamop.fr/tarifs.html` et `https://teamop.fr/demo.html`) ; ses relances rappellent l'offre. Voir `exemples-courriels.md` et `cold-email/SKILL.md`. Les règles de droit (§3 de `droit-francais.md`) restent entières.

D'après `FORME` dans `server/agents-connaissance.js` :
- au nom de l'entreprise (« nous »), **en français, au vouvoiement** ;
- « **Bonjour,** » (jamais un prénom ni un nom : l'agent n'en connaît pas) ... « **Bien cordialement,** » ;
- courts paragraphes séparés par une ligne vide ; une liste numérotée **seulement** pour des questions, des tirets pour une liste d'avantages ;
- **texte brut** : ni Markdown, ni titre en capitales, ni émoji, ni lien, ni adresse, ni numéro de téléphone dans le corps ;
- **pas de signature** : le serveur l'ajoute (« Prénom — Assistante de TeamOP », l'adresse de la boîte, puis la mention
  « Message préparé par un assistant automatique de TeamOP. »). Un agent ne signe jamais « Justin ».
- **Aucune adresse ni aucun numéro ne part chez Claude** (règle de `sous-traitance.html`) : ce qu'on donne à un modèle est nettoyé avant.

## Ce qu'on ne fait jamais

- Écrire « 14 jours gratuits », « garantie satisfait ou remboursé », un nom de client, un chiffre de gain de temps, une capture de
  « résultat client » : **tant que ce n'est pas écrit sur le site ou validé par Justin, ça n'existe pas.**
- Citer un concurrent par un chiffre ou un défaut que personne n'a daté et sourcé.
- Utiliser un nom, une adresse ou une donnée d'un client réel dans un exemple (règle de `CLAUDE.md`).
- Faire passer un agent pour un humain (voir `droit-francais.md` §3).
