# Référentiel des métiers d'OP GESTION

Version lisible pour Justin. Le fichier que le code lit est `metiers.json`, à la racine du dépôt : c'est lui qui fait foi (l'ancienne copie `design/metiers-referentiel.json` a été supprimée le 23 octobre 2026 — une seule source), ce document en est la lecture.

Fait dans la nuit du 22 au 23 octobre 2026, à partir de :
- tes demandes (`cahier-metiers.md`) et la carte du code (`carte-metiers.md`) ;
- `app.html` : `NAV` (les 41 rubriques) et `METIERS` (les 13 packs) ;
- deux recherches web : les 13 métiers actuels, et les métiers qui pourraient s'ajouter.

**Rien n'a été retiré du code.** Les types d'intervention, les prestations et les relevés des 13 métiers actuels sont repris tels quels ; seuls des ajouts s'y greffent, et ils sont nommés un par un. Aucun fichier du dépôt n'a été touché.

## Comment lire

- **Ouverte** = cochée d'office quand le client choisit son métier, avec une raison écrite pour ce métier-là.
- **Proposée** = visible dans la page d'abonnement, décochée, avec la raison de la cocher ou non.
- Toute autre rubrique n'est pas proposée, mais tu peux toujours l'ouvrir depuis la Tour à la demande du client.
- Quatre rubriques ne se décochent jamais : Tableau de bord, Utilisateurs, Modules OP, Paramètres.
- Une obligation légale n'est écrite que **avec sa source**. Ce qui n'a pas pu être sourcé est dans « À vérifier », jamais dans « Obligations ». Niveaux de fiabilité : *officielle* (texte de l'administration), *professionnelle* (fédération, organisme), *secondaire* (assureur, site d'information, document local). « à confirmer » = à relire sur Légifrance avant d'écrire une règle dans l'application.

## 1. Vue d'ensemble : quelles rubriques pour quel métier

● ouverte d'office · ○ proposée, décochée · ○* proposée seulement quand le registre sera rendu utilisable hors anti-nuisibles · — non proposée.
Le **socle commun** (17 rubriques : Tableau de bord, Historique, Planning, Planning général, Tâches, Absences & congés, Interventions, Rapports, Clients, Devis, Assistant devis, Factures, Temps de travail, Messagerie, Utilisateurs, Modules OP, Paramètres) est ouvert à tous : une équipe de terrain a toujours un planning, des interventions, des clients, des devis, des factures, des heures à pointer et une messagerie. Sa raison est quand même écrite métier par métier plus bas.

### Les 13 métiers actuels

| Rubrique | 🐀 3d | 🔧 plomberie | ⚡ electricite | 🔥 chauffage | 🔑 serrurerie | 🧽 nettoyage | 🧱 maconnerie | 🚪 menuiserie | 🖌️ peinture | 🌿 paysagiste | 🏠 couverture | 🛠️ multiservices | 🧰 autre |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| *Socle commun (17)* | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 📈 Statistiques | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🗄️ Archives mensuelles | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🗺️ Carte interventions | ● | ● | ● | ● | ● | ● | ○ | ○ | ○ | ● | ○ | ● | ○ |
| 📋 Registre sanitaire | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 📍 Carte des box | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 📑 Contrats | ● | ○ | ○ | ● | ○ | ● | — | — | — | ● | ○ | ● | ○ |
| 📊 Comptabilité | ○ | ● | ● | ○ | ● | ○ | ● | ● | ● | ○ | ● | ○ | ○ |
| 🪵 Devis xylophage | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 💳 Télécollecte | ○ | ● | ● | ○ | ● | — | — | ○ | — | ○ | — | ○ | ○ |
| 📦 Produits | ● | ● | ● | ● | ● | ● | ○ | ● | ● | ● | ○ | ○ | ○ |
| 🗃️ Stock | ● | ● | ● | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🔁 Mouvements stock | ● | ● | ● | ● | ● | ○ | — | ○ | ○ | ○ | ○ | ○ | ○ |
| 🧱 Boxes | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 📋 Consommation produits | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 📮 Enveloppes | ● | — | — | — | — | — | — | — | — | — | — | — | — |
| 🚐 Véhicules | ● | ● | ● | ● | ● | ○ | ● | ○ | ○ | ● | ● | ● | ○ |
| 🧑‍✈️ Conducteurs | ○ | ○ | ○ | ○ | ○ | — | ○ | — | — | ○ | ○ | ○ | ○ |
| 📧 Boîte mail | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🏭 Fournisseurs | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ○ | ○ |
| ✉️ Bons de commande | ● | ● | ● | ● | ● | ○ | ● | ● | ● | ● | ● | ○ | ○ |
| 📝 Brouillon | ● | ○ | ○ | ○ | — | — | ○ | — | — | — | ○ | — | ○ |
| ✈️ Mes demandes | ● | ○ | ○ | ○ | — | — | ○ | — | — | — | ○ | — | ○ |
| ✅ Validations DR | ● | ○ | ○ | ○ | — | — | ○ | — | — | — | ○ | — | ○ |
| 📥 Commandes en cours | ● | ○ | ○ | ○ | — | — | ○ | — | — | — | ○ | — | ○ |
| 📌 Secteurs | ● | — | — | ○ | — | ● | — | — | — | ● | — | ○ | ○ |
| **Rubriques ouvertes** | **36** | **26** | **26** | **25** | **26** | **23** | **21** | **21** | **21** | **24** | **21** | **20** | **17** |

### Les 10 nouveaux métiers

| Rubrique | 🧯 incendie | ❄️ froid | 🛗 ascenseurs | 🚧 portails | 🧹 ramonage | 🚛 assainissement | ☀️ energies | 📹 alarme | 💧 eau | 🏊 piscine |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| *Socle commun (17)* | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 📈 Statistiques | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ |
| 🗄️ Archives mensuelles | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🗺️ Carte interventions | ● | ● | ● | ● | ● | ● | ○ | ● | ● | ● |
| 📋 Registre sanitaire | ○* | ○* | ○* | — | — | ○* | — | — | ○* | — |
| 📍 Carte des box | — | — | — | — | — | — | — | — | — | — |
| 📑 Contrats | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 📊 Comptabilité | ○ | ○ | ○ | ○ | ● | ○ | ● | ○ | ○ | ● |
| 🪵 Devis xylophage | — | — | — | — | — | — | — | — | — | — |
| 💳 Télécollecte | — | ○ | — | ○ | ● | ○ | — | — | ○ | ○ |
| 📦 Produits | ● | ● | ● | ● | ● | ○ | ● | ● | ● | ● |
| 🗃️ Stock | ● | ● | ● | ● | ● | ○ | ● | ● | ● | ● |
| 🔁 Mouvements stock | ● | ● | ● | ○ | ○ | — | ● | ○ | ● | ● |
| 🧱 Boxes | — | — | — | — | — | — | — | — | — | — |
| 📋 Consommation produits | — | — | — | — | — | — | — | — | — | — |
| 📮 Enveloppes | — | — | — | — | — | — | — | — | — | — |
| 🚐 Véhicules | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |
| 🧑‍✈️ Conducteurs | ○ | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ |
| 📧 Boîte mail | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 🏭 Fournisseurs | ● | ● | ● | ● | ○ | ○ | ● | ● | ● | ● |
| ✉️ Bons de commande | ● | ● | ● | ● | ○ | ○ | ● | ● | ● | ● |
| 📝 Brouillon | — | ○ | ○ | — | — | — | ○ | — | — | — |
| ✈️ Mes demandes | — | ○ | ○ | — | — | — | ○ | — | — | — |
| ✅ Validations DR | — | ○ | ○ | — | — | — | ○ | — | — | — |
| 📥 Commandes en cours | — | ○ | ○ | — | — | — | ○ | — | — | — |
| 📌 Secteurs | ○ | ○ | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| **Rubriques ouvertes** | **25** | **25** | **25** | **24** | **25** | **23** | **25** | **24** | **25** | **26** |

**Ce que la grille dit de ta remarque.** L'anti-nuisibles a bien des fournisseurs, des bons de commande, du stock et des achats internes : tout est ouvert pour la 3D, ainsi que Contrats, Véhicules et Secteurs. La différence avec les 12 autres packs, qui avaient tous le même masque, est qu'ici chaque case est un jugement :
- **fournisseurs** : ouverts pour la 3D, plomberie, électricité, chauffage / climatisation, serrurerie, nettoyage, maçonnerie, menuiserie, peinture, paysagiste, couverture, sécurité incendie, froid commercial, ascenseurs, portes et portails, énergies (photovoltaïque, bornes), alarme et vidéosurveillance, traitement de l’eau, piscine ; seulement proposés pour multiservices, « autre métier », ramonage, assainissement ;
- **bons de commande** : ouverts pour la 3D, plomberie, électricité, chauffage / climatisation, serrurerie, maçonnerie, menuiserie, peinture, paysagiste, couverture, sécurité incendie, froid commercial, ascenseurs, portes et portails, énergies (photovoltaïque, bornes), alarme et vidéosurveillance, traitement de l’eau, piscine ; seulement proposés pour nettoyage, multiservices, « autre métier », ramonage, assainissement ;
- **stock** : ouvert pour la 3D, plomberie, électricité, chauffage / climatisation, serrurerie, nettoyage, sécurité incendie, froid commercial, ascenseurs, portes et portails, ramonage, énergies (photovoltaïque, bornes), alarme et vidéosurveillance, traitement de l’eau, piscine ; proposé pour maçonnerie, menuiserie, peinture, paysagiste, couverture, multiservices, « autre métier », assainissement ;
- **véhicules** : ouverts pour la 3D, plomberie, électricité, chauffage / climatisation, serrurerie, maçonnerie, paysagiste, couverture, multiservices, sécurité incendie, froid commercial, ascenseurs, portes et portails, ramonage, assainissement, énergies (photovoltaïque, bornes), alarme et vidéosurveillance, traitement de l’eau, piscine ; proposés pour nettoyage, menuiserie, peinture, « autre métier » ;
- **contrats** : ouverts là où le revenu est récurrent (la 3D, chauffage / climatisation, nettoyage, paysagiste, multiservices, sécurité incendie, froid commercial, ascenseurs, portes et portails, ramonage, assainissement, énergies (photovoltaïque, bornes), alarme et vidéosurveillance, traitement de l’eau, piscine) ; proposés pour plomberie, électricité, serrurerie, couverture, « autre métier » ; jamais proposés aux chantiers (maçonnerie, menuiserie, peinture) ;
- **comptabilité** : ouverte là où l'on encaisse sur place ou par acomptes (plomberie, électricité, serrurerie, maçonnerie, menuiserie, peinture, couverture, ramonage, énergies (photovoltaïque, bornes), piscine) ; proposée ailleurs ;
- **les six rubriques de la 3D** (Registre, Carte des box, Boxes, Devis xylophage, Consommation produits, Enveloppes) restent fermées aux autres métiers ;
- les métiers ressemblants ont des ensembles de rubriques identiques (plomberie, électricité, serrurerie ; chauffage, incendie, froid, ascenseurs, traitement de l'eau ; maçonnerie, couverture ; menuiserie, peinture ; portails, alarme). C'est voulu : leur travail est le même (dépannage à domicile avec camionnette garnie ; contrats d'entretien sur parc d'équipements ; chantiers à acomptes). Leurs raisons, leurs rubriques proposées, leurs types, relevés et documents sont, eux, différents ; un banc ne doit donc pas comparer des listes de clés mais les contenus.

## 2. Ce que la case dit au client (les 42 descriptions)

Ces textes servent trois fois : page d'abonnement, Tour, application. Ils sont dans le JSON, clé `rubriques`.

| Rubrique | Groupe | Ce qu'on lit en cochant |
|---|---|---|
| 📊 **Tableau de bord** `dashboard` · toujours | Tableau de bord | Votre journée d'un coup d'œil : les interventions du jour, les devis en attente et les factures à encaisser. |
| 📈 **Statistiques** `statistiques` | Tableau de bord | Votre activité en chiffres : chiffre d'affaires encaissé, factures en attente, taux de devis acceptés. Réservé aux comptes de direction. |
| 🕘 **Historique** `historique` | Tableau de bord | Le journal de tout ce qui se passe dans l'application : qui a fait quoi, et quand. Lecture seule, pratique pour retrouver une modification. |
| 🗄️ **Archives mensuelles** `archives` | Tableau de bord | Un récapitulatif de chaque mois à garder ou à imprimer en PDF. Réservé à l'administrateur. |
| 🗓️ **Planning** `planning` | Planification | Qui intervient où et quand, technicien par technicien, au jour ou à la semaine. |
| 🏢 **Planning général** `planningGeneral` | Planification | Toute l'entreprise sur une seule page : tous les techniciens, plusieurs jours à la suite, pour repérer les trous et les doublons. |
| ✅ **Tâches** `taches` | Planification | Une liste de choses à faire avec une échéance, pour vous ou pour un collègue : relancer un client, commander une pièce, rappeler un devis. |
| 🏖️ **Absences & congés** `absences` | Planification | Les congés, arrêts et absences de l'équipe, pour ne pas planifier quelqu'un qui n'est pas là. |
| 🧰 **Interventions** `interventions` | Interventions | Chaque passage chez un client est une fiche : date, technicien, adresse, photos, signature du client, compte rendu. C'est le cœur de l'application. |
| 📄 **Rapports** `rapports` | Interventions | Les rapports d'intervention prêts à envoyer au client en PDF, avec photos et signature, au nom de la bonne société. |
| 🗺️ **Carte interventions** `carteInt` | Interventions | Les interventions du jour posées sur une carte, pour ordonner la tournée et perdre moins de temps sur la route. |
| 📋 **Registre sanitaire** `registre` · 3D seule | Interventions | Le registre des interventions que l'on doit pouvoir présenter à un contrôle. Aujourd'hui conçu pour l'hygiène anti-nuisibles (3D) ; il sera rendu utilisable par les autres métiers qui tiennent un registre. |
| 📍 **Carte des box** `carteBox` · 3D seule | Interventions | La carte des box (postes et dispositifs de surveillance) posés chez vos clients, pour retrouver chacun d'un coup d'œil. Réservée à la 3D. |
| 🏢 **Clients** `clients` | CRM | Votre fichier clients : coordonnées, sites, historique des interventions, devis et factures de chacun. |
| 💰 **Devis** `devis` | Ventes | Préparez des devis, envoyez-les en PDF à vos clients et suivez ceux qui sont acceptés. |
| 🤖 **Assistant devis** `assistantDevis` | Ventes | Décrivez le chantier à voix haute ou au clavier : l'assistant propose un devis que vous relisez avant de l'envoyer. Accès par un code d'équipe. L'assistant s'appuie sur une intelligence artificielle (Anthropic) à laquelle sont transmis le nom, l'adresse et la ville du client : voir la page Sous-traitance. |
| 🧾 **Factures** `factures` | Ventes | Facturez, suivez ce qui est payé, ce qui est en attente et ce qui est en retard. |
| 📑 **Contrats** `contrats` | Ventes | Gardez vos contrats d'entretien : client, durée, tarif, passages prévus. Un contrat fixe vos visites dans l'année. |
| 📊 **Comptabilité** `comptabilite` | Ventes | Une synthèse de ce qui est encaissé, le registre des encaissements et un contrôle du jour. Réservé aux comptes autorisés. |
| 🪵 **Devis xylophage** `devisXylo` · 3D seule | Ventes | Un devis spécialisé pour le traitement du bois (insectes xylophages). Réservé à la 3D. |
| 💳 **Télécollecte** `telecollecte` | Ventes | Notez les paiements encaissés sur place pendant la journée (espèces, chèques, carte) pour les rapprocher des factures le soir. |
| 📦 **Produits** `produits` | Stock | Votre catalogue de produits et de fournitures : références, prix, unités. Chaque entreprise y met ses propres références. |
| 🗃️ **Stock** `stock` | Stock | Ce qu'il vous reste de chaque produit, pour ne pas partir en intervention sans la pièce ou le produit qu'il faut. |
| 🔁 **Mouvements stock** `mouvements` | Stock | Le journal automatique des entrées et des sorties de stock : qui a pris quoi, où, quand, validé par qui. |
| 🧱 **Boxes** `boxes` · 3D seule | Stock | Les box (postes, dispositifs de surveillance) posées chez vos clients, avec leur contenu. Le Stockage de l'entreprise s'appuie sur le même mécanisme. Réservé à la 3D pour l'instant. |
| 📋 **Consommation produits** `saisieConso` · 3D seule | Stock | Saisie et analyse de la consommation de produits box par box : qui consomme quoi, combien, depuis quand. Réservée à la 3D. |
| 📮 **Enveloppes** `enveloppes` · 3D seule | Stock | Les encaissements clients rangés par enveloppe : espèces et chèques remis au bureau, avec ce qui reste à rapprocher. Réservé à la 3D pour l'instant. |
| ⏱️ **Temps de travail** `pointage` | Temps & équipe | Les heures de chaque personne : pointage depuis le terrain, total par jour et par semaine, base de la paie. |
| 🚐 **Véhicules** `vehicules` | Temps & équipe | Votre parc de véhicules : une fiche par véhicule avec la plaque, le kilométrage, l'assurance et son échéance, l'assistance. |
| 🧑‍✈️ **Conducteurs** `conducteurs` | Temps & équipe | La liste des personnes autorisées à conduire vos véhicules, avec leur téléphone. |
| 💬 **Messagerie** `messagerie` | Communication / Fournisseurs | La messagerie de l'équipe, entre le bureau et les techniciens, par conversation ou par groupe, sans passer par vos téléphones personnels. |
| 📧 **Boîte mail** `boiteMail` | Communication / Fournisseurs | Votre boîte mail professionnelle dans l'application : lisez les réponses de vos clients et répondez sans changer d'outil. Réservé aux comptes autorisés. |
| 🏭 **Fournisseurs** `fournisseurs` | Communication / Fournisseurs | Votre carnet de fournisseurs : contacts, conditions, catalogues. Il alimente vos bons de commande. |
| ✉️ **Bons de commande** `bons` | Communication / Fournisseurs | Préparez vos bons de commande, envoyez-les aux fournisseurs et suivez ce qui est livré. |
| 📝 **Brouillon** `brouillon` | Achats internes | Un panier où le technicien note les produits dont il a besoin, avant d'en faire la demande. |
| ✈️ **Mes demandes** `demandes` | Achats internes | Les demandes de matériel faites par l'équipe : ce qui est en cours et tout l'historique. |
| ✅ **Validations DR** `validations` | Achats internes | Le responsable valide ou refuse les demandes de commande et les sorties de stock, pour que rien ne bouge sans son accord. (Le menu s'appelle « Validations DR » ; il doit devenir « Validation des mouvements ».) |
| 📥 **Commandes en cours** `commandes` | Achats internes | Les bons envoyés, en livraison ou reçus à moitié : ce que vos fournisseurs vous doivent encore. |
| 📌 **Secteurs** `secteurs` | Administration | Découpez votre zone par département et attribuez des techniciens à chaque secteur. |
| 👥 **Utilisateurs** `utilisateurs` · toujours | Administration | Créez les comptes de votre équipe et réglez, pour chaque personne, ce qu'elle voit et ce qu'elle peut faire. |
| 🧩 **Modules OP** `modulesElan` · toujours | Administration | La liste des modules mis de côté (rubriques spécialisées) que vous pouvez ouvrir selon vos droits. |
| ⚙️ **Paramètres** `parametres` · toujours | Administration | Les réglages de l'entreprise : sociétés et en-têtes de documents, logo, apparence, langue, sauvegardes. |

## 3. Un tableau par métier

### 1. 🐀 3D — Hygiène anti-nuisibles

*Dératisation · désinsectisation · désinfection*

**Dans le code :** Dans le code, le pack 3D n'a ni prestations ni relevés libres : il utilise le diagnostic nuisibles (questionnaires, plan d'appâtage). Les types sont ceux d'INT_TYPES (16).

**Rubriques ouvertes (36) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre planning de passages du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Un contrôle sanitaire laisse des traces : qui a posé quel produit, où et quand, se retrouve ici. |
| 🗓️ Planning | Les passages d'un contrat HACCP reviennent chaque mois ou chaque semaine : le planning les répartit entre techniciens. |
| 🏢 Planning général | Toutes les tournées de contrats et les urgences (guêpes, punaises de lit) sur une page, pour caser l'imprévu. |
| ✅ Tâches | Rappels de relevés de postes, d'appels clients après traitement, de renouvellement de certificat. |
| 🏖️ Absences & congés | Un poste d'appâtage non contrôlé à date est une non-conformité : on ne planifie pas quelqu'un en congé. |
| 🧰 Interventions | Une fiche par passage : nuisibles ciblés, méthodes, produits posés, photos des postes. |
| 📄 Rapports | Le rapport remis au client pour son plan de maîtrise sanitaire, avec photos et signature, à montrer aux audits. |
| 🗺️ Carte interventions **+** | Enchaîner plusieurs sites clients dans une tournée. |
| 📋 Registre sanitaire **+** | Le registre sanitaire des passages, à présenter au client et lors d'un contrôle. |
| 📍 Carte des box **+** | Retrouver chaque poste d'appâtage posé chez un client. |
| 🏢 Clients | Restaurants, collectivités, hôtels, logistique : chaque site a ses locaux, ses contacts et son historique de traitements. |
| 💰 Devis | Devis pour les traitements ponctuels (punaises de lit, frelons) comme pour les contrats annuels. |
| 🤖 Assistant devis | Un devis de traitement dicté sur place, pendant le diagnostic. |
| 🧾 Factures | Facturer les contrats périodiques et les interventions ponctuelles. |
| 📑 Contrats **+** | Base de l'activité : le contrat anti-nuisibles (HACCP) avec ses passages réguliers. |
| 🪵 Devis xylophage **+** | Le traitement du bois a son propre devis. |
| 📦 Produits **+** | Biocides, appâts, pièges, EPI : la traçabilité des produits utilisés fait partie des obligations de l'activité. |
| 🗃️ Stock **+** | Savoir ce qu'il reste de chaque rodenticide ou insecticide avant de partir en tournée. |
| 🔁 Mouvements stock **+** | Qui a sorti quel produit, pour quelle box ou quel client : la trace qu'un contrôle peut demander. |
| 🧱 Boxes **+** | Le suivi des box (postes d'appâtage) : contenu, produits, date du dernier contrôle. |
| 📋 Consommation produits **+** | La consommation d'appâts box par box aide à repérer un site où l'infestation progresse. |
| 📮 Enveloppes **+** | Les interventions ponctuelles payées sur place (punaises de lit, frelons) : espèces et chèques remis au bureau par enveloppe. |
| ⏱️ Temps de travail | Le temps passé par site permet de vérifier la rentabilité d'un contrat de passages réguliers. |
| 🚐 Véhicules **+** | Tournées longues avec des produits à bord : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien prévient le bureau d'une infestation importante ou d'un accès impossible. |
| 🏭 Fournisseurs **+** | Fournisseurs de biocides, d'appâts, de pièges et d'EPI : on commande toute l'année. |
| ✉️ Bons de commande **+** | Commandes de produits et de pièges, suivies jusqu'à la livraison. |
| 📝 Brouillon **+** | Le technicien prépare sa liste d'appâts et de pièges avant de la soumettre. |
| ✈️ Mes demandes **+** | Chaque demande de produit suit son cheminement : en attente, validée, livrée. |
| ✅ Validations DR **+** | Le responsable contrôle les sorties de produits sensibles avant qu'elles ne soient actées. |
| 📥 Commandes en cours **+** | Savoir quelles commandes de biocides ou de pièges sont encore en route. |
| 📌 Secteurs **+** | Répartir les techniciens par département pour couvrir les sites sans doubler la route. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens et vos responsables et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport remis au client part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (6)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour piloter le chiffre d'affaires des contrats et le taux d'acceptation des devis. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder en cas d'audit client. |
| 📊 Comptabilité | Pour suivre les encaissements des contrats et des interventions ponctuelles. |
| 💳 Télécollecte | Si vous encaissez sur place les interventions ponctuelles. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes se partagent les véhicules. |
| 📧 Boîte mail | Pour répondre aux clients et aux audits depuis l'application. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Désinfection de locaux · Audit hygiène et plan de lutte (HACCP)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (18) : Contrat anti nuisibles (HACCP) · Dératisation · Désinsectisation anthrène de tapis · Désinsectisation blattes · Désinsectisation fourmis · Désinsectisation guêpes / frelons · Désinsectisation mites · Désinsectisation poux de poules · Désinsectisation psoques · Désinsectisation puces · Désinsectisation punaise de lit · Désinsectisation tiques · Détection punaise de lit · Espèce protégée · Traitement xylophage · Visite technique · Désinfection de locaux · Audit hygiène et plan de lutte (HACCP)
- Prestations (0) : aucune carte, le diagnostic nuisibles tient ce rôle
- Relevés (0) : aucun relevé libre, questionnaires nuisibles et plan d'appâtage
- Catégories de produits (8) : TP18 — Insecticide · TP14 — Rodenticide · Xylophage · Piégeage · Matériel · EPI · Proofing · Désinfection
- Documents : Fiche d'intervention par passage · Plan d'implantation des postes · Rapport de non-conformité · Bilan de tendance (courbe d'infestation) · Rapport d'audit client (HACCP / IFS)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Rappel de la déclaration annuelle Certibiocide avant le 31 mars | haute | F6 |
| Alerte d'expiration du Certibiocide par technicien, et blocage de l'affectation d'un produit TP14, TP18 ou TP20 à un technicien non certifié | haute | F6 |
| Fiche de données de sécurité (FDS) jointe à chaque produit, avec sa date de mise à jour | moyenne | F10 |
| Rapport d'audit client (HACCP / IFS) avec tendances | moyenne |  |
| Registre rendu générique pour les autres métiers qui en tiennent un | moyenne | F13 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Certificat individuel « Certibiocide nuisibles » pour les produits TP14, TP18 et TP20 réservés aux professionnels ; trois certificats depuis le 1er janvier 2024 (arrêté du 23 janvier 2023 modifiant celui du 9 octobre 2013). | secondaire | https://walter-learning.com/blog/guide-hygiene/guide-certibiocide-desinfectants/certibiocide-nuisibles-reglementation |
| Déclaration annuelle avant le 31 mars sur l'application du ministère. | secondaire | https://walter-learning.com/blog/guide-hygiene/guide-certibiocide-desinfectants/certibiocide-nuisibles-reglementation |
| Conserver la traçabilité des produits utilisés, les enregistrements de contrôles et d'actions correctives, les FDS, les contrats, les fiches d'intervention et les fiches de non-conformité. | secondaire | https://walter-learning.com/blog/guide-hygiene/guide-certibiocide-desinfectants/certibiocide-nuisibles-reglementation |

**À vérifier, non écrit comme règle**

- Texte officiel de l'arrêté du 23 janvier 2023 sur Légifrance : l'article de recherche est un site de formation, pas le texte.

### 2. 🔧 Plomberie

*Dépannage · sanitaire · réseaux*

**Rubriques ouvertes (26) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de dépannages du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Quand un client conteste une intervention, on retrouve qui a fait quoi, et quand. |
| 🗓️ Planning | Les urgences (fuite, chauffe-eau) s'ajoutent en cours de journée : le planning les glisse entre deux rendez-vous. |
| 🏢 Planning général | Le patron voit d'un coup qui est le plus proche d'une urgence et qui est libre. |
| ✅ Tâches | Rappeler un client pour une pièce commandée, repasser finir une réparation. |
| 🏖️ Absences & congés | Avec un ou deux équipiers, un congé change toute la semaine d'astreintes. |
| 🧰 Interventions | Une fiche par dépannage : adresse, photos avant/après, pression et débit relevés, signature du client. |
| 📄 Rapports | Le client (particulier ou syndic) reçoit un compte rendu daté avec photos : la preuve de ce qui a été fait. |
| 🗺️ Carte interventions **+** | Enchaîner les urgences de la journée dans l'ordre le plus court. |
| 🏢 Clients | Particuliers et syndics : adresses, accès, contacts de copropriété, historique des pannes. |
| 💰 Devis | Le devis de dépannage avant travaux est exigé en dépannage à domicile (arrêté du 24 janvier 2017). |
| 🤖 Assistant devis | Dicter un devis sur place, entre deux raccords. |
| 🧾 Factures | Facturer en sortant, avec la note détaillée exigée au-delà de 25 € TTC. |
| 📊 Comptabilité **+** | Les encaissements du jour (espèces, chèques, carte) se rapprochent des factures de dépannage. |
| 💳 Télécollecte **+** | En dépannage le client paie sur place : on note l'encaissement dans la journée. |
| 📦 Produits **+** | Raccords, flexibles, joints, robinetterie : un catalogue avec vos références et vos prix pour chiffrer vite. |
| 🗃️ Stock **+** | Le stock de la camionnette : savoir ce qu'on a avant de repartir chez le grossiste. |
| 🔁 Mouvements stock **+** | Qui a pris quelle pièce dans le stock : fini l'inventaire à l'aveugle. |
| ⏱️ Temps de travail | Les heures de dépannage et d'astreinte de chacun, et le temps réellement passé par intervention. |
| 🚐 Véhicules **+** | La camionnette est l'outil principal : assurance, kilométrage, échéances. |
| 💬 Messagerie | Le bureau envoie l'adresse d'une urgence, le technicien renvoie la photo de la panne. |
| 🏭 Fournisseurs **+** | Négoces de plomberie et de sanitaire : coordonnées, conditions, remises. |
| ✉️ Bons de commande **+** | Commander un chauffe-eau ou de la robinetterie, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos plombiers et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : la facture ou le devis part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (9)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et le taux de devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📑 Contrats | Entretien de chauffe-eau et de copropriétés : utile si vous avez des clients réguliers. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes se partagent les camionnettes. |
| 📧 Boîte mail | Pour répondre aux syndics et aux clients depuis l'application. |
| 📝 Brouillon | À partir de trois techniciens : chacun note ce qu'il lui faut avant de demander. |
| ✈️ Mes demandes | Le technicien demande un chauffe-eau ou un lot de raccords, le responsable suit la demande. |
| ✅ Validations DR | Le responsable valide les sorties de matériel coûteux. |
| 📥 Commandes en cours | Suivre les commandes de négoce en route. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Installation gaz · Remplacement de groupe de sécurité · Test d'étanchéité
- Prestations : Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client
- Relevés : Index compteur avant essai · Index compteur après essai · Mise à la terre du réseau vérifiée (oui / non)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (13) : Dépannage fuite · Recherche de fuite · Débouchage / curage · Chauffe-eau / ballon · Robinetterie & sanitaire · Réseau & alimentation · Évacuation & eaux usées · Installation neuve · Contrat d’entretien · Visite technique / devis · Installation gaz · Remplacement de groupe de sécurité · Test d'étanchéité
- Prestations (14) : Repérage et diagnostic · Coupure et remise en eau · Remplacement de pièce · Soudure / raccord · Débouchage mécanique · Hydrocurage · Purge du réseau · Détartrage · Remplacement de joint · Mise en service et essai · Contrôle d’étanchéité · Nettoyage du chantier · Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client
- Relevés (7) : Pression relevée (bar) · Débit (L/min) · Température eau chaude (°C) · Index compteur (m³) · Index compteur avant essai (m³) · Index compteur après essai (m³) · Mise à la terre du réseau vérifiée (oui / non)
- Catégories de produits (11) : Raccords et fittings · Tubes (cuivre, PER, multicouche, PVC) · Robinetterie et mitigeurs · Flexibles et alimentation · Joints, filasse, pâtes · Sanitaire (WC, vasques) · Chauffe-eau et groupes de sécurité · Évacuation et siphons · Débouchage et curage (produits, furets) · Outillage consommable · EPI
- Documents : Devis de dépannage avec les mentions de l'arrêté de 2017 · Note détaillée avant paiement (prestation de plus de 25 € TTC) · Rapport d'intervention avec photos · Rapport de test d'étanchéité daté · Suivi du certificat de conformité gaz (établi par un organisme agréé)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Devis de dépannage conforme à l'arrêté de 2017, avec case « pièces remplacées conservées » et affichage du taux horaire | haute | F8 |
| Stock véhicule : un lieu de stockage par camionnette, réapprovisionnement depuis le dépôt, inventaire rapide | haute | F1 |
| Catégories de produits de plomberie à la place des catégories anti-nuisibles | haute | F7 |
| Rapport de test d'étanchéité daté, avec photo du manomètre | moyenne |  |
| Suivi des chauffe-eau (date de pose, groupe de sécurité) avec rappel d'entretien | moyenne | F2 |
| Rappel du certificat de conformité gaz pour les installations gaz | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Dépannage à domicile : information préalable du client (taux horaire TTC, décompte du temps, forfaits, déplacement, devis gratuit ou payant), devis détaillé avant les travaux sans seuil de montant, note détaillée avant paiement au-delà de 25 € TTC. Arrêté du 24 janvier 2017, en vigueur depuis le 1er avril 2017. | officielle | https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile |
| Le client est informé qu'il peut garder les pièces remplacées (case à cocher dans le modèle de devis). | professionnelle | https://www.cm-alsace.fr/file/2521/download |
| Certificat de conformité gaz pour une installation intérieure gaz, demandé au démarrage du compteur et établi par un organisme agréé ; désignations CCG1, CCG2, CCG3 (arrêté du 23 février 2018) ; une anomalie grave entraîne la coupure du gaz. | secondaire, à confirmer | https://selectra.info/energie/guides/demenagement/certificat-conformite-gaz |

**À vérifier, non écrit comme règle**

- Garantie décennale et responsabilité civile professionnelle : non vérifié par la recherche.
- Légionellose et carnet sanitaire : concerne les installations collectives et les établissements recevant du public ; voir la fiche « Traitement de l'eau » pour la source, à lire (arrêté du 1er février 2010) avant de coder quoi que ce soit.

### 3. ⚡ Électricité

*Installation · mise aux normes · dépannage*

**Rubriques ouvertes (26) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de dépannages et de chantiers du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Après une panne ou un incident, on retrouve qui a fait quel branchement, et à quelle date. |
| 🗓️ Planning | Des dépannages s'intercalent entre des chantiers de plusieurs jours : le planning répartit les deux. |
| 🏢 Planning général | Voir quels électriciens sont sur chantier et lesquels sont libres pour un dépannage. |
| ✅ Tâches | Rappeler un client avant la mise sous tension, relancer un dossier de raccordement. |
| 🏖️ Absences & congés | Dans une équipe d'un à trois électriciens, un congé change tout le planning. |
| 🧰 Interventions | Une fiche par dépannage ou par chantier : mesures (terre, isolement, différentiel), photos du tableau, signature du client. |
| 📄 Rapports | Le rapport remis au client avec les mesures relevées et les photos du tableau avant et après. |
| 🗺️ Carte interventions **+** | Enchaîner les dépannages de la journée sans retours inutiles. |
| 🏢 Clients | Particuliers, syndics, commerces : adresses, accès aux tableaux, historique des installations. |
| 💰 Devis | Devis de dépannage détaillé avant travaux (arrêté du 24 janvier 2017), ou devis de mise aux normes. |
| 🤖 Assistant devis | Un devis de mise aux normes ou d'éclairage dicté sur place. |
| 🧾 Factures | La note détaillée à la fin du dépannage, la facture de chantier ensuite. |
| 📊 Comptabilité **+** | Les encaissements du jour se rapprochent des factures de dépannage. |
| 💳 Télécollecte **+** | Un dépannage se paie souvent sur place. |
| 📦 Produits **+** | Disjoncteurs, câbles, appareillage : références et prix sous la main pour chiffrer. |
| 🗃️ Stock **+** | Le stock du véhicule : câbles, disjoncteurs, appareillage à portée de main. |
| 🔁 Mouvements stock **+** | Savoir qui a pris quels disjoncteurs ou quelle bobine de câble. |
| ⏱️ Temps de travail | Heures de chantier et de dépannage, par personne. |
| 🚐 Véhicules **+** | Le transport du matériel : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien envoie la photo du tableau au bureau pour demander un avis avant de commander. |
| 🏭 Fournisseurs **+** | Grossistes en matériel électrique : contacts, conditions, remises. |
| ✉️ Bons de commande **+** | Commander le matériel d'un chantier avec une date de livraison. |
| 👥 Utilisateurs | Créez les comptes de vos électriciens et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport de vérification part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (9)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et le taux de devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📑 Contrats | Maintenance d'installations tertiaires : utile si vous avez des clients sous contrat. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes se partagent les véhicules. |
| 📧 Boîte mail | Pour répondre aux clients et aux syndics depuis l'application. |
| 📝 Brouillon | Pour les équipes : chacun prépare sa liste de matériel avant de demander. |
| ✈️ Mes demandes | Un chef d'équipe demande du matériel pour un chantier, le responsable suit. |
| ✅ Validations DR | Le responsable valide les sorties de matériel coûteux. |
| 📥 Commandes en cours | Suivre les commandes de grossiste en route. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Dossier Consuel (attestation de conformité)
- Prestations : Mesure de la résistance de terre · Mesure d'isolement · Test des différentiels
- Relevés : Verdict de la vérification (conforme / non conforme) · N° d'attestation Consuel · Puissance de la borne installée

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (12) : Dépannage / panne · Tableau électrique · Mise aux normes · Éclairage · Prises & circuits · Chauffage électrique · Borne de recharge · Interphone / VMC · Contrôle & vérification · Installation neuve · Visite technique / devis · Dossier Consuel (attestation de conformité)
- Prestations (14) : Consignation / mise hors tension · Diagnostic de la panne · Remplacement de disjoncteur · Pose ou remplacement de prise · Pose de point lumineux · Tirage de câble · Raccordement au tableau · Repérage et étiquetage · Contrôle de continuité · Essais et remise sous tension · Nettoyage du chantier · Mesure de la résistance de terre · Mesure d'isolement · Test des différentiels
- Relevés (8) : Résistance de terre (Ω) · Isolement (MΩ) · Tension mesurée (V) · Intensité (A) · Déclenchement différentiel (ms) · Verdict de la vérification (conforme / non conforme) · N° d'attestation Consuel · Puissance de la borne installée (kVA)
- Catégories de produits (11) : Protection (disjoncteurs, différentiels) · Appareillage (prises, interrupteurs) · Câbles et fils · Gaines et goulottes · Éclairage · Tableaux et coffrets · Bornes de recharge · Chauffage électrique · Domotique et interphonie · Outillage consommable · EPI
- Documents : Devis de dépannage · Rapport d'intervention avec les mesures relevées · Rapport de vérification / attestation d'installation (mesures et verdict) · Suivi du dossier Consuel

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Rapport de vérification / attestation d'installation avec mesures et verdict | haute |  |
| Seuils d'alerte sur les relevés (continuité de terre, isolement, différentiel) | haute |  |
| Stock véhicule (câbles, disjoncteurs, appareillage) | haute | F1 |
| Catégories de produits d'électricité à la place des catégories anti-nuisibles | haute | F7 |
| Devis de dépannage conforme à l'arrêté de 2017 | haute | F8 |
| Suivi des habilitations électriques avec échéance par technicien | moyenne | F6 |
| Suivi de dossier Consuel (demande, date, n° d'attestation) | moyenne |  |
| Fiche borne de recharge (puissance, modèle, mise en service) | basse | F2 |
| Garde « mise en sécurité » avant de démarrer une intervention sous tension | basse | F9 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Consuel : attestation de conformité de l'installation à la NF C 15-100, nécessaire au raccordement ; demandée par la personne qui a fait les travaux environ trois semaines avant la date de raccordement. | secondaire | https://particulier.edf.fr/fr/accueil/guide-energie/electricite/consuel.html |
| Dépannage à domicile : devis détaillé avant travaux et note détaillée au-delà de 25 € TTC (arrêté du 24 janvier 2017). | officielle | https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile |
| Bornes de recharge : qualification IRVE obligatoire au-dessus de 3,7 kVA (décret de 2017, arrêté du 27 octobre 2021). | secondaire, à confirmer | https://hager.com/fr/actualites/certifications-irve |

**À vérifier, non écrit comme règle**

- Habilitations électriques NF C 18-510 (B1T, BR, H0…) : la recherche n'a rien donné de sourcé.
- Seuils de conformité des mesures (isolement, terre) : à prendre dans la NF C 15-100 elle-même, pas dans un blog.

### 4. 🔥 Chauffage / Climatisation

*CVC · entretien · contrats annuels*

**À savoir :** Le cœur du métier est le contrat d'entretien annuel et le parc d'appareils de chaque client. Les relevés sont libres dans le code actuel : aucun seuil, y compris pour le CO, alors que l'arrêté en fixe un.

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme d'entretiens et de dépannages du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Une attestation d'entretien engage votre responsabilité : on retrouve qui l'a établie et quand. |
| 🗓️ Planning | La saison d'entretien concentre des dizaines de visites : le planning les répartit entre techniciens. |
| 🏢 Planning général | En automne, voir toute la charge d'entretiens et de dépannages de chauffage d'un seul regard. |
| ✅ Tâches | Relancer les clients dont l'entretien est dû, rappeler pour une pièce commandée. |
| 🏖️ Absences & congés | Pendant la saison de chauffe, une absence se voit tout de suite sur le planning. |
| 🧰 Interventions | Une fiche par appareil : relevés de combustion, prestations cochées, photos, signature du client. |
| 📄 Rapports | Le compte rendu d'entretien et l'attestation remis au client : l'arrêté fixe un délai de quinze jours après la visite. |
| 🗺️ Carte interventions **+** | Regrouper les clients par quartier pendant la saison d'entretien. |
| 🏢 Clients | Un client, c'est surtout un parc d'appareils (chaudière, pompe à chaleur, climatisation) à entretenir chaque année. |
| 💰 Devis | Devis de remplacement de chaudière ou de pose de pompe à chaleur, souvent proposé à l'issue de la visite d'entretien. |
| 🤖 Assistant devis | Un devis d'installation dicté chez le client, pendant la visite. |
| 🧾 Factures | Facturer l'entretien annuel, les dépannages et les installations. |
| 📑 Contrats **+** | Le contrat d'entretien annuel est le cœur du chiffre d'affaires de ce métier. |
| 📦 Produits **+** | Filtres, électrodes, thermocouples, fluides frigorigènes : un catalogue pour chiffrer vite et réassortir. |
| 🗃️ Stock **+** | Pièces d'usure et bouteilles de fluide embarquées dans la camionnette. |
| 🔁 Mouvements stock **+** | Les bouteilles de fluide et les pièces sorties du stock se tracent : quantité chargée, quantité récupérée. |
| ⏱️ Temps de travail | Les heures par intervention et par technicien, pour mesurer ce que coûte une tournée d'entretiens. |
| 🚐 Véhicules **+** | La camionnette équipée, qui porte aussi les bouteilles de fluide. |
| 💬 Messagerie | Le technicien demande au bureau une pièce ou un avis pendant qu'il est devant la chaudière. |
| 🏭 Fournisseurs **+** | Négoces de chauffage, fabricants, fournisseurs de fluides frigorigènes. |
| ✉️ Bons de commande **+** | Commander une chaudière, une unité de climatisation ou un lot de pièces, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos chauffagistes et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : l'attestation d'entretien part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (11)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires des contrats et des installations. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les encaissements des contrats et des dépannages. |
| 💳 Télécollecte | Si vous encaissez les dépannages sur place. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes se partagent les véhicules. |
| 📧 Boîte mail | Pour écrire aux clients dont l'entretien arrive à échéance. |
| 📝 Brouillon | À partir de trois techniciens : chacun prépare sa liste de pièces avant de demander. |
| ✈️ Mes demandes | Le technicien demande une pièce ou une bouteille de fluide, le responsable suit. |
| ✅ Validations DR | Le responsable valide les sorties de fluide frigorigène et de pièces coûteuses. |
| 📥 Commandes en cours | Suivre les commandes de négoce en route. |
| 📌 Secteurs | Pour répartir les zones d'entretien entre techniciens. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Mise en service · Contrôle d'étanchéité des fluides frigorigènes · Récupération de fluide / démantèlement · Entretien chaudière fioul ou bois
- Prestations : Contrôle du calorifugeage des canalisations · Contrôle de la régulation automatique · Contrôle de l'embouage du circuit · Mesure du tirage · Contrôle d'étanchéité du circuit frigorifique (détecteur de fuite) · Récupération et pesée du fluide · Pose de la vignette de contrôle d'étanchéité · Conseils d'usage, d'amélioration et de remplacement remis au client
- Relevés : Tirage · Émissions de NOx (valeur de l’analyseur) · Température de départ · Température de retour · Pression de gaz · Classe énergétique (chaudière gaz ou fioul de moins de 70 kW) · Marque et référence de l’analyseur utilisé · Fluide frigorigène (ex. R32) · PRP du fluide (plaque signalétique) · Équivalent CO₂ de la charge (PRP × charge / 1000) · Quantité de fluide chargée · Quantité de fluide récupérée · Identifiant de la bouteille ou du contenant · N° de bordereau de suivi des déchets de fluide (Trackdéchets) · Fuite constatée (oui / non, localisation)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (14) : Entretien annuel chaudière · Entretien pompe à chaleur · Entretien climatisation · Dépannage chauffage · Dépannage climatisation · Désembouage · Ramonage · Installation · Contrat d’entretien · Visite technique / devis · Mise en service · Contrôle d'étanchéité des fluides frigorigènes · Récupération de fluide / démantèlement · Entretien chaudière fioul ou bois
- Prestations (19) : Nettoyage du corps de chauffe · Contrôle du brûleur · Analyse de combustion · Contrôle d’étanchéité gaz · Vérification du vase d’expansion · Purge des radiateurs · Nettoyage des filtres · Contrôle de la charge de fluide · Contrôle des organes de sécurité · Mise en service et essai · Attestation d’entretien remise au client · Contrôle du calorifugeage des canalisations · Contrôle de la régulation automatique · Contrôle de l'embouage du circuit · Mesure du tirage · Contrôle d'étanchéité du circuit frigorifique (détecteur de fuite) · Récupération et pesée du fluide · Pose de la vignette de contrôle d'étanchéité · Conseils d'usage, d'amélioration et de remplacement remis au client
- Relevés (21) : Teneur en CO (ppm) · CO₂ (%) · Rendement (%) · Température des fumées (°C) · Pression du circuit (bar) · Charge de fluide (kg) · Tirage (Pa) · Émissions de NOx (valeur de l’analyseur) · Température de départ (°C) · Température de retour (°C) · Pression de gaz (mbar) · Classe énergétique (chaudière gaz ou fioul de moins de 70 kW) · Marque et référence de l’analyseur utilisé · Fluide frigorigène (ex. R32) · PRP du fluide (plaque signalétique) · Équivalent CO₂ de la charge (PRP × charge / 1000) (t) · Quantité de fluide chargée (kg) · Quantité de fluide récupérée (kg) · Identifiant de la bouteille ou du contenant · N° de bordereau de suivi des déchets de fluide (Trackdéchets) · Fuite constatée (oui / non, localisation)
- Catégories de produits (11) : Pièces de chaudière (brûleurs, électrodes, thermocouples, vannes gaz) · Filtres et cartouches · Fluides frigorigènes (par type) · Radiateurs et robinets thermostatiques · Circulateurs et vases d'expansion · Produits de désembouage et de traitement de l'eau · Conduits et fumisterie · Régulation et thermostats · Pompes à chaleur et climatisation (unités et pièces) · Outillage consommable · EPI
- Documents : Attestation d'entretien de chaudière (une par chaudière, remise sous 15 jours) · Attestation d'entretien de pompe à chaleur ou de climatisation · Fiche d'intervention fluides frigorigènes (rubriques du Cerfa 15497*04, sans prétendre remplacer le Cerfa officiel) · Certificat de ramonage · Devis de dépannage · Suivi de la vignette de contrôle d'étanchéité (bleue ou rouge)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc d'appareils par client : type, marque, modèle, n° de série, puissance, combustible, type de conduit, mise en service, fluide, charge, PRP, tonnage équivalent CO₂ calculé, détection permanente de fuite, dernière intervention, prochaine échéance | haute | F2 |
| Attestation d'entretien en PDF, pré-remplie du parc et des relevés : une par appareil, CO avec seuils, instruments, classe énergétique, conseils, signature | haute | F12 |
| Fiche d'intervention fluides frigorigènes (14 rubriques), tonnage calculé, périodicité calculée, n° de bordereau, verrou : pas d'intervention sur fluide sans n° d'attestation de capacité du technicien | haute | F11 |
| Rappel annuel et bi-annuel des contrats d'entretien : échéance, relance du client à 30 puis 7 jours, proposition de créneau, création de l'intervention | haute | F3 |
| Alertes de sécurité : CO à 10 ppm (anomalie) et 50 ppm (danger), avertissement au technicien et texte prêt pour le client | haute |  |
| Catégories de produits de chauffage et de climatisation | haute | F7 |
| Calendrier du contrôle d'étanchéité : prochaine date calculée depuis le tonnage et la détection, suivi des vignettes bleue et rouge et du délai de 4 jours ouvrés | moyenne | F11 |
| Suivi des bouteilles de fluide : stock par fluide et par contenant, quantités chargées et récupérées par intervention | moyenne | F1 |
| Qualifications des techniciens : attestation de capacité (fluides), qualification gaz, échéances | moyenne | F6 |
| Devis de dépannage de l'arrêté de 2017 et suivi du certificat de conformité gaz | moyenne | F8 |
| Certificat de ramonage et rappel annuel | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Entretien annuel obligatoire des chaudières de 4 à 400 kW (gaz, fioul, bois). | officielle | https://www.ecologie.gouv.fr/entretien-et-inspection-des-systemes-chauffage-et-climatisation |
| Pompes à chaleur et climatisations de 4 à 70 kW : entretien au moins tous les 2 ans, première intervention au plus tard 2 ans après la mise en service ; obligation applicable depuis le 1er juillet 2020 (décret 2020-912, arrêté du 24 juillet 2020). | professionnelle | https://www.ffbatiment.fr/techniques-batiment/equipements-techniques/chauffage-ventilation-climatisation/dossier-bam/entretien-obligatoire |
| Attestation d'entretien de chaudière : une par chaudière, remise dans les 15 jours après la visite, avec identification de l'appareil, points contrôlés, instruments de mesure, résultats et déclaration sur le CO, classe énergétique pour une chaudière gaz ou fioul de moins de 70 kW (arrêté du 15 septembre 2009 modifié, annexe V). Conservation côté commanditaire : 2 ans minimum. | officielle | https://aida.ineris.fr/node/28049 |
| Seuils de CO de l'entretien : moins de 10 ppm situation normale ; de 10 à 50 ppm anomalie, le client est informé qu'il faut investiguer le tirage et la ventilation ; 50 ppm ou plus danger grave et immédiat, chaudière laissée à l'arrêt jusqu'à remise en sécurité (article 3 de l'arrêté du 15 septembre 2009 modifié). | officielle | https://aida.ineris.fr/node/28049 |
| Depuis 2020, l'entretien vérifie aussi le calorifugeage des canalisations, la régulation automatique et l'embouage du circuit à eau. | professionnelle | https://www.ffbatiment.fr/actualites-batiment/actualite/attestations-entretien-chaudiere-pac |
| Fiche d'intervention fluides frigorigènes (Cerfa 15497*04) : une par opération et par équipement, pour toute manipulation de fluide CFC, HCFC, HFC ou PFC ; conservation 5 ans par l'opérateur et par le détenteur ; elle peut être électronique (R.543-83). | officielle | https://capeb.fr/www/capeb/media/var/document/notice%20fiche%20d%20intervention%20fluides%20frigorigenes.pdf |
| Contrôle d'étanchéité des équipements HFC/PFC selon le tonnage équivalent CO₂ : de 5 à 50 t annuel ; de 50 à 500 t semestriel ; au-delà de 500 t trimestriel ; intervalle doublé avec un système permanent de détection de fuite. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/equipements-techniques/chauffage-ventilation-climatisation/dossier-bam/de-nouvelles-regles-de-controle-d-etancheite-pour-les-equipements-contenant-des-hfc |
| HFO seuls (règlement UE 2024/573, depuis le 11 mars 2024) : de 1 à moins de 10 kg, 12 mois (24 avec détection) ; de 10 à moins de 100 kg, 6 mois (12) ; à partir de 100 kg, 3 mois (6). | officielle | https://capeb.fr/www/capeb/media/var/document/notice%20fiche%20d%20intervention%20fluides%20frigorigenes.pdf |
| Après un contrôle : fiche d'intervention dans tous les cas ; vignette bleue (date du prochain contrôle) si tout est bon ; vignette rouge si la réparation est différée ; réparation impossible sous 4 jours ouvrés : mise à l'arrêt et vidange du circuit. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/equipements-techniques/chauffage-ventilation-climatisation/dossier-bam/de-nouvelles-regles-de-controle-d-etancheite-pour-les-equipements-contenant-des-hfc |
| Les bordereaux de suivi des déchets de fluides frigorigènes se saisissent sur Trackdéchets depuis le 1er janvier 2023 (arrêté du 26 juillet 2022). L'application n'émet pas le bordereau : elle enregistre seulement son numéro. | professionnelle | https://content.preventionbtp.fr/pdf/droit_de_la_prevention/arrete-du-26-juillet-2022-relatif-aux-bordereaux-de-suivi-des-dechets-dangereux-de-fluides-frigorigenes-et-autres-dechets-dangereux-de-fluides-en-contenants-sous-pression.pdf |
| Ramonage : au moins un par an, deux selon l'arrêté préfectoral ou le règlement sanitaire départemental ; le certificat sert de preuve à l'assureur. | secondaire | https://www.groupama.fr/assurance-habitation/conseils/ramonage-indispensable-et-obligatoire/ |
| Dépannage à domicile : devis détaillé avant travaux et note détaillée au-delà de 25 € TTC (arrêté du 24 janvier 2017). | officielle | https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile |

**À vérifier, non écrit comme règle**

- Le détail exact des champs de l'attestation PAC / climatisation (annexe de l'arrêté du 24 juillet 2020) n'a pas pu être lu : le document doit reprendre la structure de celle de la chaudière et se limiter à ce qui est confirmé, sans se dire modèle officiel.
- Inspection au-delà de 70 kW (tous les 5 ans) et contrôle périodique de 400 kW à 20 MW (R.224-31 et suivants) : sources ADEME et ministère non lues directement.
- Seuil d'obligation sous 5 t équivalent CO₂, régime des équipements hermétiquement scellés, registre des équipements : non confirmés.
- PRP des fluides (R32, R410A…) : à relever dans le règlement avant d'écrire un calcul ; les ordres de grandeur de la recherche (un split de 1,2 kg de R32 vaut environ 0,8 t, un de 1,5 kg de R410A environ 3,1 t) ne sont pas sourcés.
- Décret n° 2023-641 du 20 juillet 2023 sur le ramonage : source secondaire, à confirmer.
- Certificat de conformité gaz (CCG) : voir la fiche Plomberie.

### 5. 🔑 Serrurerie

*Ouverture · sécurité · contrôle d’accès*

**Rubriques ouvertes (26) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme d'urgences et de poses du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Après une ouverture de porte, on retrouve qui est intervenu, quand et ce qui a été fait : utile face à un litige ou à l'assureur. |
| 🗓️ Planning | L'urgence passe avant tout : le planning montre qui peut partir tout de suite. |
| 🏢 Planning général | Voir tous les techniciens d'astreinte et les interventions en cours. |
| ✅ Tâches | Rappeler un client pour la livraison d'une porte blindée commandée sur mesure. |
| 🏖️ Absences & congés | Une équipe de un à quatre serruriers : un congé change l'astreinte de toute la semaine. |
| 🧰 Interventions | Une fiche par ouverture ou par pose : photos de la porte avant et après, clés remises, signature. |
| 📄 Rapports | Le client, ou son assurance, reçoit un compte rendu avec l'état de la porte avant et après. |
| 🗺️ Carte interventions **+** | Envoyer le technicien le plus proche : l'urgence se joue à la minute. |
| 🏢 Clients | Adresse, accès et historique des serrures posées chez chaque client. |
| 💰 Devis | Le devis de dépannage avant d'agir : la serrurerie est l'activité la plus exposée à la répression des fraudes. |
| 🤖 Assistant devis | Un devis de blindage ou de contrôle d'accès dicté sur place. |
| 🧾 Factures | Facturer à la fin de l'intervention, avec la note détaillée exigée au-delà de 25 € TTC. |
| 📊 Comptabilité **+** | Les encaissements du jour se rapprochent des factures d'urgence. |
| 💳 Télécollecte **+** | Le paiement se fait à la fin de l'intervention. |
| 📦 Produits **+** | Cylindres, serrures, blocs-portes par modèle : un catalogue de références pour chiffrer sur place. |
| 🗃️ Stock **+** | Cylindres et serrures embarqués : savoir ce qu'on peut poser tout de suite. |
| 🔁 Mouvements stock **+** | Tracer qui a pris quel cylindre ou quelle serrure, par modèle. |
| ⏱️ Temps de travail | Les heures d'astreinte et de dépannage de chacun. |
| 🚐 Véhicules **+** | Les urgences arrivent à toute heure : le véhicule est l'atelier. |
| 💬 Messagerie | Le bureau envoie l'adresse de l'urgence, le technicien confirme son arrivée. |
| 🏭 Fournisseurs **+** | Fournisseurs de cylindres, de serrures et de blindage. |
| ✉️ Bons de commande **+** | Commander une porte blindée sur mesure ou des pièces, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos serruriers et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le devis ou le bon de remise de clés part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (5)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et le taux de devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📑 Contrats | Maintenance de contrôle d'accès, entretien de rideaux métalliques : utile si vous avez des clients sous contrat. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes se partagent les véhicules. |
| 📧 Boîte mail | Pour répondre aux assureurs et aux gestionnaires depuis l'application. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Dépannage après effraction (mise en sécurité)
- Prestations : Photos de la porte avant et après l'intervention · Bon de remise de clés signé · Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client
- Relevés : Nature de l’ouverture (porte claquée, forcée…) · État de la porte avant intervention · Clés remises : détail (numéros, copies)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (10) : Ouverture de porte · Changement de serrure · Cylindre & clés · Blindage / porte blindée · Contrôle d’accès · Volet roulant / rideau métallique · Coffre-fort · Dépannage urgent · Visite technique / devis · Dépannage après effraction (mise en sécurité)
- Prestations (12) : Ouverture fine sans dégât · Ouverture destructive · Dépose de l’ancienne serrure · Pose du nouveau cylindre · Réglage de la porte · Remise des clés au client · Contrôle du bon fonctionnement · Nettoyage du chantier · Photos de la porte avant et après l'intervention · Bon de remise de clés signé · Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client
- Relevés (6) : Nombre de clés remises · Marque / modèle posé · Certification (A2P…) · Nature de l’ouverture (porte claquée, forcée…) · État de la porte avant intervention · Clés remises : détail (numéros, copies)
- Catégories de produits (9) : Cylindres et serrures · Portes blindées et blocs-portes · Verrous et ferme-portes · Contrôle d'accès (badges, lecteurs) · Rideaux et volets métalliques · Coffres-forts · Clés et cylindres bruts · Quincaillerie · Outillage consommable
- Documents : Devis de dépannage avec les mentions de l'arrêté de 2017 · Bon de remise de clés signé (nombre de clés, modèle, niveau A2P) · Rapport pour l'assurance (état de la porte avant et après, photos, nature de l'ouverture) · Registre des clés confiées

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Devis de dépannage conforme à l'arrêté de 2017, utilisable en urgence sur le téléphone | haute | F8 |
| Bon de remise de clés signé sur place, avec nombre de clés, modèle et niveau A2P | haute |  |
| Catégories de produits de serrurerie à la place des catégories anti-nuisibles | haute | F7 |
| Rapport pour l'assurance : état de la porte avant et après, photos, nature de l'ouverture | moyenne |  |
| Stock véhicule (cylindres et serrures par modèle) | moyenne | F1 |
| Registre des clés confiées (gardiennage) par client | basse | F2 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Dépannage à domicile : information préalable, devis détaillé avant les travaux sans seuil de montant, note détaillée au-delà de 25 € TTC (arrêté du 24 janvier 2017). | officielle | https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile |
| Certaines sources évoquent encore une signature préalable au-delà de 150 € (arrêté du 2 mars 1990) : cet arrêté est abrogé depuis le 1er avril 2017, l'obligation vaut désormais sans seuil. | professionnelle | https://www.cm-alsace.fr/file/2521/download |

**À vérifier, non écrit comme règle**

- Certification A2P (niveaux 1, 2, 3 étoiles, résistance d'environ 5, 10 et 15 minutes) : pas de source lue, à confirmer avant de la citer dans un document.
- Bon de remise de clés signé : aucun texte trouvé qui l'impose ; c'est une pratique, pas une obligation prouvée.
- Conditions de prise en charge par l'assurance habitation (agrément du serrurier, délais de déclaration) : non sourcées.

### 6. 🧽 Nettoyage / Propreté

*Bureaux · remise en état · vitrerie*

**Rubriques ouvertes (23) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre planning de sites du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Savoir qui est passé sur quel site et quel jour, utile quand un client conteste la prestation. |
| 🗓️ Planning | Des équipes sur site à horaires fixes, des remplacements : le planning garde chaque site couvert. |
| 🏢 Planning général | Toutes les équipes et tous les sites sur une page, pour repérer un site qui n'est pas couvert. |
| ✅ Tâches | Rappeler un client pour une remise en état, commander des consommables. |
| 🏖️ Absences & congés | Beaucoup de temps partiel et de remplacements : une absence se voit avant qu'un site reste sans agent. |
| 🧰 Interventions | Une fiche par passage : site, surface, agents, temps passé, photos. |
| 📄 Rapports | Le compte rendu de passage ou de remise en état, remis au client. |
| 🗺️ Carte interventions **+** | Organiser les tournées d'équipes entre plusieurs sites. |
| 🏢 Clients | Bureaux, copropriétés, commerces : chaque site avec ses horaires, ses accès et ses contacts. |
| 💰 Devis | Un devis au m² ou à l'heure pour un contrat régulier ou une remise en état. |
| 🤖 Assistant devis | Un devis de remise en état dicté pendant la visite du site. |
| 🧾 Factures | Facturer les contrats chaque mois et les prestations ponctuelles à part. |
| 📑 Contrats **+** | Base de l'activité : contrats réguliers de bureaux, de copropriétés et de commerces. |
| 📦 Produits **+** | Détergents, produits sols, consommables : votre catalogue de fournitures. |
| 🗃️ Stock **+** | Produits d'entretien et consommables à tenir en dépôt et chez le client. |
| ⏱️ Temps de travail | Les heures par site : base de la paie et de la rentabilité de chaque contrat. |
| 💬 Messagerie | Le chef d'équipe prévient le bureau d'un accès refusé ou d'une absence. |
| 🏭 Fournisseurs **+** | Distributeurs de produits d'hygiène et de matériel de nettoyage. |
| 📌 Secteurs **+** | Affecter les équipes par zone. |
| 👥 Utilisateurs | Créez les comptes de vos chefs d'équipe et vos agents et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le compte rendu de passage part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (7)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par contrat. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les règlements des contrats mensuels. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quels produits. |
| 🚐 Véhicules | Certaines équipes se déplacent en véhicule, d'autres à pied. |
| 📧 Boîte mail | Pour écrire aux clients depuis l'application. |
| ✉️ Bons de commande | Pour les commandes groupées de produits et de matériel. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Contrôle qualité chez le client
- Prestations : Respect du plan de prévention du site · Dosage des produits et respect de la fiche de données de sécurité
- Relevés : Heures prévues au contrat · Résultat du contrôle qualité (note, remarques)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (11) : Nettoyage de bureaux · Remise en état · Vitrerie · Nettoyage de fin de chantier · Nettoyage industriel · Copropriété / parties communes · Décapage & protection des sols · Désinfection des locaux · Contrat régulier · Visite technique / devis · Contrôle qualité chez le client
- Prestations (13) : Dépoussiérage des surfaces · Aspiration des sols · Lavage des sols · Nettoyage des sanitaires · Vidage des corbeilles · Nettoyage des vitres intérieures · Nettoyage des vitres extérieures · Désinfection des points de contact · Décapage · Pose d’émulsion / protection · Réapprovisionnement des consommables · Respect du plan de prévention du site · Dosage des produits et respect de la fiche de données de sécurité
- Relevés (5) : Surface traitée (m²) · Nombre d’agents · Temps passé sur site (h) · Heures prévues au contrat (h) · Résultat du contrôle qualité (note, remarques)
- Catégories de produits (8) : Détergents et désinfectants · Produits sols · Produits vitres · Sanitaires · Papier et consommables (essuie-mains, sacs) · Matériel (balais, chariots, mono-brosses) · Machines (autolaveuses) · EPI
- Documents : Compte rendu de passage · Cahier des tâches du site · Fiche de contrôle qualité · Plan de prévention préparé pour signature

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Cahier des tâches par site (fréquence, zones, cases à cocher par passage) avec preuve de passage | haute |  |
| Pointage par site avec calcul de rentabilité : heures prévues contre heures réalisées | haute |  |
| Catégories de produits de nettoyage à la place des catégories anti-nuisibles | haute | F7 |
| Fiche de contrôle qualité (inspection chez le client, notes, photos, actions) | moyenne |  |
| Plan de prévention préparé et signé | moyenne |  |
| Fiche de données de sécurité jointe à chaque produit | moyenne | F10 |
| Alerte de transfert de personnel à un changement de prestataire | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Plan de prévention entre le client et le prestataire (coactivité), articles R.4511-1 à R.4514-10 du Code du travail ; requis au-delà d'un certain volume d'heures annuelles ou pour des travaux dangereux. | professionnelle | https://www.monde-proprete.com/sites/default/files/2024-07/Trame-plan-de-prevention%20V2.doc |
| Choix des produits sur analyse des fiches de données de sécurité ; ne jamais mélanger des produits de nature différente. | professionnelle | https://www.cdg44.fr/sites/default/files/content/fiche_prevention/pdf/15d_Nettoyage_des_locaux.pdf |
| Guide de prévention de l'INRS sur le nettoyage des locaux. | officielle | https://inrs.fr/dam/inrs/CataloguePapier/ED/TI-ED-6409.pdf |
| Convention collective de la propreté (IDCC 2272), article 7 : transfert conventionnel du personnel lors d'un changement de prestataire sur un site, avec maintien du contrat et de l'ancienneté. | secondaire, à confirmer | https://travail-industrie.com/conventions-idcc/2272 |

**À vérifier, non écrit comme règle**

- Seuil exact d'heures à partir duquel le plan de prévention est obligatoire : à lire dans le Code du travail avant de l'écrire dans l'application.
- Critères officiels d'un contrôle qualité de propreté : rien de trouvé, la fiche sera une trame libre.
- Convention collective : à confirmer sur Légifrance.

### 7. 🧱 Maçonnerie / Gros œuvre

*Construction · rénovation · gros œuvre*

**Rubriques ouvertes (21) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de chantiers du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Sur un chantier de plusieurs semaines, on retrouve qui a validé quoi : coulage, réserves, modifications. |
| 🗓️ Planning | Des chantiers de plusieurs jours à plusieurs semaines : le planning affecte les équipes à chaque chantier. |
| 🏢 Planning général | Toutes les équipes et tous les chantiers sur une page, pour ne laisser aucun chantier sans maçon. |
| ✅ Tâches | Relancer un bureau d'études, un maître d'ouvrage ou un sous-traitant pour un document manquant. |
| 🏖️ Absences & congés | Une équipe réduite d'un maçon change l'avancement du chantier : le congé se voit avant de planifier. |
| 🧰 Interventions | Une fiche par journée ou par phase de chantier : surface réalisée, béton coulé, photos, signature. |
| 📄 Rapports | Un compte rendu de chantier avec photos, à remettre au maître d'ouvrage. |
| 🏢 Clients | Maîtres d'ouvrage, particuliers, promoteurs : adresse du chantier, contacts, historique. |
| 💰 Devis | Devis détaillé par lot : terrassement, dalle, murs, enduit. |
| 🤖 Assistant devis | Un devis de chantier dicté sur le terrain, pendant le métré. |
| 🧾 Factures | Factures d'acompte et de solde au fil de l'avancement. |
| 📊 Comptabilité **+** | Suivre les acomptes et les soldes encaissés chantier par chantier. |
| ⏱️ Temps de travail | Les heures de chantier par personne, pour suivre le coût réel d'un lot. |
| 🚐 Véhicules **+** | Camions, bennes et matériel roulant : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le chef de chantier envoie photos et questions au bureau en direct. |
| 🏭 Fournisseurs **+** | Négoces de matériaux : ciment, parpaings, ferraille, livrés sur chantier. |
| ✉️ Bons de commande **+** | Commander les matériaux avec une date de livraison, et savoir ce qui est arrivé. |
| 👥 Utilisateurs | Créez les comptes de vos chefs de chantier et vos maçons et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le compte rendu de chantier part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (11)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et les devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Les chantiers sont fixes : utile seulement si vous enchaînez beaucoup de petits chantiers. |
| 📦 Produits | Un catalogue de prix sert au devis, même si vous ne gérez pas de stock. |
| 🗃️ Stock | Seulement si vous gardez des matériaux en dépôt : le gros est livré sur chantier. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les camions. |
| 📧 Boîte mail | Pour échanger avec les maîtres d'ouvrage depuis l'application. |
| 📝 Brouillon | Le chef de chantier prépare sa liste de matériaux. |
| ✈️ Mes demandes | Le chef de chantier demande, le patron suit la demande. |
| ✅ Validations DR | Le patron valide les commandes importantes avant qu'elles partent. |
| 📥 Commandes en cours | Suivre les livraisons de matériaux en cours. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Réception de chantier (procès-verbal) · Levée de réserves
- Prestations : Vérification du repérage amiante avant travaux · Procès-verbal de réception signé
- Relevés : Avancement du lot · Repérage amiante avant travaux (référence du rapport)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (12) : Construction neuve · Rénovation · Extension / agrandissement · Dalle & fondations · Murs & cloisons · Enduits & façades · Ouverture de mur · Reprise de fissures · Dallage / terrasse · Visite technique / devis · Réception de chantier (procès-verbal) · Levée de réserves
- Prestations (13) : Implantation et traçage · Terrassement / fouilles · Coffrage · Ferraillage · Coulage du béton · Montage de parpaings / briques · Pose de linteau · Enduit / crépi · Jointoiement · Évacuation des gravats · Nettoyage du chantier · Vérification du repérage amiante avant travaux · Procès-verbal de réception signé
- Relevés (6) : Surface réalisée (m²) · Béton coulé (m³) · Linéaire de mur (ml) · Temps passé sur site (h) · Avancement du lot (%) · Repérage amiante avant travaux (référence du rapport)
- Catégories de produits (11) : Liants (ciment, chaux, plâtre) · Agrégats (sable, gravier) · Éléments de maçonnerie (parpaings, briques) · Béton et prêt à l'emploi · Ferraillage · Isolation · Étanchéité · Enduits · Coffrage · Outillage · EPI
- Documents : Compte rendu de chantier avec photos · Situation de travaux (facture d'acompte par lot) · Procès-verbal de réception avec réserves · Dossier de chantier (permis, repérage amiante, plan, assurance)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Fiche chantier avec avancement par lot et situations de travaux (factures d'acompte) | haute | F5 |
| Procès-verbal de réception signé sur place, avec réserves et levée des réserves | haute | F4 |
| Catégories de produits de maçonnerie à la place des catégories anti-nuisibles | haute | F7 |
| Dossier de chantier : permis, repérage amiante, plan, assurance | moyenne |  |
| Sous-traitants : attestations de vigilance et assurances, avec échéance | moyenne | F6 |
| Suivi des livraisons par bon de commande | moyenne |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Repérage amiante avant travaux : le donneur d'ouvrage le fait réaliser avant de commencer, dans les bâtiments dont le permis date d'avant 1997 ; l'entreprise doit l'exiger avant d'intervenir ; amende maximale de 9 000 € pour le donneur d'ordre. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/amiante-reperage |
| Plomb : le CREP est obligatoire pour les logements d'avant 1949 ; la norme NF X 46-035 sert de référence pour les travaux. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/amiante-reperage |

**À vérifier, non écrit comme règle**

- Date limite du repérage amiante : 1er janvier 1997 ou 1er juillet 1997 selon les sources.
- Garantie décennale (mention de l'assureur sur devis et factures), réception avec procès-verbal, retenue de garantie, situations de travaux, DICT : non vérifié par la recherche.

### 8. 🚪 Menuiserie

*Pose · agencement · fermetures*

**Fusion :** Absorbe la vitrerie et la miroiterie (même chantier : prise de cotes, pose, dépannage urgent).

**Rubriques ouvertes (21) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de poses du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Entre la prise de cotes et la pose, plusieurs semaines passent : on retrouve ce qui a été relevé et commandé. |
| 🗓️ Planning | Prise de cotes, puis pose quelques semaines plus tard : le planning garde le lien entre les deux visites. |
| 🏢 Planning général | Voir toutes les poses des semaines à venir pour tenir les délais de livraison du fabricant. |
| ✅ Tâches | Relancer le fabricant sur la date de livraison, rappeler le client pour fixer la pose. |
| 🏖️ Absences & congés | Une pose se fait à deux : un congé peut décaler un chantier entier. |
| 🧰 Interventions | Une fiche par prise de cotes ou par pose : cotes, éléments posés, photos, signature. |
| 📄 Rapports | Le client signe la fin de la pose, photos avant et après à l'appui. |
| 🏢 Clients | Particuliers et entreprises : adresse du chantier, cotes, historique des poses. |
| 💰 Devis | Un devis précis à partir des cotes relevées, avec le délai du fabricant. |
| 🤖 Assistant devis | Un devis dicté pendant la prise de cotes. |
| 🧾 Factures | L'acompte à la commande, le solde à la pose. |
| 📊 Comptabilité **+** | Suivre les acomptes à la commande et les soldes à la pose. |
| 📦 Produits **+** | Un catalogue de références et de tarifs (fenêtres, portes, quincaillerie) pour chiffrer le devis. |
| ⏱️ Temps de travail | Les heures de pose et d'atelier, par personne. |
| 💬 Messagerie | Le poseur envoie une photo d'un support difficile avant de commander. |
| 🏭 Fournisseurs **+** | Fabricants de menuiseries, de panneaux et de quincaillerie. |
| ✉️ Bons de commande **+** | Commandes sur mesure chez le fabricant, avec un délai de plusieurs semaines à suivre. |
| 👥 Utilisateurs | Créez les comptes de vos poseurs et vos menuisiers et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : la fiche de prise de cotes part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (8)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et les devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Pour enchaîner les poses planifiées dans la journée. |
| 💳 Télécollecte | Si vous encaissez l'acompte à la commande sur place. |
| 🗃️ Stock | Pour les petites fournitures (quincaillerie, joints, vis) : le gros est commandé sur mesure. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quelle fourniture. |
| 🚐 Véhicules | Le fourgon de pose : assurance, kilométrage. |
| 📧 Boîte mail | Pour échanger avec les fabricants et les clients depuis l'application. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Remplacement de vitrage · Dépannage bris de glace
- Prestations : Croquis et plan joints à la prise de cotes · Réception de la commande du fabricant vérifiée
- Relevés : Date de livraison promise par le fabricant · Type de vitrage et épaisseur

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (12) : Pose de fenêtres · Pose de portes · Volets & fermetures · Agencement intérieur · Placards & dressings · Escalier · Parquet · Réparation / dépannage · Prise de cotes · Visite technique / devis · Remplacement de vitrage · Dépannage bris de glace
- Prestations (12) : Prise de cotes · Dépose de l’existant · Pose et calage · Réglage des ouvrants · Fixation et scellement · Pose de la quincaillerie · Calfeutrement et joints · Finitions (habillage, champlats) · Évacuation des déchets · Nettoyage du chantier · Croquis et plan joints à la prise de cotes · Réception de la commande du fabricant vérifiée
- Relevés (6) : Cotes relevées (L × H) · Éléments posés · Matériau / essence · Temps passé sur site (h) · Date de livraison promise par le fabricant · Type de vitrage et épaisseur
- Catégories de produits (11) : Fenêtres et portes-fenêtres · Portes · Volets et fermetures · Panneaux et bois · Parquet et sols · Quincaillerie · Joints et mousses · Escaliers · Colles et fixations · Vitrages et miroirs · Outillage
- Documents : Fiche de prise de cotes avec plan, photos et croquis · Bon de commande au fabricant · Procès-verbal de réception avec réserves · Attestation de TVA réduite à faire signer (à vérifier)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Fiche de prise de cotes avec plan, photos et croquis | haute |  |
| Suivi commande, réception, pose : date promise par le fabricant, alerte de retard | haute |  |
| Catégories de produits de menuiserie à la place des catégories anti-nuisibles | haute | F7 |
| Procès-verbal de réception avec réserves, signé sur place | moyenne | F4 |
| Attestation de TVA réduite à faire signer au client | basse |  |

**Obligations :** aucune sourcée pour ce métier.

**À vérifier, non écrit comme règle**

- Marquage CE des fenêtres, DTU de pose, TVA réduite avec attestation du client, garantie décennale : aucune recherche dédiée n'a été faite, rien n'est sourcé.

### 9. 🖌️ Peinture / Revêtements

*Intérieur · extérieur · sols*

**Rubriques ouvertes (21) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de chantiers du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve qui a fait quelle couche, dans quelle pièce, et à quelle date. |
| 🗓️ Planning | Des chantiers de quelques jours à quelques semaines : le planning enchaîne les équipes de deux à cinq peintres. |
| 🏢 Planning général | Voir toutes les équipes et tous les chantiers pour enchaîner sans trou. |
| ✅ Tâches | Rappeler le client pour valider une teinte, commander un produit en rupture. |
| 🏖️ Absences & congés | Une équipe de deux à cinq : un congé change la durée du chantier. |
| 🧰 Interventions | Une fiche par chantier ou par pièce : surface, couches, teinte, photos. |
| 📄 Rapports | Un compte rendu avec photos avant et après, remis au client à la fin du chantier. |
| 🏢 Clients | Particuliers, syndics, entreprises : adresse du chantier, teintes choisies, historique. |
| 💰 Devis | Un devis au m², pièce par pièce, avec le détail de la préparation. |
| 🤖 Assistant devis | Un devis dicté en faisant le tour des pièces. |
| 🧾 Factures | Acompte au démarrage, solde à la réception. |
| 📊 Comptabilité **+** | Suivre les acomptes au démarrage et les soldes à la réception. |
| 📦 Produits **+** | Un catalogue de peintures avec leur rendement (m² par litre) pour calculer la quantité à commander. |
| ⏱️ Temps de travail | Les heures par chantier, pour vérifier que le devis au m² est tenu. |
| 💬 Messagerie | Le chef d'équipe envoie une photo de teinte ou d'un support abîmé au bureau. |
| 🏭 Fournisseurs **+** | Négoces de peinture : teintes à la demande, livrées ou prises au magasin. |
| ✉️ Bons de commande **+** | Commander les peintures d'un chantier à date, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos peintres et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le devis au m² part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (7)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et les devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Pour enchaîner plusieurs petits chantiers dans la semaine. |
| 🗃️ Stock | Pour les restes de pots et le matériel de protection. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quels pots. |
| 🚐 Véhicules | Le fourgon de chantier : assurance, kilométrage. |
| 📧 Boîte mail | Pour échanger avec les clients et les négoces depuis l'application. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Visite avant travaux (amiante / plomb)
- Prestations : Vérification du repérage amiante ou du CREP avant ponçage · Fiche de teinte remise au client
- Relevés : Rendement du produit · Quantité de peinture utilisée

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (11) : Peinture intérieure · Peinture extérieure / façade · Revêtements muraux · Revêtements de sol · Préparation des supports · Ravalement · Traitement anti-humidité · Décoration · Retouches / reprises · Visite technique / devis · Visite avant travaux (amiante / plomb)
- Prestations (12) : Protection des sols et du mobilier · Lessivage · Rebouchage et ponçage · Impression / sous-couche · Première couche · Deuxième couche · Pose de papier peint / toile · Reprise des angles et raccords · Dépose des protections · Nettoyage du chantier · Vérification du repérage amiante ou du CREP avant ponçage · Fiche de teinte remise au client
- Relevés (6) : Surface traitée (m²) · Nombre de couches · Teinte / référence · Temps passé sur site (h) · Rendement du produit (m²/L) · Quantité de peinture utilisée (L)
- Catégories de produits (10) : Peintures intérieures · Peintures extérieures et façades · Sous-couches et impressions · Enduits et rebouchage · Revêtements muraux (papier peint, toile) · Revêtements de sol · Lasures et vernis · Protection (bâches, adhésifs) · Outillage (rouleaux, pinceaux) · EPI
- Documents : Métré et devis au m² · Fiche de teinte par client (référence, nuancier) · Procès-verbal de réception

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Métré vers devis : surface par pièce, prestation, rendement, quantité de peinture à commander | haute |  |
| Avertissement amiante / plomb avant l'intervention (bâtiment d'avant 1997 ou logement d'avant 1949) | haute |  |
| Catégories de produits de peinture à la place des catégories anti-nuisibles | haute | F7 |
| Fiche de teinte par client pour les reprises ultérieures | moyenne |  |
| Procès-verbal de réception signé sur place | moyenne | F4 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Amiante : repérage avant travaux dans les bâtiments dont le permis date d'avant 1997 ; le peintre est concerné dès qu'il ponce, gratte ou perce. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/amiante-reperage |
| Plomb : le CREP est obligatoire pour les logements d'avant 1949. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/reglementation-construction/reglementation-amiante-plomb-silice/dossier/amiante-reperage |

**À vérifier, non écrit comme règle**

- Fiches de données de sécurité des peintures et solvants : non vérifié.
- La phrase « le peintre est concerné dès qu'il ponce, gratte ou perce » est un raisonnement du rapport de recherche, la source citée (FFB) parle du repérage avant travaux, pas du geste du peintre.

### 10. 🌿 Paysagiste / Espaces verts

*Entretien · création · élagage*

**Fusion :** Absorbe l'élagage (variante « arboriste » : même clientèle, mêmes véhicules, mêmes tournées).

**Rubriques ouvertes (24) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de tournées du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve ce qui a été fait dans quel jardin et à quelle date : tonte, taille, traitement. |
| 🗓️ Planning | Entretien récurrent et créations se partagent les équipes : le planning suit la saison. |
| 🏢 Planning général | Toutes les équipes et toutes les tournées de la saison sur une page. |
| ✅ Tâches | Rappeler un client avant la taille, commander des végétaux pour une plantation. |
| 🏖️ Absences & congés | En pleine saison de tonte, une absence se voit tout de suite sur la tournée. |
| 🧰 Interventions | Une fiche par passage ou par chantier : surface entretenue, haie taillée, déchets évacués, photos. |
| 📄 Rapports | Le compte rendu de passage ou de création remis au client avec photos. |
| 🗺️ Carte interventions **+** | Tournées saisonnières : enchaîner les jardins d'un même quartier. |
| 🏢 Clients | Particuliers, copropriétés, entreprises : surface du jardin, accès, historique des passages. |
| 💰 Devis | Devis d'entretien annuel ou de création de jardin. |
| 🤖 Assistant devis | Un devis de création dicté en marchant dans le jardin. |
| 🧾 Factures | Facturer l'entretien périodique et les chantiers de création. |
| 📑 Contrats **+** | Entretien annuel avec passages périodiques : le cœur de l'activité récurrente. |
| 📦 Produits **+** | Végétaux, engrais, terreau, paillage : un catalogue avec vos prix. |
| ⏱️ Temps de travail | Les heures par jardin pour vérifier qu'un forfait d'entretien est rentable. |
| 🚐 Véhicules **+** | Camionnettes, remorques, bennes : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le chef d'équipe prévient le bureau d'un portail fermé ou d'un chantier qui déborde. |
| 🏭 Fournisseurs **+** | Pépinières, négoces d'engrais et de terreau, loueurs de matériel. |
| ✉️ Bons de commande **+** | Commander les végétaux d'une création à date de livraison. |
| 📌 Secteurs **+** | Découper les tournées par secteur. |
| 👥 Utilisateurs | Créez les comptes de vos jardiniers et vos chefs d'équipe et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le compte rendu de passage part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (8)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par type de prestation. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les encaissements des contrats et des chantiers. |
| 💳 Télécollecte | Si vous encaissez les prestations ponctuelles sur place. |
| 🗃️ Stock | Pour les petits consommables (fil, lames, engrais en sacs). |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quels consommables. |
| 🧑‍✈️ Conducteurs | Plusieurs véhicules et plusieurs conducteurs : à tenir à jour. |
| 📧 Boîte mail | Pour répondre aux clients et aux pépinières depuis l'application. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Abattage · Taille de haute tige
- Prestations : Utilisation de nacelle ou de grimpe · Évacuation en déchetterie ou sur plateforme
- Relevés : Hauteur de l’arbre · Nacelle utilisée (oui / non) · Destination des déchets verts (déchetterie, plateforme)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (13) : Tonte · Taille de haies · Élagage / abattage · Débroussaillage · Entretien de massifs · Création de jardin · Plantation · Arrosage automatique · Ramassage des feuilles · Contrat d’entretien · Visite technique / devis · Abattage · Taille de haute tige
- Prestations (12) : Tonte et finitions · Taille · Désherbage · Scarification · Bêchage / griffage · Paillage · Plantation · Évacuation des déchets verts · Réglage de l’arrosage · Nettoyage du site · Utilisation de nacelle ou de grimpe · Évacuation en déchetterie ou sur plateforme
- Relevés (7) : Surface entretenue (m²) · Haie taillée (ml) · Déchets verts évacués (m³) · Temps passé sur site (h) · Hauteur de l’arbre (m) · Nacelle utilisée (oui / non) · Destination des déchets verts (déchetterie, plateforme)
- Catégories de produits (9) : Végétaux (arbres, arbustes, vivaces, gazon) · Terreaux et amendements · Engrais · Paillage et gravier · Produits phytosanitaires (réservés aux certifiés) · Arrosage (tuyaux, programmateurs) · Carburant et huile · Outillage et consommables (fil, lames) · EPI
- Documents : Compte rendu de passage · Fiche jardin (surface, haies, arbres, arrosage) · Suivi des déchets verts (volume, destination) · Attestation fiscale annuelle pour les particuliers (à vérifier)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Tournées saisonnières : un contrat génère les passages selon la saison (tonte d'avril à octobre, taille en hiver) | haute | F3 |
| Catégories de produits de paysage à la place des catégories anti-nuisibles | haute | F7 |
| Fiche jardin : surface, haies, arbres, arrosage, particularités | moyenne | F2 |
| Suivi du Certiphyto par technicien, avec blocage des produits phytosanitaires pour les non-certifiés | moyenne | F6 |
| Suivi des déchets verts : volume et destination (déchetterie ou plateforme) | basse |  |
| Attestation fiscale annuelle pour les particuliers | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Certiphyto si le paysagiste applique ou conseille des produits phytopharmaceutiques ; Certibiocide pour les produits biocides. | professionnelle | https://bpifrance-creation.fr/activites-reglementees/paysagiste-entretien-despaces-verts-utilisation-produits |
| La loi Labbé interdit les produits phytosanitaires dans les espaces verts publics ; un paysagiste privé travaillant pour des particuliers n'est pas directement visé. Les produits de biocontrôle, à faible risque ou utilisables en agriculture biologique restent autorisés. | professionnelle | https://bpifrance-creation.fr/activites-reglementees/paysagiste-entretien-despaces-verts-utilisation-produits |
| Interdiction de brûler les déchets verts pour les entreprises d'espaces verts : elles doivent les éliminer par des voies respectueuses de l'environnement ; des arrêtés préfectoraux locaux encadrent le brûlage. | officielle | https://www.loire.gouv.fr/contenu/telechargement/14814/110342/file/20240404_Plaquette_brulage_air_libre2.pdf |

**À vérifier, non écrit comme règle**

- Attestation fiscale / crédit d'impôt services à la personne pour les particuliers : non confirmé, à vérifier sur impots.gouv.fr avant de coder.
- Élagage : rien trouvé sur le CACES, le Certiphyto ou la DT-DICT.

### 11. 🏠 Couverture / Zinguerie

*Toiture · gouttières · étanchéité*

**Rubriques ouvertes (21) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de toitures du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve qui est monté sur quelle toiture, quand, et si la mise en sécurité a été faite. |
| 🗓️ Planning | Des urgences après tempête s'ajoutent à des chantiers plus longs : le planning répartit les équipes. |
| 🏢 Planning général | Toutes les équipes et tous les chantiers pour réagir vite après une tempête. |
| ✅ Tâches | Rappeler un client pour fixer le montage de l'échafaudage, commander du zinc sur mesure. |
| 🏖️ Absences & congés | Le travail en hauteur se fait à deux : une absence se voit avant de planifier. |
| 🧰 Interventions | Une fiche par toiture : surface traitée, gouttière posée, hauteur de travail, photos, signature. |
| 📄 Rapports | Le rapport avec photos avant et après est la seule preuve pour un client qui ne peut pas monter voir. |
| 🏢 Clients | Particuliers, syndics, assureurs : adresse, accès, historique des toitures traitées. |
| 💰 Devis | Devis de réparation ou de réfection, avec le détail des fournitures. |
| 🤖 Assistant devis | Un devis dicté depuis le pied de la toiture. |
| 🧾 Factures | Acompte à la commande des matériaux, solde à la réception. |
| 📊 Comptabilité **+** | Suivre les acomptes et les soldes encaissés chantier par chantier. |
| ⏱️ Temps de travail | Les heures par chantier de toiture, par personne. |
| 🚐 Véhicules **+** | Camion avec échelle ou nacelle : assurance, kilométrage, échéances. |
| 💬 Messagerie | Le couvreur envoie les photos de la toiture au bureau pour chiffrer sans remonter. |
| 🏭 Fournisseurs **+** | Négoces de couverture : tuiles, ardoises, zinc sur mesure. |
| ✉️ Bons de commande **+** | Commander tuiles, ardoises et zinc avec une date de livraison. |
| 👥 Utilisateurs | Créez les comptes de vos couvreurs et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport avec photos part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (13)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires et les devis acceptés. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Pour enchaîner plusieurs petites réparations dans la journée. |
| 📑 Contrats | Entretien annuel de toiture, démoussage : utile si vous avez des clients réguliers. |
| 📦 Produits | Un peu de petit matériel (crochets, vis) : un catalogue sert au devis. |
| 🗃️ Stock | Pour le petit matériel gardé en dépôt. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quel matériel. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les camions. |
| 📧 Boîte mail | Pour échanger avec les assureurs et les clients depuis l'application. |
| 📝 Brouillon | Le chef d'équipe prépare sa liste de fournitures. |
| ✈️ Mes demandes | Le chef d'équipe demande, le patron suit la demande. |
| ✅ Validations DR | Le patron valide les commandes importantes. |
| 📥 Commandes en cours | Suivre les livraisons de matériaux en cours. |

**Ce qui s'ajoute à ce que le code a déjà**

- Types d'intervention : Dépannage après tempête · Réfection de toiture complète
- Prestations : Photos avant et après de la toiture · Contrôle des plaques fragiles · Vérification de la présence d'amiante (fibrociment, ardoises artificielles)
- Relevés : Garde-corps ou protection collective en place (oui / non) · Toiture amiantée (oui / non)

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (12) : Réparation de toiture · Recherche de fuite · Remplacement de tuiles / ardoises · Gouttières & descentes · Zinguerie · Démoussage & traitement · Étanchéité de toit-terrasse · Fenêtre de toit · Isolation des combles · Visite technique / devis · Dépannage après tempête · Réfection de toiture complète
- Prestations (13) : Mise en sécurité (échafaudage, harnais) · Inspection de la toiture · Remplacement d’éléments de couverture · Réfection des faîtages · Nettoyage des gouttières · Pose / soudure du zinc · Démoussage · Application d’hydrofuge · Évacuation des déchets · Nettoyage du chantier · Photos avant et après de la toiture · Contrôle des plaques fragiles · Vérification de la présence d'amiante (fibrociment, ardoises artificielles)
- Relevés (6) : Surface traitée (m²) · Gouttière / zinc posé (ml) · Hauteur de travail (m) · Temps passé sur site (h) · Garde-corps ou protection collective en place (oui / non) · Toiture amiantée (oui / non)
- Catégories de produits (10) : Tuiles · Ardoises · Zinc et gouttières · Fixations et crochets · Isolation (combles) · Étanchéité (membranes, bitume) · Fenêtres de toit · Produits de traitement (démoussant, hydrofuge) · Échafaudage et protection · EPI antichute
- Documents : Rapport d'intervention avec photos avant et après · Fiche de mise en sécurité (échafaudage, harnais) · Procès-verbal de réception

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Mise en sécurité obligatoire (case bloquante) avant de démarrer une intervention en toiture | haute | F9 |
| Photos avant et après obligatoires : la toiture n'est pas vérifiable par le client | haute |  |
| Catégories de produits de couverture à la place des catégories anti-nuisibles | haute | F7 |
| Alerte amiante (toiture ancienne en fibrociment) avec contrôle de la formation du couvreur | moyenne | F6 |
| Procès-verbal de réception signé sur place | moyenne | F4 |
| Rappel d'entretien annuel (démoussage, gouttières) | basse | F3 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Travaux sur toiture : garde-corps sur les échafaudages de toiture (article R4534-86 du Code du travail) ; à défaut, protection collective équivalente, et seulement si elle est impossible, un système d'arrêt de chute. | officielle | https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r4534-86-du-code-du-travail-travaux-sur-toiture.pdf |
| Les toitures en plaques fragiles représentent près de 30 % des chutes de hauteur, et une sur trois est mortelle. | professionnelle | https://content.preventionbtp.fr/pdf/droit_de_la_prevention/article-r4534-86-du-code-du-travail-travaux-sur-toiture.pdf |
| Amiante (fibrociment, ardoises artificielles) : intervention possible seulement avec la formation Amiante sous-section 4 ; fournir son échafaudage à un particulier qui désamiante peut être retenu comme participation à l'exposition. | officielle | https://pays-de-la-loire.dreets.gouv.fr/sites/pays-de-la-loire.dreets.gouv.fr/IMG/pdf/travaux_de_remplacement_d_une_couverture_amiantee.pdf |

**À vérifier, non écrit comme règle**

- Garantie décennale, DTU 40 et réception : la recherche n'a rien donné de sourcé.

### 12. 🛠️ Multiservices / Maintenance

*Petits travaux · maintenance · contrats*

**Rubriques ouvertes (20) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de petits travaux du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Un technicien polyvalent touche à tout : l'historique garde ce qui a été fait chez chaque client. |
| 🗓️ Planning | Beaucoup de petites interventions dans la journée : le planning les enchaîne. |
| 🏢 Planning général | Un ou deux techniciens, mais plusieurs clients à la fois : tout sur une page. |
| ✅ Tâches | Rappeler un client pour une pièce commandée, repasser finir un petit travail. |
| 🏖️ Absences & congés | Avec un ou deux techniciens, une absence change toute la semaine. |
| 🧰 Interventions | Une fiche par petit travail : ce qui a été fait, les pièces fournies, le temps passé, la signature. |
| 📄 Rapports | Un bon d'intervention clair remis au client à chaque passage. |
| 🗺️ Carte interventions **+** | Enchaîner les petites interventions du jour sans retours inutiles. |
| 🏢 Clients | Particuliers, copropriétés, commerces : chacun avec son adresse et l'historique de ce qu'on a fait chez lui. |
| 💰 Devis | Un devis de dépannage avant d'agir, comme l'exige le dépannage à domicile. |
| 🤖 Assistant devis | Un devis dicté sur place pour un petit travail. |
| 🧾 Factures | Facturer en sortant, avec la note détaillée. |
| 📑 Contrats **+** | Les contrats de maintenance donnent un revenu régulier aux petites structures. |
| ⏱️ Temps de travail | Le temps réellement passé par intervention, pour fixer des prix justes. |
| 🚐 Véhicules **+** | Le véhicule est l'atelier : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien demande au bureau une pièce ou un avis pendant l'intervention. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens polyvalents et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le bon d'intervention part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (12)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les encaissements. |
| 💳 Télécollecte | Pour les petites interventions payées sur place. |
| 📦 Produits | Petites pièces : un catalogue sert au devis. |
| 🗃️ Stock | Pour les petites pièces gardées dans le véhicule. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quelles pièces. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour répondre aux clients depuis l'application. |
| 🏭 Fournisseurs | Pour vos commandes ponctuelles. |
| ✉️ Bons de commande | Pour vos commandes ponctuelles. |
| 📌 Secteurs | Si vous découpez votre zone entre plusieurs techniciens. |

**Ce qui s'ajoute à ce que le code a déjà**

- Prestations : Liste des pièces fournies · Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (9) : Petits travaux · Maintenance préventive · Dépannage · Plomberie simple · Électricité simple · Montage / installation · Remplacement de pièce · Contrat de maintenance · Visite technique / devis
- Prestations (12) : Diagnostic · Réparation · Remplacement de pièce · Réglage · Montage · Fixation · Contrôle du bon fonctionnement · Explications au client · Nettoyage du chantier · Liste des pièces fournies · Taux horaire et frais de déplacement annoncés avant l'intervention · Pièces remplacées proposées au client
- Relevés (2) : Temps passé sur site (h) · Pièces / matériel fournis
- Catégories de produits (8) : Plomberie simple · Électricité simple · Quincaillerie et fixations · Peinture et petites réparations · Serrurerie simple · Consommables · Outillage · EPI
- Documents : Bon d'intervention signé · Devis de dépannage · Liste des pièces fournies · Contrat de maintenance avec rappel

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Contrat de maintenance avec rappel d'échéance (même moteur que le chauffage) | haute | F3 |
| Devis de dépannage conforme à l'arrêté de 2017 | haute | F8 |
| Liste des pièces fournies liée au stock | moyenne |  |
| Catégories de produits génériques de pièces | moyenne | F7 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Dépannage à domicile : information préalable, devis détaillé avant travaux, note détaillée au-delà de 25 € TTC (arrêté du 24 janvier 2017). | officielle | https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/plomberie-serrurerie-chauffage-choisir-le-bon-professionnel-pour-un-depannage-domicile |

**À vérifier, non écrit comme règle**

- Crédit d'impôt services à la personne pour les prestations aux particuliers : non vérifié.
- Aucune obligation n'est propre au métier : il se rattache à celles du lot réalisé (électricité, plomberie).

### 13. 🧰 Autre métier de terrain

*Interventions · entretien · dépannage*

**À savoir :** Le réglage neutre : il ne parle ni de nuisibles ni d'un métier qu'on ne connaît pas. Le socle seul est coché ; tout le reste est proposé et expliqué, le client coche ce dont il se sert.

**Rubriques ouvertes (17) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Retrouver qui a fait quoi, chez quel client, et quand. |
| 🗓️ Planning | Qui intervient où et quand, quel que soit votre métier. |
| 🏢 Planning général | Toute l'équipe sur une page pour voir les trous et les doublons. |
| ✅ Tâches | Une liste de choses à faire avec échéance pour ne rien oublier. |
| 🏖️ Absences & congés | Congés et absences, pour planifier sans erreur. |
| 🧰 Interventions | Une fiche par passage chez un client : date, technicien, photos, signature, compte rendu. |
| 📄 Rapports | Un rapport PDF à remettre à chaque client, avec photos et signature. |
| 🏢 Clients | Votre fichier clients avec leurs adresses et l'historique de ce que vous avez fait chez eux. |
| 💰 Devis | Des devis professionnels envoyés en PDF. |
| 🤖 Assistant devis | Dicter un devis plutôt que le taper. |
| 🧾 Factures | Facturer et suivre les paiements. |
| ⏱️ Temps de travail | Les heures de chacun, base de la paie. |
| 💬 Messagerie | Échanger avec l'équipe sans passer par vos téléphones personnels. |
| 👥 Utilisateurs | Créez les comptes de votre équipe et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport d'intervention part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (19)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre votre chiffre d'affaires. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Si vous avez des tournées : les interventions du jour sur une carte. |
| 📑 Contrats | Si vous avez des contrats d'entretien avec des passages réguliers. |
| 📊 Comptabilité | Pour suivre vos encaissements. |
| 💳 Télécollecte | Si vous encaissez sur place. |
| 📦 Produits | Si vous vendez ou utilisez des fournitures que vous voulez chiffrer. |
| 🗃️ Stock | Si vous gardez du matériel ou des pièces en réserve. |
| 🔁 Mouvements stock | Si vous voulez tracer qui prend quoi dans le stock. |
| 🚐 Véhicules | Si vous avez des véhicules à suivre. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent vos véhicules. |
| 📧 Boîte mail | Pour répondre à vos clients depuis l'application. |
| 🏭 Fournisseurs | Si vous commandez régulièrement chez les mêmes fournisseurs. |
| ✉️ Bons de commande | Si vous envoyez des bons de commande. |
| 📝 Brouillon | Si vos techniciens préparent des demandes de matériel. |
| ✈️ Mes demandes | Si vos techniciens demandent du matériel à un responsable. |
| ✅ Validations DR | Si un responsable valide les sorties de matériel. |
| 📥 Commandes en cours | Si vous suivez des commandes en cours. |
| 📌 Secteurs | Si vous découpez votre zone entre plusieurs techniciens. |

**Ce qui s'ajoute à ce que le code a déjà**

- Rien : le réglage neutre reste neutre.

**Contenu du pack** (les éléments du code sont conservés, les ajouts sont ci-dessus)

- Types d'intervention (8) : Intervention · Dépannage · Entretien · Installation · Contrôle / vérification · Réparation · Contrat d’entretien · Visite technique / devis
- Prestations (7) : Diagnostic · Intervention réalisée · Remplacement de pièce · Réglage · Essai et contrôle · Explications au client · Nettoyage du chantier
- Relevés (2) : Temps passé sur site (h) · Matériel utilisé
- Catégories de produits (4) : Pièces et fournitures · Consommables · Outillage · EPI
- Documents : Rapport d'intervention · Devis · Facture

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Catégories de produits neutres, à compléter par le client | moyenne | F7 |

**Obligations :** aucune sourcée pour ce métier.

**À vérifier, non écrit comme règle**

- Aucune obligation n'est propre à ce réglage : le métier n'est pas connu.

### 14. 🧯 Sécurité incendie *(nouveau)*

*Extincteurs · désenfumage · RIA · alarme incendie*

**Pourquoi il a besoin de l'application :** Des centaines de petits appareils par site, vérifiés chaque année, avec un rapport écrit à remettre : sur papier ou sur tableur, chaque tournée coûte du temps.

**Marché :** Chiffre non trouvé. Un CAP « agent vérificateur d'appareils extincteurs » existe, ce qui signale un métier structuré. (https://www.cidj.com/metiers/agent-verificateur-agente-verificatrice-d-appareils-extincteurs)

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de vérifications du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Chaque vérification engage votre responsabilité : on retrouve qui a contrôlé quel appareil, et quand. |
| 🗓️ Planning | Les vérifications reviennent chaque année à la date anniversaire : le planning répartit les tournées. |
| 🏢 Planning général | Toutes les tournées de vérification de la saison sur une page, pour les équilibrer entre techniciens. |
| ✅ Tâches | Relancer un client qui n'a pas levé les observations d'un rapport, commander des appareils de remplacement. |
| 🏖️ Absences & congés | Les tournées annuelles sont fixes : une absence se voit avant qu'une échéance de client soit dépassée. |
| 🧰 Interventions | Une fiche par site vérifié : appareils contrôlés, anomalies relevées, photos. |
| 📄 Rapports | Le rapport de vérification est le livrable : il part au client, qui le montre à son assureur. |
| 🗺️ Carte interventions **+** | Regrouper les vérifications annuelles par quartier. |
| 🏢 Clients | Un client a plusieurs bâtiments ; chaque site porte ses appareils et ses échéances. |
| 💰 Devis | Un devis de remplacement ou de mise en conformité après chaque rapport de vérification. |
| 🤖 Assistant devis | Un devis de remplacement dicté en fin de tournée. |
| 🧾 Factures | Facturer la vérification annuelle et les remplacements. |
| 📑 Contrats **+** | Le contrat annuel de vérification est le cœur du métier : sa date d'échéance fixe la prochaine tournée. |
| 📦 Produits **+** | Extincteurs neufs, recharges, joints, scellés, étiquettes : votre catalogue de pièces. |
| 🗃️ Stock **+** | Appareils de remplacement et consommables embarqués dans le camion. |
| 🔁 Mouvements stock **+** | Tracer quel appareil de remplacement a été posé chez quel client. |
| ⏱️ Temps de travail | Les heures par site vérifié, pour chiffrer un contrat annuel au juste prix. |
| 🚐 Véhicules **+** | Le camion transporte des appareils de remplacement : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le vérificateur signale au bureau un appareil à remplacer d'urgence. |
| 🏭 Fournisseurs **+** | Constructeurs et revendeurs de pièces et d'appareils. |
| ✉️ Bons de commande **+** | Commander appareils et pièces, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos vérificateurs et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport de vérification part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (7)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par type de vérification. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📋 Registre sanitaire | Un registre de sécurité par site : à ouvrir dès que le registre sera rendu utilisable hors anti-nuisibles. |
| 📊 Comptabilité | Pour suivre les règlements des contrats annuels. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les camions. |
| 📧 Boîte mail | Pour envoyer les rapports et relancer les clients depuis l'application. |
| 📌 Secteurs | Pour répartir les zones de tournée entre vérificateurs. |

**Contenu du pack**

- Types d'intervention (10) : Vérification annuelle des extincteurs · Vérification du désenfumage · Vérification des RIA (robinets d'incendie armés) · Vérification de l'alarme incendie · Remplacement ou recharge · Installation · Dépannage urgent · Formation du personnel (extincteurs, évacuation) · Contrat de vérification annuelle · Visite technique / devis
- Prestations (8) : Contrôle visuel · Test de fonctionnement · Vérification du manomètre · Remplacement du scellé · Recharge · Remplacement d'appareil · Pose de l'étiquette de vérification · Mise à jour du plan de situation des appareils
- Relevés (10) : Type d'agent (eau, poudre, CO₂) · Capacité (kg ou L) · N° de série · Année de fabrication · Date de dernière recharge · État du manomètre · État du scellé · État visuel · Résultat (conforme / non conforme / remplacé) · Nombre d'appareils vérifiés
- Catégories de produits (6) : Extincteurs portatifs · Extincteurs mobiles · Agents extincteurs (poudre, eau, CO₂) · Pièces détachées · Signalétique · Accessoires de désenfumage
- Documents : Rapport de vérification périodique (une ligne par appareil) · Étiquette ou vignette de vérification · Devis de remplacement · Attestation de formation

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc d'appareils par site avec numérotation et code QR par appareil | haute | F2 |
| Scan du code QR ou du numéro pour ouvrir la fiche de l'appareil sur le téléphone | haute | F2 |
| Rapport PDF groupé par site : résultat et anomalies de chaque appareil | haute | F12 |
| Tournées planifiées à la date anniversaire du contrat | haute | F3 |
| Catégories de produits de sécurité incendie | haute | F7 |
| Plan de situation des appareils sur le site (réutiliser le dessin de plans des PDF existants) | moyenne |  |
| Registre rebaptisé « Registre de sécurité » et détaché de l'anti-nuisibles | moyenne | F13 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Les extincteurs doivent être entretenus (Code du travail, art. R. 4227-29). La norme NF S 61-919 distingue l'inspection (faite par l'utilisateur, tous les trois mois, idéalement chaque mois) de la maintenance (faite par une personne compétente). Le rapport de vérification périodique est à transmettre au client sous un mois, en trois exemplaires dont un pour l'assureur. | secondaire, à confirmer | https://www.mapa-assurances.fr/mag/extincteurs-incendie-verifications-annuelles |
| Vérification annuelle des extincteurs en établissement recevant du public : article MS 30 de l'arrêté du 25 juin 1980. | secondaire, à confirmer | https://mapa.aji-france.com/mapa/file/marche/105589/r%C3%A9glement%20de%20consultation%20extincteurs.pdf |
| Désenfumage : vérification chaque année par un technicien compétent (article DF 10 de l'arrêté du 25 juin 1980) ; les observations des rapports se lèvent sous 6 mois (article GE 9). | secondaire, à confirmer | https://auxerre.fr/content/download/27480/257570/file/2024-DSATM-379+ERP+-+Pr%C3%A9fecture-tampon.pdf |

**À vérifier, non écrit comme règle**

- Les articles MS 30, DF 10 et GE 9 sont cités par des documents locaux (cahier des charges, arrêté municipal) : lire le texte officiel complet sur Légifrance avant de les écrire dans l'application.
- APSAD R4 est un référentiel d'assurance, pas un texte officiel (source faible, un forum).
- Code NAF et chiffres de marché : à chiffrer via l'INSEE.

### 15. ❄️ Froid commercial / Frigoriste *(nouveau)*

*Chambres froides · vitrines · groupes · fluides frigorigènes*

**Pourquoi il a besoin de l'application :** Chambres froides, vitrines et groupes de restaurants, commerces alimentaires et laboratoires : des contrats, des fluides à tracer et des contrôles d'étanchéité à dates fixes.

**Marché :** Chiffre non trouvé pour le froid seul. Pour le chauffage et la climatisation : environ 27 400 entreprises artisanales d'eau et de gaz et 15 800 d'équipements thermiques et de climatisation (CAPEB, 2013, hors auto-entrepreneurs : ancien). (https://conseils.xpair.com/actualite_thermpresse/solaire-thermique-pac-bois-energie.htm)

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme d'entretiens et d'urgences du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Une fiche de fluide se conserve 5 ans : on retrouve qui est intervenu sur quel équipement, et quand. |
| 🗓️ Planning | Entretiens programmés et pannes de chambre froide, qui n'attendent pas : le planning les range. |
| 🏢 Planning général | Toutes les équipes et les astreintes sur une page, pour envoyer quelqu'un vite quand une chambre froide lâche. |
| ✅ Tâches | Rappeler un restaurateur avant l'échéance du contrôle d'étanchéité, commander un compresseur. |
| 🏖️ Absences & congés | Une panne de froid est une urgence pour le client : une absence se voit avant l'astreinte. |
| 🧰 Interventions | Une fiche par équipement : température, pressions, fluide chargé ou récupéré, résultat du contrôle. |
| 📄 Rapports | La fiche d'intervention et le compte rendu remis au client, au nom de la bonne société. |
| 🗺️ Carte interventions **+** | Enchaîner les entretiens et les urgences de la journée. |
| 🏢 Clients | Restaurants, commerces alimentaires, laboratoires : chaque site porte ses équipements de froid. |
| 💰 Devis | Devis de remplacement de compresseur, de chambre froide ou de groupe. |
| 🤖 Assistant devis | Un devis dicté devant l'installation. |
| 🧾 Factures | Facturer le contrat d'entretien, les dépannages et les remplacements. |
| 📑 Contrats **+** | Les contrats d'entretien fixent les visites et les contrôles d'étanchéité de chaque client. |
| 📦 Produits **+** | Fluides frigorigènes, compresseurs, détendeurs, filtres déshydrateurs : votre catalogue de pièces. |
| 🗃️ Stock **+** | Le stock de fluide est central : bouteilles par fluide, pièces d'usure dans le véhicule. |
| 🔁 Mouvements stock **+** | Tracer les quantités de fluide sorties, chargées et récupérées, bouteille par bouteille. |
| ⏱️ Temps de travail | Heures d'intervention et d'astreinte de chaque frigoriste. |
| 🚐 Véhicules **+** | Le véhicule porte les bouteilles de fluide : assurance, kilométrage, échéances. |
| 💬 Messagerie | Le technicien demande au bureau un compresseur ou une référence de fluide. |
| 🏭 Fournisseurs **+** | Grossistes en froid, fabricants, fournisseurs de fluides frigorigènes. |
| ✉️ Bons de commande **+** | Commander compresseurs, fluides et pièces électriques, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos frigoristes et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : la fiche d'intervention fluide part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (12)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par type d'intervention. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📋 Registre sanitaire | Un registre par équipement : à ouvrir dès que le registre sera rendu utilisable hors anti-nuisibles. |
| 📊 Comptabilité | Pour suivre les règlements des contrats et des dépannages. |
| 💳 Télécollecte | Si vous encaissez les dépannages sur place. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour relancer les clients dont le contrôle arrive à échéance. |
| 📝 Brouillon | À partir de trois techniciens : chacun prépare sa liste de pièces. |
| ✈️ Mes demandes | Le technicien demande un compresseur ou une bouteille de fluide, le responsable suit. |
| ✅ Validations DR | Le responsable valide les sorties de fluide frigorigène. |
| 📥 Commandes en cours | Suivre les commandes de pièces en route. |
| 📌 Secteurs | Pour répartir les zones d'entretien entre frigoristes. |

**Contenu du pack**

- Types d'intervention (10) : Mise en service · Contrôle d'étanchéité · Maintenance préventive · Dépannage urgent · Charge ou récupération de fluide · Remplacement de compresseur · Nettoyage de condenseur · Installation · Contrat d'entretien · Visite technique / devis
- Prestations (9) : Contrôle des températures de consigne · Contrôle des pressions haute et basse · Recherche de fuite (détecteur) · Contrôle du système permanent de détection de fuite · Récupération et pesée du fluide · Remplacement du filtre déshydrateur · Nettoyage du condenseur · Contrôle des organes électriques · Pose de la vignette de contrôle d'étanchéité
- Relevés (14) : Fluide frigorigène (ex. R452A) · Charge totale (kg) · PRP du fluide (plaque signalétique) · Équivalent CO₂ de la charge (PRP × charge / 1000) (t) · Quantité de fluide chargée (kg) · Quantité de fluide récupérée (kg) · Température de consigne (°C) · Température de départ (°C) · Pression haute (bar) · Pression basse (bar) · Résultat du contrôle d'étanchéité · Date du prochain contrôle · Identifiant de la bouteille ou du contenant · N° de bordereau de suivi des déchets de fluide (Trackdéchets)
- Catégories de produits (6) : Fluides frigorigènes (par type) · Compresseurs · Détendeurs · Filtres déshydrateurs · Pièces électriques · Isolants
- Documents : Fiche d'intervention fluide (rubriques du Cerfa 15497*04, sans prétendre le remplacer) · Étiquette de contrôle d'étanchéité · Registre d'équipement · Déclaration annuelle des quantités de fluide

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Module « fluides » commun avec le chauffage : charge, récupération, périodicité du contrôle selon la charge, n° de bordereau | haute | F11 |
| Parc d'équipements du client (chambres froides, groupes, vitrines) avec échéances | haute | F2 |
| Rappel d'échéance de contrat et de contrôle d'étanchéité | haute | F3 |
| Suivi des bouteilles de fluide : stock par fluide et par contenant | haute | F1 |
| Catégories de produits de froid | haute | F7 |
| Alertes d'échéance des attestations d'aptitude des techniciens | moyenne | F6 |
| Déclaration annuelle des quantités acquises, chargées, récupérées et cédées | moyenne |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Règlement (UE) 2024/573 « F-gas », applicable depuis le 11 mars 2024 ; transposé aux articles R. 543-75 et suivants du Code de l'environnement. | professionnelle, à confirmer | https://www.ffbatiment.fr/actualites-batiment/actualite-bam/gaz-fluores-rappel-dispositions-essentielles-reglement-europeen-f-gas-iii |
| Contrôle d'étanchéité HFC/PFC selon le tonnage équivalent CO₂ : de 5 à 50 t annuel ; de 50 à 500 t semestriel ; au-delà de 500 t trimestriel ; intervalle doublé avec détection permanente. Vignette bleue ou rouge après le contrôle. | professionnelle | https://www.ffbatiment.fr/techniques-batiment/equipements-techniques/chauffage-ventilation-climatisation/dossier-bam/de-nouvelles-regles-de-controle-d-etancheite-pour-les-equipements-contenant-des-hfc |
| Fiche d'intervention fluides frigorigènes (Cerfa 15497*04) : une par opération et par équipement, conservée 5 ans ; HFO seuls : 12, 6 ou 3 mois selon la charge, doublés avec détection. | officielle | https://capeb.fr/www/capeb/media/var/document/notice%20fiche%20d%20intervention%20fluides%20frigorigenes.pdf |
| Attestation de capacité de l'entreprise (cinq ans maximum) et attestation d'aptitude de chaque technicien, étendue aux HFO ; modèle à l'annexe IV de l'arrêté du 21 novembre 2025. | officielle, à confirmer | https://aida.ineris.fr/reglementation/arrete-211125-relatif-a-delivrance-attestations-capacite-operateurs-prevues-a |
| Déclaration annuelle des quantités acquises, chargées, récupérées et cédées, avec les stocks au 1er janvier et au 31 décembre (synthèse d'une source professionnelle). | officielle, à confirmer | https://www.occitanie.developpement-durable.gouv.fr/IMG/pdf/20250319-presentationfff-da-pluscomplete.pdf |

**À vérifier, non écrit comme règle**

- Les arrêtés de 2016 (étanchéité) et de 2008 (attestations) étaient en cours de révision en 2025 : lire les versions en vigueur avant de coder une périodicité.
- Seuils exacts de la déclaration annuelle : à confirmer sur Légifrance.

### 16. 🛗 Ascenseurs *(nouveau)*

*Maintenance · visites périodiques · dépannage · mise en sécurité*

**Pourquoi il a besoin de l'application :** Chaque ascenseur a un contrat d'entretien avec une visite toutes les six semaines : le volume de visites récurrentes est le plus élevé de tous les métiers de la liste.

**Marché :** Environ 600 000 appareils, dont la moitié a plus de 25 ans (Fédération des ascenseurs) ; estimations plus anciennes de 420 000 à 570 000 ; 78 227 contrôles quinquennaux réalisés en 2018. (https://questions.assemblee-nationale.fr/dyn/15/questions/QANR5L15QE15789.pdf)

**Prudence :** Marché dominé par de grands groupes mais des PME locales existent ; la sécurité (consignation, habilitations) est une contrainte lourde.

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de visites du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | Chaque visite se consigne : on retrouve qui a contrôlé quel appareil, et quand. |
| 🗓️ Planning | Une visite toutes les six semaines par appareil : le planning enchaîne les tournées. |
| 🏢 Planning général | Toutes les tournées et les astreintes sur une page pour qu'aucune échéance ne saute. |
| ✅ Tâches | Relancer un syndic sur un devis de modernisation, suivre la levée des observations d'un contrôle technique. |
| 🏖️ Absences & congés | Les astreintes de dépannage se préparent : un congé se voit avant d'attribuer la semaine. |
| 🧰 Interventions | Une fiche par visite ou par dépannage : appareil, étage, constat, photos, signature. |
| 📄 Rapports | Le compte rendu de visite remis au syndic ou au gestionnaire. |
| 🗺️ Carte interventions **+** | Enchaîner les visites d'une même zone dans une tournée. |
| 🏢 Clients | Syndics, bailleurs, gestionnaires : chaque immeuble porte ses appareils et leur contrat. |
| 💰 Devis | Devis de modernisation ou de remplacement de pièces. |
| 🤖 Assistant devis | Un devis de modernisation dicté sur place. |
| 🧾 Factures | Facturer l'entretien périodique et les dépannages. |
| 📑 Contrats **+** | Le contrat d'entretien est le cœur du métier : sa périodicité fixe les visites. |
| 📦 Produits **+** | Câbles, galets, contacts, cartes électroniques, pièces de portes : votre catalogue de pièces. |
| 🗃️ Stock **+** | Les pièces d'usure à avoir dans le véhicule avant de partir en dépannage. |
| 🔁 Mouvements stock **+** | Tracer quelle pièce a été posée sur quel appareil. |
| ⏱️ Temps de travail | Heures de visite et d'astreinte, par technicien. |
| 🚐 Véhicules **+** | Le véhicule de tournée et d'astreinte : assurance, kilométrage, entretien. |
| 💬 Messagerie | L'astreinte reçoit une personne bloquée : le bureau envoie l'adresse en un message. |
| 🏭 Fournisseurs **+** | Fabricants et revendeurs de pièces d'ascenseur. |
| ✉️ Bons de commande **+** | Commander des pièces et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens d'ascenseurs et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le compte rendu de visite part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (11)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par contrat. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📋 Registre sanitaire | Un carnet d'entretien par appareil : à ouvrir dès que le registre sera rendu utilisable hors anti-nuisibles. |
| 📊 Comptabilité | Pour suivre les règlements des contrats, souvent importants. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules d'astreinte. |
| 📧 Boîte mail | Pour échanger avec les syndics depuis l'application. |
| 📝 Brouillon | Le technicien prépare sa liste de pièces. |
| ✈️ Mes demandes | Le technicien demande une pièce, le responsable suit la demande. |
| ✅ Validations DR | Le responsable valide les pièces coûteuses. |
| 📥 Commandes en cours | Suivre les commandes de pièces en route. |
| 📌 Secteurs | Pour répartir les immeubles entre techniciens. |

**Contenu du pack**

- Types d'intervention (8) : Visite d'entretien · Dépannage (appel de personne bloquée) · Mise en sécurité · Modernisation · Remise en service · Visite de contrôle · Contrat d'entretien · Visite technique / devis
- Prestations (8) : Test de l'interphone · Test de l'arrêt d'urgence · Contrôle des portes palières et de cabine · Contrôle des câbles · Graissage · Remplacement d'une pièce d'usure · Remise en service après arrêt · Report dans le carnet d'entretien
- Relevés (7) : N° de l'appareil · Étages desservis · Charge nominale (kg) · État du câblage · État des portes · Test de l'interphone (bon / défaillant) · Test de l'arrêt d'urgence (bon / défaillant)
- Catégories de produits (6) : Câbles · Galets · Contacts · Cartes électroniques · Huiles · Pièces de portes
- Documents : Compte rendu de visite · Carnet d'entretien (par appareil) · Suivi du rapport de contrôle technique

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc d'appareils par immeuble avec numéro d'appareil, étages, charge et contrat | haute | F2 |
| Planification automatique à intervalle fixe de six semaines | haute | F3 |
| Catégories de produits d'ascenseur | haute | F7 |
| Astreinte d'urgence (qui est d'astreinte, appel d'une personne bloquée) | moyenne |  |
| Carnet d'entretien exportable par appareil | moyenne | F12 |
| Suivi du rapport de contrôle technique quinquennal et de la levée des observations | moyenne |  |
| Habilitations et formations des techniciens avec échéance | moyenne | F6 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Loi n° 2003-590 du 2 juillet 2003, art. 79 : mise en sécurité des appareils installés avant le 24 août 2000 (par tranches jusqu'en 2018), contrat d'entretien obligatoire, contrôle technique périodique (quinquennal). | officielle, à confirmer | https://www.assemblee-nationale.fr/dyn/15/questions/QANR5L15QE15789.pdf |
| L'arrêté du 18 novembre 2004 et le décret du 7 mai 2012 précisent les opérations d'entretien et fixent une visite toutes les six semaines. | secondaire, à confirmer | https://www.futura-sciences.com/maison/questions-reponses/batiment-assurer-maintenance-ascenseurs-16855/ |

**À vérifier, non écrit comme règle**

- Sources anciennes : confirmer les textes et la périodicité sur Légifrance avant de coder.

### 17. 🚧 Portes et portails automatiques *(nouveau)*

*Installation · maintenance semestrielle · dépannage*

**Pourquoi il a besoin de l'application :** Une maintenance semestrielle à consigner dans un carnet d'entretien : installateur et mainteneur sont souvent la même personne.

**Marché :** Chiffre non trouvé.

**Rubriques ouvertes (24) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de maintenances du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve qui a réglé quel portail, et quand : utile après une défaillance. |
| 🗓️ Planning | Deux visites par an et par porte, plus les dépannages : le planning range les deux. |
| 🏢 Planning général | Toutes les tournées semestrielles sur une page pour ne manquer aucune échéance. |
| ✅ Tâches | Relancer un client pour une pièce commandée, rappeler pour un réglage d'effort. |
| 🏖️ Absences & congés | Avec une petite équipe, un congé décale les tournées : on le voit avant de planifier. |
| 🧰 Interventions | Une fiche par porte : force de fermeture, cellules, bords sensibles, photos, signature. |
| 📄 Rapports | Le rapport de maintenance et le carnet d'entretien remis au client. |
| 🗺️ Carte interventions **+** | Enchaîner plusieurs sites dans une même tournée de maintenance. |
| 🏢 Clients | Entreprises, copropriétés, collectivités : chaque site porte ses portes et leurs contrats. |
| 💰 Devis | Devis d'installation, de remplacement de moteur ou de cellule. |
| 🤖 Assistant devis | Un devis d'installation dicté sur place. |
| 🧾 Factures | Facturer la maintenance semestrielle et les dépannages. |
| 📑 Contrats **+** | Le contrat de maintenance fixe les deux visites annuelles de chaque porte. |
| 📦 Produits **+** | Moteurs, cellules photoélectriques, télécommandes, bords sensibles, ressorts : votre catalogue de pièces. |
| 🗃️ Stock **+** | Les pièces courantes (cellules, télécommandes, ressorts) à avoir dans le véhicule. |
| ⏱️ Temps de travail | Les heures de maintenance et de dépannage, par technicien. |
| 🚐 Véhicules **+** | Le véhicule de tournée : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien demande au bureau une référence de moteur ou de cellule. |
| 🏭 Fournisseurs **+** | Fabricants et distributeurs de motorisations et d'automatismes. |
| ✉️ Bons de commande **+** | Commander moteurs et automates, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le carnet d'entretien part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (8)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires des contrats. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les règlements des contrats et des dépannages. |
| 💳 Télécollecte | Si vous encaissez les dépannages sur place. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quelle pièce. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour relancer les clients dont la maintenance arrive à échéance. |
| 📌 Secteurs | Pour répartir les zones entre techniciens. |

**Contenu du pack**

- Types d'intervention (8) : Installation · Mise en service · Maintenance semestrielle · Dépannage · Remplacement de moteur ou de cellule · Réglage d'effort · Contrat d'entretien · Visite technique / devis
- Prestations (9) : Contrôle des cellules photoélectriques · Contrôle des bords sensibles · Test de l'arrêt d'urgence · Test des télécommandes · Contrôle des ressorts · Réglage de la force de fermeture · Graissage · Vérification après défaillance · Mise à jour du carnet d'entretien
- Relevés (6) : Force de fermeture (N) · Cellules photoélectriques (bon / défaillant) · Bords sensibles (bon / défaillant) · Arrêt d'urgence (bon / défaillant) · Télécommandes (bon / défaillant) · État des ressorts
- Catégories de produits (6) : Moteurs · Cellules photoélectriques · Télécommandes · Bords sensibles · Ressorts · Automates
- Documents : Carnet d'entretien (par porte) · Rapport de maintenance

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc de portes et portails par site avec carnet d'entretien exportable | haute | F2 |
| Rappel et planification de la maintenance semestrielle | haute | F3 |
| Catégories de produits d'automatismes | haute | F7 |
| Vérification obligatoire à créer après toute défaillance signalée par le client | moyenne |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Maintenance semestrielle des portes et portails automatiques sur les lieux de travail, consignée dans un carnet d'entretien, avec vérification après toute défaillance ; périodicité ajustable selon l'usage (arrêté du 21 décembre 1993). | officielle, à confirmer | https://content.preventionbtp.fr/pdf/droit_de_la_prevention/annexe-de-l-arrete-du-21-decembre-1993-relatif-aux-portes-et-portails-automatiques-et-semi-automatiques-sur-les-lieux-de-travail.pdf |
| Guide d'entretien des rideaux métalliques et portes sectionnelles. | secondaire | https://www.metal2000.fr/uploads/2026/04/guide-entretien-rideaux-metalliques-et-portes-sectionnelles.pdf |

**À vérifier, non écrit comme règle**

- La norme NF EN 12453 est présentée par AFNOR comme « annulée » sans indication de remplacement : ne pas la citer dans un rapport avant vérification.
- Champ exact de l'arrêté de 1993 (lieux de travail, établissements recevant du public) : à relire sur Légifrance.

### 18. 🧹 Ramonage *(nouveau)*

*Cheminées · poêles · conduits · certificat de ramonage*

**Pourquoi il a besoin de l'application :** Chaque client revient une ou deux fois par an, la tournée est saisonnière et géographique, et le certificat de ramonage est le document que tout client réclame. Des artisans en entreprise individuelle qui n'ont aujourd'hui aucun outil.

**Marché :** Chiffre non trouvé : aucune source n'indique le nombre d'entreprises.

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de ramonages du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve quand un conduit a été ramoné et par qui : la preuve qu'un assureur réclame. |
| 🗓️ Planning | À l'ouverture de la saison, des dizaines de ramonages à placer : le planning les répartit. |
| 🏢 Planning général | Toute la saison de ramonage sur une page, par ramoneur et par quartier. |
| ✅ Tâches | Rappeler un client dont le conduit est à tuber, relancer un devis de chapeau. |
| 🏖️ Absences & congés | Les saisons de pointe laissent peu de marge : une absence se voit tout de suite. |
| 🧰 Interventions | Une fiche par conduit : type de conduit, combustible, hauteur, état, anomalies, signature. |
| 📄 Rapports | Le certificat de ramonage daté, remis au client à la clôture de l'intervention. |
| 🗺️ Carte interventions **+** | La tournée de ramonage est géographique : enchaîner les clients d'un même quartier. |
| 🏢 Clients | Particuliers et gestionnaires : adresse, appareils et conduits de chaque logement. |
| 💰 Devis | Devis de tubage, de chapeau ou de remise en état d'un conduit. |
| 🤖 Assistant devis | Un devis de tubage dicté sur place. |
| 🧾 Factures | Facturer à la visite ou à l'abonnement annuel. |
| 📑 Contrats **+** | Un abonnement annuel ramène le client chaque saison. |
| 📊 Comptabilité **+** | Les encaissements de la journée se rapprochent des certificats remis. |
| 💳 Télécollecte **+** | Le paiement se fait souvent à la visite. |
| 📦 Produits **+** | Hérissons, brosses, tubage inox, chapeaux, trappes de visite : votre catalogue de fournitures. |
| 🗃️ Stock **+** | Le matériel et les pièces à avoir dans le véhicule : brosses, tubage, chapeaux. |
| ⏱️ Temps de travail | Le temps réellement passé par conduit, pour fixer un juste tarif. |
| 🚐 Véhicules **+** | Le véhicule de tournée : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le ramoneur signale au bureau une anomalie sur un conduit. |
| 📌 Secteurs **+** | Découper la saison par secteur et par ramoneur. |
| 👥 Utilisateurs | Créez les comptes de vos ramoneurs et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le certificat de ramonage part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (7)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par saison. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quel matériel. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour envoyer les certificats et relancer les clients depuis l'application. |
| 🏭 Fournisseurs | Pour vos commandes de tubage et de chapeaux. |
| ✉️ Bons de commande | Pour vos commandes de tubage et de chapeaux. |

**Contenu du pack**

- Types d'intervention (10) : Ramonage de cheminée · Ramonage de poêle · Ramonage de chaudière · Débistrage (ramonage mécanique d'un conduit encrassé) · Tubage · Pose de chapeau · Inspection par caméra · Dépannage tirage · Abonnement annuel · Visite technique / devis
- Prestations (7) : Ramonage mécanique du conduit · Nettoyage du foyer ou de l'appareil · Contrôle de la vacuité du conduit · Inspection par caméra · Mesure du tirage · Pose d'une trappe de visite · Remise du certificat de ramonage
- Relevés (8) : Type de conduit · Combustible · Hauteur du conduit (m) · Diamètre (mm) · État du conduit · Tirage (Pa) · Présence de bistre · Anomalies à signaler
- Catégories de produits (5) : Hérissons et brosses · Tubage inox · Chapeaux · Trappes de visite · Produits de nettoyage
- Documents : Certificat de ramonage (PDF daté, nom de l'entreprise, adresse, nature du conduit), envoyé par e-mail à la clôture

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Certificat de ramonage en PDF, daté, avec la nature du conduit, envoyé par e-mail à la signature sur place | haute | F12 |
| Tournée saisonnière : à l'ouverture de la saison, proposer le planning de tous les clients dont l'abonnement arrive à échéance | haute | F3 |
| Catégories de produits de ramonage | haute | F7 |
| Fiche conduit rattachée au client (combustible, hauteur, diamètre) | moyenne | F2 |
| Fréquence de ramonage par commune, une fois le règlement sanitaire départemental vérifié | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| La fréquence est fixée par le règlement sanitaire départemental. Valeurs usuelles : deux ramonages par an pour les conduits bois, charbon et fioul (dont un en période de chauffe), un pour le gaz. | secondaire | https://www.allianz.fr/assurance-particulier/habitation-biens/assurance-habitation/conseils-pratiques/ramonage-cheminee-obligatoire.html |
| Le règlement de Paris impose deux ramonages par an et la plupart des communes s'en inspirent. | secondaire | https://www.pap.fr/actualites/avez-vous-fait-ramoner-votre-cheminee-c-est-obligatoire/a18159 |
| Un certificat de ramonage est remis au client ; il sert de preuve auprès de l'assureur. | secondaire | https://www.macif.fr/assurance/particuliers/assurance-habitation-et-vie-quotidienne/assurance-ramonage |
| Amende de 3e classe en cas de contrôle, jusqu'à 450 €. | secondaire, à confirmer | https://www.matmut.fr/assurance/habitation/conseils/ramonage-conduits-cheminee |

**À vérifier, non écrit comme règle**

- Décret n° 2023-641 du 20 juillet 2023 (cité par TotalEnergies, https://services.totalenergies.fr/particuliers/conseils/energies-habitat/chauffage/obligation-ramonage-chauffage) : sources contradictoires, à vérifier sur Légifrance avant de l'écrire dans l'application.
- Le délai de 15 jours pour remettre le certificat, cité par certaines sources, n'est pas confirmé comme réglementaire.
- Toutes les sources trouvées sont des assureurs ou des sites d'information : aucune n'est le texte du règlement sanitaire.

### 19. 🚛 Assainissement / Vidange *(nouveau)*

*Fosses · bacs à graisses · curage · bordereaux de suivi*

**Pourquoi il a besoin de l'application :** Un métier de camions et de volumes, avec un bordereau de suivi à chaque vidange : du papier que le logiciel remplace directement. Très différent des autres, à ne fusionner avec aucun pack.

**Marché :** Chiffre non trouvé. Les entreprises agréées sont listées par préfecture, il n'y a pas de total national.

**Rubriques ouvertes (23) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de vidanges du jour d'un coup d'œil, dès l'ouverture. |
| 📈 Statistiques **+** | Les m³ pompés par commune alimentent le bilan annuel à remettre au préfet. |
| 🕘 Historique | On retrouve quelle fosse a été vidangée, quand et par qui : la trace qu'un contrôle du SPANC peut demander. |
| 🗓️ Planning | Des vidanges planifiées et des urgences de débouchage : le planning fait tenir le tout dans les camions. |
| 🏢 Planning général | Tous les camions et toutes les équipes sur une page. |
| ✅ Tâches | Relancer un client dont la vidange arrive à échéance, préparer le bilan annuel. |
| 🏖️ Absences & congés | Le camion est l'outil : une absence de chauffeur se voit avant de planifier. |
| 🧰 Interventions | Une fiche par vidange : volume pompé, état de l'ouvrage, lieu d'élimination, photos. |
| 📄 Rapports | L'attestation de vidange et le bordereau remis au client. |
| 🗺️ Carte interventions **+** | Organiser la tournée des camions entre les chantiers. |
| 🏢 Clients | Particuliers, restaurants, collectivités : chaque ouvrage avec son volume et sa date de dernière vidange. |
| 💰 Devis | Devis de vidange, de curage ou de remise en état d'un poste de relevage. |
| 🤖 Assistant devis | Un devis de curage dicté sur place. |
| 🧾 Factures | Facturer au volume pompé ou au forfait. |
| 📑 Contrats **+** | Un contrat de vidange périodique ramène le client à la bonne échéance. |
| ⏱️ Temps de travail | Les heures de camion et de chauffeur, par tournée. |
| 🚐 Véhicules **+** | Le camion est l'outil : assurance, kilométrage, échéances. |
| 🧑‍✈️ Conducteurs **+** | Les chauffeurs autorisés à conduire chaque camion. |
| 💬 Messagerie | Le chauffeur prévient le bureau d'un accès impossible ou d'un camion plein. |
| 📌 Secteurs **+** | Répartir les communes entre les camions : le bilan annuel se fait par commune. |
| 👥 Utilisateurs | Créez les comptes de vos chauffeurs et vos techniciens et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le bordereau de suivi part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (9)**

| Rubrique | Quand la cocher |
|---|---|
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📋 Registre sanitaire | Le registre des vidanges, à conserver dix ans : à ouvrir dès que le registre sera rendu utilisable hors anti-nuisibles. |
| 📊 Comptabilité | Pour suivre les règlements. |
| 💳 Télécollecte | Si vous encaissez les débouchages sur place. |
| 📦 Produits | Peu de stock : seulement pour des consommables. |
| 🗃️ Stock | Seulement pour des consommables et des pièces de camion. |
| 📧 Boîte mail | Pour envoyer les bordereaux depuis l'application. |
| 🏭 Fournisseurs | Pour vos commandes de pièces et de consommables. |
| ✉️ Bons de commande | Pour vos commandes de pièces et de consommables. |

**Contenu du pack**

- Types d'intervention (9) : Vidange de fosse septique · Vidange de bac à graisses · Curage de canalisation · Inspection caméra · Débouchage · Pompage · Entretien de poste de relevage · Contrat de vidange périodique · Visite technique / devis
- Prestations (7) : Pompage de l'ouvrage · Curage haute pression · Inspection par caméra · Contrôle de l'état de l'ouvrage · Contrôle de la pompe du poste de relevage · Remise du bordereau de suivi · Nettoyage du site
- Relevés (6) : Volume pompé (m³) · Volume de la fosse (m³) · État de l'ouvrage · Lieu d'élimination · N° du bordereau de suivi · Commune
- Catégories de produits (4) : Consommables (flexibles, buses, joints) · Pièces de camion et de pompe · Outillage · EPI
- Documents : Bordereau de suivi des matières de vidange (trois exemplaires) · Registre des vidanges (dix ans) · Bilan annuel par commune · Attestation de vidange

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Bordereau de suivi PDF numéroté (n°, identité du vidangeur et agrément, date, quantité, lieu d'élimination) | haute | F12 |
| Registre des vidanges conservé dix ans | haute | F13 |
| Export du bilan annuel par commune, à remettre avant le 1er avril | haute |  |
| Catégories de produits d'assainissement | haute | F7 |
| Contrôles et entretien des camions | moyenne |  |
| Alerte de rappel avant le 1er avril pour le bilan annuel | moyenne | F6 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Agrément préfectoral par société, avec numéro départemental et quantité annuelle maximale ; cadre commun : arrêté du 7 septembre 2009. | officielle, à confirmer | https://www.yonne.gouv.fr/contenu/telechargement/28216/218743/file/AgrementVidangeurs_cle545315.pdf |
| Bordereau de suivi en trois exemplaires (numéro, identité du vidangeur et agrément, date, quantité, lieu d'élimination), registre tenu dix ans. | officielle, à confirmer | https://www.ille-et-vilaine.gouv.fr/contenu/telechargement/64600/531758/file/DENOUAL_AP_20220224_Sign%C3%A9.pdf |
| Bilan d'activité annuel au préfet avant le 1er avril, avec le nombre d'installations vidangées par commune. | officielle, à confirmer | https://www.ille-et-vilaine.gouv.fr/contenu/telechargement/64641/531974/file/Procedure_et_obligations_35.pdf |
| Vidange en moyenne tous les 4 ans (selon le volume et les occupants) ; le SPANC peut demander le bordereau lors de son contrôle. | secondaire | https://www.construires.fr/fosse-septique-mise-aux-normes/ |

**À vérifier, non écrit comme règle**

- Les sources sont des arrêtés préfectoraux (Yonne, Ille-et-Vilaine) : les obligations peuvent varier d'un département à l'autre, et le texte national de l'arrêté du 7 septembre 2009 n'a pas été lu.

### 20. ☀️ Photovoltaïque et bornes de recharge *(nouveau)*

*Panneaux · onduleurs · bornes IRVE · maintenance*

**Fusion :** Photovoltaïque et bornes IRVE réunis dans un seul pack « énergies » : mêmes qualifications, mêmes clients.

**Pourquoi il a besoin de l'application :** Chaque installation devient un parc à surveiller (onduleurs, bornes) et un contrat de maintenance ; la maintenance de bornes exige une qualification propre.

**Marché :** Près de 5 000 installateurs qualifiés QualiPV en mars 2025, soit 75 % des RGE du photovoltaïque (chiffre de l'organisme lui-même). Plus de 169 000 points de recharge ouverts au public en juin 2025 selon un acteur du secteur, à vérifier chez l'Avere. (https://www.qualit-enr.org/wp-content/uploads/2025/06/CP_CONSEILS_PV_QUALITE.pdf)

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de poses et de maintenances du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve qui a mis en service quelle installation, et quand. |
| 🗓️ Planning | Poses de plusieurs jours, maintenances annuelles et dépannages d'onduleur : le planning range les trois. |
| 🏢 Planning général | Toutes les équipes et tous les chantiers sur une page. |
| ✅ Tâches | Suivre un dossier de raccordement, relancer un client pour une mise en service. |
| 🏖️ Absences & congés | Une pose se fait à deux : un congé décale un chantier. |
| 🧰 Interventions | Une fiche par pose ou par maintenance : puissance, tension des chaînes, état de l'onduleur, photos. |
| 📄 Rapports | Le rapport de maintenance remis au client, avec les mesures relevées. |
| 🏢 Clients | Particuliers, entreprises, copropriétés : chaque site porte ses panneaux, ses onduleurs et ses bornes. |
| 💰 Devis | Un devis détaillé avec les aides, pour des installations qui se chiffrent cher. |
| 🤖 Assistant devis | Un devis dicté après l'étude de site. |
| 🧾 Factures | Facturer par acomptes, au fil de la pose. |
| 📑 Contrats **+** | La maintenance annuelle d'une installation se fait sous contrat. |
| 📊 Comptabilité **+** | Suivre les acomptes et les soldes de chantiers de plusieurs milliers d'euros. |
| 📦 Produits **+** | Panneaux, onduleurs, bornes, câbles, protections : un catalogue pour chiffrer. |
| 🗃️ Stock **+** | Câbles, protections et petites pièces à avoir dans le véhicule. |
| 🔁 Mouvements stock **+** | Tracer qui a pris quelles pièces pour quel chantier. |
| ⏱️ Temps de travail | Les heures par installation, pour tenir le prix d'une pose. |
| 🚐 Véhicules **+** | Le véhicule de chantier : assurance, kilométrage, entretien. |
| 💬 Messagerie | L'installateur envoie des photos de toiture ou de tableau au bureau d'études. |
| 🏭 Fournisseurs **+** | Grossistes et fabricants de panneaux, d'onduleurs et de bornes. |
| ✉️ Bons de commande **+** | Commander panneaux et onduleurs avec une date de livraison. |
| 👥 Utilisateurs | Créez les comptes de vos installateurs et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport de maintenance part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (10)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires par type d'installation. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 🗺️ Carte interventions | Pour organiser les tournées de maintenance. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour échanger avec les clients et les organismes depuis l'application. |
| 📝 Brouillon | Pour les équipes : chacun prépare sa liste de matériel. |
| ✈️ Mes demandes | Un chef d'équipe demande du matériel pour un chantier, le responsable suit. |
| ✅ Validations DR | Le responsable valide les sorties de matériel coûteux. |
| 📥 Commandes en cours | Suivre les commandes en route. |
| 📌 Secteurs | Pour répartir les zones entre équipes. |

**Contenu du pack**

- Types d'intervention (10) : Étude de site · Pose · Mise en service · Maintenance annuelle · Nettoyage des panneaux · Dépannage onduleur · Installation de borne · Maintenance de borne · Contrôle de mise à la terre · Visite technique / devis
- Prestations (9) : Contrôle des chaînes de panneaux · Contrôle de l'onduleur · Mesure d'isolement · Mesure de la résistance de terre · Nettoyage des panneaux · Relevé de production · Test de la borne · Contrôle des protections · Remise de la fiche de mise en service
- Relevés (8) : Puissance crête (kWc) · Production relevée (kWh) · Tension des chaînes (V) · Courant des chaînes (A) · État de l'onduleur · Isolement (MΩ) · Résistance de terre (Ω) · Énergie délivrée par la borne (kWh)
- Catégories de produits (6) : Panneaux · Onduleurs · Bornes · Câbles · Protections · Supports de fixation
- Documents : Rapport de maintenance · Fiche de mise en service · Attestation de conformité (Consuel : à vérifier)

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc par site avec champs propres aux panneaux, aux onduleurs et aux bornes | haute | F2 |
| Contrat de maintenance avec rappel annuel | haute | F3 |
| Catégories de produits photovoltaïques et de bornes | haute | F7 |
| Suivi de la production à saisir à chaque visite | moyenne |  |
| Suivi des qualifications (IRVE, QualiPV) avec échéance | moyenne | F6 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Bornes IRVE : qualification obligatoire au-dessus de 3,7 kVA (décret de 2017, complété par l'arrêté du 27 octobre 2021). Installation : IRVE 1 (jusqu'à 36 kVA), IRVE 2, IRVE 3 (courant continu). Maintenance : IRVEMA1 à 3. Étude de conception obligatoire pour un parc d'au moins 50 places. | secondaire, à confirmer | https://hager.com/fr/actualites/certifications-irve |
| Organismes de qualification IRVE : Qualifelec, AFNOR, Qualit'EnR. | secondaire | https://opera-energie.com/qualification-irve/ |
| Photovoltaïque : qualification QualiPV (Qualit'EnR), qui couvre la pose et la maintenance, y compris les gammes et contrats de maintenance. | professionnelle | https://www.qualit-enr.org/wp-content/uploads/2025/06/CP_CONSEILS_PV_QUALITE.pdf |

**À vérifier, non écrit comme règle**

- Une mise à jour des référentiels IRVE en mai 2026 est signalée mais non confirmée.
- Consuel pour le photovoltaïque : de mémoire, à vérifier.
- Rien trouvé sur les contrats de maintenance d'onduleur.

### 21. 📹 Alarme, vidéosurveillance, contrôle d’accès *(nouveau)*

*Intrusion · caméras · badges · maintenance annuelle*

**Pourquoi il a besoin de l'application :** Chaque installation devient un contrat de maintenance annuel avec visites, les pannes arrivent en dépannage, et il faut tenir un historique de matériel par site (centrale, détecteurs, caméras).

**Marché :** Chiffre non trouvé : les résultats sont des offres commerciales. (https://www.homiris.fr/fr/v2/pdf/Tarifs-PRO.pdf)

**Prudence :** Les codes d'accès d'une alarme sont sensibles : ne pas les ranger dans l'application sans protection (décision à prendre).

**Rubriques ouvertes (24) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme d'installations et de maintenances du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve qui a modifié la configuration de quelle installation, et quand. |
| 🗓️ Planning | Installations, maintenances annuelles et dépannages : le planning range les trois. |
| 🏢 Planning général | Toutes les équipes et tous les sites sur une page. |
| ✅ Tâches | Rappeler un client pour une batterie à changer, relancer un procès-verbal de réception. |
| 🏖️ Absences & congés | Une petite équipe : un congé décale les maintenances. |
| 🧰 Interventions | Une fiche par visite : zones testées, état des batteries, appel au centre de télésurveillance, photos. |
| 📄 Rapports | Le rapport de maintenance et le procès-verbal de réception remis au client. |
| 🗺️ Carte interventions **+** | Enchaîner les visites de maintenance d'une même zone. |
| 🏢 Clients | Commerces, entreprises, particuliers : chaque site porte son matériel (centrale, détecteurs, caméras). |
| 💰 Devis | Devis d'installation ou de remplacement de matériel. |
| 🤖 Assistant devis | Un devis d'installation dicté pendant la visite du site. |
| 🧾 Factures | Facturer l'installation, la maintenance annuelle et les dépannages. |
| 📑 Contrats **+** | Chaque installation devient un contrat de maintenance annuel : le cœur du revenu récurrent. |
| 📦 Produits **+** | Centrales, détecteurs, caméras, badges, batteries : un catalogue pour chiffrer. |
| 🗃️ Stock **+** | Batteries et petit matériel de remplacement dans le véhicule. |
| ⏱️ Temps de travail | Les heures d'installation et de maintenance, par technicien. |
| 🚐 Véhicules **+** | Le véhicule de tournée : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien demande au bureau une référence de centrale ou de caméra. |
| 🏭 Fournisseurs **+** | Fabricants et distributeurs de matériel de sécurité. |
| ✉️ Bons de commande **+** | Commander du matériel avec une date de livraison. |
| 👥 Utilisateurs | Créez les comptes de vos installateurs et vos techniciens de maintenance et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : le rapport de maintenance part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (7)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires des contrats. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📊 Comptabilité | Pour suivre les règlements des contrats. |
| 🔁 Mouvements stock | Si vous voulez savoir qui a pris quel matériel. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour échanger avec les clients depuis l'application. |
| 📌 Secteurs | Pour répartir les zones entre techniciens. |

**Contenu du pack**

- Types d'intervention (9) : Installation · Mise en service · Maintenance préventive · Dépannage · Remplacement de batteries · Test de liaison avec le centre de télésurveillance · Modification de configuration · Contrat de maintenance · Visite technique / devis
- Prestations (9) : Test des zones · Test des détecteurs · Contrôle des batteries · Test de la sirène · Test de liaison avec le centre de télésurveillance · Contrôle du champ de vision des caméras · Contrôle de l'enregistreur · Mise à jour de la configuration · Remise du procès-verbal de réception
- Relevés (5) : État de la batterie · Niveau de signal · Nombre de zones testées · Résultat de l’appel au centre de télésurveillance · Date de pose du matériel remplacé
- Catégories de produits (8) : Centrales · Détecteurs · Sirènes · Caméras · Enregistreurs · Badges et lecteurs · Batteries · Câbles
- Documents : Rapport de maintenance · Procès-verbal de réception · Devis et facture

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc de matériel par site (centrale, détecteurs, caméras) avec historique | haute | F2 |
| Contrat de maintenance avec rappel annuel | haute | F3 |
| Catégories de produits d'alarme et de vidéosurveillance | haute | F7 |
| Mode « test des zones » | moyenne |  |
| Suivi de l'expiration des batteries | moyenne |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Habilitation électrique au niveau BR délivrée par l'employeur pour l'intrusion et la vidéoprotection (articles R. 4544-9 et R. 4544-10 du Code du travail). | officielle | https://www.francecompetences.fr/recherche/rncp/11467/ |
| Référentiels APSAD R81 (intrusion) et R82 (vidéosurveillance) pour les installateurs, I31 pour les centres de télésurveillance : des référentiels d'assurance, pas des textes officiels. | secondaire | https://www.homiris.fr/fr/v2/pdf/Tarifs-PRO.pdf |

**À vérifier, non écrit comme règle**

- Agrément CNAPS (concerne surtout la télésurveillance, avec une taxe sur ce service) : mention datée de 2016 sur une source bancaire, https://credit-agricole.fr/professionnel/assurances/locaux-professionnels/pack-pro-telesurveillance.html, à vérifier.
- Règles de déclaration CNIL pour la vidéo : de mémoire, à vérifier.

### 22. 💧 Traitement de l’eau *(nouveau)*

*Adoucisseurs · filtres · osmoseurs · analyses*

**Pourquoi il a besoin de l'application :** Adoucisseurs, filtres, osmoseurs : des visites récurrentes avec des consommables (sel, résines, cartouches) et des analyses. Peut aussi absorber le suivi des légionelles.

**Marché :** Chiffre non trouvé.

**Rubriques ouvertes (25) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de visites du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve quel appareil a été entretenu, par qui, et à quelle date. |
| 🗓️ Planning | Des visites annuelles récurrentes et des dépannages : le planning range les deux. |
| 🏢 Planning général | Toutes les tournées d'entretien d'adoucisseurs et de filtres sur une page. |
| ✅ Tâches | Rappeler un client pour une cartouche à changer, suivre le résultat d'une analyse. |
| 🏖️ Absences & congés | Une petite équipe : un congé décale les visites annuelles. |
| 🧰 Interventions | Une fiche par appareil : dureté avant et après, pression, débit, consommable changé. |
| 📄 Rapports | La fiche d'entretien ou le rapport d'analyse remis au client. |
| 🗺️ Carte interventions **+** | Enchaîner les visites annuelles d'une même zone. |
| 🏢 Clients | Particuliers, restaurants, collectivités : chaque site porte ses appareils de traitement. |
| 💰 Devis | Devis d'installation ou de remplacement d'un adoucisseur. |
| 🤖 Assistant devis | Un devis d'installation dicté sur place. |
| 🧾 Factures | Facturer l'entretien annuel et les consommables. |
| 📑 Contrats **+** | L'entretien annuel d'un adoucisseur ou d'un osmoseur se fait sous contrat. |
| 📦 Produits **+** | Résines, sel, cartouches, lampes UV, membranes d'osmose : un catalogue de consommables. |
| 🗃️ Stock **+** | Sel, cartouches et résines à avoir dans le véhicule. |
| 🔁 Mouvements stock **+** | Tracer quel consommable a été posé chez quel client. |
| ⏱️ Temps de travail | Les heures de visite et d'analyse, par technicien. |
| 🚐 Véhicules **+** | Le véhicule de tournée : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien envoie la photo d'un résultat d'analyse au bureau. |
| 🏭 Fournisseurs **+** | Fabricants et distributeurs d'équipements et de consommables. |
| ✉️ Bons de commande **+** | Commander des consommables et des appareils, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : la fiche d'entretien part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (8)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires des contrats. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 📋 Registre sanitaire | Un carnet sanitaire pour les sites à risque : à ouvrir dès que le registre sera rendu utilisable hors anti-nuisibles. |
| 📊 Comptabilité | Pour suivre les règlements des contrats. |
| 💳 Télécollecte | Si vous encaissez les dépannages sur place. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour envoyer les rapports d'analyse depuis l'application. |
| 📌 Secteurs | Pour répartir les zones entre techniciens. |

**Contenu du pack**

- Types d'intervention (9) : Installation · Entretien annuel · Régénération · Remplacement de cartouche · Désinfection de circuit · Prélèvement d'eau · Dépannage · Contrat d'entretien · Visite technique / devis
- Prestations (8) : Mesure de la dureté · Remplacement des cartouches · Régénération des résines · Remplissage en sel · Contrôle de la pression et du débit · Désinfection du circuit · Prélèvement pour analyse · Contrôle de la lampe UV
- Relevés (7) : Dureté avant traitement (TH) · Dureté après traitement (TH) · Pression (bar) · Débit (L/min) · Température (°C) · Chlore résiduel (mg/L) · Résultat d’analyse légionelles (UFC/L)
- Catégories de produits (6) : Résines · Sel · Cartouches de filtration · Lampes UV · Membranes d'osmose · Pompes doseuses
- Documents : Carnet sanitaire · Rapport d'analyse · Fiche d'entretien

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Parc d'appareils par site (adoucisseur, filtre, osmoseur) | haute | F2 |
| Rappel de contrat d'entretien annuel | haute | F3 |
| Catégories de produits de traitement de l'eau | haute | F7 |
| Relevé de dureté avec historique par appareil | moyenne |  |
| Carnet sanitaire pour les sites à risque légionelles | moyenne | F13 |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| Arrêté du 1er février 2010 (modifié par l'arrêté du 30 décembre 2022) : pour les établissements recevant du public à points d'usage à risque, surveillance de la température, seuil de 1 000 UFC/L de légionelles dans l'eau chaude sanitaire et carnet sanitaire. Le responsable est le propriétaire ou le directeur de l'établissement. | officielle | https://www.iledefrance.ars.sante.fr/media/133036/download |
| Mêmes obligations, rappelées par l'ARS Bretagne. | officielle | https://www.bretagne.ars.sante.fr/media/91790/download |

**À vérifier, non écrit comme règle**

- Les tours aéroréfrigérantes relèveraient de l'arrêté du 14 décembre 2013 (rubrique ICPE 2921) : de la mémoire, non confirmé.
- Aucune source trouvée sur les adoucisseurs.

### 23. 🏊 Pisciniste *(nouveau)*

*Construction · entretien saisonnier · hivernage · sécurité*

**Pourquoi il a besoin de l'application :** Un mélange de chantier (construction) et de contrat d'entretien saisonnier : ouverture de saison, hivernage, analyse d'eau, remplacement de pompes.

**Marché :** Environ 2 400 entreprises et 2,8 Md€ de chiffre d'affaires en 2024, avec 94 480 piscines installées, d'après un site de modèles de business plan qui cite la FPP sans source directe : à vérifier. Historique FPP : 5 200 entreprises dont 2 800 de construction en 2008, 1,8 Md€ en 2016. (https://modelesdebusinessplan.com/blogs/infos/marche-piscine)

**Rubriques ouvertes (26) et pourquoi**

| Rubrique | Pourquoi pour ce métier |
|---|---|
| 📊 Tableau de bord | Votre programme de visites et de chantiers du jour d'un coup d'œil, dès l'ouverture. |
| 🕘 Historique | On retrouve ce qui a été mesuré et ajouté dans quel bassin, et à quelle date. |
| 🗓️ Planning | Ouvertures de saison, entretiens, hivernages et chantiers de construction : le planning suit les saisons. |
| 🏢 Planning général | Toutes les équipes et toutes les tournées de la saison sur une page. |
| ✅ Tâches | Rappeler un client avant l'hivernage, commander un liner sur mesure. |
| 🏖️ Absences & congés | En pleine saison, une absence se voit tout de suite sur les tournées. |
| 🧰 Interventions | Une fiche par bassin : analyse d'eau, filtration, pompe, produits ajoutés, photos. |
| 📄 Rapports | Le rapport d'analyse d'eau ou la fiche d'ouverture remis au client. |
| 🗺️ Carte interventions **+** | Enchaîner les visites saisonnières d'un même quartier. |
| 🏢 Clients | Particuliers, copropriétés, hôtels : chaque bassin avec son volume et ses équipements. |
| 💰 Devis | Devis de construction ou de rénovation, avec le détail des équipements. |
| 🤖 Assistant devis | Un devis de rénovation dicté au bord du bassin. |
| 🧾 Factures | Factures d'acompte par étape pour un chantier de construction, facture de visite pour l'entretien. |
| 📑 Contrats **+** | L'entretien saisonnier d'un bassin se fait sous contrat. |
| 📊 Comptabilité **+** | Suivre les acomptes par étape d'un chantier de construction. |
| 📦 Produits **+** | Produits de traitement, pompes, liners, robots : un catalogue pour chiffrer. |
| 🗃️ Stock **+** | Produits de traitement et pièces de filtration à avoir dans le véhicule. |
| 🔁 Mouvements stock **+** | Tracer quels produits ont été utilisés dans quel bassin. |
| ⏱️ Temps de travail | Les heures par chantier et par tournée d'entretien. |
| 🚐 Véhicules **+** | Le véhicule de tournée : assurance, kilométrage, entretien. |
| 💬 Messagerie | Le technicien envoie la photo d'un local technique au bureau avant de commander. |
| 🏭 Fournisseurs **+** | Fabricants et négoces de matériel de piscine. |
| ✉️ Bons de commande **+** | Commander pompes, liners et couvertures sur mesure, et suivre la livraison. |
| 👥 Utilisateurs | Créez les comptes de vos techniciens de piscine et réglez ce que chacun voit et peut faire. |
| 🧩 Modules OP | Les modules mis de côté, que vous ouvrez le jour où votre activité en a besoin. |
| ⚙️ Paramètres | Vos sociétés, votre logo et vos en-têtes : la fiche d'ouverture ou d'hivernage part au nom de la bonne entreprise. |

*(**+** = ajoutée au socle pour ce métier)*

**Proposées, décochées (6)**

| Rubrique | Quand la cocher |
|---|---|
| 📈 Statistiques | Pour suivre le chiffre d'affaires entre construction et entretien. |
| 🗄️ Archives mensuelles | Un récapitulatif mensuel à garder. |
| 💳 Télécollecte | Si vous encaissez les dépannages sur place. |
| 🧑‍✈️ Conducteurs | Si plusieurs personnes conduisent les véhicules. |
| 📧 Boîte mail | Pour échanger avec les clients depuis l'application. |
| 📌 Secteurs | Pour répartir les zones entre techniciens. |

**Contenu du pack**

- Types d'intervention (11) : Ouverture de saison · Hivernage · Visite d'entretien · Analyse d'eau · Dépannage pompe ou filtration · Remplacement de liner · Mise en service · Installation de dispositif de sécurité · Construction · Contrat d'entretien saisonnier · Visite technique / devis
- Prestations (9) : Analyse de l'eau · Équilibrage de l'eau · Nettoyage du bassin · Contrôle de la filtration · Contrôle de la pompe · Mise en hivernage · Remise en route · Contrôle du dispositif de sécurité · Remise de la note technique de sécurité
- Relevés (8) : pH · Chlore libre (mg/L) · Chlore total (mg/L) · TAC (°f) · Stabilisant (mg/L) · Température de l'eau (°C) · Pression du filtre (bar) · État de la pompe
- Catégories de produits (8) : Produits de traitement · Électrolyse · Filtration · Pompes · Liners · Robots · Couvertures · Éclairage
- Documents : Rapport d'analyse d'eau · Fiche d'ouverture / d'hivernage · Note technique de sécurité remise à la réception

**À créer**

| Fonction | Valeur | Fonction commune |
|---|---|---|
| Fiche piscine (volume, type de traitement, équipements) dans le parc d'équipements | haute | F2 |
| Tournées saisonnières générées par le contrat (ouverture, entretien, hivernage) | haute | F3 |
| Catégories de produits de piscine | haute | F7 |
| Factures d'acompte par étape de construction | moyenne | F5 |
| Relevé d'analyse avec aide à la dose de produit : à définir avec un professionnel avant de coder | basse |  |

**Obligations (sourcées)**

| Obligation | Fiabilité | Source |
|---|---|---|
| La loi de 2003 impose un dispositif de sécurité aux bassins privés enterrés de plein air. Barrière : NF P90-306 ; alarme : NF P90-307 ; couverture : NF P90-308 ; abri : NF P90-309. | professionnelle, à confirmer | https://www.anil.org/documentation-experte/analyses-juridiques-jurisprudence/analyses-juridiques/analyses-juridiques-2004/reglementation-des-piscines-privees/ |
| Pour une piscine neuve, le constructeur remet une note technique au plus tard à la réception. | officielle, à confirmer | https://questions.assemblee-nationale.fr/dyn/12/questions/QANR5L12QE44882.pdf |

**À vérifier, non écrit comme règle**

- Statut actuel des normes NF P90-306 à 309 : à vérifier sur AFNOR.
- Rien trouvé sur les obligations d'entretien ni d'hivernage.
- Chiffres de marché : source indirecte.

## 4. Les nouveaux métiers, et pourquoi eux

Constat qui change le plan : **neuf de ces dix métiers reposent sur la même fonction** : un parc d'équipements chez le client (extincteurs, ascenseurs, portails, alarmes, adoucisseurs, piscines, bornes, groupes froids), suivi par un contrat d'entretien à échéance fixe, avec un certificat ou un rapport par équipement. Le cahier prévoit déjà le « parc d'appareils » pour le chauffage : on le construit **une seule fois, générique** (F2), avec le rappel d'échéance de contrat (F3). Sans cette brique, chaque nouveau métier serait une copie de plus de la 3D ou du chauffage.

| Rang | Métier | Pourquoi lui | Ce qu'il réutilise | Marché (si connu) |
|:-:|---|---|---|---|
| 1 | 🧯 **Sécurité incendie** | Des centaines de petits appareils par site, vérifiés chaque année, avec un rapport écrit à remettre : sur papier ou sur tableur, chaque tournée coûte du temps. | parc d'équipements (F2) + rappel de contrat (F3) | Chiffre non trouvé. Un CAP « agent vérificateur d'appareils extincteurs » existe, ce qui signale un métier structuré. |
| 2 | ❄️ **Froid commercial / Frigoriste** | Chambres froides, vitrines et groupes de restaurants, commerces alimentaires et laboratoires : des contrats, des fluides à tracer et des contrôles d'étanchéité à dates fixes. | module fluides du chauffage (F11) + parc + rappel | Chiffre non trouvé pour le froid seul. Pour le chauffage et la climatisation : environ 27 400 entreprises artisanales d'eau et de gaz et 15 800 d'équipements thermiques et de climatisation (CAPEB, 2013, hors auto-entrepreneurs : ancien). |
| 3 | 🛗 **Ascenseurs** | Chaque ascenseur a un contrat d'entretien avec une visite toutes les six semaines : le volume de visites récurrentes est le plus élevé de tous les métiers de la liste. | parc d'équipements (F2) + rappel de contrat (F3) | Environ 600 000 appareils, dont la moitié a plus de 25 ans (Fédération des ascenseurs) ; estimations plus anciennes de 420 000 à 570 000 ; 78 227 contrôles quinquennaux réalisés en 2018. |
| 4 | 🚧 **Portes et portails automatiques** | Une maintenance semestrielle à consigner dans un carnet d'entretien : installateur et mainteneur sont souvent la même personne. | parc d'équipements (F2) + rappel de contrat (F3) | Chiffre non trouvé. |
| 5 | 🧹 **Ramonage** | Chaque client revient une ou deux fois par an, la tournée est saisonnière et géographique, et le certificat de ramonage est le document que tout client réclame. Des artisans en entreprise individuelle qui n'ont aujourd'hui aucun outil. | certificat / bordereau PDF (F12) + tournée saisonnière | Chiffre non trouvé : aucune source n'indique le nombre d'entreprises. |
| 6 | 🚛 **Assainissement / Vidange** | Un métier de camions et de volumes, avec un bordereau de suivi à chaque vidange : du papier que le logiciel remplace directement. Très différent des autres, à ne fusionner avec aucun pack. | certificat / bordereau PDF (F12) + tournée saisonnière | Chiffre non trouvé. Les entreprises agréées sont listées par préfecture, il n'y a pas de total national. |
| 7 | ☀️ **Photovoltaïque et bornes de recharge** | Chaque installation devient un parc à surveiller (onduleurs, bornes) et un contrat de maintenance ; la maintenance de bornes exige une qualification propre. | parc d'équipements (F2) + rappel de contrat (F3) | Près de 5 000 installateurs qualifiés QualiPV en mars 2025, soit 75 % des RGE du photovoltaïque (chiffre de l'organisme lui-même). Plus de 169 000 points de recharge ouverts au public en juin 2025 selon un acteur du secteur, à vérifier chez l'Avere. |
| 8 | 📹 **Alarme, vidéosurveillance, contrôle d’accès** | Chaque installation devient un contrat de maintenance annuel avec visites, les pannes arrivent en dépannage, et il faut tenir un historique de matériel par site (centrale, détecteurs, caméras). | parc d'équipements (F2) + rappel de contrat (F3) | Chiffre non trouvé : les résultats sont des offres commerciales. |
| 9 | 💧 **Traitement de l’eau** | Adoucisseurs, filtres, osmoseurs : des visites récurrentes avec des consommables (sel, résines, cartouches) et des analyses. Peut aussi absorber le suivi des légionelles. | parc d'équipements (F2) + rappel de contrat (F3) | Chiffre non trouvé. |
| 10 | 🏊 **Pisciniste** | Un mélange de chantier (construction) et de contrat d'entretien saisonnier : ouverture de saison, hivernage, analyse d'eau, remplacement de pompes. | parc d'équipements (F2) + rappel de contrat (F3) | Environ 2 400 entreprises et 2,8 Md€ de chiffre d'affaires en 2024, avec 94 480 piscines installées, d'après un site de modèles de business plan qui cite la FPP sans source directe : à vérifier. Historique FPP : 5 200 entreprises dont 2 800 de construction en 2008, 1,8 Md€ en 2016. |

Critères du classement : besoin de suivi récurrent, clarté de la réglementation, gain sur le papier, réemploi des briques déjà prévues. Les rangs 1 à 8 sont ceux de la recherche ; piscine et traitement de l'eau (9, 10) sont « à envisager ensuite ».

**Ordre de construction suggéré :** le parc générique et le rappel de contrat d'abord (ils débloquent sécurité incendie, ascenseurs, portes et portails, énergies, alarme, eau, piscine), puis le module fluides (froid commercial, avec le chauffage), puis les certificats PDF (ramonage, assainissement).

### Examinés et non retenus comme métiers à part

| Candidat | Verdict | Pourquoi |
|---|---|---|
| Désinfection / hygiène | fusionné dans la 3D | Désinsectisation, dératisation et désinfection sont déjà le cœur du pack 3D ; deux types ont été ajoutés à la 3D (Désinfection de locaux, Audit hygiène). |
| Vitrerie / miroiterie | fusionné dans la menuiserie | Même chantier : prise de cotes, pose, dépannage urgent. Deux types ajoutés à la menuiserie ; le pack nettoyage garde son type « Vitrerie » (nettoyage de vitres). |
| Élagage | fusionné dans le paysagiste | Même clientèle, mêmes véhicules, mêmes tournées ; variante « arboriste » avec abattage, taille de haute tige, hauteur et nacelle. |
| Désamiantage | écarté | Chantier réglementé lourd, pas du suivi de parc. Pas de recherche approfondie. |
| Diagnostic immobilier | écarté pour l’instant, faible priorité | Un rapport normalisé par mission, sans parc, sans contrat, sans stock ; marché en baisse (73 % des professionnels ont perdu du chiffre d'affaires en 2023-2024, d'après un article citant la Cour des comptes). Un autre produit. (https://www.dalloz-actualite.fr/document/c-comptes-communique-de-presse-3-juin-2025) |
| Maintenance informatique | écarté | Le travail se fait à distance et par tickets, pas sur le terrain : mauvais ajustement avec OP GESTION. |
| Dépannage d’électroménager | à envisager ensuite | Pas de réglementation lourde ni de parc suivi ; proche du multiservices. Le seul besoin fort est le stock de pièces et le suivi de garantie. |
| Dégraissage de hottes, vérifications d’appareils de levage, maintenance de cuisines professionnelles | pistes non recherchées | Citées de mémoire seulement : à vérifier avant tout travail. |

## 5. Les fonctions à créer, une fois pour plusieurs métiers

| Réf. | Fonction | Ce que c'est | Valeur | Métiers |
|---|---|---|---|---|
| F0 | **Retirer l'anti-nuisibles de tous les autres métiers** | « Nuisibles ciblés » et « Méthodes » du formulaire d'intervention, l'étape « Constat » de la clôture guidée, la colonne CSV « Nuisibles », la carte « Dossier sanitaire », les champs Certibiocide des techniciens, N° AMM / matière active / type de traitement du formulaire produit, et les rubriques Consommation produits et Enveloppes. Prérequis de tout le reste (carte des métiers, §0 et §5). | haute | tous les métiers non 3D |
| F1 | **Stock du véhicule** | Un lieu de stockage par camionnette, réapprovisionnement depuis le dépôt, inventaire rapide. Le Stockage à identifiant fixe existe déjà et sait faire des mouvements « qui prend quoi ». | haute | plomberie, electricite, chauffage, serrurerie, froid |
| F2 | **Parc d'équipements du client** | Une fiche équipement rattachée au client et à son site (type, marque, modèle, n° de série, emplacement, mise en service, caractéristiques propres au métier), son historique d'interventions, son prochain contrôle, un code QR à coller dessus. Construit une seule fois, de façon générique : c'est la brique qui débloque presque tous les nouveaux métiers. | haute | plomberie, electricite, chauffage, serrurerie, paysagiste, incendie, froid, ascenseurs, portails, ramonage, energies, alarme, eau, piscine |
| F3 | **Rappel d'échéance de contrat** | Relance du client avant l'échéance, proposition de créneau, création de l'intervention. Aujourd'hui la rubrique Contrats n'a aucun rappel annuel : cette lacune bloque tous les métiers à contrat d'entretien. | haute | chauffage, paysagiste, couverture, multiservices, incendie, froid, ascenseurs, portails, ramonage, energies, alarme, eau, piscine |
| F4 | **Procès-verbal de réception** | Document de fin de chantier avec réserves et levée des réserves, signé sur place. | moyenne | maconnerie, menuiserie, peinture, couverture |
| F5 | **Fiche chantier avec avancement et situations de travaux** | Suivi d'un chantier long par lot, avec facturation par étapes. | moyenne | maconnerie, piscine |
| F6 | **Alertes d'échéance de qualification** | Certibiocide, Certiphyto, habilitation électrique, attestation de capacité fluides, formation amiante, IRVE : une échéance par technicien, et un blocage d'affectation quand le technicien n'est plus à jour. | moyenne | 3d, electricite, chauffage, maconnerie, paysagiste, couverture, froid, ascenseurs, assainissement, energies |
| F7 | **Catégories de produits par métier** | Un champ de catégories par métier lu par le formulaire produit à la place des huit catégories anti-nuisibles, et le formulaire produit adapté (N° AMM seulement en 3D). Rien ne s'écrit seul : les catégories proposées ne créent aucun produit. | haute | plomberie, electricite, chauffage, serrurerie, nettoyage, maconnerie, menuiserie, peinture, paysagiste, couverture, multiservices, autre, incendie, froid, ascenseurs, portails, ramonage, assainissement, energies, alarme, eau, piscine |
| F8 | **Devis de dépannage** | Devis avec les mentions de l'arrêté du 24 janvier 2017, case « pièces remplacées conservées » et affichage du taux horaire à la création de l'intervention. | haute | plomberie, electricite, chauffage, serrurerie, multiservices |
| F9 | **Garde « mise en sécurité obligatoire »** | Case bloquante avant de démarrer une intervention à risque (toiture, électricité sous tension). | moyenne | electricite, couverture |
| F10 | **Pièces jointes réglementaires par produit** | Fiche de données de sécurité par produit, avec sa date de mise à jour. | moyenne | 3d, nettoyage |
| F11 | **Module fluides frigorigènes** | Charge, récupération, tonnage équivalent CO₂, périodicité du contrôle d'étanchéité, n° de bordereau, verrou sur le n° d'attestation de capacité du technicien. Partagé par le chauffage / climatisation et le froid commercial. Il reprend les rubriques du Cerfa 15497*04 sans prétendre le remplacer. | haute | chauffage, froid |
| F12 | **Certificats et rapports PDF par intervention ou par équipement** | Attestation d'entretien, certificat de ramonage, bordereau de vidange, rapport de vérification : un PDF par équipement, pré-rempli du parc et des relevés. Aucun ne se dit officiel tant que le modèle n'est pas reproduit à l'identique. | haute | chauffage, incendie, ascenseurs, ramonage, assainissement |
| F13 | **Registre générique** | Rendre la rubrique Registre utilisable hors anti-nuisibles (registre de sécurité, registre des vidanges, registre d'équipements, carnet sanitaire) avec un libellé par métier. | moyenne | 3d, incendie, assainissement, eau |

## 6. Points à trancher (Justin)

1. **L'assistant devis est ouvert d'office à tous les métiers.** Il envoie le nom, l'adresse et la ville des clients à Anthropic (voir `sous-traitance.html`). Je l'ai gardé dans le socle parce que dicter un devis sur place sert tous les métiers, et sa description le dit en clair. Alternative : le proposer décoché, le client le coche en connaissance de cause. Je recommande de le **proposer décoché** si tu veux que ce consentement soit un geste.
2. **Les trois fusions** : vitrerie dans la menuiserie, élagage dans le paysagiste, désinfection dans la 3D. Les types correspondants sont ajoutés. Dis-moi si l'un doit devenir un pack à part.
3. **Les six rubriques de la 3D restent fermées aux autres.** Seule hésitation : « Enveloppes » (encaissements en espèces et chèques remis au bureau), que la recherche réservait à la 3D mais qui pourrait servir un plombier ou un serrurier qui encaisse sur place. Aujourd'hui ceux-là ont la Télécollecte ; je n'ai pas ouvert Enveloppes.
4. **Règle de la comptabilité** : cochée d'office là où l'on encaisse sur place ou par acomptes, proposée ailleurs. C'est un jugement, pas un fait sourcé : à confirmer.
5. **Le registre** : le rendre générique (un libellé par métier : registre de sécurité, des vidanges, d'équipements, carnet sanitaire) ou donner à chaque métier sa propre rubrique ? Tant que ce n'est pas tranché, il reste proposé avec une étoile aux cinq métiers qui en tiennent un.
6. **Le nom du circuit d'achats** : les descriptions écrivent « le responsable valide » et non « le DR », en prévision du passage de « Validations DR » à « Validation des mouvements ».
7. **Alarme et vidéosurveillance** : les codes d'accès d'une installation ne doivent pas être rangés dans l'application sans protection. Je n'ai prévu aucun champ « codes » ; à décider avant d'en prévoir un.
8. **Les catégories de produits des métiers non-3D sont des propositions**, tirées de la recherche (ou, pour le chauffage, de la carte du code) : seule la 3D a un catalogue dans le code. Tu peux les ajuster métier par métier avant qu'elles soient codées. Rien ne s'écrit seul : elles ne créent aucun produit.
9. **Le site promet des catégories que le formulaire ne propose pas** (raccords, disjoncteurs, filtres). À corriger avec F7, et à ne pas laisser sortir avant ; les pages métiers du site (5 sur 13 aujourd'hui) sont à refaire pour les 23.
10. **Listes fermées à étendre** pour les 10 nouveaux métiers : `METIERS_OK` côté serveur, `METIERS_ORDRE` côté application, les puces de `creer.html`, la page Métiers, `tests/test-835.js` (qui ne compare aujourd'hui que des clés et des compteurs, pas le contenu des promesses).
11. **Le type « Ramonage » existe déjà dans le chauffage** et devient aussi un métier. Je l'ai laissé dans le chauffage (rien n'est retiré).
12. **Ordre de construction** : je propose F0 (retirer l'anti-nuisibles des autres) et F7 (catégories de produits) en premier, puis F2 et F3 (parc et rappel), puis le chauffage complet (F11, F12), puis les métiers un par un.

## 7. Limites de ce qui est écrit ici

- Légifrance et le ministère de la Transition écologique n'ont pas pu être lus directement (503 ou 403) : le contenu de l'attestation chaudière vient du résumé de l'INERIS, celui de l'attestation PAC / climatisation n'a pas pu être lu.
- Plusieurs sources sont des assureurs, des sites d'information ou des documents préfectoraux locaux : elles sont marquées *secondaire* et « à confirmer ». Les obligations de l'assainissement viennent d'arrêtés préfectoraux de deux départements.
- Les chiffres de marché fiables sont rares : seuls l'énergie, les ascenseurs et la piscine en ont un sourcé (et celui de la piscine passe par un site de business plan). Aucun chiffre n'a été inventé.
- Les raisons « pourquoi pour ce métier » sont rédigées d'après le travail réel du métier décrit par les recherches ; elles ne sont pas des affirmations réglementaires, sauf quand elles renvoient à une obligation sourcée du même bloc.
- Les unités de quelques relevés nouveaux (force de fermeture en N, dureté en TH, chlore en mg/L, dureté, pression de gaz en mbar) sont celles d'usage et n'ont pas été vérifiées dans un texte.

