// Parcours 9 à 12 : l'atelier (« Composer un devis ») vu depuis OP GESTION — (9) ouvrir/fermer, abandon, devis vide ; (10) client créé dans l'atelier ;
// (11) UNE seule série de numéros entre devis composés et devis rapides ; (12) l'accord du client sur un devis COMPOSÉ : que devient la suite
// (intervention à planifier, facture d'acompte, chiffres) ? usage : node devis-atelier-parcours-e.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(350); };
  const k0 = await O.kpis(p), nbl0 = (await O.liste(p)).length;
  // ── P9 : ouvrir, taper un peu, abandonner ─────────────────────────────────────────────────────────────────────
  let f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 800);
  v('P9 : l’atelier s’ouvre', !!f);
  await f.locator('#vv-objet').fill('Un début de devis'); await f.locator('#vv-objet').press('Tab'); await p.waitForTimeout(300);
  await clic(f, '.vv-retour'); await p.waitForTimeout(500);
  const conf = await f.evaluate(() => { const d = document.querySelector('.dialogue'); return d ? d.innerText.replace(/\s+/g, ' ') : ''; });
  v('P9 : quitter avec du contenu demande confirmation, en français clair', /Abandonner/.test(conf) && /Continuer/.test(conf), conf);
  await L.capture(c, O.CAP + `P9-abandon-${profil}.png`);
  const r = await f.evaluate(() => [...document.querySelectorAll('.dialogue button')].map(b => b.textContent.trim()));
  await clic(f, '.dialogue [data-r="1"]'); await p.waitForTimeout(1200);
  let e = await O.lire(p); v('P9 : « Abandonner » ferme l’atelier et ramène à Devis', !e.atelier && e.h1 === 'Devis', [e.atelier, e.h1, r]);
  const k1 = await O.kpis(p); v('P9 : rien n’a été créé par un abandon (chiffres et lignes inchangés)', JSON.stringify(k0) === JSON.stringify(k1) && (await O.liste(p)).length === nbl0, [k0, k1]);
  // ── devis VIDE (aucun client, aucune ligne) ────────────────────────────────────────────────────────────────────
  f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 800); await clic(f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1200);
  const vide = await f.evaluate(() => ({ vue: S.vue, n: S.docs.length, d: S.docs.map(d => ({ nom: d.nom, etat: d.etat, ttc: calculer(d).ttc, cl: (d.blocs.find(b => b.type === 'client') || {}).client })) }));
  console.log('  · devis vide :', JSON.stringify(vide));
  await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1000); await L.toucher(c, '[data-dvf="aenvoyer"]');
  const lv = await O.liste(p); const ligneVide = lv.find(s => /Sans client|sans client|Client à renseigner|undefined|NaN/i.test(s) || /^\s*Brouillon/.test(s) && !/D-2026/.test(s));
  console.log('  · lignes de « À envoyer » :', JSON.stringify(lv));
  v('P9 : un devis vide créé s’affiche proprement dans la liste (jamais « undefined » ni « NaN »)', !lv.some(s => /undefined|NaN|null/.test(s)), lv);
  await L.capture(c, O.CAP + `P9-liste-devis-vide-${profil}.png`);
  // ── P10 : client créé dans l'atelier ─────────────────────────────────────────────────────────────────────────
  const nCli0 = await p.evaluate(() => Object.keys(CLIENTS).length);
  f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 800); await clic(f, '[data-vv="client-nouveau"]');
  const ch = f.locator('.fen-v input'); await ch.nth(0).fill('Boulangerie Les Épis Dorés'); await ch.nth(1).fill('8 rue des Halles'); await ch.nth(2).fill('17000'); await ch.nth(3).fill('La Rochelle'); await ch.nth(4).fill('epis@mail.fr'); await ch.nth(5).fill('05 46 11 22 33');
  await clic(f, '.fen-v [data-act="ok"], .fen-v .primaire, .fen-v button:has-text("Ajouter ce client")'); await p.waitForTimeout(900);
  await f.locator('#vv-objet').fill('Chambre froide'); await clic(f, '[data-vv="art-add"][data-id="EL-ALL"]'); await L.calme(p, 400);
  await clic(f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1200); await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  const nCli1 = await p.evaluate(() => Object.keys(CLIENTS).length), cn = await p.evaluate(() => { const k = Object.keys(CLIENTS).pop(); return { k, ...CLIENTS[k] }; });
  v('P10 : le client créé dans l’atelier arrive dans les clients d’OP GESTION (+1, nom, e-mail, téléphone, adresse)', nCli1 === nCli0 + 1 && cn.nom === 'Boulangerie Les Épis Dorés' && cn.mail === 'epis@mail.fr' && /Halles/.test(cn.adr), cn);
  await L.aller(p, 'clients'); v('P10 : il paraît dans la liste des Clients', await p.evaluate(() => /Épis Dorés/.test(document.getElementById('contenu').innerText)));
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="nouveau"]'); v('P10 : et dans le choix de « Devis rapide »', await p.evaluate(() => /Épis Dorés/.test(document.getElementById('dvn-cli').innerText)));
  await L.ranger(p);
  // ── P11 : une seule série de numéros ─────────────────────────────────────────────────────────────────────────
  const nums = async () => p.evaluate(() => ({ dv: DV.map(x => x.num).filter(Boolean), at: ATD.docs.filter(x => x.type === 'devis').map(x => x.numero) }));
  let N = await nums(); console.log('  · numéros après les devis composés :', JSON.stringify(N));
  // devis rapide envoyé : BR1
  const num = await O.A.envoyerRapide(c); N = await nums();
  const tous = [...N.dv, ...N.at].filter(Boolean);
  v('P11 : le devis rapide envoyé reçoit un numéro qui n’existe dans AUCUN devis composé', !!num && N.at.filter(x => x === num).length === 0, [num, N]);
  v('P11 : aucun numéro en double entre devis rapides et devis composés', new Set(tous).size === tous.length, tous);
  f = await A.ouvrirAtelier(c, 'devis', 'devis'); await L.calme(p, 800); await A.composerDevis(c, f, { client: 'hp', objet: 'Après le rapide', articles: [{ ref: 'EL-ALL', qte: 1 }] });
  const nn = await f.evaluate(() => S.docs.map(d => d.meta.numero)); await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  N = await nums(); const t2 = [...N.dv, ...N.at].filter(Boolean);
  v('P11 : le devis composé APRÈS le rapide prend le numéro suivant (aucun doublon)', new Set(t2).size === t2.length, [nn, t2]);
  // ── P12 : accord du client sur un devis composé ─────────────────────────────────────────────────────────────
  const av = await p.evaluate(() => ({ ints: INTS.length, fac: FACTURES.length }));
  f = await A.ouvrirAtelier(c, 'devis', 'devis'); await L.calme(p, 800); await A.composerDevis(c, f, { client: 'md', objet: 'Split salon', articles: [{ ref: 'DKO-K4V', qte: 1 }] });
  await clic(f, '[data-act="envoyer"]:visible'); await clic(f, '[data-act="env-go"]'); await p.waitForTimeout(600);
  await clic(f, '[data-act="apercu"]:visible'); await p.waitForTimeout(500); await f.locator('#vue-apercu input[type=checkbox], #vue-apercu .interrupteur').first().click().catch(() => {}); await p.waitForTimeout(500);
  const sg = await f.locator('[data-act="ap-signer"]').count(); console.log('  · bouton de signature du client dans l’aperçu :', sg);
  if (sg) { await clic(f, '[data-act="ap-signer"]'); await p.waitForTimeout(500);
    await f.evaluate(() => { const c = document.querySelector('#sg-lu'); if (c) c.click(); });
    await clic(f, '[data-act="sg-texte"]'); await f.locator('#sg-nom').fill('Marc Durand'); await p.waitForTimeout(200);
    await clic(f, '[data-act="sg-valider"]'); await p.waitForTimeout(800); }
  await L.capture(c, O.CAP + `P12-signe-${profil}.png`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await clic(f, '[data-act="apercu-fermer"]').catch(() => {}); await clic(f, '[data-act="retour"]:visible').catch(() => {}); await p.waitForTimeout(1100);
  const ap = await p.evaluate(() => ({ ints: INTS.length, fac: FACTURES.length, doc: ATD.docs.find(x => /Split salon/.test(x.nom)) }));
  console.log('  · après la signature dans l’atelier :', JSON.stringify(ap));
  v('P12 : le devis composé est « signé » dans la liste d’OP GESTION', ap.doc && ap.doc.etat === 'signe', ap.doc);
  v('P12-défaut-03 : l’accord d’un devis composé prépare, comme pour un devis rapide, l’intervention « à planifier » (promesse de la page Devis)', ap.ints === av.ints + 1, [av, ap]);
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dvf="accepte"]'); const la = await O.liste(p);
  v('P12 : le devis signé est dans « Acceptés » et compté', la.some(s => /Split salon/.test(s)), la);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
