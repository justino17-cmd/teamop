// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — TOUTES les façons de fabriquer un client : le correctif clients-05 a posé la position sur la carte des
// tournées pour « avec une intervention » et « avec un devis rapide ». Il y en a d'autres (Composer un devis, devis xylophage, e-mail « c'est un client »).
// On les rejoue toutes avec une adresse de Rochefort et on demande : le client a-t-il son point ET son secteur ? Où la carte le place-t-elle ?
// Usage : PROFIL=… NUIT=1 node clients-recontrole-creations.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const etat = k => p.evaluate(k => ({ existe: !!CLIENTS[k], g: CR_GEO[k] || null, s: SECT_CLI[k] || null, adr: CLIENTS[k] && CLIENTS[k].adr, pos: (typeof crPos === 'function' && CLIENTS[k]) ? crPos({ i: { cli: k } }) : null, depot: CR_DEPOT }), k);
  const cles = () => p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv'));
  const avant = await cles(); v('population : 8 clients au départ (' + avant.length + ')', avant.length === 8);
  const ADR = '4 rue du Port, 17300 Rochefort';
  const nouveaux = async () => { const a = await cles(); return a.filter(k => !avant.includes(k)); };
  const rapport = [];
  const note = async (voie, k) => { const e = await etat(k); const ok = !!e.g && !!e.s; rapport.push({ voie, k, ...e }); v('création « ' + voie + ' » avec une adresse de Rochefort : le client a son point (' + JSON.stringify(e.g) + ') et son secteur (' + e.s + ')', ok, e); return e; };
  // 1. avec une intervention (UI)
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  for (const [k, val] of [['nom', 'Port-Neuf'], ['contact', 'Hélène'], ['tel', '06 11 22 33 77'], ['adr', ADR]]) { await p.fill(`.fen [data-cnv="${k}"]`, val); await p.evaluate(s => document.querySelector(s).blur(), `.fen [data-cnv="${k}"]`); await L.calme(p, 120); }
  await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 500);
  let n = await nouveaux(); v('« avec une intervention » : un client de plus', n.length === 1, n); if (n[0]) await note('avec une intervention', n[0]);
  // « Annuler » (Ctrl/Cmd + Z) juste après avoir créé un client AVEC son intervention : l'intervention part, le client ?
  if (n[0]) { const k = n[0]; const av = await p.evaluate(k => ({ ints: INTS.filter(i => i.cli === k).length, pile: pile.length }), k); await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); await L.calme(p, 400);
    const ap = await p.evaluate(k => ({ ints: INTS.filter(i => i.cli === k).length, client: !!CLIENTS[k], toast: ((document.querySelector('#toast') || {}).textContent || '').trim() }), k);
    console.log('  · Annuler après « client + intervention » : avant ' + JSON.stringify(av) + ' · après ' + JSON.stringify(ap));
    v('Annuler la création « client + intervention » : l’intervention disparaît (' + ap.ints + ')', ap.ints === 0, ap);
    v('… et le client créé en même temps ne reste PAS orphelin, sans aucun travail ni historique (client encore là : ' + ap.client + ')', !ap.client, ap); }
  // 2. avec un devis rapide (UI)
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvDevis"]'); await L.calme(p, 400);
  for (const [k, val] of [['nom', 'Quai-Sud'], ['prenom', 'Paul'], ['tel', '06 11 22 33 88'], ['adr', ADR], ['objet', 'Entretien annuel']]) { await p.fill('#dvn-' + k, val); await p.evaluate(s => document.querySelector(s).blur(), '#dvn-' + k); await L.calme(p, 120); }
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 600);
  const n2 = (await nouveaux()).filter(k => !n.includes(k)); v('« avec un devis » : un client de plus', n2.length === 1, n2); if (n2[0]) await note('avec un devis rapide', n2[0]);
  // 3. Composer un devis : le client naît dans l'atelier et revient par un message (opdClientRecu)
  const e3 = await p.evaluate(adr => { try { opdClientRecu({ id: 'atelier1', nom: 'Atelier Rochefort', adresse: '4 rue du Port', cp: '17300', ville: 'Rochefort', email: 'a@b.fr', tel: '06 11 22 33 99' }); return 'ok'; } catch (e) { return 'ERREUR ' + e.message; } }, ADR);
  v('« Composer un devis » (client né dans l’atelier) : la fonction répond (' + e3 + ')', e3 === 'ok', e3); if (e3 === 'ok') await note('Composer un devis (atelier)', 'atelier1');
  // 4. devis xylophage
  const e4 = await p.evaluate(adr => { try { if (!DX) DX = {}; DX.cli = null; DX.nv = true; DX.type = 'part'; DX.nom = 'Xylo'; DX.prenom = 'Test'; DX.tel = '06 11 22 33 55'; DX.mail = 'x@y.fr'; DX.adr = adr; return dxClientCreer(); } catch (e) { return 'ERREUR ' + e.message; } }, ADR);
  v('devis xylophage : la fonction crée le client (' + e4 + ')', typeof e4 === 'string' && !/^ERREUR/.test(e4), e4); if (typeof e4 === 'string' && !/^ERREUR/.test(e4)) await note('devis xylophage', e4);
  // 5. e-mail « c'est un client » : on lit ce que ces chemins posent (adresse « Rochefort (adresse à compléter) »)
  const src = await p.evaluate(() => [...document.scripts].map(s => s.textContent).join('\n'));
  const mails = (src.match(/adr:R\.ville \? R\.ville \+ ' \(adresse à compléter\)'/g) || []).length;
  console.log('  · ' + mails + ' chemins « e-mail → nouveau client » écrivent « <ville> (adresse à compléter) » sans poser point ni secteur');
  // ce que la carte fait d'un client sans point : au dépôt
  const e5 = await p.evaluate(() => { const k = 'zmail'; CLIENTS[k] = { nom: 'E-mail', type: 'part', contact: 'E-mail', tel: '', mail: 'c@d.fr', adr: 'Rochefort (adresse à compléter)', acces: '', depuis: '2026', appareils: [] }; return { reconnu: reconnaitre(CLIENTS[k].adr), geo: geoDeAdresse(CLIENTS[k].adr), g: CR_GEO[k] || null }; });
  console.log('  · « Rochefort (adresse à compléter) » : reconnu=' + JSON.stringify(e5.reconnu) + ' geo=' + JSON.stringify(e5.geo) + ' posé=' + JSON.stringify(e5.g));
  v('une adresse « Rochefort (adresse à compléter) » est reconnue (le point existe) : donc le client d’un e-mail pourrait être placé', !!e5.geo, e5);
  v('mais aucune carte ne le place : CR_GEO vide pour un client créé depuis un e-mail (' + JSON.stringify(e5.g) + ')', !!e5.g, e5);
  // la carte : où va le client dont le point manque ?
  const ou = await p.evaluate(() => { const o = {}; for (const k of ['atelier1', 'zmail']) { if (!CLIENTS[k]) continue; const r = crPos({ i: { cli: k } }); o[k] = { au_depot: r === CR_DEPOT }; } return o; });
  console.log('  · position sur la carte des tournées : ' + JSON.stringify(ou));
  v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
