/* ══ SONDE — LE SURVOL NE RESTE PLUS COLLÉ AU DOIGT, ET LA SOURIS GARDE LE SIEN ═══════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 10). Sur un iPhone, :hover se déclenche à l'appui et reste collé jusqu'au
   toucher suivant. Ici, sur TOUTES les rubriques : au téléphone, le média déclaré comme sur un iPhone (hover:none,
   pointer:coarse), on FORCE le survol commande par commande (CSS.forcePseudoState) et on compare ce qu'elle montre au
   repos ; au Mac (hover:hover, pointer:fine), la même chose — là, le survol DOIT encore répondre (contre-épreuve : on
   n'a pas éteint la souris). Les commandes sont recensées par la fonction `collecter` de sonde-apple-audit.js (même
   population que l'audit). Au Mac, ce Chromium doit être lancé AVEC une souris déclarée (il n'en a pas) :
     PROFILS=tel node sonde-survol-colle.js
     PROFILS=bureau OPG_ARGS='--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4' node sonde-survol-colle.js
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const AUDIT = fs.readFileSync(path.join(__dirname, 'sonde-apple-audit.js'), 'utf8');
const COLLECTER = AUDIT.slice(AUDIT.indexOf('function collecter() {'), AUDIT.indexOf('/* ── côté page : ce qu\'un élément montre'));
const LIRE = /const LIRE = `([\s\S]*?)`;/.exec(AUDIT)[1];
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');
  const calme = async () => { for (let i = 0; i < 50; i++) { if (await S.ev(`return !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await dormir(300); await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const noeud = async (val) => { const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 });
    try { const q = await S.c.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '[data-audit-i="' + val + '"]' }); return q.nodeId || 0; } catch (e) { return 0; } };
  const lire = async (nodeId) => { const o = (await S.c.envoyer('DOM.resolveNode', { nodeId })).object;
    return (await S.c.envoyer('Runtime.callFunctionOn', { objectId: o.objectId, returnByValue: true, functionDeclaration: LIRE })).result.value.split(' ⟂')[0]; };
  const R = {};
  for (const nomP of (process.env.PROFILS || 'tel,bureau').split(',')) {
    const P = PROFILS[nomP];
    /* ⚠️ couper l'émulation tactile rend ce Chromium « sans pointeur » (hover:none), même lancé avec une souris déclarée :
       au Mac, on ne pose que la taille de l'écran */
    if (P.tac) await poserProfil(S, P); else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: false });
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }].concat(P.tac ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }]) });
    await S.ev(`setPlatForce('${P.plat}'); setThemePref('${P.theme}'); return 1;`); await dormir(500);
    const sansSurvol = await S.ev(`return matchMedia('(hover:none)').matches;`);
    if (!!P.tac !== sansSurvol) { console.log('⛔ ' + nomP + ' : le média du survol n’est pas celui attendu' + (P.tac ? '' : ' — ce Chromium n’a pas de souris : lancer avec OPG_ARGS (voir pilote.js) et PROFILS=bureau seul')); process.exit(2); }
    let vues = await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
    if (process.env.SEULES) vues = vues.filter(v => process.env.SEULES.split(',').includes(v));
    const r = R[nomP] = { vues: 0, essais: 0, familles: {} };
    for (const v of vues) {
      await S.ev(`try{ closeModal(true); }catch(e){} try{ go('${v}'); }catch(e){} return 1;`); await calme();
      let c; try { c = await S.ev(`return (${COLLECTER})();`); } catch (e) { continue; }
      r.vues++;
      for (const cm of c.cmd) {
        const id = await noeud(cm.i); if (!id) continue;
        let repos; try { repos = await lire(id); } catch (e) { continue; }
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: ['hover'] });
        let survol = await lire(id); if (survol === repos) { await dormir(250); survol = await lire(id); }
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] });
        r.essais++;
        if (survol !== repos) { const f = r.familles[cm.sig] || (r.familles[cm.sig] = { txt: cm.txt, vues: [] }); if (!f.vues.includes(v)) f.vues.push(v); }
      }
      process.stdout.write('.');
    }
    console.log('\n' + nomP + ' : ' + r.vues + ' rubriques, ' + r.essais + ' commandes essayées, ' + Object.keys(r.familles).length + ' familles qui changent au survol');
    if (process.env.DETAIL) for (const [k, f] of Object.entries(r.familles).slice(0, 60)) console.log('   · ' + k + ' « ' + f.txt + ' » (' + f.vues.slice(0, 3).join(', ') + ')');
  }
  let ok = 0, ko = 0; const ck = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  if (R.tel) { ck('(population) au téléphone, au moins 30 rubriques et 300 commandes essayées', R.tel.vues >= 30 && R.tel.essais >= 300, [R.tel.vues, R.tel.essais]);
    ck('⛔ au doigt, AUCUNE commande ne change au survol (rien ne reste collé)', !Object.keys(R.tel.familles).length, Object.keys(R.tel.familles).slice(0, 12)); }
  if (R.bureau) { ck('(population) au Mac, au moins 30 rubriques essayées', R.bureau.vues >= 30, R.bureau.vues);
    ck('contre-épreuve : à la souris, le survol répond toujours (au moins 30 familles)', Object.keys(R.bureau.familles).length >= 30, Object.keys(R.bureau.familles).length); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  if (process.env.SORTIE) fs.writeFileSync(process.env.SORTIE, JSON.stringify(R, null, 1));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
