// Espace client : TOUCHE chaque élément qui répond (recensé dans le DOM), sur plusieurs clients, et vérifie que le geste mène où il le dit.
// node client-gestes.js [profil] [nuit]   → « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Rapport : client-gestes-<profil>.json (dossier des captures).
const O = require('./client-outils.js'), L = O.L, fs = require('fs');
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', clients = (process.argv[4] || 'md,hp,cm,vp,mi').split(',');
// ce que chaque geste ANNONCE : { quoi: contrôle(avant, après, g) }
const attendu = (g, a) => {
  const d = Object.fromEntries((g.data || '').split(' ').filter(Boolean).map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
  if (d['data-ec']) { const [v, x] = d['data-ec'].split('|');
    if (v === 'tab') return a.tab === x && !a.panneau && !a.doc;
    if (v === 'payer') return /Payer la facture/i.test(a.panneau);
    if (v === 'fpdf') return /^FAC|Facture/i.test(a.doc) || /facture/i.test(a.doc);
    if (v === 'cr') return /Compte rendu d’intervention/i.test(a.panneau);
    if (v === 'signer') return /Votre devis/i.test(a.panneau) && a.panneau.includes(x);
    if (v === 'demande') return /Demander une intervention/.test(a.panneauTitre); }
  if (d['data-ecctr']) return /Demander/.test(a.panneauTitre);
  if (d['data-dv']) { const [v, x] = d['data-dv'].split('|'); if (v === 'pdf') return /Devis|D-2026/i.test(a.doc) && a.doc.includes(x.replace(/^D-/, '')) || /Devis/i.test(a.doc); }
  if (d['data-go']) return a.hash.includes(d['data-go'].split('-x-')[0]);
  if (d['data-rl'] === 'retour') return true;   // le retour est jugé à part (client-parcours)
  return null; };
(async () => {
  const sortie = []; let touches = 0, recenses = 0;
  for (const cli of clients) {
    const c = await O.client({ profil, nuit, cli }); const p = c.p;
    for (const tab of ['accueil', 'factures', 'interventions', 'devis', 'contrats']) {
      await p.evaluate(({ cli, tab }) => { RL_CLI.cli = cli; EC.tab = tab; rendre(); }, { cli, tab }); await L.calme(p, 300);
      const liste = (await L.gestes(p, 'body')).filter(g => (!/data-rl=|data-gd=|data-mch=|data-logo|data-menu=|data-sortie=/.test(g.data) || /data-rl=retour/.test(g.data)));
      L.v(`${cli}/${tab} : population recensée (${liste.length})`, liste.length >= 5, liste.length);
      for (const g of liste) { recenses++;
        // on retrouve l'élément par sa signature (libellé + data), jamais par son rang
        await p.evaluate(({ cli, tab }) => { RL_CLI.cli = cli; EC.tab = tab; rendre(); }, { cli, tab }); await L.calme(p, 200);
        const marque = await p.evaluate(({ lib, data }) => { for (const e of document.querySelectorAll('body *')) { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
            const lb = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 60);
            const dd = [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
            if (lb === lib && dd === data && /^(BUTTON|A|DIV|SPAN|SUMMARY|INPUT|LABEL)$/.test(e.tagName)) { e.setAttribute('data-campg', '1'); return true; } } return false; }, g);
        if (!marque) { L.v(`${cli}/${tab} « ${g.lib} » retrouvé au rejeu`, false, g.data); continue; }
        const ok = await L.toucher(c, '[data-campg="1"]', { delai: 5000 }); await p.evaluate(() => document.querySelectorAll('[data-campg]').forEach(e => e.removeAttribute('data-campg')));
        if (ok) touches++; const a = await O.dessus(p), att = attendu(g, a);
        sortie.push({ cli, tab, lib: g.lib, data: g.data, h: g.h, l: g.l, ok, apres: a, attendu: att });
        L.v(`${cli}/${tab} « ${g.lib.slice(0, 40)} » {${g.data.slice(0, 40)}} touché`, ok, 'cible non atteinte');
        if (att === false) L.v(`${cli}/${tab} « ${g.lib.slice(0, 40)} » mène où il le dit`, false, JSON.stringify(a).slice(0, 300));
        else if (att === null) console.log('   ~ non jugé :', g.lib.slice(0, 40), g.data.slice(0, 50), '→', JSON.stringify(a).slice(0, 160));
        // fermeture : Échap doit fermer ce qui est ouvert
        if (a.panneau || a.doc) { await p.keyboard.press('Escape'); await L.calme(p, 250); const b = await O.dessus(p);
          L.v(`${cli}/${tab} « ${g.lib.slice(0, 30)} » : Échap ferme`, !b.panneau && !b.doc, JSON.stringify(b).slice(0, 200)); }
        await O.nettoyer(p); }
    }
    if (c.err.length) console.log('ERR', cli, c.err.slice(0, 3)); L.v(`${cli} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }
  console.log(`\ngestes recensés ${recenses} · touchés ${touches}`); fs.writeFileSync(O.CAP + `gestes-${profil}${nuit ? '-nuit' : ''}-${clients.join('')}.json`, JSON.stringify({ recenses, touches, sortie }, null, 1));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
