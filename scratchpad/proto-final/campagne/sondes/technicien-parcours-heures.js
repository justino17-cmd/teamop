// Parcours « Mes heures » du technicien (campagne du 17 novembre 2026) : confirmer ses heures, signaler une erreur, commencer et finir sa journée,
// puis le gérant le voit-il. L'écran est en refonte (Temps de travail) : les défauts relevés ici portent zone:"refonte" dans le rapport.
// Usage : node technicien-parcours-heures.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'mesheures' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  await L.aller(p, 'mesheures');
  v('H0 « Mes heures » : titre et totaux', /Mes heures/.test(await txt(p, '#contenu h1')) && /cette semaine/.test(await txt(p)), (await txt(p)).slice(0, 120));
  // H1 : confirmer ses heures du mois
  const avant = await p.evaluate(() => JSON.stringify(PAIE.confirmes.sm || null));
  await L.toucher(c, '[data-tt^="mhconf|"]'); await L.calme(p, 500);
  let t = await toast(), pan = await txt(p, '#calque .panneau');
  if (/pas terminée/.test(pan)) { await L.toucher(c, '[data-tt^="mhconfok"]'); await L.calme(p, 500); t = await toast(); }
  const apres = await p.evaluate(() => JSON.stringify(PAIE.confirmes.sm || null));
  console.log('   après « Je confirme mes heures » : toast =', t, '| confirmes.sm =', apres);
  v('H1a « Je confirme mes heures » : le relevé est confirmé (technicien-03)', apres !== avant && apres !== 'null', { avant, apres, toast: t });
  v('H1b le message ne parle pas de comptabilité à un technicien (technicien-03)', !/payer|relancer|fiche légale/.test(t), t);
  await L.capture(c, CAP + `heures-confirmer-${profil}-${J}.png`);
  // H2 : signaler une erreur — le relevé vient d'être confirmé (H1), la carte « prêtes » n'est plus là : on remet l'état d'avant pour rejouer l'autre voie
  await p.evaluate(() => { delete PAIE.confirmes.sm; });
  await L.aller(p, 'mesheures');
  await L.toucher(c, '[data-tt^="erreur|"]'); await L.calme(p, 400);
  v('H2a « Il y a une erreur » ouvre la fenêtre', /Il y a une erreur/.test(await txt(p, '#calque .panneau h2')), await txt(p, '#calque .panneau h2'));
  const nb0 = await p.evaluate(() => Object.keys(PAIE.signales || {}).length);
  await L.toucher(c, '[data-ptx^="sigok"]'); await L.calme(p, 300);
  v('H2b envoyer sans rien changer : « Change une heure ou écris ce qui ne va pas »', /Change une heure/.test(await toast()), await toast());
  await p.fill('#ptx-st', 'J’ai oublié de pointer en partant de chez le client, je suis parti à 17h30 et non 16h42.'); await p.fill('#ptx-sf', '17:30');
  await L.capture(c, CAP + `heures-erreur-${profil}-${J}.png`);
  await L.toucher(c, '[data-ptx^="sigok"]'); await L.calme(p, 500);
  const nb1 = await p.evaluate(() => Object.keys(PAIE.signales || {}).length), t2 = await toast();
  console.log('   après envoi de l’erreur : toast =', t2, '| signales =', nb0, '→', nb1);
  v('H2c l’erreur est envoyée au bureau (technicien-03)', nb1 > nb0, { nb0, nb1, toast: t2 });
  // H3 : le gérant le voit-il (Temps de travail)
  await devenir(p, 'marc', 'pointage');
  const tt = await p.evaluate(() => document.getElementById('contenu').textContent.replace(/\s+/g, ' ').trim());
  const ou = await p.evaluate(() => { const r = []; for (const [k, x] of Object.entries(PAIE.signales || {})) r.push(k + ':' + JSON.stringify(x).slice(0, 120)); return r; });
  console.log('   PAIE.signales =', JSON.stringify(ou));
  v('H3 le gérant voit l’erreur de Sophie dans Temps de travail (son explication ou « Sophie » dans « à régler »)', /oublié de pointer|17:30|17 h 30/.test(tt), tt.slice(0, 300));
  await L.capture(c, CAP + `heures-gerant-${profil}-${J}.png`);
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
