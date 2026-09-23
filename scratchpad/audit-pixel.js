/* ══ LES NEUF TEINTES, TOUS LES TEXTES, LUS AU PIXEL ═══════════════════════════════════════
   audit-teintes.js compose les fonds des ancêtres jusqu'à un fond opaque. Sous le VERRE, ce
   calcul ment dans les DEUX sens : il ignore les halos que la vitre laisse passer — trop
   sévère ici, trop CLÉMENT là. Mesuré le 23 septembre 2026 : les six pastilles d'état, que
   le calcul donnait lisibles, tombaient à 3,28 au pixel sous le verre de nuit. Relire au
   pixel les seuls suspects du calcul ne suffit donc pas : il faut tout relire.

   Pour chaque écran (thème × teinte × rubrique, puis les fenêtres) : une fenêtre de rendu
   HAUTE (la page tient d'un coup, sans défilement), les transitions CSS menées à leur terme,
   UNE capture, puis pour chaque élément qui porte son propre texte : son encre calculée
   contre la couleur la plus fréquente de SON rectangle dans la capture, glyphes écartés.

   Un élément ESTOMPÉ est mesuré avec l'encre qu'il peint vraiment : son encre mêlée à ce qui
   est derrière selon son opacité effective. Écartés, et COMPTÉS : ce qui est presque
   invisible (opacité < 0,3), les commandes inactives (WCAG 1.4.3), les pastilles de personne
   (span.av : la couleur d'un technicien, c'est voulu), les textes sans lettre ni chiffre (un
   pictogramme n'est pas un texte).

   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : PLAT=macweb TH=dark node scratchpad/audit-pixel.js
           TEL=1 TH=dark,light ACC=graphite RUB=archives FEN=0 node scratchpad/audit-pixel.js */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { decoder, contraste, lireCouleur } = require(path.join(__dirname, 'png.js'));
const TEL = process.env.TEL === '1';
const PLAT = process.env.PLAT || (TEL ? 'iosweb' : 'macweb');
const THEMES = (process.env.TH || 'dark,light').split(',');
const ACC_SEULS = (process.env.ACC || '').split(',').filter(Boolean);
const RUB = (process.env.RUB || '').split(',').filter(Boolean);
const FEN = process.env.FEN !== '0';
const W = TEL ? 390 : 1280, H = 2200;
const src = fs.readFileSync(path.join(__dirname, 'audit-teintes.js'), 'utf8');
const FENETRES = eval(src.match(/const FENETRES=(\[[\s\S]*?\n  \]);/)[1]);

const RELEVE = `
  /* transitions ET animations finies menées à leur terme (une carte qui entre en fondu se lit
     à son état de départ sinon) ; les boucles infinies (le halo du fond) restent */
  document.getAnimations().forEach(a=>{ try{ const t=a.effect&&a.effect.getComputedTiming&&a.effect.getComputedTiming(); if(t&&isFinite(t.endTime)) a.finish(); }catch(e){} });
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
  const zones=(typeof ZONE!=='undefined'&&ZONE)?[document.querySelector(ZONE)].filter(Boolean)
    :[document.getElementById('content'),document.querySelector('.topbar'),document.getElementById('page-head'),document.getElementById('tabbar'),document.getElementById('assistant')${TEL ? '' : ",document.querySelector('.sidebar')"}].filter(Boolean);
  document.querySelectorAll('[data-px]').forEach(x=>x.removeAttribute('data-px'));
  const vus=new Set(), out={els:[],estompes:0,inactifs:0,pictos:0,recouverts:0};
  const opEff=e=>{ let o=1; for(let n=e;n&&n.nodeType===1;n=n.parentElement){ const v=+getComputedStyle(n).opacity; if(!isNaN(v)) o*=v; } return o; };
  const nom=e=>e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
  zones.forEach(z=>z.querySelectorAll('*').forEach(e=>{
    if(vus.has(e)) return; vus.add(e);
    if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) return;
    const b=e.getBoundingClientRect(); if(b.width<4||b.height<6||b.bottom<=0||b.right<=0||b.top>=${H}||b.left>=${W}) return;
    const st=getComputedStyle(e); if(st.visibility!=='visible'||st.display==='none') return;
    const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    if(!/[A-Za-zÀ-ÿ0-9]/.test(t)){ out.pictos++; return; }
    if(e.closest('[disabled],[aria-disabled="true"]')){ out.inactifs++; return; }
    if(e.classList.contains('av')) return;
    const op=opEff(e); if(op<0.3){ out.estompes++; return; }
    const fs=parseFloat(st.fontSize), fw=+st.fontWeight||400;
    /* ⛔ LE RECTANGLE DU TEXTE, PAS CELUI DE LA BOÎTE : un titre qui porte aussi des pastilles
       ou des boutons a une boîte qui les contient — la couleur la plus fréquente y était celle
       d'une pastille (« Prestation réalisée » lu à 1,04 sur le vert d'un bouton voisin) */
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const n of e.childNodes){ if(n.nodeType!==3||!n.textContent.trim()) continue; const rg=document.createRange(); rg.selectNodeContents(n);
      for(const q of rg.getClientRects()){ if(q.width<1||q.height<1) continue; x0=Math.min(x0,q.left); y0=Math.min(y0,q.top); x1=Math.max(x1,q.right); y1=Math.max(y1,q.bottom); } }
    if(x1<=x0||y1<=y0) return;
    /* ⛔ UN TEXTE RECOUVERT N'EST PAS UN TEXTE LU : au centre de son texte, l'élément du dessus
       doit être lui (ou l'un de ses enfants) — sinon on mesurerait ce qui le cache (la barre
       d'onglets posée sur le champ de la messagerie) */
    const cx=(x0+x1)/2, cy=(y0+y1)/2;
    if(cy>=0&&cy<${H}&&cx>=0&&cx<${W}){ const dessus=document.elementFromPoint(cx,cy); if(dessus&&dessus!==e&&!e.contains(dessus)){ out.recouverts++; return; } }
    e.setAttribute('data-px', out.els.length);
    out.els.push({ n:nom(e), t:t.slice(0,26), x:Math.max(0,x0), y:Math.max(0,y0), w:Math.min(x1,${W})-Math.max(0,x0), h:Math.min(y1,${H})-Math.max(0,y0),
      bx:b.left, by:b.top, barre:!!(document.documentElement.getAttribute('data-verre')==='1'&&e.closest('#tabbar,.topbar,.sidebar')), encre:st.color, op:+op.toFixed(3), gros:(fs>=24||(fs>=18.66&&fw>=700)) });
  }));
  return out;`;

(async () => {
  const S = await ouvrir();
  console.log('  page mesurée : ' + S.version + ' · ' + PLAT + (TEL ? ' (téléphone)' : '') + ' · fenêtre de rendu ' + W + '×' + H);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: TEL });
  if (TEL) await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`window.confirm=()=>false; try{ setPlatForce('${PLAT}'); }catch(e){} return 1;`); await dormir(5000);
  console.log('  verre : ' + (await S.ev(`return document.documentElement.getAttribute('data-verre')||'éteint';`)));
  const ACCENTS = (await S.ev(`return Object.keys(ACCENTS);`)).filter(a => !ACC_SEULS.length || ACC_SEULS.includes(a));
  const CATS = (await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`)).filter(k => !RUB.length || RUB.includes(k));

  /* ⛔ CONTRE-ÉPREUVE : un texte illisible posé exprès (gris sur gris, 1,2:1) doit être vu au
     pixel — sinon « 0 » peut vouloir dire que la mesure ne regarde rien */
  const mesurer = async (ou, zone) => {
    const r = await S.ev(`const ZONE=${JSON.stringify(zone || '')}; ${RELEVE}`);
    const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    const img = decoder(Buffer.from(cap.data, 'base64'));
    /* ⛔ CE QUI BOUGE ENTRE LE RELEVÉ ET LA CAPTURE N'EST PAS MESURÉ : un planning qui se cale sur
       aujourd'hui, une liste qui se réordonne — le rectangle ne pointerait plus sur le texte */
    const apres = await S.ev(`return [...document.querySelectorAll('[data-px]')].map(e=>{ const b=e.getBoundingClientRect(); return [+e.getAttribute('data-px'),Math.round(b.left),Math.round(b.top)]; });`);
    const posApres = new Map(apres.map(([i, x, y]) => [i, [x, y]]));
    let bouges = 0;
    const faibles = [];
    for (const [ix, e] of r.els.entries()) {
      const pa = posApres.get(ix); if (!pa || Math.abs(pa[0] - Math.round(e.bx)) > 1 || Math.abs(pa[1] - Math.round(e.by)) > 1) { bouges++; continue; }
      const enc = lireCouleur(e.encre); if (!enc) continue;
      const cpt = new Map(); const x0 = Math.round(e.x), y0 = Math.round(e.y), x1 = Math.round(e.x + e.w), y1 = Math.round(e.y + e.h);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * img.w + x) * 4; const p = [img.data[i], img.data[i + 1], img.data[i + 2]];
        /* on écarte le cœur des glyphes (l'encre elle-même), pas plus : un seuil large écartait
           aussi le FOND quand il est proche de l'encre — c'est-à-dire exactement le défaut
           qu'on cherche (le témoin gris sur gris passait inaperçu à 90) */
        if (Math.abs(p[0] - enc[0]) + Math.abs(p[1] - enc[1]) + Math.abs(p[2] - enc[2]) < 30) continue;
        const k = (p[0] >> 2) + ',' + (p[1] >> 2) + ',' + (p[2] >> 2); cpt.set(k, (cpt.get(k) || 0) + 1);
      }
      const top = [...cpt.entries()].sort((a, b) => b[1] - a[1])[0]; if (!top) continue;
      const fond = top[0].split(',').map(v => (+v << 2) + 2);
      /* un élément estompé peint son encre à travers son opacité : l'encre VUE est le mélange
         de l'encre et de ce qui est derrière — c'est elle qu'on compare */
      const vue = e.op < 0.999 ? enc.map((v, i) => v * e.op + fond[i] * (1 - e.op)) : enc;
      const c = contraste(vue, fond), seuil = e.gros ? 3 : 4.5;
      if (c < seuil) faibles.push({ ou, n: e.n, t: e.t, c, seuil, op: e.op, barre: e.barre, encre: vue.map(Math.round).join(','), fond: fond.join(',') });
    }
    return { n: r.els.length - bouges, faibles, estompes: r.estompes, inactifs: r.inactifs, pictos: r.pictos, recouverts: r.recouverts, bouges };
  };
  {
    await S.ev(`try{ setThemePref('dark'); setAccent('green'); go('dashboard'); }catch(e){} return 1;`); await dormir(900);
    await S.ev(`const x=document.createElement('span'); x.id='__temoin'; x.textContent='témoin gris'; x.style.cssText='color:#8a8a8a;background:#9a9a9a;display:inline-block;padding:4px';
      document.getElementById('content').prepend(x); return 1;`);
    const m = await mesurer('témoin');
    await S.ev(`const x=document.getElementById('__temoin'); if(x) x.remove(); return 1;`);
    const pris = m.faibles.some(f => /témoin gris/.test(f.t));
    console.log('  contre-épreuve — le témoin gris est vu au pixel : ' + (pris ? 'OUI ✓' : 'NON ✗') + ' · ' + m.n + ' textes sur cet écran');
    if (!pris || m.n < 40) { S.fermer(); process.exit(7); }
  }

  const R = { version: S.version, plat: PLAT, tel: TEL, ecrans: 0, fenetres: 0, textes: 0, estompes: 0, inactifs: 0, pictos: 0, recouverts: 0, bouges: 0, faibles: [] };
  for (const th of THEMES) for (const a of ACCENTS) {
    await S.ev(`try{ closeSub(); }catch(e){} try{ closeModal(); }catch(e){} try{ setThemePref('${th}'); setAccent('${a}'); }catch(e){} return 1;`); await dormir(300);
    for (const k of CATS) {
      await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(450);
      await S.ev(`try{ closeModal(); }catch(e){} try{ tdbDetailFerme(); }catch(e){} window.scrollTo(0,0); return 1;`);
      for (let i = 0; i < 20; i++) { if (!(await S.ev(`return !!document.querySelector('.content.entre');`))) break; await dormir(100); }
      const m = await mesurer(th + '/' + a + '/' + k);
      R.ecrans++; R.textes += m.n; R.estompes += m.estompes; R.inactifs += m.inactifs; R.pictos += m.pictos; R.recouverts += m.recouverts; R.bouges += m.bouges; R.faibles.push(...m.faibles);
    }
    if (FEN) for (const F of FENETRES) {
      await S.ev(`try{ closeModal(); }catch(e){} try{ closeSub(); }catch(e){} return 1;`); await dormir(150);
      try { await S.ev(F.ouvrir + ' return 1;'); } catch (e) { continue; }
      await dormir(500); try { await S.ev(F.puis + ' return 1;'); } catch (e) {} await dormir(300);
      const m = await mesurer(th + '/' + a + '/fenêtre ' + F.nom, F.zone);
      R.fenetres++; R.textes += m.n; R.estompes += m.estompes; R.inactifs += m.inactifs; R.pictos += m.pictos; R.recouverts += m.recouverts; R.bouges += m.bouges; R.faibles.push(...m.faibles);
    }
    await S.ev(`try{ closeSub(); }catch(e){} try{ closeModal(); }catch(e){} return 1;`);
    console.log('  ' + th.padEnd(6) + a.padEnd(9) + ' — ' + R.ecrans + ' écrans + ' + R.fenetres + ' fenêtres, ' + R.faibles.length + ' sous le seuil');
  }
  /* ⚠ UNE BARRE EN VERRE (onglets, barre du haut, menu) FLOTTE AU-DESSUS DU CONTENU QUI DÉFILE :
     Chromium sans GPU ne floute PAS ce qui passe dessous (vérifié : une bande vive glissée sous
     la barre d'onglets reste nette, alors que le même flou marche sur une page simple). Ses
     libellés se mesurent donc sur un fond NON flouté — plus sévère que Safari. Rangés à part. */
  const surBarre = R.faibles.filter(f => f.barre); R.faibles = R.faibles.filter(f => !f.barre); R.surBarre = surBarre;
  const grp = {}; R.faibles.forEach(f => { const g = f.ou.split('/')[0] + ' | ' + f.n + ' « ' + f.t.replace(/\d+/g, '#') + ' »'; (grp[g] = grp[g] || []).push(f); });
  console.log('\n════════ AU PIXEL — ' + PLAT + (TEL ? ' (téléphone)' : '') + ' ════════');
  console.log('  population : ' + R.ecrans + ' écrans + ' + R.fenetres + ' fenêtres · ' + R.textes + ' textes lus au pixel · écartés et comptés : ' + R.estompes + ' presque invisibles, ' + R.inactifs + ' inactifs, ' + R.pictos + ' pictogrammes, ' + R.recouverts + ' recouverts, ' + R.bouges + ' qui ont bougé');
  console.log('  SOUS LE SEUIL : ' + R.faibles.length + ' (' + Object.keys(grp).length + ' groupes)');
  Object.entries(grp).sort((a, b) => b[1].length - a[1].length).slice(0, 40).forEach(([g, v]) => {
    const p = v.reduce((m, x) => x.c < m.c ? x : m, v[0]);
    console.log('   ' + String(v.length).padStart(4) + '×  ' + g + '   pire ' + p.c.toFixed(2) + ' [' + p.ou + '] encre ' + p.encre + ' fond ' + p.fond);
  });
  console.log('  sur une barre en verre (fond non flouté par Chromium, voir plus haut) : ' + surBarre.length + ' — rangés à part');
  fs.writeFileSync(path.join(__dirname, 'audit-pixel-' + PLAT + (TEL ? '-tel' : '') + '-' + THEMES.join('') + '.json'), JSON.stringify(R));
  S.fermer(); process.exit(0);
})().catch(e => { console.error('AUDIT MORT :', e && e.stack || e); process.exit(2); });
