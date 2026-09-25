/* ══ v750 — LE JOURNAL NE FAIT PLUS GROSSIR LE DOCUMENT DE L'ÉQUIPE, ET UN APPAREIL PLEIN LE DIT ═══════
   Deux risques trouvés par la revue « base lourde » du 25 septembre 2026 au soir, le lendemain de la
   sortie de Firebase, et mesurés avec les vraies fonctions avant d'être corrigés :

   1. LES MARQUES DU JOURNAL. Le journal est plafonné à 500 ; chaque geste en chasse la ligne la plus
      ancienne, et `estampiller` posait une pierre tombale pour elle. La fusion réunit les tombes par
      le maximum sans jamais rien retirer : deux appareils, 8 000 gestes → 8 000 marques, 203 Ko dans
      le document de l'équipe, et ça montait d'une marque par geste, pour toujours
      (`scratchpad/mesure-tombes.js`, v749 contre v750 : 8 000 contre 0). Elles ne servaient à rien :
      le plafond est le même partout, une ligne chassée ici l'est aussi à la fusion.
   2. L'APPAREIL PLEIN. Quand le rangement refusait la base, `save()` affichait « réduis le
      nombre/poids des photos » (faux depuis la v702), à CHAQUE enregistrement, et la Tour n'en
      savait rien.

   Ce banc fait tourner les VRAIES fonctions d'app.html : estampiller, ombreRelever, fusionnerBases,
   razAppliquer, logEvent, save, baseRangementPlein. */
const fs = require('fs'); const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
/* Même extracteur que test-639 : la fonction ENTIÈRE, bornée à la déclaration suivante. */
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
const copie = o => JSON.parse(JSON.stringify(o));
const nbT = (d, c) => Object.keys(((d && d._tombes) || {})[c] || {}).length;

/* ── Le bac à sable d'un appareil : ses fonctions de synchro, sa base, son ombre ── */
const SYNCHRO = ['const COLLS_HORS_FUSION=', 'function collsFusion(d){', 'const COLLS_DICT=', 'function dictFusion(prio,autre){',
  'function recEmpreinte(r){', 'const stockEmpreinte=', 'const MS_MAX=', 'let _ombre={}, _ombreStock={};',
  'function ombreRelever(o,os){', 'const TOMBE_JOURS=', 'function estampiller(){', 'function msElaguer(ms,st,now){',
  'function boxFusionFine(gagnante,perdante){', 'function tombesElaguer(t,now){', 'function tombesUnion(a,b){', 'function numMaxUnion(a,b){',
  'function fusionnerBases(local,remote,prioriteLocale){', 'function baseSignature(d){', 'function syncJournaux(){', 'function sigRenvoi(d){',
  'function logEvent(action, detail, type=\'general\', cibleUserId){', 'let _razChoix={};', 'function razAppliquer(){'].map(h => decoupe(h)).join('\n');
let seq = 0;
const appareil = base => new Function('etat', `let db=etat.db; const syncEnabled=()=>true;
  let currentUser={id:'u1',nom:'Justin'}; const uid=()=>'L'+(etat.seq()).toString(36).padStart(7,'0');
  const exportData=()=>{}, toast=()=>{}, go=()=>{}, closeModal=()=>{}, syncRetraitVoulu=()=>{};
  let __saves=0; const save=()=>{ __saves++; estampiller(); }; const syncPush=()=>{};
  ${SYNCHRO}
  return { estampiller, ombreRelever, fusionnerBases, sigRenvoi, logEvent, razAppliquer,
    choix:c=>{ _razChoix=c; }, get:()=>db, set:d=>{ db=d; } };`)({ db: copie(base), seq: () => seq++ });

const T0 = 1727000000000;
/* Rangé comme le vrai : la plus RÉCENTE en tête (logEvent fait unshift puis coupe la queue). */
const journal500 = () => Array.from({ length: 500 }, (x, i) => ({ id: 'j' + String(i).padStart(4, '0'), ts: T0 + i, _m: T0 + i, type: 'x', action: 'ancien' })).reverse();

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 1. une ligne chassée du journal plein ne pose plus de marque ──');
{ const A = appareil({ journal: journal500(), clients: [{ id: 'c1', nom: 'Un client' }, { id: 'c2', nom: 'Un autre' }], _tombes: {} });
  A.ombreRelever();
  for (let i = 0; i < 40; i++) { A.logEvent('Geste ' + i, '', 'general'); A.estampiller(); }
  const d = A.get();
  /* la population d'abord : sans ligne chassée, un zéro ne prouverait rien */
  v('la population : le journal est resté à 500 lignes après 40 gestes', d.journal.length, 500);
  v('   et les 40 plus anciennes en sont bien sorties', d.journal.some(r => r.id === 'j0000' || r.id === 'j0039'), false);
  v('⛔ aucune marque de journal pour les 40 lignes chassées', nbT(d, 'journal'), 0);
  /* et la règle ne s'est pas éteinte ailleurs : une vraie suppression marque toujours */
  d.clients = d.clients.filter(c => c.id !== 'c2'); A.estampiller();
  v('⛔ une vraie suppression (un client) pose toujours sa marque', Object.keys(A.get()._tombes.clients || {}), ['c2']);
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 2. la remise à zéro du journal pose ses marques et vide chez tout le monde ──');
{ const socle = { journal: journal500(), clients: [], _tombes: {} };
  const A = appareil(socle), B = appareil(socle); A.ombreRelever(); B.ombreRelever();
  A.choix({ journal: true }); A.razAppliquer();
  const d = A.get();
  v('le journal de A ne garde que la ligne « Remise à zéro »', d.journal.map(r => r.action), ['Remise à zéro']);
  v('⛔ les 500 lignes vidées portent leur marque', nbT(d, 'journal'), 500);
  vrai('   et chaque marque couvre la ligne (date ≥ sa dernière modification)', journal500().every(r => (d._tombes.journal[r.id] || 0) >= r._m));
  /* B a toujours les 500 anciennes lignes et reçoit l'envoi de A */
  const recu = B.fusionnerBases(B.get(), copie(d), false);
  v('⛔ chez B, les 500 anciennes lignes ne reviennent pas', recu.journal.filter(r => /^j\d{4}$/.test(r.id)).length, 0);
  v('   et la ligne « Remise à zéro » arrive', recu.journal.map(r => r.action), ['Remise à zéro']);
  /* et l'envoi de B (qui fusionne avec le nuage) ne les ressuscite pas chez A */
  const renvoi = B.fusionnerBases(B.get(), copie(d), true);
  v('   dans l\'autre sens non plus (B pousse, sa copie prioritaire)', renvoi.journal.filter(r => /^j\d{4}$/.test(r.id)).length, 0);
  /* une remise à zéro SANS le journal ne marque aucune ligne */
  const C = appareil(socle); C.ombreRelever(); C.choix({ bons: true }); C.razAppliquer();
  v('une remise à zéro qui ne vide pas le journal n\'y pose aucune marque', nbT(C.get(), 'journal'), 0);
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 3. la fusion borne les marques du journal, pareil sur tous les appareils ──');
{ const A = appareil({}); const f = A.fusionnerBases;
  const marques = (pref, n, t0) => { const o = {}; for (let i = 0; i < n; i++) o[pref + String(i).padStart(5, '0')] = t0 + i; return o; };
  /* l'héritage de la v749 : des milliers de marques de journal déjà dans le document de l'équipe */
  const nuage = { journal: [], _tombes: { journal: marques('a', 3000, T0), clients: marques('c', 2000, T0) } };
  const local = { journal: [], _tombes: { journal: marques('b', 2000, T0 + 5000) } };
  const out = f(copie(local), copie(nuage), true);
  v('⛔ 5 000 marques de journal réunies → 600 gardées', nbT(out, 'journal'), 600);
  vrai('   ce sont les 600 plus RÉCENTES', Object.keys(out._tombes.journal).every(id => out._tombes.journal[id] >= T0 + 5000 + 2000 - 600));
  v('⛔ les marques d\'une vraie collection ne sont PAS bornées (2 000 clients supprimés)', nbT(out, 'clients'), 2000);
  /* une remise à zéro (500 marques neuves) passe toujours devant 3 000 marques anciennes */
  const raz = { journal: [], _tombes: { journal: marques('z', 500, T0 + 900000) } };
  const out2 = f(copie(raz), copie(nuage), true);
  vrai('⛔ les 500 marques d\'une remise à zéro survivent toutes au plafond', Object.keys(marques('z', 500, 0)).every(id => id in out2._tombes.journal));
  /* ⛔ l'ordre est TOTAL : à date égale, deux appareils gardent les MÊMES marques. tombesUnion met
     les clés du local en premier, donc sans départage l'ordre d'arrivée déciderait. */
  const egal = pref => { const o = {}; for (let i = 0; i < 700; i++) o[pref + String(i).padStart(4, '0')] = T0; return o; };
  const X = { journal: [], _tombes: { journal: egal('x') } }, Y = { journal: [], _tombes: { journal: egal('y') } };
  const chezX = Object.keys(f(copie(X), copie(Y), true)._tombes.journal).sort();
  const chezY = Object.keys(f(copie(Y), copie(X), true)._tombes.journal).sort();
  v('⛔ à date égale, les deux appareils gardent exactement les mêmes 600 marques', chezX, chezY);
  v('   (et il y en a bien 600 de chaque côté)', [chezX.length, chezY.length], [600, 600]);
  /* borner ne relance pas d'envoi : les journaux et leurs marques sortent de la décision de renvoi */
  v('borner les marques du journal ne change pas la signature de renvoi', A.sigRenvoi(out), A.sigRenvoi(Object.assign({}, out, { _tombes: Object.assign({}, out._tombes, { journal: {} }) })));
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 4. deux appareils, 1 200 gestes, un nuage hérité de la v749 ──');
{ const socle = { journal: journal500(), clients: [], _tombes: {} };
  const A = appareil(socle), B = appareil(socle); A.ombreRelever(); B.ombreRelever();
  /* le document de l'équipe porte déjà 3 000 marques de journal posées par une v749 */
  let nuage = copie(socle); nuage._tombes = { journal: {} }; for (let i = 0; i < 3000; i++) nuage._tombes.journal['vieux' + i] = T0 - 1 - i;
  const pousser = X => { X.estampiller(); const d = X.fusionnerBases(X.get(), copie(nuage), true); X.set(d); X.ombreRelever(); nuage = copie(d); };
  const recevoir = X => { const d = X.fusionnerBases(X.get(), copie(nuage), false); X.set(d); X.ombreRelever(); };
  let pire = 0;
  for (let g = 1; g <= 1200; g++) { const X = g % 2 ? A : B, Y = g % 2 ? B : A; X.logEvent('Geste ' + g, '', 'general'); pousser(X); recevoir(Y);
    pire = Math.max(pire, nbT(nuage, 'journal')); }
  v('⛔ le document de l\'équipe retombe à 600 marques de journal au plus, dès le premier envoi', pire <= 600, true);
  v('   et plus aucune n\'est ajoutée en 1 200 gestes (les 600 sont les héritées)', Object.keys(nuage._tombes.journal).every(id => /^vieux/.test(id)), true);
  v('le journal reste à 500 lignes dans le document', nuage.journal.length, 500);
  v('⛔ A et B ont convergé : le même journal, ligne pour ligne', A.get().journal.map(r => r.id), B.get().journal.map(r => r.id));
  vrai('⛔ aucune ligne chassée ne revient : ce sont les 500 gestes les plus récents', nuage.journal.every(r => /^Geste (\d+)$/.test(r.action) && +RegExp.$1 > 700));
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 5. une seule liste de journaux, et ses replis lui sont identiques ──');
{ const sansCom = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const replis = [...sansCom.matchAll(/const JOURNAUX=\(typeof syncJournaux==='function'\)\?syncJournaux\(\):(\[[^\]]*\])/g)].map(m => JSON.parse(m[1].replace(/'/g, '"')));
  v('trois lecteurs de la liste : l\'allègement, estampiller, la fusion', replis.length, 3);
  vrai('⛔ chaque repli est la liste de syncJournaux(), mot pour mot', replis.every(r => JSON.stringify(r) === JSON.stringify(['journal', 'planJournal'])));
  vrai('   et syncJournaux() rend bien cette liste', /function syncJournaux\(\)\{ return \['journal','planJournal'\]; \}/.test(sansCom));
}

/* ─────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 817 · 6. un appareil plein : la Tour le sait, l\'écran le dit juste, la base reste en mémoire ──');
const RANGE = ['function rangementMesure(){', 'let _basePleinDit=false, _basePleinRappel=0, _basePlein=false;',
  'function baseRangementPlein(e){', 'function baseRangementRetabli(){', 'function save(){'].map(h => decoupe(h)).join('\n');
const page = (synchro) => { const E = { signaux: [], toasts: [], pousses: 0, plein: true, erreur: null, horloge: 1727000000000, rangees: {} };
  const localStorage = { get length() { return Object.keys(E.rangees).length; }, key: i => Object.keys(E.rangees)[i],
    getItem: k => E.rangees[k] == null ? null : E.rangees[k],
    setItem: (k, val) => { if (E.plein) { const e = new Error(E.erreur ? E.erreur.message : 'The quota has been exceeded.'); e.name = E.erreur ? E.erreur.name : 'QuotaExceededError'; throw e; } E.rangees[k] = String(val); } };
  E.rangees['elan_gestion_v1'] = 'x'.repeat(4000); E.rangees['elanB_gestion_v1'] = 'y'.repeat(9000); E.rangees['teamop_tour'] = 'z'.repeat(500);
  const g = new Function('E', 'localStorage', `const window={ tmSignaler:(t,m)=>E.signaux.push([t,m]) };
    const Date={ now:()=>E.horloge }; const setTimeout=f=>f();
    const toast=(m)=>E.toasts.push(String(m)); const syncEnabled=()=>${synchro};
    const STORE_KEY='elan_gestion_v1'; let db={ clients:[{id:'c1',nom:'Client'}], journal:[] };
    const numPlafondRelever=()=>{}, estampiller=()=>{}, refreshBadges=()=>{}, updateBell=()=>{}, annuaireVeille=()=>{};
    const syncPush=()=>{ E.pousses++; };
    ${RANGE}
    return { save, db:()=>db };`)(E, localStorage);
  return { E, g }; };
{ const { E, g } = page(true); const avant = g.db();
  g.db().clients.push({ id: 'c2', nom: 'Saisi pendant que c\'est plein' });
  g.save();
  v('⛔ la Tour reçoit UN signal', E.signaux.length, 1);
  vrai('   il dit « plein » et que la base n\'est pas enregistrée', /Rangement de l’appareil plein : base non enregistrée sur l’appareil \(QuotaExceededError/.test(E.signaux[0] && E.signaux[0][1]));
  vrai('   avec ce qui occupe la place, par famille (sans contenu)', /occupés : .*bêta/.test(E.signaux[0] && E.signaux[0][1]) && !/yyyy|xxxx/.test(E.signaux[0][1]));
  v('⛔ l\'écran le dit une fois', E.toasts.length, 1);
  vrai('   et il dit juste : plus de place, la donnée part à l\'équipe, ne pas fermer sans réseau', /plus de place.*partent quand même à ton équipe.*ne ferme pas l’application sans réseau/.test(E.toasts[0]));
  v('⛔ plus de « photos » : elles vivent sur le serveur depuis la v702', /photo/i.test(E.toasts[0]), false);
  vrai('⛔ la base reste en mémoire, avec la saisie', g.db() === avant && g.db().clients.length === 2);
  v('   et elle part quand même à l\'équipe', E.pousses, 1);
  /* les enregistrements suivants : pas de pluie de bandeaux, pas de pluie de signaux */
  E.horloge += 60000; g.save(); E.horloge += 60000; g.save();
  v('⛔ deux enregistrements de plus en 2 minutes : ni signal ni bandeau de plus', [E.signaux.length, E.toasts.length], [1, 1]);
  v('   (et chacun est quand même envoyé)', E.pousses, 3);
  E.horloge += 5 * 60000; g.save();
  v('⛔ cinq minutes plus tard : un rappel, toujours un seul signal', [E.signaux.length, E.toasts.length], [1, 2]);
  /* la place revient */
  E.plein = false; g.save();
  v('⛔ la place revient : la base est rangée', JSON.parse(E.rangees['elan_gestion_v1']).clients.length, 2);
  vrai('   et l\'écran le dit', /enregistre de nouveau/.test(E.toasts[2]));
  g.save(); g.save();
  v('   une seule fois', E.toasts.length, 3);
  /* et si ça recommence : pas de nouveau signal (un par séance), mais le bandeau revient tout de suite */
  E.plein = true; E.horloge += 1000; g.save();
  v('   si ça recommence : le bandeau revient, la Tour a déjà été prévenue', [E.signaux.length, E.toasts.length], [1, 4]);
}
{ const { E, g } = page(true); E.erreur = { name: 'SecurityError', message: 'The operation is insecure.' }; g.save();
  vrai('un rangement REFUSÉ (pas plein) ne se dit pas « plein »', /pas pu enregistrer/.test(E.toasts[0]) && /Rangement de la base impossible/.test(E.signaux[0][1]));
}
{ const { E, g } = page(false); g.save();
  vrai('sans synchro, l\'écran ne promet pas un envoi qui n\'a pas lieu', /restent là tant que l’application est ouverte/.test(E.toasts[0]) && !/équipe/.test(E.toasts[0]));
}
{ const { E, g } = page(true); E.plein = false; g.save(); g.save();
  v('un appareil qui range normalement n\'affiche rien, ne signale rien', [E.toasts.length, E.signaux.length], [0, 0]);
}
{ const sansCom = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  v('l\'ancien bandeau n\'est plus dans le code', /réduis le nombre\/poids des photos/.test(sansCom), false);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
