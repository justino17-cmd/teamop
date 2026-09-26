/* v758 — la pile des collègues ne coupe plus le TITRE d'une carte du planning (vues Jour et Multi).
   Mesuré le 26 septembre 2026 sur la bêta v758 : dans la vue Jour, 4 techniciens, bureau 1 280 px, « Dératisation
   partagée » sortait « Dératisation parta… » et « Traitement à trois » « Traitement à troi… » — la pile posée devant
   l'heure prenait sa place au titre, sur TOUTES les cartes partagées ; la v756 (sans pile) les écrivait en entier.
   La sonde joue la même équipe que scratchpad/captures-couleurs-techs.js, puis, pour chaque carte partagée :
   · le titre tient-il (scrollWidth ≤ clientWidth du <b>) ?
   · la pile est-elle là, ENTIÈRE dans la carte, et est-ce bien elle qu'un doigt touche à son centre ?
   · une carte trop basse pour la ligne du client garde-t-elle sa pile (sur la ligne du titre) ?
   Usage : SOURCE=/chemin/beta.html node scratchpad/sonde-pile-client.js  (défaut : la bêta du dépôt)
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js). */
const { ouvrir, dormir } = require('./pilote.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t + (d !== undefined ? '  — ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); }
  else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  — ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };

const PREPARER = `window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
  const id=(j,s)=>Date.parse(j).toString(36)+s;
  const T={leo:id('2025-01-10','leoaa'), karim:id('2025-02-11','karim'), sofia:id('2025-03-12','sofia'), nina:id('2025-04-13','ninaa')};
  db.techniciens=[{id:T.leo,nom:'Léo Martin'},{id:T.karim,nom:'Karim Benali'},{id:T.sofia,nom:'Sofia Rossi'},{id:T.nina,nom:'Nina Dubois',couleur:'#2563EB'}];
  const cid=id('2025-05-01','clien'); db.clients=[{id:cid,nom:'Boulangerie du Port',adresse:'2 quai Est',ville:'La Rochelle',lat:46.155,lng:-1.15}];
  const auj=todayISO();
  db.interventions=[
    {id:id('2025-06-01','intaa'),num:'INT-0001',titre:'Dératisation partagée',clientId:cid,date:auj,heure:'09:00',duree:90,statut:'planifiee',techId:T.leo,techIds:[T.leo,T.karim],type:'Dératisation'},
    {id:id('2025-06-02','intbb'),num:'INT-0002',titre:'Contrôle seule',clientId:cid,date:auj,heure:'11:00',duree:60,statut:'planifiee',techId:T.sofia,techIds:[T.sofia],type:'Contrôle'},
    {id:id('2025-06-04','intdd'),num:'INT-0004',titre:'Traitement à trois',clientId:cid,date:auj,heure:'15:30',duree:60,statut:'planifiee',techId:T.karim,techIds:[T.karim,T.leo,T.sofia],type:'Désinsectisation'},
    {id:id('2025-06-05','intee'),num:'INT-0005',titre:'Passage éclair',clientId:cid,date:auj,heure:'17:00',duree:15,statut:'planifiee',techId:T.leo,techIds:[T.leo,T.nina],type:'Contrôle'}];
  if(!db.users.some(u=>u.id==='beta-justin')) db.users.push({id:'beta-justin',prenom:'Justin',nom:'Bernard',login:'justin',role:'admin',actif:true,essai:true});
  save(); currentUser=db.users.find(u=>u.id==='beta-justin');
  try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+'beta-justin','1')); }catch(e){}
  enterApp(currentUser); return 1;`;

/* chaque carte partagée de l'écran : titre, pile, place */
const RELEVE = `const out=[]; for(const c of document.querySelectorAll(SEL)){
    const b=c.querySelector(':scope > b'); if(!b) continue;
    const pile=c.querySelector('.tpil'); const tt=(b.querySelector('.tt')||b).textContent.trim();
    if(!/partagée|trois|éclair/.test(tt)) continue;
    const rc=c.getBoundingClientRect(); let piR=null, touche=false;
    if(pile){ pile.scrollIntoView({block:'center'}); }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void c.offsetWidth;
    const rc2=c.getBoundingClientRect();
    if(pile){ const q=pile.getBoundingClientRect(); piR={l:q.left-rc2.left,r:rc2.right-q.right,t:q.top-rc2.top,b:rc2.bottom-q.bottom,w:q.width};
      const e=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2); touche=!!e&&(pile===e||pile.contains(e)); }
    out.push({tt, h:Math.round(rc.height), coupe:b.scrollWidth>b.clientWidth+1, bw:b.clientWidth, bsw:b.scrollWidth,
      pileOu:pile?(b.contains(pile)?'titre':(pile.closest('.ci-av')?'client':'ailleurs')):'aucune', piR, touche,
      colonne:(c.closest('[data-ligne]')||{}).getAttribute?c.closest('[data-ligne]').getAttribute('data-ligne'):''}); }
  return out;`;

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  try {
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await S.ev(PREPARER); await dormir(1200);

    console.log('\n── vue Jour, bureau 1 280 px, 4 techniciens ──');
    await S.ev(`planMode='jour'; planSel=todayISO(); planTechM=null; go('planning'); return 1;`); await dormir(1100);
    const J = await S.ev(RELEVE.replace('SEL', JSON.stringify('.plt-blk')));
    vrai('population : les cartes partagées de la vue Jour sont relevées (2 + 3 + 2 lignes)', J.length >= 7, J.length);
    const hautes = J.filter(x => x.h >= 34 && x.tt !== 'Passage éclair');
    vrai('⛔ aucun titre de carte partagée n’est coupé', hautes.every(x => !x.coupe), hautes.filter(x => x.coupe).map(x => x.tt + ' ' + x.bw + '/' + x.bsw));
    vrai('…la pile est en bout de ligne du CLIENT, plus devant l’heure', hautes.every(x => x.pileOu === 'client'), [...new Set(hautes.map(x => x.pileOu))]);
    vrai('…entière dans la carte (ni coupée à droite ni en bas)', hautes.every(x => x.piR && x.piR.r >= 0 && x.piR.b >= 0 && x.piR.l >= 0), hautes.map(x => x.piR && [Math.round(x.piR.r), Math.round(x.piR.b)]));
    vrai('…et c’est elle qu’un doigt touche à son centre', hautes.every(x => x.touche), hautes.filter(x => !x.touche).map(x => x.tt));

    console.log('\n── vue Multi ──');
    await S.ev(`planMode='multi'; planSel=todayISO(); go('planning'); return 1;`); await dormir(1100);
    const M = await S.ev(RELEVE.replace('SEL', JSON.stringify('.plm-card')));
    vrai('population : les cartes partagées de la vue Multi sont relevées', M.length >= 7, M.length);
    const hautesM = M.filter(x => x.tt !== 'Passage éclair');
    vrai('la pile est en bout de ligne du client', hautesM.every(x => x.pileOu === 'client'), [...new Set(hautesM.map(x => x.pileOu))]);
    vrai('…entière dans la carte, et touchable', hautesM.every(x => x.piR && x.piR.r >= 0 && x.piR.b >= 0 && x.touche), hautesM.map(x => x.piR && [Math.round(x.piR.r), Math.round(x.piR.b), x.touche]));
    const coupesAvant = hautesM.filter(x => x.coupe).length;
    console.log('   (vue Multi : ' + coupesAvant + ' titre(s) coupé(s) sur ' + hautesM.length + ' — colonnes étroites, la coupe y est voulue ; la pile n’y prend plus rien)');

    console.log('\n── une carte trop basse pour la ligne du client (15 min) ──');
    const tous = J.concat(M).filter(x => x.tt === 'Passage éclair');
    vrai('population : la carte de 15 minutes est relevée', tous.length >= 2, tous.length);
    vrai('…elle garde sa pile (on ne perd jamais le collègue)', tous.every(x => x.pileOu === 'titre' || x.pileOu === 'client'), tous.map(x => x.pileOu + '/' + x.h + 'px'));
    vrai('…ENTIÈRE dans la carte, même à la hauteur minimale, et touchable', tous.every(x => x.piR && x.piR.r >= 0 && x.piR.b >= 0 && x.piR.t >= 0 && x.touche),
      tous.map(x => x.piR && { droite: Math.round(x.piR.r), bas: Math.round(x.piR.b), touche: x.touche }));
  } finally { S.fermer(); }
  console.log(`\n${ok} ✓  ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
