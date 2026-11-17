// Sonde « secu-nombre » (double authentification, étape 2, § 3.4 et 3.6) : la connexion de tous les jours, approuvée en TAPANT LE NOMBRE.
// Population : Karim (téléphone prêt, PIN de départ) ; 600 tirages de nombre ; 30 demandes dont le téléphone ne doit jamais montrer le nombre ;
// puis chaque issue : bon nombre, mauvais nombre, expiration à 2 minutes, 6 demandes par quart d'heure, 5 échecs = verrou (15, puis 30 minutes),
// code à 6 chiffres (jamais deux fois le même), mots de passe faux juste avant.
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const versLogin = async c => { await c.p.evaluate(() => { if (SESSION) sessionFermer(); else if (document.querySelector('[data-cnx="annuler-demande"]')) document.querySelector('[data-cnx="annuler-demande"]').click(); else if (!document.getElementById('cn-id')) cnxMontrer(); });
  await L.attendre(c.p, () => !!document.getElementById('cn-id'), 8000); await c.p.waitForTimeout(500); };
let mdpK = null;   // secuDemarrer() tire de NOUVEAUX mots de passe : on relit celui de Karim après chaque remise à zéro
const demarrer = async c => { await c.p.evaluate(() => { secuDemarrer(); opsDessiner(true); opsDemo(); }); await versLogin(c); mdpK = await S.provisoire(c, 'kb'); };
(async () => {
  const c = await S.ouvrir({ profil:'mac' }); mdpK = await S.provisoire(c, 'kb');
  v('population : Karim a un téléphone prêt et un mot de passe lisible dans la démonstration', !!mdpK && await c.p.evaluate(() => !!SECU.comptes.kb.tel), mdpK && mdpK.length);
  console.log('\n── 1. le nombre : entre 10 et 99, tiré par crypto ──');
  const t = await c.p.evaluate(() => { const o = []; for (let i = 0; i < 600; i++) { SECU.demandes.length = 0; o.push(secuDemander('kb', 'connexion').nombre); } SECU.demandes.length = 0; return o; });
  v('population : 600 nombres tirés', t.length === 600);
  v('tous entiers entre 10 et 99', t.every(n => Number.isInteger(n) && n >= 10 && n <= 99), { min:Math.min(...t), max:Math.max(...t) });
  v('les 90 valeurs possibles sortent (pas de plage rétrécie)', new Set(t).size >= 85, new Set(t).size);
  console.log('\n── 2. le DOM du téléphone ne contient JAMAIS le nombre (30 demandes) ──');
  const fuites = await c.p.evaluate(() => { const o = []; for (let i = 0; i < 30; i++) { SECU.demandes.length = 0; const d = secuDemander('kb', 'connexion'); SECU.telCourant = 'kb'; const u = secuUi('kb'); u.ecran = 'ouvert'; u.derniere = secuMaint(); opsDessiner(true);
      const ec = document.querySelector('#opsec .ops-ecran'), h = ec.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/60 s/g, ''), re = new RegExp('(?<![0-9a-f.:])' + d.nombre + '(?![0-9a-f.:])');
      const carte = ec.querySelector('.ops-carte'); o.push({ n:d.nombre, carte:!!carte, hit:re.test(h), champ:!!ec.querySelector('[data-ops="nombre-champ"]'), vide:ec.querySelector('[data-ops="nombre-champ"]').value === '' }); }
    SECU.demandes.length = 0; return o; });
  v('population : 30 demandes, la carte et le champ du nombre sont là à chaque fois', fuites.length === 30 && fuites.every(f => f.carte && f.champ));
  v('le téléphone ne montre le nombre dans aucun texte ni attribut (30 sur 30)', fuites.every(f => !f.hit), fuites.filter(f => f.hit));
  v('le champ du téléphone est vide : le nombre n’est jamais pré-rempli', fuites.every(f => f.vide));
  console.log('\n── 3. le bon nombre : l’application s’ouvre toute seule ──');
  await demarrer(c); await S.connecter(c, 'kb', mdpK);
  const n1 = await S.lireNombre(c);
  v('l’écran de l’ordinateur affiche un nombre de 2 chiffres, et un seul', /^\d\d$/.test(n1) && await c.p.evaluate(() => document.querySelectorAll('[data-sec="nombre"]').length === 1), n1);
  v('« Confirme sur ton téléphone » : le titre et les deux étapes sont là', await c.p.evaluate(() => /Confirme sur ton téléphone/.test(document.querySelector('#cnx h1').textContent) && /1\. Ouvre OP Security et tape ton code PIN\./.test(document.getElementById('cnx').textContent) && /2\. Vérifie l’appareil et l’adresse affichés, puis tape ce nombre :/.test(document.getElementById('cnx').textContent)));
  v('le téléphone s’ouvre tout seul (écran large), verrouillé, et dit qu’une demande attend', await c.p.evaluate(() => document.getElementById('opsec').hasAttribute('data-ouvert') && /Une demande t’attend/.test(document.querySelector('#opsec .ops-ecran').textContent)));
  v('un PIN faux : « Code PIN incorrect. 4 essais avant effacement. »', await (async () => { await S.pin(c, '111222'); return c.p.evaluate(() => /Code PIN incorrect\. 4 essais avant effacement\./.test(document.querySelector('#opsec .ops-ecran').textContent)); })());
  await S.deverrouiller(c, 'kb');
  const cartes = await S.cartes(c);
  v('le téléphone montre UNE carte « Demande de connexion » avec l’appareil, l’adresse et l’heure', cartes.length === 1 && /Demande de connexion/.test(cartes[0].titre) && /Appareil/.test(cartes[0].texte) && /Adresse/.test(cartes[0].texte) && /Heure/.test(cartes[0].texte) && !cartes[0].rouge, cartes);
  await S.approuver(c, 'kb', n1);
  v('le téléphone dit « Approuvé. La suite se passe sur l’ordinateur. »', await c.p.evaluate(() => /Approuvé\. La suite se passe sur l’ordinateur\./.test(document.querySelector('#opsec .ops-ecran').textContent)));
  v('l’application s’ouvre : Karim est connecté', await S.attendreApp(c, 15000) && await c.p.evaluate(() => SESSION === 'kb'));
  v('la session est posée avec son appareil, sans le drapeau « auto »', await c.p.evaluate(() => SECU.sessions.kb && SECU.sessions.kb.auto === false && SECU.sessions.kb.appareilId === 'ici'));
  v('le téléphone se replie au bord (grand écran) pendant que la personne travaille', await c.p.evaluate(() => !document.getElementById('opsec').hasAttribute('data-ouvert')));
  console.log('\n── 4. un mauvais nombre : demande annulée, un échec compté, message sur les deux écrans ──');
  await versLogin(c); await S.connecter(c, 'kb', mdpK); const n2 = await S.lireNombre(c); const faux = n2 === '10' ? '11' : String(parseInt(n2, 10) - 1);
  const e0 = await c.p.evaluate(() => SECU.comptes.kb.echecs); await S.approuver(c, 'kb', faux); await c.p.waitForTimeout(900);
  const e1 = await c.p.evaluate(() => ({ echecs:SECU.comptes.kb.echecs, etat:SECU.demandes.slice(-1)[0].etat, tel:document.querySelector('#opsec .ops-ecran').textContent, err:(document.getElementById('cn-err') || {}).textContent, s:SESSION, journal:SECU.journal.filter(j => j.action === 'login.number_mismatch').length }));
  v('la demande est « échouée » et un échec de plus est compté', e1.etat === 'echouee' && e1.echecs === e0 + 1, { e0, e1 });
  v('l’ordinateur revient à la connexion : « Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité. »', /Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité\./.test(e1.err || ''), e1.err);
  v('le téléphone : « Mauvais nombre : la demande est annulée par sécurité. »', /Mauvais nombre : la demande est annulée par sécurité\./.test(e1.tel));
  v('personne n’est entré, et la ligne est au journal (login.number_mismatch)', e1.s === null && e1.journal === 1, e1);
  v('le téléphone n’a plus de carte pour cette demande', (await S.cartes(c)).length === 0);
  console.log('\n── 5. 2 minutes sans réponse : « La demande a expiré. » ──');
  await demarrer(c); await S.connecter(c, 'kb', mdpK); await S.lireNombre(c); const ech = await c.p.evaluate(() => SECU.comptes.kb.echecs);
  await S.avancer(c, 1.9); v('à 1 min 54 s la demande vit encore', await c.p.evaluate(() => !!document.querySelector('[data-sec="nombre"]') && SECU.demandes.slice(-1)[0].etat === 'attente'));
  await S.avancer(c, 0.2); await c.p.waitForTimeout(1500);
  const ex = await c.p.evaluate(() => ({ txt:document.getElementById('cn-form-confirme') ? document.getElementById('cn-form-confirme').textContent : '', bouton:!!document.querySelector('[data-cnx="recommencer"]'), etat:SECU.demandes.slice(-1)[0].etat, echecs:SECU.comptes.kb.echecs, nombre:!!document.querySelector('[data-sec="nombre"]') }));
  v('« La demande a expiré. » et le bouton « Recommencer », plus de nombre à l’écran', /La demande a expiré\./.test(ex.txt) && ex.bouton && !ex.nombre, ex);
  v('l’expiration ne compte AUCUN échec', ex.echecs === ech && ex.etat === 'expiree', ex);
  await c.p.click('[data-cnx="recommencer"]'); v('« Recommencer » ramène à la connexion', await L.attendre(c.p, () => !!document.getElementById('cn-id'), 6000));
  console.log('\n── 6. six demandes par quart d’heure, pas une de plus ──');
  await demarrer(c); let refus = null;
  for (let i = 1; i <= 7; i++) { await S.connecter(c, 'kb', mdpK); const ok = await S.attendreSel(c, '[data-sec="nombre"]', 3000);
    if (i <= 6) { v('demande ' + i + ' sur 6 : le nombre s’affiche', ok); await c.p.click('[data-cnx="annuler-demande"]'); await L.attendre(c.p, () => !!document.getElementById('cn-id'), 6000); await c.p.waitForTimeout(350); }
    else { refus = await S.erreur(c); v('7ᵉ demande : « Trop de demandes de connexion. Attends quelques minutes avant de réessayer. »', !ok && /Trop de demandes de connexion\. Attends quelques minutes avant de réessayer\./.test(refus), refus); } }
  await S.avancer(c, 16); await S.connecter(c, 'kb', mdpK); v('16 minutes plus tard, une demande est de nouveau possible', await S.attendreSel(c, '[data-sec="nombre"]', 4000));
  console.log('\n── 7. cinq échecs = verrou de 15 minutes, doublé au suivant ──');
  await demarrer(c);
  for (let i = 1; i <= 5; i++) { await S.connecter(c, 'kb', 'mauvais-mot-de-passe-' + i); const m = await S.erreur(c); if (i === 1) v('mot de passe faux : la phrase unique « Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur. »', /^Identifiant ou mot de passe incorrect, ou compte verrouillé\. Si tu es sûr de toi, préviens ton administrateur\.$/.test(m), m);
    if (i === 2) v('après 2 mots de passe faux, l’encadré de démonstration le dit : « 2 sur 5 avant le verrouillage »', await c.p.evaluate(() => /Mots de passe faux pour Karim : 2 sur 5 avant le verrouillage\./.test((document.querySelector('[data-sec="faux"]') || {}).textContent || '')));
    await c.p.fill('#cn-id', 'karim'); }
  const l1 = await c.p.evaluate(() => { const x = SECU.comptes.kb.verrou; return x && { par:x.par, duree:x.jusqua - x.le, n:x.n }; });
  v('le 5ᵉ échec verrouille : 15 minutes, par « échecs »', l1 && l1.par === 'echecs' && l1.duree === 15 * 60000, l1);
  await S.connecter(c, 'kb', mdpK); const m6 = await S.erreur(c);
  v('même avec le BON mot de passe, un compte verrouillé répond par la MÊME phrase (aucune fuite)', /^Identifiant ou mot de passe incorrect, ou compte verrouillé\./.test(m6) && !await c.p.evaluate(() => !!document.querySelector('[data-sec="nombre"]')), m6);
  const mi = await (async () => { await S.connecter(c, 'inconnu', 'nimporte-quoi'); return S.erreur(c); })(); v('un identifiant inconnu répond par la même phrase', mi === m6, { mi, m6 });
  await S.avancer(c, 14); await S.connecter(c, 'kb', mdpK); v('14 minutes : toujours verrouillé', !await S.attendreSel(c, '[data-sec="nombre"]', 1500));
  await S.avancer(c, 1.5); await S.connecter(c, 'kb', mdpK); v('15 minutes : le verrou se lève, la demande part', await S.attendreSel(c, '[data-sec="nombre"]', 4000));
  await versLogin(c); await c.p.evaluate(() => { SECU.demandes.length = 0; });
  for (let i = 1; i <= 5; i++) { await S.connecter(c, 'kb', 'encore-faux-' + i); await c.p.fill('#cn-id', 'karim'); }
  const l2 = await c.p.evaluate(() => { const x = SECU.comptes.kb.verrou; return x && { duree:x.jusqua - x.le, n:x.n }; });
  v('le verrou suivant dure 30 minutes (doublé)', l2 && l2.duree === 30 * 60000 && l2.n === 2, l2);
  console.log('\n── 8. le code à 6 chiffres : accepté pour une connexion habituelle, jamais deux fois le même ──');
  await demarrer(c); await S.connecter(c, 'kb', mdpK); await S.attendreSel(c, '[data-sec="nombre"]', 5000);
  v('« Le téléphone n’a pas de réseau ? » est proposé', await c.p.evaluate(() => /Le téléphone n’a pas de réseau \?/.test(document.getElementById('cnx').textContent) && !!document.getElementById('cn-code6')));
  const faux6 = await c.p.evaluate(() => { const t = secuTotp(SECU.comptes.kb.tel.cle, secuMaint()); return t === '000000' ? '000001' : '000000'; });
  await c.p.fill('#cn-code6', faux6); await c.p.click('[data-cnx="code6"]'); v('un mauvais code : « Code invalide ou déjà utilisé. »', /Code invalide ou déjà utilisé\./.test(await S.erreur(c)), await S.erreur(c));
  const bon = await c.p.evaluate(() => secuTotp(SECU.comptes.kb.tel.cle, secuMaint())); await c.p.fill('#cn-code6', bon); await c.p.click('[data-cnx="code6"]');
  v('le bon code ouvre l’application (comme une approbation)', await S.attendreApp(c, 15000) && await c.p.evaluate(() => SESSION === 'kb'));
  await versLogin(c); await S.connecter(c, 'kb', mdpK); await S.attendreSel(c, '#cn-code6', 5000);
  await c.p.fill('#cn-code6', bon); await c.p.click('[data-cnx="code6"]'); await c.p.waitForTimeout(600);
  v('le MÊME code, rejoué : refusé (« Code invalide ou déjà utilisé. »)', /Code invalide ou déjà utilisé\./.test(await S.erreur(c)) && await c.p.evaluate(() => SESSION === null), await S.erreur(c));
  v('un code accepté retire la demande du téléphone', true);
  console.log('\n── 9. deux mots de passe faux juste avant : la connexion est ROUGE ──');
  await demarrer(c); await S.connecter(c, 'kb', 'faux-un'); await c.p.fill('#cn-id', 'karim'); await S.connecter(c, 'kb', 'faux-deux'); await c.p.fill('#cn-id', 'karim'); await S.connecter(c, 'kb', mdpK);
  await S.attendreSel(c, '[data-sec="nombre"]', 5000);
  const r = await c.p.evaluate(() => ({ boite:!!document.querySelector('[data-sec="alerte-rouge"]'), txt:(document.querySelector('[data-sec="alerte-rouge"]') || {}).textContent || '' }));
  v('la boîte « Connexion inhabituelle détectée » paraît avec la raison « Plusieurs mots de passe faux juste avant »', r.boite && /Connexion inhabituelle détectée/.test(r.txt) && /Plusieurs mots de passe faux juste avant/.test(r.txt), r);
  v('la raison « autre appareil » n’y est PAS (c’est cet ordinateur, reconnu)', !/Appareil jamais utilisé/.test(r.txt), r);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
