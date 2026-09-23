/* ══ SONDE — LE SCANNER D'ÉTIQUETTE, DE LA CAMÉRA AU STOCK DE LA BOX ═════════════════════════════
   Justin, 23 septembre 2026 : « que ça fasse un scan d'étiquette à la place des codes-barres […]
   ils pourront scanner, ajouter ou déduire ; si tu peux me montrer un exemple ».
   Dans une vraie page (bêta locale), avec le VRAI moteur de lecture (Tesseract 5.1.1, fichiers
   servis en local — le conteneur n'a pas de réseau pour le navigateur) et une CAMÉRA SIMULÉE :
   `getUserMedia` rend le flux d'un canevas où l'on dessine une étiquette comme la verrait un
   téléphone — penchée, un peu floue, bruitée, avec des mentions légales AUTOUR du nom (le cadre ne
   doit lire que le nom). Le catalogue est le pack 3D (160 fiches, beaucoup de sœurs : MAGNUM GEL
   CAFARDS / FOURMIS / OPTIMUM, DOBOL 20 g / 100 g…), comme chez ELAN.
   On joue : lire → choisir → ajouter dans la box ; deux formats voisins ; une étiquette inconnue ;
   retirer (la question « pour qui ? » de la box prend la place du scanner, caméra coupée) ; un
   technicien soumis au DR (la quantité part dans SA liste, le stock ne bouge pas) ; le Stock (on
   choisit la box) ; Produits (le stock du catalogue). Et des captures, pour l'exemple.
   Fichiers du moteur (hors dépôt, 4,8 Mo) : OCR_DIR, par défaut le scratchpad de session —
     curl -o tesseract.min.js https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js
     curl -o worker.min.js    https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js
     curl -o core/tesseract-core-simd-lstm.wasm.js https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js
     curl -o lang/fra.traineddata.gz https://cdn.jsdelivr.net/npm/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz
   ⛔ SOURCE=<bêta d'avant> : contre-épreuve. ⛔ Bêta uniquement, 127.0.0.1 uniquement. */
const fs = require('fs'), path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
const OCR_DIR = process.env.OCR_DIR || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/ocr';
const CAP = process.env.CAP || '';
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d).slice(0, 400))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

(async () => {
  if (!fs.existsSync(path.join(OCR_DIR, 'worker.min.js'))) { console.error('moteur absent de ' + OCR_DIR + ' — voir l’en-tête'); process.exit(2); }
  const S = await ouvrir(Object.assign({ servir: { '/ocr/': OCR_DIR } }, process.env.SOURCE ? { source: process.env.SOURCE } : {}));
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 2, mobile: true });
  const photo = async (nom) => { if (!CAP) return; const r = await S.c.envoyer('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); };

  /* ── la page : l'entreprise, ses box, le catalogue — et la caméra simulée ── */
  const pop = await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
    if(typeof OCR!=='undefined'){ OCR.script=location.origin+'/ocr/tesseract.min.js'; OCR.workerPath=location.origin+'/ocr/worker.min.js'; OCR.corePath=location.origin+'/ocr/core'; OCR.langPath=location.origin+'/ocr/lang'; }
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}},
      {id:'uK',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:'tK',actif:true,pref:{},boxValidDR:true}];
    db.techniciens=[{id:'tK',nom:'Karim Benali',metier:'Technicien'}];
    db.produits=[]; cataloguePoser(db,{});
    const id=n=>(db.produits.find(p=>p.nom===n)||{}).id;
    window.__P={cafards:id('MAGNUM GEL CAFARDS SERINGUE 40G'), fourmis:id('MAGNUM GEL FOURMIS SERINGUE 40G'), d100:id('DOBOL FUMIGATEUR PROFESSIONNEL (100g)'), d20:id('DOBOL FUMIGATEUR PROFESSIONNEL (20g)'), teenox:id('TEENOX EC')};
    db.boxes=[{id:'b1',nom:'Box du camion',numero:'B-01',stock:{[__P.teenox]:{u:6,ctn:0},[__P.fourmis]:{u:2,ctn:0}},visibleTous:true},
      {id:'b2',nom:'Box atelier',numero:'B-02',stock:{},techIds:['tK']}];
    db.bonsRemiseOff=false; db.validDRTous=false; save();
    /* la caméra : un canevas 1280×720 redessiné dix fois par seconde, comme un flux vidéo */
    const cv=document.createElement('canvas'); cv.width=1280; cv.height=720; const g=cv.getContext('2d');
    window.__etiquette=null;
    const dessiner=()=>{ const e=window.__etiquette; g.setTransform(1,0,0,1,0,0); g.filter='none';
      const fond=g.createLinearGradient(0,0,0,720); fond.addColorStop(0,'#5b5146'); fond.addColorStop(1,'#2f2a25'); g.fillStyle=fond; g.fillRect(0,0,1280,720);
      if(e){ g.translate(640,360); g.rotate(e.angle||-0.03); g.translate(-640,-360); g.filter='blur(0.7px)';
        g.fillStyle=e.fond||'#f4f1e8'; g.fillRect(150,70,980,590);
        g.fillStyle=e.bande||'#c8102e'; g.fillRect(150,70,980,110);
        g.fillStyle='#fff'; g.font='bold 46px sans-serif'; g.textAlign='center'; g.fillText(e.haut||'',640,142);
        g.fillStyle=e.encre||'#1a1a1a'; e.lignes.forEach(([t,taille,y])=>{ g.font='bold '+taille+'px sans-serif'; g.fillText(t,640,y); });
        g.font='22px sans-serif'; g.fillStyle='#333'; (e.petit||[]).forEach((t,i)=>g.fillText(t,640,590+i*30));
        g.setTransform(1,0,0,1,0,0); g.filter='none'; }
      const im=g.getImageData(0,0,1280,720), d=im.data; for(let i=0;i<d.length;i+=4){ const n=(Math.random()-.5)*26; d[i]+=n; d[i+1]+=n; d[i+2]+=n; } g.putImageData(im,0,0); };
    dessiner(); setInterval(dessiner,100);
    /* un flux NEUF à chaque ouverture, comme un vrai téléphone : fermer le scanner ARRÊTE la piste
       (c'est voulu), et rendre la même piste arrêtée ferait lire du noir — un faux défaut */
    window.__flux=0; navigator.mediaDevices.getUserMedia=async()=>{ window.__flux++; return cv.captureStream(10); };
    const u=db.users[0]; currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
    await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove();
    return {produits:db.produits.length, P:window.__P, ocr:typeof OCR!=='undefined'};`);
  console.log('\n══ 0. LA POPULATION ══');
  vrai('le catalogue du pack 3D est posé (160 fiches), les produits visés existent', pop.produits === 160 && Object.values(pop.P).every(Boolean), pop);

  /* ── CONTRE-ÉPREUVE : l'ANCIEN scanner (SOURCE=<bêta d'avant>), joué avec les mêmes gestes ──
     Il n'a ni les mêmes écrans ni les mêmes fonctions : on mesure donc ce qu'il FAIT, pas ses
     sélecteurs — l'écran du Stock, et la quantité d'un technicien soumis au DR. */
  if (await S.ev(`return typeof etiq==='undefined' && typeof boxScanApply==='function';`)) {
    console.log('\n══ CONTRE-ÉPREUVE : L’ANCIEN SCANNER ══');
    const V1 = await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,600)); openScanner(); await new Promise(r=>setTimeout(r,500));
      const t=document.getElementById('modal').innerText; try{ closeModal(true); }catch(e){} return {codeBarre:/Référence produit|code dans le cadre|Placez le code/i.test(t), lire:/Lire l.étiquette/i.test(t)};`);
    vrai('⛔ l’écran du Stock ne sait lire que des codes-barres (sur iPhone : « Référence produit »)', !V1.codeBarre && V1.lire, V1);
    await S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,300)); const u=db.users.find(x=>x.id==='uK'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){} return 1;`);
    const V2 = await S.ev(`openBox('b2'); await new Promise(r=>setTimeout(r,600)); openBoxScanner('b2'); await new Promise(r=>setTimeout(r,500));
      const i=document.getElementById('bscan-text'); i.value='MAGNUM GEL CAFARDS'; boxScanProcess(i.value); await new Promise(r=>setTimeout(r,200));
      boxScanPick(__P.cafards); const q=document.getElementById('bscan-qty'); if(q) q.value='2'; boxScanApply(); await new Promise(r=>setTimeout(r,300));
      const b=db.boxes.find(x=>x.id==='b2'); return {requis:boxValidRequis(), stock:(b.stock[__P.cafards]||{}).u||0};`);
    vrai('⛔⛔ un technicien soumis au DR : le stock ne doit PAS bouger avant la validation', V2.stock === 0, V2);
    console.log(`\n════ sonde-scanner (contre-épreuve) : ${ok} ✓ ${ko} ✗ ════\n`);
    S.fermer(); process.exit(ko ? 1 : 0);
  }

  vrai('le moteur de lecture est pointé sur les fichiers locaux', pop.ocr, pop);
  const etiquette = e => S.ev(`window.__etiquette=${JSON.stringify(e)}; await new Promise(r=>setTimeout(r,400)); return 1;`);
  /* lire : toucher le VRAI bouton, attendre la fin de la lecture, rendre ce que l'écran dit */
  const lire = () => S.ev(`const b=document.getElementById('etiq-lire'); if(!b) return {err:'pas de bouton'}; const t0=performance.now(); b.click();
    for(let i=0;i<600;i++){ await new Promise(r=>setTimeout(r,100)); if(!etiq.busy) break; }
    const et=(document.getElementById('etiq-etat')||{}).textContent||'', res=document.getElementById('etiq-result');
    const noms=res?[...res.querySelectorAll('.etiq-l .pl-title')].map(x=>x.textContent.trim()):[];
    return {ms:Math.round(performance.now()-t0), etat:et, noms, choisi:etiq.sel?(produit(etiq.sel)||{}).nom:null, erreur:!!(res&&res.querySelector('.bscan-err')), lu:etiq.lu};`);
  const ouvrirScannerBox = (bid) => S.ev(`try{ closeModal(true); }catch(e){} openBox('${bid}'); await new Promise(r=>setTimeout(r,600)); openBoxScanner('${bid}');
    for(let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,100)); const v=document.getElementById('etiq-video'); if(v&&v.videoWidth) break; }
    const v=document.getElementById('etiq-video'); return {video:!!(v&&v.videoWidth), w:v&&v.videoWidth, mode:etiq.mode, boxView};`);

  console.log('\n══ 1. ⛔⛔ LIRE UNE ÉTIQUETTE, CHOISIR, AJOUTER DANS LA BOX ══');
  await etiquette({ haut: 'INSECTICIDE GEL APPÂT', lignes: [['MAGNUM', 118, 300], ['GEL CAFARDS', 74, 390], ['SERINGUE 40 G', 50, 460]], petit: ['Tenir hors de portée des enfants · Lot 2231', 'Utilisez les biocides avec précaution'] });
  const o1 = await ouvrirScannerBox('b1');
  vrai('le scanner de la box s’ouvre sur la caméra (1280 px)', o1.video && o1.mode === 'box' && o1.boxView === 'b1', o1);
  const d1 = await S.ev(`const t=document.getElementById('modal').innerText; return {codeBarre:/code-barres|Référence produit/i.test(t), lire:!!document.getElementById('etiq-lire'), astuce:/Scanner le texte/.test(t)};`);
  vrai('⛔ plus aucune mention de code-barres ; un bouton « Lire l’étiquette »', !d1.codeBarre && d1.lire, d1);
  vrai('sur iPhone, l’astuce « Scanner le texte » est dite', d1.astuce, d1);
  await photo('1-scanner-ouvert');
  const L1 = await lire();
  console.log('    lecture en ' + L1.ms + ' ms (moteur chargé la première fois) — ' + L1.etat.slice(0, 120));
  vrai('⛔⛔ l’étiquette est lue : « MAGNUM GEL CAFARDS » en tête, choisi d’office', L1.noms[0] === 'MAGNUM GEL CAFARDS SERINGUE 40G' && L1.choisi === 'MAGNUM GEL CAFARDS SERINGUE 40G', L1);
  vrai('⛔ la sœur « FOURMIS » n’est pas devant (la lecture départage)', L1.noms.indexOf('MAGNUM GEL FOURMIS SERINGUE 40G') !== 0, L1.noms);
  vrai('… et l’écran dit ce qu’il a lu', /^Lu : « /.test(L1.etat) && /MAGNUM/i.test(L1.etat), L1.etat);
  vrai('⛔ le cadre ne lit que le nom : les mentions légales du bas ne sont pas lues', !/port[ée]e des enfants|biocides/i.test(L1.lu), L1.lu);
  const A1 = await S.ev(`const i=document.getElementById('etiq-qty'); i.value='3'; await new Promise(r=>setTimeout(r,150));
    const n0=db.mouvements.length; document.getElementById('etiq-go').click(); await new Promise(r=>setTimeout(r,400));
    const b=db.boxes.find(x=>x.id==='b1'); const res=document.getElementById('etiq-result').innerText;
    return {u:(b.stock[__P.cafards]||{}).u, mvts:db.mouvements.length-n0, dernier:db.mouvements[0]&&{type:db.mouvements[0].type,qte:db.mouvements[0].qte,boxId:db.mouvements[0].boxId}, res};`);
  v('⛔⛔ « ＋ Ajouter dans la box » : 3 MAGNUM GEL CAFARDS entrent dans la box du camion', A1.u, 3);
  vrai('… par le chemin du « ＋ » de la box : UN mouvement de 3, rattaché à la box', A1.mvts === 1 && A1.dernier && A1.dernier.qte === 3 && A1.dernier.boxId === 'b1', A1);
  vrai('… et l’écran le dit, prêt pour le suivant', /Ajouté : \+3 × MAGNUM GEL CAFARDS/.test(A1.res) && /maintenant 3 dans la box/.test(A1.res), A1.res);
  await photo('3-ajoute');

  console.log('\n══ 2. ⛔ DEUX FORMATS VOISINS : 100 g CONTRE 20 g ══');
  await etiquette({ haut: 'FUMIGATEUR INSECTICIDE', bande: '#1d4f91', lignes: [['DOBOL', 118, 300], ['FUMIGATEUR PROFESSIONNEL', 54, 385], ['100 g', 64, 465]], petit: ['Nocif en cas d’ingestion', 'Lot 8841 · À utiliser avant fin 2028'] });
  const L2 = await lire();
  console.log('    lecture en ' + L2.ms + ' ms — ' + L2.etat.slice(0, 120));
  vrai('⛔⛔ « DOBOL … (100g) » passe devant « (20g) »', L2.choisi === 'DOBOL FUMIGATEUR PROFESSIONNEL (100g)' && L2.noms.indexOf('DOBOL FUMIGATEUR PROFESSIONNEL (100g)') < Math.max(0, L2.noms.indexOf('DOBOL FUMIGATEUR PROFESSIONNEL (20g)')) + (L2.noms.includes('DOBOL FUMIGATEUR PROFESSIONNEL (20g)') ? 0 : 99), L2);
  vrai('⛔ … et pas de XILIX 1000 : un nombre ne se lit pas à un chiffre près', !L2.noms.includes('XILIX 1000'), L2.noms);
  await photo('2-choix');

  console.log('\n══ 3. ⛔ UNE ÉTIQUETTE QUI N’EST PAS AU CATALOGUE ══');
  await etiquette({ haut: 'ENTRETIEN', bande: '#2e7d32', lignes: [['SAVON NOIR', 100, 320], ['À L’HUILE D’OLIVE', 56, 410]], petit: ['Biodégradable', '1 litre'] });
  const L3 = await lire();
  vrai('⛔⛔ aucun produit n’est proposé — un nom inconnu n’entre jamais', !L3.noms.length && L3.erreur, L3);

  console.log('\n══ 4. ⛔⛔ RETIRER : « POUR QUI ? » PREND LA PLACE DU SCANNER, CAMÉRA COUPÉE ══');
  await etiquette({ haut: 'INSECTICIDE', bande: '#6a1b9a', lignes: [['TEENOX EC', 110, 330], ['Concentré émulsionnable', 44, 410]], petit: ['Tenir hors de portée des enfants'] });
  await S.ev(`etiqSens('retirer'); return 1;`);
  const L4 = await lire();
  vrai('TEENOX EC est lu et choisi', L4.choisi === 'TEENOX EC', L4);
  const R4 = await S.ev(`document.getElementById('etiq-qty').value='2'; const u0=db.boxes.find(x=>x.id==='b1').stock[__P.teenox].u;
    document.getElementById('etiq-go').click(); await new Promise(r=>setTimeout(r,500));
    const t=document.getElementById('modal').innerText; return {u0, u:db.boxes.find(x=>x.id==='b1').stock[__P.teenox].u, pourQui:/pour qui/i.test(t), dansListe:/TEENOX EC/.test(t), camera:!!scanStream, mode:etiq.mode};`);
  vrai('⛔⛔ la fenêtre « Ces produits sont pour qui ? » s’ouvre, TEENOX EC dans la liste', R4.pourQui && R4.dansListe, R4);
  vrai('⛔ … la caméra est coupée (plus de voyant allumé derrière la fenêtre)', !R4.camera && !R4.mode, R4);
  v('… et rien n’est sorti tant que la personne n’a pas dit pour qui', [R4.u0, R4.u], [6, 6]);
  await photo('4-pour-qui');
  const R4b = await S.ev(`boxDonneSave(); await new Promise(r=>setTimeout(r,500)); const b=db.boxes.find(x=>x.id==='b1');
    const m=db.mouvements.find(x=>x.boxId==='b1'&&x.produitId===__P.teenox); return {u:b.stock[__P.teenox].u, pour:m&&(m.pourQui||m.donneA||m.pour||''), bons:(db.bonsRemise||db.remises||[]).length};`);
  vrai('« Continuer » (pour moi) : 2 TEENOX EC sortent, par la liste de la box', R4b.u === 4, R4b);

  console.log('\n══ 5. ⛔⛔ UN TECHNICIEN SOUMIS AU DR : LA QUANTITÉ PART DANS SA LISTE ══');
  await S.ev(`try{ closeModal(true); }catch(e){} try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,300)); const u=db.users.find(x=>x.id==='uK'); currentUser=u; enterApp(u);
    await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`);
  await etiquette({ haut: 'INSECTICIDE GEL APPÂT', lignes: [['MAGNUM', 118, 300], ['GEL CAFARDS', 74, 390], ['SERINGUE 40 G', 50, 460]], petit: [] });
  const o5 = await ouvrirScannerBox('b2');
  vrai('le scanner s’ouvre sur SA box', o5.video && o5.boxView === 'b2', o5);
  const L5 = await lire();
  console.log('    lecture en ' + L5.ms + ' ms — ' + (L5.etat || JSON.stringify(L5)).slice(0, 160));
  vrai('MAGNUM GEL CAFARDS est lu et choisi', L5.choisi === 'MAGNUM GEL CAFARDS SERINGUE 40G', L5);
  const T5 = await S.ev(`document.getElementById('etiq-qty').value='2'; document.getElementById('etiq-go').click(); await new Promise(r=>setTimeout(r,400));
    const b=db.boxes.find(x=>x.id==='b2'), s=(b.stock[__P.cafards]||{}).u||0, li=boxBrouillonLigne('b2',__P.cafards);
    return {requis:boxValidRequis(), stock:s, ligne:li&&li.du, res:document.getElementById('etiq-result').innerText};`);
  vrai('⛔⛔ le stock ne bouge pas : +2 est noté dans SA liste, qui part au DR quand il la valide', T5.requis && T5.stock === 0 && T5.ligne === 2, T5);
  vrai('… et l’écran le dit', /Noté dans ta liste/.test(T5.res) && /DR/.test(T5.res), T5.res);

  console.log('\n══ 6. LE STOCK : ON CHOISIT LA BOX, PUIS C’EST SON SCANNER ══');
  await S.ev(`try{ closeModal(true); }catch(e){} try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,300)); const u=db.users.find(x=>x.id==='uA'); currentUser=u; enterApp(u);
    await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`);
  const K6 = await S.ev(`go('stock'); await new Promise(r=>setTimeout(r,700)); const btn=[...document.querySelectorAll('button')].find(b=>b.getAttribute('onclick')==='openScannerStock()');
    if(!btn) return {btn:false}; btn.click(); await new Promise(r=>setTimeout(r,400)); const t=document.getElementById('modal').innerText;
    const choix=/Scanner dans quelle box/.test(t) && /Box du camion/.test(t) && /Box atelier/.test(t);
    const l=[...document.querySelectorAll('#modal .pl-row')].find(x=>/Box atelier/.test(x.textContent)); if(l) l.click();
    await new Promise(r=>setTimeout(r,1300)); return {btn:true, choix, mode:etiq.mode, boxId:etiq.boxId, boxView};`);
  vrai('« Scanner » du Stock demande dans quelle box', K6.btn && K6.choix, K6);
  vrai('… la box choisie s’ouvre, et c’est SON scanner qui s’ouvre dessus', K6.mode === 'box' && K6.boxId === 'b2' && K6.boxView === 'b2', K6);

  console.log('\n══ 7. PRODUITS : LE MÊME SCANNER, SUR LE STOCK DU CATALOGUE ══');
  await etiquette({ haut: 'FUMIGATEUR INSECTICIDE', bande: '#1d4f91', lignes: [['DOBOL', 118, 300], ['FUMIGATEUR PROFESSIONNEL', 54, 385], ['100 g', 64, 465]], petit: [] });
  const K7 = await S.ev(`try{ closeModal(true); }catch(e){} go('produits'); await new Promise(r=>setTimeout(r,600)); openScanner();
    for(let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,100)); const v=document.getElementById('etiq-video'); if(v&&v.videoWidth) break; } return {mode:etiq.mode};`);
  v('Produits ouvre le scanner du catalogue', K7.mode, 'cat');
  const L7 = await lire();
  const A7 = await S.ev(`const p=produit(__P.d100), q0=+p.qte||0; document.getElementById('etiq-qty').value='4'; document.getElementById('etiq-go').click(); await new Promise(r=>setTimeout(r,300));
    return {q0, q:+p.qte||0, m:db.mouvements[0]&&{qte:db.mouvements[0].qte,motif:db.mouvements[0].motif,type:db.mouvements[0].type}};`);
  vrai('le DOBOL 100 g est lu', L7.choisi === 'DOBOL FUMIGATEUR PROFESSIONNEL (100g)', L7);
  vrai('⛔ +4 au stock du catalogue, et la trace dit 4 (l’ancien scanner écrivait toujours 1)', A7.q - A7.q0 === 4 && A7.m && A7.m.qte === 4 && A7.m.type === 'entree', A7);

  console.log('\n══ 8. AUCUNE ERREUR ══');
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  v('exceptions', S.exceptions, []);
  console.log(`\n════ sonde-scanner : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
