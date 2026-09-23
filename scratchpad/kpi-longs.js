/* ══ LES RANGÉES D'INDICATEURS À VALEURS LONGUES, SUR CINQ LARGEURS ══════════════════════════
   Pointage, Enveloppes et la fiche d'une enveloppe forçaient trois colonnes. Les données de
   démonstration n'y mettent que « 0h00 » ou « 0,00 € » : on pose donc à la main les valeurs les
   plus longues plausibles (« 1523h30 », « 12 345,67 € ») et on demande à la PAGE si elle tient,
   et à chaque carte si elle contient sa valeur. Mesuré le 23 septembre 2026 : sur la bêta
   d'avant, page à 444–547 px sur les trois téléphones et 827 sur iPad ; après, 0 débordement.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/kpi-longs.js   (SOURCE=<beta d'avant> pour la contre-épreuve)       */
const path=require('path');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil } = require(path.join(__dirname,'profils.js'));
const SRC=process.env.SOURCE;
(async()=>{
  let ko=0;
  for (const nom of ['petitand','tel','promax','ipad','bureau']) {
    const P=profil(nom); const S=await ouvrir(SRC?{source:SRC}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); return 1;`); await dormir(800);
    const MESURE=(racine,vals)=>`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const g=${racine}; if(!g) return {absent:true};
      const k=[...g.querySelectorAll(':scope > .kpi')]; const v=${JSON.stringify(vals)};
      k.forEach((e,i)=>{ const x=e.querySelector('.kpi-val'); if(x&&v[i]) x.textContent=v[i]; });
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
      const cols=new Set(k.map(e=>Math.round(e.getBoundingClientRect().left))).size;
      const deborde=k.filter(e=>{ const x=e.querySelector('.kpi-val'); const b=e.getBoundingClientRect(), bx=x.getBoundingClientRect(); return x.scrollWidth>x.clientWidth+1 || bx.right>b.right+0.5; }).map(e=>e.querySelector('.kpi-val').textContent);
      return {cols, cartes:k.map(e=>Math.round(e.getBoundingClientRect().width)), deborde, page:document.documentElement.scrollWidth};`;
    const res={};
    await S.ev(`try{ closeModal(); }catch(e){} go('pointage'); window.scrollTo(0,0); return 1;`); await dormir(1800);
    res.pointage=await S.ev(MESURE(`document.querySelector('#content .kpis')`,['1523h30','31','245']));
    await S.ev(`try{ closeModal(); }catch(e){} go('enveloppes'); window.scrollTo(0,0); return 1;`); await dormir(1800);
    res.enveloppes=await S.ev(MESURE(`document.querySelector('#content .kpis')`,['12 345,67 €','8 210,00 €','4 135,67 €']));
    const aEnv=await S.ev(`return (db.enveloppes||[]).length;`);
    if(!aEnv) await S.ev(`db.enveloppes=db.enveloppes||[]; db.enveloppes.push({id:'envsonde',numero:'ENV-SONDE-1',clientNom:'Client sonde',paiements:[]}); return 1;`);
    await S.ev(`try{ ficheEnv(db.enveloppes[0].id); }catch(e){} return 1;`); await dormir(1200);
    res.fiche=await S.ev(MESURE(`document.querySelector('#overlay .kpis')`,['12 345,67 €','💵 8 210,00 €','📝 4 135,67 €']));
    const ok=['pointage','enveloppes','fiche'].every(c=>!res[c].absent && !res[c].deborde.length && res[c].page<=P.w);
    if(!ok) ko++;
    console.log((ok?'  ✓ ':'  ✗ ')+nom.padEnd(9)+P.w+'px  '+['pointage','enveloppes','fiche'].map(c=>c+' '+(res[c].absent?'ABSENT':res[c].cols+' col. '+JSON.stringify(res[c].cartes)+(res[c].deborde.length?' DÉBORDE '+JSON.stringify(res[c].deborde):'')+' page '+res[c].page)).join(' · '));
    S.fermer();
  }
  process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
