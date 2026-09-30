/* ══ MOUVEMENTS — LA BARRE DE FILTRES NE VOLE JAMAIS LA BARRE DU HAUT, ET PASSE AU-DESSUS DU VOILE QUAND IL FAUT ══
   Contre-vérification de la v751 (26 septembre 2026) : le correctif « la recherche répond pendant que “Filtrer par
   box” est ouvert » posait `.mvt-bar{z-index:51}` EN PERMANENCE. Or la barre défile avec la liste : dès qu'elle
   passait sous la barre du haut collante (z-index 5 au bureau, 30 au téléphone), elle la recouvrait — ☰, « + Créer »,
   la synchro, la cloche et la loupe ne répondaient plus (un vrai clic sur la loupe n'ouvrait plus « Rechercher
   partout »). Le rang ne se pose plus que sur la barre qui SUIT le voile (`.mvt-voile + .mvt-bar`).

   Deux questions, sur téléphone ET bureau, jouées par de vrais clics CDP :
   1. menu FERMÉ, liste défilée pour que la barre de filtres passe SOUS la barre du haut, à plusieurs hauteurs :
      chaque bouton de la barre du haut répond à son propre centre, et un vrai clic sur la loupe ouvre la recherche ;
   2. menu OUVERT : « Rechercher » répond et prend le focus, le champ du menu répond, et toucher ailleurs ferme le menu.
   Population prouvée : on compte les hauteurs où la barre de filtres RECOUVRE vraiment la barre du haut.

   Usage : node scratchpad/sonde-mvt-barre.js [chemin-beta]
   Mesuré le 26/09/2026 : bêta corrigée 18 ✓ 0 ✗. Contre-épreuves : `git show e5e7fd5:beta.html` (v751 d'avant ce
   correctif) 14 ✓ 4 ✗ — la barre du haut perd ses clics, téléphone ET bureau ; `git show 79c8a44:beta.html` (v750)
   14 ✓ 4 ✗ — « Rechercher » sous le voile, téléphone ET bureau. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { profil, poserProfil } = require(path.join(__dirname, 'profils.js'));
const SRC = process.argv[2];
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '\n      ' + d : '')); } };
const deuxTrames = S => S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; return 1;`);
async function clic(S, x, y) {
  await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await S.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function passe(nom) {
  const P = profil(nom);
  const S = await ouvrir(SRC ? { source: SRC } : {}); await poserProfil(S, P);
  console.log('\n── ' + P.lbl + ' · version servie ' + S.version + ' ──');
  /* le voile se reconnaît à son GESTE (« mvtMenu('') »), pas à sa classe : les versions d'avant la portent pas */
  await S.ev(`window.VOILE=()=>document.querySelector('#content [onclick="mvtMenu(\\'\\')"]'); return 1;`);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2200);
  await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); return 1;`); await dormir(700);
  await S.ev(`go('mouvements'); window.scrollTo(0,0); return 1;`); await dormir(1800);
  /* Au bureau, la démonstration tient sur un écran (page de 1 022 px pour 900) : la barre de filtres ne peut
     jamais monter jusqu'à la barre du haut, et la partie 1 compterait zéro recouvrement. Une entreprise qui
     travaille a des centaines de mouvements : on en recopie (identifiants neufs) jusqu'à ce que la page défile
     assez, et on le DIT. */
  const ajoutes = await S.ev(`db.mouvements=db.mouvements||[]; const p=(db.produits||[])[0]; if(!p) return -1; let k=0;
    const assez=()=>{ const b=document.querySelector('.mvt-bar'); return document.documentElement.scrollHeight-innerHeight > b.getBoundingClientRect().top+scrollY+120; };
    while(!assez() && k<600){ for(let i=0;i<40;i++,k++) db.mouvements.push({id:'sonde-mvt-'+k, ts:Date.now()-k*3600e3, produitId:p.id, type:k%2?'sortie':'entree', qte:1+k%5, unite:'u',
        motif:'Mouvement de la sonde', boxId:'', boxNomTxt:'', vehiculeId:'', technicien:'Justin B'}); views.mouvements(); await new Promise(r=>requestAnimationFrame(r)); }
    return k;`);
  console.log('  (mouvements recopiés pour que la liste défile : ' + ajoutes + ')');

  /* ── 1. menu fermé : la barre du haut garde ses clics, à toutes les hauteurs de défilement ── */
  const geo = await S.ev(`const b=document.querySelector('.mvt-bar'), t=document.querySelector('.topbar'); if(!b||!t) return null;
    return {barDoc:b.getBoundingClientRect().top+scrollY, barH:b.offsetHeight, topH:t.getBoundingClientRect().bottom, max:document.documentElement.scrollHeight-innerHeight, voile:!!VOILE()};`);
  vrai('la barre de filtres et la barre du haut existent, menu fermé (aucun voile)', geo && !geo.voile, JSON.stringify(geo));
  if (!geo) { S.fermer(); return; }
  let recouvre = 0, boutonsVus = 0, perdus = [];
  for (let k = -10; k <= geo.topH + 10; k += 15) {
    const y = Math.max(0, Math.min(geo.max, Math.round(geo.barDoc - k)));
    await S.ev(`window.scrollTo(0,${y}); return 1;`); await deuxTrames(S); await dormir(120);
    const r = await S.ev(`const b=document.querySelector('.mvt-bar').getBoundingClientRect(), t=document.querySelector('.topbar').getBoundingClientRect();
      const chev = b.top < t.bottom && b.bottom > t.top;
      const nom=e=>e?(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/)[0]:'')):'(rien)';
      const bts=[...document.querySelectorAll('.topbar button, .topbar [onclick]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>=8&&r.height>=8&&r.bottom>0&&getComputedStyle(e).visibility!=='hidden';});
      const faux=[]; bts.forEach(e=>{ const r=e.getBoundingClientRect(); const h=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); if(!(h===e||e.contains(h))) faux.push(nom(e)+' → '+nom(h)); });
      return {chev, n:bts.length, faux};`);
    if (r.chev) { recouvre++; boutonsVus += r.n; perdus.push(...r.faux.map(f => '[' + k + ' px] ' + f)); }
  }
  vrai('population : la barre de filtres passe SOUS la barre du haut à ' + recouvre + ' hauteurs de défilement (' + boutonsVus + ' boutons mesurés)', recouvre >= 3 && boutonsVus >= 3 * recouvre);
  vrai('⛔ chaque bouton de la barre du haut répond à son propre centre, même quand la liste passe dessous', perdus.length === 0, perdus.slice(0, 6).join(' · '));
  /* un VRAI clic sur la loupe, à la hauteur où la barre de filtres est à mi-chemin sous la barre du haut */
  await S.ev(`window.scrollTo(0,${Math.max(0, Math.min(geo.max, Math.round(geo.barDoc - geo.topH / 2)))}); return 1;`); await deuxTrames(S); await dormir(150);
  const pt = await S.ev(`const e=document.getElementById('search-btn'); if(!e) return null; const b=e.getBoundingClientRect(); const d=document.querySelector('.mvt-bar').getBoundingClientRect(), t=document.querySelector('.topbar').getBoundingClientRect();
    return b.width? {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), chev:d.top<t.bottom&&d.bottom>t.top}:null;`);
  if (pt) {
    await clic(S, pt.x, pt.y); await dormir(400);
    const ouvert = await S.ev(`return document.getElementById('overlay').classList.contains('open');`);
    vrai('⛔ un vrai clic sur la loupe ouvre « Rechercher partout » (barre de filtres sous la barre du haut : ' + pt.chev + ')', ouvert && pt.chev);
    await S.ev(`try{ closeModal(); }catch(e){} return 1;`); await dormir(300);
  } else vrai('la loupe de la barre du haut est visible', false);

  /* ── 2. menu ouvert : la recherche répond au-dessus du voile, et le voile ferme toujours le menu ── */
  await S.ev(`window.scrollTo(0,0); if(mvtMenuOuvert!=='box') mvtMenu('box'); return 1;`);
  let st = -1;
  for (let i = 0; i < 15; i++) {
    await deuxTrames(S);
    const h = await S.ev(`const q=document.getElementById('mvt-q'); if(!q) return 'absent'; const b=q.getBoundingClientRect(); const x=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return x?x.tagName:'rien';`);
    if (h && h !== 'HTML' && h !== 'BODY') { st = i; break; }
    await dormir(200);
  }
  const m = await S.ev(`const q=document.getElementById('mvt-q'), bq=document.getElementById('mvt-box-q');
    const au=e=>{ if(!e) return null; const b=e.getBoundingClientRect(); const h=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),lui:h===e||e.contains(h), sous:h?(h.id||h.className||h.tagName):'(rien)'}; };
    return {menu:mvtMenuOuvert, voile:!!VOILE(), q:au(q), bq:au(bq)};`);
  vrai('le menu « Filtrer par box » est ouvert, avec son voile (stable après ' + st + ' tour(s))', m.menu === 'box' && m.voile);
  vrai('⛔ « Rechercher » répond au-dessus du voile', m.q && m.q.lui, m.q && ('sous le doigt : ' + m.q.sous));
  vrai('   le champ du menu (« Chercher une box… ») répond toujours', m.bq && m.bq.lui, m.bq && ('sous le doigt : ' + m.bq.sous));
  if (m.q) { await clic(S, m.q.x, m.q.y); await dormir(250);
    vrai('   un vrai clic y pose le curseur', await S.ev(`return document.activeElement===document.getElementById('mvt-q');`)); }
  /* (en v750, le clic sur « Rechercher » tombait sur le voile et REFERMAIT le menu : on le rouvre avant la suite) */
  await S.ev(`if(mvtMenuOuvert!=='box') mvtMenu('box'); return 1;`); await dormir(600); await deuxTrames(S);
  const loin = await S.ev(`const b=document.querySelector('.mvt-menu').getBoundingClientRect(), d=document.querySelector('.mvt-bar').getBoundingClientRect();
    const y=Math.min(innerHeight-40, Math.max(b.bottom, d.bottom)+60); const x = b.left>innerWidth/2 ? 30 : innerWidth-30; return {x:Math.round(x), y:Math.round(y)};`);
  await clic(S, loin.x, loin.y); await dormir(400);
  vrai('   toucher ailleurs (sur le voile) ferme le menu', await S.ev(`return mvtMenuOuvert==='' && !VOILE();`));
  S.fermer();
}

(async () => {
  for (const n of ['tel', 'bureau']) await passe(n);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
