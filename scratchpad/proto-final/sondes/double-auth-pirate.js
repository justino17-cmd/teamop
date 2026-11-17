// Sonde « double-auth-pirate » (étape 3, § 4.1 à 4.3) : « Simuler une connexion pirate », « Ce n'est pas moi », le verrouillage, le vol de session.
// Population : Karim (téléphone prêt), Marc (gérant, téléphone activé d'un coup) ; 3 issues du pirate (mauvais nombre, bon nombre = la limite, « Ce n'est pas moi »),
// les SEPT effets du blocage comptés un par un, le compte verrouillé qui refuse même le BON mot de passe (même phrase qu'un mauvais), le vol de session, l'administrateur seul verrouillé.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const GEN = 'Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
const bouton = (c, lib) => c.p.evaluate(l => { const b = [...document.querySelectorAll('#opsec .sec-demo button')].find(x => x.textContent.trim() === l); return b ? { dis:b.disabled, titre:b.title } : null; }, lib);
const clic = (c, lib) => c.p.evaluate(l => { const b = [...document.querySelectorAll('#opsec .sec-demo button')].find(x => x.textContent.trim() === l); b.click(); }, lib);
const avis = c => S.texte(c, '#opsec .sec-demo');
(async () => {
  const c = await S.ouvrir({ profil:'mac' });
  console.log('\n── 0. le bouton est grisé tant que le téléphone affiché n’est pas activé ──');
  const b0 = await bouton(c, 'Simuler une connexion pirate');
  v('le bouton « Simuler une connexion pirate » existe, grisé sur le téléphone de Marc (pas activé), avec son explication', !!b0 && b0.dis && /Disponible après l’activation du téléphone/.test(b0.titre), b0);
  const v0 = await bouton(c, 'Simuler le vol de ma connexion');
  v('« Simuler le vol de ma connexion » est grisé tant que personne n’est connecté', !!v0 && v0.dis, v0);
  await c.p.evaluate(() => { SECU.telCourant = 'kb'; opsDessiner(true); opsDemo(); });
  const b1 = await bouton(c, 'Simuler une connexion pirate');
  v('sur le téléphone de Karim (activé), le bouton s’ouvre', !!b1 && !b1.dis, b1);
  await S.tous(c); await c.p.evaluate(() => { SECU.telCourant = 'marc'; opsDessiner(true); opsDemo(); });
  const rg = await S.entrer(c, 'marc');
  v('population : Marc est connecté (par le nombre), ses 6 collègues ont un téléphone', rg.ok && await c.p.evaluate(() => SESSION === 'marc' && EQUIPE.every(p => SECU.comptes[p.k].tel)), rg.ok);
  const v1 = await bouton(c, 'Simuler le vol de ma connexion');
  v('connecté : « Simuler le vol de ma connexion » s’ouvre', !!v1 && !v1.dis, v1);

  console.log('\n── 1. le pirate : une carte ROUGE sur le téléphone de Karim ──');
  await c.p.evaluate(() => { SECU.telCourant = 'kb'; opsDessiner(true); opsDemo(); });
  const h0 = await S.compte(c, 'kb'), nbDem0 = await c.p.evaluate(() => SECU.demandes.filter(d => d.k === 'kb').length);
  await clic(c, 'Simuler une connexion pirate'); await c.p.waitForTimeout(400);
  const dem = await c.p.evaluate(() => { const d = SECU.demandes.filter(x => x.k === 'kb').slice(-1)[0]; return { source:d.source, appareil:d.appareil, adresse:d.adresse, raisons:d.raisons, nombre:d.nombre, etat:d.etat, heure:d.heure }; });
  v('la demande est du pirate : « Firefox · Linux », 192.0.2.99, état en attente', dem.source === 'pirate' && dem.appareil === 'Firefox · Linux' && dem.adresse === '192.0.2.99' && dem.etat === 'attente', dem);
  v('elle porte les TROIS raisons, mot pour mot', dem.raisons.join('|') === 'Appareil jamais utilisé pour ce compte|Réseau (adresse) jamais utilisé|En dehors des heures de travail habituelles (7 h – 21 h)', dem.raisons);
  v('le nombre du pirate est dans 10–99', dem.nombre >= 10 && dem.nombre <= 99, dem.nombre);
  v('elle compte dans les 6 demandes du quart d’heure (une demande de plus pour Karim)', await c.p.evaluate(n => SECU.demandes.filter(d => d.k === 'kb').length === n + 1, nbDem0));
  const a1 = await avis(c);
  v('le bloc « Démonstration » dit le scénario : « un pirate qui connaît le mot de passe de Karim essaie de se connecter depuis un autre pays »', /un pirate qui connaît le mot de passe de Karim essaie de se connecter depuis un autre pays\. Regarde le téléphone : déverrouille-le avec son PIN si besoin\./.test(a1));
  v('et il montre ce que voit le pirate : le nombre, la limite, la règle', new RegExp('Sur l’écran du pirate, le nombre affiché est ' + dem.nombre + '\\. Si Karim le tape sur son téléphone, il laisse entrer le pirate : c’est la limite de ce système').test(a1) && /ne tape jamais un nombre que tu n’as pas demandé toi-même/.test(a1));
  v('le nombre du pirate n’est dans le DOM que sous « Démonstration » (jamais dans le téléphone)', await c.p.evaluate(n => { const re = new RegExp('(^|\\D)' + n + '(\\D|$)'); const tel = document.querySelector('#opsec .ops-ecran').innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/ style="[^"]*"/g, '').replace(/60 s/g, ''); return !re.test(tel) && !!document.querySelector('#opsec .sec-demo [data-sec="nombre-pirate"]'); }, dem.nombre));
  v('le téléphone de Karim s’affiche (le sélecteur le suit) et reste VERROUILLÉ : il ne s’est pas déverrouillé tout seul', await c.p.evaluate(() => SECU.telCourant === 'kb' && !document.querySelector('#opsec .ops-barre') && /Une demande t’attend/.test(document.querySelector('#opsec .ops-ecran').textContent)));
  await S.deverrouiller(c, 'kb', S.PIN);
  const ca = (await S.cartes(c))[0];
  v('la carte est ROUGE, titrée « Connexion inhabituelle » (jamais « Demande de connexion »)', !!ca && ca.rouge && /Connexion inhabituelle/.test(ca.titre) && !/Demande de connexion/.test(ca.titre), ca && ca.titre);
  v('elle montre l’appareil, l’adresse et l’heure, et les trois raisons sous eux', !!ca && /Appareil\s*Firefox · Linux/.test(ca.texte) && /Adresse\s*192\.0\.2\.99/.test(ca.texte) && /Heure\s*03:12/.test(ca.texte) && SECU_RAISONS_OK(ca.texte), ca && ca.texte);
  function SECU_RAISONS_OK(t) { return /Appareil jamais utilisé pour ce compte/.test(t) && /Réseau \(adresse\) jamais utilisé/.test(t) && /En dehors des heures de travail habituelles/.test(t); }

  console.log('\n── 2. première issue : un MAUVAIS nombre ──');
  await S.approuver(c, 'kb', String(10 + ((dem.nombre - 10 + 1) % 90)), S.PIN);
  const h1 = await S.compte(c, 'kb');
  v('un mauvais nombre : la demande est échouée, un échec compté (le compteur commun)', h1.echecs === h0.echecs + 1 && await c.p.evaluate(() => SECU.demandes.filter(x => x.k === 'kb').slice(-1)[0].etat === 'echouee'), { avant:h0.echecs, apres:h1.echecs });
  v('le téléphone dit « Mauvais nombre : la demande est annulée par sécurité. »', /Mauvais nombre : la demande est annulée par sécurité\./.test(await S.texte(c, '#opsec .ops-ecran')));
  v('l’historique de Karim a une ligne « Mauvais nombre tapé », le journal `login.number_mismatch`', h1.histo === h0.histo + 1 && await c.p.evaluate(() => SECU.comptes.kb.histo[0].resultat === 'nombre' && SECU.journal.some(j => j.action === 'login.number_mismatch' && j.k === 'kb')));
  v('l’avis du bloc dit que le pirate est arrêté (sa demande est annulée)', /Le pirate a tapé un mauvais nombre : sa demande est annulée par sécurité\./.test(await avis(c)));

  console.log('\n── 3. seconde issue : le BON nombre — la limite, jouée ──');
  await clic(c, 'Simuler une connexion pirate'); await c.p.waitForTimeout(300);
  const d2 = await c.p.evaluate(() => SECU.demandes.filter(x => x.k === 'kb').slice(-1)[0]);
  const hv = await S.compte(c, 'kb');
  await S.approuver(c, 'kb', String(d2.nombre), S.PIN);
  const a2 = await avis(c), hn = await S.compte(c, 'kb');
  v('le bon nombre du pirate : « Le pirate est entré. Voilà ce qu’aucune protection ne peut empêcher… »', /Le pirate est entré\. Voilà ce qu’aucune protection ne peut empêcher : une personne qui tape un nombre qu’on lui présente\. Regarde la page Sécurité : la connexion y est en rouge\./.test(a2));
  v('la ligne de Karim est « Connexion approuvée » ROUGE (raisons gardées), l’appareil du pirate est devenu reconnu', await c.p.evaluate(() => { const h = SECU.comptes.kb.histo[0]; return h.resultat === 'approuvee' && h.raisons.length === 3 && h.appareil === 'Firefox · Linux'; }));
  v('le journal `mfa.approved_on_phone` est écrit, au journal de l’entreprise : « a approuvé une connexion inhabituelle »', await c.p.evaluate(() => SECU.journal.some(j => j.action === 'mfa.approved_on_phone' && j.k === 'kb' && /inhabituelle/.test(j.detail)) && JOURNAL.some(j => j.type === 'securite' && j.qui === 'kb' && /a approuvé une connexion inhabituelle/.test(j.action) && j.neuf)));
  await S.L.aller(c.p, 'securite');
  v('la page Sécurité de Marc montre la connexion du pirate en rouge, « Inhabituelle » + « Approuvée sur le téléphone »', await c.p.evaluate(() => { const t = document.querySelector('#contenu').innerText; return /Firefox · Linux/.test(t) && /192\.0\.2\.99/.test(t) && /Inhabituelle/.test(t) && !!document.querySelector('#contenu tr.sec-rouge'); }));

  console.log('\n── 4. troisième issue : « Ce n’est pas moi » (Annuler ne change rien, Bloquer fait les sept effets) ──');
  await c.p.evaluate(() => { SECU.telCourant = 'kb'; opsOuvrir(); opsDessiner(true); opsDemo(); });
  await clic(c, 'Simuler une connexion pirate'); await c.p.waitForTimeout(300);
  // une SECONDE demande de Karim (la sienne, depuis « ici ») pour vérifier qu'elle est retirée elle aussi
  const ids = await c.p.evaluate(() => { const d = secuDemander('kb', 'connexion', { appareil:{ id:'ici', nom:'Chrome · Linux', adresse:'203.0.113.42' }, raisons:[] }); return { pirate:SECU.pirate.id, autre:d && d.id }; });
  await S.deverrouiller(c, 'kb', S.PIN);
  const avantB = await S.compte(c, 'kb'), nbJ = await c.p.evaluate(() => JOURNAL.filter(j => j.type === 'securite').length);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="pas-moi"]').click()); await c.p.waitForTimeout(300);
  const conf = await S.texte(c, '#opsec .ops-carte');
  v('« Ce n’est pas moi » ouvre : « Bloquer cette connexion ? Ton compte sera verrouillé et toutes tes connexions fermées. Un administrateur devra changer ton mot de passe. »', /Bloquer cette connexion \? Ton compte sera verrouillé et toutes tes connexions fermées\. Un administrateur devra changer ton mot de passe\./.test(conf), conf);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="annuler"]').click()); await c.p.waitForTimeout(300);
  const apresA = await S.compte(c, 'kb');
  v('« Annuler » : retour à la carte, RIEN n’est changé (ni verrou, ni historique, ni journal)', await c.p.evaluate(() => !!document.querySelector('#opsec .ops-carte [data-ops="approuver"]')) && apresA.verrou === avantB.verrou && apresA.histo === avantB.histo && await c.p.evaluate(n => JOURNAL.filter(j => j.type === 'securite').length === n, nbJ));
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="pas-moi"]').click()); await c.p.waitForTimeout(200);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="bloquer"]').click()); await c.p.waitForTimeout(500);
  const e = await c.p.evaluate(({ pirate, autre }) => { const k = SECU.comptes.kb, d = id => (SECU.demandes.find(x => x.id === id) || {}).etat;
    return { pirate:d(pirate), autre:d(autre), verrou:k.verrou, session:!!SECU.sessions.kb, hist:k.histo[0], journal:SECU.journal.filter(j => j.k === 'kb').slice(-3).map(j => j.action), tel:document.querySelector('#opsec .ops-ecran').textContent.replace(/\s+/g, ' ') }; }, ids);
  v('effet 1 : la demande est REFUSÉE', e.pirate === 'refusee', e.pirate);
  v('effet 2 : les autres demandes du compte sont retirées', e.autre === 'annulee', e.autre);
  v('effet 3 : le compte est verrouillé SANS durée (par le téléphone)', !!e.verrou && e.verrou.jusqua == null && e.verrou.par === 'telephone', e.verrou);
  v('effet 4 : toutes ses sessions sont fermées (aucune session de Karim)', e.session === false);
  v('effet 5 : une ligne « Bloquée depuis le téléphone » (rouge) dans son historique, avec les connexions fermées comptées', e.hist.resultat === 'bloquee' && e.hist.raisons.length === 3 && 'fermees' in e.hist, e.hist);
  v('effet 6 : journal `login.denied_by_user` puis `account.locked`', e.journal.includes('login.denied_by_user') && e.journal.indexOf('login.denied_by_user') < e.journal.lastIndexOf('account.locked'), e.journal);
  v('effet 7 : le téléphone dit « Connexion bloquée. Ton compte est verrouillé et toutes tes connexions sont fermées. Un administrateur doit changer ton mot de passe. »', /Connexion bloquée\. Ton compte est verrouillé et toutes tes connexions sont fermées\. Un administrateur doit changer ton mot de passe\./.test(e.tel), e.tel.slice(0, 160));
  v('le téléphone reste activé (c’est le pirate qui a été arrêté, pas le téléphone)', await c.p.evaluate(() => !!SECU.comptes.kb.tel && !SECU.comptes.kb.tel.efface));
  v('l’avis du bloc : le pirate est arrêté, le compte verrouillé', /Le pirate est arrêté : Karim a touché « Ce n’est pas moi »/.test(await avis(c)));
  v('journal de l’entreprise : « a bloqué une connexion depuis son téléphone » ET « : compte verrouillé »', await c.p.evaluate(() => JOURNAL.some(j => j.type === 'securite' && j.qui === 'kb' && /a bloqué une connexion depuis son téléphone/.test(j.action) && j.neuf) && JOURNAL.some(j => j.type === 'securite' && j.qui === 'kb' && /compte verrouillé/.test(j.action) && j.neuf)));
  v('la liste de départ du journal : Léa, hier 18:02, « a bloqué une connexion… » (l’Historique ne s’ouvre pas vide)', await c.p.evaluate(() => JOURNAL.some(j => j.type === 'securite' && j.qui === 'lr' && !j.neuf && j.h === '18:02')));

  console.log('\n── 5. le compte verrouillé refuse même le BON mot de passe — par la MÊME phrase qu’un mauvais ──');
  await c.p.evaluate(() => sessionFermer()); await S.attendreSel(c, '#cn-id', 6000); await c.p.waitForTimeout(600);
  const mdpK = await S.provisoire(c, 'kb');
  await S.connecter(c, 'kb', mdpK); const m1 = await S.erreur(c);
  v('bon identifiant, BON mot de passe, compte verrouillé : la phrase générique, rien ne s’ouvre', m1 === GEN && await c.p.evaluate(() => !SESSION), m1);
  await S.connecter(c, 'kb', 'un mot de passe faux 12345'); const m2 = await S.erreur(c);
  v('mot de passe FAUX : exactement la même phrase (aucune fuite sur l’état du compte)', m2 === GEN, m2);
  await S.connecter(c, 'inconnu', 'xxxxxxxxxxxx'); const m3 = await S.erreur(c);
  v('identifiant inconnu : toujours la même phrase', m3 === GEN, m3);

  console.log('\n── 6. le vol de session : la session se ferme, le compte N’EST PAS verrouillé ──');
  const rg2 = await S.entrer(c, 'marc', { mdp:S.MDP_PERSO('marc') }); v('population : Marc se reconnecte (nombre) ', rg2.ok);
  const hm0 = await S.compte(c, 'marc'), jr0 = await c.p.evaluate(() => JOURNAL.filter(j => j.type === 'securite').length);
  await c.p.evaluate(() => { SECU.telCourant = 'marc'; opsOuvrir(); opsDemo(); }); await clic(c, 'Simuler le vol de ma connexion'); await c.p.waitForTimeout(900);
  const ms = await S.texte(c, '#cn-err, .cn-expl, #cnx');
  v('la session est fermée et l’écran dit : « Par sécurité, ta connexion a été fermée : elle a été utilisée depuis un autre navigateur. Reconnecte-toi. »', /Par sécurité, ta connexion a été fermée : elle a été utilisée depuis un autre navigateur\. Reconnecte-toi\./.test(ms || '') && await c.p.evaluate(() => !SESSION), (ms || '').slice(0, 200));
  const hm1 = await S.compte(c, 'marc');
  v('le compte n’est PAS verrouillé, une ligne « Connexion fermée par sécurité » est écrite', hm1.verrou === null && hm1.histo === hm0.histo + 1 && await c.p.evaluate(() => SECU.comptes.marc.histo[0].resultat === 'fermee'));
  v('journal `session.hijack_suspected` et sa ligne à l’entreprise (« connexion utilisée depuis un autre navigateur »)', await c.p.evaluate(() => SECU.journal.some(j => j.action === 'session.hijack_suspected' && j.k === 'marc') && JOURNAL.some(j => j.type === 'securite' && j.qui === 'marc' && /connexion utilisée depuis un autre navigateur/.test(j.action))));
  const rg3 = await S.entrer(c, 'marc', { mdp:S.MDP_PERSO('marc') }); v('Marc se reconnecte tout de suite avec son téléphone (rien n’est verrouillé)', rg3.ok);

  console.log('\n── 7. l’administrateur SEUL verrouillé : le support (démonstration) ──');
  await c.p.evaluate(() => { SECU.telCourant = 'marc'; opsDemo(); });
  const sansBtn = await bouton(c, 'Un administrateur déverrouille mon compte (démonstration)');
  v('tant que l’administrateur n’est pas verrouillé, le bouton du support n’existe pas', sansBtn === null);
  await clic(c, 'Simuler une connexion pirate'); await c.p.waitForTimeout(300);
  await S.deverrouiller(c, 'marc', S.PIN);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="pas-moi"]').click()); await c.p.waitForTimeout(150);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="bloquer"]').click()); await c.p.waitForTimeout(900);
  v('« Ce n’est pas moi » sur le compte connecté : la session de Marc se ferme sur le message de blocage', await c.p.evaluate(() => !SESSION && /Tes connexions ont été fermées : une connexion a été bloquée depuis ton téléphone\. Ton compte est verrouillé jusqu’à ce qu’un administrateur change ton mot de passe\./.test((document.getElementById('cnx') || {}).textContent || '')));
  const btn = await bouton(c, 'Un administrateur déverrouille mon compte (démonstration)');
  v('Marc est le seul administrateur et il est verrouillé : le bouton « Un administrateur déverrouille mon compte (démonstration) » paraît', !!btn && !btn.dis, btn);
  const pr0 = await c.p.evaluate(() => SECU.comptes.marc.prov);
  await clic(c, 'Un administrateur déverrouille mon compte (démonstration)'); await c.p.waitForTimeout(300);
  const aprs = await c.p.evaluate(() => ({ verrou:SECU.comptes.marc.verrou, prov:SECU.comptes.marc.prov }));
  v('le support lève le verrou et pose un NOUVEAU mot de passe provisoire (celui du pirate ne marche plus)', aprs.verrou === null && !!aprs.prov && aprs.prov !== pr0, { ancien:!!pr0 });
  console.log('\n── 8. une dernière vérification : aucune erreur JavaScript ──');
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
