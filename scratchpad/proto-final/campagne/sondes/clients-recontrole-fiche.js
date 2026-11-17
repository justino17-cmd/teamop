// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — la FICHE : renommer un client (clients-06), changer son adresse (clients-07),
// ce que le nouveau nom devient dans CHAQUE écran, ce que devient la carte des tournées avec une adresse inconnue.
// Usage : PROFIL=… NUIT=1 node clients-recontrole-fiche.js   ·   « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const toast = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const entete = () => p.evaluate(() => { const h = document.querySelector('#contenu .tete-client'); return h ? { h1: h.querySelector('h1').textContent, sous: (h.querySelector('h1').parentElement.querySelector('.gris') || {}).textContent || '', sur: (h.querySelector('.surtitre') || {}).textContent || '' } : null; });
  const champ = async (k, val) => { await p.fill(`[data-ci="${k}"]`, val); await p.evaluate(k => document.querySelector(`[data-ci="${k}"]`).blur(), k); await L.calme(p, 100); };
  const infos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await L.calme(p, 200); };
  const enreg = async () => { await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 350); return toast(); };
  const geo = k => p.evaluate(k => ({ g: CR_GEO[k] ? CR_GEO[k].slice() : null, s: SECT_CLI[k] || null, adr: CLIENTS[k].adr }), k);

  // ── nom : refus ──
  await infos('mr');
  v('population : la fiche de Mme Roux a ses champs Infos', await p.evaluate(() => ['nom', 'contact', 'tel', 'mail', 'type', 'adr', 'acces'].every(k => !!document.querySelector(`[data-ci="${k}"]`))));
  await champ('nom', '   '); let t = await enreg(); v('nom fait d’espaces : refusé (« ' + t + ' »)', /Indique le nom/.test(t), t);
  for (const bad of ['  hôtel DE la plage ', 'HOTEL de la PLAGE', 'restaurant le vieux-port', 'Restaurant  Le Vieux Port']) { await infos('mr'); await champ('nom', bad); t = await enreg();
    v('nom « ' + bad + ' » = celui d’un AUTRE client (casse, accents, tirets, espaces) : refusé', /porte déjà/.test(t), t); }
  const inchange = await p.evaluate(() => CLIENTS.mr.nom); v('après ces refus, le nom n’a pas bougé (' + inchange + ')', inchange === 'Mme Roux', inchange); await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Roux'; });
  // son propre nom, autre casse : permis (ce n'est pas un doublon)
  await infos('mr'); await champ('nom', 'MME ROUX'); t = await enreg(); v('son propre nom dans une autre casse reste permis (« ' + t + ' »)', /enregistrée/.test(t), t);
  await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Roux'; });
  // ── nom : renommer un particulier — l'en-tête dit-il deux noms ? ──
  await infos('mr'); await champ('nom', 'Mme Rouxel-Delacroix'); t = await enreg();
  const e1 = await entete(); console.log('  · en-tête après renommage : ' + JSON.stringify(e1) + ' · contact = « ' + await p.evaluate(() => CLIENTS.mr.contact) + ' »');
  v('renommer un particulier : l’en-tête porte le nouveau nom', e1 && /Rouxel-Delacroix/.test(e1.h1), e1);
  v('… et la ligne sous le titre ne répète PAS l’ancien nom comme s’il s’agissait d’une autre personne (« ' + (e1 && e1.sous) + ' »)', e1 && !/Mme Roux(?!el)/.test(e1.sous), e1);
  await p.evaluate(() => window.scrollTo(0, 0)); await L.calme(p, 300); await L.capture(c, CAP + 'fiche-renommee-' + ETQ + '.png');
  // ── le nouveau nom dans TOUS les écrans ──
  const routes = await p.evaluate(() => Object.keys(vues()).filter(k => !/^(securite)$/.test(k)));
  console.log('  · ' + routes.length + ' vues connues : ' + routes.join(', '));
  v('population : la page connaît au moins 15 vues', routes.length >= 15, routes.length);
  const reste = [];
  for (const r of routes) { await L.aller(p, r); const tx = await p.evaluate(() => document.getElementById('contenu').innerText);
    const fr = L.cadre(p); let tf = ''; if (fr) { try { tf = await fr.evaluate(() => { const b = document.body.cloneNode(true); b.querySelectorAll('script,style').forEach(x => x.remove()); return b.innerText || b.textContent; }); } catch (e) {}   /* un cadre caché rend innerText = textContent : le TEXTE de ses scripts (les clients du semis de la Comptabilité) passait pour de l'affichage */ }
    for (const [nom, tt] of [['page', tx], ['cadre', tf]]) { const m = tt.match(/.{0,40}\bMme Roux(?!el)\b.{0,40}/g); if (m) reste.push(r + '/' + nom + ' : ' + m.slice(0, 2).join(' ¦ ').replace(/\s+/g, ' ')); } }
  console.log('  · rubriques qui montrent encore « Mme Roux » : ' + (reste.length ? '\n    ' + reste.join('\n    ') : 'aucune'));
  v('aucune rubrique du menu ne montre encore l’ancien nom du client (' + reste.length + ')', reste.length === 0, reste);
  await p.evaluate(() => { try { filtreF = 'tous'; dvFiltre = 'tous'; } catch (e) {} });   // les onglets par défaut cachent des lignes : on les ouvre tous avant de chercher le nom
  for (const [r, lot] of [['devis', 'DV'], ['factures', 'FACTURES']]) { await L.aller(p, r); const a = await p.evaluate(l => ({ donnees: (l === 'DV' ? (dvSync(), DV) : FACTURES).some(x => x.cli === 'mr'), texte: /Rouxel-Delacroix/.test(document.getElementById('contenu').innerText), ancien: /Mme Roux(?!el)/.test(document.getElementById('contenu').innerText) }), lot);
    v('rubrique « ' + r + ' » (onglet « tous ») : le client (qui y a des lignes : ' + a.donnees + ') y paraît sous son nouveau nom, jamais sous l’ancien', !a.donnees || (a.texte && !a.ancien), a); }
  // l'atelier (Composer un devis) : liste de clients à jour
  await L.aller(p, 'client-x-mr'); const dn = await p.evaluate(() => { try { return JSON.stringify(opdDonnees()).includes('Rouxel-Delacroix'); } catch (e) { return 'erreur ' + e.message; } });
  v('ce qui part à l’atelier de devis (opdDonnees) porte le nouveau nom', dn === true, dn);
  // ── nom très long, HTML ──
  const LONG = 'Établissements Dupont-Lefebvre & Associés de la Grande Région Atlantique SARL — Division climatisation et chauffage';
  await infos('mr'); await champ('nom', LONG); t = await enreg(); const el = await entete();
  v('nom de ' + LONG.length + ' signes : enregistré et affiché en entier (h1 = ' + (el && el.h1.length) + ' signes)', el && el.h1 === LONG, el);
  let d = await L.deborde(c); v('nom très long : la fiche ne glisse pas de côté', d.bouge === 0, d);
  await p.evaluate(() => window.scrollTo(0, 0)); await L.calme(p, 300); await L.capture(c, CAP + 'fiche-nom-long-' + ETQ + '.png');
  await L.aller(p, 'clients'); d = await L.deborde(c); v('nom très long : la liste ne glisse pas de côté', d.bouge === 0, d); await L.capture(c, CAP + 'liste-nom-long-' + ETQ + '.png');
  await infos('mr'); await champ('nom', '<b id="zzn">Gras</b> & "co"'); t = await enreg(); const h = await p.evaluate(() => ({ zz: !!document.getElementById('zzn'), h1: document.querySelector('#contenu h1').textContent }));
  v('nom avec du HTML : affiché tel quel, rien n’est interprété (« ' + h.h1 + ' »)', !h.zz && /<b id="zzn">/.test(h.h1), h);
  await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Roux'; });
  // ── adresse : la carte suit ──
  const g0 = await geo('mr'); console.log('  · Mme Roux au départ : ' + JSON.stringify(g0));
  await infos('mr'); await champ('adr', '4 rue du Port, 17300 Rochefort'); t = await enreg(); let g = await geo('mr');
  v('adresse → Rochefort : le point de la carte suit (' + JSON.stringify(g.g) + ') et le secteur (' + g.s + ')', g.g && Math.abs(g.g[0] - 45.9378) < 0.01 && g.s === 'Sud', g);
  const lien = await p.evaluate(() => { const i = INTS.find(x => x.cli === 'mr'); return i ? i.id : null; });
  await infos('mr'); await champ('adr', '8 rue de Rivoli, 75001 Paris'); t = await enreg(); g = await geo('mr');
  v('adresse → Paris (hors zone) : le point et le secteur sont retirés, rien ne reste de l’ancienne adresse (' + JSON.stringify(g) + ')', g.g === null && g.s === null, g);
  const fiche = await entete(); v('… et l’en-tête dit la nouvelle adresse', /Paris/.test(fiche.sous), fiche);
  // aucune rubrique ne plante avec un client sans position ni secteur
  const err0 = c.err.length; for (const r of ['planning', 'interventions', 'carte', 'tournees', 'clients', 'devis', 'taches']) { await L.aller(p, r); }
  v('client hors secteur et sans point : aucune erreur JavaScript en parcourant planning, interventions, carte, tournées, clients, devis, tâches', c.err.length === err0, c.err.slice(err0));
  // la carte des tournées avec ce client à confier
  const cr = await p.evaluate(() => { const rep = []; for (const i of INTS.filter(x => x.cli === 'mr')) rep.push({ id: i.id, st: i.st, pos: CR_GEO[i.cli] || null }); return rep; });
  console.log('  · interventions de Mme Roux : ' + JSON.stringify(cr));
  // adresse vidée
  await infos('mr'); await champ('adr', ''); t = await enreg(); g = await geo('mr'); v('adresse vidée : enregistrée sans erreur, point et secteur retirés (' + JSON.stringify(g) + ')', g.g === null && g.s === null && /enregistrée/.test(t), { g, t });
  const err1 = c.err.length; for (const r of ['planning', 'carte', 'tournees']) await L.aller(p, r); v('adresse vidée : planning et carte ne plantent pas', c.err.length === err1, c.err.slice(err1));
  // téléphone / e-mail : refus et formats
  await infos('mr'); await champ('tel', 'abc'); t = await enreg(); v('téléphone « abc » refusé', /téléphone/.test(t), t);
  await infos('mr'); await champ('tel', '+33 6 55 44 33 22'); t = await enreg(); v('téléphone « +33 6 55 44 33 22 » accepté (' + t + ')', /enregistrée/.test(t), t); const tv = await p.evaluate(() => CLIENTS.mr.tel); console.log('  · téléphone rangé : « ' + tv + ' »');
  await infos('mr'); await champ('mail', 'pas un mail'); t = await enreg(); v('e-mail « pas un mail » refusé', /mail/.test(t), t);
  await infos('mr'); await champ('mail', 'roux@mail.fr'); await champ('contact', ''); t = await enreg(); v('contact vidé : refusé', /contact/i.test(t), t);
  // changer le type
  await infos('mr'); await p.selectOption('[data-ci="type"]', 'pro'); await enreg(); const lib = await p.evaluate(() => { const l = document.querySelector('[data-ci="nom"]').parentElement.firstChild.textContent.trim(); return { lib: l, sur: document.querySelector('.surtitre').textContent }; });
  v('type → professionnel : le champ se nomme « Raison sociale » et le surtitre suit (' + JSON.stringify(lib) + ')', /Raison sociale/.test(lib.lib) && /professionnel/i.test(lib.sur), lib);
  v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
