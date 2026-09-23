/* ══ SONDE — LE PLAN D'IMPLANTATION À CHAQUE PASSAGE, DANS LA VRAIE PAGE (v740) ═══════════════
   Justin : « à chaque intervention il envoie un nouveau plan s'il a été modifié, sinon il renvoie
   le même ». Sur la bêta (127.0.0.1, téléphone 430 px, animations réduites, rien ne sort) :
   la carte de l'onglet « Plan d'appâtage » d'une intervention, JOUÉE bouton par bouton —
     jamais envoyé → on touche « Envoyer » → « inchangé » et « envoyé pour ce passage »
     → on change la zone d'un poste dans sa fiche → « modifié », version + 1
     → la fenêtre de fin de passage rappelle l'envoi, puis le dit fait ;
   un envoi REFUSÉ n'écrit rien et n'ouvre aucun brouillon ; les coordonnées d'une société se
   saisissent dans Paramètres. Chaque étape est capturée pour Justin.

   Usage : node scratchpad/sonde-implantation.js [dossier-captures] */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const SORTIE = process.argv[2] || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/captures/ecrans';
fs.mkdirSync(SORTIE, { recursive: true });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__mails=[]; window.__mailOk=true; window.__mailto=0;
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,body,opts:opts||null}); if(!window.__mailOk){ if(!(opts&&opts.sansMailto)) window.__mailto++; return false; } toast(okMsg||'ok'); return true; };
    window.open=function(){ return { document:{write(){},close(){}}, focus(){}, print(){}, close(){}, location:{} }; };
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  await S.ev(`const photo=(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=600; const x=c.getContext('2d');
      x.fillStyle='#e9e4da'; x.fillRect(0,0,900,600); x.strokeStyle='#5b5346'; x.lineWidth=8; x.strokeRect(40,40,820,520); x.beginPath(); x.moveTo(420,40); x.lineTo(420,380); x.stroke();
      x.fillStyle='#5b5346'; x.font='bold 28px Arial'; x.fillText('Laboratoire',90,160); x.fillText('Stockage',520,160); return c.toDataURL('image/jpeg',0.8); })();
    db.entreprise={nom:'Nettoyage Excellence',adresse:'1 rue de la Mairie',cp:'17000',ville:'La Rochelle',tel:'05 46 00 00 00',siret:'111 111 111 00011'};
    db.societes=['Alpha Nuisibles','Bêta Hygiène']; db.societesStyle={'Alpha Nuisibles':{couleur:'#C0392B',siret:'222 222 222 00022',adresse:'2 quai des Chartrons',cp:'33000',ville:'Bordeaux'},'Bêta Hygiène':{couleur:'#2E86C1'}};
    db.produits=(db.produits||[]).filter(p=>!/^p-sonde/.test(p.id)).concat([{id:'p-sonde1',nom:'Brodifacoum pâte 25 ppm',amm:'FR-2019-0042',unite:'u'}]);
    db.clients=(db.clients||[]).filter(c=>c.id!=='cX').concat([{id:'cX',nom:'Boulangerie Élise & Fils',email:'elise@exemple.fr',adresse:'3 rue de l’Église',typeClient:'pro'}]);
    db.techniciens=(db.techniciens||[]).filter(t=>t.id!=='tS').concat([{id:'tS',nom:'Tom Sonde',metier:'Technicien'}]);
    const I=(id,d,st,soc)=>({id,num:'INT-'+id,titre:'Dératisation',type:'Dératisation',clientId:'cX',date:d,heure:'09:00',duree:60,statut:st,rapportModele:soc,techId:'tS',techIds:['tS'],produitsUtilises:[],histo:[],relevesPlan:[]});
    db.interventions=(db.interventions||[]).filter(i=>i.clientId!=='cX').concat([I('iAlpha','2026-09-10','terminee','Alpha Nuisibles'),I('iBeta','2026-09-23','encours','Bêta Hygiène')]);
    db.plansSite=db.plansSite||{}; db.plansSite.cX=[
      {id:'plRdcSonde',nom:'Rez-de-chaussée',mode:'rooms',version:2,rooms:[{id:'r1',nom:'Cuisine',x:.08,y:.1,w:.42,h:.34,zoneAlim:true},{id:'r2',nom:'Réserve',x:.56,y:.1,w:.36,h:.34}],
        postes:[{id:'poA',num:1,x:.66,y:.3,type:'appat',produitId:'p-sonde1',secure:true,zone:'Réserve'},{id:'poB',num:2,x:.3,y:.3,type:'insecte',zone:'Cuisine'}]},
      {id:'plPhotoSonde',nom:'Arrière-boutique',mode:'img',img:photo,version:1,rooms:[],postes:[{id:'poD',num:4,x:25,y:30,type:'appat',produitId:'p-sonde1'}]}];
    db.users=(db.users||[]).filter(u=>u.id!=='uS').concat([{id:'uS',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uS'); enterApp(currentUser); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){} return 1;`);

  /* capture d'un élément : amené au centre, deux trames, puis son rectangle dans la page */
  const capturer = async (nom, sel) => {
    const r = await S.ev(`const el=${sel}; if(!el) return null; el.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); await new Promise(r=>setTimeout(r,250));
      const b=el.getBoundingClientRect(); return {x:b.left+scrollX, y:b.top+scrollY, w:b.width, h:b.height};`);
    if (!r) { vrai('capture « ' + nom + ' » : l’élément existe', false); return; }
    const s = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.w + 16, height: r.h + 16, scale: 1 }, captureBeyondViewport: true });
    fs.writeFileSync(path.join(SORTIE, nom + '.png'), Buffer.from(s.data, 'base64'));
  };
  const carte = `[...document.querySelectorAll('#content .card')].find(c=>/Plan d.implantation/.test(c.textContent))`;
  const texte = () => S.ev(`const c=${carte}; return c?c.textContent.replace(/\\s+/g,' ').trim():''`);
  const ouvrirPlan = id => S.ev(`detailIntervention('${id}'); intTab='planApp'; renderIntDetail('${id}'); await new Promise(r=>setTimeout(r,700)); return current;`);

  await ouvrirPlan('iBeta');
  let t = await texte();
  vrai('la carte est là, dans l’onglet Plan d’appâtage', t.length > 20, t);
  vrai('« Remis au client à chaque passage » — plus « délivré une fois »', /à chaque passage/.test(t) && !/délivré une fois/.test(t), t);
  vrai('état : jamais envoyé, pas encore envoyé pour ce passage', /Jamais envoyé/.test(t) && /Pas encore envoyé pour ce passage/.test(t), t);
  await capturer('1-jamais-envoye', carte);

  /* on TOUCHE le bouton, comme le technicien */
  await S.ev(`const b=[...document.querySelectorAll('.pap-impl-btn')].find(x=>/Envoyer le plan/.test(x.textContent)); b.click(); await new Promise(r=>setTimeout(r,2500)); return 1;`);
  const m1 = await S.ev(`return window.__mails.map(m=>({to:m.to,sub:m.subject,brand:m.opts&&m.opts.brandName,pj:m.opts&&m.opts.atts&&m.opts.atts.map(a=>a.filename+':'+a.content.length),sm:m.opts&&m.opts.sansMailto}))`);
  vrai('un courriel est parti, au client, PDF joint, au nom de Bêta (la société de CE passage)', m1.length === 1 && m1[0].to === 'elise@exemple.fr' && m1[0].brand === 'Bêta Hygiène' && /\.pdf:\d+/.test((m1[0].pj || [])[0] || ''), m1);
  await ouvrirPlan('iBeta'); t = await texte();
  vrai('après l’envoi : « Inchangé depuis l’envoi du… » et « Envoyé pour ce passage »', /Inchangé depuis/.test(t) && /Envoyé pour ce passage/.test(t) && /Renvoyer le même plan/.test(t), t);
  await capturer('2-envoye-inchange', carte);

  /* on change la zone d'un poste dans sa fiche : le document change */
  await S.ev(`papSheetZone('iBeta','poA','Cave'); closeModal(true); await new Promise(r=>setTimeout(r,200)); return 1;`);
  await ouvrirPlan('iBeta'); t = await texte();
  vrai('après un changement de zone : « Modifié depuis l’envoi », le bouton propose la version suivante', /Modifié depuis/.test(t) && /Envoyer le nouveau plan \(version 3/.test(t), t);
  await capturer('3-modifie', carte);

  /* un envoi REFUSÉ : rien ne s'écrit, aucun brouillon */
  const avant = await S.ev(`return JSON.stringify({p:db.plansSite.cX.map(p=>[p.version,(p.implantationEnvoyee||{}).v]),e:db.interventions.find(i=>i.id==='iBeta').planEnvoi.ts})`);
  await S.ev(`window.__mailOk=false; await papImplantationEnvoyer('cX','iBeta'); window.__mailOk=true; return 1;`);
  const apres = await S.ev(`return JSON.stringify({p:db.plansSite.cX.map(p=>[p.version,(p.implantationEnvoyee||{}).v]),e:db.interventions.find(i=>i.id==='iBeta').planEnvoi.ts})`);
  vrai('un envoi refusé ne change ni les versions ni la trace', avant === apres, [avant, apres]);
  vrai('… et n’ouvre aucun brouillon sans pièce jointe', (await S.ev('return window.__mailto')) === 0);

  /* on renvoie : le nouveau plan part en version 3 */
  await S.ev(`await papImplantationEnvoyer('cX','iBeta'); return 1;`);
  const v3 = await S.ev(`return [db.plansSite.cX[0].version, db.plansSite.cX[0].implantationEnvoyee.v, window.__mails.slice(-1)[0].subject]`);
  vrai('le nouveau plan part en version 3, et le sujet dit « mis à jour »', v3[0] === 3 && v3[1] === 3 && /mis à jour/.test(v3[2]), v3);

  /* la fenêtre de fin de passage, sur un passage pas encore servi */
  await S.ev(`clotureSuiteModal('iAlpha'); await new Promise(r=>setTimeout(r,500)); return 1;`);
  const clo = await S.ev(`const z=document.getElementById('clot-plan'); return z?z.textContent.replace(/\\s+/g,' ').trim():''`);
  vrai('fin de passage : la fenêtre rappelle le plan d’implantation, avec son bouton', /Plan d.implantation/.test(clo) && /Renvoyer le même plan|Envoyer/.test(clo), clo);
  vrai('… et ne prétend plus que le rapport par e-mail inclut le plan', !(await S.ev(`return /le PDF inclut les photos et le plan/.test(document.querySelector('.modal')?.textContent||'')`)));
  await capturer('4-fin-de-passage', `document.querySelector('#overlay .modal')||document.querySelector('.modal')`);
  await S.ev(`const b=document.querySelector('#clot-plan .pap-impl-btn'); b.click(); await new Promise(r=>setTimeout(r,2500)); return 1;`);
  const clo2 = await S.ev(`const z=document.getElementById('clot-plan'); return z?z.textContent.replace(/\\s+/g,' ').trim():''`);
  vrai('… un appui, et la ligne dit « envoyé pour ce passage »', /envoyé pour ce passage/.test(clo2), clo2);
  await S.ev(`closeModal(true); return 1;`);

  /* Paramètres : les coordonnées d'une société */
  await S.ev(`go('parametres'); await new Promise(r=>setTimeout(r,700)); socCoordModal(0); await new Promise(r=>setTimeout(r,400)); return 1;`);
  const champs = await S.ev(`return [...document.querySelectorAll('#soc-coord input')].map(i=>i.name)`);
  vrai('Paramètres → Mes sociétés → Coordonnées : les dix champs', champs.length === 10 && champs.includes('siret') && champs.includes('iban'), champs);
  await capturer('5-coordonnees-societe', `document.querySelector('#overlay .modal')||document.querySelector('.modal')`);
  vrai('aucune erreur JavaScript', S.exceptions.length === 0, S.exceptions.slice(0, 3));
  S.fermer();
  console.log(`\n════ sonde-implantation : ${ok} ✓ ${ko} ✗ ════   (captures : ${SORTIE})`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
