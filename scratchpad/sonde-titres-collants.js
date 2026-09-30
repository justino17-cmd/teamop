/* ══ SONDE — UN TITRE DE GROUPE COLLANT ET TRANSPARENT S'ÉCRIT-IL SUR SES LIGNES ? ═════════════════════════
   Calculé par la cascade rejouée (test-830) : au bureau, dans une carte, `.reg-tete` garde `position:sticky`
   (la bande du bureau) alors que son fond y est retiré (`.carte .reg-tete{background:rgba(0,0,0,0)}`, v2.66).
   Un titre qui colle SANS fond laisse passer les lignes dessous : du texte sur du texte. On ne le devine pas,
   on le MESURE : chaque vue, chaque titre collant sans fond, on fait défiler SON conteneur (la page, ou la liste
   qui défile seule) jusqu'à ce que le titre soit collé au milieu de son groupe, puis on demande quels textes
   visibles passent sous lui.
   Usage : node scratchpad/sonde-titres-collants.js   (APPAREIL=telephone pour l'autre format ; TOUR_FICHIER) */
'use strict';
const { demarrer, onglet, STABLE, APAISER, dormir, VUES } = require('./sonde-tour-theme.js');
const APPAREIL = process.env.APPAREIL || 'bureau', MODE = process.env.MODE || 'light';

const MESURE = `
  ${STABLE}
  const out={titres:0,colles:0,sansFond:0,cas:[]};
  const transparent=c=>/^rgba\\(0, 0, 0, 0\\)$|^transparent$/.test(c);
  const defileur=e=>{ for(let a=e.parentElement;a;a=a.parentElement){ const c=getComputedStyle(a); if(/auto|scroll/.test(c.overflowY)&&a.scrollHeight>a.clientHeight+2) return a; } return null; };
  for(const t of document.querySelectorAll('#vue .reg-tete')){
    const cs=getComputedStyle(t), r0=t.getBoundingClientRect(); if(r0.width<2||cs.display==='none') continue;
    out.titres++;
    if(cs.position!=='sticky') continue; out.colles++;
    const sansFond=transparent(cs.backgroundColor)&&cs.backgroundImage==='none'&&(cs.backdropFilter==='none'||!cs.backdropFilter);
    if(!sansFond) continue; out.sansFond++;
    const g=t.closest('.reg-g')||t.parentElement, rg=g.getBoundingClientRect();
    const nom=(t.querySelector('.reg-nom')||t).textContent.trim().replace(/\\s+/g,' ').slice(0,30);
    const cont=defileur(t);
    /* amener le titre à coller : le haut du groupe passe 80 px au-dessus du point de collage */
    const haut=parseFloat(cs.top)||0;
    if(cont){ const rc=cont.getBoundingClientRect(); cont.scrollTop+= (rg.top-rc.top) - haut + 80; }
    else window.scrollBy(0, rg.top - haut + 80);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    const rt=t.getBoundingClientRect(), rg2=g.getBoundingClientRect();
    const colle=rg2.top<rt.top-4;   /* le groupe a commencé plus haut : le titre est bien retenu */
    const sous=[];
    if(colle) for(const e of g.querySelectorAll('*')){
      if(t.contains(e)) continue;
      if(![...e.childNodes].some(x=>x.nodeType===3&&x.textContent.trim())) continue;
      const re=e.getBoundingClientRect(), ce=getComputedStyle(e); if(re.width<1||ce.visibility==='hidden'||parseFloat(ce.opacity)<.1) continue;
      if(re.left<rt.right&&re.right>rt.left&&re.top<rt.bottom-2&&re.bottom>rt.top+2) sous.push(e.textContent.trim().replace(/\\s+/g,' ').slice(0,24));
    }
    out.cas.push({nom,conteneur:cont?(cont.className||cont.tagName):'la page',colle,hauteurGroupe:Math.round(rg.height),sous:sous.slice(0,4)});
    if(cont) cont.scrollTop=0; window.scrollTo(0,0);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  }
  return out;`;

async function main() {
  const S = await demarrer(); let n = 0, fautes = [];
  const tot = { titres: 0, colles: 0, sansFond: 0 };
  try {
    for (const V of VUES) {
      const o = await onglet(S, APPAREIL, MODE);
      await o.ev(`setApp('${V.app}',true); setTab('${V.tab || V.cle}',true); return 1;`); await dormir(500);
      if (V.geste) await o.ev(V.geste + ' return 1;');
      await o.ev(APAISER + ' window.scrollTo(0,0); return 1;');
      const r = await o.ev(MESURE); n++;
      tot.titres += r.titres; tot.colles += r.colles; tot.sansFond += r.sansFond;
      for (const c of r.cas) {
        const l = V.cle + ' : « ' + c.nom + ' » (dans ' + c.conteneur + ', groupe de ' + c.hauteurGroupe + ' px) — ' + (c.colle ? (c.sous.length ? 'COLLÉ SUR : ' + c.sous.join(' | ') : 'collé, rien dessous') : 'ne colle pas');
        console.log('  ' + l); if (c.colle && c.sous.length) fautes.push(l);
      }
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n══ ' + APPAREIL + ' · ' + n + ' vues · ' + tot.titres + ' titres de groupe · ' + tot.colles + ' collants · ' + tot.sansFond + ' collants SANS fond · ' + fautes.length + ' qui s’écrivent sur leurs lignes');
  if (!n || !tot.titres) { console.log('⛔ POPULATION VIDE'); process.exit(2); }
  process.exit(fautes.length ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
