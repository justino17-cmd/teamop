// Sonde « double-auth-vues » (étape 5, corrections tout-10 et tout-11) : les VUES sensibles de la Comptabilité demandent la confirmation sur le téléphone par TOUS leurs chemins,
// pas seulement par le bouton qui les ouvrait en premier. Population : 4 vues (Paie › Fiches de paie, Salariés, Charges et déclarations ; Trésorerie › Banque), 2 gestes d'envoi (« Envoyer › », le FEC), Marc (session NON auto, téléphone activé).
// ⛔ Ce qu'on regarde est ce que la PAGE écrit : aucun montant en euros, aucune ligne de relevé tant que la fenêtre de 5 minutes n'est pas ouverte ; puis, confirmé, les montants sont bien là (sinon « aucun » ne prouverait rien).
const fs = require('fs'), path = require('path');
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const SRC = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const avancer = async (c, n) => { await c.p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles:true }))); await S.avancer(c, n); };
const montants = c => c.p.evaluate(() => { const t = document.querySelector('#contenu').innerText.replace(/[  ]/g, ' '); return { eur:(t.match(/\d[\d ]*[,.]\d\d\s?€/g) || []).length, releve:/Crédit Agricole|VIR SEPA|COMMISSIONS CB/.test(t), verrou:!!document.querySelector('[data-secvue]') }; });
(async () => {
  console.log('\n── 0. le recensement ──');
  v('SECU_VUES nomme les quatre vues sensibles', /const SECU_VUES = \{[^}]*fiches:\['paie-fiches'[^}]*salaries:\['paie-fiches'[^}]*charges:\['paie-fiches'[^}]*banque:\['compta-banque'/.test(CODE));
  const i = CODE.indexOf('vueComptabilite = function(){');
  v('population : la fonction qui dessine la Comptabilité est trouvée', i > 0, i);
  const corps = CODE.slice(i, i + 3000);
  v('vueComptabilite ne dessine la vue qu\'après secuVueOuverte (la garde est dans la fonction qui MONTRE)', /secuVueOuverte\(O\)/.test(corps) && /const corps = verrou \? secuVueVerrou\(O\) :/.test(corps));
  for (const f of ['function cpEnvoyer(){', 'async function cpFecTelecharger(){']) { const j = CODE.indexOf(f); v(f + ' : « compta-export » est sa première instruction', j > 0 && CODE.slice(j, j + 140).includes("secuGarde('compta-export'"), CODE.slice(j, j + 140)); }
  v('la table SECU_GESTES nomme les portes (vueComptabilite, cpEnvoyer)', /'paie-fiches':\{[^\n]*vueComptabilite/.test(SRC) && /'compta-banque':\{[^\n]*vueComptabilite/.test(SRC) && /'compta-export':\{[^\n]*cpEnvoyer/.test(SRC));

  const c = await S.ouvrir({ profil:'mac' }); await S.tous(c);
  const rg = await S.entrer(c, 'marc'); v('population : Marc connecté par le nombre', rg.ok && await c.p.evaluate(() => SESSION === 'marc' && SECU.sessions.marc.auto === false));
  const aller = async () => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(900); };
  const conf = async () => { await c.p.waitForTimeout(500); return S.conf(c); };
  const fermerConf = async () => { await c.p.evaluate(() => { const b = document.querySelector('#sec-conf [data-sec3="annuler"]'); if (b) b.click(); }); await c.p.waitForTimeout(300); };
  await avancer(c, 6); await aller();
  v('population : la fenêtre de 5 minutes est fermée avant de commencer', await c.p.evaluate(() => !secuFenetreValide('marc')));

  const cas = [['paie', 'fiches', 'paiemois', 'voir les fiches de paie', 'Fiches de paie'], ['paie', 'salaries', 'paiemois', 'voir les salaires de l’équipe', 'Salariés'], ['paie', 'charges', 'paiemois', 'voir les salaires et les charges', 'Charges et déclarations'], ['tresorerie', 'banque', 'paiements', 'voir la banque de la comptabilité', 'Banque']];
  for (const [grp, sec, libre, phrase, nom] of cas) {
    console.log('\n── ' + nom + ' ──');
    await avancer(c, 6); await aller(); await c.p.evaluate(() => { CP.onglet = 'ensemble'; rendre(); }); await c.p.waitForTimeout(400);
    await c.p.evaluate(g => document.querySelector('[data-cx="grp|' + g + '"]').click(), grp); await c.p.waitForTimeout(500); await fermerConf();
    await c.p.evaluate(s => document.querySelector('[data-cx="sec|' + s + '"]').click(), libre); await c.p.waitForTimeout(400);
    await c.p.evaluate(s => document.querySelector('[data-cx="sec|' + s + '"]').click(), sec);
    const cf = await conf(), m = await montants(c);
    v(nom + ' : l\'onglet demande la confirmation avec SA phrase « Pour ' + phrase + ' »', !!cf && cf.texte.includes('Pour ' + phrase + ', OP GESTION vérifie que c’est bien toi.'), cf && cf.texte.slice(0, 120));
    v(nom + ' : aucun montant en euros, aucune ligne de relevé dans la page (la carte de verrou à la place)', m.eur === 0 && !m.releve && m.verrou, m);
    await fermerConf(); const m2 = await montants(c);
    v(nom + ' : confirmation annulée, la page reste verrouillée et ne se rouvre pas d\'elle-même', m2.eur === 0 && m2.verrou && !(await S.conf(c)), m2);
    await c.p.evaluate(() => rendre()); await c.p.waitForTimeout(500);
    v(nom + ' : un simple redessin ne rouvre pas la confirmation', !(await S.conf(c)));
    await c.p.click('[data-secv="confirmer|' + sec + '"]'); const cf2 = await conf();
    v(nom + ' : « Confirmer sur mon téléphone » rouvre la confirmation', !!cf2 && /Confirme sur ton téléphone/.test(cf2.texte));
    await S.confirmer(c, 'marc'); await c.p.waitForTimeout(800); const m3 = await montants(c);
    v(nom + ' : confirmé, la vue s\'écrit (des montants, plus de carte de verrou) — preuve que le zéro d\'avant n\'était pas une page vide', m3.eur >= 3 && !m3.verrou, m3);
    // le menu d'un espace (CX_DER) et un redessin gardent la vue ouverte tant que la fenêtre vaut
    await c.p.evaluate(() => rendre()); await c.p.waitForTimeout(300);
    v(nom + ' : tant que la fenêtre vaut, un redessin ne redemande rien', !(await S.conf(c)) && !(await montants(c)).verrou);
    await avancer(c, 6); await c.p.waitForTimeout(1500); const m4 = await montants(c), t = await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    v(nom + ' : cinq minutes plus tard la page se re-masque d\'elle-même (aucun montant), sans rouvrir la confirmation', m4.eur === 0 && !m4.releve && m4.verrou && !(await S.conf(c)), m4);
    v(nom + ' : toast « Cinq minutes ont passé : cette page est de nouveau masquée. »', /Cinq minutes ont passé : cette page est de nouveau masquée\./.test(t), t);
    // le « Revenir en arrière »
    await c.p.click('[data-secv="retour|' + sec + '"]'); await c.p.waitForTimeout(500);
    v(nom + ' : « Revenir en arrière » ramène à un onglet sans donnée sensible', await c.p.evaluate(o => CP.onglet === o && !document.querySelector('[data-secvue]'), libre));
  }

  console.log('\n── le menu d\'un espace rouvre le DERNIER onglet : il ne contourne pas la garde ──');
  await c.p.evaluate(() => { CX_DER.paie = 'fiches'; CP.onglet = 'ensemble'; rendre(); }); await c.p.waitForTimeout(400); await avancer(c, 6);
  await c.p.evaluate(() => document.querySelector('[data-cx="grp|paie"]').click()); const cg = await conf(), mg = await montants(c);
  v('« Paie » (le bouton d\'espace, qui rouvre « Fiches de paie ») demande la confirmation et n\'écrit aucun salaire', !!cg && mg.eur === 0 && mg.verrou, mg);
  await fermerConf();

  console.log('\n── « Envoyer › » et le FEC (S6) ──');
  for (const [nom, prep, sel, ouvert] of [['Envoyer › (Clôture du mois)', "CP.onglet='cloture'", '[data-cp="envoi"]', () => /Envoyer octobre à ton expert-comptable/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '')],
    ['le FEC (« Télécharger »)', "CP.onglet='archives'", '[data-cp="fecdl"]', null]]) {
    await avancer(c, 6); await c.p.evaluate(p => { eval(p); rendre(); }, prep); await c.p.waitForTimeout(500);
    if (sel.includes('fecdl')) { await c.p.evaluate(() => document.querySelector('[data-cp="fec"]').click()); await c.p.waitForTimeout(500); }   // le FEC se télécharge depuis son panneau (« Voir » dans Archives & exports)
    const existe = await c.p.evaluate(s => !!document.querySelector(s), sel);
    if (!existe) { v(nom + ' : le bouton existe dans la page', false, sel); continue; }
    await c.p.evaluate(() => { window.__tel = 0; if (!window.__telOrig) { window.__telOrig = telechargerFichier; telechargerFichier = function () { window.__tel++; return Promise.resolve(); }; } });   // on compte les téléchargements au lieu de les faire
    await c.p.evaluate(s => document.querySelector(s).click(), sel); const cf = await conf();
    v(nom + ' : la confirmation s\'ouvre avec « Pour exporter la comptabilité »', !!cf && cf.texte.includes('Pour exporter la comptabilité, OP GESTION vérifie que c’est bien toi.'), cf && cf.texte.slice(0, 100));
    v(nom + ' : rien ne part tant que ce n\'est pas confirmé (ni panneau d\'envoi, ni téléchargement)', await c.p.evaluate(() => (!(document.querySelector('#calque .panneau h2') && /Envoyer octobre/.test(document.querySelector('#calque .panneau h2').textContent)) && !window.__tel)));
    await S.confirmer(c, 'marc'); await c.p.waitForTimeout(900);
    v(nom + ' : confirmé, le geste REPREND (le panneau d\'envoi s\'ouvre / le fichier part)', await c.p.evaluate(() => /Envoyer octobre/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '') || window.__tel > 0));
    await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await c.p.waitForTimeout(300);
  }
  console.log('\n── fenêtre valable : aucune confirmation de plus ──');
  await c.p.evaluate(() => { document.dispatchEvent(new Event('pointerdown', { bubbles:true })); SECU.confirmeA.marc = secuMaint(); CP.onglet = 'ensemble'; rendre(); }); await c.p.waitForTimeout(400);
  await c.p.evaluate(() => document.querySelector('[data-cx="grp|tresorerie"]').click()); await c.p.waitForTimeout(300);
  await c.p.evaluate(() => document.querySelector('[data-cx="sec|banque"]').click()); await c.p.waitForTimeout(500);
  const mf = await montants(c); v('fenêtre valable : la banque s\'ouvre directement, sans confirmation', mf.eur >= 3 && !mf.verrou && !(await S.conf(c)), mf);
  await L.fermer();

  console.log('\n── ?auto= et le prototype nu : accordés d\'office, comme avant ──');
  const a = await L.ouvrir({ profil:'mac', qui:'marc' });
  await L.aller(a.p, 'comptabilite'); await a.p.waitForTimeout(800);
  await a.p.evaluate(() => { CP.onglet = 'ensemble'; rendre(); }); await a.p.waitForTimeout(300);
  await a.p.evaluate(() => { document.querySelector('[data-cx="grp|paie"]').click(); }); await a.p.waitForTimeout(500); await a.p.evaluate(() => document.querySelector('[data-cx="sec|fiches"]').click()); await a.p.waitForTimeout(500);
  const ma = await montants(a); v('?auto= : les fiches de paie s\'écrivent sans confirmation (session sans téléphone)', ma.eur >= 3 && !ma.verrou && !(await a.p.evaluate(() => !!document.getElementById('sec-conf'))), ma);
  await L.fermer();
  process.exit(L.bilan());
})().catch(e => { console.log('EXC', e.stack.slice(0, 700)); process.exit(1); });
