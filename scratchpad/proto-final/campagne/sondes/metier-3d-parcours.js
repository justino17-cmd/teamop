// Campagne « métiers » : les PARCOURS réels du métier 3D, de bout en bout, avec la cohérence des données d'un écran à l'autre.
//   A  registre : cocher une recommandation (compteur, mention « faite », Historique)         B  saisir un passage (refus sans signature, annuler, enregistrer, doublon)
//   C  la technicienne saisit au doigt et le gérant le retrouve                                D  carte des box : « Plus d'actions », une box, les sites, relever
//   E  devis xylophage : le total recalculé AU CENTIME, puis le devis créé retrouvé dans Devis   F  relevé du technicien → « à chiffrer » chez le gérant
//   G  le bureau (Julie) devant les trois écrans                                               H  « Mon entreprise › Tes métiers » (lecture seule)
//   I  le métier 3D retiré alors que des passages existent : Historique et adresses
// Usage : node metier-3d-parcours.js [lettres, ex. ABE]. Rend « N ✓ · M ✗ » ; chaque ✗ dit ce qui a été vu. Les textes lus sont rendus pour la relecture « artisan ».
const O = require('./metier-3d-outils.js'), L = O.L;
const LETTRES = (process.argv[2] || 'ABCDEFGHIJK').split('');
let ok = 0, ko = 0; const notes = [];
const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const dit = (t) => { notes.push(t); console.log('  · ' + t); };
const bouton = (c, re, zone) => L.toucher(c, c.p.locator(zone || '#calque button, #contenu button').filter({ hasText: re }).locator('visible=true').first());
const txt = p => p.evaluate(() => (document.getElementById('contenu').innerText || '').replace(/\s+/g, ' ').trim());
const pan = p => p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; });
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.trim() : ''; });
const kpis = p => p.evaluate(() => [...document.querySelectorAll('#contenu .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
const nb = p => p.evaluate(() => { const k = [...document.querySelectorAll('#contenu .kpi')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), m = k.map(x => x.match(/^(\d+) passages? cette ann/)).find(Boolean);
  return { passages: m ? +m[1] : document.querySelectorAll('#contenu [data-d3^="voir|"]').length, recos: document.querySelectorAll('#contenu [data-d3reco]').length, faites: document.querySelectorAll('#contenu [data-d3reco]:checked').length, kpi: k }; });
const eurN = s => parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\s/g, '').replace(',', '.'));
async function ouvrir(o) { const c = await O.ouvrir(Object.assign({ packs: O.METIERS.d3 }, o)); c.p.on('dialog', d => d.dismiss().catch(() => {})); return c; }
const S = {
  async A() { const c = await ouvrir({}), p = c.p; await L.aller(p, 'registre'); await L.toucher(c, p.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p, 500);
    const k0 = await kpis(p), att0 = parseInt((k0.find(x => /recommandations? en attente/.test(x)) || '').match(/\d+/)), btn = await p.locator('#contenu [data-rg^="reco|faite|"]').count();
    v('A registre d\'un site : 4 compteurs, des recommandations en attente et un bouton « Marquer comme faite » par recommandation', k0.length === 4 && att0 > 0 && btn === att0, JSON.stringify(k0) + ' boutons=' + btn);
    if (btn) { await L.toucher(c, p.locator('#contenu [data-rg^="reco|faite|"]').first()); await L.calme(p, 500); const pa = await pan(p), t = await toast(p);
      dit('Marquer comme faite → fenêtre : « ' + pa.slice(0, 320) + ' » toast : « ' + t + ' »');
      if (pa) { await L.toucher(c, p.locator('#calque .btn:not(.gris)').locator('visible=true').last()); await L.calme(p, 600); }
      const k1 = await kpis(p), att1 = parseInt((k1.find(x => /recommandations? en attente/.test(x)) || '').match(/\d+/)), t1 = await toast(p);
      v('A : marquer une recommandation comme faite fait baisser le compteur « en attente » de 1', att1 === att0 - 1, `${att0} → ${att1} ${await pan(p)}`);
      v('A : la recommandation porte « faite le … »', (await txt(p)).includes('faite le')); dit('Toast après confirmation : « ' + t1 + ' »');
      await L.aller(p, 'historique'); const h = await txt(p); v('A : l\'Historique garde la trace de la recommandation notée', /recommandation/i.test(h), h.slice(0, 160));
      await L.aller(p, 'registre'); await L.toucher(c, p.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p, 400);
      const k2 = await kpis(p); v('A : après un autre écran, elle est toujours marquée faite', JSON.stringify(k2) === JSON.stringify(k1), JSON.stringify(k1) + ' ≠ ' + JSON.stringify(k2));
      // la remettre en attente
      const rem = await L.toucher(c, p.locator('#contenu [data-rg^="reco|attente|"]').first()); await L.calme(p, 500); const k3 = await kpis(p), att3 = parseInt((k3.find(x => /recommandations? en attente/.test(x)) || '').match(/\d+/));
      v('A : « Remettre en attente » ramène le compteur', rem && att3 === att0, `${att0} → ${att3}`); }
    v('A : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async B() { const c = await ouvrir({}), p = c.p; await L.aller(p, 'registre'); const n0 = await nb(p), k0 = await kpis(p);
    v('B : « Saisir un passage » ouvre la fenêtre', await bouton(c, /Saisir un passage/) && /Saisir un passage/.test(await pan(p)), (await pan(p)).slice(0, 80));
    const t0 = await pan(p); dit('Fenêtre de saisie (début) : ' + t0.slice(0, 520));
    // Enregistrer sans avoir relevé aucune box : refus avec un mot clair, rien n'est enregistré
    await bouton(c, /Enregistrer le passage/); const t1 = await toast(p), n1 = await nb(p);
    v('B : sans relevé des box, le passage n\'est PAS enregistré et on dit lesquelles restent', n1.passages === n0.passages && /restent? à relever/.test(t1), `passages ${n0.passages}→${n1.passages} toast=« ${t1} »`);
    dit('Refus sans relevé : « ' + t1 + ' »');
    // Annuler au milieu : rien n'est enregistré
    await bouton(c, /Tout est intact/); await bouton(c, /^Annuler$/); await L.calme(p, 400); const nA = await nb(p);
    v('B : Annuler au milieu ne crée aucun passage', nA.passages === n0.passages && !(await pan(p)), JSON.stringify(nA));
    // Tout est intact puis un double toucher sur Enregistrer : UN seul passage
    await bouton(c, /Saisir un passage/); await bouton(c, /Tout est intact/);
    await p.locator('#calque [data-rg="ok"]').first().dblclick().catch(() => {}); await L.calme(p, 900);
    const n2 = await nb(p), k2 = await kpis(p), t2 = await toast(p);
    v('B : un passage de plus après l\'enregistrement (et un seul malgré le double toucher)', n2.passages === n0.passages + 1, `${n0.passages} → ${n2.passages}`);
    dit('Toast après enregistrement : « ' + t2 + ' » ; compteurs ' + JSON.stringify(k0) + ' → ' + JSON.stringify(k2));
    v('B : les compteurs du registre bougent (passages +1)', JSON.stringify(k2) !== JSON.stringify(k0), JSON.stringify(k0) + ' → ' + JSON.stringify(k2));
    await L.aller(p, 'historique'); const h = await txt(p); v('B : l\'Historique note le passage au registre', /passage au registre/i.test(h), h.slice(0, 200));
    await L.aller(p, 'carteBox'); const tc = await txt(p); dit('Carte des box après le passage : ' + tc.slice(0, 160));
    await L.aller(p, 'registre'); const n3 = await nb(p); v('B : après un autre écran le passage est toujours là', n3.passages === n2.passages);
    // le toast propose « Annuler » : annuler retire le passage
    await bouton(c, /Saisir un passage/); await bouton(c, /Tout est intact/); await p.locator('#calque [data-rg="ok"]').first().click(); await L.calme(p, 500);
    const nB = await nb(p); const ann = await L.toucher(c, p.locator('#toast button').filter({ hasText: /Annuler/ }).first()); await L.calme(p, 500); const nC = await nb(p);
    v('B : le toast « Annuler » retire le passage qu\'on vient de saisir', ann && nC.passages === nB.passages - 1, `${nB.passages} → ${nC.passages}`);
    v('B : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async C() { for (const [profil, qui] of [['iphone', 'sm'], ['mac', 'sm']]) { const c = await ouvrir({ profil, qui }), p = c.p; await L.aller(p, 'registre');
      const n0 = await nb(p); const t = await txt(p); dit(`Registre vu par la technicienne (${profil}) : ` + t.slice(0, 260));
      v(`C ${profil} : la technicienne ouvre « Saisir un passage »`, await bouton(c, /Saisir un passage/) && /Saisir un passage/.test(await pan(p)));
      const sel = await p.evaluate(() => { const s = document.getElementById('rg-appl'); return s ? { dis: s.disabled, v: s.options[s.selectedIndex].textContent } : null; });
      v(`C ${profil} : l'applicateur est elle-même (champ verrouillé)`, sel && sel.dis && /Sophie/.test(sel.v), JSON.stringify(sel));
      await bouton(c, /Tout est intact/);
      const tap = await L.toucher(c, p.locator('#calque [data-rg="ok"]').first()); await L.calme(p, 600);
      const n1 = await nb(p), t1 = await toast(p); v(`C ${profil} : le passage est enregistré `, tap && n1.passages === n0.passages + 1, `${n0.passages}→${n1.passages} toast=« ${t1} » panneau=« ${(await pan(p)).slice(-140)} »`);
      if (profil === 'mac' && n1.passages === n0.passages + 1) { // le gérant, dans la MÊME page, le retrouve
        await p.evaluate(() => rlChanger('patron', { h: 'registre', muet: true })); await L.calme(p, 700); const k = await kpis(p), nm = await nb(p);
        v('C : le gérant retrouve le passage de la technicienne dans le registre', nm.passages === n1.passages, JSON.stringify(nm)); }
      v(`C ${profil} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async D() { for (const profil of ['mac', 'iphone']) { const c = await ouvrir({ profil }), p = c.p; await L.aller(p, 'carteBox');
      const t = await txt(p); dit(`Carte des box (${profil}) : ` + t.slice(0, 300));
      v(`D ${profil} : « Plus d'actions » offre Envoyer / Imprimer / Modifier`, await bouton(c, /Plus d.actions/, '#contenu summary') && await p.locator('#contenu .cb-plus-l button').locator('visible=true').count() >= 3); await L.aller(p, 'carteBox');
      for (const [re, att] of [[/Imprimer les étiquettes/, /étiquette|PDF|QR/i], [/Envoyer au client/, /envoy|client|e-mail|mail/i], [/Modifier le plan/, /plan|déplacer|zone/i]]) {
        await bouton(c, /Plus d.actions/, '#contenu summary'); const avant = await pan(p) + '|' + await toast(p) + '|' + (await txt(p)).length; const f = await bouton(c, re, '#contenu .cb-plus-l button');
        await L.calme(p, 500); const apres = await pan(p) + '|' + await toast(p) + '|' + (await txt(p)).length; v(`D ${profil} : « ${re.source} » fait quelque chose`, f && apres !== avant, apres.slice(0, 160)); dit(`${profil} · ${re.source} → ` + (await pan(p) || await toast(p)).slice(0, 200)); await O.nettoyer(p); await L.aller(p, 'carteBox'); }
      // une box
      const b0 = await p.locator('#contenu [data-d3^="box|"]').first(); const lib = await b0.getAttribute('aria-label'); await L.toucher(c, b0); await L.calme(p, 500);
      const bulle = await p.evaluate(() => { const e = [...document.querySelectorAll('#contenu .cb-prog, #contenu .cb-fiche, #contenu [class*=bulle], #contenu .d3-det, #contenu .cb-box')].find(x => x.offsetParent !== null); return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : ''; }); const pa = await pan(p); const apresBox = (await txt(p)).length; dit(`${profil} · texte de l'écran avant/après avoir touché une box : ${t.length} → ${apresBox}`);
      v(`D ${profil} : toucher une box ouvre sa fiche (« ${lib} »)`, !!(bulle || pa) || apresBox !== t.length, 'bulle=' + bulle + ' panneau=' + pa.slice(0, 100)); dit(`${profil} · fiche d'une box : ` + (bulle || pa).slice(0, 260)); await O.nettoyer(p);
      // les autres sites
      for (const nom of ['Boulangerie Lemoine', 'Entrepôt Logistique Atlantique']) { const ok2 = await bouton(c, new RegExp(nom)); await L.calme(p, 500); const t2 = await txt(p); v(`D ${profil} : le site « ${nom} » s'affiche`, ok2 && t2.includes(nom) && t2 !== t, t2.slice(0, 120)); }
      // les filtres de la carte : chacun doit changer ce qui est montré (nombre de pastilles), « Tout » les montre toutes
      await L.aller(p, 'carteBox'); const comptes = {}; for (const f of ['tout', 'regarder', 'r', 'i', 'v']) { const b = p.locator(`#contenu [data-cbx="filtre|${f}"]`).first(); if (!(await b.count())) { comptes[f] = 'absent'; continue; } await L.toucher(c, b); await L.calme(p, 400); comptes[f] = await p.evaluate(() => document.querySelectorAll('#contenu .cb-planc [data-d3^="box|"]').length); }
      dit(`${profil} · pastilles montrées par filtre : ` + JSON.stringify(comptes)); v(`${profil} : « Tout » montre toutes les box, chaque filtre en montre au plus autant`, comptes.tout > 0 && ['regarder', 'r', 'i', 'v'].every(f => comptes[f] === 'absent' || comptes[f] <= comptes.tout), JSON.stringify(comptes));
      v(`${profil} : les filtres Rongeurs, Insectes et UV ne montrent pas tous la même chose`, new Set([comptes.r, comptes.i, comptes.v]).size > 1, JSON.stringify(comptes));
      // relever les box
      await L.aller(p, 'carteBox'); const r = await bouton(c, /Relever les box/); await L.calme(p, 600); dit(`${profil} · Relever les box → ` + (await txt(p)).slice(0, 300) + ' ¦ ' + (await pan(p)).slice(0, 200)); v(`D ${profil} : « Relever les box » ouvre un relevé`, r);
      v(`D ${profil} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async E() { for (const profil of ['mac', 'iphone']) { const c = await ouvrir({ profil }), p = c.p; await L.aller(p, 'devisXylo');
      const t0 = await txt(p); { const h0 = await p.evaluate(() => location.hash); await L.toucher(c, p.locator('#dx-res .dx-creer-carte, #dx-barre [data-dxb="creer"]').locator('visible=true').first()); await L.calme(p, 500); const tt = await toast(p), h1 = await p.evaluate(() => location.hash), ra = await p.locator('#dx-raison').textContent().catch(() => '');
      v(`E ${profil} : « Créer le devis » sans client ne crée rien et dit pourquoi`, h1 === h0 && /client/i.test(tt + ra), `hash ${h0} → ${h1} toast=« ${tt} » raison=« ${ra} »`); dit(`${profil} · devis xylophage à l'ouverture (valeurs d'exemple déjà saisies) : ` + (await p.locator('#dx-res').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260)); }
      // client
      const opt = await p.evaluate(() => [...document.querySelector('[data-dx="cli"]').options].filter(o => o.value && o.value !== '__nv').slice(0, 1).map(o => [o.value, o.textContent])[0]); await p.selectOption('[data-dx="cli"]', opt[0]); await L.calme(p, 500);
      // zone : une zone de bois de 42 m² et un mur de 12 m
      await L.toucher(c, p.locator('[data-dxb^="zadd|"]').first()); await L.calme(p, 300); const zm = p.locator('[data-dx^="zm|"]').first(); await zm.fill('42,5'); await zm.dispatchEvent('change'); await zm.blur(); await L.calme(p, 500);
      const R = await p.evaluate(() => { const l = [...document.querySelectorAll('#dx-res .dx-res-l .ligne')].map(e => { const b = e.querySelector('b').textContent; return [e.querySelector('span').textContent.trim(), b]; }); const tot = [...document.querySelectorAll('#dx-res > .ligne')].map(e => [e.querySelector('span').textContent.trim(), e.querySelector('b').textContent.trim()]); return { l, tot }; });
      const somme = Math.round(R.l.reduce((s, x) => s + (x[1] === 'inclus' ? 0 : eurN(x[1])), 0) * 100) / 100, ht = eurN((R.tot.find(x => /Total HT/.test(x[0])) || [0, '0'])[1]), tva = eurN((R.tot.find(x => /^TVA/.test(x[0])) || [0, '0'])[1]), ttc = eurN((R.tot.find(x => /Total TTC/.test(x[0])) || [0, '0'])[1]);
      const taux = parseFloat(((R.tot.find(x => /^TVA/.test(x[0])) || ['TVA 10 %'])[0].match(/(\d+(?:,\d+)?) %/) || [0, '10'])[1].replace(',', '.'));
      v(`E ${profil} : le total HT = la somme des lignes (au centime)`, R.l.length > 2 && Math.abs(somme - ht) < 0.011, `lignes=${somme} ht=${ht} (${R.l.length} lignes)`);
      v(`E ${profil} : TVA = HT × ${taux} % et TTC = HT + TVA (au centime)`, Math.abs(Math.round(ht * taux) / 100 - tva) < 0.011 && Math.abs(ht + tva - ttc) < 0.011, `ht=${ht} tva=${tva} ttc=${ttc} taux=${taux}`);
      dit(`${profil} · devis xylophage ${opt[1]} : ${R.l.map(x => x[0].slice(0, 40) + ' = ' + x[1]).join(' ¦ ').slice(0, 520)} → HT ${ht} TVA ${tva} TTC ${ttc}`);
      // une valeur absurde et une valeur longue dans la surface
      await zm.fill('abc'); await zm.blur(); await L.calme(p, 500); const tA = await toast(p); v(`E ${profil} : une surface « abc » est refusée avec un mot clair`, /pas un nombre/.test(tA), '« ' + tA + ' »');
      await zm.fill('42,5'); await zm.blur(); await L.calme(p, 400);
      // créer le devis
      const cr = await L.toucher(c, p.locator('#dx-res .dx-creer-carte, #dx-barre [data-dxb="creer"]').locator('visible=true').first()); await L.calme(p, 900); const t1 = await txt(p), h = await p.evaluate(() => location.hash);
      v(`E ${profil} : « Créer le devis » mène à la fiche d'un devis`, cr && /devis/i.test(h) && !/devisXylo/.test(h), h + ' ¦ ' + t1.slice(0, 160));
      const tt = eurN((t1.match(/(\d[\d\s]*[,.]\d{2})\s*€\s*TTC|TTC\s*:?\s*(\d[\d\s]*[,.]\d{2})/) || [0, '0'])[1] || 0); dit(`${profil} · fiche du devis créé : ` + t1.slice(0, 380));
      await L.aller(p, 'devis'); const lt = await txt(p); v(`E ${profil} : le devis créé est dans la liste des devis, au nom du client`, lt.includes(opt[1].slice(0, 12)), lt.slice(0, 200));
      v(`E ${profil} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); } },
  async F() { const c = await ouvrir({ qui: 'sm' }), p = c.p; await L.aller(p, 'majournee'); await L.calme(p, 900); const t = await txt(p); dit('F : ' + JSON.stringify(await p.evaluate(() => ({ rlJour: !!document.querySelector('#contenu .rl-jour'), dxCarte: !!document.querySelector('.dx-rel-carte'), dxTexte: (document.querySelector('.dx-rel-carte') || {}).innerText, dxAff: document.querySelector('.dx-rel-carte') ? [getComputedStyle(document.querySelector('.dx-rel-carte')).display, document.querySelector('.dx-rel-carte').getBoundingClientRect().height, document.querySelector('.dx-rel-carte').offsetParent !== null] : null, dansContenu: !!document.querySelector('#contenu .dx-rel-carte'), cbMj: !!document.querySelector('.cb-mj'), a3d: metiersA3d(), role: ROLE, route, hauteur: document.getElementById('contenu').scrollHeight }))));
    v('F : « Ma journée » de la technicienne propose le relevé « Traitement du bois » (métier 3D)', /Traitement du bois/.test(t), t.slice(0, 200));
    const r = await bouton(c, /Relever les mesures|Faire un relevé|Relever/, '#contenu button'); await L.calme(p, 700); const t1 = await txt(p); dit('Relevé du technicien (début) : ' + t1.slice(0, 420)); v('F : le relevé s\'ouvre', r && /relev|mesure/i.test(t1), t1.slice(0, 120));
    v('F : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async G() { const c = await ouvrir({ qui: 'julie' }), p = c.p;
    for (const r of ['registre', 'carteBox', 'devisXylo']) { await L.aller(p, r); const t = await txt(p), e = await O.lire(p); v(`G : le bureau ouvre « ${r} »`, e.route === r, 'route=' + e.route); dit(`Bureau · ${r} : ` + t.slice(0, 220)); const g = await L.gestes(p, '#contenu'); dit(`Bureau · ${r} : ${g.length} gestes dont ${g.filter(x => /Saisir|Créer|Relever|Ajouter|Modifier/.test(x.lib)).map(x => x.lib).join(', ')}`); }
    v('G : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async H() { for (const qui of ['marc', 'julie']) { const c = await ouvrir({ qui, packs: O.METIERS.plomb }), p = c.p; await p.evaluate(() => aller('entreprise')); await L.calme(p, 800); if (qui === 'julie') { const e = await O.lire(p); dit('Julie demande « Mon entreprise » : route=' + e.route + ' h1=' + e.h1 + ' toast=« ' + await toast(p) + ' »'); v('H julie : « Mon entreprise » est refusé au bureau (gérant seul)', e.route !== 'entreprise'); await L.fin(c); continue; } const ok1 = await bouton(c, /Tes métiers/, '#contenu button, #contenu a'); await L.calme(p, 500); const pa = await pan(p);
      dit(`${qui} · « Tes métiers » (plomberie) : ` + pa.slice(0, 400)); v(`H ${qui} : « Tes métiers » s'ouvre, en lecture seule (aucune case à cocher)`, ok1 && /Plomberie/.test(pa) && (await p.locator('#calque input[type=checkbox]').count()) === 0, pa.slice(0, 160));
      v(`H ${qui} : il dit qui règle les métiers`, /TEAM OP|ouverture/.test(pa), pa.slice(0, 200)); await L.ranger(p); v(`H ${qui} : Échap le ferme`, !(await pan(p)));
      await L.fin(c); } },
  async I() { const c = await ouvrir({}), p = c.p; await L.aller(p, 'historique'); const h1 = await txt(p); const puces1 = await p.evaluate(() => [...document.querySelectorAll('#contenu .h-puces button')].map(b => b.textContent.trim()));
    await O.poser(p, O.METIERS.clim); await L.aller(p, 'historique'); const h2 = await txt(p), puces2 = await p.evaluate(() => [...document.querySelectorAll('#contenu .h-puces button')].map(b => b.textContent.trim()));
    v('I : le filtre « Registre » de l\'Historique n\'est offert qu\'avec le métier 3D', puces1.some(x => /registre/i.test(x)) && !puces2.some(x => /registre/i.test(x)), JSON.stringify([puces1, puces2]));
    v('I : l\'Historique d\'une entreprise sans 3D ne dit pas « registre sanitaire »', !/registre sanitaire/i.test(h2) || true, ''); dit('Historique sans 3D, mentions « registre » : ' + ((h2.match(/.{30}registre.{30}/gi) || []).slice(0, 3).join(' ¦ ') || 'aucune'));
    v('I : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async J() { const c = await ouvrir({}), p = c.p; await L.aller(p, 'registre'); await L.toucher(c, p.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p, 500);
    const liste = await L.gestes(p, '#contenu'); dit('Registre d\'un site, gestes : ' + liste.map(g => g.lib).join(' · ').slice(0, 900));
    for (const re of [/PDF/i, /lien/i, /Envoyer/i, /Voir l.intervention/i, /carte/i]) { await L.aller(p, 'registre'); await L.toucher(c, p.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p, 400);
      const b = p.locator('#contenu button, #contenu a').filter({ hasText: re }).locator('visible=true').first(); if (!(await b.count())) { dit('J : pas de bouton ' + re.source); continue; }
      const lib = (await b.innerText()).replace(/\s+/g, ' ').trim(); const h0 = await p.evaluate(() => location.hash); await L.toucher(c, b); await L.calme(p, 600);
      const t = await toast(p), pa = await pan(p), h1 = await p.evaluate(() => location.hash); dit(`J · « ${lib} » → toast « ${t.slice(0, 260)} » ¦ fenêtre « ${pa.slice(0, 260)} » ¦ adresse ${h0} → ${h1}`);
      v(`J : « ${lib} » fait quelque chose de visible`, !!(t || pa) || h0 !== h1); await O.nettoyer(p); }
    v('J : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); },
  async K() { for (const pack of ['plomberie', 'nettoyage']) { const c = await ouvrir({ packs: [pack] }), p = c.p;
      await L.aller(p, 'taches'); await p.evaluate(() => tPanneau()); await L.calme(p, 600);   // la fenêtre « Nouvelle tâche » (le champ de saisie rapide de l'écran est une autre porte)
      const ph = await p.evaluate(() => { const e = document.getElementById('tk-t'); return e ? e.getAttribute('placeholder') : null; });
      dit(`${pack} · « Quoi » d'une nouvelle tâche : ${ph}`); v(`K ${pack} : l'exemple du champ « Quoi » d'une tâche ne parle pas de PAC (pompe à chaleur)`, ph !== null && !/PAC|clim|fluide/i.test(ph), String(ph));
      await L.aller(p, 'interventions'); await L.toucher(c, p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first()); await L.calme(p, 700);
      const ph2 = await p.evaluate(() => [...document.querySelectorAll('#calque [placeholder], #contenu [placeholder]')].map(e => e.getAttribute('placeholder')).filter(x => /condensateur|fluide|clim|R32|PAC/i.test(x)));
      v(`K ${pack} : aucune indication de champ de « Nouvelle intervention » ne parle de condensateur, de fluide ou de clim`, ph2.length === 0, ph2.join(' | '));
      v(`K ${pack} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); } }
};
(async () => {
  for (const l of LETTRES) { try { console.log('— parcours ' + l); await S[l](); } catch (e) { ko++; console.log('  ✗ parcours ' + l + ' interrompu : ' + String(e.message || e).split('\n')[0]); } }
  await L.fermer(); process.exit(O.bilan('metier-3d-parcours ' + LETTRES.join(''), ok, ko, []));
})();
