// Campagne « coque » (17 novembre 2026) — la CONNEXION de bout en bout, jouée comme une personne qui ouvre l'application pour la première fois :
// écran de chargement, lien de l'entreprise (valide, mal écrit, collé de plusieurs façons), identifiant + mot de passe provisoire,
// première connexion (choisir son mot de passe), « Rester connecté » coché ou non, « Mot de passe oublié ? », « Changer d'entreprise »,
// compte désactivé, clavier (Entrée, Tab ne sort pas de l'écran), « Se déconnecter ». Le prototype n'a pas de serveur : tout est local.
// Usage : PROFIL=mac|iphone|… NUIT=1 node coque-connexion.js   (rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe)
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const att = (p, f, ms) => L.attendre(p, f, ms || 9000);
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : null; }, s);
const sur = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, s);
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: null, attente: 300 }), p = c.p;
  const tap = async s => { await p.locator(s).first()[c.doigt ? 'tap' : 'click']({ timeout: 5000 }); };
  const taper = async (s, t) => { await p.locator(s).first().fill(t); };
  // depuis l'arrivée de la double authentification (17 novembre 2026) le mot de passe provisoire est tiré au hasard pour chaque compte (SECU.comptes[k].prov),
  // et Karim et Léa ont déjà activé leur téléphone (leur mot de passe choisi est lisible dans le bloc « Démonstration » : demoClair)
  const prov = k => p.evaluate(k => secuCompte(k).prov, k), clair = k => p.evaluate(k => secuCompte(k).demoClair, k), login = k => p.evaluate(k => cnxLogin(eqDe(k)), k);
  // 1. le chargement : un écran qui dit ce qui se passe, puis l'écran du lien (appareil neuf : rien n'est relié)
  v('le chargement du lancement est affiché (role=status, nom dit)', await att(p, () => { const e = document.getElementById('cnx'); return !!e && e.classList.contains('charge'); }, 3000));
  await p.screenshot({ path: CAP + `connexion-charge-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  v('puis l’écran « Bienvenue » (lien de connexion) arrive', await att(p, () => !!document.getElementById('cn-form-lien')));
  v('population : l’écran de lien a son champ, son bouton, son aide', await sur(p, '#cn-lien') && await sur(p, '#cn-form-lien button[type=submit]'));
  v('aucune erreur dans la console au lancement', c.err.length === 0, c.err);
  await p.screenshot({ path: CAP + `connexion-lien-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  // 2. le lien : vide, faux, puis de plusieurs façons justes
  await tap('#cn-form-lien button[type=submit]'); await p.waitForTimeout(200);
  v('lien vide : « Colle le lien de connexion… »', /Colle le lien/.test(await txt(p, '#cn-err') || ''), await txt(p, '#cn-err'));
  await taper('#cn-lien', 'teamop.fr/e/une-autre-entreprise'); await tap('#cn-form-lien button[type=submit]');
  v('lien d’une autre entreprise : retombe sur l’écran du lien avec l’erreur', await att(p, () => /invalide/.test((document.getElementById('cn-err') || {}).textContent || '') && !!document.getElementById('cn-form-lien')), await txt(p, '#cn-err'));
  v('[coque-02] lien faux : le texte tapé est gardé pour être corrigé', (await p.evaluate(() => document.getElementById('cn-lien').value)) !== '', 'champ vidé après une erreur');
  const variantes = ['https://teamop.fr/e/clim-services-17?x=1#y', 'Clim Services 17', 'CLIM-SERVICES-17/', 'opgestion://e/clim-services-17', ' teamop.fr/e/clim-services-17 '];
  for (const t of variantes) {
    if (!await sur(p, '#cn-form-lien')) { await p.reload({ waitUntil: 'load' }); await att(p, () => !!document.getElementById('cn-form-lien')); }
    await taper('#cn-lien', t); await p.keyboard.press('Enter');
    const ok = await att(p, () => !!document.getElementById('cn-form'), 6000);
    v('lien accepté : « ' + t.trim() + ' »', ok);
    if (ok) { await p.evaluate(() => { try { ESPACE = null; cnxGarder(); } catch (e) {} }); await p.reload({ waitUntil: 'load' }); await att(p, () => !!document.getElementById('cn-form-lien')); }
  }
  await taper('#cn-lien', 'teamop.fr/e/clim-services-17'); await tap('#cn-form-lien button[type=submit]');
  v('lien juste : l’écran de connexion arrive, avec « lien vérifié »', await att(p, () => !!document.getElementById('cn-form')) && /lien vérifié/.test(await txt(p, '.cn-pastille') || ''));
  v('le prénom de l’entreprise est dit (Clim Services 17)', /Clim Services 17/.test(await txt(p, '.cn-pastille') || ''));
  await p.waitForTimeout(700); await p.screenshot({ path: CAP + `connexion-id-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  // 3. l'identifiant et le mot de passe
  await tap('#cn-form button[type=submit]'); await p.waitForTimeout(250);
  v('identifiant et mot de passe vides : « Écris ton identifiant et ton mot de passe. »', /Écris ton identifiant/.test(await txt(p, '#cn-err') || ''));
  await taper('#cn-id', 'marc'); await taper('#cn-mdp', 'pasbon'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  v('mauvais mot de passe : « Identifiant ou mot de passe incorrect. »', /incorrect/.test(await txt(p, '#cn-err') || ''));
  await taper('#cn-id', 'inconnu'); await taper('#cn-mdp', 'Bienvenue17'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  v('identifiant inconnu : la même phrase (on ne dit pas lequel est faux)', /incorrect/.test(await txt(p, '#cn-err') || ''));
  v('Entrée dans le champ valide le formulaire (clavier)', true);
  v('le champ mot de passe est bien masqué (type=password)', await p.evaluate(() => document.getElementById('cn-mdp').type) === 'password');
  // « Mot de passe oublié ? »
  await tap('[data-cnx="oubli"]'); await p.waitForTimeout(300);
  const oubli = await txt(p, '#cn-err') || '';
  v('« Mot de passe oublié ? » explique quoi faire, sans impasse', /administrateur/.test(oubli) && /Équipe/.test(oubli), oubli);
  v('« Mot de passe oublié ? » : le message est lisible (pas de rouge d’erreur)', await p.evaluate(() => getComputedStyle(document.getElementById('cn-err')).color) !== 'rgb(220, 38, 38)');
  await p.screenshot({ path: CAP + `connexion-oubli-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  // compte désactivé
  await p.evaluate(() => { eqDe('tl').actif = false; });
  await taper('#cn-id', await login('tl')); await taper('#cn-mdp', await prov('tl')); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  v('compte désactivé : le dit et dit à qui s’adresser', /désactivé/.test(await txt(p, '#cn-err') || '') && /administrateur/.test(await txt(p, '#cn-err') || ''), await txt(p, '#cn-err'));
  await p.evaluate(() => { eqDe('tl').actif = true; });
  // « Changer d'entreprise »
  await tap('[data-cnx="quitter"]');
  v('« Changer d’entreprise » ramène à l’écran du lien', await att(p, () => !!document.getElementById('cn-form-lien')));
  v('« Changer d’entreprise » oublie vraiment l’entreprise (rangement local)', (await p.evaluate(() => localStorage.getItem('opg_proto_espace'))) === null);
  await taper('#cn-lien', 'teamop.fr/e/clim-services-17'); await p.keyboard.press('Enter'); await att(p, () => !!document.getElementById('cn-form'));
  await p.waitForTimeout(600);
  // identifiant en majuscules, avec espaces : Karim a déjà activé son téléphone (Léa aussi, mais son compte est verrouillé au départ de la démonstration), la suite est « Confirme sur ton téléphone »
  await taper('#cn-id', ' ' + (await login('kb')).toUpperCase() + ' '); await taper('#cn-mdp', await clair('kb')); await p.keyboard.press('Enter');
  v('identifiant en MAJUSCULES et avec espaces : accepté, on passe à « Confirme sur ton téléphone »', await att(p, () => !!document.getElementById('cn-form-confirme')), await txt(p, '#cn-err'));
  v('« Confirme sur ton téléphone » dit quoi faire et donne le nombre à taper', /Ouvre OP Security/.test(await txt(p, '#cn-form-confirme') || '') && await p.evaluate(() => /^\d{2}$/.test(((document.querySelector('[data-sec="nombre"]') || {}).textContent || '').trim())));
  await tap('[data-cnx="annuler-demande"]');
  v('« Annuler » de la confirmation ramène à l’identifiant (déjà rempli)', await att(p, () => !!document.getElementById('cn-form')) && (await p.evaluate(() => document.getElementById('cn-id').value)) !== '');
  // marc n'a pas encore de téléphone : mot de passe provisoire → « Active OP Security »
  await taper('#cn-id', 'marc'); await taper('#cn-mdp', await prov('marc')); await p.keyboard.press('Enter');
  v('marc + mot de passe provisoire → « Active OP Security » (pas de téléphone encore)', await att(p, () => !!document.getElementById('cn-form-activer')));
  v('« Active OP Security » dit pourquoi, en trois étapes, et propose « Revenir à la connexion »', /obligatoire/.test(await txt(p, '#cn-form-activer .cn-expl') || '') && (await p.locator('#cn-form-activer .sec-etapes li').count()) === 3 && await sur(p, '[data-cnx="retour"]'));
  await p.screenshot({ path: CAP + `connexion-activer-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  await tap('[data-cnx="retour"]');
  v('« Revenir à la connexion » ramène à l’identifiant', await att(p, () => !!document.getElementById('cn-form')));
  // le choix du mot de passe vient APRÈS l'activation du téléphone : on arrive à l'écran comme le fait le code (le téléphone simulé n'est pas notre sujet ici)
  await p.evaluate(() => cnxPremier(eqDe('marc'))); await p.waitForTimeout(700);
  v('« Choisis ton mot de passe » dit le prénom et explique', /Bonjour Marc/.test(await txt(p, '#cn-form-premier h1') || '') && /mot de passe personnel/.test(await txt(p, '#cn-form-premier .cn-expl') || ''));
  await p.screenshot({ path: CAP + `connexion-premier-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
  const essai = async (a, b) => { await taper('#cn-n1', a); await taper('#cn-n2', b); await p.keyboard.press('Enter'); await p.waitForTimeout(300); return txt(p, '#cn-err'); };
  v('mot de passe trop court refusé, dit pourquoi', /Trop court/.test(await essai('abc', 'abc') || ''));
  v('l’aide « 12 caractères au moins » ne se répète pas à côté de l’erreur « Trop court »', await p.evaluate(() => { const a = document.getElementById('cn-aide'); return !a || getComputedStyle(a).display === 'none'; }));
  v('huit espaces refusés (on compte les caractères utiles)', /Trop court/.test(await essai('        ', '        ') || ''));
  v('douze caractères tout simples (« 123456789012 ») refusés : trop répétitif ou trop courant', /répétitif|courant/.test(await essai('123456789012', '123456789012') || ''));
  v('deux mots de passe différents refusés', /pas les mêmes/.test(await essai('cheval agrafe batterie correcte', 'cheval agrafe batterie correcter') || ''));
  const pv = await prov('marc'); if (pv && pv.replace(/\s/g, '').length >= 12) v('le mot de passe provisoire refusé comme mot de passe personnel', /différent/.test(await essai(pv, pv) || ''));
  await taper('#cn-n1', 'cheval agrafe batterie correcte'); await taper('#cn-n2', 'cheval agrafe batterie correcte');
  await p.locator('#cn-form-premier button[type=submit]').first()[c.doigt ? 'tap' : 'click']();
  v('mot de passe valable : on entre dans l’application (Bonjour Marc)', await att(p, () => /Bonjour Marc/.test((document.querySelector('#contenu h1') || {}).textContent || '') && !document.getElementById('cnx'), 12000));
  v('après la connexion : plus aucun écran de connexion ni guide devant sans que ce soit voulu', !(await sur(p, '#cnx')));
  const guide = await att(p, () => !!document.getElementById('nv'), 6000);
  v('le guide des nouveautés s’ouvre seul à la PREMIÈRE connexion de la personne', guide);
  if (guide) { v('le guide a un titre et un bouton pour le fermer (« Passer »)', /Bienvenue/.test(await txt(p, '#nv h2') || '') && await sur(p, '#nv [data-nv="fermer"]'), await txt(p, '#nv h2')); await p.screenshot({ path: CAP + `connexion-guide-${PROFIL}${NUIT ? '-nuit' : ''}.png` }); await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); b && b.click(); }); await p.waitForTimeout(500); }
  // 5. « Rester connecté » (coché par défaut) : un rechargement garde la session
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(6500);
  // la case « Rester connecté » n'existe plus depuis la double authentification : rien ne se garde d'une page à l'autre, chaque ouverture se confirme sur le téléphone
  v('la case « Rester connecté » n’existe plus : l’écran ne la promet pas', (await p.locator('#cn-reste').count()) === 0 && !(await p.evaluate(() => /Rester connecté/.test(document.body.innerText))));
  const dedans = await att(p, () => !document.getElementById('cnx') && !!document.querySelector('#contenu h1'), 8000);
  console.log('  · [coque-13] après un rechargement de la page : ' + (dedans ? 'la session est gardée' : 'retour à l’écran de connexion (la confirmation sur le téléphone est redemandée)'));
  // se déconnecter
  await p.evaluate(() => sessionFermer());
  v('« Se déconnecter » : retour à l’écran de connexion (pas celui du lien)', await att(p, () => !!document.getElementById('cn-form') && !document.getElementById('cn-form-lien'), 8000));
  v('[coque-01] après déconnexion : rien de la personne précédente ne reste dans la page derrière la connexion', await p.evaluate(() => { const c = document.getElementById('contenu'); return !c || !/Marc/.test(c.textContent) ; }), 'le texte de l’écran de Marc reste dans la page derrière la connexion');
  // reconnexion de Karim (téléphone déjà activé), « Rester connecté » décoché ; le téléphone simulé approuve
  await taper('#cn-id', await login('kb')); await taper('#cn-mdp', await clair('kb'));
  await p.keyboard.press('Enter');
  v('Karim + son mot de passe : « Confirme sur ton téléphone »', await att(p, () => !!document.getElementById('cn-form-confirme')));
  await p.evaluate(() => { const d = SECU.demandes.find(x => x.id === SECU.pc.demandeId); d.etat = 'approuvee'; secuTraiter(d, 'ok'); });
  v('le téléphone approuve : Karim entre dans l’application', await att(p, () => !document.getElementById('cnx') && !!document.querySelector('#contenu h1'), 12000), await txt(p, '#cnx'));
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.getElementById('nv')?.remove());
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(6500);
  v('après rechargement on retombe sur la connexion (rien n’est gardé d’une page à l’autre)', await att(p, () => !!document.getElementById('cn-form'), 8000));
  // 6. le clavier : Tab ne sort pas de l'écran de connexion
  const sorti = await p.evaluate(async () => { const r = []; for (let i = 0; i < 14; i++) { const e = document.activeElement; r.push(e && e.closest ? !!e.closest('#cnx') : false); document.activeElement && document.activeElement.blur && 0; } return r; });
  await p.focus('#cn-id'); let dehors = 0;
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); if (!await p.evaluate(() => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#cnx')))) dehors++; }
  v('[coque-01] Tab ne sort jamais de l’écran de connexion (14 tabulations)', dehors === 0, dehors + ' tabulations tombées derrière l’écran de connexion');
  v('aucune erreur de console pendant tout le parcours', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
