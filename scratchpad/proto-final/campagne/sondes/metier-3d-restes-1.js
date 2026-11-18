// Restes du recontrôle metier-3d (tour 1, 18/11) — les trois correctifs qui se jouent à la main :
//  · recontrole-03 : le « Pourquoi ? » d'une demande d'achat ne parle plus d'une batterie à un nettoyeur ou à un dératiseur ;
//  · recontrole-04 : les exemples d'« Ex. condensateur… » (achats) ET « ex. condensateur… » (Nouvelle intervention) suivent le métier — chaque
//    métier lit SON exemple dans les DEUX fenêtres, et la climatisation garde le sien (contre-épreuve : on ne l'a pas effacé) ;
//  · recontrole-01 : la phrase « Le stock du camion de … » suit l'applicateur choisi (le détail est dans recontrole-f) ;
//  · recontrole-02 : « Tous les sites » ne coupe plus son en-tête entre 760 et 930 px de liste, jour et nuit, avec captures.
// Rend « N ✓ · M ✗ ». Usage : node metier-3d-restes-1.js [A|B|C]
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const PART = process.argv[2] || 'ABC';
const JEUX = { clim: ['climatisation'], '3d': ['3d'], nett: ['nettoyage'], plomb: ['plomberie'], chauf: ['chauffage'], elec: ['electricite'], paysage: ['paysagiste'], aucun: [] };
const PHS = () => [...document.querySelectorAll('#calque [placeholder], .fen [placeholder]')].map(e => e.getAttribute('placeholder'));
(async () => {
  if (PART.includes('A')) for (const [nom, packs] of Object.entries(JEUX)) { const c = await O.ouvrir({ profil: 'mac', qui: 'marc', packs }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {}));
    await L.aller(p, 'achats'); const b = p.locator('#contenu button').filter({ hasText: /Nouvelle demande/ }).locator('visible=true').first(); v(nom + ' : « Nouvelle demande d\'achat » existe (population)', await b.count() > 0);
    await L.toucher(c, b); await L.calme(p, 700); const a = await p.evaluate(PHS); await O.nettoyer(p);
    await L.aller(p, 'interventions'); const b2 = p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first(); await L.toucher(c, b2); await L.calme(p, 700); const i = await p.evaluate(PHS); await O.nettoyer(p);
    console.log('  · ' + nom + ' → achats ' + JSON.stringify(a.filter(x => /^ex/i.test(x))) + ' ¦ intervention ' + JSON.stringify(i.filter(x => /condensateur|poste|éponge|siphon|circulateur|pièce/i.test(x))));
    const pourquoi = a.find(x => /la mienne|presque plus/i.test(x)), cherche = i.find(x => /condensateur|poste d|éponge|siphon|circulateur|une pièce/i.test(x));
    v(nom + ' : le « Pourquoi ? » de la demande d\'achat existe (population)', !!pourquoi, JSON.stringify(a));
    v(nom + ' : la recherche d\'article de « Nouvelle intervention » existe (population)', !!cherche, JSON.stringify(i));
    if (nom === 'clim') { v('clim : garde « la mienne ne tient plus la charge »', /la mienne ne tient plus la charge/.test(pourquoi || ''), pourquoi); v('clim : garde « condensateur, siphon, fluide »', /condensateur, siphon, fluide/.test(cherche || ''), cherche); }
    else { v(nom + ' : ni batterie ni charge dans le « Pourquoi ? »', !/la mienne|charge/i.test(pourquoi || ''), pourquoi); v(nom + ' : la recherche d\'article ne parle ni de condensateur ni de fluide', !/condensateur|fluide/i.test(cherche || ''), cherche); }
    if (nom === 'nuis' || nom === '3d') v('3d : la recherche d\'article parle de postes d\'appâtage', /poste d/i.test(cherche || ''), cherche);
    if (nom === 'nett') v('nett : la recherche d\'article parle d\'éponges', /éponge/i.test(cherche || ''), cherche);
    if (nom === 'plomb') v('plomb : la recherche d\'article parle de siphon / flexible', /siphon, flexible/.test(cherche || ''), cherche);
    if (nom === 'chauf') v('chauf : la recherche d\'article parle de circulateur', /circulateur/.test(cherche || ''), cherche);
    v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); }
  if (PART.includes('B')) for (const [profil, nuit] of [['mac', false], ['mac', true], ['ipad', false]]) { const c = await O.ouvrir({ profil, nuit, qui: 'marc', packs: O.METIERS.d3 }), p = c.p; await L.aller(p, 'registre'); await L.calme(p, 600);
    const larg = profil === 'mac' ? [1180, 1100, 1280, 1300] : [820];
    for (const w of larg) { await p.setViewportSize({ width: w, height: 820 }); await L.calme(p, 500);
      const m = await p.evaluate(() => { const tab = document.querySelector('.rg-tab'), th = tab.querySelector('.rg-th'), cw = Math.round(tab.getBoundingClientRect().width), tab6 = getComputedStyle(th).display !== 'none'; const coupes = tab6 ? [...th.children].filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > tab.getBoundingClientRect().right + 1).map(e => e.textContent) : []; return { cw, tab6, coupes, doc: document.documentElement.scrollWidth, fen: innerWidth, lignes: tab.querySelectorAll('.rg-ligne').length }; });
      v(`${profil}${nuit ? ' nuit' : ''} ${w} : trois sites listés (population)`, m.lignes === 3, JSON.stringify(m));
      v(`${profil}${nuit ? ' nuit' : ''} ${w} (liste ${m.cw}, ${m.tab6 ? 'tableau' : 'cartes'}) : aucun en-tête ne sort de sa colonne ni de la carte`, m.coupes.length === 0, JSON.stringify(m));
      v(`${profil}${nuit ? ' nuit' : ''} ${w} : la page ne glisse pas de côté`, m.doc <= m.fen + 1, JSON.stringify(m));
      await p.evaluate(() => document.querySelector('.rg-tab').scrollIntoView({ block: 'center' })); await L.calme(p, 300);
      await L.capture(c, O.CAP + `restes1-sites-${profil}-${w}${nuit ? '-nuit' : ''}.png`); }
    v(`${profil}${nuit ? ' nuit' : ''} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-restes-1', ok, ko, []));
})().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
