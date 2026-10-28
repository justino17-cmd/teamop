/* ══ SONDE — L'ONGLET AGENTS DE LA TOUR, « PLUS PRO ET PLUS APPLE » (28 octobre 2026) ════════════════════════════════════════════
   Justin : « refais-moi l'onglet Agents plus pro et plus Apple, avec tout bien ». tour.html servi en local, API SIMULÉE dans la page
   (le simulateur de sonde-tour-messagerie.js + les vraies heures de travail de server/agents-horaires.js). Mac 1440 et 1100, jour ET nuit,
   et un iPhone. Mesure : rien ne déborde, cibles ≥ 44 px au doigt, textes ≥ 4,5:1, aucune exception ; captures pour l'œil.
   Usage : node scratchpad/sonde-tour-agents-apple.js   CAPTURES=<dossier>  TOUR_FICHIER=<tour d'avant>  PROFILS=1440:dark,… */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const { analyserMentions } = require('../server/conversations.js');
const CAP = process.env.CAPTURES || path.join(os.tmpdir(), 'tour-agents-apple');
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, c, d) => { (c ? ok : ko).push(t); console.log((c ? '  ✓ ' : '  ✗ ') + t + (d !== undefined && !c ? ' — ' + d : '')); };
const voisine = fs.readFileSync(path.join(__dirname, 'sonde-tour-messagerie.js'), 'utf8');
const mm = /const SIMU = String\.raw`([\s\S]*?)`;\n\n\/\* l'observateur/.exec(voisine);
if (!mm) { console.log('  ✗ simulateur introuvable'); process.exit(1); }
const SIMU = new Function('analyserMentions', 'return String.raw`' + mm[1] + '`;')(analyserMentions);
/* les vraies heures : un mercredi 01 h 16, équipe fermée jusqu'à 9 h */
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'hor-'));
const H = require('../server/agents-horaires.js')({ DATA_DIR: D });
const TS = Date.parse('2026-10-28T00:16:00Z');
const HV = H.vue(TS);
const etatAg = H.etatA(TS, null);
const RESUME = { actives: true, illisible: false, ouvert: etatAg.ouvert, raison: etatAg.raison, prochaineOuverture: etatAg.prochaineOuverture, prochaineFermeture: etatAg.prochaineFermeture, libelleOuverture: etatAg.prochaineOuverture ? H.libelle(etatAg.prochaineOuverture) : '' };
const PLUS = String.raw`(function(){ if(window.__plus) return 1; window.__plus=1; var prev=window.fetch, HV=${JSON.stringify(HV)}, RES=${JSON.stringify(RESUME)};
  window.fetch=function(u,o){ var s=String(u), m=((o&&o.method)||'GET').toUpperCase();
    if(m==='GET'&&/\/api\/monitor\/agents\/horaires$/.test(s)) return Promise.resolve(new Response(JSON.stringify(HV),{status:200,headers:{'Content-Type':'application/json'}}));
    if(m==='GET'&&/\/api\/monitor\/agents$/.test(s)) return prev(u,o).then(function(r){ return r.json(); }).then(function(d){ d.horaires=RES; d.enAttente=3; return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}}); });
    return prev(u,o); }; return 1; })()`;
const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
(async () => {
  const S = await demarrer();
  console.log('Sonde Agents « Apple » — tour.html ' + S.version);
  const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'dark'], ['telephone', 'light'], ['telephone', 'dark']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
  try {
    for (const [larg, mode] of profils) {
      const tel = larg === 'telephone', nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      console.log('\n── ' + nom + ' ──');
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode); const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 1000, deviceScaleFactor: 1, mobile: false });
      await ev(SIMU); await ev(PLUS);
      await ev(`setTab('agents'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return document.querySelectorAll('.ag-rang').length>=16`)) break; }
      await ev(APAISER); await dormir(300);
      for (const sec of ['equipe', 'horaires']) {
        await ev(`agSec('${sec}'); return 1;`); await dormir(500); await ev(APAISER);
        if (sec === 'horaires') for (let i = 0; i < 40; i++) { await dormir(100); if (await ev(`return !!document.querySelector('.ho-j')`)) break; }
        const r = await ev(`${STABLE}
          const lumi=s=>{ const m=String(s).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return p; };
          const L=c=>{ const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)}; return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]); };
          const fond=e=>{ for(let x=e;x;x=x.parentElement){ const b=lumi(getComputedStyle(x).backgroundColor); if(b&&(b[3]===undefined||b[3]>.9)) return b; } return [255,255,255]; };
          const zone=document.querySelector('.ag-onglets').parentElement;
          const txt=[...zone.querySelectorAll('h3,b,span,button,label,p,small,div')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1));
          const bas=[]; txt.forEach(e=>{ const cs=getComputedStyle(e); if(e.closest('[disabled]')) return; const a=lumi(cs.color), b=fond(e); if(!a) return; const l1=L(a),l2=L(b); const r=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); if(r<4.5) bas.push(e.textContent.trim().slice(0,30)+' '+r.toFixed(2)); });
          const cibles=[...zone.querySelectorAll('button:not([disabled]),input,select,summary')].filter(e=>e.offsetParent).map(e=>{ const q=(e.closest('label.ho-sw')||e).getBoundingClientRect(); return {t:(e.textContent||e.type||'').trim().slice(0,20),h:Math.round(q.height),w:Math.round(q.width)}; });
          window.scrollTo(99999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,window.scrollY);
          return {n:txt.length,bas,petites:cibles.filter(x=>x.h<44||x.w<44),nc:cibles.length,sx,rangs:document.querySelectorAll('.ag-rang').length,jours:document.querySelectorAll('.ho-j').length};`);
        v(nom + ' · ' + sec + ' : la population est là', r.n > 20 && (sec !== 'equipe' || r.rangs >= 16) && (sec !== 'horaires' || r.jours === 7), JSON.stringify([r.n, r.rangs, r.jours]));
        v(nom + ' · ' + sec + ' : la page ne glisse pas de côté', r.sx === 0, r.sx);
        v(nom + ' · ' + sec + ' : textes ≥ 4,5:1', r.bas.length === 0, r.bas.slice(0, 6).join(' | '));
        if (tel) v(nom + ' · ' + sec + ' : cibles ≥ 44 px au doigt (' + r.nc + ')', r.petites.length === 0, JSON.stringify(r.petites.slice(0, 6)));
        const cap = await c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: Object.assign({ x: 0, y: 0, scale: 1 }, await ev(`return {width:innerWidth,height:Math.min(document.documentElement.scrollHeight,2400)}`)) });
        fs.writeFileSync(path.join(CAP, nom + '-' + sec + '.png'), Buffer.from(cap.data, 'base64'));
      }
      const ex = (o.exceptions || []).length; v(nom + ' : aucune exception JavaScript', ex === 0, JSON.stringify(o.exceptions));
      try { o.fermer && o.fermer(); } catch (e) {}
    }
  } finally { try { S.fermer(); } catch (e) {} }
  console.log('\n' + ok.length + ' ✓ ' + ko.length + ' ✗  · captures : ' + CAP);
  process.exit(ko.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
