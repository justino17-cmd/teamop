/* ══ « CHAQUE TECHNICIEN ET SA COULEUR, RÉFÉRENCÉS SUR LES INTERVENTIONS, SUR LES CARTES » (v757) ══════════════
   Justin, 26 septembre 2026 : « ça évite de se perdre quand on associe plusieurs techniciens sur la même carte ».
   Ce qui a été mesuré avant d'écrire une ligne (scratchpad/palette-techs.js, et le recensement des écrans) :
     · la couleur automatique venait d'un hachage sur seize cases qui n'étaient que HUIT teintes en deux nuances :
       à 5 techniciens, deux avaient la même couleur une fois sur deux ;
     · le Planning général et le Tableau de bord ne montraient une intervention partagée QUE dans la ligne du
       premier technicien : le second y paraissait libre ;
     · la liste des Interventions écrivait les noms en gris, sans couleur ; « Ma journée » et la vue Semaine des
       Interventions ne disaient jamais qu'un collègue était sur la même intervention ; la fiche montrait un carré
       à la teinte de l'application pour chacun ; les pastilles d'en-tête du planning sortaient à la teinte.
   Cette sonde joue les écrans dans la VRAIE page, avec une équipe de quatre (dont une couleur choisie à la main) et
   quatre interventions (partagée à deux, seule, non assignée, partagée à trois). Elle lit le style CALCULÉ et, pour
   les disques, les PIXELS — une couleur écrite en ligne peut être écrasée par la feuille (la leçon de `.avatar`).
   Usage : node scratchpad/sonde-couleurs-techs.js           (la bêta du dépôt)
           SOURCE=/chemin/beta.html node scratchpad/…         (une autre copie : la contre-épreuve)
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
const { decoder } = require('./png.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hexRgb = h => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16));
const proche = (a, b, tol) => Array.isArray(a) && Array.isArray(b) && a.every((v, i) => Math.abs(v - b[i]) <= (tol || 18));

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const { c, ev } = S;
  const trames = () => ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  /* la couleur AU PIXEL d'un point d'un élément (fractions de sa largeur et de sa hauteur) */
  const pixel = async (sel, fx, fy, idx) => {
    const r = await ev(`const e=document.querySelectorAll(${JSON.stringify(sel)})[${idx || 0}]; if(!e) return null; e.scrollIntoView({block:'center',inline:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect();
      return {x:b.left+window.scrollX,y:b.top+window.scrollY,w:b.width,h:b.height};`);
    if (!r || !r.w) return null;
    const cap = await c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
    const img = decoder(Buffer.from(cap.data, 'base64'));
    const x = Math.min(img.w - 1, Math.floor(img.w * fx)), y = Math.min(img.h - 1, Math.floor(img.h * fy)), i = (y * img.w + x) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  };

  try {
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    /* l'équipe : des identifiants au format d'uid() (8 caractères de date + 5), créés à des jours différents */
    const E = await ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      const id=(j,s)=>Date.parse(j).toString(36)+s;
      const T={leo:id('2025-01-10','leoaa'), karim:id('2025-02-11','karim'), sofia:id('2025-03-12','sofia'), nina:id('2025-04-13','ninaa')};
      db.techniciens=[{id:T.leo,nom:'Léo Martin'},{id:T.karim,nom:'Karim Benali'},{id:T.sofia,nom:'Sofia Rossi'},{id:T.nina,nom:'Nina Dubois',couleur:'#2563EB'}];
      const cid=id('2025-05-01','clien'); db.clients=[{id:cid,nom:'Boulangerie du Port',adresse:'2 quai Est',ville:'La Rochelle',lat:46.155,lng:-1.15}];
      const auj=todayISO(), I={a:id('2025-06-01','intaa'), b:id('2025-06-02','intbb'), c:id('2025-06-03','intcc'), d:id('2025-06-04','intdd')};
      db.interventions=[
        {id:I.a,num:'INT-0001',titre:'Dératisation partagée',clientId:cid,date:auj,heure:'09:00',duree:90,statut:'planifiee',techId:T.leo,techIds:[T.leo,T.karim],type:'Dératisation'},
        {id:I.b,num:'INT-0002',titre:'Contrôle seule',clientId:cid,date:auj,heure:'11:00',duree:60,statut:'planifiee',techId:T.sofia,techIds:[T.sofia],type:'Contrôle'},
        {id:I.c,num:'INT-0003',titre:'Visite à répartir',clientId:cid,date:auj,heure:'14:00',duree:60,statut:'planifiee',techId:'',techIds:[],type:'Visite'},
        {id:I.d,num:'INT-0004',titre:'Traitement à trois',clientId:cid,date:auj,heure:'15:30',duree:60,statut:'planifiee',techId:T.karim,techIds:[T.karim,T.leo,T.sofia],type:'Désinsectisation'}];
      if(!db.users.some(u=>u.id==='beta-justin')) db.users.push({id:'beta-justin',prenom:'Justin',nom:'Bernard',login:'justin',role:'admin',actif:true,essai:true});
      if(!db.users.some(u=>u.id==='u-karim')) db.users.push({id:'u-karim',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:T.karim,actif:true});
      save();
      currentUser=db.users.find(u=>u.id==='beta-justin');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>{ localStorage.setItem('elanB_'+k+'beta-justin','1'); localStorage.setItem('elanB_'+k+'u-karim','1'); }); }catch(e){}
      enterApp(currentUser);
      const col={}; Object.keys(T).forEach(k=>col[k]=techColor(T[k]));
      return {T,I,col,version:APP_VERSION,pal:(typeof TECH_PALETTE16!=='undefined'?TECH_PALETTE16:[])};`);
    await dormir(1200);
    const { T, I, col } = E;
    console.log('\n══ ' + E.version + ' · couleurs : ' + Object.entries(col).map(([k, v]) => k + ' ' + v).join(' · ') + ' ══');

    console.log('\n── A. chacun sa couleur, aucune en double ──');
    vrai('⛔ les quatre techniciens ont quatre couleurs DIFFÉRENTES', new Set(Object.values(col).map(x => String(x).toUpperCase())).size === 4, col);
    vrai('la couleur choisie à la main gagne (Nina : bleu #2563EB)', String(col.nina).toUpperCase() === '#2563EB', col.nina);
    vrai('… et aucun automatique ne la reprend', ['leo', 'karim', 'sofia'].every(k => String(col[k]).toUpperCase() !== '#2563EB'), col);
    vrai('les automatiques sont pris dans le premier rang de la palette (les huit plus distinctes)',
      ['leo', 'karim', 'sofia'].every(k => E.pal.slice(0, 8).includes(String(col[k]).toUpperCase())), col);

    console.log('\n── B. la liste des Interventions : chaque technicien, avec sa couleur ──');
    await ev(`intView='liste'; go('interventions'); return 1;`); await dormir(700);
    const B = await ev(`const r=[...document.querySelectorAll('#content .pl-row.int-l')].find(x=>x.textContent.includes('Dératisation partagée'));
      if(!r) return null; const p=[...r.querySelectorAll('.tpu-p')];
      return {n:p.length, fonds:p.map(e=>getComputedStyle(e).backgroundColor), noms:[...r.querySelectorAll('.tpu-n')].map(e=>e.textContent.trim()),
        nonAss:(()=>{ const r3=[...document.querySelectorAll('#content .pl-row.int-l')].find(x=>x.textContent.includes('Visite à répartir')); return r3?r3.querySelector('.tpu')&&r3.querySelector('.tpu').textContent.trim():null; })()};`);
    const rgb = h => 'rgb(' + hexRgb(h).join(', ') + ')';
    vrai('population : la ligne de l’intervention partagée est là', !!B, B);
    vrai('⛔ elle porte DEUX disques, un par technicien', B && B.n === 2, B);
    vrai('⛔ … chacun à SA couleur (style calculé : Léo puis Karim)', B && B.fonds[0] === rgb(col.leo) && B.fonds[1] === rgb(col.karim), B && { vu: B.fonds, attendu: [rgb(col.leo), rgb(col.karim)] });
    vrai('… et chacun nommé', B && B.noms.join('|') === 'Léo Martin|Karim Benali', B && B.noms);
    vrai('l’intervention sans technicien le dit (« Non assigné »)', B && B.nonAss === '?Non assigné', B && B.nonAss);
    const idxB = await ev(`const all=[...document.querySelectorAll('#content .pl-row.int-l .tpu-p')]; const r=[...document.querySelectorAll('#content .pl-row.int-l')].find(x=>x.textContent.includes('Dératisation partagée')); return all.indexOf(r.querySelector('.tpu-p'));`);
    const pxB = await pixel('#content .pl-row.int-l .tpu-p', 0.5, 0.2, idxB);
    vrai('⛔ au PIXEL, le premier disque est bien peint à la couleur de Léo', proche(pxB, hexRgb(col.leo), 30), { pixel: pxB, attendu: hexRgb(col.leo) });

    console.log('\n── C. la fiche de l’intervention ──');
    await ev(`detailIntervention(${JSON.stringify(I.a)}); return 1;`); await dormir(700);
    const C = await ev(`const p=[...document.querySelectorAll('.tpu-p.g')]; return {n:p.length, fonds:p.map(e=>getComputedStyle(e).backgroundColor),
      acc:document.querySelectorAll('#overlay [style*="background:var(--acc);color:var(--on-acc)"]').length};`);
    vrai('⛔ la fiche montre un disque par technicien, à sa couleur (plus un carré à la teinte pour tous)', C.n === 2 && C.fonds[0] === rgb(col.leo) && C.fonds[1] === rgb(col.karim), C);
    await ev(`closeModal(true); return 1;`); await dormir(300);

    console.log('\n── D. le Planning général : l’intervention partagée est dans la ligne de CHACUN ──');
    await ev(`pgFocus=''; try{ pgFiltre='tout'; }catch(e){} go('planningGeneral'); return 1;`); await dormir(900);
    const D = await ev(`const g=document.querySelector('.pg-gr'); if(!g) return null; const out={}; let qui='';
      [...g.children].forEach(e=>{ if(e.classList.contains('pg-pers')){ qui=(e.querySelector('b')||{}).textContent||''; out[qui]=out[qui]||[]; }
        if(e.classList.contains('pg-cel')) e.querySelectorAll('.pg-pt').forEach(p=>out[qui].push({t:p.title, cc:p.style.getPropertyValue('--cc').trim(), part:p.classList.contains('pt-part'), img:getComputedStyle(p).backgroundImage})); });
      return out;`);
    const aDe = n => ((D || {})[n] || []).filter(x => /Dératisation partagée/.test(x.t));
    vrai('population : la grille du Planning général est rendue', !!D && Object.keys(D).length >= 4, D && Object.keys(D));
    vrai('la ligne de Léo (premier technicien) a l’intervention partagée', aDe('Léo Martin').length === 1, D && D['Léo Martin']);
    vrai('⛔⛔ la ligne de KARIM (second) l’a AUSSI — il n’y paraît plus libre', aDe('Karim Benali').length === 1, D && D['Karim Benali']);
    const dk = aDe('Karim Benali')[0] || {};
    vrai('⛔ dans la ligne de Karim, la case est à la couleur de KARIM', String(dk.cc).toUpperCase() === String(col.karim).toUpperCase(), dk);
    vrai('⛔ … et porte en bout la couleur de Léo (partagée)', dk.part && dk.img.includes('rgb(' + hexRgb(col.leo).join(', ') + ')'), dk);
    vrai('l’intervention à trois est dans les TROIS lignes', ['Léo Martin', 'Karim Benali', 'Sofia Rossi'].every(n => ((D || {})[n] || []).some(x => /Traitement à trois/.test(x.t))), D);
    vrai('la non assignée reste dans la ligne « Non assigné », et seulement là',
      ((D || {})['Non assigné'] || []).some(x => /Visite à répartir/.test(x.t)) && ['Léo Martin', 'Karim Benali', 'Sofia Rossi', 'Nina Dubois'].every(n => !((D || {})[n] || []).some(x => /Visite à répartir/.test(x.t))), D && D['Non assigné']);
    /* au pixel : le bout droit de la case de Karim est de la couleur de Léo, le reste de celle de Karim */
    const idxK = await ev(`const all=[...document.querySelectorAll('.pg-pt')]; return all.findIndex(p=>p.title.includes('Dératisation partagée')&&p.style.getPropertyValue('--cc').trim().toUpperCase()===${JSON.stringify(String(col.karim).toUpperCase())});`);
    const pxG = await pixel('.pg-pt', 0.2, 0.5, idxK), pxDr = await pixel('.pg-pt', 0.97, 0.5, idxK);
    vrai('⛔ au PIXEL : la case de Karim est peinte à sa couleur…', proche(pxG, hexRgb(col.karim), 30), { pixel: pxG, attendu: hexRgb(col.karim) });
    vrai('⛔ … et son bout droit à celle de Léo', proche(pxDr, hexRgb(col.leo), 30), { pixel: pxDr, attendu: hexRgb(col.leo) });

    console.log('\n── E. le Tableau de bord : même règle ──');
    await ev(`try{ tdbPorteeSet('jour'); }catch(e){} go('dashboard'); return 1;`); await dormir(1000);
    const Ed = await ev(`const g=document.querySelector('.tdb-gr')||document.querySelector('.tdb-tec')&&document.querySelector('.tdb-tec').parentElement; if(!g) return null;
      const out={}; let qui=''; [...g.children].forEach(e=>{ if(e.classList.contains('tdb-tec')){ qui=(e.querySelector('b')||{}).textContent||''; out[qui]=out[qui]||[]; }
        if(e.classList.contains('tdb-cel')) e.querySelectorAll('.tdb-pc').forEach(p=>out[qui].push({t:p.title, cc:p.style.getPropertyValue('--cc').trim(), autres:[...p.querySelectorAll('.tpu-p')].map(x=>getComputedStyle(x).backgroundColor)})); });
      return out;`);
    const eK = ((Ed || {})['Karim Benali'] || []).filter(x => /Dératisation partagée/.test(x.t));
    vrai('population : le planning du tableau de bord est rendu', !!Ed && Object.keys(Ed).length >= 2, Ed && Object.keys(Ed));
    vrai('⛔⛔ Karim voit l’intervention partagée dans SA ligne du tableau de bord', eK.length === 1, Ed);
    vrai('⛔ … à sa couleur, avec le disque de Léo', eK[0] && String(eK[0].cc).toUpperCase() === String(col.karim).toUpperCase() && eK[0].autres[0] === rgb(col.leo), eK[0]);

    console.log('\n── F. le Planning, vues Semaine et Jour : la carte dans la colonne de chacun ──');
    /* le filtre « qui afficher » du planning se calcule UNE fois, au premier affichage : les techniciens posés par la
       sonde après coup n'y seraient pas — on le fait recalculer, comme au chargement d'une vraie journée */
    await ev(`planMode='semaine'; planWeekRef=todayISO(); planSel=todayISO(); planTechM=null; go('planning'); return 1;`); await dormir(1100);
    const F = await ev(`const cartes=[...document.querySelectorAll('.plg-mh[data-int=${JSON.stringify(I.a)}]')];
      const heads=[...document.querySelectorAll('.plg-tech .avatar')].map(a=>({cls:a.className, bg:getComputedStyle(a).backgroundColor}));
      return {n:cartes.length, lignes:cartes.map(e=>{ const cel=e.closest('[data-drop]'); return {ligne:cel&&cel.getAttribute('data-drop'), cc:e.style.getPropertyValue('--cc').trim(), autres:[...e.querySelectorAll('.tpu-p')].map(x=>getComputedStyle(x).backgroundColor)}; }), heads,
        acc:getComputedStyle(document.documentElement).getPropertyValue('--acc').trim()};`);
    const fK = F.lignes.find(x => (x.ligne || '').endsWith(':' + T.karim));
    vrai('Semaine : la carte partagée est dans la ligne de Léo ET dans celle de Karim', F.n === 2 && !!fK, F);
    vrai('⛔ Semaine : dans la ligne de Karim, la carte est à la couleur de Karim et porte le disque de Léo',
      fK && String(fK.cc).toUpperCase() === String(col.karim).toUpperCase() && fK.autres.length === 1 && fK.autres[0] === rgb(col.leo), fK);
    vrai('⛔ les pastilles d’en-tête du planning portent la couleur de CHAQUE personne (plus toutes à la teinte)',
      F.heads.length >= 4 && F.heads.every(h => /av-tc/.test(h.cls)) && new Set(F.heads.map(h => h.bg)).size >= 4, F.heads);
    await ev(`planMode='jour'; planSel=todayISO(); go('planning'); return 1;`); await dormir(1100);
    const J = await ev(`return [...document.querySelectorAll('.plt-blk')].filter(b=>b.title.includes('Dératisation partagée')).map(b=>{ const col=b.closest('[data-drop]');
      return {col:col&&col.getAttribute('data-drop'), bord:getComputedStyle(b).borderLeftColor, autres:[...b.querySelectorAll('.tpu-p')].map(x=>getComputedStyle(x).backgroundColor)}; });`);
    const jK = J.find(x => (x.col || '').includes(':' + T.karim + ':'));
    vrai('Jour : la carte partagée est dans les DEUX colonnes', J.length === 2 && !!jK, J);
    vrai('⛔ Jour : dans la colonne de Karim, bord à sa couleur, disque de Léo', jK && jK.bord === rgb(col.karim) && jK.autres[0] === rgb(col.leo), jK);

    console.log('\n── G. « Ma journée » de Karim : il sait qu’il n’y va pas seul ──');
    await ev(`currentUser=db.users.find(u=>u.id==='u-karim'); enterApp(currentUser); return 1;`); await dormir(1200);
    await ev(`intView='liste'; go('interventions'); return 1;`); await dormir(800);
    const G = await ev(`const cartes=[...document.querySelectorAll('#content .card')].filter(x=>x.querySelector('.mj-l'));
      const de=t=>{ const k=cartes.find(x=>x.textContent.includes(t)); if(!k) return null; const a=k.querySelector('.mj-avec');
        return a?{txt:a.textContent.replace(/\\s+/g,' ').trim(), fonds:[...a.querySelectorAll('.tpu-p')].map(x=>getComputedStyle(x).backgroundColor)}:{txt:''}; };
      return {n:cartes.length, a:de('Dératisation partagée'), d:de('Traitement à trois'), seul:de('Contrôle seule')};`);
    vrai('population : « Ma journée » de Karim montre ses interventions', G.n >= 2, G);
    vrai('⛔⛔ sur l’intervention partagée : « Avec Léo Martin », à la couleur de Léo', G.a && /Avec\s*L\S*\s*Léo Martin/.test(G.a.txt) && G.a.fonds[0] === rgb(col.leo), G.a);
    vrai('… sur celle à trois : Léo ET Sofia', G.d && /Léo Martin/.test(G.d.txt) && /Sofia Rossi/.test(G.d.txt) && G.d.fonds.length === 2, G.d);
    vrai('… et sur une intervention qui n’est pas à lui, rien (elle n’est pas dans SA journée)', G.seul === null, G.seul);
    await ev(`currentUser=db.users.find(u=>u.id==='beta-justin'); enterApp(currentUser); return 1;`); await dormir(1000);

    console.log('\n── H. choisir la couleur d’un technicien : des pastilles, et qui porte quoi ──');
    await ev(`formTech(${JSON.stringify(T.karim)}); return 1;`); await dormir(600);
    const H = await ev(`const o=[...document.querySelectorAll('#overlay .tcc .tcc-o')]; if(!o.length) return null;
      const bleu=o.find(x=>x.querySelector('input').value==='#2563EB');
      return {n:o.length, auto:o[0].querySelector('.tcc-p').style.getPropertyValue('--tc').trim(), autoCoche:o[0].querySelector('input').checked,
        bleuPrise:!!bleu&&bleu.querySelector('.tcc-p').classList.contains('prise'), bleuIni:bleu&&bleu.querySelector('.tcc-p').textContent.trim(),
        taille:(()=>{ const b=o[1].getBoundingClientRect(); return [Math.round(b.width),Math.round(b.height)]; })(),
        dit:(document.querySelector('#overlay .tcc-dit')||{}).textContent||''};`);
    vrai('population : le choix de couleur est dans la fiche du technicien', !!H, H);
    vrai('seize couleurs + « Auto »', H && H.n === 17, H && H.n);
    vrai('« Auto » est coché et MONTRE la couleur qu’il a aujourd’hui (celle de Karim)', H && H.autoCoche && String(H.auto).toUpperCase() === String(col.karim).toUpperCase(), H);
    vrai('le bleu, choisi pour Nina, porte ses initiales', H && H.bleuPrise && H.bleuIni === 'ND', H);
    vrai('chaque pastille se touche sur 44 × 44 px', H && H.taille[0] >= 44 && H.taille[1] >= 44, H && H.taille);
    await ev(`const i=[...document.querySelectorAll('#overlay .tcc input')].find(x=>x.value==='#2563EB'); i.checked=true; i.dispatchEvent(new Event('change',{bubbles:true})); return 1;`);
    const H2 = await ev(`return (document.querySelector('#overlay .tcc-dit')||{}).textContent||'';`);
    vrai('⛔ choisir le bleu de Nina le DIT : « déjà choisie pour Nina Dubois »', /déjà choisie pour Nina Dubois/.test(H2), H2);
    await ev(`closeModal(true); return 1;`); await dormir(300);

    console.log('\n── I. la nuit, et au téléphone ──');
    await ev(`try{ localStorage.setItem('elanB_theme','dark'); }catch(e){} try{ document.documentElement.setAttribute('data-theme','dark'); applyTheme(); }catch(e){} intView='liste'; go('interventions'); return 1;`); await dormir(800);
    const N = await ev(`const r=[...document.querySelectorAll('#content .pl-row.int-l')].find(x=>x.textContent.includes('Dératisation partagée')); const p=r&&r.querySelector('.tpu-p');
      return {theme:document.documentElement.getAttribute('data-theme'), fond:p&&getComputedStyle(p).backgroundColor, anneau:p&&getComputedStyle(p).boxShadow};`);
    vrai('de nuit, le disque garde la couleur de Léo, avec son anneau clair', N.theme === 'dark' && N.fond === rgb(col.leo) && /255, 255, 255/.test(N.anneau || ''), N);
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await ev(`go('interventions'); return 1;`); await dormir(900);
    const P = await ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; await new Promise(r=>setTimeout(r,700));
      window.scrollTo(9999,window.scrollY); const sx=window.scrollX; window.scrollTo(0,window.scrollY);
      const r=[...document.querySelectorAll('#content .pl-row.int-l')].find(x=>x.textContent.includes('Traitement à trois')); const t=r&&r.querySelector('.int-techs');
      const b=t&&t.getBoundingClientRect(), rb=r&&r.getBoundingClientRect();
      return {sx, n:r?r.querySelectorAll('.tpu-p').length:0, dedans:!!(b&&rb&&b.right<=rb.right+1)};`);
    vrai('au téléphone (390 px) : trois disques sur la ligne à trois, rien ne dépasse de la ligne', P.n === 3 && P.dedans, P);
    vrai('… et la page ne glisse pas de côté', P.sx === 0, P);
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await ev(`try{ localStorage.setItem('elanB_theme','light'); }catch(e){} try{ document.documentElement.setAttribute('data-theme','light'); applyTheme(); }catch(e){} return 1;`);

    console.log('\n── K. déplacer une intervention partagée : seul le technicien de la ligne change ──');
    /* le VRAI glisser-déposer de la vue Semaine (dragstart sur la carte de la ligne de Karim, drop dans la case de
       Sofia), puis le panneau « Déplacer » — les deux portes qui passent par planPoserEquipe */
    await ev(`planMode='semaine'; planWeekRef=todayISO(); planSel=todayISO(); planTechM=null; go('planning'); return 1;`); await dormir(1100);
    const deposer = async (intId, de, vers) => ev(`const auj=todayISO();
      const carte=[...document.querySelectorAll('.plg-mh')].find(e=>e.getAttribute('data-int')===${JSON.stringify(intId)}&&(e.closest('[data-drop]')||{getAttribute:()=>''}).getAttribute('data-drop').endsWith(':'+${JSON.stringify(de)}));
      const cible=document.querySelector('[data-drop="cell:'+auj+':'+${JSON.stringify(vers)}+'"]');
      if(!carte||!cible) return {trouve:false,carte:!!carte,cible:!!cible};
      const dt=new DataTransfer();
      carte.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:dt}));
      const r=cible.getBoundingClientRect(), o={bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.left+12,clientY:r.top+12};
      cible.dispatchEvent(new DragEvent('dragover',o)); cible.dispatchEvent(new DragEvent('drop',o));
      try{ carte.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:dt})); }catch(e){}
      const i=db.interventions.find(x=>x.id===${JSON.stringify(intId)});
      return {trouve:true,de:window._planDragDe,techIds:(i.techIds||[]).slice(),techId:i.techId};`);
    const k1 = await deposer(I.a, T.karim, T.sofia);
    vrai('population : la carte partagée est dans la ligne de Karim, la case de Sofia existe', k1.trouve, k1);
    vrai('le geste part bien de la ligne de KARIM', k1.de === T.karim, k1);
    vrai('⛔⛔ glissée de la ligne de Karim à celle de Sofia : Karim est remplacé par Sofia, LÉO RESTE', JSON.stringify(k1.techIds) === JSON.stringify([T.leo, T.sofia]) && k1.techId === T.leo, k1);
    await ev(`go('planning'); return 1;`); await dormir(900);
    const k2 = await deposer(I.d, T.karim, T.leo);
    vrai('⛔ glissée vers la ligne de quelqu’un DÉJÀ sur l’intervention : l’équipe ne change pas', k2.trouve && JSON.stringify(k2.techIds) === JSON.stringify([T.karim, T.leo, T.sofia]), k2);
    /* le panneau « Déplacer », ouvert depuis la ligne de Karim */
    await ev(`window._planCtxDe=${JSON.stringify(T.karim)}; planDeplacerModal(${JSON.stringify(I.d)}); planDeplacerSet('tech',${JSON.stringify(T.nina)}); return 1;`); await dormir(500);
    const k3 = await ev(`const a=document.querySelector('#overlay .dep-avec'); return {avec:a?a.textContent.replace(/\\s+/g,' ').trim():''};`);
    vrai('⛔ le panneau « Déplacer » dit qui RESTE sur l’intervention (Léo et Sofia)', /Léo Martin/.test(k3.avec) && /Sofia Rossi/.test(k3.avec) && /restent/.test(k3.avec) && !/Karim/.test(k3.avec), k3);
    await ev(`planDeplacerValider(); return 1;`); await dormir(500);
    const k4 = await ev(`const i=db.interventions.find(x=>x.id===${JSON.stringify(I.d)}); return {techIds:(i.techIds||[]).slice(),techId:i.techId};`);
    vrai('⛔⛔ validé : Karim remplacé par Nina, Léo et Sofia gardés', JSON.stringify(k4.techIds) === JSON.stringify([T.nina, T.leo, T.sofia]) && k4.techId === T.nina, k4);
    await ev(`try{ window._planCtxDe=null; closeModal(true); }catch(e){} return 1;`);

    console.log('\n── J. aucune erreur de script ──');
    vrai('aucune exception pendant tout le parcours', S.exceptions.length === 0, S.exceptions.slice(0, 5));
  } catch (e) {
    ko++; console.log('  ✗ la sonde s’est arrêtée : ' + (e && e.message));
  } finally {
    console.log(`\n════ sonde-couleurs-techs : ${ok} ✓ ${ko} ✗ ════`);
    try { S.fermer(); } catch (e) {}
    process.exit(ko ? 1 : 0);
  }
})();
