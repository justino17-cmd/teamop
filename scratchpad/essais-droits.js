/* Les essais de la matrice des droits (sonde-matrice-droits.js). Le compte `uT` (Tom, technicien) a
   TOUT sauf `retire`. `SOCLE` remet la base d'essai d'aplomb avant CHAQUE passage (clients, interventions,
   documents, box, tâches… tous marqués « sonde »), `base` y ajoute ce qui est propre à l'essai, `prep`
   prépare l'écran, `geste` est ce que le bouton appelle, `mesure` l'expression lue avant et après.
   `dit:true` exige qu'un message de refus soit affiché. Les essais de VISIBILITÉ écrivent ce qu'ils ont
   vu dans `window.__vu` (la fenêtre est refermée avant la mesure).
   Personnes : Tom (uT/tT) — l'essayé ; Karim (uK/tK) — un collègue ; Zoé (uZ/tZ) — hors de tout périmètre. */
const SOCLE = `function(){
  const D='2026-10-06';
  if(!db.techniciens.some(t=>t.id==='tZ')) db.techniciens.push({id:'tZ',nom:'Zoé Sonde',metier:'Technicien'});
  if(!db.users.some(u=>u.id==='uZ')) db.users.push({id:'uZ',prenom:'Zoé',nom:'Sonde',login:'zoe',role:'technicien',techId:'tZ',actif:true,pref:{}});
  db.users=db.users.filter(u=>!/Sondetest/.test((u.prenom||'')+' '+(u.nom||'')));
  db.techniciens=db.techniciens.filter(t=>!/Sondetest/.test(t.nom||''));
  db.users.forEach(u=>{ if(u.id==='uK'||u.id==='uZ'){ delete u.chefId; delete u.drId; } });
  db.validDRTous=false; db.mailFrom=''; db.mailReply='';
  const sonde=s=>/sonde/i.test(String(s||''));
  const CL=['cT','cT2','cK','cZ','cImp'];
  db.clients=(db.clients||[]).filter(c=>!sonde(c.nom)&&!CL.includes(c.id));
  db.clients.push({id:'cT',nom:'Pharmacie Tomsonde',tel:'0600000001',email:'tom-client@exemple.fr',adresse:'1 rue A',lat:45.9,lng:-0.9},
    {id:'cT2',nom:'Garage Tomsonde',adresse:'2 rue B',lat:45.91,lng:-0.91},
    {id:'cK',nom:'Boulangerie Karimsonde',tel:'0600000002',email:'karim-client@exemple.fr',adresse:'3 rue C',lat:45.92,lng:-0.92},
    {id:'cZ',nom:'Fromagerie Zoésonde',adresse:'4 rue D',lat:45.93,lng:-0.93});
  const vieux=new Set((db.clients||[]).map(c=>c.id));
  db.interventions=(db.interventions||[]).filter(i=>!sonde(i.titre)&&!['iT','iTf','iK','iZ'].includes(i.id));
  const I=(id,num,titre,cli,tech,statut,heure,extra)=>Object.assign({id,num,titre,clientId:cli,techId:tech,techIds:[tech],date:D,heure,duree:60,statut,produitsUtilises:[],equipements:[],histo:[],desc:''},extra||{});
  db.interventions.push(I('iT','INT-S1','Dératisation Tomsonde','cT','tT','planifiee','09:00'),
    I('iTf','INT-S2','Désinsectisation Tomsonde finie','cT','tT','terminee','11:00',{montant:120}),
    I('iK','INT-S3','Désinsectisation Karimsonde','cK','tK','planifiee','10:00'),
    I('iZ','INT-S4','Dératisation Zoésonde','cZ','tZ','planifiee','14:00'));
  const L=[{designation:'Prestation sonde',qte:1,pu:100}];
  const docSonde=d=>CL.includes(d.clientId)||!vieux.has(d.clientId)||sonde(d.notes);
  db.devis=(db.devis||[]).filter(d=>!docSonde(d));
  db.devis.push({id:'dT',num:'DV-S-T',clientId:'cT',date:D,statut:'brouillon',tva:20,lignes:L},
    {id:'dA',num:'DV-S-A',clientId:'cT',date:D,statut:'accepte',tva:20,lignes:L},
    {id:'dK',num:'DV-S-K',clientId:'cK',date:D,statut:'brouillon',tva:20,lignes:L});
  db.factures=(db.factures||[]).filter(f=>!docSonde(f));
  db.factures.push({id:'fT',num:'FA-S-T',clientId:'cT',date:D,statut:'brouillon',tva:20,lignes:L});
  db.contrats=(db.contrats||[]).filter(c=>!CL.includes(c.clientId));
  db.contrats.push({id:'ctT',num:'CTR-S-T',titre:'Contrat Tomsonde',clientId:'cT',frequence:'mensuel',statut:'actif',dateDebut:D,montant:50},
    {id:'ctK',num:'CTR-S-K',titre:'Contrat Karimsonde',clientId:'cK',frequence:'mensuel',statut:'actif',dateDebut:D,montant:50});
  db.taches=(db.taches||[]).filter(t=>!['tkT','tkK'].includes(t.id));
  db.taches.push({id:'tkT',titre:'Tâche Tomsonde',techId:'tT',fait:false,creePar:'uA'},{id:'tkK',titre:'Tâche Karimsonde',techId:'tK',fait:false,creePar:'uA'});
  db.absences=(db.absences||[]).filter(a=>!['abT','abK'].includes(a.id));
  db.absences.push({id:'abT',techId:'tT',type:'conges',du:'2026-11-02',au:'2026-11-03',creePar:'uT',statut:'attente'},
    {id:'abK',techId:'tK',type:'conges',du:'2026-11-02',au:'2026-11-03',creePar:'uK',statut:'attente'});
  db.enveloppes=(db.enveloppes||[]).filter(e=>e.id!=='envS');
  db.enveloppes.push({id:'envS',numero:'ENV-S',clientNom:'Client sonde',paiements:[{id:'pS1',mode:'Espèces',montant:10,date:D,statut:'encaisse'}],dateCreation:D});
  db.fournisseurs=(db.fournisseurs||[]).filter(f=>f.id!=='fS');
  db.fournisseurs.push({id:'fS',nom:'Fournisseur sonde',email:'four@exemple.fr'});
  db.produits=(db.produits||[]).filter(p=>!sonde(p.nom));
  const P=(id,nom)=>produitCreer({id,nom,categorie:CAT_LIST[0],fournisseurs:['Fournisseur sonde'],unite:'unité',qte:10,qteCarton:10,prix:1,seuil:0},{semis:true,push:true});
  P('pS','Produit sonde'); P('pX','Produit sonde à poser'); P('pZ','Produit sonde à zéro'); P('pd1','Essai sonde doublon'); P('pd2','Essai sonde doublon');
  db.produitsDistincts=(db.produitsDistincts||[]).filter(d=>!(d.ids||[]).some(id=>id==='pd1'||id==='pd2'));
  db.boxes=(db.boxes||[]).filter(b=>!['bT','bK'].includes(b.id));
  db.boxes.push({id:'bT',numero:'BX-S-T',nom:'Box Tomsonde',techIds:['tT'],userIds:[],actif:true,stock:{pS:{ctn:1,u:5},pZ:{ctn:0,u:0}},arrivages:[{id:'aS',ts:Date.now()-86400000,fournisseur:'Fournisseur sonde',lignes:[],par:'Tom Terrain'}]},
    {id:'bK',numero:'BX-S-K',nom:'Box Karimsonde',techIds:['tK'],userIds:[],actif:true,stock:{pS:{ctn:0,u:3}}});
  db.boxDecisions=(db.boxDecisions||[]).filter(d=>!['bT','bK'].includes(d.id));
  db.boxMvtAttente=(db.boxMvtAttente||[]).filter(m=>!['bT','bK'].includes(m.boxId));
  db.demandes=(db.demandes||[]).filter(d=>!/^dm[TKZ]$/.test(d.id));
  db.bons=(db.bons||[]).filter(b=>!/^dm[TKZ]$/.test(b.demandeId||''));
  try{ localStorage.removeItem(AD_CODE_KEY); }catch(e){}
  try{ _doublonsPlusTard=false; }catch(e){}
}`;

const ATT = ms => `await __attendre(${ms});`;
const nb = expr => `(${expr}).length`;
const MVT = (id, par) => `db.boxMvtAttente.unshift({id:'${id}',type:'ajustement',boxId:'bT',produitId:'pS',du:-1,dc:0,statut:'enAttente',parId:'${par}',par:'x',ts:Date.now()});`;
const DEM = (id, chef) => `db.demandes.push({id:'${id}',num:'DEM-S-${id}',chefId:'${chef}',boxId:'bT',statut:'enAttente',date:'2026-10-06',lignes:[{produitId:'pS',qte:2}]});`;

/* Zoé est hors de tout périmètre : son client reçoit un code postal (sans lui, aucun secteur n'est
   calculé), une intervention finie à l'instant, un mouvement et une demande en attente. */
const NOTIF_Z = `db.clients.find(x=>x.id==='cZ').codePostal='40100';
  db.interventions.push(Object.assign({},db.interventions.find(x=>x.id==='iZ'),{id:'iZ2',num:'INT-S7',titre:'Dératisation Zoésonde finie',statut:'terminee',finReel:Date.now()-3600000}));
  ${MVT('mZ', 'uZ')} ${DEM('dmZ', 'uZ')}`;

/* v739 : un compte au profil PAR DÉFAUT (aucune case personnelle) et le compte-rendu du premier passage. */
const HISTO_BASE = (id, role, prenom) => `if(!db.users.some(u=>u.id==='${id}')) db.users.push({id:'${id}',prenom:'${prenom}',nom:'Profilsonde',login:'${id}',role:'${role}',actif:true,pref:{}});
  const _u=db.users.find(u=>u.id==='${id}'); delete _u.acces; delete _u.drId; delete _u.chefId;
  db.interventions.find(x=>x.id==='iTf').compteRendu='Rapport sonde du premier passage';`;

const ESSAIS = [
  /* ═════ v737 — les deux essais d'origine ═════ */
  { nom: 'Stock → Ajouter : « ＋ Liste » ne crée aucune fiche', retire: { cat_stock_ajouter: false }, dit: true,
    base: `function(){ db.produits=(db.produits||[]).filter(p=>!/^Essai liste/.test(p.nom||'')); }`,
    geste: `_plLignes=[{nom:'Essai liste savon'}]; plValider();`,
    mesure: nb(`db.produits.filter(p=>/^Essai liste/.test(p.nom||''))`) },
  { nom: 'Gérer les groupes : « Nouveau groupe » n’enregistre rien', retire: { gererGroupes: false }, dit: true,
    base: `function(){ db.groupes=(db.groupes||[]).filter(g=>g.nom!=='Essai sonde'); }`,
    geste: `saveGroupe({preventDefault(){},target:__form('<input name="nom" value="Essai sonde">')},'');`,
    mesure: nb(`(db.groupes||[]).filter(g=>g.nom==='Essai sonde')`) },

  /* ═════ VOIR — sans « Tout voir », rien d'un collègue ne paraît, par aucun chemin ═════ */
  { nom: 'Voir · recherche du bandeau : ni le client ni l’intervention d’un collègue', retire: { voirTout: false },
    prep: `const r=document.getElementById('gsrch-res'); if(r) r.innerHTML='';`,
    geste: `gsearch('Karimsonde'); window.__vu=[...document.querySelectorAll('#gsrch-res .gr')].filter(x=>x.textContent.includes('Karimsonde')).length;`,
    mesure: `window.__vu` },
  { nom: 'Voir · « Rechercher partout » : ni le client ni le devis d’un collègue', retire: { voirTout: false },
    geste: `openSearch(); ${ATT(100)} renderSearch('Karimsonde'); window.__vu=[...document.querySelectorAll('#gsearch-res .pl-row')].filter(x=>x.textContent.includes('Karimsonde')).length;`,
    mesure: `window.__vu` },
  { nom: 'Voir · la fiche d’un client hors périmètre ne s’ouvre pas', retire: { voirTout: false }, dit: true,
    geste: `ficheClient('cK'); ${ATT(400)} const o=document.getElementById('overlay'); window.__vu=(o&&o.classList.contains('open')&&o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · la fiche de l’intervention d’un collègue ne s’ouvre pas', retire: { voirTout: false }, dit: true,
    geste: `$('content').innerHTML='<div>neutre</div>'; detailIntervention('iK'); ${ATT(800)} window.__vu=$('content').textContent.includes('Karimsonde')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · Contrats : pas le contrat d’un client hors périmètre', retire: { voirTout: false },
    geste: `go('contrats'); ${ATT(700)} window.__vu=$('content').textContent.includes('Contrat Karimsonde')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · Carte des interventions : pas celle d’un collègue', retire: { voirTout: false },
    geste: `window.__vu=intPoints('2026-10-06').filter(p=>p.id==='iK').length;`,
    mesure: `window.__vu` },
  { nom: 'Voir · Registre sanitaire : on ne choisit que ses clients', retire: { voirTout: false },
    base: `function(){ const i=db.interventions.find(x=>x.id==='iK'); if(i) i.statut='terminee'; }`,
    geste: `registreClient=''; go('registre'); ${ATT(700)} window.__vu=[...document.querySelectorAll('#content select option')].some(o=>o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · nouveau devis : la liste des clients ne montre pas un client hors périmètre', retire: { voirTout: false },
    geste: `formDoc('devis'); window.__vu=[...document.querySelectorAll('#overlay select[name=clientId] option')].some(o=>o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · nouveau contrat : idem', retire: { voirTout: false },
    geste: `formContrat(); window.__vu=[...document.querySelectorAll('#overlay select[name=clientId] option')].some(o=>o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · « Changer de client » d’une intervention : idem', retire: { voirTout: false },
    geste: `intPickClient('iT'); window.__vu=[...document.querySelectorAll('#overlay .pl-row')].some(o=>o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · un devis ne s’enregistre pas pour un client hors périmètre', retire: { voirTout: false }, dit: true,
    geste: `formDoc('devis'); const f=document.querySelector('#overlay form'); const s=f.querySelector('select[name=clientId]');
      if(![...s.options].some(o=>o.value==='cK')){ const o=document.createElement('option'); o.value='cK'; s.appendChild(o); } s.value='cK';
      f.querySelector('[name=num]').value='DV-S-HORS'; formLignes=[{designation:'Prestation sonde',qte:1,pu:5}]; saveDoc({preventDefault(){},target:f},'devis','');`,
    mesure: nb(`db.devis.filter(d=>d.num==='DV-S-HORS')`) },
  { nom: 'Voir · un produit « dans toutes les box » ne se pose que dans les box qu’on voit', retire: { voirTout: false },
    geste: `formProduit(); const f=document.querySelector('#overlay form'); f.querySelector('[name=nom]').value='Produit sonde partout';
      const a=f.querySelector('[name=allBoxes]'); if(a) a.checked=true; prodFours=['Fournisseur sonde']; saveProduit({preventDefault(){},target:f},'');`,
    mesure: `(()=>{ const p=db.produits.find(x=>x.nom==='Produit sonde partout'); const b=db.boxes.find(x=>x.id==='bK'); return !!(p&&b&&b.stock&&b.stock[p.id]); })()` },
  { nom: 'Voir · Statistiques : pas de chiffre d’affaires sans « Voir la comptabilité »', retire: { voirCompta: false },
    geste: `go('statistiques'); ${ATT(700)} window.__vu=$('content').textContent.includes('CA encaissé')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · export CSV des clients : pas un client hors du périmètre de l’équipe', type: 'unique', attendu: 'bloque',
    base: `function(){ const k=db.users.find(u=>u.id==='uK'); k.chefId='uT'; }`,
    prep: `window.__csv=null; window.csvDownload=function(n,h,rows){ window.__csv=rows; };`,
    geste: `exportClientsCsv(); window.__vu=(window.__csv||[]).filter(r=>String(r[0]).includes('Zoésonde')).length;`,
    mesure: `window.__vu` },
  { nom: '   contre-épreuve : le même export porte le client de l’équipe', type: 'unique', attendu: 'passe',
    base: `function(){ const k=db.users.find(u=>u.id==='uK'); k.chefId='uT'; }`,
    prep: `window.__csv=null; window.csvDownload=function(n,h,rows){ window.__csv=rows; };`,
    geste: `exportClientsCsv(); window.__vu=(window.__csv||[]).filter(r=>String(r[0]).includes('Karimsonde')).length;`,
    mesure: `window.__vu` },

  /* ═════ VENTES ═════ */
  { nom: 'Ventes → Modifier : « 📧 » n’envoie pas un devis et ne change pas son statut', retire: { cat_ventes_modifier: false }, dit: true,
    geste: `envoiDoc('devis','dT','mail'); ${ATT(900)}`,
    mesure: `[db.devis.find(d=>d.id==='dT').statut, window.__mails]` },
  { nom: 'Ventes → Modifier : « Payée » ne change pas la facture', retire: { cat_ventes_modifier: false }, dit: true,
    geste: `factSetStatut('fT','payee');`,
    mesure: `db.factures.find(f=>f.id==='fT').statut` },
  { nom: 'Ventes → Modifier : « 📧 Envoyer » une facture', retire: { cat_ventes_modifier: false }, dit: true,
    geste: `factEnvoyer('fT'); ${ATT(900)}`,
    mesure: `[db.factures.find(f=>f.id==='fT').statut, window.__mails]` },
  { nom: 'Ventes → Ajouter : « → 🧾 » ne crée pas de facture', retire: { cat_ventes_ajouter: false }, dit: true,
    geste: `devisToFacture('dA');`,
    mesure: nb(`db.factures.filter(f=>f.devisId==='dA')`) },
  { nom: 'Ventes → Ajouter : « Facturer cette intervention » ne crée rien', retire: { cat_ventes_ajouter: false }, dit: true,
    geste: `intGenererDoc('iTf','factures');`,
    mesure: nb(`db.factures.filter(f=>f.interventionId==='iTf')`) },
  { nom: 'Devis IA : l’Assistant devis ne crée pas de devis', retire: { devisIA: false },
    prep: `localStorage.setItem(AD_CODE_KEY,'code-sonde'); adFil=[]; adBusy=false; window.__f0=window.__f0||window.fetch;
      window.fetch=async(u,o)=>{ if(String(u).includes('/api/devis/agent')) return new Response(JSON.stringify({reply:'Voilà',devis:{clientNom:'Pharmacie Tomsonde',lignes:[{designation:'Prestation sonde',qte:1,pu_ht:10}],objet:'Essai sonde IA'}}),{status:200,headers:{'Content-Type':'application/json'}}); return window.__f0(u,o); };`,
    geste: `go('assistantDevis'); ${ATT(600)} const i=document.getElementById('ad-input'); if(i) i.value='Dératisation sonde'; await adEnvoyer();`,
    mesure: nb(`db.devis.filter(d=>/Essai sonde IA/.test(d.notes||''))`) },
  { nom: 'Ventes → Ajouter : l’Assistant devis ne crée pas de devis non plus', retire: { cat_ventes_ajouter: false }, dit: true,
    prep: `localStorage.setItem(AD_CODE_KEY,'code-sonde'); adFil=[]; adBusy=false; window.__f0=window.__f0||window.fetch;
      window.fetch=async(u,o)=>{ if(String(u).includes('/api/devis/agent')) return new Response(JSON.stringify({reply:'Voilà',devis:{clientNom:'Pharmacie Tomsonde',lignes:[{designation:'Prestation sonde',qte:1,pu_ht:10}],objet:'Essai sonde IA'}}),{status:200,headers:{'Content-Type':'application/json'}}); return window.__f0(u,o); };`,
    geste: `go('assistantDevis'); ${ATT(600)} const i=document.getElementById('ad-input'); if(i) i.value='Dératisation sonde'; await adEnvoyer();`,
    mesure: nb(`db.devis.filter(d=>/Essai sonde IA/.test(d.notes||''))`) },
  { nom: 'Ventes → Ajouter : « Devis xylophage » ne crée ni devis ni client', retire: { cat_ventes_ajouter: false }, dit: true,
    geste: `await aiGenDevisXylo({preventDefault(){},target:__form('<input name="cliNom" value="Xylo Tomsonde"><input name="ouvrage" value="Charpente"><input name="nuis" value="Capricornes"><input name="trait" value="Injection"><input name="surface" value="40"><input name="infest" value="Moyen">')});`,
    mesure: `[${nb(`db.devis.filter(d=>d.xylo&&clientName(d.clientId)==='Xylo Tomsonde')`)}, ${nb(`db.clients.filter(c=>c.nom==='Xylo Tomsonde')`)}]` },
  { nom: 'Interventions → Ajouter : « 🔁 » d’un contrat ne planifie rien', retire: { cat_int_ajouter: false }, dit: true,
    geste: `genererInterventionContrat('ctT');`,
    mesure: nb(`db.interventions.filter(i=>i.contratId==='ctT')`) },
  { nom: 'Clients → Modifier : enregistrer un devis ne réécrit pas le téléphone du client', retire: { cat_crm_modifier: false },
    geste: `formDoc('devis','dT'); ${ATT(150)} const t=document.getElementById('doc-cli-tel'); if(t) t.value='0699999999'; const f=document.querySelector('#overlay form'); saveDoc({preventDefault(){},target:f},'devis','dT');`,
    mesure: `db.clients.find(c=>c.id==='cT').tel` },
  { nom: 'Clients → Ajouter : une intervention ne crée pas un client inconnu', retire: { cat_crm_ajouter: false }, dit: true,
    geste: `formIntervention(); ${ATT(200)} const f=document.querySelector('#overlay form'); const t=f.querySelector('[name=titre]'); if(t) t.value='Passage sonde';
      const c=document.getElementById('cli-search'); if(c) c.value='Nouveau client sonde'; const cid=f.querySelector('[name=clientId]'); if(cid) cid.value='';
      saveIntervention({preventDefault(){},target:f},'');`,
    mesure: nb(`db.clients.filter(c=>c.nom==='Nouveau client sonde')`) },

  /* ═════ INTERVENTIONS ═════ */
  { nom: 'Interventions → Modifier : le ✎ de la fiche ne change pas la date', retire: { cat_int_modifier: false }, dit: true,
    geste: `intEditField('iT','date','2026-11-11');`,
    mesure: `db.interventions.find(i=>i.id==='iT').date` },
  { nom: 'Interventions → Modifier : « Changer de client »', retire: { cat_int_modifier: false }, dit: true,
    geste: `intSetClient('iT','cT2');`,
    mesure: `db.interventions.find(i=>i.id==='iT').clientId` },
  { nom: 'Interventions → Modifier : « Ajouter une demande client »', retire: { cat_int_modifier: false }, dit: true,
    prep: `intAddDemande('iT'); const x=document.getElementById('dem-inp'); if(x) x.value='Traiter aussi la cave';`,
    geste: `intPushDemande('iT');`,
    mesure: `db.interventions.find(i=>i.id==='iT').desc` },
  { nom: 'Interventions → Modifier : le menu de statut ne repasse pas l’intervention d’un collègue « à planifier »', retire: { cat_int_modifier: false }, dit: true,
    geste: `intSetStatut('iK','aplanifier');`,
    mesure: `db.interventions.find(i=>i.id==='iK').statut` },
  { nom: 'Travail de terrain : sans « Modifier », on démarre quand même SA propre intervention', type: 'ouvert', retire: { cat_int_modifier: false },
    geste: `intSetStatut('iT','encours');`,
    mesure: `db.interventions.find(i=>i.id==='iT').statut` },
  { nom: 'Travail de terrain : les champs du rapport restent ouverts (matériel utilisé)', type: 'ouvert', retire: { cat_int_modifier: false },
    geste: `intEditField('iT','materiel','2 pièges');`,
    mesure: `db.interventions.find(i=>i.id==='iT').materiel||''` },
  { nom: 'Interventions → Ajouter : « Dupliquer l’intervention »', retire: { cat_int_ajouter: false }, dit: true,
    geste: `dupliquerIntervention('iT');`,
    mesure: nb(`db.interventions.filter(i=>i.titre==='Dératisation Tomsonde')`) },
  { nom: 'Interventions → Ajouter : « Créer le prochain passage »', retire: { cat_int_ajouter: false }, dit: true,
    geste: `creerProchainPassage('iT');`,
    mesure: nb(`db.interventions.filter(i=>i.titre==='Dératisation Tomsonde')`) },
  { nom: 'Interventions → Ajouter : Alt+glisser au Planning ne duplique pas', retire: { cat_int_ajouter: false }, dit: true,
    geste: `planDup(db.interventions.find(i=>i.id==='iT'),{date:'2026-10-07'});`,
    mesure: nb(`db.interventions.filter(i=>i.titre==='Dératisation Tomsonde')`) },
  { nom: 'Interventions → Supprimer : la case de la catégorie ferme la suppression', retire: { cat_int_supprimer: false }, dit: true,
    geste: `delIntDo('iT');`,
    mesure: nb(`db.interventions.filter(i=>i.id==='iT')`) },
  { nom: 'Interventions → Supprimer : la case de la catégorie suffit, sans « Supprimer des éléments »', type: 'ouvert', retire: { supprimer: false },
    geste: `delIntDo('iT');`,
    mesure: nb(`db.interventions.filter(i=>i.id==='iT')`) },
  { nom: 'Déplacer le planning : « Ma journée » ne déplace pas une intervention', retire: { planifDeplacer: false }, dit: true,
    geste: `intDropDay({preventDefault(){},dataTransfer:{getData:()=>'iT'}},'2026-12-01');`,
    mesure: `db.interventions.find(i=>i.id==='iT').date` },

  /* ═════ PLANIFICATION ═════ */
  { nom: 'Planification → Supprimer : 🗑 d’une tâche', retire: { cat_plan_supprimer: false }, dit: true,
    geste: `delTache('tkT');`, mesure: nb(`db.taches.filter(t=>t.id==='tkT')`) },
  { nom: 'Planification → Supprimer : la case de la catégorie suffit pour une tâche', type: 'ouvert', retire: { supprimer: false },
    geste: `delTache('tkT');`, mesure: nb(`db.taches.filter(t=>t.id==='tkT')`) },
  { nom: 'Planification → Modifier : cocher la tâche d’un collègue', retire: { cat_plan_modifier: false }, dit: true,
    geste: `tacheToggle('tkK');`, mesure: `!!db.taches.find(t=>t.id==='tkK').fait` },
  { nom: 'Travail de terrain : sans « Modifier », on coche SA propre tâche', type: 'ouvert', retire: { cat_plan_modifier: false },
    geste: `tacheToggle('tkT');`, mesure: `!!db.taches.find(t=>t.id==='tkT').fait` },
  { nom: 'Planification → Supprimer : l’absence d’un collègue', retire: { cat_plan_supprimer: false }, dit: true,
    geste: `delAbsence('abK');`, mesure: nb(`db.absences.filter(a=>a.id==='abK')`) },

  /* ═════ STOCK ═════ */
  { nom: 'Stock → Modifier : « ＋ Ajouter un encaissement » sur une enveloppe', retire: { cat_stock_modifier: false }, dit: true,
    geste: `savePaiement({preventDefault(){},target:__form('<input name="mode" value="Espèces"><input name="montant" value="12"><input name="date" value="2026-10-06"><input name="reference" value=""><input name="statut" value="encaisse">')},'envS');`,
    mesure: nb(`db.enveloppes.find(e=>e.id==='envS').paiements`) },
  { nom: 'Stock → Modifier : ✕ d’un encaissement', retire: { cat_stock_modifier: false }, dit: true,
    geste: `delPaiement('envS','pS1');`,
    mesure: nb(`db.enveloppes.find(e=>e.id==='envS').paiements`) },
  { nom: 'Stock → Modifier : « Tout fusionner » les produits en double', retire: { cat_stock_modifier: false }, dit: true,
    geste: `produitsFusionnerDoublonsUI('');`,
    mesure: nb(`db.produits.filter(p=>p.nom==='Essai sonde doublon')`) },
  { nom: 'Stock → Modifier : « C’est normal, deux produits »', retire: { cat_stock_modifier: false }, dit: true,
    prep: `_doublonsPlusTard=false; produitsDoublonsBandeau(); window.__i=_doublonsTri.findIndex(l=>l.some(p=>p.id==='pd1'));`,
    geste: `produitsDistinctsDeclarerUI(window.__i);`,
    mesure: `(db.produitsDistincts||[]).some(d=>(d.ids||[]).includes('pd1'))` },
  { nom: 'Stock → Modifier : poser un produit dans la box (panneau « Produits »)', retire: { cat_stock_modifier: false }, dit: true,
    prep: `boxView='bT'; try{ openBoxProduits(); }catch(e){} abpSel=new Set(['pX']); bxpCiblesSel=new Set(['bT']); bxpFourSel=new Set();`,
    geste: `addBoxProd();`,
    mesure: `!!((db.boxes.find(b=>b.id==='bT')||{}).stock||{}).pX` },
  { nom: 'Stock → Modifier : « Retirer » une fiche à zéro de la box', retire: { cat_stock_modifier: false }, dit: true,
    prep: `boxView='bT'; bxpRetSel=new Set(['pZ']);`,
    geste: `boxRetirerCoches();`,
    mesure: `'pZ' in ((db.boxes.find(b=>b.id==='bT')||{}).stock||{})` },
  { nom: 'Stock → Supprimer : ✕ d’un arrivage', retire: { cat_stock_supprimer: false }, dit: true,
    prep: `boxView='bT';`,
    geste: `delArrivage('bT','aS');`,
    mesure: nb(`(db.boxes.find(b=>b.id==='bT').arrivages||[])`) },
  { nom: 'Gérer les box : « Modifier la box » (✎) n’enregistre rien', retire: { gererBoxes: false }, dit: true,
    geste: `formBox('bT'); ${ATT(200)} const f=document.querySelector('#overlay form[onsubmit^="saveBox"]');
      if(f){ f.querySelector('[name=nom]').value='Box renommée sonde'; saveBox({preventDefault(){},target:f},'bT'); }
      else saveBox({preventDefault(){},target:__form('<input name="nom" value="Box renommée sonde">')},'bT');`,
    mesure: `db.boxes.find(b=>b.id==='bT').nom` },

  /* ═════ VALIDATION DR ═════ */
  { nom: 'Validation DR : « Consommation → Saisie » ne touche pas le stock sans l’accord du DR', retire: { validerDR: false },
    base: `function(){ db.validDRTous=true; }`,
    geste: `consoBox='bT'; consoAdj('pS',-1);`,
    mesure: `db.boxes.find(b=>b.id==='bT').stock.pS.u` },
  { nom: '   … et la sortie part bien dans la liste à envoyer au DR', type: 'unique', attendu: 'passe', retire: { validerDR: false },
    base: `function(){ db.validDRTous=true; }`,
    geste: `consoBox='bT'; consoAdj('pS',-1);`,
    mesure: `JSON.stringify(((db.boxMvtAttente||[]).find(m=>m.boxId==='bT'&&m.parId==='uT')||{}).lignes||[])` },
  { nom: 'Validation DR : « Consommation → Saisie » ne touche pas une box qu’on ne voit pas', retire: { voirTout: false },
    geste: `consoBox='bK'; consoAdj('pS',-1);`,
    mesure: `db.boxes.find(b=>b.id==='bK').stock.pS.u` },
  { nom: 'Validation DR : « Modifier la box » (quantité retapée) ne touche pas le stock sans l’accord du DR', retire: { validerDR: false },
    base: `function(){ db.validDRTous=true; }`,
    geste: `formBox('bT'); ${ATT(200)} const f=document.querySelector('#overlay form[onsubmit^="saveBox"]');
      boxFormStock.pS=Object.assign({},boxFormStock.pS,{u:1}); saveBox({preventDefault(){},target:f},'bT');`,
    mesure: `db.boxes.find(b=>b.id==='bT').stock.pS.u` },
  { nom: '   … et la correction part au DR', type: 'unique', attendu: 'passe', retire: { validerDR: false },
    base: `function(){ db.validDRTous=true; }`,
    geste: `formBox('bT'); ${ATT(200)} const f=document.querySelector('#overlay form[onsubmit^="saveBox"]');
      boxFormStock.pS=Object.assign({},boxFormStock.pS,{u:1}); saveBox({preventDefault(){},target:f},'bT');`,
    mesure: nb(`(db.boxMvtAttente||[]).filter(m=>m.boxId==='bT'&&m.statut==='enAttente')`) },
  { nom: '   sans validation DR, la correction s’écrit ET se trace', type: 'unique', attendu: 'passe',
    geste: `formBox('bT'); ${ATT(200)} const f=document.querySelector('#overlay form[onsubmit^="saveBox"]');
      boxFormStock.pS=Object.assign({},boxFormStock.pS,{u:1}); saveBox({preventDefault(){},target:f},'bT');`,
    mesure: nb(`(db.mouvements||[]).filter(m=>m.boxId==='bT'&&m.produitId==='pS')`) },
  { nom: 'Validation DR : un valideur ne valide pas un mouvement hors de son périmètre', type: 'unique', attendu: 'bloque', dit: true,
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; ${MVT('mZ', 'uZ')} }`,
    geste: `boxMvtValider('mZ','valide');`,
    mesure: `(db.boxMvtAttente.find(m=>m.id==='mZ')||{}).statut` },
  { nom: '   contre-épreuve : il valide celui de son périmètre', type: 'unique', attendu: 'passe',
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; ${MVT('mK', 'uK')} }`,
    geste: `boxMvtValider('mK','valide');`,
    mesure: `(db.boxMvtAttente.find(m=>m.id==='mK')||{}).statut` },
  { nom: 'Validation DR : un valideur peut solder SA demande de mouvement d’avant (il bouge le stock en direct de toute façon)', type: 'unique', attendu: 'passe',
    base: `function(){ ${MVT('mT', 'uT')} }`,
    geste: `boxMvtValider('mT','valide');`,
    mesure: `(db.boxMvtAttente.find(m=>m.id==='mT')||{}).statut` },
  { nom: 'Validation DR : une demande de commande hors périmètre ne se valide pas', type: 'unique', attendu: 'bloque', dit: true,
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; ${DEM('dmZ', 'uZ')} }`,
    geste: `validerDemande('dmZ','valide');`,
    mesure: `(db.demandes.find(d=>d.id==='dmZ')||{}).statut` },
  { nom: '   contre-épreuve : celle de son périmètre se valide', type: 'unique', attendu: 'passe',
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; ${DEM('dmK', 'uK')} }`,
    geste: `validerDemande('dmK','valide');`,
    mesure: `(db.demandes.find(d=>d.id==='dmK')||{}).statut` },
  { nom: 'Validation DR : un DR valide SA demande de commande (circuit normal : elle part toujours en attente)', type: 'unique', attendu: 'passe',
    base: `function(){ ${DEM('dmT', 'uT')} }`,
    geste: `validerDemande('dmT','valide');`,
    mesure: `(db.demandes.find(d=>d.id==='dmT')||{}).statut` },

  /* ═════ COMMUNICATION / ÉQUIPE / PARAMÈTRES ═════ */
  { nom: 'Communication → Modifier : ✎ du fournisseur depuis un bon', retire: { cat_com_modifier: false }, dit: true,
    geste: `_fourQuickEdit('fS',null); const n=document.getElementById('fq-nom'); if(n) n.value='Fournisseur renommé sonde'; fourQuickSave('fS');`,
    mesure: `db.fournisseurs.find(f=>f.id==='fS').nom` },
  { nom: 'Créer des utilisateurs : « ＋ Technicien » en Chef d’équipe ne donne pas « Tout voir » à qui ne l’a pas', retire: { voirTout: false },
    geste: `formTech(); ${ATT(200)} const f=document.querySelector('#overlay form[onsubmit^="saveTech"]'); f.querySelector('[name=nom]').value='Chef Sondetest';
      f.querySelector('[name=metier]').value="Chef d'équipe"; await saveTech({preventDefault(){},target:f},''); ${ATT(300)}`,
    mesure: `(()=>{ const u=db.users.find(x=>/Sondetest/.test((x.prenom||'')+' '+(x.nom||''))); return u?(userCap(u,'voirTout')?'donné':'retenu'):'absent'; })()`,
    /* ici « bouger » veut dire « le compte a été créé » : on lit CE qu'il a reçu */
    sansOk: `r.apres==='"retenu"'`, avecOk: `r.apres==='"donné"'` },
  { nom: 'Paramètres : un non-administrateur n’importe pas une base', type: 'unique', attendu: 'bloque',
    geste: `const x=JSON.parse(JSON.stringify(db)); x.clients=(x.clients||[]).concat([{id:'cImp',nom:'Client importé sonde'}]);
      importData({target:{files:[new File([JSON.stringify(x)],'x.json',{type:'application/json'})]}}); ${ATT(700)}`,
    mesure: `db.clients.some(c=>c.id==='cImp')` },
  { nom: '   contre-épreuve : l’administrateur importe', type: 'unique', attendu: 'passe', qui: 'uA',
    geste: `const x=JSON.parse(JSON.stringify(db)); x.clients=(x.clients||[]).concat([{id:'cImp',nom:'Client importé sonde'}]);
      importData({target:{files:[new File([JSON.stringify(x)],'x.json',{type:'application/json'})]}}); ${ATT(700)}`,
    mesure: `db.clients.some(c=>c.id==='cImp')` },
  { nom: 'Paramètres : un non-administrateur n’exporte pas toute la base', type: 'unique', attendu: 'bloque',
    geste: `exportData();`, mesure: `window.__blob` },
  { nom: 'Paramètres : la carte « Exporter · Importer · Copies » n’est pas proposée à un non-administrateur', type: 'unique', attendu: 'bloque',
    geste: `go('parametres'); ${ATT(700)} window.__vu=document.querySelector('#content [onclick^="exportData"]')?1:0;`,
    mesure: `window.__vu` },
  { nom: '   contre-épreuve : l’administrateur la voit', type: 'unique', attendu: 'passe', qui: 'uA',
    geste: `go('parametres'); ${ATT(700)} window.__vu=document.querySelector('#content [onclick^="exportData"]')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Paramètres : un non-administrateur ne change pas l’expéditeur des e-mails de l’entreprise', type: 'unique', attendu: 'bloque',
    geste: `go('parametres'); ${ATT(700)} const x=document.getElementById('ms-from'); if(x) x.value='Expéditeur sonde'; mailSimpleSave();`,
    mesure: `db.mailFrom||''` },
  { nom: '   contre-épreuve : l’administrateur le change', type: 'unique', attendu: 'passe', qui: 'uA',
    geste: `go('parametres'); ${ATT(700)} const x=document.getElementById('ms-from'); if(x) x.value='Expéditeur sonde'; mailSimpleSave();`,
    mesure: `db.mailFrom||''` },
  { nom: 'Paramètres : un non-administrateur n’allume pas la validation DR pour toute l’entreprise', type: 'unique', attendu: 'bloque',
    geste: `validDRTousSet(true);`, mesure: `!!db.validDRTous` },

  /* ═════ relecture de la v738 — OUVRIR n'est pas LISTER (ouvrables()) ═════
     La garde neuve de la fiche intervention rendait morts des clics voulus ; les notifications
     nommaient ce que l'écran ne montre pas ; deux boutons ne lisaient pas la case de leur fonction. */
  { nom: 'Voir · l’historique d’un site qu’on sert s’ouvre EN ENTIER (le passage d’un collègue chez son client)', type: 'unique', attendu: 'passe', retire: { voirTout: false },
    base: `function(){ db.interventions.push(Object.assign({},db.interventions.find(x=>x.id==='iK'),{id:'iKT',num:'INT-S6',titre:'Passage collègue Tomsonde',clientId:'cT'})); }`,
    geste: `$('content').innerHTML='<div>neutre</div>'; detailIntervention('iKT'); for(let k=0;k<30&&!$('content').textContent.includes('Passage collègue');k++) await __attendre(100); window.__vu=$('content').textContent.includes('Passage collègue')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · le lien « Client » de SA box ouvre la fiche, même d’un client qu’on ne sert pas', type: 'unique', attendu: 'passe', retire: { voirTout: false },
    base: `function(){ db.boxes.find(b=>b.id==='bT').clientId='cK'; }`,
    geste: `ficheClient('cK'); ${ATT(400)} const o=document.getElementById('overlay'); window.__vu=(o&&o.classList.contains('open')&&o.textContent.includes('Karimsonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Voir · … mais pas par la box d’un AUTRE', type: 'unique', attendu: 'bloque', retire: { voirTout: false }, dit: true,
    base: `function(){ db.boxes.find(b=>b.id==='bK').clientId='cZ'; }`,
    geste: `ficheClient('cZ'); ${ATT(400)} const o=document.getElementById('overlay'); window.__vu=(o&&o.classList.contains('open')&&o.textContent.includes('Zoésonde'))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Notifications · un DR à périmètre ne reçoit rien d’une autre équipe (secteur non couvert, travail terminé, mouvement et demande à valider)', type: 'unique', attendu: 'bloque',
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; ${NOTIF_Z} }`,
    geste: `const ids=computeNotifs().map(n=>n.id); window.__vu=['sect:iZ','done:iZ2','mvatt:mZ','dem:dmZ'].filter(x=>ids.includes(x)).length;`,
    mesure: `window.__vu` },
  { nom: '   contre-épreuve : sans équipe rattachée, les quatre arrivent', type: 'unique', attendu: 'passe',
    base: `function(){ ${NOTIF_Z} }`,
    geste: `const ids=computeNotifs().map(n=>n.id); window.__vu=['sect:iZ','done:iZ2','mvatt:mZ','dem:dmZ'].every(x=>ids.includes(x))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Contrats : sans « Interventions → Ajouter », le 🔁 n’est pas proposé', retire: { cat_int_ajouter: false },
    geste: `go('contrats'); ${ATT(700)} window.__vu=[...document.querySelectorAll('#content button')].some(b=>(b.getAttribute('onclick')||'').includes('genererInterventionContrat('))?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Contrats : sans « Ventes → Ajouter », « ＋ Contrat » n’est pas proposé', retire: { cat_ventes_ajouter: false },
    geste: `go('contrats'); ${ATT(700)} window.__vu=[...document.querySelectorAll('button')].some(b=>(b.getAttribute('onclick')||'')==='formContrat()')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Box : sans « Stock → Supprimer », le 🗑 n’est pas proposé (delItem le refuserait)', retire: { cat_stock_supprimer: false },
    geste: `openBox('bT'); for(let k=0;k<30&&!$('content').textContent.includes('BX-S-T');k++) await __attendre(100); ${ATT(200)} window.__vu=$('content').textContent.includes('BX-S-T')&&[...document.querySelectorAll('button')].some(b=>(b.getAttribute('onclick')||'').includes("delItem('boxes'"))?1:0;`,
    mesure: `window.__vu` },
  { nom: '   … et sans « Gérer les box », il reste là : deux cases, deux boutons', type: 'unique', attendu: 'passe', retire: { gererBoxes: false },
    geste: `openBox('bT'); for(let k=0;k<30&&!$('content').textContent.includes('BX-S-T');k++) await __attendre(100); ${ATT(200)} window.__vu=$('content').textContent.includes('BX-S-T')&&[...document.querySelectorAll('button')].some(b=>(b.getAttribute('onclick')||'').includes("delItem('boxes'"))?1:0;`,
    mesure: `window.__vu` },

  /* ═════ v739 — les décisions de Justin (23 septembre, tard le soir) ═════ */
  { nom: 'Case « Effacer les prix pré-remplis » : sans elle, aucun prix ne s’efface', retire: { effacerPrix: false }, dit: true,
    geste: `prixEffacer();`, mesure: nb(`db.produits.filter(p=>/sonde/i.test(p.nom||'')&&+p.prix>0)`) },
  { nom: 'Case « Supprimer une demande de l’historique »', retire: { supprimerHistoDemandes: false }, dit: true,
    base: `function(){ ${DEM('dmT', 'uT')} db.demandes.find(d=>d.id==='dmT').statut='valide'; }`,
    geste: `demHistoSuppr('dmT');`, mesure: nb(`db.demandes.filter(d=>d.id==='dmT')`) },
  { nom: 'Case « Supprimer une commande de l’historique d’une box »', retire: { supprimerHistoCommandes: false }, dit: true,
    base: `function(){ db.bons=(db.bons||[]).filter(b=>b.id!=='bcS'); db.bons.push({id:'bcS',num:'BC-S',boxId:'bT',statut:'livree',lignes:[],date:'2026-10-06'}); }`,
    geste: `boxCmdSuppr('bcS','bT');`, mesure: nb(`(db.bons||[]).filter(b=>b.id==='bcS')`) },
  { nom: 'Case « Revenir sur les “c’est normal” (doublons) »', retire: { revoirDistincts: false }, dit: true,
    base: `function(){ db.produitsDistincts=(db.produitsDistincts||[]).concat([{id:'dsS',ids:['pd1','pd2'],nom:'Essai sonde doublon'}]); }`,
    geste: `produitsDistinctsRevoir();`, mesure: nb(`(db.produitsDistincts||[]).filter(d=>(d.ids||[]).includes('pd1'))`) },
  { nom: 'Plans d’appâtage : un technicien SANS réglage personnel peut modifier le plan (profil par défaut)', type: 'unique', attendu: 'passe', qui: 'uK',
    geste: `window.__vu=can('modifierPlans')?1:0;`, mesure: `window.__vu` },
  { nom: 'Intervention SANS technicien : un DR rattaché à une équipe la trouve (recherche) pour l’affecter', retire: { planifDeplacer: false },
    base: `function(){ db.users.find(u=>u.id==='uK').drId='uT'; db.interventions.push(Object.assign({},db.interventions.find(x=>x.id==='iZ'),{id:'iL',num:'INT-S8',titre:'Dératisation Affectersonde',techId:'',techIds:[]})); }`,
    geste: `openSearch(); ${ATT(100)} renderSearch('Affectersonde'); window.__vu=[...document.querySelectorAll('#gsearch-res .pl-row')].filter(x=>x.textContent.includes('Affectersonde')).length;`,
    mesure: `window.__vu` },
  { nom: 'Historique : un COMMERCIAL (profil par défaut) lit le compte-rendu du premier technicien', type: 'unique', attendu: 'passe', qui: 'uC',
    base: `function(){ ${HISTO_BASE('uC', 'commercial', 'Chloé')} }`,
    geste: `$('content').innerHTML='<div>neutre</div>'; detailIntervention('iTf'); for(let k=0;k<30&&!$('content').textContent.includes('Rapport sonde du premier passage');k++) await __attendre(100); window.__vu=$('content').textContent.includes('Rapport sonde du premier passage')?1:0;`,
    mesure: `window.__vu` },
  { nom: 'Historique : un DR (profil par défaut) aussi', type: 'unique', attendu: 'passe', qui: 'uD',
    base: `function(){ ${HISTO_BASE('uD', 'dr', 'Dora')} }`,
    geste: `$('content').innerHTML='<div>neutre</div>'; detailIntervention('iTf'); for(let k=0;k<30&&!$('content').textContent.includes('Rapport sonde du premier passage');k++) await __attendre(100); window.__vu=$('content').textContent.includes('Rapport sonde du premier passage')?1:0;`,
    mesure: `window.__vu` },
];

module.exports = { SOCLE, ESSAIS };
