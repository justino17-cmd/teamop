// CONTRE-VÉRIFICATION d'acces-11 sur la TÊTE ACTUELLE (étape 6 sur 8, 17 novembre 2026) : en rôle « client », que lit-on quand on tape l'adresse
// d'un document d'un AUTRE client ? La première version (contre-verif-acces.js, D) cherchait le NOM de l'autre client : faux positif probable,
// le bandeau « Tester en tant que » liste tous les clients. Ici on cherche ce qui n'appartient qu'au document : son numéro, son titre.
// ⛔ 127.0.0.1 seulement. Un ✗ est une fuite qui existe encore.
const L = require('../lib.js');
(async () => {
  const c = await L.ouvrir({ qui: null, app: false, attente: 900 });
  const r = await c.p.evaluate(async () => {
    rlChanger('client', { cli: 'vp', muet: true }); await new Promise(x => setTimeout(x, 600));
    const base = document.getElementById('contenu').innerText.replace(/\s+/g, ' ');
    const miens = { facture: FACTURES.find(f => f.cli === 'vp'), contrat: CONTRATS.find(k => k.cli === 'vp') };
    const out = { moi: RL_CLI.cli, populationMiens: { facture: !!miens.facture && base.includes(miens.facture.num), contrat: !!miens.contrat }, essais: [] };
    const aller = async (h, marque, quoi) => { location.hash = h; await new Promise(x => setTimeout(x, 700)); const t = document.getElementById('contenu').innerText.replace(/\s+/g, ' '); out.essais.push({ h, quoi, route, marqueLue: !!marque && t.includes(marque), baseLue: !!marque && base.includes(marque) }); };
    const fa = FACTURES.filter(f => f.cli !== 'vp').slice(0, 3), dv = (typeof DV !== 'undefined' && DV || []).filter(d => d.cli !== 'vp' && d.num).slice(0, 2), it = INTS.filter(i => i.cli !== 'vp').slice(0, 2), ck = CONTRATS.filter(k => k.cli !== 'vp').slice(0, 2);
    for (const f of fa) await aller('facture-x-' + f.id, f.num, 'facture d\'un autre');
    for (const d of dv) await aller('devis-x-' + (d.id || d.num), d.num, 'devis d\'un autre');
    for (const i of it) await aller('inter-x-' + i.id, i.titre, 'intervention d\'un autre');
    for (const k of ck) await aller('signer-x-' + k.id, k.num, 'contrat d\'un autre');
    return out; });
  console.log(JSON.stringify(r, null, 1).slice(0, 2500));
  L.v('population : l\'espace du client montre ses propres documents', r.populationMiens.facture, r.populationMiens);
  L.v('population : au moins 6 adresses d\'autres documents essayées', r.essais.length >= 6, r.essais.length);
  r.essais.forEach(e => L.v(e.h + ' (' + e.quoi + ') : ce qui n\'appartient qu\'à ce document n\'est pas lu par un autre client (route ouverte : ' + e.route + ')', !(e.marqueLue && !e.baseLue), e));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
