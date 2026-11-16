# L'atelier de devis et de contrats DANS le prototype OP GESTION — spécification (16 novembre 2026)

Demande de Justin : « Je veux que après tu le mettes dans OP GESTION avec le système de devis » — réponse à la
question « où ? » : **le prototype OP GESTION** (pas la vraie application).

⚠️ Ce travail a été fait une première fois le 16 novembre (intégration, puis relecture adverse : 46 défauts rapportés,
35 confirmés), puis PERDU avec le dossier temporaire au redémarrage de la machine, avant d'être poussé. Ce fichier
réunit le dessin de la première version ET ses 35 corrections : la seconde version doit les avoir d'emblée.

## Les pièces
- `scratchpad/proto-final/atelier/page.source` : la SOURCE unique de l'atelier « Documents sur mesure » (Version 11
  publiée, 690 498 octets : un `<title>`, un `<link>` Google Fonts, un `<style>`, un `<script>`, sans squelette).
  Extension `.source` exprès : ce n'est pas une page servie, les bancs qui recensent les pages ne la lisent pas.
- `scratchpad/proto-final/atelier/fabriquer.sh` : fabrique `apercu/prototype-documents.html` (squelette + source).
  La copie ne se retouche JAMAIS à la main. Il fabrique aussi `essai.html` (page seule, pour les sondes).
- `apercu/prototype-op-gestion.html` : le prototype (22 000 lignes). L'atelier s'y ouvre dans un cadre plein écran `#opdz`.
- La page SEULE (sans `?app=1`) reste l'artefact « Documents sur mesure » : son comportement ne change pas, sauf ce
  qui est écrit ici.

## Mode « dans OP GESTION » de l'atelier (actif SEULEMENT avec `?app=1` dans SON adresse)
- Clés de rangement à part (`documents-sur-mesure-opg-…`) ; pas de documents d'exemple, pas d'accueil, pas de marque,
  pas de sélecteur Auto/Jour/Nuit (le thème vient du parent, jamais rangé), pas de reprise automatique de l'éditeur.
- Le retour de l'éditeur se lit « ‹ OP GESTION » (aria-label « Retour à OP GESTION »).
- Quand il n'y a plus rien à montrer (fenêtre, éditeur, confirmation, aperçu, signature fermés), l'atelier demande sa
  fermeture (`opd_fermer`, après ~140 ms pour laisser passer une réouverture).
- Un client choisi d'avance ne compte pas comme « avoir commencé » (pas de confirmation à l'annulation).
- L'entreprise appartient à OP GESTION : en-tête par défaut NON modifiable dans l'atelier (« Ton entreprise se règle
  dans OP GESTION. ») ; les en-têtes secondaires restent modifiables. Aucune valeur d'exemple à la place d'un champ
  légal que le parent envoie vide (forme, capital, RCS/RM, assureur, n° et zone d'assurance, BIC).
- Numéros : l'atelier suit la série d'OP GESTION (préfixe et dernier numéro reçus), plus aucun `DEV-2026-…`.

## Contrat des messages (postMessage ; réception filtrée sur `event.source` des deux côtés ; tout texte reçu est échappé, borné, revalidé)
Prototype → atelier :
- `opd_donnees` : `{ entreprise:{nom,adresse,cp,ville,tel,mail,site,siret,tva,iban,bic,rcs,forme,capital,assureur,assurNum,assurZone},
  clients:[{id,nom,pro,adresse,cp,ville,email,tel,contact?}], catalogue:[{ref,des,unite,puC,tvaBp,cat}],
  numeros:{devis:{prefixe,dernier},contrat:{prefixe,dernier}} }` — id client = clé de CLIENTS ; bornes : 500 clients,
  400 articles, textes tronqués ; id hors `[A-Za-z0-9_-]{1,40}`, nom vide, `puC` négatif / non entier / > 1e9 rejetés.
- `opd_role` : `{ role, devis:bool, contrats:bool }` (l'atelier refuse d'ouvrir sans le booléen à vrai).
- `opd_mode` : `'jour' | 'nuit'`.
- `opd_ouvrir` : `{ faire:'devis'|'contrat'|'doc', client?, id? }`.
Atelier → prototype :
- `opd_pret` : à l'ouverture de la page (le prototype répond données + rôle + mode puis la file d'attente).
  Reçu une SECONDE fois = l'atelier a redémarré : le prototype ferme la fenêtre (jamais un cadre vide sans sortie).
- `opd_docs` : `[{ id, type, nom, numero, etat:'brouillon'|'envoye'|'attente'|'signe', client, clientId, ttc, prix, maj, nr }]`
  (`nr:1` = l'appareil n'a PAS pu ranger ce document). États lus par `hasOwnProperty`, date bornée.
- `opd_client` : `{ id, nom, pro, adresse, cp, ville, email, tel }` (créé dans l'atelier ; ajouté à CLIENTS si l'id est valide et
  libre ; guillemets, chevrons, accents graves refusés dans tél. et e-mail).
- `opd_fermer` : `{ motif:'fin'|'role'|'absent' }`.

## Dans le prototype
- Devis : « Composer un devis » (bouton principal) + « Devis rapide » (l'ancien formulaire). Contrats : « Composer un
  contrat » + « Contrat rapide ». Fiche client : « Composer un devis » (principal quand le rôle le permet) + « Devis
  rapide » ; carte Contrat : « Composer un contrat » à côté du geste existant.
- Rôles : `rlPermis('devis'|'contrats')` ; le technicien ne voit rien, `#devis` tapé à la main le ramène chez lui.
- L'aide de page et la visite parlée disent ces mots-là ; la voix nomme le bouton qu'elle touche vraiment.
- Liste « Composés dans l'atelier » (numéro, client, objet, date, TTC ou prix/an, pastille d'état), toucher = rouvrir :
  - suit l'onglet de Devis (à finir = brouillon ; en attente = envoyé/attente ; acceptés = signé ; refusés = rien ; tous) ;
  - les quatre chiffres du haut de Devis (et ceux de Contrats) COMPTENT les documents composés (nombre et montants par état) ;
  - la fiche d'un client montre ses documents composés ;
  - le nom ne répète pas le client (« objet — client » → « objet » quand le suffixe est exactement le client) ;
  - premier rendu juste : copie de la liste dans le rangement de l'hôte (lecture protégée, mêmes filtres), et on ne
    redessine que si la liste a changé (sinon la liste sautait de 130 à 180 px) ;
  - « Non enregistré » sur la ligne d'un document que l'appareil n'a pas pu ranger.
- Numéros : `dvNum()` et le numéro de « Contrat rapide » tiennent compte des documents composés ; aucun doublon dans
  les deux sens (rapide → composé → rapide).
- Bouton Retour (navigateur, Android) : ouvrir l'atelier pousse UNE entrée d'historique (même adresse) ; Retour FERME
  l'atelier et laisse l'écran dessous où il était ; fermer par bouton, Échap ou `opd_fermer` consomme l'entrée poussée.
  À jouer : Clients → Devis → Composer → Retour (Devis, atelier fermé) → Retour (Clients), en comptant `history.length`.
- `#opdz[hidden]` garde sa largeur (`visibility:hidden; pointer-events:none`, PAS `display:none`) : avec `display:none`
  le cadre mesurait 0 px, l'atelier se croyait « téléphone », et la fenêtre se refermait à la première ouverture (4 fois sur 6).
- Atelier pas prêt au bout de 8 s : « L'atelier ne s'ouvre pas. » + « Réessayer » + « Fermer » ; tant qu'il n'est pas
  prêt, le focus reste sur « Fermer » (sinon Échap est morte : le focus était dans le cadre) ; fermer vide la file.
- Le focus revient au bouton d'origine APRÈS le rendu (sélecteur mémorisé, pas l'élément : le rendu le remplace).
- Encoche de l'iPhone : les barres de l'atelier ne passent pas dessous. Faire comme la fenêtre Comptabilité (`#cmpt`) ;
  `env(safe-area-inset-*)` peut valoir 0 dans un cadre : réserver l'encoche côté parent si c'est le cas.
- `href="tel:…"` et `href="mailto:…"` échappés partout dans le prototype (un assistant unique) : un e-mail saisi avec
  un guillemet injectait un attribut dans la fiche client.
- IBAN de démonstration du prototype : clé de contrôle VALIDE (`FR76 3000 6000 0112 3456 7890 189`), sinon
  l'atelier refuse d'enregistrer l'entreprise.
- Salutation des documents : « Bonjour Mme Bernard, » (le contact sans sa fonction) ; contact = société → « Bonjour, ».
- Deux onglets : l'onglet qui n'édite pas reprend la liste de l'autre (événement `storage`) ; le rangement n'écrase pas
  un document inconnu de l'onglet.
- Mode jour/nuit en direct ; raccourcis clavier du parent coupés quand la fenêtre est ouverte ; z-index 9100 (au-dessus
  de la Comptabilité 9000, sous le guide 9500).

## Autour
- `mobile/fabriquer.js` recopie `prototype-documents.html` dans la coque ; son contrôle des adresses distantes porte sur
  les quatre pages et DIT ce que la coque ne fera pas hors ligne (polices Google, export PDF par html2canvas) : un
  avertissement, pas un refus. `mobile/LISEZMOI.md` : « l'atelier range ses documents sur l'appareil seulement ».
- `tests/test-837.js` : `prototype-documents` parmi les APPLICATIONS (« Prix unitaire HT » y est juste).
- `tests/test-836.js` § 9 : `apercu/prototype-documents.html` dans les exceptions nommées (une application avec son
  propre jour et nuit, pas une page du site).

## Limites connues (à dire à Justin, pas à cacher)
- Le prototype n'enregistre rien : les documents composés vivent sur l'appareil ; un client créé dans l'atelier ne
  revient pas dans les clients du prototype après rechargement.
- « Optimiser avec l'IA » et le téléchargement du PDF ne marchent que dans l'artefact publié sur claude.ai.
- Vrai iPhone, vrai Android, vrai Windows, coque compilée : non vérifiables depuis une session.

## Preuves exigées
Sondes durables dans `scratchpad/proto-final/sondes/` (une par sujet : devis, contrat, mise en page, rôles et pont,
retour, numéros, échecs). Chacune compte sa population, rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
Mutations sur des COPIES (≥ 15), captures REGARDÉES (Mac, iPhone, jour, nuit), bancs du dépôt (verifier-syntaxe, 835,
836, 837, 1008, verif-secrets), compilation des scripts des pages d'`apercu/` (verifier-syntaxe ne les lit pas).
