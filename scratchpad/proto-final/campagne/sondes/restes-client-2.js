// Espace client, RESTES tour 2 (18 novembre 2026) : « Bonjour » d'un organisme. Reprend ce que le recontrôle du tour 1 a trouvé encore ouvert :
// les réponses types du Courrier (mbxMod), le bouton « Prévenir » et son courriel (tkxPrenomClient), tMailClient, saluer() sur des noms d'organismes,
// et le cadre Paiement (sa fonction salut, extraite du fichier réel). node restes-client-2.js <profil> [nuit] → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
(async () => {
  const c = await O.clientApp({ profil, nuit, cli: 'md', ec: 'accueil' }), p = c.p;
  // 1) saluer : des organismes de formes variées (article, chiffre, mot de société) ET des personnes qui y ressemblent
  const s = await p.evaluate(() => { const o = {}; for (const n of ['La Poste', 'Le syndic', 'Les Mimosas', 'L’Hôtel du Port', 'Frigo Distribution 17', 'Daikin Pro Ouest', 'Chauffage Distribution Atlantique', 'Orange Pro', 'Garage Martin SARL',
      'Laurent Martin', 'Léa Roux', 'Leroy Merlin', 'Agnès Bureau', 'Mme Roux', 'Claire Fontaine', 'Lara Pro-Ferreira'.replace('-', ' ').slice(0, 4), 'Mme Bernard, directrice']) o[n] = saluer(n); return o; });
  const orga = ['La Poste', 'Le syndic', 'Les Mimosas', 'L’Hôtel du Port', 'Frigo Distribution 17', 'Daikin Pro Ouest', 'Chauffage Distribution Atlantique', 'Orange Pro', 'Garage Martin SARL'];
  const pers = ['Laurent Martin', 'Léa Roux', 'Leroy Merlin', 'Agnès Bureau', 'Mme Roux', 'Claire Fontaine', 'Lara'];
  v('population : 9 organismes et 7 personnes essayés', orga.length === 9 && pers.length === 7 && Object.keys(s).length >= 16, Object.keys(s).length);
  v('saluer : un organisme (article, chiffre, mot de société) donne « Bonjour » tout court', orga.every(n => s[n] === 'Bonjour'), orga.filter(n => s[n] !== 'Bonjour').map(n => [n, s[n]]));
  v('saluer : une personne — même « Laurent », « Léa », « Leroy », « Lara » qui commencent comme un article — est saluée par son nom', pers.every(n => s[n] === 'Bonjour ' + n), pers.filter(n => s[n] !== 'Bonjour ' + n).map(n => [n, s[n]]));
  v('saluer : « Mme Bernard, directrice » → « Bonjour Mme Bernard »', s['Mme Bernard, directrice'] === 'Bonjour Mme Bernard', s['Mme Bernard, directrice']);
  // 2) réponses types du Courrier, expéditeur par expéditeur
  const rep = await p.evaluate(() => MAILS.filter(m => m.de && !/^Toi$/.test(m.de.nom)).map(m => { const t = mbxMod(m); return { id: m.id, de: m.de.nom, mail: m.de.mail, tous: Object.entries(t).map(([k, x]) => [k, x.split(/[,\n]/)[0]]) }; }));
  v('population : au moins 15 expéditeurs lus, chacun avec ≥ 7 modèles', rep.length >= 15 && rep.every(r => r.tous.length >= 7), rep.map(r => r.id + ':' + r.tous.length));
  const attendu = { m1: 'Bonjour Mme Bernard', m5: 'Bonjour Claire Fontaine', m4: 'Bonjour M. Durand', n9: 'Bonjour M. Garnier', n11: 'Bonjour M. Garnier', n12: 'Bonjour Sophie Marchand', m10: 'Bonjour Dr Martin' };   // n8 : un pourriel (« Gagnant Chance »), personne n'y répond
  const ecarts = [];
  for (const r of rep) { if (r.id === 'n8') continue; for (const [k, x] of r.tous) { const att = attendu[r.id] || 'Bonjour'; if (!['avoir', 'commande'].includes(k) && x !== att) ecarts.push([r.id, r.de, k, x]); } }
  v('Courrier : chaque réponse type salue la personne (Mme Bernard, Claire Fontaine, M. Durand, M. Garnier, Sophie Marchand) ou dit « Bonjour » tout court (syndic, fournisseurs, société inconnue)', ecarts.length === 0, ecarts.slice(0, 6));
  v('Courrier : l\'expéditeur inconnu « Clim Pièces Atlantique » (promo@…) est lu et reçoit « Bonjour »', rep.some(r => /Clim Pièces Atlantique/.test(r.de) && r.tous.every(([k, x]) => x === 'Bonjour')), rep.filter(r => /Clim Pièces/.test(r.de)).map(r => r.tous[0]));
  // 3) tâche « Prévenir » : le bouton (vrai geste) et son courriel, client par client
  const pr = await p.evaluate(async () => { const o = {}; const CL = Object.keys(CLIENTS);
    for (const k of CL) { const x = { id: 'tz' + k, t: 'Prévenir pour la pièce', qui: 'marc', etat: 'ouverte', lien: { t: 'client', id: k, cli: k }, inter: null, pieces: [] }; TACHES.push(x);
      const a = tkxAction(x); let corps = ''; if (a) { const d = document.createElement('div'); d.innerHTML = '<button ' + a.at + '></button>'; try { document.body.appendChild(d); d.firstChild.click(); await new Promise(r => setTimeout(r, 120)); const q = document.querySelector('#calque .panneau'); corps = q ? ((q.querySelector('textarea') || {}).value || q.innerText).replace(/\s+/g, ' ').slice(0, 70) : 'PAS DE FENÊTRE'; fermerPanneau(); } catch (e) { corps = 'ERREUR ' + e.message; } d.remove(); }
      o[k] = { lib: a ? a.lib : 'PAS DE BOUTON', corps }; TACHES.splice(TACHES.indexOf(x), 1); } return o; });
  v('population : un bouton « Prévenir » et un courriel lus pour chaque client (≥ 7)', Object.keys(pr).length >= 7 && Object.values(pr).every(x => /^💬 Prévenir /.test(x.lib) && /^Bonjour/.test(x.corps)), pr);
  v('« Prévenir » nomme la copropriété (pas « Syndic Foncia ») et le courriel dit « Bonjour, » tout court', pr.mi && pr.mi.lib === '💬 Prévenir Copropriété Les Mimosas' && /^Bonjour, /.test(pr.mi.corps), pr.mi);
  v('« Prévenir » nomme la personne quand le contact en est une (Marc Durand, Mme Bernard, Dr Martin, M. Pineau)', pr.vp.lib === '💬 Prévenir Marc Durand' && pr.hp.lib === '💬 Prévenir Mme Bernard' && pr.cm.lib === '💬 Prévenir Dr Martin' && pr.cp.lib === '💬 Prévenir M. Pineau' && /^Bonjour Dr Martin, /.test(pr.cm.corps), [pr.vp, pr.hp, pr.cm, pr.cp]);
  // 4) tMailClient (« Prévenir le client » / « Écrire au client ») : pas de « () » quand il n'y a pas d'intervention, pas de syndic salué
  const mc = await p.evaluate(() => { const o = {}; for (const k of ['mi', 'md']) for (const pv of [true, false]) { tMailClient({ id: 'tx', t: 'Essai', lien: { t: 'client', id: k, cli: k }, inter: null, pieces: [] }, pv); const q = document.querySelector('#calque .panneau'); o[k + (pv ? 'P' : 'E')] = q ? ((q.querySelector('textarea') || {}).value || q.innerText).replace(/\s+/g, ' ').slice(0, 90) : 'PAS DE FENÊTRE'; fermerPanneau(); } return o; });
  v('tMailClient : la copropriété reçoit « Bonjour, », M. Durand « Bonjour M. Durand, »', /^Bonjour, /.test(mc.miP) && /^Bonjour, /.test(mc.miE) && /^Bonjour M\. Durand, /.test(mc.mdP) && /^Bonjour M\. Durand, /.test(mc.mdE), mc);
  v('tMailClient : « Pour votre intervention, nous commandons » sans parenthèses vides', !/\(\s*\)/.test(mc.miP) && /Pour votre intervention, nous commandons/.test(mc.miP), mc.miP);
  // 5) le cadre Paiement : la VRAIE fonction salut du fichier, évaluée seule
  const src = fs.readFileSync(path.join(__dirname, '../../../../apercu/prototype-paiement.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const m = src.match(/const salut = [^\n]+;/); v('Paiement : la fonction salut existe', !!m, !!m);
  if (m) { const esc = x => String(x), salut = eval('(' + m[0].replace(/^const salut = /, '').replace(/;$/, '') + ')');
    v('Paiement : « Le syndic » → « Bonjour », « M. Lemoine » → « Bonjour M. Lemoine »', salut('Le syndic') === 'Bonjour' && salut('M. Lemoine') === 'Bonjour M. Lemoine' && salut('Laurent') === 'Bonjour Laurent', [salut('Le syndic'), salut('M. Lemoine'), salut('Laurent')]);
    v('Paiement : plus aucun « Bonjour ${…contact} » écrit à la main', !/Bonjour \$\{esc\(g\.contact\)\}/.test(src), (src.match(/Bonjour \$\{[^}]*\}/g) || []).slice(0, 3)); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
