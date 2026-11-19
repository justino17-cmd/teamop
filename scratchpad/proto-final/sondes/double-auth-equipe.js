// Sonde « double-auth-equipe » (étape 3, § 5) : Équipe — la carte, la fiche (bloc « Connexion »), le panneau « Mot de passe provisoire », « Nouveau téléphone », « Déverrouiller »,
// « Déconnecter partout », « Reposer », inviter + « Annuler », désactiver, pas de geste sur SA fiche. Sessions ?auto= (la confirmation est accordée d'office : on mesure les EFFETS et les textes).
// Population : 6 personnes, 6 fiches fouillées (aucun mot de passe lisible), 2 comptes aux téléphones prêts (Karim, Léa), 1 verrouillé.
const S = require('./double-auth-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/';
const fiche = (c, k) => c.p.evaluate(k => { fermerPanneau(); eqFiche(k); }, k).then(() => c.p.waitForTimeout(450));
const html = c => c.p.evaluate(() => (document.querySelector('#calque .panneau') || {}).innerHTML || '');
// innerText (ce que l'œil lit, avec ses séparations), espaces ordinaires ; les majuscules du surtitre sont celles de la feuille de style
const txt = c => c.p.evaluate(() => ((document.querySelector('#calque .panneau') || {}).innerText || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim());
(async () => {
  const c = await L.ouvrir({ qui:'marc', profil:'mac', requete:'?app=1&auto=marc&tel=1' });   // ?tel=1 monte le téléphone et le bloc « Démonstration » (la confirmation reste accordée d'office : ?auto=)
  console.log('\n── 1. la carte et le bandeau ──');
  await L.aller(c.p, 'equipe');
  const e1 = await c.p.evaluate(() => ({ cartes:[...document.querySelectorAll('#contenu .eq-c')].map(x => ({ nom:x.querySelector('.fo-n b').textContent, st:[...x.querySelectorAll('.bx-t .st')].map(s => s.textContent), puces:x.querySelector('.eq-puces').textContent })), bandeau:((document.querySelector('#contenu .sec-bandeau') || {}).innerText || '').replace(/[\u00a0\u202f]/g, ' ') }));
  const par = nom => e1.cartes.find(x => x.nom === nom);
  v('population : 6 cartes', e1.cartes.length === 6, e1.cartes.length);
  v('Léa (verrouillée) porte la pastille « Verrouillé », Julie, Sophie, Tom « Téléphone à activer », Karim sa puce « 📱 Android de Karim »', par('Léa Roux').st.includes('Verrouillé') && ['Julie Petit', 'Sophie Martin', 'Tom Leroy'].every(n => par(n).st.includes('Téléphone à activer')) && /📱 Android de Karim/.test(par('Karim Benali').puces) && !par('Karim Benali').st.includes('Téléphone à activer'), e1.cartes.map(x => x.nom + ':' + x.st.join('/')));
  v('en tête : une carte rouge « 1 compte verrouillé : Léa Roux. » + bouton « Voir »', /1 compte verrouillé : Léa Roux\./.test(e1.bandeau) && /Voir/.test(e1.bandeau), e1.bandeau);
  await c.p.evaluate(() => document.querySelector('.sec-bandeau [data-sec2="voir"]').click()); await c.p.waitForTimeout(600);
  v('« Voir » mène à la page Sécurité', await c.p.evaluate(() => route === 'securite'));
  await c.p.evaluate(() => { SECU.comptes.lr.verrou = null; aller('equipe'); }); await c.p.waitForTimeout(600);
  v('plus aucun compte verrouillé : plus de carte rouge (jamais de carte quand tout va bien)', await c.p.evaluate(() => !document.querySelector('#contenu .sec-bandeau')));
  await c.p.evaluate(() => { const h = new Date(secuMaint()); h.setHours(18, 2, 0, 0); h.setDate(h.getDate() - 1); SECU.comptes.lr.verrou = { le:h.getTime(), par:'telephone', jusqua:null, n:1 }; });   // le verrou de départ : hier à 18:02

  console.log('\n── 2. la fiche : le bloc « Connexion » — JAMAIS un mot de passe lisible (6 fiches fouillées) ──');
  const secrets = await c.p.evaluate(() => EQUIPE.map(p => { const x = SECU.comptes[p.k]; return { k:p.k, prov:x.prov, clair:x.demoClair }; }));
  let fuites = 0, vues = 0;
  for (const p of secrets) { await fiche(c, p.k); const h = await html(c); vues++; for (const s of [p.prov, p.clair]) if (s && h.includes(s)) fuites++; if (/Bienvenue17/.test(h)) fuites++; }
  v('population : 6 fiches ouvertes', vues === 6, vues);
  v('aucune des 6 fiches ne contient un mot de passe (provisoire ni choisi), ni « Bienvenue17 »', fuites === 0, fuites);
  await fiche(c, 'kb'); let t = await txt(c), h = await html(c);
  v('fiche de Karim : « Connexion », lien, identifiant, « Personnel, choisi par Karim. », « Android de Karim · activé le … », « Dernière connexion »', /Connexion/i.test(t) && /Lien de l’entreprise/.test(t) && /Identifiant karim/.test(t) && /Personnel, choisi par Karim\./.test(t) && /Android de Karim · activé le \d\d\/\d\d\/\d{4}/.test(t) && /Dernière connexion/.test(t), t.slice(0, 300));
  v('ses boutons : « Copier le lien et l’identifiant », « Nouveau téléphone », « Déconnecter partout », « Lui donner un mot de passe provisoire », « Ouvrir l’application comme Karim »', ['Copier le lien et l’identifiant', 'Nouveau téléphone', 'Déconnecter partout', 'Lui donner un mot de passe provisoire', 'Ouvrir l’application comme Karim'].every(b => t.includes(b)) && !/Déverrouiller/.test(t.replace(/Déverrouiller le/, '')), t.slice(-240));
  v('le texte à copier ne contient AUCUN mot de passe (« je te le remets en main propre »)', await c.p.evaluate(() => { const b = document.querySelector('[data-cnx="copier"]'); return /3\. Ton mot de passe provisoire : je te le remets en main propre\./.test(b.dataset.t) && /4\. Installe OP Security sur ton téléphone/.test(b.dataset.t) && !/Bienvenue17/.test(b.dataset.t) && !(SECU.comptes.kb.demoClair && b.dataset.t.includes(SECU.comptes.kb.demoClair)); }));
  await fiche(c, 'sm'); t = await txt(c);
  v('fiche de Sophie (pas encore choisi) : « Provisoire : à lui remettre en main propre. », « Sophie le change à sa première connexion. », « À activer à sa première connexion »', /Provisoire : à lui remettre en main propre\./.test(t) && /Sophie le change à sa première connexion\./.test(t) && /À activer à sa première connexion/.test(t), t.slice(0, 260));
  await fiche(c, 'lr'); t = await txt(c);
  v('fiche de Léa : « Verrouillé depuis hier à 18:02 (bloquée depuis son téléphone) », « Déverrouiller » EN PREMIER, avant « Nouveau téléphone »', /Verrouillé depuis hier à 18:02 \(bloquée depuis son téléphone\)/.test(t) && t.indexOf('Déverrouiller') > -1 && t.indexOf('Déverrouiller') < t.indexOf('Nouveau téléphone'), t.slice(0, 240));
  v('« Envoyer un lien de mot de passe » est GRISÉ (compte verrouillé), avec la raison', await c.p.evaluate(() => { const b = document.querySelector('[data-eq^="mdp"]'); return !!b && b.disabled && /Compte verrouillé : utilise « Déverrouiller », après avoir vérifié son identité en personne\./.test(document.querySelector('#calque .panneau').textContent.replace(/[\u00a0\u202f]/g, ' ')); }));
  await fiche(c, 'marc'); t = await txt(c);
  v('sur SA propre fiche (Marc) : ni « Nouveau téléphone », ni « Déverrouiller », ni « Déconnecter partout », ni « Ouvrir comme » ; la phrase « Pour ton propre mot de passe, utilise le bouton « M’envoyer un lien pour choisir un nouveau mot de passe » ci-dessous ; le reste (téléphone, connexions) demande un autre administrateur. » (nommée et placée après le bouton depuis « restes équipe, tour 3 »)', !/Nouveau téléphone|Déconnecter partout|Ouvrir l’application comme/.test(t) && /Pour ton propre mot de passe, utilise le bouton « M’envoyer un lien pour choisir un nouveau mot de passe » ci-dessous ; le reste \(téléphone, connexions\) demande un autre administrateur\./.test(t), t.slice(0, 260));

  console.log('\n── 3. « Nouveau téléphone » pour Karim ──');
  await fiche(c, 'kb'); await c.p.evaluate(() => { SECU.sessions.kb = { debut:secuMaint(), appareilId:'ici', auto:false, derniereActivite:secuMaint() }; });
  const ancien = await c.p.evaluate(() => ({ tel:SECU.comptes.kb.tel, mdp:SECU.comptes.kb.demoClair, nom:SECU.comptes.kb.tel.nom }));
  await c.p.evaluate(() => document.querySelector('[data-sec2="telephone|kb"]').click()); await c.p.waitForTimeout(500); t = await txt(c);
  v('le panneau : « Nouveau téléphone pour Karim », « vérifie que c’est bien Karim, en personne (pas par message, pas par téléphone) », la case, les conséquences, « Il n’existe pas de code de secours : c’est voulu. »',
    /Nouveau téléphone pour Karim/.test(t) && /vérifie que c’est bien Karim, en personne \(pas par message, pas par téléphone\)/.test(t) && /J’ai vérifié l’identité de Karim en personne/.test(t) && /Son ancien téléphone ne pourra plus approuver aucune connexion\./.test(t) && /Il n’existe pas de code de secours : c’est voulu\./.test(t), t.slice(0, 520));
  v('le bouton « Nouveau téléphone pour Karim » est grisé tant que la case n’est pas cochée', await c.p.evaluate(() => document.getElementById('sec-tel-ok').disabled === true));
  await c.p.evaluate(() => { document.getElementById('sec-tel-ok').disabled = false; document.getElementById('sec-tel-ok').click(); }); await c.p.waitForTimeout(400);
  v('un clic FORCÉ sur le bouton grisé ne fait rien : la fonction relit la case (le téléphone de Karim est intact)', await c.p.evaluate(() => !!SECU.comptes.kb.tel));
  await c.p.evaluate(() => { document.getElementById('sec-verif').click(); }); await c.p.waitForTimeout(150);
  v('cochée, le bouton s’ouvre', await c.p.evaluate(() => document.getElementById('sec-tel-ok').disabled === false));
  const sansCode = await c.p.evaluate(() => SECU.comptes.kb.codeActivation = { code:'AAAABBBBCCCC', jusqua:secuMaint() + 600000, servi:false });
  await c.p.evaluate(() => document.getElementById('sec-tel-ok').click()); await c.p.waitForTimeout(600);
  const ap = await c.p.evaluate(() => { const x = SECU.comptes.kb; return { tel:x.tel, code:x.codeActivation, app:x.appareils.length, sess:!!SECU.sessions.kb, vieux:secuMdpJuste(x, window.__vieux || ''), prov:x.prov, empr:x.empreinte, verrou:x.verrou, ui:opsEcran('kb') }; });
  v('l’ancien téléphone est RÉVOQUÉ (le compte n’a plus de téléphone)', ap.tel === null);
  v('ses sessions sont fermées, ses appareils reconnus oubliés, un éventuel code d’activation mort', !ap.sess && ap.app === 0 && ap.code === null);
  v('un nouveau mot de passe provisoire est tiré, l’ancien (choisi) ne marche plus', !!ap.prov && ap.prov !== ancien.mdp && ap.empr === null && await c.p.evaluate(m => !secuMdpJuste(SECU.comptes.kb, m), ancien.mdp));
  t = await txt(c); h = await html(c);
  v('le panneau « Mot de passe provisoire pour Karim » s’ouvre avec la ligne verte « L’ancien téléphone de Karim est révoqué : il ne peut plus approuver de connexion. »', /Mot de passe provisoire pour Karim/.test(t) && /L’ancien téléphone de Karim est révoqué : il ne peut plus approuver de connexion\./.test(t), t.slice(0, 300));
  v('« Remets ce mot de passe à Karim en main propre, après avoir vérifié son identité. » + « Valable 72 heures (jusqu’au JJ/MM à HH:MM). Il ne sera plus affiché. »', /Remets ce mot de passe à Karim en main propre, après avoir vérifié son identité\./.test(t) && /Valable 72 heures \(jusqu’au \d\d\/\d\d à \d\d:\d\d\)\. Il ne sera plus affiché\./.test(t));
  const prov = await c.p.evaluate(() => (document.querySelector('[data-sec="provisoire"]') || {}).textContent || '');
  v('le mot de passe est affiché UNE fois : 18 signes en groupes de 6, sélectionnable, AUCUN bouton « Copier »', /^[A-Za-z2-9]{6}-[A-Za-z2-9]{6}-[A-Za-z2-9]{6}$/.test(prov) && !/Copier/.test(t) && await c.p.evaluate(() => getComputedStyle(document.querySelector('[data-sec="provisoire"]')).userSelect !== 'none'), prov.length);
  v('il n’est dans AUCUNE data- ni dans un toast (le clair vit dans le texte du panneau et dans le bloc « Démonstration »)', await c.p.evaluate(p => { const toutes = [...document.querySelectorAll('*')].flatMap(e => [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.value)); return !toutes.some(x => x.includes(p)) && !((document.getElementById('toast') || {}).textContent || '').includes(p); }, prov));
  v('le téléphone de Karim, à sa prochaine lecture, dit « Ce téléphone n’est plus autorisé… »', /Ce téléphone n’est plus autorisé \(un nouveau téléphone a été activé, ou ton compte a été réinitialisé\)\. Le compte a été supprimé de cet appareil\./.test(String(ap.ui).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')), String(ap.ui).replace(/<[^>]*>/g, ' ').slice(-200));
  v('le bloc « Démonstration » lit le nouveau provisoire de Karim (son seul autre endroit)', await c.p.evaluate(p => { const e = document.querySelector('[data-sec-prov="karim"]'); return !!e && e.textContent.trim() === p; }, prov));
  await c.p.evaluate(() => document.querySelector('[data-sec2="prov-ok"]').click()); await c.p.waitForTimeout(400);
  v('« Terminé » efface le clair du panneau (le panneau est fermé, plus aucun nœud ne le porte hors du bloc « Démonstration »)', await c.p.evaluate(p => !document.querySelector('#calque .panneau') && !document.querySelector('#calque').textContent.includes(p) && !SECU.panProv, prov));
  v('la fiche passe à « Téléphone à activer » ; le journal dit « a donné un nouveau téléphone à Karim Benali »', await c.p.evaluate(() => { eqFiche('kb'); return true; }) && /À activer à sa première connexion/.test(await txt(c)) && await c.p.evaluate(() => JOURNAL.some(j => j.type === 'equipe' && /a donné un nouveau téléphone à/.test(j.action) && j.el && /Karim/.test(j.el.lib))));

  console.log('\n── 4. « Déverrouiller » Léa ──');
  await c.p.evaluate(() => { secuReconnaitre('lr', { id:'ici', nom:'Chrome · Linux', adresse:'203.0.113.42' }); });
  await fiche(c, 'lr'); const lt = await c.p.evaluate(() => ({ tel:JSON.stringify({ n:SECU.comptes.lr.tel.nom, a:SECU.comptes.lr.tel.activeLe, p:SECU.comptes.lr.tel.pinEmp }), pw:SECU.comptes.lr.demoClair, app:SECU.comptes.lr.appareils.length }));
  v('population : Léa a un appareil reconnu avant le geste (pour prouver qu’il est oublié)', lt.app === 1, lt.app);
  await c.p.evaluate(() => document.querySelector('[data-sec2="deverrouiller|lr"]').click()); await c.p.waitForTimeout(500); t = await txt(c);
  v('le panneau : « Déverrouiller le compte de Léa », « Léa a bloqué une connexion depuis son téléphone : quelqu’un connaissait peut-être son mot de passe. Pour la protéger, son mot de passe est remplacé. »', /Déverrouiller le compte de Léa/.test(t) && /Léa a bloqué une connexion depuis son téléphone : quelqu’un connaissait peut-être son mot de passe\. Pour la protéger, son mot de passe est remplacé\./.test(t) && /J’ai vérifié l’identité de Léa en personne/.test(t), t.slice(0, 380));
  await c.p.evaluate(() => { document.getElementById('sec-verif').click(); }); await c.p.waitForTimeout(150);
  v('un administrateur ne se déverrouille pas lui-même : secuDeverrouiller(\'marc\') refuse, même case cochée et même verrou posé', await c.p.evaluate(() => { SECU.comptes.marc.verrou = { le:secuMaint(), par:'telephone', jusqua:null, n:1 }; const r = secuDeverrouiller('marc'); const encore = !!SECU.comptes.marc.verrou; SECU.comptes.marc.verrou = null; return r === false && encore; }));
  await c.p.evaluate(() => document.getElementById('sec-tel-ok').click()); await c.p.waitForTimeout(600);
  const dv = await c.p.evaluate(() => { const x = SECU.comptes.lr; return { verrou:x.verrou, tel:JSON.stringify({ n:x.tel.nom, a:x.tel.activeLe, p:x.tel.pinEmp }), prov:x.prov, emp:x.empreinte, app:x.appareils.length, echecs:x.echecs }; });
  v('verrou levé, compteur d’échecs à zéro, son téléphone RESTE LE MÊME', dv.verrou === null && dv.echecs === 0 && dv.tel === lt.tel);
  v('nouveau mot de passe provisoire (celui que connaissait le pirate ne marche plus), appareils reconnus oubliés (sa prochaine connexion sera rouge)', !!dv.prov && dv.emp === null && await c.p.evaluate(m => !secuMdpJuste(SECU.comptes.lr, m), lt.pw) && dv.app === 0);
  t = await txt(c);
  v('le panneau « Mot de passe provisoire pour Léa » dit : « Le compte de Léa est déverrouillé. Son mot de passe est remplacé : celui que connaissait le pirate ne marche plus. »', /Mot de passe provisoire pour Léa/.test(t) && /Le compte de Léa est déverrouillé\. Son mot de passe est remplacé : celui que connaissait le pirate ne marche plus\./.test(t), t.slice(0, 260));
  await c.p.evaluate(() => secuProvTermine());
  v('la fiche et la carte n’ont plus « Verrouillé »', await c.p.evaluate(() => { aller('equipe'); return true; }) && await c.p.evaluate(() => !document.querySelector('#contenu .sec-bandeau') && ![...document.querySelectorAll('#contenu .eq-c .st')].some(s => s.textContent === 'Verrouillé')));
  v('journal : « a déverrouillé le compte de Léa Roux »', await c.p.evaluate(() => JOURNAL.some(j => j.type === 'equipe' && /a déverrouillé le compte de/.test(j.action) && /Léa/.test(j.el.lib))));
  await c.p.evaluate(() => { const x = SECU.comptes.lr; x.echecs = 0; secuEchec('lr', 'mdp'); secuEchec('lr', 'mdp'); secuEchec('lr', 'mdp'); secuEchec('lr', 'mdp'); secuEchec('lr', 'mdp'); }); await c.p.waitForTimeout(100);
  await fiche(c, 'lr'); await c.p.evaluate(() => document.querySelector('[data-sec2="deverrouiller|lr"]').click()); await c.p.waitForTimeout(500); t = await txt(c);
  v('un verrou de 15 minutes (cinq erreurs) : « Léa a fait cinq erreurs de suite : le compte s’est verrouillé. » — même geste', /Léa a fait cinq erreurs de suite : le compte s’est verrouillé\./.test(t), t.slice(0, 260));
  await c.p.evaluate(() => fermerPanneau());

  console.log('\n── 5. « Reposer », « Déconnecter partout », désactiver, inviter + « Annuler » ──');
  await c.p.evaluate(() => { SECU.sessions.sm = { debut:secuMaint(), appareilId:'ici', auto:false, derniereActivite:secuMaint() }; SECU.comptes.sm.tel = SECU.comptes.sm.tel; });
  await fiche(c, 'sm'); const pv0 = await c.p.evaluate(() => SECU.comptes.sm.prov);
  await c.p.evaluate(() => document.querySelector('[data-sec2="deconnecter|sm"]').click()); await c.p.waitForTimeout(400); t = await txt(c);
  v('« Déconnecter partout » : « Fermer toutes les connexions de Sophie ? Il devra se reconnecter avec son téléphone. »', /Fermer toutes les connexions de Sophie \? Il devra se reconnecter avec son téléphone\./.test(t), t.slice(0, 200));
  await c.p.evaluate(() => document.querySelector('[data-sec2="deco-ok|sm"]').click()); await c.p.waitForTimeout(400);
  v('les connexions de Sophie sont fermées, AUCUN mot de passe ne change', await c.p.evaluate(p => !SECU.sessions.sm && SECU.comptes.sm.prov === p, pv0));
  await fiche(c, 'sm'); await c.p.evaluate(() => document.querySelector('[data-cnx="repose|sm"]').click()); await c.p.waitForTimeout(500);
  v('« Lui donner un mot de passe provisoire » : un nouveau provisoire (l’ancien ne marche plus), le panneau s’ouvre, le téléphone est INCHANGÉ', await c.p.evaluate(p => SECU.comptes.sm.prov !== p && /Mot de passe provisoire pour Sophie/.test(document.querySelector('#calque .panneau h2').textContent), pv0));
  v('toast « Mot de passe provisoire donné. À sa prochaine connexion, Sophie choisira le sien. »', /Mot de passe provisoire donné\. À sa prochaine connexion, Sophie choisira le sien\./.test(await S.texte(c, '#toast') || ''));
  await c.p.evaluate(() => secuProvTermine());
  // inviter
  await L.aller(c.p, 'equipe'); await c.p.evaluate(() => document.querySelector('[data-eq="inviter"]').click()); await c.p.waitForTimeout(500);
  await c.p.evaluate(() => { document.getElementById('eq-p').value = 'Nadia'; document.getElementById('eq-n').value = 'Fournier'; document.getElementById('eq-m').value = 'nadia@climservices17.fr'; });
  await c.p.evaluate(() => document.querySelector('[data-eq="inviterok"]').click()); await c.p.waitForTimeout(700); t = await txt(c);
  v('inviter : le mot de passe provisoire de Nadia s’ouvre, « L’invitation est partie par e-mail (le lien et l’identifiant). Le mot de passe provisoire se remet en main propre. »', /Mot de passe provisoire pour Nadia/.test(t) && /L’invitation est partie par e-mail \(le lien et l’identifiant\)\. Le mot de passe provisoire se remet en main propre\./.test(t), t.slice(0, 260));
  const nk = await c.p.evaluate(() => EQUIPE.find(p => p.prenom === 'Nadia').k);
  v('un compte de sécurité existe pour Nadia, avec SON provisoire', await c.p.evaluate(k => !!SECU.comptes[k] && !!SECU.comptes[k].prov, nk));
  await c.p.evaluate(() => document.querySelector('[data-sec2="prov-ok"]').click()); await c.p.waitForTimeout(500);
  v('« Terminé » : le toast habituel « Invitation envoyée à … » avec « Annuler »', /Invitation envoyée à nadia@climservices17\.fr/.test(await S.texte(c, '#toast') || '') && /Annuler/.test(await S.texte(c, '#toast') || ''));
  await c.p.evaluate(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Annuler/.test(x.textContent)); b.click(); }); await c.p.waitForTimeout(500);
  v('« Annuler » retire aussi le compte de sécurité (pas de compte-fantôme avec son mot de passe)', await c.p.evaluate(k => !SECU.comptes[k] && !EQUIPE.some(p => p.prenom === 'Nadia'), nk));
  // désactiver
  await c.p.evaluate(() => { SECU.sessions.tl = { debut:secuMaint(), appareilId:'ici', auto:false, derniereActivite:secuMaint() }; SECU.demandes.push({ id:'x1', k:'tl', motif:'connexion', source:'ici', appareil:'a', appareilId:'ici', adresse:'a', heure:'10:00', raisons:[], ts:secuMaint(), jusqua:secuMaint() + 120000, nombre:42, etat:'attente' }); });
  await c.p.evaluate(() => { const r = eqxRestes('tl'); eqxDesactiver('tl', {}); }); await c.p.waitForTimeout(500);
  v('désactiver Tom ferme ses connexions et retire ses demandes ; son téléphone n’est PAS révoqué (s’il revient il retrouve le sien)', await c.p.evaluate(() => !SECU.sessions.tl && SECU.demandes.find(d => d.id === 'x1').etat === 'annulee' && eqDe('tl').actif === false));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.capture(c, CAP + 'equipe-mac-jour.png'); await L.fin(c);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
