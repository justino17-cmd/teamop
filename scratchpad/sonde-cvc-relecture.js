/* ══ SONDE — CVC, CORRECTIFS DE RELECTURE (23 octobre 2026) ══════════════════════════════════════════════════════════
   Vraie page (copie locale de beta.html, 127.0.0.1), jour ET nuit, bureau 1440 / 1100 px et téléphone 390 px (encoches posées, au doigt),
   valeurs LONGUES. Mesure ce que les bancs ne voient pas :
     · les deux cases du formulaire d'appareil (détection de fuite, hermétiquement scellé) : cible de 44 px, libellé entier, rien ne déborde ;
     · la carte de l'intervention avec un appareil RETIRÉ du parc : sa fiche fluides et son attestation restent lisibles, sans déborder ;
     · la carte d'échéances qui jette : « indisponibles » est visible, pas un écran vide.
   CAPTURES=dossier, PROF=bureau|bureau1100|tel. Bêta uniquement. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
PROFILS.bureau1100 = Object.assign({}, PROFILS.bureau, { w: 1100, h: 800, lbl: 'Mac 1100 px' });
let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
(async () => {
  const S = await ouvrir(); console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const calme = () => S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50)); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; return 1;`);
  const capture = async nom => { if (!CAP) return; await dormir(250); try { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(im.data, 'base64')); } catch (e) { console.log('  (capture refusée : ' + nom + ')'); } };
  const LONG = 'Établissements Dupont-Lefèvre de la Grande Boulangerie Industrielle et Artisanale de Haute-Normandie';
  const pop = await S.ev(`db.metier='chauffage';
    db.clients=db.clients.filter(c=>!/^c-rel/.test(c.id)); db.interventions=db.interventions.filter(i=>!/^i-rel/.test(i.id)); db.appareils=[];
    db.clients.push({id:'c-rel1',nom:${JSON.stringify(LONG)},adresse:'12 rue des Écoles, 76000 Rouen',email:'a@b.fr',typeClient:'pro'});
    db.appareils.push({id:'a-rel2',clientId:'c-rel1',type:'clim_split',marque:'Daikin',modele:'Altherma 3 R ECH2O',fluide:'R32',charge:1.2,miseEnService:'2024-11-10',emplacement:'Toit-terrasse du bâtiment annexe nord',nom:'x'});
    db.appareils.forEach(a=>{ a.nom=cvcLibelle(a); });
    db.interventions.push({id:'i-rel1',num:'INT-REL-1',clientId:'c-rel1',titre:'Entretien '+${JSON.stringify(LONG)},type:'Entretien climatisation',statut:'terminee',date:'2026-10-20',heure:'09:00',duree:60,appareilIds:['a-rel2','a-rel9'],compteRendu:'',produitsUtilises:[],equipements:[],
      fichesFluides:[{id:'f-rel1',appareilId:'a-rel9',appLabel:'Climatiseur multisplit · Mitsubishi Electric Europe MXZ-3F54VF retiré',date:'2025-06-02',nature:'Mise en service',fluide:'R410A',charge:3.4,recup:0,controle:true,resultat:'conforme',vignette:'bleue'}],
      attestations:{'a-rel9':{etabliLe:'2025-06-03',envoyeeLe:1790000000000,envoyeeA:'a@b.fr'}}});
    save(); return {metier:metierId(), parc:metierGereParc()};`);
  c('(population) métier chauffage, parc géré', pop.metier === 'chauffage' && pop.parc, pop);
  for (const cle of (process.env.PROF ? [process.env.PROF] : ['bureau', 'bureau1100', 'tel'])) {
    const P = PROFILS[cle];
    if (P.tac) await poserProfil(S, P); else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: false });
    await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const theme of ['light', 'dark']) {
      const J = P.lbl + ', ' + (theme === 'light' ? 'jour' : 'nuit'), tag = cle + '-' + theme; console.log('\n══ ' + J + ' ══');
      await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); db.metier='chauffage'; return 1;`); await dormir(400);
      /* 1. formulaire d'appareil : les deux cases */
      await S.ev(`formAppareil('','c-rel1'); return 1;`); await dormir(600); await calme();
      await S.ev(`const f=document.getElementById('cvc-form'); const e=f.elements.type; e.value='clim_split'; e.dispatchEvent(new Event('change',{bubbles:true})); return 1;`); await dormir(300);
      const m1 = await S.ev(`const L=['detection','scelle'].map(n=>{ const i=document.querySelector('#cvc-form input[name='+n+']'); const l=i&&i.closest('label'); if(!l) return null; const r=l.getBoundingClientRect(), ri=i.getBoundingClientRect(); const M=document.getElementById('modal').getBoundingClientRect();
        return {n, h:Math.round(r.height), w:Math.round(r.width), visible:r.width>0, caseDansLabel:ri.left>=r.left-1&&ri.right<=r.right+1, dansModale:r.right<=M.right+1&&r.left>=M.left-1, txt:l.textContent.trim().slice(0,30)}; });
        return {L, pageX:document.documentElement.scrollWidth-document.documentElement.clientWidth};`);
      c('formulaire : « détection » et « scellé » existent, ≥ 44 px de haut, dans la fenêtre', m1.L.every(x => x && x.visible && x.h >= 44 && x.dansModale && x.caseDansLabel), m1);
      c('… la page ne glisse pas de côté (' + m1.pageX + ' px)', m1.pageX <= 1, m1);
      await S.ev(`document.querySelector('#cvc-form input[name=scelle]').scrollIntoView({block:'center'}); return 1;`); await capture('rel-1-cases-' + tag);
      /* un doigt (ou la souris) sur la case : elle bascule */
      const bas = await S.ev(`const i=document.querySelector('#cvc-form input[name=detection]'); const l=i.closest('label'); const r=l.getBoundingClientRect(); return {x:Math.round(r.left+r.width-12), y:Math.round(r.top+r.height/2), av:i.checked};`);
      if (P.tac) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bas.x, y: bas.y, id: 1 }] }); await dormir(40); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await S.c.envoyer('Input.dispatchMouseEvent', { type, x: bas.x, y: bas.y, button: 'left', clickCount: 1 });
      await dormir(300);
      const ap = await S.ev(`return document.querySelector('#cvc-form input[name=detection]').checked;`);
      c('toucher le bout droit du libellé bascule la case (la cible fait la ligne)', ap === !bas.av, { av: bas.av, ap });
      await S.ev(`closeModal(true); return 1;`);
      /* 2. l'intervention avec l'appareil retiré */
      await S.ev(`detailIntervention('i-rel1'); return 1;`); await dormir(900); await calme();
      const m2 = await S.ev(`const k=document.getElementById('cvc-int'); const o=k&&k.querySelector('.cvc-orph'); const W=document.documentElement.clientWidth;
        const hors=o?[...o.querySelectorAll('*')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.right>W+1; }).length:-1;
        return {carte:!!k, orph:!!o, txt:o?o.textContent.replace(/\\s+/g,' ').trim():'', hors, pageX:document.documentElement.scrollWidth-W, boutons:o?o.querySelectorAll('button').length:-1};`);
      c('appareil retiré : sa fiche et son attestation sont lisibles dans la carte', m2.orph && /Appareil retiré du parc/.test(m2.txt) && /Mise en service/.test(m2.txt) && /Mitsubishi Electric Europe MXZ-3F54VF retiré/.test(m2.txt) && /Attestation d’entretien envoyée le/.test(m2.txt), m2);
      c('… sans bouton, sans rien qui dépasse (' + m2.hors + ' éléments, page ' + m2.pageX + ' px)', m2.boutons === 0 && m2.hors === 0 && m2.pageX <= 1, m2);
      await S.ev(`const o=document.querySelector('#cvc-int .cvc-orph'); if(o) o.scrollIntoView({block:'center'}); return 1;`); await capture('rel-2-retire-' + tag);
      await S.ev(`closeModal(true); try{ go('dashboard'); }catch(e){} return 1;`);
      /* 3. échéances qui jettent : la carte le dit */
      await S.ev(`window.__cp=cvcPropositions; window.cvcPropositions=function(){ throw new Error('donnée inattendue (sonde)'); }; window.__ce=console.error; console.error=function(){}; go('taches'); return 1;`); await dormir(900); await calme();
      const m3 = await S.ev(`const e=document.getElementById('cvc-taches'); return {carte:!!e, txt:e?e.textContent.replace(/\\s+/g,' ').trim():''};`);
      await S.ev(`window.cvcPropositions=window.__cp; console.error=window.__ce; return 1;`);
      c('échéances en panne : « indisponibles » est affiché dans les Tâches', m3.carte && /indisponibles/.test(m3.txt), m3);
      await capture('rel-3-indispo-' + tag);
      await S.ev(`go('taches'); return 1;`); await dormir(500);
    }
  }
  console.log('\n══ sonde CVC relecture : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
