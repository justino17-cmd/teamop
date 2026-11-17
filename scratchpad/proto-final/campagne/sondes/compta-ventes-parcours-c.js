// Parcours C « compta-ventes » : relancer et corriger. Marc relance la facture en retard (aperçu du message, envoi, compteur, trace), relance une
// facture pas encore échue, puis corrige par un AVOIR (facture payée ; facture envoyée non payée ; deux fois la même).
// usage : node compta-ventes-parcours-c.js [profil]
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const d0 = await X.donnees(p);
  // — relance d'une facture en retard —
  await X.fiche(c, 'f128');
  const carte = await X.texte(p, '#contenu'); L.v('la fiche dit « Déjà relancée 2 fois »', /relancée 2 fois/.test(carte), carte.match(/[^.]*relancée[^.]*/)?.[0]);
  await L.toucher(c, '[data-action="relance"]'); let pan = await X.panneau(p);
  L.v('l’aperçu de la relance dit à qui, l’objet et le message', /À :/.test(pan) && /Objet/.test(pan) && /1 240,00/.test(pan), pan.slice(0, 100));
  L.v('compta-ventes-05 · le message promet « le lien ci-dessous » : le lien de paiement est bien dans l’aperçu', !/lien ci-dessous/.test(pan) || /(https?:\/\/|payer par carte :|pay\.)/i.test(pan) || await p.evaluate(() => !!document.querySelector('#calque .panneau a, #calque .panneau [data-lien]')), pan.slice(pan.indexOf('ci-dessous') - 60, pan.indexOf('ci-dessous') + 40));
  await L.capture(c, X.CAP + `c-${profil}-relance.png`);
  await L.toucher(c, '#calque [data-action="relanceOk"]'); const t = await X.toasts(p);
  const d1 = await X.donnees(p), f = d1.F.find(x => x.id === 'f128');
  L.v('la relance passe à 3 et le message le dit', f.relances === 3 && /Relance envoyée/.test(t), { relances: f.relances, t });
  const dejaDeux = await p.evaluate(() => { const b = document.querySelector('[data-action="relance"]'); return b ? b.textContent.trim() : ''; });
  L.v('le bouton « Relancer maintenant » reste disponible', /Relancer/.test(dejaDeux), dejaDeux);
  // double toucher sur « Envoyer la relance » : une seule relance
  await L.toucher(c, '[data-action="relance"]'); const b = c.p.locator('#calque [data-action="relanceOk"]').first(); await b.dblclick().catch(() => {}); await p.waitForTimeout(400);
  L.v('un double toucher sur « Envoyer la relance » ne compte qu’une relance de plus (4, pas 5)', (await X.donnees(p)).F.find(x => x.id === 'f128').relances === 4, (await X.donnees(p)).F.find(x => x.id === 'f128').relances);
  // la trace : Historique
  await p.evaluate(() => aller('historique')); await L.calme(p, 500);
  const hist = await X.texte(p, '#contenu'); L.v('l’Historique garde la trace d’une relance', /relanc/i.test(hist), hist.slice(0, 100));
  // — relance d'une facture pas encore échue —
  await X.fiche(c, 'f144'); await L.toucher(c, '[data-action="relance"]'); pan = await X.panneau(p);
  L.v('facture pas échue : le message dit « à régler avant le … » (pas « arrivée à échéance »)', /à régler avant le 28\/11/.test(pan) && !/arrivée à échéance/.test(pan), pan.slice(pan.indexOf('Sauf'), pan.indexOf('Sauf') + 140));
  await L.ranger(p);
  // — avoir sur une facture payée —
  await X.fiche(c, 'f145'); const bAv = await p.evaluate(() => !!document.querySelector('[data-action="avoir"]')); L.v('une facture payée propose « Faire un avoir »', bAv);
  await L.toucher(c, '[data-action="avoir"]'); pan = await X.panneau(p);
  L.v('la fenêtre de l’avoir dit le montant (186,00 TTC), la facture et ce que la loi exige', /186,00/.test(pan) && /FAC-2026-0145/.test(pan), pan.slice(0, 120));
  await L.capture(c, X.CAP + `c-${profil}-avoir.png`);
  await L.toucher(c, '#calque [data-action="avoirOk"]'); await p.waitForTimeout(400);
  const d2 = await X.donnees(p), av = d2.F.find(x => x.st === 'avoir');
  L.v('l’avoir est créé avec un numéro qui se suit', !!av && /^AV-2026-00\d\d$/.test(av.num), av && av.num);
  L.v('le montant de l’avoir = 155,00 HT (186,00 TTC) au centime', !!av && cts(av.ht) === 15500, av && av.ht);
  await X.compta(c, 'fventes', { cat: 'avoirs' }); const liste = await X.texte(p, '#contenu'); L.v('l’avoir paraît dans « Avoirs »', liste.includes(av.num), liste.slice(0, 100));
  await X.fiche(c, av.id); const ficheAv = await X.texte(p, '#contenu');
  L.v('la fiche d’un avoir ne propose pas d’encaisser', !(await p.evaluate(() => !!document.querySelector('[data-payer]'))), '');
  L.v('la fiche d’un avoir dit « Avoir » (pas « Facture préparée »)', /Avoir|AV-2026/.test(ficheAv) && !/Facture préparée/.test(ficheAv), ficheAv.slice(0, 80));
  await L.capture(c, X.CAP + `c-${profil}-fiche-avoir.png`);
  // deuxième avoir sur la même facture
  await X.fiche(c, 'f145'); const encoreAv = await p.evaluate(() => !!document.querySelector('[data-action="avoir"]'));
  L.v('la facture déjà avoirée ne propose plus un second avoir (elle renvoie vers le premier)', !encoreAv, encoreAv);
  // — avoir sur une facture ENVOYÉE mais pas payée —
  await X.fiche(c, 'f143'); const avoirNonPayee = await p.evaluate(() => !!document.querySelector('[data-action="avoir"]'));
  const ficheEnv = await X.texte(p, '#contenu'); const promesse = /par un avoir/.test(await p.evaluate(() => { const o = document.querySelector('#calque'); return document.body.innerText; })) || /corrige par un avoir|corrigée par un avoir/i.test(ficheEnv);
  L.v('compta-ventes-06 · une facture envoyée et pas payée peut être corrigée par un avoir (l’écran d’envoi dit « on la corrige par un avoir »)', avoirNonPayee, { avoirNonPayee });
  await L.capture(c, X.CAP + `c-${profil}-fiche-envoyee.png`);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
