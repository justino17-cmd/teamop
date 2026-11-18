// Restes devis-atelier, tour 1 : (j) « un numéro de devis ne se réutilise jamais » — supprimer un BROUILLON COMPOSÉ ne rend pas son numéro
// (devis ET contrat, dans la même séance ET après rechargement de la page). Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(250); };
  const numDe = f => f.evaluate(() => D().meta.numero);
  const supprimer = async f => { await clic(f, '#b-plus'); await p.waitForTimeout(350); await clic(f, '.menu button:has-text("Supprimer ce brouillon")'); await p.waitForTimeout(500); await clic(f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(1200); };
  const retour = async f => { await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1000); };
  const n = s => +s.replace(/\D+/g, '').slice(-3);
  // ── devis ──
  let f = await A.ouvrirAtelier(c, 'devis', 'devis'); v('population : l’atelier de devis s’ouvre', !!f);
  await A.composerDevis(c, f, { client: 'vp', objet: 'Brouillon à supprimer', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a1 = await numDe(f); await supprimer(f); await p.waitForTimeout(6300);
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Brouillon suivant', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a2 = await numDe(f);
  v(`(j) devis : le brouillon supprimé (${a1}) ne rend pas son numéro, le suivant prend ${a2}`, n(a2) === n(a1) + 1, { a1, a2 });
  // le suivant, gardé cette fois : un troisième s'ajoute à la suite
  await retour(f); await p.waitForTimeout(6300);
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'vp', objet: 'Troisième', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a3 = await numDe(f); v(`(j) devis : le troisième suit le deuxième gardé (${a3})`, n(a3) === n(a2) + 1, { a2, a3 });
  await supprimer(f); await p.waitForTimeout(6300);
  // après RECHARGEMENT de la page (le brouillon supprimé n'est plus nulle part dans le rangement) : le numéro ne revient pas
  await p.reload({ waitUntil: 'load' }); await L.calme(p, 1500);
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  await A.composerDevis(c, f, { client: 'hp', objet: 'Après rechargement', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const a4 = await numDe(f);
  v(`(j) devis : après rechargement, le numéro du brouillon supprimé (${a3}) ne revient pas : ${a4}`, n(a4) > n(a3), { a3, a4 });
  await retour(f); await p.waitForTimeout(6300);
  // ── contrat ──
  f = await A.ouvrirAtelier(c, 'contrat', 'contrats');
  v('population : l’atelier de contrats s’ouvre', !!f);
  if (f) {
    await A.composerContrat(c, f, { client: 'vp', titre: 'Contrat à supprimer' });
    const k1 = await numDe(f); await supprimer(f); await p.waitForTimeout(6300);
    f = await A.ouvrirAtelier(c, 'contrat', 'contrats');
    await A.composerContrat(c, f, { client: 'hp', titre: 'Contrat suivant' });
    const k2 = await numDe(f);
    v(`(j) contrat : le brouillon supprimé (${k1}) ne rend pas son numéro, le suivant prend ${k2}`, n(k2) === n(k1) + 1, { k1, k2 });
  }
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); process.exit(2); });
