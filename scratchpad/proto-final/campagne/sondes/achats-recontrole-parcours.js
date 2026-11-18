// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : trois parcours de bout en bout, joués d'une personne à l'autre, avec les chiffres
// relus à CHAQUE endroit où ils paraissent (onglets, tuiles, Comptabilité, Temps de travail › Mois, Fournisseurs, Stock).
//  P1 : la technicienne demande « 2,5 kg » de colle (clavier, virgule), le gérant accepte en magasin, elle rapporte le ticket (18,40 €),
//       la Comptabilité range l'achat (HT/TVA au centime) et le « sans justificatif » ne bouge pas.
//  P2 : une note de frais de 12,50 € validée → la ligne de la paie du mois ; un refus avec motif → la technicienne le lit et la renvoie ;
//       « Voir les notes › » et « Voir la paie du mois › » font l'aller-retour.
//  P3 : « Transférer et commander » → brouillon chez le fournisseur → Stock › Mouvements → on envoie → la demande dit où elle en est.
// Usage : node achats-recontrole-parcours.js [profil=mac] [nuit]
const { L, ouvrirAchats, devenir, toast, panneau, txt, CAP, PNG } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '');
  const c = await ouvrirAchats({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p, E = (f, a) => p.evaluate(f, a), clic = s => L.toucher(c, s, { delai: 4000 });
  const compte = () => E(() => ({ dem: DEM_ACHAT.filter(d => d.etat === 'attente').length, ndf: NDF.filter(n => n.etat === 'attente').length, sj: typeof axSansJustif === 'function' ? axSansJustif() : null, ach: ACHATS.length }));
  const voirSJ = async () => { await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); const t = await E(() => { const b = [...document.querySelectorAll('#contenu [data-cx]')].find(e => /justificatif/.test(e.textContent)); return b ? b.textContent : ''; }); return parseInt((t.match(/(\d+) achat/) || [0, -1])[1], 10); };
  // ── P1
  const sj0 = await voirSJ(); await devenir(p, 'sm', 'techfrais');
  await clic('[data-axa="dem"]'); await L.calme(p, 300);
  await p.fill('#ax-q', 'Colle néoprène'); await p.click('#ax-n'); await p.fill('#ax-n', ''); await p.keyboard.type('2,5', { delay: 20 }); await E(() => { const u = document.getElementById('ax-u'); if (u) u.value = 'kg'; });
  const nA = await E(() => DEM_ACHAT.length); await clic('[data-axa^="demok"]'); await L.calme(p, 500);
  const nouv = await E(() => JSON.parse(JSON.stringify(DEM_ACHAT[0])));
  v('P1a la demande « Colle néoprène » vaut 2,5 (la virgule tapée n’est pas avalée) et part au bureau', (await E(() => DEM_ACHAT.length)) === nA + 1 && nouv.q === 2.5 && nouv.etat === 'attente', nouv);
  const mesFrais = await txt(p); v('P1b la technicienne relit « 2,5 » (pas « 2.5 », pas « 25 ») dans Mes frais', /2,5/.test(mesFrais) && !/2\.5|\b25 kg/.test(mesFrais), mesFrais.slice(0, 300));
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const carte = await E(id => { const e = document.querySelector('[data-axid="' + id + '"]'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, nouv.id);
  v('P1c le gérant la voit avec « 2,5 kg » et le bouton « Accepter : … l’achète en magasin »', !!carte && /2,5 kg/.test(carte) && /Accepter/.test(carte), carte);
  await E(id => document.querySelector('[data-ac="magasin|' + id + '"]').scrollIntoView({ block: 'center' }), nouv.id); await L.calme(p, 300);
  await clic('[data-ac="magasin|' + nouv.id + '"]'); await L.calme(p, 500);
  v('P1d accepter : la demande n’est plus « à décider » et le message dit ce qui se passe', (await E(id => DEM_ACHAT.find(d => d.id === id).etat, nouv.id)) !== 'attente', await toast(p));
  console.log('  message d’acceptation :', await toast(p));
  await devenir(p, 'sm', 'techfrais'); const tk = await E(id => !!document.querySelector('[data-axa="tick|' + id + '"]'), nouv.id);
  v('P1e la technicienne voit « Ajouter le ticket » sur sa demande acceptée', tk);
  if (tk) { await clic('[data-axa="tick|' + nouv.id + '"]'); await L.calme(p, 300); await p.fill('#ax-m', ''); await p.click('#ax-m'); await p.keyboard.type('18,40', { delay: 20 });
    await p.setInputFiles('#ax-tp', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200); await clic('[data-axa^="tickok"]'); await L.calme(p, 500);
    const a = await E(id => { const x = ACHATS.find(o => o.id === 'a' + id); return x ? { ht: x.ht, tva: x.tva, piece: x.piece, four: x.four } : null; }, nouv.id);
    v('P1f le ticket de 18,40 € TTC range l’achat en comptabilité : 15,33 € HT, TVA 20 %, ticket joint', !!a && a.ht === 15.33 && a.tva === 20 && a.piece === 'ticket', a); }
  const sj1 = await voirSJ(); v('P1g l’achat qui a son ticket ne s’ajoute pas aux « sans justificatif » (' + sj0 + ' → ' + sj1 + ')', sj1 === sj0, { sj0, sj1 });
  // ── P2
  await devenir(p, 'sm', 'techfrais');
  await clic('[data-rl="ndf"]'); await L.calme(p, 300); await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-pr', 'station Leclerc, Aytré'); await p.fill('#rn-m', '12,50');
  await p.setInputFiles('#rn-p', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200); await clic('[data-rl="ndfok"]'); await L.calme(p, 500);
  const idN = await E(() => NDF[0].id);
  await devenir(p, 'marc', 'pointage'); await E(() => { try { ptOnglet = 'mois'; } catch (e) {} }); await L.aller(p, 'pointage');
  const paie0 = await E(() => { const e = document.querySelector('.tt-paie'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
  console.log('  paie avant :', paie0);
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  await clic('[data-ac="ndfok|' + idN + '"]'); await L.calme(p, 500);
  console.log('  message de validation :', await toast(p));
  await L.aller(p, 'pointage'); await E(() => { try { ptOnglet = 'mois'; } catch (e) {} }); await L.aller(p, 'pointage');
  const paie1 = await E(() => { const e = document.querySelector('.tt-paie'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
  console.log('  paie après :', paie1);
  v('P2a la paie du mois porte les 12,50 € de la note validée (Sophie)', !!paie1 && /Sophie/.test(paie1) && /12,50/.test(paie1), paie1);
  v('P2b le total de la ligne = somme des notes validées (au centime)', await E(() => { const t = NDF.filter(n => n.etat === 'validee').reduce((s, n) => s + n.ttc, 0); const e = document.querySelector('.tt-paie'); const m = e ? e.textContent.replace(/[\s  ]/g, '') : ''; return NDF.filter(n => n.etat === 'validee').every(n => m.includes(String(n.ttc.toFixed(2)).replace('.', ',') + '€')) && t > 0; }), paie1);
  const voir = await E(() => !!document.querySelector('[data-ac="allernotes"]')); v('P2c la ligne de paie a son « Voir les notes › »', voir);
  if (voir) { await clic('[data-ac="allernotes"]'); await L.calme(p, 600); const h = await E(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, onglet: acOnglet })); v('P2d « Voir les notes › » mène à Achats et frais › notes', /Achats/.test(h.h1 || '') && h.onglet === 'notes', h); }
  // refus avec motif d'une autre note : la technicienne le lit
  await devenir(p, 'sm', 'techfrais'); await clic('[data-rl="ndf"]'); await L.calme(p, 300); await p.selectOption('#rn-o', 'Repas sur un chantier'); await p.fill('#rn-pr', 'sandwich'); await p.fill('#rn-m', '9,90');
  await p.setInputFiles('#rn-p', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await clic('[data-rl="ndfok"]'); await L.calme(p, 500); const idR = await E(() => NDF[0].id);
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  await clic('[data-ac="ndfnon|' + idR + '"]'); await L.calme(p, 400);
  const fen = await panneau(p); console.log('  fenêtre de refus :', fen.slice(0, 200));
  const motifIn = await E(() => { const e = document.querySelector('#calque .panneau textarea, #calque .panneau input[type=text]'); return e ? e.id : null; });
  if (motifIn) { await clic('[data-axa^="nonok"]'); await L.calme(p, 300); v('P2e un refus sans motif est refusé avec une phrase (rien n’est refusé)', (await E(id => NDF.find(n => n.id === id).etat, idR)) === 'attente', await toast(p));
    await p.fill('#' + motifIn, 'Le repas du midi est déjà dans ton indemnité.'); await clic('[data-axa^="nonok"]'); await L.calme(p, 400); }
  v('P2f la note est « refusée » avec son motif', (await E(id => { const n = NDF.find(o => o.id === id); return n.etat + '|' + (n.motif || ''); }, idR)).startsWith('refusee|Le repas'), await E(id => NDF.find(o => o.id === id).etat, idR));
  await devenir(p, 'sm', 'techfrais'); const tr = await txt(p);
  v('P2g la technicienne lit le motif du refus dans Mes frais', /indemnité/.test(tr), tr.slice(0, 400));
  const renv = await E(id => !!document.querySelector('[data-axa="renvoyer|' + id + '"], [data-axa^="renv"]'), idR); console.log('  bouton pour renvoyer une note refusée :', renv);
  await L.capture(c, CAP + 'rc-parcours-mesfrais-' + tag + '.png');
  // ── P3
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const av = await E(() => ({ cmd: COMMANDES.length, mv: MVTS.length, brouillons: COMMANDES.filter(c => c.st === 'brouillon').length }));
  await E(() => document.querySelector('[data-ac="transfert|da1"]').scrollIntoView({ block: 'center' })); await L.calme(p, 300);
  await clic('[data-ac="transfert|da1"]'); await L.calme(p, 500); if (/garage/.test(await panneau(p))) { await clic('[data-ac^="transfertok"]'); await L.calme(p, 700); }
  const ap = await E(() => ({ cmd: COMMANDES.length, mv: MVTS.length, brouillons: COMMANDES.filter(c => c.st === 'brouillon').length, titre: (document.querySelector('#calque .panneau h2') || {}).textContent }));
  v('P3a un transfert crée UN mouvement et UN brouillon de commande de 4 kg chez le fournisseur', ap.mv === av.mv + 1 && ap.brouillons === av.brouillons + 1, { av, ap });
  const boutons = await E(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('  boutons de la commande :', JSON.stringify(boutons));
  v('P3b la fenêtre de la commande offre « Envoyer à … » et « Enregistrer sans envoyer »', boutons.some(b => /^Envoyer à/.test(b)) && boutons.some(b => /Enregistrer sans envoyer/.test(b)), boutons);
  await L.capture(c, CAP + 'rc-parcours-commande-' + tag + '.png');
  await p.keyboard.press('Escape'); await L.calme(p, 400);
  await L.aller(p, 'stock'); await L.calme(p, 400);
  const st = await E(() => { SX.onglet = SX.onglet; return JSON.stringify(MVTS[0]); }); console.log('  dernier mouvement :', st);
  v('P3c le mouvement du transfert dit « Demande de … » (on sait d’où vient le matériel)', /Demande de/.test(st), st);
  const dem = await E(() => DEM_ACHAT.find(d => d.id === 'da1').suite); v('P3d la demande dit où elle en est, en français', /transférés/.test(dem) && /commandés/.test(dem), dem);
  await devenir(p, 'tl', 'techfrais'); const t3 = await txt(p); v('P3e le technicien (Tom) lit la suite de sa demande (« transférés … commandés »)', /transférés|camion/.test(t3), t3.slice(0, 300));
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
