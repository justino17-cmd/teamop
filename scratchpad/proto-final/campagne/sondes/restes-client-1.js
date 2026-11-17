// Espace client, restes tour 1 (17 novembre 2026) : ce que le recontrôle laissait ouvert et les décisions du chef de 12 h 10.
// node restes-client-1.js <profil> [nuit]   → « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Mode application (ce que voit un vrai client).
//   A · une SEULE navigation par appareil, mêmes mots, même ordre, comptes sur la barre (client-14)
//   B · l'entreprise une fois : logo ou initiales + nom, jamais le carré « OP » (client-15)
//   C · les trois écrans du métier 3D tapés dans l'adresse : phrase vouvoyée, pas un mot du métier (client-04)
//   D · « Demander un contrat » : trace visible côté client, pas de seconde tâche (client-06)
//   E · un mot très long reste dans sa carte ; « CTR-2026-011 » ne se coupe pas
//   F · « Bonjour » salue une personne, jamais un organisme ; paiement et devis (client-11, client-19)
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
const clic = (p, s) => p.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
(async () => {
  const c = await O.clientApp({ profil, nuit, cli: 'md', ec: 'accueil' }); const p = c.p, tel = c.largeur <= 760;
  const cap = async n => L.capture(c, O.CAP + `restes1-${tag}-${n}.png`);
  const vue = async (cli, ec) => { await p.evaluate(({ cli, ec }) => { RL_CLI.cli = cli; EC.tab = ec; rendre(); window.scrollTo(0, 0); }, { cli, ec }); await L.calme(p, 300); };
  const visible = sel => p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.offsetParent !== null && e.getBoundingClientRect().height > 0), sel);
  // ── A · une seule navigation, mêmes mots, même ordre
  await vue('md', 'accueil');
  const nav = await p.evaluate(() => { const t = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).map(b => b.textContent.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim().split(' ')[0]).filter(Boolean);
    return { onglets: t('.ec-seg button'), barre: t('.opg-tab'), menu: t('#menu .rl-mlien'), tete: !!document.querySelector('.ec-tete') && document.querySelector('.ec-tete').offsetParent !== null }; });
  const ATT = ['Accueil', 'Factures', 'Interventions', 'Devis', 'Contrat'];
  v('A · population : la navigation de l’appareil existe', (tel ? nav.barre : nav.onglets).length === 5, JSON.stringify(nav));
  if (tel) { v('A · téléphone : la barre du bas porte les cinq destinations dans l’ordre', nav.barre.join() === ATT.join(), nav.barre);
    v('A · téléphone : plus d’onglets répétés dans la page', nav.onglets.length === 0, nav.onglets); }
  else { v('A · ordinateur : les onglets de la page portent les cinq destinations dans l’ordre', nav.onglets.join() === ATT.join(), nav.onglets);
    v('A · ordinateur : le menu de gauche ne répète pas les cinq entrées', nav.menu.length === 0, nav.menu); }
  v('A · une seule navigation à la fois (jamais deux ensembles de cinq destinations)', [nav.onglets, nav.barre, nav.menu].filter(a => a.length >= 3).length === 1, JSON.stringify(nav));
  const cpt = await p.evaluate(() => ({ bar: [...document.querySelectorAll('.opg-tab')].map(b => b.getAttribute('aria-label')), onglets: [...document.querySelectorAll('.ec-seg button')].map(b => b.textContent.trim()) }));
  v('A · les comptes d’avant (à régler, à signer) restent lisibles là où la navigation est', tel ? cpt.bar.some(x => /Factures, 2 à régler/.test(x)) && cpt.bar.some(x => /Devis, 1 à signer/.test(x)) : cpt.onglets.includes('Factures · 2') && cpt.onglets.includes('Devis · 1'), JSON.stringify(cpt));
  if (tel) { await clic(p, '[data-menu="ouvrir"]'); await L.calme(p, 300); const f = await O.dessus(p); v('A · la feuille « Menu » ne garde que l’apparence et le compte', !/Factures|Interventions|Devis|Contrat/.test(f.panneau) && /Apparence/i.test(f.panneau) && /Client/.test(f.panneau) && !/Gérant|Patron/.test(f.panneau), f.panneau.slice(0, 140)); await O.nettoyer(p); }
  const carte = await p.evaluate(() => { const m = document.querySelector('.rl-moi'); return m ? m.innerText.replace(/\s+/g, ' ') : ''; });
  if (!tel) v('A · la carte du menu de gauche dit « Client », pas « Gérant »', /Client/.test(carte) && !/Gérant|Patron/.test(carte), carte);
  // ── B · l'entreprise une fois
  const ent = await p.evaluate(() => { const vis = e => e.offsetParent !== null;
    const noms = [...document.querySelectorAll('body *')].filter(e => vis(e) && !e.children.length && /^Clim Services 17$/.test(e.textContent.trim())).length;
    const op = [...document.querySelectorAll('i')].some(e => vis(e) && e.textContent.trim() === 'OP');
    const marque = [...document.querySelectorAll('.rl-ent')].filter(vis).map(e => e.textContent.trim());
    return { noms, op, marque, surtitre: [...document.querySelectorAll('.ec-sur')].some(vis) }; });
  v('B · le nom de l’entreprise est écrit UNE fois en haut', ent.noms === 1, JSON.stringify(ent));
  v('B · plus de carré « OP » du logiciel', !ent.op, JSON.stringify(ent));
  v('B · le logo (initiales) de l’entreprise est là, une fois', ent.marque.length === 1 && ent.marque[0] === 'CS', JSON.stringify(ent));
  v('B · « Votre espace client » reste dit (surtitre ou menu)', ent.surtitre, JSON.stringify(ent));
  await cap('accueil');
  // ── C · les écrans du métier 3D
  for (const forcer3d of [false, true]) {
    for (const h of ['registre', 'carteBox', 'devisXylo']) {
      const r = await p.evaluate(async ({ h, forcer3d }) => { window.__t = []; const T = window.toast; window.toast = function (m) { window.__t.push(String(m)); return T.apply(this, arguments); };
        const av = PACKS_ENT.slice(); if (forcer3d && !PACKS_ENT.includes('3d')) PACKS_ENT.push('3d'); if (!forcer3d) { const k = PACKS_ENT.indexOf('3d'); if (k >= 0) PACKS_ENT.splice(k, 1); }
        location.hash = '#' + h; await new Promise(r => setTimeout(r, 500)); const o = { t: window.__t.slice(), route, role: ROLE }; window.toast = T; PACKS_ENT.splice(0, PACKS_ENT.length, ...av); return o; }, { h, forcer3d });
      v(`C · #${h}${forcer3d ? ' (3D allumé)' : ''} : le client lit la phrase vouvoyée et reste chez lui`, r.route === 'espaceclient' && r.t.length >= 1 && r.t.every(m => m === 'Cette page n’est pas dans votre espace.'), JSON.stringify(r)); } }
  // ── F · les salutations
  const salut = {}; for (const k of ['vp', 'hp', 'md', 'mi', 'cm', 'cp', 'mr']) { await vue(k, 'accueil'); salut[k] = await p.evaluate(() => document.querySelector('.ec h1').textContent.trim()); }
  const ATTS = { vp:'Bonjour Marc Durand', hp:'Bonjour Mme Bernard', md:'Bonjour M. Durand', mi:'Bonjour', cm:'Bonjour Dr Martin', cp:'Bonjour M. Pineau', mr:'Bonjour Mme Roux' };
  v('F · population : sept clients saluent', Object.keys(salut).length === 7, Object.keys(salut).length);
  for (const k in ATTS) v(`F · ${k} : « ${ATTS[k]} »`, salut[k] === ATTS[k], salut[k]);
  const sal = await p.evaluate(() => ({ synd: saluer('Syndic Foncia'), vide: saluer(''), role: saluer('Marc Durand, gérant'), compta: saluer('Comptabilité'), perso: saluer('Jean Dupont'), accent: saluer('Comptabilité, Mme X') }));
  v('F · saluer : un service ou un organisme ne se salue pas par son nom, une personne oui', sal.synd === 'Bonjour' && sal.vide === 'Bonjour' && sal.role === 'Bonjour Marc Durand' && sal.compta === 'Bonjour' && sal.perso === 'Bonjour Jean Dupont' && sal.accent === 'Bonjour', JSON.stringify(sal));
  const brouillons = await p.evaluate(() => { const o = []; for (const k in CLIENTS) { const x = CLIENTS[k]; if (/^Bonjour/.test(saluer(x.contact))) o.push(saluer(x.contact)); } return o.join(' | '); });
  v('F · aucun courriel du bureau ne commence par « Bonjour Syndic »', !/Syndic/.test(brouillons), brouillons);
  // ── F · paiement (client-11)
  await vue('md', 'factures'); await L.toucher(c, '[data-ec^="payer|"]'); let d = await O.dessus(p);
  v('F · la fenêtre de paiement dit « Démonstration : aucun paiement réel. » et vouvoie', /Démonstration : aucun paiement réel\. Dans l’application, le paiement se fait sur la page sécurisée de la banque\./.test(d.panneau) && !/Carte d’essai/.test(d.panneau), d.panneau.slice(0, 300)); await O.nettoyer(p);
  // ── F · devis (client-19)
  await vue('vp', 'devis'); const dv = await p.evaluate(() => [...document.querySelectorAll('.ec-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  v('F · population : le Vieux Port a des devis', dv.length >= 2, dv.length);
  v('F · un seul devis parle du ventilateur (plus deux presque pareils)', dv.filter(t => /ventilateur/i.test(t)).length === 1, dv.map(t => t.slice(0, 70)));
  await cap('devis-vieux-port');
  // ── D · la demande de contrat
  await vue('md', 'contrats'); const avant = await p.evaluate(() => TACHES.filter(x => /^Proposer un contrat/.test(x.t)).length);
  v('D · avant : le bouton « Demander un contrat » est là', await visible('[data-ecctr]'), '');
  await clic(p, '[data-ecctr]'); await L.calme(p, 300); await clic(p, '.panneau [data-ec="demandeok|contrat"]'); await L.calme(p, 400);
  const apres = await p.evaluate(() => ({ n: TACHES.filter(x => /^Proposer un contrat/.test(x.t)).length, texte: document.getElementById('contenu').innerText.replace(/\s+/g, ' '), bouton: !!document.querySelector('[data-ecctr]') }));
  v('D · la demande crée UNE tâche pour le bureau', apres.n === avant + 1, { avant, apres: apres.n });
  v('D · l’onglet Contrat dit « Demande envoyée le … » et ne propose plus le bouton', /Votre demande est envoyée/i.test(apres.texte) && /Demande envoyée le [a-zé]+ \d+/.test(apres.texte) && !apres.bouton, apres.texte.slice(0, 200));
  await cap('contrat-demande');
  await p.evaluate(() => ecDemande(true)); await L.calme(p, 300); d = await O.dessus(p);
  const dbl = await p.evaluate(() => TACHES.filter(x => /^Proposer un contrat/.test(x.t)).length);
  v('D · redemander ne rouvre rien et ne crée pas de seconde tâche', dbl === avant + 1 && !d.panneau && /déjà envoyée/.test(d.toast), { dbl, toast: d.toast, panneau: d.panneau.slice(0, 40) });
  await vue('md', 'accueil'); await vue('md', 'contrats');
  v('D · la trace survit à un changement d’écran', /Votre demande est envoyée/i.test(await p.evaluate(() => document.getElementById('contenu').innerText)), '');
  // ── E · un mot très long, un numéro de contrat
  await vue('mi', 'accueil'); await clic(p, '[data-ec="demande"]'); await L.calme(p, 300);
  const long = 'https://exemple.fr/' + 'a'.repeat(70) + 'Fin';
  await p.fill('#ed-m', long); await clic(p, '.panneau [data-ec="demandeok"]'); await L.calme(p, 400); await vue('mi', 'interventions');
  const lg = await p.evaluate(() => { const W = document.documentElement.clientWidth, e = [...document.querySelectorAll('.ec-l')].find(x => /aaaaaaaa/.test(x.innerText)); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), t = [...e.querySelectorAll('span')].filter(x => /aaaaaaaa/.test(x.textContent)).pop().getBoundingClientRect(); return { W, droite: Math.round(r.right), texte: Math.round(t.right), scrollW: document.documentElement.scrollWidth }; });
  v('E · population : la carte de la demande longue existe', !!lg, lg);
  v('E · le mot long reste dans sa carte et dans l’écran', !!lg && lg.texte <= lg.droite + 1 && lg.droite <= lg.W + 1 && lg.scrollW <= lg.W + 1, lg);
  await cap('mot-long');
  await vue('cm', 'contrats'); const num = await p.evaluate(() => { const e = [...document.querySelectorAll('.ec-num')].find(x => /^CTR-/.test(x.textContent)); if (!e) return null; e.scrollIntoView({ block: 'center' }); return { lignes: e.getClientRects().length, texte: e.textContent }; });
  v('E · population : un numéro de contrat est affiché', !!num, num);
  v('E · « CTR-2026-011 » tient sur une ligne', !!num && num.lignes === 1, num);
  await cap('contrat-signe');
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
