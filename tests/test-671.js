/* ⛔ CE QUE CE FICHIER GARDE — les dossiers de chaque boîte, comme dans Mail.

   Justin, 13 septembre 2026, capture d'Apple Mail à l'appui : « je veux ça par boîte mail
   comme Mail d'Apple ». Sur sa capture : un compte, et sous lui Boîte de réception, Brouillons,
   Envoyés, Indésirables, Corbeille, Archives.

   ── LE FAIT QUI CHANGE TOUT : IL N'Y AVAIT RIEN À AJOUTER CÔTÉ SERVEUR ────────────────────
   `/api/monitor/mail/dossiers` renvoyait DÉJÀ, pour chaque boîte, la liste complète de ses
   dossiers IMAP avec leur chemin, leur nom et leur rôle, et DÉJÀ triés dans l'ordre de Mail
   (`server/mail.js`, `dossiersDe`). `chargerMessages()` savait DÉJÀ envoyer `&dossier=`. La
   Tour demandait tout ça et jetait la moitié de la réponse. Ce lot ne fait que lire ce qui
   arrivait déjà — aucune route touchée, aucun octet de plus sur le réseau.

   ── LES QUATRE RÈGLES QUI NE SE DÉDUISENT PAS DU CODE ─────────────────────────────────────
   1. UN SEUL COMPTEUR EST VRAI. Le serveur ne calcule les non-lus que sur INBOX (il ouvre le
      dossier trouvé par `role==='inbox'` et compte `seen:false`). Poser ce chiffre sur
      Corbeille ou Archives afficherait un nombre inventé, et un nombre inventé dans une
      console de surveillance est pire que pas de nombre.
   2. REPLIÉ PAR COMPTE. Seule la boîte OUVERTE montre ses dossiers. Trois boîtes à six
      dossiers font dix-huit lignes permanentes dans une barre qui porte déjà les filtres et
      l'annuaire — c'est exactement ce que Mail évite en repliant les comptes fermés.
   3. OUVRIR UNE BOÎTE OUVRE SA RÉCEPTION, et le dit. `mailChoisirBoite` pose le chemin réel
      de l'inbox, pas une chaîne vide : le serveur retombe bien sur INBOX tout seul, mais
      l'écran, lui, ne saurait pas quelle ligne surligner — une boîte ouverte sans dossier
      actif se lit comme une panne.
   4. LE TITRE SE TAIT SUR LA RÉCEPTION ET PARLE AILLEURS. « · Réception » sur chaque titre
      serait un mot pour rien ; mais lire la Corbeille en croyant lire son courrier, c'est
      la confusion qui coûte cher.

   ── CE QUI EST PROUVÉ AU NAVIGATEUR, PAS ICI ─────────────────────────────────────────────
   Un fichier de test lit du texte ; il ne peut pas cliquer. Les 29 contrôles fonctionnels —
   le chemin qui part vraiment au serveur, la liste qui change, le surlignage qui suit, les
   44 px tenus, les dossiers qui ne fuient pas d'une boîte à l'autre — sont dans
   `scratchpad/sonde-dossiers.js`, joués sur le VRAI `tour.html` avec un serveur bouchonné.
   Relevé du 13 septembre 2026 : 29 ✓ 0 ✗. Ce fichier-ci garde ce qui, une fois cassé, ne
   ferait rougir aucune sonde : les décisions ci-dessus. */

const fs = require('fs');
const TOUR = fs.readFileSync(__dirname + '/../tour.html', 'utf8');
const SRV  = fs.readFileSync(__dirname + '/../server/mail.js', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

function corps(src, entete) {
  const i = src.indexOf(entete);
  if (i < 0) return '';
  let j = src.indexOf('{', i), p = 0;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (c === '{') p++;
    else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); }
  }
  return '';
}

console.log('Les dossiers de chaque boîte, comme dans Mail');

// ══ 1) LE CONTRAT AVEC LE SERVEUR — on lit ce qu'il envoie, pas ce qu'on imagine ══════════
/* Si un jour le serveur renommait `chemin` ou `role`, la Tour afficherait une barre muette
   sans qu'aucune erreur ne sorte : `x.dossiers||[]` rend un tableau vide, et un tableau vide
   se dessine très bien. Ces quatre contrôles lisent les DEUX côtés du même mot. */
{
  v('le serveur envoie bien les dossiers avec chaque boîte',
    /out\.push\(\{ boite: publique\(b\), dossiers: liste, nonLus \}\)/.test(SRV), true);
  v('…et chaque dossier porte chemin, nom et rôle',
    /out\.push\(\{ chemin: item\.path, nom: NOMS\[role\] \|\| item\.name \|\| item\.path, role: role \}\)/.test(SRV), true);
  v('⛔ le compteur de non-lus est calculé sur la SEULE inbox — c’est ce qui interdit de l’afficher ailleurs',
    /const inbox = \(liste\.find\(x => x\.role === 'inbox'\) \|\| \{\}\)\.chemin \|\| 'INBOX'/.test(SRV), true);
  v('le serveur trie déjà dans l’ordre de Mail',
    /const ordre = \['inbox', 'envoyes', 'brouillons', 'archives', 'indesirables', 'corbeille'\]/.test(SRV), true);
  /* La Tour lit `chemin` et `role` : les mêmes mots, ou rien ne s'affiche. */
  const d = corps(TOUR, 'function mailDossiersDe(');
  v('la Tour va chercher les dossiers sur la bonne boîte', /if\(b\.id===id\) return t\[i\]\.dossiers\|\|\[\];/.test(d), true);
  const ci = corps(TOUR, 'function mailCheminInbox(');
  v('…et retrouve la réception par son RÔLE, pas par son nom',
    /if\(d\[i\]\.role==='inbox'\) return d\[i\]\.chemin;/.test(ci), true);
  /* Un serveur dit « Trash », l'autre « Corbeille » : viser le nom marcherait chez l'un et
     pas chez l'autre, et personne ne saurait pourquoi. */
  v('⛔ aucun chemin de dossier écrit en dur dans la Tour',
    /['"]INBOX\.(Sent|Trash|Junk|Drafts|Archive)/.test(TOUR), false);
}

// ══ 2) LE COMPTEUR NE MENT PAS ═══════════════════════════════════════════════════════════
{
  const h = TOUR.slice(TOUR.indexOf('function mailDossiers('), TOUR.indexOf('function mailDossiers(') + 4200);
  v('la fabrique de la barre existe bien', h.length > 2000, true);
  v('⛔ le compteur ne se pose QUE sur la réception',
    /\(\(f\.role==='inbox'&&Number\(x\.nonLus\)\)\?'<span class="n">'\+Number\(x\.nonLus\)\+'<\/span>':''\)/.test(h), true);
  /* Le contre-contrôle : qu'aucune autre ligne de dossier ne porte un compteur. */
  v('…et nulle part ailleurs sur une ligne de dossier',
    (h.match(/class="dos sous[\s\S]{0,600}?<\/button>/g) || []).filter(b => /class="n"/.test(b) && !/f\.role==='inbox'/.test(b)).length, 0);
}

// ══ 3) REPLIÉ PAR COMPTE — la règle de Mail ══════════════════════════════════════════════
{
  const h = TOUR.slice(TOUR.indexOf('function mailDossiers('), TOUR.indexOf('function mailDossiers(') + 4200);
  v('⛔ une boîte fermée ne montre aucun dossier, une repliée non plus',
    /if\(!ouverte\|\|!deplie\) return r;/.test(h), true);
  v('…et « ouverte » se décide sur la boîte choisie', /ouverte=\(bSel===b\.id\)/.test(h), true);
  /* Une boîte dont l'IMAP a refusé arrive avec dossiers:[] : on ne dessine pas une liste vide
     avec un titre, on ne dessine rien. */
  v('⛔ une boîte sans dossiers ne dessine rien du tout', /if\(!dos\.length\) return r;/.test(h), true);
}

// ══ 4) OUVRIR UNE BOÎTE OUVRE SA RÉCEPTION ═══════════════════════════════════════════════
{
  const f = corps(TOUR, 'function mailChoisirBoite(');
  v('⛔ le chemin réel de l’inbox est posé, pas une chaîne vide',
    /dossier:mailCheminInbox\(id\)/.test(f), true);
  v('…et le nom affichable avec', /dosNom:'Réception'/.test(f), true);
  v('« toutes les boîtes » n’a pas de dossier', /\{boite:'toutes',dossier:'',nom:'Toutes les réceptions',role:'inbox',dosNom:''\}/.test(f), true);
  const g = corps(TOUR, 'function mailChoisirDossier(');
  v('changer de dossier est refusé en vue fusionnée — il n’y a pas UNE corbeille pour trois boîtes',
    /if\(!MSG\.sel\|\|MSG\.sel\.boite==='toutes'\) return;/.test(g), true);
  v('⛔ changer de dossier repart de zéro : ni message ouvert, ni page en cours',
    /MSG\.ouvert=null; MSG\.lu=null; MSG\.envSel=null;[\s\S]{0,40}MSG\.messages=\[\]; MSG\.total=0;/.test(g), true);
  v('…et redemande la liste au serveur', /chargerMessages\(\);/.test(g), true);
  /* C'est la ligne qui fait tout marcher : sans elle le clic ne changerait que le surlignage. */
  const c = corps(TOUR, 'function chargerMessages(');
  v('⛔ le dossier part VRAIMENT dans la requête',
    /&dossier='\+encodeURIComponent\(s\.dossier\|\|''\)/.test(c), true);
}

// ══ 5) LE TITRE SE TAIT SUR LA RÉCEPTION, ET PARLE AILLEURS ══════════════════════════════
{
  const f = corps(TOUR, 'function vueSupport(');
  v('⛔ « Réception » n’est pas répété dans le titre',
    /MSG\.sel\.dosNom!=='Réception'/.test(f), true);
  v('…mais tout autre dossier est nommé', /\+\(dNom\?\(' · '\+dNom\):''\)/.test(f), true);
  v('⛔ et l’écran dit explicitement que ce n’est pas la réception',
    /ce n’est pas la réception/.test(f), true);
  v('…avec le chemin du retour', /mailChoisirDossier\(mailCheminInbox\(mailBoiteChoisie\(\)\),..Réception..\)/.test(f), true);
}

// ══ 6) LES DEUX « ENVOYÉS » NE SE CONFONDENT PLUS ════════════════════════════════════════
/* Le dossier Envoyés de la boîte IMAP et le journal des envois TeamOP sont deux choses
   différentes, et elles se seraient retrouvées à six lignes l'une de l'autre sous le même
   nom. Le filtre a donc été renommé. */
{
  v('le filtre s’appelle « Envois TeamOP »', /\{cle:'envoyes',nom:'Envois TeamOP'/.test(TOUR), true);
  v('⛔ plus aucun filtre nommé « Envoyés » tout court', /\{cle:'envoyes',nom:'Envoyés'/.test(TOUR), false);
  v('les cinq catégories sont toujours là', (TOUR.match(/\{cle:'(tout|traiter|marques|pieces|envoyes)'/g) || []).length, 5);
}

// ══ 7) UNE ICÔNE PAR RÔLE, ET UN REPLI ═══════════════════════════════════════════════════
{
  v('les six rôles ont leur icône',
    /var MAIL_DOS_ICO=\{inbox:'📥',brouillons:'📝',envoyes:'📨',indesirables:'🚫',corbeille:'🗑️',archives:'📦'\}/.test(TOUR), true);
  /* Un dossier maison (« Chantiers 2026 ») a un rôle vide : sans repli, la ligne n'aurait
     aucune icône et se lirait comme un défaut d'affichage. */
  v('⛔ un dossier maison retombe sur une icône générique', /MAIL_DOS_ICO\[f\.role\]\|\|'📁'/.test(TOUR), true);
  v('…et sur son nom serveur si le nom manque', /esc\(f\.nom\|\|f\.chemin\)/.test(TOUR), true);
}

// ══ 8) LE PLANCHER TACTILE, TENU DANS LE CSS ═════════════════════════════════════════════
/* Mesuré à 44 px au navigateur (sonde-dossiers.js). Ce qui le tient, c'est cette règle :
   une ligne de dossier est plus petite en texte, jamais en surface touchable. */
{
  v('⛔ une ligne de dossier garde les 44 px', /\.dos\.sous\{[^}]*min-height:44px/.test(TOUR), true);
  v('…tout en étant visiblement subordonnée', /\.dos\.sous\{margin-left:12px/.test(TOUR), true);
  v('le nom d’un dossier long se replie au lieu d’être coupé',
    /\.dos-n\{flex:1;min-width:0;overflow:hidden;overflow-wrap:break-word/.test(TOUR), true);
}


// ══ 9) LE REPLI AU RECLIC — ET CE QU'IL NE DOIT SURTOUT PAS FAIRE ════════════════════════
/* Justin, 13 septembre 2026 : « je clique elle se déroule, je reclique elle se replie ».
   C'est le comportement des comptes dans Mail, et il tient en un booléen.

   ⛔ LE PIÈGE, ET C'EST TOUT L'OBJET DE CE BLOC : `mailChoisirBoite` rechargeait la liste à
   chaque appel. Laissée telle quelle, la deuxième pression aurait replié l'affichage ET
   relancé un aller-retour réseau, en repartant de la Réception — donc en perdant le dossier
   qu'on avait ouvert, pour un geste qui ne demandait qu'à ranger la barre. Replier est un
   geste d'AFFICHAGE : il bascule un drapeau et redessine, rien d'autre.
   Mesuré à la sonde (`scratchpad/sonde-repli.js`, 16 ✓ 0 ✗) : le compteur d'appels à
   /mail/liste ne bouge pas d'un pli à l'autre, et remonte bien quand on change de boîte. */
{
  const f = corps(TOUR, 'function mailChoisirBoite(');
  v('⛔ le reclic sur la boîte ouverte replie, il ne rechoisit pas',
    /if\(id && id===mailBoiteChoisie\(\)\) return mailReplier\(\);/.test(f), true);
  v('…et ce test passe AVANT toute écriture d’état',
    f.indexOf('mailReplier()') < f.indexOf('MSG.sel ='), true);
  v('choisir une AUTRE boîte la rouvre déroulée', /MSG\.deplie=true;/.test(f), true);

  const r = corps(TOUR, 'function mailReplier(');
  v('la bascule existe', r.length > 40, true);
  v('⛔ elle ne fait QUE basculer et redessiner — aucun appel serveur',
    /chargerMessages|apiGet|chargerMail/.test(r), false);
  v('…elle ne touche pas au dossier ouvert', /MSG\.sel/.test(r), false);
  v('…ni au message ouvert', /MSG\.ouvert/.test(r), false);
  v('elle redessine bien la barre', /renderNav\('fondu'\)/.test(r), true);

  /* Un pli que rien n'annonce ne se découvre pas. Le chevron le dit, sa rotation dit l'état. */
  const h = TOUR.slice(TOUR.indexOf('function mailDossiers('), TOUR.indexOf('function mailDossiers(') + 4600);
  v('⛔ le chevron n’apparaît que s’il y a quelque chose à replier',
    /ouverte&&dos0\.length/.test(h), true);
  v('…et il tourne selon l’état', /class="dos-chev'\+\(deplie\?' bas':''\)/.test(h), true);
  v('la rotation est écrite en CSS, pas deux glyphes différents',
    /\.dos-chev\.bas\{ transform:rotate\(90deg\) \}/.test(TOUR), true);
  v('⛔ et elle se tait sous prefers-reduced-motion',
    /@media\(prefers-reduced-motion:reduce\)\{ \.dos-chev\{ transition:none \} \}/.test(TOUR), true);
}

// ══ 10) LES ENVOIS SE NOMMENT EUX-MÊMES ══════════════════════════════════════════════════
/* Conséquence directe du déménagement : « Envois TeamOP » s'ouvre maintenant alors qu'une
   boîte est sélectionnée, et l'écran titrait « Courrier · support@teamop.fr » au-dessus d'une
   liste qui vient du SMTP de TeamOP, pas de support@. Relevé à la sonde avant correction. */
{
  const f = corps(TOUR, 'function vueSupport(');
  v('⛔ la vue des envois porte son propre titre', /envVue\?'Courrier · Envois TeamOP'/.test(f), true);
  v('…et dit qu’elle n’est pas le dossier « Envoyés » d’une boîte',
    /pas le dossier « Envoyés » d’une boîte reliée/.test(f), true);
  v('…avec le chemin du retour', /Revenir aux messages reçus/.test(f), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
