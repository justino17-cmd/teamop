/* ══ SONDE — LA BARRE DU BAS DE LA TOUR : la bulle qu'on attrape, et « Ma barre » ═════════════════
   Justin, 26 septembre 2026 : « en restant appuyé sur la barre, je puisse la personnaliser et choisir
   ce que je veux dans la barre, et aussi que le glissement de la bulle marche comme sur OP GESTION ».
   Tout se joue AU DOIGT : de vrais événements tactiles (`Input.dispatchTouchEvent`), la bulle relevée
   image par image sous le doigt que la PAGE a reçu (ce Chromium retient les mouvements de moins de
   ~15 px : on relève le doigt côté page, règle du dépôt). Le banc est celui de la sonde du thème :
   tour.html servi sur 127.0.0.1, l'API simulée dans la page — aucune requête ne sort, aucune donnée
   réelle n'entre.
   Chaque contrôle prouve d'abord sa population (des onglets, une bulle, des lignes de réglage).
   Usage : node scratchpad/sonde-tour-barre.js
           TOUR_FICHIER=scratchpad/tour-266.html node scratchpad/sonde-tour-barre.js   (contre-épreuve) */
'use strict';
const { demarrer, onglet, STABLE, dormir } = require('./sonde-tour-theme.js');

const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined ? ' — ' + detail : '')); };
const pres = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 2 : tol);

/* la géométrie de la barre, telle que l'œil la voit */
const GEO = `${STABLE}
  const bar=document.getElementById('barre-bas'), cur=document.getElementById('bb-cur');
  const tabs=[...bar.querySelectorAll('.bb')].map(b=>{ const r=b.getBoundingClientRect(), cs=getComputedStyle(b);
    return {t:b.dataset.t||'_plus',c:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,on:b.classList.contains('on'),survol:b.classList.contains('survol'),bg:cs.backgroundColor,sh:cs.boxShadow,
      bdg:((b.querySelector('.bdg-r')||{}).textContent||''),bdgVu:!!(b.querySelector('.bdg-r')&&getComputedStyle(b.querySelector('.bdg-r')).display!=='none')}; });
  const rc=cur?cur.getBoundingClientRect():null;
  return {tabs,cur:rc?{c:rc.left+rc.width/2,w:rc.width,h:rc.height,op:+getComputedStyle(cur).opacity}:null,
    tire:bar.classList.contains('tire'),tab:TAB,app:APP,curOn:bar.classList.contains('cur-on'),doigt:window.__doigt,nav:(window.__nav||[]).slice(),
    feuille:!document.getElementById('feuille').hidden,reglage:document.querySelectorAll('#feuille [data-barre]').length};`;
const PREPARER = `
  if(!window.__prepare){ window.__prepare=1;
    document.addEventListener('touchstart',e=>{ if(e.touches[0]) window.__doigt=e.touches[0].clientX; },{capture:true,passive:true});
    document.addEventListener('touchmove',e=>{ if(e.touches[0]) window.__doigt=e.touches[0].clientX; },{capture:true,passive:true});
    const o=setTab; setTab=function(t){ (window.__nav=window.__nav||[]).push(t); return o.apply(this,arguments); }; }
  window.__nav=[]; return 1;`;
/* attendre la fin du glissement de la bulle (transition de 420 ms) */
const REPOS = 'await new Promise(r=>setTimeout(r,650));' + STABLE;

async function main() {
  const S = await demarrer();
  console.log('Sonde de la barre du bas de la Tour — tour.html ' + S.version);
  let populationOk = true;
  try {
    for (const mode of (process.env.MODES || 'dark,light').split(',')) {
      console.log('\n── téléphone · ' + mode + ' ──');
      const o = await onglet(S, 'telephone', mode);
      const touche = (type, x, y) => o.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
      const geo = () => o.ev(GEO);
      const ev = o.ev;
      await ev(`localStorage.removeItem('tour_barre_gestion'); localStorage.removeItem('tour_barre_messages'); if(APP!=='gestion') setApp('gestion',true); setTab('accueil',true); return 1;`);
      await ev('try{ renderBarreBas(); }catch(e){} ' + PREPARER);
      await ev(REPOS + ' return 1;');
      let g = await geo();
      const vues = g.tabs.map(t => t.t);
      if (g.tabs.length < 5) populationOk = false;
      v('population : la barre porte cinq boutons', g.tabs.length === 5, vues.join(' · '));
      v('par défaut, la barre d’avant à l’identique : Accueil · Surveill. · Entreprises · Accès · Plus', vues.join(',') === 'accueil,surveillance,entreprises,essais,_plus', vues.join(','));
      v('une bulle existe et elle est visible', !!g.cur && g.cur.op > 0.9 && g.curOn, JSON.stringify(g.cur));
      if (!g.cur) { populationOk = false; await o.fermer(); continue; }
      const T = n => g.tabs[n];
      v('au repos, la bulle est SOUS l’onglet ouvert (Accueil), à sa largeur', pres(g.cur.c, T(0).c) && pres(g.cur.w, T(0).w, 3), 'bulle ' + g.cur.c.toFixed(1) + ' / onglet ' + T(0).c.toFixed(1) + ', ' + g.cur.w.toFixed(1) + ' / ' + T(0).w.toFixed(1));
      v('une seule marque : l’onglet ouvert ne peint plus son propre fond', /rgba\(0, 0, 0, 0\)|transparent/.test(T(0).bg), T(0).bg);

      /* 1. un TAP sur un onglet : la vue s'ouvre, la bulle glisse jusqu'à lui */
      await touche('touchStart', T(2).c, T(2).y); await dormir(40); await touche('touchEnd');
      await ev(REPOS + ' return 1;'); g = await geo();
      v('un tap sur « Entreprises » ouvre la vue, une seule navigation', g.tab === 'entreprises' && g.nav.length === 1, g.tab + ' · ' + JSON.stringify(g.nav));
      v('…et la bulle a glissé sous « Entreprises »', pres(g.cur.c, g.tabs[2].c), g.cur.c.toFixed(1) + ' / ' + g.tabs[2].c.toFixed(1));

      /* 2. PRENDRE la bulle et la promener : elle suit le doigt 1:1, l'onglet dessous s'allume */
      await ev(PREPARER); g = await geo();
      const x0 = g.cur.c + 6, y0 = g.tabs[2].y;       // pris un peu à droite de son centre : elle ne doit PAS sauter
      await touche('touchStart', x0, y0); await ev(STABLE + 'return 1;');
      let gs = await geo();
      v('au contact de la bulle, elle se soulève tout de suite (avant tout mouvement)', gs.tire, 'tire=' + gs.tire);
      v('…sans sauter pour se centrer sous le doigt', pres(gs.cur.c, g.cur.c, 1.5), gs.cur.c.toFixed(1) + ' / ' + g.cur.c.toFixed(1));
      const ecarts = []; let survolOk = true;
      /* jusqu'à Accueil, puis retour vers Surveill. : un aller et un retour, dix mouvements */
      for (const dx of [-20, -40, -60, -80, -100, -120, -140, -120, -100, -80]) {
        const x = x0 + dx;
        await touche('touchMove', x, y0); await ev(STABLE + 'await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;');
        gs = await geo();
        if (gs.doigt != null) ecarts.push(Math.abs((gs.cur.c + 6) - gs.doigt));
        const proche = gs.tabs.slice(0, 4).reduce((m, t, i, a) => Math.abs(t.c - gs.cur.c) < Math.abs(a[m].c - gs.cur.c) ? i : m, 0);
        if (!gs.tabs[proche].survol) survolOk = false;
      }
      const emax = ecarts.length ? Math.max.apply(null, ecarts) : 99;
      v('population : le doigt a été reçu par la page à chaque mouvement', ecarts.length === 10, ecarts.length + ' / 10');
      v('la bulle tenue suit le doigt 1:1, à l’endroit où on l’a prise (écart max ≤ 2 px)', emax <= 2, 'écart max ' + emax.toFixed(2) + ' px sur ' + ecarts.map(e => e.toFixed(1)).join(', '));
      v('l’onglet sous la bulle s’allume en passant', survolOk);
      /* un compteur qui change EN PLEIN GESTE (le relevé des incidents, toutes les minutes) repasse par
         majBarreBas : la bulle tenue ne doit pas repartir à sa place sous le doigt */
      await ev(`setBdg('bdg-surv',7); return 1;`); await ev(STABLE + 'return 1;'); const gmi = await geo();
      v('un compteur qui change en plein geste ne reprend pas la bulle au doigt', gmi.tire && pres(gmi.cur.c + 6, gmi.doigt, 2), 'bulle ' + (gmi.cur.c + 6).toFixed(1) + ' / doigt ' + gmi.doigt);
      v('pendant le geste, aucune navigation', gs.nav.length === 0, JSON.stringify(gs.nav));
      await touche('touchEnd'); await ev(REPOS + ' return 1;'); g = await geo();
      v('on lâche au-dessus de « Surveill. » : la vue s’ouvre, UNE navigation (le tap qui suit est avalé)', g.tab === 'surveillance' && g.nav.length === 1, g.tab + ' · ' + JSON.stringify(g.nav));
      v('…et la bulle se pose sur l’onglet, soulèvement fini', !g.tire && pres(g.cur.c, g.tabs[1].c), g.cur.c.toFixed(1) + ' / ' + g.tabs[1].c.toFixed(1));

      /* 3. partir d'un AUTRE onglet : la bulle vient sous le doigt en 170 ms, puis le suit */
      await ev(PREPARER); g = await geo();
      const xa = g.tabs[3].c, ya = g.tabs[3].y;
      await touche('touchStart', xa, ya); await ev(STABLE + 'return 1;'); gs = await geo();
      v('posé sur un autre onglet, la bulle ne bouge pas encore (c’est peut-être un tap)', !gs.tire && pres(gs.cur.c, g.cur.c), 'tire=' + gs.tire);
      await touche('touchMove', xa - 20, ya); await dormir(260); await ev(STABLE + 'return 1;'); gs = await geo();
      v('dès qu’on glisse, elle vient sous le doigt (rattrapée en 170 ms)', gs.tire && gs.doigt != null && pres(gs.cur.c, gs.doigt, 2.5), 'bulle ' + gs.cur.c.toFixed(1) + ' / doigt ' + gs.doigt);
      await touche('touchMove', xa - 40, ya); await ev(STABLE + 'return 1;'); gs = await geo();
      v('…puis le suit 1:1', pres(gs.cur.c, gs.doigt, 2), 'bulle ' + gs.cur.c.toFixed(1) + ' / doigt ' + gs.doigt);
      await touche('touchEnd'); await ev(REPOS + ' return 1;'); g = await geo();
      v('lâchée sur « Entreprises » : la vue s’ouvre, une navigation', g.tab === 'entreprises' && g.nav.length === 1, g.tab + ' · ' + JSON.stringify(g.nav));

      /* 4. le bord : « Plus » n'est pas une place — la bulle résiste comme un ressort */
      await ev(PREPARER); g = await geo();
      const xb = g.cur.c;
      await touche('touchStart', xb, g.tabs[2].y); await ev(STABLE + 'return 1;');
      for (const dx of [20, 45, 70, 95, 120, 150]) { await touche('touchMove', xb + dx, g.tabs[2].y); await ev(STABLE + 'return 1;'); }
      gs = await geo();
      const bord = gs.tabs[3].c, demi = gs.tabs[3].w / 2;
      v('tirée vers « Plus », elle résiste : au-delà du dernier onglet, elle suit de moins en moins', gs.cur.c > bord && gs.cur.c < bord + demi && gs.doigt > bord + demi, 'bulle ' + gs.cur.c.toFixed(1) + ' / bord ' + bord.toFixed(1) + ' / doigt ' + gs.doigt);
      v('« Plus » ne s’allume jamais sous la bulle', !gs.tabs[4].survol);
      await touche('touchEnd'); await ev(REPOS + ' return 1;'); g = await geo();
      v('lâchée au bord : on obtient le dernier onglet (Accès), pas la feuille', g.tab === 'essais' && !g.feuille, g.tab + ' · feuille=' + g.feuille);

      /* 5. l'appui long sur un AUTRE onglet ouvre « Ma barre » ; sur la bulle, c'est une prise */
      await ev(`window.__lignes=[]; if(!window.__logLignes){ window.__logLignes=1; document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-barre]'); if(b) window.__lignes.push(b.dataset.barre); }); }
        const t=document.getElementById('toast'); t.textContent=''; t.style.display='none';` + PREPARER); g = await geo();
      await touche('touchStart', g.tabs[0].c, g.tabs[0].y); await dormir(750); await touche('touchEnd'); await ev(REPOS + 'return 1;');
      gs = await geo();
      const apres = await ev(`const t=document.getElementById('toast'); return {br:(_barreBrouillon||[]).join(','),lignes:window.__lignes.slice(),toast:t.style.display!=='none'?t.textContent:''};`);
      v('le relâcher de l’appui long ne touche AUCUNE ligne de la feuille montée sous le doigt', apres.lignes.length === 0 && apres.br === 'accueil,surveillance,entreprises,essais' && !/Quatre vues/.test(apres.toast), JSON.stringify(apres));
      v('appui long sur « Accueil » : la feuille « Ma barre » s’ouvre', gs.feuille && gs.reglage > 0, 'feuille=' + gs.feuille + ', ' + gs.reglage + ' lignes');
      v('…et le tap qui suit l’appui long est avalé (on reste sur la vue)', gs.tab === 'essais' && gs.nav.length === 0, gs.tab + ' · ' + JSON.stringify(gs.nav));
      const r1 = await ev(`const l=[...document.querySelectorAll('#feuille [data-barre]')].map(b=>({t:b.dataset.barre,rang:b.querySelector('.rang').textContent,p:b.getAttribute('aria-pressed')}));
        return {l, n:menuVisible().reduce((s,g)=>s+g.vues.length,0), compte:(document.getElementById('barre-compte')||{}).textContent};`);
      v('population : une ligne par vue que ce compte voit', r1.l.length === r1.n && r1.n >= 6, r1.l.length + ' lignes / ' + r1.n + ' vues');
      v('la barre actuelle y est numérotée 1 à 4, dans son ordre', r1.l.filter(x => x.rang).map(x => x.t + x.rang).sort().join(',') === ['accueil1', 'entreprises3', 'essais4', 'surveillance2'].sort().join(','), r1.l.filter(x => x.rang).map(x => x.t + x.rang).join(','));
      v('le compte dit « 4 / 4 »', /^4 \/ 4/.test(r1.compte || ''), r1.compte);
      /* retirer Accès, prendre Journal — au doigt, sur les lignes */
      const tapLigne = async (t) => { const p = await ev(`const b=document.querySelector('#feuille [data-barre="${t}"]'); b.scrollIntoView({block:'center'}); ${STABLE} const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,st:document.getElementById('feuille').scrollTop};`);
        await touche('touchStart', p.x, p.y); await dormir(40); await touche('touchEnd'); await ev(STABLE + 'await new Promise(r=>setTimeout(r,120)); return 1;'); return p; };
      await tapLigne('essais');
      const pj = await tapLigne('journal');
      const r2 = await ev(`return {l:[...document.querySelectorAll('#feuille [data-barre]')].filter(b=>b.querySelector('.rang').textContent).map(b=>b.dataset.barre+b.querySelector('.rang').textContent),
        compte:document.getElementById('barre-compte').textContent, st:document.getElementById('feuille').scrollTop, lignes:document.querySelectorAll('#feuille [data-barre]').length};`);
      v('toucher une vue choisie la retire, toucher une autre la prend à la suite', r2.l.join(',') === 'accueil1,surveillance2,entreprises3,journal4', r2.l.join(','));
      v('la feuille ne remonte pas en haut à chaque toucher (on repeint, on ne réécrit pas)', r2.st === pj.st && r2.lignes === r1.l.length, 'défilement ' + pj.st + ' → ' + r2.st);
      /* une cinquième est refusée, et le dit */
      await tapLigne('equipe');
      const r3 = await ev(`return {l:[...document.querySelectorAll('#feuille [data-barre]')].filter(b=>b.querySelector('.rang').textContent).length, toast:(document.getElementById('toast')||{}).textContent||''};`);
      v('une cinquième vue est refusée, et le toast le dit', r3.l === 4 && /Quatre vues au maximum/.test(r3.toast), r3.l + ' · « ' + r3.toast + ' »');
      /* ⛔ le toast est posé au-dessus des lignes : il ne doit pas avaler le toucher de celle qu'il couvre.
         On amène « Journal » (choisie) SOUS le toast encore affiché, et on la touche là. */
      const st = await ev(`const t=document.getElementById('toast'), f=document.getElementById('feuille'), b=f.querySelector('[data-barre="journal"]');
        const tr=t.getBoundingClientRect(), br=b.getBoundingClientRect(); f.scrollTop += (br.top+br.height/2)-(tr.top+tr.height/2); ${STABLE}
        const r=b.getBoundingClientRect(); const cx=r.left+r.width/2, cy=tr.top+tr.height/2;
        return {x:cx,y:cy,vis:getComputedStyle(t).display!=='none',dessus:tr.left<=cx&&tr.right>=cx&&tr.top<=cy&&tr.bottom>=cy&&+getComputedStyle(t).opacity>0.5,sous:!!(r.top<=cy&&r.bottom>=cy)};`);
      await touche('touchStart', st.x, st.y); await dormir(40); await touche('touchEnd'); await ev(STABLE + 'await new Promise(r=>setTimeout(r,150)); return 1;');
      const st2 = await ev(`return (_barreBrouillon||[]).join(',');`);
      v('population : le toast est affiché, et la ligne « Journal » est dessous', st.vis && st.dessus && st.sous, JSON.stringify(st));
      v('⛔ un toucher sous le toast atteint la ligne (le toast ne mange pas le tap)', st2 === 'accueil,surveillance,entreprises', st2);
      if (st2 === 'accueil,surveillance,entreprises') await ev(`barreBascule('journal'); return 1;`);
      /* Enregistrer */
      const pe = await ev(`const b=[...document.querySelectorAll('#feuille .barre-pied button')].find(x=>/Enregistrer/.test(x.textContent)); b.scrollIntoView({block:'center'}); ${STABLE} const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,h:r.height};`);
      v('« Enregistrer » est une cible au doigt (≥ 44 px)', pe.h >= 44, pe.h + ' px');
      await touche('touchStart', pe.x, pe.y); await dormir(40); await touche('touchEnd'); await ev(REPOS + 'await new Promise(r=>setTimeout(r,300)); return 1;');
      g = await geo();
      const cle = await ev(`return localStorage.getItem('tour_barre_gestion');`);
      v('enregistré : la barre devient Accueil · Surveill. · Entreprises · Journal · Plus', g.tabs.map(t => t.t).join(',') === 'accueil,surveillance,entreprises,journal,_plus' && !g.feuille, g.tabs.map(t => t.t).join(','));
      v('…rangé pour CETTE console seulement', cle === 'accueil,surveillance,entreprises,journal', cle);
      v('…la vue ouverte (Accès) est désormais derrière « Plus » : la bulle repose sur « Plus »', g.tab === 'essais' && pres(g.cur.c, g.tabs[4].c) && g.tabs[4].on, 'bulle ' + g.cur.c.toFixed(1) + ' / Plus ' + g.tabs[4].c.toFixed(1));

      /* 6. partir d'un onglet quand la bulle repose sur « Plus » : elle en VIENT, sans sauter */
      await ev(PREPARER); g = await geo();
      await touche('touchStart', g.tabs[3].c, g.tabs[3].y); await touche('touchMove', g.tabs[3].c - 20, g.tabs[3].y);
      await ev('return 1;'); const gdeb = await geo();
      v('prise depuis un onglet, la bulle part de « Plus » (là où on la voit), pas du doigt', gdeb.cur.c > gdeb.doigt + 10, 'bulle ' + gdeb.cur.c.toFixed(1) + ' / doigt ' + gdeb.doigt);
      await dormir(260); await touche('touchMove', g.tabs[3].c - 40, g.tabs[3].y); await ev(STABLE + 'return 1;'); gs = await geo();
      v('…et arrive sous le doigt', pres(gs.cur.c, gs.doigt, 2.5), 'bulle ' + gs.cur.c.toFixed(1) + ' / doigt ' + gs.doigt);
      await touche('touchEnd'); await ev(REPOS + 'return 1;'); g = await geo();
      v('lâchée sur « Entreprises » : la vue s’ouvre', g.tab === 'entreprises' && g.nav.length === 1, g.tab + ' · ' + JSON.stringify(g.nav));

      /* 7. les compteurs suivent la vue : ce qui est rangé derrière « Plus » s'additionne sur « Plus » */
      const cpt = await ev(`${STABLE} const n=id=>{ const e=document.getElementById(id); return e&&e.style.display!=='none'?(+e.textContent||0):0; };
        return {surv:n('bdg-surv'),supp:n('bdg-supp'),survBas:n('bdg-surv-bas'),plus:n('bdg-plus-bas'),suppBas:document.getElementById('bdg-supp-bas')?1:0};`);
      v('population : des compteurs à lire (incidents et courrier non lu)', cpt.surv > 0 && cpt.supp > 0, JSON.stringify(cpt));
      v('Surveillance, dans la barre, porte le sien ; le Courrier, derrière « Plus », y emporte le sien', cpt.survBas === cpt.surv && cpt.plus === cpt.supp && !cpt.suppBas, JSON.stringify(cpt));

      /* 8. la porte de « Plus », et Réinitialiser */
      await ev(`ouvrirFeuille('plus'); return 1;`); await ev(REPOS + 'return 1;');
      const porte = await ev(`const b=[...document.querySelectorAll('#feuille .groupe button')].find(x=>/Personnaliser la barre/.test(x.textContent)); if(!b) return null; b.scrollIntoView({block:'center'}); ${STABLE} const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};`);
      v('« Plus » porte « Personnaliser la barre »', !!porte);
      if (porte) { await touche('touchStart', porte.x, porte.y); await dormir(40); await touche('touchEnd'); await ev(REPOS + 'return 1;'); }
      gs = await geo();
      v('…qui ouvre « Ma barre »', gs.feuille && gs.reglage > 0, gs.reglage + ' lignes');
      await ev(`barreDefaut(); return 1;`);
      const rd = await ev(`return [...document.querySelectorAll('#feuille [data-barre]')].filter(b=>b.querySelector('.rang').textContent).map(b=>b.dataset.barre).join(',');`);
      v('« Réinitialiser » remet la barre d’origine dans le choix', rd === 'accueil,surveillance,entreprises,essais', rd);
      await ev(`barreValider(); return 1;`); await ev(REPOS + 'return 1;');
      g = await geo();
      const cle2 = await ev(`return localStorage.getItem('tour_barre_gestion');`);
      v('…et enregistrée, elle n’est pas écrite (la barre d’origine reste celle du code)', cle2 === null && g.tabs.map(t => t.t).join(',') === 'accueil,surveillance,entreprises,essais,_plus', String(cle2) + ' · ' + g.tabs.map(t => t.t).join(','));

      /* 9. l'appui tenu SUR la bulle est une prise, pas un menu */
      await ev(`setTab('surveillance',true); return 1;`); await ev(REPOS + PREPARER);
      g = await geo();
      await touche('touchStart', g.cur.c, g.tabs[1].y); await dormir(750); gs = await geo(); await touche('touchEnd'); await ev(REPOS + 'return 1;');
      const gf = await geo();
      v('un appui tenu sur la bulle la soulève sans ouvrir le réglage', gs.tire && !gs.feuille && !gf.feuille, 'tire=' + gs.tire + ', feuille=' + gs.feuille + '/' + gf.feuille);
      v('…et relâchée sur place, elle se repose, rien ne change', gf.tab === 'surveillance' && !gf.tire && pres(gf.cur.c, gf.tabs[1].c) && gf.nav.filter(x => x !== 'surveillance').length === 0, gf.tab + ' · ' + JSON.stringify(gf.nav));

      /* 9 bis. ⛔ un navigateur qui ne produit AUCUN clic au relâcher d'un appui long (ça arrive) : le tap
         suivant est un autre geste, il ne doit pas être avalé (relecture v2.67). On mange le clic du
         relâcher AVANT la page (écouteur de fenêtre), puis on touche le voile dans la demi-seconde. */
      await ev(`setTab('surveillance',true); return 1;`); await ev(REPOS + PREPARER); g = await geo();
      await ev(`window.__mange=1; if(!window.__mangeur){ window.__mangeur=1; window.addEventListener('click',e=>{ if(window.__mange){ window.__mange=0; e.stopImmediatePropagation(); e.preventDefault(); } },true); } return 1;`);
      await touche('touchStart', g.tabs[0].c, g.tabs[0].y); await dormir(750); await touche('touchEnd'); await dormir(120);
      const av = await ev(`return {feuille:!document.getElementById('feuille').hidden, mange:window.__mange};`);
      await touche('touchStart', 195, 110); await dormir(40); await touche('touchEnd'); await ev(REPOS + 'return 1;');
      const ap = await ev(`const f=document.getElementById('feuille'); return {ouverte:!f.hidden&&f.classList.contains('on')};`);
      v('population : la feuille est ouverte, et le clic du relâcher n’a jamais atteint la page', av.feuille && av.mange === 0, JSON.stringify(av));
      v('⛔ sans clic au relâcher, le tap suivant (sur le voile) n’est PAS avalé : la feuille se ferme', !ap.ouverte, JSON.stringify(ap));
      await ev(`window.__mange=0; try{ fermerFeuille(); }catch(e){} return 1;`); await ev(REPOS + 'return 1;');

      /* 10. le rangement plein : le choix s'applique quand même, et on le dit */
      await ev(`window.__setItem=Storage.prototype.setItem; Storage.prototype.setItem=function(){ throw new DOMException('plein','QuotaExceededError'); };
        ouvrirFeuille('barre'); barreBascule('essais'); barreBascule('journal'); barreValider(); return 1;`);
      await ev(REPOS + 'return 1;'); g = await geo();
      const toastPlein = await ev(`const t=(document.getElementById('toast')||{}).textContent||''; Storage.prototype.setItem=window.__setItem; return t;`);
      v('rangement plein : la barre change quand même, pour cette visite', g.tabs.map(t => t.t).join(',') === 'accueil,surveillance,entreprises,journal,_plus', g.tabs.map(t => t.t).join(','));
      v('…et le toast dit qu’elle ne sera pas gardée', /appareil est plein/.test(toastPlein), '« ' + toastPlein + ' »');
      await ev(`_barreRepli={}; localStorage.removeItem('tour_barre_gestion'); renderBarreBas(); return 1;`);

      /* 11. une console, une barre : MESSAGES garde la sienne */
      await ev(`localStorage.setItem('tour_barre_gestion','journal,equipe'); renderBarreBas(); setApp('messages',true); return 1;`); await ev(REPOS + 'return 1;');
      g = await geo();
      v('console MESSAGES : sa barre à elle (Accueil · Surveill. · Entreprises · Courrier)', g.app === 'messages' && g.tabs.map(t => t.t).join(',') === 'accueil,surveillance,entreprises,support,_plus', g.tabs.map(t => t.t).join(','));
      await ev(`setApp('gestion',true); return 1;`); await ev(REPOS + 'return 1;'); g = await geo();
      v('retour à GESTION : son choix complété (Journal · Équipe · Accueil · Surveill.)', g.tabs.map(t => t.t).join(',') === 'journal,equipe,accueil,surveillance,_plus', g.tabs.map(t => t.t).join(','));
      await ev(`localStorage.removeItem('tour_barre_gestion'); renderBarreBas(); return 1;`);

      /* 12. la transition de vue : la barre n'y participe pas, une seule capture montrée */
      const vt = await ev(`return {nom:getComputedStyle(document.getElementById('barre-bas')).viewTransitionName};`);
      v('la barre du bas a sa propre transition (sa bulle glisse pendant que la vue change)', vt.nom === 'barre', vt.nom);

      /* 13. mouvement réduit : la bulle ne glisse plus, elle apparaît */
      await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
      await dormir(200);
      const tr = await ev(`return getComputedStyle(document.getElementById('bb-cur')).transitionProperty;`);
      v('mouvement réduit : plus de glissement (seule l’opacité change)', !/translate/.test(tr), tr);
      await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });

      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.slice(0, 3).join(' | '));
      await o.fermer();
    }

    /* 14. un compte qui n'a pas « Accès » : sa barre ne le propose jamais, même s'il l'a « choisi » */
    {
      console.log('\n── téléphone · collaborateur ──');
      const o = await onglet(S, 'telephone', 'dark');
      await o.ev(`MYROLE='collaborateur'; localStorage.setItem('tour_barre_gestion','essais,equipe,journal'); renderTabs(); setTab('accueil',true); return 1;`);
      await o.ev(REPOS + 'return 1;');
      const g = await o.ev(GEO);
      v('un collaborateur : ni Accès ni Équipe, même « choisis » — le reste se complète par la barre d’origine', g.tabs.map(t => t.t).join(',') === 'journal,accueil,surveillance,entreprises,_plus', g.tabs.map(t => t.t).join(','));
      await o.ev(`localStorage.removeItem('tour_barre_gestion'); renderBarreBas(); return 1;`); await o.ev(REPOS + 'return 1;');
      const g2 = await o.ev(GEO);
      v('…et sans choix, sa barre d’origine : Accueil · Surveill. · Entreprises · Courrier', g2.tabs.map(t => t.t).join(',') === 'accueil,surveillance,entreprises,support,_plus', g2.tabs.map(t => t.t).join(','));
      v('aucune exception JavaScript (collaborateur)', o.exceptions.length === 0, o.exceptions.slice(0, 3).join(' | '));
      await o.fermer();
    }

    /* 15. à la SOURIS (une fenêtre étroite) : un clic ouvre, un glissé déplace la bulle */
    {
      console.log('\n── souris · fenêtre de 820 px ──');
      const o = await onglet(S, 'bureau', 'dark');
      await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 820, height: 900, deviceScaleFactor: 1, mobile: false });
      await o.ev(`localStorage.removeItem('tour_barre_gestion'); renderBarreBas(); setTab('accueil',true); return 1;`);
      await o.ev(REPOS + PREPARER);
      let g = await o.ev(GEO);
      const souris = (type, x, y) => o.c.envoyer('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' });
      v('population (souris) : la barre est là sous 900 px', g.tabs.length === 5 && !!g.cur, g.tabs.length + ' boutons');
      await souris('mousePressed', g.tabs[2].c, g.tabs[2].y); await souris('mouseReleased', g.tabs[2].c, g.tabs[2].y); await o.ev(REPOS + 'return 1;');
      g = await o.ev(GEO);
      v('un clic de souris ouvre la vue (la capture du pointeur n’est posée qu’au glissé)', g.tab === 'entreprises' && g.nav.length === 1, g.tab + ' · ' + JSON.stringify(g.nav));
      await o.ev(PREPARER); g = await o.ev(GEO);
      await souris('mousePressed', g.cur.c, g.tabs[2].y);
      for (const dx of [-15, -35, -60, -90, -120]) await o.c.envoyer('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.cur.c + dx, y: g.tabs[2].y, button: 'left', buttons: 1, pointerType: 'mouse' });
      await o.ev(STABLE + 'return 1;'); const gm = await o.ev(GEO);
      v('à la souris, la bulle tenue suit le curseur', gm.tire && pres(gm.cur.c, g.cur.c - 120, 2.5), 'bulle ' + gm.cur.c.toFixed(1) + ' / curseur ' + (g.cur.c - 120).toFixed(1));
      await souris('mouseReleased', g.cur.c - 120, g.tabs[2].y); await o.ev(REPOS + 'return 1;');
      g = await o.ev(GEO);
      v('…lâchée, une seule navigation', g.nav.length === 1 && g.tab !== 'entreprises', g.tab + ' · ' + JSON.stringify(g.nav));
      v('aucune exception JavaScript (souris)', o.exceptions.length === 0, o.exceptions.slice(0, 3).join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  if (!populationOk) { console.log('⛔ POPULATION VIDE — la sonde n’a pas trouvé de barre à mesurer'); process.exit(1); }
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
