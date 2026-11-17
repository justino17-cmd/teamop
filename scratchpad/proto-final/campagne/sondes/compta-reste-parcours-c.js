// Parcours C « compta-reste » : les notes de frais (valider, refuser, sans ticket, règle du patron), et ce que ça change ailleurs.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const S = () => p.evaluate(() => ({ att: NDF.filter(n => n.etat === 'attente').length, val: NDF.filter(n => n.etat === 'validee').length, ref: NDF.filter(n => n.etat === 'refusee').length, ach: ACHATS.length, tva: cpTva(), ens: cpEcritures().length,
    d: Math.round(cpEcritures().reduce((s, e) => s + e.lignes.reduce((t, l) => t + (l.de || 0), 0), 0) * 100), cr: Math.round(cpEcritures().reduce((s, e) => s + e.lignes.reduce((t, l) => t + (l.cr || 0), 0), 0) * 100) }));
  await X.compta(c, 'ndf'); const s0 = await S(); v('C0 trois notes attendent, une est déjà validée', s0.att === 3 && s0.val === 1, s0);
  await L.capture(c, X.CAP + `${profil}-parcours-c-ndf.png`);
  // n1 : avec ticket → Valider
  await L.toucher(c, '[data-cx="doc|ndf|n1"]'); const f1 = await X.panneau(p); v('C1 la fiche de Tom dit le montant (16,50 €), la TVA (10 %) et le ticket', /16,50/.test(f1) && /10 %/.test(f1) && /ticket/i.test(f1), f1.slice(0, 200));
  await L.capture(c, X.CAP + `${profil}-parcours-c-fiche.png`);
  await L.toucher(c, '#calque [data-ac="ndfok|n1"]'); const s1 = await S(); const t1 = await X.toasts(p);
  v('C1 « Valider » : une note de moins en attente, une validée de plus', s1.att === 2 && s1.val === 2, s1); v('C1 elle devient une dépense (une pièce de plus aux achats)', s1.ach === s0.ach + 1, { avant: s0.ach, apres: s1.ach });
  v('C1 la TVA de 1,50 € (16,50 TTC à 10 %) est comptée : récupérable, ou signalée « non récupérée tant que la facture manque » (au centime)', Math.abs((s1.tva.ded - s0.tva.ded) + (s1.tva.manque - s0.tva.manque) - 1.5) < .005, { ded: [s0.tva.ded, s1.tva.ded], manque: [s0.tva.manque, s1.tva.manque] }); v('C1 le message dit le montant remboursé et que c’est avec la paie', /16,50/.test(t1) && /paie/.test(t1), t1); v('C1 journal équilibré', s1.d === s1.cr, s1); v('C1 la fenêtre se ferme et un message le dit', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))) && !!t1, t1);
  // n3 : sans ticket → confirmation
  await L.toucher(c, '[data-cx="doc|ndf|n3"]'); const f3 = await X.panneau(p); v('C2 la note sans ticket le dit et propose de le demander', /Pas de ticket/.test(f3) && /Demander le ticket/i.test(f3), f3.slice(0, 260));
  await L.toucher(c, '#calque [data-ac^="ndfsans|n3"]'); const q = await X.panneau(p); v('C2 « Valider sans ticket… » pose une question avant de valider', /justificatif/i.test(q) && (await S()).val === 2, q.slice(0, 220));
  await L.capture(c, X.CAP + `${profil}-parcours-c-sans-ticket.png`);
  await L.toucher(c, '#calque [data-ac="ndfoksans|n3"]'); const s3 = await S(); v('C2 après « Oui, valider sans justificatif » : validée', s3.val === 3 && s3.att === 1, s3);
  await X.compta(c, 'ndf'); const tx = await X.texte(p); v('C2 la note validée sans ticket est listée à part, avec qui l’a validée', /Validées sans justificatif/.test(tx), tx.slice(-300));
  // n2 : refuser — la raison est demandée (motifs courants), puis « Annuler » du message
  await L.toucher(c, '[data-cx="doc|ndf|n2"]'); await L.toucher(c, '#calque [data-ac="ndfnon|n2"]'); const mq = await X.panneau(p); v('C3 « Refuser » demande pourquoi (motifs proposés)', /Pourquoi/i.test(mq) && /illisible|dépense de l.entreprise/.test(mq), mq.slice(0, 200));
  await L.toucher(c, '#calque [data-axa^="nonok|"]'); const sv = await S(); const tv = await X.toasts(p); v('C3 refuser sans motif est refusé avec une phrase', (await S()).ref === 0 && /explique|pourquoi/i.test(tv), { ref: sv.ref, tv });
  await L.toucher(c, '#calque [data-axa^="chip|"]'); await L.toucher(c, '#calque [data-axa^="nonok|"]'); const s4 = await S(); const t4 = await X.toasts(p);
  v('C3 avec un motif : refusée, la personne reçoit le motif', s4.ref === 1 && /motif/.test(t4), { ref: s4.ref, t4 });
  const ann = await L.toucher(c, '#toast button, #toast [data-act], #toast a'); const s5 = await S(); v('C3 « Annuler » du message remet la note en attente', ann && s5.att === 1 && s5.ref === 0, { ann, att: s5.att, ref: s5.ref });
  // la règle du patron : exiger un ticket
  await X.compta(c, 'ndf'); await L.toucher(c, '[data-ndfregle="1"]'); v('C4 la case « Permettre sans ticket » se décoche et le dit', (await X.toasts(p)).length > 0 && await p.evaluate(() => NDF_REGLE.sansTicket === false));
  // il n'y a plus de note sans ticket à tester (n3 validée) : on remet n3 en attente sans ticket pour voir le bouton grisé
  await p.evaluate(() => { const n = NDF.find(o => o.id === 'n3'); n.etat = 'attente'; n.recu = false; rendre(); }); await L.toucher(c, '[data-cx="doc|ndf|n3"]');
  const g = await p.evaluate(() => { const b = document.querySelector('#calque [data-ac="ndfok|n3"], #calque .actions .btn[disabled]'); return b ? { dis: b.disabled, title: b.title, txt: b.textContent } : null; });
  v('C4 règle « ticket obligatoire » : « Valider » est grisé ET une phrase dit pourquoi', !!g && g.dis && (/ticket/i.test(g.title) || /ticket/i.test((await X.panneau(p)))), g); await L.capture(c, X.CAP + `${profil}-parcours-c-grise.png`);
  // le remboursement avec la paie : les notes validées apparaissent-elles dans la paie ?
  await p.keyboard.press('Escape'); await X.compta(c, 'fiches'); const fiches = await X.texte(p); console.log('C5 (info) la page Fiches de paie parle des frais :', /frais/i.test(fiches));
  v('C erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
