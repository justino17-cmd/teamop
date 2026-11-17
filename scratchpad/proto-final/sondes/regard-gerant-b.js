// Le REGARD du gérant, rubriques Clients · Devis · Contrats · Boîte mail · Comptabilité · Achats et frais (17 novembre 2026).
// Chaque contrôle ci-dessous garde un défaut VU sur une capture (regardée à l'œil) puis corrigé à la source. Rejouable seul : « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const L = require('../lib.js');
const v = L.v;
const aller = async (c, r) => { await L.aller(c.p, r); };
const texte = (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
(async () => {
  // 1. Clients : un carnet VIDE ne parle pas d'une recherche (« Aucun client ne correspond à «  » ») : il dit quoi faire
  for (const profil of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' });
    await c.p.evaluate(() => { for (const k of Object.keys(CLIENTS)) delete CLIENTS[k]; }); await aller(c, 'clients');
    const t = await texte(c, '#contenu .carte.gris');
    v(`clients vides (${profil}) : le message dit d’ajouter le premier client`, !!t && /pas encore de client/.test(t) && !/correspond/.test(t), t);
    await c.p.evaluate(() => { chercheClient = 'zzzzzz'; }); await aller(c, 'clients');
    const t2 = await texte(c, '#contenu .carte.gris');
    v(`clients (${profil}) : une recherche sans résultat nomme toujours le mot cherché`, !!t2 && /correspond à « zzzzzz »/.test(t2), t2);
    await L.fin(c);
  }
  // 2. Clients : la carte tient ses trois chiffres sur une ligne d’étiquette (« prochain passage » ne passe plus sur trois lignes)
  for (const profil of ['iphone', 'android']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'clients');
    const r = await c.p.evaluate(() => [...document.querySelectorAll('.client-carte .client-chiffres small')].map(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 16))));
    v(`clients (${profil}) : population des étiquettes de chiffres`, r.length >= 9, r.length);
    v(`clients (${profil}) : aucune étiquette de chiffre sur plus de deux lignes`, r.every(n => n <= 2), r.join(','));
    await L.fin(c);
  }
  // 3. Devis : les cinq filtres restent TOUS visibles (« Tous » ne se perd plus derrière le bord de l’écran)
  for (const profil of ['iphone', 'android', 'petit', 'ipad']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'devis');
    const r = await c.p.evaluate(() => { const s = document.querySelector('.seg [data-dvf]:not(.kpi)').closest('.seg'), W = document.documentElement.clientWidth;
      return { n: s.querySelectorAll('button').length, defile: s.scrollWidth - s.clientWidth, horsEcran: [...s.querySelectorAll('button')].filter(b => { const x = b.getBoundingClientRect(); return x.right > W + 0.5 || x.left < -0.5; }).length }; });
    v(`devis (${profil}) : cinq filtres`, r.n === 5, r.n);
    v(`devis (${profil}) : le groupe de filtres ne défile pas de côté`, r.defile <= 1, r.defile);
    v(`devis (${profil}) : aucun filtre hors de l’écran`, r.horsEcran === 0, r.horsEcran);
    await L.fin(c);
  }
  // 4. Devis : chaque liste vide dit POURQUOI et quoi faire, pas « Rien ici »
  { const c = await L.ouvrir({ profil: 'iphone', qui: 'marc' });
    await c.p.evaluate(() => { try { for (const k of Object.keys(DEVIS_REG)) delete DEVIS_REG[k]; DV.length = 0; } catch (e) {} });
    for (const [f, motif] of [['aenvoyer', /Aucun devis à envoyer/], ['attente', /n’attend de réponse/], ['accepte', /Aucun devis accepté/], ['perdu', /refusé ni expiré/], ['tous', /pas encore de devis/]]) {
      await c.p.evaluate(x => { dvFiltre = x; }, f); await aller(c, 'devis');
      const t = await texte(c, '.dv-liste .gris');
      v(`devis vides, filtre ${f} : message propre`, !!t && motif.test(t) && !/Rien ici/.test(t), t); }
    await L.fin(c); }
  // 5. Contrats : sans contrat, pas de tableau vide avec ses seuls titres de colonnes
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); const avant = await (async () => { await aller(c, 'contrats'); return c.p.evaluate(() => document.querySelectorAll('.ctr-tab tbody tr').length); })();
    v('contrats : population de départ (3 lignes)', avant === 3, avant);
    await c.p.evaluate(() => { CONTRATS.length = 0; }); await aller(c, 'contrats');
    const r = await c.p.evaluate(() => ({ tab: !!document.querySelector('.ctr-tab'), msg: [...document.querySelectorAll('#contenu .carte.gris')].map(e => e.textContent).join(' | ') }));
    v('contrats vides : plus de tableau sans ligne', !r.tab, r);
    v('contrats vides : le message dit comment commencer', /pas encore de contrat/.test(r.msg), r.msg);
    await L.fin(c); }
  // 6. « Nouveau contrat » porte la même pastille « Retour · Contrats » que les autres écrans profonds, pas un lien nu
  for (const profil of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'contrats'); await L.toucher(c, '[data-go=contrat-nouveau]');
    const r = await c.p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, pastille: !!document.querySelector('#contenu .rl-retour'), nu: !!document.querySelector('#contenu .lien.retour') }));
    v(`nouveau contrat (${profil}) : l’écran est ouvert`, /entretien|contrat/i.test(r.h1 || ''), r);
    v(`nouveau contrat (${profil}) : pastille Retour, pas de lien nu`, r.pastille && !r.nu, r);
    await L.fin(c); }
  // 7. Achats et frais : les deux onglets (Demandes · Notes de frais) montrent LEQUEL est choisi (aria-selected seul ne dessinait rien)
  for (const [profil, nuit] of [['mac', false], ['iphone', false], ['ipad', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
    for (const onglet of ['demandes', 'notes']) {
      await c.p.evaluate(o => { acOnglet = o; }, onglet); await aller(c, 'achats');
      const r = await c.p.evaluate(() => { const B = [...document.querySelectorAll('.pr-vues button')].filter(b => b.offsetParent), sig = b => { const s = getComputedStyle(b); return s.fontWeight + '|' + s.backgroundColor + '|' + s.boxShadow; };
        const ch = B.filter(b => b.getAttribute('aria-selected') === 'true'); return { n: B.length, choisis: ch.length, styles: new Set(B.map(sig)).size, choisiDiffere: ch.length === 1 && B.filter(b => b !== ch[0]).every(b => sig(b) !== sig(ch[0])) }; });
      v(`achats (${profil}${nuit ? ' nuit' : ''}) onglet ${onglet} : deux onglets, un seul choisi`, r.n === 2 && r.choisis === 1, r);
      v(`achats (${profil}${nuit ? ' nuit' : ''}) onglet ${onglet} : l’onglet choisi se voit (style différent des autres)`, r.choisiDiffere, r); }
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})();
