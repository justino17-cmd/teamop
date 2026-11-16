# Spécification de refonte — « Véhicules » et « Temps de travail » (groupe Personnel) — 16 novembre 2026

Pour : l'agent qui appliquera ceci dans `apercu/prototype-op-gestion.html`, sans me reparler.
Sources : le dossier d'étude `vehicules-temps-etude.md` (même dossier), deux propositions (« novice », « beauté ») et le code du prototype relu pour cette spécification (les numéros de ligne sont ceux du fichier après fusion du 16 novembre ; ils bougent, les NOMS de fonctions sont la référence).
Justin, mot pour mot : « Véhicule à refaire » ; « Temps de travail, c'est pas mal, mais mieux amélioré, plus simple, ce serait cool » ; une application « logique, simple, rapide, efficace à comprendre pour tout le monde, même pour les gens qui ne sont pas doués avec la technologie ». Références qu'il aime : Accueil, Planning, Absences et congés, Interventions, Clients, Devis, Comptabilité, Équipe.

---

## 0. Le principe, en dix lignes

1. **Chaque écran répond à UNE question, posée avec des mots de tous les jours, et la répond dans le premier écran** : Véhicules → « Lequel de mes véhicules a besoin de moi ? » ; Temps de travail → « Qui est là, qu'est-ce que je dois régler ? » ; Mon camion → « Mon camion est-il prêt, qu'est-ce que je dois y noter ? » ; Mes heures → « Mes heures sont-elles justes ? ».
2. **Une ligne = une chose, dite en une phrase, avec UN seul bouton : le geste logique de cet instant** (« Noter le rendez-vous », « Terminer à 16:48 »). Le reste est derrière (fiche, feuille, onglet, lien gris).
3. **Chaque fait n'est écrit qu'UNE fois** (la journée oubliée de Tom : une ligne, pas cinq ; l'échéance du Peugeot : une ligne, pas quatre).
4. **Le squelette est celui des écrans que Justin a validés** : surtitre + titre + une ligne grise + UN bouton noir en haut à droite ; chiffres qui sont des portes ; onglets segmentés (avec pastille rouge de nombre) ; UNE liste ; fiche en tiroir qui s'ouvre sur l'essentiel (phrase d'état, trois chiffres, une ligne de liens). § 1.
5. **Temps de travail devient « Aujourd'hui · Semaine · Mois »** (comme « À valider · Calendrier · Soldes »), avec une seule file « À régler » ; la grille de la semaine (ce que Justin trouve « pas mal ») reste sur ordinateur ; sur téléphone elle devient une liste (plus de double fabrication).
6. **Véhicules devient une liste vivante, une rangée par véhicule** (qui le conduit, son état en une phrase, son seul prochain geste) et **une fiche courte à trois onglets** (« À faire · Papiers · Dépenses »), au lieu d'un dossier de 3 253 px et 45 boutons.
7. **Le technicien a UN « Mon camion »** (stock ET véhicule) et UNE carte « Ma journée de travail » ; « Mes heures » passe de 3 004 px à deux onglets.
8. **Rien de ce qui protège le salarié, le client ou l'entreprise ne se perd** : motif obligatoire et trace des corrections, reconfirmation du salarié, mois verrouillé, heures en plus, échéances qui proposent la suivante, amende à désigner avant sa date, garage → Planning. Table § 6.
9. **Deux rubriques cessent d'être des îles** : une ligne chacune à l'Accueil, les mêmes mots dans la Paie, un lien partout où l'autre rubrique en parle.
10. **On tutoie** (le registre de tout le prototype : « Touche une case », « Ta journée »). Les deux propositions mélangeaient « vous » et « tu » : c'est « tu ».

---

## 1. La grammaire visuelle (relevée dans le CSS et les écrans validés — aucune classe ni couleur neuve sans raison)

Tout ce qui suit existe déjà dans `apercu/prototype-op-gestion.html` (lignes de feuille ~15-175). **On réemploie, on n'invente pas.**

| élément | classe / composant à réemployer | règle d'emploi |
|---|---|---|
| En-tête de page | `.tete` > `div` (`.surtitre` + `h1` + `span.gris` d'UNE ligne) + `.actions` | surtitre « Personnel » ; au plus UN `.btn` noir à droite (+ au plus un `.btn.gris` à sa gauche) ; téléphone : h1 28 px, boutons sous le titre |
| Chiffres du haut | `.kpis` > `button.kpi` > `<b>` (26 px) + `<span>` (14 px) ; variante 3 colonnes `.kpis.ptx-k3` | la tuile est un **bouton** qui ouvre un onglet ou un filtre ; le nombre ne prend de couleur que pour un sens (`.kpi.kpi-up b` orange = à faire) ; téléphone : 2 colonnes (3 chiffres : le 3ᵉ prend la rangée, ou `.ptx-k3` si les libellés tiennent) |
| Onglets | `.seg[role=tablist]` > `button[aria-pressed]` ; pastille `<span class="t-nb rouge">n</span>` (modèle : `vueAbsences`, « À valider 3 ») | la pastille compte ce qui ATTEND quelqu'un ; elle disparaît à 0 ; téléphone : `.seg` pleine largeur, boutons à parts égales, 44 px |
| Carte | `.carte` (+ `.carte>h3` : 13 px, majuscules, gris) | un bloc = une carte ; **jamais de carte dans une carte** |
| Ligne de liste | `.ligne` dans une `.carte` (flex, 12 px, filet) pour les listes denses ; `.ligne-clic` pour une rangée entièrement touchable ; modèle d'une rangée d'alerte : `.ve-u` (« À renouveler » d'Équipe) : pastille à gauche, `.fo-n` (titre gras + sous-ligne `.gris.petit`), chevron `.fo-chev` | titre en gras, sous-ligne grise 14 px, **état en pastille**, UN bouton `.btn.petit` à droite ; téléphone : le bouton passe SOUS le texte à sa largeur naturelle (règle de conteneur, § 1.1) |
| Pastille d'état | `.st` + `.st-v` (vert) `.st-o` (orange) `.st-r` (rouge) `.st-b` (bleu) `.st-p` (violet) `.st-g` (gris) | la couleur dit un SENS : vert en règle, orange à prévoir, rouge en retard, bleu information/demande, violet absence, gris neutre. Aucune autre teinte. |
| Boutons | `.btn` (noir, 46 px) · `.btn.gris` · `.btn.petit` (40 px, gestes de ligne) · `.btn.large` (56 px, LE geste d'une feuille) · `.btn.rouge` (suppression, contour rouge) · `.lien` (bleu, 44 px) | un seul noir par bloc ; le geste recommandé est noir, l'autre est un `.lien` ou `.gris` |
| Avatar | `.eq-av` (40 px, initiales, `--c` = couleur de la personne `H_GENS[k].c`) ; `.av` (36 px) | on voit « qui » sans lire |
| Navigation de période | `.st-barre-per` > `.st-nav` (« ‹ Semaine du … › ») | boutons 40 px ; 44 px au toucher |
| Tiroir (fiche) | `foOuvrir(html, true)` ; contenu : `.surtitre` + titre + `.fo-stats` (trois chiffres) + `.cmd-liens` (liens bleus) + `.seg` + blocs `.fo-bloc > .fo-r` | modèle : `eqFiche` (Équipe, validée). Les titres de bloc `.groupe` (bleu 13 px) ne sont gardés que sous un onglet, jamais empilés par dizaines : le défaut de l'ancienne fiche véhicule. |
| Feuille (panneau) | `ouvrirPanneau(html)` ; `.champ` + `.saisie` (16 px mini) ; `.actions` avec UN `.btn.large` | « ‹ Retour » vers la fiche quand il y en a une |
| Encadré | `.info` (bleu, information) ; `.info.fo-alerte` (orange) ; `.ok-bloc` (vert) | une phrase, jamais un paragraphe |
| Toast | `toast(texte, {lib:'Annuler', fn})` | toute écriture qu'on peut regretter porte « Annuler » |
| Dates / durées / montants | `jlong`, `jCourt`, `dFr`, `ptH` (« 8h05 »), `eur`, `tJours` | heures de la journée « 07:37 » ; durées « 8h05 » ; montants « 1 566 € » ; **aucun sigle** (« hors taxes », « contrôle technique ») |

**Échelle d'espaces** (celle de la feuille de style) : 4 · 6 · 8 · 12 · 16 · 18 · 22. **Jour ET nuit** : mêmes structures ; couleurs uniquement par les variables (`--vert`, `--orange`, `--rouge`, `--bleu`, `--violet`, `--doux`, `--trait`, `--surf`, `--lien`) ; JAMAIS de teinte écrite en dur (le nuit éclaircit déjà ces variables).

### 1.1 Ajouts CSS autorisés (la liste complète — le reste est interdit)
1. Une règle de **conteneur** : la carte de liste (`.vh-liste`, `.tt-liste`) pose `container-type:inline-size` ; sous 460 px de conteneur la rangée passe sur deux niveaux (texte puis bouton, `flex-basis:100%`). Raison (règle du dépôt) : sur iPad portrait le menu latéral mange 272 px, un `@media` sur l'écran ne le voit pas.
2. La plaque en pastille à chasse fixe : la classe existante **`.ve-plaque`** (`vueVehicules`, `vehFiche`) est reprise telle quelle, pas redessinée (aucune classe `.vh-plaque` à créer).
3. Les hauteurs de rangée (≥ 58 px) et cibles 44 px sur les cases du matériel de sécurité.
Rien d'autre. Pas de couleur neuve, pas de rayon neuf, pas d'ombre neuve.

---

## 2. Les désaccords entre les deux propositions, tranchés en une phrase chacun

| # | désaccord | décision | pourquoi |
|---|---|---|---|
| D1 | Véhicules : liste en lignes (novice) ou grille de cartes (beauté) | **Lignes dans UNE carte** | quatre véhicules disent chacun un état et un geste : une carte à hauteur forcée a déjà montré sa moitié vide ; les lignes tiennent dans 900 px et passent à 12 véhicules |
| D2 | Temps : quatre onglets avec « À régler » (beauté) ou trois avec « À régler » dans Aujourd'hui (novice) | **Trois onglets, « À régler » en carte de tête d'Aujourd'hui, pastille rouge sur l'onglet** | c'est exactement « À valider · Calendrier · Soldes » ; un onglet de plus à ouvrir est un geste de plus |
| D3 | Semaine sur téléphone : bande de 7 cases (beauté) ou liste puis feuille (novice) | **Liste une rangée par personne, feuille des sept jours** | les cases font 34-44 px (sous le plancher tactile) et la grille « 4 + 3 » a été le défaut ; la liste des sept jours est la même que celle de « Mes heures » |
| D4 | Fiche véhicule : trois onglets (novice) ou quatre avec Historique (beauté) | **Trois : « À faire · Papiers · Dépenses »** ; l'historique devient « Déjà fait » en bas de « À faire » | l'historique est rare ; trois onglets tiennent sur 320 px sans se couper |
| D5 | Mois : carte à trois étapes (beauté) ou un bouton qui change (novice) | **Un bouton qui change** ; **le verrouillage reste dans Comptabilité › Paie** | la Paie (validée) a déjà ses étapes ; deux endroits pour verrouiller seraient un doublon |
| D6 | Mes heures : trois onglets (beauté) ou deux (novice) | **Deux : « Ce mois-ci · Mes fiches de paie »**, la semaine en cours en tête de la liste | « Cette semaine » est la première ligne de la liste, pas un onglet |
| D7 | Mon camion : trois grosses tuiles (beauté) ou trois boutons empilés (novice) | **Trois boutons empilés pleine largeur (48 px)** | « Un souci avec le camion » dans le tiers d'un écran de 320 px passerait sur trois lignes |
| D8 | Chiffres de la liste Véhicules | **« 3 sur 4 en service » · « 3 à faire » (orange) · « 1 566 € dépensés en octobre (hors taxes) »** ; le coût au kilomètre vit sur la fiche et dans la feuille « Ce que coûtent les véhicules » | la dépense du mois est la question d'un gérant ; le kilomètre est une analyse, derrière une porte |
| D9 | Libellé de validation : « Valider la semaine » (novice) ou « Valider les 4 personnes en règle » (beauté) | **« Valider les 4 personnes en règle »** | l'ancien « Valider 4 semaines » mélangeait personnes et semaines |
| D10 | Heure : « 16h48 » (novice) ou « 16:48 » (beauté) | **« 16:48 »** pour une heure du jour, **« 8h05 »** pour une durée | c'est ce que fait déjà le prototype (Interventions, Équipe) |
| D11 | Le bouton de la rangée « Noter le rendez-vous » ou « Noter le contrôle » | **Le geste suivant dans l'ordre des choses** : pas de rendez-vous noté → « Noter le rendez-vous » ; rendez-vous noté → « Noter le contrôle technique » ; « C'est déjà fait ? Noter le contrôle technique » est un lien au bas de la feuille du rendez-vous | un seul bouton, jamais deux ; le cas rare coûte un geste de plus |
| D12 | Le gérant qui pointe : une ligne « Toi » (beauté) ou la carte complète (novice) | **La même fonction `ptxCarteSalarie('marc')`, posée en tête d'Aujourd'hui**, seulement si `PT_GENS` contient le gérant (c'est aujourd'hui le cas) | une seule mécanique (pause et fin proposée comprises) ; l'ancien bouton « Début de ma journée » sans pause disparaît |
| D13 | Heures en plus : « +5h50 sup. » ou « dont 5h50 en plus » | **« en plus »**, jamais « sup. » | mot d'artisan |
| D14 | Paie : la carte « Avant la paie » du Mois reprend-elle les étapes de la Paie ? | **Non** : une phrase de situation + UN bouton qui renvoie à la Paie | pas de seconde source de vérité |

---

## 3. VÉHICULES

### 3.1 Qui voit quoi (inchangé, voir la question 1 de § 11)
Gérant : tout. Bureau (rôle `gestion`) : rien dans le menu final (aujourd'hui `aller('vehicules')` la renvoie sur Comptabilité) — **inchangé par cette spécification**. Technicien : « Mon camion » (barre du bas) et la ligne « Mon camion » de « Ma journée ». Client : rien.

### 3.2 V1 — La liste (route `vehicules`, remplace `vueVehicules` + `vxPost` + `vxBandeHtml` + `vxClassement`)

**Question à laquelle l'écran répond** : « Un de mes véhicules a-t-il besoin de moi, et lequel ? »

**Ordinateur** (cible : tout dans 900 px avec 4 véhicules ; 1 470 px aujourd'hui) :
- `.tete` : surtitre « Personnel » · h1 « Véhicules » · ligne grise **qui répond** : « 3 véhicules sur 4 en service. Le Kangoo est au garage jusqu'au lundi 2 novembre. » ; tout va bien : « Tous tes véhicules sont en règle. » ; aucun véhicule : « Tes véhicules, leurs papiers et ce qu'ils coûtent. ». À droite : `.btn.gris` « Noter un plein » (`data-vh="plein|"`), `.btn` noir « ＋ Nouveau véhicule ».
- `.kpis` (3 boutons-tuiles) :
  1. **« 3 sur 4 »** / « en service » → onglet Tous.
  2. **« 3 »** / « à faire » (orange si > 0, noir sinon ; « 0 à faire » vert) → onglet À faire.
  3. **« 1 566 € »** / « dépensés en octobre (hors taxes) » → feuille « Ce que coûtent les véhicules » (§ 3.5-L).
  Disparaissent : « 515 € de stock à bord » (le stock vit dans Dépôts et camions), « 0,23 €/km » (dans la feuille L et sur la fiche).
- `.seg` : « Tous · À faire (pastille rouge = nombre) · Au garage (pastille grise) ». Un champ « Chercher un véhicule… » ne paraît qu'à partir de 9 véhicules (comme Clients).
- UNE `.carte` à rangées. **Une rangée = un véhicule**, toute la rangée ouvre la fiche (`data-vh="fiche|id"`), sauf le bouton :
  `[.eq-av du conducteur] [.fo-n : nom en gras « Renault Trafic L2H1 » ; sous-ligne grise « <plaque en .vh-plaque> · Sophie Martin · 48 210 km »] [phrase d'état] [.btn.petit]`.
  - **Phrase d'état** = la plus grave de ces situations, dans cet ordre, en une `.st` courte à droite + (si besoin) la précision sur une 3ᵉ ligne grise :
    1. souci signalé : `.st-r` « Souci signalé » · « Tom signale : voyant moteur allumé · hier 17:10 » · bouton **« C'est réglé »** (`vxSouciRegle`) ;
    2. au garage : `.st-o` « Au garage » · « Chez Renault Pro jusqu'au lundi 2 novembre · 1 intervention de Tom à déplacer » · bouton **« Le remettre en service »** (`vxRetourPanel`) ; lien gris sous le texte « Voir au planning ›» (`vxPlanningVoir`) ;
    3. échéance en retard : `.st-r` « En retard » · « Révision en retard de 3 jours » ;
    4. échéance proche (paliers actuels de `vxUrg` : ≤ 7 j rouge ; ≤ 60 j orange pour contrôle technique et assurance, ≤ 30 j ou ≤ 1 500 km pour entretien et matériel) : `.st-o` « À faire » · « Contrôle technique dans 12 jours » ;
    5. sinon : `.st-v` « En règle » · « La prochaine échéance est l'assurance, dans 41 jours ».
  - **Bouton de la rangée** (D11) : situations 3 et 4 → « Noter le rendez-vous » tant qu'aucun rendez-vous n'est noté (`vxRdv` réécrite, § 3.5-C), puis « Noter le contrôle technique » / « Noter la révision » / « Noter le contrôle du matériel » / « Noter le renouvellement » (selon l'échéance, `vxFaitPanel`). Situation 5 : pas de bouton, un chevron `›`.
  - **Rangée de tête « Les 4 véhicules »** (assurance groupée) : quand l'assurance est à ≤ 60 jours ; en tête de Tous et de À faire : avatar = pictogramme camion en traits, titre « Assurance MAAF Pro · les 4 véhicules », sous-ligne « Échéance le 11 décembre, dans 41 jours », bouton **« Noter le renouvellement »** (`vxFaitGroupe`, un geste pour les quatre). Les rangées individuelles ne répètent plus cette assurance (elles passent à la 2ᵉ échéance).
  - **À faire** = seulement les rangées qui ont un bouton, la plus urgente d'abord. **Au garage** = les véhicules au garage, retour prévu en précision.
  - Le nom ne se coupe jamais (il passe à la ligne) ; la plaque garde sa ligne.
- États vides : aucun véhicule → tuile ronde 44 px (pictogramme camion en traits) + « Ajoute ton premier véhicule » (17 px gras) + « Tu verras ses papiers, ses pleins et ce qu'il coûte au kilomètre. Le contrôle technique et l'assurance te préviennent à l'avance. » + `.btn` « ＋ Nouveau véhicule » ; À faire vide → coche verte + « Rien à faire pour le moment. » + « Prochaine échéance : assurance, dans 41 jours. » ; Au garage vide → « Aucun véhicule au garage. Tous tes véhicules sont en service. »

**Téléphone** (cible : ≤ 1 200 px avec 4 véhicules ; 3 128 px aujourd'hui) : h1 28 px ; « ＋ Nouveau véhicule » noir à droite du titre ; **« Noter un plein » en `.btn.gris` pleine largeur sous le titre** (le geste le plus fréquent) ; la ligne grise tient sur deux lignes ; les trois chiffres sur UNE rangée (`.ptx-k3`) avec libellés courts (« en service », « à faire », « dépensés en octobre ») ; `.seg` pleine largeur ; chaque rangée = bloc de 3 niveaux (nom + plaque ; conducteur · km ; phrase d'état colorée) puis, seulement s'il y a un geste, UN `.btn.petit` sous le texte, à gauche (jamais deux gros boutons empilés : c'est ce qui rendait l'ancienne bande « À faire maintenant » haute d'un écran et demi). La barre du bas ne recouvre jamais un bouton de rangée (marge basse de la liste = hauteur de barre + encoche).

**Rôle** : gérant seul (voir 3.1).

### 3.3 V2 — La fiche d'un véhicule (remplace `vehFiche` + son enveloppe `vx`)
Tiroir large (`foOuvrir(…, true)`), modèle `eqFiche`. Ouvert par : une rangée, une ligne de l'Accueil, un lien de Tâches (`vehicules|veh1`), le bouton « Ouvrir le véhicule » de l'Historique, « Son camion » de la fiche Équipe. **Cible : tout le premier écran de 900 px ; ≤ 1 700 px pour l'onglet À faire (3 253 px et 45 boutons aujourd'hui).**

**En-tête**
- `.surtitre` « GH-482-KL · 2022 · GAZOLE » ; titre « Renault Trafic L2H1 » ; `.btn.gris.petit` « Modifier la fiche ».
- **Une phrase d'état**, grosse, colorée seulement si elle compte : « Le contrôle technique est dans 12 jours. Aucun rendez-vous n'est noté. » (orange) ; « Tout est en règle. La prochaine échéance est l'assurance, dans 41 jours. » (gris) ; « Ce véhicule est au garage depuis le 28 octobre. » (orange). Dessous, **le même bouton noir que sur la rangée** (« Noter le rendez-vous »).
- Si **souci signalé** ou **au garage** : un `.info.fo-alerte` tout en haut : « Tom a signalé un souci : voyant moteur allumé · hier 17:10 » + « C'est réglé » ; ou « Au garage · Entretien · Renault Pro · retour prévu lundi 2 novembre » + `.btn.petit` « Le remettre en service » + lien « Voir au planning › » + la ligne « 1 intervention de Tom à déplacer ».
- `.fo-stats` (3 chiffres) : **« 48 210 km »** (légende « kilométrage · relevé le 6 octobre ») · **« 0,34 € »** (« le kilomètre, sur 12 mois » ; « — » + « pas encore assez de relevés » tant que `vxCalcCout` ne peut pas) · **« 3 »** (« à remettre à bord » ; si aucun manque : « 6 articles à bord »).
- 3 `.btn.gris.petit` : **« Noter un plein »**, **« Relever le compteur »**, **« Mettre au garage »** (devient « Le remettre en service »). Téléphone : 2 + 1.
- `.cmd-liens` : « Sophie Martin › » (fiche Équipe), « Changer de conducteur », « Stock du camion › » (`data-sk="lieu|…"`, Dépôts et camions), « Voir au planning › » (seulement s'il est au garage).
- `.seg` : **« À faire · Papiers · Dépenses »**.

**Onglet À faire**
1. Souci et garage (si présents, déjà en tête de fiche : pas répétés).
2. **« Les échéances »** : quatre rangées `.fo-r` (nom · date en gris · phrase colorée · UN bouton au libellé UNIQUE) :
   « Assurance MAAF Pro — 11 décembre 2026 — dans 41 jours — **Noter le renouvellement** » ; « Révision — dans 62 jours ou 1 790 km — **Noter la révision** » ; « Matériel de sécurité — dans 141 jours — **Noter le contrôle du matériel** » (ouvre la feuille des huit cases, § 3.5-F) ; « Contrôle technique — 24 mai 2027 — **Noter le contrôle technique** ». Seule la ligne la plus urgente porte un bouton noir, les autres un `.gris`. Fini les deux « Contrôle fait » identiques.
3. **« Déjà fait »** : les trois dernières choses notées (contrôle, passage au garage, changement de conducteur) ; « Voir tout l'historique » déplie le reste (c'est l'ancien « Historique du véhicule » : `vxHistoBloc`, `v.hist`, `v.immoHist`, `v.anc`, quatre derniers relevés).

**Onglet Papiers**
- « Assurance : MAAF Pro · contrat FL-77120 · jusqu'au 11 décembre 2026 ».
- **« Documents »** (`vxDocsBloc`) : tant qu'aucun n'est ajouté, UNE ligne « Aucun document pour l'instant : carte grise, attestation d'assurance, rapport du contrôle technique » + `.btn.gris.petit` « Ajouter un document » (la feuille demande LEQUEL puis photo ou fichier, § 3.5-H) ; ensuite une ligne par document, vignette, « Retirer ». Fini les trois lignes « Pas encore ajouté ».
- **« Amendes et accidents »** (`vxIncidentsBloc`) : `.btn.gris.petit` « Une amende », « Un accident » ; puis la liste (« Amende de 135 € du 12 octobre · à désigner avant le 26 novembre » en `.st-o`). Plus besoin de descendre de trois écrans.

**Onglet Dépenses**
- `.seg` de période : « Ce mois-ci · 12 mois · Tout » (« Tout » = depuis le premier relevé du compteur ; une phrase le dit UNE fois sous les chiffres, seulement si des mois sont vides pour cette raison — c'était le mystère des mois « mai » et « juin » vides).
- Phrase-bilan : « 2 360 € dépensés sur 12 mois, soit 0,34 € du kilomètre et 98 € par mois. » (« 8,2 litres aux 100 km » seulement quand deux pleins avec litres existent : jamais un tiret vide).
- Histogramme de 6 mois (`vxCoutBloc` : carburant, entretien, assurance ; trois teintes de la même famille, légende de trois mots).
- Liste `.fo-r` : date, libellé, montant ; **toucher une ligne** ouvre la feuille « Cette dépense » (`vxFraisPanel`) avec « Enregistrer », « Corriger » et « Supprimer cette dépense » (`.btn.rouge`, toast « Annuler ») — les douze liens « Modifier / Supprimer » nus disparaissent ; lien « Voir dans les achats › » ou « Voir la note de frais › » quand la ligne vient de là.
- Bas : `.btn.gris.petit` « Exporter en tableau » (`vxCsv`). (« Noter un plein » n'est PAS répété ici : il est en haut de fiche.)

**Téléphone** : feuille plein écran avec « ‹ Retour » ; même ordre en une colonne ; les rangées d'échéances empilent texte puis bouton quand le conteneur est sous 460 px ; **cases du matériel à 44 px** (jamais 20) ; aucun libellé de bouton sur deux lignes dans une pilule (« Relever le compteur » a sa pilule assez large ou passe seul sur sa rangée). Cible : ≤ 1 400 px pour À faire.

### 3.4 V3 — « Mon camion » du technicien (route `moncamion`, onglet « Camion » de la barre du bas ; remplace `vxMonCamion` posée dans « Ma journée »)

**Question** : « Mon camion est-il prêt, qu'est-ce que je dois y noter ? ». Les deux propositions étaient d'accord ; l'étude a mesuré le défaut (la carte « Mon véhicule » est enterrée à 1 600 px de « Ma journée » ; l'onglet Camion ne parle que du stock).

**Téléphone (l'écran premier ; sur ordinateur la même colonne, centrée, 640 px maximum)** :
- `.tete` : surtitre « Renault Trafic L2H1 · GH-482-KL » ; h1 « Mon camion » ; **une phrase d'état colorée** : « Tout est en règle. » (vert) ; « Le contrôle technique est dans 12 jours. Le bureau s'en occupe. » (le technicien est prévenu, il n'a rien à faire) ; « Ton camion est au garage jusqu'au lundi 2 novembre. Tu prends le Citroën Berlingo. » ; sans camion : « Aucun camion ne t'est confié. Demande au bureau. »
- **Carte 1 « À bord »** — **le contenu de la page « Mon camion » actuelle, SANS CHANGER UN LIBELLÉ NI UNE FONCTION** : « J'ai pris à l'atelier · J'ai utilisé · Il me manque », l'alerte « Bouteille presque vide », « Il manque à bord · 3 » (lignes « Je l'ai pris » / « Il me manque »), « Tout ce qu'il y a à bord · 6 articles » replié, « Mes envois » replié. Ce bloc appartient à la refonte de Dépôts et camions (Matériel) : la présente spécification le **réemploie** tel que l'autre refonte le livre et n'y ajoute rien. « 3 manquent à bord » ne se dit qu'ici et dans la ligne de Ma journée, une seule formule (« Il manque à bord · 3 »).
- **Carte 2 « Le camion »** : trois boutons pleine largeur (48 px) : **« Noter un plein »** (`.btn` noir, `data-vh="plein|veh1"`), **« Relever le compteur »** (`.btn.gris`), **« Un souci avec le camion »** (`.btn.gris`) ; dessous en gris : « 48 210 km · relevé le 6 octobre ». Plus d'émoji dans les libellés (les autres icônes sont des traits).
- Les « Messages du bureau » ne sont **plus répétés** ici : ils restent sur « Ma journée » et dans la cloche (c'était le même rappel de pointage affiché deux fois).
- Les rappels au conducteur à 30 et 7 jours (`vxNotifs`) restent dans la cloche et alimentent la phrase d'état.

**« Ma journée »** (`vueMaJournee`) : la carte « Mon véhicule » (300 px) ET le raccourci stock « Mon camion — N articles à remettre à bord » sont REMPLACÉS par **UNE ligne de la largeur de l'écran** sous « Ma journée de travail » : `.ligne-clic` « **Mon camion** · tout est en règle · 3 articles à remettre à bord ›» (ou « … contrôle technique dans 12 jours ›»). Toucher ouvre l'onglet Camion.

**Ordre des blocs sur Camion** : « À bord » avant « Le camion » (le geste de tous les jours est le stock ; le plein est hebdomadaire) — mais la phrase d'état et la ligne « Le camion » sont visibles sans défiler sur 390 × 844 (la carte « À bord » reste sobre : boutons + alerte ; les listes sont repliées).

**Gestes (barre du bas = 1)** : un plein 3 (Camion, Noter un plein, Enregistrer), sans défiler ; relever le compteur 3 ; un souci 4 ; « J'ai pris à l'atelier » 2 (inchangé) ; voir ce qu'il y a à bord 1.

### 3.5 V4 — Les feuilles (toutes via `ouvrirPanneau`, un `.btn.large` en bas, « ‹ Retour » vers la fiche ; champs à 16 px ; clavier numérique pour montants et kilomètres)

Mêmes contenus sur ordinateur (panneau à droite) et téléphone (feuille qui monte, ≤ 90 % de la hauteur). **Aucune feuille ne dépasse 6 champs visibles à l'ouverture.** Les fonctions métier existantes (`vxFaitOk`, `vxPleinOk`, `vxGarageOk`…) sont conservées : on refait ce qu'on VOIT.

- **A. « Nouveau véhicule »** (`vxNouveauPanel` / `vxCreerOk`) — **quatre champs** : la plaque ; marque puis modèle (liste + saisie libre) ; qui le conduit (liste de l'équipe, « Personne pour l'instant » accepté ; **la liste vient de l'équipe réelle, plus du tableau figé `vxListeConducteurs` sans Julie**) ; les kilomètres. Deux gros boutons « Essence ou gazole · Électrique ou hybride » pour l'énergie. Sous un repli « Ajouter plus tard » (replié par défaut) : assurance (compagnie, fin), prochain contrôle technique, dernière révision (date + kilomètres) ; le contrat et l'intervalle de révision ne sont PLUS demandés : « Révision proposée tous les 15 000 km ou 12 mois · Changer » ouvre « Modifier la fiche ». Bouton « Ajouter le véhicule ». Toast : « Véhicule ajouté. Il lui manque l'assurance et le contrôle technique : ils apparaîtront dans À faire. » (+ « Annuler »). Le lieu de stock « Camion GH-482-KL » est créé dans Dépôts et camions comme aujourd'hui ; **sa dotation suit le métier de l'entreprise** (plus de `dot:'clim'` écrit en dur ; Clim Services 17 reste « clim »).
- **B. « Noter un plein »** (`vxPleinPanel` / `vxPleinOk`) — véhicule (**déjà choisi** pour un technicien ; pour le gérant, le dernier utilisé) ; « Qu'est-ce que c'est ? » en quatre gros boutons (deux rangées de deux) **« Carburant · Recharge · Garage ou entretien · Péage ou parking »** ; « Montant payé » (légende grise « toutes taxes comprises ») ; « Kilomètres au compteur » (proposé : le dernier relevé) ; « Litres » **seulement** pour Carburant et Recharge, marqué « facultatif », le prix au litre se calcule sous le champ ; « Payé avec » en deux boutons **« La carte de l'entreprise · Mon argent »** (le second crée une note de frais « à valider ») ; bouton court **« Photo du ticket »** (la phrase de 15 mots disparaît ; sans photo, la tâche « Retrouver le ticket » reste et se dit en gris sous le bouton) ; la date est aujourd'hui, lien « Un autre jour ». Bouton « Enregistrer le plein ». Onze champs deviennent 3 champs + 2 choix. Écrit l'achat (comptes 6061 carburant, 6155 entretien, 616 assurance, 625 péage) et met le kilométrage à jour, comme aujourd'hui.
- **C. « Noter le rendez-vous »** (`vxRdv`, **réécrite pour dire vrai** : l'ancienne ne prenait aucun rendez-vous, elle créait une tâche dans 3 jours) — « Quel jour ? » (date), « Quel garage ? » (facultatif, proposé d'après le dernier passage) ; crée la tâche À CETTE DATE pour la personne qui note (clé `veh-<id>-<échéance>` / `vrdv-…` inchangée : les tâches ne se doublent pas) ; la phrase d'état passe à « Rendez-vous au garage le jeudi 12 novembre ». Lien en bas : « C'est déjà fait ? Noter le contrôle technique ».
- **D. « Noter le contrôle technique » / « la révision » / « le renouvellement » / « le contrôle du matériel »** (`vxFaitPanel` / `vxFaitOk`) — date (aujourd'hui), kilomètres, montant payé (facultatif), puis la phrase **« Prochain contrôle : le 31 octobre 2028 (deux ans après). Remplace par la date écrite sur le rapport si elle est différente. »** ; bouton « Enregistrer ». Ferme la tâche liée, propose la suivante, écrit l'achat si un montant est saisi : **inchangé**.
- **E. « Les 4 véhicules : noter le renouvellement »** (`vxFaitGroupe`) — une date, une prime ; les quatre sont mis à jour.
- **F. « Matériel de sécurité »** (`vxMatFait`, `vxMatTout`, `vxCommander`) — huit lignes à **44 px** avec interrupteur (extincteur, gilet, triangle, trousse de secours, roue de secours, constat amiable, lampe, câbles de démarrage) ; deux boutons « Tout est là » (noir) et « Il manque quelque chose » ; ce qui manque se liste, « Les commander » crée la demande d'achat comme avant. Plus de huit cases de 20 px au milieu de la fiche.
- **G. « Relever le compteur »** (`vxKmPanel` / `vxKmOk`) — UN champ de kilomètres, le dernier relevé en grisé ; « Le compteur ne peut pas être plus bas que 48 210 km (relevé le 6 octobre). » ; au-delà de 3 000 km d'écart : « 52 600 km ? Il y a 4 390 km depuis le 6 octobre. » boutons « Oui, c'est bien ça » / « Je corrige ». **Inchangé** (règle du compteur).
- **H. « Ajouter un document »** (`vxDocAjouter`) — « Lequel ? » (carte grise, attestation d'assurance, rapport du contrôle technique), photo ou fichier.
- **I. « Mettre au garage »** (`vxGaragePanel` / `vxGarageOk`) — « Pourquoi ? » (Entretien · Panne · Accident · Autre), « Quel garage ? », « Rendu prévu le », « Véhicule de remplacement » (les autres véhicules, « Aucun » par défaut) ; dessous la liste « Ces interventions sont touchées : … » et « Tu pourras les déplacer au Planning juste après. » ; bouton « Mettre au garage ». **« Le remettre en service »** (`vxRetourPanel`) : date de retour, kilomètres, montant de la facture (facultatif ; part aux achats, compte 6155).
- **J. « Changer de conducteur »** (`vxCondPanel`) — « Qui ? » (liste de personnes à puce d'initiales), « À partir du » ; l'ancien est gardé, le stock du camion suit.
- **K. « Modifier la fiche »** (`vxModifPanel`) — marque, modèle, énergie, année, conducteur, assurance (compagnie, contrat, fin), contrôle technique, **intervalle de révision** (km, mois) ; « Supprimer ce véhicule » en bas (`.btn.rouge`, confirmation). Seul endroit où « Hors service » s'atteint (véhicule vendu ou en panne définitive).
- **L. « Ce que coûtent les véhicules »** (porte des deux derniers chiffres de la liste) — les véhicules du moins cher au plus cher au kilomètre, **UNE couleur neutre pour les barres** (la barre dit la taille, pas une alerte : l'ancien classement peignait quatre barres de la même couleur d'alerte), en légende : « Sur 12 mois, assurance comprise, pour les kilomètres relevés. » ; bouton « Exporter en tableau ». C'est l'ancien « Les plus chers au kilomètre », rangé derrière un chiffre.
- **M. « Une amende »** (`vxAmendePanel`) — jour, montant, qui conduisait (proposé d'après l'historique), « À désigner avant le » (45 jours proposés) ; crée la tâche. **« Un accident »** (`vxSinistrePanel`) — jour, qui conduisait, lieu, l'autre personne ou l'assurance, franchise (facultative) ; crée la tâche « Déclarer l'accident à l'assurance ».
- **N. « Un souci avec le camion »** (technicien, `vxSouciPanel`) — « Qu'est-ce qui ne va pas ? » en quatre boutons (Un voyant s'est allumé · Un pneu · Un choc · Autre chose), une ligne de texte facultative, « Photo » ; bouton « Prévenir le bureau ». Crée la tâche urgente du gérant + la notification, comme aujourd'hui.

**Mots** : on dit « Noter » (un plein, le rendez-vous, le contrôle, une amende), « Au garage » (« Immobilisés » disparaît ; « Hors service » n'est plus un choix de départ), « À faire » (« échéances à prévoir » disparaît ; « Les échéances » reste comme titre du bloc dans la fiche), « Un accident » (« Sinistre » disparaît), « Dépenses » (« Frais »), « Prévenir le bureau », « à bord » (« stock à bord » disparaît), « les véhicules » (« la flotte » disparaît des phrases).

---

## 4. TEMPS DE TRAVAIL

### 4.1 Qui voit quoi
Gérant : « Temps de travail » (menu Personnel). Salarié (technicien, chef d'équipe) : **« Ma journée de travail »** dans « Ma journée » et **« Mes heures »** (barre du bas « Heures »). Bureau : rien (inchangé, voir § 11 question 1). Karim, chef d'équipe, garde le menu du technicien (hors périmètre).

### 4.2 T1 — Le cadre (route `pointage`, remplace `vuePointage` et ses TROIS enveloppes)
- `.tete` : « Personnel » · h1 « Temps de travail » · ligne grise : « Aujourd'hui, samedi 31 octobre : 1 personne au travail, 1 absente. » (jamais la phrase sur le Code du travail). À droite : **`.btn` noir « ＋ Ajouter une journée »** (pointage oublié, § 4.6-C). Disparaissent : le bandeau rouge « Tom n'a pas fermé… », le bandeau bleu « La paie du mois est dans Comptabilité › Paie », la ligne « En ce moment : … », le bouton « Début de ma journée » (il devient la carte de tête, D12).
- `.kpis` (4 boutons) : **« 1 · au travail »** · **« 2 · pas encore commencé »** · **« 1 · absent »** (accord : « absente ») → onglet Aujourd'hui (la liste « Qui est où » se filtre sur ce chiffre) ; **« 3 · à régler »** (orange dès qu'il est > 0 ; vert « 0 à régler ») → ouvre la carte « À régler ».
- `.seg` : **« Aujourd'hui [pastille rouge = nombre de lignes de À régler] · Semaine · Mois »**. À l'ouverture : toujours Aujourd'hui.
- Cibles : **Mac ≤ 1 300 px** (2 022 aujourd'hui) ; **iPhone ≤ 2 000 px** (4 229) ; au plus **25 boutons** par onglet (69).

### 4.3 T2 — Onglet « Aujourd'hui » (remplace `ptxAuj`, `ptxSignales`, la carte « À regarder », la ligne « À fermer », le bandeau)

1. **Si le gérant pointe** : en tête, `ptxCarteSalarie('marc')` — **la même fonction que sur le téléphone du salarié** : « Tu n'as pas encore commencé. Il est 10:40 · ta première intervention est à 08:30 » + `.btn.large` « Je commence ma journée » + lien « J'ai commencé plus tôt » ; en cours : « Commencée à 08:05 · 2h35 » + « Pause » / « Je termine » ; en pause : « Je reprends » ; hier oublié : « Fin d'hier ? ».
2. **Carte « À régler · 3 »** — la SEULE file de ce qui attend le gérant. Une rangée par SUJET (pas par fait), triée du plus pressant au moins pressant ; chaque rangée = pastille + phrase + UN `.btn.petit` noir (le geste recommandé) + au plus un `.lien` gris :
   - `.st-r` **« À terminer »** · « Tom n'a pas terminé sa journée du vendredi 30 octobre. Il a commencé à 07:55. » · **« Terminer à 16:48 »** (16:48 = `ptxHabFin` / `ptxFinPropose` : sa fin d'habitude sur ses quatre dernières semaines, **jamais l'heure qu'il est** ; UN geste, avec « Annuler » dans le toast) · lien « Lui demander son heure » (`ptxDemander` : envoie le rappel) · lien « Choisir une autre heure » (ouvre § 4.6-B).
   - `.st-b` **« Demande »** · « Tom demande une correction : mercredi 28, il a fini à 17:40 et non à 16:42. “J'ai oublié de pointer en partant chez le client.” » · **« Accepter 17:40 »** (`ptxCorriger` : UN geste ; la trace est écrite, Tom devra reconfirmer ; le toast le dit) · lien « Voir la journée ».
   - `.st-o` **« À regarder »** · « Karim a des journées trop longues cette semaine : mercredi 13h05, jeudi 11h40 · 48h45 en tout. » · `.btn.gris.petit` « Voir la semaine » (feuille de sa semaine, § 4.4) · `.lien` « La règle » (§ 4.6-D). **Les quatre alertes légales de Karim (10 h par jour, 11 h de repos, 48 h par semaine, deux lignes pour le même jeudi) deviennent UNE ligne par personne et par semaine** (`ptAlertes` regroupé par `k` + semaine) ; la case rouge de la grille et la pastille de la liste de la semaine gardent la marque, mais ne répètent plus la phrase.
   - `.st-o` **« À regarder »** · « Sophie avait une intervention vendredi et n'a pas pointé. » · « Ajouter sa journée » (§ 4.6-C préremplie).
   - Un salarié qui a une demande ET une journée ouverte : deux rangées (deux gestes distincts).
   - **État vide** : tuile ronde 44 px verte (coche) + « Tout est réglé » (17 px, 700) + « Aucune journée à terminer, aucune demande en attente. » ; pas de bouton.
3. **Carte « Qui est où · samedi 31 octobre »** — **une rangée par personne** (avatar `.eq-av` · nom gras + sous-ligne grise · pastille d'état · geste) : « Karim Benali — au travail depuis 08:05 » `.st-v` « Au travail » ; « Sophie Martin — devait commencer à 08:30 · rappel envoyé à 09:30 » `.st-o` « Pas encore commencé » + `.btn.gris.petit` « Lui rappeler » ; « Tom Leroy — devait commencer à 07:30 » idem ; « Léa Roux — en congé payé jusqu'au mardi 3 novembre » `.st-p` « Absente » (la rangée renvoie à Absences et congés) ; une pause : `.st-b` « En pause depuis 12:10 » ; une journée finie : `.st-g` « Journée finie · 07:37–16:42 ». Les personnes que le planning n'attend pas : une ligne grise en bas « Julie n'est pas attendue aujourd'hui. » (`.faible`). Les rangées sont triées : à surveiller (pas commencé) d'abord, puis au travail, en pause, finis, absents.
   - Un bouton de carte, **« Envoyer un rappel à Sophie et Tom »** (`ptxRappeler`), affiché seulement s'il y a des absents non justifiés ; remplace « Rappeler encore » collectif qui passait sous le texte sur iPad.
   - Sous la carte, une ligne grise 13 px : **« Les rappels partent tout seuls à 09:30 (rien de commencé) et à 19:00 (journée restée ouverte). Modifier »** ; « Modifier » ouvre la feuille § 4.6-E. Le réglage n'est plus une carte à part en bas de page.
4. États vides : personne attendu → « Personne n'est attendu aujourd'hui. Rien n'est prévu au planning ce dimanche. »

**Téléphone** : même ordre, une colonne ; les quatre chiffres en 2 × 2 ; chaque rangée de « À régler » sur trois niveaux : phrase / `.btn.petit` / lien gris, **avec 12 px entre le bouton et le lien** (pas deux cibles collées) ; le premier écran d'iPhone montre déjà la première ligne à régler. Hauteur de la page entière ≈ 1 700 px.

### 4.4 T3 — Onglet « Semaine » (remplace la grille actuelle, `ptxCartes`, `ptxSemaine`, la carte « À regarder »)

**Question** : « Les heures de la semaine sont-elles justes, et puis-je les valider ? »
- Ligne du haut : `.st-barre-per` « ‹ Semaine du 26 octobre au 1er novembre › » à gauche ; à droite le seul bouton de l'onglet `.btn.gris` **« Valider les 4 personnes en règle »** (`ptxValiderPanneau` / `ptxValiderLot` ; toast « 4 personnes validées (Sophie, Léa, Julie, Marc). Annuler »). Sous le navigateur, une ligne grise qui dit la vérité : **« 4 personnes sur 6 sont en règle. Karim et Tom ont des points à régler. Valider envoie leurs heures à la paie ; si tu changes une heure ensuite, il faudra valider de nouveau. »**
- **Ordinateur — la grille que Justin trouve « pas mal », gardée** : une `.carte` ; une ligne par personne : identité (avatar, nom, métier) · sept colonnes (lun. 26 … dim. 1er) · « Total » · « En plus » · **UNE pastille par ligne**. Case de jour : « 8h05 » (15 px gras, chiffres tabulaires) et dessous « 07:37–16:42 » (12 px gris) ; jour non pointé mais planifié : « — » + « prévu 3h30 » (`prevuMin`) ; congé : case teintée `--violet` avec le MOT « Congé payé » ; journée ouverte : orange « n'a pas terminé » (plus « ouvert ») ; case encadrée de rouge s'il y a un point à régler ; case du jour : `--cel-auj`. « En plus » : « 5h50 » en gris, orange seulement au-delà de 48 h hebdomadaires (c'est le seul cas où un total est une alerte) ; « pas d'heures en plus » dit en entier. **Pastille** (la plus pressante) : `.st-r` « À terminer » > `.st-o` « 3 points à regarder » (renvoie à sa feuille) > `.st-b` « À valider » (bouton `.btn.gris.petit` « Valider » pour CETTE personne) > `.st-v` « Validée » ; `.st-o` « À revalider » quand une heure a bougé après la validation (`ptDevalide`). Plus de six boutons « Valider » identiques. Toucher une case ouvre la journée de la personne (§ 4.6-A) ; toucher un nom ouvre la feuille de sa semaine. Une ligne sous la barre : « Touche une journée pour la voir, la comparer au planning ou la corriger. Corriger une journée la remet à valider. »
- **Téléphone et iPad portrait (largeur de CONTENEUR < 640 px)** — **plus de grille de cases** : une `.carte` à rangées, UNE par personne : avatar, nom (gras), sous-ligne « Technicienne », à droite le total « 40h50 » et dessous « dont 5h50 en plus » ; la pastille sur sa propre ligne ; la rangée entière est la cible (≥ 58 px) et ouvre **la feuille « Sophie Martin — semaine du 26 octobre au 1er novembre »** : SEPT lignes verticales « lun. 26 · 07:37–16:42 · 8h05 », « sam. 31 · pas de journée · prévu 3h30 », « mar. 3 · Congé payé », chacune touchable (ouvre la journée), puis le bouton `.btn.large` « Valider la semaine de Sophie » (ou « Voir les points à régler »). **Cette liste de sept jours est la MÊME fonction que celle de « Mes heures » du salarié** (UNE fonction `ttJoursListe(k, lundi)` qui rend les lignes ; plus deux composants dont un est caché par CSS).
- Pas de carte « À regarder cette semaine » : les points sont dans la pastille de chaque ligne et dans « À régler ».

### 4.5 T4 — Onglet « Mois » (les chiffres du mois et le chemin vers la paie)

**Question** : « Puis-je envoyer les heures d'octobre à la paie, sinon qu'est-ce qui bloque ? » (Aujourd'hui, l'étape « Les heures sont justes » dit « 30 semaines pas encore validées » : 6 personnes × 5 semaines, phrase que personne ne comprend, et il faut ≈ 20 gestes.)
- `.st-barre-per` « ‹ Octobre 2026 › » (le mois de `PAIE_MOIS`).
- `.kpis` (4 tuiles, valeurs calculées par `paieVariables`, jamais recalculées autrement) : « **170h** / travaillées » · « **46h** / en plus » · « **3** / journées à régler » · « **6 sur 6** / ont confirmé leurs heures ». (Valeurs de démonstration indicatives.)
- **Carte « La paie d'octobre »** : UNE phrase de situation en mots simples (**« Il reste 1 journée à terminer, 2 personnes à faire confirmer leurs heures et 4 semaines à valider. »**) et **UN seul `.btn` noir qui change avec la situation** :
  1. il reste des semaines en règle non validées → **« Valider ce qui est en règle »** (`validertout` de la Paie : la MÊME fonction, le MÊME libellé ; toast avec « Annuler ») ;
  2. tout est validé mais des salariés n'ont pas confirmé → **« Demander de confirmer »** (une notification à chacun : `notifier`, sur le modèle de `ptxRappeler`) — ce n'est pas bloquant : la Paie permet de verrouiller sans toutes les confirmations, le bouton est un `.btn.gris` ;
  3. tout est réglé → **« Passer à la paie »** (`paieAller('paiemois')` ; la Paie reste le lieu du verrouillage et de ses 8 étapes) ;
  4. mois verrouillé → phrase « Octobre est fermé : plus aucune heure ne peut changer. » (avec la date) et bouton « Voir la paie ».
  Si des journées ou des demandes bloquent, la phrase les nomme et un lien « Voir À régler › » renvoie à l'onglet Aujourd'hui.
- **Carte « Les heures de chacun »** : une rangée par personne : avatar · nom · « 170h dont 12h en plus » · pastille `.st-v` « Confirmé le 31/10 » / `.st-g` « N'a pas encore confirmé » / `.st-o` « Erreur signalée ». Toucher ouvre la feuille « Octobre · Sophie Martin » : ses semaines (lignes `paieSemLigne`, avec « payée avec novembre » pour la semaine à cheval — **plus jamais « se termine en novembre — +5h50 sup. · sur novembre »**), ses journées, ses corrections du mois, et le lien « Son relevé d'octobre › » (c'est le « relevé par salarié » de l'inventaire ; `paieReleve`). Heures de nuit et jours d'absence : dans cette feuille, une ligne grise chacun, seulement s'ils ne valent pas zéro.
- Téléphone : mêmes éléments, les quatre chiffres en 2 × 2 ; la liste en rangées de 58 px.

### 4.6 T5 — La journée d'une personne et les feuilles (remplace `ptFicheJour` + ses deux enveloppes ; `ptxPanneauFin`, `ptxChampsCloture`)

**A. Fiche d'une journée** (tiroir) — « Corriger une heure » est le geste de confiance : il doit se VOIR comme tel.
- `.surtitre` « MERCREDI 28 OCTOBRE » · titre « Sophie Martin » (`.eq-tete` avec avatar) · deux chiffres `.fo-stats` : « **8h05** · travaillées » et « **8h00** · prévues au planning » (si rien n'était prévu : une phrase « Aucune intervention n'était prévue » — plus de troisième chiffre « non planifiées »).
- Groupe de lignes (style Réglages iOS, `.fo-r`) : « Début · 07:37 » · « Fin · 16:42 » · « Pause · 1h00 » · « Note · — » ; toucher une valeur ouvre le sélecteur d'heure existant (`dtPoser` / `dtFermer` : **l'heure est gardée « en attente » puis enregistrée à la minute, cette rustine reste**).
- **Dès qu'une valeur a changé** apparaît dessous le bloc **« Pourquoi changes-tu cette heure ? »** (gras) avec « Obligatoire. Sophie le verra sur ses heures du mois. » (placeholder : « Ex. : oubli de pointer en partant »), puis `.btn.large` **« Enregistrer la correction »**, **grisé tant que le motif est vide**, avec une ligne orange dessous « Écris d'abord pourquoi. » (la condition est VISIBLE avant ; le toast d'après coup « Dis d'abord pourquoi » ne peut plus se produire). **Il y a donc enfin un vrai bouton « Enregistrer »** (aujourd'hui chaque champ s'enregistre à la sortie, sans retour clair).
- Après l'enregistrement : le bloc de motif disparaît ; **un seul** toast « Journée corrigée. Sophie devra la confirmer de nouveau. » (+ « Annuler ») **remplace tout toast d'avant** (le refus ne reste plus affiché après la réussite : défaut mesuré) ; la trace s'écrit (`PT_TRACE` : avant → après, qui, quand, pourquoi — **inchangé**) ; `ptDevalide` ; le salarié reconfirmera.
- Bloc **« Ce qui a été changé »** : une ligne par correction (« Fin : 16:42 → 17:40 · par Marc · le 31/10 à 10:12 · parce que : oubli de pointer »).
- Bloc **« Au planning ce jour-là »** : les interventions (chacune ouvre sa fiche). Phrase de règle UNIQUEMENT s'il y a une alerte (« Plus de 10 heures dans la journée : c'est la limite légale. »).
- `.cmd-liens` : « Toutes ses heures d'octobre › » (renvoie sur l'onglet Mois, la personne), « Son relevé de paie d'octobre › ».
- Journée **ouverte** : le groupe montre « Fin · pas terminée » et deux boutons « Terminer à 16:48 » (noir) et « Lui demander son heure » (gris). Journée **vide** : « Aucune heure ce jour-là » + `.btn.gris` « Ajouter les heures » (écrit AVEC un motif, comme une correction). **Mois verrouillé** : champs grisés, plus de champ de motif, carte grise « Octobre est fermé : plus aucune heure ne peut changer. » — **y compris pour « Ajouter les heures » et « Ajouter une journée »**.
- Téléphone : feuille plein écran avec « ‹ Retour » ; sélecteurs natifs d'heure ; `.btn.large` « Enregistrer la correction » collé au bas, au-dessus du clavier et de l'encoche ; lignes de liens à 44 px.

**B. « Terminer la journée »** (`ptxChampsCloture`, ouverte par « Choisir une autre heure ») : « Il a commencé à 07:55. À quelle heure a-t-il fini ? » — Fin proposée 16:48 (« son heure habituelle »), Pause 60 minutes (habituelle) ; « Jamais l'heure qu'il est : on inscrit celle que tu choisis. » ; `.btn.large` « Terminer la journée ».
**C. « Ajouter une journée »** (bouton noir de l'en-tête) : Qui ? · Quel jour ? · Début · Fin · Pause · **Pourquoi ?** (obligatoire) ; `.btn.large` « Ajouter la journée » ; passe par la même trace. (Nouveau panneau à deux sélecteurs qui ouvre ensuite `ptFicheJour(k, d)` dans son état « journée vide ».)
**D. « La règle »** : le texte légal de la rangée « À regarder » — 10 heures par jour au plus, 11 heures de repos entre deux journées, 48 heures par semaine — avec la référence du Code du travail écrite ICI et nulle part ailleurs (dans un « ? » qui déplie « Code du travail, article L3121-18 » etc.) ; en bas : « Ces repères sont généraux : à vérifier avec ton expert-comptable. » **Texte à relire par l'agent `juriste` avant publication** (CLAUDE.md : un salarié peut le lire) ; la forme change, le sens ne doit pas.
**E. « Rappels automatiques »** : une case « Prévenir ceux qui n'ont pas commencé à 09:30, et ceux qui n'ont pas terminé à 19:00 » et « Le salarié donne son heure de fin, tu la vois ici. » ; `.btn` « Enregistrer ». (Données : `PTX.rappels`.)
**F. « Valider… »** : liste des noms cochés + phrase de conséquence ; `.btn.large` « Valider » ; toast « Annuler » (`ptxValiderPanneau`).

### 4.7 T6 — Le salarié : « Ma journée de travail » et « Mes heures »

**« Ma journée de travail »** (`ptxCarteSalarie`, la carte qui est « simple et clair » et que Justin appelle « pas mal ») : **inchangée**, première carte de « Ma journée » ; **elle n'est plus recopiée dans « Mes heures »** (le technicien la voyait deux fois sur deux onglets voisins). Dans « Mes heures » : une ligne « Aujourd'hui : commencée à 07:55 · 3h10 » avec le MÊME bouton (même fonction). Le rappel automatique du matin n'est plus répété sur « Mon camion » : il s'affiche une fois, sur « Ma journée », et disparaît dès qu'on a commencé.

**« Mes heures »** (`vueMesHeures`, route `mesheures`, onglet « Heures » de la barre du bas ; remplace `vueMesHeures` + `ptxJoursListe` + son enveloppe) — **cible : ≤ 1 600 px sur iPhone (3 004 px aujourd'hui)** :
- `.tete` : surtitre « OCTOBRE 2026 » · h1 « Mes heures » · ligne grise « Ce que tu as fait, et ce qui part sur ta paie. ».
- `.seg` : **« Ce mois-ci · Mes fiches de paie »**.
- **Ce mois-ci** :
  1. Si le mois est prêt : `.info` « **Tes heures d'octobre sont prêtes.** 170h20 · dont 5h50 en plus. » + `.btn.large` **« Je confirme mes heures »** + `.lien` « Il y a une erreur » ; si la journée du jour est encore ouverte : feuille « Ta journée d'aujourd'hui n'est pas terminée. Confirmer quand même ? » (boutons « Confirmer quand même » / « Je termine d'abord ») — **règle nouvelle : avertir, ne pas bloquer** (aujourd'hui rien n'avertit). Déjà confirmé : `.ok-bloc` « ✓ Tu as confirmé tes heures d'octobre le 31/10. » ; erreur signalée : « Ton message est parti au bureau le … On te préviendra quand c'est corrigé. » ; mois verrouillé sans confirmation : « Le mois est fermé : pour une erreur, parle au bureau, elle sera régularisée le mois prochain. »
  2. `.kpis.ptx-k3` : « **40h50** / cette semaine » · « **170h20** / ce mois-ci » · « **5h50** / en plus ce mois-ci » ; une ligne grise dessous pour les heures de nuit et les jours d'absence, seulement s'ils ne sont pas à zéro.
  3. **UNE liste « Mes journées »**, la plus récente d'abord, regroupée par semaine : « Cette semaine · 40h50 », « Semaine du 19 au 25 octobre · 40h00 » (une semaine qui finit le mois suivant dit « payée avec novembre » ; plus « se termine en novembre — +5h50 sup. · sur novembre »). Chaque journée : « mer. 28 octobre · 07:42–16:42 · 8h00 », avec la mention « corrigée par le bureau » quand c'est le cas ; **toucher ouvre la feuille de la journée** : les heures, la correction éventuelle (avant → après, par qui, pourquoi — ce qui était la carte « Heures corrigées par le bureau »), et un seul bouton « Il y a une erreur ». « Voir tout le mois » déplie. Les sept « Ce n'est pas ça » disparaissent. Cette liste est la même fonction que la feuille de semaine du gérant (§ 4.4).
- **Mes fiches de paie** : une ligne par mois avec « Voir » (`paieBulletinVoir`) ; octobre : « Elle arrivera ici quand le bureau l'aura validée. » (5 défilements avant → 0).
- **« Il y a une erreur »** (`ptxSigPanneau` / `ptxSigEnvoyer`) : « Quel jour ? » (déjà choisi si on vient de la liste), « Ce que j'ai vraiment fait » : début, fin, pause ; une phrase ; `.btn.large` « Envoyer au bureau ». Arrive dans « À régler » du gérant, ligne « Demande ».

---

## 5. Les dix tâches les plus fréquentes — gestes avant → après

Un geste = un toucher ou un clic ; la saisie au clavier n'est pas comptée ; ordinateur : la rubrique est à 1 geste ; téléphone : 2 (Menu puis rubrique) sauf la barre du bas du technicien (1). « Défilement » = un écran à descendre. **Mesure d'acceptation : aucune de ces tâches ne demande de défiler plus d'un écran** (une sonde les joue, § 9).

### 5.1 Gérant — Véhicules
| # | ce qu'il vient faire | avant | après |
|---|---|---|---|
| 1 | Voir si un véhicule a un problème | 1 (et pas à l'Accueil) | **0 depuis l'Accueil**, sinon 1 |
| 2 | Noter un contrôle ou une révision fait | 3 | 2 (bouton de la rangée, Enregistrer) quand le rendez-vous est noté ; 3 via « C'est déjà fait ? » sinon |
| 3 | Prendre un rendez-vous au garage | 1 (ne prenait aucun rendez-vous) | 2 + le jour (note vraiment la date) |
| 4 | Noter un plein pour quelqu'un | 4 | **2** (« Noter un plein », Enregistrer) |
| 5 | Mettre un camion au garage | 3 | 3 (rangée, « Mettre au garage », Enregistrer) |
| 6 | Voir ce que coûte un véhicule | 1 + 2 défilements | **1** (le chiffre ouvre la feuille) |
| 7 | Changer de conducteur | 3 | 3 |
| 8 | Une amende reçue | 3 + 3 écrans à descendre | **4 sans défiler** (fiche, Papiers, « Une amende », Enregistrer) |
| 9 | Renouveler l'assurance des 4 véhicules | 2 | 2 |
| 10 | Ajouter un véhicule | 3 + 13 champs | **2 + 4 champs** |

### 5.2 Gérant — Temps de travail
| # | ce qu'il vient faire | avant | après |
|---|---|---|---|
| 1 | Voir qui est au travail / absent | 1 | 1 (0 depuis l'Accueil) |
| 2 | Rappeler ceux qui n'ont pas commencé | 1 | 1 |
| 3 | Traiter la demande de correction de Tom | 1 | 1 (« Accepter 17:40 ») |
| 4 | Terminer la journée oubliée de Tom | 2 | **1** (« Terminer à 16:48 ») |
| 5 | Corriger une heure à la main | 4 à 6, motif non évident | **4 clairs** (case, valeur, motif, « Enregistrer la correction ») |
| 6 | Savoir si la semaine est en règle | 5 lignes à lire | **0** (la pastille de chaque ligne, la pastille de l'onglet) |
| 7 | Valider les semaines en règle | 2 pour une semaine, 10 pour un mois | 2 pour la semaine, **2 pour le mois** |
| 8 | Fermer octobre et passer à la paie | ≈ 20 | **4** si tout est en règle (Mois, « Valider ce qui est en règle », « Passer à la paie », puis « Verrouiller » dans la Paie), 8 à 10 avec Tom et Karim à régler |
| 9 | Voir les heures du mois d'une personne | 2 à 3 | 2 (Mois, la ligne) |
| 10 | Pointer soi-même | 1 + 1 (sans pause) | 1 + 2 (avec pause et fin proposée, comme un salarié) |

### 5.3 Technicien (barre du bas = 1)
| # | geste | avant | après |
|---|---|---|---|
| 1 | Commencer sa journée | 1 | 1 |
| 2 | Terminer (fin + pause) | 2 | 2 |
| 3 | Pause / reprendre | 1 | 1 |
| 4 | Confirmer ses heures | 1 + 1 écran sous la carte du jour | **2** (Heures, « Je confirme mes heures »), sans défiler |
| 5 | Signaler une erreur | 4 | 3 |
| 6 | Voir sa semaine | 1 + 2 défilements | **1** |
| 7 | Voir sa fiche de paie | 1 + 5 défilements + 1 | **3** (Heures, Mes fiches de paie, la ligne) |
| 8 | Un plein | 3 + 1 600 px de défilement | **3 sans défiler** |
| 9 | Relever le compteur | 3 + défilement | 3 |
| 10 | Un souci avec le camion | 4 + défilement | 4 |
(« J'ai pris à l'atelier » : 2 → 2, inchangé ; propriété de la refonte Dépôts et camions.)

---

## 6. Table « avant → après » : RIEN D'UTILE NE SE PERD

Chaque ligne de l'inventaire de l'étude (§ 2) a une destination. « = » : gardé tel quel, seulement mieux dit.

### 6.1 Véhicules
| capacité | avant | après |
|---|---|---|
| Voir ce qui est en retard ou proche | bande « À faire maintenant » + chiffre + filtre + bandeau de carte (quatre fois) | **une phrase d'état par rangée + onglet « À faire »** (+ une ligne à l'Accueil) |
| En service / au garage, qui conduit | cartes, chiffre « 3 / 4 » | rangée (avatar du conducteur) + chiffre « 3 sur 4 en service » + onglet « Au garage » |
| Marquer une échéance faite, suivante proposée, tâche fermée | « Contrôle fait » → panneau | **= `vxFaitPanel` / `vxFaitOk`** ; libellés distincts (« Noter le contrôle technique »…) |
| Créer la tâche « rendez-vous » | « Prendre rendez-vous au garage » (tâche dans 3 jours) | **« Noter le rendez-vous »** : vraie date, tâche à cette date |
| Assurance de toute la flotte en un geste | ligne groupée | **= rangée « Les 4 véhicules »** + `vxFaitGroupe` |
| Plein / facture (litres, prix, km, photo, carte ou poche → note de frais ; achat 6061/6155/616/625) | « Saisir un plein » | **« Noter un plein »** (3 champs + 2 choix), `vxPleinOk` = |
| Relever le compteur (ne recule pas, saut > 3 000 km confirmé) | fiche, carte du technicien | = `vxKmOk` ; bouton de fiche et de « Mon camion » |
| Signaler un souci → tâche urgente → cloche | Ma journée › Mon véhicule | « Un souci avec le camion » dans **Mon camion** ; = `vxSouciOk` |
| Mettre au garage / remettre en service (motif, garage, retour, remplaçant, interventions concernées, pastille Planning, facture) | fiche | = `vxGarageOk` / `vxRetourOk` ; bouton de fiche + de rangée ; pastille « camion » du Planning (`vxGarageDe`) = |
| Changer de conducteur (ancien gardé, stock suit) | fiche | = lien de fiche + `vxCondOk` |
| Coût d'un véhicule (total, par mois, au km, L/100 km, histogramme) | fiche › « Ce que ça coûte » | **onglet Dépenses** ; = `vxCalcCout`, `vxCoutBloc` |
| Classement « les plus chers au km » | bas de la liste | **feuille L**, derrière le chiffre « dépensés » (une couleur neutre) |
| Stock à bord, ce qui manque, aller au stock | cartes, fiche | chiffre « 3 à remettre à bord » + lien « Stock du camion › » de la fiche ; côté technicien : **Mon camion** (bloc « À bord ») |
| Matériel de sécurité (8 cases, contrôle, commande) | milieu de la fiche, cases de 20 px | **feuille F**, huit lignes à 44 px ; = `vxMatFait`, `vxCommander` |
| Documents (carte grise, attestation, rapport) | trois lignes « Pas encore ajouté » | onglet Papiers, **une ligne « Aucun document »** puis une ligne par document |
| Amende (désignation avant la date, tâche) / sinistre | bas de fiche, 3 écrans à descendre | onglet Papiers, « Une amende » / « Un accident » ; = `vxAmendeOk`, `vxSinistreOk` |
| Modifier la fiche | fiche | feuille K (même champs, intervalle de révision compris) |
| Créer un véhicule (+ lieu de stock) | 13 champs | feuille A (4 champs) ; lieu créé ; dotation selon le métier |
| Exporter les dépenses (CSV) | fiche | **« Exporter en tableau »** (onglet Dépenses et feuille L) ; = `vxCsv` |
| Historique du véhicule | milieu de fiche | **« Déjà fait »** en bas de l'onglet À faire |
| Rappels au conducteur 30 / 7 jours | cloche, Ma journée | = `vxNotifs` ; nourrit aussi la phrase d'état de Mon camion |
| Tâches suggérées (rendez-vous, assurance flotte) ; clés `veh-…` / `vrdv-…` | Tâches | = `vxLiens`, `vxCleTache` ; les tâches ne se doublent pas |
| Note de frais « Carburant » rattachée au camion | `vxRattacher` | = |
| « Voir dans les achats › » / « Voir la note › » | liens de ligne de frais | = dans la feuille « Cette dépense » |

### 6.2 Temps de travail — gérant
| capacité | avant | après |
|---|---|---|
| Qui travaille / est absent / n'a pas pointé | carte « Aujourd'hui » (états groupés, listes séparées par des virgules) | **carte « Qui est où »**, une rangée par personne ; = mêmes états et mêmes gestes |
| Rappeler ceux qui n'ont pas pointé ; rappel automatique 09:30 / 19:00 réglable | « Rappeler encore », carte à case | bouton de carte + ligne grise « Modifier » → feuille E ; = `PTX.rappels` ; inactif pour les absents |
| Clôturer la journée oubliée à l'heure habituelle (jamais « maintenant ») / demander son heure | « Clôturer à l'heure dite », « À fermer », bandeau rouge | **« Terminer à 16:48 »** + « Lui demander son heure » dans « À régler » ; = `ptxFinPropose`, `ptxDemander` |
| Traiter la demande de correction en un geste | « Demandes des salariés · Corriger : fin à 17:40 » | « Demande » dans « À régler » → **« Accepter 17:40 »** ; = `ptxCorriger` (le salarié reconfirme) |
| Voir la semaine (heures, prévu/pointé, absences, en plus) | grille + cartes téléphone | onglet **Semaine** (grille sur ordinateur, liste + feuille sur téléphone) |
| Repères légaux (10 h, 48 h, 11 h, jours sans pointage) | carte « À regarder cette semaine · 5 » (4 lignes pour Karim) | **une rangée par personne** dans « À régler » + pastille + feuille « La règle » ; = `ptAlertes` |
| Corriger une journée, motif obligatoire, trace, reconfirmation | fiche de la journée sans bouton | **= règles**, avec un vrai « Enregistrer la correction » et la condition visible |
| Ajouter une journée oubliée | « Ajouter un pointage » dans la fiche d'une journée vide | « ＋ Ajouter une journée » (haut de page) et « Ajouter les heures » (journée vide) |
| Valider une semaine / toutes celles en règle (avec Annuler) | « Valider », « Valider 4 semaines en règle » (qui validait 1 semaine pour 4 personnes) | pastille « À valider » + « Valider » par personne ; **« Valider les 4 personnes en règle »** ; = `PT_VALIDE`, `ptDevalide` |
| Naviguer de semaine en semaine | ‹ › | = `.st-nav` |
| Pointer soi-même (gérant) | bouton d'en-tête sans pause | **`ptxCarteSalarie`** en tête d'Aujourd'hui |
| Heures en plus 25 % / 50 %, nuit, mandataire, semaine à cheval | `ptAlertes`, `paieVariables` | **= calculs inchangés**, dits « en plus » |
| Planifié ↔ pointé | « prévu 3h30 » | = `prevuMin` (grille et feuille de semaine) |
| Verrouiller le mois, envoyer au cabinet | Comptabilité › Paie | **= dans Paie** ; Mois › « Passer à la paie » y renvoie |
| Chiffres du mois | nulle part (ouvrir la Paie) | **onglet Mois** (4 chiffres) |
| Relevé par salarié | Paie | feuille « Octobre · Sophie » (lien « Son relevé d'octobre ») |

### 6.3 Temps de travail — salarié
| capacité | après |
|---|---|
| Je commence / J'ai commencé plus tôt / Pause / Je reprends / Je termine (fin et pause proposées) / Fin d'hier ? | **= `ptxCarteSalarie`** (une seule carte, dans « Ma journée ») |
| Voir ses heures de la semaine et du mois, en plus, nuits, absences | « Mes heures › Ce mois-ci » : trois chiffres + liste regroupée par semaine |
| Je confirme mes heures / Il y a une erreur / Ce n'est pas ça | « Je confirme mes heures » (en tête) ; « Il y a une erreur » (une fois, dans la feuille de la journée) ; = `PAIE.confirmes`, `PAIE.signales` |
| Heures corrigées par le bureau et pourquoi | dans la feuille de chaque journée (« corrigée par le bureau ») |
| Fiches de paie | onglet « Mes fiches de paie » |
| Rappels automatiques (cloche) | = |

---

## 7. Routes et fonctions : à garder, à réécrire, à supprimer

**Principe de code** (étude § 7.4) : les deux écrans sont des **chaînes d'enveloppes** (`vueVehicules = function(){ return vxPost(v0.apply(this, arguments)); }`, `vuePointage` enveloppée trois fois, `ptFicheJour` deux, `vueMesHeures` deux) qui retouchent le HTML des couches d'avant par `replace()` / `indexOf()`. **La refonte remplace chaque chaîne par UNE fonction par écran et retire tous les `replace()` sur du HTML d'une couche précédente**, sinon les anciens blocs reviennent. Les gestes passaient par des écouteurs `click` en capture sur `data-pt`, `data-ptx`, `data-ve`, `data-vx`, `data-paie` qui se partagent des clés et dépendent d'un `stopImmediatePropagation` (verrou du mois) : on les remplace par **un écouteur par écran** (`data-vh` pour Véhicules, `data-tt` pour Temps de travail) dont la table d'actions appelle les fonctions métier ci-dessous, et **le verrou du mois est une garde AU DÉBUT de chaque écriture** (`paieMoisVerrou(date)`), pas un `stopImmediatePropagation`.

### 7.1 À GARDER telles quelles (la logique métier ; on change ce qu'on VOIT, pas ce qu'elles font)
- Données : `VEHICULES`, `VEH_STATUT`, `VEH_MATERIEL`, `POINTAGES`, `PT_VALIDE`, `PT_TRACE`, `PAIE`, `PTX`, `PAIE_SAL`, `PT_GENS`, `NDF`, `ACHATS`, `TACHES`, `LIEUX`, `ABSENCES`. **Le modèle de données ne change pas** (aucun champ supprimé ; « Ajouter plus tard » doit pouvoir s'enregistrer vide sans casser `vxInit`).
- Calcul : `ptDuree`, `ptJourMin`, `ptJour`, `ptOuvert`, `ptDevalide`, `ptAlertes`, `prevuMin`, `absDe`, `paieVariables`, `paieEtapes`, `paieNuit`, `paieMoisVerrou`, `vehEcheances`, `vxUrg`, `vxGroupes`, `vxCalcCout`, `vxKmCtl`, `vxProchaine`, `vxLiens`, `vxCleTache`, `vxNotifs`, `vxRattacher`, `vxIntsConcernees`, `vxGarageDe`.
- Écritures : `vxFaitOk`, `vxFaitGroupeOk`, `vxPleinOk`, `vxKmOk`, `vxGarageOk`, `vxRetourOk`, `vxCondOk`, `vxModifOk`, `vxCreerOk` (**à corriger** : conducteurs et dotation), `vxFraisOk`, `vxFraisSuppr`, `vxAmendeOk`, `vxSinistreOk`, `vxSouciOk`, `vxSouciRegle`, `vxMatFait`, `vxMatTout`, `vxCommander`, `vxDocAjouter`, `vxDocRetirer`, `vxCsv` ; `ptxCorriger`, `ptxTerminer`, `ptxCommencer`, `ptxFinHier`, `ptxFinPropose`, `ptxHabFin`, `ptxHabPause`, `ptxRappeler`, `ptxDemander`, `ptxValiderLot`, `ptxAnnulerValid`, `ptxSigEnvoyer`, `ptxCarteSalarie` ; `paieAller`, `paieReleve`, `paieBulletinVoir`, `dtPoser` / `dtFermer`, `notifier`, `journalAjout`, `toast`, `foOuvrir`, `ouvrirPanneau`, `lieuArticles`, `lieuManques`, `lieuValeur`, `sxMonLieu`.

### 7.2 À RÉÉCRIRE (nouvelle structure, mêmes entrées)
- `vueVehicules` (V1) ← `vueVehicules` base + `vxPost` ; `vehFiche` (V2) ← `vehFiche` base + son enveloppe `vx` ; `vxMonCamion` + `vueMonCamion` (V3 : la partie « Le camion » ; la partie « À bord » est celle de la refonte Dépôts et camions) ; la ligne « Mon camion » dans `vueMaJournee` ← `vxMonCamion(rlQui())` et le raccourci stock.
- `vxPleinPanel` (B : moins de champs, nature en quatre boutons), `vxNouveauPanel` (A : 4 champs + « Ajouter plus tard »), `vxRdv` / `vxRdvGroupe` (C : demande une date, crée la tâche à cette date), `vxFaitPanel` (D : mêmes champs, libellés distincts), `vxMatFait` (cases à 44 px dans une feuille), `vxGaragePanel` (libellés), `vxFraisPanel` (une feuille par dépense).
- `vuePointage` (T1 à T4) ← base + trois enveloppes ; `ptFicheJour` (A : bouton Enregistrer, motif visible) ← base + deux enveloppes ; `vueMesHeures` (T6) ← base + `ptxJoursListe` + enveloppe ; `ptxAuj` (carte « Qui est où » par personne) ; `ptxSignales` (devient une rangée « Demande » de « À régler ») ; `ptxCartes` + `ptxSemaine` (liste de semaine) ; `ptAlertes` n'est pas réécrite mais un **regroupement par personne et par semaine** est ajouté (`ttAReglerLignes()`).
- NOUVELLES petites fonctions : `ttAReglerLignes()` (les lignes de « À régler » : journées ouvertes, demandes, alertes groupées, journées planifiées sans pointage), `ttJoursListe(k, lundi)` (les sept jours, partagée par la feuille de semaine du gérant et « Mes heures »), `ttDemanderConfirmer()` (notification de confirmation), `ttAjouterJournee()` (panneau « Ajouter une journée »), `vhEtat(v)` (la phrase d'état, la précision, le bouton d'une rangée : UNE fonction lue par la liste, la fiche et la ligne de « Mon camion » — plus de quatre façons de dire la même chose), `vhAccueil()` (lignes de l'Accueil).

### 7.3 À SUPPRIMER (après remplacement, vérifier par recherche qu'aucun appelant ne reste)
`vxPost` ; `vxBandeLignes`, `vxBandeHtml` ; `vxKpi`, `vxCarteExtra` ; `vxClassement` (remplacé par la feuille L) ; les tuiles « articles à bord / interventions aujourd'hui » ; le pictogramme camion identique pour tous ; la bande « Aujourd'hui et demain avec Sophie » de la fiche ; le chiffre « 515 € de stock à bord » ; les douze liens nus « Modifier / Supprimer » ; la carte « Mon véhicule » de Ma journée ; le bandeau rouge et le bandeau bleu de Temps de travail ; la carte « À regarder cette semaine » ; la carte « Demandes des salariés » (devient une rangée) ; le bouton « Début de ma journée » de l'en-tête et ses `data-pt="debut|fin"` ; le tableau + les cartes téléphone en double (un des deux était caché par CSS) ; la carte à case des rappels ; la carte « Ma journée de travail » recopiée dans Mes heures ; « Semaine par semaine » + « Mes journées » + « Voir tout le mois (21 jours) » comme trois blocs ; les sept « Ce n'est pas ça » ; les « Messages du bureau » répétés sur Mon camion.
Routes : **aucune ne change** (`vehicules`, `pointage`, `moncamion`, `mesheures`, `majournee`) — les liens (`go('vehicules')`, `data-ve="fiche|veh1"` des Tâches et de l'Historique, `data-eq="heures|k"` d'Équipe) continuent de marcher ; seules leurs cibles internes changent (la fiche s'ouvre sur l'onglet À faire ; « Ses heures › » ouvre Temps de travail › Mois sur la personne).

---

## 8. Ce qui change dans les écrans voisins (et rien de plus)

| écran | changement | note |
|---|---|---|
| **Accueil** (validé) | **deux lignes** ajoutées à « À faire maintenant » (`afaire` de `vueAccueil`) : « Véhicules · 3 choses à faire » (`.st-o`, `go:'vehicules'`, mène à l'onglet À faire) et « Temps de travail · 3 choses à régler » (`.st-r` s'il y a une journée à terminer, sinon `.st-o` ; mène à l'onglet Aujourd'hui) ; **deux lignes en tout, jamais une par échéance** ; chaque ligne mène à l'onglet précis | **dédoublonnage** : comme `couvert` pour les interventions, une échéance déjà couverte par une tâche urgente ouverte (`vxTacheOuverte`) n'est pas recomptée ; rien n'est écrit au chargement ; à soumettre à Justin au moment de l'appliquer (écran validé) |
| **Comptabilité › Paie** (validée) | l'étape 1 « Les heures sont justes » reprend les MÊMES mots (« 4 semaines à valider » : plus « 30 semaines pas encore validées (Sophie, Karim, Léa, Tom, Julie, Marc) » → « 4 personnes ont encore des heures à valider ») et le MÊME bouton « Valider ce qui est en règle » (`validertout`, libellé aujourd'hui « Valider les semaines sans alerte ») ; le lien retour « ‹ Retour · Temps de travail » reste ; **rien d'autre ne bouge** | une seule source de vérité : `paieEtapes` |
| **Absences et congés** | aucun changement ; alimente « Congé payé » de la grille, « Absente » de Qui est où, la désactivation des rappels | |
| **Planning** | la pastille « camion au garage » (`vxGarageDe`) et « prévu 3h30 » (`prevuMin`) restent ; « Voir au planning › » de la fiche véhicule ouvre le jour concerné | |
| **Équipe** (fiche d'une personne) | « 40h50 pointées » devient « 40h50 travaillées » (un mot, un endroit) ; « Ses heures › » → Temps de travail › Mois sur la personne ; « Renault Trafic L2H1 · GH-482-KL › » → fiche véhicule ; « Stock du camion › » | à soumettre à Justin (écran validé) ; sinon on garde « pointées » |
| **Tâches** | tâches suggérées (« Noter le rendez-vous », « Assurance des 4 véhicules ») : clés `veh-…`/`vrdv-…` inchangées ; fermer un rendez-vous propose de noter l'échéance (`vxFaitPanel`) | |
| **Achats et frais** | un plein / une facture crée l'achat comme avant (comptes 6061 / 6155 / 616 / 625, catégorie « Véhicules & carburant ») ou une note de frais « à valider » ; « Voir dans les achats › » depuis la ligne de dépense | aucun écran d'Achats ne change |
| **Dépôts et camions** (autre refonte) | **frontière écrite une fois** : Véhicules porte l'ÉTAT du véhicule (papiers, kilomètres, dépenses, garage) ; Dépôts et camions porte ce qu'il y a DEDANS ; « À bord › » et « Stock du camion › » sont des LIENS, jamais une copie ; **une** bande « À faire maintenant » par sujet : celle de Dépôts et camions ne parle plus que du stock | « Mon camion » du technicien réemploie ses trois boutons (« J'ai pris à l'atelier · J'ai utilisé · Il me manque ») et `lieuManques` **tels quels** |
| **Pièces d'une intervention** | aucun changement | |
| **Historique / cloche** | `H_TYPES.vehicule` (« a noté un plein », « a signalé un souci… ») et le bouton « Ouvrir le véhicule » : inchangés | |
| **Guide des nouveautés** (`NV_NEUF`, ~l. 21866) | une entrée « Véhicules et Temps de travail, refaits » : « Une rangée par véhicule qui dit s'il a besoin de toi. Temps de travail : ce qu'il faut régler, d'un coup d'œil. Ton camion et tes heures, au même endroit. » (3 phrases, mots de ce document) | à rédiger avec les mots finaux, après l'application |
| **Visites parlées et immersion** | `immChap('vehicules', …)` (~l. 20833), `immChap('pointage', …)` (~l. 20451), `tourPartie('vehicules', …)` (~l. 12816), `tourPartie('pointage', …)` (~l. 12814) ; `GD_TOURS`/`GD_GESTES` (~l. 12165, ~l. 12380-12400 : sélecteurs `.ptx-tout`, `[data-paie="validertout"]`, `[data-paie="verrouiller"]`) | **textes ET sélecteurs à réécrire avec les mots neufs** (« Valider les 4 personnes en règle », « Terminer à 16:48 », « Noter un plein »…), et à rejouer : une visite dont un sélecteur ne trouve rien se bloque sans bruit |

---

## 9. Les sondes à écrire (`scratchpad/proto-final/sondes/`, avec `lib.js`)

Règles (CLAUDE.md) : navigateur sur 127.0.0.1 seulement, un seul à la fois, au premier plan avec un délai (`timeout 300 node …`), aucun processus chrome laissé ; **neuf appareils** (`mac`, `windows`, `ipad`, `iphone`, `android`, `petit` 320) **jour ET nuit** ; encoches posées ; captures REGARDÉES (outil Read) ; chaque sonde prouve sa population avant de dire « 0 » (un zéro sur un ensemble vide ne prouve rien) ; les gestes se comptent par **signature de la frappe** (libellé + classe + `elementFromPoint` au point touché), pas par index.

| sonde | ce qu'elle joue / mesure | échec si… |
|---|---|---|
| `vehicules-liste.js` | Les 4 véhicules : une rangée chacun, une seule phrase d'état, au plus UN bouton ; ordre des situations ; rangée « Les 4 véhicules » ; onglets Tous / À faire / Au garage et leurs pastilles ; états vides (0 véhicule, À faire vide, Au garage vide) ; hauteur **≤ 900 px Mac / ≤ 1 200 px iPhone** | une échéance écrite deux fois sur l'écran ; hauteur dépassée |
| `vehicules-fiche.js` | Les trois onglets ; hauteur **≤ 900 px à l'ouverture, ≤ 1 700 px À faire** ; ≤ 20 boutons ; cases du matériel ≥ 44 px ; aucun libellé de bouton sur deux lignes dans une pilule ; la fiche s'ouvre depuis une rangée, un lien de Tâches, l'Historique, Équipe | 45 boutons ; une cible < 44 px |
| `vehicules-gestes.js` | Les 10 tâches de § 5.1 : compte les touchers, vérifie l'écriture (achat créé, kilométrage, tâche fermée et suivante proposée, interventions concernées, pastille Planning, note de frais pour « Mon argent ») ; « Noter le rendez-vous » crée la tâche À LA DATE saisie ; le compteur qui recule est refusé ; un saut > 3 000 km demande confirmation | une écriture manquante ; un compteur en nombre de touchers dépassé |
| `vehicules-technicien.js` | Connexion `sm` : **Mon camion** (phrase d'état, « À bord », trois boutons) ; le plein en **3 gestes sans défiler** ; la ligne « Mon camion » de Ma journée ; plus de carte « Mon véhicule » ; pas de « Messages du bureau » en double ; « Un souci » → tâche urgente + cloche ; camion au garage (Tom) → « Tu prends le Berlingo » | un défilement ; un doublon |
| `temps-aujourdhui.js` | Gérant : 4 chiffres, pastille de l'onglet = nombre de lignes de « À régler » ; **chaque fait écrit une seule fois** (compter les occurrences de « Tom » + « vendredi 30 » dans la page : 1) ; « Terminer à 16:48 » en 1 geste (fin = `ptxFinPropose`, jamais l'heure courante ; « Annuler » rouvre) ; « Accepter 17:40 » écrit la trace et Tom doit reconfirmer ; « Lui rappeler » ; hauteur **≤ 1 300 px Mac / ≤ 2 000 px iPhone ; ≤ 25 boutons** | un fait répété ; un bouton « Terminer » qui écrit l'heure d'aujourd'hui |
| `temps-semaine.js` | Grille Mac (sept colonnes, pastille par ligne, un seul « Valider les 4 personnes en règle ») ; téléphone : **plus de grille**, liste + feuille des sept jours ; validation en lot et « Annuler » ; une heure corrigée retire la validation (`À revalider`) ; mesure contre la largeur POSÉE (jamais `innerWidth`) | un débordement latéral ; des cases < 44 px au toucher |
| `temps-mois.js` | Quatre chiffres (égaux à `paieVariables`) ; les quatre états du bouton (valider / demander / passer à la paie / mois fermé) ; fermer octobre en ≤ 10 gestes avec Tom et Karim à régler ; mois verrouillé : plus aucune écriture, y compris « Ajouter une journée » | une écriture dans un mois fermé |
| `temps-journee.js` | La fiche d'une journée : le bouton « Enregistrer la correction » grisé tant que le motif est vide ; la trace avant → après, qui, quand, pourquoi ; le salarié devra reconfirmer ; **un seul toast** et aucun refus d'avant après la réussite ; sélecteur d'heure (`dtPoser`) ; journée vide, ouverte, mois fermé | un refus qui reste affiché après la réussite |
| `temps-salarie.js` | Connexion `sm`/`tl` : « Ma journée de travail » une seule fois ; « Mes heures » ≤ **1 600 px iPhone** ; « Je confirme mes heures » (et l'avertissement avec une journée du jour ouverte) ; « Il y a une erreur » en 3 gestes → ligne « Demande » chez le gérant ; fiches de paie en 3 gestes | « Ce n'est pas ça » répété ; une carte dupliquée |
| `personnel-voisins.js` | Les deux lignes de l'Accueil (et le dédoublonnage), les liens d'Équipe (« Ses heures », véhicule, stock), la pastille Planning, les liens de Tâches, la Paie (mêmes mots, même bouton), les cinq sélecteurs de visite réécrits | un lien mort ; une visite qui se bloque |
| `personnel-valeurs-longues.js` | « 1523h30 », « 12 345,67 € », « Renault Kangoo Van E-Tech », un nom de quinze lettres, « 0,10 € le kilomètre » : aucune colonne qui cède tout (texte à 0 px) ni débordement | une colonne de texte < 12 signes par ligne sur 4 lignes |
| `personnel-appareils.js` | Les neuf profils × jour/nuit × les rôles `marc`, `julie`, `sm`, `kb` : 0 erreur JavaScript ; **`julie` n'a toujours ni Véhicules ni Temps de travail** (tant que Justin n'a pas répondu) ; iPad portrait avec menu de 272 px (règles de conteneur) ; la barre du bas ne recouvre aucun bouton de rangée ; champs ≥ 16 px | une erreur ; un doigt qui rate (cible < 44 px) |
| `personnel-mutations.js` | **Contre-épreuve obligatoire** (≥ 12 mutations) : retirer la garde du mois verrouillé ; remettre `Date.now()` à la place de `ptxFinPropose` ; supprimer l'obligation du motif ; retirer `ptDevalide` ; retirer l'écriture de la trace ; retirer la désactivation du bouton « Enregistrer la correction » ; remettre la création de tâche « dans 3 jours » ; retirer « le compteur ne recule pas » ; retirer la fermeture de la tâche liée ; retirer le « Annuler » du toast ; retirer le dédoublonnage de l'Accueil ; retirer un sélecteur de visite. **Chaque mutation doit faire tomber au moins une sonde** ; `git diff` après chaque mutation pour s'assurer d'avoir touché le bon endroit ; commiter le correctif AVANT de muter | une mutation qui ne casse rien |

---

## 10. Faisabilité vérifiée dans le code (avec les données qui existent)

| écran | donnée | où |
|---|---|---|
| Rangée véhicule (phrase d'état, bouton) | `vehEcheances(v)` (assurance, contrôle technique, entretien à la date OU au km, matériel), `vxUrg`, `v.souci`, `v.statut`/`v.immo`, `vxIntsConcernees`, `vxTacheOuverte` (rendez-vous noté ?) | `VEHICULES`, `INTS`, `TACHES` |
| Ligne « Les 4 véhicules » | `vxGroupes()` (clé `veh-flotte-assur-<date>`), `vxFaitGroupe` | existe |
| Chiffres de la liste | « 3 sur 4 » = `statut`; « à faire » = lignes non vertes de `vhEtat` ; « 1 566 € » = somme de `vehMois(v)` (`vehFrais` = frais propres + achats portant la plaque + notes de frais en attente, vérifié à la main : 544,50 + 515,17 + 318 + 188) | existe |
| Coût au kilomètre | `vxCalcCout(v, per)` (frais hors assurance + prime lissée ÷ km depuis le premier relevé) ; « — » tant qu'il manque de la donnée | existe |
| Fiche : « Déjà fait » | `v.hist`, `v.immoHist`, `v.anc`, `v.releves` | existe |
| Mon camion | `rlQui()`, `VEHICULES.find(conducteur)`, `lieuArticles` / `lieuManques`, `vxMonCamion` (état), véhicule de remplacement `v.immo.remplacement` | existe |
| À régler (journées ouvertes) | `POINTAGES.filter(ptOuvert)` ; fin d'habitude `ptxHabFin(k)` (4 dernières semaines) | existe |
| À régler (demandes) | `PAIE.signales[k]` {msg, apres, req} ; `ptxReq`, `ptxReqLib` | existe |
| À régler (alertes légales groupées) | `ptAlertes(k, jours).A` renvoie des alertes `{g, d, t, sem, ouvert}` : **le regroupement par personne et par semaine est NOUVEAU mais se fait sur ces objets** | existe + `ttAReglerLignes()` |
| Qui est où | `ptJour`, `PTX.pause`, `absDe`, `prevuMin`, `PTX.rappele`, `PTX.demande` | existe |
| Semaine (grille et liste) | `ptJourMin`, `ptDuree`, `ptAlertes(...).sup25/sup50`, `PT_VALIDE`, `absDe`, `prevuMin` ; `ptxCartes` (version téléphone actuelle) est remplacée | existe |
| Mois | `paieVariables(k)` (`tot`, `s25`, `s50`, `nuit`, `nAbs`, `ouverts`, `nonValidees`, `confirme`, `signale`) ; `paieEtapes(V)` ; `PAIE_MOIS`, `PAIE_NOM_MOIS` | existe |
| Fiche d'une journée | `ptFicheJour`, `dtPoser`/`dtFermer`, `PT_TRACE`, `paieMoisVerrou(date)` | existe ; **à ajouter** : bouton « Enregistrer la correction » qui appelle les écritures actuelles groupées |
| Mes heures | `paieVariables(k)`, `ptxQuiHeures`, `ptxJoursListe`, `PAIE.bulletins` | existe |
| Accueil | tableau `afaire` de `vueAccueil` (entrées `{c, t, s, go}`) | existe : deux entrées à ajouter |
| Accès du bureau | `DR_CATS` contient déjà `['temps', 'Temps de travail et véhicules']` ; le profil `secr` a `temps:{v:1,c:0,m:0,s:0}` ; le menu final retire le groupe Personnel au bureau ; `DR_SP` porte déjà `corrpt` (« Corriger les pointages ») | existe ; changer l'accès = une case, jamais `role==='gestion'` |

**Rien de ce que cette spécification demande n'exige une donnée qui n'existe pas.** Les seules constructions neuves sont : la date réelle du rendez-vous (`vxRdv` : un champ de date + la tâche à cette date), l'avertissement de confirmation avec une journée ouverte, le panneau « Ajouter une journée » (deux sélecteurs), le regroupement des alertes, et la notification « Demander de confirmer ».

---

## 11. Ce qui reste à soumettre à Justin (trois questions ; la spécification tient debout sans leur réponse)

1. **La secrétaire (rôle « gestion ») doit-elle voir les Véhicules et les heures de l'équipe ?** Aujourd'hui elle n'a ni l'un ni l'autre (le menu final retire « Personnel » au bureau et `aller('vehicules')` la renvoie sur Comptabilité), alors que dans la vraie vie c'est elle qui appelle le garage et qui prépare la paie. **Ma recommandation** : oui pour **Véhicules** (lecture + « Noter un plein », « Noter le rendez-vous », « Noter le contrôle », « Mettre au garage » ; le profil Secrétariat a déjà `temps:{v:1}`), **non pour Temps de travail par défaut** (données de salaire), ouvrable par une case « Voir les heures de l'équipe » du gérant (une case dans `DR_SP`, jamais `role==='gestion'` en dur). *Sans réponse : le menu final reste inchangé (ni l'un ni l'autre).*
2. **OP GESTION calcule-t-il les fiches de paie, ou prépare-t-il seulement les heures pour le cabinet ?** Le commentaire d'ouverture du module pointage dit « OP GESTION ne CALCULE PAS les fiches de paie » ; l'écran Comptabilité › Paie propose « OP GESTION les calcule » (cotisations, impôt prélevé). Une fiche de paie est un document juridique reçu par un salarié. **Ma recommandation** : ne rien trancher dans cette refonte ; les écrans de Temps de travail n'écrivent jamais « on calcule » (seulement « Passer à la paie »), et la question part au `juriste` puis à Justin avant de toucher Comptabilité › Paie. *Sans réponse : la spécification n'écrit pas un mot de paie nouveau.*
3. **« Terminer à 16:48 » et « Accepter 17:40 » : un seul geste, ou une fenêtre de confirmation ?** Les deux modifient des heures qui partent à la paie. Garde-fous prévus : l'heure proposée est celle d'habitude et jamais l'heure courante, la trace (qui, quand, pourquoi) est écrite, le toast porte « Annuler », le salarié reconfirme. **Ma recommandation** : un seul geste (c'est ce qui fait passer « fermer la journée de Tom » de 2 gestes à 1). *Sans réponse : un seul geste ; si Justin préfère une fenêtre, on réemploie `ptxChampsCloture` (une ligne à changer par bouton).*

---

## 12. Limites et risques (à lire avant d'appliquer)

- **Écrans validés touchés par une ligne seulement** : Accueil (deux lignes), Équipe (un mot « travaillées » et des liens), Comptabilité › Paie (mêmes mots et même bouton). Chacun doit être SOUMIS à Justin au moment de l'application, rien ne se glisse.
- **Fonctions partagées à ne pas casser** : `lieuArticles`, `lieuManques`, `lieuValeur`, `sxMonLieu` (Stock), `ACHATS`, `NDF`, `DEM_ACHAT`, `TACHES`, `LIENS_SOURCES`, `notifier`, `journalAjout`, `H_TYPES.vehicule`, `INTS`, `prevuMin`, `ABSENCES`, `absDe`, `paieAller`, `dtPoser`, et les visites guidées qui lisent `VEHICULES`, `POINTAGES`, `PAIE`, `PT_TRACE`. Changer un NOM de champ les ferait mentir.
- **Rien ne s'écrit au seul chargement** : le prototype écrit déjà la notification de 09:30 pour Sophie et Tom au chargement ; à corriger dans la vraie base (jamais d'écriture sans geste). Dates en dur (« 31/10 », `creeLe`, `PT_TRACE.le`) et liste des conducteurs (`vxListeConducteurs`, Julie exclue) : à lire de l'équipe réelle ; dotation « clim » : selon le métier ; photos et plans au format `piece:` en production, jamais `URL.createObjectURL`.
- **Textes juridiques déplacés** (références du Code du travail dans « La règle », phrase « Valider = les heures sont justes, elles pourront aller à la paie ») : relus par `juriste` ; la forme change, le sens ne doit pas.
- **Valeurs de démonstration** : les chiffres de ce document (« 170h », « 46h », « 1 566 € », « 0,23 € ») sont ceux de la démonstration du samedi 31 octobre ; les écrans les calculent.
- **Captures de référence** : les écrans validés ont été relus sur Mac jour et iPhone ; Android, Windows et 320 px ont été MESURÉS par l'étude mais leurs captures n'ont pas toutes été relues. L'agent qui applique regarde ses propres captures sur neuf profils, jour ET nuit, avant de dire « fait » (consigne de Justin du 31 octobre).
- **Ce document ne modifie aucun fichier du dépôt** autre que lui-même.
