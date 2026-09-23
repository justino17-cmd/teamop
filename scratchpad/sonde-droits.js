/* ══ SONDE — « C'EST JUSTE DES NOMS : TOUT DOIT ÊTRE SÉLECTIONNÉ » (v737) ═════════════════════════
   Justin, 23 septembre 2026 : « technicien, DR… c'est juste des noms, c'est pas des rôles ; tout doit
   être sélectionné — ce qu'il voit, ce qu'il ne voit pas, ce qu'il peut faire ; oublie pas d'ajouter
   les nouvelles règles dans les paramètres utilisateur ».
   Dans une vraie page (bêta locale), connexions réelles (enterApp), et les gestes :
   1. ADMINISTRATEUR → Utilisateurs → la ligne de Karim : les cinq cases neuves sont là, dans leur
      catégorie ; cocher « Tout voir » coche en direct ce qui en découle ; « Valider » n'écrit pas une
      case déduite qu'on n'a pas touchée ; décocher « Voir les fiches » à part tient.
   2. CHEF D'ÉQUIPE avec « Créer des utilisateurs » : le rôle « DR » lui est proposé (un nom ne porte
      rien), et le compte créé ne reçoit AUCUN droit que le chef n'a pas — et on le lui dit.
   3. Les règles qui tenaient au NOM : groupes de discussion, e-mail pro, création de produits.
   ⛔ On compte la population (comptes, cases, onglets) avant de croire un « rien ».
   ⛔ SOURCE=<bêta d'avant> : les cases n'existent pas, le chef ne peut pas créer de « DR » mais
      peut donner à son technicien des droits qu'il n'a pas.
   ⛔ Bêta uniquement, 127.0.0.1 uniquement. */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const pop = await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
    window.loginExisteAilleurs=async()=>false; window.identifiantsParMail=async()=>({sans:true});
    /* ⚠️ la bêta n'a que 3 places au forfait : sans ça, la création est refusée par la LIMITE DE
       PLACES (proposerAbonnement, sans message) — le piège du témoin qui consomme la ressource
       (CLAUDE.md). Ce n'est pas ce qu'on mesure ici. */
    window.planPlaceLibre=()=>true;
    db.techniciens=[{id:'tK',nom:'Karim Benali',metier:'Technicien'},{id:'tL',nom:'Léo Martin',metier:'DR'},{id:'tR',nom:'Rémi Chef',metier:"Chef d'équipe"}];
    db.users=[{id:'uA',prenom:'Justin',nom:'Roux',login:'justin',role:'admin',actif:true,pref:{}},
      {id:'uL',prenom:'Léo',nom:'Martin',login:'leo',role:'dr',techId:'tL',actif:true,pref:{}},
      {id:'uR',prenom:'Rémi',nom:'Chef',login:'remi',role:'chefEquipe',techId:'tR',actif:true,pref:{},acces:{caps:{creerUtilisateurs:true},modules:{utilisateurs:true}}},
      {id:'uK',prenom:'Karim',nom:'Benali',login:'karim',role:'technicien',techId:'tK',actif:true,pref:{}},
      /* Tom : un technicien auquel la section 1 ne touche PAS (Karim y reçoit « Tout voir ») */
      {id:'uT',prenom:'Tom',nom:'Alvarez',login:'tom',role:'technicien',techId:'tT',actif:true,pref:{}}];
    db.techniciens.push({id:'tT',nom:'Tom Alvarez',metier:'Technicien'});
    db.groupes=[{id:'g1',nom:'Équipe Nord',membreUserIds:['uR'],membreTechIds:['tR']}];
    try{ reprendreDroitsImplicites(); }catch(e){}
    save(); return {users:db.users.length, reprise:!!(db.permissions&&db.permissions.dr&&db.permissions.dr.caps&&db.permissions.dr.caps.validerDR), groupes:db.groupes.length};`);
  console.log('\n══ 0. LA POPULATION ══');
  v('cinq comptes, la reprise des rôles en place (le DR d’origine valide), un groupe', pop, { users: 5, reprise: true, groupes: 1 });

  const entrer = (qui, vue) => S.ev(`try{ logout(); }catch(e){} await new Promise(r=>setTimeout(r,250));
    history.replaceState(null,'','#v=${vue}'); const u=db.users.find(x=>x.id==='${qui}'); currentUser=u; enterApp(u); try{ setPlatForce('macweb'); }catch(e){}
    await new Promise(r=>setTimeout(r,1300)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove();
    window.__toasts=[]; return current;`);

  console.log('\n══ 1. ⛔⛔ ADMINISTRATEUR : LES CINQ CASES SONT DANS LA LIGNE DE KARIM ══');
  await entrer('uA', 'utilisateurs');
  const R1 = await S.ev(`go('utilisateurs'); await new Promise(r=>setTimeout(r,500)); const b=document.querySelector('button[onclick="rolesGerer()"]');   /* par le GESTE : l'émoji peut devenir une icône (icones()) */
    if(!b) return {bouton:false}; b.click(); await new Promise(r=>setTimeout(r,300)); const o=document.getElementById('overlay');
    const t=o?o.textContent:''; try{ closeModal(true); }catch(e){} return {bouton:true, ouvre:/Nouveau rôle/.test(t), dr:/Directeur Régional/.test(t)};`);
  v('⛔ « 🏷 Rôles » est dans l’en-tête d’Utilisateurs et ouvre la liste des rôles', R1, { bouton: true, ouvre: true, dr: true });
  const L1 = await S.ev(`usrOuvert=''; usrDeplier('uK'); await new Promise(r=>setTimeout(r,300));
    const z=document.getElementById('usr-d-uK'); if(!z) return {zone:false};
    const cat=k=>{ const i=z.querySelector('[data-d="cap_'+k+'"]'); if(!i) return null; const d=i.closest('details'); const b=d&&d.querySelector('summary b'); return {cat:b?b.textContent.trim():'', on:i.checked, deduit:i.dataset.deduit||'', lbl:((i.closest('.perm-row')||{}).textContent||'').trim()}; };   /* textContent : le volet est replié, innerText y rend du vide */
    return {zone:true, n:z.querySelectorAll('input[data-d^="cap_"]').length, voirEquipe:cat('voirEquipe'), corrigerPointages:cat('corrigerPointages'), gererFiches:cat('gererFiches'), gererGroupes:cat('gererGroupes'), mailPro:cat('mailPro')};`);
  vrai('population : la ligne de Karim se déroule, avec ses interrupteurs de droits', L1.zone && L1.n > 15, L1);
  for (const [k, cat] of [['voirEquipe', 'Temps'], ['corrigerPointages', 'Temps'], ['gererFiches', 'Temps'], ['gererGroupes', 'Communication'], ['mailPro', 'Communication']])
    vrai('⛔⛔ « ' + k + ' » est une case, rangée dans « ' + cat + '… »', !!L1[k] && L1[k].cat.includes(cat) && L1[k].lbl.length > 20, L1[k]);
  v('un technicien d’origine : les cinq décochées (comme la veille), et marquées « déduites »',
    ['voirEquipe', 'corrigerPointages', 'gererFiches', 'gererGroupes', 'mailPro'].map(k => L1[k] && [L1[k].on, L1[k].deduit]), Array(5).fill([false, '1']));

  const L2 = await S.ev(`const z=document.getElementById('usr-d-uK'); const i=z.querySelector('[data-d="cap_voirTout"]'); i.click(); await new Promise(r=>setTimeout(r,60));
    const on=k=>{ const e=z.querySelector('[data-d="cap_'+k+'"]'); return !!(e&&e.checked); };
    return {voirTout:on('voirTout'), voirEquipe:on('voirEquipe'), corriger:on('corrigerPointages'), fiches:on('gererFiches'), groupes:on('gererGroupes'), mail:on('mailPro')};`);
  v('⛔⛔ cocher « Tout voir » coche AUSSITÔT ce qui en découle (le technicien ne planifie pas : pas les groupes)', L2,
    { voirTout: true, voirEquipe: true, corriger: true, fiches: true, groupes: false, mail: true });
  const L3 = await S.ev(`const z=document.getElementById('usr-d-uK'); usrDroitsValider('uK', z.querySelector('.usr-b button')); await new Promise(r=>setTimeout(r,200));
    const u=db.users.find(x=>x.id==='uK'), c=(u.acces||{}).caps||{};
    return {voirTout:c.voirTout, ecrites:['voirEquipe','corrigerPointages','gererFiches','gererGroupes','mailPro'].filter(k=>Object.prototype.hasOwnProperty.call(c,k)),
      lu:['voirEquipe','corrigerPointages','gererFiches','mailPro'].map(k=>userCap(u,k))};`);
  vrai('« Valider » écrit « Tout voir »', L3.voirTout === true, L3);
  v('⛔⛔ … et PAS les cases déduites non touchées (elles suivront « Tout voir »)', L3.ecrites, []);
  v('   … qui se lisent pourtant comme à l’écran', L3.lu, [true, true, true, true]);

  const L4 = await S.ev(`await new Promise(r=>setTimeout(r,1800)); usrOuvert=''; usrDeplier('uK'); await new Promise(r=>setTimeout(r,300));
    const z=document.getElementById('usr-d-uK'); const i=z.querySelector('[data-d="cap_voirEquipe"]'); if(!i) return {absente:'la case voirEquipe n’existe pas'};
    const avant=i.checked; i.click(); await new Promise(r=>setTimeout(r,60));
    usrDroitsValider('uK', z.querySelector('.usr-b button')); await new Promise(r=>setTimeout(r,200));
    const u=db.users.find(x=>x.id==='uK'); return {avant, ecrit:u.acces.caps.voirEquipe, voirTout:userCap(u,'voirTout'), equipe:userCap(u,'voirEquipe')};`);
  v('⛔⛔ décocher « Voir les fiches de son équipe » À PART tient, « Tout voir » restant coché', L4, { avant: true, ecrit: false, voirTout: true, equipe: false });
  const L5 = await entrer('uK', 'techniciens');
  const L5b = await S.ev(`go('techniciens'); await new Promise(r=>setTimeout(r,900));
    return {vue:current, noms:[...document.querySelectorAll('#content tr.row-clk .strong')].map(e=>e.textContent.trim())};`);
  v('population : l’écran « Équipe » est bien celui qu’on lit', L5b.vue, 'techniciens');
  v('⛔⛔ … et Karim, qui a « Tout voir », ne voit plus que SA fiche dans « Équipe »', L5b.noms, ['Karim Benali']);

  console.log('\n══ 2. ⛔⛔ LE CHEF D’ÉQUIPE CRÉE UN COMPTE « DR » ══');
  await entrer('uR', 'utilisateurs');
  const C1 = await S.ev(`window.__toasts=[]; formUser(); await new Promise(r=>setTimeout(r,300));
    const f=document.querySelector('#overlay form[onsubmit^="saveUser"]'); if(!f) return {form:false};
    const roles=[...f.querySelectorAll('select[name="role"] option')].map(o=>o.value);
    return {form:true, roles, profil:!!f.querySelector('select[name="profil"]'), chef:{validerDR:can('validerDR'), voirCompta:can('voirCompta'), supprimer:can('supprimer')}};`);
  vrai('population : le chef ouvre bien le formulaire de création', C1.form, C1);
  vrai('⛔⛔ le rôle « DR » lui est proposé (un nom ne porte rien) — « Administrateur » non', C1.roles && C1.roles.includes('dr') && !C1.roles.includes('admin'), C1.roles);
  vrai('… pas de profil de droits (réservé à l’administrateur)', C1.profil === false, C1);
  const R2 = await S.ev(`try{ closeModal(true); }catch(e){} return !document.querySelector('button[onclick="rolesGerer()"]');`);
  vrai('… ni le bouton « 🏷 Rôles » (réservé à l’administrateur)', R2);
  console.log('    droits du chef dans cette base :', JSON.stringify(C1.chef));
  const C2 = await S.ev(`const f=document.querySelector('#overlay form[onsubmit^="saveUser"]');
    f.querySelector('[name="prenom"]').value='Nadia'; f.querySelector('[name="nom"]').value='Lopez'; f.querySelector('[name="login"]').value='nadia';
    const r=f.querySelector('select[name="role"]'); r.value='dr'; r.dispatchEvent(new Event('change'));
    await saveUser({preventDefault(){}, target:f}, ''); await new Promise(r=>setTimeout(r,400));
    const nu=db.users.find(x=>x.login==='nadia'); try{ closeModal(true); }catch(e){}
    if(!nu) return {cree:false, toasts:window.__toasts.slice()};
    const trop=USER_CAPS.map(c=>c[0]).filter(k=>k!=='bonsLectureSeule'&&userCap(nu,k)&&!userCap(currentUser,k));
    return {cree:true, role:nu.role, validerDR:userCap(nu,'validerDR'), voirCompta:userCap(nu,'voirCompta'), trop, toasts:window.__toasts.slice()};`);
  vrai('⛔ le compte « DR » est créé par le chef', C2.cree && C2.role === 'dr', C2);
  v('⛔⛔ AUCUN droit du nouveau compte n’excède ceux du chef', C2.trop, []);
  v('⛔⛔ en particulier : ni la validation DR, ni la comptabilité (le chef n’a ni l’un ni l’autre)', [C2.validerDR, C2.voirCompta], [false, false]);
  vrai('⛔ et le chef apprend ce qui a été retenu', (C2.toasts || []).some(t => /Compte créé sans \d+ droit/.test(t)), C2.toasts);
  /* ⛔⛔ LE CAS QUI MORD SUR LA BÊTA D'AVANT : elle interdisait « DR » par son NOM… mais proposait
     « Gestion compta », dont le socle ouvre la comptabilité — que le chef n'a pas. */
  const C3 = await S.ev(`window.__toasts=[]; formUser(); await new Promise(r=>setTimeout(r,300));
    const f=document.querySelector('#overlay form[onsubmit^="saveUser"]'); if(!f) return {form:false};
    f.querySelector('[name="prenom"]').value='Paul'; f.querySelector('[name="nom"]').value='Compta'; f.querySelector('[name="login"]').value='paul';
    const r=f.querySelector('select[name="role"]'); const propose=[...r.options].some(o=>o.value==='compta'); r.value='compta'; r.dispatchEvent(new Event('change'));
    await saveUser({preventDefault(){}, target:f}, ''); await new Promise(r=>setTimeout(r,400));
    const nu=db.users.find(x=>x.login==='paul'); try{ closeModal(true); }catch(e){}
    return {propose, cree:!!nu, voirCompta:nu?userCap(nu,'voirCompta'):null, chef:can('voirCompta'), trop:nu?USER_CAPS.map(c=>c[0]).filter(k=>k!=='bonsLectureSeule'&&userCap(nu,k)&&!userCap(currentUser,k)):null};`);
  vrai('population : « Gestion compta » est proposé au chef, et le compte est créé', C3.propose && C3.cree, C3);
  v('⛔⛔ le compte « Gestion compta » créé par le chef n’ouvre PAS la comptabilité que le chef n’a pas', [C3.chef, C3.voirCompta, C3.trop], [false, false, []]);

  console.log('\n══ 3. ⛔ LES RÈGLES QUI TENAIENT AU NOM DU RÔLE ══');
  await entrer('uT', 'messagerie');
  const G1 = await S.ev(`go('messagerie'); await new Promise(r=>setTimeout(r,500)); const bouton=!!document.querySelector('button[onclick="formGroupe()"]'); window.__toasts=[]; formGroupe(); await new Promise(r=>setTimeout(r,200));
    const o=document.getElementById('overlay'), ouvert=!!(o&&o.classList.contains('open')&&o.querySelector('form[onsubmit^="saveGroupe"]')); try{ closeModal(true); }catch(e){}
    const groupes=[...document.querySelectorAll('#content .chip')].map(c=>c.textContent.trim()).filter(t=>/Nord/.test(t));
    return {bouton, ouvert, toasts:window.__toasts.slice(), groupes};`);
  vrai('⛔ un technicien : pas de « Nouveau groupe »', !G1.bouton, G1);
  vrai('⛔⛔ … et la fenêtre ne s’ouvre pas même appelée directement — le refus est dit', !G1.ouvert && G1.toasts.some(t => /Gérer les groupes/.test(t)), G1);
  v('… il ne lit pas un groupe dont il n’est pas membre', G1.groupes, []);
  await entrer('uR', 'messagerie');
  const G2 = await S.ev(`go('messagerie'); await new Promise(r=>setTimeout(r,500)); return {bouton:!!document.querySelector('button[onclick="formGroupe()"]'), peut:can('gererGroupes')};`);
  vrai('contre-épreuve : le chef d’équipe (qui voit tout et planifie) garde « Nouveau groupe », comme la veille', G2.bouton && G2.peut, G2);
  const carte = qui => entrer(qui, 'parametres').then(() => S.ev(`go('parametres'); await new Promise(r=>setTimeout(r,600));
    return {vue:current, carte:/Mon e-mail professionnel/.test((document.getElementById('content')||{}).textContent||'')};`));
  const M1 = await carte('uT'), M2 = await carte('uL'), M3 = await carte('uK');
  v('population : c’est bien l’écran Paramètres qu’on lit', [M1.vue, M2.vue], ['parametres', 'parametres']);
  v('⛔ la carte « Mon e-mail professionnel » : Tom (sans la case) non, le DR (qui l’avait hier) oui', [M1.carte, M2.carte], [false, true]);
  v('⛔ … et Karim, à qui l’on vient de cocher « Tout voir », l’a — la case déduite a suivi', M3.carte, true);

  const P1 = await S.ev(`const u=db.users.find(x=>x.id==='uT'); u.acces=u.acces||{caps:{},modules:{}}; u.acces.caps.cat_stock_ajouter=false; u.acces.modules=u.acces.modules||{}; u.acces.modules.produits=true; save(); return 1;`);
  await entrer('uT', 'produits');
  const P2 = await S.ev(`const n0=db.produits.length; window.__toasts=[]; const res={};
    formProduitsListe(); await new Promise(r=>setTimeout(r,200)); res.liste=!!document.querySelector('#overlay.open #pl-texte'); try{ closeModal(true); }catch(e){}
    formProduit(); await new Promise(r=>setTimeout(r,200)); res.fiche=!!document.querySelector('#overlay.open form#prodform'); try{ closeModal(true); }catch(e){}
    _plLignes=[{nom:'Savon test sonde'}]; plValider(); await new Promise(r=>setTimeout(r,100));
    res.crees=db.produits.length-n0; res.refus=window.__toasts.filter(t=>/Créer un produit n'est pas autorisé/.test(t)).length; return res;`);
  v('⛔⛔ sans « Stock → Ajouter » : ni « ＋ Liste », ni « ＋ Produit » ne s’ouvrent, et rien n’entre au catalogue', [P2.liste, P2.fiche, P2.crees], [false, false, 0]);
  vrai('… et chaque porte dit pourquoi', P2.refus >= 3, P2);
  await entrer('uA', 'produits');
  const P3 = await S.ev(`formProduitsListe(); await new Promise(r=>setTimeout(r,200)); const ok=!!document.querySelector('#overlay.open #pl-texte'); try{ closeModal(true); }catch(e){} return ok;`);
  vrai('contre-épreuve : l’administrateur ouvre « ＋ Liste »', P3);

  console.log('\n══ 4. AUCUNE ERREUR ══');
  v('exceptions', S.exceptions, []);
  console.log(`\n════ sonde-droits : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
