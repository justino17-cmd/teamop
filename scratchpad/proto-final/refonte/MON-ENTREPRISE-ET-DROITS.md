# Spécification : « Mon entreprise », les droits d'Équipe qui agissent, « Achats et frais » (voie entreprise, étape 2 sur 8, 17 novembre 2026)

Écrite à partir de `refonte/entreprise-droits-etude.md` (16 novembre), après contrôle dans le code de chaque point d'appui
(`apercu/prototype-op-gestion.html`, 22 889 lignes au 17 novembre : les numéros bougent, les fonctions sont nommées). Cette étape ne modifie
aucune page. La critique (étape 3) puis l'application (étapes 4 et 5) partent de ce document seul : il doit pouvoir être appliqué sans me
reparler. Les mots entre « » sont les libellés EXACTS de l'écran ; les noms en `code` sont ceux du fichier.

## 0. Les deux propositions, et ce qui est tranché

**Le gérant qui n'aime pas l'informatique** voudrait : un écran « Mon entreprise » de quatre cartes au plus, une question par carte ;
pour les droits, des profils (« Secrétariat », « Technicien ») et jamais une grille de quarante cases ; un mot de tous les jours pour
chaque chose ; rien qui lui demande de savoir ce qu'est une « catégorie ».

**La rigueur** exige : chaque case affichée change quelque chose qu'une sonde peut prouver ; une case qui ne peut rien changer pour la
personne qui la porte n'est pas affichée ; le dispositif de garde le plus petit et le plus sûr (la garde protège, le nettoyage de l'écran
montre) ; ce qui ne peut pas être branché vraiment est retiré, pas laissé « en attendant ».

**Tranché : les deux tiennent ensemble parce que la grille reste, mais elle est repliée derrière le profil et générée par la table des
gestes.** Le gérant voit son profil en une phrase (« Secrétariat : voit Interventions, Clients, Devis, Contrats, Comptabilité, Achats et
frais ; ne voit pas… »), il change de profil d'un geste, et s'il ouvre la grille, chaque case porte sa phrase (« Modifier : changer un
client, ses coordonnées, ses notes ») et une case qui n'a aucun geste dans le prototype n'existe pas à l'écran. Pour « Mon entreprise » : cinq
cartes, une phrase d'aide chacune, les champs qui s'impriment quelque part et aucun autre.

### Les vingt décisions (le reste du document les déroule)

1. « Mon entreprise » est une ligne du groupe « Personnel », après « Véhicules » (route `entreprise`), ouverte par la case `admin`
   (Voir), modifiable par `admin` (Modifier). Cinq cartes + une liste de liens. Aucun réglage n'y est copié : une case, un endroit.
2. Elle crée la garde que « Comment ça marche » promettait sans la tenir : **une facture ne PART pas tant que le nom, l'adresse et le
   SIRET manquent** (trois portes d'envoi), et le client sans e-mail retient l'envoi automatique. Le plafond et le « premier passage »
   sont retirés du texte d'aide (ils n'existent pas).
3. L'identité devient modifiable : nom, dirigeant, adresse (rue, code postal, ville), téléphone, e-mail, site, SIRET, TVA, mentions
   légales, assurance en quatre champs, logo, IBAN et BIC, horaires, tarif horaire, durée minimale, trois déplacements, expert-comptable.
   Elle s'écrit dans `ENTREPRISE`, `PARAMS`, `TARIFS`, `CP_EXPERT` (et `PAIE_CAB`) : les ~270 lectures (102 du seul nom) suivent sans câblage.
4. Le bug du pont atelier (l'assurance saisie n'y arrive jamais) est corrigé en unifiant les noms : `assureur`, `assurNum`, `assurc`, `assurZone`.
5. **La forme de l'écran se décide par UNE case : « Travaille sur le terrain »** (elle existe déjà à l'invitation ; elle devient réglable
   sur la fiche). Terrain = les cinq écrans de la personne (Ma journée, Mes frais, Mes heures, Mon camion, Mes congés) + Mes tâches ;
   sinon les écrans d'équipe. Plus aucune décision au NOM du rôle : `sessionRole` lit la case.
6. **Le menu, la barre du bas, la recherche, les raccourcis, l'ouverture et les adresses tapées sont déduits d'UNE table**
   (`ROUTE_DROIT` : route → catégorie, forme) par UNE fonction `droitVoit(route)` qui remplace `drRefuse`, `ROLES[x].routes` et
   `LIGNES_ROLE` pour les rôles internes. Responsable et Secrétariat cessent d'être le même moule.
7. Les cases **Créer / Modifier / Supprimer** agissent par UNE garde de geste (écouteurs en capture) pilotée par une TABLE de gestes
   (`famille|verbe` → catégorie, case), complète par construction (une sonde recense tous les `data-*` du fichier et fait tomber
   toute valeur non classée).
8. Un geste refusé : le bouton **n'est pas dessiné** ; l'écran en lecture seule le dit en une phrase ; un geste qui arrive par un autre
   chemin (raccourci, annulation, atelier) reçoit un message qui dit quoi et à qui demander. Jamais de bouton grisé sans raison.
9. **`tout` (Voir toute l'équipe) est RETIRÉ de l'écran** : le brancher exige un troisième écran (le chef d'équipe), qui n'existe pas.
   `prix`, `atelier`, `valstock`, `commander`, `corrpt`, `comptes` sont BRANCHÉS (les quatre derniers lots après fusion des voies
   Matériel, Temps de travail et Boîte mail) ; repli décidé d'avance pour `prix` (§ 2.8).
10. Une case qui n'a aucun effet pour la FORME de la personne n'est pas affichée (un terrain n'a pas de « Valider le stock des autres »).
11. Les profils types sont réécrits pour donner EXACTEMENT les menus que Justin a validés (gérant, bureau, technicien) et un
    Responsable qui voit tout, sans régler l'entreprise (§ 2.12).
12. « Mes tâches » est toujours ouverte (outil personnel) ; Accueil, Statistiques, Historique, Équipe et Mon entreprise suivent la case
    `admin`, relibellée « L'entreprise et l'équipe ».
13. Le gérant ne peut pas se retirer ses droits (cases désactivées, dernier administrateur protégé : déjà vrai) ; **personne ne règle
    ses propres droits, ni ne donne un droit qu'il n'a pas, ni ne touche la fiche d'un administrateur** (§ 2.11).
14. « Qui a fait quoi » : `journalAjout` remplace lui-même le `'marc'` écrit en dur par `acteur()` ; le reste des acteurs en dur se
    recense et se corrige avant toute garde (lot D1).
15. « Achats et frais » garde son nom ; sa ligne grise au menu devient « Demandes de l’équipe » (127 px mesurés sur 147 disponibles) ; son
    sous-titre dit QUOI ; ses quatre chiffres passent « ce que je décide ici » d'abord ; une aide en trois phrases.
16. Les phrases qui renvoient à « Paramètres » (un écran qui n'a jamais existé) deviennent des liens vers « Mon entreprise ».
17. L'identité saisie est du texte injecté dans les gabarits : 63 lectures de `ENTREPRISE.nom` sur 102 ne l'échappent pas ; les champs refusent donc `< > "` (et le refus se prouve).
18. Le prototype ne garde rien d'un rechargement à l'autre : « Mon entreprise » aussi (comme tout le reste) ; le message le dit en mode
    nu seulement (`enApp()` le tait).
19. La coque `ROLE` reste (patron, gestion, tech, compta, client) : c'est la FORME d'écran, pas un droit. Les ~40 décisions « au nom
    du rôle » qui refusent ou cachent un geste deviennent des cases (liste § 2.9) ; celles qui choisissent entre deux mises en page restent.
20. Ce qui est laissé de côté et les doutes à dire à Justin sont au § 6 et au § 7 : jamais décidés en silence.

---

## 1. « Mon entreprise »

### 1.1 Place, nom, icône

- Ligne du groupe « Personnel » dans `CATS`, après « Véhicules » : `['entreprise', '🏢', 'Mon entreprise']`. Le groupe compte quatre lignes
  (Équipe, Temps de travail, Véhicules, Mon entreprise) : la règle « jamais un groupe d'une seule ligne » tient, aucun mot de groupe ne
  change. Le sous-titre de la ligne : aucun (le nom se suffit ; une ligne grise de plus ferait deux rythmes dans le même groupe).
- Icône : `IC.entreprise` en trait, dans le style des autres (bâtiment simple : `<path d="M4 20V6l8-3 8 3v14"/><path d="M9 20v-5h6v5M8.5 9.5h1M14.5 9.5h1M8.5 12.5h1M14.5 12.5h1"/>`),
  jamais l'émoji seul. Libellé court de la barre : « Entreprise » (`MB_COURT.entreprise`), pour qui la mettrait dans sa barre.
- Pastille sur la ligne (`rlPastille('entreprise')`) : le nombre de choses obligatoires qui manquent (0 à 3 : nom, adresse, SIRET),
  **seulement pour qui peut modifier** (`peut('admin','m')`). Rien d'autre : pas de carte ajoutée à l'Accueil (écran validé).
- La route est connue de `vues()`, de `CAT_LIGNES` (donc de `routeConnue`) ; `BASE` n'en a pas besoin. `A_REFAIRE`/`estGrise` : la
  ligne est « faite » (`fait=1`) dès le premier jour.
- Qui la voit : la case `admin` › Voir (§ 2.6). Qui la modifie : `admin` › Modifier. Un Responsable (admin Voir seulement) la lit, sans
  bouton « Modifier » (§ 2.8 pour la présentation).

### 1.2 Structure de la page

**Ordinateur (au moins 761 px)** : grammaire de l'écran Équipe, mêmes classes.

```
<div class="tete"><div><span class="surtitre">Personnel</span><h1>Mon entreprise</h1>
  <span class="gris">Ce qui s’écrit sur tes factures, tes devis et tes courriels, et la façon dont tu travailles. Tu le règles une seule fois, ici.</span></div></div>
[bandeau d’état]                       ← une ligne, voir 1.3
<div class="bx-grille eq-grille"> 5 × <button class="carte bx-c eq-c" data-ent="carte|<clé>"> </div>
<div class="groupe">Ce qui se règle ailleurs</div>
<div class="fo-bloc"> 6 × <button class="ligne-clic" data-ent="lien|<clé>"> </div>
```

Chaque carte, dans cet ordre :
`<span class="bx-t"><span class="eq-av">[initiales ou icône]</span><span class="fo-n"><b>Titre</b><span class="gris petit">la phrase d’aide</span></span><span class="st st-v|st-o">Complète|À compléter</span></span>`
puis `<span class="eq-puces">` avec la ou les valeurs principales (jamais plus de deux lignes). Toucher la carte ouvre un PANNEAU
(`ouvrirPanneau`, comme `cxFicheLegale` et `eqInviter`) ; jamais une page de plus, jamais de champ posé directement dans la grille.

**Téléphone** : mêmes éléments, une colonne, le titre sur une ligne, l'état sous le titre si les deux ne tiennent pas côte à côte
(mesuré à 320, 360 et 390 px) ; la liste de liens garde une cible de 44 px au moins ; le panneau est la feuille habituelle (plein écran
sous 760 px) avec « Enregistrer » collé en bas. Les champs ont la taille des écrans validés (48 px de haut, 16 px de texte : un champ à
moins de 16 px fait zoomer l'iPhone). Une adresse, un IBAN ou un nom très long (60 caractères) passe à la ligne, ne déborde pas.

### 1.3 Le bandeau d'état

Une ligne sous le titre, `role="status"` :
- **fiche incomplète** (`entrepriseManque()` non vide) : `.alerte` orange : « Il manque {le nom de l’entreprise, ton adresse, ton SIRET} :
  une facture ne peut pas partir sans. » + bouton `.btn` « Compléter » qui ouvre la première carte à compléter. Les éléments manquants
  s'écrivent avec « et » avant le dernier (« ton adresse et ton SIRET ») ;
- **fiche complète** : `.ok-bloc` vert : « Ta fiche est complète : tes factures peuvent partir. » (une fois la fiche légale aussi
  complète : « …et tes mentions légales sont en règle. » ; sinon « Il reste ton assurance à compléter » comme le fait le toast actuel).

`entrepriseManque()` rend la liste des OBLIGATOIRES seuls : nom, adresse (rue ET code postal ET ville), SIRET. Les autres champs
(forme, capital, immatriculation, assurance) restent ceux que `cxMentionsManquantes()` compte déjà dans « Aux normes » : pas de second
décompte.

### 1.4 Les cinq cartes : champs, libellés, validations, destination

Chaque champ : étiquette au-dessus, `.champ` + `.saisie`, `autocomplete` adapté, aide en `.faible`. « Enregistrer » ferme le panneau,
fait `rendre()`, annonce par un toast. Chaque valeur écrite l'est **sous un nom que les lecteurs actuels connaissent déjà**.

**Carte 1 · « Ton entreprise »** — aide : « Son nom, son adresse, comment la joindre. » État : complète si nom + adresse.
Résumé : le nom, puis « {rue}, {cp} {ville} », puis « {téléphone} · {e-mail} ».

| Étiquette | Écrit | Règle | Message d'erreur exact |
|---|---|---|---|
| Nom de l’entreprise (obligatoire) | `ENTREPRISE.nom` | 1 à 60 signes, sans `< > "` | « Le nom de l’entreprise est obligatoire. » · « Ce champ ne peut pas contenir de signes < > ni de guillemets droits. » |
| Ton nom, comme dirigeant | `ENTREPRISE.patron` | 0 à 60 signes, mêmes interdits | idem · aide : « Il est écrit dans tes contrats (« représentée par… »). » |
| Rue et numéro (obligatoire) | morceau de `ENTREPRISE.adr` | 1 à 80 signes | « Il manque la rue, le code postal ou la ville : une facture doit porter ton adresse. » |
| Code postal (obligatoire) | idem | cinq chiffres | « Le code postal a cinq chiffres. » |
| Ville (obligatoire) | idem | 1 à 50 signes | (même message que la rue) |
| Téléphone | `ENTREPRISE.tel` | chiffres, espaces, +, ., - ; 0 ou 6 à 20 signes | « Ce numéro de téléphone ne semble pas juste. » |
| Adresse e-mail | `ENTREPRISE.mail` | forme `a@b.cc` si remplie | « Cette adresse e-mail ne semble pas juste. » |
| Site internet | `ENTREPRISE.site` | 0 à 80 signes ; `https://` ajouté si absent | (aide : « Il s’écrit dans les documents sur mesure. ») |

`ENTREPRISE.adr` reste UNE chaîne « rue, 17000 Ville » : `opdDonnees()` la découpe par `/^(.*?),\s*(\d{5})\s+(.+)$/`, les 19 lectures
la reprennent telle quelle. Le panneau préremplit par cette même expression ; une adresse qui ne s'y plie pas remplit « rue » seule et
laisse code postal et ville vides (c'est alors « à compléter », honnêtement).

**Carte 2 · « Tes mentions légales »** — aide : « Ce qui s’écrit en bas de chaque facture et de chaque devis. » État : complète si SIRET
valide ET `cxMentionsManquantes()` vide ; « à compléter » sinon. Résumé : « SIRET {n} · {forme} ». Le panneau est `cxFicheLegale`
(une seule fonction : le bouton « Compléter ma fiche légale » de Comptabilité › Conformité › « Les mentions obligatoires » l'ouvre
toujours, c'est un lien vers elle) ; il perd les trois « gris » SIRET / TVA qu'il montrait sans pouvoir les changer et gagne :

| Étiquette | Écrit | Règle | Message |
|---|---|---|---|
| SIRET (obligatoire) | `ENTREPRISE.siret`, rangé « 123 456 789 00012 » | 14 chiffres (espaces permis) ; les 9 premiers passent `cxSirenOk` | « Le SIRET a quatorze chiffres. Tu le trouves sur ton avis de situation de l’Insee ou sur l’Annuaire des entreprises (annuaire-entreprises.data.gouv.fr). » · « Ce SIRET ne semble pas juste : le numéro de contrôle ne correspond pas. Vérifie-le. » |
| Numéro de TVA | `ENTREPRISE.tva` | vide permis ; sinon `FR` + 2 chiffres + 9 chiffres (espace permis) | « Un numéro de TVA français commence par FR, puis deux chiffres et les neuf chiffres de ton SIREN. » (aide : « Laisse vide si tu ne factures pas de TVA. » : ce que le PDF écrit alors est laissé de côté, § 6) |
| Forme juridique, Capital social, Immatriculation | inchangés (`forme`, `capital`, `rcs`) | inchangées (`ficheok` actuel) | inchangés |
| Assureur | `ENTREPRISE.assureur` | ≤ 80 | — |
| Numéro de contrat | `ENTREPRISE.assurNum` | ≤ 40 | — |
| Coordonnées de l’assureur | `ENTREPRISE.assurc` | ≤ 120 | — |
| Zone couverte par l’assurance | `ENTREPRISE.assurZone` | ≤ 80 | — |
| Médiateur de la consommation | `ENTREPRISE.mediateur` | ≤ 120 | — |

**Noms unifiés** (le bug du pont atelier) : on adopte ceux que lit `opdDonnees()` / l'atelier, parce qu'ils sont déjà séparés : `assur` →
`assureur`, `zone` → `assurZone`, et le numéro de contrat sort de `assur` pour devenir `assurNum`. À réécrire : `cxFicheLegale`,
`ficheok`, `cxMentionsManquantes` (`E.assureur && E.assurc && E.assurZone`), `cxPdfManque`, et les deux enveloppes de `pdfFacture` et de
`docDevis` (pied : « Assurance : {assureur}{ n° assurNum} ({assurc}), zone couverte : {assurZone} »). `ENTREPRISE.assureur` n'a pas de
valeur de départ : aucune migration. Contrôle : taper « Assurances Océan » dans la carte, ouvrir l'atelier de devis, lire le bloc identité
(message `opd_donnees`, `opdSync` rappelé par `rendre()`).

**Carte 3 · « Ton logo »** — aide : « Il s’écrit en haut de tes factures, devis et contrats. » État : « Choisi » / « Les initiales {CS} sont
utilisées » (jamais « à compléter » : le logo est facultatif). Panneau : un aperçu 96 px ; « Choisir une image » (`<input type="file"
accept="image/png,image/jpeg,image/svg+xml">`) ; « Retirer le logo » (si présent). Règles : 1 Mo au plus (« Cette image pèse plus de 1 Mo :
choisis-en une plus légère. »), lue par `FileReader` en `data:` URL, **jamais envoyée nulle part** ; le SVG est refusé s'il contient
`<script` ou `on…=` (« Ce fichier n’est pas accepté. »). Écrit : `ENTREPRISE.logo` (data URL ou vide). `logoEnt(classe)` rend
`<img class="logo-ent" src="…" alt="">` ou `<span class="logo-ent">{initiales}</span>` (initiales = première lettre des deux premiers mots
du nom, « CS » pour « Clim Services 17 ») ; il remplace les **19 `class="logo-ent">CS<`** (devis, facture, contrat, bilans, registre, espace
client, bon de paie…), la règle CSS `.logo-ent` gagnant `object-fit:contain` et `overflow:hidden`. Le logo n'atteint pas l'atelier
(§ 6).

**Carte 4 · « Pour être payé »** — aide : « Où tes clients peuvent te payer, et qui est ton expert-comptable. » État : complète si IBAN
rempli. Panneau en deux groupes `.groupe` :
- « Ton compte » : IBAN (`ENTREPRISE.iban`, 14 à 34 signes ; contrôle mod 97 ; « Cet IBAN ne semble pas juste. Vérifie-le : il commence
  par FR et compte 27 caractères. ») ; BIC (`ENTREPRISE.bic`, 8 ou 11 signes ; « Un BIC a huit ou onze signes. ») — le BIC s'ajoute à la
  ligne IBAN des PDF natifs et alimente l'atelier ;
- « Ton expert-comptable » : Cabinet (`CP_EXPERT.cab`), Son nom (`CP_EXPERT.qui`), Son e-mail (`CP_EXPERT.mail`, forme e-mail). Écrit aussi
  `PAIE_CAB` (copie faite au chargement : `{nom, qui, mail}`) : sans ça, « Envoyer à ton expert-comptable » et la paie parleraient à deux
  cabinets. Aide : « Les bilans et la paie lui sont envoyés d’ici. ».

**Carte 5 · « Tes horaires et tes prix »** — aide : « Ta journée de travail, ton tarif et tes déplacements : le planning, les devis et les
factures au temps les reprennent. » État : toujours complète (valeurs de départ). Panneau :
| Étiquette | Écrit | Règle | Message |
|---|---|---|---|
| Ta journée de travail : de … à … | `PARAMS.debut` / `PARAMS.fin` (minutes ; deux `input type="time" step="900"`) | début avant fin, au moins 4 h entre les deux | « La journée doit durer au moins quatre heures. » |
| Tarif horaire (€ HT de l’heure) | `TARIFS.horaire` | 1 à 500, décimale à virgule acceptée | « Le tarif de l’heure doit être compris entre 1 et 500 €. » |
| Durée minimale facturée (en heures) | `TARIFS.minimum` (minutes) | 0,5 à 4 par pas de 0,5 | « Choisis une durée entre une demi-heure et quatre heures. » |
| Déplacement, zone 1 · zone 2 · zone 3 (€ HT) | `TARIFS.zone[1..3]` | 0 à 500 chacun | « Un déplacement coûte entre 0 et 500 €. » |
Aide sous les zones : « La zone d’un client dépend de sa commune : la zone 1 est la plus proche, la zone 3 la plus éloignée. » (`COMMUNES` :
La Rochelle, Lagord, Aytré… zone 1 ; Nieul-sur-Mer zone 2 : vérifié). `TARIFS.arrondi` n'est lu nulle part : il n'est PAS proposé.
Destinations vérifiables : créneaux libres du planning (`PARAMS`, 14 lectures), assistant et facture « au temps » (`TARIFS`, 19 lectures).

**Pas de carte « Tes métiers »** : c'est une ligne de la liste de liens, en lecture seule (1.6).

### 1.5 Ce qui n'est PAS dans la page (et pourquoi)

Délai de paiement, pénalités, indemnité de 40 € (écrits en dur dans `envoyerFacture` et `pdfFacture`) : Comptabilité est validée (« ça c'est
bon ») et ses contrôles de conformité les lisent ; § 6. Numérotation des documents : § 6. Apparence Jour/Nuit, barre personnalisée, vues du
planning : état de l'APPAREIL, jamais d'une entreprise (restent au pied du menu et sur la barre). Places de l'abonnement, habilitations
exigées : restent dans Équipe (écran validé).

### 1.6 Les liens « Ce qui se règle ailleurs »

Six lignes `.ligne-clic` (nom en gras, état en gris, `›`), chacune MENE à l'endroit où la case vit (aucune copie) :

| Ligne | État écrit (calculé) | Mène à |
|---|---|---|
| Rendez-vous en ligne | « Ouvert {n} jours par semaine » / « Fermé » (`RDV_REGLES`) | Planning, panneau `panneauReglagesRdv` (via `aller('planning')` puis ouverture, comme `data-eq="planning"`) |
| Facture envoyée toute seule | « Activée » / « Désactivée » (`reglages.auto`) | Comptabilité › Factures et avoirs, bas de page « Le plus simple possible » |
| Notes de frais | « {n} règle{s} » (`NDF_REGLE`, prix du kilomètre) — pour qui peut les modifier | Achats et frais › Notes de frais › « Changer » |
| Sorties de stock à valider | « Activé » / « Désactivé » (`STK_VALID`) | Stock › « À valider » (à rebrancher quand la voie Matériel a fini) |
| Boîtes mail | « {n} boîte(s) connectée(s) » (`ML_BOITES`) | Boîte mail › « Boîtes connectées » (le module a ses réglages ; ne pas en écrire un troisième) |
| Tes métiers | « {métier(s)} » (`PACKS_ENT`) | panneau en lecture seule : la liste des métiers cochés, « Réglé par TEAM OP à l’ouverture de ton compte. » (phrase déjà dans `mchPanneau`) — **le bouton « Métiers » de la bande de test reste hors du mode application** |

Une ligne dont la destination est refusée à la personne (`droitVoit`) n'est pas dessinée. « La facture électronique » (R15) reste un
lien depuis la fiche légale (Conformité).

### 1.7 La garde de la facture : ce qui est bloqué, et ce que la personne lit

**Constat** (code lu) : `ACTIONS.terminer` n'envoie que si `reglages.auto` ET toutes les lignes ont un prix ; `envoyerFacture`,
`ACTIONS.envoyer`, l'envoi d'un devis et d'un contrat ne regardent jamais l'identité. Des six retenues du texte « Comment ça marche »,
une seule existait.

**Décision.** Trois portes d'ENVOI de facture lisent `entrepriseManque()` en première instruction : `envoyerFacture(f)`, `ACTIONS.envoyer`
(quand l'objet est une facture), et l'envoi automatique dans `ACTIONS.terminer`. Si quelque chose manque :
- rien ne part, la facture reste « à valider » (brouillon) ;
- le message (toast à bouton, ou panneau si l'appel venait d'un panneau) : « Il manque {ton SIRET} sur ta fiche : une facture doit le porter.
  Ça prend trente secondes. » + bouton « Compléter » (ouvre `aller('entreprise')` puis la carte concernée) ;
- l'envoi d'un DEVIS et d'un CONTRAT n'est pas bloqué (le devis n'engage pas ; § 7, doute 1) mais le message est le même, en toast, sans blocage ;
- la prévisualisation et le téléchargement d'un brouillon restent possibles (le PDF porte déjà « brouillon »).

**`ACTIONS.terminer`** gagne aussi la retenue « client sans e-mail » (`!CLIENTS[f.cli].mail` → reste « à valider », avec la raison déjà
écrite pour les lignes sans prix). **« Je ne peux pas finir »** : vérifier que seul `terminer` fabrique la facture automatique (alors la
phrase est vraie par construction) ; sinon la retirer du texte.

**« Comment ça marche »** (`ACTIONS.commentAuto`, carte « 2 · Envoyer toute seule ») est réécrit pour ne promettre que ce qui existe :
« Elle ne part jamais seule — elle t’attend « à valider » — si : • une ligne n’a pas de prix ; • le client n’a pas d’adresse e-mail ;
• le technicien a cliqué « Je ne peux pas finir » ; • il manque ton nom, ton adresse ou ton SIRET dans « Mon entreprise » (lien). » Les
lignes « plafond » et « premier passage » sont retirées (§ 6).

### 1.8 Les phrases qui renvoient à un écran « Paramètres » absent

| Où (fonction) | Texte actuel | Texte nouveau |
|---|---|---|
| `ACTIONS_CREA.cAjoutType` | « …(réglable aussi dans Paramètres). » | parenthèse retirée (aucun écran n'existe pour les types d'intervention ; § 6) |
| aide des créneaux (création d'intervention, vue jour) | « …entre 7 h et 18 h (horaires de l’entreprise, dans Paramètres) » | « …entre 7 h et 18 h (tes horaires, dans <lien>Mon entreprise</lien>) », le lien `data-go="entreprise"` caché au rôle qui ne la voit pas |
| `panneauReglagesRdv` | surtitre « Paramètres » | surtitre « Planning » |
| `ACTIONS.commentAuto` | « il manque ton SIRET ou ton adresse dans tes réglages » | voir 1.7 |
| visite « à venir » (`avenir`, par rôle) | « Patron : les réglages, l’équipe, les chiffres » | « Patron : ton entreprise, l’équipe, les chiffres » |
| atelier (`page.source`, fenêtre « Mon entreprise ») | « Ton entreprise se règle dans OP GESTION. Son nom… » | même phrase ; le bouton « Compris » devient « Ouvrir Mon entreprise » (message `opd_fermer {motif:'entreprise'}` ; le parent ferme l'atelier puis `aller('entreprise')`) — **dernier de la liste, coordonné avec la voie compositeur (même fichier `page.source`)** |
| `NV_PLACE` « Boîtes mail (Paramètres) → … » | colonne « avant » | **inchangée** : c'est l'ancienne application, pas un renvoi |

### 1.9 Messages quand quelque chose manque, à l'écran

- Carte à compléter : pastille `st st-o` « À compléter » + en gris sous le titre ce qui manque (« SIRET », « adresse »).
- Un champ refusé : la valeur reste, le champ prend le focus, le message est un toast (comme tous les formulaires validés) **et** le texte
  du champ est entouré (`aria-invalid="true"`) ; jamais d'alerte du navigateur.
- Lecture seule (Responsable) : pas de « Enregistrer » ; les panneaux s'ouvrent, champs désactivés, première ligne : « Tu peux regarder cette
  fiche ; c’est le gérant qui la modifie. » (§ 2.8).

---

## 2. Les droits

### 2.1 Le modèle, tel qu'il est (contrôlé) et ce qui change

- `DR_CATS` : 10 catégories × 4 cases (`v c m s`) = 40 ; `DR_SP` : 7 « droits à part » ; `PROFILS` : admin, resp, secr, tech, compta ; une
  personne porte `droits = {profil, cats, sp}`, un `*` après le profil veut dire « ajusté » ; `EQUIPE` : Marc (admin), Julie (`secr`),
  Sophie, Léa, Tom (`tech`), Karim (`tech*`, atelier et valstock).
- **Ce qui agit aujourd'hui** (relu) : seulement `drRefuse` pour la gestion et le technicien (7 « Voir »), plus `mbxAcces` (`com.v`). Les 30
  cases Créer / Modifier / Supprimer et les 7 droits à part **n'agissent sur rien** ; la fiche l'écrit elle-même en petit (« …ne sont pas encore
  appliqués »).
- `sessionRole(p)` range tout le monde en quatre moules par le NOM du profil ; Responsable et Secrétariat sont le même moule
  (mêmes sept lignes).
- Confirmé par une mesure au navigateur le 17 novembre (mode application) : Marc 19 lignes, Julie 7 (Mes tâches, Interventions, Clients,
  Devis, Contrats, Comptabilité, Achats et frais ; barre : Comptabilité, Devis, Clients, Mes tâches, Achats et frais ; ouverture :
  Comptabilité), Sophie et Karim 6 (Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés ; ouverture : Ma journée).
  **Ces trois menus sont ceux que Justin a validés : ils doivent sortir tels quels des profils types (§ 2.12).**

### 2.2 Les cinq règles (tout le reste en découle)

1. **Une case se lit à UN endroit.** Navigation : `droitVoit(route)`. Geste : `peut(cat, x)` (`x` = `c`, `m`, `s`) dans la garde. Aucune
   autre lecture de `droits.cats` / `droits.sp` n'est permise hors de l'affichage de la fiche et de « Qui peut quoi » (`test` de recensement, § 5).
2. **La garde protège, l'écran montre.** Un bouton qui reste visible alors que sa garde le refuserait est un défaut de présentation ; un
   geste qui passe alors que son bouton était caché est un défaut de SÉCURITÉ. La garde est donc complète d'abord, le nettoyage ensuite.
3. **La portée d'une case suit la forme de la personne.** Sur un écran d'équipe, `c`/`m`/`s` portent sur tout ce qui s'y voit ; sur l'écran
   personnel d'un terrain, sur ce qui est à lui (sa demande, sa note, son pointage, sa journée). Un geste qui change l'état de QUELQU'UN
   D'AUTRE (valider, refuser, décider, corriger) vit seulement sur un écran d'équipe : un terrain ne l'a jamais.
4. **Un geste qui n'est pas dans la table est refusé comme une modification** (`m` de sa catégorie) tant que la sonde de complétude n'a pas
   obligé à le classer : le défaut est fermé, pas ouvert.
5. **Ce qu'on ne peut pas prouver ne s'affiche pas** : une case sans geste dans la table, ou sans effet pour la forme de la personne,
   n'est pas dessinée dans la fiche (elle garde sa valeur dans les données ; elle n'est pas comptée par « Qui peut quoi »).

### 2.3 La forme de l'écran : « Travaille sur le terrain »

Les deux candidats de l'étude sont tranchés ainsi :
- **A (retenu pour la forme)** : la forme suit la case « Travaille sur le terrain » (`p.terrain`, déjà posée à l'invitation ; Sophie, Léa, Tom, Karim
  en sont par `EQX_BASE`). Terrain → `sessionRole` rend `'tech'` (la coque des cinq écrans de la personne) ; sinon `'gestion'` ; `admin` →
  `'patron'` ; profil `compta` → `'compta'` (inchangé : « ouvert depuis sa fiche Équipe »).
- **B (`tout`) est retiré** : il n'a de sens que pour un terrain qui verrait aussi l'équipe, donc une troisième forme. Les 320 lectures de
  `INTS` ne se filtrent pas à la lecture ; et la coque `tech` remplace déjà les écrans d'équipe par les écrans personnels (`vueStock` →
  `vueMonCamion`, `vueVehicules` ne montre que son véhicule, `axEstTech`, `sxEstTech`…) : lui ajouter Planning ou Interventions mènerait à des
  écrans jamais exercés dans cette coque. Le chef d'équipe qui validerait les sorties de ses équipiers (Karim) est le même besoin : § 7, doute 2.

**Conséquences écrites une fois :**
- la case « Travaille sur le terrain » devient réglable sur la fiche, première ligne du bloc « Droits » (§ 2.4) ; à l'invitation, sa valeur
  de départ suit le profil choisi (Technicien : cochée ; Responsable, Secrétariat : décochée), et le choix d'un profil sur la fiche ne la
  change pas (c'est un fait sur la personne, pas un droit) ;
- un terrain ne reçoit que les lignes personnelles (Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés, Registre
  sanitaire si le pack 3D est pris) ; la grille de sa fiche ne montre que les six catégories qui ont un écran personnel (`planif`, `inter`,
  `crm`, `stock`, `temps`, `achats`) et les trois droits à part qui y changent quelque chose (`atelier`, `prix`, `corrpt`) ;
- une personne non terrain reçoit les écrans d'équipe, jamais les cinq écrans personnels (le gérant qui collait `#mesheures` lisait les
  heures de Sophie : l'exclusion des quatre routes de salarié de `rlPermis` devient la règle de forme).

### 2.4 Ce que la fiche d'une personne montre APRÈS (écran Équipe › fiche, rien de redessiné)

L'ordre du bloc « Droits » reste celui de la fiche actuelle (`eqFiche` redéfinie par l'écran Équipe) ; ce qui change est écrit en gras.

```
Droits · profil Secrétariat, ajusté                        ← eqxProfilTitre (inchangé)
En plus : … En moins : …    Revenir au profil Secrétariat   (inchangé)
Appliquer un profil [Choisir…]                              (inchangé ; la liste = Responsable, Secrétariat, Technicien, Comptable)
**[☐/☑] Travaille sur le terrain   — « Il voit son téléphone : sa journée, ses frais, ses heures, son camion, ses congés. Décoché : il voit les écrans du bureau. »**
**Ce que {Julie} voit : Mes tâches, Interventions, Clients, Devis, Contrats, Comptabilité, Achats et frais.**   ← phrase calculée par rlLignes() de la personne
**Ce qu’elle ne voit pas : Planning, Stock, … **                                                    ← uniquement les lignes que la table sait fermer
Les droits à part (cases, voir § 2.7)
▸ Voir et régler les droits détaillés par catégorie        (details, replié ; ouvert, la grille 10 × 4)
```
Textes exacts :
- Retirés : « Dans ce prototype, ces cases ne changent pas encore… » (`enApp()` ne décide plus) et « Créer, Modifier, Supprimer et les droits à part
  ne sont pas encore appliqués. ».
- Remplacé par, une seule fois au-dessus de la grille : « Décocher « Voir » cache la rubrique et ferme son adresse. Décocher « Créer »,
  « Modifier » ou « Supprimer » retire le bouton correspondant : la personne regarde, elle ne change rien. »
- **Libellé de catégorie** (`DR_CATS`, `EQX_CATS`) : `planif` « Planning et absences » (les Tâches sortent des cases : outil personnel,
  § 2.6) ; `admin` **« L’entreprise et l’équipe »** (Accueil, Statistiques, Historique, Équipe, Mon entreprise, et la paie : § 2.5). Ce
  libellé se répercute dans « Qui peut quoi », la matrice, `eqxProfilDit`, `eqxDiff`, l'aide de l'invitation.
- **Sous chaque ligne de la grille, au toucher/survol/focus de l'en-tête de colonne et dans l'`aria-label` de chaque case**, la phrase de la case
  (§ 2.5) : « Clients : modifier — changer un client, ses coordonnées, ses notes ». Sur téléphone, la ligne d'une catégorie s'ouvre en une
  feuille de quatre lignes (une case, sa phrase) au lieu de quatre cases serrées dans 360 px (la table `eq-dr` actuelle).
- Une case DÉSACTIVÉE (administrateur, ou la propre fiche de la personne connectée) dit pourquoi, sous la grille : « Les droits d’un
  administrateur ne se retirent pas. » / « Tu ne peux pas régler tes propres droits : c’est une autre personne qui le fait. ».
- **Quand on décoche « Voir » d'une catégorie** : `c m s` tombent à 0 (déjà vrai). **Quand on coche « Créer/Modifier/Supprimer »** : « Voir » se
  coche (déjà vrai). Chaque changement écrit la ligne d'historique existante et le toast « Annuler » existant (`eqxFait`).
- La phrase « Ce que {prénom} voit » est la MÊME que celle qui construit son menu (`rlLignes()` évalué pour cette personne, jamais une
  liste parallèle) : c'est la preuve visible qu'une case et un menu ne se contredisent pas. Fonction : `rlLignesDe(personne)` (`rlLignes`
  reçoit la personne en paramètre optionnel ; sans paramètre, la session).

### 2.5 Ce que chaque case change — catégorie par catégorie (la table de vérité)

`Voir` = la ou les lignes de menu qu'elle ouvre (et leurs adresses, liens de fiche, recherche, raccourcis). `Créer/Modifier/Supprimer` =
les gestes ci-dessous. Familles `data-*` d'après l'annexe A de l'étude ; **la table finale se fabrique par `gestes.js`** (§ 4, lot D3) :
chaque verbe y reçoit sa case selon ces définitions, et la colonne « quelques gestes » en donne les exemples témoins que les sondes jouent.

| Catégorie | Voir ouvre | Créer = | Modifier = | Supprimer = | Quelques gestes (famille\|verbe) |
|---|---|---|---|---|---|
| `planif` Planning et absences | Planning ; Absences et congés (équipe) ou Mes congés (terrain) | poser sur le planning, créer une absence, (terrain) demander un congé | déplacer, redimensionner, changer de technicien, décider d'une absence, (terrain) corriger sa demande | retirer du planning, annuler une absence | `planconf\|annuler,supprimer` ; glisser (`poser()`) ; `a…` des absences à recenser à la main |
| `inter` Interventions | Interventions (équipe) ou Ma journée (terrain) ; Registre sanitaire (pack 3D) | créer une intervention | modifier une fiche, terminer, noter, photographier, signer, « Je ne peux pas finir » | supprimer une note, une photo, une pièce | ACTIONS `creerOk`, `modifIntOk`, `terminer`, `noteOk`, `photoSuppr`, `pieceSuppr` ; `rg\|…` (registre) |
| `crm` Clients | Clients (équipe) ; fiche client ; (terrain) « Ce que voit le client » | créer un client | changer ses coordonnées, ses notes, son SIREN | (aucun geste : la case n'est pas dessinée) | ACTIONS `clientNouveau`, `clientEnreg` ; `cx\|sirenok` (Comptabilité) reste `compta.m` |
| `ventes` Devis, factures, contrats, paiements | Devis, Contrats, Devis xylophage (pack 3D), fiches facture et contrat, signature | créer un devis, un contrat, une facture, un avoir, noter un encaissement | modifier, envoyer, relancer, faire signer, noter une réponse du client | supprimer un devis ; effacer une signature | `dv\|nouveau,creerInt,ligneAj` · `dv\|envoyer,relancer,signer,clientRefus` · `dv\|supprimer` ; ACTIONS `nouvelleFacture`, `ajoutEncOk`, `avoirOk`, `envoyer`, `creerContrat`, `signerContrat`, `sigCtrEfface` ; atelier : message `opd_role` étendu (§ 2.10) |
| `compta` Comptabilité | Comptabilité (et Factures, Paiements par la recherche et les adresses) | nouvelle dépense, nouvelle écriture | payer, valider, relancer, saisir une dépense ; la fiche légale, la plateforme, les SIREN | supprimer une prime de paie | `cx\|nouveau,payer,payerliste,factureok,depenseok,ficheok,sirenok,plateformeok` · `cxaf\|relancer,facturer,payer,valider` · `cp\|payer` ; **la paie** (`paie\|…`, 13 verbes) demande en plus `admin.m` (§ 2.5 bis) |
| `stock` Stock, fournisseurs, dépôts | Stock, Fournisseurs…, Dépôts et camions, Carte des box (3D) ; (terrain) Mon camion | créer un produit, un fournisseur, un dépôt, une box, une commande ; ajouter à son camion | modifier, inventorier, transférer, réceptionner, cocher « pris / oublié » dans son camion | retirer, jeter, supprimer, fermer une box | `pr\|nouveau,modif,garder,retirer,retirerok` · `fo\|…` · `bxl\|…` · `sk\|…` · `mat\|…` (Mon camion) · `ce\|…` · `cm\|…` — **gardes posées en DERNIER, après la fusion de la voie Matériel** |
| `temps` Temps de travail et véhicules | Temps de travail, Véhicules ; (terrain) Mes heures | ajouter un pointage, un véhicule, un plein, une dépense véhicule, (terrain) pointer | modifier un véhicule, valider des heures, terminer une journée, entretien, sinistre, amende | clore un pointage, supprimer un frais ou un document de véhicule | `pt\|ajout,closok,clore` · `ptx\|…` · `tt\|…` · `ve\|…` · `vx\|…` — **gardes en DERNIER, après la fusion de la voie Temps de travail et Véhicules** ; corriger = `corrpt` en plus |
| `com` Boîte mail | Boîte mail (et la décision « confier un courriel » : `mbxAcces`, déjà là) | écrire, connecter une boîte, ajouter une règle | répondre, classer, confier, changer les réglages | supprimer, déconnecter, retirer une règle | `mbx\|add,addstop,addpas,addfin,confok,reco` · `ml\|ajout,reco,confok` · `mbx\|decook,rmregle,deco` — **le module `prototype-courrier.js` : le pont reçoit les droits (§ 2.10)** |
| `achats` Achats et frais | Achats et frais (équipe) ; (terrain) Mes frais | faire une demande (`＋ Demande`), une note de frais | décider : accepter, refuser, transférer, commander, valider une note, fixer un budget, un prix du kilomètre | annuler une demande, supprimer une note | `ac\|transfert,commande,magasin,refuser,payer,virement,ndfok,refok,virok` · `axa\|dem,demok,budgetok,tickok,toutval,nonok,toutok,relancer,renvoyer,precok,kmok,demannul` · `rl\|ndfmodok,ndfok,ndfsuppr` |
| `admin` L’entreprise et l’équipe | Accueil, Statistiques, Historique, Équipe, Mon entreprise | inviter une personne, ajouter une habilitation | modifier une fiche, des droits, des habilitations, **régler l'entreprise**, la paie | désactiver un compte, annuler une invitation, retirer une règle d'habilitation | `eq\|inviter,inviterok,renouv,habajout,habok` · `eqx\|modifok,modifier,profok,cgarder,garder,regajout,regsuppr,desact,desactok,annulinv,placeok` · `ent\|…` (Mon entreprise) |

**§ 2.5 bis — la paie et « régler l'entreprise » sont une seule règle** : `cxEstPatron()` (5 lectures : onglet Paie, règles de notes de
frais, certaines actions de la paie) devient `peut('admin','m')`, et `Mon entreprise › Enregistrer` aussi. Une seule phrase pour la fiche :
« Modifier : régler l’entreprise, les comptes et les droits, et la paie. » Un Responsable (Voir seulement) lit Mon entreprise, Équipe et
Historique, ne règle rien ; la paie lui est fermée (onglet absent).

**Les gestes « de soi »** : se connecter, changer de mode Jour/Nuit, changer sa barre, enregistrer une vue du planning, lire une notification,
la recherche, ouvrir une fiche, un filtre, un onglet, imprimer ou télécharger (`data-pdf*`), « Annuler » d'un toast qui défait SON propre geste :
**aucune case**. `lecture` dans la table. (Un « Annuler » qui défait un geste refusé n'existe pas : le geste n'a pas eu lieu.)

**Gestes de verbe inconnu** (règle 4) : reçoivent `m` de leur catégorie et sont listés par la sonde de complétude jusqu'à classement.

### 2.6 Route → catégorie, forme : la table `ROUTE_DROIT` et le menu qui s'en déduit

```
// route : [catégorie, forme] — forme : 'equipe' (non terrain), 'terrain', 'tous'
accueil:['admin','equipe']  statistiques:['admin','equipe']  historique:['admin','equipe']
planning:['planif','equipe']  absences:['planif','tous']      // « Absences et congés » (équipe) / « Mes congés » (terrain) : LIB_ROLE reste
interventions:['inter','equipe']  inter:['inter','tous']  clientvoit:['crm','tous']  majournee:['inter','terrain']
taches:[null,'tous']                                         // Mes tâches : toujours ouverte
clients:['crm','equipe']  client:['crm','equipe']
devis:['ventes','equipe']  contrats:['ventes','equipe']  contrat:…  'contrat-nouveau':…  signer:['ventes','tous']  devisXylo:['ventes','equipe']
comptabilite:['compta','equipe']  factures/facture/encaissements:['compta','equipe'] + ['ventes','equipe']   // les deux, comme drRefuse
boiteMail:['com','equipe']
achats:['achats','equipe']  techfrais:['achats','terrain']
stock:['stock','equipe']  produits:['stock','equipe']  boxes:['stock','equipe']  carteBox:['stock','equipe']  moncamion:['stock','terrain']
pointage:['temps','equipe']  vehicules:['temps','equipe']  mesheures:['temps','terrain']
equipe:['admin','equipe']  entreprise:['admin','equipe']
registre:['inter','tous'] (+ pack 3D)   espaceclient: hors droits (rôle client)
```
`droitVoit(route, personne)` : la personne est `eqDe(SESSION)` en mode application, `eqDe(ROLES[ROLE].qui)` dans le prototype nu avec la
bande « Tester en tant que » (comme `drRefuse` le fait aujourd'hui) ; la route doit être connue (`routeConnue`) ; sa forme doit convenir
(`equipe` ⇒ pas terrain ; `terrain` ⇒ terrain ; `tous` ⇒ les deux) ; sa catégorie doit avoir `v`. `rlPermis` devient :
`ROLE === 'client' ? ROLES.client.routes.includes(r) : ROLE === 'compta' ? ROLES.compta.routes.includes(r) : droitVoit(r)`. `drRefuse` est supprimée
(la propriété `accueil` de `ROLES.gestion`, déjà un getter, lit `ouvertureDe()`).

**Ouverture de la personne** (`rlOuverture`, le logo, une adresse inconnue, la fin de session) : la première route permise dans cet ordre
`['accueil', 'majournee', 'comptabilite', 'devis', 'clients', 'contrats', 'interventions', 'planning', 'taches']`. Mesuré aujourd'hui :
Marc → Accueil, Julie → Comptabilité, Sophie → Ma journée : c'est ce que donne la liste. `taches` étant toujours permise, la liste ne
se vide jamais ; une personne qui n'a RIEN d'autre voit « Mes tâches » avec, en tête, la phrase du § 2.8 (« Ton gérant n’a encore ouvert
aucune rubrique à ton compte. »).

**Le menu** : `rlLignes()` lit `CATS` (ordre, groupes, libellés, sous-titres) pour TOUT rôle interne, filtré par `droitVoit` ; `LIGNES_ROLE`
disparaît ; `LIB_ROLE` (« Mes tâches », « Mes congés ») s'applique selon la coque (terrain : « Mes tâches », « Mes congés » ; gestion : « Mes tâches » ;
gérant : « Tâches » : la règle actuelle `tkxPerso()` est conservée, c'est une FORME, pas un droit). Les lignes personnelles d'un terrain ne sont pas dans `CATS` : elles viennent de `LIGNES_TERRAIN`
(`majournee`, `taches`, `techfrais`, `mesheures`, `moncamion`, `absences`, puis le groupe 3D) filtrées de la même façon. **Un groupe qui n'a
plus aucune ligne n'est pas dessiné** (règle « jamais un groupe vide » ; déjà vraie par `filter`).

**Barre du bas (téléphone) et raccourcis** :
- une personne qui a `admin` › Voir (gérant, Responsable) garde la barre du gérant (`mbRetenue`, personnalisable) filtrée par ce qu'elle voit ;
- les autres : les cinq premières routes permises d'une liste de PRÉFÉRENCE par forme —
  non terrain : `['comptabilite','devis','clients','taches','achats','interventions','planning','boiteMail','stock','pointage']`
  (Julie : Comptabilité, Devis, Clients, Mes tâches, Achats et frais : l'actuelle, par construction) ;
  terrain : `['majournee','techfrais','mesheures','taches','moncamion','absences']` (l'actuelle). `BARRE_ROLE` disparaît, `BARRE_MOT` reste
  pour les mots courts mesurés ;
- les raccourcis ⌘ 1 à 9 et la recherche lisent `rcRubriques()` = `rlLignes()` : rien à changer ;
- **créations d'une touche (N, D, C, A) et « Faire » de la palette** : `rcCreer` et `palEntrees` testaient `ROLE !== 'patron'` ; ils testent la case :
  N « Nouvelle intervention » ⇐ `inter.c` et forme équipe ; D ⇐ `ventes.c` ; C ⇐ `crm.c` ; A ⇐ toujours ; « Nouvelle facture » ⇐ `ventes.c` et
  `compta.v`. `RC_LISTE` (le panneau des raccourcis, `rcAide`) n'affiche que ceux que la personne a. La recherche de clients (`palEntrees`,
  groupe « Clients ») ⇐ `crm.v`.

**Adresse tapée à la main, liens de fiche, notifications** : `sessionVue(role, h)` et `lireHash` ne lisent plus `ROLES[role].routes` mais
`droitVoit` ; une adresse refusée ramène à l'ouverture avec le message déjà écrit par `rlRefus` : **« Cette rubrique est fermée à ton compte : demande à
l’administrateur de la rouvrir (Équipe, tes droits). »** quand c'est une CASE qui ferme (le test `drRefuse(r)` de `rlRefus` devient « catégorie sans `v` »),
« Cette page n’est pas dans ton espace. » quand c'est la FORME (une personne non terrain qui tape `#mesheures`), et « Cette page n’existe pas. » inchangé ; les
phrases sont déjà couvertes par les sondes `menu-*`, à conserver mot pour mot. Les ~15 `rlPermis(...)` des fiches et des liens
(`iGestes`, `ctx` des tâches, `opd*`, `mailOk`, `[data-plein]`…) continuent de fonctionner sans changement. Une notification n'ouvre
que ce qu'`rlPermis` permet (déjà le cas dans `nvVoit`).

**Guide et visite** : `NV_NEUF`/`NV_PLACE` filtrent par `nvVoit(route)` (donc par `rlPermis`) ; la visite parlée (`immChap`) saute un
chapitre que la personne n'a pas. Une page « Mon entreprise » est ajoutée à chacun (`immChap('entreprise', 'entreprise', 'Mon entreprise', …)`
et une ligne dans `NV_NEUF`) : texte laissé à l'étape « guide des nouveautés » ; ici seulement le rappel de ne rien oublier.

### 2.7 Les sept droits à part : un par un

| Droit (libellé exact) | Verdict | Ce qu'il change, prouvable | Pour qui il est affiché |
|---|---|---|---|
| « Voir les interventions de toute l’équipe » (`tout`) | **RETIRÉ** | — | n'est plus affiché ni compté (§ 2.3) ; sa valeur reste dans les données |
| « Créer des comptes » (`comptes`, dans la limite des places) | brancher (lot D3) | `eq\|inviter`, `eq\|inviterok`, `eqx\|placeok`, « Renvoyer l'invitation », « Réactiver le compte » : refusés sans lui ; la ligne « ＋ Inviter une personne » n'est pas dessinée | non terrain avec `admin.v` |
| « Corriger les pointages » (`corrpt`, les siens comme ceux des autres) | brancher (D6, après `vehtemps`) | toute écriture dans un pointage DÉJÀ enregistré (`ptx\|corrige`, `pt\|ajout`, `pt\|clore`, `champ\|debut,fin` sur un jour passé, `[data-ptc]`) ; pointer et dépointer SOI-MÊME reste `temps.c` | tous |
| « Se servir à l’atelier sans validation » (`atelier`) | brancher (D6, après `materiel`) | `STK_VALID` actif et personne sans `atelier` ni `valstock` : sa sortie va dans `MVTS_ATT` (« À valider ») au lieu de s'appliquer (`stkAppliquer`, première instruction) | tous (terrain : Mon camion) |
| « Valider les gestes de stock des autres » (`valstock`) | brancher (D6) | `sx\|toutval,refok,expok,eok,dotok` (l'onglet « À valider » ne s'ouvre pas) | non terrain seulement |
| « Envoyer des commandes aux fournisseurs » (`commander`) | brancher (D6) | `ce\|envoi`, `cm\|conf`, `ac\|commande`, `panneauEnvoi` : le bon reste en « brouillon » | non terrain seulement |
| « Voir les prix d’achat et les marges » (`prix`) | brancher en tout dernier, **repli décidé d'avance** | voir ci-dessous | tous |

**`prix`** : ~25 endroits affichent un prix d'achat ou une marge (Produits liste et fiche, formulaire « Achat HT », Stock « valeur »,
Fournisseurs, rapprochement des commandes, Comptabilité › Par intervention, `pdx` courbe) ; 153 lectures de `.pa`. Mécanisme : une classe
`data-prix` posée sur chacun de ces endroits et UN nettoyage commun après `rendre()`/ouverture de panneau (les éléments `data-prix` sont
retirés pour qui n'a pas le droit). **La preuve ne dépend pas du balisage** : la sonde prend un produit au prix d'achat connu (par exemple
12,34 €) et sa marge, ouvre CHAQUE écran en tant que personne sans `prix`, et fait tomber le contrôle si l'une des valeurs apparaît dans
le texte de la page (formats « 12,34 », « 12,34 € », « 12.34 »). **Repli décidé** : si, après la fusion des voies `materiel` et `compta`,
la sonde trouve encore une fuite que l'étape ne peut pas fermer dans son budget, la case est RETIRÉE (fiche, profils, matrice,
« Qui peut quoi ») avec la phrase « Le prix d’achat est réservé au gérant. » dans l'aide de Stock ; on ne laisse jamais la case affichée
sans effet.

### 2.8 Un geste interdit : comment il se présente

1. **Le bouton n'est pas dessiné** (créer, supprimer, et la plupart des « modifier » : boutons, cases à cocher qui écrivent, champs en saisie
   directe passés en `disabled` avec leur valeur lisible). Le nettoyage (`droitsNettoyer()`) passe après `rendre()`, après
   `ouvrirPanneau`/`foOuvrir`/`eqxPan` et après un `MutationObserver` sur `#contenu` ; il applique la TABLE, jamais une liste à la main.
2. **L'écran en lecture seule le dit une fois**, sous le titre, `.info petit` `role="status"` : « Tu peux regarder cet écran, pas le modifier.
   Pour changer quelque chose, demande à {prénom du premier administrateur actif}. » Il n'est posé que si la personne a `v` et AUCUN de
   `c m s` dans la catégorie ; si seule une partie manque (par exemple pas de suppression), rien n'est écrit (le bouton absent suffit).
3. **Un geste qui arrive par un autre chemin** (raccourci, annulation, message de l'atelier, clic synthétique, appel direct) est avalé par la
   garde et dit par un toast : « Ce geste n’est pas ouvert à ton compte : {verbe} ({catégorie}). Demande à {prénom du gérant}. » ; `{verbe}` vient
   de la phrase de la case (§ 2.5), jamais du code. Aucune ligne de journal pour un refus (ce serait du bruit) ; un compteur `DROITS_REFUS`
   en mémoire sert aux sondes.
4. **L'écran vide** (rien de permis du tout) : « Ton gérant n’a encore ouvert aucune rubrique à ton compte. Demande-lui de régler tes droits
   dans Équipe. » avec « Se déconnecter » en mode application.
5. **Mon entreprise en lecture seule** : les cartes restent, sans « Modifier » ; chaque panneau s'ouvre en lecture (champs désactivés,
   pas d'« Enregistrer ») avec la phrase de 1.9.
6. Les boutons que la garde refuserait mais qui servent aussi à autre chose (une ligne qui ouvre la fiche ET modifie) ne sont jamais retirés
   : la table classe le VERBE, pas l'élément ; l'élément garde sa navigation (`data-go`).

### 2.9 Où poser les gardes (les cinq couches, ce que l'étude a recensé, ce qui est décidé)

**Couche 1 : navigation.** `droitVoit` / `rlPermis` / `rlLignes` / `mbRetenue` / `sessionVue` / `rcRubriques` / `palEntrees` (§ 2.6).

**Couche 2 : le geste, en capture. C'est elle qui protège.** Un seul module, `droitsGarde`, posé UNE fois, avant tout autre écouteur
(début du script principal, à côté du premier `addEventListener`) :
- `window.addEventListener(type, gardeFn, true)` pour `click`, `change`, `input`, `keydown` (Entrée/Suppr/Espace dans un champ ou sur un
  bouton, pas les lettres de raccourci : elles sont décidées par `rcCreer`), `pointerdown`, `mousedown`, `touchstart` (glisser du planning),
  `contextmenu`, `dragstart`, `drop`, `submit`.
- Résolution : on remonte de `ev.target` jusqu'au premier élément qui porte un `data-<famille>` connu (`FAMILLES_GESTE`) ou `data-action` ;
  la table dit `{cat, x}` ou `lecture`. S'il faut un droit que la personne n'a pas : `ev.stopImmediatePropagation(); ev.preventDefault();`
  puis le toast du § 2.8. La personne reçoit alors l'événement AVANT les 138 écouteurs de `click` de `document` (74 sont déjà en capture, mais
  sur `document`, après `window`).
- **Laissés passer** (sinon la garde avale du légitime : le piège connu de `stopPropagation` dans l'atelier) : `data-ferme`, `data-retour`,
  `data-pretour`, `data-go`, les champs de recherche et les filtres, `data-modetheme`, `data-nv`, `data-menu`, `data-tab`, tout élément dans
  `#pal`, `#hl-ecran`, `.rl-bande`.
- **Les familles de la table** : `ac`, `axa`, `rl`, `eq`, `eqx`, `eqd`, `eqs`, `eqprof`, `mbx`, `ml`, `cp`, `cx`, `cxaf`, `cxsiren`, `paie`, `cbx`, `rg`,
  `planconf`, `tkx*`, `tajout`, `bx`, `bxl`, `ce`, `cm`, `fo`, `mat`, `pdx`, `pr`, `sk`, `sx`, `champ`, `pt`, `ptx`, `ptc`, `tt`, `ve`, `vx`,
  `dv`, `dvn`, `dxb`, `dxrb`, `xy`, `xyb`, `ent` (Mon entreprise), `data-action` (la table `ACTIONS` : 49 + 10 + `ACTIONS_CREA`) : l'étape les
  recense par `scratchpad/proto-final/refonte/entreprise-droits-outils/gestes.js`, ne se fie pas à cette liste.
- **Le planning** n'a presque pas d'attribut : glisser/redimensionner/placer (`mousedown`/`touchstart` autour des lignes 4184, 4194, 6931,
  6938 d'avant), clic droit (4306, 6961) et `data-tkx*` : une douzaine de portes à recenser à la main dans la garde ET en première
  instruction de `poser()`.
- **Jamais de garde dans `ouvrirPanneau` ni `foOuvrir`** : elles ouvrent aussi bien des lectures.

**Couche 3 : l'écran.** `droitsNettoyer()` (§ 2.8). Ne protège pas ; ne doit jamais retirer ce que la garde laisse passer.

**Couche 4 : portes de fonction (règle du dépôt : PREMIÈRE instruction).** `poser()`, `stkAppliquer()` (aussi le point de `atelier`),
`envoyerFacture()` (aussi la garde SIRET), `payer()`, `factureDepuis()`, `produitCreer`/`prCreer` (à confirmer après `materiel`), et les
`ACTIONS.*` enveloppées par la table. `if (!peut('inter','m')) return droitsRefus('inter','m');`

**Couche 5 : les ponts.** Atelier : `opdRoleMsg()` envoie en plus `droits:{c,m,s}` de `ventes` ; l'atelier cache « Composer un devis »
sans `c`, refuse d'enregistrer sans `m`, et ses « supprimer » sans `s` (modification de `page.source`, coordonnée avec la voie compositeur).
`opd_client` (créer un client depuis l'atelier) : refusé sans `crm.c`. Courrier : `cmptEnvoyer({opc_role})` reçoit les droits `com` et
`crm.c`/`inter.c`/`ventes.c` (« créer une intervention, un devis, un client depuis un courriel ») ; la voie `mail` écrit le module : on lui
LAISSE le message, on ne touche pas `prototype-courrier.js`. Palette « Faire » (§ 2.6).

**Les ~40 décisions « au nom du rôle » à convertir** (étude § 2.4, relues) : `axLect()` → `!peut('achats','m')` ; `cbRO()`, `cbPatron()`
(carte des box) → `stock.m` ; `cxEstPatron()` → `admin.m` (§ 2.5 bis) ; les sept `ROLE !== 'gestion'` qui masquent « Voir au planning » et
« Planifier » → `planif.v` / `planif.m` ; `rcCreer` et la palette (§ 2.6) ; `mabarre` (barre personnalisée) → `admin.v` ; l'attribution `aComme !== 'marc'`
des absences → `peut('planif','m')`. **Règle de tri pour le reste** (`grep -n "ROLE ===\|ROLE !==\|ROLE=="` : environ 125 lignes, dont `tech` 52,
`patron` 29, `gestion` 15, `client` 25, `compta` 5 : l'étude en comptait 128) : si la ligne REFUSE ou CACHE un geste ou une information, c'est un droit (une case) ;
si elle choisit entre deux MISES EN PAGE du même écran (le technicien voit « Mon camion » là où le bureau voit « Stock », le client voit son
espace), c'est la forme et elle reste. L'étape écrit le tri dans `refonte/entreprise-droits-roles.md` (une ligne par occurrence :
ligne, fonction, droit ou forme, case) AVANT de coder.

### 2.10 Qui a fait quoi

`journalAjout('marc', …)` : 92 appels, plus `MOI = 'marc'` (15 lectures), `T_MOI = 'marc'` et une trentaine d'écritures directes d'un acteur
(`d.par = 'marc'`, `MVTS.unshift({qui:'marc'})`, `acNoter`, `eqxJ`…). Plus petit dispositif :
1. `const acteur = () => SESSION || (typeof RL_ACTIF !== 'undefined' && RL_ACTIF ? rlQui() : 'marc')` ;
2. dans `journalAjout`, première ligne : `if (qui === 'marc') qui = acteur();` — les 92 appels sont réglés d'un coup, et les 11 `rlQui()`
   restent ce qu'ils sont ;
3. `MOI` et `T_MOI` deviennent des fonctions `moi()` (15 + quelques lectures : `mbxAcces` etc.) ;
4. les écritures directes se recensent (`grep -n "'marc'"`, 275 occurrences ; la plupart sont des données de démonstration) et chaque
   ACTEUR devient `acteur()` ; les données de démonstration restent. **Ce lot passe AVANT les gardes** : sinon le journal dit « Marc » pour
   ce que Julie a fait dès le premier geste permis.
Preuve (sonde) : en tant que Julie, jouer cinq gestes (créer un client, modifier un client, créer un devis, noter un encaissement, envoyer
une facture) ; le JSON de `JOURNAL`, `MVTS`, `ACHATS`, `DEM_ACHAT` après moins avant ne contient AUCUN `'marc'` dans les enregistrements neufs ;
population comptée (au moins cinq lignes neuves) avant de conclure.

### 2.11 Le gérant ne se coupe pas la parole ; personne ne s'élève

- Les cases d'un administrateur sont désactivées (déjà) ; le dernier administrateur actif ne se désactive pas (déjà).
- **On ne règle pas ses propres droits** : `eqd`, `eqs`, `eqprof`, « Travaille sur le terrain » sont désactivés sur sa propre fiche
  (`p.k === SESSION`), avec la phrase du § 2.4. Un administrateur peut ouvrir sa fiche, pas la changer.
- **On ne donne pas un droit qu'on n'a pas** (`droitsBorner`) : un non-administrateur qui aurait `admin › Modifier` ne peut cocher que ce
  que sa propre fiche porte ; il ne peut pas toucher la fiche d'un administrateur ; il ne peut pas se nommer administrateur (le profil
  Administrateur n'est déjà pas dans la liste).
- Fermer la dernière route d'un non-administrateur est permis (§ 2.8, point 4) ; la dernière route d'un administrateur ne se ferme pas
  puisque ses cases ne se décochent pas.
- **Garde de fiche** : les cases ne se décochent que par la fiche (`eqd`/`eqs` exigent `admin.m`) ; la sonde l'essaie en clic synthétique.

### 2.12 Les profils types (valeurs de départ réécrites) et les menus qui en sortent

Notation `v c m s` (1 = oui). **Les cases non listées valent 0000.** « T » = « Travaille sur le terrain » par défaut du profil.

| Catégorie | Administrateur | Responsable | Secrétariat | Technicien | Comptable |
|---|---|---|---|---|---|
| `planif` | 1111 | 1111 | 0000 | 1101 | 0000 |
| `inter` | 1111 | 1111 | 1110 | 1010 | 0000 |
| `crm` | 1111 | 1111 | 1110 | 1000 | 0000 |
| `ventes` | 1111 | 1111 | 1110 | 0000 | 0000 |
| `compta` | 1111 | 1000 | **1110** (était 1000) | 0000 | 1111 |
| `stock` | 1111 | 1111 | **0000** (était 1110) | **1010** (était 1000) | 0000 |
| `temps` | 1111 | 1111 | **0000** (était 1000) | **1110** (était 1100) | 0000 |
| `com` | 1111 | 1111 | **0000** (était 1110) | **0000** (était 1100) | 0000 |
| `achats` | 1111 | 1111 | **1000** (était 1110 ; la gestion lit, ne décide pas : `axLect` d'aujourd'hui) | **1111** (était 1100 : sa demande, sa note, la modifier, l'annuler) | 0000 |
| `admin` | 1111 | 1000 | 0000 | 0000 | 0000 |
| T (terrain) | non | non | non | **oui** | non |
| `prix` | oui | oui | non | non | non |
| `atelier` | oui | oui | non | non | non |
| `valstock` | oui | oui | non | non | non |
| `commander` | oui | oui | non | non | non |
| `corrpt` | oui | oui | non | non | non |
| `comptes` | oui | non | non | non | non |
| `tout` | (retiré) | | | | |

Menus déduits (rejoués par `scratchpad/proto-final/refonte/entreprise-droits-outils/derive.js`, à relancer sur la table finale) :
- **Administrateur** : les 19 lignes d'aujourd'hui + Mon entreprise = **20** (groupe Personnel : Équipe, Temps de travail, Véhicules, Mon entreprise).
- **Responsable** : les mêmes 20, Équipe, Mon entreprise, Historique et Comptabilité en lecture seule ; pas de paie ; pas d'invitation.
- **Secrétariat** : Mes tâches, Interventions, Clients, Devis, Contrats, Comptabilité, Achats et frais = **les sept validés**. Elle perd ce que sa fiche promettait
  sans que le menu le donne (Boîte mail, Stock, Temps de travail) : « Le rôle bureau n'a pas Stock / Produits alors que sa fiche le promet » est résolu par la fiche, pas par le menu.
- **Technicien** : Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés (+ Registre sanitaire en 3D) = **les six validés**.
  Sa fiche cesse de promettre une Boîte mail et un Stock qu'il n'a pas.
- **Comptable** : inchangé (coque `compta`, « ouvert depuis sa fiche Équipe »).
- **Karim** (`tech*`) : même menu que Sophie ; sa valeur `valstock` (case sans écran pour un terrain) est mise à 0 dans les données de démonstration,
  `atelier` reste ; « Chef d'équipe » est son nom, pas un droit (§ 7, doute 2).
- Les profils s'appliquent par `profok` (inchangé) et l'invitation (`copieProfil`) ; **les personnes de démonstration (Julie, Sophie, Karim, Léa, Tom) reprennent
  les nouvelles valeurs** (les `droits:copieProfil(...)` les relisent d'eux-mêmes ; Karim garde son ajustement).

### 2.13 Ce qui est retiré de l'écran

La case `tout` et son libellé (fiche, grille, matrice, « Qui peut quoi », `eqxProfilDit`, `eqxDiff`) ; la ligne « Dans ce prototype, ces
cases ne changent pas encore… » ; la phrase « …pas encore appliqués » ; toute case sans geste dans la table (`crm.s`, par exemple, tant
qu'aucun verbe de suppression de client n'existe) ; pour un terrain, les rangées `ventes`, `compta`, `com`, `admin` et les droits à part
sans effet pour lui ; le `profil` `tech*` « Chef d'équipe » ne devient pas un profil. La grille continue d'exister, repliée.

---

## 3. « Achats et frais » : se comprendre sans explication

**Constat (regardé au navigateur, ordinateur et iPhone, 17 novembre).** Le titre emploie deux mots qui désignent deux choses que l'équipe
adresse au gérant ; le sous-titre dit « Ce que l’équipe demande » sans dire QUOI ; deux chiffres sur quatre mènent AILLEURS (Comptabilité)
alors que le titre promet que tout est là ; sur iPhone le sous-titre prend six lignes (la phrase est longue et le bouton « ＋ Demande » lui
prend la moitié de la largeur). La rubrique est en réalité **la boîte de réception du gérant pour ce que son équipe lui demande de payer** :
du matériel à accepter ou refuser, et des notes de frais à valider.

**Nom** : « Achats et frais » (route `achats`, adresses inchangées). Barre du bas du bureau : « Achats ». Technicien : « Mes frais ».

**Menu** : ligne grise sous le nom : **« Demandes de l’équipe »** (`CATS` : 5ᵉ élément de la ligne, comme « Factures, paiements, paie »).
Mesuré : 127 px pour 147 disponibles (police de la ligne : 12 px / 500) ; les propositions de l'étude font 157 (« Demandes et notes de
frais ») et 142 (« Matériel et notes de frais ») : trop justes, elles passeraient sur deux lignes sur Windows ou Android et casseraient le
rythme du menu. À remesurer sur les neuf profils avec la police de chacun ; si une ligne passe à deux, le mot est « Demandes ».

**En-tête de l'écran**
- surtitre « Argent » ; titre « Achats et frais » ;
- sous-titre du gérant (`axLect()` faux) : **« Ce que ton équipe te demande de payer : du matériel et ses notes de frais. »** (74 signes ; à ≤ 3 lignes sur
  iPhone) ;
- sous-titre en lecture seule (`!peut('achats','m')`) : **« Du matériel et des notes de frais demandés par l’équipe. Tu peux les regarder ; c’est le gérant qui décide. »** ;
- « ＋ Demande » : sur téléphone, il passe SOUS le sous-titre, pleine largeur utile (il ne prend plus la moitié de la ligne) ; masqué en lecture
  seule (c'est la case `achats.c`, plus `ROLE === 'gestion'`) ;
- la phrase « Les factures des fournisseurs, leur paiement et les justificatifs sont dans la Comptabilité. » quitte le sous-titre : elle devient la
  légende des deux derniers chiffres (ci-dessous).

**Quatre chiffres** (mêmes boutons `kpi`, même grille ; l'ordre sépare « ce que je décide ici » de « ce qui est ailleurs ») :
1. `{n}` · « demande{s} de matériel à décider{ · {m} à acheter} » (`data-ac="onglet|demandes"`) — lecture seule : « demande{s} en attente… » ;
2. `{n}` · « note{s} de frais à valider » (`data-ac="onglet|notes"`) ;
3. `{eur}` · « de factures fournisseurs à payer{ · {r} en retard} · à voir dans la Comptabilité › » (`data-cx="sec|factures|achats|traiter"`) ;
4. `{n}` · « achat{s} sans facture · à voir dans la Comptabilité › » (`data-cx="sec|factures|achats|sanspiece"`).
La visite parlée (`immChap('achats', …)`) dit déjà « quatre chiffres » ; elle est mise à jour pour l'ordre (3 demandes, 3 notes, 896 euros,
4 achats), pas pour le nombre.

**Onglets** : « Demandes de matériel » (court téléphone : « Matériel ») · « Notes de frais » (court : « Frais »). Les valeurs de `acOnglet`
(`demandes`, `notes`) ne changent pas.

**Aide** (un lien `data-action="achatsAide"` « Comment ça marche ? » sous les onglets, qui ouvre un panneau, jamais un bloc permanent) : « 1. Un
technicien écrit « Il me faut… » ou envoie la photo d’un ticket depuis son téléphone. 2. Ça arrive ici. 3. Toi, tu acceptes ou tu refuses ; une phrase
toute prête t’évite de taper. Le matériel accepté part en commande ou se prend dans le stock ; la note de frais validée est remboursée avec la paie. »
(Pour la lecture seule : « …Le gérant accepte ou refuse. »)

**États vides** : demandes : « Aucune demande de matériel en attente. Quand un technicien écrit « Il me faut… » depuis son téléphone, elle arrive ici. » ;
notes : « Aucune note de frais à valider. Quand un technicien envoie la photo d’un ticket, elle arrive ici. ».

**Côté technicien** (`vueTechFrais`, même mot « frais », jamais « Achats ») : sous-texte « Tu as acheté quelque chose pour le travail ? Envoie la
photo du ticket. Il te manque du matériel ? Écris-le : le bureau te répond. »

**Cascade** (à mettre à jour ensemble) : `tourPartie('achats', …)` (« Un salarié demande du matériel… » : reste juste, retirer « ou envoie la photo
d’un ticket » seulement s'il fait doublon avec l'aide), `immChap('achats', …)` (phrase d'ouverture « tout ce que ton équipe te demande de payer » : reste
juste ; l'ordre des chiffres), `NV_PLACE` (« Mes demandes et Brouillon → Achats et frais › « Demandes » » : devient « « Demandes de matériel » »),
`palEntrees` (`Achats et frais`, avec le mot « demandes » dans `m:` pour que « demande » le trouve), aide de page.

**À contrôler au navigateur (étape 7)** : la ligne grise du menu tient sur 258 px à l'ordinateur et dans la feuille « Menu » à 320, 360, 390 px ;
le chiffre « 896 € » ne se coupe pas ; les onglets tiennent sur 320 px ; en lecture seule, aucun bouton de décision n'est dessiné (§ 2.8).

---

## 4. Changements de code, dans l'ordre (qui s'applique à quelle étape de la voie)

Étape 4 (« appliquer Mon entreprise et Achats et frais ») : lots **E1 à E6**. Étape 5 (« appliquer les droits ») : lots **D1 à D7**.
D1 et D2 peuvent partir dès l'étape 4 terminée ; **D3 à D5 avant D6 ; D6 en dernier**, après fusion de `materiel`, `vehtemps`, `mail`.
Chaque lot passe `compiler-pages.js`, `verifier-syntaxe.js`, les bancs 835, 836, 837, 1008, 2994 et `verif-secrets.sh` avant la poussée.

| Lot | Contenu | Dépend de |
|---|---|---|
| **E1** | `ENTREPRISE` complété (`site`, `bic`, `assureur`, `assurNum`, `assurc`, `assurZone`, `logo`, `patron`) ; `entrepriseManque()` ; `logoEnt()` et ses 19 remplacements ; renommage `assur`/`zone` ; correction de `opdDonnees` si besoin ; filtre `< > "` | rien |
| **E2** | route et ligne `entreprise` (`CATS`, `vues()`, `IC`, `MB_COURT`, `rlPastille`), page : bandeau, cinq cartes, six liens ; les cinq panneaux (champs, validations, messages exacts du § 1.4) ; `cxFicheLegale` agrandie ; lecture seule | E1 |
| **E3** | garde de la facture (trois portes), retenue « client sans e-mail », nouveau texte de « Comment ça marche », toasts « Compléter » | E2 |
| **E4** | phrases « Paramètres » (§ 1.8) sauf l'atelier ; visite « avenir » ; aide des créneaux liée à `PARAMS` | E2 |
| **E5** | « Achats et frais » (§ 3) : menu, en-tête, quatre chiffres, onglets, aide, vides, côté technicien, cascade | rien |
| **E6** | atelier : bouton « Ouvrir Mon entreprise » (`opd_fermer {motif:'entreprise'}` + parent) ; **coordonné avec la voie compositeur, fait en dernier** | E2, compositeur |
| **D1** | `acteur()`, `journalAjout` normalisé, `moi()`/`T_MOI`, écritures directes ; tri `refonte/entreprise-droits-roles.md` | rien |
| **D2** | `ROUTE_DROIT`, `droitVoit`, `peut`, `sessionRole` (terrain), `rlPermis`, `rlLignes` (personne en paramètre), `LIGNES_TERRAIN`, `mbRetenue`/barre, `rlOuverture`, `sessionVue`, `rcCreer`/`palEntrees`/`RC_LISTE`, `drRefuse` supprimée, case « Travaille sur le terrain » ; profils types ; données de démonstration ; fiche : phrases « voit / ne voit pas », libellés, retraits du § 2.13, grille repliée et générée | E2 (la route existe) |
| **D3** | table des gestes `GESTES` (générée par `gestes.js`, relue), garde en capture, refus, `droitsNettoyer`, lecture seule, écran vide ; `comptes` | D1, D2 |
| **D4** | portes de fonction (`poser`, `stkAppliquer`, `envoyerFacture`, `payer`, `factureDepuis`), `cxEstPatron` → `admin.m`, `axLect` → `achats.m`, `cbRO`/`cbPatron`, les conversions du tri | D3 |
| **D5** | ponts (atelier : `opd_role` étendu côté prototype ; courrier : message de droits) | D3 |
| **D6** | `corrpt`, `atelier`, `valstock`, `commander`, `prix` ; gardes des rubriques refaites par `materiel`, `vehtemps`, `mail` | D3, fusion des voies |
| **D7** | sondes (§ 5), mutations, réécriture des sondes `menu-*` et `atelier-roles.js` | D2 à D6 |

**Fonctions touchées hors de leur voie : le moins de lignes possible** (rappel de la consigne) : D2 réécrit `rlPermis`, `rlLignes`,
`sessionRole`, `drRefuse` (lignes ~11340 et ~22130) ; D3 pose un module neuf ; aucune ligne de `vueStock`, `vueVehicules`, `vuePointage`,
`prototype-courrier.js` avant D6. **Si une voie en cours a déjà posé sa propre garde** (par exemple `axLect`), on la remplace, on ne l'empile pas.

---

## 5. Les sondes (une par promesse) et les mutations

Outil : `scratchpad/proto-final/lib.js` (`ouvrir({profil, nuit, qui, app})`, `aller`, `toucher`, `gestes`, `etat`, `deborde`, `doigts`,
`capture`, `v`, `bilan`) ; profils `mac`, `mac720`, `windows`, `ipad`, `iphone`, `android`, `petit` ; jour ET nuit pour tout ce qui se voit ;
**chaque sonde compte sa population avant de conclure** (« n personnes · n routes · n gestes »), rend « N ✓ · M ✗ », sort en 1 si un
contrôle tombe ; captures hors dépôt, REGARDÉES. Aucune sonde ne vise teamop.fr. Un navigateur à la fois (`timeout 580 node …`).

### Mon entreprise (`entreprise-*.js`)
| Sonde | Promesse jouée |
|---|---|
| `entreprise-structure.js` | la ligne existe pour Marc, pas pour Sophie (terrain) ; cinq cartes + six liens ; état « Complète » ; aucun débordement (largeur du profil) à 320, 360, 390, 820, 1280, 1440 ; cibles ≥ 44 px au doigt ; **valeurs longues** (nom de 60, adresse de 80, IBAN de 34) |
| `entreprise-champs.js` | pour CHAQUE champ : une valeur juste s'enregistre ; une valeur fausse est refusée avec le message EXACT ; `< > "` refusés dans tous les champs texte (aucun élément injecté : le DOM relu) ; l'adresse relue se redécoupe comme `opdDonnees` |
| `entreprise-destinations.js` | nom, adresse, SIRET, TVA, téléphone, e-mail, IBAN, BIC : changés, puis lus dans la facture, le devis, le contrat, le bilan, le bon de paie, l'espace client (texte du PDF) ET dans `opdDonnees()` ; assureur / contrat / zone : dans le pied des PDF ET dans le bloc identité de l'atelier ; horaires : créneaux du planning ; tarif, minimum, zones : une facture « au temps » recalculée ; logo : image dans **les 19 gabarits** (compté) ; expert-comptable : « Envoyer à… » ET la paie parlent au même cabinet |
| `entreprise-garde-facture.js` | SIRET vidé (population : 3 portes) : `envoyerFacture`, `ACTIONS.envoyer`, `terminer` n'envoient pas ; SIRET rempli : tout part ; devis et contrat ne sont pas bloqués mais préviennent ; client sans e-mail retient ; le message contient « Compléter » qui ouvre la bonne carte |
| `entreprise-liens.js` | chaque lien mène au bon écran ET au bon panneau, en tant que Marc ; absent pour qui n'a pas la case ; « Compléter ma fiche légale » de Conformité ouvre le MÊME panneau |
| `entreprise-lecture-seule.js` | en tant que le Responsable : cartes lisibles, aucun « Enregistrer », champs désactivés, la phrase du 1.9 ; une écriture forcée (clic synthétique, `ev.dispatchEvent`) est avalée |
| `entreprise-phrases.js` | recense `grep "Paramètres"` : plus aucune phrase qui renvoie à un écran absent (hors la colonne « avant » de `NV_PLACE`) ; « Comment ça marche » ne promet que ce qui existe |

### Droits (`droits-*.js`)
| Sonde | Promesse jouée |
|---|---|
| `droits-table.js` | **complétude** : recense tous les `data-<famille>="verbe\|…"` du fichier, les clés de `ACTIONS` et `ACTIONS_CREA` ; chacun est dans la table (écriture c/m/s ou lecture) ; population comptée ; tout verbe non classé fait tomber le contrôle et est nommé |
| `droits-fiche.js` | la fiche d'une personne : « Travaille sur le terrain », phrases « voit / ne voit pas » (égales à `rlLignesDe`), grille repliée, cases sans geste absentes, libellés ; téléphone : la feuille de quatre lignes par catégorie ; nuit ; aucun débordement |
| `droits-menus.js` | pour les cinq profils et chaque forme : le menu (lignes, ordre, groupes), la barre du bas, la feuille « Menu », la recherche (« Aller à »), les raccourcis ⌘1-9, l'ouverture, une adresse tapée : **Julie = les 7 validées, Sophie/Karim = les 6 validées, Marc = 20, Responsable = 20 (lecture)** ; Responsable ≠ Secrétariat |
| `droits-cases-voir.js` | pour CHAQUE catégorie (10) : décocher « Voir » → la ou les lignes disparaissent du menu, de la barre, de la recherche, des raccourcis, de l'adresse tapée (message `rlRefus`), des liens de fiche et des notifications ; recocher → elles reviennent ; population : lignes avant/après comptées |
| `droits-gestes-garde.js` | **la garde, sur TOUTE la table** : pour chaque `famille\|verbe` d'écriture, créer un bouton portant l'attribut, le toucher en tant que quelqu'un à qui la case manque : le compteur d'écouteurs-témoins reste à 0 et `DROITS_REFUS` monte de 1 ; en tant que quelqu'un qui l'a : le témoin se déclenche. Une personne par catégorie (`v` seul / `v+c` / `v+m` / `v+s`), populations comptées |
| `droits-gestes-reels.js` | un geste RÉEL de chaque catégorie, de bout en bout, avec et sans la case : créer un client, modifier un client, envoyer un devis, noter un encaissement, créer une intervention, terminer, poser au planning (glisser, au doigt et à la souris), décider une demande d'achat, valider une note de frais, inviter une personne, modifier une fiche ; la donnée change ou ne change pas (état relu), le bouton est absent ou présent, le toast du refus est le bon |
| `droits-lecture-seule.js` | une personne qui n'a que `v` : l'écran dit « Tu peux regarder cet écran… » avec le bon prénom ; aucun bouton d'écriture dessiné (population comptée) ; chaque onglet de l'écran ; avec `v+m` sans `c` : « ＋ » absent, « Modifier » présent |
| `droits-acteur.js` | § 2.10 (cinq gestes de Julie, aucun `'marc'` dans les enregistrements neufs) |
| `droits-soi-meme.js` | on ne règle pas ses propres droits ; on ne donne pas ce qu'on n'a pas ; la fiche d'un administrateur ne se change pas ; le dernier administrateur ne se désactive pas ; un clic synthétique sur `eqd` sans `admin.m` est avalé |
| `droits-specifiques.js` | `comptes`, puis (D6) `corrpt`, `atelier`, `valstock`, `commander` : chacun, coché et décoché, sur les gestes nommés au § 2.7 ; `prix` : la sonde d'oracle (la valeur d'achat d'un produit connu n'apparaît nulle part dans le texte, sur CHAQUE écran, pour la personne sans `prix`) |
| `droits-formes.js` | une personne non terrain n'a jamais les cinq écrans personnels (`#mesheures` tapé → refus) ; un terrain n'a jamais un écran d'équipe ; changer « Travaille sur le terrain » change la coque, le menu et la barre à l'instant, sans recharger |
| `droits-bureau-toutes-cases.js` | **la coque `gestion` n'a jamais ouvert Stock, Fournisseurs, Dépôts, Boîte mail, Équipe, Temps, Véhicules, Planning, Absences, Accueil, Statistiques, Historique** : une personne non terrain qui a TOUTES les cases ouvre chaque route (0 exception, 0 écran vide) ; à jouer AVANT le câblage (D2), il peut révéler des écrans à réparer |
| `droits-ponts.js` | atelier (`opd_role` avec les droits : « Composer un devis » absent sans `ventes.c`), courrier (messages de droits), palette « Faire », touches N, D, C, A |
| `achats-lisible.js` | § 3 : ligne grise du menu sur une ligne (neuf profils, de jour et de nuit, mesure du texte et du conteneur), sous-titre ≤ 3 lignes sur iPhone, 4 chiffres dans l'ordre, « ＋ Demande » sous le titre sur téléphone, aide, vides, lecture seule sans bouton de décision |

Sondes existantes qui **tomberont** (elles figent « Julie = 7 lignes ») et qui sont RÉÉCRITES pour lire le menu DÉDUIT (D7) :
`menu-commun.js`, `menu-nu.js`, `menu-ordinateur.js`, `menu-telephone.js`, `menu-memoire.js`, `menu-mutations.js`, `menu-renommages.js`,
`menu-echafaudage.js`, `menu-visites.js`, `menu-routes.js`, `menu-conges.js`, `menu-conges-bureau.js`, `atelier-roles.js`. Les résultats
attendus (7, 6, 6) ne changent pas : ce qui change est la source de la liste.

### Mutations (≥ 30, toutes doivent faire tomber au moins un contrôle ; `entreprise-mutations.py`, `droits-mutations.py`)
Contre-épreuves à jouer, chacune vérifiée par `git diff` après mutation (la mutation a touché le bon endroit) et restaurée par un commit
AVANT (règle du dépôt : correctif → banc → commit → mutation → checkout) : retirer le filtre `< > "` ; remettre `adr` en un seul champ ; ne plus écrire
`PAIE_CAB` ; remplacer `logoEnt()` par « CS » dans UN gabarit ; remettre `E.assur` ; faire passer `envoyerFacture` sans lire `entrepriseManque()` ; idem
`ACTIONS.envoyer`, idem `terminer` ; retirer la retenue « client sans e-mail » ; **dans la garde** : ne plus écouter `change` / `keydown` /
`touchstart` / `contextmenu` / `drop` (un par un) ; classer un verbe d'écriture en lecture (par famille : un échantillon de 10) ; oublier une
famille dans `FAMILLES_GESTE` ; laisser passer `data-action` ; faire de `droitVoit` une fonction qui rend `true` ; ne plus lire la forme ;
`rlOuverture` qui rend toujours `accueil` ; la barre du bas qui ne filtre plus ; `sessionVue` qui lit encore `ROLES[x].routes` ; la recherche
« Faire » qui retombe sur `ROLE !== 'patron'` ; `acteur()` qui rend `'marc'` ; `journalAjout` non normalisé ; une personne qui règle ses
propres droits ; `droitsBorner` retiré ; la garde en `if (false && …)` (première instruction : la seule mutation qui échappe à un motif de
texte, déjà pris) ; `droitsNettoyer` retirant aussi les `data-go`. Chaque mutation a sa ligne : « mutation → contrôle qui tombe ».

### Contrôles d'étape
`node scratchpad/proto-final/sondes/compiler-pages.js` ; `node scripts/verifier-syntaxe.js` ; `node tests/test-835.js`, `836`, `837`, `1008`,
`2994` ; `bash scripts/verif-secrets.sh` (rien ne contient un secret : le logo de démonstration est un SVG de quelques lignes, sans script) ;
captures REGARDÉES : Mon entreprise (cinq cartes, un panneau), la fiche d'une personne, l'écran lecture seule, Achats et frais, sur mac,
windows, ipad, iphone, android, petit ; jour ET nuit.

---

## 6. Ce qui est laissé de côté (dit, jamais caché)

- **Le chef d'équipe** : une personne de terrain qui voit en plus le planning de l'équipe ou valide les sorties de stock de ses équipiers
  (`tout`, `valstock` pour un terrain). C'est une troisième forme d'écran (donc des écrans jamais exercés dans la coque `tech`), pas un droit.
- **Le logo dans l'atelier** (documents sur mesure) : l'atelier sait poser une image (`.ent-logo img`) mais ne lit pas encore le logo de
  l'entreprise (`IDENT_CHAMPS` n'a pas `logo`). Petit changement dans `page.source`, à demander à la voie compositeur.
- **Délai de paiement, pénalités, indemnité de 40 €, numérotation des documents** (`f.ech = '30/11'`, préfixes `D-2026-`, `CTR-2026-`, `FAC-2026-`)
  : écrits en dur ; Comptabilité est validée. À ouvrir si Justin le demande, avec le contrôle de conformité qui les lit.
- **Le plafond d'envoi automatique et le « premier passage »** du texte « Comment ça marche » : retirés du texte, non construits.
- **Une entreprise sans TVA** (auto-entrepreneur) : le champ peut rester vide, mais ce que les PDF écrivent alors (« TVA non applicable, art. 293 B
  du CGI ») n'est pas construit ; et `cxPdfManque` signale encore « le n° de TVA » manquant. À soumettre à l'agent `juriste` avant d'écrire une mention.
- **Les types d'intervention** (création d'intervention › « Ajouter un type ») : aucun écran de gestion n'existe ; la parenthèse est retirée.
- **Échapper les ~100 lectures non protégées de `ENTREPRISE.nom`/`adr`** : on filtre à la saisie (`< > "`) faute de pouvoir tout échapper sans toucher
  les voies en cours ; l'audit de sécurité (`securite/RAPPORT.md`) dit si ça suffit.
- **La barre du bas personnalisable pour une personne non administrateur** (une secrétaire qui voudrait changer sa barre).
- **Une case par personne « Voir toute l'équipe »** dans l'écran Équipe validé : retirée (§ 2.3), pas remplacée.
- **Le prototype ne garde rien d'un rechargement** (comme tout le reste) : les droits et la fiche se perdent à la fermeture ; dans la vraie
  application ils vivent sur le serveur, qui est le seul à pouvoir les faire respecter.

## 7. Doutes à dire à Justin (« s'il y a des doutes, tu me dis »)

1. **« Une facture est bloquée sans SIRET » n'a jamais été vrai dans le prototype** : l'envoi ne regardait pas l'identité. Il l'est maintenant
   pour les FACTURES ; le devis et le contrat préviennent sans bloquer. Veut-il que le devis soit bloqué aussi ?
2. **Le chef d'équipe (Karim)** ne peut pas voir l'équipe : les droits « Voir toute l'équipe » et « Valider le stock des autres » n'ont de
   sens que pour une personne qui a les écrans du bureau. J'ai retiré le premier et caché le second pour un terrain. Si Justin veut un
   chef d'équipe, c'est une forme d'écran de plus à construire.
3. **Les profils types ont changé pour coller aux menus qu'il a validés** : la secrétaire n'a plus Boîte mail, Stock ni Temps de travail
   (sa fiche les promettait, son menu ne les donnait pas) ; le technicien non plus. Le Responsable voit tout et ne règle rien. À lui de
   cocher ce qu'il veut en plus.
4. **« Accueil » et « Statistiques » suivent la case « L’entreprise et l’équipe »** : un Responsable les voit (avec les chiffres), une secrétaire non.
5. **Mon entreprise vit dans « Personnel »** : le mot de groupe désigne des personnes ; c'est le meilleur endroit sous ses règles de
   menu (jamais un groupe d'une seule ligne). S'il préfère « Équipe et entreprise », c'est un renommage de deux textes, pas de code.
6. **Le prix d'achat caché** (`prix`) est branché en dernier avec un repli décidé : si l'écran ne peut pas être garanti, la case disparaît plutôt
   que de rester affichée sans effet.
7. **Le prototype ne se souvient de rien** : ce que le gérant règle dans « Mon entreprise » disparaît au rechargement. La vraie
   application l'enregistrera ; le prototype montre comment.
