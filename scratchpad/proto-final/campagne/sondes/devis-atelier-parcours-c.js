// Parcours 4 à 8 : (4) l'accord du client par la VRAIE fenêtre (signature) et tout ce qui suit (intervention « à planifier », facture d'acompte,
// tâches, historique, chiffres du haut) ; (5) refus par le client puis refus noté au bureau, annulé ; (6) relance ; (7) nouvelle version ; (8) numéros.
// usage : node devis-atelier-parcours-c.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const fiche = p => p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, etat: ((document.querySelector('#contenu .tete .st') || {}).textContent || '').trim(), histo: [...document.querySelectorAll('#contenu .carte')].filter(k => /Historique/.test(k.querySelector('h3') ? k.querySelector('h3').textContent : '')).map(k => k.innerText.replace(/\s+/g, ' '))[0] || '', texte: document.getElementById('contenu').innerText.replace(/\s+/g, ' ') }));
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  // ── P4 : accord par signature ────────────────────────────────────────────────────────────────────────────────
  const av = await p.evaluate(() => ({ ints: INTS.length, fac: FACTURES.length, j: JOURNAL.length }));
  const k0 = await O.kpis(p);
  await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="client|D-2026-031"]'); await L.calme(p, 400);
  const ouv = await p.evaluate(() => ({ titre: (document.querySelector('#calque .surtitre') || {}).textContent, champs: [...document.querySelectorAll('#calque input, #calque canvas')].map(e => e.id), nom: (document.getElementById('dv-nom') || {}).value }));
  v('P4 : « Ce que voit le client » montre case, nom (déjà rempli) et signature', ouv.champs.includes('dv-ok') && ouv.champs.includes('dv-nom') && ouv.champs.includes('dv-signe') && ouv.nom, ouv);
  await L.capture(c, O.CAP + `P4-client-voit-${profil}.png`);
  // sans rien cocher
  await L.toucher(c, '[data-dv="signer|D-2026-031"]'); let er = await p.evaluate(() => (document.getElementById('dv-err') || {}).textContent);
  v('P4 : « Accepter » sans case cochée → « Cochez … » (vouvoiement)', /^Cochez/.test(er), er);
  await p.check('#dv-ok'); await p.fill('#dv-nom', ''); await L.toucher(c, '[data-dv="signer|D-2026-031"]'); er = await p.evaluate(() => document.getElementById('dv-err').textContent);
  v('P4 : sans nom → « Indiquez votre nom… »', /Indiquez votre nom/.test(er), er);
  await p.fill('#dv-nom', 'Marc Durand'); await L.toucher(c, '[data-dv="signer|D-2026-031"]'); er = await p.evaluate(() => document.getElementById('dv-err').textContent);
  v('P4 : sans signature → « Signez dans le cadre… »', /Signez/.test(er), er);
  // un simple point (clic sans tracé) compte-t-il comme signature ?
  const bb = await p.locator('#dv-signe').boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 20); await p.mouse.down(); await p.mouse.up();
  const sig1 = await p.evaluate(() => document.getElementById('dv-signe').dataset.signe || ''); v('devis-atelier-06 : un simple point dans le cadre n’est pas une signature (« Signez dans le cadre… »)', !sig1, sig1 ? 'un clic sans tracé a posé une signature' : '');
  // tracé complet
  await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
  await L.capture(c, O.CAP + `P4-signature-${profil}.png`);
  const dbl = await p.evaluate(() => { const b = document.querySelector('[data-dv="signer|D-2026-031"]'); b.click(); b.click(); return 1; }); await L.calme(p, 600);
  let f = await fiche(p); let ap = await p.evaluate(() => ({ ints: INTS.length, fac: FACTURES.length, j: JOURNAL.length, x: (({ e, signePar, via, int, num }) => ({ e, signePar, via, int, num }))(DEVIS_REG['D-2026-031']), tr: DEVIS_REG['D-2026-031'].trace.slice(-3) }));
  v('P4 : accord signé → état « Accepté », signataire noté', ap.x.e === 'accepte' && ap.x.signePar === 'Marc Durand' && /Accepté/.test(f.etat), [ap.x, f.etat]);
  v('P4 : une SEULE intervention créée (le double toucher ne double rien), « à planifier »', ap.ints === av.ints + 1 && await p.evaluate(() => INTS.filter(i => i.motif && /D-2026-031/.test(i.motif)).length === 1 && INTS.find(i => i.motif && /D-2026-031/.test(i.motif)).st === 'aplanifier'), [av, ap]);
  v('P4 : l’historique du devis note l’accord, une seule fois', (f.histo.match(/Accepté et signé en ligne/g) || []).length === 1, f.histo);
  v('P4 : la fiche propose « Planifier l’intervention »', await p.evaluate(() => !!document.querySelector('[data-dv="planifier|D-2026-031"]')));
  const k1 = await p.evaluate(() => 0); await L.aller(p, 'devis'); const kk = await O.kpis(p);
  console.log('  · chiffres avant/après :', JSON.stringify(k0.map(x => x.n)), JSON.stringify(kk.map(x => x.n)));
  const dd = await O.donnees(p); const sumAcc = dd.filter(x => x.e === 'accepte').reduce((s, x) => s + Math.round(x.ttc * 100), 0), nAcc = dd.filter(x => x.e === 'accepte').length;
  v('P4 : le chiffre « acceptés » recalculé = somme des TTC des devis acceptés au centime', L.cents(kk[2].n) === sumAcc && new RegExp('acceptés · ' + nAcc + '$').test(kk[2].l), [kk[2], sumAcc, nAcc]);
  const sumAtt = dd.filter(x => x.e === 'attente').reduce((s, x) => s + Math.round(x.ttc * 100), 0), nAtt = dd.filter(x => x.e === 'attente').length;
  v('P4 : le chiffre « en attente » recalculé = somme des TTC en attente au centime (et le nombre)', L.cents(kk[1].n) === sumAtt && new RegExp('en attente de réponse · ' + nAtt + '\\b').test(kk[1].l), [kk[1], sumAtt, nAtt]);
  const dec = dd.filter(x => x.num && ['accepte', 'refuse', 'expire'].includes(x.e)), taux = Math.round(100 * dec.filter(x => x.e === 'accepte').length / dec.length);
  v('P4 : le taux « des devis aboutissent » recalculé', parseInt(kk[3].n, 10) === taux && new RegExp(dec.length + ' décidés').test(kk[3].l), [kk[3], taux, dec.length]);
  // l'intervention est-elle visible dans Interventions, « à planifier » ?
  await L.aller(p, 'interventions'); const iv = await p.evaluate(() => /Durand/.test(document.getElementById('contenu').innerText) );
  console.log('  · Interventions parle de Durand :', iv);
  // l'acompte : devis 040 accepté sans facture d'acompte : « Préparer »
  await L.aller(p, 'devis-x-D-2026-040'); const n0 = await p.evaluate(() => FACTURES.length); await L.toucher(c, '[data-dv="acompte|D-2026-040"]'); await L.calme(p, 500);
  const ac = await p.evaluate(() => { const x = DEVIS_REG['D-2026-040'], f = FACTURES.find(o => o.id === x.facAcompte); return { n: FACTURES.length, f: f && { ht: f.ht, tva: f.tva, st: f.st, objet: f.objet, cli: f.cli }, ttc: dvTTC(x), acompte: x.acompte }; });
  const attAc = Math.round(Math.round(ac.ttc * 100) * 0.3);
  v('P4 : « Préparer » l’acompte : UNE facture ajoutée, 30 % du TTC du devis à ±1 centime', ac.n === n0 + 1 && ac.f && Math.abs(Math.round(ac.f.ht * (1 + ac.f.tva / 100) * 100) - attAc) <= 1, [ac, attAc]);
  await L.toucher(c, '[data-dv="acompte|D-2026-040"]'); v('P4 : un second « Préparer » ne double pas la facture', (await p.evaluate(() => FACTURES.length)) === n0 + 1);
  // ── P5 : refus ────────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis-x-D-2026-038'); await L.toucher(c, '[data-dv="client|D-2026-038"]');
  await L.toucher(c, '[data-dv="clientRefus|D-2026-038"]'); er = await p.evaluate(() => ({ t: document.getElementById('dv-err').textContent, b: document.querySelector('[data-dv="clientRefus|D-2026-038"]').textContent, e: DEVIS_REG['D-2026-038'].e }));
  v('P5 : « Refuser » demande confirmation (rien n’est refusé au premier toucher), le message vouvoie', er.e === 'attente' && /Voulez-vous/.test(er.t) && /Oui, refuser/.test(er.b), er);
  await L.toucher(c, '[data-dv="clientRefus|D-2026-038"]'); await L.calme(p, 400);
  v('P5 : confirmation → refusé', (await p.evaluate(() => DEVIS_REG['D-2026-038'].e)) === 'refuse');
  // refus noté au bureau + annuler
  await L.aller(p, 'devis-x-D-2026-027'.replace('027', '031')); // 031 est accepté maintenant : on reprend le devis de la suite
  const sui = await p.evaluate(() => DEVIS_SUITE.num); await L.aller(p, 'devis-x-' + sui); await L.toucher(c, '[data-dv="reponse|' + sui + '"]'); await L.calme(p, 300);
  await L.toucher(c, '[data-dv="repNon|' + sui + '"]'); let t = (await O.lire(p)).toast; v('P5 : « Il refuse » sans raison choisie → on demande pourquoi, rien ne change', /Choisis d.abord/.test(t) && (await p.evaluate(s => DEVIS_REG[s].e, sui)) === 'attente', t);
  await p.selectOption('#dvr-motif', 'Trop cher'); await L.toucher(c, '[data-dv="repNon|' + sui + '"]'); await L.calme(p, 400);
  v('P5 : refus noté → « Refusé » + motif, toast avec « Annuler »', (await p.evaluate(s => DEVIS_REG[s].e + '|' + DEVIS_REG[s].motif, sui)) === 'refuse|Trop cher' && /Annuler/.test((await O.lire(p)).toast));
  await L.toucher(c, '#toast button, #toast [data-toast], #toast .lien'); await L.calme(p, 400);
  v('P5 : « Annuler » rend le devis « en attente » et retire la ligne d’historique', (await p.evaluate(s => DEVIS_REG[s].e + '|' + DEVIS_REG[s].trace.filter(x => /Refus noté/.test(x[1])).length, sui)) === 'attente|0');
  // ── P6 : relance ─────────────────────────────────────────────────────────────────────────────────────────────
  await L.aller(p, 'devis-x-D-2026-038'.replace('038', '027')); // expiré : pas de relance
  v('P6 : un devis EXPIRÉ ne propose pas « Relancer »', !(await p.evaluate(() => !!document.querySelector('[data-dv^="relancer"]'))));
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
