/* ══ test-2450 — CONTACTS : LA FICHE, LES GROUPES, LA RECHERCHE ET LE FAVORI — les VRAIES fonctions de la page (17 octobre 2026, lot « m11 » de la revue de A à Z) ═══════════════
   Ce que ce fichier garde, contre `apercu/opmessages/index.html` (la source de Justin) : ses fonctions réelles sont extraites et EXÉCUTÉES dans un bac à sable (`vm`), de faux
   champs autour — jamais le texte d'un motif seul :
     1. contacts#3 — « Réunions à venir ensemble » (la fiche d'un contact) suit la séparation Perso / Pro de l'Agenda : une réunion rangée Pro n'est pas listée côté Perso (et
        inversement), et le compteur de la rubrique compte ce qui est LISTÉ ;
     2. groupes#6 — côté Perso (ou Pro), Contacts › Groupes ne dit pas « Tu ne fais partie d'aucun groupe » quand le groupe existe de l'AUTRE côté : « Aucun groupe Perso… »,
        et le renvoi vers l'autre côté ;
     3. contacts@3 — la recherche de Contacts ignore les espaces en double (« ben  durand » trouve « Ben Durand ») ;
     4. contacts@5 — le bouton Favori de la fiche garde SON libellé dans les deux états (l'étoile et `aria-pressed` disent l'état) ;
     5. contacts#0 / contacts#2 — le volet droit de Contacts (bureau) : ce que le texte du code garde (les gestes, eux, sont joués au navigateur par
        `tests/sonde-opmessages-contacts-volet.js`) : toute catégorie repeint la fiche, et le changement de côté remet la sélection à zéro.
   ⛔ Un motif de banc vise du CODE : les commentaires sont retirés avant de chercher. ⛔ Chaque absence est précédée de sa population. */
'use strict';
process.env.TZ = 'Europe/Paris';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(script);

/* le corps d'une déclaration, de son début à SA dernière accolade (les chaînes et les gabarits sont sautés) */
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const jusqua = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const M = {
  esc: ligne('const esc = '), vcNorm: ligne('const vcNorm = '), avIndex: ligne('const avIndex = '), statutTexte: ligne('const statutTexte = '), presenceTexte: ligne('const presenceTexte = '), prenom: ligne('const prenom = '), icone: ligne('const icone = '),
  CHEVRON: ligne('const CHEVRON = '), blob: ligne('const blob = '), avatar: jusqua('const avatar = ', "</span>'"),
  modesActifs: ligne('const modesActifs = '), coteDe: ligne('const coteDe = '), dansMode: ligne('const dansMode = '), duCote: ligne('const duCote = '),
  coteReu: ligne('const coteReu = '), sonStatutTxt: ligne('const sonStatutTxt = '),
  /* lot m09 (la saison de l'heure) : ficheCommun écrit la plage par `quandFiche`, qui lit `plageHeures` et `heureSaison` — les VRAIES, extraites comme le reste */
  heureSaison: jusqua('const heureSaison = ', '\n  };'), plageHeures: ligne('const plageHeures = '), quandFiche: ligne('const quandFiche = '),
  ficheTete: decl('function ficheTete('), ficheCommun: decl('function ficheCommun('), vcAucun: ligne('const vcAucun = '), rendreVcCategorie: decl('function rendreVcCategorie('),
};

/* ═══ le bac à sable : les vraies fonctions, de faux services ═══ */
function bac(o) {
  o = o || {};
  const etat = { mode: o.mode || 'perso', pro: o.pro !== false, conversations: o.conversations || [], vcEsp: null, vcSel: null };
  const cache = new Map(); for (const [k, d] of Object.entries(o.commun || {})) cache.set(k, { t: Date.now(), d });
  const ctx = {
    Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, Map, Set, console,
    etat, CAP: Object.assign({ modes: true, reunions: true, espaces: true, favoris: true, appels: true }, o.cap || {}),
    CONTACTS: o.contacts || [], FMT_HEURE: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    FMT_JOUR_FICHE: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), FMT_MOIS_CAL: new Intl.DateTimeFormat('fr-FR', { month: 'short' }),
    commun: { cache, enCours: new Map() },
    source: { enCommun() {}, favori() {}, choisirMode() {} },
    dansMode0: null,
  };
  vm.createContext(ctx);
  vm.runInContext(Object.values(M).join('\n') + '\nthis.F = { vcNorm, ficheTete, ficheCommun, rendreVcCategorie, presenceTexte };', ctx);
  return { F: ctx.F, ctx, etat };
}

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées dans la page');
  v('(population) chaque morceau est trouvé', Object.keys(M).filter(k => !M[k]), []);
  const B0 = bac();
  vrai('(population) le bac à sable les exécute', typeof B0.F.ficheCommun === 'function' && typeof B0.F.rendreVcCategorie === 'function' && typeof B0.F.ficheTete === 'function');

  /* ═══ 1. contacts#3 — les réunions de la fiche suivent le côté ═══ */
  console.log('\n1. « Réunions à venir ensemble » suit Perso / Pro, comme l\'Agenda');
  const maintenant = Date.now(), H = 3600000;
  const reu = (id, titre, cote) => ({ id, conv: 'c_' + id, titre, debut: maintenant + 24 * H, fin: maintenant + 25 * H, cote, prochaine: { debut: maintenant + 24 * H, fin: maintenant + 25 * H }, hote: 'p_ana', sonStatut: 'attente' });
  const dan = { id: 'p_dan', nom: 'Dan Roux', initiales: 'DR', avatar: 2, enLigne: false };
  const communDe = reunions => ({ reunions, groupes: [], espaces: [] });
  {
    const duo = [reu('r1', 'Point chantier', 'pro'), reu('r2', 'Dentiste Dan', 'perso')];
    const titres = h => Array.from(h.matchAll(/fc-titre">([^<]*)</g)).map(m => m[1]);
    const perso = bac({ mode: 'perso', commun: { p_dan: communDe(duo) } }).F.ficheCommun(dan);
    vrai('(population) côté Perso, la réunion rangée Perso est listée', titres(perso).includes('Dentiste Dan'));
    v('⛔ côté Perso, la réunion rangée PRO n\'est pas listée (l\'Agenda Perso ne la montre pas)', titres(perso).filter(t => t === 'Point chantier'), []);
    v('…et le compteur de la rubrique compte ce qui est listé (1), pas ce que le service a rendu (2)', (/Réunions à venir ensemble<\/span><span>(\d+)</.exec(perso) || [])[1], '1');
    const pro = bac({ mode: 'pro', commun: { p_dan: communDe(duo) } }).F.ficheCommun(dan);
    vrai('(population) côté Pro, la réunion rangée Pro est listée', titres(pro).includes('Point chantier'));
    v('⛔ côté Pro, la réunion rangée PERSO n\'est pas listée', titres(pro).filter(t => t === 'Dentiste Dan'), []);
    const seul = bac({ mode: 'perso', commun: { p_dan: communDe([reu('r1', 'Point chantier', 'pro')]) } }).F.ficheCommun(dan);
    vrai('sans aucune réunion de ce côté, la rubrique s\'appelle « Réunions » et ne propose que d\'en programmer une (pas de compteur)', /<span>Réunions<\/span><\/div>/.test(seul) && !/Réunions à venir ensemble/.test(seul) && !/Point chantier/.test(seul));
    const sansModes = bac({ mode: 'perso', pro: false, commun: { p_dan: communDe(duo) } }).F.ficheCommun(dan);
    v('⛔ sans les deux côtés (un compte sans Pro), la fiche liste TOUTES les réunions : rien n\'est rangé', titres(sansModes).filter(t => t === 'Point chantier' || t === 'Dentiste Dan').sort(), ['Dentiste Dan', 'Point chantier']);
  }

  /* ═══ 2. groupes#6 — « Aucun groupe Perso » ═══ */
  console.log('\n2. Contacts › Groupes dit la vérité côté Perso et côté Pro');
  {
    const g = (id, nom, cote) => ({ id, type: 'groupe', nom, cote, initiales: nom.slice(0, 2), avatar: 1 });
    const pro = [g('c_g1', 'Chantier Nord', 'pro')];
    const perso = bac({ mode: 'perso', conversations: pro }).F.rendreVcCategorie('groupes', '', '');
    vrai('(population) « Nouveau groupe » est proposé', /Nouveau groupe/.test(perso));
    vrai('⛔ côté Perso, le groupe rangé Pro n\'est pas listé', !/Chantier Nord/.test(perso));
    vrai('⛔ côté Perso, on ne dit plus « Tu ne fais partie d\'aucun groupe » : le groupe EXISTE, de l\'autre côté', !/Tu ne fais partie d.aucun groupe/.test(perso));
    vrai('…la phrase nomme le côté (« Aucun groupe Perso ») et renvoie vers Pro', /Aucun groupe Perso/.test(perso) && /Pro/.test(perso.replace(/Aucun groupe Perso/, '')));
    const rien = bac({ mode: 'perso', conversations: [] }).F.rendreVcCategorie('groupes', '', '');
    vrai('sans aucun groupe nulle part, la phrase reste « aucun groupe » (rien à renvoyer)', /Aucun groupe Perso/.test(rien) && !/côté Pro/.test(rien));
    const surPro = bac({ mode: 'pro', conversations: [g('c_g2', 'Famille', 'perso')] }).F.rendreVcCategorie('groupes', '', '');
    vrai('côté Pro, un groupe Perso donne la même phrase de l\'autre côté (« Aucun groupe Pro », renvoi vers Perso)', /Aucun groupe Pro/.test(surPro) && /Perso/.test(surPro.replace(/Aucun groupe Pro/, '')));
    const sansModes = bac({ mode: 'perso', pro: false, conversations: [] }).F.rendreVcCategorie('groupes', '', '');
    vrai('un compte sans les deux côtés garde la phrase d\'avant (« Tu ne fais partie d\'aucun groupe pour l\'instant. »)', /Tu ne fais partie d.aucun groupe pour l.instant/.test(sansModes));
  }

  /* ═══ 3. contacts@3 — les espaces en double ═══ */
  console.log('\n3. La recherche de Contacts ignore les espaces en double');
  {
    const F = bac().F;
    v('« ben  durand » (deux espaces) se normalise comme « ben durand »', F.vcNorm('ben  durand'), F.vcNorm('ben durand'));
    vrai('…et trouve « Ben Durand »', F.vcNorm('Ben Durand').includes(F.vcNorm('ben  durand')));
    v('une tabulation ou une espace insécable comptent comme une espace', F.vcNorm('ben\t durand'), 'ben durand');
    v('les accents et la casse restent ignorés (« Élodie » → « elodie »)', F.vcNorm('Élodie'), 'elodie');
  }

  /* ═══ 4. contacts@5 — le libellé du bouton Favori ═══ */
  console.log('\n4. Le bouton Favori garde son libellé');
  {
    const ben = { id: 'p_ben', nom: 'Ben Durand', initiales: 'BD', avatar: 3 };
    const dire = (favori) => { const h = bac({ contacts: [Object.assign({}, ben, { favori })] }).F.ficheTete(Object.assign({}, ben, { favori })); const m = /data-fiche="favori"[^>]*aria-pressed="(true|false)"[^>]*>[\s\S]*?<\/span><span>([^<]*)<\/span>/.exec(h); return m ? [m[1], m[2]] : null; };
    const non = dire(false), oui = dire(true);
    vrai('(population) le bouton Favori est dans la fiche d\'un contact, dans les deux états', !!non && !!oui);
    v('pas favori : aria-pressed=false', non && non[0], 'false');
    v('favori : aria-pressed=true', oui && oui[0], 'true');
    v('⛔ le libellé est LE MÊME dans les deux états (« Favori »)', [non && non[1], oui && oui[1]], ['Favori', 'Favori']);
  }

  /* ═══ 5. contacts#0 / contacts#2 — le volet droit : ce que le code garde (les gestes sont joués au navigateur) ═══ */
  console.log('\n5. Le volet droit de Contacts (le code ; les gestes : tests/sonde-opmessages-contacts-volet.js)');
  {
    const corps = decl('function rendreVueContacts(');
    vrai('(population) rendreVueContacts est trouvée', corps.length > 500);
    const iCat = corps.indexOf("if (cat !== 'tous')");
    const bloc = iCat < 0 ? '' : corps.slice(iCat, corps.indexOf('\n', iCat));
    vrai('(population) la sortie des catégories est trouvée', bloc.length > 0);
    vrai('⛔ …et elle REPEINT la fiche avant de sortir (peindreVcFiche), comme « Tous »', /peindreVcFiche\(\)/.test(bloc));
    vrai('⛔ le changement de côté remet la sélection à zéro (la fiche d\'un contact Perso ne reste pas côté Pro)', /etat\.vcSel\s*=\s*null/.test(corps));
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
