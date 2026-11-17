// Parcours 13 : « Composer un contrat » — le chemin (Contrats › atelier › liste), les numéros (une seule série CTR-2026-…, contrat rapide compris),
// le contrat signé dans l'atelier et ce qu'en dit OP GESTION. usage : node devis-atelier-parcours-f.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }), p = c.p; await L.calme(p, 600);
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(350); };
  const k0 = await O.kpis(p), nCtr0 = await p.evaluate(() => CONTRATS.length);
  const boutons = await p.evaluate(() => [...document.querySelectorAll('#contenu .actions button, #contenu .tete button')].map(b => b.textContent.trim()));
  v('P13 : Contrats offre « Composer un contrat » et « Contrat rapide »', boutons.some(t => /Composer un contrat/.test(t)) && boutons.some(t => /Contrat rapide/.test(t)), boutons);
  let f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
  v('P13 : « Composer un contrat » ouvre l’atelier (titre « Nouveau contrat »)', !!f && /Nouveau contrat/.test(await f.evaluate(() => (document.querySelector('.fenetre') || document.body).innerText)));
  await L.capture(c, O.CAP + `P13-compositeur-contrat-${profil}.png`);
  await A.composerContrat(c, f, { client: 'mi', titre: 'Entretien annuel des 12 climatiseurs', prix: '1234,56' });
  const d = await f.evaluate(() => ({ vue: S.vue, n: S.docs.length, d: S.docs.map(x => ({ nom: x.nom, num: x.meta.numero, etat: x.etat })) }));
  v('P13 : « Créer le contrat » ouvre l’éditeur sur un contrat à numéro CTR-2026-…', d.vue === 'editeur' && /^CTR-2026-\d{3}$/.test(d.d[0].num), d);
  await L.capture(c, O.CAP + `P13-editeur-contrat-${profil}.png`);
  await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  let e = await O.lire(p); v('P13 : « ‹ OP GESTION » ramène à Contrats', e.h1 === 'Contrats' && !e.atelier, [e.h1, e.atelier]);
  const k1 = await O.kpis(p); console.log('  · chiffres avant/après :', JSON.stringify(k0.map(x => x.n)), JSON.stringify(k1.map(x => x.n)));
  const lst = await p.evaluate(() => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  v('P13 : le contrat composé paraît dans la liste « composés » (numéro, client, état, prix)', lst.some(s => /CTR-2026/.test(s) && /Mimosas/.test(s)), lst);
  v('P13 : le prix annuel saisi (1234,56) est celui de la ligne', lst.some(s => /1\s?234,56/.test(s.replace(/[  ]/g, ' '))), lst);
  // numéros : contrat rapide, puis un second composé
  const num0 = await p.evaluate(() => ctrNum()); console.log('  · prochain numéro de contrat :', num0);
  await L.aller(p, 'contrat-nouveau'); await p.selectOption('[data-b="cli"]', 'cm'); const n1 = await p.evaluate(() => CONTRATS.length); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
  const rap = await p.evaluate(n => CONTRATS.length > n ? CONTRATS[CONTRATS.length - 1].num : null, n1);
  const at = await p.evaluate(() => ATD.docs.filter(x => x.type === 'contrat').map(x => x.numero));
  v('P13 : le contrat RAPIDE prend un numéro qui n’existe dans aucun contrat composé', !!rap && !at.includes(rap), [rap, at]);
  f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); await L.calme(p, 900); await A.composerContrat(c, f, { client: 'mi', titre: 'Second contrat', prix: '300' });
  const nn = await f.evaluate(() => S.docs.map(x => x.meta.numero)); await clic(f, '[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  const tous = await p.evaluate(() => [...CONTRATS.map(k => k.num), ...ATD.docs.filter(x => x.type === 'contrat').map(x => x.numero)]);
  v('P13 : une seule série : aucun numéro de contrat en double (rapides et composés)', new Set(tous).size === tous.length, tous);
  // fiche client : « Composer un devis » / contrat depuis la fiche d'un client
  await L.aller(p, 'client-x-hp'); const fc = await p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu a')].filter(b => b.offsetParent).map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(t => /devis|contrat/i.test(t)));
  console.log('  · boutons devis/contrat de la fiche client :', JSON.stringify(fc));
  v('P13 : la fiche client offre « Composer un devis » et « Devis rapide »', fc.some(t => /Composer un devis/.test(t)) && fc.some(t => /Devis rapide/.test(t)), fc);
  f = await A.ouvrirAtelier(c, 'devis', 'client-x-hp', '[data-opd="devis"][data-cli="hp"]'); await L.calme(p, 900);
  const pre = f ? await f.evaluate(() => ({ cl: (document.querySelector('[data-vv="client"].on, [data-vv="client"][aria-pressed="true"], [data-vv="client"].sel') || {}).textContent, ap: (document.querySelector('.vv-apercu, .fenetre') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 2000) })) : null;
  v('P13 : « Composer un devis » depuis la fiche d’Hôtel de la Plage arrive avec ce client déjà choisi', !!pre && /Hôtel de la Plage/.test(pre.ap), pre && pre.cl);
  if (f) { await clic(f, '.vv-retour'); await p.waitForTimeout(600); await f.locator('.dialogue [data-r="1"]').first().click({ timeout: 800 }).catch(() => {}); await p.waitForTimeout(800); }
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
