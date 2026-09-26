/* Captures avant / après de la v757 (« chaque technicien et sa couleur ») pour Justin.
   Même équipe et mêmes interventions que scratchpad/sonde-couleurs-techs.js, jouées sur deux copies de la bêta
   (AVANT=la v756, APRÈS=la bêta du dépôt), puis assemblées côte à côte par le même navigateur.
   Usage : AVANT=/chemin/beta-756.html SORTIE=/dossier node scratchpad/captures-couleurs-techs.js
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('./pilote.js');
const SORTIE = process.env.SORTIE || '/tmp';

const PREPARER = `window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
  const id=(j,s)=>Date.parse(j).toString(36)+s;
  const T={leo:id('2025-01-10','leoaa'), karim:id('2025-02-11','karim'), sofia:id('2025-03-12','sofia'), nina:id('2025-04-13','ninaa')};
  db.techniciens=[{id:T.leo,nom:'Léo Martin'},{id:T.karim,nom:'Karim Benali'},{id:T.sofia,nom:'Sofia Rossi'},{id:T.nina,nom:'Nina Dubois',couleur:'#2563EB'}];
  const cid=id('2025-05-01','clien'); db.clients=[{id:cid,nom:'Boulangerie du Port',adresse:'2 quai Est',ville:'La Rochelle',lat:46.155,lng:-1.15}];
  const auj=todayISO();
  db.interventions=[
    {id:id('2025-06-01','intaa'),num:'INT-0001',titre:'Dératisation partagée',clientId:cid,date:auj,heure:'09:00',duree:90,statut:'planifiee',techId:T.leo,techIds:[T.leo,T.karim],type:'Dératisation'},
    {id:id('2025-06-02','intbb'),num:'INT-0002',titre:'Contrôle seule',clientId:cid,date:auj,heure:'11:00',duree:60,statut:'planifiee',techId:T.sofia,techIds:[T.sofia],type:'Contrôle'},
    {id:id('2025-06-03','intcc'),num:'INT-0003',titre:'Visite à répartir',clientId:cid,date:auj,heure:'14:00',duree:60,statut:'planifiee',techId:'',techIds:[],type:'Visite'},
    {id:id('2025-06-04','intdd'),num:'INT-0004',titre:'Traitement à trois',clientId:cid,date:auj,heure:'15:30',duree:60,statut:'planifiee',techId:T.karim,techIds:[T.karim,T.leo,T.sofia],type:'Désinsectisation'}];
  if(!db.users.some(u=>u.id==='beta-justin')) db.users.push({id:'beta-justin',prenom:'Justin',nom:'Bernard',login:'justin',role:'admin',actif:true,essai:true});
  if(!db.users.some(u=>u.id==='u-karim')) db.users.push({id:'u-karim',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:T.karim,actif:true});
  save(); currentUser=db.users.find(u=>u.id==='beta-justin');
  try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>{ localStorage.setItem('elanB_'+k+'beta-justin','1'); localStorage.setItem('elanB_'+k+'u-karim','1'); }); }catch(e){}
  enterApp(currentUser); window.__T=T; return 1;`;

async function capturer(S, sel, marge) {
  const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'start'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect();
    return {x:b.left+window.scrollX,y:b.top+window.scrollY,w:b.width,h:b.height};`);
  if (!r || !r.w) return null;
  const m = marge || 0;
  const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    clip: { x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), width: r.w + 2 * m, height: Math.min(r.h + 2 * m, 1400), scale: 1 } });
  return cap.data;
}

async function capturerChamp(S, motif) {
  const r = await S.ev(`const b=document.getElementById('fdr-banner'); if(b) b.style.display='none';
    const m=document.querySelector('#overlay .modal'); if(!m) return null;
    const lab=[...m.querySelectorAll('.field > label')].find(l=>${motif}.test(l.textContent.trim())); if(!lab) return null;
    const f=lab.parentElement; f.scrollIntoView({block:'center'});
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void f.offsetWidth; const q=f.getBoundingClientRect();
    const dessus=document.elementFromPoint(q.left+q.width/2, q.top+q.height/2);
    return {x:q.left+scrollX,y:q.top+scrollY,w:q.width,h:q.height,libre:!!dessus&&f.contains(dessus)};`);
  if (!r || !r.w) return null;
  if (!r.libre) throw new Error('le champ de la couleur est recouvert au moment de la capture');
  const m = 16;
  const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), width: r.w + 2 * m, height: r.h + 2 * m, scale: 1 } });
  return cap.data;
}

async function jouer(source, nom) {
  const S = await ouvrir(source ? { source } : {});
  const imgs = {};
  try {
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });
    await S.ev(PREPARER); await dormir(1200);
    await S.ev(`pgFocus=''; go('planningGeneral'); return 1;`); await dormir(1000);
    imgs.general = await capturer(S, '.pg-wrap', 0);
    await S.ev(`intView='liste'; go('interventions'); return 1;`); await dormir(900);
    imgs.liste = await capturer(S, '#content', 0);
    await S.ev(`planMode='jour'; planSel=todayISO(); planTechM=null; go('planning'); return 1;`); await dormir(1100);
    imgs.jour = await capturer(S, '.plt-wrap, .plt, #content', 0);
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await S.ev(`currentUser=db.users.find(u=>u.id==='u-karim'); enterApp(currentUser); return 1;`); await dormir(1200);
    await S.ev(`intView='liste'; go('interventions'); return 1;`); await dormir(900);
    imgs.journee = await capturer(S, '#content', 0);
    /* la fiche se lit au BUREAU, et seulement le champ de la couleur : au téléphone, le rappel « Ta journée »
       de Karim couvrait la palette, et la fenêtre (fixe) laissait voir la page sous elle dans la capture */
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });
    await S.ev(`currentUser=db.users.find(u=>u.id==='beta-justin'); enterApp(currentUser); return 1;`); await dormir(1000);
    await S.ev(`formTech(window.__T.karim); return 1;`); await dormir(700);
    imgs.choix = await capturerChamp(S, /^Couleur/);
  } finally { S.fermer(); }
  console.log(nom + ' : ' + Object.entries(imgs).map(([k, v]) => k + (v ? '' : ' (absent)')).join(', '));
  return imgs;
}

(async () => {
  const avant = await jouer(process.env.AVANT, 'avant');
  const apres = await jouer(null, 'après');
  /* l'assemblage côte à côte, rendu par le même navigateur */
  const S = await ouvrir({});
  try {
    const titres = { general: 'Planning général — Karim est sur l’intervention de Léo', liste: 'Interventions — la liste', jour: 'Planning, vue Jour',
      journee: '« Ma journée » de Karim (téléphone)', choix: 'Fiche technicien — la couleur' };
    for (const k of Object.keys(titres)) {
      const a = avant[k], b = apres[k];
      if (!b) continue;
      const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f2f2f7;font:600 22px -apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">
        <div style="padding:22px 26px 8px;font-size:26px;font-weight:800">${titres[k]}</div>
        <div style="display:flex;gap:26px;padding:10px 26px 26px;align-items:flex-start">
          <figure style="margin:0;flex:1"><figcaption style="padding:6px 0 10px;color:#86868b">Avant (v756)</figcaption>${a ? `<img style="max-width:100%;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12)" src="data:image/png;base64,${a}">` : '<i>(cet écran n’existait pas)</i>'}</figure>
          <figure style="margin:0;flex:1"><figcaption style="padding:6px 0 10px;color:#1E7A4E">Après (v758)</figcaption><img style="max-width:100%;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12)" src="data:image/png;base64,${b}"></figure>
        </div></body>`;
      const f = path.join(SORTIE, 'couleurs-' + k + '.html'); fs.writeFileSync(f, html);
      await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1800, height: 1200, deviceScaleFactor: 1, mobile: false });
      /* ⛔ PAS d'adresse data: — Chromium refuse une adresse de plus de 2 Mo SANS RIEN DIRE : la page d'avant
         reste affichée, et la capture de « Planning, vue Jour » (2,5 Mo en base64) sortait identique, octet
         pour octet, à celle de la liste. On pose le document directement, puis on PROUVE qu'il est là. */
      await S.c.envoyer('Page.navigate', { url: 'about:blank' }); await dormir(300);
      const ft = await S.c.envoyer('Page.getFrameTree', {});
      await S.c.envoyer('Page.setDocumentContent', { frameId: ft.frameTree.frame.id, html }); await dormir(900);
      const preuve = await S.ev(`const t=document.querySelector('div'); const im=[...document.images];
        return {titre:t?t.textContent.trim():'', images:im.length, chargees:im.filter(i=>i.complete&&i.naturalWidth>0).length};`);
      if (preuve.titre !== titres[k] || preuve.chargees !== preuve.images || !preuve.images)
        throw new Error('assemblage « ' + k + ' » non affiché : ' + JSON.stringify(preuve));
      const h = await S.ev(`return document.body.scrollHeight;`);
      const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1800, height: Math.min(h, 4000), scale: 1 } });
      fs.writeFileSync(path.join(SORTIE, 'couleurs-' + k + '.png'), Buffer.from(cap.data, 'base64'));
      console.log('  → ' + path.join(SORTIE, 'couleurs-' + k + '.png'));
    }
  } finally { S.fermer(); }
  /* deux captures identiques = une capture fausse (c'est ce qui a trahi l'adresse data: trop longue) */
  const vus = {};
  for (const k of ['general', 'liste', 'jour', 'journee', 'choix']) {
    const f = path.join(SORTIE, 'couleurs-' + k + '.png'); if (!fs.existsSync(f)) continue;
    const e = require('crypto').createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    if (vus[e]) throw new Error('captures identiques : ' + vus[e] + ' et ' + k);
    vus[e] = k;
  }
  console.log('captures toutes distinctes : ' + Object.keys(vus).length);
})().catch(e => { console.error(e); process.exit(2); });
