/* ══ CATÉGORIES RETIRÉES — CE QUE VOIT LA PERSONNE (v728) ═══════════════════════════════
   Justin, 23 septembre 2026 : « si tu vois des catégories qui sont pas utiles, je t'autorise
   de les supprimer ». Retirés : « Audit » (le même écran qu'Historique) et « Droits par rôle »
   (plus rien n'y menait depuis la v585). Et deux enregistrements qui affichaient une liste
   ORPHELINE en travers de l'écran courant (un don de produit, un chantier).

   On mesure, au navigateur, ce qu'un banc ne peut pas voir :
   1. le menu ne porte plus « Audit » ; « Historique » est là ;
   2. un ancien lien (`go('audit')`, `#v=permissions`) mène à l'écran qui remplace, pas au
      tableau de bord ;
   3. « Donner produit » depuis la fiche d'un véhicule : on reste sur Véhicules, et le don
      est écrit dans Mouvements ;
   4. modifier un chantier depuis sa fiche : on reste où l'on était ;
   5. aucune erreur JavaScript.
   Chaque contrôle prouve d'abord sa population (un véhicule, un produit, un chantier).
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                   */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

(async () => {
  /* SOURCE=<fichier> : la contre-épreuve, sur la page d'AVANT (elle doit tomber) */
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : undefined);
  console.log('  page mesurée : ' + S.version + (process.env.SOURCE ? ' (contre-épreuve : ' + path.basename(process.env.SOURCE) + ')' : ''));
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`window.confirm=()=>false; try{ localStorage.setItem('elanB_aside','1'); renderNav(); }catch(e){} return 1;`);
  const attendre = async () => { await dormir(250); for (let i = 0; i < 30; i++) { if (await S.ev(`return !document.querySelector('.content.entre');`)) break; await dormir(100); } await dormir(300); };
  const nErr0 = S.exceptions.length;

  /* 1 — le menu */
  const menu = await S.ev(`return [...document.querySelectorAll('#sidebar .nav-item')].map(e=>(e.textContent||'').trim().replace(/\\s+/g,' '));`);
  vrai('population : le menu est rendu (' + menu.length + ' entrées)', menu.length >= 25, menu.length);
  /* chaque entrée porte son émoji devant le libellé : on compare le libellé seul */
  const libelles = menu.map(t => t.replace(/^[^A-Za-zÀ-ÿ]+/, ''));
  vrai('« Audit » n’est plus au menu', !libelles.some(t => /^Audit\b/.test(t)), libelles.filter(t => /Audit/.test(t)));
  vrai('« Historique » y est toujours', libelles.some(t => /^Historique\b/.test(t)), libelles.slice(0, 6));

  /* 2 — les anciens liens */
  await S.ev(`go('audit'); return 1;`); await attendre();
  let e = await S.ev(`return {cur:current, titre:(document.querySelector('#page-head .ph-title, #page-head h1')||{}).textContent||'', lignes:document.querySelectorAll('#content .tl-item').length};`);
  vrai('go(« audit ») mène à Historique, pas au tableau de bord', e.cur === 'historique' && /Historique/.test(e.titre), e);
  vrai('… et le journal s’y affiche (population : ' + e.lignes + ' évènements)', e.lignes > 0, e.lignes);
  await S.ev(`go('permissions'); return 1;`); await attendre();
  e = await S.ev(`return {cur:current, titre:(document.querySelector('#page-head .ph-title, #page-head h1')||{}).textContent||''};`);
  vrai('go(« permissions ») mène à Utilisateurs (là où se règlent les droits)', e.cur === 'utilisateurs', e);
  vrai('un nom inconnu retombe toujours sur le tableau de bord', await S.ev(`go('nexistepas'); return current==='dashboard';`));
  await attendre();

  /* 3 — « Donner produit » depuis la fiche d'un véhicule, par de VRAIS clics */
  /* la bêta de démonstration n'a pas de véhicule : on en ajoute UN, comme le ferait « ＋ Véhicule » */
  await S.ev(`db.vehicules=db.vehicules||[]; if(!db.vehicules.length){ db.vehicules.push({id:'v_sonde',plaque:'AB-123-CD',immat:'AB-123-CD',marque:'Renault',modele:'Kangoo',statut:'service'}); save(); } go('vehicules'); return 1;`); await attendre();
  const nVeh = await S.ev(`return document.querySelectorAll('#content .pl-row').length;`);
  vrai('population : des véhicules à l’écran (' + nVeh + ')', nVeh > 0, nVeh);
  if (nVeh) {
    await S.ev(`document.querySelector('#content .pl-row').click(); return 1;`); await dormir(600);
    const aDon = await S.ev(`const b=[...document.querySelectorAll('#modal button')].find(x=>/Donner produit/.test(x.textContent)); if(b){ b.click(); return true; } return false;`);
    vrai('la fiche du véhicule porte « Donner produit »', aDon);
    await dormir(500);
    const avant = await S.ev(`return (db.mouvements||[]).length;`);
    const rempli = await S.ev(`const f=document.getElementById('pdform'); if(!f) return 'formulaire absent';
      const sel=f.querySelector('select[name=produitNom]'); if(!sel||sel.options.length<2) return 'aucun produit';
      sel.selectedIndex=1; f.querySelector('input[name=quantite]').value='1';
      const b=document.querySelector('#modal button[type=submit][form=pdform]'); if(!b) return 'bouton absent'; b.click(); return 'ok';`);
    vrai('le formulaire du don se remplit et s’envoie par son bouton', rempli === 'ok', rempli);
    await attendre();
    e = await S.ev(`return {cur:current, titre:(document.querySelector('#page-head .ph-title, #page-head h1')||{}).textContent||'',
      contenu:(document.getElementById('content').textContent||'').slice(0,4000), ov:document.getElementById('overlay').classList.contains('open'),
      mvt:(db.mouvements||[]).length, dernier:((db.mouvements||[])[0]||{}).motif||''};`);
    vrai('après le don, on est toujours sur Véhicules', e.cur === 'vehicules' && /V[ée]hicule/.test(e.titre), { cur: e.cur, titre: e.titre });
    vrai('… et la liste orpheline « Produits remis aux clients » n’est PAS posée dans l’écran', !/Produits remis aux clients|Aucun produit donné/.test(e.contenu));
    vrai('… la fenêtre est refermée', !e.ov);
    vrai('le don est écrit dans Mouvements (motif « Produit donné »)', e.mvt === avant + 1 && /Produit donné/.test(e.dernier), { avant, apres: e.mvt, motif: e.dernier });
  }

  /* 4 — un chantier existant, modifié depuis sa fiche (la recherche y mène) */
  await S.ev(`db.chantiers=db.chantiers||[]; if(!db.chantiers.length){ db.chantiers.push({id:'ch_sonde',nom:'Chantier de la sonde',statut:'encours'}); save(); } go('interventions'); return 1;`);
  await attendre();
  const idCh = await S.ev(`return db.chantiers[0].id;`);
  await S.ev(`detailChantier('${idCh}'); return 1;`); await dormir(500);
  const aModif = await S.ev(`const b=[...document.querySelectorAll('#modal button')].find(x=>/^Modifier$/.test(x.textContent.trim())); if(b){ b.click(); return true; } return false;`);
  vrai('la fiche d’un chantier porte « Modifier »', aModif);
  await dormir(500);
  const envoye = await S.ev(`const f=document.querySelector('#modal form'); if(!f) return false; const n=f.querySelector('input[name=nom]'); n.value='Chantier de la sonde (modifié)';
    const b=f.querySelector('button[type=submit]'); b.click(); return true;`);
  vrai('le formulaire du chantier s’envoie', envoye);
  await attendre();
  e = await S.ev(`return {cur:current, titre:(document.querySelector('#page-head .ph-title, #page-head h1')||{}).textContent||'', nom:db.chantiers[0].nom,
    contenu:(document.getElementById('content').textContent||'').slice(0,3000)};`);
  vrai('après l’enregistrement, on est toujours sur Interventions', e.cur === 'interventions' && /Intervention/.test(e.titre), { cur: e.cur, titre: e.titre });
  vrai('… sans la liste orpheline « Chantiers / Projets » posée par-dessus', !/Chantiers \/ Projets|Regroupez plusieurs interventions/.test(e.contenu));
  vrai('… et la modification est enregistrée', /modifié/.test(e.nom), e.nom);

  /* 5 — aucune erreur */
  const neuves = S.exceptions.slice(nErr0);
  vrai('aucune erreur JavaScript pendant la sonde', neuves.length === 0, neuves);
  console.log('\n  ' + ok + ' ✓  ' + ko + ' ✗');
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
