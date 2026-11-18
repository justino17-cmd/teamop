// GARDE des restes de la sécurité, tour 3 (18 novembre 2026) : les champs d'un client portent le plafond que cliNet range
// (contact 120, adresse 160, accès 200, e-mail 120, téléphone 30) — sinon on tape plus que ce qui est gardé, sans prévenir —
// et une coupe ne laisse jamais la moitié d'un émoji (« � »).
//   A. STATIQUE : dans le source de la page, chacun des 21 champs de contact/adresse/accès/e-mail/téléphone des cinq formulaires qui écrivent un client porte son maxlength ;
//   B. VIVANT : la fiche client ouverte au navigateur le porte aussi ; libelleSur / mailNom / mlDeNet coupés à la limite d'un émoji ne laissent aucun signe orphelin, et un texte sans émoji est coupé à la même longueur qu'avant.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Population comptée à chaque contrôle.
const L = require('../lib.js'), fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../../../apercu/prototype-op-gestion.html'), 'utf8');
const ATTENDUS = [ // [motif de l'ouverture de la balise, maxlength attendu]
  ['<input data-ci="contact"', 120], ['<input data-ci="tel"', 30], ['<input data-ci="mail"', 120], ['<input data-ci="adr"', 160], ['<textarea data-ci="acces"', 200],
  ['<input id="dvn-prenom"', 120], ['<input id="dvn-tel"', 30], ['<input id="dvn-mail"', 120], ['<input id="dvn-adr"', 160],
  ['<input data-cnv="contact"', 120], ['<input data-cnv="tel"', 30], ['<input data-cnv="mail"', 120], ['<input data-cnv="adr"', 160],
  ['<input id="cs-contact"', 120], ['<input id="cs-tel"', 30], ['<input id="cs-mail"', 120], ['<input id="cs-adr"', 160],
  ['<input data-dx="nv_prenom"', 120], ['<input data-dx="nv_tel"', 30], ['<input data-dx="nv_mail"', 120], ['<input data-dx="nv_adr"', 160]];
(async () => {
  L.v('A. population : 21 champs recensés', ATTENDUS.length === 21, ATTENDUS.length);
  for (const [m, n] of ATTENDUS) {
    const i = SRC.indexOf(m), fin = i < 0 ? -1 : SRC.indexOf('>', i), balise = i < 0 ? '' : SRC.slice(i, fin + 1);
    L.v('A. ' + m.replace(/^<(input|textarea) /, '') + ' : maxlength="' + n + '" (la balise est trouvée)', i > 0 && balise.includes('maxlength="' + n + '"'), balise.slice(0, 90));
  }
  const c = await L.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  const r = await p.evaluate(() => {
    const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t);
    const e = '😀', t119 = 'a'.repeat(119) + e + ' fin', t118 = 'a'.repeat(118) + e + ' fin';
    const o = cliNet({ nom: t119, contact: t119, adr: 'b'.repeat(159) + e, acces: 'c'.repeat(199) + e });
    const sain = libelleSur('x'.repeat(150), 120);
    return { nom: [o.nom.length, orph(o.nom)], contact: orph(o.contact), adr: [o.adr.length, orph(o.adr)], acces: [o.acces.length, orph(o.acces)],
      mail: [mailNom({ de: { nom: t119, mail: 'x@y.fr' } }).length, orph(mailNom({ de: { nom: t119, mail: 'x@y.fr' } }))], entree: orph(mlDeNet({ nom: t119, mail: 'x@y.fr' }).nom),
      pair: libelleSur(t118, 120).endsWith(e) && libelleSur(t118, 120).length === 120, sain: sain.length };
  });
  console.log('  ·', JSON.stringify(r));
  L.v('B. un émoji coupé en deux à 120 / 160 / 200 ne laisse aucun signe orphelin (nom, contact, adresse, accès, expéditeur, entrée du courrier)', !r.nom[1] && !r.contact && !r.adr[1] && !r.acces[1] && !r.mail[1] && !r.entree, r);
  L.v('B. la coupe a bien eu lieu (population : la coupe tombait sur la paire, longueurs 119 / 159 / 199)', r.nom[0] === 119 && r.adr[0] === 159 && r.acces[0] === 199 && r.mail[0] === 119, r);
  L.v('B. un émoji ENTIER à la limite est gardé (118 + 2 signes = 120)', r.pair, r.pair);
  L.v('B. un texte sans émoji est coupé à la même longueur qu’avant (150 → 120)', r.sain === 120, r.sain);
  const f = await p.evaluate(async () => { const k = Object.keys(CLIENTS)[0]; aller('client-x-' + k); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600));
    return ['contact', 'tel', 'mail', 'adr', 'acces'].map(q => { const e = document.querySelector('[data-ci="' + q + '"]'); return [q, e && e.getAttribute('maxlength')]; }); });
  L.v('B. la fiche client au navigateur : cinq champs, cinq maxlength', f.every(x => x[1]) && f.length === 5, f);
  await L.fermer(c);
  process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(1); });
