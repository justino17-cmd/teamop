/* test-3292 — LES PHOTOS D'UNE INTERVENTION SE MONTRENT À MESURE QU'ELLES ARRIVENT (nuit du 5 novembre 2026, chantier performance).
   `photosResoudre` allait chercher les pièces une à une et l'écran ne se redessinait qu'APRÈS la dernière : huit photos de 265 Ko en
   mauvaise 4G (400 ms d'aller-retour, 1,6 Mbit/s) = huit tuiles vides pendant 14,96 s, alors que la première était là à 1,8 s.
   Mesuré (scratchpad/sonde-photos-reseau.js, réseau simulé à partage équitable) : première photo à l'écran 14,96 s → 3,2 s, toutes les
   photos 14,96 s → 13,1 s. Deux ouvriers (jamais plus : la bande passante se partage, la première arriverait plus tard sans que le
   total gagne) ; chaque photo se pose sur SA tuile (`data-ph-ix`) ; la fiche se redessine une fois à la fin, comme avant.
   ⛔ Le rang est revérifié AU RETOUR : une photo supprimée pendant l'attente décale les suivantes.
   Ce banc EXÉCUTE la vraie `photosResoudre` (réseau simulé : `pieceLire` retardée à la main) et lit le code des deux grilles. */
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

console.log('\n── 1. la population ──');
const PR = bloc('async function photosResoudre('), MARQ = ligne('const PH_MARQUE='), PM = ligne('function photoMarquer('), PS = ligne('function photoSrc(');
vrai('les pièces sont trouvées (sinon la tranche est vide et tout passerait)', PR.length > 400 && MARQ && PM && PS, [PR.length, !!MARQ, !!PM, !!PS]);
v('⛔ une seule définition de photosResoudre et d\'intPhotoMontrer', [SRC.split('async function photosResoudre(').length - 1, SRC.split('function intPhotoMontrer(').length - 1], [1, 1]);

console.log('\n── 2. photosResoudre, la VRAIE fonction, réseau simulé ──');
const PID = c => c.repeat(64);
function monde(retards, opts) {
  opts = opts || {};
  const ctx = { console, Promise, setTimeout, Array, String, Object, RegExp, __actifs: 0, __max: 0, __ordre: [], __pris: [] };
  ctx.pieceLire = async id => { ctx.__pris.push(id); ctx.__actifs++; ctx.__max = Math.max(ctx.__max, ctx.__actifs);
    await new Promise(r => setTimeout(r, retards[id] == null ? 20 : retards[id]));
    ctx.__actifs--; const r = (opts.reponses || {})[id]; return r === undefined ? { dataUrl: 'data:image/jpeg;base64,' + id.slice(0, 6) } : r; };
  vm.createContext(ctx);
  vm.runInContext(`${MARQ.replace('const ', 'var ')}\n${PM}\n${PS}\n${PR}\nthis.photosResoudre=photosResoudre;`, ctx);
  return ctx;
}
(async () => {
  { const ids = 'abcdef'.split('').map(PID); const liste = ids.map(i => 'piece:' + i); const vus = [];
    const M = monde({}); const n = await M.photosResoudre(liste, k => vus.push([k, liste[k].slice(0, 7)]));
    v('six pièces à aller chercher : six reçues', n, 6);
    vrai('chaque photo porte son contenu à SON rang', liste.every((x, k) => x === 'piece:' + ids[k] + ':data:image/jpeg;base64,' + ids[k].slice(0, 6)), liste.map(x => x.slice(0, 12)));
    vrai('la fonction d\'arrivée est appelée pour chacune (6 fois, six rangs distincts)', vus.length === 6 && new Set(vus.map(x => x[0])).size === 6, vus);
    vrai('⛔ jamais plus de DEUX à la fois (la bande passante se partage, un troisième ne gagnerait rien)', M.__max === 2, M.__max); }
  { const ids = 'ab'.split('').map(PID); const liste = ids.map(i => 'piece:' + i); const M = monde({ [ids[0]]: 120, [ids[1]]: 10 });
    const vus = []; await M.photosResoudre(liste, k => vus.push(k));
    v('la photo arrivée la première est montrée la première (le rang 1, plus rapide, avant le rang 0)', vus, [1, 0]); }
  { const liste = ['data:image/jpeg;base64,deja', 'piece:' + PID('c') + ':data:image/jpeg;base64,la', 'photo-locale']; const M = monde({});
    const n = await M.photosResoudre(liste, () => { throw new Error('ne doit pas être appelée'); });
    v('une photo locale ou déjà là n\'est jamais re-demandée', [n, M.__pris.length], [0, 0]); }
  { v('autre chose qu\'une liste : 0, sans erreur', [await monde({}).photosResoudre(null), await monde({}).photosResoudre('x')], [0, 0]); }
  { const ids = 'abc'.split('').map(PID); const liste = ids.map(i => 'piece:' + i);
    const M = monde({}, { reponses: { [ids[1]]: { absente: true } } });
    const n = await M.photosResoudre(liste);
    v('une pièce absente du serveur ne casse pas les autres (2 reçues sur 3)', n, 2);
    vrai('et son marqueur nu reste, pour un prochain essai', liste[1] === 'piece:' + ids[1] && liste[0].includes(':data:') && liste[2].includes(':data:'), liste.map(x => x.length)); }
  { /* une photo supprimée PENDANT l'attente décale les suivantes : l'écriture à l'ancien rang poserait le contenu d'une photo sur une autre */
    const ids = 'abcd'.split('').map(PID); const liste = ids.map(i => 'piece:' + i); const M = monde({ [ids[0]]: 60, [ids[1]]: 60, [ids[2]]: 10, [ids[3]]: 10 });
    const prom = M.photosResoudre(liste); await new Promise(r => setTimeout(r, 25)); liste.splice(0, 1);   // la première est supprimée, les autres glissent d'un rang
    const n = await prom;
    v('le contenu d\'une photo n\'est JAMAIS posé sur le marqueur d\'une autre : rien n\'est écrit, rien n\'est compté', [n, liste], [0, ['b', 'c', 'd'].map(c => 'piece:' + PID(c))]); }

  console.log('\n── 3. les tuiles et l\'écran (le code, commentaires retirés) ──');
  const IM = bloc('function intPhotoMontrer(');
  vrai('intPhotoMontrer est trouvée', IM.length > 200, IM.length);
  vrai('elle ne pose le contenu que sur la fiche encore ouverte (_curIntId) et sur SA tuile (data-ph-ix)', /window\._curIntId!==id/.test(IM) && /img\[data-ph-ix="'\+k\+'"\]/.test(IM));
  vrai('elle n\'écrit rien dans db (lecture seule : `src` d\'un élément)', !/db\.[a-zA-Z]+\s*=|save\(\)/.test(IM) && /im\.src=src/.test(IM));
  vrai('la grille des photos porte le rang de chaque tuile', /<img src="\$\{photoSrc\(ph\)\}" data-ph-ix="\$\{ix\}" onclick="photoPlein\(this,'Photo'\)"/.test(SRC));
  vrai('la grille des plans aussi', /<img src="\$\{photoSrc\(ph\)\}" data-ph-ix="\$\{ix\}" onclick="photoPlein\(this,'Plan'\)"/.test(SRC));
  const IP = bloc('function intPhotosCombler('), IL = bloc('function intPlansCombler(');
  vrai('les photos : chaque arrivée est montrée ET la fiche se redessine une fois à la fin, comme avant', /photosResoudre\(i\.photos,k=>intPhotoMontrer\('int-detail-photos',id,'photos',k\)\)\.then\(n=>\{[^}]*renderIntDetail\(id\)/.test(IP.replace(/\s+/g, ' ')));
  vrai('les plans : idem', /photosResoudre\(i\.plans,r=>intPhotoMontrer\('int-detail-plans',id,'plans',r\)\)\.then\(n=>\{[^}]*renderIntDetail\(id\)/.test(IL.replace(/\s+/g, ' ')));
  const PD = [...SRC.matchAll(/photosResoudre\(/g)].length;
  vrai('les autres appelants (PDF du rapport, dossier) attendent toujours TOUT : ils n\'ont pas de fonction d\'arrivée', /await photosResoudre\(i\.photos\)/.test(SRC) && PD >= 5, PD);
  console.log('\n════ test-3292 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})();
