/* test-3238 — UNE 4G FAIBLE N'EST PAS UN SERVEUR EN PANNE (v787, 3 novembre 2026).
 *
 * Cinq dossiers de la Tour, tous de Toka Clim, le serveur sain pendant ce temps (uptime ininterrompu, aucune écriture ratée) :
 * « api.teamop.fr injoignable sur /api/doc/attendre | /api/doc/ecrire | /api/doc/lire | /health (Fetch is aborted) » et
 * « Synchro écriture non acquittée en 15 s alors que le réseau répond — base 265 Ko ». Deux causes, toutes deux dans app.html :
 *   1. l'écoute des nouveautés est coupée EXPRÈS (retour au premier plan, réseau revenu, arrêt) et la sentinelle comptait cette
 *      coupure comme un serveur injoignable ;
 *   2. chaque écriture renvoie la base entière (265 Ko) et l'appareil coupait l'envoi à 20 s — sur une voie montante faible, il
 *      recommençait depuis zéro sans jamais aboutir.
 * Ce banc EXÉCUTE les vraies fonctions de la page (`docDelaiEnvoi`, `docAppel`, la vraie enveloppe de `fetch` de la sentinelle). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const tranche = (debut, fin) => { const i = SRC.indexOf(debut); const j = i < 0 ? -1 : SRC.indexOf(fin, i + debut.length); return i < 0 || j < 0 ? '' : SRC.slice(i, j); };

(async () => {
  console.log('\n── 3238 · 1. l’envoi se chronomètre à sa taille ──');
  const fAppel = tranche('async function docAppel(', 'finally{ clearTimeout(to); } }') + 'finally{ clearTimeout(to); } }';
  vrai('docAppel est trouvée dans la page', fAppel.length > 200);
  const notes = [];
  const bac = { PUSH_API: 'https://api.teamop.fr', notes, AbortController, setTimeout, clearTimeout, JSON, Math,
    fetch: async (url, init) => { notes.push({ url, delai: init.signal.__opDelai, corps: init.body.length }); return { status: 200, json: async () => ({ ok: true }) }; } };
  vm.createContext(bac); vm.runInContext(fAppel + '\nfunction docDelaiEnvoi(o){ const n=[]; const f=fetch; fetch=async(u,i)=>{ n.push(i.signal.__opDelai); return {status:200,json:async()=>({})}; }; return docAppel(\'/x\',{d:\'x\'.repeat(Math.max(0,o-12))},20000).then(()=>{ fetch=f; return n[0]; }); }', bac);
  v('une petite écriture garde 20 s', await bac.docDelaiEnvoi(2 * 1024), 20000 + 2 * 120);
  v('265 Ko (la base de Toka Clim) : 52 s, plus 20 s', Math.round((await bac.docDelaiEnvoi(265 * 1024)) / 1000), 52);
  v('plafond de 90 s', await bac.docDelaiEnvoi(5 * 1024 * 1024), 90000);
  const gros = 'x'.repeat(265 * 1024);
  await bac.docAppel('/api/doc/ecrire', { t: 'a', kh: 'b', doc: gros }, 20000);
  vrai('docAppel envoie le corps une seule fois sérialisé, et note son délai sur le signal', notes[0] && notes[0].corps > 265 * 1024 && notes[0].delai >= 51000);
  await bac.docAppel('/api/doc/lire', { t: 'a', kh: 'b' }, 20000);
  v('une lecture (corps minuscule) garde le délai demandé', notes[1].delai, 20000);

  console.log('\n── 3238 · 2. la sentinelle : une coupure voulue ne remonte pas, un délai dépassé se dit « trop lent » ──');
  const blocSent = tranche('/* échecs réseau vers api.teamop.fr (hors sentinelle elle-même) */', "try{ document.addEventListener('visibilitychange'");
  vrai('l’enveloppe de fetch de la sentinelle est trouvée', blocSent.length > 500);
  const pousse = [];
  const ab = (volontaire, delai) => { const c = new AbortController(); if (volontaire) c.signal.__opVolontaire = 1; if (delai) c.signal.__opDelai = delai; return c.signal; };
  const echec = (nom, msg) => { const e = new Error(msg); e.name = nom; return e; };
  let prochain = null, t = 1_800_000_000_000;
  const fen = { fetch: () => prochain ? Promise.reject(prochain) : Promise.resolve({ status: 200 }), __tmRetour: 0 };
  const bac2 = { window: fen, navigator: { onLine: true }, Date: { now: () => t }, String, tmPush: (type, msg) => pousse.push(msg) };
  vm.createContext(bac2); vm.runInContext(blocSent, bac2);
  const appel = async (url, init, err) => { prochain = err; try { await fen.fetch(url, init); } catch (e) {} await new Promise(r => setTimeout(r, 5)); t += 15000; };
  /* v800 : un appel SANS réponse ne se signale qu'après 2 min de panne (au moins 3 échecs, aucune réponse entre-temps) —
     on joue donc chaque cas neuf fois à 15 s d'écart, et une réponse entre deux cas remet l'horloge à zéro (test-3254). */
  const panne = async (url, init, err) => { for (let k = 0; k < 9; k++) await appel(url, init, err); await appel(url, {}, null); };
  await panne('https://api.teamop.fr/api/doc/attendre', { signal: ab(true) }, echec('AbortError', 'Fetch is aborted'));
  v('l’écoute coupée EXPRÈS (retour au premier plan, arrêt) : rien ne remonte', pousse.length, 0);
  await panne('https://api.teamop.fr/api/doc/ecrire', { signal: ab(false, 52000) }, echec('AbortError', 'Fetch is aborted'));
  v('un délai dépassé se dit « ne répond plus », avec le délai, pas « injoignable »', pousse.slice(-1), ['api.teamop.fr ne répond plus à cet appareil depuis plus de 2 min — /api/doc/ecrire (pas de réponse en 52 s)']);
  await panne('https://api.teamop.fr/health', { signal: ab(false) }, echec('AbortError', 'Fetch is aborted'));
  v('un abandon sans délai noté dit « pas de réponse dans le délai »', pousse.slice(-1), ['api.teamop.fr ne répond plus à cet appareil depuis plus de 2 min — /health (pas de réponse dans le délai)']);
  await panne('https://api.teamop.fr/api/doc/lire', {}, echec('TypeError', 'Load failed'));
  v('une vraie coupure (pas un abandon) reste « injoignable »', pousse.slice(-1), ['api.teamop.fr injoignable depuis plus de 2 min sur cet appareil — /api/doc/lire (Load failed)']);
  v('… et chaque panne n’a ouvert qu’un dossier', pousse.length, 3);

  console.log('\n── 3238 · 3. les coupures voulues sont marquées, et l’alerte d’écriture dit son vrai délai ──');
  vrai('reveil marque la coupure', /const reveil=\(\)=>\{[^\n]*ctl\.signal\.__opVolontaire=1; ctl\.abort\(\)/.test(SRC));
  vrai('arreter marque la coupure', /const arreter=\(\)=>\{ actif=false; try\{ if\(ctl\)\{ ctl\.signal\.__opVolontaire=1; ctl\.abort\(\)/.test(SRC));
  vrai('l’écoute longue note son délai (40 s, plus le supplément d’une base lourde — v801)', /const dA=40000\+Math\.max\(0,\(\(typeof docDelaiLecture==='function'\)\?docDelaiLecture\(\):20000\)-20000\); try\{ c\.signal\.__opDelai=dA; \}catch\(e\)\{\} const to=setTimeout\(\(\)=>c\.abort\(\),dA\)/.test(SRC));
  vrai('le délai d’acquittement suit la taille (41 s pour 265 Ko, au plus 45 s — test-660)', /const _delai=Math\.min\(45000, 15000\+Math\.round\(\(alle\.taille\|\|0\)\/10240\)\*1000\);/.test(SRC));
  vrai('le diagnostic n’écrit plus « 15 s » en dur', !/ecriture non acquittee en 15 s/.test(SRC) && /ecriture non acquittee en '\+Math\.round\(_delai\/1000\)\+' s/.test(SRC));

  console.log('\n── 3238 · 4. v801 : la LECTURE se chronomètre à ce qu’elle ramène (Toka Clim, « premier instantané jamais reçu ») ──');
  /* On exécute les vraies fonctions, avec un rangement d'appareil simulé : la base locale est ce que la lecture ramènera. */
  const fLect = tranche('function docKoAttendus(', 'async function docAppel(');
  vrai('docKoAttendus et docDelaiLecture sont trouvées', /function docDelaiLecture\(/.test(fLect));
  let rangement = '';
  const bac3 = { STORE_KEY: 'elan_gestion_v2', localStorage: { getItem: k => k === 'elan_gestion_v2' ? rangement : null }, Math, JSON };
  vm.createContext(bac3); vm.runInContext(fLect, bac3);
  rangement = ''; v('appareil sans base : 20 s, comme avant', bac3.docDelaiLecture(), 20000);
  rangement = 'x'.repeat(265 * 1024); v('base de 265 Ko (Toka Clim) : ~65 s au lieu de 20', Math.round(bac3.docDelaiLecture() / 1000), 65);
  rangement = 'x'.repeat(2 * 1024 * 1024); v('très grosse base : plafond de 90 s', bac3.docDelaiLecture(), 90000);
  const bac4 = { STORE_KEY: 'k', localStorage: { getItem: () => { throw new Error('rangement refusé'); } }, Math, JSON };
  vm.createContext(bac4); vm.runInContext(fLect, bac4);
  v('rangement illisible : 20 s, sans jeter', bac4.docDelaiLecture(), 20000);
  vrai('lire() demande ce délai à docAppel (sous typeof : les bancs qui extraient docEquipe seule gardent 20 s)',
    /r=await docAppel\('\/api\/doc\/lire',p,\(typeof docDelaiLecture==='function'\)\?docDelaiLecture\(\):20000\)/.test(SRC));
  /* … et docAppel garde bien ce délai demandé pour une lecture : on rejoue la vraie fonction avec le délai de 265 Ko. */
  rangement = 'x'.repeat(265 * 1024);
  await bac.docAppel('/api/doc/lire', { t: 'a', kh: 'b' }, bac3.docDelaiLecture());
  v('docAppel note ce délai sur le signal d’une lecture', Math.round(notes[notes.length - 1].delai / 1000), 65);
  vrai('l’alerte du premier instantané attend la lecture entière et dit « réseau lent » sur une base lourde',
    /attente=Math\.max\(25000,lent\+10000\);/.test(SRC) && /'réseau lent : premier instantané pas encore reçu après '/.test(SRC));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
