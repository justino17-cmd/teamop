// RESTES CLIENTS, tour 5 (19 novembre 2026) : les deux corrections imposées par le chef de chantier.
//   D1. dictée : un nom se dit EN ENTIER, quelle que soit la ponctuation du nom (apostrophe droite ET typographique, trait d'union, chiffre, point) ;
//       « support mural » ne désigne toujours pas « Le Vieux Port », et un mot commun ne reconnaît pas deux clients à la fois
//   D2. carte client au nom d'UN seul mot de 54 signes : le nom se coupe DANS la carte, la page ne s'élargit jamais (mesure contre documentElement.clientWidth)
// Usage : PROFIL=… QUI=marc|julie NUIT=1 SEUL=D1,D2 node clients-restes5.js — « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients5/', ETQ = PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI;
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  require('fs').mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const D0 = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, vp: Object.keys(CLIENTS).filter(k => /Vieux Port/.test(CLIENTS[k].nom)).length, mr: !!CLIENTS.mr }));
  v('population : ' + D0.n + ' clients, « Le Vieux Port » et Mme Roux présents', D0.n >= 7 && D0.vp === 1 && D0.mr, D0);
  const dicter = t => p.evaluate(t => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = t; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; } const nv = DV.slice(n0); const r = { cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim() }; DV.splice(n0); try { fermerPanneau(); } catch (e) {} return r; }, t);
  const mk = (k, nom) => p.evaluate(([k, nom]) => { CLIENTS[k] = { nom, type: 'pro', contact: 'X', tel: '06 10 20 30 40', mail: 'x@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; }, [k, nom]);
  const rm = ks => p.evaluate(ks => { ks.forEach(k => delete CLIENTS[k]); }, ks);

  if (veut('D1')) {
    const noms = { __a: 'Restaurant L’Océan', __b: 'Boulangerie L’Épi d’Or', __c: 'Café de l’Escale', __d: 'Atelier Saint-Hubert', __e: 'Garage 17 Atlantique', __f: 'Bar-Tabac Le Rialto', __g: 'Maison d\'Hôtes Beauséjour', __h: 'Jean-Pierre Vasseur', __i: 'Ets Duchemin et fils S.A.R.L.' };
    for (const [k, n] of Object.entries(noms)) await mk(k, n);
    const cas = [
      ['Devis pour l’Océan, une heure', '__a'], ['Devis pour le restaurant L’Océan, une heure', '__a'], ['devis pour l\'ocean, une heure', '__a'], ['Devis pour L’OCÉAN, une heure', '__a'],
      ['Devis pour L’Épi d’Or, une heure', '__b'], ['Devis pour la boulangerie L\'Epi d\'Or, une heure', '__b'],
      ['Devis pour l’Escale, une heure', '__c'], ['Devis pour le café de l’Escale, une heure', '__c'], ['Devis pour Escale. Une heure', '__c'],
      ['Devis pour Saint-Hubert, une heure', '__d'], ['Devis pour saint hubert, une heure', '__d'], ['Devis pour l’atelier Saint‑Hubert, une heure', '__d'],
      ['Devis pour le garage 17 Atlantique, une heure', '__e'], ['Devis pour Atlantique, une heure', '__e'],
      ['Devis pour Bar-Tabac Le Rialto, une heure', '__f'], ['Devis pour le Rialto, une heure', '__f'],
      ['Devis pour Beauséjour, une heure', '__g'], ['Devis pour la maison d’hôtes Beauséjour, une heure', '__g'],
      ['Devis pour Jean-Pierre Vasseur, une heure', '__h'], ['Devis pour Vasseur, une heure', '__h'],
      ['Devis pour Ets Duchemin et fils S.A.R.L., une heure', '__i'],
      ['Devis pour le Vieux Port, une heure', 'vp'], ['Devis pour Mme Roux, une heure', 'mr'], ['Devis pour Mme Durand, une heure', 'md'], ['Devis pour M. et Mme Durand, une heure', 'md'],
    ];
    const vp = await p.evaluate(() => Object.keys(CLIENTS).find(k => /Vieux Port/.test(CLIENTS[k].nom)));
    for (const [t, k0] of cas) { const k = k0 === 'vp' ? vp : k0; const r = await dicter(t); const attendu = r.cree === 1 && r.cli[0] === k;
      v('D1 : « ' + t.slice(0, 58) + ' » va à ' + k + ' (clients : ' + (r.cli || []).join(',') + ', « ' + (r.toast || '').slice(0, 40) + ' »)', !r.err && attendu, r); }
    // faux amis : un mot qui n'est qu'un morceau d'un autre mot ne désigne personne
    for (const t of ['Devis pour un support mural, une heure', 'Devis pour un portail, une heure', 'Devis pour un escalier, une heure', 'Devis pour l’océanographe, une heure', 'Devis pour un épicier, une heure']) {
      const r = await dicter(t); v('D1 faux ami : « ' + t.slice(0, 50) + ' » ne reconnaît aucun client (devis ' + r.cree + ', ' + (r.cli || []).join(',') + ')', !r.err && r.cree === 0, r); }
    // « support mural » seul ne choisit pas « Le Vieux Port »
    const sm = await dicter('Devis pour le support mural du Vieux Port, une heure'); v('D1 : « support mural du Vieux Port » va bien à Le Vieux Port (le vrai nom, dit en entier)', !sm.err && sm.cree === 1 && sm.cli[0] === vp, sm);
    // mot commun : deux clients ne sont jamais choisis à la fois
    const mc = await dicter('Devis pour Saint-Hubert et l’Escale, une heure'); v('D1 : deux noms dans la phrase : UN seul devis (' + mc.cree + ')', !mc.err && mc.cree === 1, mc);
    // un client archivé n'est toujours pas proposé, et la phrase le dit
    await p.evaluate(() => { CLIENTS.__c.archive = true; }); const ar = await dicter('Devis pour l’Escale, une heure');
    v('D1 : archivé, « l’Escale » est refusé avec la phrase de l’archivé (« ' + (ar.toast || '').slice(0, 60) + ' »)', !ar.err && ar.cree === 0 && /archiv/i.test(ar.toast), ar);
    await rm(Object.keys(noms));
  }

  // D1b (SŒUR 5, 18 novembre) : la dictée CHOISIT le client qui a le plus de mots reconnus — faux amis de 3 lettres, formes juridiques, noms entiers d'abord
  if (veut('D1b')) {
    const noms = { __m1: 'Bar-Tabac Le Rialto', __m2: 'Boulangerie L’Épi d’Or', __m3: 'Marie-Claire Petit', __m4: 'Claire Dubois', __m5: 'Jean Martin', __m6: 'Jean-Pierre Vasseur', __m8: 'Durand Frères SAS', __m10: 'Dupuis SARL', __m11: 'Garnier EURL', __m9: 'SCI Les Mouettes' };
    for (const [k, n] of Object.entries(noms)) await mk(k, n);
    const cas = [
      ['Devis pour un bar à vin, une heure', null], ['Devis pour un bar a vin', null], ['Devis pour une sas, une heure', null], ['Devis pour une sci, une heure', null], ['Devis pour un épi de faîtage, une heure', null], ['Devis pour une sarl, une heure', null], ['Devis pour une eurl, une heure', null], ['Devis pour Dupuis, une heure', '__m10'], ['Devis pour la pose de pierre, une heure', null],
      ['Devis pour le Bar-Tabac, une heure', '__m1'], ['Devis pour L’Épi d’Or, une heure', '__m2'],
      ['Devis pour Claire Dubois, une heure', '__m4'], ['Devis pour Marie-Claire Petit, une heure', '__m3'], ['Devis pour Claire, une heure', '__m4'],
      ['Devis pour Jean Martin, une heure', '__m5'], ['Devis pour le cabinet dentaire Martin, une heure', 'cm'], ['Devis pour Jean-Pierre, une heure', '__m6'], ['Devis pour Jean-Pierre Vasseur, une heure', '__m6'], ['Devis pour Vasseur, une heure', '__m6'],
      ['Devis pour Durand Frères SAS, une heure', '__m8'], ['Devis pour la SCI Les Mouettes, une heure', '__m9'], ['Devis pour les Mouettes, une heure', '__m9'],
    ];
    for (const [t, k] of cas) { const r = await dicter(t); const ok = !r.err && (k === null ? r.cree === 0 : r.cree === 1 && r.cli[0] === k);
      v('D1b : « ' + t.slice(0, 55) + ' » ' + (k ? 'va à ' + k : 'ne choisit personne') + ' (clients : ' + (r.cli || []).join(',') + ')', ok, r); }
    await rm(Object.keys(noms));
  }

  if (veut('D2')) {
    await L.aller(p, 'clients');
    const nom = 'Etablissementsdupontdelaunayfreresetassociesdusudouest';
    v('D2 : le nom de l’essai compte 54 signes', nom.length === 54, nom.length);
    for (const arch of [false, true]) for (const base of [nom, 'Électricité' + nom.slice(0, 42) + 'Ö']) {
      await p.evaluate(([nom, arch]) => { delete CLIENTS.__lg; CLIENTS.__lg = { nom, type: 'pro', contact: nom, tel: '06 10 20 30 40', mail: 'lg@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; if (arch) CLIENTS.__lg.archive = true; rangClients = arch ? 'archives' : 'tous'; chercheClient = nom.slice(0, 10); rendre(); }, [base, arch]); await L.calme(p, 400);
      const m = await p.evaluate(() => { const k = document.querySelector('#contenu .client-carte'); if (!k) return null; const r = k.getBoundingClientRect(), cw = document.documentElement.clientWidth; const bad = []; k.querySelectorAll('*').forEach(e => { const q = e.getBoundingClientRect(); if (q.width > 0 && (q.right > r.right + 0.5 || q.left < r.left - 0.5)) bad.push(e.tagName + ':' + Math.round(q.right - r.right)); }); return { cw, sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, carteDroite: Math.round(r.right), bad: bad.slice(0, 3), n: document.querySelectorAll('#contenu .client-carte').length }; });
      v('D2 : « ' + base.slice(0, 20) + '… » ' + base.length + ' signes' + (arch ? ' (archivé)' : '') + ' : rien ne sort de la carte, la page reste à ' + (m ? m.cw : '?') + ' (défilable ' + (m ? m.sw : '?') + ', carte à ' + (m ? m.carteDroite : '?') + ')', !!m && m.n === 1 && m.bad.length === 0 && m.sw <= m.cw && m.bw <= m.cw && m.carteDroite <= m.cw, m);
      await p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.style.display = 'none'; });
      if (base === nom) await L.capture(c, CAP + 'carte-mot-unique-' + (arch ? 'arch-' : '') + ETQ + '.png');
    }
    await p.evaluate(() => { delete CLIENTS.__lg; chercheClient = ''; rangClients = 'tous'; rendre(); });
  }

  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
