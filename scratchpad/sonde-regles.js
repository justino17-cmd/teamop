/* ══ QUELLE RÈGLE ? — on demande au navigateur, on ne devine pas (règle du dépôt) ══════════════════
   Ouvre une vue de la Tour au téléphone (ou au bureau), prend les éléments d'un sélecteur, et rend pour
   chacun : son rectangle, les propriétés demandées CALCULÉES, et les règles qui les déclarent — avec leur
   LIGNE dans tour.html (CSS.getMatchedStylesForNode). Le banc est celui de sonde-tour-theme.js.
   Usage : VUE=accueil SEL=".reg-tete" PROPS=margin-left,padding-left node scratchpad/sonde-regles.js
           (APPAREIL=bureau, N=3, GESTE="…" en plus de celui de la vue) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, APAISER, dormir, VUES } = require('./sonde-tour-theme.js');
const VUE = process.env.VUE || 'accueil', SEL = process.env.SEL || '.reg-tete';
const PROPS = (process.env.PROPS || 'margin-left,padding-left').split(',').map(s => s.trim()).filter(Boolean);
const N = +(process.env.N || 3), APPAREIL = process.env.APPAREIL || 'telephone';
const PAGE = fs.readFileSync(process.env.TOUR_FICHIER || path.join(__dirname, '..', 'tour.html'), 'utf8');

async function main() {
  const V = VUES.find(v => v.cle === VUE) || { cle: VUE, app: 'gestion' };
  const S = await demarrer();
  try {
    const o = await onglet(S, APPAREIL, 'light');
    await o.ev(`setApp('${V.app}',true); setTab('${V.tab || V.cle}',true); return 1;`); await dormir(500);
    if (V.geste) await o.ev(V.geste + ' return 1;');
    if (process.env.GESTE) await o.ev(process.env.GESTE + ' return 1;');
    await o.ev(APAISER + ' return 1;');
    await o.c.envoyer('DOM.enable'); await o.c.envoyer('CSS.enable');
    /* les feuilles : leur position dans le document, pour rendre une ligne de tour.html */
    const feuilles = {};
    o.c.sur(m => { if (m.method === 'CSS.styleSheetAdded') feuilles[m.params.header.styleSheetId] = m.params.header; });
    await o.c.envoyer('CSS.disable'); await o.c.envoyer('CSS.enable'); await dormir(300);
    const doc = await o.c.envoyer('DOM.getDocument', { depth: -1 });
    for (const sel of SEL.split('||').map(x => x.trim()).filter(Boolean)) {
    const { nodeIds } = await o.c.envoyer('DOM.querySelectorAll', { nodeId: doc.root.nodeId, selector: sel });
    console.log('\n══ ' + VUE + ' · ' + APPAREIL + ' · « ' + sel + ' » : ' + nodeIds.length + ' élément(s)');
    for (const id of nodeIds.slice(0, N)) {
      const { object } = await o.c.envoyer('DOM.resolveNode', { nodeId: id });
      const info = await o.c.envoyer('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true,
        functionDeclaration: `function(props){ const r=this.getBoundingClientRect(), cs=getComputedStyle(this);
          const o={}; props.forEach(p=>o[p]=cs.getPropertyValue(p));
          return {t:(this.textContent||'').trim().replace(/\\s+/g,' ').slice(0,50),x:Math.round(r.left*10)/10,w:Math.round(r.width),y:Math.round(r.top),cls:String(this.className).slice(0,60),o}; }`,
        arguments: [{ value: PROPS }] });
      const v = info.result.value;
      console.log('\n  « ' + v.t + ' » .' + v.cls + ' — x ' + v.x + ', l ' + v.w + ', y ' + v.y);
      console.log('    calculé : ' + PROPS.map(p => p + ' ' + v.o[p]).join(' · '));
      const m = await o.c.envoyer('CSS.getMatchedStylesForNode', { nodeId: id });
      const lignes = [];
      for (const r of (m.matchedCSSRules || [])) {
        const st = r.rule.style; if (!st || !st.cssProperties) continue;
        const decl = st.cssProperties.filter(p => PROPS.some(q => p.name === q || (q.startsWith(p.name + '-') && /^(margin|padding|border|inset|flex|grid|gap)$/.test(p.name))) && !p.disabled && p.text);
        if (!decl.length) continue;
        const h = feuilles[r.rule.styleSheetId]; let ligne = '?';
        if (h && st.range) ligne = (h.startLine || 0) + st.range.startLine + 1;
        lignes.push('    l.' + ligne + '  ' + r.rule.selectorList.text.slice(0, 90) + '  →  ' + decl.map(p => p.text.trim()).join(' '));
      }
      if (m.inlineStyle && m.inlineStyle.cssProperties) { const d = m.inlineStyle.cssProperties.filter(p => PROPS.includes(p.name) && p.text); if (d.length) lignes.push('    style en ligne  →  ' + d.map(p => p.text).join(' ')); }
      lignes.forEach(l => console.log(l));
    }
    }
    await o.fermer();
  } finally { S.fermer(); }
  process.exit(0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
