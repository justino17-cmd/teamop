/* ══ SONDE — LA TOUR AU TÉLÉPHONE, DE HAUT EN BAS : où le texte se décale ══════════════════════════
   Justin, 26 septembre 2026 : « sur le téléphone il y a beaucoup de décalage d'écriture ».
   Chaque vue (et chaque écran profond) est ouverte en iPhone 390 × 844, encoches posées, puis relevée
   ÉCRAN PAR ÉCRAN jusqu'en bas — pas seulement le haut, où s'arrêtaient les autres sondes. Deux sorties :
     · des captures (dossier CAPT_TEL), avec les marges de la page tracées en filets, pour VOIR ;
     · un relevé des DÉPARTS DE TEXTE : où commence la première ligne de chaque bloc de texte, pour
       trouver ce qui est presque aligné sans l'être (le décalage qui se voit) — le relevé part du DOM
       entier, jamais d'une liste de classes (règle du dépôt).
   Le banc (API simulée, noms fictifs et LONGS, Chromium par CDP) est celui de sonde-tour-theme.js.
   Usage : node scratchpad/sonde-tour-telephone.js
           SEULES=equipe,essais CAPTURES_TEL=0 node scratchpad/sonde-tour-telephone.js   (relevé sans image) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir, VUES } = require('./sonde-tour-theme.js');

const CAPT = process.env.CAPT_TEL || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/tour-tel';
const SEULES = (process.env.SEULES || '').split(',').filter(Boolean);
const AVEC_IMAGES = process.env.CAPTURES_TEL !== '0';
const MODE = process.env.MODE || 'light';

/* Les départs de texte : pour chaque élément qui porte du texte en propre (un nœud texte enfant direct),
   visible, hors d'un tiroir ou d'une zone qui défile de côté, le bord gauche de sa PREMIÈRE ligne et
   de son bloc. On garde aussi la chaîne de conteneurs, pour dire à qui le départ appartient. */
const RELEVE = `
  ${STABLE}
  const vue=document.getElementById('vue'); const rv=vue.getBoundingClientRect();
  const csv=getComputedStyle(vue); const bordG=rv.left+parseFloat(csv.paddingLeft), bordD=rv.right-parseFloat(csv.paddingRight);
  const out={bordG,bordD,H:document.documentElement.scrollHeight,textes:[]};
  const sy=scrollY;
  const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\\s+/).slice(0,3).join('.'):'');
  for(const e of vue.querySelectorAll('*')){
    const tn=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim().length>=1);
    if(!tn) continue;
    const cs=getComputedStyle(e);
    if(cs.visibility==='hidden'||cs.display==='none'||parseFloat(cs.opacity||1)<.3||e.closest('[hidden]')) continue;
    const rg=document.createRange(); rg.selectNodeContents(tn);
    const q=[...rg.getClientRects()].find(z=>z.width>1); if(!q) continue;
    const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
    let rouleau=false; for(let a=e.parentElement;a&&a!==vue;a=a.parentElement){ const ca=getComputedStyle(a); if(/auto|scroll/.test(ca.overflowX)&&a.scrollWidth>a.clientWidth+2){ rouleau=true; break; } }
    const chaine=[]; for(let a=e;a&&a!==vue&&chaine.length<5;a=a.parentElement) chaine.push(nom(a));
    out.textes.push({t:tn.textContent.trim().replace(/\\s+/g,' ').slice(0,48),x:Math.round(q.left*10)/10,y:Math.round((q.top+sy)*10)/10,
      bx:Math.round(r.left*10)/10,bw:Math.round(r.width),h:Math.round(q.height),disp:cs.display,ta:cs.textAlign,fs:cs.fontSize,fw:cs.fontWeight,rouleau,chaine});
  }
  return out;`;

/* des filets aux marges de la page (bord du contenu de #vue) : un texte qui en part à 3 px se voit */
const FILETS = `
  const vue=document.getElementById('vue'); const rv=vue.getBoundingClientRect(), cs=getComputedStyle(vue);
  const g=rv.left+parseFloat(cs.paddingLeft), d=rv.right-parseFloat(cs.paddingRight);
  let f=document.getElementById('__filets'); if(!f){ f=document.createElement('div'); f.id='__filets'; document.body.appendChild(f); }
  f.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  f.innerHTML='<i style="position:absolute;top:0;bottom:0;left:'+g+'px;width:1px;background:rgba(255,0,80,.55)"></i><i style="position:absolute;top:0;bottom:0;left:'+(d-1)+'px;width:1px;background:rgba(255,0,80,.55)"></i>';
  return {g,d};`;

async function main() {
  fs.mkdirSync(CAPT, { recursive: true });
  const S = await demarrer();
  const releves = {};
  try {
    for (const V of VUES) {
      if (SEULES.length && !SEULES.includes(V.cle)) continue;
      const o = await onglet(S, 'telephone', MODE);
      await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      const tab = V.tab || V.cle;
      await o.ev(`setApp('${V.app}',true); setTab('${tab}',true); return 1;`);
      await dormir(500);
      if (V.geste) await o.ev(V.geste + ' return 1;');
      await o.ev(APAISER + ' window.scrollTo(0,0); return 1;');
      const rel = await o.ev(RELEVE);
      releves[V.cle] = rel;
      if (AVEC_IMAGES) {
        await o.ev(FILETS);
        const H = rel.H, pas = 844 - 150;   // chevauchement : la barre du haut et celle du bas cachent chacune un bandeau
        let n = 0;
        for (let y = 0; y < H - 200 || n === 0; y += pas) {
          await o.ev('window.scrollTo(0,' + y + '); ' + STABLE + ' await new Promise(r=>setTimeout(r,120)); return 1;');
          const cap = await o.c.envoyer('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(CAPT, V.cle + '-' + String(++n).padStart(2, '0') + '.png'), Buffer.from(cap.data, 'base64'));
          if (n >= 8) break;
        }
        console.log(V.cle + ' : ' + n + ' écran(s), page de ' + H + ' px');
      }
      if (o.exceptions.length) console.log('   exceptions : ' + o.exceptions.join(' / '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  fs.writeFileSync(path.join(CAPT, 'releve.json'), JSON.stringify(releves, null, 1));
  console.log('relevé écrit : ' + path.join(CAPT, 'releve.json') + ' · ' + Object.keys(releves).length + ' vues');
  process.exit(0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
