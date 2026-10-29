/* ⛔ « VALIDATIONS DR » EST DEVENU « VALIDATION DES MOUVEMENTS » — ET LE MOT « DR » N'EST PLUS DANS LES TEXTES DU CIRCUIT.
   Justin, 23 octobre 2026 : « dans OP GESTION, Validations DR, je veux que tu le changes par Validation des
   mouvements. Le mot validation DR, je veux que tu le supprimes de partout dans OP GESTION. »

   Décision annoncée : « le DR » désigne celui qui valide dans tout le circuit des mouvements — on le retire de
   TOUS les textes que voit l'utilisateur (menu, titres, toasts, notifications, journal, PDF, aide, droits…),
   pas seulement du menu. « DR » ne reste que comme NOM DE RÔLE là où l'application ÉNUMÈRE des rôles
   (« technicien, chef d'équipe, DR… ») : la liste blanche ci-dessous les nomme un par un, avec leur raison.

   Ce que le banc recense : dans app.html ET beta.html, HORS commentaires, toute occurrence de « DR » (ou « RD »,
   sa traduction anglaise) comme MOT. Les commentaires se retirent comme le dit CLAUDE.md — seulement les blocs
   qui COMMENCENT une ligne et les « // » de début de ligne (le motif naïf avale 107 000 caractères d'app.html) —
   plus le commentaire de FIN de ligne (deux espaces ou plus avant « // »).
   Les identifiants et champs de données (validerDR, drId, boxValidDR, motDR, modifieDR, drNom, valideDr,
   bonAttenteDR, la clé de rubrique 'validations'…) ne sont pas des mots « DR » isolés : les bases des clients
   les portent, ils ne bougent pas.

   Et les traductions : la clé est le TEXTE FRANÇAIS que l'écran écrit. Un texte changé sans sa nouvelle clé
   afficherait du français dans l'interface anglaise ; une clé dont le texte n'existe plus est orpheline. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, detail) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')); } };

/* Les seuls « DR » visibles qui restent : des NOMS DE RÔLE dans une énumération de rôles. */
const LISTE_BLANCHE = [
  { ctx: 'Admins / DR / « Tout voir » seulement', n: 1, raison: 'qui voit une box : énumération de rôles' },
  { ctx: "(technicien, chef d'équipe, DR…)", n: 1, raison: 'responsable d’une box : « n’importe quel compte », trois rôles cités' },
  { ctx: 'Les administrateurs, les DR et les personnes', n: 1, raison: 'qui voit toujours toutes les box : énumération de rôles' },
  { ctx: 'Comptes sans fiche technicien (DR, commercial', n: 1, raison: 'comptes sans fiche : trois rôles cités' },
  { ctx: "juste sous le chef d\\'équipe et le DR.", n: 1, raison: 'où se coche le secteur : rôles de la création du compte' },
  { ctx: 'administrateur, DR et gestion compta', n: 2, raison: 'qui voit la comptabilité par défaut (droit « Voir / gérer la comptabilité » : fiche du droit ET écran réservé)' },
  { ctx: '(administrateur et DR par défaut)', n: 1, raison: 'qui a par défaut le droit « Valider les mouvements » : rôles' },
];

/* Les traductions dont la clé était déjà sans texte AVANT ce chantier (aucune n'a rapport avec ce chantier, leur texte n'a pas changé : ces
   libellés ne s'écrivent plus nulle part dans le code — « Historique demandes » n'est plus qu'un commentaire).
   Nommées : une clé orpheline de plus fait tomber le banc. */
const ORPHELINES_D_AVANT = ['Stock & produits', 'Demandes & commandes', 'Dashboard conso', 'Au client', 'Historique demandes'];

const sansCommentaires = (s) => s
  .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, (m) => m.replace(/[^\n]/g, ''))   // blocs qui COMMENCENT une ligne, lignes conservées
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]{2,}\/\/ .*$/gm, '');                                     // commentaire de fin de ligne

const MOT_DR = /(?<![A-Za-z0-9_À-ÿ])(DR|RD)(?![A-Za-z0-9_À-ÿ])/g;

for (const nom of ['app.html', 'beta.html']) {
  console.log('\n── ' + nom + ' ──');
  const brut = fs.readFileSync(path.join(RACINE, nom), 'utf8');
  const code = sansCommentaires(brut);
  vrai('population : le code sans commentaires est lu en entier (' + code.length + ' signes, NAV et I18N présents)',
    code.length > 3e6 && code.includes("{k:'validations'") && code.includes('const I18N={'));

  /* 1. Chaque « DR » comme mot : ou bien un rôle nommé, ou bien un défaut. */
  const contextes = [];
  code.split('\n').forEach((l, i) => { let m; MOT_DR.lastIndex = 0; while ((m = MOT_DR.exec(l))) contextes.push({ ligne: i + 1, txt: l.slice(Math.max(0, m.index - 90), m.index + 70) }); });
  const orphelins = [];
  const compte = LISTE_BLANCHE.map(() => 0);
  contextes.forEach((c) => {
    const k = LISTE_BLANCHE.findIndex((e) => c.txt.includes(e.ctx));
    if (k < 0) orphelins.push(c.ligne + ' | ' + c.txt.replace(/\s+/g, ' ')); else compte[k]++;
  });
  vrai('⛔ aucun « DR » visible hors énumération de rôles (' + contextes.length + ' occurrences lues, ' + orphelins.length + ' hors liste)', orphelins.length === 0, orphelins);
  LISTE_BLANCHE.forEach((e, k) => {
    /* la liste blanche elle-même est contrôlée : une entrée qui ne sert plus est une décision prise pour du vide */
    const occurrences = code.split(e.ctx).length - 1;
    vrai('liste blanche : « ' + e.ctx + ' » ×' + e.n + ' — ' + e.raison, occurrences === e.n && compte[k] >= e.n, { occurrences, compte: compte[k] });
  });

  /* 2. Le nouveau libellé, au menu, au titre de l'écran, dans la visite guidée ; la clé de rubrique ne bouge pas. */
  vrai("NAV : {k:'validations',…,l:'Validation des mouvements'} — la clé de rubrique reste 'validations'",
    /\{k:'validations',ic:'✅',l:'Validation des mouvements',admin:true,aside:true(?:,cache:1)?\}/.test(code));   // v780 : rubrique regroupée (cache:1), clé inchangée
  vrai("l'écran : setHeader('Validation des mouvements', …)", /setHeader\('Validation des mouvements',/.test(code));
  vrai("la visite guidée : {v:'validations',…,t:'Validation des mouvements'}", /\{v:'validations',ic:'✅',t:'Validation des mouvements',/.test(code));
  vrai("le droit « Valider les mouvements de box et les demandes » ne porte plus « (rôle DR) » et renvoie à « Validation des mouvements »",
    /\['validerDR','Valider les mouvements de box et les demandes','Voit « Validation des mouvements »/.test(code));
  vrai("plus aucun « Validations DR » ni « validation DR »", !/[Vv]alidations? DR/.test(code));

  /* 3. Les identifiants et champs de données ne bougent pas (les bases des clients les portent). */
  ['validerDR', 'drId', 'boxValidDR', 'motDR', 'modifieDR', 'drNom', 'valideDr', 'bonAttenteDR'].forEach((id) => {
    vrai('donnée / identifiant intact : ' + id, new RegExp('\\b' + id + '\\b').test(code));
  });

  /* 4. Les traductions. */
  const a = code.indexOf('const I18N={'), b = code.indexOf('function t(s){ const l=getLang()');
  vrai('population : le bloc des traductions est trouvé', a > 0 && b > a, { a, b });
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(code.slice(a, b).replace('const I18N=', 'var I18N='), ctx);
  const I = ctx.I18N;
  v('EN : « Validation des mouvements » → « Movement approval »', I.en['Validation des mouvements'], 'Movement approval');
  v('ES : « Validation des mouvements » → « Validación de movimientos »', I.es['Validation des mouvements'], 'Validación de movimientos');
  vrai("l'ancienne clé « Validations DR » n'existe plus", !('Validations DR' in I.en) && !('Validations DR' in I.es));
  vrai('aucune traduction ne contient « DR » / « RD » comme mot (clé ou valeur)',
    !['en', 'es'].some((l) => Object.entries(I[l]).some(([k, x]) => { MOT_DR.lastIndex = 0; const a1 = MOT_DR.test(k); MOT_DR.lastIndex = 0; return a1 || MOT_DR.test(x); })));
  vrai('population : EN et ES portent les mêmes clés (' + Object.keys(I.en).length + ')', Object.keys(I.en).length > 150
    && Object.keys(I.en).every((k) => k in I.es) && Object.keys(I.es).every((k) => k in I.en));

  /* aucune clé orpheline : sa chaîne française doit exister ailleurs que dans les tables elles-mêmes */
  const reste = code.slice(0, a) + code.slice(b);
  const orphCles = Object.keys(I.en).filter((k) => !(reste.includes(k) || reste.includes(k.replace(/'/g, "\\'")) || reste.includes(k.replace(/"/g, '\\"')) || reste.includes(k.replace(/&/g, '&amp;'))));
  v('⛔ aucune clé de traduction orpheline (hors les deux d’avant, nommées)', orphCles.filter((k) => !ORPHELINES_D_AVANT.includes(k)), []);
  vrai('… et la liste des orphelines d’avant ne ment pas (elles le sont toujours)', ORPHELINES_D_AVANT.every((k) => orphCles.includes(k)), orphCles);
}

/* La bêta est la génération d'app.html : les deux portent EXACTEMENT les mêmes textes visibles. */
console.log('\n── la bêta suit app.html ──');
const A = sansCommentaires(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'));
const B = sansCommentaires(fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8'));
const compteMotsDR = (s) => (s.match(MOT_DR) || []).length;
v('le même nombre de « DR » (mot) dans app.html et beta.html', compteMotsDR(B), compteMotsDR(A));

/* ══ Relecture du 23 octobre 2026 ══ */
console.log('\n── relecture : refus, badge de la rangée, nom exact du droit ──');
for (const nom of ['app.html', 'beta.html']) {
  const code = sansCommentaires(fs.readFileSync(path.join(RACINE, nom), 'utf8'));
  /* 1. ficheDemande est JOUÉE (la vraie fonction, openModal et les aides simulés) : un refus ne s'écrit pas « Validé par ». */
  const i0 = code.indexOf('function ficheDemande(id){'), i1 = code.indexOf('\nlet demLignes', i0);
  vrai(nom + ' : population : ficheDemande est trouvée (' + (i1 - i0) + ' signes)', i0 > 0 && i1 > i0 + 500);
  let html = '';
  const bac = { db: { demandes: [
      { id: 'r', num: 'DC-1', statut: 'refuse', drNom: 'Zoé Test', motifRefus: 'Trop cher', lignes: [], date: '2026-10-23' },
      { id: 'v', num: 'DC-2', statut: 'valide', drNom: 'Zoé Test', lignes: [], date: '2026-10-23' },
      { id: 'a', num: 'DC-3', statut: 'enAttente', lignes: [], date: '2026-10-23' } ] },
    openModal: (h) => { html = h; }, esc: (x) => String(x == null ? '' : x), badge: () => '', STATV: {}, boxLabel: () => '', userName: () => '', fmtShort: (x) => x,
    demProduitNom: () => '', can: () => false, libBox: (a) => a };
  vm.createContext(bac); vm.runInContext(code.slice(i0, i1), bac);
  const libelles = (id) => { html = ''; bac.ficheDemande(id); return (html.match(/<div class="dt-lbl">[^<]*<\/div>/g) || []).map((x) => x.replace(/<[^>]+>/g, '')); };
  const lr = libelles('r'), lv = libelles('v'), la = libelles('a');
  vrai(nom + ' : population : la fiche refusée porte son motif', lr.includes('Motif de refus'), lr);
  vrai(nom + ' : ⛔ une demande REFUSÉE se lit « Refusé par », jamais « Validé par »', lr.includes('Refusé par') && !lr.includes('Validé par'), lr);
  vrai(nom + ' : une demande VALIDÉE se lit « Validé par »', lv.includes('Validé par') && !lv.includes('Refusé par'), lv);
  vrai(nom + ' : une demande en attente (sans valideur) ne porte ni l’un ni l’autre', !la.includes('Validé par') && !la.includes('Refusé par'), la);
  /* 2. la rangée « Commande envoyée au fournisseur » : plus de badge qui écrase le titre (le sous-titre dit déjà l’attente). */
  const j0 = code.indexOf("'Commande envoyée au fournisseur'"), j1 = code.indexOf("</div>`; }).join('')", j0);
  vrai(nom + ' : population : la rangée de commande de la box est trouvée', j0 > 0 && j1 > j0 && j1 - j0 < 3000, { j0, j1 });
  vrai(nom + ' : ⛔ … sans badge « En attente de validation » (le sous-titre « Réception notée — en attente de validation » le dit)',
    !/st st-purple[^>]*>📦 En attente de validation/.test(code.slice(j0, j1)) && /Réception notée — en attente de validation/.test(code.slice(j0, j1)));
  /* 3. le refus cite le libellé EXACT du droit (celui de la grille des droits). */
  const droit = (code.match(/\['validerDR','(Valider les mouvements[^']+)'/) || [])[1];
  vrai(nom + ' : le droit s’appelle « Valider les mouvements de box et les demandes »', droit === 'Valider les mouvements de box et les demandes', droit);
  const refus = code.match(/toast\('Validation réservée à qui a le droit « ([^»]+) »'\)/g) || [];
  vrai(nom + ' : les deux refus (mouvement, demande) citent ce libellé exact (' + refus.length + ' lus)', refus.length === 2 && refus.every((x) => x.includes('« ' + droit + ' »') || x.includes("capTxt('" + droit + "')")), refus);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
