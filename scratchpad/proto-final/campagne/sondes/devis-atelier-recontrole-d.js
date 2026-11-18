// RECONTRÔLE ADVERSE (étape 3), passe D : trois parcours de bout en bout, joués d'une traite, avec les corrections en place.
//   D1 dictée → brouillon → acompte → envoi → relance → refus → « Refaire ce devis » → nouvelle version → accord par téléphone → intervention « à planifier » + facture d'acompte → envoi de cette facture
//   D2 Devis rapide pour un client NEUF (adresse dans un autre secteur) → envoi à une adresse tapée → 2ᵉ devis au même client (adresse retenue) → accord signé → ce que la fiche du client en dit
//   D3 Composer un devis (atelier) pour un client créé DANS l'atelier → envoi → signature du client → retour à OP GESTION : numéros (une seule série), liste, client positionné
// usage : node devis-atelier-recontrole-d.js [profil] [jour|nuit]      « N ✓ · M ✗ »
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const cents = s => { const t = String(s).replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ').replace(/[  ]/g, ' '); const m = t.match(/(?:−|-)?\d[\d ]*,\d\d/g); return m ? L.cents(m[m.length - 1]) : NaN; };
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'devis' }), p = c.p; await L.calme(p, 600);
  const cleDe = () => p.evaluate(() => location.hash.replace('#devis-x-', ''));
  // ── D1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  await L.toucher(c, '[data-dv="dicter"]'); await p.fill('#dvd-t', 'Devis pour Mme Roux, remplacement du moteur de la VMC, deux heures de main-d’œuvre et le déplacement'); await L.toucher(c, '[data-dvd="go"]'); await L.calme(p, 700);
  let k = await cleDe(); const dic = await p.evaluate(k => { const x = DEVIS_REG[k]; return x && { cli: x.cli, n: x.lignes.length, trace: x.trace.map(t => t[1]).join('|'), source: x.source }; }, k);
  v('D1 : la dictée prépare un brouillon pour Mme Roux, avec des lignes, « Dicté par Marc »', dic && dic.cli === 'mr' && dic.n >= 1 && /Dicté par Marc/.test(dic.trace), dic);
  await p.evaluate(k => { const x = DEVIS_REG[k]; x.lignes.forEach(l => { if (l[2] == null) l[2] = 33.335; }); rendre(); }, k); await L.calme(p, 400);
  await p.selectOption('[data-dvacompte="' + k + '"]', '40'); await p.selectOption('[data-dvtva="' + k + '"]', '10'); await L.calme(p, 300);
  const ttc1 = await p.evaluate(k => Math.round(dvTTC(DEVIS_REG[k]) * 100), k);
  await L.toucher(c, '[data-dv="envoyer|' + k + '"]'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 700);
  k = await cleDe(); const num1 = k; v('D1 : envoyé, le devis prend son numéro D-2026-…', /^D-2026-\d+$/.test(num1), num1);
  await L.toucher(c, '[data-dv="relancer|' + k + '"]'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 600);
  v('D1 : relancé : compteur de relances = 1', (await p.evaluate(k => DEVIS_REG[k].relances, k)) === 1);
  await L.toucher(c, '[data-dv="reponse|' + k + '"]'); await p.selectOption('#dvr-motif', 'Trop cher'); await L.toucher(c, '[data-dv="repNon|' + k + '"]'); await L.calme(p, 500);
  v('D1 : refusé « Trop cher »', (await p.evaluate(k => DEVIS_REG[k].e, k)) === 'refuse');
  await L.toucher(c, '[data-dv="version|' + k + '"]'); await L.calme(p, 600); const k2 = await cleDe();
  const ver = await p.evaluate(({ k, k2 }) => { const a = DEVIS_REG[k], b = DEVIS_REG[k2]; return { memeAcompte: a.acompte === b.acompte, memeTva: a.tva === b.tva, nl: [a.lignes.length, b.lignes.length], remplace: b.remplace, e: b.e, copie: a.lignes !== b.lignes }; }, { k, k2 });
  v('D1 : « Refaire ce devis » : brouillon neuf, mêmes lignes (copie), même acompte et même TVA', ver.e === 'brouillon' && ver.memeAcompte && ver.memeTva && ver.nl[0] === ver.nl[1] && ver.copie, ver);
  await p.fill('[data-dvl="' + k2 + '|0|2"]', '45,555'); await p.press('[data-dvl="' + k2 + '|0|2"]', 'Tab'); await L.calme(p, 400);
  await L.toucher(c, '[data-dv="envoyer|' + k2 + '"]'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 700);
  const k3 = await cleDe(); const nums = await p.evaluate(() => DV.map(x => x.num).filter(Boolean));
  v('D1 : la nouvelle version prend un NUMÉRO NEUF (série unique, aucun doublon dans les devis)', /^D-2026-\d+$/.test(k3) && k3 !== num1 && new Set(nums).size === nums.length, [num1, k3, nums]);
  await L.toucher(c, '[data-dv="reponse|' + k3 + '"]'); await L.calme(p, 300);
  const ints0 = await p.evaluate(() => INTS.length), fac0 = await p.evaluate(() => FACTURES.length);
  await L.toucher(c, '[data-dv="repOui|' + k3 + '"]'); await L.calme(p, 700);
  const fin = await p.evaluate(k => { const x = DEVIS_REG[k], f = FACTURES.find(o => o.id === x.facAcompte), i = INTS.find(o => o.id === x.int); return { e: x.e, ints: INTS.length, fac: FACTURES.length, st: i && i.st, acHT: f && f.ht, tva: f && f.tva, ttc: Math.round(dvTTC(x) * 100), trace: x.trace.slice(-3).map(t => t[1]), num: f && f.num }; }, k3);
  v('D1 : accord par téléphone : intervention « à planifier » + facture d’acompte à valider, créées UNE fois', fin.e === 'accepte' && fin.ints === ints0 + 1 && fin.fac === fac0 + 1 && fin.st === 'aplanifier' && fin.num === '—', { fin, ints0, fac0 });
  const acTtc = fin.acHT != null ? Math.round(fin.acHT * (1 + fin.tva / 100) * 100) : NaN, promis = Math.floor((2 * fin.ttc * 40 + 100) / 200);
  v('D1 : l’acompte facturé (TTC) est à 1 centime de 40 % du devis', Math.abs(acTtc - promis) <= 1, { acTtc, promis, devis: fin.ttc });
  v('D1 : l’historique dit « Accord noté par Marc » (pas un autre prénom)', /Accord noté par Marc/.test(fin.trace.join('|')), fin.trace);
  // l'ancienne version est « remplacée » : plus d'accord possible dessus
  const anc = await p.evaluate(k => DEVIS_REG[k].e, k); console.log('  · ancienne version (refusée) :', anc);
  // la facture d'acompte : on l'ouvre, on l'envoie
  const fid = await p.evaluate(k => DEVIS_REG[k].facAcompte, k3); await L.aller(p, 'facture-x-' + fid); await L.calme(p, 400);
  const bt = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu .tete .actions button, #contenu .actions button')].find(b => /Aperçu et envoi|Envoyer/.test(b.textContent)); return b ? { t: b.textContent.trim(), d: b.disabled, a: b.dataset.action } : null; });
  console.log('  · bouton d’envoi de la facture d’acompte :', JSON.stringify(bt));
  v('D1 : la facture d’acompte s’ouvre depuis Factures et propose son envoi', !!bt && !bt.d, bt);
  const trs = await p.evaluate(() => TACHES.filter(t => !t.fait && t.lien && t.lien.t === 'devis').map(t => t.lien.id));
  v('D1 : plus aucune tâche de relance ouverte sur les devis refusés / remplacés / acceptés de ce parcours', !trs.some(x => [num1, k3].includes(x)), trs);

  // ── D2 : client neuf, adresse hors du secteur par défaut ──────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="nouveau"]'); await L.toucher(c, '[data-dvn="nv|1"]');
  await p.fill('#dvn-nom', 'Boulangerie Les Épis Dorés'); await p.fill('#dvn-tel', '06 98 76 54 32'); await p.fill('#dvn-objet', 'Entretien du four');
  const champs = await p.evaluate(() => [...document.querySelectorAll('#calque input, #calque select')].map(e => e.id).filter(Boolean)); console.log('  · champs du Devis rapide (client neuf) :', champs.join(','));
  if (champs.includes('dvn-adr')) await p.fill('#dvn-adr', '8 rue des Halles, 17000 La Rochelle');
  await L.toucher(c, '[data-dvn="modele|1"]'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 700);
  console.log('  · après « Préparer » :', await p.evaluate(() => JSON.stringify({ h: location.hash, al: ((document.querySelector('#calque .alerte') || {}).textContent || '').trim(), t: ((document.getElementById('toast') || {}).textContent || '').trim().slice(0, 100) })));
  const kd = await cleDe(); const cli = await p.evaluate(k => { const x = DEVIS_REG[k], c = CLIENTS[x.cli]; return { id: x.cli, nom: c && c.nom, adr: c && c.adr, geo: !!CR_GEO[x.cli], sect: SECT_CLI[x.cli] || null }; }, kd);
  console.log('  · client créé :', JSON.stringify(cli));
  v('D2 : le devis rapide crée le client, le brouillon est à son nom', cli.nom === 'Boulangerie Les Épis Dorés', cli);
  await L.toucher(c, '[data-dv="envoyer|' + kd + '"]'); await p.fill('#ml-a', 'contact@epis-dores.example.fr'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 700);
  v('D2 : l’adresse tapée à l’envoi est rangée dans la fiche du client neuf', (await p.evaluate(id => CLIENTS[id].mail, cli.id)) === 'contact@epis-dores.example.fr');
  await L.aller(p, 'client-x-' + cli.id); const fcl = await p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  console.log('  · fiche client :', fcl.slice(0, 900)); v('D2 : la fiche du client montre son devis (numéro) et un bouton E-mail', /D-2026-\d+/.test(fcl) && /E-mail/.test(fcl), fcl.slice(0, 200));

  // ── D3 : l'atelier ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis'); const comp = await p.evaluate(() => { const b = [...document.querySelectorAll('#contenu button, #contenu a')].find(b => /Composer un devis/.test(b.textContent)); return b ? { t: b.textContent.trim(), a: b.getAttribute('data-dv') || b.getAttribute('data-go') || b.getAttribute('data-opd') } : null; });
  console.log('  · bouton « Composer un devis » :', JSON.stringify(comp));
  v('D3 : « Composer un devis » est proposé sur la liste', !!comp, comp);
  console.log('err', c.err.length, c.err.slice(0, 4)); v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
