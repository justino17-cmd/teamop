# Délivrabilité — arriver dans la boîte

Condensé et adapté de `deliverability.md` (marketingskills, MIT). La source est écrite pour de l'envoi à très grande échelle avec des dizaines de boîtes jetables : **nous ne faisons rien de cela**.
Les chiffres de volume et les règles des fournisseurs de messagerie changent sans préavis ; ce fichier donne des principes, les chiffres sont des points de départ **à mesurer**.

## Ce qui ne s'applique pas

| La source conseille | Chez TeamOP |
|---|---|
| Dizaines de boîtes sur domaines secondaires, « à l'allure de vraies personnes, avec nom, photo et signature » | **Non.** Un expéditeur dissimulé est interdit (CPCE L34-5) et nos agents se présentent comme assistants automatiques. Une boîte d'envoi, identifiable. |
| Boîtes revendues, réseaux de « chauffe » où des boîtes se répondent entre elles | **Non** par défaut : de faux échanges pour tromper les filtres. La montée en charge de Pauline (la « chauffe » de Harvey : un plafond du jour qui croît) suffit. |
| Une ligne de désinscription + adresse **postale** (CAN-SPAM) | **Remplacé** par : origine de l'adresse + moyen de ne plus recevoir, à part du reste (`../../prospecting/references/droit-francais.md` §3). |
| Mesurer à l'ouverture | **Non** : pas de pixel de suivi (voir plus bas). On mesure les réponses. |

## Mise en place

1. **Ne pas envoyer la prospection depuis le domaine principal** dont dépendent les factures, les mots de passe et les réponses de Léa et de Camille. Un domaine ou sous-domaine d'envoi **à nos couleurs** (clairement TEAM OP, redirigé vers le site) ; jamais un nom qui cache qui nous sommes. **Ce qui est réellement en place pour Pauline : à lire avec Justin dans la configuration de Harvey** — ce skill ne l'a pas vérifié.
2. **Authentifier** : SPF, DKIM, DMARC (commencer à `p=none` avec rapports), alignés sur le domaine d'envoi.
3. **Monter progressivement** : environ quatre semaines de montée avant le plein volume ; commencer par quelques messages par jour. C'est exactement ce que fait la rampe de Pauline (`plafondDuJour`) : ne pas la contourner.
4. **Volume modeste** : quelques dizaines de messages par jour et par boîte au plus, relances comprises. Une prospection d'artisans n'a pas besoin de plus et ne le supporterait pas.

## Le message lui-même

- **Texte brut** ; pas d'image, pas de modèle HTML, pas de pièce jointe.
- **Pas de lien dans le premier message**, au plus un ensuite ; jamais de raccourcisseur. (C'est aussi la règle du serveur pour les courriels d'agents.)
- **Pas de pixel de suivi des ouvertures** : depuis les protections de vie privée des messageries, une « ouverture » ne mesure plus rien, et le pixel est un signal de pourriel. Il met aussi en jeu la vie privée du destinataire (information, consentement) **[à relire : fiche CNIL sur les traceurs]**. Mesurer les réponses.
- **Moins de 80 mots** pour le premier message, et des textes **variés** par segment : des milliers de corps identiques ressemblent à un envoi en masse.
- **Lignes d'information** (origine de l'adresse, désinscription) : texte simple, dans chaque message.

## Vérifier avant d'envoyer

Les rebonds abîment un domaine plus vite que tout. **Sous 2 % par campagne** (sous 1 % idéal) : une journée avec plusieurs pour cent de rebonds peut suffire à déclencher une revue chez un grand fournisseur.
Vérifier les adresses **sans les confier à un tiers** (`../../prospecting/references/sources-et-verification.md`), revérifier ce qui a plus d'une semaine, et **mettre une campagne en pause automatiquement** au-dessus de 2 % de rebonds.

## Surveillance (à faire, pas à croire)

| Quoi | Comment | Quand |
|---|---|---|
| Rebonds | Le retour de Harvey / relevé de la Tour | Chaque jour d'envoi |
| Plaintes « pourriel » | Outils des fournisseurs (Postmaster Tools de Google, SNDS de Microsoft) et réponses contenant « pourriel » ou « stop » | Chaque semaine |
| Réputation du domaine | Outils ci-dessus + listes noires publiques | Chaque semaine |
| Authentification | Rapports DMARC | Chaque mois |

## Règles d'arrêt — décidées avant le départ

| Signe | Geste |
|---|---|
| Rebonds > 2 % sur une campagne | Pause, revérifier la liste |
| Plaintes qui approchent 0,1 % | Pause, réduire, revoir la cible et le texte |
| Domaine sur une liste noire majeure | Arrêter d'envoyer depuis ce domaine |
| Moins de ~1 % de réponses après 300 envois | Arrêter : la cible ou l'offre est fausse, plus de volume aggrave |
| **Un seul « stop »** | Cette personne ne reçoit plus rien, immédiatement (`../../prospecting/references/droit-francais.md` §5) |

Erreurs fréquentes : envoyer depuis le domaine principal ; ne pas vérifier « parce que la source l'a fait » ; garder un pixel d'ouverture et optimiser un chiffre qui ne vaut rien ; augmenter le volume pour compenser un mauvais taux de réponse.
