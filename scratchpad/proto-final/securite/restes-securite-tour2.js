// RESTES DE LA SÉCURITÉ, TOUR 2 (18 novembre 2026) — ce que le recontrôle du tour 1 laissait ouvert, rejoué sur les VRAIES fonctions de la page :
//   · un nom de client ou d'expéditeur de plus de 80 signes sortait COUPÉ SANS PRÉVENIR (« …Réunis de Charente-Mari ») : le plafond est 120, et les six champs
//     qui créent ou modifient un client portent le même maxlength (on ne peut pas taper plus, donc rien n'est coupé en silence) ;
//   · le filet des bulles (toastSur) laissait passer un attribut style : il ne garde plus que « color:var(--…) » (la seule bulle qui en écrit un : le chevauchement du planning).
// Population comptée à chaque contrôle. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', init: O.INIT, guide: false, attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const ev = (f, a) => p.evaluate(f, a);
  const nom110 = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic';
  const r1 = await ev(N => { const mk = n => cliNet({ nom: n, contact: n, mail: 'a@b.fr' }); const long = N + ' ' + N;
    const mn = nom => mailNom({ de: { nom, mail: 'x@y.fr' } }), dn = nom => mlDeNet({ nom, mail: 'x@y.fr' }).nom;
    return { nomMax: typeof NOM_MAX !== 'undefined' ? NOM_MAX : null, n: N.length, court: mk('Martin & Fils').nom, garde: mk(N).nom.length, gardeContact: mk(N).contact.length, coupe: mk(long).nom.length, mailGarde: mn(N).length, mailCoupe: mn(long).length, entree: dn(N).length, entreeCoupe: dn(long).length }; }, nom110);
  L.v('population : un nom de ' + r1.n + ' signes (plus de 80, moins de 120) est essayé', r1.n > 80 && r1.n < 120, r1.n);
  L.v('un nom de ' + r1.n + ' signes se range ENTIER (fiche client, contact, expéditeur d\'un e-mail, entrée du courrier) : plus coupé à 80', r1.garde === r1.n && r1.gardeContact === r1.n && r1.mailGarde === r1.n && r1.entree === r1.n, r1);
  L.v('le plafond existe encore (120) : un nom de 240 signes est borné, pas rangé tel quel', r1.nomMax === 120 && r1.coupe === 120 && r1.mailCoupe === 120 && r1.entreeCoupe === 120, r1);
  L.v('un nom ordinaire (« Martin & Fils ») reste tel quel', r1.court === 'Martin & Fils', r1.court);
  const r2 = await ev(() => { const t = [...document.scripts].map(s => s.textContent).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const champs = ['id="dvn-nom"', 'id="cs-nom"', 'data-ci="nom"', 'data-cnv="nom"', 'data-xy="nouveau"', 'data-dx="nv_nom"'];
    return champs.map(k => { const i = t.indexOf('<input ' + k); return [k, i < 0 ? null : /maxlength="120"/.test(t.slice(i, t.indexOf('>', i)))]; }); });
  L.v('population : les six champs qui créent ou modifient un client sont trouvés', r2.length === 6 && r2.every(([, v]) => v !== null), r2);
  L.v('les six champs portent maxlength="120" (on ne peut pas taper plus que ce que la fiche garde)', r2.every(([, v]) => v === true), r2.filter(([, v]) => v !== true));
  // ═══ le filet des bulles : style ═══
  const r3 = await ev(() => { const dire = h => { toast(h); const t = document.getElementById('toast'); return t.innerHTML; };
    const piege = dire('<span style="position:fixed;inset:0;background:#000;z-index:99999">couvre</span>'), couleur = dire('<span style="color:var(--orange)">⚠ attention</span>'), rouge = dire('<span style="color:red;font-size:99px">x</span>'), urlS = dire('<span style="color:var(--a);background:url(http://x/y)">x</span>');
    return { piege, couleur, rouge, urlS, spans: document.querySelectorAll('#toast span[style]').length }; });
  L.v('un style de position (couvrir l\'écran) posé par une bulle est retiré', !/style=/.test(r3.piege) && /couvre/.test(r3.piege), r3.piege);
  L.v('la couleur d\'avertissement du planning (« color:var(--orange) ») est gardée', /style="color:\s*var\(--orange\)"/.test(r3.couleur), r3.couleur);
  L.v('une autre couleur, une taille ou un fond avec url() sont retirés', !/style=/.test(r3.rouge) && !/style=/.test(r3.urlS), [r3.rouge, r3.urlS]);
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
