// Sonde « secu-activation » (double authentification, étape 2, § 3.3) : la PREMIÈRE connexion de chaque rôle, de bout en bout.
// Population : 5 personnes (Marc gérant, Julie secrétariat, Sophie technicienne, Tom passé en comptable, plus Karim qui a déjà son téléphone et sert de témoin).
// Pour Marc, TOUT est joué : écran A, le téléphone (PIN trop simples, PIN différents, code d'activation faux / trop court / expiré / déjà servi),
// nom d'appareil piégé, écran B (code à 6 chiffres faux, juste, rejoué), écran C (11 refus de mot de passe, un accepté), entrée, appareil reconnu.
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const txt = (c, sel) => c.p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
(async () => {
  const c = await S.ouvrir({ profil:'mac' });
  const dep = await c.p.evaluate(() => ({ n:EQUIPE.length, prets:EQUIPE.filter(p => SECU.comptes[p.k].tel).map(p => p.k), prov:EQUIPE.filter(p => SECU.comptes[p.k].prov).length }));
  v('population de départ : 6 personnes, 2 téléphones prêts (Karim, Léa), 4 mots de passe provisoires', dep.n === 6 && dep.prets.join() === 'kb,lr' && dep.prov === 4, dep);
  console.log('\n── Marc : la première connexion, étape par étape ──');
  const prov = await S.provisoire(c, 'marc');
  v('son mot de passe provisoire (démonstration) a la forme de 3 groupes de 6 signes', /^[A-Za-z2-9]{6}-[A-Za-z2-9]{6}-[A-Za-z2-9]{6}$/.test(prov), prov);
  await S.connecter(c, 'marc', 'pas-le-bon'); v('un mauvais mot de passe : la phrase unique, aucun écran d’activation', /Identifiant ou mot de passe incorrect/.test(await S.erreur(c)) && !await c.p.evaluate(() => !!document.getElementById('cn-form-activer')));
  await S.connecter(c, 'marc', prov); v('le BON provisoire mène à « Active OP Security »', await S.attendreSel(c, '#cn-form-activer', 6000));
  const A = await c.p.evaluate(() => document.getElementById('cnx').textContent.replace(/\s+/g, ' '));
  for (const ph of ['Active OP Security', 'À partir de maintenant, chaque connexion se confirme sur ton téléphone. C’est obligatoire pour tout le monde, y compris le gérant. (C’est ce qu’on appelle la double authentification.)', 'Installe OP Security sur ton téléphone', 'Scanne ce dessin avec l’appareil photo, puis installe l’application (App Store ou Google Play).', 'Ouvre-la et choisis un code PIN', '6 chiffres que toi seul connais. Il protège l’application si on te vole ton téléphone.', 'Scanne ce code d’activation', 'Ou tape-le à la main :', 'Il ne sert qu’une fois et expire dans 15 minutes. Il ne contient aucun secret.', 'Ce code expire dans 14 min', 'J’ai activé l’application', 'Démonstration : dans la vraie application, c’est un vrai code à scanner.'])
    v('écran A : « ' + ph.slice(0, 60) + (ph.length > 60 ? '…' : '') + ' »', A.includes(ph), A.slice(0, 200));
  const code = await txt(c, '[data-sec="code-activation"]');
  v('le code d’activation : 12 signes sans I L O 0 1, groupes de 4', /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/.test(code.trim()), code);
  v('deux dessins de code (installation et activation), déclarés dessins', await c.p.evaluate(() => document.querySelectorAll('#cn-form-activer .sec-qr').length === 2));
  await c.p.click('#cn-form-activer button[type=submit]'); v('« J’ai activé l’application » AVANT d’avoir activé : « OP Security n’est pas encore activée : sur ton téléphone, installe-la, choisis un PIN, puis scanne le code d’activation. »', /OP Security n’est pas encore activée : sur ton téléphone, installe-la, choisis un PIN, puis scanne le code d’activation\./.test(await S.erreur(c)), await S.erreur(c));
  console.log('\n── le téléphone de Marc : installer, PIN, activer ──');
  await S.telephone(c, 'marc');
  v('téléphone neuf : « Commencer » est proposé (l’ordinateur est à l’écran d’activation)', await c.p.evaluate(() => !!document.querySelector('#opsec [data-ops="commencer"]') && /Ta clé d’accès personnelle à OP GESTION/.test(document.querySelector('#opsec .ops-ecran').textContent)));
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="commencer"]').click());
  v('« Choisis un code PIN » / « 6 chiffres que toi seul connais. »', await c.p.evaluate(() => /Choisis un code PIN/.test(document.querySelector('#opsec .ops-ecran').textContent) && /6 chiffres que toi seul connais\./.test(document.querySelector('#opsec .ops-ecran').textContent)));
  const faibles = ['000000', '123456', '654321', '121212', '123123', '012345'];
  for (const p of faibles) { await S.pin(c, p); v('PIN « ' + p + ' » : « Code trop simple. Évite les suites et les répétitions. », on reste au choix du PIN', await c.p.evaluate(() => /Code trop simple\. Évite les suites et les répétitions\./.test(document.querySelector('#opsec .ops-ecran').textContent) && /Choisis un code PIN/.test(document.querySelector('#opsec .ops-ecran').textContent))); }
  await S.pin(c, '135792'); await S.pin(c, '135793'); v('deux PIN différents : « Les deux codes ne correspondent pas. Recommence. » (retour au premier choix)', await c.p.evaluate(() => /Les deux codes ne correspondent pas\. Recommence\./.test(document.querySelector('#opsec .ops-ecran').textContent) && /Choisis un code PIN/.test(document.querySelector('#opsec .ops-ecran').textContent)));
  await S.pin(c, '135792'); v('le PIN accepté mène à « Confirme le code PIN »', await c.p.evaluate(() => /Confirme le code PIN/.test(document.querySelector('#opsec .ops-ecran').textContent)));
  await S.pin(c, '135792'); v('confirmé : « Activer ce téléphone »', await c.p.evaluate(() => /Activer ce téléphone/.test(document.querySelector('#opsec .ops-ecran').textContent) && /Sur l’ordinateur, connecte-toi : un code d’activation s’affiche\./.test(document.querySelector('#opsec .ops-ecran').textContent)));
  const ph = async f => c.p.evaluate(f);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="saisir-code"]').click());
  const saisir = async (code, nom) => { await c.p.evaluate(({ code, nom }) => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = code; if (nom != null) f.querySelector('[data-ops="nom-champ"]').value = nom; f.requestSubmit(); }, { code, nom }); await c.p.waitForTimeout(250); return txt(c, '#opsec .ops-err'); };
  v('un code trop court : « Le code d’activation comporte 12 caractères (ex. 7KQM-3XHP-TW9C). »', /Le code d’activation comporte 12 caractères \(ex\. 7KQM-3XHP-TW9C\)\./.test(await saisir('ABC')), await txt(c, '#opsec .ops-err'));
  v('un code faux : « Ce code n’est pas le bon, ou il a expiré. Demande-en un nouveau sur l’ordinateur. »', /Ce code n’est pas le bon, ou il a expiré\. Demande-en un nouveau sur l’ordinateur\./.test(await saisir(code.trim() === 'AAAA-BBBB-CCCC' ? 'DDDD-EEEE-FFFF' : 'AAAA-BBBB-CCCC')));
  await S.avancer(c, 16); await c.p.waitForTimeout(1500);
  v('15 minutes plus tard, l’ordinateur dit « Ce code a expiré. » et propose « Nouveau code »', await c.p.evaluate(() => /Ce code a expiré\./.test(document.getElementById('cn-form-activer').textContent) && !!document.querySelector('[data-cnx="nouveau-code"]')));
  v('le code expiré (même juste) est refusé par le téléphone', /Ce code n’est pas le bon, ou il a expiré\./.test(await saisir(code.trim())));
  await c.p.click('[data-cnx="nouveau-code"]'); await c.p.waitForTimeout(400); const code2 = (await txt(c, '[data-sec="code-activation"]')).trim();
  v('« Nouveau code » en tire un autre, et l’ancien ne marche plus', code2 !== code.trim() && /^[A-HJKMNP-Z2-9]{4}-/.test(code2) && /Ce code n’est pas le bon/.test(await saisir(code.trim())), { code, code2 });
  console.log('\n── nom d’appareil piégé, activation, code à usage unique ──');
  const piege = '<img src=x onerror="window.__pwn=1"> ' + 'X'.repeat(70);
  const deux = await c.p.evaluate(async ({ code }) => { const a = opsActiverAvec('marc', code, ''), b = opsActiverAvec('marc', code, ''); return { a, b }; }, { code:code2 });
  v('un code d’activation SERT UNE FOIS : le second essai du même code, tout de suite, est refusé', deux.a === true && deux.b === false, deux);
  await c.p.waitForTimeout(1300);
  const t = await c.p.evaluate(() => ({ tel:!!SECU.comptes.marc.tel, nom:SECU.comptes.marc.tel && SECU.comptes.marc.tel.nom, ecran:document.querySelector('#opsec .ops-ecran').textContent, code6:!!document.querySelector('#opsec [data-ops="code6"]') }));
  v('le téléphone est activé (nom par défaut « iPhone de Marc ») et montre ses codes', t.tel && t.nom === 'iPhone de Marc' && t.code6, t);
  { // un nom d'appareil piégé, sur un compte neuf : Julie
    await c.p.evaluate(() => { SECU.telCourant = 'julie'; SECU.pc = { ecran:'activer', k:'julie', demandeId:null }; const j = SECU.comptes.julie; j.codeActivation = { code:'TEST-TEST-TEST', jusqua:secuMaint() + 900000, servi:false }; const u = secuUi('julie'); u.ecran = 'saisie'; u.pinValide = '135792'; opsDessiner(true); });
    const nom = await c.p.evaluate(p => { const f = document.querySelector('#opsec [data-ops="form-activation"]'), n = f.querySelector('[data-ops="nom-champ"]'); n.value = p; n.dispatchEvent(new Event('input', { bubbles:true })); return n.value; }, piege);
    v('à la saisie, le nom d’appareil refuse < > " et reste borné à 60', !/[<>"]/.test(nom) && nom.length <= 60, nom);
    await c.p.evaluate(p => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = 'TEST-TEST-TEST'; f.querySelector('[data-ops="nom-champ"]').value = p; f.requestSubmit(); }, piege); await c.p.waitForTimeout(1300);
    const r = await c.p.evaluate(() => ({ nom:SECU.comptes.julie.tel && SECU.comptes.julie.tel.nom, pwn:window.__pwn, imgs:document.querySelectorAll('#opsec img').length, opt:document.querySelector('#opsec select').innerHTML.includes('<img') }));
    v('un nom d’appareil piégé reste du TEXTE : aucune balise, aucun script lancé, borné à 60', r.nom && r.nom.length <= 60 && !/[<>"]/.test(r.nom) && r.pwn === undefined && r.imgs === 0 && !r.opt, r);
    await c.p.evaluate(() => { SECU.comptes.julie.tel = null; secuUi('julie').tel = null; SECU.comptes.julie.codeActivation = null; secuUi('julie').ecran = 'neuf'; secuUi('julie').pin = ''; opsDessiner(true); }); }
  console.log('\n── écran B : le code à 6 chiffres ──');
  await S.fermerTel(c); await c.p.click('#cn-form-activer button[type=submit]');
  v('« Dernière étape » : « OP Security est activée sur iPhone de Marc. Tape le code à 6 chiffres qu’elle affiche, pour vérifier que tout marche. »', await S.attendreSel(c, '#cn-form-verifier', 6000) && await c.p.evaluate(() => /Dernière étape/.test(document.querySelector('#cnx h1').textContent) && /OP Security est activée sur iPhone de Marc\. Tape le code à 6 chiffres qu’elle affiche, pour vérifier que tout marche\./.test(document.getElementById('cnx').textContent.replace(/\s+/g, ' '))));
  v('le champ du code : chiffres, autocomplete one-time-code, 16 px au moins', await c.p.evaluate(() => { const i = document.getElementById('cn-code6'); return i.inputMode === 'numeric' && i.autocomplete === 'one-time-code' && parseFloat(getComputedStyle(i).fontSize) >= 16; }));
  const juste = await c.p.evaluate(() => secuTotp(SECU.comptes.marc.tel.cle, secuMaint())), faux = juste === '000000' ? '000001' : '000000';
  await c.p.fill('#cn-code6', faux); await c.p.click('#cn-form-verifier button[type=submit]'); v('un mauvais code : « Ce code n’est pas le bon. Vérifie que l’heure de ton téléphone est réglée en automatique. »', /Ce code n’est pas le bon\. Vérifie que l’heure de ton téléphone est réglée en automatique\./.test(await S.erreur(c)), await S.erreur(c));
  await c.p.fill('#cn-code6', juste); await c.p.click('#cn-form-verifier button[type=submit]'); v('le bon code mène à « Bonjour Marc »', await S.attendreSel(c, '#cn-form-premier', 5000) && /Bonjour Marc/.test(await txt(c, '#cnx h1')));
  v('le MÊME code, rejoué, ne vaut plus jamais (un pas déjà servi)', await c.p.evaluate(j => secuVerifierCode(SECU.comptes.marc, j) === false, juste));
  console.log('\n── écran C : choisir son mot de passe (12 caractères) ──');
  const C = await c.p.evaluate(() => document.getElementById('cnx').textContent.replace(/\s+/g, ' '));
  for (const p of ['✓ OP Security est activée sur iPhone de Marc', 'Dernière chose : choisis ton mot de passe personnel. Il remplace le mot de passe provisoire, et toi seul le connais.', '12 caractères au moins. Une phrase de plusieurs mots est idéale, par exemple « cheval agrafe batterie correcte ».', 'Il n’y a pas de code de secours : ton téléphone est ta clé.', 'Enregistrer et entrer'])
    v('écran C : « ' + p.slice(0, 55) + (p.length > 55 ? '…' : '') + ' »', C.includes(p), C.slice(0, 160));
  const refus = [['abc', 'abc', /Trop court : 12 caractères au minimum, sans compter les espaces\./], ['abcdefghijk', 'abcdefghijk', /Trop court/], ['a b c d e f g h i j k', 'a b c d e f g h i j k', /Trop court/], ['azerty123456', 'azerty123456', /Ce mot de passe est trop courant\. Choisis-en un autre\./], ['CLIMSERVICES17', 'CLIMSERVICES17', /trop courant/], ['administrateur', 'administrateur', /trop courant/], ['aaaaaaaaaaaa', 'aaaaaaaaaaaa', /Ce mot de passe est trop répétitif\./], ['abababababab', 'abababababab', /trop répétitif/], ['Cheval-agrafe-1', 'Cheval-agrafe-2', /Les deux mots de passe ne sont pas les mêmes\./], [prov, prov, /Choisis un mot de passe différent du mot de passe provisoire\./], ['123456789012', '123456789012', /trop courant/]];
  let n = 0; for (const [a, b, re] of refus) { await c.p.fill('#cn-n1', a); await c.p.fill('#cn-n2', b); await c.p.click('#cn-form-premier button[type=submit]'); await c.p.waitForTimeout(150); const m = await S.erreur(c); n++; v('refus ' + n + ' sur 11 : « ' + (a === prov ? '(le provisoire)' : a) + ' » → ' + String(re).slice(1, 40), re.test(m) && await c.p.evaluate(() => SESSION === null), m); }
  v('les onze refus sont joués (population)', n === 11);
  v('une seule erreur à la fois, jamais deux phrases superposées', await c.p.evaluate(() => document.querySelectorAll('#cn-err').length === 1));
  const perso = 'Cheval-agrafe-batterie-correcte-2026';
  await c.p.fill('#cn-n1', perso); await c.p.fill('#cn-n2', perso); await c.p.click('#cn-form-premier button[type=submit]');
  v('un mot de passe de 12 signes et plus est accepté : l’application s’ouvre', await S.attendreApp(c, 15000) && await c.p.evaluate(() => SESSION === 'marc'));
  const f = await c.p.evaluate(() => ({ role:ROLE, app:SECU.comptes.marc.appareils.map(a => a.id), prov:SECU.comptes.marc.prov, empreinte:!!SECU.comptes.marc.empreinte, histo:SECU.comptes.marc.histo.length, parc:[...SECU.parcours], tel:SECU.comptes.marc.tel.nom }));
  v('Marc est le gérant dans l’application, son provisoire est mort, son mot de passe est une empreinte', f.role === 'patron' && f.prov === null && f.empreinte, f);
  v('cet ordinateur est « appareil reconnu » de Marc, la connexion est dans son historique', f.app.includes('ici') && f.histo >= 1, f);
  v('« Activer ton téléphone, première connexion » est coché au parcours', f.parc.includes('activer'), f);
  await c.p.evaluate(() => sessionFermer()); await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000); await S.connecter(c, 'marc', prov);
  v('l’ancien provisoire ne marche plus après le choix du mot de passe', /Identifiant ou mot de passe incorrect/.test(await S.erreur(c)) && await c.p.evaluate(() => SESSION === null), await S.erreur(c));
  await c.p.fill('#cn-id', 'marc'); await S.connecter(c, 'marc', perso); v('le nouveau mot de passe marche : on arrive à « Confirme sur ton téléphone »', await S.attendreSel(c, '[data-sec="nombre"]', 5000));
  console.log('\n── les autres rôles : le même chemin, ce que l’application montre ensuite change ──');
  await c.p.evaluate(() => { secuDemarrer(); opsDessiner(true); opsDemo(); sessionFermer(); }); await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000); await c.p.waitForTimeout(500);
  const rolesAttendus = [['julie', 'gestion'], ['sm', 'tech']];
  for (const [k, role] of rolesAttendus) { try { await S.activer(c, k); const r = await c.p.evaluate(() => ({ s:SESSION, role:ROLE, app:SECU.comptes[SESSION].appareils.length, h1:(document.querySelector('#contenu h1') || {}).textContent })); v(k + ' : première connexion complète, l’application s’ouvre au rôle « ' + role + ' »', r.s === k && r.role === role && r.app === 1, r);
      await c.p.evaluate(() => sessionFermer()); await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000); } catch (e) { v(k + ' : première connexion complète', false, String(e.message)); } }
  await c.p.evaluate(() => { eqDe('tl').droits = copieProfil('compta'); });
  try { await S.activer(c, 'tl'); const r = await c.p.evaluate(() => ({ s:SESSION, role:ROLE, cp:typeof cpSysteme !== 'undefined' && cpSysteme })); v('Tom, passé en comptable : première connexion complète, la comptabilité s’ouvre seule en plein écran', r.s === 'tl' && r.role === 'compta' && r.cp, r); } catch (e) { v('Tom (comptable) : première connexion complète', false, String(e.message)); }
  await c.p.evaluate(() => sessionFermer()); await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000);
  const dem = await c.p.evaluate(() => ({ prov:EQUIPE.filter(p => SECU.comptes[p.k].prov).map(p => p.k), choisis:EQUIPE.filter(p => SECU.comptes[p.k].empreinte).map(p => p.k) }));
  v('population finale : Julie, Sophie, Tom ont choisi leur mot de passe ; Marc garde un provisoire (état remis à zéro plus haut)', dem.choisis.includes('julie') && dem.choisis.includes('sm') && dem.choisis.includes('tl') && dem.prov.includes('marc'), dem);
  v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
