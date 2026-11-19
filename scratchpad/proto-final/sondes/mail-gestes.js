// Sonde « gestes » de la Boîte mail : ce que le plan range sous A6 (répondu et relance), A7 (confier), A8 (en faire une tâche, ranger en Information), A9 (pièce jointe → fiche du client) et A13
// (chaque geste se défait par « Annuler »). Ce sont de VRAIS clics dans le module monté, qui rejouent la logique conservée de l'ancien écran ; on mesure l'effet dans les données ET à l'écran.
// Population d'abord : chaque geste compte ce qu'il a trouvé avant de conclure (un zéro sur un ensemble vide ne prouve rien).
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  const c = await entrer({ profil:'mac' }), p = c.p;
  const bouton = async (texte) => { const b = p.locator('#courrier-hote .hband button', { hasText:texte }).first(); const n = await b.count(); if (n) { await b.click(); await p.waitForTimeout(700); } return n; };
  const annuler = async () => { const b = p.locator('#toast button', { hasText:'Annuler' }).first(); const n = await b.count(); if (n) { await b.click(); await p.waitForTimeout(600); } return n; };

  // ── A7 : confier à quelqu'un ──
  await ouvrirMsg(c, 'm1');
  v('« Confier à quelqu\'un » est proposé dans le bandeau d\'un e-mail à traiter', await bouton('Confier à quelqu’un') === 1);
  const gens = await S(c, () => [...document.querySelectorAll('[data-mbx^="confok|m1|"]')].map(b => ({ k:b.dataset.mbx.split('|')[2], acces:!!b.querySelector('.mbx-acces.ok'), texte:b.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) })));
  const regleDite = await S(c, () => { const t = (document.querySelector('#calque .panneau') || {}).textContent || ''; return { fois:(t.match(/cet e-mail seul, en lecture/g) || []).length, dejaLa:(t.match(/A déjà la Boîte mail/g) || []).length }; });
  v('population : au moins trois collègues à qui confier ; la règle (« cet e-mail seul, en lecture ») est dite UNE fois en tête, et seule l\'exception (« A déjà la Boîte mail ») est écrite sous un nom (telephone-09)', gens.length >= 3 && regleDite.fois === 1 && gens.every(g => g.acces === /A déjà la Boîte mail/.test(g.texte)) && gens.some(g => !g.acces), { gens, regleDite });
  const sans = gens.find(g => !g.acces) || gens[0];
  await p.locator('[data-mbx="confok|m1|' + sans.k + '"]').click(); await p.waitForTimeout(900);
  const conf = await S(c, k => { const m = mlDe('m1'), t = TACHES.find(o => o.mailConfie === 'm1'); return { confie:m.confie && m.confie.qui, tache:t && { qui:t.qui, titre:t.t, lien:t.lien }, notif:NOTIFS.some(n => n.k === k && /te confie un e-mail/i.test(n.txt)), suivi:courrierSuivi(m) }; }, sans.k);
  v('confier crée UNE tâche pour cette personne, notée sur l’e-mail, et la prévient', conf.confie === sans.k && !!conf.tache && conf.tache.qui === sans.k && conf.notif === true, conf);
  v('sans accès à la boîte, la tâche n\'a PAS de lien vers la boîte (elle porte l’e-mail en lecture seule)', conf.tache && conf.tache.lien === null, conf.tache);
  v('l’e-mail passe « en cours » dans le suivi du module', conf.suivi && conf.suivi.statut === 'enCours', conf.suivi);
  const ligne = await S(c, () => { const r = window.R(), m = [...r.querySelectorAll('.msg')].find(e => /climatisation chambre 214/i.test(e.textContent)); return m ? m.textContent.replace(/\s+/g, ' ').slice(0, 200) : null; });
  v('à l\'écran, la ligne de l’e-mail dit à qui il est confié (population : la ligne existe)', !!ligne, ligne);
  await cap(c, 'gestes-confie');
  const n1 = await annuler();
  const apres = await S(c, () => ({ confie:mlDe('m1').confie, taches:TACHES.filter(o => o.mailConfie === 'm1').length }));
  v('« Annuler » défait le geste : plus de tâche, plus de mention sur l’e-mail', n1 === 1 && !apres.confie && apres.taches === 0, { n1, apres });

  // ── A8 : en faire une tâche (une seule fois) ──
  await ouvrirMsg(c, 'm1');
  const avant = await S(c, () => TACHES.length);
  v('« En faire une tâche » est proposé', await bouton('En faire une tâche') === 1);
  const t1 = await S(c, a => ({ n:TACHES.length - a, tache:TACHES.find(o => /^Répondre : Climatisation chambre 214/.test(o.t)) }), avant);
  v('la tâche est créée, avec un lien qui rouvre CET e-mail', t1.n === 1 && !!t1.tache && /boiteMail\|m1/.test(JSON.stringify(t1.tache.lien || '')), t1);
  await ouvrirMsg(c, 'm1'); await bouton('En faire une tâche');
  const t2 = await S(c, () => ({ n:TACHES.filter(o => /^Répondre : Climatisation chambre 214/.test(o.t)).length, toast:(document.getElementById('toast') || {}).textContent }));
  v('un second clic ne crée pas de doublon et le dit', t2.n === 1 && /existe déjà/i.test(t2.toast || ''), t2);

  // ── A9 : ranger la pièce jointe dans la fiche du client ──
  await ouvrirMsg(c, 'm1');
  const pj = await S(c, () => { const m = mlDe('m1'), cli = mlLire(m).cli; return { nb:(m.pj || []).length, cli, deja:cli ? (CLIENTS[cli].docsMail || []).length : -1 }; });
  v('population : l’e-mail de Mme Bernard porte une pièce jointe et son client est reconnu', pj.nb >= 1 && !!pj.cli, pj);
  v('le bouton « Ranger … dans la fiche » est proposé', await bouton('dans la fiche') === 1);
  const pj2 = await S(c, () => { const m = mlDe('m1'), cli = mlLire(m).cli; return { range:(CLIENTS[cli].docsMail || []).some(d => d.mail === 'm1'), n:(CLIENTS[cli].docsMail || []).length }; });
  v('la pièce est rangée dans la fiche du client', pj2.range && pj2.n === pj.deja + 1, pj2);
  await ouvrirMsg(c, 'm1');
  const encore = await p.locator('#courrier-hote .hband button', { hasText:'dans la fiche' }).count();
  v('une fois rangée, la pièce n\'est plus proposée (pas de doublon dans la fiche)', encore === 0, encore);

  // ── A6 : « Répondu » puis relance après deux jours ouvrés ──
  await S(c, () => { const m = mlDe('m9'); m.fait = ''; m.attente = { d:AUJ, h:'09:00', mo:'question' }; courrierRafraichir(); });
  await p.waitForTimeout(500); await ouvrirMsg(c, 'm9');
  const frais = await S(c, () => ({ relance:mbxRelanceDue(mlDe('m9')), suivi:courrierSuivi(mlDe('m9')) }));
  v('une réponse envoyée aujourd\'hui : l’e-mail « attend sa réponse », sans relance', !frais.relance && frais.suivi && frais.suivi.par === 'attend sa réponse', frais);
  v('… et le bandeau ne propose pas « Relancer »', await p.locator('#courrier-hote .hband button', { hasText:'Relancer' }).count() === 0);
  await S(c, () => { const m = mlDe('m9'); m.attente.d = ajoute(AUJ, -6); courrierRafraichir(); });
  await p.waitForTimeout(500); await ouvrirMsg(c, 'm9');
  const vieux = await S(c, () => ({ relance:mbxRelanceDue(mlDe('m9')), suivi:courrierSuivi(mlDe('m9')) }));
  v('six jours après : la relance est due et l’e-mail remonte « à traiter »', vieux.relance && vieux.suivi && vieux.suivi.statut === 'aTraiter', vieux);
  v('le bandeau propose « Relancer »', await bouton('Relancer') === 1);
  const compo = await S(c, () => { const r = window.R(), b = r.querySelector('#cBody'); return { texte:b ? b.value.slice(0, 200) : null, titre:(r.querySelector('#cTitle') || {}).innerText }; });
  v('le composeur s\'ouvre avec le modèle de relance déjà écrit', !!compo.texte && /revenons vers vous|relanc|sans nouvelle|avez-vous eu le temps/i.test(compo.texte), compo);
  await cap(c, 'gestes-relance');
  await p.locator('#cSend').click();
  // le module laisse quelques secondes pour « Annuler l'envoi » : on attend que l’e-mail parte VRAIMENT avant de lire les données
  const parti = await lib.attendre(p, () => (mlDe('m9').relances || 0) >= 1, 15000);
  v('l’e-mail de relance part (après le délai d\'annulation)', parti);
  const envoi = await S(c, () => { const m = mlDe('m9'); return { relances:m.relances, attenteD:m.attente && m.attente.d, auj:AUJ, due:mbxRelanceDue(m) }; });
  v('après l\'envoi : la relance est comptée et l\'attente repart d\'aujourd\'hui', envoi.relances === 1 && envoi.attenteD === envoi.auj && !envoi.due, envoi);

  // ── A8 : « Toujours ranger les e-mails de X en Information », puis Annuler ──
  await ouvrirMsg(c, 'm6');
  const regles0 = await S(c, () => MBX.regles.length);
  v('un e-mail d\'information propose la règle de rangement', await bouton('Toujours ranger') === 1);
  const regles1 = await S(c, () => ({ n:MBX.regles.length, daikin:MBX.regles.some(r => /daikin/.test(r.mail)) }));
  v('la règle est créée pour cet expéditeur', regles1.n === regles0 + 1 && regles1.daikin, regles1);
  const n2 = await annuler();
  const regles2 = await S(c, () => MBX.regles.length);
  v('« Annuler » retire la règle', n2 === 1 && regles2 === regles0, { n2, regles2, regles0 });

  v('aucune erreur JavaScript pendant ces gestes', c.err.length === 0, c.err.slice(0, 3));
  await fin(c); await sortie();
})().catch(e => { console.error(e); process.exit(2); });
