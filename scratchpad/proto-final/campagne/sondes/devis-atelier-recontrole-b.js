// RECONTRÔLE ADVERSE (étape 3), passe B : les défauts 02, 05, 06, 08, 09, 10 rejoués AUTREMENT que le correcteur, et ce qu'ils ont pu casser à côté.
// usage : node devis-atelier-recontrole-b.js [profil] — « N ✓ · M ✗ », code 1 si un contrôle tombe.
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
const nb = (t, m) => (String(t).match(m) || []).length;
const trace = (p, k) => p.evaluate(k => (DEVIS_REG[k] || DV.find(o => dvCle(o) === k)).trace.map(t => t.join(' ')), k);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 600);

  // ── 02 : le toast d'une relance ne dit « Relance envoyée » qu'une fois, avec ou sans tâche de relance ouverte ─────────────
  const relance = async cle => { await L.aller(p, 'devis-x-' + cle); await L.toucher(c, '[data-dv="relancer|' + cle + '"]'); await L.calme(p, 400);
    await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 600); return (await O.lire(p)).toast; };
  const taches0 = await p.evaluate(() => TACHES.filter(t => !t.fait && t.lien && t.lien.t === 'devis').map(t => t.lien.id));
  console.log('  · tâches de devis ouvertes :', JSON.stringify(taches0));
  v('population : au moins un devis à relancer dans le prototype', await p.evaluate(() => DV.filter(x => dvEtat(x) === 'attente').length) >= 1);
  const t1 = await relance('D-2026-031'); v('02 : première relance, toast sans doublon « Relance envoyée »', nb(t1, /Relance envoyée/gi) === 1, t1);
  const t2 = await relance('D-2026-031'); v('02 : seconde relance du même devis (plus de tâche ouverte) : toast sans doublon et SANS suite orpheline', nb(t2, /Relance envoyée/gi) === 1 && !/\.\s*\.|·\s*·/.test(t2), t2);
  v('02 : la relance est tracée UNE fois par envoi (2 envois → 2 lignes « Relancé par »)', nb((await trace(p, 'D-2026-031')).join('|'), /Relancé par/g) === 2, await trace(p, 'D-2026-031'));
  // un autre devis en attente, autre client
  const autres = await p.evaluate(() => DV.filter(x => dvEtat(x) === 'attente' && x.num !== 'D-2026-031').map(x => x.num)); console.log('  · autres devis en attente :', autres);
  if (autres[0]) { const t3 = await relance(autres[0]); v('02 : relance d’un autre devis en attente : toast propre', nb(t3, /Relance envoyée/gi) === 1, t3); }

  // ── 05 : « ‹ Retour » d'une fiche, d'où qu'on vienne ───────────────────────────────────────────────────────────────────────
  const retour = async () => { const lib = await p.evaluate(() => { const b = document.querySelector('#contenu .rl-retour, #contenu [data-retour]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; }); const ok = await L.toucher(c, '#contenu .rl-retour, #contenu [data-retour]'); await L.calme(p, 500); const h = await p.evaluate(() => location.hash); console.log('    · bouton « ' + lib + ' » touché=' + ok + ' → ' + h); return h; };
  let n = await O.neuf(c, 'devis-x-D-2026-034'); let h = await retour(); v('05 : fiche ouverte directement (adresse) → Retour = la liste Devis', /^#devis$/.test(h), h);
  await O.neuf(c, 'accueil'); await L.aller(p, 'devis'); await L.aller(p, 'devis-x-D-2026-034'); h = await retour(); v('05 : Accueil › Devis › fiche › Retour = la liste Devis (le pas précédent)', /^#devis$/.test(h), h);
  await O.neuf(c, 'accueil'); await L.aller(p, 'devis-x-D-2026-034'); h = await retour(); v('05 : Accueil › fiche d’un devis (tuile ou tâche) › Retour = l’Accueil, d’où l’on venait', /^#accueil$|^#$|^$/.test(h), h);
  await O.neuf(c, 'clients'); const clId = await p.evaluate(() => DEVIS_REG['D-2026-034'].cli); await L.aller(p, 'client-x-' + clId); await L.aller(p, 'devis-x-D-2026-034'); h = await retour(); v('05 : fiche du client › fiche du devis › Retour = la fiche du client', new RegExp('^#client-x-' + clId + '$').test(h), h);
  await O.neuf(c, 'devis-x-BR1'); h = await retour(); v('05 : brouillon ouvert directement › Retour = la liste', /^#devis$/.test(h), h);
  await O.neuf(c, 'factures-x-F-2026-040').catch(() => {}); h = await p.evaluate(() => location.hash);
  await O.neuf(c, 'factures'); await L.aller(p, 'devis-x-D-2026-040'); h = await retour(); v('05 : Factures › fiche d’un devis › Retour = Factures (ni la liste Devis, ni l’Accueil)', /^#(factures|comptabilite)/.test(h), h);

  // ── 06 : la signature du client ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const ouvrir = async cle => { await O.neuf(c, 'devis-x-' + cle); await L.toucher(c, '[data-dv="client|' + cle + '"]'); await L.calme(p, 400); await p.check('#dv-ok'); await p.fill('#dv-nom', 'Jeanne Essai'); await p.evaluate(() => document.getElementById('dv-signe').scrollIntoView({ block: 'center' })); await L.calme(p, 250); };
  const trait = async (pts) => { const bb = await p.locator('#dv-signe').boundingBox(); const ech = 600 / bb.width;   // ech : unités du canevas par pixel
    await p.mouse.move(bb.x + pts[0][0] / ech, bb.y + pts[0][1] / ech); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(bb.x + q[0] / ech, bb.y + q[1] / ech, { steps: 4 }); await p.mouse.up(); };
  const signer = async () => { await L.toucher(c, '[data-dv="signer|D-2026-038"]'); await L.calme(p, 400); return p.evaluate(() => ({ err: ((document.getElementById('dv-err') || {}).textContent || '').trim(), e: DEVIS_REG['D-2026-038'].e, court: document.getElementById('dv-signe') && document.getElementById('dv-signe').dataset.court || '', signe: !!(document.getElementById('dv-signe') && document.getElementById('dv-signe').dataset.signe) })); };
  const dev = await p.evaluate(() => DEVIS_REG['D-2026-038'].e); v('population : D-2026-038 est en attente (le devis qu’on signe)', dev === 'attente', dev);
  await ouvrir('D-2026-038'); await trait([[300, 90], [304, 92]]); let s = await signer();
  v('06 : un trait de 4 unités (frôlement) est refusé, le devis reste en attente', s.e === 'attente' && /trop court/.test(s.err), s);
  await trait([[100, 60], [120, 60], [135, 70]]); s = await signer(); v('06 : un trait de ~40 unités cumulées avec le frôlement : décision documentée (cumul) — dit', true, s);
  console.log('  · après 4 + ~40 unités cumulées :', JSON.stringify(s));
  await ouvrir('D-2026-038'); await trait([[50, 100], [70, 100]]); await trait([[90, 60], [110, 100]]); s = await signer();
  console.log('  · deux petits traits (20 + 45 unités) :', JSON.stringify(s));
  await ouvrir('D-2026-038'); await trait([[60, 120], [150, 50], [250, 130], [350, 60], [450, 120]]); s = await signer();
  v('06 : un vrai trait (signature complète) passe : le devis est accepté, plus d’erreur', s.e === 'accepte' && !s.err, s);
  v('06 : l’accord est tracé « Accepté et signé en ligne »', /Accepté et signé en ligne/.test((await trace(p, 'D-2026-038')).join('|')), await trace(p, 'D-2026-038'));
  // une signature acceptée ne doit pas laisser « trop court » dans la fenêtre rouverte
  await ouvrir('D-2026-036').catch(() => {});

  // ── 08 : « Aperçu et envoi » inactif tant que le devis n'est pas complet — cas limites ────────────────────────────────────────────────
  await O.neuf(c, 'devis-x-BR1'); const etat = () => p.evaluate(() => { const b = document.querySelector('[data-dv="envoyer|BR1"]'); return { envoi: !!b && !b.disabled, n: DEVIS_REG.BR1.lignes.length, manque: ((document.querySelector('#contenu .bandeau-info[data-dvmanque]') || {}).textContent || '').trim().slice(0, 90), ttc: (document.querySelector('.dv-totaux .ligne:nth-child(3) b') || {}).textContent }; });
  let e0 = await etat(); v('08 : le brouillon de départ porte une ligne sans prix (exprès) : envoi inactif et phrase qui le dit', !e0.envoi && /sans prix/.test(e0.manque), e0);
  const sp = await p.evaluate(() => DEVIS_REG.BR1.lignes.findIndex(l => l[2] == null)); await p.fill('[data-dvl="BR1|' + sp + '|2"]', '80'); await p.press('[data-dvl="BR1|' + sp + '|2"]', 'Tab'); await L.calme(p, 500); e0 = await etat(); v('08 : on chiffre la ligne : l’envoi s’ouvre', e0.envoi && !e0.manque, e0);
  await p.fill('[data-dvl="BR1|0|0"]', '    '); await p.press('[data-dvl="BR1|0|0"]', 'Tab'); await L.calme(p, 500); e0 = await etat(); v('08 : une désignation d’espaces seulement bloque l’envoi (« sans nom »), le message le dit', !e0.envoi && /sans nom/.test(e0.manque), e0);
  await p.fill('[data-dvl="BR1|0|0"]', 'Fourniture VMC'); await p.press('[data-dvl="BR1|0|0"]', 'Tab'); await L.calme(p, 500); e0 = await etat(); v('08 : on redonne un nom : l’envoi se rouvre et la phrase s’efface', e0.envoi && !e0.manque, e0);
  await p.fill('[data-dvl="BR1|0|2"]', ''); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 500); e0 = await etat(); v('08 : un prix effacé bloque l’envoi (« sans prix ») sans le confondre avec un prix à 0', !e0.envoi && /sans prix/.test(e0.manque), e0);
  await p.fill('[data-dvl="BR1|0|2"]', '0'); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 500); e0 = await etat(); v('08 : un prix à 0 (geste commercial) reste envoyable', e0.envoi, e0);
  await p.fill('[data-dvl="BR1|0|1"]', ''); await p.press('[data-dvl="BR1|0|1"]', 'Tab'); await L.calme(p, 500);
  const q1 = await p.evaluate(() => DEVIS_REG.BR1.lignes[0][1]); v('08 : une quantité effacée redevient 1 (pas de ligne à quantité vide)', q1 === 1, q1);
  // chaque porte d'envoi : le bouton ET la fonction (un menu, une liste, un raccourci pourraient envoyer sans passer par le bouton)
  await p.fill('[data-dvl="BR1|0|2"]', ''); await p.press('[data-dvl="BR1|0|2"]', 'Tab'); await L.calme(p, 400);
  const porte = await p.evaluate(() => { const n0 = ENVOIS.length; dvEnvoyer(DEVIS_REG.BR1); const ouvert = !!document.getElementById('ml-a'); return { ouvert, envoisAjoutes: ENVOIS.length - n0 }; });
  v('08 : la FONCTION d’envoi refuse aussi un devis incomplet (pas seulement le bouton grisé)', !porte.ouvert && porte.envoisAjoutes === 0, porte);
  const tous = await p.evaluate(() => DV.filter(x => x.e !== 'brouillon').map(x => ({ num: x.num, e: dvEtat(x), complet: dvComplet(x), n: x.lignes.length })));
  v('08 : aucun devis DÉJÀ envoyé du prototype ne devient « à chiffrer » (le contrôle ne doit frapper que les brouillons)', tous.length >= 5 && tous.every(x => x.complet), tous.filter(x => !x.complet));
  await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await L.calme(p, 400);
  const liste = await O.liste(p); v('08 : la liste n’annonce « à chiffrer » que pour un brouillon', liste.filter(t => /à chiffrer/.test(t)).every(t => /Brouillon/.test(t)), liste.filter(t => /à chiffrer/.test(t)));

  // ── 09 : l'adresse tapée à l'envoi ────────────────────────────────────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { CLIENTS.z9 = { nom: 'Client Sans Mail', type: 'part', contact: 'Mme Sans Mail', tel: '06 00 00 00 09', mail: '', adr: '3 rue de la Paix, 17000 La Rochelle' }; CLIENTS.z8 = Object.assign({}, CLIENTS.z9, { nom: 'Client Avec Mail', mail: 'ancienne@exemple.fr' }); dvCreer({ cli: 'z9', objet: 'Essai adresse', lignes: [['Visite', 1, 50]], source: 'essai' }); window.__k9 = location.hash.replace('#devis-x-', ''); dvCreer({ cli: 'z8', objet: 'Essai adresse 2', lignes: [['Visite', 1, 50]], source: 'essai' }); window.__k8 = location.hash.replace('#devis-x-', ''); });
  const [k9, k8] = await p.evaluate(() => [window.__k9, window.__k8]);
  await L.aller(p, 'devis-x-' + k8); await L.toucher(c, '[data-dv="envoyer|' + k8 + '"]'); await p.fill('#ml-a', 'AUTRE@exemple.fr'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 600);
  v('09 : un client QUI A DÉJÀ une adresse la garde (l’envoi à une autre adresse ne l’écrase pas)', (await p.evaluate(() => CLIENTS.z8.mail)) === 'ancienne@exemple.fr', await p.evaluate(() => CLIENTS.z8.mail));
  await L.aller(p, 'devis-x-' + k9); await L.toucher(c, '[data-dv="envoyer|' + k9 + '"]'); await p.fill('#ml-a', '  Mme.Sans@Exemple.FR  '); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 700);
  const m9 = await p.evaluate(() => CLIENTS.z9.mail), tt = (await O.lire(p)).toast; v('09 : une adresse tapée avec espaces et majuscules est rangée proprement (trim)', m9 === 'Mme.Sans@Exemple.FR', m9);
  v('09 : le toast dit que l’adresse a été enregistrée', /Adresse enregistrée/.test(tt), tt);
  const j9 = await p.evaluate(() => JOURNAL.filter(j => /adresse e-mail du client/.test(j.action || j.a || '')).length); v('09 : une ligne de journal pour l’ajout de l’adresse', j9 >= 1, j9);
  await p.evaluate(() => dvCreer({ cli: 'z9', objet: 'Essai adresse 3', lignes: [['Visite', 1, 50]], source: 'essai' })); await L.calme(p, 500);
  const k9b = await p.evaluate(() => location.hash.replace('#devis-x-', '')); await L.toucher(c, '[data-dv="envoyer|' + k9b + '"]'); await L.calme(p, 300);
  v('09 : le devis SUIVANT du même client pré-remplit l’adresse (plus rien à retaper)', (await p.evaluate(() => document.getElementById('ml-a').value)) === 'Mme.Sans@Exemple.FR', await p.evaluate(() => document.getElementById('ml-a').value));
  await L.ranger(p);

  // ── 10 : « par qui » ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const qui = await p.evaluate(() => dvQui()); v('10 : connecté comme Marc, dvQui = « Marc »', qui === 'Marc', qui);
  console.log('err', c.err.length, c.err.slice(0, 4));
  v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
