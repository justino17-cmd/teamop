// Angle « courrier » · sonde 5 : le MÊME contenu hostile, LU SUR TOUS LES APPAREILS (Mac, Windows, iPad, iPhone, Android, petit écran 320 px), de jour ET de nuit.
// Une adresse de 20 000 signes, un nom de 600 signes, un objet de 5 000, un mot de 3 000 sans espace ne doivent ni faire déborder la page (contre la largeur POSÉE du profil,
// jamais innerWidth qui grandit avec la page), ni sortir de leur zone de lecture. On compte d'abord les courriels ouverts. Les captures se REGARDENT (cap/courrier/tel-*.png).
// ⛔ 127.0.0.1, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/courrier/';
const PROFILS = (process.env.PROFILS || 'iphone,android,petit,ipad,windows').split(',');
const LONG = 'https://exemple.fr/' + 'a'.repeat(20000), MOT = 'M'.repeat(3000);
const MAILS = [
  { id: 'tl1', nom: 'Marie ' + 'Dupont-'.repeat(90), mail: 'marie@exemple.fr', objet: 'Facture ' + 'urgente '.repeat(2) + 'X'.repeat(300), txt: 'Bonjour,\n' + LONG + '\n' + MOT + '\nhttps://аррӏе.com/connexion\nhttps://user:mdp@evil.example/x' },
  { id: 'tl2', nom: 'Pièces', mail: 'pj@exemple.fr', objet: 'Pièces', txt: 'Voir.', pj: [['a'.repeat(300) + '.pdf', '1 Ko'], ['‮fdp.exe', '2 Ko'], ['../../x.pdf', '3 Ko']] },
  { id: 'tl3', nom: 'O'.repeat(600), mail: 'long@' + 'd'.repeat(120) + '.fr', objet: 'O'.repeat(5000), txt: 'T'.repeat(50000) }
];
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  for (const profil of PROFILS) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p, W = c.largeur, SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot", etiq = profil + (nuit ? '-nuit' : '-jour');
    await p.evaluate(M => M.forEach(x => MAILS.push(mlM(x.id, AUJ, '10:5' + M.indexOf(x), { nom: x.nom, mail: x.mail }, x.objet, x.txt, x.pj ? { pj: x.pj } : {}))), MAILS);
    await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 25000); await p.waitForTimeout(700);
    await p.evaluate(() => COURRIER.inst.rafraichir()); await p.waitForTimeout(800);
    for (const m of MAILS) {
      const ok = await p.evaluate(i => COURRIER.inst.ouvrir(i), m.id); await p.waitForTimeout(800);
      const R = await p.evaluate(`(() => { const sr = ${SR}, rb = sr.querySelector('.rbody'), rd = sr.querySelector('#reading, .reading') || sr.querySelector('.rpad'), pas = []; 
        const debordants = []; [...sr.querySelectorAll('.rbody, .rhead, .rsubj, .attbar, .att, .rline, .hband, .rmeta')].forEach(e => { if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible') debordants.push(e.className.toString().slice(0, 20) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
        return { corps: rb ? rb.textContent.length : -1, page: document.documentElement.scrollWidth, debordants: debordants.slice(0, 5) }; })()`);
      L.v(etiq + ' : le courriel ' + m.id + ' s\'ouvre (population : corps ' + R.corps + ' signes)', ok === true && R.corps > 0, R);
      L.v(etiq + ' · ' + m.id + ' : la page ne déborde pas de la largeur du profil (' + R.page + ' px pour ' + W + ')', R.page <= W + 1, R);
      L.v(etiq + ' · ' + m.id + ' : aucun bloc de lecture ne dépasse sa zone', R.debordants.length === 0, R.debordants);
      if (m.id === 'tl1' || m.id === 'tl2') await p.screenshot({ path: CAP + 'tel-' + etiq + '-' + m.id + '.png' }).catch(() => {});
    }
    const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v(etiq + ' : aucune erreur de page', nErr.length === 0, nErr.slice(0, 2));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
