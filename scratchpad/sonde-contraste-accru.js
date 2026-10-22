/* ══ SONDE — « AUGMENTER LE CONTRASTE » REND LES VITRES PLEINES ET LEURS BORDS VISIBLES ═════════════════
   Audit apple-design du 21 octobre 2026 : sous `prefers-contrast: more`, les vitres restaient à 42 % de blanc
   avec un liseré blanc à 85 % — la règle du thème final (§ 20) visait un attribut de MOINS que les deux matières
   et ne prenait jamais. Ici, pour chaque surface en verre (un `backdrop-filter`) de cinq écrans et d'une fenêtre,
   de jour et de nuit, on relève l'opacité de son fond et le contraste de son bord contre la page.
   Attendu sous contraste accru : fond opaque à 90 % au moins, bord à 3:1 au moins contre la page (WCAG 1.4.11).
   Sans le réglage : rien ne change (contre-épreuve : la matière d'origine reste à 42 %).
   ⛔ Une couleur calculée par color-mix() revient en `color(srgb r g b / a)`, des flottants 0–1 : on reconnaît
   la FORME avant de convertir (règle du dépôt), et on JETTE ce qu'on ne sait pas lire.
   ⛔ Population comptée : un « tout va bien » sur zéro vitre ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                                   */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));

function relever() {
  const lire = (s) => {
    let m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(s);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(s);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
    return null;
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const sur = (c, fond) => [0, 1, 2].map(k => c[k] * c[3] + fond[k] * (1 - c[3])).concat(1);
  /* la page du thème : son fond est un DÉGRADÉ (background-color transparent) — on prend alors le jeton --bg */
  const hex = (h) => { const m = /^#([0-9a-f]{6})$/i.exec((h || '').trim()); return m ? [0, 2, 4].map(k => parseInt(m[1].substr(k, 2), 16)).concat(1) : null; };
  const pageCs = lire(getComputedStyle(document.documentElement).backgroundColor);
  const page = pageCs && pageCs[3] > 0 ? pageCs : (hex(getComputedStyle(document.documentElement).getPropertyValue('--bg')) || lire(getComputedStyle(document.body).backgroundColor));
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el), bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    if (bf === 'none') continue;
    /* le VOILE d'une fenêtre est un assombrissement voulu (apple-design § 12, « dim to focus »), pas une surface */
    if (el.id === 'overlay' || el.id === 'overlay2') continue;
    const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 16) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    if (r.right <= 2 || r.bottom < 0 || r.top > innerHeight) continue;
    /* le TRAIT le plus net : chacun des quatre bords, et chaque ombre de 1 ou 2 px sans flou (un bord dessiné en
       box-shadow, intérieur ou extérieur) — une barre latérale n'a qu'un bord DROIT, un en-tête de planning a un filet
       net en bas et un filet pâle en haut */
    const fond = lire(cs.backgroundColor);
    const pageC = page && page[3] > 0 ? sur(page, [255, 255, 255, 1]) : [255, 255, 255, 1];
    const fondC = fond ? sur(fond, pageC) : pageC;
    const traits = ['Top', 'Right', 'Bottom', 'Left'].filter(c => (parseFloat(cs['border' + c + 'Width']) || 0) > 0)
      .map(c => ({ c: lire(cs['border' + c + 'Color']), t: 'bord ' + c.toLowerCase() }));
    for (const m of cs.boxShadow.matchAll(/(rgba?\([^)]*\)|color\([^)]*\)) 0px 0px 0px (1|2)px/g)) traits.push({ c: lire(m[1]), t: 'ombre' });
    let meilleur = 0, quoi = 'aucun';
    for (const x of traits) { if (!x.c || x.c[3] <= 0) continue; const k = contraste(sur(x.c, fondC), pageC); if (k > meilleur) { meilleur = k; quoi = x.t; } }
    out.push({ cl: (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')),
      alpha: fond ? +fond[3].toFixed(2) : -1, lisible: !!fond,
      bord: +meilleur.toFixed(2), bordTxt: quoi + (meilleur < 3 ? ' · ' + cs.boxShadow.slice(0, 60) : '') });
  }
  return out;
}

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  let ok = 0, ko = 0; const echecs = [];
  const VUES = ['dashboard', 'interventions', 'clients', 'planning', 'stock'];
  for (const nomP of ['tel', 'bureau']) {
    const P = PROFILS[nomP]; await poserProfil(S, P);
    await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const theme of ['light', 'dark']) {
      await S.ev(`setThemePref('${theme}'); return 1;`); await dormir(1200);
      for (const reglage of ['more', 'no-preference']) {
        await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: reglage }] });
        const actif = await S.ev(`return matchMedia('(prefers-contrast: more)').matches;`);
        if (actif !== (reglage === 'more')) { console.log('⛔ le réglage n’a pas pris (' + reglage + ')'); S.fermer(); process.exit(2); }
        let pop = 0, faibles = [];
        for (const v of VUES.concat(['fenetre'])) {
          if (v === 'fenetre') { await S.ev(`openModal('<h3>Essai</h3><div class="field"><label>Nom</label><input></div>'); return 1;`); await dormir(500); }
          else { await S.ev(`try{ closeModal(true); }catch(e){} try{ go('${v}'); }catch(e){} return 1;`); await dormir(900); }
          /* ⛔ un changement de thème ou de réglage fait TRANSITIONNER fonds et ombres : relevée pendant, une couleur sort en
             oklab() ou à mi-chemin (« rgba(0,0,0,0) 0 0 0 0 inset »). On attend qu'aucune transition ne tourne. */
          for (let k = 0; k < 40; k++) { if (await S.ev(`return document.getAnimations().filter(a=>a.constructor.name==='CSSTransition'&&a.playState==='running').length===0;`)) break; await dormir(100); }
          for (const x of await S.ev(`return (${relever.toString()})();`)) {
            pop++;
            if (reglage === 'more' && (!x.lisible || x.alpha < 0.9 || x.bord < 3)) faibles.push(v + ' ' + x.cl + ' fond ' + x.alpha + ' bord ' + x.bord + ' (' + x.bordTxt + ')');
            if (reglage === 'no-preference' && x.cl === 'div.kpi' && x.alpha > 0.6) faibles.push('contre-épreuve : ' + v + ' ' + x.cl + ' fond ' + x.alpha + ' — la matière d’origine a changé');
          }
          if (v === 'fenetre') await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
        }
        const nom = P.lbl + ' · ' + theme + ' · contraste ' + reglage;
        const uniques = [...new Set(faibles)];
        if (pop < 10) { ko++; echecs.push(nom + ' : population de ' + pop + ' vitres, trop faible pour conclure'); }
        else if (uniques.length) { ko++; echecs.push(nom + ' : ' + uniques.length + ' vitres hors règle\n      ' + uniques.slice(0, 12).join('\n      ')); }
        else { ok++; console.log('  ✓ ' + nom + ' — ' + pop + ' vitres relevées'); }
      }
    }
  }
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [] });
  echecs.forEach(e => console.log('  ✗ ' + e));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
