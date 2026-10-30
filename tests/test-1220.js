/* ══ 1220 · LES CHIFFRES AFFICHÉS : STATISTIQUES, ARCHIVES, TEMPS POINTÉ, VÉHICULE LIÉ ═══════════════════
   Campagne de test du 16 octobre 2026 (lot g17). Quatre défauts, un point commun : un chiffre ou un champ
   affiché qui ne dit pas ce que dit l'écran d'à côté.

   · accueil#8  — « Devis émis », « Taux d'acceptation » et « Top clients (CA facturé) » comptaient les
     BROUILLONS (un devis jamais envoyé n'est pas « émis », une facture En attente n'est pas « facturée »).
     L'écran Factures (« Total facturé ») les écarte déjà : UNE définition, `docEmis`. Archives aussi.
   · equipe#2   — « Temps pointé » de la fiche technicien et des Archives calculait minutes(debut,fin) en
     HH:MM : une nuit (22:00 → 06:00) ou un pointage ouvert comptaient 0. L'écran Pointage lit `ptSecs`
     (debutTs/finTs). Les trois écrans doivent donner le même total.
   · equipe#4   — la fiche technicien cherchait `v.techId` et `veh.immat` ; le formulaire du véhicule écrit
     `conducteurTechnicienId` et `plaque`. Même cause dans la recherche du journal (`x.immat`).
   · technicien#12 — Archives montrait CA encaissé / facturé et les pointages de TOUS à qui n'a pas le droit
     comptabilité, là où Statistiques refuse. Même droit (`isFinanceMgr`), sur ce qu'on voit.

   Ce banc EXÉCUTE les vraies fonctions d'app.html (views.statistiques, archStats, views.archives,
   printArchive, ficheTech, journalGo) dans un bac à sable ; ptSecs, ptTotal, minutes, dureeStr, docTot sont les
   vraies aussi.                                                                                           */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1220 · 0. la population ──');
const PIECES = {
  stats: bloc('views.statistiques=function(){'), archStats: bloc('function archStats(ym){'), archives: bloc('views.archives=function(){'),
  print: bloc('function printArchive(){'), fiche: bloc('function ficheTech(id){'), journal: bloc('function journalGo(id){'),
  ptSecs: bloc('function ptSecs(p,now){'), ptOuvert: ligne('function ptOuvert(p)'), ptTotal: ligne('function ptTotal(list,now)'),
  minutes: ligne('function minutes(deb,fin)'), vehAuto: ligne('function vehiculeAuto(v,u)'), note: ligne('const DOCS_EMIS_TXT=') + '\n' + ligne('function docsEmisNote('),   /* i02 : la note est une fabrique (elle passe par t() au rendu), plus une constante */ dureeStr: ligne('function dureeStr(min)'), docTot: ligne('function docTot(d)'),
  ymOf: ligne('function ymOf(iso)'), isFin: ligne('function isFinanceMgr()'), norm: ligne('const norm ='), vPlaque: ligne('const vPlaque='), vehName: ligne('const vehName ='),
  statDeg: ligne('const STAT_RANGS=') + '\n' + ligne('function statDegrade(') + '\n' + ligne('const INT_STCOLOR =')
};
v('toutes les pièces sont trouvées (une tranche vide passerait au vert sur tout)', Object.entries(PIECES).filter(([, s]) => s.length < 20).map(([k]) => k), []);
v('⛔ une seule définition de chaque fonction extraite',
  ['function archStats(', 'function ficheTech(', 'function journalGo(', 'function printArchive(', 'function ptSecs(', 'function docEmis('].map(n => SRC.split(n).length - 1), [1, 1, 1, 1, 1, 1]);

/* ── le bac à sable ───────────────────────────────────────────────────────────────────────────── */
const JOUR = new Date(); const AUJ = JOUR.toISOString().slice(0, 10), YM = AUJ.slice(0, 7);
function monde(o) {
  o = o || {};
  const out = { content: '', modal: '', toasts: [], go: [], print: '' };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Intl, out, setTimeout: () => 0, __caps: o.caps || { voirCompta: true, voirTout: true },
    db: Object.assign({ factures: [], devis: [], interventions: [], pointages: [], demandes: [], vehicules: [], techniciens: [], clients: [], boxes: [], produits: [], journal: [] }, o.db || {}),
    currentUser: { id: 'u1', role: o.role || 'admin' }, document: { getElementById: () => ({}) },
    window: { open: () => ({ document: { write: h => { out.print = h; }, close() {} }, focus() {}, print() {} }) } };
  vm.createContext(ctx);
  vm.runInContext(`
    /* v773 : ce banc joue la 3D (aucun métier réglé) — les autres métiers sont joués par test-2951 */
    function certibVisible(t){ return true; } function certibColonne(){ return true; }
    var views={}, current='archives', archMonth=null;
    function can(c){ return !!__caps[c]; }
    function setHeader(){}  var $=id=>({ set innerHTML(h){ out.content=h; }, get innerHTML(){ return out.content; } });
    function toast(m){ out.toasts.push(String(m)); } function go(v){ out.go.push(v); }
    function visibleDocs(l){ return (l||[]).filter(d=>!__caps.__docsRestreints||d.clientId!=='cHors'); } function visibleInts(l){ return (l||[]).filter(i=>!__caps.__seulementMoi||(i.techIds||[]).includes('tMoi')); } function visibleBoxes(l){ return l||[]; }
    function visibleVehicules(l){ return (l||[]).filter(v=>!__caps.__vehRestreints||!v.hors); } function visibleTechniciens(l){ return l||[]; }
    function visiblePointages(l){ return (l||[]).filter(p=>!__caps.__seulementMoi||p.techId==='tMoi'); }
    function clientName(id){ var c=(db.clients||[]).find(x=>x.id===id); return c?c.nom:''; }
    function techNames(){ return ''; } function techPuces(){ return ''; } function esc(s){ return String(s==null?'':s); }
    function badge(){ return ''; } function fmtShort(d){ return d||''; } function emptyState(i,t){ return '<p>'+t+'</p>'; } function todayISO(){ return '${AUJ}'; }
    function shiftMonth(ym){ return ym; } function eur(n){ return (Number(n)||0).toFixed(2).replace('.',',')+' €'; }
    function ligHT(ls){ return (ls||[]).reduce((s,l)=>s+(l.pu||0)*(l.q||1),0); }
    function certibBadge(){ return ''; } function canCat(){ return true; } function openModal(h){ out.modal=h; }
    function intTechIds(i){ return (i&&i.techIds)||[]; }  var STATUT_INT={}; var intTechIdsX=1;
    function openBox(){} function detailIntervention(){} function ficheClient(){} function formDoc(){}
    var prdSearch='';
    /* les écrans parlent la langue de l'appareil depuis un autre lot (t, moisEcran, fmtShortEcran) : en français, ici. */
    function t(s){ return s; } function ecranLoc(){ return 'fr-FR'; }
    ${ligne('function moisEcran(')}
    ${ligne('function fmtShortEcran(')}
    var PT_MAX_H=16;\n${PIECES.minutes}\n${PIECES.dureeStr}\n${PIECES.docTot}\n${PIECES.ymOf}\n${PIECES.isFin}\n${PIECES.norm}\n${PIECES.ptOuvert}\n${PIECES.ptSecs}\n${PIECES.ptTotal}
    ${bloc('function docEmis(')}\n${PIECES.vehAuto}\n${PIECES.note}
    ${PIECES.vPlaque}\n${PIECES.vehName}\n${PIECES.archStats}\n${PIECES.fiche}\n${PIECES.journal}\n${PIECES.print}
    ${PIECES.statDeg}\n${PIECES.stats}\n${PIECES.archives}
  `, ctx);
  ctx.vehName = vm.runInContext('vehName', ctx);   // un `const` n'est pas une propriété du contexte
  return ctx;
}
/* lit « la valeur » de la tuile qui porte ce libellé */
const kpi = (html, lbl) => { const m = html.match(new RegExp('<div class="kpi-val">([^<]*)</div><div class="kpi-lbl">' + lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</div>')); return m ? m[1] : null; };
const sans = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const L = (pu) => [{ pu, q: 1 }];

/* ═══ 1. accueil#8 — les brouillons ne sont ni « émis » ni « facturés » ═══ */
console.log('\n── 1220 · 1. Statistiques : brouillons écartés ──');
{
  const db = {
    clients: [{ id: 'cA', nom: 'Client Alpha' }, { id: 'cB', nom: 'Restaurant Le Vieux Port' }],
    devis: [{ id: 'd1', statut: 'accepte', lignes: L(100) }, { id: 'd2', statut: 'refuse', lignes: L(100) }, { id: 'd3', statut: 'brouillon', lignes: L(100) }, { id: 'd4', statut: 'brouillon', lignes: L(100) }],
    factures: [{ id: 'f1', clientId: 'cA', statut: 'payee', date: AUJ, lignes: L(200) }, { id: 'f2', clientId: 'cA', statut: 'envoyee', date: AUJ, lignes: L(100) },
      { id: 'f3', clientId: 'cB', statut: 'brouillon', date: AUJ, lignes: L(500) }]
  };
  const m = monde({ db }); m.views.statistiques(); const h = m.out.content;
  vrai('population : les tuiles sont rendues (le contrôle ne regarde pas du vide)', kpi(h, 'Devis émis') !== null && kpi(h, "Taux d'acceptation devis") !== null, h.slice(0, 200));
  v('« Devis émis » : les 2 devis sortis du brouillon (accepté + refusé) = 200 €, pas les 4 = 400 €', kpi(h, 'Devis émis'), '200,00 €');
  v('« Taux d\'acceptation » : 1 accepté sur 2 émis = 50 %, pas 1 sur 4 = 25 %', kpi(h, "Taux d'acceptation devis"), '50%');
  vrai('« Top clients (CA facturé) » : Alpha 300 €', /Client Alpha<\/div>[\s\S]{0,200}?300,00 €/.test(h));
  vrai('… et la facture brouillon de 500 € n\'y classe PAS le restaurant', !/Le Vieux Port/.test(h), sans(h).slice(-300));
  v('CA encaissé / en attente inchangés (200 € / 100 €)', [kpi(h, 'CA encaissé'), kpi(h, 'En attente de paiement')], ['200,00 €', '100,00 €']);
  vrai('les libellés existants ne bougent pas (le lot Langue les traduit tels quels)', /<h3>Top clients \(CA facturé\)<\/h3>/.test(h) && />Devis émis</.test(h));
  vrai('la règle est NOMMÉE à l\'écran, dans un élément à part', /brouillon/i.test(sans(h).replace(/Aucune facture/, '')) && /data-regle="docs-emis"/.test(h), sans(h).slice(0, 300));
  vrai('sans le droit comptabilité : rien de tout cela n\'est écrit', (() => { const s = monde({ db, caps: { voirTout: true } }); s.views.statistiques(); return !/Devis émis|Top clients|data-regle/.test(s.out.content); })());
}
{ /* aucun devis émis : pas de division par zéro */
  const m = monde({ db: { devis: [{ id: 'd3', statut: 'brouillon', lignes: L(100) }] } }); m.views.statistiques();
  v('un seul devis, brouillon : 0 € émis, 0 %', [kpi(m.out.content, 'Devis émis'), kpi(m.out.content, "Taux d'acceptation devis")], ['0,00 €', '0%']);
}

/* ═══ 2. accueil#8 (archives) + technicien#12 — CA et pointages : le droit et ce qu'on voit ═══ */
console.log('\n── 1220 · 2. Archives : brouillons écartés, droit comptabilité, pointages visibles ──');
{
  const T0 = new Date(); T0.setHours(22, 0, 0, 0); const nuitDeb = T0.getTime(), nuitFin = nuitDeb + 8 * 3600e3;
  const J9 = new Date(); J9.setHours(9, 0, 0, 0);
  const db = {
    factures: [{ id: 'f1', statut: 'payee', date: AUJ, lignes: L(200) }, { id: 'f2', statut: 'envoyee', date: AUJ, lignes: L(100) }, { id: 'f3', statut: 'brouillon', date: AUJ, lignes: L(500) }],
    interventions: [{ id: 'i1', date: AUJ, titre: 'A', techIds: ['tMoi'] }, { id: 'i2', date: AUJ, titre: 'B', techIds: ['tAutre'] }],
    pointages: [{ id: 'p1', techId: 'tMoi', date: AUJ, debut: '22:00', fin: '06:00', debutTs: nuitDeb, finTs: nuitFin },
      { id: 'p2', techId: 'tMoi', date: AUJ, debut: '09:00', fin: '12:00', debutTs: J9.getTime(), finTs: J9.getTime() + 3 * 3600e3 },
      { id: 'p3', techId: 'tAutre', date: AUJ, debut: '08:00', fin: '10:00', debutTs: J9.getTime(), finTs: J9.getTime() + 2 * 3600e3 }]
  };
  const m = monde({ db }); const s = m.archStats(YM);
  v('population : 3 factures, 3 pointages du mois', [s.facts.length, s.pts.length], [3, 3]);
  v('« CA facturé » = envoyées + payées (300 €), pas le brouillon (800 €)', s.caTot, 300);
  v('« CA encaissé » = 200 €', s.caPaye, 200);
  v('⛔ « Temps pointé » : une nuit de 8 h + 3 h + 2 h = 13 h (780 min), la nuit ne vaut plus 0', s.minTot, 780);
  m.archMonth = YM; m.views.archives(); const h = m.out.content;
  v('l\'écran Archives dit 13h00', kpi(h, 'Temps pointé'), '13h00');
  vrai('… et nomme la règle (nouvel élément, libellé « CA facturé » intact)', /data-regle="docs-emis"/.test(h) && />CA facturé</.test(h));
  m.printArchive(); const pr = m.out.print;
  vrai('le PDF dit la même chose : CA facturé 300 €, temps pointé 13h00', /CA facturé <b>300,00 €<\/b>/.test(pr) && /Temps pointé <b>13h00<\/b>/.test(pr), sans(pr).slice(0, 300));

  /* le même mois pour un chef d'équipe SANS le droit comptabilité, qui ne voit que ses propres feuilles de temps */
  const c = monde({ db, caps: { voirTout: true, __seulementMoi: true } }); c.archMonth = YM; c.views.archives(); const hc = c.out.content;
  vrai('population : l\'écran du chef est rendu', kpi(hc, 'Interventions') !== null, hc.slice(0, 200));
  vrai('⛔ sans « Voir la comptabilité » : ni CA encaissé ni CA facturé, ni leur montant', !/CA encaissé|CA facturé|200,00|300,00|data-regle/.test(hc), sans(hc).slice(0, 300));
  v('… et ses interventions à lui seulement (1 sur 2)', [kpi(hc, 'Interventions'), kpi(m.out.content, 'Interventions')], ['1', '2']);
  v('… et ses pointages à lui seulement : 11h00 (la nuit + 3 h), pas ceux d\'un autre', kpi(hc, 'Temps pointé'), '11h00');
  { const sc = c.archStats(YM); v('… archStats elle-même ne porte aucun chiffre d\'argent sans le droit (écran ET PDF la partagent)', [sc.fin, sc.facts.length, sc.caPaye, sc.caTot], [false, 0, 0, 0]); }
  c.printArchive();
  vrai('… le PDF suit : pas de CA, 11h00', !/CA encaissé|CA facturé|300,00/.test(c.out.print) && /Temps pointé <b>11h00<\/b>/.test(c.out.print), sans(c.out.print).slice(0, 300));
  const f = monde({ db, caps: { voirTout: true, voirCompta: true, __seulementMoi: true } }); f.archMonth = YM; f.views.archives();
  vrai('contre-épreuve : avec le droit comptabilité, le CA paraît', kpi(f.out.content, 'CA facturé') === '300,00 €' && kpi(f.out.content, 'CA encaissé') === '200,00 €', sans(f.out.content).slice(0, 300));
}

/* ═══ 2 bis. le PÉRIMÈTRE se lit aussi quand on a le droit comptabilité (visibleDocs / visibleVehicules) ═══
   Relecture du lot g17 : retirer `visibleDocs` d'archStats ou de Statistiques, ou `visibleVehicules` de la fiche et du
   journal, laissait le banc vert — aucun cas ne donnait le droit à un compte au périmètre restreint. */
console.log('\n── 1220 · 2 bis. Droit comptabilité + périmètre propre : ce qui est hors périmètre n\'entre pas ──');
{
  const db = {
    clients: [{ id: 'cA', nom: 'Client Alpha' }, { id: 'cHors', nom: 'Client Lointain' }],
    devis: [{ id: 'd1', clientId: 'cA', statut: 'accepte', lignes: L(100) }, { id: 'd2', clientId: 'cHors', statut: 'accepte', lignes: L(1000) }],
    factures: [{ id: 'f1', clientId: 'cA', statut: 'payee', date: AUJ, lignes: L(200) }, { id: 'f2', clientId: 'cHors', statut: 'payee', date: AUJ, lignes: L(700) }]
  };
  const caps = { voirCompta: true, voirTout: true, __docsRestreints: true };
  const m = monde({ db, caps }); const s2 = m.archStats(YM);
  v('population : 2 factures dans la base, le droit comptabilité est tenu', [db.factures.length, s2.fin], [2, true]);
  v('⛔ archStats : la facture d\'un client hors périmètre n\'entre pas (CA 200, pas 900)', [s2.facts.length, s2.caPaye, s2.caTot], [1, 200, 200]);
  const st = monde({ db, caps }); st.views.statistiques(); const hs = st.out.content;
  v('⛔ Statistiques : « Devis émis » et « CA encaissé » ne comptent que le périmètre (100 € / 200 €)', [kpi(hs, 'Devis émis'), kpi(hs, 'CA encaissé')], ['100,00 €', '200,00 €']);
  vrai('… et le classement des clients ne nomme pas le client hors périmètre', /Client Alpha/.test(hs) && !/Client Lointain/.test(hs), sans(hs).slice(-300));
}

/* ═══ 3. equipe#2 — Temps pointé de la fiche technicien = écran Pointage ═══ */
console.log('\n── 1220 · 3. Fiche technicien : Temps pointé et véhicule lié ──');
{
  const T0 = new Date(); T0.setDate(T0.getDate() - 1); T0.setHours(22, 0, 0, 0);
  const J9 = new Date(); J9.setHours(9, 0, 0, 0);
  const db = {
    techniciens: [{ id: 't1', nom: 'Sophie Martin', metier: 'Technicien' }],
    pointages: [{ id: 'p1', techId: 't1', date: AUJ, debut: '22:00', fin: '06:00', debutTs: T0.getTime(), finTs: T0.getTime() + 8 * 3600e3 },
      { id: 'p2', techId: 't1', date: AUJ, debut: '09:00', fin: '12:00', debutTs: J9.getTime(), finTs: J9.getTime() + 3 * 3600e3 }],
    vehicules: [{ id: 'v1', plaque: 'AB-123-CD', conducteurTechnicienId: 't1' }]
  };
  const m = monde({ db }); m.ficheTech('t1'); const h = m.out.modal;
  vrai('population : la fiche est rendue', /Sophie Martin/.test(h) && kpi(h, 'Temps pointé') !== null, h.slice(0, 200));
  v('⛔ Temps pointé = 11h00 comme l\'écran Pointage (nuit comprise), pas 3h00', kpi(h, 'Temps pointé'), '11h00');
  vrai('le véhicule rattaché par « Technicien lié » (conducteurTechnicienId + plaque) s\'affiche', /Véhicule<\/div><div class="dt-val">AB-123-CD</.test(h), sans(h).slice(0, 300));
  { const a = monde({ db: Object.assign({}, db, { vehicules: [{ id: 'v2', immat: 'ZZ-999-ZZ', techId: 't1' }] }) }); a.ficheTech('t1');
    vrai('l\'ancien nom de champ (techId + immat) se lit toujours — rien ne disparaît chez qui l\'a', /Véhicule<\/div><div class="dt-val">ZZ-999-ZZ</.test(a.out.modal)); }
  { const a = monde({ db: Object.assign({}, db, { vehicules: [{ id: 'v3', plaque: 'XX-111-XX', conducteurTechnicienId: 'tAutre' }] }) }); a.ficheTech('t1');
    vrai('un véhicule d\'un autre technicien ne s\'affiche pas', /Véhicule<\/div><div class="dt-val">—</.test(a.out.modal)); }
  { /* un pointage ouvert compte jusqu'à maintenant (plafonné), il ne vaut plus 0 */
    const a = monde({ db: Object.assign({}, db, { pointages: [{ id: 'po', techId: 't1', date: AUJ, debut: '08:00', fin: '', debutTs: Date.now() - 2 * 3600e3 - 30e3 }] }) }); a.ficheTech('t1');
    v('un pointage ouvert depuis 2 h compte 2h00', kpi(a.out.modal, 'Temps pointé'), '2h00'); }
  { /* une pause se retranche */
    const a = monde({ db: Object.assign({}, db, { pointages: [{ id: 'pp', techId: 't1', date: AUJ, debut: '09:00', fin: '12:00', debutTs: J9.getTime(), finTs: J9.getTime() + 3 * 3600e3, pause: 30 }] }) }); a.ficheTech('t1');
    v('une pause de 30 min : 2h30', kpi(a.out.modal, 'Temps pointé'), '2h30'); }
  { /* saisie à la main, sans horodatage : on retombe sur HH:MM */
    const a = monde({ db: Object.assign({}, db, { pointages: [{ id: 'pm', techId: 't1', date: AUJ, debut: '09:00', fin: '12:00' }] }) }); a.ficheTech('t1');
    v('une saisie à la main (HH:MM seulement) compte toujours : 3h00', kpi(a.out.modal, 'Temps pointé'), '3h00'); }
}

/* ═══ 3 bis. equipe#4 — un véhicule hors périmètre ne se montre pas, même rattaché au technicien ═══ */
console.log('\n── 1220 · 3 bis. Véhicule hors périmètre ──');
{
  const db = { techniciens: [{ id: 't1', nom: 'Sophie Martin' }], vehicules: [{ id: 'v9', plaque: 'HH-000-HH', conducteurTechnicienId: 't1', hors: true }] };
  const a = monde({ db, caps: { voirTout: true, __vehRestreints: true } }); a.ficheTech('t1');
  vrai('⛔ le véhicule rattaché mais hors périmètre n\'est pas écrit sur la fiche', /Véhicule<\/div><div class="dt-val">—</.test(a.out.modal) && !/HH-000-HH/.test(a.out.modal), sans(a.out.modal).slice(0, 300));
  const b = monde({ db, caps: { voirTout: true } }); b.ficheTech('t1');
  vrai('contre-épreuve : le même véhicule, sans restriction de périmètre, s\'affiche', /HH-000-HH/.test(b.out.modal));
}

/* ═══ 4. equipe#4 — la recherche du journal retrouve le véhicule par sa plaque ═══ */
console.log('\n── 1220 · 4. Journal : retrouver le véhicule par sa plaque ──');
{
  const j = [{ id: 'j1', action: 'Plein effectué', detail: 'Véhicule AB-123-CD : plein de gazole', type: 'admin' }];
  const m = monde({ db: { journal: j, vehicules: [{ id: 'v1', plaque: 'AB-123-CD', marque: 'Renault' }] } }); m.journalGo('j1');
  v('⛔ l\'évènement nommant la plaque mène à Véhicules', m.out.go, ['vehicules']);
  const a = monde({ db: { journal: j, vehicules: [{ id: 'v1', immat: 'AB-123-CD' }] } }); a.journalGo('j1');
  v('… l\'ancien champ `immat` mène toujours à Véhicules', a.out.go, ['vehicules']);
  const b = monde({ db: { journal: j, vehicules: [{ id: 'v1', plaque: 'ZZ-000-ZZ' }] } }); b.journalGo('j1');
  { const j2 = [{ id: 'j1', action: 'Plein effectué', detail: 'Véhicule HH-000-HH : plein', type: 'admin' }];
    const c = monde({ db: { journal: j2, vehicules: [{ id: 'v9', plaque: 'HH-000-HH', hors: true }] }, caps: { voirTout: true, __vehRestreints: true } }); c.journalGo('j1');
    vrai('⛔ … un véhicule hors périmètre n\'est pas retrouvé par sa plaque', c.out.go[0] !== 'vehicules', c.out.go); }
  vrai('… une autre plaque ne mène pas là (le repli est le type de l\'évènement, ou rien)', b.out.go[0] !== 'vehicules', b.out);
}

/* ═══ 4 bis. equipe#4 — vehName (Mouvements, remises, rapports) lit la plaque comme tout le reste ═══ */
console.log('\n── 1220 · 4 bis. vehName : la plaque du formulaire ──');
{
  const m = monde({ db: { vehicules: [{ id: 'a', plaque: 'AB-123-CD' }, { id: 'b', immat: 'ZZ-999-ZZ' }, { id: 'c', plaque: 'NEW-1', immat: 'OLD-1' }, { id: 'd', nom: 'Camion atelier' }, { id: 'e' }] } });
  v('⛔ vehName : `plaque` (le champ du formulaire), pas « Véhicule »', m.vehName('a'), 'AB-123-CD');
  v('… `immat` (ancien nom) toujours lu', m.vehName('b'), 'ZZ-999-ZZ');
  v('… les deux : la plaque du formulaire gagne, comme vPlaque', m.vehName('c'), 'NEW-1');
  v('… sans plaque : le nom, puis « Véhicule »', [m.vehName('d'), m.vehName('e')], ['Camion atelier', 'Véhicule']);
  v('… identifiant inconnu : « — »', m.vehName('zz'), '—');
}

/* ═══ 5. les définitions ne doivent pas diverger ═══ */
console.log('\n── 1220 · 5. une seule définition de « émis » ──');
{
  const f = bloc('views.factures=function(){');
  vrai('l\'écran Factures (« Total facturé ») écarte les brouillons — la définition que les deux autres écrans rejoignent', /const emis=all\.filter\(f=>f\.statut!=='brouillon'\)/.test(f) || /docEmis/.test(f), f.slice(0, 200));
}

console.log('\n════ test-1220 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
