/* ══ SONDE — CHAQUE COMMANDE RÉPOND À L'APPUI, ET TOUT DE SUITE ══════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 11). Sur TOUTES les rubriques, au téléphone et au Mac, on FORCE l'état
   appuyé (:active, CSS.forcePseudoState) commande par commande et on compare ce qu'elle montre au repos, transitions
   finies : aucun changement = « aucun retour » ; un changement porté par une transition de plus de 150 ms = « appui
   lent » (la page entre en 60 ms, --d-0). Les
   commandes sont recensées par la fonction `collecter` de sonde-apple-audit.js (même population que l'audit). Deux
   exceptions NOMMÉES : la liste déroulante native (le système ouvre son propre sélecteur) et le lien d'attribution de
   la carte (un lien de texte d'une feuille qu'on ne sert pas). Au Mac, ce Chromium doit être lancé AVEC une souris déclarée (il n'en a pas) :
     PROFILS=tel node sonde-survol-colle.js
     PROFILS=bureau OPG_ARGS='--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4' node sonde-survol-colle.js
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const AUDIT = fs.readFileSync(path.join(__dirname, 'sonde-apple-audit.js'), 'utf8');
const COLLECTER = AUDIT.slice(AUDIT.indexOf('function collecter() {'), AUDIT.indexOf('/* ── côté page : ce qu\'un élément montre'));
const LIRE = /const LIRE = `([\s\S]*?)`;/.exec(AUDIT)[1];
/* + le remplissage : une colonne de graphique (SVG) répond par son `fill`, que la lecture de l'audit ne relevait pas */
const LIRE2 = LIRE.replace('cs.textDecorationLine]', 'cs.textDecorationLine,cs.fill]');
if (LIRE2 === LIRE) { console.log('⛔ la lecture de l’audit a changé de forme : le remplissage n’est plus relevé'); process.exit(2); }
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');
  const calme = async () => { for (let i = 0; i < 50; i++) { if (await S.ev(`return !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await dormir(300); await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const noeud = async (val) => { const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 });
    try { const q = await S.c.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '[data-audit-i="' + val + '"]' }); return q.nodeId || 0; } catch (e) { return 0; } };
  const lire = async (nodeId) => { const o = (await S.c.envoyer('DOM.resolveNode', { nodeId })).object;
    return (await S.c.envoyer('Runtime.callFunctionOn', { objectId: o.objectId, returnByValue: true, functionDeclaration: LIRE2 })).result.value.split(' ⟂')[0]; };
  const R = {};
  for (const nomP of (process.env.PROFILS || 'tel,bureau').split(',')) {
    const P = PROFILS[nomP]; await poserProfil(S, P);
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [] });
    await S.ev(`setPlatForce('${P.plat}'); setThemePref('${P.theme}'); return 1;`); await dormir(500);
    let vues = await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
    if (process.env.SEULES) vues = vues.filter(v => process.env.SEULES.split(',').includes(v));
    const r = R[nomP] = { vues: 0, essais: 0, familles: {}, lents: {} };
    for (const v of vues) {
      await S.ev(`try{ closeModal(true); }catch(e){} try{ go('${v}'); }catch(e){} return 1;`); await calme();
      let c; try { c = await S.ev(`return (${COLLECTER})();`); } catch (e) { continue; }
      r.vues++;
      for (const cm of c.cmd) {
        const id = await noeud(cm.i); if (!id) continue;
        let repos; try { repos = await lire(id); } catch (e) { continue; }
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: ['active'] });
        /* ⛔ ce Chromium sans écran n'avance une transition qu'au rythme des images qu'il produit : une transition de
           0,12 s relue « 300 ms après » n'avait parfois pas bougé (mesuré le 22 octobre 2026). On lit donc les
           TRANSITIONS lancées par l'appui (leur durée dit si l'appui est lent), on attend leur fin, puis on relit. */
        const o = (await S.c.envoyer('DOM.resolveNode', { nodeId: id })).object;
        const tr = (await S.c.envoyer('Runtime.callFunctionOn', { objectId: o.objectId, awaitPromise: true, returnByValue: true, functionDeclaration: `async function(){
          const a=this.getAnimations().filter(x=>x.transitionProperty), d=a.map(x=>[x.transitionProperty, x.effect.getComputedTiming().duration]);
          await Promise.race([Promise.all(a.map(x=>x.finished.catch(()=>0))), new Promise(r=>setTimeout(r,2500))]);
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return d; }` })).result.value || [];
        const appui = await lire(id);
        const VISU = /^(background-color|background-image|box-shadow|opacity|filter|color|fill|transform|scale|translate|outline-color|border-top-color|text-decoration-line)$/;
        const lent = appui !== repos && tr.some(([p, d]) => VISU.test(p) && d > 150);
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] });
        r.essais++;
        const EXC = /^select\b|^a$/.test(cm.sig) && (cm.sig.startsWith('select') || /Leaflet/.test(cm.txt));
        if (EXC) continue;
        const t = lent ? r.lents : appui === repos ? r.familles : null;
        if (t) { const f = t[cm.sig] || (t[cm.sig] = { txt: cm.txt, vues: [] }); if (!f.vues.includes(v)) f.vues.push(v); }
      }
      process.stdout.write('.');
    }
    console.log('\n' + nomP + ' : ' + r.vues + ' rubriques, ' + r.essais + ' commandes essayées, ' + Object.keys(r.familles).length + ' familles sans retour à l’appui, ' + Object.keys(r.lents).length + ' lentes');
    if (process.env.DETAIL) for (const [k, f] of Object.entries(r.familles).concat(Object.entries(r.lents).map(([k, f]) => ['(lent) ' + k, f])).slice(0, 60)) console.log('   · ' + k + ' « ' + f.txt + ' » (' + f.vues.slice(0, 3).join(', ') + ')');
  }
  let ok = 0, ko = 0; const ck = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  for (const [nomP, r] of Object.entries(R)) {
    ck('(population) ' + nomP + ' : au moins 30 rubriques et 300 commandes essayées', r.vues >= 30 && r.essais >= 300, [r.vues, r.essais]);
    ck('⛔ ' + nomP + ' : chaque commande change sous le doigt (hors liste native et lien d’attribution de la carte)', !Object.keys(r.familles).length, Object.keys(r.familles).slice(0, 14));
    ck(nomP + ' : et tout de suite (aucun appui qui n’arrive qu’après 400 ms)', !Object.keys(r.lents).length, Object.keys(r.lents).slice(0, 8));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  if (process.env.SORTIE) fs.writeFileSync(process.env.SORTIE, JSON.stringify(R, null, 1));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
