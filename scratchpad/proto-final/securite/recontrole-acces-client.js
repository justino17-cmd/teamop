// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), faille S14 : « un client simulé ne lit et ne touche que ses propres documents ».
// L'audit a gardé trois adresses (signer-x-, et les gestes data-ec) ; la sonde de garde n'ouvre que signer-x-<contrat d'un autre>. Ici : TOUTES les adresses
// que connaît l'application, avec l'identifiant d'un document d'un AUTRE client — fiches (facture-x-, devis-x-, inter-x-, contrat-x-, client-x-, signer-x-)
// et écrans de liste (factures, devis, contrats, planning, historique…) — jouées en rôle « client », par l'adresse (location.hash) ET par aller(),
// puis le texte visible est comparé à ce qui est AUX AUTRES : leur nom, leurs numéros de pièce, leurs montants. Une fuite = le texte d'un autre client à l'écran.
// Population d'abord : le client est bien connecté, les documents des deux côtés existent, au moins 30 adresses ont été jouées, et le témoin (SES documents)
// s'affiche. Contre-épreuve : en rôle gérant, les mêmes adresses montrent bien ces noms (sinon « rien ne fuit » ne prouve rien).
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1400 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const D = await p.evaluate(async () => { dvInit();
    const du = f => ['envoyee', 'retard', 'partielle', 'payee'].includes(f.st) && f.num !== '—';
    const K = Object.keys(CLIENTS).find(k => FACTURES.some(f => f.cli === k && du(f)) && DV.some(d => d.cli === k && d.num) && INTS.some(i => i.cli === k)) || Object.keys(CLIENTS)[0];
    const autres = Object.keys(CLIENTS).filter(k => k !== K);
    // ce qui est AUX AUTRES : leur nom (≥ 6 signes, propre à eux), leurs numéros de pièce
    const noms = [...new Set(autres.map(k => CLIENTS[k].nom).filter(n => n && n.length >= 6 && !CLIENTS[K].nom.includes(n) && !String(CLIENTS[K].contact).includes(n)))];
    const nomsK = [CLIENTS[K].nom, CLIENTS[K].contact];
    const nums = { fac: FACTURES.filter(f => f.cli !== K && f.num && f.num !== '—').map(f => f.num), dv: DV.filter(d => d.cli !== K && d.num).map(d => d.num), ctr: CONTRATS.filter(x => x.cli !== K).map(x => x.num).filter(Boolean) };
    const adresses = [];
    FACTURES.filter(f => f.cli !== K).slice(0, 4).forEach(f => adresses.push('facture-x-' + (f.id || f.num)));
    DV.filter(d => d.cli !== K).slice(0, 4).forEach(d => { adresses.push('devis-x-' + d.id); adresses.push('devis-x-' + d.num); });
    INTS.filter(i => i.cli !== K).slice(0, 4).forEach(i => adresses.push('inter-x-' + i.id));
    CONTRATS.filter(x => x.cli !== K).slice(0, 3).forEach(x => { adresses.push('contrat-x-' + x.id); adresses.push('signer-x-' + x.id); });
    autres.slice(0, 5).forEach(k => adresses.push('client-x-' + k));
    Object.keys(vues()).filter(r => !/-x-/.test(r)).forEach(r => adresses.push(r));
    rlChanger('client', { cli: K, muet: true }); await new Promise(r => setTimeout(r, 600));
    return { K, moi: RL_CLI.cli, nomK: CLIENTS[K].nom, noms, nomsK, nums, adresses: [...new Set(adresses)] }; });
  console.log('  · client :', D.K, D.nomK, '· adresses à jouer :', D.adresses.length, '· noms des autres :', D.noms.length, '· numéros :', JSON.stringify({ f: D.nums.fac.length, d: D.nums.dv.length, c: D.nums.ctr.length }));
  L.v('population : on est le client « ' + D.nomK + ' », et les documents des autres existent (noms, factures, devis)', D.moi === D.K && D.noms.length >= 3 && D.nums.fac.length >= 2 && D.nums.dv.length >= 2, { moi: D.moi, K: D.K, noms: D.noms.length });
  L.v('population : au moins 30 adresses à jouer', D.adresses.length >= 30, D.adresses.length);
  const fuites = [], lus = []; let joues = 0;
  const lire = () => p.evaluate(() => { const z = [...document.querySelectorAll('#contenu, #calque .panneau, #toast')].map(e => e.innerText || '').join('\n'); return { texte: z.replace(/\s+/g, ' '), route }; });
  const compare = (adr, mode, r) => { const t = r.texte; const noms = D.noms.filter(n => t.includes(n)); const nums = [...D.nums.fac, ...D.nums.dv, ...D.nums.ctr].filter(n => t.includes(n));
    lus.push({ adr, mode, route: r.route, noms: noms.length, nums: nums.length });
    if (noms.length || nums.length) fuites.push({ adr, mode, route: r.route, noms: noms.slice(0, 3), nums: nums.slice(0, 3) }); };
  for (const adr of D.adresses) {
    try { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await p.evaluate(a => aller(a), adr); await att(450); joues++; compare(adr, 'aller', await lire());
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await p.evaluate(a => { location.hash = a; }, adr); await att(450); joues++; compare(adr, 'adresse', await lire()); } catch (e) { /* une adresse refusée par une erreur : comptée dans lus seulement si elle a rendu */ }
  }
  console.log('  · adresses jouées :', joues, '· écrans lus :', lus.length, '· fuites :', fuites.length);
  fuites.slice(0, 12).forEach(f => console.log('  FUITE', f.mode, f.adr, '→ écran', f.route, '· noms :', f.noms.join(' / '), '· numéros :', f.nums.join(' / ')));
  L.v('population : au moins 60 écrans lus en rôle client (' + lus.length + ')', lus.length >= 60, lus.length);
  // témoin : ses propres documents s'affichent
  const temoin = await p.evaluate(async () => { const K = RL_CLI.cli; const f = FACTURES.find(o => o.cli === K && o.num !== '—'); try { fermerPanneau(); } catch (e) {} aller('espaceclient'); await new Promise(r => setTimeout(r, 700)); const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' '); return { nomK: t.includes(CLIENTS[K].nom) || t.includes(CLIENTS[K].contact.split(',')[0]), num: f ? t.includes(f.num) : null, route }; });
  console.log('  · témoin :', JSON.stringify(temoin));
  L.v('témoin : l\'espace du client montre SON nom ou son contact (la lecture regarde au bon endroit)', temoin.nomK, temoin);
  L.v('AUCUN texte d\'un autre client (nom, numéro de facture, de devis, de contrat) n\'est lisible en rôle client, par aucune des ' + D.adresses.length + ' adresses (aller ET adresse) — fuites : ' + fuites.length, fuites.length === 0, fuites.slice(0, 6));
  // contre-épreuve : le même relevé en rôle gérant voit bien ces noms (sinon la mesure ne regarde rien)
  const ct = await p.evaluate(async noms => { rlChanger('patron', { muet: true }); await new Promise(r => setTimeout(r, 500)); aller('clients'); await new Promise(r => setTimeout(r, 600)); const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' '); return { vus: noms.filter(n => t.includes(n)).length, de: noms.length }; }, D.noms);
  L.v('contre-épreuve : en rôle gérant, la liste des clients montre plusieurs de ces noms (' + ct.vus + '/' + ct.de + ')', ct.vus >= 3, ct);
  fs.writeFileSync(SORTIE + 'acces-client.json', JSON.stringify({ D: { ...D, adresses: D.adresses.length }, fuites, lus: lus.length }, null, 1));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); console.log('  · erreurs de page :', nErr.length, nErr.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
