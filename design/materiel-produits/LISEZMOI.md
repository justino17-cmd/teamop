# Matériel & produits — le rangement par métier

Référence du prototype (`apercu/prototype-op-gestion.html`, rubrique « Matériel & produits »). Recherche du 6 novembre 2026.

**La règle, posée par Justin le 6 novembre 2026** : chaque entreprise ajoute elle-même ses articles ; les CATÉGORIES (les filtres où chaque article se range) sont fixées par TEAM OP, les mêmes pour tous les clients d'un métier. L'application range seule ce qu'on tape (mots-clés et racines des exemples), et un choix fait à la main n'est jamais écrasé.

- 24 métiers, 285 catégories, 5056 produits typiques (`packs.json`, champ `exemples`).
- Rangement automatique éprouvé « un exemple retiré, rangé par les autres » : **91 %** des produits typiques retombent dans leur catégorie (4 585 sur 5 056).
- Type d'une catégorie : **produit** (vendu ou consommé chez le client, part dans un devis), **matériel** (outillage de l'équipe : suivi, jamais facturé), **les deux**.
- ⚠️ La recherche s'est faite surtout de CONNAISSANCE DU MÉTIER : la plupart des catalogues de distributeurs refusent la lecture automatique (403/503). Les sources réellement lues sont listées par métier. À relire avant d'entrer dans l'application réelle.
- ⚠️ Rien de ceci ne change encore `app.html` ni les listes `produits` de `METIERS` : c'est le prototype.

## Sommaire

- 🐀 [3D — Hygiène anti-nuisibles](#3d) — 11 catégories
- 🔧 [Plomberie](#plomberie) — 12 catégories
- ⚡ [Électricité](#electricite) — 13 catégories
- 🔥 [Chauffage](#chauffage) — 11 catégories
- ❄️ [Climatisation / Pompes à chaleur](#climatisation) — 10 catégories
- 🔑 [Serrurerie](#serrurerie) — 12 catégories
- 🧽 [Nettoyage / Propreté](#nettoyage) — 13 catégories
- 🧱 [Maçonnerie / Gros œuvre](#maconnerie) — 13 catégories
- 🚪 [Menuiserie](#menuiserie) — 13 catégories
- 🖌️ [Peinture / Revêtements](#peinture) — 12 catégories
- 🌿 [Paysagiste / Espaces verts](#paysagiste) — 12 catégories
- 🏠 [Couverture / Zinguerie](#couverture) — 13 catégories
- 🛠️ [Multiservices / Maintenance](#multiservices) — 14 catégories
- 🧰 [Autre métier de terrain](#autre) — 8 catégories
- 🧯 [Sécurité incendie](#incendie) — 12 catégories
- ❄️ [Froid commercial / Frigoriste](#froid) — 11 catégories
- 🛗 [Ascenseurs](#ascenseurs) — 12 catégories
- 🚧 [Portes et portails automatiques](#portails) — 12 catégories
- 🧹 [Ramonage](#ramonage) — 11 catégories
- 🚛 [Assainissement / Vidange](#assainissement) — 12 catégories
- ☀️ [Photovoltaïque et bornes de recharge](#energies) — 12 catégories
- 📹 [Alarme, vidéosurveillance, contrôle d’accès](#alarme) — 12 catégories
- 💧 [Traitement de l’eau](#eau) — 12 catégories
- 🏊 [Pisciniste](#piscine) — 12 catégories

<a id="3d"></a>
## 🐀 3D — Hygiène anti-nuisibles

Avant : TP18 — Insecticide · TP14 — Rodenticide · Xylophage · Piégeage · Matériel · EPI · Proofing · Désinfection

Ce qui change : TP18/TP14/Xylophage/Désinfection conservés (renommés TP8, TP2/TP3) ; Piégeage scindé en Piégeage et Postes d'appâtage ; Matériel éclaté en Détection et Application ; ajout de Consommables. Sources 3D non lues (sites fermés/hors sujet) : catégories issues de la réglementation biocide et du métier.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **TP14 - Rodenticides** | produit | Appâts et formulations raticides/souricides (anticoagulants et autres), à tracer par type de produit biocide. | Bloc paraffiné raticide (kg), Appât céréales rat (kg), Appât pâte souris (kg), Grain raticide (kg), Appât sachet rat (u), Bloc appât souris (kg) … (14) |
| **TP18 - Insecticides** | produit | Insecticides professionnels (rampants, volants, punaises, cafards) : concentrés, aérosols, gels, poudres. | Concentré insecticide pyréthrinoïde (L), Insecticide résiduel micro-encapsulé (L), Gel appât cafards (u), Gel appât fourmis (u), Aérosol insecticide volants (u), Aérosol anti-punaises de lit (u) … (15) |
| **TP8 - Xylophages et termites** | produit | Traitements du bois et lutte contre termites, capricornes, vrillettes : insecticides-fongicides, stations d'appâtage. | Xylophène curatif (L), Insecticide bois injectable (L), Traitement préventif charpente (L), Fongicide bois (L), Station appât termites (u), Cartouche appât termites (u) … (14) |
| **TP2/TP3 - Désinfection et hygiène** | produit | Désinfectants de surface, d'air et hygiène vétérinaire/alimentaire, nettoyants de remise en état. | Désinfectant de surface virucide (L), Désinfectant bactéricide fongicide (L), Désinfectant alimentaire (L), Bactéricide fumigène (u), Nettoyant dégraissant alcalin (L), Détergent désinfectant (L) … (14) |
| **Piégeage et capture** | les deux | Pièges mécaniques, colles et capture : rongeurs, insectes volants et rampants, oiseaux. | Piège à rats cage (u), Piège à souris multi-captures (u), Tapette à rat (u), Tapette à souris (u), Plaque de glu rongeurs (u), Plaque de glu insectes (u) … (15) |
| **Postes d'appâtage et box** | les deux | Boîtes et postes sécurisés (rongeurs, insectes), supports et accessoires de pose. | Box à rats sécurisé (u), Box à souris sécurisé (u), Poste d'appâtage en plastique (u), Poste d'appâtage en métal (u), Poste anti-effraction (u), Box carton jetable (u) … (14) |
| **Proofing et prévention** | produit | Obturation et protection des accès : grilles, laine d'acier, mousses, filets, répulsifs. | Laine d'acier (u), Mousse expansive anti-rongeurs (u), Grille d'aération anti-rats (u), Brosse de porte anti-rongeurs (m), Filet anti-pigeons (m²), Pics anti-pigeons (m) … (15) |
| **Détection et surveillance** | matériel | Matériel de repérage et de suivi de l'activité : lampes, caméras, moniteurs, thermomètres. | Lampe torche haute puissance (u), Lampe UV de détection urine (u), Caméra d'inspection (u), Endoscope (u), Détecteur d'humidité du bois (u), Détecteur de termites acoustique (u) … (15) |
| **Application et traitement (matériel)** | matériel | Pulvérisateurs, nébuliseurs, poudreurs et accessoires d'application des produits. | Pulvérisateur à pression 5 L (u), Pulvérisateur 10 L (u), Thermonébuliseur (u), Nébuliseur ULV (u), Poudreur manuel (u), Pistolet à gel (u) … (16) |
| **EPI et sécurité** | matériel | Équipements de protection individuelle pour manipuler biocides et intervenir en milieu souillé. | Combinaison jetable type 5/6 (u), Gants nitrile (lot), Gants de manutention (u), Masque FFP3 (u), Demi-masque filtre A2P3 (u), Cartouche de filtre (u) … (16) |
| **Consommables et hygiène d'atelier** | les deux | Sacs, étiquettes, contenants et consommables d'intervention et de traçabilité. | Sac poubelle 100 L (lot), Sac à déchets dangereux (lot), Bidon de stockage (u), Étiquette biocide (lot), Bande de signalisation (u), Panneau d'interdiction (u) … (14) |

Règles de rangement :

- Un produit biocide va dans sa catégorie réglementaire (TP14, TP18, TP8, TP2/TP3) selon sa fiche, pas selon la cible ; en cas de doute, la mention TP de l'étiquette décide.
- Un appât insecticide en gel va dans TP18, un appât raticide dans TP14, même s'il est vendu en poste.
- Une box ou un poste vide va dans Postes d'appâtage ; l'appât qu'on y met va dans TP14.
- Une lampe UV destruction d'insectes est du Piégeage ; une lampe UV de détection est de la Détection.
- Un pulvérisateur va dans Application, même vendu avec un produit.
- Mots ambigus : 'uv', 'lampe', 'gel', 'appat' - ranger d'abord par le contexte (lampe-uv + insecte = piégeage).

Sources lues : https://climalife.com/fr, https://www.richardson.fr

<a id="plomberie"></a>
## 🔧 Plomberie

Avant : Raccords et fittings · Tubes (cuivre, PER, multicouche, PVC) · Robinetterie et mitigeurs · Flexibles et alimentation · Joints, filasse, pâtes · Sanitaire (WC, vasques) · Chauffe-eau et groupes de sécurité · Évacuation et siphons · Débouchage et curage (produits, furets) · Outillage consommable · EPI

Ce qui change : Catégories actuelles conservées pour l'essentiel ; ajout de Traitement de l'eau, Mesure et détection ; Outillage consommable scindé en Outillage / EPI et consommables.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Tubes et tuyaux** | produit | Tubes d'alimentation et d'évacuation, toutes matières. | Tube cuivre écroui 14/16 (m), Tube cuivre recuit couronne (m), Tube PER nu (m), Tube PER gaine (m), Tube multicouche (m), Tube PVC évacuation Ø100 (m) … (15) |
| **Raccords et fittings** | produit | Raccords de toute technologie : sertir, à visser, à glissement, soudure, laiton, PVC. | Coude cuivre à souder (u), Té cuivre à souder (u), Manchon à sertir (u), Coude à sertir (u), Raccord à glissement PER (u), Raccord multicouche (u) … (16) |
| **Robinetterie et mitigeurs** | produit | Robinets, mitigeurs, vannes et robinets d'arrêt. | Mitigeur lavabo (u), Mitigeur évier (u), Mitigeur thermostatique douche (u), Mitigeur bain-douche (u), Robinet d'arrêt (u), Robinet à tournant sphérique (u) … (16) |
| **Flexibles et accessoires** | produit | Flexibles de raccordement, joints, filasse, pâtes d'étanchéité et petites fournitures. | Flexible inox 3/8 (u), Flexible douche (u), Flexible machine à laver (u), Flexible gaz (u), Joint fibre (lot), Joint caoutchouc (lot) … (16) |
| **Sanitaire et appareils** | produit | Appareils sanitaires et leurs pièces : WC, lavabos, receveurs, meubles. | Pack WC (u), Cuvette suspendue (u), Bâti-support WC (u), Abattant WC (u), Réservoir de chasse (u), Mécanisme de chasse (u) … (16) |
| **Évacuation et siphons** | produit | Siphons, bondes, évacuations et pièces d'assainissement. | Siphon lavabo (u), Siphon évier (u), Bonde de douche (u), Bonde de baignoire (u), Siphon de sol (u), Caniveau de douche (u) … (15) |
| **Chauffe-eau et production ECS** | produit | Ballons, chauffe-eau, groupes de sécurité et accessoires. | Chauffe-eau électrique 100 L (u), Chauffe-eau 200 L (u), Chauffe-eau thermodynamique (u), Chauffe-eau instantané (u), Groupe de sécurité (u), Réducteur de pression (u) … (14) |
| **Traitement de l'eau** | produit | Filtres, adoucisseurs, anti-calcaire, réducteurs de pression, désembouage sanitaire. | Adoucisseur d'eau (u), Filtre à sédiments (u), Cartouche filtrante (u), Poste de filtration (u), Sel régénérant (kg), Anti-calcaire (u) … (14) |
| **Débouchage et curage** | les deux | Produits et outils pour déboucher et curer les canalisations. | Furet manuel (m), Furet électrique (u), Déboucheur gel (L), Déboucheur à pompe (u), Ventouse (u), Câble de curage (m) … (14) |
| **Outillage de plombier** | matériel | Outillage à main et électroportatif spécifique plomberie, jamais refacturé. | Pince multiprise (u), Clé à molette (u), Clé à griffe (u), Coupe-tube (u), Cintreuse (u), Chalumeau (u) … (15) |
| **Mesure, détection et contrôle** | matériel | Appareils de contrôle : fuites, pression, température, caméra. | Manomètre de test (u), Détecteur de fuite acoustique (u), Caméra thermique (u), Thermomètre de contact (u), Caméra d'inspection (u), Détecteur de gaz (u) … (12) |
| **EPI et consommables d'atelier** | matériel | Protection individuelle et consommables d'intervention. | Gants de manutention (u), Lunettes de protection (u), Genouillères (u), Chaussures de sécurité (u), Casque anti-bruit (u), Masque FFP2 (u) … (15) |

Règles de rangement :

- Un raccord à sertir va dans Raccords, même en cuivre ; un tube nu va dans Tubes.
- Un flexible de douche ou de lavabo va dans Flexibles ; une douchette seule dans Robinetterie.
- Une résistance ou un groupe de sécurité de chauffe-eau va dans Chauffe-eau, pas en Raccords.
- Un siphon de lavabo est en Évacuation, un siphon de WC (pipe/manchette) aussi.
- Un déboucheur chimique est Débouchage, une caméra d'inspection de canalisation aussi (la même caméra existe en Mesure : retenir le contexte).
- Mots ambigus : 'vanne', 'filtre', 'joint', 'camera', 'manometre' - revoir par contexte (manometre isolé = Mesure).

Sources lues : https://www.richardson.fr

<a id="electricite"></a>
## ⚡ Électricité

Avant : Protection (disjoncteurs, différentiels) · Appareillage (prises, interrupteurs) · Câbles et fils · Gaines et goulottes · Éclairage · Tableaux et coffrets · Bornes de recharge · Chauffage électrique · Domotique et interphonie · Outillage consommable · EPI

Ce qui change : Les 11 catégories actuelles sont conservées dans l'esprit mais 'Bornes de recharge' devient 'Bornes de recharge et comptage', 'Gaines et goulottes' devient 'Cheminement', 'Domotique et interphonie' inclut les courants faibles/VDI, et sont ajoutées Connexions et petit matériel, Chauffage et ventilation, Outillage, Mesure et contrôle (matériel). EPI est fusionné avec les consommables de chantier.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Protection et différentiels** | produit | Disjoncteurs, interrupteurs différentiels, parafoudres, contacteurs et tout ce qui protège un circuit. | Disjoncteur 2 A courbe C (u), Disjoncteur 10 A courbe C (u), Disjoncteur 16 A courbe C (u), Disjoncteur 20 A courbe C (u), Disjoncteur 32 A courbe C (u), Disjoncteur de branchement 45 A (u) … (20) |
| **Tableaux et coffrets** | produit | Tableaux électriques, coffrets, platines, borniers, peignes et accessoires de répartition. | Coffret 1 rangée 13 modules (u), Coffret 2 rangées 26 modules (u), Coffret 3 rangées 39 modules (u), Coffret 4 rangées 52 modules (u), Tableau électrique pré-équipé (u), Tableau de communication (grade 1/2/3) (u) … (20) |
| **Appareillage (prises, interrupteurs)** | produit | Prises, interrupteurs, va-et-vient, variateurs, plaques, boîtes d'encastrement et appareillage courant faible. | Prise 2P+T 16 A (u), Prise 2P+T 20 A spécialisée (u), Prise RJ45 grade 3 (u), Prise TV/FM (u), Prise USB murale (u), Interrupteur simple allumage (u) … (23) |
| **Câbles et fils** | produit | Câbles et conducteurs d'énergie, de terre et de signal, à la coupe ou en couronne. | Fil H07V-U 1,5 mm² rigide (m), Fil H07V-U 2,5 mm² rigide (m), Fil H07V-R 6 mm² (m), Fil H07V-K 10 mm² (m), Fil de terre vert/jaune 16 mm² (m), Câble U1000 R2V 3G1,5 (m) … (22) |
| **Cheminement (gaines, goulottes, conduits)** | produit | Gaines ICTA, tubes, goulottes, moulures, chemins de câbles et supports de fixation. | Gaine ICTA 20 mm (m), Gaine ICTA 25 mm (m), Gaine TPC 63 mm enterrée (m), Tube IRL 16 mm (m), Tube IRL 20 mm (m), Tube IRL 25 mm (m) … (26) |
| **Connexions et petit matériel** | produit | Bornes, dominos, cosses, manchons, gaines thermorétractables et accessoires de raccordement. | Borne de raccordement automatique 2 entrées (lot), Borne de raccordement automatique 5 entrées (lot), Borne à levier 3 entrées (lot), Domino (lot), Domino 10 mm² (lot), Cosse à sertir ronde (sachet) … (26) |
| **Éclairage et luminaires** | produit | Luminaires, lampes, ampoules, projecteurs, éclairage de sécurité et détecteurs de mouvement. | Spot LED encastrable (u), Dalle LED 600x600 (u), Réglette LED 120 cm (u), Tube LED T8 (u), Ampoule LED E27 (u), Ampoule LED GU10 (u) … (24) |
| **Chauffage et ventilation électriques** | produit | Radiateurs, panneaux rayonnants, sèche-serviettes, planchers chauffants, chauffe-eau et VMC. | Radiateur à inertie 1500 W (u), Radiateur à inertie 2000 W (u), Panneau rayonnant 1000 W (u), Convecteur électrique (u), Sèche-serviettes électrique (u), Plancher chauffant électrique câble (m) … (21) |
| **Domotique, interphonie et courants faibles** | produit | Interphones, visiophones, sonnettes, thermostats connectés, objets connectés et réseaux VDI. | Visiophone (u), Interphone audio (u), Platine de rue (u), Sonnette filaire (u), Sonnette sans fil (u), Gâche électrique (u) … (24) |
| **Bornes de recharge et comptage** | produit | Bornes de recharge de véhicule électrique, prises renforcées, compteurs divisionnaires et protections dédiées. | Prise renforcée Green'Up type (u), Borne de recharge murale 7 kW (u), Borne de recharge 11 kW triphasée (u), Câble de recharge type 2 (u), Support de câble de recharge (u), Protection dédiée borne (disjoncteur + différentiel type B) (u) … (15) |
| **Outillage électrique à main** | matériel | Outils à main isolés et de câblage utilisés par l'équipe (non facturés). | Pince à dénuder (u), Pince coupante (u), Pince à sertir (u), Tournevis isolés 1000 V (jeu) (lot), Pince multiprise (u), Pince plate (u) … (25) |
| **Appareils de mesure et de contrôle** | matériel | Appareils pour vérifier, mesurer et consigner une installation (non facturés, étalonnés). | Multimètre (u), Pince ampèremétrique (u), Testeur de continuité (u), Contrôleur d'installation (isolement, boucle) (u), Mesureur de terre (u), Contrôleur de différentiel (u) … (18) |
| **EPI et consommables de chantier** | matériel | Équipements de protection individuelle, de consignation et petits consommables d'atelier. | Gants isolants classe 0 (paire), Gants de manutention (paire), Lunettes de protection (u), Casque de chantier (u), Écran facial (u), Tapis isolant (u) … (24) |

Règles de rangement :

- Une 'Protection dédiée borne' (différentiel type B) va dans Protection et différentiels, la borne elle-même dans Bornes de recharge et comptage : ranger sur le mot 'borne' + 'recharge' ou 'irve' avant 'disjonct'.
- Mots ambigus : 'cable' (Câbles et fils / Bornes de recharge / Courants faibles : un 'cable rj45' va en Câbles, un 'cordon rj45' en Domotique et courants faibles), 'prise' (Appareillage / Outillage 'multiprise'), 'detecteur' (Éclairage 'detecteur de mouvement' / Domotique 'daaf'), 'compteur' (Bornes / Appareillage), 'coffret' (Tableaux / Connexions 'boite').
- 'Fusible', 'sectionneur' et 'contacteur' vont en Protection ; 'minuterie' et 'telerupteur' aussi (commande modulaire).
- Évaluer le matériel (type 'materiel') sur le mot de départ : 'pince', 'tournevis', 'multimetre', 'gants', 'casque' ; 'pince amperemetrique' => Mesure, pas Outillage.
- Un article contenant 'led' va en Éclairage sauf 'alimentation'/'driver' seuls qui restent en Éclairage également.
- Le chauffe-eau et la VMC sont rangés en Chauffage et ventilation électriques même s'ils relèvent aussi du plombier/chauffagiste.

Sources lues : https://www.sonepar.fr/ (10 familles lues : distribution d'énergie, éclairage, fils et câbles, appareillage, sécurité/accès/communication, génie climatique, conduits et cheminement, outillage, production d'énergie et e-mobilité), https://www.rexel.fr (page d'accueil seule lisible, sans rayons), https://hager.com/fr (non lu : redirection)

<a id="chauffage"></a>
## 🔥 Chauffage

Avant : Pièces de chaudière (brûleurs, électrodes, thermocouples, vannes gaz) · Filtres et cartouches · Radiateurs et robinets thermostatiques · Circulateurs et vases d'expansion · Produits de désembouage et de traitement de l'eau · Conduits et fumisterie · Régulation et thermostats · Outillage consommable · EPI

Ce qui change : Filtres et cartouches retirés (déplacés vers Désembouage/Hydraulique) ; ajout de Chaudières, Production d'eau chaude et solaire, Mesure et analyse de combustion.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Chaudières et générateurs** | produit | Chaudières gaz, fioul, granulés, murales ou au sol, et brûleurs. | Chaudière gaz condensation murale (u), Chaudière au sol (u), Chaudière fioul (u), Chaudière granulés (u), Brûleur fioul (u), Brûleur gaz (u) … (14) |
| **Pièces détachées chaudière** | produit | Pièces de remplacement et d'entretien : électrodes, thermocouples, vannes gaz, sondes. | Électrode d'allumage (u), Électrode d'ionisation (u), Thermocouple (u), Vanne gaz (u), Sonde de température (u), Pressostat (u) … (16) |
| **Circulateurs et hydraulique** | produit | Circulateurs, vannes, vases d'expansion, organes hydrauliques. | Circulateur classe A (u), Circulateur à vitesse variable (u), Vase d'expansion 18 L (u), Vanne 3 voies (u), Vanne mélangeuse (u), Clapet anti-retour (u) … (15) |
| **Radiateurs et émetteurs** | produit | Radiateurs, sèche-serviettes, planchers chauffants et leurs robinets. | Radiateur acier (u), Radiateur fonte (u), Radiateur aluminium (u), Sèche-serviettes eau chaude (u), Sèche-serviettes électrique (u), Robinet thermostatique (u) … (15) |
| **Désembouage et traitement de l'eau** | produit | Produits de nettoyage et protection des circuits de chauffage. | Désembouant (L), Inhibiteur de corrosion (L), Filtre magnétique (u), Protecteur antigel (L), Neutralisant acide (L), Anti-tartre (L) … (14) |
| **Conduits et fumisterie** | produit | Évacuation des fumées et ventouses : tubage, ventouses, conduits. | Conduit concentrique (u), Conduit PPS (u), Conduit inox double paroi (u), Coude fumisterie (u), Terminal ventouse (u), Té de purge (u) … (14) |
| **Régulation et thermostats** | produit | Thermostats, sondes, programmateurs, régulation connectée. | Thermostat d'ambiance filaire (u), Thermostat sans fil (u), Thermostat connecté (u), Sonde extérieure (u), Régulateur de chauffage (u), Programmateur (u) … (14) |
| **Production d'eau chaude et solaire** | produit | Ballons, chauffe-eau et composants thermique/solaire. | Ballon d'eau chaude (u), Ballon solaire (u), Capteur solaire (u), Station solaire (u), Fluide solaire (L), Groupe de sécurité solaire (u) … (12) |
| **Outillage de chauffagiste** | matériel | Outils spécifiques chauffage. | Clé à molette (u), Clé à griffe (u), Pince multiprise (u), Cintreuse (u), Coupe-tube (u), Pompe à épreuve (u) … (14) |
| **Mesure et analyse de combustion** | matériel | Appareils de contrôle : combustion, pression, température, fuites. | Analyseur de combustion (u), Détecteur de CO (u), Manomètre différentiel (u), Thermomètre (u), Détecteur de fuite gaz (u), Pince ampèremétrique (u) … (12) |
| **EPI et consommables** | matériel | EPI et consommables d'atelier. | Gants (lot), Lunettes (u), Masque FFP2 (u), Chaussures de sécurité (u), Genouillères (u), Joints fibre (lot) … (14) |

Règles de rangement :

- Un robinet thermostatique va dans Radiateurs, un thermostat d'ambiance dans Régulation.
- Une pièce propre à une chaudière va en Pièces détachées, un circulateur en Hydraulique même s'il équipe une chaudière.
- Les produits de désembouage sont des produits, pas du matériel ; le filtre magnétique aussi.
- Un analyseur de combustion est du Matériel : jamais refacturé.
- Mots ambigus : 'ballon', 'sonde', 'vanne', 'anode' - ranger par contexte (ballon tampon = chaudières, ballon d'eau chaude = ECS).

Sources lues : https://www.richardson.fr

<a id="climatisation"></a>
## ❄️ Climatisation / Pompes à chaleur

Avant : Filtres et cartouches · Fluides frigorigènes (par type) · Pompes à chaleur et climatisation (unités et pièces) · Tuyauterie, liaisons frigorifiques et isolation · Outillage consommable · EPI

Ce qui change : Catégories actuelles scindées (Fluides, Liaisons, Unités, Pièces) ; ajout de Condensats, Ventilation, Mesure, Outillage frigoriste.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Climatiseurs et unités** | produit | Unités intérieures/extérieures de climatisation et PAC. | Split mural (u), Multi-split unité extérieure (u), Unité intérieure gainable (u), Cassette 4 voies (u), Console (u), Pompe à chaleur air-air (u) … (14) |
| **Fluides frigorigènes** | produit | Fluides en bouteille, par type. | R32 bouteille 5 kg (kg), R410A bouteille (kg), R134a (kg), R407C (kg), R404A (kg), R290 (kg) … (14) |
| **Liaisons frigorifiques et isolation** | produit | Tubes cuivre, isolants, gaines et supports. | Liaison frigorifique pré-isolée (m), Tube cuivre frigorifique (m), Isolant manchon (m), Gaine de protection (m), Goulotte clim (m), Support mural unité ext. (u) … (14) |
| **Évacuation des condensats** | produit | Pompes de relevage, tuyaux, siphons de condensats. | Pompe de relevage de condensats (u), Mini-pompe (u), Tuyau PVC condensat (m), Siphon clim (u), Bac de rétention (u), Raccord d'évacuation (u) … (10) |
| **Filtres, nettoyage et entretien** | produit | Filtres, produits de nettoyage et d'entretien. | Filtre à air (u), Filtre à charbon (u), Filtre G4 (u), Filtre F7 (u), Nettoyant évaporateur (L), Nettoyant condenseur (L) … (14) |
| **Pièces détachées clim/PAC** | produit | Composants électriques et frigorifiques de remplacement. | Compresseur (u), Condensateur de démarrage (u), Ventilateur (u), Moteur de ventilateur (u), Carte électronique (u), Sonde (u) … (14) |
| **Ventilation et VMC** | produit | VMC, bouches, gaines. | VMC simple flux (u), VMC double flux (u), Bouche d'extraction (u), Bouche de soufflage (u), Gaine souple (m), Gaine rigide (m) … (12) |
| **Outillage frigoriste** | matériel | Outils de brasage, tirage au vide, cintrage. | Pompe à vide (u), Manifold (u), Station de récupération (u), Flexibles de charge (u), Chalumeau (u), Évaseur (u) … (14) |
| **Mesure et contrôle** | matériel | Appareils de contrôle étanchéité, température, débit d'air. | Détecteur de fuite (u), Thermomètre numérique (u), Pince ampèremétrique (u), Anémomètre (u), Hygromètre (u), Multimètre (u) … (12) |
| **EPI et consommables** | matériel | EPI et fournitures d'atelier. | Gants (lot), Lunettes (u), Masque (u), Chaussures de sécurité (u), Bouchons d'oreilles (lot), Azote (u) … (14) |

Règles de rangement :

- Un fluide va toujours dans Fluides frigorigènes, par type.
- Un filtre à air est dans Filtres ; un filtre déshydrateur dans Pièces détachées.
- Une liaison pré-isolée est dans Liaisons, jamais dans Pièces.
- Un manomètre ou manifold est du Matériel.
- Mots ambigus : 'filtre', 'sonde', 'flexible', 'ventilateur' - ranger par contexte.

Sources lues : https://www.richardson.fr, https://climalife.com/fr

<a id="serrurerie"></a>
## 🔑 Serrurerie

Avant : Cylindres et serrures · Portes blindées et blocs-portes · Verrous et ferme-portes · Contrôle d'accès (badges, lecteurs) · Rideaux et volets métalliques · Coffres-forts · Clés et cylindres bruts · Quincaillerie · Outillage consommable

Ce qui change : Cylindres, portes blindées, verrous, contrôle d'accès, rideaux, coffres et clés conservés ; 'Quincaillerie' devient 'Quincaillerie de porte' ; ajout de Serrures multipoints/blindage, Métallerie, Outillage d'ouverture/reproduction de clés, EPI et consommables.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Cylindres et serrures** | produit | Cylindres européens, serrures à larder et à encastrer, serrures de boîte aux lettres. | Cylindre européen 30x30 (u), Cylindre profilé à double entrée (u), Cylindre à bouton (u), Cylindre haute sécurité A2P* (u), Cylindre débrayable (u), Cylindre à clé réversible (u) … (20) |
| **Serrures multipoints et blindage** | produit | Serrures multipoints, blindages, cornières de renfort, protège-cylindres. | Serrure multipoints 3 points (u), Serrure multipoints 5 points (u), Serrure multipoints électrique (u), Serrure autoverrouillante (u), Barre de blindage (u), Plaque de blindage (u) … (18) |
| **Portes blindées et blocs-portes** | produit | Portes de sécurité et blocs-portes complets. | Porte blindée A2P BP1 (u), Porte blindée A2P BP2 (u), Porte blindée A2P BP3 (u), Bloc-porte blindé (u), Porte d'entrée acier (u), Porte de cave (u) … (18) |
| **Verrous et ferme-portes** | produit | Verrous, targettes, ferme-portes et dispositifs de fermeture. | Verrou de sûreté à bouton (u), Verrou applique (u), Verrou à clé (u), Verrou de box (u), Targette (u), Loquet (u) … (19) |
| **Contrôle d'accès** | produit | Badges, lecteurs, claviers codés, visiophones, serrures connectées. | Lecteur de badges (u), Badge RFID (u), Clavier à code (u), Digicode (u), Interphone (u), Visiophone (u) … (19) |
| **Rideaux métalliques et volets** | produit | Rideaux et volets métalliques, grilles, portes de garage. | Rideau métallique à lames (m²), Rideau à mailles (m²), Grille extensible (m²), Grille de défense (u), Volet roulant métallique (u), Moteur de rideau (u) … (18) |
| **Coffres-forts et boîtes à clés** | produit | Coffres-forts, armoires fortes, boîtes à clés et boîtes aux lettres sécurisées. | Coffre-fort à clé (u), Coffre-fort à code (u), Coffre-fort électronique (u), Coffre-fort ignifugé (u), Coffre-fort encastrable (u), Armoire forte (u) … (17) |
| **Clés et cylindres bruts** | produit | Clés brutes à reproduire, clés vierges, badges à copier, cylindres neufs sans clé. | Clé brute plate (u), Clé brute profil européen (u), Clé brute 5 goupilles (u), Clé de sûreté (u), Clé de cylindre (u), Clé de boîte aux lettres (u) … (18) |
| **Quincaillerie de porte** | produit | Poignées, paumelles, gâches, béquilles, charnières et pièces de finition de serrurerie. | Béquille double (u), Poignée de porte (u), Poignée de tirage (u), Ensemble béquille sur plaque (u), Paumelle 140 mm (u), Paumelle réglable (u) … (19) |
| **Métallerie, profilés et soudure** | les deux | Aciers, profilés, grillages et consommables pour fabriquer ou réparer. | Tube acier carré 30x30 (m), Tube rond acier (m), Profilé en U (m), Cornière acier 40x40 (m), Plat acier 40x5 (m), Rond lisse acier (m) … (19) |
| **Outillage d'ouverture et copie de clés** | matériel | Outils d'ouverture, d'extraction et de duplication de clés, utilisés par l'équipe. | Machine à reproduire les clés (u), Fraiseuse à clés (u), Duplicateur de clés (u), Crochets de serrurier (jeu), Pick de crochetage (jeu), Tendeurs (jeu) … (24) |
| **EPI et consommables** | matériel | Protections individuelles et consommables d'atelier. | Lunettes de protection (u), Gants de manutention (paire), Gants anti-coupure (paire), Casque antibruit (u), Bouchons d'oreilles (boîte), Chaussures de sécurité S3 (paire) … (19) |

Règles de rangement :

- Un cylindre neuf avec sa clé = Cylindres et serrures ; clé seule à copier = Clés et cylindres bruts ; télécommande de portail copiable = Clés.
- Mots ambigus : 'gâche' (Quincaillerie de porte, ou 'gâche électrique' = Contrôle d'accès) ; 'cylindre électronique' → Contrôle d'accès ; 'porte de garage' → Rideaux et volets, 'porte' seule → Portes blindées ; 'ferme-porte' → Verrous et ferme-portes ; 'coffre' sans précision → Coffres-forts ; 'plaque' selon contexte (blindage ou propreté).
- Les produits de sécurité certifiés (A2P) conservent leur référence de certification dans le libellé pour le dossier d'assurance du client.
- Les clés reproduites par l'entreprise et les cylindres à clé protégée sont une donnée sensible : ne jamais saisir le numéro de carte de propriété dans le libellé.
- Métallerie est 'mixte' : les profilés posés sont facturés, les consommables de soudure ne le sont pas.

Sources lues : https://www.lesmateriaux.fr/uploads/advice/pdf/06-langage-zingueur.pdf

<a id="nettoyage"></a>
## 🧽 Nettoyage / Propreté

Avant : Détergents et désinfectants · Produits sols · Produits vitres · Sanitaires · Papier et consommables (essuie-mains, sacs) · Matériel (balais, chariots, mono-brosses) · Machines (autolaveuses) · EPI

Ce qui change : Les 8 catégories actuelles sont éclatées en 12 : Sacs, Textiles/microfibres, Vitrerie (matériel) et Remise en état sont nouvelles, « Matériel » devient Balais/Chariots, « Machines » se dédouble avec Aspirateurs/nettoyeurs et Accessoires de machines ; Détergents, sols, vitres et sanitaires sont conservés (renommés).

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Détergents et désinfectants** | les deux | Produits d'entretien courants (multi-surfaces, dégraissants, désinfectants, bactéricides) : consommés pendant la prestation, facturés seulement s'ils sont revendus au client. | Détergent multi-surfaces (bidon 5 L), Dégraissant alcalin cuisine (bidon 5 L), Détergent désinfectant surfaces (bidon 5 L), Nettoyant désinfectant prêt à l'emploi (flacon 750 mL), Détergent neutre parfumé (bidon 5 L), Lingettes désinfectantes surfaces (boîte) … (18) |
| **Produits sols** | les deux | Entretien et remise en état des sols : lavage, décapage, émulsions, cires, protections, traitements spécifiques. | Détergent sols surodorant (bidon 5 L), Décapant sols (bidon 5 L), Émulsion de lustrage (bidon 5 L), Cire métallisée (bidon 5 L), Shampooing moquette (bidon 5 L), Détergent autolaveuse faible mousse (bidon 10 L) … (17) |
| **Vitrerie et surfaces vitrées** | les deux | Nettoyage des vitres, façades vitrées et vérandas : produits et petit matériel de vitrier-laveur (raclettes, mouilleurs, perches). Matériel du pro, produits consommés ou revendus. | Nettoyant vitres (bidon 5 L), Concentré lave-vitres (bidon 1 L), Raclette inox (u), Lame de raclette caoutchouc (u), Manche de raclette (u), Mouilleur microfibre (u) … (20) |
| **Sanitaires et hygiène des mains** | produit | Produits et équipements posés ou revendus pour les sanitaires : détartrants, WC, distributeurs de savon et de papier. | Détartrant sanitaires (bidon 5 L), Gel WC javellisé (flacon 750 mL), Nettoyant WC détartrant (flacon 750 mL), Nettoyant sanitaires désinfectant (bidon 5 L), Pain WC suspendu (u), Bloc urinoir (u) … (18) |
| **Papier et consommables d'hygiène** | produit | Consommables à usage unique fournis ou revendus au client (essuyage, papier toilette, sacs, gants jetables). Se facturent. | Papier toilette rouleau standard (carton), Papier toilette jumbo (carton), Papier toilette feuille à feuille (carton), Essuie-mains en Z (carton), Essuie-mains enroulé (bobine) (carton), Bobine d'essuyage industriel (rouleau) … (18) |
| **Sacs et collecte des déchets** | produit | Sacs-poubelle de toutes contenances, containers et accessoires de tri. | Sac poubelle 30 L (carton), Sac poubelle 50 L (carton), Sac poubelle 100 L noir (carton), Sac poubelle 130 L renforcé (carton), Sac poubelle 160 L (carton), Sac transparent tri sélectif (carton) … (18) |
| **Textiles, lavettes et microfibres** | les deux | Linge de ménage réutilisable (microfibres, franges, serpillères, lavettes) : consommable de l'équipe, parfois revendu. | Lavette microfibre bleue (lot 10), Lavette microfibre rouge (lot 10), Lavette microfibre verte (lot 10), Lavette microfibre jaune (lot 10), Frange microfibre de lavage (u), Frange coton (u) … (20) |
| **Balais, seaux et chariots** | matériel | Matériel manuel de l'équipe : balais, balayettes, faubert, seaux presse, chariots de ménage, signalisation de sol. | Balai de ménage (u), Balai trapèze (u), Balai coco (u), Balayette et pelle (lot), Pelle à poussière (u), Manche télescopique (u) … (23) |
| **Autolaveuses et monobrosses** | matériel | Machines de lavage et de lustrage des sols utilisées par l'équipe, jamais facturées au client. | Autolaveuse tractée (u), Autolaveuse autoportée (u), Autolaveuse à batterie compacte (u), Monobrosse basse vitesse (u), Monobrosse haute vitesse (u), Monobrosse à batterie (u) … (12) |
| **Aspirateurs et nettoyeurs** | matériel | Aspirateurs, injecteurs-extracteurs, nettoyeurs haute pression et vapeur de l'équipe. | Aspirateur poussières professionnel (u), Aspirateur eau et poussières (u), Aspirateur dorsal (u), Aspirateur sur batterie (u), Aspirateur HEPA (u), Injecteur-extracteur moquette (u) … (19) |
| **Accessoires et pièces de machines** | matériel | Consommables et pièces des machines de l'équipe : disques, brosses, raclettes d'autolaveuse, sacs et filtres d'aspirateur, batteries. | Disque rouge de nettoyage 43 cm (u), Disque blanc de polissage (u), Disque noir décapage (u), Disque vert récurage (u), Disque diamanté (u), Brosse de lavage autolaveuse (jeu) … (20) |
| **Remise en état et traitements spéciaux** | les deux | Fin de chantier, remise en état après sinistre, graffitis, façades, désodorisation et désinfection de locaux : produits spécialisés, consommés en mission ou facturés au chantier. | Décapant fin de chantier (acide) (bidon 5 L), Nettoyant résidus ciment et plâtre (bidon 5 L), Décapant peinture et graffiti (bidon 5 L), Anti-graffiti (bidon 5 L), Dégraissant façades / démoussant (bidon 20 L), Nettoyant après incendie / suies (bidon 5 L) … (19) |
| **EPI et vêtements de travail** | matériel | Équipements de protection individuelle et tenues de l'équipe, jamais facturés. | Gants de ménage (paire), Gants nitrile manutention (paire), Gants anti-coupure (paire), Lunettes de protection (u), Masque FFP2 (boîte), Masque FFP3 (boîte) … (18) |

Règles de rangement :

- Type « mixte » pour tous les produits d'entretien : ils sont consommés pendant la prestation (jamais ligne de facture) mais peuvent être revendus au client (fournitures). C'est l'entreprise qui choisit, ligne par ligne.
- Mots ambigus : « sac » (poubelle / aspirateur / sel) — ranger par couple : sac+poubelle = Sacs et collecte, sac+aspirateur = Accessoires de machines, sac+sel = Produits sols ; « filtre » (aspirateur / eau pure) ; « brosse » (WC / machine / manuelle) ; « disque » (machine) ; « gant » (EPI) contre « gant jetable » (Papier et consommables).
- Le NOM prime sur le rayon : « sol » ne suffit pas, un « détergent sols » va en Produits sols, un « balai sols » en Balais. Un nom contenant « autolaveuse » et « brosse » va en Accessoires de machines.
- Les distributeurs (savon, papier) sont rangés en Sanitaires et hygiène des mains, pas en Papier : ce sont des équipements posés ; les recharges (papier, savon) vont en Papier / Détergents.
- « Remise en état » ne couvre que les produits de chantier ; tout produit d'entretien courant va en Détergents ou Produits sols.
- Vitrerie : le matériel de vitrier (raclette, perche) se range en Vitrerie même si le mot « seau » ou « perche » existe ailleurs.
- Un produit biocide (désinfectant, virucide) doit pouvoir porter son numéro d'AMM / TP et sa FDS si l'entreprise les renseigne ; pas de catégorie dédiée.

Sources lues : https://www.companeo.com/materiel-nettoyage-professionnel, https://www.companeo.com/materiel-nettoyage-professionnel/guide, https://conseils.hellopro.fr/autolaveuse-ou-monobrosse-quelles-differences-et-laquelle-choisir-5820.html, https://res.cloudinary.com/dvutyulln/image/upload/v1611931595/brochure/Catalogue_Paredes_Entreprises_de_Propret%C3%A9.pdf

<a id="maconnerie"></a>
## 🧱 Maçonnerie / Gros œuvre

Avant : Liants (ciment, chaux, plâtre) · Agrégats (sable, gravier) · Éléments de maçonnerie (parpaings, briques) · Béton et prêt à l'emploi · Ferraillage · Isolation · Étanchéité · Enduits · Coffrage · Outillage · EPI

Ce qui change : Isolation et étanchéité conservées ; Liants, Agrégats, Éléments, Béton, Enduits, Coffrage et Ferraillage affinés ; ajout du matériel (outillage, échafaudage, mesure) et des EPI/consommables, Outillage devient 'Outillage de maçon'.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Liants et ciments** | produit | Ciments, chaux, plâtre, colles ciment et adjuvants en sac. | Ciment gris CEM II 35 kg (sac), Ciment gris CEM II 25 kg (sac), Ciment blanc 25 kg (sac), Ciment prompt (prise rapide) 25 kg (sac), Chaux hydraulique naturelle NHL 3,5 35 kg (sac), Chaux aérienne éteinte 25 kg (sac) … (16) |
| **Sables, graviers et granulats** | produit | Granulats en sac, big-bag ou vrac, pour béton, mortier, remblai et finitions. | Sable 0/4 lavé (t), Sable 0/4 en big-bag 1 t (big-bag), Sable de maçon sac 35 kg (sac), Sable à joint 25 kg (sac), Gravillon 4/6 big-bag (big-bag), Gravier 6/10 en sac 35 kg (sac) … (16) |
| **Blocs, briques et éléments** | produit | Éléments de construction montés au mortier : blocs béton, briques, béton cellulaire, pavés, linteaux. | Parpaing creux 20x20x50 (u), Parpaing 15x20x50 (u), Parpaing plein 20x20x50 (u), Bloc à bancher 20x20x50 (u), Bloc d'angle à bancher (u), Brique rouge 20x10x5 pleine (u) … (21) |
| **Béton, mortiers et chapes** | produit | Béton et mortiers prêts à gâcher ou prêts à l'emploi, chapes, ragréages, scellements. | Béton prêt à gâcher 35 kg (sac), Béton prêt à l'emploi livré (toupie) (m³), Mortier de montage 35 kg (sac), Mortier à joint 25 kg (sac), Mortier de scellement 25 kg (sac), Mortier de réparation R4 25 kg (sac) … (16) |
| **Ferraillage et armatures** | produit | Aciers pour béton armé et accessoires de ferraillage. | Treillis soudé ST25C 2,4x6 m (panneau), Treillis soudé ST10 2,4x3,6 m (panneau), Fer à béton HA 8 6 m (u), Fer à béton HA 10 6 m (u), Fer à béton HA 12 6 m (u), Fer à béton HA 14 (u) … (18) |
| **Enduits et façades** | produit | Enduits de façade, sous-enduits, rejointoiement, crépis, produits de ravalement. | Enduit monocouche gratté 25 kg (sac), Enduit monocouche taloché 25 kg (sac), Sous-enduit de façade 25 kg (sac), Enduit de corps gras à la chaux 25 kg (sac), Enduit à la chaux de finition 25 kg (sac), Enduit de rebouchage extérieur 5 kg (u) … (16) |
| **Étanchéité et drainage** | produit | Étanchéité des fondations et murs, drains, géotextiles, bandes et résines d'imperméabilisation. | Revêtement d'imperméabilisation (RPE) 25 kg (seau), Enduit bitumineux 25 kg (seau), Bitume en émulsion 20 L (L), Membrane d'étanchéité à excroissances (rouleau), Drain agricole PVC 50 m (rouleau), Drain annelé 100 mm (m) … (17) |
| **Isolation** | produit | Isolants thermiques et phoniques pour murs, planchers, dalles et combles. | Polystyrène expansé 100 mm (m²), Polystyrène extrudé 60 mm (m²), Laine de verre en rouleau 200 mm (m²), Laine de roche panneau 100 mm (m²), Polyuréthane 80 mm (m²), Liège expansé 100 mm (m²) … (17) |
| **Coffrage et planchers** | les deux | Banches, planches de coffrage, étais, hourdis et poutrelles de plancher, produits de décoffrage. | Poutrelle béton précontraint (m), Entrevous polystyrène (u), Hourdis béton 12+5 (u), Dalle de compression treillis (m²), Planche de coffrage 27 mm (m), Madrier de coffrage (m) … (19) |
| **Outillage de maçon** | matériel | Petit outillage manuel et machines de chantier du maçon, utilisés par l'équipe. | Truelle langue de chat (u), Truelle brucelles (u), Taloche plastique (u), Taloche éponge (u), Platoir (u), Lisseuse inox (u) … (25) |
| **Échafaudage, accès et levage** | matériel | Échafaudages, échelles, étais de levage et équipements d'accès utilisés par l'équipe. | Échafaudage de façade (cadre 2 m) (u), Plancher d'échafaudage (u), Garde-corps (u), Échafaudage roulant (u), Échelle coulissante 2 plans (u), Escabeau 5 marches (u) … (16) |
| **Mesure, traçage et laser** | matériel | Appareils de mesure et de traçage de chantier. | Niveau laser rotatif (u), Laser lignes croisées (u), Trépied de chantier (u), Mire télescopique (u), Mètre ruban 5 m (u), Roue de mesure (u) … (15) |
| **EPI et consommables de chantier** | matériel | Protections individuelles et petits consommables de chantier, non facturés. | Casque de chantier (u), Gants de manutention (paire), Gants anti-coupure (paire), Chaussures de sécurité S3 (paire), Lunettes de protection (u), Masque FFP2 (boîte) … (19) |

Règles de rangement :

- Un article sans marque se range par ce qu'il EST, pas par l'étape de chantier : une cale à béton va en Ferraillage, un adjuvant en Liants.
- Mots ambigus : isolant/polystyrène (Isolation) mais coffrage polystyrène (entrevous) va en Coffrage ; 'bitume' (Étanchéité) ; 'film' / 'bâche' (EPI et consommables) ; 'resine' peut être scellement (Béton) ou étanchéité ; 'bloc' seul = Blocs, mais 'bloc-porte' n'est pas du gros œuvre.
- Le sable et les granulats se vendent en sac, big-bag ou vrac : toujours en Sables/granulats, quelle que soit l'unité.
- Machines vendues à l'unité par l'entreprise = catégorie 'materiel' (jamais facturées) ; louées au client = ligne de service, pas un produit.
- La catégorie Coffrage et planchers est 'mixte' : poutrelles et hourdis sont posés (facturés), banches et étais sont de l'équipement réutilisé.

Sources lues : https://www.batiproduits.com/fiche/fabricant/point-p-saint-gobain-52638/offre-ct11843.html, https://www.baselopresse.fr/batidistribution/distribution/pointp/pointp-6522/pdf, https://www.bricodepot.fr/produits/materiau-et-gros-oeuvre/gros-oeuvre-et-evacuation-des-eaux/evacuation-des-eaux-de-pluie/accessoire-gouttiere

<a id="menuiserie"></a>
## 🚪 Menuiserie

Avant : Fenêtres et portes-fenêtres · Portes · Volets et fermetures · Panneaux et bois · Parquet et sols · Quincaillerie · Joints et mousses · Escaliers · Colles et fixations · Vitrages et miroirs · Outillage

Ce qui change : Fenêtres, Portes, Volets, Escaliers, Quincaillerie, Vitrages gardés ; 'Panneaux et bois' devient 'Bois et panneaux' ; ajout de Visserie et fixations, scission Joints/colles, Outillage en deux (électroportatif / main et mesure) et EPI/consommables.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Fenêtres et baies** | produit | Menuiseries extérieures vitrées posées chez le client. | Fenêtre PVC 2 vantaux 120x100 (u), Fenêtre alu 1 vantail (u), Fenêtre bois 2 vantaux (u), Porte-fenêtre PVC 1 vantail (u), Porte-fenêtre 2 vantaux (u), Baie coulissante alu 2 m (u) … (17) |
| **Portes et blocs-portes** | produit | Portes intérieures, d'entrée, de garage et de service, avec leurs huisseries. | Bloc-porte intérieur 83 cm (u), Porte intérieure alvéolaire 73 cm (u), Porte coulissante en applique (u), Porte à galandage (kit) (u), Porte d'entrée PVC (u), Porte d'entrée acier (u) … (19) |
| **Volets et fermetures** | produit | Volets battants, roulants, stores, persiennes, portails. | Volet roulant PVC monobloc (u), Volet roulant alu rénovation (u), Coffre de volet roulant tunnel (u), Moteur de volet roulant (u), Lame de volet roulant (u), Volet battant bois 2 vantaux (u) … (20) |
| **Bois et panneaux** | produit | Bois massifs, bois d'ingénierie et panneaux dérivés vendus à la coupe ou à la pièce. | Chevron sapin 63x75 (m), Madrier (m), Planche rabotée sapin (m), Tasseau 27x27 (m), Lambris pin (m²), Lambris PVC (m²) … (24) |
| **Parquet et sols** | produit | Parquets, stratifiés et accessoires de pose des sols bois. | Parquet massif chêne (m²), Parquet contrecollé chêne (m²), Parquet stratifié 8 mm (m²), Parquet flottant clipsable (m²), Sous-couche parquet (rouleau), Sous-couche acoustique parquet (rouleau) … (18) |
| **Escaliers et agencement** | produit | Escaliers, garde-corps, rampes, éléments d'agencement intérieur et placards. | Escalier droit bois (u), Escalier quart tournant (u), Escalier hélicoïdal (u), Marche escalier chêne (u), Contremarche (u), Limon d'escalier (u) … (20) |
| **Quincaillerie et ferrures** | produit | Charnières, paumelles, serrures de meuble, poignées, glissières et accessoires de menuisier. | Paumelle 140 mm (u), Charnière invisible (u), Charnière de meuble (u), Équerre de fixation (u), Poignée de porte béquille (u), Bouton de meuble (u) … (20) |
| **Visserie et fixations** | produit | Vis, boulons, chevilles, clous et agrafes en boîte ou en vrac. | Vis agglo 4x40 boîte 200 (boîte), Vis agglo 5x60 (boîte), Vis plaque de plâtre 3,5x25 (boîte), Vis inox A2 4x40 (boîte), Vis à tête fraisée (boîte), Vis de terrasse inox (boîte) … (20) |
| **Colles, joints et mousses** | produit | Colles bois, mastics, silicones, mousses expansives, lasures et finitions de pose. | Colle à bois D3 750 g (u), Colle à bois polyuréthane (u), Colle de montage 310 mL (cartouche), Mastic acrylique 310 mL (cartouche), Silicone sanitaire 310 mL (cartouche), Silicone menuiserie (cartouche) … (20) |
| **Vitrages et miroirs** | produit | Verre, double vitrage, miroirs et accessoires de vitrage. | Vitrage isolant 4/16/4 (m²), Double vitrage feuilleté (m²), Triple vitrage (m²), Verre simple 4 mm (m²), Verre feuilleté 44.2 (m²), Verre trempé 8 mm (m²) … (18) |
| **Outillage électroportatif** | matériel | Machines électriques et à batterie utilisées par l'équipe, jamais facturées. | Scie circulaire 190 mm (u), Scie sauteuse (u), Scie à onglet radiale (u), Scie sur table (u), Défonceuse (u), Rabot électrique (u) … (20) |
| **Outillage à main et mesure** | matériel | Outils manuels, mesure, serrage, lames et forets, utilisés par l'équipe. | Marteau de menuisier (u), Ciseau à bois 20 mm (u), Rabot à main (u), Scie égoïne (u), Scie à dos (u), Serre-joint 60 cm (u) … (24) |
| **EPI et consommables** | matériel | Protections individuelles et consommables de pose. | Lunettes de protection (u), Casque antibruit (u), Bouchons d'oreilles (boîte), Masque anti-poussière FFP2 (boîte), Gants de manutention (paire), Gants anti-coupure (paire) … (18) |

Règles de rangement :

- Les lames de scie, forets et embouts sont du matériel (Outillage à main), pas de la visserie.
- 'Cylindre', 'serrure' et 'ferme-porte' sont communs avec le pack serrurerie : ranger en Quincaillerie et ferrures.
- Mots ambigus : 'mousse' (Colles/joints) ; 'vitrage' seul = Vitrages mais fenêtre complète = Fenêtres ; 'lasure/vernis' vont ici si en finition bois d'agencement, sinon pack peinture ; 'lambris' reste en Bois et panneaux.
- 'bloc-porte' et 'huisserie' vont en Portes, jamais en Quincaillerie.
- Équipement réutilisé (scie, compresseur) = type materiel, jamais facturé ; consommables posés chez le client = produit.

Sources lues : https://www.lesmateriaux.fr/uploads/advice/pdf/06-langage-zingueur.pdf, https://www.batiproduits.com/fiche/fabricant/point-p-saint-gobain-52638/offre-ct11843.html

<a id="peinture"></a>
## 🖌️ Peinture / Revêtements

Avant : Peintures intérieures · Peintures extérieures et façades · Sous-couches et impressions · Enduits et rebouchage · Revêtements muraux (papier peint, toile) · Revêtements de sol · Lasures et vernis · Protection (bâches, adhésifs) · Outillage (rouleaux, pinceaux) · EPI

Ce qui change : Catégories de produits conservées ; ajout de Décapants/traitements, Sols souples, séparation Protection / Rouleaux-pinceaux / Outillage de préparation, et fusion Échafaudage + EPI. Lasures regroupées avec les vernis et le bois.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Peintures intérieures** | produit | Peintures murs, plafonds et boiseries intérieures. | Peinture acrylique mate blanche 10 L (pot), Peinture acrylique satinée 10 L (pot), Peinture acrylique velours 2,5 L (pot), Peinture plafond mate 10 L (pot), Peinture murs et plafonds 15 L (pot), Peinture glycéro satinée 2,5 L (pot) … (18) |
| **Peintures extérieures et façades** | produit | Peintures de façade, volets, fer, bois extérieur, toitures et sols extérieurs. | Peinture façade pliolite 10 L (pot), Peinture façade siloxane 10 L (pot), Peinture façade minérale 15 L (pot), Peinture pour volets bois 2,5 L (pot), Peinture fer antirouille 2,5 L (pot), Peinture pour portail 2 L (pot) … (16) |
| **Sous-couches et impressions** | produit | Primaires, impressions, bloqueurs de taches, fixateurs : tout ce qui prépare avant la finition. | Sous-couche universelle 10 L (pot), Impression murale 10 L (pot), Impression bois 2,5 L (pot), Primaire d'accrochage 5 L (pot), Primaire pour carrelage 2,5 L (pot), Primaire fer antirouille 2,5 L (pot) … (17) |
| **Enduits et préparation** | produit | Enduits de rebouchage, de lissage, joints, bandes et produits de préparation des supports. | Enduit de rebouchage 5 kg (pot), Enduit de lissage poudre 25 kg (sac), Enduit de lissage en pâte 25 kg (seau), Enduit de rebouchage en poudre 5 kg (sac), Enduit à joint 25 kg (seau), Bande à joint papier 150 m (rouleau) … (20) |
| **Lasures, vernis et bois** | produit | Finitions et protection du bois intérieur et extérieur. | Lasure bois extérieur 2,5 L (pot), Lasure incolore 5 L (pot), Vernis polyuréthane 2,5 L (pot), Vernis marin 1 L (pot), Vernis pour parquet 5 L (pot), Huile de lin 1 L (L) … (18) |
| **Revêtements muraux** | produit | Papiers peints, toiles, frises et colles de pose. | Papier peint intissé (rouleau), Papier peint vinyle (rouleau), Papier peint à peindre (rouleau), Toile de verre (rouleau), Toile de rénovation (rouleau), Papier peint panoramique (u) … (18) |
| **Sols souples et peintures de sol** | produit | Sols PVC, lames vinyle, moquette, résines et peintures pour sols. | Sol vinyle en rouleau (m²), Lame PVC clipsable (m²), Dalle PVC adhésive (m²), Moquette en rouleau (m²), Dalle de moquette (m²), Linoléum (m²) … (18) |
| **Décapants et traitements des supports** | produit | Produits qui nettoient, décapent ou traitent un support avant peinture. | Décapant peinture gel 1 L (L), Décapant façade 5 L (L), Décapant mur 5 L (L), Dégraissant 5 L (L), Lessive décapante 5 kg (u), Anti-mousse façade 5 L (L) … (18) |
| **Protection et masquage** | les deux | Bâches, adhésifs, films de protection ; consommables du chantier (non facturés, sauf revente). | Bâche de protection 4x5 m (u), Bâche plastique 4x5 m (u), Bâche textile anti-dérapante (rouleau), Papier de protection kraft (rouleau), Film de protection plastique (rouleau), Adhésif de masquage 50 m (rouleau) … (17) |
| **Rouleaux, pinceaux et accessoires** | matériel | Petit matériel d'application : rouleaux, pinceaux, bacs, perches, pistolets. | Rouleau laqueur 110 mm (u), Rouleau façade 180 mm (u), Rouleau manchon polyamide 250 mm (u), Rouleau mousse (u), Rouleau pour plafond (u), Monture de rouleau (u) … (24) |
| **Outillage de préparation** | matériel | Machines et outils de ponçage, décapage et grattage utilisés par l'équipe. | Ponceuse girafe (u), Ponceuse excentrique (u), Ponceuse vibrante (u), Ponceuse à bande (u), Décapeur thermique (u), Pistolet à air chaud (u) … (18) |
| **Échafaudage, accès et EPI** | matériel | Échafaudages, échelles et protections individuelles du peintre. | Échafaudage roulant (u), Plateforme individuelle roulante (u), Escabeau 6 marches (u), Échelle coulissante (u), Tréteaux (paire), Planche d'échafaudage (u) … (18) |

Règles de rangement :

- Un seau d'enduit se range par FONCTION : joint/rebouchage/lissage = Enduits et préparation ; façade = Enduits ; si le nom contient 'peinture' ou une taille de pot en L, Peintures.
- Mots ambigus : 'primaire', 'impression', 'sous-couche' = Sous-couches (jamais Peintures) ; 'diluant' et 'white-spirit' = Décapants ; 'ruban' = Protection (adhésif) ; 'sol' seul = Sols souples, mais 'peinture de sol' = Sols ; 'bâche' = Protection ; 'ponceuse' = Outillage de préparation ; 'lasure/vernis/huile' = Lasures et bois.
- Les bâches, adhésifs et papiers de protection sont 'mixte' : consommés sur le chantier, ils ne se facturent que sur demande du client.
- La catégorie 'Revêtements de sol' actuelle est scindée : les sols posés (vinyle, moquette) restent chez nous, le parquet va au pack menuiserie.
- Produits dangereux (diluants, décapants) : prévoir la fiche de données de sécurité sur la fiche produit.

Sources lues : https://www.batiproduits.com/fiche/fabricant/point-p-saint-gobain-52638/offre-ct11843.html, https://www.lesmateriaux.fr/uploads/advice/pdf/05-couvreur-zingueur.pdf

<a id="paysagiste"></a>
## 🌿 Paysagiste / Espaces verts

Avant : Végétaux (arbres, arbustes, vivaces, gazon) · Terreaux et amendements · Engrais · Paillage et gravier · Produits phytosanitaires (réservés aux certifiés) · Arrosage (tuyaux, programmateurs) · Carburant et huile · Outillage et consommables (fil, lames) · EPI

Ce qui change : Les 9 catégories actuelles sont éclatées en 12 : végétaux séparés (arbres/arbustes et vivaces/gazon/semences), clôtures et bordures, machines et outillage à main séparés, consommables machines à part. Les types produit/matériel sont explicites.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Arbres et arbustes** | produit | Végétaux ligneux posés chez le client : arbres, arbustes, haies, conifères, fruitiers. | Arbre tige en conteneur (u), Arbuste à fleurs en pot 3 L (u), Haie de laurier en conteneur (u), Thuya en motte (u), Charmille en racines nues (u), Conifère nain en pot (u) … (16) |
| **Vivaces, gazon et semences** | produit | Plantes de massif, plantes couvre-sol, bulbes, gazon en plaques et semences. | Vivace en godet (u), Graminée en pot 2 L (u), Plante couvre-sol en godet (u), Bulbe à fleurs (tulipe, narcisse) (sachet), Annuelle en barquette (u), Plante aromatique en godet (u) … (15) |
| **Terreaux et amendements** | produit | Supports de culture et améliorants du sol. | Terreau universel (sac), Terreau plantation (sac), Terre végétale criblée (m³), Terreau spécial gazon (sac), Terre de bruyère (sac), Compost végétal (m³) … (16) |
| **Engrais et fertilisants** | produit | Engrais minéraux et organiques, fertilisants pour gazon, massifs, arbres. | Engrais gazon longue durée (sac), Engrais universel granulé (kg), Engrais arbres et arbustes (kg), Engrais rosiers (kg), Engrais plantes vertes liquide (L), Engrais organique en pellets (kg) … (15) |
| **Paillage et minéraux décoratifs** | produit | Paillis, copeaux, graviers, galets, dalles et pas japonais pour allées et massifs. | Paillis d'écorce de pin (m³), Copeaux de bois (m³), Paillage lin (sac), Mulch broyat (m³), Gravier concassé 6/10 (m³), Gravillon blanc (sac) … (16) |
| **Phytosanitaires et biocontrôle** | produit | Produits de traitement des végétaux, vente et usage réservés aux professionnels certifiés (Certiphyto). | Herbicide total (L), Désherbant sélectif gazon (L), Fongicide rosiers (L), Insecticide biologique (L), Anti-limaces (kg), Bouillie bordelaise (kg) … (15) |
| **Arrosage et irrigation** | produit | Tout pour amener l'eau : tuyaux, goutte-à-goutte, arroseurs, programmateurs, pompes. | Tuyau PE 25 mm (m), Tuyau d'arrosage 25 m (u), Goutte-à-goutte (tuyau 16 mm) (m), Goutteur autorégulant (u), Arroseur escamotable (u), Turbine d'arrosage (u) … (17) |
| **Clôtures, bordures et aménagements** | produit | Éléments d'aménagement posés : clôtures, bordures, bois de jardin, structures. | Grillage rigide (m), Panneau bois (u), Poteau bois traité (u), Brande et canisse (m), Bordure acier (m), Bordure plastique (m) … (17) |
| **Machines et motoculture** | matériel | Machines thermiques, électriques et sur batterie de l'équipe, jamais facturées. | Tondeuse tractée (u), Tondeuse autoportée (u), Tondeuse robot (u), Taille-haie thermique (u), Débroussailleuse (u), Tronçonneuse (u) … (17) |
| **Outillage à main et élagage** | matériel | Outils manuels de jardinage, de taille et d'élagage. | Sécateur (u), Cisaille à haie (u), Scie d'élagage (u), Échenilloir (u), Bêche (u), Fourche-bêche (u) … (18) |
| **Consommables machines** | matériel | Ce que consomment les machines : carburant, huiles, fil, lames, chaînes, bougies. | Essence 2 temps mélangée (L), Essence alkylate (L), Huile moteur 4 temps (L), Huile de chaîne biodégradable (L), Huile 2 temps (L), Fil de débroussailleuse (rouleau) … (17) |
| **EPI paysagiste** | matériel | Équipements de protection individuelle pour taille, tronçonnage, débroussaillage. | Casque forestier avec visière et antibruit (u), Pantalon anti-coupure (u), Chaussures de sécurité anti-coupure (paire), Gants de jardinage (paire), Gants anti-coupure (paire), Lunettes de protection (u) … (15) |

Règles de rangement :

- Un végétal se range par sa forme (arbre ou arbuste, vivace, gazon), jamais par sa couleur ni son pot.
- Les produits phytosanitaires sont réservés aux professionnels certifiés (Certiphyto) : la catégorie existe, mais l'entreprise reste responsable de ce qu'elle y range.
- Carburant, huiles et fil vont dans Consommables machines, pas dans Machines et motoculture ; une machine neuve vendue au client est une exception à ranger par l'entreprise.
- Mots ambigus : gazon (plaques et semences, ou engrais gazon), bordure (Paillage ou Clôtures), tuyau (arrosage ou carburant/huile), huile (Consommables machines), sable (Terreaux ou Paillage), gant (EPI).
- Paillis, graviers et terre se comptent en m³ ou en sac, les végétaux à l'unité : l'unité aide à ranger.

Sources lues : https://www.manutan.fr/fr/maf/espace-exterieur, https://www.manutan.fr

<a id="couverture"></a>
## 🏠 Couverture / Zinguerie

Avant : Tuiles · Ardoises · Zinc et gouttières · Fixations et crochets · Isolation (combles) · Étanchéité (membranes, bitume) · Fenêtres de toit · Produits de traitement (démoussant, hydrofuge) · Échafaudage et protection · EPI antichute

Ce qui change : Tuiles, Ardoises, Zinc/gouttières, Fixations, Isolation, Étanchéité, Fenêtres de toit et Traitement conservés ; 'Zinc et gouttières' scindé en Zinc/métaux et Gouttières ; ajout d'Accessoires de toiture (closoirs, chatières), de l'Outillage couvreur et séparation Échafaudage/EPI antichute.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Tuiles** | produit | Tuiles de couverture et leurs pièces à emboîtement ou de rive. | Tuile terre cuite à emboîtement (m²), Tuile béton à emboîtement (m²), Tuile canal (m²), Tuile plate terre cuite (m²), Tuile plate béton (m²), Tuile de rive gauche (u) … (20) |
| **Ardoises et couvertures naturelles** | produit | Ardoise naturelle ou artificielle, bardeaux, chaume, lauzes et autres couvertures décoratives. | Ardoise naturelle 32x22 (m²), Ardoise naturelle 40x25 (m²), Ardoise fibres-ciment 40x24 (m²), Ardoise artificielle (m²), Ardoise de rive (u), Ardoise faîtière (u) … (19) |
| **Zinc, métaux et bacs acier** | produit | Feuilles et bandes de métal pour couvrir ou habiller : zinc, cuivre, plomb, alu, bacs acier. | Bande de zinc 0,65 mm (m²), Feuille de zinc 0,8 mm (m²), Zinc prépatiné (m²), Bande de cuivre (m²), Plomb en table (kg), Plomb en rouleau 2 mm (kg) … (20) |
| **Gouttières et descentes** | produit | Gouttières, descentes, raccords et accessoires d'évacuation des eaux pluviales. | Gouttière demi-ronde zinc 25 cm (m), Gouttière PVC 25 cm (m), Gouttière alu 33 cm (m), Gouttière carrée (m), Gouttière à rebord (m), Descente d'eau pluviale zinc 80 mm (m) … (22) |
| **Fixations et crochets** | produit | Vis, clous, crochets et pattes de fixation propres à la couverture. | Crochet de tuile inox (u), Clou de couvreur galvanisé (kg), Clou de couvreur inox (kg), Vis autoforeuse bac acier (boîte), Vis de charpente 6x100 (boîte), Pointe de couvreur (kg) … (19) |
| **Accessoires de toiture** | produit | Faîtières, closoirs, chatières, passages de toit, antennes, sorties de ventilation. | Closoir ventilé (m), Closoir en aluminium plissé (m), Closoir de faîtage (m), Closoir en plomb (m), Chatière de ventilation (u), Chatière en terre cuite (u) … (21) |
| **Isolation sous toiture** | produit | Isolants de combles et de toiture. | Laine de verre en rouleau 300 mm (m²), Laine de roche en panneau 140 mm (m²), Laine de bois 120 mm (m²), Polyuréthane sous toiture 100 mm (m²), Panneau sarking (m²), Ouate de cellulose soufflée (kg) … (18) |
| **Écran sous toiture et étanchéité** | produit | Écrans de sous-toiture, membranes, bitume, EPDM, toits plats, solins. | Écran de sous-toiture HPV (rouleau), Écran de sous-toiture souple (rouleau), Écran en polyéthylène (rouleau), Membrane EPDM (m²), Membrane PVC (m²), Bande bitumeuse auto-adhésive (rouleau) … (19) |
| **Fenêtres de toit et verrières** | produit | Fenêtres de toit, châssis, raccords d'étanchéité et accessoires de pose. | Fenêtre de toit 78x98 (u), Fenêtre de toit 55x78 (u), Fenêtre de toit à rotation (u), Fenêtre de toit à projection (u), Verrière de toit (u), Lanterneau plat (u) … (18) |
| **Traitement et entretien** | produit | Produits de nettoyage, démoussage, hydrofuge et peinture de toiture. | Démoussant toiture 5 L (L), Anti-mousse longue durée 20 L (L), Hydrofuge toiture 5 L (L), Peinture de toiture 10 L (pot), Traitement de charpente 5 L (L), Insecticide charpente (L) … (18) |
| **Outillage et consommables du couvreur** | matériel | Outillage manuel, machines et consommables propres à la couverture. | Marteau de couvreur (u), Tire-clou (u), Enclume d'ardoisier (u), Cisaille à tôle (u), Cisaille à zinc (u), Pince à plier (u) … (26) |
| **Échafaudage, accès et sécurité** | matériel | Échafaudages de pied, garde-corps, échelles, filets et équipements collectifs de sécurité. | Échafaudage de façade (u), Échafaudage roulant (u), Garde-corps provisoire de toiture (u), Garde-corps de rive (u), Échelle de toit (u), Échelle coulissante (u) … (18) |
| **EPI antichute et protection** | matériel | Équipements de protection individuelle, dont antichute, pour travail en hauteur. | Harnais antichute (u), Longe de maintien (u), Longe absorbeur d'énergie (u), Ligne de vie temporaire (u), Ligne de vie permanente (u), Point d'ancrage (u) … (18) |

Règles de rangement :

- Pour une tuile ou une ardoise de rive/faîtière, on range avec sa famille (Tuiles ou Ardoises), pas en Accessoires.
- Mots ambigus : 'crochet' (gouttière ou tuile) → Gouttières si 'gouttière'/'hampe', sinon Fixations ; 'plomb' = Zinc/métaux (le plomb de plomberie hors pack) ; 'solin' → Zinc ou Écran selon matière ; 'bac acier' = Zinc/métaux ; 'chatière' = Accessoires ; 'laine' sans précision = Isolation ; 'échelle de toit' est un matériel (Échafaudage), mais en pièce posée en Accessoires.
- Le travail en hauteur impose une ligne de vie : les EPI antichute ne sont pas des consommables, à suivre en 'materiel' (vérification périodique obligatoire).
- Les matériaux de couverture se vendent au m² ou à l'unité : la quantité à la pièce reste dans l'unité de l'article, pas convertie.
- Amiante : une toiture fibro-ciment d'avant 1997 exige un repérage avant travaux ; aucun produit amiante n'est jamais saisi en stock.

Sources lues : https://www.lesmateriaux.fr/uploads/advice/pdf/06-langage-zingueur.pdf, https://www.lesmateriaux.fr/uploads/advice/pdf/05-couvreur-zingueur.pdf, https://www.batiproduits.com/fiche/produits/crochets-divers-de-fixation-pour-couvertures-cro-p68916498.html, https://www.bricodepot.fr/produits/materiau-et-gros-oeuvre/gros-oeuvre-et-evacuation-des-eaux/evacuation-des-eaux-de-pluie/accessoire-gouttiere

<a id="multiservices"></a>
## 🛠️ Multiservices / Maintenance

Avant : Plomberie simple · Électricité simple · Quincaillerie et fixations · Peinture et petites réparations · Serrurerie simple · Consommables · Outillage · EPI

Ce qui change : Aucune catégorie existante (pack neuf) : 14 catégories qui reprennent plomberie, électricité, serrurerie, peinture des packs métier, plus visserie, chimie, mesure, accès de chantier et EPI.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Plomberie : tubes et raccords** | produit | Canalisations et raccords d'alimentation et d'évacuation. | Tube cuivre 14 mm (m), Tube PER 16 mm (m), Tube multicouche 16 mm (m), Tube PVC évacuation Ø 40 (m), Tube PVC évacuation Ø 100 (m), Coude PVC 87° 40 mm (u) … (19) |
| **Robinetterie et sanitaire** | produit | Robinets, mitigeurs, vannes, WC, chasses, chauffe-eau, flotteurs. | Mitigeur d'évier (u), Mitigeur de lavabo (u), Robinet d'arrêt (u), Robinet de machine à laver (u), Colonne de douche (u), Flexible de douche (u) … (19) |
| **Électricité : appareillage et protection** | produit | Prises, interrupteurs, disjoncteurs, tableaux et coffrets. | Prise 2P+T 16 A (u), Interrupteur va-et-vient (u), Poussoir (u), Variateur (u), Prise RJ45 (u), Prise TV (u) … (18) |
| **Câbles, gaines et connectique** | produit | Fils, câbles, gaines, goulottes, chemins de câbles, bornes et accessoires de connexion. | Câble R2V 3G2,5 (m), Fil H07V-R 2,5 mm² (m), Câble 3G1,5 (m), Câble RJ45 cat6 (m), Gaine ICTA Ø 20 (m), Gaine ICTA Ø 25 (m) … (18) |
| **Éclairage et lampes** | produit | Ampoules, luminaires, projecteurs et éclairage de dépannage. | Ampoule LED E27 (u), Ampoule LED GU10 (u), Tube LED T8 (u), Spot encastrable LED (u), Plafonnier LED (u), Applique murale (u) … (17) |
| **Serrurerie et quincaillerie** | produit | Serrures, cylindres, poignées, charnières, ferme-portes, accessoires de menuiserie. | Cylindre européen 30x30 (u), Serrure à encastrer (u), Serrure 3 points (u), Verrou de sûreté (u), Poignée de porte (u), Béquille double (u) … (18) |
| **Visserie et fixations** | produit | Vis, boulons, chevilles, clous et fixations diverses. | Vis à bois 4 x 40 (boîte), Vis à placoplâtre (boîte), Vis autoforeuse (boîte), Vis inox (boîte), Boulon tête hexagonale (lot), Écrou (lot) … (18) |
| **Peinture et revêtements** | produit | Peintures, sous-couches, enduits, rebouchage, lasures, revêtements muraux. | Peinture acrylique murs et plafonds (L), Peinture satinée boiseries (L), Peinture façade (L), Sous-couche universelle (L), Enduit de rebouchage (kg), Enduit de lissage (kg) … (18) |
| **Colles, mastics et silicones** | produit | Produits d'étanchéité et de collage du bâtiment. | Silicone sanitaire (cartouche), Silicone neutre (cartouche), Mastic polyuréthane (cartouche), Mastic MS polymère (cartouche), Colle de montage (cartouche), Colle polyuréthane (u) … (18) |
| **Chimie d'entretien et lubrifiants** | produit | Dégrippants, graisses, nettoyants techniques, désinfectants et produits d'entretien du bâtiment. | Dégrippant multifonction (bombe), Graisse multi-usage (cartouche), Huile de coupe (L), Lubrifiant silicone (bombe), Nettoyant contact électrique (bombe), Nettoyant frein (bombe) … (18) |
| **Outillage à main et électroportatif** | matériel | Outils de l'équipe, à main ou sur secteur ou batterie, jamais facturés. | Perceuse-visseuse sans fil (u), Perforateur (u), Meuleuse (u), Scie sauteuse (u), Scie circulaire (u), Ponceuse (u) … (21) |
| **Mesure et contrôle** | matériel | Appareils de mesure et de test de l'équipe. | Multimètre numérique (u), Pince ampèremétrique (u), Vérificateur d'absence de tension (u), Testeur de prise (u), Mesureur de terre (u), Contrôleur d'isolement (u) … (16) |
| **Accès et protection de chantier** | matériel | Moyens d'accès et protection des lieux, utilisés par l'équipe. | Échelle coulissante (u), Échafaudage roulant (u), Escabeau (u), Tréteau (u), Bâche de protection (u), Film de protection de sol (rouleau) … (16) |
| **EPI** | matériel | Équipements de protection individuelle des intervenants. | Casque de chantier (u), Lunettes de protection (u), Gants de manutention (paire), Gants anti-coupure (paire), Gants isolants (paire), Chaussures de sécurité S3 (paire) … (14) |

Règles de rangement :

- Un article se range par son usage dans le corps de métier, pas par sa matière : un silicone sanitaire est en Colles, mastics et silicones.
- Outillage, mesure et accès de chantier sont du matériel de l'équipe (jamais facturé) ; peinture, tubes, câbles sont posés et facturés.
- Mots ambigus : joint (plomberie, silicone, joint de robinet), collier (tubes ou câbles), cartouche (mitigeur ou colle), lampe (Éclairage ou lampe de poche), bombe (peinture ou dégrippant), échelle (matériel), pince (outillage ou ampèremétrique), coffret (électricité).
- Quand un article peut aller en plomberie ou en robinetterie, le raccord va en tubes, tout ce qui se manœuvre en Robinetterie.

Sources lues : https://www.manutan.fr/fr/maf/entretien-maintenance-et-reparation, https://www.manutan.fr

<a id="autre"></a>
## 🧰 Autre métier de terrain

Avant : Pièces et fournitures · Consommables · Outillage · EPI

Ce qui change : Aucune catégorie existante : 8 catégories génériques.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Matières et fournitures** | les deux | Matières premières et fournitures consommées pour réaliser le travail ou revendues au client. | Plaque de bois (u), Tube métallique (m), Câble (m), Toile (m²), Sac de produit (sac), Fourniture de bureau (lot) … (14) |
| **Pièces détachées et accessoires** | produit | Pièces posées ou revendues au client, remplacées lors d'une intervention. | Pièce de rechange (u), Filtre (u), Courroie (u), Roulement (u), Joint torique (u), Ressort (u) … (16) |
| **Quincaillerie et visserie** | les deux | Vis, boulons, chevilles, fixations et petite quincaillerie. | Vis assortiment (boîte), Boulon (lot), Écrou (lot), Rondelle (lot), Cheville (lot), Clou (kg) … (16) |
| **Produits chimiques et d'entretien** | les deux | Colles, lubrifiants, peintures, nettoyants et produits d'entretien. | Dégrippant (bombe), Graisse (cartouche), Huile (L), Colle (u), Mastic (cartouche), Silicone (cartouche) … (14) |
| **Consommables et emballages** | les deux | Petits consommables d'usage courant et emballages. | Chiffon (lot), Papier absorbant (rouleau), Sac poubelle (rouleau), Gants jetables (boîte), Sac plastique (lot), Carton d'emballage (u) … (14) |
| **Outillage et petit matériel** | matériel | Outils à main et électroportatifs de l'équipe. | Tournevis (u), Clé (u), Pince (u), Marteau (u), Mètre ruban (u), Niveau (u) … (15) |
| **Machines et appareils** | matériel | Machines, appareils de mesure et équipements de plus grande valeur utilisés par l'équipe. | Aspirateur professionnel (u), Nettoyeur haute pression (u), Compresseur (u), Groupe électrogène (u), Poste de soudure (u), Multimètre (u) … (14) |
| **EPI** | matériel | Équipements de protection individuelle. | Gants de manutention (paire), Gants jetables (boîte), Lunettes de protection (u), Casque (u), Chaussures de sécurité (paire), Protections auditives (u) … (14) |

Règles de rangement :

- Pack générique : catégories larges et sûres, que l'entreprise renomme et complète ; rien d'un métier précis.
- Ce qui sert à l'équipe sans être facturé va dans Outillage, Machines ou EPI ; ce qui est posé, consommé ou revendu va ailleurs.
- Mots ambigus : batterie, joint, colle, gant, bache, cable : à ranger par l'usage.
- Dès que l'entreprise voit apparaître un métier précis, lui proposer le pack du métier.

Sources lues : https://www.manutan.fr, https://www.manutan.fr/fr/maf/entretien-maintenance-et-reparation

<a id="incendie"></a>
## 🧯 Sécurité incendie

Avant : Extincteurs portatifs · Extincteurs mobiles · Agents extincteurs (poudre, eau, CO₂) · Pièces détachées · Signalétique · Accessoires de désenfumage

Ce qui change : Aucune catégorie existante dans l'application : 12 catégories neuves, structurées sur les rayons des distributeurs (extincteurs, alarme, éclairage de secours, signalétique, accessoires) plus RIA, désenfumage, passif, contrôle et EPI.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Extincteurs portatifs** | produit | Extincteurs à main, rangés par agent extincteur puis par contenance. | Extincteur à eau pulvérisée avec additif 6 L (u), Extincteur à eau pulvérisée avec additif 9 L (u), Extincteur à poudre ABC 6 kg (u), Extincteur à poudre ABC 9 kg (u), Extincteur à poudre ABC 2 kg (u), Extincteur à CO2 2 kg (u) … (15) |
| **Extincteurs mobiles et spéciaux** | produit | Extincteurs sur roues, installations fixes automatiques et extincteurs de véhicule ou de tableau électrique. | Extincteur mobile à poudre ABC 25 kg (u), Extincteur mobile à poudre ABC 50 kg (u), Extincteur mobile à CO2 10 kg (u), Extincteur mobile à mousse 50 L (u), Extincteur mobile à eau additivée 50 L (u), Extincteur automatique de local technique (u) … (14) |
| **Accessoires et pièces d'extincteurs** | produit | Pièces, supports, signalisation et consommables propres aux extincteurs (vérification, recharge, remplacement). | Support mural d'extincteur (u), Support de véhicule (u), Housse de protection extincteur (u), Coffret extincteur extérieur (u), Panneau d'extincteur photoluminescent (u), Tête d'extincteur complète (u) … (18) |
| **RIA et colonnes** | produit | Robinets d'incendie armés, colonnes sèches et humides, poteaux et bouches d'incendie. | RIA DN 19/6 mural (u), RIA DN 25/8 pivotant (u), RIA encastré (u), Tuyau semi-rigide 20 m (u), Tuyau semi-rigide 30 m (u), Lance de RIA (u) … (16) |
| **Désenfumage** | produit | Matériel de désenfumage naturel et mécanique : commandes, exutoires, volets, ventilateurs. | Exutoire de fumée (u), Dispositif de commande manuelle (DCM) (u), Dispositif adapté de commande (DAC) (u), Coffret de relayage (u), Centrale de désenfumage (u), Boîtier de déclenchement CO2 (u) … (16) |
| **Éclairage de sécurité** | produit | Blocs autonomes d'éclairage de sécurité (BAES), d'évacuation et d'ambiance, et leurs pièces. | BAES d'évacuation standard (u), BAES d'ambiance (u), BAES étanche (u), BAES à télécommande (u), BAES LED saillie (u), BAES encastré (u) … (16) |
| **Alarme et détection incendie** | produit | Détection, centrales, déclencheurs manuels, sirènes et diffuseurs sonores et lumineux. | Détecteur optique de fumée (u), Détecteur thermique (u), Détecteur thermovélocimétrique (u), Détecteur de flamme (u), Détecteur autonome (DAAF) (u), Déclencheur manuel (u) … (18) |
| **Signalétique et plans d'évacuation** | produit | Panneaux réglementaires de sécurité, plans, consignes et marquage. | Panneau sortie de secours (u), Panneau d'interdiction de fumer (u), Panneau d'extincteur (u), Panneau de consigne incendie (u), Plan d'évacuation A3 (u), Plan d'intervention (u) … (17) |
| **Coupe-feu et protection passive** | produit | Matériaux et équipements qui retardent le feu : joints intumescents, portes, calfeutrement. | Mastic coupe-feu (cartouche), Mousse coupe-feu (u), Joint intumescent (m), Bande intumescente (m), Collier coupe-feu (u), Manchette coupe-feu (u) … (17) |
| **Première intervention** | produit | Petit matériel d'extinction et de secours posé ou revendu : couvertures, seaux, trousses. | Couverture anti-feu 1,2 x 1,8 m (u), Couverture anti-feu cuisine (u), Seau-pompe (u), Seau à sable (u), Bac à sable (u), Sable d'extinction (sac) … (16) |
| **Outillage et appareils de contrôle** | matériel | Matériel de l'équipe pour vérifier et maintenir, jamais facturé. | Manomètre étalon (u), Banc de test d'extincteur (u), Appareil de test de détecteurs (u), Perche de test de détecteur (u), Luxmètre (u), Testeur de BAES (u) … (18) |
| **EPI et tenues** | matériel | Équipements de protection de l'équipe sur chantier et en intervention. | Casque de chantier (u), Chaussures de sécurité S3 (paire), Gants de manutention (paire), Lunettes de protection (u), Casque antibruit (u), Gilet haute visibilité (u) … (16) |

Règles de rangement :

- Un extincteur se range par type d'agent (eau, poudre, CO2, mousse) et par contenance ; portatif dans Extincteurs portatifs, sur roues ou installé dans Extincteurs mobiles et spéciaux.
- Une pièce d'extincteur (manomètre, goupille, support, recharge) va dans Accessoires et pièces d'extincteurs, jamais avec l'extincteur complet.
- Un BAES est rangé en Éclairage de sécurité, même s'il porte un pictogramme ; le pictogramme seul va en Signalétique.
- Un clapet coupe-feu va en Coupe-feu ; un clapet coupe-fumée ou un volet de désenfumage va en Désenfumage.
- Mots ambigus : tuyau (RIA, extincteur), batterie (Éclairage de sécurité, Alarme), panneau (Signalétique, Coupe-feu), détecteur (Alarme, gaz portable en Contrôle), couverture anti-feu (Première intervention), lampe frontale (EPI).
- Les prestations (vérification, maintenance) se facturent mais ne se rangent pas : catégorie à créer par l'entreprise si besoin.

Sources lues : https://www.manutan.fr/fr/maf/protection-incendie, https://www.manutan.fr

<a id="froid"></a>
## ❄️ Froid commercial / Frigoriste

Avant : Fluides frigorigènes (par type) · Compresseurs · Détendeurs · Filtres déshydrateurs · Pièces électriques · Isolants

Ce qui change : Pack construit de zéro (aucune catégorie actuelle) : fluides, groupes, évaporateurs, détente, chambres, pièces, tuyauterie, outillage, mesure, EPI.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Fluides frigorigènes et gaz** | produit | Fluides et gaz de service. | R404A (kg), R448A (kg), R449A (kg), R452A (kg), R507 (kg), R134a (kg) … (14) |
| **Groupes et compresseurs** | produit | Compresseurs, groupes de condensation, centrales. | Compresseur à piston (u), Compresseur scroll (u), Compresseur semi-hermétique (u), Groupe de condensation (u), Groupe logé (u), Centrale (u) … (14) |
| **Évaporateurs et échangeurs** | produit | Évaporateurs, aéroréfrigérants, batteries. | Évaporateur plafonnier (u), Évaporateur cubique (u), Aéroréfrigérant (u), Batterie (u), Résistance de dégivrage (u), Ventilateur d'évaporateur (u) … (12) |
| **Détendeurs, vannes et régulation** | produit | Organes de détente et de régulation. | Détendeur thermostatique (u), Détendeur électronique (u), Électrovanne (u), Pressostat HP (u), Pressostat BP (u), Régulateur de pression (u) … (14) |
| **Meubles et chambres froides** | produit | Meubles de vente, vitrines, armoires, chambres froides. | Armoire réfrigérée (u), Vitrine réfrigérée (u), Meuble vertical (u), Cellule de refroidissement (u), Chambre froide positive (u), Chambre froide négative (u) … (12) |
| **Pièces et consommables froid** | produit | Pièces de rechange et consommables. | Joint de porte (m), Charnière (u), Ventilateur (u), Moteur de ventilateur (u), Condensateur (u), Contacteur (u) … (14) |
| **Tuyauterie et isolation** | produit | Tubes, isolants, supports frigorifiques. | Tube cuivre frigorifique (m), Raccord à braser (u), Isolant manchon (m), Colle isolant (u), Collier isophonique (u), Collier de fixation (lot) … (14) |
| **Outillage frigoriste** | matériel | Outils de brasage, vide, charge. | Pompe à vide (u), Manifold (u), Station de récupération (u), Chalumeau (u), Évaseur (u), Cintreuse (u) … (14) |
| **Mesure et traçabilité** | matériel | Appareils de mesure, enregistreurs de température, détecteurs de fuite. | Détecteur de fuite (u), Thermomètre (u), Enregistreur de température (u), Sonde de température (u), Multimètre (u), Pince ampèremétrique (u) … (12) |
| **EPI et sécurité** | matériel | Gants froid, lunettes, chaussures, vêtements grand froid. | Gants grand froid (u), Veste grand froid (u), Pantalon grand froid (u), Lunettes de protection (u), Chaussures de sécurité (u), Gants de manutention (u) … (14) |
| **Consommables d'atelier** | matériel | Fournitures d'atelier. | Brasure argent (u), Décapant (u), Azote (u), Chiffon (lot), Ruban PTFE (u), Collier (lot) … (14) |

Règles de rangement :

- Un fluide est toujours dans Fluides et gaz.
- Un composant d'un groupe (compresseur, moteur) va en Groupes, un composant de régulation en Détendeurs.
- Un joint de porte est un produit de Pièces.
- Mots ambigus : 'moteur', 'ventilateur', 'condenseur', 'azote', 'huile' - ranger par contexte.

Sources lues : https://climalife.com/fr, https://www.frigoristes.fr

<a id="ascenseurs"></a>
## 🛗 Ascenseurs

Avant : Câbles · Galets · Contacts · Cartes électroniques · Huiles · Pièces de portes

Ce qui change : Les 6 catégories actuelles sont gardées (Galets => Galets, patins et guidage ; Contacts élargie aux fins de course et capteurs ; Cartes électroniques élargie aux automatismes ; Pièces de portes ; Huiles => Huiles, graisses et lubrifiants ; Câbles => Câbles et suspension) ; ajout de Machines, freins et moteurs, Sécurités et éléments de cabine, Visserie et petit matériel et trois catégories de matériel (outillage, mesure, EPI).

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Câbles et organes de suspension** | produit | Câbles de traction, de limiteur, courroies, poulies et organes de suspension de cabine et contrepoids. | Câble de traction 8 mm (m), Câble de traction 10 mm (m), Câble de traction 13 mm (m), Câble de limiteur de vitesse (m), Câble de compensation (m), Courroie plate de traction (m) … (20) |
| **Galets, patins et guidage** | produit | Galets, patins, guides, coulisseaux, graisseurs et pièces de guidage de cabine et contrepoids. | Patin de guidage de cabine (u), Patin de guidage de contrepoids (u), Galet de guidage (u), Coulisseau (u), Insert de patin (u), Graisseur de guide (u) … (18) |
| **Contacts, fins de course et détecteurs** | produit | Contacts de sécurité, fins de course, détecteurs de niveau, aimants et interrupteurs de palier. | Contact de porte palière (u), Contact de porte de cabine (u), Contact de verrouillage (u), Fin de course haut (u), Fin de course bas (u), Fin de course de ralentissement (u) … (20) |
| **Cartes électroniques et automatismes** | produit | Cartes de commande, manœuvres, variateurs, afficheurs et alimentations. | Carte de manœuvre (u), Carte de commande de porte (u), Carte de cabine (u), Carte de palier (u), Carte d'extension (u), Carte de communication (u) … (22) |
| **Pièces de portes** | produit | Portes de cabine et palières : suspensions, verrous, sabots, galets, courroies et motorisation de porte. | Galet de porte supérieur (u), Galet de porte inférieur (u), Sabot de porte (patin) (u), Verrou de porte palière (u), Moteur de porte (u), Courroie de porte (u) … (20) |
| **Machines, freins et moteurs** | produit | Machines de traction, freins, moteurs, réducteurs, codeurs et pièces de transmission. | Moteur de traction (u), Machine à entraînement direct (u), Réducteur (u), Frein de machine (u), Garniture de frein (u), Électro-aimant de frein (u) … (20) |
| **Sécurités et éléments de cabine** | produit | Parachute, limiteur de vitesse, amortisseurs, éclairage, téléphone d'urgence et éléments de cabine. | Parachute de cabine (u), Limiteur de vitesse (u), Amortisseur à huile (u), Amortisseur à ressort (u), Téléphone de cabine (u), Interphone d'urgence (u) … (22) |
| **Huiles, graisses et lubrifiants** | produit | Huiles hydrauliques, graisses de guides et de machine, lubrifiants et nettoyants. | Huile hydraulique ISO 46 (L), Huile hydraulique ISO 68 (L), Huile de réducteur (L), Huile de machine (L), Graisse de guides (kg), Graisse multi-usage (kg) … (18) |
| **Visserie, joints et petit matériel** | produit | Visserie, fixations, joints, rondelles, goupilles et consommables courants de maintenance. | Vis inox (lot), Boulon (lot), Écrou nylstop (lot), Rondelle (lot), Goupille (lot), Clavette (u) … (24) |
| **Outillage de maintenance** | matériel | Outils mécaniques et électriques d'un technicien ascensoriste (non facturés). | Jeu de clés plates (lot), Jeu de clés à douille (lot), Clé dynamométrique (u), Clé à molette (u), Tournevis isolés (lot), Pince à dénuder (u) … (25) |
| **Appareils de mesure et de contrôle** | matériel | Appareils de mesure, de réglage et de contrôle des organes de sécurité de l'ascenseur. | Multimètre (u), Pince ampèremétrique (u), Mégohmmètre (u), Testeur de terre (u), Dynamomètre de câbles (u), Mesureur de tension de câble (u) … (21) |
| **EPI et travail en hauteur** | matériel | Protections individuelles et équipements de sécurité pour intervenir en gaine, en cuvette et en machinerie. | Harnais antichute (u), Longe de maintien (u), Casque avec jugulaire (u), Gants de protection mécanique (paire), Gants isolants (paire), Lunettes de protection (u) … (19) |

Règles de rangement :

- 'Câble' : de traction, limiteur, compensation, pendentif => Câbles et organes de suspension ; câble 3G/5G => Visserie, joints et petit matériel.
- 'Moteur' : de traction => Machines, freins et moteurs ; de porte => Pièces de portes : ranger sur 'porte' avant 'moteur'.
- 'Contact' + 'porte' est ambigu entre Contacts (contact de porte) et Pièces de portes : décision prise = Contacts, fins de course et détecteurs (c'est un organe de sécurité).
- 'Cellule' + 'porte' => Pièces de portes ; 'rideau lumineux' aussi.
- 'Huile' toujours Huiles, graisses et lubrifiants (jamais Machines) ; 'graisseur' (pièce de guide) reste en Galets et guidage.
- 'Parachute' et 'limiteur' => Sécurités et éléments de cabine (pas Machines), mais leurs contacts électriques => Contacts.
- Les pièces de sécurité sont soumises à des exigences réglementaires : ne jamais proposer de substitution générique à l'enregistrement ; la fiche doit garder la référence constructeur.
- Hydraulique : groupe, vérin, soupape et flexible sont rangés en Machines, freins et moteurs même si l'appareil n'est pas à câbles.

Sources lues : connaissance métier des rayons de pièces détachées d'ascenseurs (câbles, galets, contacts, cartes, portes, huiles) — aucun catalogue de pièces d'ascenseur lu en ligne (accès réseau limité : seul le site d'un grand distributeur électrique a répondu), https://www.sonepar.fr/ (famille 'Process et contrôle industriel' repérée, sans détail)

<a id="portails"></a>
## 🚧 Portes et portails automatiques

Avant : Moteurs · Cellules photoélectriques · Télécommandes · Bords sensibles · Ressorts · Automates

Ce qui change : Les 6 catégories actuelles sont conservées (Moteurs => Motorisations, Automates => Centrales et cartes, Télécommandes => Commandes et télécommandes, Cellules et Bords sensibles regroupés en Sécurité et détection, Ressorts élargis) ; ajout de Pièces mécaniques, Portails et lames, Câbles, Batteries et solaire et trois catégories de matériel.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Motorisations de portail** | produit | Moteurs pour portail battant, coulissant, porte de garage, portail à vérins ou à bras. | Motorisation portail battant à bras (u), Motorisation portail battant à vérin (u), Motorisation portail coulissant 500 kg (u), Motorisation portail coulissant 800 kg (u), Motorisation portail coulissant 1000 kg (u), Motorisation porte de garage sectionnelle (u) … (23) |
| **Centrales et cartes de commande** | produit | Coffrets de commande, cartes électroniques, récepteurs, platines et armoires. | Centrale de commande 230 V (u), Centrale de commande 24 V (u), Carte électronique de moteur (u), Carte radio réceptrice (u), Carte de recharge solaire (u), Coffret de commande (u) … (18) |
| **Commandes et télécommandes** | produit | Télécommandes, émetteurs, claviers, digicodes, lecteurs de badge et contacteurs. | Télécommande 2 canaux (u), Télécommande 4 canaux (u), Émetteur mural (u), Émetteur de poche (u), Télécommande universelle (u), Clavier à code radio (u) … (22) |
| **Sécurité et détection** | produit | Cellules photoélectriques, bords sensibles, feux, détecteurs de boucle et protections. | Cellule photoélectrique en applique (u), Cellule photoélectrique encastrée (u), Cellule réflex (u), Cellule sans fil (u), Colonnette de cellule (u), Bord sensible 2 m (u) … (23) |
| **Ressorts, câbles et équilibrage** | produit | Ressorts, câbles, poulies et pièces d'équilibrage pour portes de garage et rideaux. | Ressort de traction (u), Ressort de torsion (u), Ressort de porte sectionnelle (u), Ressort de compensation (u), Câble de levage (m), Câble de ressort (u) … (19) |
| **Pièces mécaniques et quincaillerie** | produit | Charnières, gonds, roulettes, rails, serrures, butées, galets et visserie de portail. | Gond à souder (u), Gond à sceller (u), Charnière de portail (u), Roulette de portail coulissant (u), Rail de portail coulissant (m), Guidage supérieur (u) … (23) |
| **Portails, portes et lames** | produit | Portails, portillons, portes de garage, rideaux métalliques et leurs lames. | Portail battant aluminium (u), Portail coulissant aluminium (u), Portail en PVC (u), Portail en acier (u), Portillon (u), Porte de garage sectionnelle (u) … (23) |
| **Câbles et électricité** | produit | Câbles d'alimentation et de commande, gaines et protections électriques. | Câble 3G1,5 (m), Câble 3G2,5 (m), Câble 4G1,5 (m), Câble de commande 2x0,75 (m), Câble de commande 4x0,5 (m), Câble spiralé (m) … (23) |
| **Batteries et solaire** | produit | Batteries de secours, panneaux solaires et chargeurs d'alimentation autonome. | Batterie 12 V 7 Ah (u), Batterie 12 V 17 Ah (u), Batterie 24 V (u), Batterie de secours (u), Kit solaire pour portail (lot), Panneau solaire 10 W (u) … (14) |
| **Outillage et pose** | matériel | Outils de découpe, perçage, soudage, réglage et pose pour l'équipe. | Perceuse-visseuse (u), Perforateur (u), Meuleuse (u), Poste à souder (u), Scie à métaux (u), Clés plates (lot) … (23) |
| **Appareils de mesure et de contrôle** | matériel | Appareils de test, de mesure et de réglage des automatismes. | Multimètre (u), Pince ampèremétrique (u), Testeur de force de poussée (u), Dynamomètre de contrôle des efforts (u), Mesureur d'effort de fermeture (u), Télémètre laser (u) … (14) |
| **EPI et consommables** | matériel | Protections individuelles et consommables d'atelier (graisses, lubrifiants, produits d'entretien). | Gants de protection (paire), Lunettes (u), Casque (u), Chaussures de sécurité (paire), Protections auditives (u), Masque (boîte) … (24) |

Règles de rangement :

- 'Cellule' toujours en Sécurité et détection ; 'cellule solaire' ou 'panneau solaire' en Batteries et solaire.
- 'Télécommande' : Commandes et télécommandes (pas la pile, rangée avec 'pile' => Commandes ; la pile de télécommande est une pièce courante).
- 'Câble' : de levage / acier gainé => Ressorts, câbles et équilibrage ; le reste => Câbles et électricité.
- 'Moteur' et 'motorisation' toujours Motorisations ; 'carte' ou 'centrale' toujours Centrales et cartes.
- 'Lame' / 'rideau' / 'porte' => Portails, portes et lames ; 'serrure' / 'gond' / 'charnière' => Pièces mécaniques.
- 'Batterie' toujours Batteries et solaire (pas d'autre catégorie batterie dans ce pack).
- 'Graisse' et 'lubrifiant' sont du matériel d'atelier consommé par l'équipe, pas facturés ; une 'ressort' ou 'câble' remplacé chez le client est facturé (type produit).

Sources lues : https://www.sonepar.fr/ (famille 'Sécurité, accès et communication' lue, sans détail automatismes), connaissance métier des rayons automatismes de portail et porte de garage des fabricants/distributeurs usuels — aucun catalogue détaillé lu en ligne (accès réseau limité)

<a id="ramonage"></a>
## 🧹 Ramonage

Avant : Hérissons et brosses · Tubage inox · Chapeaux · Trappes de visite · Produits de nettoyage

Ce qui change : Pack nouveau (liste actuelle courte : hérissons/brosses, tubage inox, chapeaux...) : passage à 11 catégories avec cannes, ramonage chimique, joints réfractaires, pièces de poêle, diagnostic, aspiration/protection, accès toiture et antichute, outillage/EPI.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Cannes et rallonges** | matériel | Cannes de ramonage et rallonges (nylon, polypropylène, fibre), kits complets. Matériel de l'équipe. | Canne de ramonage souple 1,2 m (u), Canne rigide 1 m (u), Canne polyamide 1,4 m (u), Canne fibre de verre (u), Kit complet 6 cannes + hérisson (kit), Kit 10 cannes (kit) … (18) |
| **Hérissons, brosses et goupillons** | matériel | Brosses de ramonage de tous diamètres et matières : nylon, acier, polypropylène. Consommables d'usure de l'équipe. | Hérisson rond acier Ø 150 (u), Hérisson rond acier Ø 200 (u), Hérisson synthétique Ø 150 (inox) (u), Hérisson synthétique Ø 200 (u), Hérisson nylon Ø 250 (u), Hérisson carré (u) … (19) |
| **Tubage et conduits de fumée** | produit | Tubage inox ou flexible, conduits isolés, éléments de raccordement posés ou revendus au client (tubage d'un conduit existant). | Tubage inox flexible Ø 80 (m), Tubage inox flexible Ø 125 (m), Tubage inox flexible Ø 150 (m), Tubage inox flexible Ø 200 (m), Tubage rigide inox Ø 150 (m), Conduit double paroi isolé Ø 150 (m) … (21) |
| **Chapeaux et accessoires de toit** | produit | Chapeaux, mitres et accessoires posés en sortie de toit, solins et accessoires de couverture liés au conduit. | Chapeau de cheminée inox (u), Chapeau anti-pluie (u), Chapeau aspirateur statique (u), Chapeau rotatif (u), Aspirateur statique (u), Mitre de cheminée (u) … (19) |
| **Ramonage chimique et entretien** | produit | Produits anti-suie et de nettoyage : bûches, poudre, sachets, nettoyant vitre de poêle, désencrassants. | Bûche de ramonage (u), Poudre de ramonage (sachet), Sachets de ramonage toutes saisons (boîte), Ramonage chimique liquide (flacon), Granulés de ramonage (poêles à granulés) (seau), Nettoyant vitre de poêle (flacon) … (17) |
| **Joints, cordons et produits réfractaires** | produit | Joints de porte et de vitre, cordons, mastics et colles réfractaires pour poêles, inserts et conduits. | Joint fibre de verre plat 10 mm (m), Joint plat adhésif (m), Cordon rond fibre de verre Ø 8 (m), Cordon rond Ø 12 (m), Joint de vitre de poêle (m), Kit joint de porte (kit) … (18) |
| **Pièces de poêle, insert et foyer** | produit | Pièces détachées de poêles à bois ou granulés et d'inserts posées chez le client : vitres, déflecteurs, briques, grilles. | Vitre vitrocéramique (u), Vitre de poêle sur mesure (u), Déflecteur de poêle (u), Briques réfractaires (u), Plaque de foyer (u), Grille de foyer (u) … (19) |
| **Diagnostic et contrôle de combustion** | matériel | Instruments de contrôle de l'équipe : caméras, analyseurs, détecteurs. Jamais facturés, sauf diagnostic prestation. | Caméra d'inspection de conduit (u), Perche caméra (u), Analyseur de combustion (u), Détecteur de CO portable (u), Détecteur de CO domestique (u), Manomètre / dépressiomètre (u) … (17) |
| **Aspiration et protection du sol** | matériel | Aspirateurs à suie et à cendres, bâches et protections du logement pendant le ramonage. | Aspirateur à suie professionnel (u), Aspirateur à cendres (u), Filtre HEPA aspirateur (u), Flexible d'aspiration (m), Sacs de suie (lot), Bâche de protection (u) … (19) |
| **Accès à la toiture et antichute** | matériel | Échelles, crochets de toit et EPI de travail en hauteur : indispensables pour accéder au conduit. | Échelle de toit (u), Échelle coulissante (u), Échelle crochet de faîtage (u), Crochet de toit (u), Escabeau de toit (u), Harnais antichute (u) … (18) |
| **Outillage, EPI et combustibles** | matériel | Petit outillage, protection respiratoire et fournitures de l'équipe, plus combustibles revendus (pellets, allume-feu). | Marteau et burin (u), Clé à molette (u), Tournevis (lot), Perceuse sans fil (u), Visseuse (u), Pince (u) … (18) |

Règles de rangement :

- Type : tubage, chapeaux, joints, pièces de poêle, produits anti-suie sont posés ou revendus (PRODUIT) ; cannes, hérissons, caméras, analyseurs, aspirateurs et EPI sont du MATÉRIEL.
- « Chapeau » en minuscules est ambigu avec le chapeau de protection / casque : ici toujours sortie de toit ; « casque » va en Toiture / Outillage/EPI.
- « Brosse » est ambigu : brosse de ramonage → Hérissons ; brosse manuelle de nettoyage de foyer reste Hérissons ; « brosse à chaudière » idem.
- « Sonde » : sonde de température de poêle (Pièces de poêle) ou sonde d'analyseur (Diagnostic) ; qualifier.
- « Joint » est ambigu avec joints plomberie (autres packs) ; ici fibre de verre, graphite, cordon = Joints réfractaires.
- « Conduit » / « tubage » : si le nom contient « brosse » ou « hérisson », la brosse prime (Hérissons).
- « Tubage » du conduit est une prestation facturée (pose) ; les éléments sont des produits : bien lier tubage à une ligne facturée.
- « Pellets » ou « granulés » est ambigu : granulés de ramonage chimique (Ramonage chimique) vs granulés combustibles (Outillage, EPI et combustibles). Qualifier par « ramonage » / « bois ».
- Attention au certificat de ramonage : ce sont des documents (pas du stock).

Sources lues : https://www.bricozor.com/ramonage/, https://www.bricomarche.com/p/herisson-ramonage-synthetique-d200mm/3323430020194, https://www.leroymerlin.fr/produits/herisson-de-ramonage-nylon-autogyre-d150-mm-60195121.html, https://www.provence-outillage.fr/ecatalogue/pdf/05122022.pdf

<a id="assainissement"></a>
## 🚛 Assainissement / Vidange

Avant : Consommables (flexibles, buses, joints) · Pièces de camion et de pompe · Outillage · EPI

Ce qui change : Pack nouveau (pas de catégories actuelles dans l'application) : 12 catégories, de l'hydrocurage aux fosses posées, avec une catégorie de détection de gaz/espaces confinés propre à ce métier.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Flexibles haute pression** | matériel | Flexibles de curage et de nettoyage haute pression, enrouleurs et raccords associés. Matériel de l'équipe. | Flexible HP 20 m DN 12 (u), Flexible HP 40 m DN 12 (u), Flexible HP 60 m (u), Flexible HP 100 m (u), Flexible de curage 1/2" 20 m (u), Flexible haute pression 3/8" (u) … (18) |
| **Buses et têtes de curage** | matériel | Buses rotatives, rétro-jets et têtes de curage à visser au bout du flexible. Consommables d'usure de l'équipe. | Buse rétro-jet 3 jets (u), Buse rétro-jet 5 jets (u), Buse rotative (u), Buse à boule (parois) (u), Buse à fraise (racines) (u), Buse à chaîne (u) … (19) |
| **Pompes et groupes haute pression** | matériel | Hydrocureuses, groupes HP et pièces de pompe (têtes, clapets, joints). Matériel de l'équipe. | Hydrocureuse HP portable (u), Hydrocureuse sur remorque (u), Groupe haute pression thermique (u), Pompe HP triplex (u), Tête de pompe HP (u), Kit clapets pompe HP (lot) … (18) |
| **Aspiration et vidange** | matériel | Tuyaux d'aspiration, raccords, vannes et pièces de pompes à vide des camions et préleveurs. Matériel de l'équipe. | Tuyau d'aspiration DN 100 (m), Tuyau d'aspiration DN 76 (m), Tuyau d'aspiration DN 50 (m), Raccord Guillemin (u), Raccord à came (Camlock) (u), Demi-raccord storz (u) … (20) |
| **Caméras d'inspection et détection** | matériel | Caméras de canalisation, localisateurs et détecteurs : contrôles avant et après curage, diagnostics (parfois facturés comme prestation). | Caméra d'inspection canalisation tête 40 mm (u), Caméra poussée 30 m (u), Caméra poussée 60 m (u), Caméra sur chariot (u), Câble de caméra (m), Tête de caméra auto-nivelante (u) … (17) |
| **Furets et débouchage** | matériel | Furets manuels et électriques, tire-bouchons, ventouses et pistolets pneumatiques. Outillage de l'équipe. | Furet manuel (u), Furet électrique à tambour (u), Furet électrique 15 mm (u), Furet électrique 32 mm (u), Furet sectionnel (u), Ressort de furet 22 mm (m) … (18) |
| **Produits de débouchage et d'entretien** | produit | Produits consommables : bio-activateurs, bactéries pour fosses, dégraissants, désodorisants, produits de débouchage. Revendus ou consommés selon la mission. | Bactéries pour fosse septique (sachet), Enzymes fosse septique (bidon 5 L), Bio-activateur bac à graisse (bidon 5 L), Dégraissant bac à graisse (bidon 5 L), Déboucheur gel (bidon 1 L), Déboucheur acide (bidon 5 L) … (18) |
| **Fosses et dispositifs de traitement** | produit | Fosses septiques, microstations, bacs dégraisseurs et préfiltres posés ou revendus au client (assainissement non collectif). | Fosse toutes eaux 3000 L (u), Fosse toutes eaux 5000 L (u), Microstation d'épuration 5 EH (u), Filtre compact (u), Préfiltre à pouzzolane (u), Bac dégraisseur 200 L (u) … (20) |
| **Canalisations et raccords** | produit | Tubes et raccords PVC / PE posés lors des réparations et raccordements (évacuation, assainissement). | Tube PVC assainissement Ø 100 (m), Tube PVC assainissement Ø 125 (m), Tube PVC assainissement Ø 160 (m), Tube PVC Ø 200 (m), Tube PE annelé drainage (m), Coude PVC 45° / 87° (u) … (20) |
| **Gestion des déchets et transport** | les deux | Bons de suivi, contenants et absorbants liés à la collecte des boues et matières de vidange : consommés par l'équipe, parfois facturés. | Bordereau de suivi des déchets (BSD) (bloc), Registre déchets (u), Big bag (u), Fût / bidon homologué ADR (u), Absorbant minéral (sac), Boudin absorbant (u) … (18) |
| **Gaz, sécurité et espaces confinés** | matériel | Détecteurs de gaz, ventilation, harnais et matériel pour espaces confinés (fosses, regards). Obligatoire avant d'ouvrir un ouvrage. | Détecteur multigaz 4 gaz (u), Détecteur H2S / CO (u), Détecteur O2 (u), Ventilateur d'extraction (u), Gaine de ventilation (m), Trépied de sauvetage (u) … (18) |
| **EPI et tenues** | matériel | Équipements de protection individuelle et tenues de l'équipe (risque biologique et chimique). Jamais facturés. | Combinaison étanche (u), Combinaison jetable type 5/6 (u), Bottes de sécurité étanches (paire), Cuissardes (paire), Gants nitrile longs (paire), Gants manchette PVC (paire) … (19) |

Règles de rangement :

- Type : camions, pompes, flexibles, buses, caméras et furets sont du MATÉRIEL (jamais facturé) ; fosses, regards, tubes et raccords posés sont des PRODUITS facturés ; les bactéries, enzymes et déboucheurs sont des produits revendus ou consommés (la ligne de facture se choisit).
- Une pièce de pompe (joint, piston, clapet) se range en Pompes HP ou Aspiration selon le mot : « pompe à vide » + palettes = Aspiration ; « pompe HP » + clapet = Pompes HP. « Clapet » seul est ambigu (clapet anti-retour PVC = Canalisations ; clapet de pompe = Pompes HP).
- « Raccord » est ambigu entre Flexibles HP (raccord HP), Aspiration (raccord Guillemin) et Canalisations (raccord PVC) : ranger par le qualificatif ; sans qualificatif, Flexibles HP.
- « Pompe de relevage » est un produit posé chez le client (Fosses) ; « pompe de transfert » à usage de l'équipe va en Aspiration.
- « Bac » / « regard » / « tampon » vont en Fosses et dispositifs ; « bac de rétention » en Gestion des déchets.
- « Camion » / « véhicule » ne sont pas du stock : ils relèvent des véhicules de l'entreprise, pas de ce rangement.
- Les produits dangereux (soude, acides) doivent porter pictogrammes et FDS : prévoir un rappel sur la fiche, pas une catégorie dédiée.

Sources lues : https://conseils.hellopro.fr/comment-bien-choisir-son-hydrocureur-1045.html, https://www.hellopro.fr/kithydro-40-hydrocureur-haute-pression-2005584-6465717-produit.html, https://www.legallais.com/product-page-pdf//15348.pdf, https://www.haute-pression.com/media/image/b1/17/2fca4790ee2e01101bd45e42e9b9.pdf

<a id="energies"></a>
## ☀️ Photovoltaïque et bornes de recharge

Avant : Panneaux · Onduleurs · Bornes · Câbles · Protections · Supports de fixation

Ce qui change : Les 6 catégories actuelles (Panneaux, Onduleurs, Bornes, Câbles, Protections, Supports) sont gardées et précisées ; ajout de Batteries et stockage, Comptage et délestage, Accessoires de toiture, et trois catégories de matériel (Outillage, Mesure, EPI et hauteur).

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Panneaux photovoltaïques** | produit | Modules photovoltaïques rigides, bi-verre, souples ou tuiles solaires. | Module monocristallin 400 Wc (u), Module monocristallin 430 Wc (u), Module monocristallin 450 Wc (u), Module bi-verre (u), Module full black (u), Module 500 Wc (u) … (17) |
| **Onduleurs et micro-onduleurs** | produit | Onduleurs string, hybrides, micro-onduleurs et optimiseurs. | Onduleur monophasé 3 kW (u), Onduleur monophasé 5 kW (u), Onduleur triphasé 10 kW (u), Onduleur hybride 5 kW (u), Onduleur hybride triphasé (u), Micro-onduleur 1 module (u) … (16) |
| **Batteries et stockage** | produit | Batteries de stockage, modules de batterie, coffrets de stockage et accessoires. | Batterie de stockage 5 kWh (u), Batterie lithium 10 kWh (u), Module de batterie additionnel (u), Armoire de batterie (u), Coffret de batterie (u), Câble de puissance batterie (u) … (14) |
| **Fixation et structure** | produit | Rails, crochets, pinces, lests, structures et toute la visserie de montage des modules. | Rail aluminium 4 m (u), Rail 2,2 m (u), Crochet de toit tuile (u), Crochet bac acier (u), Vis autoforeuse (lot), Vis tire-fond (lot) … (21) |
| **Câbles solaires et connectique DC** | produit | Câbles DC, connecteurs, rallonges et accessoires de raccordement des chaînes de modules. | Câble solaire 4 mm² noir (m), Câble solaire 4 mm² rouge (m), Câble solaire 6 mm² rouge/noir (m), Câble AC 3G6 (m), Câble AC 5G10 (m), Connecteur MC4 mâle (u) … (18) |
| **Protections et coffrets AC/DC** | produit | Coffrets, parafoudres, interrupteurs-sectionneurs DC, disjoncteurs, différentiels et fusibles. | Coffret de protection DC (u), Coffret de protection AC (u), Parafoudre DC type 2 (u), Parafoudre AC type 2 (u), Interrupteur-sectionneur DC (u), Sectionneur DC 1000 V (u) … (22) |
| **Bornes de recharge (IRVE)** | produit | Bornes et wallbox, câbles de recharge, supports et accessoires de recharge. | Borne murale monophasée 7 kW (u), Borne murale triphasée 11 kW (u), Borne 22 kW (u), Borne avec câble attaché (u), Borne avec prise (u), Borne pilotée par application (u) … (20) |
| **Comptage et délestage** | produit | Compteurs, transformateurs de courant, délesteurs, pilotage énergétique et supervision. | Compteur d'énergie monophasé (u), Compteur d'énergie triphasé (u), Compteur de production (u), Transformateur de courant 100/5 (u), Tore ouvrant (u), Délesteur de borne (u) … (18) |
| **Accessoires de toiture et d'étanchéité** | produit | Produits d'étanchéité, tuiles de passage, couvertines et accessoires de pose sur toiture. | Tuile de passage de câbles (u), Tuile à douille (u), Solin de raccord (m), Bande d'étanchéité (m), Mastic polyuréthane (u), Mastic MS polymère (u) … (16) |
| **Outillage et pose** | matériel | Outils et équipements d'installation PV, de sertissage et de levage, utilisés par l'équipe. | Pince à sertir MC4 (u), Perceuse visseuse (u), Visseuse à choc (u), Meuleuse (u), Scie sabre (u), Mètre laser (u) … (21) |
| **Appareils de mesure et de contrôle** | matériel | Appareils pour mesurer et contrôler une installation PV ou une borne. | Multimètre (u), Pince ampèremétrique DC (u), Testeur de courbe I-V (u), Mesureur d'isolement DC (u), Testeur de continuité de terre (u), Caméra thermique (u) … (16) |
| **EPI et sécurité en hauteur** | matériel | Équipements de protection individuelle, travail en hauteur et consignation. | Harnais antichute (u), Longe avec absorbeur (u), Casque avec jugulaire (u), Gants isolants classe 0 (paire), Gants de protection mécanique (paire), Lunettes (u) … (16) |

Règles de rangement :

- 'Borne' seul est ambigu avec le bornier ou la borne de raccordement du pack Électricité ; ici 'borne' + 'recharge'/'irve'/'wallbox' => Bornes de recharge (IRVE).
- 'Câble' : câble solaire/DC/mc4 => Câbles solaires et connectique DC ; câble de recharge => Bornes de recharge ; câble de puissance batterie => Batteries.
- 'Coffret' : protection AC/DC => Protections ; coffret de batterie => Batteries et stockage.
- 'Compteur' : toujours Comptage et délestage (jamais Outillage).
- 'Pince' : à sertir MC4 => Outillage ; pince intermédiaire/extrémité => Fixation et structure ; pince ampèremétrique => Mesure.
- 'Tuile solaire' va en Panneaux, 'tuile de passage' en Accessoires de toiture : ranger sur le mot 'passage' ou 'douille' avant 'tuile'.
- Ne ranger aucun prix/aide : seules les catégories sont figées ici (aides MaPrimeRénov', primes à l'autoconsommation = documents, pas des produits).

Sources lues : https://www.sonepar.fr/ (famille 'Production d'énergie et E-mobilité' lue, sous-rayons non accessibles), connaissance métier du photovoltaïque et de l'IRVE (rayons des distributeurs usuels) — pas de rayon détaillé lu en ligne

<a id="alarme"></a>
## 📹 Alarme, vidéosurveillance, contrôle d’accès

Avant : Centrales · Détecteurs · Sirènes · Caméras · Enregistreurs · Badges et lecteurs · Batteries · Câbles

Ce qui change : Les 8 catégories actuelles sont réorganisées : Centrales devient Centrales et transmetteurs, Détecteurs devient Détecteurs d'intrusion, Caméras et Enregistreurs conservées, Badges et lecteurs devient Contrôle d'accès, Batteries devient Alimentations et batteries, Câbles devient Câbles et connectique ; ajout de Supports et boîtiers et de trois catégories de matériel (outillage, mesure, EPI).

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Centrales et transmetteurs d'alarme** | produit | Centrales d'alarme intrusion, claviers, transmetteurs et modules de communication. | Centrale d'alarme filaire (u), Centrale d'alarme sans fil (u), Centrale mixte (u), Centrale à transmission GSM (u), Clavier de commande (u), Clavier tactile (u) … (18) |
| **Détecteurs d'intrusion** | produit | Détecteurs de mouvement, d'ouverture, de bris de vitre, de choc et de présence. | Détecteur de mouvement infrarouge (u), Détecteur double technologie (u), Détecteur extérieur (u), Détecteur de mouvement anti-animal (u), Détecteur d'ouverture (contact magnétique) (u), Contact de porte filaire (u) … (20) |
| **Sirènes et signalisation** | produit | Sirènes intérieures et extérieures, flashs et signalisation lumineuse ou sonore. | Sirène intérieure (u), Sirène extérieure auto-alimentée (u), Sirène extérieure filaire (u), Sirène flash (u), Flash lumineux (u), Sirène sans fil (u) … (15) |
| **Caméras de vidéosurveillance** | produit | Caméras fixes, dômes, tourelles, caméras IP/analogiques et caméras intérieures. | Caméra IP dôme (u), Caméra IP tourelle (u), Caméra IP bullet (u), Caméra IP PTZ (u), Caméra analogique HD (u), Caméra thermique (u) … (19) |
| **Enregistreurs et stockage vidéo** | produit | Enregistreurs, NVR/DVR, disques durs, serveurs et logiciels de gestion vidéo. | Enregistreur NVR 4 voies (u), Enregistreur NVR 8 voies (u), Enregistreur NVR 16 voies (u), Enregistreur NVR 32 voies (u), Enregistreur DVR (u), Disque dur 2 To pour vidéosurveillance (u) … (20) |
| **Contrôle d'accès** | produit | Lecteurs, badges, claviers codés, gâches, ventouses, centrales d'accès et interphones. | Lecteur de badge (u), Lecteur de badge Mifare (u), Lecteur biométrique (u), Clavier à code (u), Lecteur à clavier (u), Badge (u) … (24) |
| **Alimentations et batteries** | produit | Alimentations de sécurité, coffrets, batteries de secours et chargeurs. | Batterie 12 V 7 Ah (u), Batterie 12 V 17 Ah (u), Batterie 12 V 2,1 Ah (u), Batterie lithium 3,6 V (u), Pile lithium (u), Alimentation 12 V 2 A (u) … (16) |
| **Câbles et connectique** | produit | Câbles d'alarme et de vidéo, câbles réseau, connecteurs, câble coaxial et accessoires. | Câble d'alarme 4 conducteurs blindé (m), Câble d'alarme 6 conducteurs (m), Câble d'alarme 8 conducteurs (m), Câble RJ45 cat 6 (m), Câble RJ45 cat 5e (m), Câble coaxial RG59 (m) … (23) |
| **Supports et boîtiers** | produit | Supports de caméra, boîtiers étanches, coffrets et accessoires de fixation. | Support mural de caméra (u), Support de dôme (u), Support poteau (u), Support d'angle (u), Boîtier de jonction caméra (u), Boîtier étanche (u) … (16) |
| **Outillage et pose** | matériel | Outils de pose, de perçage, de sertissage et de câblage de l'équipe. | Perceuse-visseuse (u), Perforateur (u), Mèches à béton (lot), Scie cloche (u), Pince à sertir RJ45 (u), Pince à dénuder (u) … (24) |
| **Appareils de mesure et de contrôle** | matériel | Appareils de test des caméras, des lignes, des réseaux et des détecteurs. | Testeur de caméra IP (u), Testeur vidéo CCTV (u), Testeur de câble RJ45 (u), Multimètre (u), Pince ampèremétrique (u), Contrôleur PoE (u) … (16) |
| **EPI et consommables** | matériel | Équipements de protection individuelle et consommables d'atelier. | Gants de protection (paire), Lunettes (u), Casque (u), Chaussures de sécurité (paire), Harnais (u), Casque anti-bruit (u) … (19) |

Règles de rangement :

- 'Interphone', 'visiophone', 'platine de rue' : rangés en Contrôle d'accès ici ; dans le pack Électricité ils sont en Domotique, courants faibles : le même mot-clé peut mener à deux catégories selon le pack, c'est voulu.
- 'Détecteur de fumée' et 'sirène d'alarme incendie' : si le client fait aussi de la sécurité incendie, ils appartiennent au pack incendie ; ici ils restent en Détecteurs et Sirènes.
- 'Batterie' : alimentation/secours => Alimentations et batteries ; 'batterie lithium 3,6 V' (détecteur) aussi ; ne pas la confondre avec la batterie de stockage solaire.
- 'Caméra thermique' est ambiguë : produit posé (Caméras de vidéosurveillance) ou appareil de mesure (Mesure et contrôle, matériel) ; trancher sur le mot 'IP' ou 'fixe' (=> Caméras) vs 'portable' ou 'inspection' (=> Mesure).
- 'Switch PoE' et 'injecteur' vont en Enregistreurs et stockage vidéo (réseau vidéo), pas en Câbles.
- 'Câble' : alarme, coaxial, rj45 => Câbles et connectique ; 'cable d'alimentation 2x0,75' aussi.
- 'Support' : toujours Supports et boîtiers (jamais Outillage).

Sources lues : https://www.sonepar.fr/ (famille 'Sécurité, accès et communication' lue, sous-rayons non accessibles), connaissance métier des rayons alarme / vidéo / contrôle d'accès des distributeurs usuels — rayons détaillés non lus en ligne (accès réseau limité)

<a id="eau"></a>
## 💧 Traitement de l’eau

Avant : Résines · Sel · Cartouches de filtration · Lampes UV · Membranes d'osmose · Pompes doseuses

Ce qui change : Pack nouveau (aucune catégorie actuelle) : 11 catégories ; « Désembouage et traitement de l'eau » du pack chauffage reste chez le chauffagiste, ici l'accent est mis sur adoucisseurs, filtration, osmose, UV, pH et analyse.

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Adoucisseurs et pièces** | produit | Adoucisseurs complets (cabinet, bi-bloc, duplex), têtes de commande et pièces de rechange posés ou vendus au client. | Adoucisseur compact 12 L (u), Adoucisseur compact 20 L (u), Adoucisseur bi-bloc 25 L (u), Adoucisseur duplex (continu) (u), Adoucisseur professionnel 50 L (u), Tête de commande électronique (u) … (19) |
| **Résines et régénération** | produit | Résines échangeuses d'ions, sel de régénération et désinfection de résine. | Résine cationique (sac 25 L), Résine anionique (sac 25 L), Résine nitrate (sac 25 L), Sel pastilles adoucisseur (sac 25 kg), Sel en blocs (sac 25 kg), Sel en grains (sac 25 kg) … (16) |
| **Filtres et préfiltres** | produit | Filtres sur la canalisation d'arrivée d'eau (sédiments, lavables, rétrolavables, cintropur), têtes et carters. | Filtre à sédiments 50 µ (u), Filtre lavable 25 µ (u), Filtre autonettoyant rétrolavable (u), Filtre rétrolavable avec manomètre (u), Filtre à tamis inox (u), Filtre à charbon actif (u) … (17) |
| **Cartouches de filtration** | produit | Cartouches de remplacement (sédiments, charbon, anti-calcaire, polyphosphate), à revendre dans les contrats d'entretien. | Cartouche sédiments 5 µ 10" (u), Cartouche sédiments 20 µ 10" (u), Cartouche plissée lavable (u), Cartouche charbon bloc (u), Cartouche charbon granulaire (u), Cartouche polypropylène bobinée (u) … (16) |
| **Osmoseurs et membranes** | produit | Osmoseurs domestiques et industriels, membranes et pièces associées. | Osmoseur domestique 5 étapes (u), Osmoseur sous évier à pompe (u), Osmoseur professionnel 100 L/h (u), Osmoseur industriel (u), Membrane osmose 50 GPD (u), Membrane osmose 75 GPD (u) … (19) |
| **Désinfection et traitement bactérien** | produit | Lampes UV, injection de chlore et autres procédés de désinfection de l'eau. | Stérilisateur UV 1 m³/h (u), Stérilisateur UV 3 m³/h (u), Lampe UV de rechange (u), Manchon quartz UV (u), Ballast UV (u), Pompe doseuse chlore (u) … (16) |
| **Anti-calcaire, dosage et inhibiteurs** | produit | Traitements non salins du calcaire (polyphosphates, dosage, électronique), protection des circuits. | Anti-calcaire polyphosphate cristaux (sac 5 kg), Doseur de polyphosphates (u), Pompe doseuse proportionnelle (u), Pompe doseuse électromagnétique (u), Anti-tartre électronique / magnétique (u), Anti-tartre à induction (u) … (16) |
| **Neutralisation et correction du pH** | produit | Neutralisation de l'eau acide, correction du pH et de l'agressivité de l'eau. | Neutralisant calcite (sac 25 kg), Média Corosex (mélange magnésie-calcite) (sac 25 kg), Filtre neutralisant (u), Pompe doseuse pH (u), Bidon de correcteur pH moins (bidon 25 L), Bidon de soude / carbonate de sodium (sac 25 kg) … (16) |
| **Raccords, vannes et tuyauterie** | produit | Pièces de raccordement posées avec un traitement d'eau : vannes, flexibles, by-pass, clapets, réducteurs de pression. | Flexible inox tressé 1" (u), Flexible inox 3/4" (u), Vanne à boisseau 1" (u), Vanne d'arrêt 3/4" (u), Bypass 3 vannes (u), Clapet anti-retour (u) … (20) |
| **Mesure et analyse de l'eau** | matériel | Instruments d'analyse (dureté, pH, conductivité, chlore) : outils de l'équipe, jamais facturés. | Test de dureté (TH) gouttes (boîte), Bandelettes TH (boîte), Titrage dureté TAC/TH (coffret), Conductimètre (u), TDS-mètre (u), pH-mètre (u) … (18) |
| **Outillage et consommables** | matériel | Petit outillage et fournitures de pose de l'équipe : outils de plomberie, étanchéité, bande de protection. | Clé à molette (u), Clé à sangle (u), Clé à tuyauter (u), Pince multiprise (u), Coupe-tube cuivre (u), Coupe-tube PER (u) … (19) |
| **EPI** | matériel | Équipements de protection individuelle de l'équipe. | Gants de protection (paire), Lunettes de protection (u), Chaussures de sécurité (paire), Bouchons d'oreille (boîte), Masque anti-poussière (boîte), Genouillères (paire) … (12) |

Règles de rangement :

- Type : adoucisseurs, osmoseurs, filtres, cartouches, résines, sel et UV sont des PRODUITS posés ou revendus (contrat d'entretien) ; instruments d'analyse, outils et EPI sont du MATÉRIEL.
- « Sel » est ambigu avec le sel de déneigement ou alimentaire : ici toujours Résines et régénération. « Sac » seul est trop vague : ne pas le mettre en mot-clé.
- « Filtre » est ambigu entre Filtres et préfiltres (corps/carter) et Cartouches de filtration (élément) : si le nom contient « cartouche » ou « élément », Cartouches ; si « carter », « corps », « boitier », Filtres.
- « Vanne » : vanne d'adoucisseur (tête de commande) = Adoucisseurs ; vanne de raccordement = Raccords. Qualifier avec « automatique » / « tete » pour la 1re.
- « Pompe doseuse » : Anti-calcaire / dosage si polyphosphate ; Désinfection si chlore ; Neutralisation si pH.
- « Osmose » à usage piscine ou industriel lourd reste ici ; un osmoseur de piscine est rangé en piscine.
- Un contrat d'entretien annuel (remplacement de cartouches, sel) revend souvent des produits « consommés » : mixte possible à la ligne.

Sources lues : https://www.espace-aubade.fr/fiche-conseil/quel-adoucisseur-d-eau-choisir.html, https://conseils.hellopro.fr/comment-entretenir-un-adoucisseur-d-eau-4075.html, https://www.domomat.com/guides/chauffe-eau-traitement-eau/entretien-adoucisseur-d-eau, https://www.bricomarche.com/c/plomberie-et-sanitaire/traitement-de-l-eau-et-adoucisseur/adoucisseur-et-filtre/131074

<a id="piscine"></a>
## 🏊 Pisciniste

Avant : Produits de traitement · Électrolyse · Filtration · Pompes · Liners · Robots · Couvertures · Éclairage

Ce qui change : Pack nouveau (aucune catégorie actuelle) : 12 catégories couvrant le pisciniste constructeur et l'entretien (traitement, analyse, régulation, filtration, pièces à sceller, chauffage, liner, éclairage, robots, sécurité, gros œuvre, outillage/EPI).

| Catégorie | Type | Ce qui y va | Exemples |
|---|---|---|---|
| **Produits de traitement de l'eau** | produit | Produits chimiques d'entretien et d'hivernage de la piscine : désinfection, équilibre, clarification, sel. | Chlore lent galets 250 g (seau 5 kg), Chlore choc granulés (seau 5 kg), Chlore multi-actions (seau 5 kg), Chlore liquide (bidon 20 L), Brome pastilles (seau), pH moins (seau 5 kg) … (20) |
| **Analyse et mesure** | matériel | Testeurs et instruments de mesure de la qualité de l'eau : outils de l'équipe, parfois revendus. | Photomètre piscine (u), Testeur DPD chlore et pH (u), Trousse d'analyse à gouttes (coffret), Bandelettes d'analyse 6 en 1 (boîte), Comprimés DPD (boîte), Réactif rouge de phénol (flacon) … (17) |
| **Électrolyseurs et régulation** | produit | Électrolyseurs au sel, régulateurs pH/chlore, pompes doseuses, cellules et sondes. Posés ou revendus. | Électrolyseur au sel 60 m³ (u), Électrolyseur 100 m³ (u), Cellule d'électrolyse (u), Sonde pH/Rx (u), Régulateur pH (u), Régulateur pH/Rx (multi) (u) … (18) |
| **Filtration et pompes** | produit | Filtres (sable, cartouche, verre), pompes de filtration et pièces de remplacement posés ou revendus. | Filtre à sable 6 m³/h (u), Filtre à sable 10 m³/h (u), Filtre à cartouche (u), Filtre à diatomées (u), Filtre à verre (u), Pompe de filtration 0,5 CV (u) … (22) |
| **Pièces à sceller et hydraulique** | produit | Pièces d'étanchéité et de circulation scellées dans la paroi, PVC pression, vannes et colle pour la tuyauterie. | Skimmer standard (u), Skimmer grande ouverture (u), Bonde de fond (u), Buse de refoulement (u), Prise balai (u), Buse d'aspiration (u) … (23) |
| **Chauffage de l'eau** | produit | Pompes à chaleur, réchauffeurs, échangeurs et pièces pour chauffer l'eau de la piscine. | Pompe à chaleur piscine 8 kW (u), Pompe à chaleur 12 kW (u), Pompe à chaleur 16 kW (u), Pompe à chaleur Inverter (u), Échangeur thermique inox (u), Réchauffeur électrique (u) … (18) |
| **Liner, PVC armé et revêtement** | produit | Revêtements d'étanchéité de bassin et colles, profilés et accessoires de pose. | Liner 75/100e uni (m²), Liner 75/100e imprimé (m²), Liner 85/100e armé (m²), PVC armé 1,5 mm (m²), PVC armé antidérapant (m²), Feutre géotextile (m²) … (19) |
| **Éclairage et équipements** | produit | Projecteurs, éclairages subaquatiques, nage à contre-courant, douches et équipements installés avec le bassin. | Projecteur LED blanc (u), Projecteur LED couleur (u), Ampoule LED PAR56 (u), Transformateur 12 V (u), Câble d'alimentation étanche (m), Coffret électrique piscine (u) … (18) |
| **Robots et nettoyage du bassin** | les deux | Robots de nettoyage, balais, aspirateurs manuels et épuisettes : matériel de l'équipe ou vendu au client. | Robot nettoyeur électrique (u), Robot hydraulique (u), Robot sans fil (u), Robot à pression (u), Câble de robot (u), Chariot de robot (u) … (19) |
| **Sécurité et couvertures** | produit | Couvertures, volets, abris, alarmes et barrières posés selon les normes de sécurité piscine. | Bâche à barres (m²), Bâche d'hiver opaque (m²), Volet roulant immergé (u), Volet hors-sol (u), Couverture solaire à bulles (m²), Abri de piscine bas (u) … (19) |
| **Construction et gros œuvre bassin** | produit | Matériaux de bassin : blocs, coques, béton, ferraillage, gaines et terrassement légers. | Bloc à bancher polystyrène (u), Bloc de béton (u), Coque polyester (u), Panneau acier galvanisé (u), Panneau PVC (u), Béton prêt à l'emploi (m³) … (19) |
| **Outillage, machines et EPI** | matériel | Outils de chantier piscine et protection de l'équipe, jamais facturés. | Pompe de vidange (u), Hydrocureur / aspirateur à eau (u), Lasure / outils de pose liner (lot), Aspirateur à liner (vide-liner) (u), Niveau à bulle (u), Niveau laser (u) … (20) |

Règles de rangement :

- Type : produits de traitement, pièces à sceller, pompes, filtres, liner, bâches et PAC sont posés ou revendus (PRODUIT) ; photomètres, robots d'atelier, outils et EPI sont du MATÉRIEL ; les robots peuvent être vendus au client : type MIXTE.
- « Pompe » est ambigu : pompe de filtration (Filtration), pompe doseuse (Électrolyseurs/régulation), pompe à chaleur (Chauffage) ; « pompe à chaleur » doit passer avant « pompe » seul.
- « Sonde » est ambigu : sonde pH/Rx (régulation) ou sonde de mesure (Analyse) ; sonde pH rangée en Électrolyseurs et régulation si installée à demeure.
- « Cartouche » : piscine → Filtration (cartouche filtrante) ; ne pas confondre avec les cartouches d'eau domestique du pack eau.
- « Vanne » : vanne 6 voies = Filtration ; vanne à boisseau PVC = Pièces à sceller.
- « Câble » est ambigu (robot, éclairage) : qualifier (« câble robot » / « câble étanche »).
- « Sel » = Produits de traitement ; « sel » d'un adoucisseur est du pack eau.
- Les produits chimiques sont des substances dangereuses : prévoir la FDS ; les produits d'hivernage et de traitement sont saisonniers (stock en fin de saison).

Sources lues : https://www.mypiscine.com/content/119-espace-pro, https://www.guide-piscine.fr/pro/annuaire-fournisseurs/, https://cdn.hayward.fr/production/media/8/2/6/1/abe762.pdf, https://hayward.fr/images/pdfs/catalogues/CATALOGUE_HAYWARD_2019_FR.pdf
