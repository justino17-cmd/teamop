/* Sonde B2 (v744) : les photos de plans sortent du document de l'équipe — dans la VRAIE page
   (bêta locale, 127.0.0.1). Le serveur de pièces est simulé EN MÉMOIRE dans la page (dépôt,
   lecture, suppression, pannes) : c'est le seul point simulé, tout le reste est le vrai code —
   vraie image passée au vrai compressImage, vrais écrans, vrais save(), vraie estampille.
   SOURCE=<bêta d'avant> pour la contre-épreuve (le défaut « regarder, c'est modifier » y est). */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const v = (t, a, b) => { const c = JSON.stringify(a) === JSON.stringify(b); c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → reçu ' + JSON.stringify(a) + ', attendu ' + JSON.stringify(b))); };
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
  /* ── Le décor : un administrateur, un client pro, une intervention. Le serveur de pièces en mémoire. ── */
  await S.ev(`
    db.users=(db.users||[]).filter(u=>u.id!=='u-pp'); db.users.push({id:'u-pp',prenom:'Justin',nom:'Sonde',login:'pp',role:'admin',actif:true,pref:{}});
    db.clients=(db.clients||[]).filter(c=>c.id!=='cli-pp'); db.clients.push({id:'cli-pp',nom:'Boulangerie Sonde',type:'pro',pro:true,email:'sonde@exemple.fr',_m:1});
    db.interventions=(db.interventions||[]).filter(i=>i.id!=='int-pp'); db.interventions.push({id:'int-pp',titre:'Passage sonde',clientId:'cli-pp',date:todayISO(),statut:'planifiee',techId:'',produitsUtilises:[],photos:[],plans:[]});
    db.plansSite=db.plansSite||{}; delete db.plansSite['cli-pp'];
    const u=db.users.find(x=>x.id==='u-pp'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){}
    window.__srv={}; window.__dep=0; window.__lire=0; window.__sup=[]; window.__mode='ok'; window.__toasts=[]; window.__saves=0; window.__wins=[]; window.__confirms=[];
    window.pieceDeposer=async(d)=>{ __dep++; if(__mode==='reseau') return {erreur:true,motif:'reseau'}; const id=__dep.toString(16).padStart(64,'0'); __srv[id]=d; return {id}; };
    window.pieceLire=async(id)=>{ __lire++; await new Promise(r=>setTimeout(r,30)); if(__mode==='reseau') return {inconnu:true,motif:'reseau'}; return __srv[id]?{dataUrl:__srv[id]}:{absente:true}; };
    window.pieceSupprimer=async(id)=>{ __sup.push(id); delete __srv[id]; return true; };
    const _t=window.toast; window.toast=function(m){ __toasts.push(String(m)); try{ return _t.apply(this,arguments); }catch(e){} };
    window.__piles=[]; const _s=window.save; window.save=function(){ __saves++; __piles.push(new Error().stack.split(String.fromCharCode(10)).slice(2,6).map(x=>x.trim().split('essai.html').join('')).join(' <- ')); return _s.apply(this,arguments); };
    window.confirm=(m)=>{ __confirms.push(String(m)); return true; }; window.prompt=(q,d)=>'RDC';
    window.open=function(){ const w={doc:'',ferme:false,closes:0,ecritures:[],document:{ write(s){ if(w.ferme){ w.doc=''; w.ferme=false; } w.doc+=s; w.ecritures.push(String(s).slice(0,60)); }, close(){ w.ferme=true; w.closes++; } }, focus(){}, print(){}, close(){} }; __wins.push(w); return w; };
    /* une VRAIE image, passée au vrai compressImage */
    const cv=document.createElement('canvas'); cv.width=1600; cv.height=1200; const cx=cv.getContext('2d');
    cx.fillStyle='#e8eef5'; cx.fillRect(0,0,1600,1200); for(let k=0;k<40;k++){ cx.strokeStyle='hsl('+(k*9)+',60%,40%)'; cx.lineWidth=6; cx.strokeRect(20+k*30,20+k*20,300,200); }
    cx.fillStyle='#333'; cx.font='60px sans-serif'; cx.fillText('PLAN RDC — SONDE',200,600);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.92));
    window.__fichier=()=>new File([blob],'plan.jpg',{type:'image/jpeg'});
    detailIntervention('int-pp'); intTab='planApp'; renderIntDetail('int-pp');
    return 1;`);
  /* ⚠️ Sur une version d'avant (SOURCE=…), une section peut jeter : on le NOMME et on continue,
     pour que la contre-épreuve atteigne la section 6 — celle qui garde le défaut de la v702. */
  const sur = async (code) => { try { return await S.ev(code); } catch (e) { console.log('     ⚠️ section interrompue : ' + String(e.message).split('\n')[0].slice(0, 160)); return {}; } };
  const ilya = await S.ev(`return {planImgDeposer: typeof planImgDeposer==='function', intPlanDeposer: typeof intPlanDeposer==='function'};`);
  console.log('fonctions v744 présentes :', JSON.stringify(ilya));

  console.log('\n── 1. un plan créé avec une VRAIE photo part sur le serveur ──');
  const r1 = await S.ev(`
    await paAddPlan({target:{files:[__fichier()],value:''}},'int-pp'); await new Promise(r=>setTimeout(r,400));
    const pl=plansOf('cli-pp')[0]; const img=String(pl&&pl.img||'');
    const m=/^piece:([0-9a-f]{64}):(data:image\\/jpeg[\\s\\S]*)$/.exec(img);
    const copie=syncSortirPieces(db).copie; const pc=((copie.plansSite||{})['cli-pp']||[])[0]||{};
    return { plan:!!pl, depots:__dep, marque:!!m, contenuKo:m?Math.round(m[2].length/1024):0, imgEmpJuste: !!m && pl.imgEmp===papImgEmpCalc(m[2]), date:+pl._m>0,
      pousse:String(pc.img||'').length, localGarde:String(pl.img).length===img.length,
      baseKo:Math.round(JSON.stringify(db).length/1024), pousseeKo:Math.round(JSON.stringify(copie).length/1024) };`);
  console.log(JSON.stringify(r1));
  v('le plan est créé, la photo déposée UNE fois', [r1.plan, r1.depots], [true, 1]);
  v('⛔ la photo porte son identifiant ET garde son contenu (le technicien la voit sans réseau)', r1.marque, true);
  v('   l\'empreinte est posée à la prise (calculée sur le contenu)', r1.imgEmpJuste, true);
  v('   et le plan est daté', r1.date, true);
  v('⛔⛔ dans la copie poussée, la photo ne pèse plus que son identifiant (70 caractères)', r1.pousse, 70);
  v('   la base locale garde la photo entière', r1.localGarde, true);
  console.log('     → base locale ' + r1.baseKo + ' Ko, copie poussée ' + r1.pousseeKo + ' Ko (photo de ' + r1.contenuKo + ' Ko)');

  console.log('\n── 2. l\'appareil d\'un collègue reçoit la photo NUE : l\'écran la va chercher, sans rien écrire ──');
  const r2 = await sur(`
    const pl=plansOf('cli-pp')[0]; const pid=photoPid(pl.img); pl.img='piece:'+pid; if(typeof _papImgEtat!=='undefined') Object.keys(_papImgEtat).forEach(k=>delete _papImgEtat[k]);
    __saves=0; __lire=0; intTab='planApp'; renderIntDetail('int-pp');
    const att=(document.querySelector('.pap-attente')||{}).textContent||''; const h0=(document.getElementById('pap-view')||{}).offsetHeight||0;
    await new Promise(r=>setTimeout(r,400));
    const im=document.querySelector('#pap-view img'); const h1=(document.getElementById('pap-view')||{}).offsetHeight||0;
    const piecesDansSrc=[...document.querySelectorAll('img')].filter(x=>/^piece:/.test(x.getAttribute('src')||'')).length;
    return { attente:att.trim(), cadreHaut:h0, lectures:__lire, image:!!(im&&/^data:image\\/jpeg/.test(im.getAttribute('src')||'')), hauteur:h1, saves:__saves, piecesDansSrc };`);
  console.log(JSON.stringify(r2));
  v('⛔ tant qu\'elle n\'est pas là, un cadre le DIT (pas un plan écrasé à zéro)', [/Récupération de la photo du plan/.test(r2.attente), r2.cadreHaut > 100], [true, true]);
  v('   puis la photo arrive et l\'écran se redessine', [r2.lectures, r2.image, r2.hauteur > 100], [1, true, true]);
  v('⛔⛔ AUCUN save() pendant tout l\'affichage', r2.saves, 0);
  v('   aucune image de la page n\'a « piece:… » pour source', r2.piecesDansSrc, 0);

  console.log('\n── 3. sans réseau : un message, pas de boucle, et pas de poste posé à l\'aveugle ──');
  const r3 = await sur(`
    const pl=plansOf('cli-pp')[0]; const pid=photoPid(pl.img); pl.img='piece:'+pid; if(typeof _papImgEtat!=='undefined') Object.keys(_papImgEtat).forEach(k=>delete _papImgEtat[k]); if(typeof _papImgEchec!=='undefined') Object.keys(_papImgEchec).forEach(k=>delete _papImgEchec[k]);
    __mode='reseau'; __lire=0; __toasts=[]; renderIntDetail('int-pp'); await new Promise(r=>setTimeout(r,400));
    const msg=(document.querySelector('.pap-attente')||{}).textContent||'';
    for(let k=0;k<5;k++){ renderIntDetail('int-pp'); await new Promise(r=>setTimeout(r,150)); }
    const n=(pl.postes||[]).length; papPlacePoste('int-pp',pl,0.5,0.5,'piege');
    return { msg:msg.trim(), lectures:__lire, postesAvant:n, postesApres:(pl.postes||[]).length, toast:__toasts.slice(-1)[0]||'' };`);
  console.log(JSON.stringify(r3));
  v('⛔ le message dit que c\'est le réseau (« on ne sait pas », pas « supprimée »)', /n’a pas pu être récupérée/.test(r3.msg), true);
  v('⛔ cinq redessins, UNE seule tentative (pas de boucle sur un échec)', r3.lectures, 1);
  v('⛔ un poste ne se pose pas sur un plan qu\'on ne voit pas', [r3.postesApres - r3.postesAvant, /pas encore là/.test(r3.toast)], [0, true]);

  console.log('\n── 4. le rapport PDF, le dossier sanitaire et le plan d\'implantation attendent la photo ──');
  const r4 = await sur(`
    __mode='ok'; const pl=plansOf('cli-pp')[0]; const pid=photoPid(pl.img);
    pl.img=photoMarquer(pid,__srv[pid]); papPlacePoste('int-pp',pl,0.3,0.3,'piege'); save();
    const nPostes=(pl.postes||[]).length;
    /* le rapport, photo nue et réseau là */
    pl.img='piece:'+pid; __wins=[]; __confirms=[]; await printRapport('int-pp');
    const wR=__wins[0]||{doc:''};
    const rapport={ fenetre:!!__wins[0], image:wR.doc.indexOf(__srv[pid].slice(0,80))>=0, piece:/src="piece:/.test(wR.doc), confirms:__confirms.length };
    /* le rapport, photo nue et PAS de réseau : on demande, et le document le DIT */
    pl.img='piece:'+pid; __mode='reseau'; __wins=[]; __confirms=[]; await printRapport('int-pp');
    const wR2=__wins[0]||{doc:''};
    const rapportSans={ question:__confirms.some(m=>/photo\\(s\\) de plan/.test(m)), notice:/Photo du plan non disponible au moment de l’impression/.test(wR2.doc), piece:/src="piece:/.test(wR2.doc) };
    /* le dossier sanitaire */
    __mode='ok'; pl.img='piece:'+pid; __wins=[]; await papDossierSanitaire('cli-pp');
    const wD=__wins[0]||{doc:'',ecritures:[]};
    const dossier={ image:wD.doc.indexOf(__srv[pid].slice(0,80))>=0, attenteEffacee:!/Récupération des plans/.test(wD.doc), ecritures:wD.ecritures.length, closes:wD.closes };
    /* le plan d'implantation */
    pl.img='piece:'+pid; const i=db.interventions.find(x=>x.id==='int-pp');
    const d=await papImplDocument('cli-pp',i,papImplEtat('cli-pp'));
    const impl={ pdf:!!(d&&d.pdf&&d.pdf.startsWith('%PDF')), err:d&&d.err||'', baseIntacte:pl.img==='piece:'+pid };
    __mode='reseau'; const d2=await papImplDocument('cli-pp',i,papImplEtat('cli-pp')); __mode='ok';
    return { nPostes, rapport, rapportSans, dossier, impl, implSans:d2&&d2.err||'' };`);
  console.log(JSON.stringify(r4));
  v('population : le plan porte un poste (il est imprimé)', r4.nPostes > 0, true);
  v('⛔ rapport : la photo du plan est dans le document, jamais « piece: »', [(r4.rapport||{}).fenetre, (r4.rapport||{}).image, (r4.rapport||{}).piece, (r4.rapport||{}).confirms], [true, true, false, 0]);
  v('⛔ rapport sans réseau : on DEMANDE, et le document l\'écrit au lieu d\'un cadre vide', [(r4.rapportSans||{}).question, (r4.rapportSans||{}).notice, (r4.rapportSans||{}).piece], [true, true, false]);
  v('⛔ dossier sanitaire : la photo y est, et l\'attente a été remplacée (pas laissée en tête)', [(r4.dossier||{}).image, (r4.dossier||{}).attenteEffacee], [true, true]);
  v('⛔ plan d\'implantation : le PDF se construit sur la photo relue, la base n\'a pas bougé', [(r4.impl||{}).pdf, (r4.impl||{}).baseIntacte], [true, true]);
  v('   et sans réseau, rien ne part, avec la raison', /n’a pas pu être récupérée.*rien n’est parti/.test(r4.implSans||''), true);

  console.log('\n── 5. l\'onglet « Plans » d\'une intervention ──');
  const r5 = await sur(`
    const i=db.interventions.find(x=>x.id==='int-pp'); __dep=0;
    intTab='plans'; renderIntDetail('int-pp');
    intPlanAdd({target:{files:[__fichier()],value:''}},'int-pp'); await new Promise(r=>setTimeout(r,900));
    const ph=String((i.plans||[])[0]||''); const pid=photoPid(ph);
    const pousse=String(((syncSortirPieces(db).copie.interventions||[]).find(x=>x.id==='int-pp')||{}).plans?.[0]||'');
    i.plans[0]='piece:'+pid; __lire=0; __saves=0; __piles=[]; renderIntDetail('int-pp'); await new Promise(r=>setTimeout(r,400));
    const pilesAffichage=__piles.slice(), savesAffichage=__saves;   // relevé AVANT la suppression, qui, elle, enregistre (à juste titre)
    const im=document.querySelector('#int-detail-plans img');
    const suppr=__sup.length; intPlanDel('int-pp',0);
    return { depose:!!pid&&/^piece:[0-9a-f]{64}:data:image/.test(ph), pousse:pousse.length, lectures:__lire, image:!!(im&&/^data:image/.test(im.getAttribute('src')||'')), saves:savesAffichage,
      supprimeServeur:__sup.length-suppr===1&&__sup[__sup.length-1]===pid, reste:(i.plans||[]).length, pilesAffichage };`);
  console.log(JSON.stringify(r5));
  v('⛔ la photo de l\'onglet « Plans » est déposée, et ne voyage plus que par son identifiant', [r5.depose, r5.pousse], [true, 70]);
  v('   reçue nue, l\'onglet la relit et l\'affiche, sans rien écrire', [r5.lectures, r5.image, r5.saves], [1, true, 0]);
  v('   la supprimer la retire aussi du serveur', [r5.supprimeServeur, r5.reste], [true, 0]);

  console.log('\n── 6. ⛔⛔ REGARDER UNE PHOTO NE MODIFIE PAS LA FICHE (le défaut de la v702) ──');
  const r6 = await S.ev(`
    window.syncEnabled=()=>true;   // sinon estampiller() sort par la porte du haut et la mesure vaut 0 (CLAUDE.md)
    const i=db.interventions.find(x=>x.id==='int-pp'); __mode='ok';
    const id='f'.repeat(64); __srv[id]='data:image/jpeg;base64,'+'Q'.repeat(9000);
    i.photos=['piece:'+id]; save(); ombreRelever();
    const m0=+i._m||0; await new Promise(r=>setTimeout(r,5));
    intTab='docs'; fsTab='medias'; renderIntDetail('int-pp'); await new Promise(r=>setTimeout(r,400));
    const arrivee=photoSrc(i.photos[0]).length;
    save();
    const m1=+i._m||0; await new Promise(r=>setTimeout(r,5));
    i.titre='Passage sonde (modifié)'; save(); const m2=+i._m||0;
    return { arrivee, avant:m0, apresRegard:m1, apresGeste:m2 };`);
  console.log(JSON.stringify(r6));
  v('population : la photo a bien été relue pour l\'écran (9 000 octets en mémoire)', r6.arrivee > 9000, true);
  v('⛔⛔ … et le save() qui suit ne tamponne PAS la fiche', r6.apresRegard, r6.avant);
  v('   contre-épreuve : un vrai geste la tamponne (l\'estampille est bien vivante)', r6.apresGeste > r6.avant, true);

  console.log('\n── exceptions de la page ──');
  v('aucune exception JavaScript', S.exceptions, []);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
