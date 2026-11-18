// Restes devis-atelier, tour 1 : RECONTRÔLE ADVERSE de ce que le correcteur annonce « corrigé » et de ses voisins.
// A. numéros : suppression par le menu « ⋯ » de la LISTE (pas seulement par l'éditeur), copie (Dupliquer) puis suppression, numéro retapé à la main
//    puis supprimé, devis ET contrat — un numéro déjà donné ne revient jamais.
// B. mots : tout le parcours d'envoi et de signature de l'atelier d'OP GESTION, y compris le message de « Effacer la signature » (le correcteur ne l'avait pas relu).
// Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. Usage : node restes-devis-atelier-recontrole-1.js [profil] [nuit]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p;
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(300); };
  const numDe = f => f.evaluate(() => D().meta.numero);
  const n = s => +String(s).replace(/\D+/g, '').slice(-3);
  const retour = async f => { await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1000); };
  const confirmer = async f => { await p.waitForTimeout(500); await clic(f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(1200); };
  const toast = f => f.evaluate(() => { const t = document.querySelector('#toast, .toast'); return t ? t.innerText.replace(/\s+/g, ' ') : ''; });
  const texte = f => f.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const MOT = /exemple|rien n.est vraiment|rejouer/i;

  // ── A1. un brouillon composé supprimé : le DEVIS RAPIDE du parent (dvNum) et le contrat du parent (ctrNum) ne reprennent pas son numéro non plus ──
  let f = await A.ouvrirAtelier(c, 'devis', 'devis'); v('population : l’atelier de devis s’ouvre', !!f);
  await A.composerDevis(c, f, { client: 'vp', objet: 'Pour le devis rapide', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a1 = await numDe(f);
  const dvAvant = await p.evaluate(() => dvNum());
  v(`population : avec le brouillon ${a1} dans la liste, le devis rapide prendrait ${dvAvant}`, n(dvAvant) === n(a1) + 1, { a1, dvAvant });
  await clic(f, '#b-plus'); await p.waitForTimeout(350); await clic(f, '.menu button:has-text("Supprimer ce brouillon")'); await confirmer(f); await p.waitForTimeout(6300);
  const dvApres = await p.evaluate(() => dvNum());
  v(`A1 le brouillon composé ${a1} supprimé : le devis rapide ne reprend pas son numéro (il prendrait ${dvApres})`, n(dvApres) > n(a1), { a1, dvApres });
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Suivant', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a2 = await numDe(f);
  v(`A1 l’atelier, lui, ne le reprend pas (${a2})`, n(a2) > n(a1), { a1, a2 });
  // contrat du parent
  await retour(f); await p.waitForTimeout(6300);
  f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); v('population : l’atelier de contrats s’ouvre', !!f);
  let a3 = a2;
  if (f) {
    await A.composerContrat(c, f, { client: 'vp', titre: 'Contrat pour le parent' });
    const k1 = await numDe(f);
    const ctAvant = await p.evaluate(() => ctrNum());
    v(`population : avec le brouillon ${k1} dans la liste, le contrat du parent prendrait ${ctAvant}`, n(ctAvant) === n(k1) + 1, { k1, ctAvant });
    await clic(f, '#b-plus'); await p.waitForTimeout(350); await clic(f, '.menu button:has-text("Supprimer ce brouillon")'); await confirmer(f); await p.waitForTimeout(6300);
    const ctApres = await p.evaluate(() => ctrNum());
    v(`A1 le contrat composé ${k1} supprimé : le contrat du parent ne reprend pas son numéro (il prendrait ${ctApres})`, n(ctApres) > n(k1), { k1, ctApres });
  }
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'vp', objet: 'Avant retapé', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  a3 = await numDe(f);

  // ── A3. numéro retapé à la main puis supprimé : le plus haut donné est retenu ──
  const haut = 'D-2026-' + String(n(a3) + 20).padStart(3, '0');
  await f.evaluate(h => { D().meta.numero = h; sauverStock && sauverStock() }, haut);
  await p.waitForTimeout(300);
  await clic(f, '#b-plus'); await p.waitForTimeout(350); await clic(f, '.menu button:has-text("Supprimer ce brouillon")'); await confirmer(f); await p.waitForTimeout(6300);
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Après le numéro retapé', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a4 = await numDe(f);
  v(`A3 un numéro retapé à la main (${haut}) puis supprimé ne revient pas : le suivant est ${a4}`, n(a4) === n(haut) + 1 || n(a4) > n(haut), { haut, a4 });
  await retour(f); await p.waitForTimeout(6300);

  // ── B. les mots, tout le parcours de signature (devis), message d'effacement compris ──
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'md', objet: 'Split salon', articles: [{ ref: 'DKO-K4V', qte: 1 }] }); await p.waitForTimeout(500);
  await clic(f, '[data-act="envoyer"]:visible'); await p.waitForTimeout(500); await clic(f, '[data-act="env-go"]'); await p.waitForTimeout(1300);
  await clic(f, '[data-act="apercu"]:visible'); await p.waitForTimeout(600);
  await f.evaluate(() => { const i = document.querySelector('#ap-client'); if (i && !i.checked) i.click(); }); await p.waitForTimeout(600);
  await clic(f, '[data-act="ap-signer"]'); await f.evaluate(() => { const x = document.querySelector('#sg-lu'); if (x) x.click(); });
  await clic(f, '[data-act="sg-texte"]'); await f.locator('#sg-nom').fill('Marie Dupuis'); await p.waitForTimeout(200); await clic(f, '[data-act="sg-valider"]'); await p.waitForTimeout(900);
  await clic(f, '[data-act="ap-rejouer"]'); await p.waitForTimeout(700);
  const te = await toast(f);
  v(`B le message d’« Effacer la signature » ne parle pas d’exemple (« ${te} »)`, !MOT.test(te) && te.length > 0, te);
  v('B tout l’écran, après l’effacement, ne parle pas d’exemple', !MOT.test(await texte(f)), (await texte(f)).match(MOT));
  if (process.env.CAPT) await L.capture(c, O.CAP + `recontrole1-efface-${profil}${nuit ? '-nuit' : ''}.png`);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); await L.fermer(); process.exit(2); });
