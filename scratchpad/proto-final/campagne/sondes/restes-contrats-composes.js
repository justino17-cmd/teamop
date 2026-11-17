// RESTES DES CONTRATS (17 novembre 2026), décision (i) : un contrat COMPOSÉ dans la page de composition dit son prix HT ET TTC (« 1 280,50 € HT par an, soit
// 1 408,55 € TTC (TVA à 10 %) » pour un particulier, TVA à 20 % pour un professionnel), et la liste de Contrats le dit aussi.
// Joue les gestes de la personne : Contrats › Composer un contrat › client › prix 1280,50 › modèle › Créer. usage : node restes-contrats-composes.js [profil] [nuit]
const A = require('../../sondes/atelier-outils.js'), L = A.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p;
  const cli = await p.evaluate(() => ({ part: Object.entries(CLIENTS).find(([k, x]) => x.type === 'part' && k !== '__nv')[0], pro: Object.entries(CLIENTS).find(([k, x]) => x.type === 'pro' && k !== '__nv')[0] }));
  for (const [nom, id, taux, ttc] of [['particulier', cli.part, 10, '1 408,55'], ['professionnel', cli.pro, 20, '1 536,60']]) {
    const f = await A.ouvrirAtelier(c, 'contrat', 'contrats');
    v(`${nom} : la page de composition s’ouvre`, !!f, '');
    if (!f) continue;
    await A.composerContrat(c, f, { client: id, titre: 'Entretien ' + nom, prix: '1280,50' });
    const d = await f.evaluate(() => ({ prix: D().vars.prix, txt: document.body.innerText.replace(/\s+/g, ' ') }));
    v(`${nom} : le prix saisi est rangé au centime (128050)`, d.prix === 128050, d.prix);
    const m = new RegExp('1 280,50 € HT par an, soit ' + ttc.replace(',', ',') + ' € TTC \\(TVA à ' + taux + ' %\\)').test(d.txt.replace(/[  ]/g, ' '));
    v(`${nom} : le contrat dit « 1 280,50 € HT par an, soit ${ttc} € TTC (TVA à ${taux} %) »`, m, (d.txt.match(/Le prix de.{0,160}/) || [''])[0]);
    v(`${nom} : plus de « la TVA s’ajoute » dans le texte`, !/la TVA s’ajoute|TVA en plus/.test(d.txt), '');
    await L.capture(c, (A.CAP.replace('/atelier/', '/restes-contrats/')) + `compose-${nom}-${tag}.png`);
    await f.locator('[data-act="retour"]:visible').first().click(); await p.waitForTimeout(900);
    const lignes = await p.evaluate(() => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    const l0 = lignes.find(x => new RegExp('Entretien ' + nom).test(x)) || '';
    v(`${nom} : la liste de Contrats dit HT et TTC`, /1 280,50 €/.test(l0.replace(/[  ]/g, ' ')) && new RegExp(ttc + ' € TTC').test(l0.replace(/[  ]/g, ' ')), l0);
    const fer = await p.evaluate(() => { const z = document.getElementById('opdz'); return z && !z.hidden; });
    if (fer) { await p.evaluate(() => opdFermer('fin')); await L.calme(p, 300); }
  }
  await L.capture(c, (A.CAP.replace('/atelier/', '/restes-contrats/')) + `liste-composes-${tag}.png`);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
