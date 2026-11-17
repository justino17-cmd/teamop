// Espace client : COMPRÉHENSION (mots, tutoiement, vocabulaire du bureau, reste d'échafaudage) et DOCUMENTS (les PDF que le client ouvre :
// montants recalculés au centime). node client-mots-documents.js [profil] [app]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', app = process.argv.includes('app');
const TUTOIEMENT = /(?<!\p{L})(tu|ton|ta|tes|toi|te)(?!\p{L})|(?<!\p{L})(Signe|Coche|Indique|Touche|Choisis|Dis|Recharge)(?!\p{L})/u;   // \b ne connaît pas les lettres accentuées : « êtes » contenait « tes »
const BUREAU = /sans réponse|côté bureau|à planifier|relancé|brouillon|avalider|aplanifier|le bureau|à envoyer|à chiffrer/i;
const ECHAFAUDAGE = /prototype|pour l’essai|d’essai|dans la vraie version|rien n’est enregistré|tester en tant que|simul/i;
const ANGLAIS = /\b(login|e-?mail ok|checkout|cancel|submit|dashboard|reply|deadline|call)\b/i;
(async () => {
  const c = app ? await O.clientApp({ profil, cli: 'md' }) : await O.client({ profil, cli: 'md' }); const p = c.p;
  const zone = () => p.evaluate(() => { const z = document.querySelector('#docplein') || document.querySelector('#calque .panneau') || document.querySelector('.ec') || document.querySelector('#contenu'); return z ? z.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const juge = (nom, t) => { const m = (re) => (t.match(re) || [])[0];
    v(`${nom} : pas de tutoiement`, !TUTOIEMENT.test(t), m(TUTOIEMENT) && ('« ' + t.slice(Math.max(0, t.search(TUTOIEMENT) - 30), t.search(TUTOIEMENT) + 60) + ' »'));
    v(`${nom} : client-07 · pas de vocabulaire du bureau`, !BUREAU.test(t), m(BUREAU) && ('« ' + t.slice(Math.max(0, t.search(BUREAU) - 30), t.search(BUREAU) + 60) + ' »'));
    if (app) v(`${nom} : aucun reste d’échafaudage (mode application)`, !ECHAFAUDAGE.test(t) && !/^TESTER/.test(t), m(ECHAFAUDAGE) && ('« ' + t.slice(Math.max(0, t.search(ECHAFAUDAGE) - 30), t.search(ECHAFAUDAGE) + 80) + ' »'));
    v(`${nom} : pas de mot anglais`, !ANGLAIS.test(t), m(ANGLAIS)); };
  const clis = await p.evaluate(() => Object.keys(CLIENTS));
  let ecrans = 0;
  for (const cli of clis) for (const tab of ['accueil', 'factures', 'interventions', 'devis', 'contrats']) {
    await p.evaluate(({ cli, tab }) => { RL_CLI.cli = cli; EC.tab = tab; rendre(); }, { cli, tab }); await L.calme(p, 200); ecrans++;
    const t = await p.evaluate(() => { const z = document.querySelector('.ec'); return z ? z.innerText.replace(/\s+/g, ' ').trim() : ''; }); v(`${cli}/${tab} : l’écran n’est pas vide`, t.length > 80, t.length); juge(`${cli}/${tab}`, t); }
  v(`population : ${ecrans} écrans lus`, ecrans === clis.length * 5, ecrans);
  // les fenêtres et documents que le client ouvre
  for (const cli of ['md', 'hp', 'cm', 'vp']) {
    await p.evaluate(x => { RL_CLI.cli = x; EC.tab = 'factures'; rendre(); }, cli); await L.calme(p, 250);
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-ec^="fpdf|"]')].map(b => b.dataset.ec.split('|')[1]));
    for (const id of ids) { await p.evaluate(x => document.querySelector(`[data-ec="fpdf|${x}"]`).click(), id); await L.calme(p, 350);
      const t = await zone(); juge(`${cli} · facture ${id} (document)`, t);
      const verif = await p.evaluate(x => { const f = FACTURES.find(o => o.id === x), tt = ttcDe(f); const eurs = [...document.querySelectorAll('#docplein *')].filter(e => !e.children.length).map(e => e.textContent.trim()).filter(s => /€/.test(s));
        const lignes = lignesDe(f), ht = lignes.reduce((s, l) => s + Math.round(parseFloat(l.q || 1) * 100) * Math.round((l.pu || 0) * 100) / 100, 0);
        return { num: f.num, ttc: eur(tt), trouve: eurs.some(s => s.replace(/\s/g, '') === eur(tt).replace(/\s/g, '')), nEur: eurs.length, st: f.st, reste: eur(restant(f)) }; }, id);
      v(`${cli} · facture ${verif.num} : le total TTC ${verif.ttc} est dans le document`, verif.trouve, JSON.stringify(verif));
      v(`${cli} · facture ${verif.num} : le numéro est écrit dans le document`, t.includes(verif.num) || verif.num === '—', t.slice(0, 120));
      await p.keyboard.press('Escape'); await L.calme(p, 200); }
    await p.evaluate(x => { RL_CLI.cli = x; EC.tab = 'devis'; rendre(); }, cli); await L.calme(p, 250);
    const nums = await p.evaluate(() => [...document.querySelectorAll('[data-ec^="signer|"], [data-dv^="pdf|"]')].map(b => (b.dataset.ec || b.dataset.dv).split('|')[1]));
    for (const num of nums) { await p.evaluate(x => { const d = DV.find(o => o.num === x); dvClient(d); }, num); await L.calme(p, 300); const t = await zone(); juge(`${cli} · devis ${num} (fenêtre)`, t);
      const dv = await p.evaluate(x => { const d = DV.find(o => o.num === x), ht = d.lignes.reduce((s, l) => s + l[1] * l[2], 0); return { ttc: eur(dvTTC(d)), htTva: eur(Math.round(ht * (1 + d.tva / 100) * 100) / 100), n: d.lignes.length }; }, num);
      v(`${cli} · devis ${num} : le total TTC ${dv.ttc} est affiché dans la fenêtre`, t.replace(/\s/g, '').includes(dv.ttc.replace(/\s/g, '')), JSON.stringify(dv));
      v(`${cli} · devis ${num} : TTC = somme des lignes × (1 + TVA) au centime`, dv.ttc === dv.htTva, JSON.stringify(dv));
      await O.nettoyer(p); }
  }
  // les liens « Appeler » : un numéro composable
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'accueil'; rendre(); }); await L.calme(p, 250);
  const tel = await p.evaluate(() => [...document.querySelectorAll('.ec a[href^="tel:"]')].map(a => a.getAttribute('href')));
  v('le lien « Appeler » compose un numéro valide', tel.length >= 1 && tel.every(h => /^tel:\+?[0-9]{9,14}$/.test(h)), JSON.stringify(tel));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
