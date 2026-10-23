/* Sonde du SITE (24 octobre 2026) — pages servies en 127.0.0.1, jour ET nuit imposés par l'appareil (prefers-color-scheme), réseau surveillé.
   Prouve : aucun bouton jour/nuit visible ; le fond change avec l'appareil (sinon la mesure ne regarde rien) ; le lien « Essayer la démonstration › »
   (là où le site le porte) mène à /demo.html qui s'ouvre sur les 23 cartes ; aucun « Bientôt » à côté d'un métier ; aucun « 24h/24 » dans le texte vu. */
const { ouvrir, dormir } = require('./lib.js');
const PAGES = ['index.html', 'metiers.html', 'op-gestion.html', 'tarifs.html', 'logiciel-plombier.html', 'logiciel-anti-nuisibles.html', 'logiciel-nettoyage.html', 'applications.html', 'pourquoi.html'];
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
(async () => {
  const S = await ouvrir({ page: 'index.html' });
  try {
    for (const p of PAGES) {
      console.log('\n══ ' + p + ' ══');
      const fonds = {};
      for (const th of ['light', 'dark']) {
        await S.profil(1280, 800, false, th); await S.goto('/' + p); await dormir(1200);
        const r = await S.ev(`const bg=getComputedStyle(document.body).backgroundColor, hbg=getComputedStyle(document.documentElement).backgroundColor;
          const vis=[...document.querySelectorAll('.mode,.coin-mode,[aria-label*="nuit" i],[aria-label*="mode sombre" i],[title*="mode" i]')].filter(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;}).map(e=>e.outerHTML.slice(0,120));
          const boutonsJN=[...document.querySelectorAll('button,a')].filter(e=>/^(jour|nuit|mode (jour|nuit|sombre|clair))$/i.test((e.textContent||'').trim())&&e.getBoundingClientRect().width>0).length;
          const txt=document.body.innerText;
          return {bg,hbg,vis,boutonsJN,n:document.querySelectorAll('a').length,bientot:(txt.match(/.{0,40}bient[ôo]t.{0,40}/gi)||[]),h24:(txt.match(/.{0,30}24\\s?h\\s?\\/\\s?24.{0,30}/gi)||[]),
            demo:[...document.querySelectorAll('a')].filter(a=>/Essayer la démonstration/.test(a.textContent)).map(a=>a.getAttribute('href')), scheme:matchMedia('(prefers-color-scheme: dark)').matches}`);
        fonds[th] = r;
        vrai(th + ' : aucun bouton jour/nuit visible (population : ' + r.n + ' liens)', r.n > 5 && r.vis.length === 0 && r.boutonsJN === 0, [r.vis, r.boutonsJN]);
        if (th === 'light') {
          vrai('aucun « 24h/24 » dans le texte vu', r.h24.length === 0, r.h24);
          console.log('   « Bientôt » dans le texte : ' + (r.bientot.length ? r.bientot.map(x => '«' + x.replace(/\s+/g, ' ') + '»').join(' ; ') : 'aucun'));
          console.log('   lien démonstration : ' + (r.demo.length ? r.demo.join(',') : 'absent'));
        }
      }
      vrai('le fond SUIT l\'appareil (jour ≠ nuit : ' + fonds.light.hbg + ' / ' + fonds.dark.hbg + ' ; corps ' + fonds.light.bg + ' / ' + fonds.dark.bg + ')', fonds.light.hbg !== fonds.dark.hbg || fonds.light.bg !== fonds.dark.bg);
      vrai('l\'appareil de nuit est bien vu de la page (matchMedia)', fonds.dark.scheme === true && fonds.light.scheme === false);
    }
    /* le lien mène à la démonstration */
    await S.profil(1280, 800, false, 'light'); await S.goto('/metiers.html'); await dormir(800);
    await S.ev('document.querySelector(\'a[href="/demo.html"]\').click(); return 1;');
    const arrive = await S.attendre('location.pathname==="/demo.html" && document.querySelectorAll(".demo-carte").length===23', 20000);
    vrai('le clic sur « Essayer la démonstration › » (metiers.html) ouvre /demo.html et ses 23 cartes', arrive, await S.ev('return location.href'));
    vrai('⛔ aucune requête hors 127.0.0.1 pendant tout le parcours du site (' + S.reseau.length + ' vues)', S.reseau.length > 20 && S.exterieur.length === 0, S.exterieur.slice(0, 5));
    vrai('aucune exception JavaScript sur les pages du site', S.exceptions.length === 0, S.exceptions.slice(0, 5));
  } finally { S.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
