/* ══ DEUX VERSIONS, LE MÊME ÉCRAN, À LA PROPRIÉTÉ PRÈS ══════════════════════════════════════════════════════════
   Une réécriture de CSS « sans rien changer à l'écran » se PROUVE : on ouvre l'ancienne bêta et la nouvelle côte à
   côte, sur la même base, à la même heure figée, on dessine chaque rubrique (et quelques fiches, et un message), et on
   compare le STYLE CALCULÉ de chaque élément de la page — toutes les propriétés, pseudo-éléments compris, pas une liste
   choisie. Une seule différence, n'importe où, se nomme (écran, élément, propriété, avant → après).
   Les animations sont figées à t=0 des deux côtés : sans ça, le halo du fond (boucle infinie) ferait crier la sonde.
   ⛔ Deux pièges payés en l'écrivant (26 septembre 2026) :
   · renvoyer le relevé complet d'un écran (~7 Mo) par le protocole de pilotage NE REVIENT JAMAIS : chaque élément
     remonte une EMPREINTE courte, et le détail n'est demandé que pour ceux qui diffèrent ;
   · « 0 différence » sur 0 écran comparé n'est pas un succès : la sonde échoue si sa population est vide ou si un
     écran n'a pas pu être relevé.
   Usage : node scratchpad/sonde-styles-identiques.js <base.json> <ancienne.html> <nouvelle.html> [largeur=390] [jour|nuit]
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, ANC, NOUV, LARG, MODE] = process.argv.slice(2);
const larg = +(LARG || 390), mode = MODE || 'jour';

async function monter(source) {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir({ source });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', larg < 800 ? { width: larg, height: 844, deviceScaleFactor: 3, mobile: true } : { width: larg, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: mode === 'nuit' ? 'dark' : 'light' }] });
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr');
    /* la proposition de photo de profil s'ouvre UNE fois par compte, 900 ms après l'entrée : dans une page elle tombait
       pendant un écran, dans l'autre pendant le suivant — une différence de moment, pas de feuille. Déjà proposée. */
    localStorage.setItem('elanB_photo_prompt_u0','1'); return 1;`);
  /* l'heure et le hasard sont FIGÉS, les mêmes dans les deux pages : « il y a 3 min », la ligne de l'heure du planning
     ou un identifiant tiré au sort différeraient sinon pour une raison qui n'a rien à voir avec la feuille */
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{ const T0=Date.UTC(2026,8,24,8,30); const D=Date; let k=0;
    class F extends D{ constructor(...a){ if(a.length) super(...a); else super(T0 + (k++)); } static now(){ return T0 + (k++); } }
    window.Date=F; window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
    window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||'';
    Math.random=(()=>{ let x=42; return ()=>((x=(x*16807)%2147483647)/2147483647); })(); })();` });
  S.c.sur(m => { if (m.method === 'Page.javascriptDialogOpening') S.c.envoyer('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(2500);
  await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){} return 1;`);
  return S;
}
const ECRANS = `const v=[]; NAV.forEach(s=>s.items.forEach(it=>{ if(views[it.k]) v.push({t:'vue',k:it.k}); }));
  (typeof SOUS_CATS==='object'?Object.keys(SOUS_CATS):[]).forEach(k=>{ if(views[k]&&!v.some(x=>x.k===k)) v.push({t:'vue',k}); });
  if(views.boiteMail&&!v.some(x=>x.k==='boiteMail')) v.push({t:'vue',k:'boiteMail'});
  const i1=db.interventions.find(i=>i.statut!=='terminee'), i2=db.interventions.find(i=>i.statut==='terminee');
  if(i1) v.push({t:'int',k:i1.id}); if(i2) v.push({t:'int',k:i2.id});
  if(db.clients[0]&&typeof ficheClient==='function') v.push({t:'cli',k:db.clients[0].id});
  if(db.boxes[0]&&typeof openBox==='function') v.push({t:'box',k:db.boxes[0].id});
  v.push({t:'toast',k:'message'});
  return v;`;
/* dessine l'écran, fige les animations, et rend { chemin : empreinte } ; les chaînes complètes restent dans la page */
const RELEVE = e => `try{ closeModal(true); }catch(_){}
  try{ const t=${JSON.stringify(e.t)}, k=${JSON.stringify(e.k)};
    if(t==='vue'){ current=k; rendreVueSure(k); } else if(t==='int') detailIntervention(k); else if(t==='cli') ficheClient(k); else if(t==='box') openBox(k); else toast('Message de contre-épreuve'); }catch(err){ return {err:String(err)}; }
  await new Promise(r=>setTimeout(r,${e.k === 'boiteMail' ? 700 : 200}));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  document.getAnimations().forEach(a=>{ try{ a.pause(); a.currentTime=0; }catch(_){} });
  const chemin=el=>{ const p=[]; while(el&&el!==document.documentElement){ const par=el.parentElement; if(!par) break; p.push(el.tagName+[...par.children].indexOf(el)); el=par; } return p.reverse().join('/'); };
  const h=s=>{ let x=2166136261; for(let i=0;i<s.length;i++){ x^=s.charCodeAt(i); x=Math.imul(x,16777619); } return (x>>>0).toString(36)+':'+s.length; };
  const tout={}, emp={}, desc={};
  const els=[document.documentElement,...document.documentElement.querySelectorAll('*')].filter(x=>!/^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|TEMPLATE|NOSCRIPT)$/.test(x.tagName));
  /* ⛔ les entrées sont TRIÉES : l'ordre dans lequel le navigateur énumère les variables CSS dépend de l'ordre des
     règles de la feuille — retirer une règle morte le change sans rien changer à ce qui est peint */
  for(const el of els){ const cs=getComputedStyle(el); const e=[]; for(let i=0;i<cs.length;i++){ const p=cs[i]; e.push(p+':'+cs.getPropertyValue(p)); }
    for(const ps of ['::before','::after']){ const c2=getComputedStyle(el,ps); if(c2.content&&c2.content!=='none'&&c2.content!=='normal'){ for(let i=0;i<c2.length;i++){ const p=c2[i]; e.push(ps+' '+p+':'+c2.getPropertyValue(p)); } } }
    const s=e.sort().join(';')+';'; const c=chemin(el); tout[c]=s; emp[c]=h(s);
    desc[c]=el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className.trim()?'.'+el.className.trim().split(/\s+/).slice(0,3).join('.'):''); }
  window.__desc=desc;
  window.__releve=tout;
  return {n:els.length, emp};`;

(async () => {
  const A = await monter(ANC), B = await monter(NOUV);
  const seules = (process.env.SEULES || '').split(',').filter(Boolean);
  const filtre = l => seules.length ? l.filter(e => seules.includes(e.k)) : l;
  const ecrans = filtre(await A.ev(ECRANS)), ecransB = filtre(await B.ev(ECRANS));
  let ecr = 0, els = 0, diffs = 0, rates = 0; const rapport = [];
  if (JSON.stringify(ecrans) !== JSON.stringify(ecransB)) rapport.push('⚠ les deux versions ne listent pas les mêmes écrans');
  const avecDelai = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ err: 'délai dépassé (' + ms + ' ms)' }), ms))]);
  for (const e of ecrans) {
    process.stderr.write(`  ${ecr + rates + 1}/${ecrans.length} ${e.t} ${e.k}\n`);
    const [a, b] = await Promise.all([avecDelai(A.ev(RELEVE(e)), 60000), avecDelai(B.ev(RELEVE(e)), 60000)]);
    if (!a || !b || a.err || b.err) { rates++; rapport.push(`⚠ ${e.t} ${e.k} : ${(a && a.err) || (b && b.err) || 'absent d’un côté'}`); if (/délai/.test((a && a.err) || (b && b.err) || '')) break; continue; }
    ecr++; els += a.n;
    const cles = [...new Set([...Object.keys(a.emp), ...Object.keys(b.emp)])].filter(c => a.emp[c] !== b.emp[c]);
    diffs += cles.length;
    for (const c of cles.slice(0, 4)) {
      const qui = await (a.emp[c] ? A : B).ev(`return (window.__desc||{})[${JSON.stringify(c)}]||''`);
      if (!a.emp[c] || !b.emp[c]) { rapport.push(`✗ ${e.t} ${e.k} · ${qui} ${c.slice(-50)} : élément ${a.emp[c] ? 'disparu' : 'apparu'}`); continue; }
      const [sa, sb] = await Promise.all([A.ev(`return window.__releve[${JSON.stringify(c)}]`), B.ev(`return window.__releve[${JSON.stringify(c)}]`)]);
      /* chaque entrée s'écrit « [::before ]propriété:valeur; » — on coupe au PREMIER « : » qui suit le nom, pas au
         premier du texte (celui de « ::before » avalait toutes les propriétés des pseudo-éléments) */
      const lire = s => Object.fromEntries(String(s || '').split(';').filter(Boolean).map(x => { const d = x.startsWith('::') ? x.indexOf(' ') + 1 : 0; const i = x.indexOf(':', d); return [x.slice(0, i), x.slice(i + 1)]; }));
      const pa = lire(sa), pb = lire(sb);
      const props = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter(p => pa[p] !== pb[p]).slice(0, 6);
      let ou = ''; if (!props.length) { let k = 0; while (k < Math.min(sa.length, sb.length) && sa[k] === sb[k]) k++; ou = ` (premier écart au caractère ${k} : « ${sa.slice(Math.max(0, k - 40), k + 40)} » / « ${sb.slice(Math.max(0, k - 40), k + 40)} »)`; }
      rapport.push(`✗ ${e.t} ${e.k} · ${qui} ${c.slice(-50)} : ` + props.map(p => `${p} « ${(pa[p] || '∅').slice(0, 40)} » → « ${(pb[p] || '∅').slice(0, 40)} »`).join(' ; ') + ou);
    }
    if (cles.length > 4) rapport.push(`   … et ${cles.length - 4} autre(s) élément(s) sur ${e.t} ${e.k}`);
  }
  console.log(`largeur ${larg}, ${mode} : ${ecr} écran(s) comparé(s) sur ${ecrans.length}, ${els} éléments, ${diffs} différence(s) de style calculé, ${rates} écran(s) non relevé(s) ; exceptions ${A.exceptions.length} / ${B.exceptions.length}`);
  rapport.slice(0, 80).forEach(x => console.log('  ' + x));
  A.fermer(); B.fermer();
  process.exit(diffs || rates || ecr === 0 ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });
