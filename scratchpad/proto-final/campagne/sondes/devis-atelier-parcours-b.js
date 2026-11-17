// Parcours 2 et 3 : (2) « Devis rapide » avec un client NEUF — champs vides, e-mail faux, téléphone faux, doublon, noms LONGS, double toucher ;
// (3) « Dicter un devis » — vide, client inconnu, dictée d'exemple, texte tapé. usage : node devis-atelier-parcours-b.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const alerte = p => p.evaluate(() => ((document.querySelector('#calque .alerte') || {}).textContent || '').trim());
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const nCli0 = await p.evaluate(() => Object.keys(CLIENTS).length), nDv0 = await p.evaluate(() => DV.length);
  // ── P2 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  await L.toucher(c, '[data-dv="nouveau"]'); await L.calme(p, 300);
  await L.toucher(c, '[data-dvn="nv|1"]'); await L.calme(p, 300);
  let champs = await p.evaluate(() => [...document.querySelectorAll('#calque input, #calque select, #calque textarea')].map(e => ({ id: e.id, t: e.type, fs: parseFloat(getComputedStyle(e).fontSize), lab: (e.closest('label') || {}).innerText && (e.closest('label') || {}).innerText.replace(/\s+/g, ' ').trim().slice(0, 40) })));
  v('P2 : « Nouveau client » montre nom, prénom, téléphone, e-mail, adresse, objet', ['dvn-nom', 'dvn-prenom', 'dvn-tel', 'dvn-mail', 'dvn-adr', 'dvn-objet'].every(i => champs.some(x => x.id === i)), champs.map(x => x.id));
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); let a = await alerte(p);
  v('P2 : tout vide → « Indique le nom du client. »', /nom du client/.test(a), a);
  await p.fill('#dvn-nom', 'Dupont'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); a = await alerte(p);
  v('P2 : sans téléphone ni e-mail → le message dit pourquoi (pour pouvoir lui envoyer le devis)', /téléphone ou un e-mail/.test(a), a);
  const nom0 = await p.inputValue('#dvn-nom'); v('P2 : le nom saisi est gardé après le message', nom0 === 'Dupont', nom0);
  await p.fill('#dvn-mail', 'dupont@@mail'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); a = await alerte(p);
  v('P2 : e-mail faux → « L’adresse e-mail est à vérifier. »', /e-mail est à vérifier/.test(a), a);
  await p.fill('#dvn-mail', 'dupont@mail.fr'); await p.fill('#dvn-tel', 'abc'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); a = await alerte(p);
  v('P2 : téléphone « abc » → message clair', /téléphone est à vérifier/.test(a), a);
  await p.fill('#dvn-tel', '06 98 76 54 32'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); a = await alerte(p);
  v('P2 : sans objet → « Indique l’objet du devis. »', /objet du devis/.test(a), a);
  // valeurs LONGUES
  const long = 'Établissements Dupont-Lefèbvre-Martinez et Associés Climatisation Industrielle', objL = 'Remplacement complet de la centrale de traitement d’air du bâtiment B, dépose, évacuation, fourniture et pose, mise en service et réglages';
  await p.fill('#dvn-nom', long); await p.fill('#dvn-objet', objL); await p.fill('#dvn-adr', '12 rue du Maréchal de Lattre de Tassigny, résidence Les Hauts de la Rochelle, bâtiment B, 17000 La Rochelle');
  await L.capture(c, O.CAP + `P2-nouveau-client-long-${profil}.png`);
  const dbl = await p.evaluate(() => { const b = document.querySelector('[data-dvn="creer|1"]'); b.click(); b.click(); return DV.length; });   // double toucher
  await L.calme(p, 600);
  const nCli1 = await p.evaluate(() => Object.keys(CLIENTS).length), nDv1 = await p.evaluate(() => DV.length);
  v('P2 : un double toucher sur « Préparer le devis » ne crée qu’UN client et qu’UN brouillon', nCli1 === nCli0 + 1 && nDv1 === nDv0 + 1, { nCli0, nCli1, nDv0, nDv1 });
  const f = await p.evaluate(() => ({ h1: document.querySelector('#contenu h1').textContent, nom: (document.querySelector('#contenu .tete .lien') || {}).textContent, objet: (document.querySelector('#contenu .tete .gris') || {}).textContent }));
  v('P2 : on arrive sur la fiche du brouillon du nouveau client, nom complet et objet complet lus', /Devis en préparation/.test(f.h1) && f.nom.includes('Lefèbvre') && f.objet.includes('réglages'), f);
  await L.capture(c, O.CAP + `P2-fiche-client-long-${profil}.png`);
  const larg = await L.deborde(c); v('P2 : la fiche d’un devis aux noms longs ne déborde pas de côté', larg.bouge === 0, larg);
  // le client créé existe-t-il dans « Clients » ? avec son tel, mail, adresse ?
  const cli = await p.evaluate(() => { const k = Object.keys(CLIENTS).pop(); return { k, ...CLIENTS[k] }; });
  v('P2 : le client créé garde nom, e-mail, téléphone (rangé par paires), adresse', cli.nom === long && cli.mail === 'dupont@mail.fr' && cli.tel === '06 98 76 54 32' && /Tassigny/.test(cli.adr), cli);
  await L.aller(p, 'clients'); const vu = await p.evaluate(n => document.getElementById('contenu').innerText.includes(n), 'Lefèbvre');
  v('P2 : le client créé avec le devis paraît dans la liste des Clients', vu);
  const pos = await p.evaluate(() => { const k = Object.keys(CLIENTS).pop(); return { geo: typeof CR_GEO !== 'undefined' ? !!CR_GEO[k] : null, secteur: typeof SECT_CLI !== 'undefined' ? SECT_CLI[k] : null }; });
  console.log('  · position du nouveau client :', JSON.stringify(pos));
  // doublon : même e-mail
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="nouveau"]'); await L.toucher(c, '[data-dvn="nv|1"]');
  await p.fill('#dvn-nom', 'Autre Nom'); await p.fill('#dvn-mail', 'dupont@mail.fr'); await p.fill('#dvn-objet', 'Essai'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300); a = await alerte(p);
  v('P2 : même e-mail qu’un client existant → on prévient (« existe peut-être déjà ») et on propose de choisir le client existant', /existe peut-être déjà/.test(a) && /Client existant/.test(a), a);
  await L.toucher(c, '[data-dvn="nv|0"]'); await L.calme(p, 300);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#calque [data-dvn^="nv"]')].map(b => b.getAttribute('aria-pressed') + ':' + b.textContent));
  v('P2 : « Client existant » rebascule sans perdre l’objet', (await p.inputValue('#dvn-objet')) === 'Essai', tabs);
  await L.ranger(p);
  // ── P3 : dicter ─────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="dicter"]'); await L.calme(p, 300);
  await L.toucher(c, '[data-dvd="go"]'); await L.calme(p, 300); let t = (await O.lire(p)).toast;
  v('P3 : « Préparer le devis » sans rien dit quoi faire', /Dis ou écris/.test(t), t);
  await p.fill('#dvd-t', 'Il faut changer le moteur'); await L.toucher(c, '[data-dvd="go"]'); await L.calme(p, 300); t = (await O.lire(p)).toast;
  v('P3 : client non reconnu → on dit comment le nommer', /pas reconnu le client/.test(t), t);
  await p.fill('#dvd-t', ''); await L.toucher(c, '[data-dvd="mic"]'); await L.calme(p, 300);
  const ecoute = await p.evaluate(() => ({ txt: document.querySelector('#calque .dv-micro b').textContent, go: document.querySelector('[data-dvd="go"]').disabled, aria: document.querySelector('[data-dvd="mic"]').getAttribute('aria-label') }));
  v('P3 : le micro passe en « J’écoute… » et « Préparer » est inactif', /écoute/.test(ecoute.txt) && ecoute.go, ecoute);
  await p.waitForTimeout(1800); const apres = await p.evaluate(() => ({ t: document.getElementById('dvd-t').value, go: document.querySelector('[data-dvd="go"]').disabled }));
  v('P3 : la dictée finie remplit le texte (exemple) et rend « Préparer »', /Mme Roux/.test(apres.t) && !apres.go, apres);
  const nDv2 = await p.evaluate(() => DV.length); await L.toucher(c, '[data-dvd="go"]'); await L.calme(p, 600);
  const g = await p.evaluate(() => { const x = DEVIS_REG[location.hash.replace('#devis-x-', '')]; return x ? { cli: x.cli, objet: x.objet, lignes: x.lignes, source: x.source, n: DV.length } : null; });
  v('P3 : la dictée de l’exemple prépare un brouillon pour Mme Roux (1 de plus)', g && g.cli === 'mr' && g.n === nDv2 + 1, g);
  v('P3 : les lignes comprises = pompe de relevage + 1 h de main-d’œuvre + déplacement (3 lignes)', g && g.lignes.length === 3 && g.lignes.some(l => /Pompe de relevage/i.test(l[0])) && g.lignes.some(l => /Main-d’œuvre \(1 h\)/.test(l[0])) && g.lignes.some(l => /Déplacement/.test(l[0])), g && g.lignes);
  v('P3 : la fiche dit « à vérifier » pour la dictée (D’où il vient)', await p.evaluate(() => /à vérifier/.test(document.getElementById('contenu').innerText)));
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
