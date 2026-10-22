/* Quelle règle GAGNE une propriété sur un élément, demandée au navigateur (CSS.getMatchedStylesForNode).
   Usage : VUE=planning SEL='.plm-th' PROP=border-bottom-color MEDIA=prefers-contrast:more node sonde-qui-gagne.js
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
(async () => {
  const S = await ouvrir({});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1200);
  const P = PROFILS[process.env.PROFIL || 'bureau']; await poserProfil(S, P);
  await S.ev(`setPlatForce('${P.plat}'); setThemePref('${process.env.THEME || 'light'}'); return 1;`);
  if (process.env.MEDIA) { const [n, v] = process.env.MEDIA.split(':'); await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: n, value: v }] }); }
  await S.ev(`go('${process.env.VUE || 'dashboard'}'); return 1;`); await dormir(1500);
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');
  const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 });
  const ids = (await S.c.envoyer('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: process.env.SEL })).nodeIds;
  console.log(ids.length + ' éléments pour ' + process.env.SEL);
  for (const nodeId of ids.slice(0, Number(process.env.N || 2))) {
    const m = await S.c.envoyer('CSS.getMatchedStylesForNode', { nodeId });
    const props = process.env.PROP.split(',');
    for (const prop of props) {
      const lignes = [];
      for (const rm of (m.matchedCSSRules || [])) { const d = (rm.rule.style.cssProperties || []).filter(p => (p.name === prop || (prop.startsWith('border') && p.name === 'border') || (prop === 'box-shadow' && p.name === 'box-shadow')) && p.text);
        for (const x of d) lignes.push((x.important ? '!' : ' ') + ' ' + rm.rule.selectorList.text.slice(0, 150) + '  →  ' + x.value.slice(0, 80)); }
      const cs = (await S.c.envoyer('CSS.getComputedStyleForNode', { nodeId })).computedStyle.find(c => c.name === prop);
      if (process.env.SAUF && cs && cs.value.indexOf(process.env.SAUF) >= 0) continue;
      const o = (await S.c.envoyer('DOM.resolveNode', { nodeId })).object;
      console.log('  élément : ' + (await S.c.envoyer('Runtime.callFunctionOn', { objectId: o.objectId, returnByValue: true, functionDeclaration: 'function(){ return this.outerHTML.slice(0,160)+" · parent "+(this.parentElement&&this.parentElement.className); }' })).result.value);
      console.log('  [' + prop + '] calculé : ' + (cs && cs.value) + '\n    ' + lignes.slice(-8).join('\n    '));
    }
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });
