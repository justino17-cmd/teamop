/* ══ v749 — DEUX APPAREILS OUVERTS NE SE RENVOIENT PLUS LA BASE SANS FIN ═══════════════════════
   Le soir de la sortie de Firebase (25 septembre 2026), chez ELAN : « Données de l'équipe mises à
   jour » toutes les 3,3 s sur l'écran de Justin, deux appareils ouverts, l'écran redessiné à chaque
   fois — « ça fait bug l'application ». Mesuré sur la vidéo, puis rejoué : sur une base lourde, deux
   appareils au repos faisaient 61 écritures en 30 s (`scratchpad/sonde-boucle-lourde.js`).

   La cause : la base d'ELAN dépasse le budget du nuage, donc `syncAlleger` COUPE les journaux
   d'activité de la copie poussée — c'est voulu, chaque appareil garde les siens. Mais la réception
   comparait la signature ENTIÈRE avant et après fusion : l'appareil qui recevait retrouvait ses
   lignes de journal absentes de l'envoi, et renvoyait. Coupé à nouveau, et ainsi de suite.

   Ce banc fait tourner les VRAIES fonctions d'app.html (signature, fusion, allègement) et joue le
   cycle complet : A pousse une copie allégée, B la reçoit et décide s'il renvoie. */
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

console.log('\n── 816 · la réception ne renvoie pas ce que l\'envoi coupe exprès ──');
const CODE = ['const COLLS_HORS_FUSION=', 'function collsFusion(d){', 'const COLLS_DICT=', 'function dictFusion(prio,autre){',
  'function recEmpreinte(r){', 'const stockEmpreinte=', 'const MS_MAX=', 'const TOMBE_JOURS=', 'function msElaguer(ms,st,now){',
  'function boxFusionFine(gagnante,perdante){', 'function tombesElaguer(t,now){', 'function tombesUnion(a,b){', 'function numMaxUnion(a,b){',
  'function fusionnerBases(local,remote,prioriteLocale){', 'function baseSignature(d){', 'function syncJournaux(){', 'function sigRenvoi(d){',
  'function syncAlleger(base, budget){'].map(h => decoupe(h)).join('\n');
const f = new Function(`let db={}; const syncEnabled=()=>true; const NUAGE_BUDGET=696320;
  const syncSortirPieces=b=>({copie:b});
  ${CODE}
  return { fusionnerBases, baseSignature, sigRenvoi, syncJournaux, syncAlleger };`)();

/* Une base LOURDE : 500 lignes de journal peu compressibles, comme le cas d'ELAN. */
const hasard = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(33 + ((i * 7919 + n * 31) % 90)); return s; };
const journal = Array.from({ length: 500 }, (x, i) => ({ id: 'jl' + i, ts: 1727000000000 + i * 1000, type: 't', txt: hasard(1700 + i) }));
const base = { clients: [{ id: 'cl1', nom: 'Un client', _m: 1727000000100 }], journal, _tombes: {} };
const copie = o => JSON.parse(JSON.stringify(o));

/* 1. la coupe est bien là (sinon ce banc ne regarde rien) */
const alle = f.syncAlleger(copie(base), 300000);
vrai('la population : la copie poussée a bien été COUPÉE (' + alle.copie.journal.length + ' lignes sur 500)', alle.journalCoupe > 0 && alle.copie.journal.length < 500);
v('   et syncAlleger coupe exactement la liste que la réception écarte', f.syncJournaux(), ['journal', 'planJournal']);
vrai('   la liste est lue par syncAlleger, jamais recopiée', /const JOURNAUX=syncJournaux\(\);/.test(APP));

/* 2. la réception, telle qu'elle décide : signature avant fusion / après fusion avec la base locale */
const recevoir = (local, recu, sig) => { const avant = sig(recu); const fus = f.fusionnerBases(copie(local), copie(recu), false); return sig(fus) !== avant; };
v('⛔ AVANT le correctif (signature entière) : B renverrait — la boucle', recevoir(base, alle.copie, f.baseSignature), true);
v('⛔ AVEC le correctif (sigRenvoi) : B ne renvoie pas un envoi seulement allégé de ses journaux', recevoir(base, alle.copie, f.sigRenvoi), false);

/* 3. et il renvoie toujours ce qui compte vraiment */
const local2 = copie(base); local2.clients.push({ id: 'cl-hors-ligne', nom: 'Créé hors réseau', _m: 1727000000900 });
v('   un vrai enregistrement que l\'équipe n\'a pas → B renvoie toujours', recevoir(local2, alle.copie, f.sigRenvoi), true);
const local3 = copie(base); local3._tombes = { clients: { 'cl-supprime': 1727000000950 } };
v('   une suppression (pierre tombale hors journal) que l\'équipe n\'a pas → renvoyée aussi', recevoir(local3, alle.copie, f.sigRenvoi), true);
const local4 = copie(base); local4._tombes = { journal: { jl3: 1790000000000 } };
v('   une pierre tombale de JOURNAL (le plafond de 500 en pose) ne décide pas d\'un renvoi', recevoir(local4, alle.copie, f.sigRenvoi), false);

/* 4. la réception utilise bien sigRenvoi des DEUX côtés — lu dans le code, pas dans un commentaire */
const sansCom = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
vrai('⛔ la signature d\'AVANT fusion est prise par sigRenvoi', /const _sigAvantFusion=sigRenvoi\(remote\);/.test(sansCom));
vrai('⛔ et celle d\'APRÈS aussi (deux signatures différentes ne se comparent pas)', /\|\| \(sigRenvoi\(remote\)!==_sigAvantFusion\)/.test(sansCom));
v('   plus aucune comparaison de renvoi sur la signature entière', (sansCom.match(/baseSignature\(remote\)/g) || []).length, 0);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
