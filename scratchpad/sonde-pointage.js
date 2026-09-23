/* ══ SONDE — « DÉBUT DE JOURNÉE » ⇄ « FIN DE JOURNÉE », AU DOIGT, DANS UNE VRAIE PAGE ══════════
   Justin, 23 septembre 2026, capture de son iPhone : sur son compte d'administrateur, l'écran
   Pointage n'offrait que « Saisie manuelle ». Il veut, à sa place, un bouton « Début de journée »
   qui devient « Fin de journée » ; reprendre la même journée cumule, sans compter la pause ; et
   l'historique en dessous.
   Ce que la sonde joue, sur un iPhone de 402 px (encoches posées), par de VRAIS touchers sur le
   bouton de l'en-tête (`Input.dispatchTouchEvent`), HORLOGE EN MAIN (`Date.now` remplacé dans la
   page) — une pause se mesure en heures, pas en secondes :
   1. un compte SANS fiche du personnel (le cas de Justin) : 08:00 début, 12:00 fin, 13:30
      reprise, 17:30 fin — le bouton change d'état à chaque toucher, la carte « Ma journée »
      montre les lignes et la pause « non comptée », le total fait 8 h et pas 9 h 30 ;
   2. un RECHARGEMENT de la page : ce qui a été enregistré tient ;
   3. un TECHNICIEN relié à sa fiche : sa journée est la sienne, il ne voit pas celle de Justin.
   ⛔ On compte la population (touchers portés, lignes lues) : un « rien de cassé » sur zéro
   toucher ne prouve rien. ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.            */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  let ok = 0, ko = 0; const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

  const preparer = async () => {
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      window.confirm=()=>true; window.alert=()=>{};
      if(document.startViewTransition&&!window.__vtSuivi){ window.__vtSuivi=1; window.__vtN=0; const o=document.startViewTransition.bind(document);
        document.startViewTransition=function(cb){ window.__vtN++; const vt=o(cb); const f=()=>{ window.__vtN--; }; vt.finished.then(f,f); return vt; }; }
      /* l'horloge : la page lit Date.now, la sonde la règle */
      window.__t=Date.now(); Date.now=()=>window.__t; return 1;`);
  };
  const calme = async () => { for (let i = 0; i < 50; i++) { if (await S.ev(`return !(window.__vtN>0) && !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const heure = (h, m) => S.ev(`const d=new Date(); d.setHours(${h},${m},0,0); window.__t=d.getTime(); return 1;`);
  const entrer = async (qui) => {
    await S.ev(`${qui} try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`);
    await S.ev(`go('pointage'); return 1;`); await dormir(700); await calme();
    await S.ev(`try{ closeModal(); }catch(e){} window.scrollTo(0,0); return 1;`); await calme();
  };
  /* Le bouton du jour tel que le doigt le trouve : dans les actions de l'écran, visible. */
  const bouton = () => S.ev(`const rang=document.querySelector('#page-head .ph-actions'); if(!rang) return null;
    const b=[...rang.querySelectorAll('button')].find(x=>/pointer(Debut|Fin)\\(\\)/.test(x.getAttribute('onclick')||''));
    const pdf=[...rang.querySelectorAll('button')].find(x=>/ptPdf\\(\\)/.test(x.getAttribute('onclick')||''));
    if(!b) return {absent:true, textes:[...rang.querySelectorAll('button')].map(x=>x.textContent.trim())};
    const q=b.getBoundingClientRect(), qr=rang.getBoundingClientRect(), t=document.elementFromPoint(q.left+q.width/2,q.top+q.height/2);
    return {txt:b.textContent.replace(/\\s+/g,' ').trim(), cls:b.className, x:q.left+q.width/2, y:q.top+q.height/2, h:Math.round(q.height), w:Math.round(q.width), rang:Math.round(qr.width),
      dessus:!!(t&&(t===b||b.contains(t))), avantPdf:!!(pdf&&q.top<=pdf.getBoundingClientRect().top), textes:[...rang.querySelectorAll('button')].map(x=>x.textContent.trim())};`);
  let touches = 0;
  const taper = async (b) => {
    /* Sur une bêta d'avant (contre-épreuve), le bouton n'existe pas : on le COMPTE, on ne meurt pas. */
    if (!b || b.absent || b.x == null) { vrai('un bouton du jour à toucher existe', false, b); return; }
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] });
    await dormir(60); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    touches++; await dormir(700); await calme(); await S.ev(`window.scrollTo(0,0); return 1;`); await calme();
  };
  const carte = () => S.ev(`const c=document.querySelector('#content .pt-jour'); if(!c) return null;
    const tx=e=>e.textContent.replace(/\\s+/g,' ').trim();
    return {total:(c.querySelector('#pt-jour-sec')||{}).textContent||'', etat:tx(c.querySelector('#pt-jour-sec').nextElementSibling),
      lignes:[...c.querySelectorAll('.pt-seg')].map(tx), dits:[...c.querySelectorAll('.pt-seg')].map(e=>e.getAttribute('aria-label')||''),
      pauses:[...c.querySelectorAll('.pt-pause')].map(tx),
      boutons:[...c.querySelectorAll('button')].filter(x=>/pointer(Debut|Fin)/.test(x.getAttribute('onclick')||'')).length};`);
  const mes = (uid) => S.ev(`return (db.pointages||[]).filter(p=>p.userId===${JSON.stringify(uid)}).map(p=>({techId:p.techId,debut:p.debut,fin:p.fin||null}));`);

  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0, topMax: 59, bottomMax: 34, leftMax: 0, rightMax: 0 } }); } catch (e) {}
  await preparer();
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`);

  console.log('\n══ 1. UN COMPTE SANS FICHE DU PERSONNEL — le cas de Justin ══');
  const ADMIN = `db.users=db.users||[]; let u=db.users.find(x=>x.id==='u-justin'); if(!u){ u={id:'u-justin',prenom:'Justin',nom:'B',login:'justin',role:'admin',actif:true,pref:{}}; db.users.push(u); save(); } currentUser=u;`;
  await heure(8, 0); await entrer(ADMIN);
  v('population : l’écran Pointage est ouvert', await S.ev(`return current`), 'pointage');
  vrai('le compte n’a pas de fiche du personnel', await S.ev(`return !myTechId()`));
  let b = await bouton();
  vrai('⛔ l’en-tête porte le bouton du jour', !!b && !b.absent, b);
  v('… il dit « Début de journée »', b && b.txt, 'Début de journée');
  vrai('⛔⛔ « Saisie manuelle » n’est plus à l’écran', !(await S.ev(`return /Saisie manuelle/.test((document.getElementById('page-head')||{}).textContent+' '+document.getElementById('content').textContent)`)));
  vrai('⛔ c’est le bouton PRINCIPAL : en tête de la ligne, pleine largeur, ≥ 44 px, atteignable au doigt',
    !!b && b.avantPdf && b.w >= b.rang * 0.9 && b.h >= 44 && b.dessus, b && { w: b.w, rang: b.rang, h: b.h, dessus: b.dessus, avantPdf: b.avantPdf });
  let c = await carte();
  vrai('« Ma journée » est là, même sans fiche — et elle ne porte AUCUN second bouton', !!c && c.boutons === 0, c);
  vrai('… elle dit que la journée n’a pas commencé', !!c && /pas encore commencée/.test(c.etat), c && c.etat);

  await taper(b);                                     // 08:00 — début
  b = await bouton();
  v('⛔ après le toucher, le bouton dit « Fin de journée »', b && b.txt, 'Fin de journée');
  vrai('… avec la teinte de l’arrêt, et toujours en tête', !!b && /pt-fin/.test(b.cls) && b.avantPdf, b && b.cls);
  v('⛔ une journée est ouverte, SOUS LE COMPTE', await mes('u-justin'), [{ techId: '', debut: '08:00', fin: null }]);
  c = await carte();
  vrai('la carte dit « en cours — depuis 08:00:00 »', !!c && /en cours — depuis 08:00:00/.test(c.etat), c && c.etat);

  await heure(12, 0); b = await bouton(); await taper(b);   // 12:00 — fin
  b = await bouton();
  v('⛔ « Fin de journée » → le bouton propose de REPRENDRE', b && b.txt, 'Reprendre la journée');
  c = await carte();
  v('⛔ le temps de travail est là : 04:00:00', c && c.total, '04:00:00');
  /* ⚠️ PAS DE « → » DANS UN MOTIF : l'application le remplace par une icône MUETTE (icones(), EMO),
     et la première version de cette sonde l'a cherché dans le texte — le piège est écrit dans
     CLAUDE.md. On lit les deux heures, et la PHRASE que la ligne porte pour un lecteur d'écran. */
  vrai('… et la ligne de la matinée, en dessous (08:00:00, 12:00:00, 4h00)', !!c && c.lignes.length === 1 && /08:00:00/.test(c.lignes[0]) && /12:00:00/.test(c.lignes[0]) && /4h00/.test(c.lignes[0]), c && c.lignes);
  v('… qui DIT sa phrase à un lecteur d’écran (la flèche est muette)', c && c.dits[0], 'Période 1, de 08:00:00 à 12:00:00, 4h00');

  await heure(13, 30); b = await bouton(); await taper(b);  // 13:30 — reprise
  b = await bouton();
  v('la reprise remet « Fin de journée »', b && b.txt, 'Fin de journée');
  c = await carte();
  vrai('⛔⛔ la PAUSE est montrée — « 1h30 », « non comptée »', !!c && c.pauses.length === 1 && /1h30/.test(c.pauses[0]) && /non comptée/.test(c.pauses[0]), c && c.pauses);
  vrai('… et la deuxième ligne court', !!c && c.lignes.length === 2 && /13:30:00/.test(c.lignes[1]) && /en cours/.test(c.lignes[1]), c && c.lignes);
  v('… et le dit', c && c.dits[1], 'Période 2, depuis 13:30:00, en cours');

  await heure(17, 30); b = await bouton(); await taper(b);  // 17:30 — fin
  c = await carte();
  v('⛔⛔ le total CUMULE sans la pause : 08:00:00 (pas 09:30:00)', c && c.total, '08:00:00');
  vrai('… et le dit', !!c && /les pauses ne sont pas comptées/.test(c.etat), c && c.etat);
  v('deux lignes en base, la première intacte', await mes('u-justin'), [{ techId: '', debut: '08:00', fin: '12:00' }, { techId: '', debut: '13:30', fin: '17:30' }]);
  const histo = await S.ev(`const t=document.getElementById('content').textContent; return {nom:/Justin B/.test(t), jour:/8h00/.test(t)};`);
  vrai('l’historique de la période nomme la personne (son compte) et porte le total du jour', histo.nom && histo.jour, histo);

  console.log('\n══ 2. APRÈS UN RECHARGEMENT, CE QUI EST ENREGISTRÉ TIENT ══');
  await S.c.envoyer('Page.reload', {});
  let pret = false;
  for (let i = 0; i < 200; i++) { await dormir(300); try { if (await S.ev('return typeof db !== "undefined" && !!db && typeof enterApp==="function"')) { pret = true; break; } } catch (e) {} }
  vrai('population : la page est rechargée', pret);
  await preparer(); await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`);
  await entrer(`currentUser=db.users.find(x=>x.id==='u-justin');`);
  b = await bouton();
  v('rechargée, la page propose de REPRENDRE (la journée d’aujourd’hui est connue)', b && b.txt, 'Reprendre la journée');
  c = await carte();
  vrai('… le total, les deux lignes et la pause sont toujours là', !!c && c.total === '08:00:00' && c.lignes.length === 2 && c.pauses.length === 1, c);

  console.log('\n══ 3. UN TECHNICIEN, RELIÉ À SA FICHE ══');
  await heure(9, 0);
  await entrer(`db.techniciens=db.techniciens||[]; if(!db.techniciens.some(t=>t.id==='t-marc')) db.techniciens.push({id:'t-marc',nom:'Marc Terrain',metier:'Technicien'});
    let u=db.users.find(x=>x.id==='u-marc'); if(!u){ u={id:'u-marc',prenom:'Marc',nom:'Terrain',login:'marc',role:'technicien',techId:'t-marc',actif:true,pref:{}}; db.users.push(u); save(); } currentUser=u;`);
  v('population : il ouvre l’écran Pointage', await S.ev(`return current`), 'pointage');
  b = await bouton();
  v('⛔ la journée de Justin n’est pas la sienne : il voit « Début de journée »', b && b.txt, 'Début de journée');
  if (b && !b.absent) await taper(b);
  v('⛔ sa journée s’ouvre sur SA FICHE', await mes('u-marc'), [{ techId: 't-marc', debut: '09:00', fin: null }]);
  vrai('⛔ … et il ne lit nulle part la journée de Justin', !(await S.ev(`return /Justin B/.test(document.getElementById('content').textContent)`)));

  console.log('\n══ 4. POPULATION ET ERREURS ══');
  vrai('population : les 5 touchers ont porté (4 pour Justin, 1 pour le technicien)', touches >= 5, touches);
  console.log('exceptions :', JSON.stringify(S.exceptions.slice(0, 5)));
  vrai('aucune erreur JavaScript', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-pointage : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
