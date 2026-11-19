// « Mon entreprise › Ton logo » : une image PNG, JPEG ou SVG de 1 Mo au plus, lue dans le navigateur (jamais envoyée nulle part : aucune requête réseau),
// l'aperçu avant d'enregistrer, « Retirer le logo », les refus au MESSAGE EXACT sous le bouton (trop lourde, fichier non accepté, SVG qui porte un script ou
// un gestionnaire on…=), et le SVG de démonstration sans script. Le fichier choisi est la SEULE chose lue : on compte les requêtes sortantes.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (fichiers essayés) avant de conclure.
const { L, v, ouvrirEnt, fiche, fin } = require('./entreprise-commun.js');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SVG_OK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#0b6"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="#fff">CS</text></svg>';
async function choisir(c, f) { await c.p.setInputFiles('#en-logo', f); await L.calme(c.p, 500); return c.p.evaluate(() => { const e = document.getElementById('en-logo-err'); return { err:e && !e.hidden ? e.textContent.replace(/[  ]/g, ' ') : '', img:(document.querySelector('#en-ap img.logo-ent') || {}).src ? document.querySelector('#en-ap img.logo-ent').src.slice(0, 26) : '' }; }); }
(async () => {
  const c = await ouvrirEnt({ profil:'mac' }); const dehors = []; c.p.on('request', r => { if (!/^http:\/\/127\.0\.0\.1:/.test(r.url()) && !/^data:/.test(r.url()) && !/fonts\./.test(r.url())) dehors.push(r.url().slice(0, 60)); });
  await L.toucher(c, '[data-ent="carte|logo"]'); let n = 0;
  let r = await choisir(c, { name:'gros.png', mimeType:'image/png', buffer:Buffer.alloc(1024 * 1024 + 10, 1) }); n++;
  v('une image de plus de 1 Mo : « Cette image pèse plus de 1 Mo : choisis-en une plus légère. »', r.err === 'Cette image pèse plus de 1 Mo : choisis-en une plus légère.' && r.img === '', r);
  r = await choisir(c, { name:'note.txt', mimeType:'text/plain', buffer:Buffer.from('bonjour') }); n++;
  v('un fichier qui n’est pas une image : « Ce fichier n’est pas accepté. »', r.err === 'Ce fichier n’est pas accepté.', r);
  for (const [nom, svg] of [['script', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], ['onload', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="9" height="9"/></svg>'], ['javascript:', '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="9" height="9"/></a></svg>']]) {
    r = await choisir(c, { name:'x.svg', mimeType:'image/svg+xml', buffer:Buffer.from(svg) }); n++;
    v(`un SVG avec ${nom} : refusé (« Ce fichier n’est pas accepté. »), aucune image en aperçu`, r.err === 'Ce fichier n’est pas accepté.' && r.img === '', r); }
  r = await choisir(c, { name:'logo.svg', mimeType:'image/svg+xml', buffer:Buffer.from(SVG_OK) }); n++;
  v('un SVG sans script : accepté, l’aperçu le montre avant d’enregistrer', r.err === '' && /^data:image\/svg\+xml/.test(r.img), r);
  r = await choisir(c, { name:'logo.png', mimeType:'image/png', buffer:PNG }); n++;
  v('un PNG de quelques octets : accepté, l’aperçu le montre', r.err === '' && /^data:image\/png;base64/.test(r.img), r);
  const avant = await fiche(c.p); v('rien n’est écrit tant qu’on n’a pas enregistré', !avant.E.logo, !!avant.E.logo);
  await L.toucher(c, '[data-ent="logook"]');
  let ap = await fiche(c.p); v('« Enregistrer » écrit l’image dans ENTREPRISE.logo (une adresse data:)', /^data:image\/png;base64,/.test(ap.E.logo || ''), (ap.E.logo || '').slice(0, 30));
  const carte = await c.p.evaluate(() => (document.querySelector('[data-ent="carte|logo"] .ent-ligne') || {}).textContent); v('la carte dit « Choisi » et montre l’image', carte === 'Choisi' && await c.p.evaluate(() => !!document.querySelector('[data-ent="carte|logo"] img.logo-ent')), carte);
  await L.toucher(c, '[data-ent="carte|logo"]'); v('le panneau rouvert propose « Retirer le logo »', await c.p.evaluate(() => !!document.querySelector('[data-ent="logoretirer"]')));
  await L.toucher(c, '[data-ent="logoretirer"]'); await L.toucher(c, '[data-ent="logook"]'); ap = await fiche(c.p);
  v('« Retirer le logo » : le logo est vide, la carte dit « Les initiales CS sont utilisées »', !ap.E.logo && (await c.p.evaluate(() => (document.querySelector('[data-ent="carte|logo"] .ent-ligne') || {}).textContent)) === 'Les initiales CS sont utilisées', ap.E.logo);
  v('population : fichiers essayés', n === 7, n);
  v('aucune requête sortante (le logo n’est envoyé nulle part)', dehors.length === 0, dehors);
  // une annulation ne change rien
  await L.toucher(c, '[data-ent="carte|logo"]'); await choisir(c, { name:'logo.png', mimeType:'image/png', buffer:PNG }); await c.p.locator('#calque [data-ferme="1"].btn').first().click(); await L.calme(c.p, 200);
  ap = await fiche(c.p); v('« Annuler » après un choix : rien n’est écrit', !ap.E.logo, !!ap.E.logo);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await fin();
})();
