/* ══ SONDE v759 — « ＋ UTILISATEUR » QUAND TOUTES LES PLACES SONT PRISES, AU DOIGT, DANS LA VRAIE PAGE ══════════════
   Justin, 27 septembre 2026 au soir, au constat « une entreprise de 7 qui veut un 8ᵉ se verrait proposer 8 abonnements
   neufs au lieu d'un seul » : « oui il faudrait faire ça ».
   Joué sur un iPhone de 402 px (encoches posées), par de vrais touchers et de vraies frappes, sur la bêta servie en
   127.0.0.1 — Utilisateurs → « ＋ Utilisateur » → le formulaire rempli → « Créer » :
     1. l'administrateur, Pro, 7 personnes pour 7 places : aucun compte créé ; la question dit « 7 utilisateurs pour
        7 places » et « 1 abonnement Pro de plus » ; l'onglet ouvert est la page de paiement pour UN abonnement ;
     2. « Annuler » à la question : rien ne s'ouvre, rien n'est créé ;
     3. un chef à qui l'administrateur a ouvert « Utilisateurs » et donné « Créer des utilisateurs » (réglable dans
        Permissions — sans la rubrique, la page le refuse avant), même geste : « seul l'administrateur peut en
        ajouter », ni question ni onglet — et le message ne dit rien du paiement de l'entreprise ;
     4. un abonnement en attente de règlement (posé par la vraie `suspensionPoser`) : l'espace client, pas la page de
        paiement ;
     5. depuis Gratuit, seul : la page de paiement pour Pro × 2.
   Les fenêtres natives (`confirm`) et l'onglet (`window.open`) sont NOTÉS, pas contournés : on mesure ce que la vraie
   fonction leur passe. ⛔ On compte la population avant de croire un zéro. ⛔ Bêta uniquement, 127.0.0.1.
   SOURCE=<une bêta d'avant> pour la contre-épreuve (la sonde compte ses échecs au lieu de mourir).                  */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const CAP = process.env.CAPTURES || '';
let navigateur = null;

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {}); navigateur = S;
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0, topMax: 59, bottomMax: 34, leftMax: 0, rightMax: 0 } }); } catch (e) {}
  /* Le bocal n'a pas de réseau : l'écran « Connexion requise » et la vérification de l'identifiant au serveur sont
     neutralisés (ce n'est pas ce qu'on mesure). Les fenêtres natives et l'onglet ouvert sont notés. */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.loginExisteAilleurs=async function(){ return false; }; window.userIdentifiantsModal=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    window.__questions=[]; window.__ouverts=[]; window.__reponse=true;
    window.confirm=function(m){ window.__questions.push(String(m)); return window.__reponse; };
    window.open=function(u,c){ window.__ouverts.push([String(u),c]); return null; }; return 1;`);
  const cap = async n => { if (!CAP) return; await dormir(450); fs.mkdirSync(CAP, { recursive: true });
    const s = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, n + '.png'), Buffer.from(s.data, 'base64')); };
  const toucher = async sel => {
    const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const q=e.getBoundingClientRect();
      if(q.width<1||q.height<1) return {cache:true};
      const x=Math.round(q.left+q.width/2), y=Math.round(q.top+q.height/2), h=document.elementFromPoint(x,y);
      const touche=!!h&&(h===e||e.contains(h)||(!!h.closest('label')&&h.closest('label').contains(e)));
      return touche?{x,y}:{couvert:(h&&(h.id||h.className||h.tagName))+''};`);
    if (!r || r.cache || r.couvert) { console.log('    (frappe perdue sur ' + sel + ' : ' + JSON.stringify(r) + ')'); return false; }
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await dormir(60);
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(500);
    return true; };
  const taper = async (sel, texte) => { await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(e){ e.focus(); e.value=''; } return 1;`);
    await S.c.envoyer('Input.insertText', { text: texte }); await dormir(200); };
  const connecter = async id => { await S.ev(`try{ closeModal(true); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u); try{ setPlatForce('iosweb'); }catch(e){}
      await new Promise(r=>setTimeout(r,1400)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`); };
  const etat = () => S.ev(`return {n:db.users.length, questions:window.__questions.slice(), ouverts:window.__ouverts.slice(), toasts:window.__toasts.slice()};`);
  /* Le geste entier, au doigt : Utilisateurs → « ＋ Utilisateur » → le formulaire → « Créer ». */
  const essayer = async (nom, prenom, login) => {
    await S.ev(`try{ closeModal(true); }catch(e){} go('utilisateurs'); await new Promise(r=>setTimeout(r,800)); window.__toasts=[]; return 1;`);
    const b = await toucher(`#page-head button[onclick="formUser()"]`); await dormir(600);
    const f = await S.ev(`const o=document.getElementById('overlay'); return !!(o&&o.classList.contains('open')&&o.querySelector('form input[name="prenom"]'));`);
    if (!b || !f) return { bouton: b, formulaire: f };
    await taper('#overlay input[name="prenom"]', prenom); await taper('#overlay input[name="nom"]', nom);
    await taper('#overlay input[name="login"]', login); await taper('#overlay input[name="pwd"]', 'provisoire1');
    const c = await toucher(`#overlay form [type="submit"], #overlay button[type="submit"]`); await dormir(900);
    return { bouton: b, formulaire: f, cree: c };
  };

  console.log('\n══ 0. LA POPULATION ══');
  const pop = await S.ev(`
    db.users=[{id:'u-au-a',prenom:'Claire',nom:'Morel',login:'cm-au',role:'admin',actif:true,pref:{}},
      {id:'u-au-c',prenom:'Rémi',nom:'Chef',login:'rc-au',role:'chefEquipe',actif:true,pref:{},acces:{caps:{creerUtilisateurs:true},modules:{utilisateurs:true}}},
      {id:'u-au-2',prenom:'Karim',nom:'Benali',login:'kb-au',role:'technicien',actif:true,pref:{}},
      {id:'u-au-3',prenom:'Sofia',nom:'Perez',login:'sp-au',role:'technicien',actif:true,pref:{}},
      {id:'u-au-4',prenom:'Omar',nom:'Diallo',login:'od-au',role:'technicien',actif:true,pref:{}},
      {id:'u-au-5',prenom:'Inès',nom:'Garnier',login:'ig-au',role:'technicien',actif:true,pref:{}},
      {id:'u-au-6',prenom:'Hugo',nom:'Lefèvre',login:'hl-au',role:'technicien',actif:true,pref:{}}];
    db.forfait='pro'; db.forfaitQty=7; db.formuleAttente=null; save();
    return {users:db.users.length, places:planPlaces(), libre:planPlaceLibre()};`);
  v('sept personnes, Pro × 7 : sept places, toutes prises', pop, { users: 7, places: 7, libre: false });
  await connecter('u-au-a');

  console.log('\n══ 1. ⛔⛔ L\'ADMINISTRATEUR : « ＋ UTILISATEUR » → « CRÉER » — UN abonnement, pas huit ══');
  let g = await essayer('Martin', 'Léa', 'lm-au');
  vrai('« ＋ Utilisateur » est touché, la fenêtre s\'ouvre, « Créer » est touché', g.bouton && g.formulaire && g.cree, g);
  let e = await etat();
  v('⛔ aucun compte créé', e.n, 7);
  vrai('la question : « Formule Pro : 7 utilisateurs pour 7 places. »', (e.questions[0] || '').includes('Formule Pro : 7 utilisateurs pour 7 places.'), e.questions[0]);
  vrai('… « Un abonnement = un utilisateur : pour en ajouter un, il faut 1 abonnement Pro de plus. »', (e.questions[0] || '').includes('Un abonnement = un utilisateur : pour en ajouter un, il faut 1 abonnement Pro de plus.'), e.questions[0]);
  vrai('… « Après le paiement, TEAM OP ajoute la place à ton espace. »', (e.questions[0] || '').includes('Après le paiement, TEAM OP ajoute la place à ton espace.'), e.questions[0]);
  v('⛔⛔ l\'onglet ouvert : la page de paiement pour UN abonnement Pro', e.ouverts, [['https://teamop.fr/recap-abonnement.html?formule=pro&utilisateurs=1', '_blank']]);
  await cap('1-question-un-abonnement');

  console.log('\n══ 2. « ANNULER » À LA QUESTION ══');
  await S.ev(`window.__reponse=false; window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Martin', 'Léa', 'lm-au');
  e = await etat();
  v('la question est posée, « Annuler » : rien ne s\'ouvre, rien n\'est créé', [e.questions.length, e.ouverts.length, e.n], [1, 0, 7]);
  await S.ev(`window.__reponse=true; return 1;`);

  console.log('\n══ 3. UN CHEF QUI A LE DROIT DE CRÉER DES COMPTES ══');
  await connecter('u-au-c');
  await S.ev(`window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Martin', 'Léa', 'lm-au');
  vrai('le chef voit « ＋ Utilisateur » et remplit le formulaire (le chemin existe vraiment)', g.bouton && g.formulaire && g.cree, g);
  e = await etat();
  const tc = e.toasts.find(t => /seul l'administrateur peut en ajouter/.test(t)) || '';
  vrai('⛔ « Plus de place utilisateur libre — seul l\'administrateur peut en ajouter »', !!tc, e.toasts);
  v('… ni question, ni onglet, ni compte', [e.questions.length, e.ouverts.length, e.n], [0, 0, 7]);
  vrai('… et le message ne dit rien du paiement de l\'entreprise', !!tc && !/pay|règl|abonnement/i.test(tc), tc);
  await cap('3-chef');

  console.log('\n══ 4. UN ABONNEMENT EN ATTENTE DE RÈGLEMENT ══');
  await connecter('u-au-a');
  await S.ev(`suspensionPoser({suspendu:true, sursisJours:3}); await new Promise(r=>setTimeout(r,500)); window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Martin', 'Léa', 'lm-au');
  e = await etat();
  vrai('« règle-le d\'abord, tes places reviennent avec lui »', (e.questions[0] || '').includes('règle-le d\'abord, tes places reviennent avec lui'), e.questions[0]);
  v('⛔ l\'espace client, jamais un abonnement de plus', e.ouverts, [['https://teamop.fr/espace.html', '_blank']]);
  await S.ev(`suspensionPoser({suspendu:false}); await new Promise(r=>setTimeout(r,500)); return 1;`);

  console.log('\n══ 5. DEPUIS GRATUIT, SEUL : TOUTE L\'ÉQUIPE PASSE EN PRO ══');
  await S.ev(`db.users=db.users.filter(u=>u.id==='u-au-a'); db.forfait='gratuit'; db.forfaitQty=1; save(); window.__questions=[]; window.__ouverts=[]; return {n:db.users.length, places:planPlaces(), libre:planPlaceLibre()};`)
    .then(p => v('population : une personne, Gratuit, sa place prise', p, { n: 1, places: 1, libre: false }));
  g = await essayer('Martin', 'Léa', 'lm-au');
  e = await etat();
  vrai('« passe en Pro : un abonnement par utilisateur, soit 2 abonnements »', (e.questions[0] || '').includes('passe en Pro : un abonnement par utilisateur, soit 2 abonnements.'), e.questions[0]);
  v('⛔ la page de paiement pour Pro × 2 (la place gratuite ne s\'ajoute pas à un abonnement payant)', e.ouverts, [['https://teamop.fr/recap-abonnement.html?formule=pro&utilisateurs=2', '_blank']]);

  /* ══ 6. v762 — UN ABONNEMENT = UN UTILISATEUR, ET UN CODE PROMO EN COURS COUVRE TOUTE L'ÉQUIPE (Justin, 28/09) ══ */
  console.log('\n══ 6. v762 : Business Premium × 1 = UNE place ; un code promo en cours couvre toute l\'équipe ══');
  const fin30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const pop6 = await S.ev(`
    db.users=[{id:'u-au-a',prenom:'Claire',nom:'Morel',login:'cm-au',role:'admin',actif:true,pref:{}}].concat(
      ['Karim Benali','Sofia Perez','Omar Diallo','Inès Garnier','Hugo Lefèvre','Nora Aït'].map((x,i)=>({id:'u-p6-'+i,prenom:x.split(' ')[0],nom:x.split(' ')[1],login:'p6-'+i,role:'technicien',actif:true,pref:{}})));
    db.forfait='premium'; db.forfaitQty=1; db.formuleAttente=null; db.forfaitEssai=null; save();
    return {users:db.users.length, places:planPlaces(), libre:planPlaceLibre()};`);
  v('population : sept personnes, Business Premium × 1 → UNE place (plus trois), aucune libre', pop6, { users: 7, places: 1, libre: false });
  await connecter('u-au-a');
  await S.ev(`window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Martin', 'Léa', 'lm-p6');
  e = await etat();
  v('⛔ sans code : aucun compte créé, la page de paiement pour 7 abonnements Business Premium de plus (8 − 1)', [e.n, e.ouverts], [7, [['https://teamop.fr/recap-abonnement.html?formule=premium&utilisateurs=7', '_blank']]]);
  const tete = await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,700)); const h=document.getElementById('page-head')||document.querySelector('.page-head,.topbar'); return h?h.textContent.replace(/\\s+/g,' '):'';`);
  vrai('l\'en-tête d\'Utilisateurs dit « 7 / 1 place · un abonnement par utilisateur »', /7 \/ 1 place · un abonnement par utilisateur/.test(tete), tete);
  await S.ev(`db.forfaitEssai={code:'ESSAI-SONDE-762',formule:'premium',debut:'2026-09-01',finLe:${JSON.stringify(fin30)},mois:3,rappels:{}}; save(); window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Martin', 'Léa', 'lm-p6');
  vrai('avec le code en cours : « ＋ Utilisateur » → la fenêtre → « Créer », au doigt', g.bouton && g.formulaire && g.cree, g);
  e = await etat();
  v('⛔⛔ le compte est CRÉÉ (8), sans question ni page de paiement : le code couvre toute l\'équipe', [e.n, e.questions.length, e.ouverts.length], [8, 0, 0]);
  const tete2 = await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,700)); const h=document.getElementById('page-head')||document.querySelector('.page-head,.topbar'); return h?h.textContent.replace(/\\s+/g,' '):'';`);
  vrai('l\'en-tête le dit : « 8 utilisateurs · tous couverts par le code ESSAI-SONDE-762 jusqu\'au … »', /8 utilisateurs · tous couverts par le code ESSAI-SONDE-762 jusqu'au/.test(tete2), tete2);
  await cap('6-couverts-par-le-code');
  const par = await S.ev(`go('parametres'); await new Promise(r=>setTimeout(r,900)); return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
  vrai('Paramètres : « tous couverts par ton code » et « Un abonnement = un utilisateur. Pendant la période offerte… »',
    /tous couverts par ton code/.test(par) && /Un abonnement = un utilisateur\. Pendant la période offerte par ton code, toute l’équipe est couverte/.test(par), par.slice(par.indexOf('Places utilisateur'), par.indexOf('Places utilisateur') + 260));
  vrai('… et les formules disent « 1 utilisateur par abonnement » et « par utilisateur » (plus jamais « 3 utilisateurs inclus »)',
    /Business Premium · 50 € \/ mois par utilisateur/.test(par) && /1 utilisateur par abonnement · accès 100 %/.test(par) && !/[2-9] utilisateurs inclus/.test(par), par.slice(par.indexOf('Forfait'), par.indexOf('Forfait') + 400));
  await S.ev(`db.forfaitEssai.finLe='2020-01-01'; save(); window.__questions=[]; window.__ouverts=[]; return 1;`);
  g = await essayer('Petit', 'Paul', 'pp-p6');
  e = await etat();
  v('le code FINI : plus de largesse — aucun compte de plus (8), la page de paiement pour 8 abonnements de plus (9 − 1)', [e.n, e.ouverts], [8, [['https://teamop.fr/recap-abonnement.html?formule=premium&utilisateurs=8', '_blank']]]);

  v('aucune erreur JavaScript pendant les gestes', S.exceptions, []);
  console.log(`\n════ sonde-ajout-utilisateur : ${ok} ✓ ${ko} ✗ ════`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log(`\n════ sonde-ajout-utilisateur : ${ok} ✓ ${ko + 1} ✗ ════`); try { navigateur && navigateur.fermer(); } catch (_) {} process.exit(1); });
