/* ══ v751 — CE QUE LA VÉRIFICATION DE A À Z A TROUVÉ, ET QUI NE DOIT PAS REVENIR ═════════════════════
   Justin, 25 septembre 2026 au soir : « je veux que tu vérifies toute l'application de A à Z pour être sûr
   de notre produit à 100 % ». Quatorze familles, trente-trois agents, chaque constat rejoué par un second
   agent chargé de le réfuter : dix-sept défauts confirmés, dont ceux-ci, en PRODUCTION (v749) le jour même :

   1. `computeNotifs` : `const bx=…` écrit À LA FIN D'UN COMMENTAIRE `//`, donc jamais exécuté — « bx is not
      defined » dès qu'un arrivage attendait le DR. L'exception sortait de save() avant syncPush() : plus
      aucun geste de l'administrateur ou du DR ne partait à l'équipe ; et la connexion laissait un écran vide.
   2. « TVA (%) » sans `step` : 5,5 % et 2,1 % refusés par le navigateur, « Créer » ne faisait rien.
   3. l'écoute du document d'équipe remettait sa pause à 1 s après chaque relecture : une écoute refusée
      (429) devenait « relire le document ENTIER chaque seconde » — 657 lectures par minute mesurées.
   4. sous 429, l'envoi écrivait sans avoir relu : la base d'UN appareil remplaçait celle de l'équipe.
   5. un enregistrement tenté pendant une coupure de quelques secondes faisait RECHARGER la page au retour.
   … et les tuiles chiffrées, la recherche de Mouvements, les montants à une décimale, l'heure touchée
   dans le planning, `logJournal` qui n'a jamais existé.

   Les fonctions sont EXÉCUTÉES quand c'est possible (save, l'écoute, la reprise hors ligne, eur,
   kpiTailler) ; le reste est lu dans le code, commentaires retirés. Et une passe ESLint (`no-undef`) sur
   tout le script de la page, quand ESLint est là : c'est elle qui aurait vu `bx` et `logJournal`. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
/* Les commentaires qui COMMENCENT une ligne (règle de CLAUDE.md), et ceux de FIN de ligne `//` — c'est
   précisément dans l'un d'eux que `bx` s'était caché. Le second nettoyage épargne les URL (`https://`). */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/([^:'"`\\])\/\/[^\n'"`]*$/gm, '$1');
const bloc = (sig) => { const i = APP.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = APP.indexOf('{', i); k < APP.length; k++) { if (APP[k] === '{') d++; else if (APP[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return APP.slice(i, f); };

console.log('\n── 818 · 1. aucune variable lue sans exister (ESLint no-undef) ──');
{
  /* Les globales du NAVIGATEUR, relevées une par une (le paquet `globals` n'est pas installé) ; plus trois
     noms qui ne sont pas des défauts : `L` (Leaflet, chargé par une balise à part), `Tesseract` (chargé à la
     demande par le scanner) et `render` (appelé derrière un `typeof`). Un nom NEUF ici est un défaut — ou
     une décision à écrire dans cette liste. */
  const PERMIS = new Set(('localStorage fetch navigator window console setTimeout Blob PerformanceObserver document requestAnimationFrame ' +
    'setInterval caches location clearTimeout prompt confirm FileReader Image FormData NodeFilter MutationObserver getComputedStyle btoa atob ' +
    'crypto TextEncoder CompressionStream Response DecompressionStream TextDecoder AbortController alert indexedDB URL Notification history CSS ' +
    'Event clearInterval sessionStorage matchMedia cancelAnimationFrame performance innerHeight File innerWidth MessageChannel addEventListener ' +
    'L Tesseract render').split(/\s+/));
  let eslint = null;
  for (const p of ['/opt/node22/lib/node_modules/eslint', 'eslint']) { try { eslint = require(p); break; } catch (e) {} }
  if (!eslint || !eslint.Linter) console.log('  … SAUTÉ : ESLint absent de cette machine (la partie lue dans le code, plus bas, reste jouée)');
  else {
    const scripts = []; const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m;
    while ((m = re.exec(APP))) scripts.push(m[1]);
    const linter = new eslint.Linter({ configType: 'flat' });
    const msgs = linter.verify(scripts.join('\n;\n'), [{ languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: {} }, rules: { 'no-undef': 'error' } }]);
    const erreursAnalyse = msgs.filter(x => x.fatal);
    v('le script de la page s\'analyse (aucune erreur de syntaxe)', erreursAnalyse.map(x => x.message), []);
    const noms = [...new Set(msgs.filter(x => x.ruleId === 'no-undef').map(x => (x.message.match(/'([^']+)'/) || [])[1]))];
    vrai('la population : ESLint a bien relevé les globales du navigateur (' + noms.length + ' noms)', noms.length >= 20);
    v('⛔ aucun nom lu sans exister, hors globales du navigateur', noms.filter(n => !PERMIS.has(n)).sort(), []);
  }
}

console.log('\n── 818 · 2. la cloche : `bx` est une INSTRUCTION, pas un commentaire ──');
{ const i = NU.indexOf("b.statut==='arrivageNote'&&bonAttenteDR(b)");
  vrai('le bloc « bons réceptionnés en attente du DR » est trouvé', i > 0);
  const blocArr = NU.slice(i, i + 900);
  vrai('⛔ `const bx=` y est du code, déclaré avant sa lecture', /const bx=b\.boxId\?\(db\.boxes\|\|\[\]\)\.find\(x=>x\.id===b\.boxId\):null;/.test(blocArr)
    && blocArr.indexOf('const bx=') < blocArr.indexOf('${bx?'));
  v('   plus aucun appel à `logJournal` (qui n\'a jamais existé)', (NU.match(/\blogJournal\(/g) || []).length, 0);
}

console.log('\n── 818 · 3. save() : un affichage qui jette ne coupe plus la synchro ──');
{ const code = bloc('function saveAffichageErreur(ou,e){') + '\n' + bloc('function save(){');
  const E = { pousses: 0, signaux: [], ranges: 0 };
  const f = new Function('E', `const window={ tmSignaler:(t,m)=>E.signaux.push(m) }; const STORE_KEY='k'; let db={a:1};
    const localStorage={ setItem:()=>{ E.ranges++; } };
    const numPlafondRelever=()=>{}, estampiller=()=>{}, baseRangementPlein=()=>{}, baseRangementRetabli=()=>{}, annuaireVeille=()=>{};
    const refreshBadges=()=>{}; const updateBell=()=>{ throw new ReferenceError('bx is not defined'); };
    const syncPush=()=>{ E.pousses++; };
    ${code}
    return { save };`)(E);
  let jete = null; try { f.save(); f.save(); } catch (e) { jete = e.message; }
  v('⛔ save() ne jette plus quand la cloche jette', jete, null);
  v('⛔ et la synchro part quand même, à chaque save()', E.pousses, 2);
  v('   la base est rangée', E.ranges, 2);
  v('⛔ la Tour est prévenue — une seule fois pour la même erreur', E.signaux.length, 1);
  vrai('   avec ce qui a jeté', /updateBell : bx is not defined/.test(E.signaux[0] || ''));
}

console.log('\n── 818 · 4. les champs numériques d\'un vrai formulaire acceptent leurs décimales ──');
{ vrai('⛔ « TVA (%) » : pas de 0,01 (5,5 % et 2,1 %)', /<input id="f-tva" type="number" step="0\.01" min="0" name="tva"/.test(APP));
  vrai('⛔ « Qté » d\'une ligne de devis : pas libre (1,75)', /type="number" min="0" step="any" value="\$\{l\.qte\}" title="Qté"/.test(APP));
  vrai('   surface et prix du devis bois', /<input name="surface" type="number" step="any"/.test(APP) && /<input name="prix" type="number" step="0\.01"/.test(APP));
  /* et ceux qui restent entiers le restent EXPRÈS : relus par parseInt, un 2,5 deviendrait 2 sans un mot */
  vrai('   seuil et consommation maximale restent entiers (relus par parseInt)', /data\.seuil=parseInt\(data\.seuil\)/.test(APP) && /<input name="seuil" type="number" min="0" value/.test(APP));
}

console.log('\n── 818 · 5. l\'écoute du document d\'équipe : un refus fait attendre, il ne fait pas boucler ──');
{ const morceaux = ['function docErreur(', 'async function docAppel(', 'function docRefusVu(', 'function docInstantane(', 'function docEquipe('].map(bloc);
  vrai('les fonctions de l\'adaptateur sont trouvées', morceaux.every(m => m.length > 20));
  /* Un faux réseau : /api/doc/lire répond, /api/doc/attendre refuse (429, ou panne réseau). Le temps est
     simulé : chaque attente rend la main tout de suite, mais on NOTE ce qu'elle aurait duré. */
  const jouer = (refus, n) => {
    const E = { dormis: [], lire: 0, attendre: 0 };
    const code = `let PUSH_API=''; let _jetonRefus=null; function jetonRefusEcran(){}
      function syncTeam(){ return 'ent-818'; } async function docPreuve(){ return {t:'ent-818',kh:'k'}; }
      const setTimeout=(fn,ms)=>{ if(ms!==40000&&ms!==20000&&ms!==15000) E.dormis.push(ms); setImmediate(fn); return 1; };   /* une vraie tâche : sinon la boucle ne rend jamais la main */
      const clearTimeout=()=>{};
      const fetch=async (u)=>{ if(/lire$/.test(u)){ E.lire++; return { status:200, json:async()=>({v:1,doc:{enc:'x'}}) }; }
        if(/attendre$/.test(u)){ E.attendre++; if(refus==='reseau') throw new TypeError('Failed to fetch'); return { status:${refus==='429'?429:503}, json:async()=>({motif:'quota'}) }; }
        return { status:200, json:async()=>({}) }; };
      ${morceaux.join('\n')}
      return { docEquipe };`;
    const x = new Function('E', 'refus', 'window', 'document', code)(E, refus,
      { addEventListener() {}, removeEventListener() {} }, { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
    return new Promise(res => { const d = x.docEquipe(); const stop = d.onSnapshot(() => {}, () => {});
      const tick = () => { if (E.dormis.length >= n) { stop(); res(E); } else setImmediate(tick); }; tick(); });
  };
  return Promise.all([jouer('429', 8), jouer('reseau', 7)]).then(([q, r]) => {
    vrai('la population : l\'écoute a bien été refusée et relue (' + q.attendre + ' refus, ' + q.lire + ' lectures)', q.attendre >= 5 && q.lire >= 5);
    v('⛔ sous 429, chaque nouvel essai attend au moins 30 s (plus jamais 1 s)', q.dormis.filter(ms => ms < 30000), []);
    v('⛔ panne réseau : la pause DOUBLE (1, 2, 4, 8, 16, 30, 30 s) au lieu de repartir à 1 s', r.dormis.slice(0, 7), [1000, 2000, 4000, 8000, 16000, 30000, 30000]);
    vrai('   (une lecture par essai, pas une rafale)', r.lire <= r.attendre + 1);
  }).then(suite);
}

function suite() {
console.log('\n── 818 · 6. sous 429, l\'envoi ne remplace pas le document de l\'équipe ──');
{ const i = NU.indexOf('const snap=await _fbDoc.get();');
  vrai('la relecture avant envoi est trouvée', i > 0);
  const apres = NU.slice(i, i + 9000);
  vrai('⛔ un 429 à la relecture reporte l\'envoi (30 à 45 s) et sort SANS écrire',
    /\}catch\(e\)\{\s*if\(e&&e\.statut===429\)\{ _syncTimer=setTimeout\(\(\)=>\{ try\{ syncPush\(true\); \}catch\(_e\)\{\} \},30000\+Math\.floor\(Math\.random\(\)\*15000\)\); return; \}\s*\}\s*_retraitVoulu=0;/.test(apres));
}

console.log('\n── 818 · 7. une courte coupure ne recharge plus la page ──');
{ const code = bloc('async function horsLigneReprise(manuel){');
  const jouer = (duree, pousse, risque) => {
    const E = { recharge: 0, fin: 0, pousses: 0 };
    const f = new Function('E', `let _horsLigne=true, _horsLigneDepuis=Date.now()-${duree}, _horsLignePush=${pousse}, _horsLignePushRisque=${risque}, _hlEssai=null;
      const $=()=>null; const PUSH_API=''; const fetch=async()=>({ok:true});
      const setTimeout=(fn)=>{ fn(); return 1; }; const clearTimeout=()=>{};
      const location={ reload:()=>{ E.recharge++; } }; function horsLigneFin(){ E.fin++; _horsLigne=false; }
      function syncPush(){ E.pousses++; }
      ${code}
      return horsLigneReprise;`)(E);
    return f(false).then(() => E);
  };
  Promise.all([jouer(5000, true, false), jouer(5000, false, false), jouer(5000, true, true), jouer(90000, true, false)]).then(([a, b, c, d]) => {
    v('⛔ 5 s de coupure, un save() tenté pendant : pas de rechargement, le travail repart', [a.recharge, a.fin, a.pousses], [0, 1, 1]);
    v('   5 s sans rien tenter : reprise simple', [b.recharge, b.fin, b.pousses], [0, 1, 0]);
    v('⛔ une écriture PARTIE sans réponse : on recharge (elle pourrait être périmée)', c.recharge, 1);
    v('   une longue coupure (90 s) : on recharge, comme avant', d.recharge, 1);
    vrai('⛔ les drapeaux sont posés APRÈS horsLigneDebut(), qui les remet à zéro',
      /try\{ horsLigneDebut\('écriture sans réponse'\); \}catch\(_e\)\{\} _horsLignePush=true; _horsLignePushRisque=true;/.test(NU));
    suite2();
  });
}
}

function suite2() {
console.log('\n── 818 · 8. les tuiles chiffrées, les montants, Mouvements, le planning ──');
{ /* eur() : deux décimales, toujours */
  const eurCode = 'let _NF;\n' + APP.slice(APP.indexOf('const eur = n =>'), APP.indexOf("+ ' €'; };", APP.indexOf('const eur = n =>')) + 10);
  const eur = new Function(eurCode + '\nreturn eur;')();
  const nb = s => s.replace(/[  ]/g, ' ');
  v('⛔ eur(170.7) → « 170,70 € » (comme le PDF)', nb(eur(170.7)), '170,70 €');
  v('   eur(25) → « 25,00 € »', nb(eur(25)), '25,00 €');
  v('   eur(12345.678) → « 12 345,68 € »', nb(eur(12345.678)), '12 345,68 €');
  /* kpiTailler : un COMPTE de caractères, jamais une mesure */
  const kt = new Function(bloc('function kpiTailler(racine){') + '\nreturn kpiTailler;')();
  const el = t => ({ textContent: t, poses: {}, style: { setProperty(k, x) { this._p = this._p || {}; this._p[k] = x; } } });
  const els = [el(' 1523h30 '), el('12 345,67 €'), el('4')];
  kt({ querySelectorAll: s => (s === '.kpis .kpi-val' ? els : []) });
  v('⛔ kpiTailler pose la longueur de chaque valeur', els.map(e => e.style._p && e.style._p['--kpi-n']), [7, 11, 1]);
  vrai('⛔ la taille suit la tuile ET la valeur (cqi / --kpi-n), bornée 17–40 px, et ne sort jamais',
    /\.kpis \.kpi\{container-type:inline-size;min-width:0\}/.test(APP)
    && /font-size:clamp\(17px,calc\(150cqi \/ var\(--kpi-n,5\)\),40px\)!important;[^}]*overflow-wrap:anywhere/.test(APP));
  vrai('   posée après chaque rendu d\'écran et chaque fenêtre', /try\{ kpiTailler\(\$\('content'\)\); \}catch\(_e\)\{\}/.test(NU) && /m\.scrollTop=0; kpiTailler\(m\);/.test(NU));
  vrai('⛔ la barre de Mouvements passe au-dessus du voile du menu (la recherche répond)', /\n\.mvt-bar\{position:relative;z-index:51\}/.test(APP));
  vrai('⛔ l\'heure touchée dans le planning s\'affiche (Début et Fin prévue)',
    /h\.value=heure; const a=document\.getElementById\('deb-aff'\); if\(a\) a\.textContent=heure; try\{ intFinDit\(\); \}catch\(e\)\{\}/.test(NU));
  v('   et plus aucun appel à intSyncFin (qui visait un formulaire disparu)', (NU.match(/intSyncFin\(/g) || []).length, 0);
  vrai('⛔ segInit : une seule mise en page — classes posées, TOUT lu, puis écrit',
    (() => { const s = bloc('function segInit(racine){'); const a = s.indexOf('g.classList.add(\'seg-on\')'), b = s.indexOf('segTient(o.g)'), c = s.indexOf("g.classList.toggle('seg-deborde', o.deborde)");
      return a > 0 && b > a && c > b && !/segPoser\(g,ch,false,fam\)/.test(s); })());
}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
}
