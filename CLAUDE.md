# TeamOP

Suite logicielle pour entreprises de terrain — nettoyage, lutte anti-nuisibles.
Applications : OP GESTION (interventions, clients, devis) et OP MESSAGES (messagerie).
Vendu par abonnement, clients réels, données réelles. **Ce dépôt est en production.**

⛔ **OP MESSAGES ET OP GESTION SE SÉPARENT — décision de Justin, 22 septembre 2026.** OP MESSAGES
reste une application TeamOP, mais elle aura **son propre serveur** : elle vise « tout public et
aussi professionnel », donc des comptes de PERSONNES, quand OP GESTION cloisonne par ENTREPRISE
(`{t, kh}`, une clé par espace). Les deux modèles d'identité ne se transposent pas — c'est
précisément ce qui bloquait l'étape A du chantier socle, et c'est pourquoi elle est retirée du
plan plutôt que tranchée. `messages.html` reste fermée (`OPMSG_EN_TRAVAUX`) et sera REVUE plus
tard ; `op-fs.js` et son banc sont conservés pour ce jour-là. **Ne pas rebrancher OP MESSAGES
sur le socle d'OP GESTION** — et se rappeler qu'« éteindre Firebase » (étapes E et F) ne peut
pas être total tant qu'OP MESSAGES y vit.

🌉 **LES AGENTS DE LA TOUR PARLENT À JUSTIN DANS OP MESSAGES (28 octobre 2026)** — par un PONT, jamais par le socle : `server/pont-messages.js` appelle, en HTTP
sur la boucle locale, les routes `/api/pont/*` de `server-msg/pont-agents.js` (secret à part, empreinte côté OP MESSAGES, inerte sans configuration). `server/conversations.js`
reste le registre que les agents relisent ; le pont ne leur retire rien et ne dépend jamais d'OP MESSAGES. `server-msg/` n'importe toujours pas `server/`. Mode d'emploi et
limites : `server-msg/PONT-AGENTS.md` ; bancs `test-3094` à `3097`.

📚 **CE FICHIER EST UN NOYAU** (allégé le 18 novembre 2026 : chaque session et chaque agent le relit d'office). Le détail, déplacé TEL QUEL, est dans `docs/regles/` : `a-ne-pas-faire.md` (toutes les règles en entier), `bancs-et-mesures.md`, `pieges.md`, `chrome-devtools.md`, `agents-modeles.md`. Une règle dont seul le titre est ici se LIT là-bas avant d'agir.

📍 **Avant toute chose, lire `REPRISE.md`** — les chantiers ouverts, les dettes connues et ce
qui attend une décision de Justin. Une conversation meurt, le dépôt reste : ce fichier est la
seule mémoire qui passe de l'une à l'autre. Le tenir à jour quand un chantier change d'état.

## Structure

- **Racine** — site vitrine et applications, HTML/CSS/JS sans framework, servi par GitHub Pages
  ⛔ **depuis un dossier assemblé, pas depuis la racine** (17 octobre 2026) : `scripts/assembler-site.sh`
  copie une LISTE BLANCHE dans `_site` (pages, scripts et manifestes de la racine par leur forme, plus
  `icons/ vitrine/ sons/ screenshots/ apercu/ .well-known/`), `.github/workflows/publication-site.yml`
  la publie. Avant, `teamop.fr/CLAUDE.md` répondait 200. Un DOSSIER neuf à servir s'ajoute dans le
  script, sinon il n'est pas en ligne — `tests/test-1008.js` refuse une page qui pointe vers un fichier perdu.
- **`server/`** — API Node/Express déployée sur un VPS, hors GitHub Pages
- **`.github/workflows/`** — surveillance horaire du site et de l'API
- **`blog/`** — teamop.fr/blog/, FABRIQUÉ par `node scripts/blog.js` depuis `contenu/blog/` (non publié : `articles.json`, un
  fragment HTML par article (`<slug>.htm`), `SUJETS.md` = file des sujets et règles d'écriture). ⛔ On écrit dans `contenu/blog/`, jamais dans `blog/*.html`
  (`tests/test-3000.js` exige la sortie du générateur) ; après un article neuf, relancer aussi `node scripts/site-marine.js --racine` (sitemap).
- **`scripts/web/`** — lire un site (Crawl4AI, installé à la première utilisation, dans une session du cloud comme sur le Mac) : `bash scripts/web/lire-site.sh <url> [--liens|--pages N]` — voir son `LISEZMOI.md` (et le cadre RGPD avant de prendre des coordonnées)
- **`scripts/controle/`** — le CONTRÔLE de bout en bout (17 octobre 2026, skill `/controle`, agent `client-mystere`) :
  `node scripts/controle/controle.js <sortie>` monte un JUMEAU sur 127.0.0.1 (le site assemblé servi sous ses vraies
  adresses, le vrai serveur isolé, Stripe imité avec état, un facteur SMTP local) et y joue une cliente fictive du
  site jusqu'à l'application, puis relit ce qu'elle a laissé (erreurs, 5xx, données personnelles dans le journal…).
  ⛔ Il pilote `app.html` : c'est permis parce qu'il n'y a AUCUNE donnée réelle (serveur jetable, entreprise fictive,
  réseau coupé) — la raison de la règle « bêta uniquement » ci-dessous. Jamais contre teamop.fr. Contre-épreuve :
  `node scratchpad/mutations-controle.js`.

Pas de compilation, pas de bundler. Ce qui est écrit est ce qui est servi.

## Le serveur

`server/index.js` — 7 496 lignes (recompté le 20 septembre 2026 ; il a doublé,
puis redoublé, depuis la première rédaction de cette fiche — se méfier des chiffres de cette
page plus vieux que quelques jours, celui-ci compris : il a vieilli de 90 lignes dans la
journée même où il a été corrigé). Écoute sur `127.0.0.1:8080`,
**derrière un proxy — Caddy, pas nginx** (vérifié sur le VPS le 7 octobre 2026 : nginx inactif ; d'où `app.set('trust proxy', 1)`).

Dépendances : `express`, `imapflow` + `mailparser` (réception des courriels),
`nodemailer` (envoi), `web-push` (notifications), `@anthropic-ai/sdk`.

**Stripe n'est pas une dépendance** : l'API est appelée directement par `fetch`
vers `api.stripe.com`. Une bibliothèque de moins à maintenir et à auditer — garder
cette approche. ⛔ **Tout appel à Stripe écrit ses en-têtes par `stripeEntetes(sk, extra)`**
(17 octobre 2026) : c'est elle qui fige la version de l'API (`config.stripe.apiVersion`, posée et
vérifiée par `server/set-stripe-version.sh`). Un `fetch` vers Stripe qui écrit son `Authorization`
à la main suivrait la version du tableau de bord — `tests/test-1010.js` le refuse. Un banc qui
extrait la route de paiement doit fournir `stripeEntetes` (`test-727`, `test-797`).

`server/agent-devis.js` — assistant de rédaction de devis. Modèle `claude-sonnet-5` (la fiche disait
`claude-opus-5` : le code fait foi), un seul outil (`creer_devis`), plafond de 100 appels par jour,
code d'accès d'équipe.
**Ce fichier envoie des données de clients réels à Anthropic** : nom, adresse, ville.
Toute modification touchant au contexte transmis a une portée juridique — voir
`sous-traitance.html`.
⛔ **La consigne suit le MÉTIER de l'entreprise** (28 octobre 2026), pour l'assistant ET pour le « Devis IA »
(`/api/devis/generer`) : une consigne 3D (l'ancienne, octet pour octet), une pour le nettoyage, une générique
pour les 21 autres. Le métier se lit dans `server/devis-metier.js`, UNE décision : l'ANNUAIRE du serveur
(`metierOk(espaceParT(t).metier)`) ; le `metier` du corps de la requête ne compte que pour un espace SANS fiche
(la bêta), borné aux métiers ouverts ; sans métier réglé, la 3D d'avant — les entreprises existantes ne perdent
rien, et l'application, elle, reste aussi en 3D tant que la Tour n'a pas posé le métier. L'assistant ne connaît
l'entreprise que si l'application envoie `t` (champ à ajouter à `adEnvoyer`, publication d'`app.html` sur phrase
de Justin) ; jusque-là il sert la 3D, d'où « décocher Assistant devis » pour une entreprise hors 3D. ⚠️ Même effet pour un espace ouvert depuis la Tour (`pbCreer` ne règle aucun métier) : le métier se pose dans la fiche (bloc MÉTIER) AVANT de lui donner le Devis IA. Aucun prix de
référence hors 3D (rien de sourcé : un prix inventé est pire qu'une question). `tests/test-3112.js`.

### Commandes

Il n'y a **pas de `package.json` à la racine** : tout se lance depuis `server/`.

```bash
cd server && npm start             # démarre le serveur (port 8080)
cd server && npm audit --omit=dev  # failles dans les dépendances de production
node --check server/index.js       # contrôle de syntaxe, depuis la racine
```

**203 suites dans `tests/`**, sans dépendance ni installation (recompté le 30 septembre 2026 —
ce nombre vieillit vite, le relire plutôt que le croire). La plupart extraient les fonctions
réelles d'`app.html` et les exécutent : elles testent donc le fichier livré.

Quatre familles visent `server/`, et elles ne se remplacent pas :

| | ce qu'elle monte | ce qu'elle peut voir |
|---|---|---|
| `test-716`, `test-722`, `test-723`, `test-725` | un MODULE, dépendances injectées | la logique d'une pièce |
| `test-641`, `test-724`, `test-832`, `test-834` | le VRAI serveur, isolé, parlé en HTTP | ce qu'une route répond |
| `test-726` | l'ASSEMBLAGE complet, coffre S3 compris | que les pièces du SERVEUR sont branchées |
| `test-735`, `test-803` | les fonctions RÉELLES d'`app.html` **plus** le vrai serveur | que l'APPAREIL et le SERVEUR se parlent |
| `test-740`, `test-741`, `test-831` | les fonctions RÉELLES d'`espace.html`, de `reinit.html` et de `connexion.html`, plus le vrai serveur | que le PORTAIL et le SERVEUR se parlent — et que l'écran DIT ce que le serveur a répondu |
| `test-744` | le VRAI `op-fs.js` contre le vrai serveur, deux appareils | que le filtre de lecture ne CACHE rien |
| `test-848` | les fonctions RÉELLES d'`espace.html`, de `tour.html` ET d'`app.html`, plus le vrai serveur | que le MÉTIER demandé au portail arrive, par la Tour et le serveur, dans l'application — la couture entière |
| `test-833` | les fonctions RÉELLES de `tour.html`, plus le vrai serveur — et un serveur d'AVANT (un relais qui retire le champ neuf) | que la TOUR et le SERVEUR se parlent, dans les deux ordres de publication |

⛔ **LA MÉTHODE DES BANCS (couture appareil ↔ serveur, `bancs-ci.sh` compteur unique, compter par le DERNIER `N ✓ M ✗` et le code de sortie, commiter AVANT de muter, un motif vise du CODE jamais une phrase, une tranche vide passe au vert, une mutation qui ne mord pas…) : `docs/regles/bancs-et-mesures.md` — le lire avant d'écrire ou de corriger un banc.**

## Déploiement

### Accès

```bash
ssh root@api.teamop.fr    # Ubuntu 24.04, Node v22.23.1
```

`server/install.sh` s'exécute **sur le VPS** : clone dans `/opt/teamop/repo`,
configuration dans `/opt/teamop/config.json` (chmod 600), données dans
`/opt/teamop/data`, service systemd `teamop-api`.

```bash
systemctl status teamop-api          # état
journalctl -u teamop-api -f          # journaux en direct
journalctl -u teamop-api | grep '^devis '   # appels d'outil de l'assistant devis
```

## Conventions

- **Français partout** : code, commentaires, messages de commit, interface.
- Les commentaires expliquent *pourquoi*, pas *quoi*. Ce dépôt en compte de bons —
  s'en inspirer plutôt que de les diluer.
- Fait main plutôt qu'une dépendance de plus, quand c'est raisonnable : le serveur
  est exposé sur Internet, chaque dépendance est une surface d'attaque.
- ⛔ **TOUT CE QUI SE VOIT SE REGARDE SOI-MÊME AVANT D'ÊTRE ANNONCÉ — SUR TOUS LES APPAREILS.** Justin, 31 octobre 2026 : « tous
  les détails que je te demande, tu devrais le vérifier toi-même ; tu sais comment je suis exigeant, et comment le système Apple et
  le design travaillent avec nos applications ; prends-le en compte dans le futur — vérifie aussi Windows et Android ». Un écran
  touché (application, Tour, site, OP MESSAGES) se mesure ET se REGARDE (captures relues à l'œil) sur Mac, Windows, iPhone, Android
  et iPad, de jour ET de nuit, avant de dire « fait » — et on corrige ce qu'on voit sans attendre qu'il le voie. Le jour même, une
  sonde verte laissait le filtre de l'écran Service sortir de l'iPhone : `innerWidth` avait grandi avec la page (règle plus bas) ;
  ce sont les captures qui l'ont montré. Modèle : `scratchpad/sonde-tour-service.js` (neuf profils, trois filtres, contre-épreuve).
  ⚠️ Le navigateur « Blisk » (plusieurs appareils côte à côte) n'existe pas dans une session du cloud : on émule les appareils
  dans le Chromium de l'image (largeur, toucher, densité, encoches).

## À ne pas faire

⛔ **Chaque règle ci-dessous est un TITRE : son texte entier (le pourquoi, les mesures, les bancs) est dans `docs/regles/a-ne-pas-faire.md`. Le LIRE avant de toucher à ce qu'une règle nomme** (paiement, codes promo, formule, suspension, synchro, box, stock, droits, thème, verre, mesures au navigateur, sondes…).

- Ne jamais committer `config.json`, `.env`, ni le contenu de `.claude-flow/`
- Ne pas toucher à `/opt/teamop/config.json` depuis le dépôt : il vit sur le VPS
- ⛔ **Une valeur du CORPS d'une requête ne décide jamais de ce qu'une entreprise a payé.**
- ⛔ **Un code promo ne s'active QUE contre la preuve de la clé d'équipe, et le compteur ne**
- ⛔⛔ **UN CODE PROMO SERT UNE FOIS PAR ENTREPRISE — `promoPresente` EST LE SEUL VERDICT.**
- ⛔⛔ **LA FORMULE QUE L'APPLICATION REÇOIT EST CELLE QUI EST PAYÉE — `espacePaye` → `formuleServie`, JAMAIS LA FICHE SEULE.**
- ⛔⛔ **PAYER PENDANT UNE PÉRIODE OFFERTE NE PRÉLÈVE RIEN AVANT SA FIN — `finEssaiPeriode` EST LE SEUL VERDICT, ET LE**
- ⛔⛔ **CARTE REFUSÉE = IMPAYÉ, ET PAS D'ACCÈS PAYANT TANT QUE CE N'EST PAS RÉGLÉ — UN IMPAYÉ SE SERT SANS FORMULE.**
- ⛔⛔ **PLUS DE FORMULE GRATUITE — CE QUI N'EST PAS PAYÉ EST SUSPENDU JUSQU'AU RÈGLEMENT, ET DANS LE DOUTE ON NE DÉCIDE RIEN.**
- ⛔ **LE SITE SUIT L'APPAREIL POUR LE JOUR ET LA NUIT — PAS DE BOUTON.**
- ⛔⛔ **UNE SESSION PROUVE UN MOT DE PASSE, PAS UNE ADRESSE.**
- ⛔⛔ **UNE SYNCHRO APPARTIENT À UNE ENTREPRISE, POUR TOUJOURS.**
- ⛔ **`espaces.json` ne s'écrit QUE par `espacesEcrire()`**
- ⛔ **Un refus ne se montre PAS tout seul : il faut que l'écran sache le dire.**
- ⛔ **CONNECTER, DÉCONNECTER ET ENVOYER EXIGENT LA MÊME PREUVE — ET LEUR REFUS EST DU JSON, L'INVERSE DE LA RÉCEPTION.**
- ⛔ **Le refus de `/api/replies` n'est PAS du JSON.**
- ⛔⛔ **ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS — JUSTIN RECOLLE TOUTES SES SORTIES ICI.**
- ⛔ **UN CODE PROMO NE S'ÉCRIT DANS AUCUN FICHIER SERVI, PAS MÊME COMME EXEMPLE.**
- ⛔ **`install.sh` NE DÉCIDE PLUS DE LA CLÉ MAÎTRE — `server/poser-cle.js` le fait.**
- ⛔ **UN CHAMP DE `/health` QUE PERSONNE NE LIT EST DU CODE MORT QUI A L'AIR D'UNE GARDE.**
- ⛔ **Un espace ORPHELIN (hors annuaire, invisible dans la Tour) se nettoie par `server/nettoyer-espace-orphelin.js`, jamais à la main.**
- ⛔ **Fermer une entreprise doit COUPER ses sessions Firebase, et le DIRE.**
- ⛔⛔ **UN ADAPTATEUR QUI REMPLACE UNE API QUI *POUSSE* DOIT POUSSER SES PROPRES ÉCRITURES.**
- ⛔⛔ **UNE SYNCHRO SE MESURE AU REPOS, À DEUX APPAREILS, SUR UNE BASE PLUS LOURDE QUE LE BUDGET DU**
- ⛔⛔ **UN REFUS NE SURVIT PAS À LA RÉUSSITE QUI LE DÉMENT.**
- ⛔⛔ **UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN — COMPTER LA POPULATION AVANT**
- ⛔⛔ **UNE SONDE NE DÉTRUIT PAS CE QUE L'APPLICATION S'ATTEND À TROUVER.**
- ⛔⛔ **ET LA BARRE DE DÉFILEMENT VERTICALE EN CRÉE UN AUTRE, PLUS TENACE — LES « 15 PX DE**
- ⛔⛔ **ET DEUX `requestAnimationFrame` NE SUFFISENT PAS : UN DÉBORDEMENT SE CONFIRME À LA**
- ⛔⛔ **ET UNE ROTATION FABRIQUE LE MÊME FAUX DÉBORDEMENT, PAR UN AUTRE CHEMIN.**
- ⚠️ **UN APERÇU PLUS VIEUX QUE LA PAGE QU'IL DOUBLE EST PIRE QUE PAS D'APERÇU.**
- ⛔ **UN DÉBORDEMENT MESURÉ PENDANT L'ANIMATION D'ENTRÉE N'EN EST PAS UN.**
- ⛔⛔ **L'ÉCRAN « CONNEXION REQUISE » COUVRE TOUT, ET IL APPARAÎT EN COURS DE MESURE.**
- ⛔⛔ **UNE FONCTION QUI SORT PAR LA PORTE DU HAUT SE CHRONOMÈTRE À 0 ms — PROUVER QU'ELLE**
- ⛔ **UNE MESURE QUI ÉCHOUE DOIT DIRE POURQUOI.**
- ⛔ **DIX NAVIGATEURS EN PARALLÈLE FAUSSENT LES MESURES DE TEMPS.**
- ⛔ **`document.getAnimations()` NE SE VIDE JAMAIS DANS CETTE APPLICATION**
- ⛔ **UNE SONDE QUI FORCE UN ÉTAT QUE L'APPLICATION NE PRODUIT JAMAIS FABRIQUE DE FAUX DÉFAUTS.**
- ⛔⛔ **UNE BARRE POSÉE DEPUIS `go()` EST BALAYÉE — ACCROCHER LÀ OÙ L'ÉCRAN S'ÉCRIT VRAIMENT.**
- ⛔⛔ **UN TÉMOIN QUI CONSOMME LA RESSOURCE QUE L'ESSAI SUIVANT RÉCLAME FABRIQUE UN FAUX**
- ⛔⛔ **UN RÔLE EST UN NOM : UNE RÈGLE NEUVE EST UNE CASE, JAMAIS `role==='dr'`.**
- ⛔⛔ **UNE CASE SE LIT DANS LA FONCTION QUI ÉCRIT — ET UNE RÈGLE DE VISIBILITÉ DANS LA FONCTION**
- ⛔ **LES BONS DE COMMANDE ONT LEUR PROPRE DROIT, PAS CELUI DE LEUR CATÉGORIE.**
- ⛔ **LE MULTITÂCHE NE RANGE RIEN DANS `db`.**
- ⛔⛔ **UN CYCLE DE VARIABLES CSS NE DIT RIEN, ET IL TUE TOUT CE QU'IL TOUCHE.**
- ⛔⛔ **UN `backdrop-filter` ET LA SURFACE QU'IL FILTRE SE DÉCLARENT ENSEMBLE — SINON UNE**
- ⛔⛔ **UNE MOITIÉ DE RÈGLE SURVIT À L'AUTRE — TROIS FOIS LE 22 SEPTEMBRE 2026, DANS TROIS**
- ⛔⛔ **UN SURVOL QUI CHANGE UNE TAILLE FAIT SAUTER L'ÉCRAN SOUS LE DOIGT — ET AUCUNE PHOTO NE**
- ⛔⛔ **UN GESTE SE MESURE À CE QUE L'ŒIL VOIT APRÈS, PAS À L'ÉTAT QU'IL POSE.**
- ⛔ **`[^{}]*` DEVANT UN LITTÉRAL, SUR LES 3,5 Mo D'`app.html`, PEUT PRENDRE 51 SECONDES — ET**
- ⛔ **UN LOT DE MUTATIONS INTERROMPU PEUT LAISSER UNE MUTATION DANS LE FICHIER — MÊME APRÈS LA**
- ⛔ **UN PANNEAU FLOTTANT NE SE MESURE NI SUR SON BOUTON NI SUR SON PARENT, MAIS SUR**
- ⛔ **DANS UNE LIGNE FLEX, `flex:1` A UNE BASE DE ZÉRO : C'EST LE VOISIN QUI SERT EN**
- ⛔⛔ **UN GESTE, UNE NAVIGATION — LE NAVIGATEUR REFAIT LE MÊME GESTE QUE VOUS.**
- ⛔⛔ **ET LE MÊME JOUR, PAR LE MÊME CHEMIN : L'ONGLET ACTIF PORTAIT DEUX MARQUES.**
- ⛔⛔ **UN AUDIT QUI PART D'UNE LISTE DE CLASSES ÉCRITE À LA MAIN EST UNE POPULATION CHOISIE,**
- ⛔⛔ **MESURER UN DÉGRADÉ AUTREMENT QUE SUR DES PIXELS, C'EST LE RECALCULER SOI-MÊME — ET**
- ⛔⛔ **UN `::after` EN `z-index:-1` SE PEINT SOUS LE FOND DE SON PROPRE PARENT.**
- ⛔ **UN DÉGRADÉ QUI FINIT SUR `transparent` PASSE PAR DU NOIR.**
- ⛔⛔ **UNE COULEUR DE PALETTE SANS SA TEINTE SOURCE EST UNE COULEUR MORTE.**
- ⛔ **DEUX BARRES QUI FONT LA MÊME CHOSE, C'EST UNE DE TROP — ET C'EST LA PLUS HAUTE QUI**
- ⛔⛔ **LE THÈME A SA RÉFÉRENCE DANS LE DÉPÔT, ET UN BANC QUI LA RELIT.**
- ⛔⛔ **UN GESTE D'APPARENCE S'APPLIQUE D'ABORD, S'ENREGISTRE ENSUITE — ET LE RANGEMENT DE**
- ⛔⛔ **LE CHROMIUM DU CONTENEUR, EN `--disable-gpu`, NE FLOUTE PAS UNE VITRE MINCE — ET AUCUN**
- ⛔⛔ **LE VERT PASSAIT À CÔTÉ DE SA PROPRE PALETTE, ET C'EST LA COULEUR DE PRESQUE TOUT LE**
- ⛔ **UN LISERÉ NE PEUT PAS ÊTRE PLUS OPAQUE QUE LA VITRE QU'IL BORDE.**
- ⛔ **UN LIBELLÉ FRANÇAIS NE TIENT PAS DANS UNE GRILLE DESSINÉE EN ANGLAIS.**
- ⛔ **UN CHAMP DÉCLARÉ ET RENDU NULLE PART EST UN ÉCRAN QUI MENT SUR CE QU'IL SAIT FAIRE.**
- ⛔ **UNE MUTATION QUI NE MORD PAS PEUT ÊTRE UNE MUTATION MAL VISÉE.**
- ⛔⛔ **UNE COULEUR CALCULÉE NE REVIENT PAS EN `rgb()` — ET UN ANALYSEUR ÉCRIT POUR `rgb()` LA**
- ⛔ **`lastIndexOf(x, o)` EN JAVASCRIPT INCLUT `o` ; `rfind(x, 0, o)` EN PYTHON L'EXCLUT.**
- ⛔⛔ **UNE SURFACE, UNE ENCRE — `--on-acc` N'EST PAS L'ENCRE DE TOUT CE QUI EST « ACCENT ».**
- ⛔ **UN SÉPARATEUR QUI NE SÉPARE RIEN EST UN TROU.**
- ⛔⛔ **MESURER UN CONTENEUR COMME UN BLOC NE VOIT PAS UN TROU DEDANS — ET L'ÉMULATEUR REND LES**
- ⛔⛔ **UNE POPULATION QU'ON ÉNUMÈRE SOI-MÊME EST UNE RÉPONSE QU'ON S'ÉCRIT SOI-MÊME.**
- ⛔⛔ **UN CONTRÔLE « CET ÉLÉMENT EST-IL RECOUVERT ? » SE FAIT CANDIDAT CENTRÉ — SINON C'EST LA**
- ⛔ **UN TIROIR REPLIÉ N'EST PAS UN DÉBORDEMENT, ET UN CONTENEUR QUI DÉFILE NON PLUS.**
- ⛔⛔ **UNE CIBLE TACTILE SE MESURE À CE QU'UN DOIGT DÉCLENCHE, PAS À SON RECTANGLE.**
- ⛔⛔ **UN SÉLECTEUR D'ATTRIBUT NE VOIT PAS UN ATTRIBUT ABSENT.**
- ⛔ **UN CORRECTIF DE MISE EN PAGE SE MESURE DANS TOUS SES ÉTATS, PAS DANS CELUI QU'IL**
- ⛔⛔ **UN AUDIT SUR DEUX APPAREILS NE DIT RIEN DES DIX AUTRES — ET UNE TABLETTE N'EST NI UN**
- ⛔⛔ **UNE PAGE QUI S'ÉLARGIT EMPORTE `innerWidth` AVEC ELLE — UN DÉBORDEMENT SE MESURE CONTRE**
- ⛔ **« ET QU'ILS TIENNENT SUR UNE LIGNE » ÉTAIT ÉCRIT DANS LE COMMENTAIRE DE `SEG_MAX`, PAS DANS**
- ⛔⛔ **UNE RANGÉE DE DESTINATIONS NE DOIT PAS DÉFILER — ET SUR TÉLÉPHONE, `.filters` DÉFILE.**
- ⛔⛔ **LES DONNÉES DE DÉMONSTRATION SONT COURTES — UNE MISE EN PAGE SE MESURE AVEC LES VALEURS LES**
- ⛔⛔ **UNE ICÔNE QUI REMPLACE UN ÉMOJI EMPORTE LE NOM DU BOUTON.**
- ⛔⛔ **TOUS LES AUDITS TOURNAIENT EN ADMINISTRATEUR — L'ÉCRAN DU TECHNICIEN N'Y PARAISSAIT**
- ⛔⛔ **UN STYLE ÉCRIT EN LIGNE BAT LA FEUILLE — TROIS FOIS LE MÊME JOUR, ET UNE FOIS LE CORRECTIF**
- ⛔⛔ **UNE BOÎTE ABSOLUE OU FIXE CENTRÉE PAR `left:50%` + `translateX(-50%)` SE MESURE SUR LA**
- ⛔ **C'EST LA LARGEUR DE LA LISTE QUI DÉCIDE, PAS CELLE DE L'ÉCRAN.**
- ⛔⛔ **UNE COLONNE QUI CÈDE TOUT NE DÉBORDE PAS — ELLE S'ALLONGE, ET AUCUN CONTRÔLE DE**
- ⛔ **UNE SONDE EST DU JAVASCRIPT DANS UN GABARIT : UN ACCENT GRAVE LE REFERME, UN `\s` Y**
- ⛔⛔ **`--acc` EST LA COULEUR D'UN APLAT, PAS CELLE D'UNE LETTRE — UN TEXTE ÉCRIT `--acc-txt`.**
- ⛔⛔ **UNE FONCTION DÉCLARÉE DEUX FOIS : LA SECONDE GAGNE PARTOUT, EN SILENCE.**
- ⛔ **SOUS LE VERRE, UN CONTRASTE SE LIT AU PIXEL.**
- ⛔⛔ **UNE MESURE PRISE PENDANT UNE TRANSITION DE VUE LIT LE CALQUE DE LA TRANSITION — ET**
- ⛔ **UNE ANCRE DE BANC EST UN COMMENTAIRE — ON DÉCOUPE DANS LE TEXTE BRUT, ON NETTOIE APRÈS.**
- ⛔⛔ **UN SÉLECTEUR `:has()` DÉCRIT UNE RELATION, PAS UNE FORME — ET LA MÊME RELATION EXISTE**
- ⛔⛔ **POUR SAVOIR QUELLE RÈGLE PEINT UN ÉLÉMENT, ON DEMANDE AU NAVIGATEUR —**
- ⛔⛔ **UN `:has()` QUI LIT UN ATTRIBUT `style` FAIT RESTYLER TOUTE LA PAGE À CHAQUE ÉCRITURE DE**
- ⛔⛔ **UN RACCOURCI `background:…!important` EFFACE L'IMAGE POSÉE EN LIGNE — AUCUNE PHOTO DE**
- ⛔ **UNE RÈGLE ÉCRITE POUR UN ÉCRAN NE COUVRE PAS LE COMPOSANT — ET L'ÉCRAN QUI SORT DU**
- ⛔⛔ **UNE SONDE QUI CLIQUE DOIT COMPTER SES FRAPPES QUI ONT VRAIMENT PORTÉ.**
- ⛔⛔ **UNE GÉOMÉTRIE RECOPIÉE EN JAVASCRIPT DÉPEND DU MOMENT OÙ ON LA COPIE.**
- ⛔⛔ **LE NAVIGATEUR ANNULE LE FLUX DE POINTEUR AU PREMIER MOUVEMENT HORIZONTAL.**
- ⛔⛔ **UN OBJET QU'ON TIENT SUIT LA MAIN ; UNE PAGE QU'ON POUSSE VA À L'OPPOSÉ.**
- ⛔⛔ **LA PROPRIÉTÉ `scale` PASSE AVANT `transform` — ELLE MULTIPLIE LE DÉPLACEMENT.**
- ⛔⛔ **UN APPUI LONG QUI OUVRE QUELQUE CHOSE SOUS LE DOIGT : LE CLIC DU RELÂCHER TOMBE DEDANS.**
- ⛔ **UN ÉCOUTEUR `animationend` EN `{once:true}` NE SE DÉCROCHE QUE SI L'ANIMATION A LIEU.**
- ⛔⛔ **CE CHROMIUM PILOTÉ NE TRANSMET AUCUN `touchmove` DE MOINS DE ~15 PX — ET IL LES LIVRE AU**
- ⛔ **UN ÉCOUTEUR POSÉ SUR UN CONTENEUR QUI NE COUVRE PAS L'ÉCRAN EST UN ÉCOUTEUR QU'ON CROIT**
- ⛔⛔ **RETIRER UN ÉCRAN N'EST PAS RETIRER UNE DONNÉE.**
- ⛔⛔ **UNE VUE QUI N'EST PAS AU MENU ÉCHAPPE À LA GARDE DE `go()`.**
- ⛔ **UN SOUS-TITRE NE COMMENCE PAS PAR `/* ══` : C'EST LA MARQUE D'UN BLOC, ET LES BANCS**
- ⛔ **UN ÉCRAN QUI NE REMPLIT PAS SA LARGEUR SE MESURE, IL NE SE DEVINE PAS.**
- ⛔ **DE NUIT, C'EST LA LUMIÈRE QUI ÉLÈVE, PAS L'OMBRE — ET J'AVAIS RECOPIÉ L'INVERSE.**
- Ne pas modifier l'anti-abus (`server/index.js`) sans relire pourquoi il lit
- Ne pas écrire de données personnelles de clients dans les journaux
- ⛔ **UNE ENTREPRISE SUPPRIMÉE PERD AUSSI SA SURVEILLANCE**
- ⛔ **L'EN-TÊTE D'UN DOCUMENT SE LIT DANS `docEntete(société)`, JAMAIS À LA MAIN.**
- ⛔ **UN MOTIF QUI TROUVE L'AFFECTATION NE VOIT PAS LA CONDITION QUI LA GARDE.**
- **Ne jamais faire `db.produits.push(…)`**
- **L'identifiant d'une fiche produit est soit unique par construction (`uid`), soit déduit d'un nom qui**
- ⛔ **Ne jamais écrire une catégorie de produit hors de la liste DU MÉTIER — `categoriesProduit()`, jamais `CAT_LIST` en direct.**
- ⛔ **LE STOCKAGE (le stock hors des box) EST UNE BOX À IDENTIFIANT FIXE — `STOCKAGE_ID`.**
- ⛔⛔ **UNE INTERVENTION NE DÉDUIT RIEN, NULLE PART — NI BOX, NI STOCKAGE, NI COMPTEUR.**
- ⛔ **DEUX COMPTES NE PORTENT JAMAIS LE MÊME PRÉNOM + NOM — `compteHomonyme`, à TOUTES les portes qui**
- ⛔⛔ **UN CORRECTIF QUI FERME UNE PORTE N'A PAS FERMÉ LES AUTRES — L'« OP ADMIN » FANTÔME EST REVENU PAR LE**
- **Retirer un produit d'une box s'écrit TOUJOURS dans `db.boxDecisions`**
- ⛔ **Quitter un espace passe par `espaceQuitter()`, jamais à la main.**
- ⛔ **Un `<input type="number">` AVALE la virgule décimale, et le champ reste VALIDE.**
- **Une quantité de ligne s'exprime dans l'unité DE LA LIGNE, pas de la fiche.**
- **Une trace de mouvement dit ce qui a BOUGÉ, jamais ce qui était demandé.**
- ⛔ **Le stock d'une box ne se réécrit JAMAIS en bloc.**
- ⛔ **Ouvrir un écran n'écrit pas.**
- ✅ **LA RÈGLE FIRESTORE EST FERMÉE DEPUIS LE 18 SEPTEMBRE 2026**
- ⛔ **Une box se fusionne PRODUIT PAR PRODUIT, pas en bloc.**
- ⛔ **Un numéro de document ne se réutilise jamais, et les deux sources sont amnésiques.**
- **Les collections qui ne sont pas des listes se fusionnent clé par clé.**
- ⛔ **`_m:1` posé juste avant un `save()` ne survit pas.**
- **Rien ne s'écrit dans les données d'une entreprise au seul chargement de la page.**
- **Un `.btn.sm` neuf se rend à 38 px, pas 44.**
- **Une ligne de journal par GESTE, jamais par box.**
- ⛔⛔ **`document.body.innerHTML` CONTIENT LE CODE SOURCE DE LA PAGE.**
- ⛔⛔ **UNE DÉCOUPE DE BANC QUI DÉBORDE REND UN VERDICT FAUX — TROIS FOIS EN DEUX JOURS.**
- ⛔ **UNE ANCRE QUI NE SE TROUVE PAS REND UNE TRANCHE VIDE, ET UNE TRANCHE VIDE PASSE AU**
- ⛔ **LA BÊTA VOIT TOUTES LES CATÉGORIES, PAR CONSTRUCTION.**
- ⛔ **UN COMPTEUR DE PAIE PORTE DEUX HORODATAGES, ET ON LES RÉÉCRIT ENSEMBLE.**
- ⛔ **LA PLATEFORME : CE QU'ON SAIT, ET CE QU'ON NE SAIT PAS.**
- **Ne jamais piloter `app.html` avec Chrome DevTools MCP**
- ⛔ **NE JAMAIS TOUCHER À `SYNC_SECRET_DEFAULT` NI À `SYNC_SALT`**
- ⛔ **Le semis de démonstration ne charge QUE sur un appareil qui n'appartient à personne.**
- **Ne pas renommer les clés de stockage `elan_*` à la légère.**

## Chrome DevTools MCP — mesurer pour de vrai, sur la bêta seulement

⛔ Bêta uniquement, 127.0.0.1 uniquement ; un agent à liste `tools:` n'atteint pas les outils MCP.

→ Le texte entier : `docs/regles/chrome-devtools.md`.

## Attention : deux copies de travail

Ce dépôt est cloné deux fois sur cette machine :

- `~/Documents/GitHub/teamop` — branche `main`, **le code de production**
  (le dépôt s'appelait `elangestion.github.io` jusqu'au 7 septembre 2026 ; le dossier local
  peut encore porter l'ancien nom sans que ça gêne)
- `~/TeamOP` — branche `audit/plan-action`, **625 commits de retard**

Son `server/index.js` fait 308 lignes contre 1 300 ici. Toute correction du serveur
va dans cette copie-ci. Vérifier la branche avant d'écrire quoi que ce soit.

## Devis

`devisPdfStr()` dans `app.html` produit un vrai fichier PDF, sans bibliothèque —
même fabrique que `bonPdfStr()` pour les bons de commande. L'en-tête vient de la
société choisie sur le devis : `bcEntete()` pour le nom, `bcCouleur()` pour la
couleur, `socStyle().logo` pour le logo, converti en JPEG par un canvas parce que
le PDF ne lit pas le PNG.

Le générateur `devisIAModal()` enchaîne : dictée au micro → génération → aperçu du
PDF → client (choisi ou saisi) → envoi par `envoiDoc()`. Le moteur dépend de
l'offre de l'entreprise, décidée côté serveur : Haiku inclus, Sonnet en supplément,
ou les deux au choix de l'utilisateur.

⛔ **LE RAPPORT D'INTERVENTION PART EN VRAI PDF JOINT DEPUIS LA v744 (bêta)** — `rapportPdfStr`,
même fabrique, et `rapportDocument` qui relit photos et plans du serveur sans rien enregistrer.
Deux règles :
- **le rapport imprimé (`printRapport`) et le PDF lisent les MÊMES fonctions** —
  `rapportConstatLignes`, `rapportProduitsLibres`, `rapportChampsPerso`, et `_pdfDessinPlans` pour
  le plan (partagé avec le plan d'implantation). Une section ajoutée à l'un sans l'autre, et le
  client reçoit un document différent de celui qu'on a imprimé (`tests/test-802.js` §5) ;
- ⛔ **aucun « ? » dans un document qu'un client reçoit** : WinAnsi n'a ni flèche, ni pictogramme,
  ni « é » décomposé. `_pdfTranslit` les dit autrement ou les efface, et `_pdfTxt` ET `_pdfLarg`
  l'appliquent tous deux — ce qu'on mesure est ce qu'on écrit. Un nouveau générateur écrit par
  `_pdfTxt` et mesure par `_pdfLarg`, jamais autrement.
- ⚠️ **une fenêtre d'impression s'ouvre DANS le geste**, avant tout `await` : ouverte après un
  aller-retour au serveur, le navigateur la bloque. L'attente et la question s'affichent dedans
  (`printRapport`, `papDossierSanitaire`).

## ⛔ RÈGLE DE TRAVAIL — tout le développement sur la BÊTA

⛔⛔ **LA BÊTA DOIT MARCHER COMME LA VRAIE VERSION** — Justin, 5 novembre 2026 : « quand on fait un truc sur la bêta, il faut que tout
fonctionne sur la bêta […] ça commence à me gaver de devoir faire des comptes publics pour tester avant les clients ». Une fonctionnalité
livrée sur la bêta se joue de bout en bout SUR la bêta (vraies boîtes mail par le jeton d'accès, envois, documents) ; ce qu'elle ne peut
pas y faire se DIT avant de la livrer, avec la raison. Et ce soir-là : « tout ce que tu fais sur la bêta, ça va sur la version finale »
— pour ce lot (v802-v803), la publication suivait la bêta sur sa phrase.

Posée par Justin le 11 septembre 2026, après une matinée où deux défauts sont remontés d'ELAN :
**« tout le développement sur la bêta. Il ne faut pas que ça impacte ELAN, sinon ça va être
compliqué. »** Ce n'est pas une préférence de confort : ELAN est une entreprise qui travaille,
et une publication ratée se paie en journée de terrain perdue.

Concrètement, et dans cet ordre :
1. **Ce qui casse chez un client se corrige tout de suite**, en production — c'est la seule
   exception, et elle se limite au correctif, jamais à ce qui traîne autour.
2. **Tout le reste s'écrit, se mesure et se valide sur `beta.html`** (ou un aperçu), et n'atteint
   `app.html` qu'une fois éprouvé.
3. **Avant toute publication : qu'est-ce que ça change pour ELAN ?** Si la réponse n'est pas
   « rien » ou « ça répare quelque chose chez eux », ça attend.

Corollaire déjà éprouvé : un correctif arrête une cause, **il ne range pas derrière lui**. Ce qui
est déjà entré dans la base d'un client y reste jusqu'à un geste — le dire en même temps que le
correctif, sinon le chantier paraît clos alors qu'il attend quelqu'un.

### ⛔ DURCIE LE 11 SEPTEMBRE 2026 AU SOIR — LA PUBLICATION N'EST PLUS UNE DÉCISION D'AGENT

Après une journée à NEUF versions publiées en production chez un client qui travaillait
(v657 → v665), Justin a tranché : **« je veux que maintenant qu'on va travailler sur des mises à
jour de l'application ou du développement, que ça travaille QUE sur la bêta. On publiera pour
tout le monde que quand JE voudrai publier. Je veux tester avant, pour pas refaire les erreurs,
que ce soit pas stable. »**

La règle, sans interprétation possible :

1. **Tout va sur `beta.html`. Rien ne va sur `app.html`.** Une fonctionnalité, une refonte, une
   amélioration, un rangement, une idée : bêta. On ne demande même pas.
2. **`app.html` ne se publie que sur une PHRASE DE JUSTIN qui le demande explicitement**, pour
   ce changement-là. Pas « il a dit oui hier », pas « il a validé le principe », pas « c'est
   évidemment ce qu'il veut ». Il dit publier, on publie. Sinon on attend, même si c'est prêt,
   même si c'est mieux, même si ça traîne depuis trois jours.
3. **UNE SEULE exception, et elle est étroite** : ce qui CASSE chez un client en production se
   corrige tout de suite. « Casse » veut dire : quelqu'un ne peut pas travailler. Pas
   « c'est moche », pas « ce serait mieux », pas « tant qu'on y est ». Et le correctif se limite
   au défaut — rien d'autre ne voyage avec lui.
4. **Le doute tranche vers la bêta.** Si on hésite à classer un changement en (3), c'est qu'il
   n'en est pas.

⚠️ **Ce qui a motivé la règle, et qu'il faut se rappeler avant de la contourner** : les neuf
versions du 11 septembre étaient toutes justes, toutes testées, toutes mesurées sur la base réelle
du client. Ça n'a rien empêché. **Deux d'entre elles reposaient sur une hypothèse jamais vérifiée**
(la taille du document Firestore), **une a été corrigée une heure après publication** par l'agent
`gardien` (la suppression en lot déduisait « jamais connecté » d'un journal plafonné), et une
autre a dû être retirée de la publication après mesure (l'annuaire : les comptes d'ELAN avaient
tous un mot de passe, le correctif ne réparait rien chez eux). Un agent qui publie vite publie
aussi ses erreurs vite. Le client, lui, les reçoit toutes.

**Ce que ça change concrètement dans le rituel** : on monte `APP_VERSION` et le cache du service
worker comme avant, on régénère `beta.html`, on fait passer les suites — et **on s'arrête là**.
Le report sur `main` de `app.html`/`sw.js` attend sa phrase. La bêta, elle, se publie librement :
c'est son rôle.

### ⛔⛔ SUSPENDUE LE 23 SEPTEMBRE 2026 — RIEN EN VERSION PUBLIQUE TANT QUE LE SERVEUR N'EST PAS SÉPARÉ DE FIREBASE

Justin, mot pour mot : **« On ne publie rien en version publique tant que le serveur n'est pas
fait à part de Firebase. »** La règle du 11 septembre disait « `app.html` attend une phrase de
Justin » ; celle-ci dit qu'**aucune phrase ciblée ne suffit plus** tant que le chantier « TOUT
SUR LE SERVEUR » n'a pas sorti OP GESTION de Firebase (étape E de `REPRISE.md`, « couper
Firestore »). La production reste en v695 ; la bêta continue de se publier librement.
⚠️ L'exception « ce qui casse chez un client » n'a pas été rediscutée : en cas de panne réelle
chez ELAN, on ne publie pas de soi-même — on lui DEMANDE, avec le défaut mesuré.
⚠️ Et `server/` n'est pas visé : c'est justement le chantier que cette décision attend (un push
qui le touche déploie toujours le VPS, avec ses propres preuves).

### ⛔ LES APPAREILS D'ABORD, LA PORTE ENSUITE — APPLIQUÉ AUX PHOTOS (19 septembre 2026)

La règle existait déjà pour la clé Firestore. Personne ne l'avait appliquée aux **pièces
jointes**, et c'est un bloquant de publication mesuré.

Depuis l'étape 0, une photo ne vit plus dans le document d'équipe : `syncSortirPieces` y
laisse le seul marqueur `piece:<64 hexa>`, le contenu part sur le VPS, et `photoSrc()` le
retrouve. **`photoSrc()` n'existe pas avant la v702.**

Un appareil resté en version antérieure met donc la chaîne `piece:aaa…` telle quelle dans un
`<img src>` — et `printRapport()` la met **dans le PDF que ce technicien envoie au client**.
Mesuré sur une copie d'aperçu de la v695 : `pdfContientPiece = true`, et la ligne du document
affiche « 0 Ko ». Le client ne reçoit pas un rapport incomplet : il reçoit un rapport cassé,
envoyé par quelqu'un qui croyait bien faire.

⛔ **L'ORDRE, sans exception :**

1. publier `app.html` et `sw.js` ;
2. **attendre que la Tour ne montre plus AUCUN appareil sous la nouvelle version** (écran
   Connexions) ;
3. **seulement alors** poser `teamop_config/version.min` à cette version, dans Firestore
   **et** côté API — les deux, pas l'un des deux ;
4. et tant que (2) n'est pas vrai, **ne pas prendre de photo depuis un appareil à jour** sur
   une entreprise dont le parc est mélangé.

⚠️ Le point qui coûte est le (2) : c'est une ATTENTE, et une attente se saute. La v702 a été
prête le 19 septembre au matin ; publier `app.html` le jour même sans exiger la version
aurait envoyé des PDF cassés à des clients d'ELAN dans la journée.

⚠️ Corollaire pour toute fonctionnalité future qui ALLÈGE un enregistrement synchronisé : se
demander d'abord **ce qu'en fait la version d'AVANT**. Un allègement n'est jamais neutre pour
un parc mélangé — et un parc est toujours mélangé pendant quelques jours.

⛔ **ET LES PHOTOS DE PLANS SUIVENT LA MÊME RÈGLE DEPUIS LA v744 (bêta, 24 septembre 2026).** La
photo d'un plan d'appâtage et celles de l'onglet « Plans » d'une intervention prennent le format
`piece:…` (`planImgSrc`, `planImgDeposer`, `intPlanDeposer`). Une v743 ou antérieure mettrait le
marqueur dans l'image d'un plan : même ordre (publier, attendre, PUIS exiger la version), et pas de
plan photographié depuis un appareil à jour tant que le parc est mélangé. La fusion des plans poste
par poste (`plansFusionFine`) ne s'active, elle, qu'une fois les deux côtés à jour.
⛔ **Et regarder une photo ne la modifie pas** : `recEmpreinte` coupe une pièce à son marqueur
(70 caractères). Sans ça, relire le contenu pour l'écran changeait l'empreinte de la fiche, et le
`save()` suivant la TAMPONNAIT — un appareil qui ne faisait que regarder gagnait la fusion (défaut
de la v702, mesuré dans la vraie page v743).

### ⛔ REDURCIE LE 15 SEPTEMBRE 2026 AU SOIR — RIEN NE PART SANS ÊTRE ÉPROUVÉ

Justin, après une soirée à trois publications (v690, v691, serveur+Tour) : **« avant d'envoyer
quoi que ce soit en mise à jour, je veux que tu vérifies que tu testes. Et chaque chose que tu
vas faire maintenant, je veux que ça soit vérifié et testé avant que ça soit envoyé en mise à
jour. Et le développement maintenant va se concentrer pour OP GESTION sur la bêta avant de
publier au public. »**

Deux exigences, et la première est un GESTE, pas une intention :

1. **Rien ne part sans preuve.** Avant tout push qui atteint un client, dans cet ordre :
   - la suite complète passe (`for f in tests/test-*.js; do node "$f"; done`) — et un banc qui
     ne couvre pas le changement ne compte pas : on en écrit un ;
   - le contrôle de syntaxe (`node scripts/verifier-syntaxe.js`) ;
   - **le comportement est MESURÉ au navigateur** quand le changement se voit ou s'exécute
     (sonde du scratchpad sur `beta.html`) — pas relu, mesuré ;
   - le fichier RÉELLEMENT SERVI est vérifié après coup (`curl teamop.fr/... | grep APP_VERSION`).
   ⛔ Et on le DIT dans la réponse, avec les chiffres. « C'est testé » sans chiffre n'est pas
   une vérification, c'est une affirmation.

2. **OP GESTION se développe sur la bêta.** `app.html` et `sw.js` ne rejoignent `main` que sur
   une phrase de Justin pour CE changement-là. La bêta, elle, se publie librement : c'est son
   rôle, et c'est là qu'il regarde.

⛔ **ET `server/` EST UNE PUBLICATION AUSSI** — la leçon du même jour, qui a coûté une journée de
croyance fausse : `.github/workflows/deploiement.yml` déploie le VPS à **tout push sur `main`
touchant `server/**`**. Un commit ne peut donc pas être « prêt, non déployé » s'il est sur
`main` ; retenir du serveur veut dire ne pas le pousser du tout. Les mêmes preuves sont donc
exigées avant un push serveur qu'avant une version d'application.

✅ **DEPUIS LE 19 SEPTEMBRE 2026 AU SOIR, LE VPS ATTEND LES BANCS.** `deploiement.yml` porte un
job `bancs` et le job qui parle au VPS le déclare en `needs`. Avant ça, le job « tests » vivait
dans `ci.yml` — un workflow SÉPARÉ, et GitHub Actions n'a pas de `needs` entre workflows : sur
la même poussée, les deux partaient en parallèle et **le déploiement finissait 50 à
100 secondes AVANT les bancs**. Le serveur atteignait les clients pendant que les tests
tournaient, et leur échec ne rattrapait rien.
⚠️ La porte est **dans le workflow qui déploie**, pas ailleurs : elle ne peut pas se faire
contourner par une modification de `ci.yml`. `tests/test-728.js` lit la DÉPENDANCE entre jobs,
pas l'intention — retirer le `needs` fait tomber le banc. **Cela ne remplace pas la règle
ci-dessus** : les bancs verts autorisent le déploiement, ils ne décident pas de le faire.

✅ **DEPUIS LE 24 SEPTEMBRE 2026 (15 h 14 UTC, commit `1be3b75`), LA PORTE EST SUR `main` AUSSI.**
Le déploiement du serveur seul y a posé le job `bancs`, restreint à `scripts/bancs-serveur.liste`
(34 suites, plancher de vérifications), et `deployer` le déclare en `needs` — premier passage :
bancs verts en 39 s, PUIS le VPS. Tout commit de déploiement du serveur seul se FABRIQUE par
`scripts/preparer-deploiement-serveur.sh`, qui réécrit la ligne des bancs pour lancer CETTE liste.
Le paragraphe qui suit reste pour l'histoire — et pour sa leçon, qui ne vieillit pas.

⛔⛔ **CETTE PORTE N'EXISTAIT QUE SUR LA BRANCHE — PAS SUR `main`, QUI EST CELUI QUI DÉPLOIE.**
Vérifié le 23 septembre 2026 au soir (`git show origin/main:.github/workflows/deploiement.yml`) :
sur `main`, un seul job, `deployer`, sans `needs`. Le paragraphe ci-dessus décrit le fichier de la
branche de travail, jamais reporté sur `main` — et il ne peut pas l'être tel quel : les bancs de la
branche lisent son `app.html` (v737), `main` sert la v695, et 67 suites tomberaient (simulé par
`gardien`). **Un push de `server/` sur `main` part donc SANS AUCUN BANC** tant qu'un job `bancs`
restreint aux suites SERVEUR n'y est pas posé (726, 724, 641, 716, 722, 723, 725, 729, 745 passent
contre l'`app.html` de `main`). `test-728` ne peut pas le voir : il lit le fichier de la branche.
C'est la leçon de `mailRefus`, par l'autre bout : une garde décrite dans ce fichier n'est pas une
garde — aller lire le fichier qui DÉPLOIE, sur la branche qui déploie.

## La bêta : un outil de développement, jamais un canal public

`beta.html` n'est **pas** une version d'essai pour les clients et ne le sera jamais. C'est
l'outil de l'équipe qui développe : Justin et les personnes qui travaillent avec lui.
Il n'y aura pas de « bêta publique » — ce mot désigne ici un canal interne.

- **L'accès se gère uniquement depuis la Tour de contrôle** (onglet Accès bêta, réservé au
  patron) : ouvrir, couper, rouvrir, supprimer. Le serveur porte ces accès
  (`beta-comptes.json`), la page n'a aucun compte de départ, un accès coupé ne passe plus
  même sur un appareil resté connecté.
- **Chaque accès dit qui travaille sur quoi** : la personne, et le chantier qu'elle teste
  (écran, fonctionnalité, version). Fait le 8 septembre 2026 — champ `chantier` à la création,
  réécrivable par `POST /api/monitor/beta/chantier` (`monPatronStrict`), affiché sur la ligne.
  Un accès sans chantier renseigné le dit en ambre plutôt que de se taire : un accès dont on
  ne sait plus à quoi il servait est un accès qu'on n'ose plus couper.
- **Jamais de données d'entreprise** : espace `opgestion-beta` (il s'appelait `elan-gestion-beta` jusqu'au
  17 septembre 2026 — `beta-build.js`), préfixe `elanB_`. Un accès
  bêta n'ouvre que la bêta.
- **L'onglet s'appelle « Accès » et porte DEUX portes, à ne jamais confondre** : la bêta
  (`beta.html`, comptes portés par le serveur, n'ouvre que la bêta) et la version publique
  (`app.html`, crée un vrai espace d'entreprise avec de vraies données qui se synchronisent).
  La seconde carte réemploie `tourEspaceDe()`, le même chemin exactement que « Lien de
  connexion » sur la fiche d'un client — pas de seconde route serveur à maintenir. L'adresse
  e-mail sert de clé : la réutiliser rouvre le même espace, elle ne le remplace pas.
- Sur `teamop.fr/beta.html`, le champ **Entreprise reste vide** : identifiant et mot de passe
  donnés par la Tour, rien d'autre. Y taper un nom envoie la page chercher une entreprise.

## Refonte et aperçu (septembre 2026)

La refonte design/mouvement se fait sur la branche `refonte/design`. **Rien ne remplace
une page utilisée par les clients sans que Justin l'ait testée.** Le canal de test :

```bash
bash scripts/apercu.sh tour.html app.html   # copies sous apercu/, base href, ruban, sans service worker
node scripts/verifier-theme.js tour.html    # syntaxe du JS embarqué, variables fantômes, contrastes
```

`apercu/` se commite **seul sur `main`** (nouveaux fichiers, aucun point d'entrée client
ne change) et se teste sur `https://teamop.fr/apercu/…` — même origine, donc l'API
(CORS limité à teamop.fr) et la session fonctionnent. `apercu/app.html` passe par
`beta-build.js` : données `elanB_`, espace de synchro bêta. Le serveur (`server/`)
reste sur la branche jusqu'à validation : un push sur `main` le déploie.

Marque, à ne plus confondre : **carré bleu nuit « TEAM / OP » = TEAM OP** (`icons/teamop-*`,
site, mails) ; **carré vert « GESTION / OP » = OP GESTION** (`icons/opgestion-*`, `icon-*`,
manifeste de l'app). La pastille verte « OP » de la Tour n'est qu'un repère d'en-tête.

## Pièges rencontrés — à ne pas refaire

Données de client jamais figées dans le code ; deux routes de même chemin : la première gagne ; un agent de workflow en worktree part de origin/main ; compiler la page ENTIÈRE après une fusion de lots.

→ Le texte entier : `docs/regles/pieges.md`.

## Les skills tiers — on recopie, on scanne, on adapte

Un skill est du texte qui dirige un agent (parfois des scripts), chargé à CHAQUE session d'un dépôt en production. Règle posée avec ECC et reprise pour toute source (Emil Kowalski, Vercel, Instagram, Trail of Bits, marketingskills) :
on RECOPIE les pièces choisies dans `.claude/skills/`, après les avoir lues, avec leur licence (`.claude/skills/LICENSE-<source>`), une note de provenance (`PROVENANCE-<source>.md`) et un bloc « Adaptation TeamOP » en tête —
**jamais** `enabledPlugins`, `./install.sh` ni `npx skills add`. Tout agent d'un skill tiers tourne en Sonnet.

⛔ **AVANT TOUTE RECOPIE : `bash scripts/scanner-skills.sh <dossier>`** (SkillSpector de NVIDIA, **toujours `--no-llm`** — sans lui le contenu des fichiers part chez un tiers ; seuls des noms de paquets vont à `api.osv.dev`). Le script
**n'installe rien** : s'il manque, il le dit et sort en **3, « AUCUN VERDICT »** — jamais en 0. Procédure complète : skill `scanner-skills`. Un scan réduit le risque, il ne l'annule pas : les scripts du skill se relisent à la main (réseau,
exécution, identifiants, fichiers écrits), et un skill que le scanner juge réellement risqué ne s'installe pas.
⚠️ **Au 28 octobre 2026 SkillSpector n'a jamais tourné ici** : le classifieur de permissions de la session a refusé son installation (code tiers) et ce refus n'a pas été contourné. Les notes de provenance de Trail of Bits et de
marketingskills disent donc « relu à la main et balayé par un script maison » (`scripts/balayage-skills-grossier.py`, un substitut qui n'a ni score ni verdict). **Ne jamais écrire « scanné » avant un vrai scan** ; `tests/test-3140.js` exige l'aveu ou une ligne
« Scanné par SkillSpector le JJ/MM/AAAA » avec son verdict. Installer le scanner est une décision de Justin (commande exacte dans le script).

- **Trail of Bits** (CC-BY-SA-4.0 : mention d'origine, même licence pour les adaptations) : `differential-review`, `insecure-defaults` (réécrit en skill : l'original est un `Workflow` dont la vérification est en Opus), `supply-chain-risk-auditor`
  (envoie noms et versions de paquets à huit services publics et **lit `gh auth token`** : on ne connecte pas `gh` pour l'occasion). `second-opinion` (envoie du code ailleurs) n'est PAS installé et ne l'est jamais.
- **marketingskills** (MIT) : six skills **traduits et adaptés au droit français**, pas recopiés — `prospecting`, `cold-email`, `sales-enablement`, `customer-research`, `directory-submissions`, `lead-magnets`.
  ⛔ La règle de la prospection est dans `.claude/skills/prospecting/references/droit-francais.md` (RGPD art. 14 et 21, CPCE L34-5, LCEN art. 20, CNIL) — **écrite de mémoire, non relue à la source** : à faire valider (Nina, puis l'agent `juriste`, puis Justin)
  avant une campagne d'ampleur. Ce qui y est tranché pour TeamOP : **jamais de SMS de prospection sans consentement** ; aucun agent n'appelle ni n'automatise LinkedIn ; pas de faux humain ni de faux « Re: » ; un refus est définitif (liste de suppression) ;
  pas d'avis acheté ni récompensé ; la forme des courriels d'agents est celle du serveur (`server/agents-connaissance.js`). Les données de prospects sont des données réelles : dossier temporaire de la session, jamais dans le dépôt.
- Douze skills de marketingskills étaient déjà là sans licence ni provenance (`copywriting`, `copy-editing`, `signup`, `onboarding`, `paywalls`, `churn-prevention`, `pricing`, `analytics`, `product-marketing`, `programmatic-seo`, `schema`, `seo-audit`) ;
  certains sont en retard sur la source (voir `PROVENANCE-marketingskills.md`). `find-skills` cherche et propose, il n'installe pas.
- **Les outils externes ne vont PAS dans le dépôt** (SkillSpector, promptfoo) : un script qui les lance, une doc, et la décision de les installer à Justin.

## Modèle et effort par agent

⛔ TOUT EN SONNET (agents du dépôt, agents de workflow : `agent(prompt,{model:'sonnet',…})`) ; seul l'effort varie. Une consigne « ne modifie rien » n'est pas une garde : `git log`/`git status` après tout workflow. Tout document juridique qu'un client reçoit passe par `juriste`.

→ Le texte entier : `docs/regles/agents-modeles.md`.

