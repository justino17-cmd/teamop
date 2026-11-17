// Campagne « clients » (17 novembre 2026) — LA FICHE : en-tête, chiffres, six onglets, pour chaque client, puis ce que fait chaque onglet / ligne.
// Usage : PROFIL=… QUI=… NUIT=1 node clients-fiche.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
const ONGLETS = ['histo', 'factures', 'appareils', 'contrats', 'docs', 'infos'];
const etat = p => p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', hash: location.hash, panneau: ((document.querySelector('#calque .panneau h2') || {}).textContent || '').trim(), toast: ((document.querySelector('#toast') || {}).textContent || '').trim(), atelier: !!(document.getElementById('opdz') && !document.getElementById('opdz').hidden && document.getElementById('opdz').offsetParent !== null), fen: ((document.querySelector('#fenetre .fen h2, #fenetre h2') || {}).textContent || '').trim() }));
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const cles = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv'));
  v('population : 8 clients dans l’entreprise d’essai', cles.length === 8, cles);
  const bilan = { fiches: 0, onglets: 0 };
  for (const k of cles) {
    await L.aller(p, 'client-x-' + k);
    const a = await p.evaluate(k => { const c = CLIENTS[k], F = FACTURES.filter(f => f.cli === k), ctr = CONTRATS.filter(x => x.cli === k), I = INTS.filter(i => i.cli === k);
      const proch = I.filter(i => i.d >= AUJ && !['fait', 'annulee', 'aplanifier'].includes(i.st)).map(i => i.d).sort()[0];
      const el = s => document.querySelector(s);
      return { c, nF: F.length, nC: ctr.length, proch, nApp: c.appareils.length, h1: el('#contenu h1').textContent, sur: (el('#contenu .surtitre') || {}).textContent, sous: (el('.tete-client .gris') || {}).textContent,
        tel: (document.querySelector('.tete-client a[href^="tel:"]') || {}).href, mail: (document.querySelector('.tete-client a[href^="mailto:"]') || {}).href,
        kpi: [...document.querySelectorAll('#contenu .kpis .kpi')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), onglets: [...document.querySelectorAll('#contenu [role=tab]')].map(e => e.textContent.trim()) }; }, k);
    const nom = a.c.nom; bilan.fiches++;
    v(`[${nom}] titre = nom du client, surtitre dit « ${a.sur} »`, a.h1 === nom && (a.c.type === 'pro' ? /professionnel/i : /particulier/i).test(a.sur) && /depuis \d{4}/.test(a.sur), { h1: a.h1, sur: a.sur });
    v(`[${nom}] la ligne sous le titre donne le téléphone et l’adresse`, (!a.c.tel || a.sous.includes(a.c.tel)) && (!a.c.adr || a.sous.includes(a.c.adr)), a.sous);
    if (a.c.tel) v(`[${nom}] « Appeler » compose le bon numéro`, !!a.tel && a.tel.replace(/\D/g, '').endsWith(a.c.tel.replace(/\D/g, '').slice(-9)), a.tel); else v(`[${nom}] sans numéro, pas de bouton « Appeler »`, !a.tel);
    if (a.c.mail) v(`[${nom}] « E-mail » écrit à la bonne adresse`, !!a.mail && a.mail.toLowerCase().includes(a.c.mail.toLowerCase()), a.mail); else v(`[${nom}] sans adresse, pas de bouton « E-mail »`, !a.mail);
    v(`[${nom}] six onglets, « Factures · ${a.nF} » et « Contrats · ${a.nC} » disent le bon nombre`, a.onglets.length === 6 && a.onglets[1] === 'Factures · ' + a.nF && a.onglets[3] === 'Contrats · ' + a.nC, a.onglets);
    v(`[${nom}] la tuile « ${a.kpi[3]} » compte ses appareils`, new RegExp('^' + a.nApp + ' appareil').test(a.kpi[3] || ''), a.kpi);
    const jp = a.proch ? a.proch.slice(8, 10) + '/' + a.proch.slice(5, 7) : '—'; v(`[${nom}] « prochain passage » : ${jp}`, (a.kpi[2] || '').startsWith(jp), a.kpi[2]);
    for (const o of ONGLETS) {
      const tab = p.locator(`#contenu [role=tab][data-oc="${o}"]`); const t = await L.toucher(c, tab); bilan.onglets++;
      const r = await p.evaluate(o => ({ presse: document.querySelector(`[role=tab][data-oc="${o}"]`).getAttribute('aria-pressed'), corps: (document.querySelector('#contenu .grille2 > .carte') || {}).innerText || '', rows: document.querySelectorAll('#contenu .grille2 > .carte tbody tr[data-go]').length,
        tl: document.querySelectorAll('#contenu .grille2 > .carte .tl > button').length, ligne: document.querySelectorAll('#contenu .grille2 > .carte .ligne, #contenu .grille2 > .carte .ligne-clic').length, champs: document.querySelectorAll('#contenu [data-ci]').length }), o);
      let bon = t && r.presse === 'true' && r.corps.trim().length > 0;
      if (o === 'factures') bon = bon && (r.rows === a.nF || (a.nF === 0 && /Aucune facture/.test(r.corps)));
      if (o === 'infos') bon = bon && r.champs === 6;
      if (o === 'appareils') bon = bon && (r.ligne === a.nApp || (a.nApp === 0 && /Aucun appareil/.test(r.corps)));
      if (o === 'contrats') bon = bon && (r.ligne >= a.nC) ;
      if (o === 'histo') bon = bon && r.tl >= 0;
      v(`[${nom}] onglet « ${o} » : s’allume, affiche son contenu (${r.rows || r.tl || r.ligne || r.champs} éléments)`, bon, { t, r: { ...r, corps: r.corps.slice(0, 80) } });
      const d = await L.deborde(c); if (d.bouge) v(`[${nom}] onglet ${o} : aucun glissement latéral`, false, d);
    }
    await L.toucher(c, '#contenu [role=tab][data-oc="histo"]');
  }
  v(`couverture : ${bilan.fiches} fiches, ${bilan.onglets} onglets joués`, bilan.fiches === 8 && bilan.onglets === 48, bilan);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
