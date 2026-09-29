/* ══ SONDE — LA PASTILLE ≡ ET SON TIROIR, TOUR AU TÉLÉPHONE (v2.75) ═══════════════════════════════════════
   Justin, 27 septembre 2026, capture de la pastille ≡ d'OP GESTION à l'appui : « je voudrais aussi ça pour avoir
   accès à toutes les catégories dans la tour » ; puis, capture du menu du bureau : « sur la tour sur téléphone je
   [veux] aussi ce menu ». Tout se joue AU DOIGT (`Input.dispatchTouchEvent`), sur tour.html servi en 127.0.0.1,
   l'API simulée dans la page (sonde-tour-theme.js) — aucune requête ne sort, aucune donnée réelle n'entre.
   Ce qu'on exige, de nuit ET de jour :
     · la pastille : visible au téléphone, 44 × 44, ronde, en haut à gauche, dans l'en-tête ; absente au bureau ;
     · un toucher l'ouvre : le tiroir part du bord gauche, TOUTES les vues du menu y sont (menuVisible), chacune
       une fois, à 44 px au moins, la vue ouverte marquée ; aria-expanded le dit ; rien ne dépasse l'écran ;
     · toucher une vue l'ouvre ET referme le tiroir ; le voile referme ; Échap referme ; glisser vers la gauche
       referme ; glisser à la VERTICALE ne referme pas (on fait défiler la liste) ;
     · le focus revient à la pastille ; la feuille « Plus » et le tiroir ne sont jamais ouverts ensemble ;
     · le titre qui monte dans l'en-tête ne passe pas sous la pastille ;
     · aucune erreur JavaScript de la séance.
   Chaque contrôle prouve d'abord sa population. Usage : node scratchpad/sonde-tour-tiroir.js
   Contre-épreuve : TOUR_FICHIER=<une Tour d'avant> node scratchpad/sonde-tour-tiroir.js (doit tomber). */
'use strict';
const { demarrer, onglet, STABLE, dormir } = require('./sonde-tour-theme.js');

const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

const ETAT = `${STABLE}
  const t=document.getElementById('tiroir'), p=document.getElementById('menu-rond'), sc=document.getElementById('scrim-tiroir'), f=document.getElementById('feuille');
  const rt=t&&!t.hidden?t.getBoundingClientRect():null;
  return { existe:!!(t&&p), ouvert:!!(t&&!t.hidden&&t.classList.contains('on')), cache:!!(t&&t.hidden), gauche:rt?Math.round(rt.left):null,
    droite:rt?Math.round(rt.right):null, exp:p?p.getAttribute('aria-expanded'):null, voile:!!(sc&&!sc.hidden), feuille:!!(f&&!f.hidden),
    tab:TAB, focusPastille:document.activeElement===p, focusDedans:!!(t&&t.contains(document.activeElement)),
    classeHtml:document.documentElement.classList.contains('tiroir-ouvert') };`;
const REPOS = 'await new Promise(r=>setTimeout(r,650));';

async function main() {
  const S = await demarrer();
  console.log('Sonde de la pastille ≡ et du tiroir — tour.html ' + S.version);
  try {
    for (const mode of (process.env.MODES || 'dark,light').split(',')) {
      console.log('\n── téléphone · ' + mode + ' ──');
      const o = await onglet(S, 'telephone', mode);
      const ev = o.ev;
      const touche = (type, x, y) => o.c.envoyer('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
      const tap = async (x, y) => { await touche('touchStart', x, y); await dormir(60); await touche('touchEnd', x, y); await ev(REPOS + ' return 1;'); };
      const centre = sel => ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,l:r.left,t:r.top,
        rond:getComputedStyle(e).borderRadius, vu:getComputedStyle(e).display!=='none'&&r.width>0};`);
      await ev(`try{ if(APP!=='gestion') setApp('gestion',true); setTab('accueil',true); }catch(e){} window.scrollTo(0,0); ${REPOS} return 1;`);

      /* 1 · la pastille */
      const P = await centre('#menu-rond');
      v('la pastille existe et se voit au téléphone', !!(P && P.vu), JSON.stringify(P));
      if (!P || !P.vu) { await o.fermer(); continue; }
      v('   44 × 44, ronde', Math.round(P.w) === 44 && Math.round(P.h) === 44 && /50%|22px/.test(P.rond), JSON.stringify(P));
      /* en haut à gauche, DANS la bande de l'en-tête et alignée sur l'avatar. ⚠️ Pas « sous l'encoche » : la Tour n'a ni
         manifeste ni mode plein écran, elle s'ouvre dans Safari où l'encoche du haut vaut 0 en portrait — tout l'en-tête
         est à 6 px (mesuré : avatar, pastille GESTION et pastille ≡ au même endroit, de nuit comme de jour). */
      const H = await ev(`const b=document.querySelector('.bandeau').getBoundingClientRect(), c=document.querySelector('.hchip').getBoundingClientRect(); return {bt:b.top,bb:b.bottom,ct:Math.round(c.top),ch:Math.round(c.height)};`);
      v('   en haut à gauche, dans la bande de l\'en-tête, alignée sur l\'avatar', P.l < 30 && P.t >= H.bt && P.t + P.h <= H.bb + 1 && Math.abs(Math.round(P.t) - H.ct) <= 1 && Math.round(P.h) === H.ch, JSON.stringify([P, H]));
      const recouv = await ev(`const p=document.getElementById('menu-rond'), r=p.getBoundingClientRect(); const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return e===p||p.contains(e);`);
      v('   rien ne la recouvre : le doigt la touche', recouv);
      let E = await ev(ETAT);
      v('   au repos : tiroir caché, aria-expanded="false"', E.cache && E.exp === 'false', JSON.stringify(E));

      /* 2 · un toucher l'ouvre */
      await tap(P.x, P.y);
      E = await ev(ETAT);
      v('un toucher ouvre le tiroir, aria-expanded="true", le voile est là', E.ouvert && E.exp === 'true' && E.voile, JSON.stringify(E));
      v('   il part du bord GAUCHE et laisse l\'écran visible à droite', E.gauche === 0 && E.droite <= 390 - 40, JSON.stringify(E));
      v('   le focus entre dans le tiroir', E.focusDedans, JSON.stringify(E));
      const L = await ev(`const vues=[]; menuVisible().forEach(g=>g.vues.forEach(x=>vues.push(x[0])));
        const lignes=[...document.querySelectorAll('#tiroir .ti[data-t]')].map(b=>{ const r=b.getBoundingClientRect(); return {t:b.dataset.t,h:r.height,on:b.classList.contains('on'),cur:b.getAttribute('aria-current'),
          lib:(b.querySelector('.lib')||{}).textContent||'', coupe:(b.querySelector('.lib')||{scrollWidth:0}).scrollWidth>(b.querySelector('.lib')||{clientWidth:0}).clientWidth+1}; });
        const t=document.getElementById('tiroir');
        return {vues, lignes, ids:t.querySelectorAll('[id]').length, sections:t.querySelectorAll('.ti-sec').length, sw:t.scrollWidth, cw:t.clientWidth,
          pied:[...t.querySelectorAll('.ti-pied .ti')].map(b=>b.textContent.trim()), version:(t.querySelector('.ti-version')||{}).textContent||''};`);
      v('population : le menu compte des vues (' + L.vues.length + ') et le tiroir des lignes (' + L.lignes.length + ')', L.vues.length >= 8 && L.lignes.length >= 8);
      v('⛔ TOUTES les vues du menu, dans l\'ordre, chacune une fois', JSON.stringify(L.lignes.map(x => x.t)) === JSON.stringify(L.vues), L.lignes.map(x => x.t).join(','));
      v('   chaque ligne répond sur 44 px au moins', L.lignes.every(x => x.h >= 44), L.lignes.filter(x => x.h < 44).map(x => x.t + ':' + x.h).join(','));
      v('   la vue ouverte (Accueil) est marquée, et elle seule', L.lignes.filter(x => x.on).map(x => x.t + '/' + x.cur).join() === 'accueil/page', L.lignes.filter(x => x.on).map(x => x.t).join());
      v('   aucun libellé coupé', L.lignes.every(x => !x.coupe), L.lignes.filter(x => x.coupe).map(x => x.lib).join(','));
      v('   aucun id dans le tiroir (ceux du menu du bureau y sont déjà)', L.ids === 0, L.ids);
      v('   rien ne dépasse en largeur', L.sw <= L.cw + 1, L.sw + ' / ' + L.cw);
      v('   des sections, le pied (barre, quitter) et la version', L.sections >= 2 && L.pied.length === 2 && /v2\.\d+/.test(L.version), JSON.stringify([L.sections, L.pied, L.version]));

      /* 3 · toucher une vue */
      const cible = L.lignes.find(x => x.t !== 'accueil' && x.t !== 'surveillance') || L.lignes[1];
      const C = await centre('#tiroir .ti[data-t="' + cible.t + '"]');
      await tap(C.x, C.y);
      E = await ev(ETAT);
      v('toucher « ' + cible.lib + ' » ouvre la vue ET referme le tiroir', E.tab === cible.t && E.cache && E.exp === 'false' && !E.voile && !E.classeHtml, JSON.stringify(E));

      /* 4 · les autres façons de refermer */
      await tap(P.x, P.y); E = await ev(ETAT);
      v('   rouvert : la vue ouverte a suivi (« ' + cible.lib + ' » marquée)', E.ouvert && await ev(`return (document.querySelector('#tiroir .ti.on')||{dataset:{}}).dataset.t;`) === cible.t);
      await tap(385, 500); E = await ev(ETAT);
      v('toucher le voile referme', E.cache && !E.voile && E.exp === 'false', JSON.stringify(E));
      await tap(P.x, P.y);
      await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await ev(REPOS + ' return 1;'); E = await ev(ETAT);
      v('Échap referme, et le focus revient à la pastille', E.cache && E.focusPastille, JSON.stringify(E));
      /* glisser à la verticale : on fait défiler, on ne referme pas */
      await tap(P.x, P.y);
      const y0 = 420, x0 = 150;
      await touche('touchStart', x0, y0); for (let i = 1; i <= 8; i++) { await touche('touchMove', x0 + 2, y0 - i * 22); await dormir(16); } await touche('touchEnd', x0 + 2, y0 - 176);
      await ev(REPOS + ' return 1;'); E = await ev(ETAT);
      v('glisser à la VERTICALE dans le tiroir ne le referme pas', E.ouvert, JSON.stringify(E));
      /* glisser vers la gauche : il suit le doigt, puis se referme */
      await touche('touchStart', 250, 400); let suit = null;
      for (let i = 1; i <= 8; i++) { await touche('touchMove', 250 - i * 22, 402); await dormir(16);
        if (i === 4) suit = await ev(`${STABLE} return Math.round(document.getElementById('tiroir').getBoundingClientRect().left);`); }
      await touche('touchEnd', 250 - 176, 402);
      /* le clic qu'un iPhone produit parfois au lâcher d'un glissé : Chromium piloté n'en émet pas, on le JOUE —
         sur une ligne du tiroir, dans les 350 ms (relecture : le contrôle d'avant passait sans la garde) */
      const clicApres = await ev(`const b=document.querySelector('#tiroir .ti[data-t="journal"]')||document.querySelector('#tiroir .ti[data-t]:not(.on)'); const avant=TAB; if(b) b.click(); return {avant, apres:TAB, ligne:b?b.dataset.t:null};`);
      await ev(REPOS + ' return 1;'); E = await ev(ETAT);
      v('glisser vers la GAUCHE : le tiroir suit le doigt', suit !== null && suit < -40, 'gauche à mi-geste : ' + suit);
      v('   … et se referme au lâcher', E.cache && E.exp === 'false', JSON.stringify(E));
      v('⛔ … et le clic qui suit le glissé est avalé : la ligne sous le doigt ne s\'ouvre pas', !!clicApres.ligne && clicApres.apres === clicApres.avant && E.tab === cible.t, JSON.stringify(clicApres));

      /* 5 · jamais deux panneaux : « Plus » ouvert, la pastille le referme */
      await ev(`ouvrirFeuille('plus'); ${REPOS} return 1;`);
      E = await ev(ETAT); const feuilleAvant = E.feuille;
      await ev(`ouvrirTiroir(); ${REPOS} return 1;`);
      E = await ev(ETAT);
      v('la feuille « Plus » ouverte : ouvrir le tiroir la referme (jamais deux panneaux)', feuilleAvant && E.ouvert && !E.feuille, JSON.stringify(E));
      await ev(`fermerTiroir(true); ${REPOS} return 1;`);

      /* 6 · le titre qui monte dans l'en-tête ne passe pas sous la pastille */
      await ev(`setTab('entreprises',true); ${REPOS} window.scrollTo(0,1200); await new Promise(r=>setTimeout(r,500)); return 1;`);
      const T = await ev(`${STABLE} const tc=document.getElementById('titre-court'), p=document.getElementById('menu-rond'), lg=document.querySelector('.hlogo');
        const r=tc.getBoundingClientRect(), rp=p.getBoundingClientRect(); return {cache:document.body.classList.contains('titre-cache'), op:+getComputedStyle(tc).opacity, g:r.left, pd:rp.right, txt:tc.textContent, logo:+getComputedStyle(lg).opacity};`);
      v('population : le titre est bien monté dans l\'en-tête (défilé)', T.cache && T.op > 0.5, JSON.stringify(T));
      v('   il commence APRÈS la pastille', T.g >= T.pd, JSON.stringify(T));
      v('   le logo s\'efface pendant ce temps (il tomberait sous le titre)', T.logo < 0.1, JSON.stringify(T));
      await ev(`window.scrollTo(0,0); return 1;`);

      /* 7 · (relecture) un tiroir défilé puis refermé se rouvre sur sa MARQUE */
      await ev(`setTab('accueil',true); ${REPOS} return 1;`);
      await tap(P.x, P.y);
      await touche('touchStart', 150, 700); for (let i = 1; i <= 10; i++) { await touche('touchMove', 151, 700 - i * 40); await dormir(16); } await touche('touchEnd', 151, 300);
      await ev(REPOS + ' return 1;');
      const defile = await ev(`return document.getElementById('tiroir').scrollTop;`);
      await ev(`fermerTiroir(true); ${REPOS} return 1;`); await tap(P.x, P.y);
      const R = await ev(`${STABLE} const t=document.getElementById('tiroir'), on=t.querySelector('.ti.on'), tete=t.querySelector('.ti-tete'); const r=on.getBoundingClientRect(), rt=t.getBoundingClientRect();
        return {st:t.scrollTop, onVu:r.top>=rt.top&&r.bottom<=rt.bottom, teteVue:tete.getBoundingClientRect().top>=rt.top-1};`);
      v('(population : le tiroir a bien défilé au doigt, ' + defile + ' px) — rouvert, il repart de sa marque, la vue ouverte visible', R.st === 0 && R.onVu && R.teteVue, JSON.stringify([defile, R]));
      await ev(`fermerTiroir(true); ${REPOS} return 1;`);

      /* 8 · (relecture) Ctrl+Maj+M tiroir ouvert : il suit la console */
      const deux = await ev(`return MYAPPS.length>1;`);
      if (deux) {
        await tap(P.x, P.y);
        await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'M', code: 'KeyM', windowsVirtualKeyCode: 77, modifiers: 2 | 8 });
        await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'M', code: 'KeyM', windowsVirtualKeyCode: 77, modifiers: 2 | 8 });
        await ev(REPOS + ' await new Promise(r=>setTimeout(r,500)); return 1;');
        const K = await ev(`const vues=[]; menuVisible().forEach(g=>g.vues.forEach(x=>vues.push(x[0]))); return {app:APP, ouvert:_tiroirOuvert, lignes:[...document.querySelectorAll('#tiroir .ti[data-t]')].map(b=>b.dataset.t), vues, version:(document.querySelector('#tiroir .ti-version')||{}).textContent||''};`);
        v('Ctrl+Maj+M, tiroir ouvert : il liste les vues de MESSAGES et le dit', K.app === 'messages' && K.ouvert && JSON.stringify(K.lignes) === JSON.stringify(K.vues) && /MESSAGES/.test(K.version), JSON.stringify(K));
        await ev(`fermerTiroir(true); setApp('gestion',true); ${REPOS} return 1;`);
      } else v('population : ce compte a les deux consoles (Ctrl+Maj+M)', false, 'MYAPPS=1');

      /* 9 · (relecture) un nom long ne s'écrit plus sous « GESTION », à 360 comme à 390 */
      for (const W of [360, 390]) {
        await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 3, mobile: true });
        const N = await ev(`const hs=document.getElementById('h-sous'), avant=hs.textContent; hs.textContent='Jean-Baptiste · collaborateur'; ${STABLE}
          const rn=document.querySelector('.hnom').getBoundingClientRect(), rp=document.getElementById('app-pill').getBoundingClientRect(), rg=document.getElementById('menu-rond').getBoundingClientRect();
          const r={nomD:Math.round(rn.right), pillG:Math.round(rp.left), pillL:Math.round(rp.width), nomG:Math.round(rn.left), pastD:Math.round(rg.right), ell:hs.scrollWidth>hs.clientWidth}; hs.textContent=avant; return r;`);
        v('   ' + W + ' px : « Jean-Baptiste · collaborateur » reste dans sa colonne (avant « GESTION », après la pastille ≡)', N.nomD <= N.pillG && N.nomG >= N.pastD && N.pillL >= 80, JSON.stringify(N));
      }
      await o.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });

      /* 10 · (relecture) « animations réduites » : le tiroir suit quand même le doigt */
      await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
      await tap(P.x, P.y);
      await touche('touchStart', 250, 400); let suitR = null;
      for (let i = 1; i <= 8; i++) { await touche('touchMove', 250 - i * 22, 402); await dormir(16);
        if (i === 4) suitR = await ev(`${STABLE} return Math.round(document.getElementById('tiroir').getBoundingClientRect().left);`); }
      await touche('touchEnd', 250 - 176, 402); await ev(REPOS + ' return 1;'); E = await ev(ETAT);
      v('« animations réduites » : le tiroir suit le doigt (manipulation directe), puis se referme', suitR !== null && suitR < -40 && E.cache, 'gauche à mi-geste : ' + suitR + ', ' + JSON.stringify(E));
      await o.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });

      v('aucune erreur JavaScript (' + mode + ')', o.exceptions.length === 0, o.exceptions.join(' | '));
      await o.fermer();
    }

    /* 7 · au bureau : rien de tout ça */
    console.log('\n── bureau ──');
    const b = await onglet(S, 'bureau', 'dark');
    const B = await b.ev(`${STABLE} const p=document.getElementById('menu-rond'), t=document.getElementById('tiroir');
      return {pastille:p?getComputedStyle(p).display:'absente', tiroir:t?getComputedStyle(t).display:'absent', menu:getComputedStyle(document.querySelector('nav.tabs')||document.body).display};`);
    v('au bureau : ni pastille ni tiroir, le menu en colonne reste', B.pastille === 'none' && B.tiroir === 'none' && B.menu !== 'none', JSON.stringify(B));
    const B2 = await b.ev(`ouvrirTiroir(); ${STABLE} const t=document.getElementById('tiroir'); return getComputedStyle(t).display;`);
    v('   même appelé par erreur, le tiroir ne s\'affiche pas', B2 === 'none', B2);
    v('aucune erreur JavaScript (bureau)', b.exceptions.length === 0, b.exceptions.join(' | '));
    await b.fermer();
  } finally { await S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.log('  ✗ la sonde a jeté : ' + (e && e.stack || e)); process.exit(1); });
