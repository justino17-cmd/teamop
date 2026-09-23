/* ══ LA CHARPENTE SUR CHAQUE APPAREIL — CE QUE LES AUDITS DU CONTENU NE VOYAIENT PAS ═════════
   Justin, 23 septembre 2026 : « vérifie l'application au complet… pour tous les appareils ».
   `audit-profond.js` mesure le CONTENU (#content, les fenêtres). Trois défauts de CHARPENTE lui
   ont échappé, et ils se voyaient à la première capture :
   1. sur iPad, le menu latéral ET la barre d'onglets à la fois — la pilule posée sur la carte
      utilisateur du menu (« Justin » et « Accueil » superposés) ;
   2. la bulle d'aide cachée derrière « Voir sur la carte », sur tablette ET au bureau ;
   3. sur un Android de 360 px et un iPhone SE, le tableau de bord ÉLARGISSAIT toute la page à
      382 px — et l'audit ne le voyait pas : il mesurait contre `innerWidth`, qui s'élargit avec
      la page. On mesure donc contre la largeur de l'APPAREIL.

   Pour chaque appareil et CHAQUE rubrique :
   · la page n'est pas plus large que l'écran (deux lectures, 700 ms d'écart : un débordement
     se confirme à la seconde, règle du dépôt) — et on NOMME ce qui dépasse ;
   · aucun élément fixe visible n'en recouvre un autre (barres, menu, boutons flottants) ;
   · la bonne navigation : barre d'onglets au téléphone, menu permanent sur tablette et bureau,
     jamais les deux ;
   · les rubriques du menu tiennent sur une ligne.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-appareils.js [profil,profil…]                              */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { profil, poserProfil } = require(path.join(__dirname, 'profils.js'));
const LISTE = (process.argv[2] || 'petitand,se,tel,android,promax,ipad,ipadh,bureau,mac14,mac27,win,winapp').split(',');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };

(async () => {
  for (const nom of LISTE) {
    const P = profil(nom);
    const S = await ouvrir();
    console.log('\n══ ' + nom + ' — ' + P.lbl + ' (' + P.w + '×' + P.h + ') · page ' + S.version);
    await poserProfil(S, P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_lang','fr'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1300);
    await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); setThemePref('${P.theme}'); try{ localStorage.setItem('elanB_aside','1'); renderNav(); }catch(e){} return 1;`);
    await dormir(1500);
    /* LONGUES=1 : les données de démonstration sont COURTES (« 0h00 », « Client de test 3 ») et
       flattent toute mise en page. On pose les valeurs les plus longues plausibles avant de
       parcourir — c'est ainsi que Pointage et Enveloppes ont été trouvés (règle du dépôt). */
    if (process.env.LONGUES) {
      const n = await S.ev(`const NOM='Établissements Hospitaliers Universitaires de la Côte-Saint-Laurent';
        const ADR='1234 boulevard du Maréchal-de-Lattre-de-Tassigny, Résidence Les Hauts-de-Seine, bâtiment C';
        const LIB='Traitement curatif et préventif complet des parties communes, caves et locaux techniques';
        let k=0;
        (db.clients||[]).forEach((c,i)=>{ c.nom=NOM+' — site '+(i+1); c.adresse=ADR; c.ville='Saint-Rémy-de-Provence-sur-Mer'; k++; });
        (db.techniciens||[]).forEach((t,i)=>{ t.nom='Jean-Christophe Delacroix-Montgolfier '+(i+1); k++; });
        (db.produits||[]).forEach((x,i)=>{ x.nom='Gel appât cafards professionnel longue durée, seringue de 35 g — réf. '+(i+1); k++; });
        (db.fournisseurs||[]).forEach((f,i)=>{ f.nom='Société Européenne de Distribution de Produits Biocides '+(i+1); k++; });
        ['factures','devis'].forEach(c=>(db[c]||[]).forEach(d=>{ (d.lignes||[]).forEach(l=>{ if(l.pu!=null) l.pu=(+l.pu||1)*1000+0.67; if(l.designation!=null) l.designation=LIB; }); k++; }));
        (db.interventions||[]).forEach((x,i)=>{ x.titre=LIB+' '+(i+1); k++; });
        (db.enveloppes||[]).forEach(e=>{ (e.paiements||[]).forEach(q=>{ q.montant=(+q.montant||1)*1000+0.67; }); k++; });
        save(); return k;`);
      console.log('  données LONGUES posées sur ' + n + ' enregistrements');
    }
    const CATS = await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]&&canSee(NAV.flatMap(g=>g.items).find(i=>i.k===k)));`);
    const nErr0 = S.exceptions.length;
    const telephone = P.w <= 780 && P.tac;
    const LIRE = `await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
      const W=${P.w};
      const vis=e=>{ if(!e) return false; const q=getComputedStyle(e), b=e.getBoundingClientRect(); return q.display!=='none'&&q.visibility!=='hidden'&&+q.opacity>0.05&&b.width>1&&b.height>1; };
      const R=e=>{ const b=e.getBoundingClientRect(); return {l:b.left,t:b.top,r:b.right,b:b.bottom}; };
      const nom=e=>(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/)[0]:e.tagName);
      /* ce qui dépasse la largeur de l'APPAREIL, hors conteneurs qui défilent et tiroir fermé */
      const dansRouleau=e=>{ for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){ const q=getComputedStyle(n);
        if(/auto|scroll|hidden|clip/.test(q.overflowX)&&n.getBoundingClientRect().right<=W+0.5) return true; } return false; };
      const tiroirFerme=e=>{ const s=e.closest('.sidebar'); return !!(s&&getComputedStyle(s).transform!=='none'&&!s.classList.contains('open')); };
      const larges=document.documentElement.scrollWidth>W+1?[...document.querySelectorAll('body *')].filter(e=>{ const b=e.getBoundingClientRect();
        return b.width>0&&b.right>W+1&&getComputedStyle(e).position!=='fixed'&&!dansRouleau(e)&&!tiroirFerme(e); }).slice(0,5).map(e=>nom(e)+':'+Math.round(e.getBoundingClientRect().right)):[];
      /* les éléments FIXES visibles de la charpente, deux à deux */
      const fixes=['#tabbar','#sidebar','.topbar','#assistant > .fab','.plm-fab','#msg-flot','.boxsel-pied'].map(s=>document.querySelector(s)).filter(e=>vis(e)&&!tiroirFerme(e)
        &&(getComputedStyle(e).position==='fixed'||e.id==='sidebar'));
      const croise=(a,b)=>a.l<b.r-1&&b.l<a.r-1&&a.t<b.b-1&&b.t<a.b-1;
      const paires=[]; for(let i=0;i<fixes.length;i++) for(let j=i+1;j<fixes.length;j++){ const a=fixes[i], b=fixes[j];
        if(a.contains(b)||b.contains(a)) continue;
        /* la barre du haut vit À CÔTÉ du menu permanent, jamais dessus : leur arête commune n'est pas un chevauchement */
        if(croise(R(a),R(b))) paires.push(nom(a)+' × '+nom(b)); }
      return {sw:document.documentElement.scrollWidth, iw:innerWidth, larges, paires,
        barre:vis(document.getElementById('tabbar')), menuPermanent:vis(document.getElementById('sidebar'))&&!tiroirFerme(document.getElementById('sidebar')),
        erreur:(document.querySelector('#content .card h3')||{}).textContent==='Affichage indisponible'};`;
    const fautes = { larges: [], paires: [], nav: [], indispo: [] };
    for (const k of CATS) {
      await S.ev(`try{ closeModal(); }catch(e){} try{ go('${k}'); }catch(e){} window.scrollTo(0,0); return 1;`);
      await dormir(450);
      for (let i = 0; i < 20; i++) { if (!(await S.ev(`return !!document.querySelector('.content.entre');`))) break; await dormir(100); }
      let m = await S.ev(LIRE);
      if (m.larges.length || m.paires.length) { await dormir(700); m = await S.ev(LIRE); }   /* seconde lecture */
      if (m.larges.length) fautes.larges.push(k + ' ' + m.sw + ' px [' + m.larges.join(', ') + ']');
      if (m.paires.length) fautes.paires.push(k + ' : ' + m.paires.join(' ; '));
      if (telephone ? (!m.barre || m.menuPermanent) : (m.barre || !m.menuPermanent)) fautes.nav.push(k + ' barre:' + m.barre + ' menu:' + m.menuPermanent);
      if (m.erreur) fautes.indispo.push(k);
    }
    /* le menu, ouvert : chaque rubrique sur UNE ligne */
    const menu = await S.ev(`const sb=document.getElementById('sidebar'); sb.classList.add('open'); await new Promise(r=>setTimeout(r,450));
      const it=[...sb.querySelectorAll('.nav-item')].filter(e=>e.getBoundingClientRect().height>0);
      const h=it.map(e=>e.getBoundingClientRect().height); const base=Math.min(...h);
      const r={n:it.length, largeur:Math.round(sb.getBoundingClientRect().width), surDeux:it.filter(e=>e.getBoundingClientRect().height>base*1.3).map(e=>e.textContent.trim())};
      sb.classList.remove('open'); return r;`);
    const neuves = S.exceptions.slice(nErr0);
    vrai(nom + ' · population : ' + CATS.length + ' rubriques parcourues', CATS.length >= 35, CATS.length);
    vrai(nom + ' · aucune page plus large que l’écran (' + P.w + ' px)', !fautes.larges.length, fautes.larges);
    vrai(nom + ' · aucun élément fixe posé sur un autre', !fautes.paires.length, fautes.paires);
    vrai(nom + ' · ' + (telephone ? 'barre d’onglets, menu en tiroir' : 'menu permanent, pas de barre d’onglets') + ' — jamais les deux', !fautes.nav.length, fautes.nav);
    vrai(nom + ' · aucune rubrique « Affichage indisponible »', !fautes.indispo.length, fautes.indispo);
    vrai(nom + ' · les ' + menu.n + ' rubriques du menu tiennent sur une ligne (menu ' + menu.largeur + ' px)', menu.n >= 35 && !menu.surDeux.length, menu.surDeux);
    vrai(nom + ' · aucune erreur JavaScript', !neuves.length, neuves.slice(0, 3));
    S.fermer();
  }
  console.log('\n  ' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
