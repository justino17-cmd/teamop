// Sonde « double-auth-sensibles » (étape 3, § 6) : les QUATORZE gestes sensibles demandent une confirmation sur le téléphone, valable 5 minutes.
// Population : 14 gestes (SECU_GESTES), 1 session NON auto (Marc, téléphone activé), le cadre de la Comptabilité (iframe), la fenêtre auto (accordée d'office), la Comptabilité ouverte seule.
// Pour CHAQUE geste : sans fenêtre valable, état avant = état après ET la confirmation s'ouvre avec SA phrase ; confirmé, le geste REPREND là où il s'était arrêté.
const fs = require('fs'), path = require('path');
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const SRC = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
// ce qui doit rester IDENTIQUE quand un geste sensible n'a pas été confirmé
const ETAT = () => ({ panneau:(document.querySelector('#calque .panneau h2') || {}).textContent || null, iban:ENTREPRISE.iban, bic:ENTREPRISE.bic, payees:ACHATS.filter(a => a.paye).length, onglet:CP.onglet, compta:!!PAIE.compta, envoi:!!PAIE.envoi,
  droits:JSON.stringify(eqDe('julie').droits), provSm:SECU.comptes.sm.prov, telKb:!!SECU.comptes.kb.tel, actifTl:eqDe('tl').actif, session:SESSION, journal:JOURNAL.length, bande:!!document.querySelector('.sec-bande') });
const etat = c => c.p.evaluate(ETAT);
// la personne TOUCHE l'écran avant que l'horloge de démonstration avance : sans cela, 3 × 6 minutes de silence dépassent les 15 minutes d'inactivité (un clic synthétique `.click()` ne compte pas comme un toucher)
const avancer = async (c, n) => { await c.p.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles:true }))); await S.avancer(c, n); };
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ' : ' + a[k] + ' → ' + b[k]);
(async () => {
  console.log('\n── 0. le recensement : les quatorze gestes, chacun gardé DANS la fonction qui montre ou écrit ──');
  const cles = ['banque-ouvrir', 'banque-enregistrer', 'virement-ouvrir', 'virement-fichier', 'compta-banque', 'compta-export', 'paie-fiches', 'paie-envoi', 'paie-compta', 'equipe-droits', 'equipe-inviter', 'equipe-retirer', 'equipe-telephone', 'voir-comme'];
  const tab = SRC.slice(SRC.indexOf('const SECU_GESTES = {'), SRC.indexOf('const secuPhrase'));
  v('population : la table SECU_GESTES porte les 14 clés, ni plus ni moins', cles.every(k => tab.includes("'" + k + "':")) && (tab.match(/^  '[a-z-]+':\{/gm) || []).length === 14, (tab.match(/^  '[a-z-]+':\{/gm) || []).length);
  const code = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  for (const k of cles) { if (k.startsWith('compta-')) continue; const n = (code.match(new RegExp("secuGarde\\('" + k + "'", 'g')) || []).length; v(k + ' : la garde est posée dans le code (' + n + ' appel' + (n > 1 ? 's' : '') + ')', n >= 1, n); }
  const cadre = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-comptabilite.html'), 'utf8');
  v('compta-banque et compta-export : le cadre demande par `opc_sensible`, la page l\'écoute et le filtre sur la fenêtre du cadre', /opc_sensible/.test(cadre) && /opc_confirme/.test(cadre) && /ev\.source !== w/.test(SRC) && /SECU_CADRE_CLES\.includes\(m\.cle\)/.test(SRC));
  const fonctions = { 'banque-ouvrir':'entPanBanque', 'banque-enregistrer':'entEnregistrerBanque', 'virement-ouvrir':'acVirement', 'virement-fichier':'acVirok', 'paie-fiches':'paieAller', 'paie-envoi':'paieEnvoyer', 'paie-compta':'paieComptabiliser', 'equipe-retirer':'eqxDepart', 'equipe-telephone':'secuNouveauTelephone', 'voir-comme':'secuVoirComme' };
  for (const [k, f] of Object.entries(fonctions)) { const i = SRC.search(new RegExp('(function ' + f + '\\(|const ' + f + ' = )')); const seg = SRC.slice(i, i + 700); v(k + ' : la garde est dans ' + f + ' (première instruction), pas seulement dans l\'écouteur du bouton', i > 0 && seg.includes("secuGarde('" + k + "'"), seg.slice(0, 110)); }

  const c = await S.ouvrir({ profil:'mac' }); await S.tous(c);
  const rg = await S.entrer(c, 'marc'); v('population : Marc connecté par le nombre (session NON auto), son téléphone activé', rg.ok && await c.p.evaluate(() => SESSION === 'marc' && SECU.sessions.marc.auto === false));
  v('la connexion approuvée compte déjà comme une confirmation (fenêtre de 5 minutes ouverte)', await c.p.evaluate(() => secuFenetreValide('marc')));
  const essai = async (cle, phrase, declencher, reprise, o) => { o = o || {}; console.log('  … ' + cle);
    await avancer(c, 6); const av = await etat(c);
    await declencher(); await c.p.waitForTimeout(500); const cf = await S.conf(c), ap = await etat(c);
    v(cle + ' : sans fenêtre valable, la confirmation s’ouvre avec SA phrase « Pour ' + phrase + ' »', !!cf && cf.texte.includes('Pour ' + phrase + ', OP GESTION vérifie que c’est bien toi.') && /Confirme sur ton téléphone/.test(cf.texte) && /^\d\d$/.test(cf.nombre || ''), cf && cf.texte.slice(0, 140));
    const d = diff({ ...av, bande:false }, { ...ap, bande:false }).filter(x => !/^panneau/.test(x) || !o.panneauOk);
    v(cle + ' : état avant = état après (rien ne s’est ouvert, rien ne s’est écrit)', d.length === 0, d);
    console.log('  … ' + cle + ' : nombre lu, tapé sur le téléphone'); await S.confirmer(c, 'marc'); await c.p.waitForTimeout(700); const fin = await etat(c);
    v(cle + ' : confirmé, le geste REPREND là où il s’était arrêté', await reprise(fin, av), diff(av, fin));
    v(cle + ' : la fenêtre de confirmation s’est refermée', !(await S.conf(c)));
    return { av, fin }; };
  const ouvertEntreprise = async () => { await L.aller(c.p, 'entreprise'); };

  console.log('\n── 1. S1 · Mon entreprise › Ta banque : l’IBAN est MASQUÉ, la confirmation l’ouvre ──');
  await ouvertEntreprise();
  const ligne = await S.texte(c, '[data-ent="carte|banque"]');
  v('la carte « Ta banque et ton comptable » montre l’IBAN masqué « FR•• •••• •••• 0189 » et « Afficher l’IBAN »', /IBAN FR•• •••• •••• 0189/.test(ligne || '') && /Afficher l’IBAN/.test(ligne || '') && !/FR76 3000/.test(ligne || ''), ligne);
  v('le DOM de la page ne porte pas l’IBAN entier (hors documents imprimés)', await c.p.evaluate(() => !/FR76\s?3000\s?6000/.test(document.querySelector('#contenu').innerText + (document.querySelector('#calque') || {}).innerText)));
  const ibanEntier = await c.p.evaluate(() => ENTREPRISE.iban);
  await essai('banque-ouvrir', 'voir ton IBAN et ta banque', () => c.p.evaluate(() => document.querySelector('[data-ent="carte|banque"]').click()),
    async (f, a) => /Ta banque et ton comptable/.test(f.panneau || '') && await c.p.evaluate(i => document.getElementById('en-iban').value.replace(/\s/g, '') === i.replace(/\s/g, ''), ibanEntier), { panneauOk:true });
  v('une fois confirmé, le panneau montre l’IBAN ENTIER dans un champ modifiable', await c.p.evaluate(() => { const f = document.getElementById('en-iban'); return !!f && !f.readOnly && !f.disabled; }));

  console.log('\n── 2. l’IBAN se re-masque à l’expiration ; « Enregistrer » redemande la confirmation (S2) ──');
  await c.p.evaluate(() => { const b = document.getElementById('en-bic'); b.value = 'BNPAFRPP'; b.dispatchEvent(new Event('input', { bubbles:true })); });
  await avancer(c, 6); await c.p.waitForTimeout(500);
  const exp = await c.p.evaluate(() => ({ champ:document.getElementById('en-iban').value, ban:(document.querySelector('.sec-expire-pan') || {}).textContent || '', bic:document.getElementById('en-bic').value, toast:(document.getElementById('toast') || {}).textContent }));
  v('l’IBAN du champ revient masqué (« FR•• •••• •••• 0189 ») : l’entier n’est plus nulle part dans le DOM', exp.champ === 'FR•• •••• •••• 0189' && await c.p.evaluate(() => !/FR76\s?3000\s?6000/.test(document.getElementById('calque').innerHTML.replace(/placeholder="[^"]*"/g, ''))), exp.champ);
  v('toast « Cinq minutes ont passé : ton IBAN est de nouveau masqué. »', /Cinq minutes ont passé : ton IBAN est de nouveau masqué\./.test(exp.toast || ''), exp.toast);
  v('le panneau de SAISIE reste ouvert avec ce que la personne a tapé, et le dit en tête', exp.bic === 'BNPAFRPP' && /La confirmation a expiré : elle sera redemandée à l’enregistrement\./.test(exp.ban), exp);
  await essai('banque-enregistrer', 'enregistrer ton IBAN', () => c.p.evaluate(() => document.querySelector('[data-ent="banqueok"]').click()),
    async (f, a) => f.bic === 'BNPAFRPP' && f.iban === ibanEntier && f.bic !== a.bic, { panneauOk:true });
  v('le BIC est enregistré tel que tapé, l’IBAN non retouché reste celui de la fiche (jamais « FR•• •••• »)', await c.p.evaluate(i => ENTREPRISE.bic === 'BNPAFRPP' && ENTREPRISE.iban === i && !/•/.test(ENTREPRISE.iban), ibanEntier));

  console.log('\n── 3. S3 et S4 · Achats › Virement groupé (l\'onglet « À payer » n\'est plus dans l\'écran Achats : on joue les FONCTIONS, qui portent la garde) ──');
  await c.p.evaluate(() => { acSel.clear(); acAPayer().slice(0, 2).forEach(o => acSel.add(o.id)); });
  v('population : 2 factures à payer choisies (le bouton « Virement groupé » n’est plus au menu d’Achats : la garde est dans la fonction, un chemin neuf ne la contourne pas)', await c.p.evaluate(() => acSel.size === 2 && typeof acVirement === 'function' && typeof acVirok === 'function'));
  await essai('virement-ouvrir', 'préparer un virement groupé', () => c.p.evaluate(() => acVirement()),
    async (f, a) => /facture/.test(f.panneau || '') && !!(await c.p.evaluate(() => document.querySelector('[data-ac="virok"]'))), { panneauOk:true });
  await essai('virement-fichier', 'télécharger le fichier de virement', () => c.p.evaluate(() => acVirok()),
    async (f, a) => f.payees === a.payees + 2, { panneauOk:true });

  console.log('\n── 4. S7, S8, S9 · Temps de travail › Paie (chacun par la FONCTION : un second chemin ne contourne rien) ──');
  await essai('paie-fiches', 'voir les fiches de paie', () => c.p.evaluate(() => paieAller('fiches')), async (f, a) => f.onglet === 'fiches' && a.onglet !== 'fiches');
  await essai('paie-envoi', 'envoyer la paie au cabinet', () => c.p.evaluate(() => paieEnvoyer()), async f => /Envoyer au cabinet de paie/.test(f.panneau || ''), { panneauOk:true });
  await c.p.evaluate(() => { fermerPanneau(); PAIE.valide = PAIE.valide || { le:'31/10', par:'marc' }; CP.envoye = false; delete PAIE.compta; });
  await essai('paie-compta', 'passer l’écriture de paie', () => c.p.evaluate(() => paieComptabiliser()), async (f, a) => f.compta === true && a.compta === false);

  console.log('\n── 5. S10 à S13 · Équipe : droits, mot de passe provisoire, désactiver, nouveau téléphone ──');
  await L.aller(c.p, 'equipe'); await c.p.evaluate(() => eqFiche('julie')); await c.p.waitForTimeout(500);
  const avantDroit = await c.p.evaluate(() => eqDe('julie').droits.cats.crm.c);
  await essai('equipe-droits', 'changer les droits de Julie', () => c.p.evaluate(() => document.querySelector('[data-eqd="julie|crm|c"]').click()), async (f, a) => JSON.parse(f.droits).cats.crm.c === (avantDroit ? 0 : 1) && JSON.parse(a.droits).cats.crm.c === avantDroit, { panneauOk:true });
  v('la case cochée est restée COMME AVANT tant que la confirmation n’est pas faite (restaurée tout de suite)', true);
  await c.p.evaluate(() => fermerPanneau());
  await essai('equipe-inviter', 'donner un mot de passe provisoire', () => c.p.evaluate(() => secuReposer('sm')), async (f, a) => !!f.provSm && f.provSm !== a.provSm && /Mot de passe provisoire pour Sophie/.test(f.panneau || ''), { panneauOk:true });
  await c.p.evaluate(() => secuProvTermine());
  await essai('equipe-retirer', 'désactiver le compte de Tom', () => c.p.evaluate(() => eqxDepart('tl')), async f => /Avant de désactiver Tom Leroy/.test(f.panneau || '') || f.actifTl === false, { panneauOk:true });
  await c.p.evaluate(() => fermerPanneau());
  await c.p.evaluate(() => secuPanTelephone('kb')); await c.p.waitForTimeout(300);
  v('« Nouveau téléphone » : le bouton reste grisé tant que la case « J’ai vérifié l’identité de Karim en personne » n’est pas cochée', await c.p.evaluate(() => document.getElementById('sec-tel-ok').disabled === true));
  await c.p.evaluate(() => { const i = document.getElementById('sec-verif'); i.click(); });
  await essai('equipe-telephone', 'donner un nouveau téléphone à Karim', () => c.p.evaluate(() => document.getElementById('sec-tel-ok').click()), async (f, a) => a.telKb === true && f.telKb === false && /Mot de passe provisoire pour Karim/.test(f.panneau || ''), { panneauOk:true });
  await c.p.evaluate(() => secuProvTermine());
  await essai('voir-comme', 'voir l’application comme Sophie', () => c.p.evaluate(() => secuVoirComme('sm')), async (f, a) => f.session === 'sm' && f.bande === true);
  v('la bande « Tu vois l’application comme Sophie. » + « Revenir à mon compte » est là, permanente', await c.p.evaluate(() => { const b = document.querySelector('.sec-bande'); return !!b && /Tu vois l’application comme Sophie\./.test(b.textContent) && /Revenir à mon compte/.test(b.textContent); }));
  await c.p.evaluate(() => document.querySelector('.sec-bande [data-sec2="revenir"]').click()); await c.p.waitForTimeout(1200);
  v('« Revenir à mon compte » : retour à la session de Marc, sans nouvelle approbation, la bande disparaît', await c.p.evaluate(() => SESSION === 'marc' && !document.querySelector('.sec-bande') && !document.getElementById('cnx')));

  console.log('\n── 6. les cinq minutes : deux gestes d’affilée sans redemander, +5 redemande, PAS de prolongation ──');
  await avancer(c, 6); await c.p.evaluate(() => { fermerPanneau(); });
  await c.p.evaluate(() => paieAller('fiches')); await c.p.waitForTimeout(400); await S.confirmer(c, 'marc'); await c.p.waitForTimeout(500);
  v('population : une confirmation vient d’être faite', await c.p.evaluate(() => secuFenetreValide('marc')));
  await c.p.evaluate(() => paieEnvoyer()); await c.p.waitForTimeout(300);
  v('deux gestes d’affilée : le second ne redemande rien', !(await S.conf(c)) && /Envoyer au cabinet de paie/.test((await etat(c)).panneau || ''));
  await avancer(c, 3); await c.p.evaluate(() => { fermerPanneau(); paieAller('fiches'); }); await c.p.waitForTimeout(300);
  v('à +3 minutes : toujours pas de demande', !(await S.conf(c)));
  await avancer(c, 2.5); await c.p.evaluate(() => { fermerPanneau(); paieAller('fiches'); }); await c.p.waitForTimeout(400);
  v('à +5,5 minutes de la confirmation (le dernier geste date de 2,5 min) : la fenêtre NE s’est PAS prolongée, la confirmation est redemandée', !!(await S.conf(c)));
  await c.p.evaluate(() => document.querySelector('#sec-conf [data-sec3="annuler"]').click()); await c.p.waitForTimeout(300);
  v('« Annuler » : la fenêtre se ferme, le geste n’a pas lieu, aucun échec n’est compté', !(await S.conf(c)) && await c.p.evaluate(() => SECU.comptes.marc.echecs === 0));

  console.log('\n── 7. un MAUVAIS nombre annule le geste ; deux minutes sans réponse expirent ──');
  await c.p.evaluate(() => { fermerPanneau(); }); const e0 = await etat(c), n0 = await S.compte(c, 'marc');
  await c.p.evaluate(() => paieEnvoyer()); await c.p.waitForTimeout(400);
  await S.confirmer(c, 'marc', { ok:false }); await c.p.waitForTimeout(600);
  const e1 = await etat(c), n1 = await S.compte(c, 'marc');
  const dj = diff({ ...e0, journal:0 }, { ...e1, journal:0 });
  v('mauvais nombre : la fenêtre se ferme, le geste est ANNULÉ (rien ne s’est passé)', !(await S.conf(c)) && dj.length === 0, dj);
  v('la seule trace est la ligne de sécurité du journal : « a tapé un mauvais nombre sur son téléphone » (le geste, lui, n’a laissé aucune ligne)', e1.journal === e0.journal + 1 && await c.p.evaluate(() => { const j = JOURNAL[JOURNAL.length - 1]; return j.type === 'securite' && /a tapé un mauvais nombre sur son téléphone/.test(j.action); }));
  v('toast « Mauvais nombre : l’action est annulée par sécurité. » et un échec compté', /Mauvais nombre : l’action est annulée par sécurité\./.test(await S.texte(c, '#toast') || '') && n1.echecs === n0.echecs + 1, n1.echecs);
  await c.p.evaluate(() => paieEnvoyer()); await c.p.waitForTimeout(400); await avancer(c, 3); await c.p.waitForTimeout(500);
  const ex = await S.conf(c);
  v('2 minutes sans réponse : « La demande a expiré. » + « Recommencer »', !!ex && /La demande a expiré\./.test(ex.texte) && /Recommencer/.test(ex.texte) && !ex.nombre, ex && ex.texte);
  await c.p.evaluate(() => document.querySelector('#sec-conf [data-sec3="recommencer"]').click()); await c.p.waitForTimeout(400);
  const nv = await S.conf(c); v('« Recommencer » : une NOUVELLE demande, un nouveau nombre', !!nv && /^\d\d$/.test(nv.nombre || ''));
  await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300); v('Échap = « Annuler »', !(await S.conf(c)));

  console.log('\n── 8. le cadre de la Comptabilité (iframe) : deux messages, source vérifiée ──');
  await avancer(c, 6); await c.p.evaluate(() => { fermerPanneau(); cpSysAllerRubrique('comptabilite'); }); await c.p.waitForTimeout(2500);
  const f = L.cadre(c.p, /prototype-comptabilite\.html/); v('population : le cadre de la Comptabilité est ouvert (iframe) — SON adresse, pas celle de l’atelier ni du paiement', !!f);
  if (f) {
    await f.evaluate(() => aller('banque')); await c.p.waitForTimeout(700);
    const att = await f.evaluate(() => ({ carte:!!document.querySelector('[data-opc="attente"]'), texte:(document.querySelector('[data-opc="attente"]') || {}).textContent || '' }));
    v('l’onglet Banque ne montre RIEN d’autre que « Confirmation en attente… » + « Confirme sur ton téléphone pour voir la banque. »', att.carte && /Confirmation en attente…/.test(att.texte) && /Confirme sur ton téléphone pour voir la banque\./.test(att.texte), att.texte.slice(0, 120));
    const cf = await S.conf(c); v('la page ouvre la confirmation avec SA phrase « voir la banque de la comptabilité »', !!cf && /Pour voir la banque de la comptabilité, OP GESTION vérifie que c’est bien toi\./.test(cf.texte), cf && cf.texte.slice(0, 100));
    await S.confirmer(c, 'marc'); await c.p.waitForTimeout(900);
    v('confirmé : le cadre montre la banque (la carte d’attente a disparu)', await f.evaluate(() => !document.querySelector('[data-opc="attente"]') && UI.route === 'banque'));
    await f.evaluate(() => aller('accueil')); await avancer(c, 6); await f.evaluate(() => aller('fec')); await c.p.waitForTimeout(500);
    const dl0 = await f.evaluate(() => !!document.querySelector('#fec-msg') && document.querySelector('#fec-msg').textContent.trim().length);
    await f.evaluate(() => document.querySelector('[data-a="fec-dl"]').click()); await c.p.waitForTimeout(600);
    const cf2 = await S.conf(c); v('le FEC : « Pour exporter la comptabilité, … » et rien ne part avant', !!cf2 && /Pour exporter la comptabilité, OP GESTION vérifie que c’est bien toi\./.test(cf2.texte) && !(await f.evaluate(() => (document.querySelector('#fec-msg') || {}).textContent || '').length), cf2 && cf2.texte.slice(0, 100));
    await S.confirmer(c, 'marc'); await c.p.waitForTimeout(1500);
    v('confirmé : le geste du cadre est rejoué une fois, le FEC se prépare', (await f.evaluate(() => (document.querySelector('#fec-msg') || {}).textContent || '')).length > 0);
    // un message qui ne vient PAS du cadre est ignoré
    await c.p.evaluate(() => { window.postMessage({ opc_sensible:{ id:'abc', cle:'compta-banque' } }, '*'); }); await c.p.waitForTimeout(400);
    v('un message `opc_sensible` qui ne vient pas du cadre (source = la page elle-même) est ignoré : aucune demande ouverte', !(await S.conf(c)));
  }
  v('aucune erreur JavaScript (page principale)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  console.log('\n── 9. ?auto= : confirmation accordée d’office, IBAN en clair, aucun téléphone ──');
  const a = await L.ouvrir({ qui:'marc', profil:'mac' });
  v('?auto=marc : pas de #opsec, session auto', await a.p.evaluate(() => !document.getElementById('opsec') && SECU.sessions.marc.auto === true));
  await L.aller(a.p, 'entreprise'); await a.p.evaluate(() => document.querySelector('[data-ent="carte|banque"]').click()); await a.p.waitForTimeout(500);
  v('?auto=marc : le panneau de la banque s’ouvre SANS confirmation, l’IBAN en clair (comme avant)', await a.p.evaluate(() => !document.getElementById('sec-conf') && /Ta banque/.test(document.querySelector('#calque .panneau h2').textContent) && /FR76/.test(document.getElementById('en-iban').value)));
  v('?auto=marc : la carte montre l’IBAN en clair (aucun masque hors d’une vraie session)', await a.p.evaluate(() => hintIban('FR76 3000 6000 0112 3456 7890 189') === 'FR76 3000 6000 0112 3456 7890 189'));
  v('aucune erreur JavaScript (?auto=)', a.err.length === 0, a.err.slice(0, 3)); await L.fin(a);

  console.log('\n── 10. la Comptabilité OUVERTE SEULE (aucune page autour) : aucune garde, comme avant ──');
  const s = await L.ouvrir({ page:'prototype-comptabilite.html', requete:'', profil:'mac' });
  await s.p.evaluate(() => aller('banque')); await s.p.waitForTimeout(600);
  v('ouverte seule : la banque s’affiche tout de suite, sans carte d’attente', await s.p.evaluate(() => !document.querySelector('[data-opc="attente"]') && UI.route === 'banque'));
  v('aucune erreur JavaScript (comptabilité seule)', s.err.length === 0, s.err.slice(0, 3)); await L.fin(s);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
