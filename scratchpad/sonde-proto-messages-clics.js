/* Sonde « TOUT CE QUI SE CLIQUE » du prototype d'OP MESSAGES, côté Pro (apercu/prototype-op-messages.html, refait le 16 novembre 2026).
   Lancer depuis la racine : node scratchpad/sonde-proto-messages-clics.js   (PROFILS=mac,iphone ; SCENES=nom,nom ; MONTRER=30)
   Pour chaque scène (un écran, une feuille, un appel, une réunion), elle recense dans le DOCUMENT tout ce qui se clique et se voit, puis, un par un,
   remet la scène, frappe pour de vrai (souris ou doigt) et exige : la frappe a porté sur l'élément visé, la page a CHANGÉ (ou l'élément est déjà
   l'état courant), aucune erreur JavaScript, et au doigt la zone qui répond fait au moins 40 px. Elle compte ses frappes qui ont porté. Sort en 1 au moindre défaut. */
const { chromium } = require('playwright');
const path = require('path');
const FICHIER = 'file://' + path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html');
const PROFILS = [{ n: 'mac', w: 1440, h: 900 }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true }, { n: 'iphone', w: 393, h: 852, tactile: true, mobile: true }, { n: 'android', w: 360, h: 780, tactile: true, mobile: true }];
const R = (h) => `location.hash='${h}'`;
const SCENES = [
  ...['accueil', 'activite', 'messages', 'messages/equipe', 'messages/marc', 'messages/sophie', 'contacts', 'contacts/karim', 'contacts/marc', 'appels', 'appels/a1', 'reunions', 'reunions/e1', 'reunions/e6', 'agenda', 'profil'].map((h) => ({ n: h, prep: R(h) })),
  { n: 'agenda:mois', prep: R('agenda') + ";S.agVue='mois';rendre()" },
  ...['chercher', 'plus', 'creer', 'nouveau-message', 'nouveau-groupe', 'nouvel-appel', 'rejoindre-code', 'rappel-ajouter', 'contact-ajouter', 'profil-modifier', 'statut', 'espace', 'abonnement', 'a-propos'].map((a) => ({ n: 'feuille:' + a, prep: R('accueil') + `;ACTIONS['${a}']({dataset:{}})` })),
  { n: 'feuille:programmer', prep: R('agenda') + ";ACTIONS.programmer({dataset:{}})" }, { n: 'feuille:modifier', prep: R('agenda') + ";ACTIONS['evt-modifier']({dataset:{id:'e1'}})" },
  { n: 'feuille:evenement', prep: R('agenda') + ";ouvrir(fTeteOk('Réunion')+ficheEvt(evt('e1')))" }, { n: 'feuille:compte-rendu', prep: R('reunions/e6') + ";ACTIONS['compte-rendu']({dataset:{id:'e6'}})" },
  { n: 'feuille:infos-canal', prep: R('messages/equipe') + ";S.id='equipe';ACTIONS['infos-conv']()" }, { n: 'feuille:infos-personne', prep: R('messages/marc') + ";S.id='marc';ACTIONS['infos-conv']()" },
  { n: 'feuille:joindre', prep: R('messages/marc') + ";S.id='marc';ACTIONS.joindre()" },
  { n: 'menu:message', prep: R('messages/sophie') + ";S.vue='messages';S.id='sophie';rendre();menuMessage(document.querySelectorAll('#fil [data-msg]')[1],200,300)" },
  ...['messages', 'messages/famille', 'appels', 'agenda', 'contacts', 'contacts/cath', 'profil', 'activite'].map((h) => ({ n: 'perso:' + h, prep: "changerMode('perso',true);" + R(h) })),
  { n: 'appel:sonne', prep: "demarrerAppel('karim')" }, { n: 'appel:cours', prep: "demarrerAppel('karim');S.appel.etat='cours';S.appel.t0=Date.now();peindreAppel()" },
  { n: 'appel:video', prep: "demarrerAppel('karim',true);S.appel.etat='cours';S.appel.t0=Date.now();peindreAppel()" }, { n: 'appel:clavier', prep: "demarrerAppel('karim');S.appel.etat='cours';S.appel.t0=Date.now();S.appel.clavier=true;peindreAppel()" },
  { n: 'appel:entrant', prep: "demarrerAppel('leo',false,true)" }, { n: 'appel:reduit', prep: "demarrerAppel('karim');S.appel.etat='cours';S.appel.t0=Date.now();S.appel.reduit=true;peindreAppel()" },
  { n: 'reunion:preparation', prep: "ouvrirSalle(evt('e1'))" }, { n: 'reunion:salle', prep: "ouvrirSalle(evt('e1'),true)" },
  ...['participants', 'discussion', 'notes', 'options'].map((v) => ({ n: 'reunion:' + v, prep: `ouvrirSalle(evt('e1'),true);S.salle.volet='${v}';peindreSalle()` })),
  { n: 'menu:evenement', prep: R('agenda') + ";menuEvt(evt('e1'),300,300)" }, { n: 'feuille:compte-rendu-fin', prep: "ouvrirSalle(evt('e1'),true);S.salle.fichiers.push('Planning.pdf');quitterSalle()" },
  { n: 'reunion:partage', prep: "ouvrirSalle(evt('e1'),true);S.salle.partage=true;S.salle.st=true;peindreSalle()" },
];
(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null, sc1 = process.env.SCENES ? process.env.SCENES.split(',') : null, MONTRER = +process.env.MONTRER || 25;
  const b = await chromium.launch(); const rapport = []; let total = 0, portes = 0;
  for (const p of PROFILS) { if (seuls && !seuls.includes(p.n)) continue;
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.mobile, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); let errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.addInitScript(() => { window.__sonde = true; });
    /* ⛔ l'adresse d'abord, la feuille ENSUITE : changer d'adresse ferme la feuille ouverte (c'est la touche Retour) — posées ensemble, la scène « feuille » serait vide */
    const poser = async (sc) => { await page.goto(FICHIER); await page.waitForTimeout(120); const [h, ...reste] = sc.prep.split(';'); await page.evaluate((c) => { (0, eval)(c); }, h); await page.waitForTimeout(110); if (reste.length) { await page.evaluate((c) => { (0, eval)(c); }, reste.join(';')); await page.waitForTimeout(140); } };
    /* ce qui est SOUS une feuille, un appel ou un menu ouvert n'est pas à cliquer : on recense la couche du dessus */
    const recenser = () => page.evaluate(() => { const dessus = (e) => { const c = document.querySelector('.menu-ctx') ? '.menu-ctx' : document.querySelector('#calque').innerHTML ? '#calque' : document.querySelector('#plein').innerHTML ? '#plein' : null; return !c || !!e.closest(c); }; const vus = {}; return [...document.querySelectorAll('a[href],button,[role="switch"],[role="checkbox"],[data-msg]')].filter((e) => { if (e.closest('#courrier-fixe') || e.disabled || !dessus(e)) return false; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; })
      .map((e) => { let sig = e.tagName + '|' + (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 34) + '|' + [...e.attributes].filter((a) => /^data-|^href$/.test(a.name)).map((a) => a.name + '=' + a.value).join(' ').slice(0, 60); vus[sig] = (vus[sig] || 0) + 1; return sig + '#' + vus[sig]; }); });
    const etat = () => page.evaluate(() => location.hash + '§' + document.querySelector('#app').innerHTML.length + '§' + document.querySelector('#scene').innerHTML + '§' + document.querySelector('#cote').innerHTML + '§' + document.querySelector('#haut').innerHTML + '§' + document.querySelector('#calque').innerHTML + '§' + document.querySelector('#plein').innerHTML + '§' + document.querySelector('#toast').className + document.querySelector('#toast').textContent + '§' + document.querySelectorAll('.menu-ctx,#mini,.banniere').length + '§' + document.documentElement.dataset.theme + '§' + (document.querySelector('#courrier-fixe').className));
    for (const sc of SCENES) { if (sc1 && !sc1.includes(sc.n)) continue;
      await poser(sc); const cibles = await recenser(); let bon = 0;
      { const att = /^feuille:/.test(sc.n) ? '#calque .feuille' : /^menu:/.test(sc.n) ? '.menu-ctx' : /^(appel|reunion):/.test(sc.n) ? (sc.n === 'appel:reduit' ? '#mini' : '#plein > *') : null; if (att && !(await page.$(att))) { rapport.push({ p: p.n, sc: sc.n, sig: att, genre: 'scène non posée' }); continue; } }
      for (const sig of cibles) { total++; await poser(sc); errs = [];
        const pos = await page.evaluate((s) => { const dessus = (e) => { const c = document.querySelector('.menu-ctx') ? '.menu-ctx' : document.querySelector('#calque').innerHTML ? '#calque' : document.querySelector('#plein').innerHTML ? '#plein' : null; return !c || !!e.closest(c); }; const vus = {}; const e = [...document.querySelectorAll('a[href],button,[role="switch"],[role="checkbox"],[data-msg]')].filter((x) => { if (x.closest('#courrier-fixe') || x.disabled || !dessus(x)) return false; const r = x.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const st = getComputedStyle(x); return st.visibility !== 'hidden' && st.display !== 'none'; })
            .find((x) => { let g = x.tagName + '|' + (x.getAttribute('aria-label') || x.textContent.trim()).slice(0, 34) + '|' + [...x.attributes].filter((a) => /^data-|^href$/.test(a.name)).map((a) => a.name + '=' + a.value).join(' ').slice(0, 60); vus[g] = (vus[g] || 0) + 1; return g + '#' + vus[g] === s; });
          if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(), x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), y = r.top + r.height / 2, lui = (px, py) => { const t = document.elementFromPoint(px, py); return !!t && (t === e || e.contains(t) || (t.contains(e) && t.closest('a,button') === e.closest('a,button'))); };
          /* la zone qui répond : jusqu'où, au-dessus et au-dessous du centre, à gauche et à droite, le toucher tombe encore sur lui */
          let h = 0, w = 0; for (let d = -30; d <= 30; d++) { if (lui(x, y + d)) h++; if (lui(x + d, y)) w++; }
          return { x, y, bon: lui(x, y), h, w, actif: e.getAttribute('aria-current') != null || (e.getAttribute('aria-pressed') === 'true' && !e.matches('.ctl,.puce,[data-appel],.an-b,[data-vote]')) || e.matches('[data-msg],[data-touche]') || (e.tagName === 'A' && e.getAttribute('href') === location.hash), petit: [Math.round(r.width), Math.round(r.height)] }; }, sig);
        if (!pos) { rapport.push({ p: p.n, sc: sc.n, sig, genre: 'introuvable au second passage' }); continue; }
        if (!pos.bon) { rapport.push({ p: p.n, sc: sc.n, sig, genre: 'recouvert' }); continue; }
        if (p.tactile && (pos.h < 40 || pos.w < 40)) rapport.push({ p: p.n, sc: sc.n, sig, genre: 'petite cible', d: pos.w + '×' + pos.h + ' (boîte ' + pos.petit.join('×') + ')' });
        const avant = await etat(); if (p.tactile) await page.touchscreen.tap(pos.x, pos.y); else await page.mouse.click(pos.x, pos.y); await page.waitForTimeout(140); portes++; bon++;
        const apres = await etat();
        if (errs.length) rapport.push({ p: p.n, sc: sc.n, sig, genre: 'erreur JavaScript', d: errs[0] });
        else if (apres === avant && !pos.actif) rapport.push({ p: p.n, sc: sc.n, sig, genre: 'aucun effet' });
      }
      console.log(`${p.n} ${sc.n} : ${cibles.length} cibles, ${bon} frappées`);
    }
    await ctx.close(); }
  console.log(`\npopulation : ${total} cibles recensées · ${portes} frappes ont réellement porté`);
  if (!rapport.length) console.log('aucun défaut'); else { const g = {}; rapport.forEach((r) => { g[r.genre] = (g[r.genre] || 0) + 1; }); console.log(Object.entries(g).map((x) => x[1] + ' × ' + x[0]).join(' · ')); rapport.slice(0, MONTRER).forEach((r) => console.log(`  [${r.p}] ${r.sc} — ${r.genre}${r.d ? ' : ' + r.d : ''} — ${r.sig}`)); }
  await b.close(); process.exit(rapport.length || !total ? 1 : 0);
})();
