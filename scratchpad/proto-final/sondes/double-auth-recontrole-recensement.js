// Sonde « double-auth-recontrole-recensement » (étape 6, recontrôle adverse) : les corrections tout-10 / tout-11 gardaient QUATRE vues et DEUX gestes. La leçon de la relecture était
// « un recensement part des DONNÉES MONTRÉES, jamais des boutons gardés ». On la rejoue ici sans liste de vues écrite à la main : Marc (gérant, session par le nombre, fenêtre de 5 minutes
// FERMÉE) parcourt toutes les rubriques du menu, tous les groupes et tous les onglets de la Comptabilité, tous les onglets de Temps de travail, la recherche, et cherche dans ce que la
// PAGE a écrit (innerText ET innerHTML) les données que les portes S1 à S9 protègent : lignes du relevé bancaire, IBAN, salaires de chaque personne.
// Population d'abord : le contrôle ne vaut que si les mêmes marques SE VOIENT une fois la fenêtre ouverte (sinon « aucune » prouverait un ensemble vide).
// Usage : node double-auth-recontrole-recensement.js   (PROFIL=mac|iphone|windows, NUIT=1)
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = process.env.NUIT === '1';
const avancer = async (c, n) => { await c.p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles:true }))); await S.avancer(c, n); };
const lire = c => c.p.evaluate(() => {
  const el = document.getElementById('contenu') || document.body, t = el.innerText.replace(/[  ]/g, ' '), h = el.innerHTML;
  const eurosDe = (typeof paieFiches === 'function') ? paieFiches() : [];
  const nets = eurosDe.map(b => eur(b.netPaye).replace(/[  ]/g, ' ')), bruts = eurosDe.map(b => eur(b.brut).replace(/[  ]/g, ' '));
  const bases = (typeof PAIE_SAL !== 'undefined') ? Object.keys(PAIE_SAL).map(k => nbFr(PAIE_SAL[k].base).replace(/[  ]/g, ' ')) : [];
  const casse = (re) => re.test(t) || re.test(h);
  return { releve:casse(/VIR SEPA|COMMISSIONS CB|PRLV MAAF|FRAIS TENUE DE COMPTE|REMISE CB \d|CB TOTALENERGIES/),
    iban:casse(/FR\d\d[ \d•]{10,}[A-Z0-9]*\d{4}/) && /FR76[ \d]{8,}/.test(t + h),
    ibanComplet:/FR76\s?\d{4}\s?\d{4}\s?\d{4}/.test(t + h),
    net:nets.filter(x => x && t.includes(x)).length, brut:bruts.filter(x => x && t.includes(x)).length, base:bases.filter(x => x && x.length > 4 && t.includes(x)).length,
    nNets:nets.length, verrou:!!document.querySelector('[data-secvue]'), conf:!!document.getElementById('sec-conf') };
});
const vu = x => x.releve || x.ibanComplet || x.net > 0 || x.brut > 0;
(async () => {
  const c = await S.ouvrir({ profil:PROFIL, nuit:NUIT }); await S.tous(c);
  const rg = await S.entrer(c, 'marc'); v('Marc est connecté par le nombre (session non automatique)', rg.ok && await c.p.evaluate(() => SESSION === 'marc' && SECU.sessions.marc.auto === false));
  const fermerConf = async () => { await c.p.evaluate(() => { const b = document.querySelector('#sec-conf [data-sec3="annuler"]'); if (b) b.click(); }); await c.p.waitForTimeout(250); };
  await avancer(c, 6); await c.p.evaluate(() => { const b = document.querySelector('#opsec [data-ops="revenir"], #opsec [data-ops="cacher"]'); if (b && b.offsetParent) b.click(); });
  v('population : la fenêtre de 5 minutes est fermée', await c.p.evaluate(() => !secuFenetreValide('marc')) && await c.p.evaluate(() => secuMasqueActif()));
  const routes = await c.p.evaluate(() => CATS.flatMap(g => g[1].map(x => x[0])));
  console.log('  routes recensées :', routes.length, routes.join(','));
  v('population : au moins 20 rubriques recensées', routes.length >= 20, routes.length);
  // les marques existent bien (sinon « aucune » ne prouve rien) : fenêtre OUVERTE sur la vue d'abord
  const vusParPorte = [];
  let visites = 0;
  for (const r of routes) { await fermerConf(); try { await L.aller(c.p, r); } catch (e) { continue; } await c.p.waitForTimeout(350); await fermerConf(); const x = await lire(c); visites++; if (vu(x)) vusParPorte.push(r + ' ' + JSON.stringify({ r:x.releve, i:x.ibanComplet, n:x.net, b:x.brut })); }
  console.log('  rubriques visitées :', visites);
  v('aucune rubrique du menu n\'écrit une ligne de relevé, un IBAN complet ou le net/brut d\'une personne fenêtre fermée', vusParPorte.length === 0, vusParPorte.join(' | '));
  // Comptabilité : tous les groupes × tous les onglets
  await fermerConf(); await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); await fermerConf();
  const grp = await c.p.$$eval('[data-cx^="grp|"]', e => e.map(x => x.getAttribute('data-cx')));
  console.log('  groupes de la Comptabilité :', grp.join(','));
  v('population : au moins 5 groupes de la Comptabilité', grp.length >= 5, grp.length);
  let onglets = 0; const fuites = [], gardes = [];
  const tousOnglets = await c.p.evaluate(() => (typeof CX_NAV !== 'undefined' ? CX_NAV : []).flatMap(g => g[3].map(x => g[0] + '|' + x[0])));
  v('population : au moins 20 onglets de la Comptabilité recensés dans CX_NAV', tousOnglets.length >= 20, tousOnglets.length);
  for (const gs of tousOnglets) { const [g, o] = gs.split('|');
    for (const chemin of ['clic', 'direct']) {
      await avancer(c, 6); await fermerConf();
      await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(250);
      if (chemin === 'clic') { await c.p.evaluate(g => { const b = document.querySelector('[data-cx="grp|' + g + '"]'); if (b) b.click(); }, g); await c.p.waitForTimeout(250); await fermerConf(); await c.p.evaluate(o => { const b = document.querySelector('[data-cx="sec|' + o + '"]'); if (b) b.click(); }, o); }
      else await c.p.evaluate(o => { CP.onglet = o; rendre(); }, o);   // le second chemin : un lien, une recherche, un « Voir » d'une autre carte posent l'onglet sans le clic
      await c.p.waitForTimeout(450); const x = await lire(c); if (chemin === 'clic') onglets++;
      if (vu(x)) fuites.push(chemin + ':' + gs + ' ' + JSON.stringify({ r:x.releve, i:x.ibanComplet, n:x.net, b:x.brut })); if (x.verrou) gardes.push(gs);
      await fermerConf(); }
  }
  console.log('  onglets de la Comptabilité visités :', onglets, '· gardés (carte de verrou) :', [...new Set(gardes)].join(','));
  v('aucun onglet de la Comptabilité (clic OU pose directe) n\'écrit relevé, IBAN complet ou salaire d\'une personne fenêtre fermée', fuites.length === 0, fuites.join(' | '));
  v('les quatre vues sensibles sont les seules à porter la carte de verrou', [...new Set(gardes)].sort().join(',') === ['paie|charges', 'paie|fiches', 'paie|salaries', 'tresorerie|banque'].sort().join(','), [...new Set(gardes)].join(','));
  // Temps de travail (Paie) : sous-onglets
  const ptOnglets = await c.p.evaluate(() => { try { return Object.keys(PT || {}).filter(k => /onglet|vue/i.test(k)).map(k => k + '=' + PT[k]); } catch (e) { return []; } });
  console.log('  état de Temps de travail :', ptOnglets.join(','));
  // la contre-épreuve : confirmée, les mêmes marques se voient (sinon le zéro d'au-dessus ne prouvait rien)
  await avancer(c, 6); await fermerConf(); await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(400); await c.p.evaluate(() => { CP.onglet = 'fiches'; rendre(); }); await c.p.waitForTimeout(500);
  const cf = await S.conf(c); v('contre-épreuve : la confirmation s\'ouvre sur « Fiches de paie »', !!cf);
  await S.confirmer(c, 'marc'); await c.p.waitForTimeout(700);
  let x = await lire(c); v('contre-épreuve : confirmée, les salaires nets se lisent (la population n\'était pas vide)', x.net >= 5 && x.nNets >= 5, JSON.stringify(x));
  await c.p.evaluate(() => { CP.onglet = 'banque'; rendre(); }); await c.p.waitForTimeout(600); x = await lire(c); v('contre-épreuve : fenêtre ouverte, les lignes du relevé se lisent', x.releve, JSON.stringify(x));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('EXC', e.message.slice(0, 600)); process.exit(1); });
