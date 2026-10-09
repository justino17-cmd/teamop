/* Les VRAIES captures d'OP GESTION pour le site vitrine — Justin, 27 septembre 2026 : « partout où il y a
   des captures d'écran, je veux des vrais iPhone avec un vrai Mac, avec des vraies captures de l'application ».
   ⛔ Bêta seulement, 127.0.0.1 seulement (pilote.js), et une entreprise ENTIÈREMENT FICTIVE posée ici :
   jamais une donnée d'ELAN ni d'aucun client. Noms, adresses et téléphones sont inventés.
   Rend, dans SORTIE (défaut : vitrine/captures/), l'écran NU de l'application — sans cadre ni barre d'état :
   le cadre de l'appareil et la barre d'état sont dessinés par le site (vitrine/appareils.css), pour
   qu'une capture refaite demain retombe dans le même cadre.
   Usage : node scratchpad/captures-site.js            (tout)
           SEULES=mac-tableau,iphone-box node scratchpad/captures-site.js */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('./pilote.js');
/* ⛔ vitrine/v2/ : les pages EN LIGNE lisent vitrine/captures/ — y réécrire changerait le site en service sans
   la phrase de Justin. La v2 du site (aperçu) lit ses propres captures. */
const SORTIE = process.env.SORTIE || path.join(__dirname, '..', 'vitrine', 'v2', 'captures');
fs.mkdirSync(SORTIE, { recursive: true });

/* L'entreprise de démonstration. Les identifiants sont FIXES (pas d'uid()) : deux passages donnent la
   même base, donc les mêmes écrans — une capture refaite ne change que ce qu'on a voulu changer. */
const DONNEES = `
  window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const hl=document.getElementById('hl-ecran'); if(hl)hl.remove();
  window.pushPropose=function(){};
  prefLocal('elanB_lang','fr');
  const J=o=>{ const x=new Date(); x.setDate(x.getDate()+o); return isoDe(x); };
  const T={leo:'demo-leo', karim:'demo-karim', sofia:'demo-sofia', nina:'demo-nina'};
  db.entreprise=Object.assign({},db.entreprise||{},{nom:'Démo Hygiène Services'});
  db.techniciens=[
    {id:T.leo,  nom:'Léo Martin',   tel:'06 00 00 00 11', metier:'Technicien applicateur'},
    {id:T.karim,nom:'Karim Benali', tel:'06 00 00 00 12', metier:'Technicien applicateur'},
    {id:T.sofia,nom:'Sofia Rossi',  tel:'06 00 00 00 13', metier:'Technicienne applicatrice'},
    {id:T.nina, nom:'Nina Dubois',  tel:'06 00 00 00 14', metier:'Technicienne applicatrice'}];
  const C=(k,nom,contact,adresse,lat,lng)=>({id:'demo-c-'+k,nom,contact,tel:'05 00 00 00 '+String(10+nom.length).slice(-2),adresse,lat,lng,pro:true});
  db.clients=[
    C('port','Boulangerie du Port','Mme Garnier','4 quai du Port, 17000 La Rochelle',46.1571,-1.1510),
    C('maree','Restaurant La Marée','M. Lefèvre','18 rue de la Grille, 17000 La Rochelle',46.1609,-1.1522),
    C('tilleuls','Résidence Les Tilleuls','Syndic Horizon','12 avenue des Tilleuls, 17000 La Rochelle',46.1662,-1.1398),
    C('glycines','EHPAD Les Glycines','Mme Roux','5 rue des Glycines, 17140 Lagord',46.1890,-1.1510),
    C('plage','Hôtel de la Plage','M. Caron','1 boulevard de la Plage, 17340 Châtelaillon-Plage',46.0745,-1.0885),
    C('minimes','Supermarché des Minimes','M. Da Silva','30 avenue des Minimes, 17000 La Rochelle',46.1437,-1.1605),
    C('phare','Brasserie Le Phare','Mme Morel','2 place du Phare, 17000 La Rochelle',46.1531,-1.1558),
    C('pins','Camping Les Pins','M. Perrin','Route des Pins, 17220 La Jarne',46.1275,-1.0781),
    C('moulin','Crèche Les Petits Pas','Mme Fabre','9 rue du Moulin, 17180 Périgny',46.1545,-1.0961)];
  const adr=k=>db.clients.find(c=>c.id==='demo-c-'+k).adresse;
  let n=0; const I=(j,h,duree,k,type,titre,techs,statut,extra)=>Object.assign({id:'demo-i-'+(++n),num:'INT-'+String(1200+n).padStart(4,'0'),
    date:j===null?'':J(j),heure:h,duree,clientId:'demo-c-'+k,adresse:adr(k),type,titre,techId:techs[0]||'',techIds:techs.slice(),statut,prio:'normale',desc:'',compteRendu:''},extra||{});
  db.interventions=[
    I(0,'08:00',60,'maree','Contrat anti nuisibles (HACCP)','Contrôle HACCP mensuel',[T.leo],'terminee',{montant:78,compteRendu:'12 postes contrôlés, aucune consommation.',rapportEnvoye:{ts:Date.now()-3600000}}),
    I(0,'09:30',120,'minimes','Dératisation','Dératisation réserve et quai',[T.leo,T.karim],'encours',{prio:'haute',montant:180,
      desc:'Traces de rongeurs signalées côté quai de livraison. Poser les postes sécurisés et contrôler la réserve sèche.',
      checklist:[{t:'Inspection du quai de livraison',done:true},{t:'Pose de 6 postes sécurisés',done:true},{t:'Contrôle réserve sèche',done:false},{t:'Photos et rapport signé',done:false}]}),
    I(0,'10:00',60,'tilleuls','Détection punaise de lit','Détection — appartement 3B',[],'planifiee'),
    I(0,'11:00',90,'phare','Désinsectisation blattes','Traitement cuisine au gel',[T.sofia],'planifiee',{montant:240}),
    I(0,'14:00',90,'plage','Désinsectisation punaise de lit','Chambres 12 et 14',[T.nina],'planifiee'),
    I(0,'14:30',60,'glycines','Visite technique','Visite de contrôle trimestrielle',[T.karim],'planifiee'),
    I(0,'16:00',60,'pins','Désinsectisation guêpes / frelons','Nid de frelons — sanitaires',[T.leo],'planifiee',{prio:'haute'}),
    I(0,'16:30',60,'moulin','Contrat anti nuisibles (HACCP)','Passage préventif',[T.sofia],'planifiee',{montant:60}),
    I(1,'08:30',90,'port','Dératisation','Contrôle des postes',[T.karim],'planifiee'),
    I(1,'10:30',60,'maree','Désinsectisation mites','Mites alimentaires — réserve',[T.nina],'planifiee'),
    I(1,'14:00',120,'glycines','Contrat anti nuisibles (HACCP)','Passage cuisine centrale',[T.leo,T.sofia],'planifiee'),
    I(2,'09:00',60,'phare','Désinsectisation blattes','Contrôle après traitement',[T.sofia],'planifiee'),
    I(2,'11:00',90,'minimes','Dératisation','Contrôle des postes du quai',[T.leo],'planifiee'),
    I(2,'15:00',60,'plage','Détection punaise de lit','Détection canine — 2e étage',[T.nina],'planifiee'),
    I(3,'08:00',120,'tilleuls','Désinsectisation punaise de lit','Traitement appartement 3B',[T.karim,T.nina],'planifiee'),
    I(3,'14:00',60,'moulin','Visite technique','Visite annuelle',[T.sofia],'planifiee'),
    I(3,'10:30',60,'port','Désinsectisation fourmis','Fourmis — laboratoire',[T.leo],'planifiee'),
    I(6,'13:30',90,'pins','Désinsectisation guêpes / frelons','Contrôle du site',[T.karim],'planifiee'),
    I(6,'10:00',60,'glycines','Désinsectisation blattes','Contrôle cuisine',[T.sofia],'planifiee'),
    I(6,'09:00',60,'maree','Contrat anti nuisibles (HACCP)','Contrôle HACCP',[T.leo],'planifiee'),
    I(-1,'09:00',60,'port','Dératisation','Contrôle des postes',[T.karim],'terminee',{compteRendu:'8 postes contrôlés, 2 consommations côté cour : appâts remplacés.',rapportEnvoye:{ts:Date.now()-86400000}}),
    I(-1,'14:00',90,'plage','Désinsectisation punaise de lit','Chambre 8',[T.nina],'terminee',{compteRendu:'Traitement vapeur et insecticide, literie isolée. Contrôle dans 15 jours.',rapportEnvoye:{ts:Date.now()-80000000}}),
    I(-4,'10:00',60,'phare','Désinsectisation blattes','Traitement cuisine',[T.sofia],'terminee',{compteRendu:'Gel appliqué sous les plans de travail et derrière les fours.'}),
    I(null,'',60,'moulin','Désinsectisation fourmis','Fourmis — cour intérieure',[],'aplanifier'),
    I(null,'',90,'tilleuls','Dératisation','Caves — bâtiment B',[],'aplanifier')];
  /* les produits : des références du catalogue du métier (noms publics de fabricants), rangés par produitCreer */
  const NOMS=['ADVION GEL BLATTES 30G','MAGNUM GEL CAFARDS SERINGUE 40G','DOBOL FUMIGATEUR (20g)','TATHRIN NEXT - 500ML',
    'AÉROSOL MEGASHOT GUÊPES FRELONS 750 ML','PIÈGE BLATTES GEOTRAP','NOTRAC BLOC 28G SEAU DE 8KG','MUSKIL PÂTE - SEAU DE 5KG',
    'POSTE RAT COMPACT - ROTECH®','POSTE SOURIS ROTECH® NG','PLAQUE ADHÉSIVE BOOK TRAP','GANTS NITRILE JETABLES SUPER NITRO',
    'COMBINAISON JETABLE CAT 3 TYPE 5-6','DEMI MASQUE','PULVÉRISATEUR GLORIA PRO 5L','PISTOLET APLI-GEL'];
  const P={};
  NOMS.forEach(nm=>{ const c=CATALOGUE.find(x=>x[0]===nm); if(!c) throw new Error('catalogue : '+nm);
    const p=produitCreer({id:idCatalogue(nm),nom:nm,categorie:c[1],fournisseurs:c[2],unite:'unité',prix:0,qteCarton:0,qte:0,seuil:0},{semis:true,push:true});
    P[nm]=p.id; });
  const S=(o)=>{ const s={}; Object.keys(o).forEach(nm=>{ s[P[nm]]={ctn:0,u:o[nm]}; }); return s; };
  db.boxes=[
    {id:'demo-b-1',numero:'BX-014',nom:'Utilitaire — Léo Martin',categorie:'Véhicule',adresse:'Dépôt de La Rochelle',ville:'La Rochelle',techIds:[T.leo],actif:true,
      stock:S({'ADVION GEL BLATTES 30G':14,'MAGNUM GEL CAFARDS SERINGUE 40G':6,'DOBOL FUMIGATEUR (20g)':2,'TATHRIN NEXT - 500ML':4,
        'AÉROSOL MEGASHOT GUÊPES FRELONS 750 ML':1,'NOTRAC BLOC 28G SEAU DE 8KG':3,'MUSKIL PÂTE - SEAU DE 5KG':2,'POSTE RAT COMPACT - ROTECH®':18,
        'POSTE SOURIS ROTECH® NG':9,'PLAQUE ADHÉSIVE BOOK TRAP':24,'GANTS NITRILE JETABLES SUPER NITRO':0,'COMBINAISON JETABLE CAT 3 TYPE 5-6':7,
        'DEMI MASQUE':2,'PISTOLET APLI-GEL':1})},
    {id:'demo-b-2',numero:'BX-021',nom:'Utilitaire — Karim Benali',categorie:'Véhicule',adresse:'Dépôt de La Rochelle',ville:'La Rochelle',techIds:[T.karim],actif:true,
      stock:S({'ADVION GEL BLATTES 30G':8,'TATHRIN NEXT - 500ML':1,'NOTRAC BLOC 28G SEAU DE 8KG':5,'POSTE RAT COMPACT - ROTECH®':12,'PIÈGE BLATTES GEOTRAP':30,'GANTS NITRILE JETABLES SUPER NITRO':3})},
    {id:'demo-b-3',numero:'BX-032',nom:'Utilitaire — Sofia Rossi',categorie:'Véhicule',adresse:'Dépôt de La Rochelle',ville:'La Rochelle',techIds:[T.sofia,T.nina],actif:true,
      stock:S({'ADVION GEL BLATTES 30G':11,'MAGNUM GEL CAFARDS SERINGUE 40G':9,'PIÈGE BLATTES GEOTRAP':16,'PULVÉRISATEUR GLORIA PRO 5L':1,'DEMI MASQUE':1})}];
  db.demandes=[
    {id:'demo-d-1',num:'DC-2026-041',date:J(0),boxId:'demo-b-1',boxNumero:'BX-014',boxNom:'Utilitaire — Léo Martin',lignes:[{produitId:P['GANTS NITRILE JETABLES SUPER NITRO'],quantite:4},{produitId:P['AÉROSOL MEGASHOT GUÊPES FRELONS 750 ML'],quantite:6}],chefId:T.leo,chefNom:'Léo Martin',statut:'enAttente',notes:'Saison des frelons'},
    {id:'demo-d-2',num:'DC-2026-042',date:J(0),boxId:'demo-b-2',boxNumero:'BX-021',boxNom:'Utilitaire — Karim Benali',lignes:[{produitId:P['TATHRIN NEXT - 500ML'],quantite:3}],chefId:T.karim,chefNom:'Karim Benali',statut:'enAttente',notes:''}];
  db.bons=[{id:'demo-bc-1',numero:'BC-2026-018',date:J(0),fournisseurId:'',statut:'brouillon',faitPar:'Camille Laurent',notes:'',
    lignes:[{produitId:P['GANTS NITRILE JETABLES SUPER NITRO'],designation:'GANTS NITRILE JETABLES SUPER NITRO',quantite:10,prixUnitaireHT:9.5,tvaRate:20}]}];
  db.enveloppes=[
    {id:'demo-e-1',numero:'ENV-2026-031',clientNom:'Boulangerie du Port',adresse:'4 quai du Port',ville:'La Rochelle',technicienId:T.karim,actif:true,dateCreation:J(-1),
      paiements:[{id:'demo-p-1',mode:'Chèque',montant:180,date:J(-1),reference:'CHQ-0000',statut:'encaisse'}]},
    {id:'demo-e-2',numero:'ENV-2026-032',clientNom:'Hôtel de la Plage',adresse:'1 boulevard de la Plage',ville:'Châtelaillon-Plage',technicienId:T.nina,actif:true,dateCreation:J(-1),
      paiements:[{id:'demo-p-2',mode:'Virement',montant:640,date:J(-1),reference:'VIR-0000',statut:'encaisse'}]},
    {id:'demo-e-3',numero:'ENV-2026-033',clientNom:'Brasserie Le Phare',adresse:'2 place du Phare',ville:'La Rochelle',technicienId:T.sofia,actif:true,dateCreation:J(-2),
      paiements:[{id:'demo-p-3',mode:'Carte',montant:240,date:J(-2),reference:'',statut:'encaisse'}]}];
  /* devis, factures, contrats — pour les cases « Devis, factures et contrats » et « Encaissements » du site */
  const L=(designation,qte,pu)=>({designation,qte,pu});
  db.devis=[
    {id:'demo-dv-1',num:'DEV-2026-018',clientId:'demo-c-maree',date:J(-6),statut:'accepte',tva:20,notes:'Contrat HACCP — 12 passages par an',lignes:[L('Passage de contrôle HACCP',12,65),L('Postes d’appâtage sécurisés',8,14)]},
    {id:'demo-dv-2',num:'DEV-2026-019',clientId:'demo-c-tilleuls',date:J(-2),statut:'envoye',tva:20,notes:'Punaises de lit — appartement 3B',lignes:[L('Détection canine',1,180),L('Traitement vapeur + insecticide',2,210)]},
    {id:'demo-dv-3',num:'DEV-2026-020',clientId:'demo-c-plage',date:J(0),statut:'brouillon',tva:20,notes:'Traitement préventif avant saison',lignes:[L('Désinsectisation chambres',14,38)]}];
  db.factures=[
    {id:'demo-f-1',num:'FAC-2026-061',clientId:'demo-c-port',devisId:'',date:J(-5),statut:'payee',tva:20,notes:'Contrôle des postes',lignes:[L('Contrôle des postes',1,150)]},
    {id:'demo-f-2',num:'FAC-2026-062',clientId:'demo-c-plage',devisId:'',date:J(-3),statut:'payee',tva:20,notes:'Punaises de lit — chambre 8',lignes:[L('Traitement punaises de lit',1,420),L('Détection canine',1,113.33)]},
    {id:'demo-f-3',num:'FAC-2026-063',clientId:'demo-c-phare',devisId:'',date:J(-2),statut:'envoyee',tva:20,notes:'Traitement cuisine au gel',lignes:[L('Traitement gel blattes',1,200)]},
    {id:'demo-f-4',num:'FAC-2026-064',clientId:'demo-c-glycines',devisId:'',date:J(-1),statut:'envoyee',tva:20,notes:'Visite trimestrielle',lignes:[L('Visite de contrôle',1,95)]},
    {id:'demo-f-5',num:'FAC-2026-065',clientId:'demo-c-maree',devisId:'demo-dv-1',date:J(0),statut:'brouillon',tva:20,notes:'Contrôle HACCP mensuel',lignes:[L('Passage de contrôle HACCP',1,65)]}];
  db.contrats=[
    {id:'demo-ct-1',num:'CTR-2026-011',clientId:'demo-c-maree',titre:'Contrat HACCP mensuel',frequence:'mensuel',dateDebut:J(-120),dateFin:J(245),montant:65,statut:'actif',notes:''},
    {id:'demo-ct-2',num:'CTR-2026-012',clientId:'demo-c-glycines',titre:'Visites trimestrielles',frequence:'trimestriel',dateDebut:J(-60),dateFin:J(305),montant:95,statut:'actif',notes:''}];
  const R=(k,j,heure,montant,mode,client,t,nom)=>({id:'demo-r-'+k,ts:Date.now()-k*600000,date:J(j),heure,montant,mode,nbChq:mode==='CHQ'?1:0,interId:'',factureId:'',clientNom:client,techId:t,declarantId:'',declarantNom:nom,source:'telecollecte',note:'',jourValide:j<0,par:''});
  db.registres=[R(1,0,'09:05',78,'CB','Restaurant La Marée',T.leo,'Léo Martin'),R(2,0,'10:40',180,'CHQ','Supermarché des Minimes',T.karim,'Karim Benali'),
    R(3,0,'11:55',240,'CB','Brasserie Le Phare',T.sofia,'Sofia Rossi'),R(4,0,'12:20',60,'ESP','Crèche Les Petits Pas',T.sofia,'Sofia Rossi'),
    R(5,-1,'10:10',150,'CHQ','Boulangerie du Port',T.karim,'Karim Benali'),R(6,-1,'15:45',640,'VIR','Hôtel de la Plage',T.nina,'Nina Dubois')]; db._regMigre=true;
  db.vehicules=[{id:'demo-v-1',plaque:'AA-000-AA',marque:'Renault',modele:'Trafic',statut:'service'},{id:'demo-v-2',plaque:'AA-000-AB',marque:'Citroën',modele:'Jumpy',statut:'service'},{id:'demo-v-3',plaque:'AA-000-AC',marque:'Peugeot',modele:'Expert',statut:'service'}];
  db.dashLayout=['interventions','boxes','aCommander','validationsDR','encaissements']; db.dashV2=1;
  if(!db.users.some(u=>u.id==='demo-admin')) db.users.push({id:'demo-admin',prenom:'Camille',nom:'Laurent',login:'camille',role:'admin',actif:true,essai:true});
  /* l'équipe, pour la case « Équipe et rôles » : des comptes FICTIFS, rôles que l'application propose */
  [['demo-u-leo','Léo','Martin','leo','technicien',T.leo],['demo-u-karim','Karim','Benali','karim','chefEquipe',T.karim],['demo-u-sofia','Sofia','Rossi','sofia','technicien',T.sofia],
   ['demo-u-nina','Nina','Dubois','nina','technicien',T.nina],['demo-u-julie','Julie','Moreau','julie','commercial',''],['demo-u-thomas','Thomas','Petit','thomas','compta','']]
    .forEach(([id,prenom,nom,login,role,techId])=>{ if(!db.users.some(u=>u.id===id)) db.users.push({id,prenom,nom,login,role,techId,actif:true,essai:true,email:login+'@exemple.fr',pwdHash:'demonstration'}); });
  { const a=db.users.find(u=>u.id==='demo-admin'); a.email='camille@exemple.fr'; a.pwdHash=a.pwdHash||'demonstration'; }
  db.forfaitQty=3;
  save(); currentUser=db.users.find(u=>u.id==='demo-admin');
  try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+'demo-admin','1')); }catch(e){}
  return {produits:db.produits.length, interventions:db.interventions.length, boxes:db.boxes.length};`;

/* Ce qui ne fait pas partie d'un écran qu'on photographie : le message passager (« Rendu forcé… »), le
   bandeau de rappel, les fenêtres d'accueil. On les MASQUE sans les retirer (règle des sondes). */
const PROPRE = `let st=document.getElementById('cap-propre'); if(!st){ st=document.createElement('style'); st.id='cap-propre'; document.head.appendChild(st); }
  /* les barres de défilement : macOS et iOS les cachent tant qu'on ne défile pas */
  st.textContent='#toast{display:none!important} #fdr-banner{display:none!important} *{caret-color:transparent!important;scrollbar-width:none!important} *::-webkit-scrollbar{display:none!important}';
  try{ closeModal(); }catch(e){}
  /* le panneau des notifications : ouvert pour SON écran (« Notifications »), il restait ouvert sur les écrans suivants
     (9 octobre 2026 : l'équipe sur l'iPhone et les factures « hors 3D » sont sortis avec lui par-dessus) */
  try{ if(typeof closeNotif==='function') closeNotif(); }catch(e){}
  /* aucun brouillon du multitâche (« Reprendre ») : rien n'a été commencé dans cette démonstration */
  try{ localStorage.removeItem(multiCle()); multiPastilles(); }catch(e){}
  document.querySelectorAll('.multi-bar').forEach(x=>x.style.display='none');
  /* l'étiquette sous le nom : la bêta écrit « BÊTA TESTE », l'application écrit le forfait — on montre l'application */
  try{ const pl=document.getElementById('brand-plan'), f=forfait(); if(pl&&PLANS[f]){ pl.textContent=PLANS[f].l.toUpperCase(); pl.style.color=PLAN_COLOR[f]||'var(--t3)'; } }catch(e){}
  /* trois notifications non lues, comme un matin ordinaire — pas trente et une */
  try{ computeNotifs().slice(3).forEach(n=>notifSeen.set(n.id,Date.now())); saveNotifSeen(); updateBell(); }catch(e){}
  return 1;`;

/* ⛔ UN MARDI À 9 h 41, PAS LE JOUR DE LA CAPTURE. Le 27 septembre 2026 était un dimanche : le planning
   montrait une équipe au travail un dimanche, la semaine commençait par deux colonnes vides. On déplace
   l'horloge de la PAGE (Date et Date.now), pas celle du conteneur ; 9 h 41 est l'heure des visuels d'Apple. */
const MAINTENANT = [2026, 8, 29, 9, 41];
const HORLOGE = `if(!window.__horloge){ const D0=Date, dec=new D0(${MAINTENANT.join(',')},0).getTime()-D0.now();
    class D extends D0{ constructor(...a){ if(a.length) super(...a); else super(D0.now()+dec); } static now(){ return D0.now()+dec; } }
    window.Date=D; window.__horloge=1; }
  return new Date().toString();`;

const APPAREILS = {
  /* MacBook Pro 14 pouces, résolution par défaut : 1512 × 982 points. La barre des menus (37) et la barre
     de titre de la fenêtre (28) sont dessinées par le site : l'application reçoit le reste. */
  mac:    { w: 1512, h: 982 - 37 - 28, dpr: 2, mobile: false, plat: 'macos27', enc: null },
  /* iPhone 16 Pro : 402 × 874 points, îlot dynamique ; zone sûre 62 en haut, 34 en bas. */
  iphone: { w: 402, h: 874, dpr: 3, mobile: true, plat: 'ios27', enc: [62, 34] },
};

/* Chaque écran : l'appareil, puis le geste qui l'ouvre, tel qu'une personne le ferait. */
const ECRANS = [
  { nom: 'mac-tableau',     app: 'mac',    geste: `try{ localStorage.setItem('elanB_tdb_portee','7'); }catch(e){} go('dashboard');` },
  { nom: 'mac-planning',    app: 'mac',    geste: `planMode='semaine'; planWeekRef=todayISO(); planSel=todayISO(); go('planning');` },
  { nom: 'iphone-tableau',  app: 'iphone', geste: `go('dashboard');` },
  { nom: 'iphone-intervention', app: 'iphone', geste: `go('interventions'); await new Promise(r=>setTimeout(r,500)); detailIntervention('demo-i-2');` },
  /* la box, en HAUT de sa fiche : « Scanner · Arrivage · Relevé », les trois gestes que la carte « Au dépôt »
     nomme. ⚠️ Descendre jusqu'aux produits faisait passer la fiche SOUS l'horloge (essayé : illisible). */
  { nom: 'iphone-box',      app: 'iphone', geste: `go('boxes'); await new Promise(r=>setTimeout(r,500)); openBox('demo-b-1');` },
  /* ── les cases « Ce que fait OP GESTION » : un écran par case (Justin, 27 septembre au soir) ── */
  { nom: 'mac-interventions',    app: 'mac',    geste: `go('interventions');` },
  /* « Ma journée » : ce que le TECHNICIEN a dans la poche le matin — l'écran le plus parlant du planning au téléphone */
  { nom: 'iphone-journee',       app: 'iphone', qui: 'demo-u-leo', geste: `go('interventions');` },
  { nom: 'iphone-compta',        app: 'iphone', geste: `go('comptabilite');` },
  { nom: 'iphone-factures',      app: 'iphone', geste: `go('factures');` },
  { nom: 'iphone-rapports',      app: 'iphone', geste: `go('rapports');` },
  { nom: 'mac-utilisateurs',     app: 'mac',    geste: `go('utilisateurs');` },
  { nom: 'iphone-notifs',        app: 'iphone', geste: `go('dashboard');`, apres: `try{ openNotif(); }catch(e){}` },
  /* ── LE MAC ET L'iPHONE SUR CHAQUE ÉCRAN — Justin, 9 octobre 2026, capture de la case « Encaissements et compta » (un iPhone
     seul) : « je voudrais que l'iPhone et le Mac soient sur les mêmes, pas un coup l'iPhone et un coup le Mac ». Chaque case
     du site a donc ses DEUX appareils, sur le même écran de l'application. ── */
  { nom: 'mac-compta',           app: 'mac',    geste: `go('comptabilite');` },
  { nom: 'mac-factures',         app: 'mac',    geste: `go('factures');` },
  { nom: 'mac-box',              app: 'mac',    geste: `go('boxes'); await new Promise(r=>setTimeout(r,500)); openBox('demo-b-1');` },
  { nom: 'mac-rapports',         app: 'mac',    geste: `go('rapports');` },
  { nom: 'mac-notifs',           app: 'mac',    geste: `go('dashboard');`, apres: `try{ openNotif(); }catch(e){}` },
  { nom: 'iphone-utilisateurs',  app: 'iphone', geste: `go('utilisateurs');` },
  /* ── LES PAGES MÉTIER HORS 3D (plombier, électricien, chauffage, nettoyage) : les mêmes écrans, SANS les menus du métier 3D
     (« Registre sanitaire », « Carte des box », « Boxes »), que l'application masque à ces métiers (le `masque` de leur pack).
     La bêta les montre tous (BETA_ESSAI) : on lui fait masquer ce que l'application en service masquerait. ⚠️ Ce réglage reste
     posé pour la suite de la séance : ces écrans passent APRÈS les autres, et avant la connexion (qui n'a pas de menus). ── */
  { nom: 'mac-factures-neutre',    app: 'mac',    neutre: true, geste: `go('factures');` },
  { nom: 'mac-compta-neutre',      app: 'mac',    neutre: true, geste: `go('comptabilite');` },
  { nom: 'iphone-factures-neutre', app: 'iphone', neutre: true, geste: `go('factures');` },
  { nom: 'iphone-compta-neutre',   app: 'iphone', neutre: true, geste: `go('comptabilite');` },
  /* la case « Sécurisé » : l'écran de connexion, tel qu'une personne le voit en ouvrant l'application.
     ⚠️ EN DERNIER : il cache l'application, les écrans suivants n'auraient plus rien à montrer. */
  { nom: 'iphone-connexion',     app: 'iphone', geste: `renderLogin();`, ecranConnexion: true, texteMin: 40,
    /* la pastille « BÊTA » est celle de la bêta, pas de l'application qu'on montre : masquée, pas retirée */
    apres: `const lg=document.getElementById('login'); let n=0; lg.querySelectorAll('*').forEach(e=>{ if(/^\\W*BÊTA$/.test(e.textContent.trim()) && !e.querySelector('input')){ e.style.visibility='hidden'; n++; } }); if(!n) throw new Error('pastille BÊTA introuvable');` },
  /* la même, sur le Mac (la case « Sécurisé » a ses deux appareils) */
  { nom: 'mac-connexion',        app: 'mac',    geste: `renderLogin();`, ecranConnexion: true, texteMin: 40,
    apres: `const lg=document.getElementById('login'); let n=0; lg.querySelectorAll('*').forEach(e=>{ if(/^\\W*BÊTA$/.test(e.textContent.trim()) && !e.querySelector('input')){ e.style.visibility='hidden'; n++; } }); if(!n) throw new Error('pastille BÊTA introuvable');` },
];

async function poser(S, A, theme) {
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: A.w, height: A.h, deviceScaleFactor: A.dpr, mobile: A.mobile });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: A.mobile, maxTouchPoints: A.mobile ? 5 : 1 });
  const [t, b] = A.enc || [0, 0];
  try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: t, bottom: b, left: 0, right: 0, topMax: t, bottomMax: b, leftMax: 0, rightMax: 0 } }); } catch (e) {}
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: theme }] });
  /* sans les toasts de setPlatForce / setThemePref : on pose les deux réglages comme eux, sans le message */
  return S.ev(`try{ localStorage.setItem(PLAT_CLE,${JSON.stringify(A.plat)}); }catch(e){} opPlatAppliquer();
    prefLocal('elanB_theme',${JSON.stringify(theme)}); applyTheme();
    return {plat:document.documentElement.dataset.plat, theme:effectiveTheme(), kind:document.documentElement.dataset.kind, verre:document.documentElement.dataset.verre};`);
}

/* ── LES POLICES D'UN VRAI APPAREIL ─────────────────────────────────────────────────────────────
   Le Chromium du conteneur n'a ni SF Pro ni réseau : la page tombait sur DejaVu, et les polices que
   l'application charge chez Google (Archivo, DM Sans, Space Mono) ne venaient pas. Une capture ainsi
   faite n'est pas « l'application sur un iPhone ». On télécharge UNE fois (curl passe par le proxy, le
   navigateur non), on sert en local, et on pose : les familles de Google telles quelles, et Inter sous
   le nom « SF Pro Text / Display » (SF Pro n'est pas redistribuable ; Inter en est le plus proche),
   JetBrains Mono sous « SF Mono ». Toutes sous licence OFL. */
const POLICES = path.join(require('os').tmpdir(), 'teamop-polices');
function polices() {
  const css = path.join(POLICES, 'local.css');
  if (fs.existsSync(css)) return fs.readFileSync(css, 'utf8');
  fs.mkdirSync(POLICES, { recursive: true });
  const { execFileSync } = require('child_process');
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
  const g = execFileSync('curl', ['-sS', '-m', '30', '-A', UA, 'https://fonts.googleapis.com/css2?family=Inter:wght@300..900&family=Archivo:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400..800&display=swap']).toString();
  const faces = [];
  for (const m of g.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    if (m[1] !== 'latin' && m[1] !== 'latin-ext') continue;
    const url = m[2].match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)[1], nom = url.split('/').pop();
    if (!fs.existsSync(path.join(POLICES, nom))) execFileSync('curl', ['-sS', '-m', '30', '-o', path.join(POLICES, nom), url]);
    faces.push(m[2].replace(url, '/polices/' + nom));
  }
  const alias = (de, vers) => faces.filter(f => f.includes("font-family: '" + de + "'")).map(f => f.replace("font-family: '" + de + "'", "font-family: '" + vers + "'"));
  const tout = faces.concat(alias('Inter', 'SF Pro Text'), alias('Inter', 'SF Pro Display'), alias('Inter', 'SF Pro'),
    alias('JetBrains Mono', 'SF Mono'), alias('JetBrains Mono', 'SFMono-Regular')).join('\n');
  fs.writeFileSync(css, tout);
  return tout;
}

/* ── CE QUE L'APPAREIL DESSINE AUTOUR DE L'APPLICATION ─────────────────────────────────────────
   iPhone : la barre d'état (heure, réseau, Wi-Fi, batterie), l'îlot dynamique, l'indicateur d'accueil.
   Mac : le fond d'écran, la barre des menus, la barre de titre de la fenêtre (feux, titre). La couleur
   de la barre de titre est RELEVÉE sur la première ligne de la capture : c'est ce que fait Safari pour
   une application web installée (il prend la couleur du thème de la page). */
const ICONES_IOS = (ink) => `
  <svg width="19" height="12" viewBox="0 0 19 12" fill="${ink}"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="5.1" y="5.2" width="3.2" height="6.8" rx="1"/><rect x="10.2" y="2.8" width="3.2" height="9.2" rx="1"/><rect x="15.3" y="0" width="3.2" height="12" rx="1"/></svg>
  <svg width="17" height="12" viewBox="0 0 17 12" fill="${ink}"><path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.3-1.3A10.3 10.3 0 0 0 8.5.5 10.3 10.3 0 0 0 1.2 3.4l1.3 1.3a8.5 8.5 0 0 1 6-2.4Z"/><path d="M8.5 5.9c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.6 6.6 0 0 0 8.5 4a6.6 6.6 0 0 0-4.7 1.9l1.3 1.3c.9-.8 2.1-1.3 3.4-1.3Z"/><path d="M8.5 9.4c.4 0 .8.2 1.1.4L8.5 11 7.4 9.8c.3-.2.7-.4 1.1-.4Z"/><path d="M8.5 7.6c.9 0 1.7.3 2.3.9L8.5 10.8 6.2 8.5c.6-.6 1.4-.9 2.3-.9Z"/></svg>
  <svg width="28" height="13" viewBox="0 0 28 13"><rect x=".5" y=".5" width="24" height="12" rx="3.8" fill="none" stroke="${ink}" stroke-opacity=".38"/><rect x="2" y="2" width="21" height="9" rx="2.4" fill="${ink}"/><path d="M26 4.3v4.4c.8-.3 1.4-1.2 1.4-2.2S26.8 4.6 26 4.3Z" fill="${ink}" fill-opacity=".45"/></svg>`;
const POMME = (ink) => `<svg width="14" height="17" viewBox="0 0 170 205" fill="${ink}"><path d="M150.4 172.3c-8.2 12.3-17 24.3-30.4 24.5-13.3.3-17.6-7.9-32.8-7.9s-20 7.7-32.5 8.2c-13 .5-22.9-13.3-31.2-25.5C6.6 146.6-6.3 101.8 11 71.6c8.6-15 24-24.5 40.7-24.8 12.7-.2 24.7 8.6 32.5 8.6 7.7 0 22.3-10.6 37.6-9 6.4.3 24.4 2.6 36 19.6-.9.6-21.5 12.6-21.3 37.6.3 29.8 26.2 39.8 26.5 39.9-.2.7-4.1 14.2-12.6 27.8ZM107.6 31.7c7-8.5 11.8-20.4 10.5-32.2-10.1.4-22.4 6.8-29.6 15.2-6.5 7.5-12.2 19.6-10.7 31.1 11.3.9 22.8-5.7 29.8-14.1Z"/></svg>`;

function htmlIphone(src, nuit) {
  const ink = nuit ? '#fff' : '#000';
  return `<!doctype html><meta charset="utf-8"><style>${polices()} html,body{margin:0}
    body{width:402px;height:874px;position:relative;overflow:hidden;background:#000}
    img{position:absolute;inset:0;width:402px;height:874px}
    .heure{position:absolute;left:0;width:150px;top:18px;text-align:center;font:600 17px/22px 'SF Pro Text';letter-spacing:-.2px;color:${ink}}
    .icos{position:absolute;right:0;width:150px;top:22px;display:flex;justify-content:center;align-items:center;gap:6px}
    .ile{position:absolute;top:11px;left:50%;transform:translateX(-50%);width:125px;height:37px;border-radius:19px;background:#000}
    .accueil{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:139px;height:5px;border-radius:3px;background:${ink}}
  </style><body><img id="cap" src="${src}"><div class="heure">9:41</div><div class="icos">${ICONES_IOS(ink)}</div><div class="ile"></div><div class="accueil"></div></body>`;
}
function htmlMac(src, nuit) {
  const ink = nuit ? '#fff' : '#000';
  let date = '';
  try { date = new Date(MAINTENANT[0], MAINTENANT[1], MAINTENANT[2]).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) {}
  const menus = ['Fichier', 'Édition', 'Présentation', 'Historique', 'Fenêtre', 'Aide'].map(m => `<span>${m}</span>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>${polices()} html,body{margin:0}
    body{width:1512px;height:982px;position:relative;overflow:hidden;font-family:'SF Pro Text';
      background:${nuit ? 'radial-gradient(120% 90% at 20% 0%,#23345a 0%,#101b33 45%,#070d1a 100%)' : 'radial-gradient(120% 90% at 20% 0%,#eef3fa 0%,#cfdcee 50%,#a9bfdf 100%)'}}
    .menus{position:absolute;top:0;left:0;right:0;height:37px;display:flex;align-items:center;gap:21px;padding:0 20px;color:${ink};font-size:13.5px;letter-spacing:-.1px}
    .menus b{font-weight:700}
    .menus .droite{margin-left:auto;display:flex;align-items:center;gap:18px}
    .fen{position:absolute;top:37px;left:0;right:0;bottom:0;border-radius:12px 12px 0 0;overflow:hidden;
      box-shadow:0 0 0 .5px ${nuit ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.2)'},0 10px 40px rgba(0,0,0,${nuit ? '.55' : '.22'})}
    .titre{height:28px;position:relative;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:${nuit ? 'rgba(255,255,255,.78)' : 'rgba(0,0,0,.72)'}}
    .feux{position:absolute;left:13px;top:8px;display:flex;gap:8px}
    .feux i{width:12px;height:12px;border-radius:50%;display:block;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.18)}
    img{display:block;width:1512px;height:917px}
  </style><body>
    <div class="menus">${POMME(ink)}<b>OP GESTION</b>${menus}
      <span class="droite">${ICONES_IOS(ink).replace(/<svg width="19"[\s\S]*?<\/svg>/, '')}<span>${date}&nbsp;&nbsp;09:41</span></span></div>
    <div class="fen" id="fen"><div class="titre" id="titre"><span class="feux"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>OP GESTION</div><img id="cap" crossorigin="anonymous" src="${src}"></div>
  </body>`;
}

(async () => {
  const seules = process.env.SEULES ? process.env.SEULES.split(',') : null;
  const BRUT = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cap-brut-'));
  polices();
  const S = await ouvrir({ servir: { '/polices/': POLICES, '/brut/': BRUT } });
  const rapport = [];
  try {
    /* les polices d'abord : la page les demande par leur nom, elles doivent être là avant le premier rendu */
    const pol = await S.ev(`const st=document.createElement('style'); st.id='cap-polices';
      st.textContent=${JSON.stringify(polices())}; document.head.appendChild(st);
      await Promise.all(['400','600','700','800'].map(w=>document.fonts.load(w+' 16px "SF Pro Text"')));
      await document.fonts.load('700 16px Archivo'); await document.fonts.load('500 16px "DM Sans"'); await document.fonts.load('700 16px "SF Mono"');
      return {sf:document.fonts.check('600 16px "SF Pro Text"'), archivo:document.fonts.check('700 16px Archivo'), mono:document.fonts.check('700 16px "SF Mono"')};`);
    if (!pol.sf || !pol.archivo || !pol.mono) throw new Error('polices non chargées : ' + JSON.stringify(pol));
    await S.c.envoyer('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Paris' });
    const h = await S.ev(HORLOGE);
    if (!/ 09:41/.test(h)) throw new Error('horloge non posée : ' + h);
    const pop = await S.ev(DONNEES);
    console.log('base de démonstration :', JSON.stringify(pop), '· bêta', S.version);
    if (pop.interventions < 20 || pop.produits < 16 || pop.boxes < 3) throw new Error('base de démonstration incomplète');
    let entre = false;
    for (const E of ECRANS) {
      if (seules && !seules.includes(E.nom)) continue;
      const A = APPAREILS[E.app];
      for (const theme of ['light', 'dark']) {
        const r = await poser(S, A, theme);
        if (r.plat !== A.plat || r.theme !== theme) throw new Error(E.nom + ' : réglage non pris ' + JSON.stringify(r));
        if (!entre) { await S.ev(`enterApp(currentUser); return 1;`); entre = true; await dormir(1500); }
        await S.ev(PROPRE);
        /* chaque écran s'ouvre comme depuis le menu : pas de « ‹ Planning » hérité de la capture d'avant */
        await S.ev(`window._viewStack=[]; current=''; return 1;`);   // `go()` empile la vue courante : sans vue courante, rien ne s'empile
        await S.ev(`currentUser=db.users.find(u=>u.id===${JSON.stringify(E.qui || 'demo-admin')}); return 1;`);
        if (E.neutre) {
          const m = await S.ev(`if(!window.__horsTroisD){ window.__horsTroisD=1; const M=(METIERS.plomberie||{}).masque||['registre','carteBox','devisXylo','boxes'];
              window.metierBloque=k=>M.indexOf(k)>=0; }
            renderNav(); renderOnglets(); return {menu:document.getElementById('nav').innerText, onglets:(document.getElementById('tabbar')||{}).innerText||''};`);
          if (/Registre sanitaire|Carte des box|Boxes/.test(m.menu + ' ' + m.onglets)) throw new Error(E.nom + ' : un menu du métier 3D reste visible — ' + JSON.stringify(m).slice(0, 300));
        }
        await S.ev(E.geste + ' return 1;');
        await dormir(1400);
        await S.ev(PROPRE);
        if (E.apres) { await S.ev(E.apres + ' return 1;'); await dormir(500); }
        if (process.env.DIAG) console.log(JSON.stringify(await S.ev(`return [...document.querySelectorAll('#content h2,#content h3,#content .card-head,#content .bx-sec,#content [class*=titre]')].slice(0,40).map(e=>[e.tagName+'.'+e.className, e.textContent.trim().slice(0,40), Math.round(e.getBoundingClientRect().top+scrollY)]);`)));
        /* deux trames et une lecture forcée : la mise en page est posée (règle du dépôt) */
        const etat = await S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
          const c=document.getElementById('content');
          const fam=getComputedStyle(document.body).fontFamily;
          const lg=document.getElementById('login');
          return {vue:current, texte:(c?c.innerText:'').length, connexion:(lg&&getComputedStyle(lg).display!=='none'?lg.innerText:'').length, hl:!!document.getElementById('hl-ecran'),
            large:document.documentElement.scrollWidth, fen:innerWidth, police:fam.slice(0,80), sx:scrollX, sy:scrollY};`);
        if (etat.hl) throw new Error(E.nom + ' : écran « Connexion requise » par-dessus');
        if ((E.ecranConnexion ? etat.connexion : etat.texte) < (E.texteMin || 200)) throw new Error(E.nom + ' : écran presque vide (' + etat.texte + ' signes) — ' + JSON.stringify(etat));
        if (etat.large > etat.fen + 1) throw new Error(E.nom + ' : la page déborde de côté (' + etat.large + ' > ' + etat.fen + ')');
        /* ⚠️ le rectangle de capture est en coordonnées du DOCUMENT : une page défilée se photographie à sa position */
        const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: etat.sx, y: etat.sy, width: A.w, height: A.h, scale: 1 } });
        const nom = E.nom + '-' + (theme === 'light' ? 'jour' : 'nuit');
        fs.writeFileSync(path.join(BRUT, nom + '.png'), Buffer.from(cap.data, 'base64'));
        rapport.push({ nom, app: E.app, nuit: theme === 'dark', vue: etat.vue, signes: etat.texte });
        console.log('  écran', nom, '·', etat.vue, '·', etat.texte, 'signes ·', etat.police);
      }
    }
    if (S.exceptions.length) console.log('⚠ exceptions JavaScript pendant les captures :', S.exceptions.slice(0, 5));

    /* ── l'appareil autour : une page composée, photographiée en WebP ── */
    await S.c.envoyer('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0, topMax: 0, bottomMax: 0, leftMax: 0, rightMax: 0 } }).catch(() => {});
    await S.c.envoyer('Page.navigate', { url: S.BASE + '/polices/local.css' }); await dormir(400);   // même origine : les polices et les captures brutes se lisent sans détour
    const ft = await S.c.envoyer('Page.getFrameTree', {});
    for (const R of rapport) {
      const mac = R.app === 'mac';
      const W = mac ? 1512 : 402, H = mac ? 982 : 874;
      await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: mac ? 2 : 3, mobile: false });
      const src = S.BASE + '/brut/' + R.nom + '.png';
      await S.c.envoyer('Page.setDocumentContent', { frameId: ft.frameTree.frame.id, html: mac ? htmlMac(src, R.nuit) : htmlIphone(src, R.nuit) });
      const ok = await S.ev(`const im=document.getElementById('cap'); if(!im.complete) await new Promise(r=>{ im.onload=r; im.onerror=r; });
        await document.fonts.ready; await Promise.all(['400','600','700'].map(w=>document.fonts.load(w+' 13px "SF Pro Text"')));
        const t=document.getElementById('titre');
        if(t){ const c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=4; const x=c.getContext('2d'); x.drawImage(im,0,0);
          const d=x.getImageData(0,1,c.width,1).data; let r=0,g=0,b=0,n=0; for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
          t.style.background='rgb('+Math.round(r/n)+','+Math.round(g/n)+','+Math.round(b/n)+')'; }
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        return {img:im.naturalWidth, police:document.fonts.check('600 13px "SF Pro Text"')};`);
      if (!ok.img || !ok.police) throw new Error(R.nom + ' : composition incomplète ' + JSON.stringify(ok));
      const sorties = mac ? [['', 1], ['-1x', 0.5]] : [['', 2 / 3]];
      for (const [suf, sc] of sorties) {
        const cap = await S.c.envoyer('Page.captureScreenshot', { format: 'webp', quality: 86, clip: { x: 0, y: 0, width: W, height: H, scale: sc } });
        const f = path.join(SORTIE, R.nom + suf + '.webp');
        fs.writeFileSync(f, Buffer.from(cap.data, 'base64'));
        console.log('✓', path.relative(process.cwd(), f), Math.round(fs.statSync(f).size / 1024) + ' Ko');
      }
    }
  } finally { S.fermer(); try { fs.rmSync(BRUT, { recursive: true, force: true }); } catch (e) {} }
  /* deux captures identiques = une capture fausse */
  const vus = {};
  for (const f of fs.readdirSync(SORTIE).filter(x => x.endsWith('.webp'))) {
    const e = require('crypto').createHash('sha256').update(fs.readFileSync(path.join(SORTIE, f))).digest('hex');
    if (vus[e]) throw new Error('captures identiques : ' + vus[e] + ' et ' + f);
    vus[e] = f;
  }
  console.log(Object.keys(vus).length + ' images, toutes distinctes');
})().catch(e => { console.error('✗', e.message || e); process.exit(2); });
