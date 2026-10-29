# Objections — bibliothèque pour un dirigeant d'entreprise de terrain

Réécrit pour TeamOP à partir de `objection-library.md` et `win-loss-analysis.md` (marketingskills, MIT). La bibliothèque d'origine répond à des acheteurs de logiciels d'entreprise américains (comité, DSI, RFP) ; ici
l'acheteur est un dirigeant d'artisan ou de PME de terrain, seul décideur, souvent pressé, parfois méfiant envers les « applications ».

**Règles de toutes les réponses** : on reconnaît d'abord · on répond à l'inquiétude, pas à la phrase · **une preuve défendable seulement** (le site, une capture, la démonstration) · on finit par une question · on ne dit jamais de mal d'un concurrent.
Les mentions « *[à confirmer]* » sont des faits que je n'ai pas relus dans le produit : à vérifier dans l'application ou sur le site AVANT de les dire.

| Objection (telle qu'on l'entend) | Vraie inquiétude | Réponse type | Preuve / suite |
|---|---|---|---|
| « C'est trop cher. » | Il compare à zéro (Excel, un carnet). Ou il redoute de payer pour une équipe qui n'utilisera pas. | « Je comprends. Le prix, c'est un abonnement par personne, sans engagement : si l'équipe ne s'en sert pas, vous arrêtez. Combien de temps passez-vous chaque semaine sur les devis et les rapports ? » | `tarifs.html` : de 15 € par utilisateur, **sans engagement**. Ne pas citer de gain chiffré. |
| « J'ai déjà Excel / un cahier. » | Ça marche, changer coûte de l'énergie. | « Excel fonctionne tant que vous êtes seul à y toucher. Qu'est-ce qui se perd le plus souvent chez vous : un rendez-vous, un devis, un rapport ? » (écouter, relier à la fonction qui répond) | Démonstration `demo.html` : montrer **cette** fonction seulement. |
| « J'ai déjà un logiciel. » | Il n'en est peut-être pas content ; ou il craint de tout reprendre. | « Très bien. Est-ce qu'il vous gêne quelque part : planning, devis, rapports ? » Si non, **ne pas insister** : le dire, laisser la page. | Ne rien dire du concurrent qu'on ne puisse pas sourcer. |
| « Je n'ai pas le temps de m'y mettre. » | Une semaine de désordre pendant la mise en route. | « Votre métier est préréglé à l'ouverture : types d'interventions, fiche de rapport. Vous ajoutez vos produits à votre rythme. On peut commencer par le planning seul. » | `metiers.html` ; proposer UN usage pour démarrer. |
| « Mes gars ne vont pas l'utiliser. » | Peur d'un outil que le terrain refuse. | « C'est la bonne question. Le rapport se remplit sur place depuis le téléphone, avec photos et signature, sans rien installer. Qui, chez vous, est le plus à l'aise pour l'essayer en premier ? » | Démonstration sur mobile ; faire essayer par UNE personne. |
| « Où sont mes données ? Elles sont sûres ? » | Une fuite, une perte, une dépendance. | « Elles sont chiffrées (AES-256), à vous, et exportables. » Ajouter l'hébergement **seulement** tel qu'écrit sur le site / `sous-traitance.html`. | `pourquoi.html` (sécurité) ; ne pas improviser un engagement de disponibilité. |
| « C'est une petite boîte, vous serez encore là ? » | Peur de perdre ses données ou son outil. | « C'est une vraie question. Vos données restent exportables à tout moment, vous n'êtes lié à rien. » *[à confirmer : formats d'export disponibles]* | Ne rien promettre sur l'avenir de l'entreprise. |
| « Je veux voir d'abord. » | Pas de risque, pas d'engagement. | « Bien sûr : la démonstration est publique, sans compte. Dites-moi ce que vous voulez y chercher. » | `demo.html`. La semaine d'essai se propose APRÈS son retour (consigne de Justin à Léa). |
| « Envoyez-moi de la documentation. » | Se débarrasser, ou vraie curiosité. | Envoyer **une seule chose** (la page à laisser) et **une question** facile à répondre. | |
| « Il faut que j'en parle à mon associé. » | Autorité réelle, ou prétexte. | « Naturellement. Que doit-il voir pour décider : le prix, la démonstration, un exemple de rapport ? » | Proposer de leur envoyer la démonstration à tous deux. |
| « Pas maintenant. » | Saison chargée, pas le bon moment. | Demander **quand** ; noter la date ; **arrêter la séquence** ; revenir une fois, à la date. | |
| « Ne m'écrivez plus. » | Agacement, ou autre chose. | **Pas de réponse commerciale.** Confirmer en une ligne, ajouter à la liste de suppression, fin. | `../../prospecting/references/droit-francais.md` §5. |

## Analyser les gagnées et les perdues (petit effectif)

Condensé de `win-loss-analysis.md`. Avec quelques dizaines d'affaires par mois au mieux, **chaque chiffre est un signal, pas une vérité**.
1. **Sources** : motif noté par Justin ou Camille (biaisé vers « prix » et « pas maintenant »), échanges réels, retours directs des prospects (les plus francs, les plus rares).
2. **Inclure les gagnées** : un motif de perte ne dit rien sans les affaires gagnées dans la même situation.
3. **Segmenter avant de compter** : par métier, par taille d'équipe, par origine (Pauline, inscription, bouche-à-oreille), par étape où ça s'est arrêté.
4. **Coder** une raison principale (plus les secondaires), avec une citation et la source.
5. **Rendre avec l'effectif** : « 3 refus sur 5 citent le prix », jamais « le prix est le premier motif ». Sous cinq affaires : à surveiller, pas à agir.
6. **Transformer en actions** : mettre à jour la bibliothèque ci-dessus, les questions de découverte, et remonter les manques du produit à Justin. Une affaire notée d'un seul mot est de confiance basse : la confirmer avant de modifier quoi que ce soit.
