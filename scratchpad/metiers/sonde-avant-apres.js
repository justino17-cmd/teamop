/* SONDE — LA 3D NE CHANGE PAS : les mêmes écrans, avant et après, sur la bêta réelle. Parcourt toutes les rubriques et les fenêtres
   de saisie en métier 3D (celui d'ELAN) et range, pour chacune, son TEXTE visible, ses champs (nom, placeholder, options) et le
   nombre d'éléments. Usage : SOURCE=/chemin/beta.html OUT=/chemin/sortie.json node sonde-avant-apres.js
   Puis : node sonde-avant-apres.js --comparer a.json b.json (diffère écran par écran, avec les lignes en plus et en moins).
   ⛔ Bêta seulement (copie du dépôt), 127.0.0.1 seulement. */
const fs=require('fs');
if(process.argv[2]==='--comparer'){
  const A=JSON.parse(fs.readFileSync(process.argv[3])),B=JSON.parse(fs.readFileSync(process.argv[4]));
  let diff=0, n=0;
  for(const k of new Set([...Object.keys(A),...Object.keys(B)])){ n++;
    const a=A[k],b=B[k];
    if(!a||!b){ diff++; console.log('✗',k,'absent d\'un côté'); continue; }
    /* le temps qui passe n'est pas un défaut : « dans 7 heures 56 minutes » devient « dans 7 heures 55 minutes » une minute plus tard */
    const norm=t=>t.split('\n').map(l=>/^(dans |il y a |depuis )\d|\d+ ?(min|h)\b|^\d+ (heures?|minutes?)/i.test(l)?l.replace(/\d+/g,'#'):(/^\d+$/.test(l)?'#':l));
    const la=norm(a.texte),lb=norm(b.texte), sa=new Set(la), sb=new Set(lb);
    const moins=la.filter(x=>!sb.has(x)), plus=lb.filter(x=>!sa.has(x));
    const ca=JSON.stringify(a.champs)!==JSON.stringify(b.champs);
    if(moins.length||plus.length||ca||a.n!==b.n){ diff++; console.log('✗',k,'(éléments',a.n,'→',b.n+')'); moins.slice(0,6).forEach(x=>console.log('    − '+x.slice(0,140))); plus.slice(0,6).forEach(x=>console.log('    + '+x.slice(0,140))); if(ca) console.log('    champs différents'); }
  }
  console.log('\n'+n+' écrans comparés, '+diff+' différent(s)'); process.exit(diff?1:0);
}
const {demarrer,dormir}=require('./lib.js');
const OUT=process.env.OUT||'/tmp/avant-apres.json';
(async()=>{
  const S=await demarrer({source:process.env.SOURCE});
  console.log('page',S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true;
    window.metierBloque=function(k){ const p=metierPack(); return !!(p&&p.masque&&p.masque.indexOf(k)>=0); };
    window.__csv=null; window.csvDownload=function(f,h,r){ window.__csv={f,h,r}; };
    db.metier='3d'; try{ renderNav(); }catch(e){} return 1;`);
  await S.profil('bureau','light');
  const R={};
  const releve=async(nom)=>{
    R[nom]=await S.ev(`const mo=document.getElementById('modal'); const modalOuvert=!!(mo&&mo.innerHTML.trim().length>50&&getComputedStyle(document.getElementById('overlay')||mo).display!=='none');
      const roots=(window.__fenetre&&modalOuvert)?[mo]:[document.getElementById('content')].filter(Boolean);
      const out=[],champs=[]; let n=0;
      roots.forEach(root=>{ n+=root.querySelectorAll('*').length;
        const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let x;
        while(x=w.nextNode()){ const t=x.nodeValue.replace(/\\s+/g,' ').trim(); if(!t) continue; const p=x.parentElement; if(!p||p.tagName==='SCRIPT'||p.tagName==='STYLE') continue; const s=getComputedStyle(p); if(s.display==='none'||s.visibility==='hidden') continue; out.push(t); }
        root.querySelectorAll('input,select,textarea,button').forEach(e=>{ if(e.closest('[hidden]')) return; champs.push([e.tagName,e.name||'',e.type||'',e.getAttribute('placeholder')||'',e.tagName==='SELECT'?[...e.options].map(o=>o.text).join('|'):'']); }); });
      return {texte:out.join('\\n'),champs,n};`);
  };
  const cles=await S.ev(`return NAV.flatMap(g=>g.items).map(i=>i.k).concat(['parametres','techniciens','produitsDonnes']);`);
  for(const k of cles){ await S.ev(`window.__fenetre=false; try{ closeModal(); }catch(e){} const m=document.getElementById('modal'); if(m) m.innerHTML=''; try{ go('${k}'); }catch(e){} return 1;`); await dormir(650); await releve('vue:'+k); }
  const ids=await S.ev(`return {i:(db.interventions.find(x=>x.statut==='terminee')||db.interventions[0]||{}).id, i2:(db.interventions.find(x=>x.statut==='planifiee')||{}).id, c:(db.clients.find(x=>x.typeClient!=='particulier')||db.clients[0]||{}).id, t:(db.techniciens[0]||{}).id, p:(db.produits[0]||{}).id, u:(db.users[0]||{}).id};`);
  console.log(JSON.stringify(ids));
  const fen=async(nom,code)=>{ try{ await S.ev(`window.__fenetre=false; try{ closeModal(); }catch(e){} const m=document.getElementById('modal'); if(m) m.innerHTML=''; go('interventions'); await new Promise(r=>setTimeout(r,500)); window.__fenetre=true; ${code}; return 1;`); }catch(e){ R['ERREUR:'+nom]={texte:String(e.message).slice(0,100),champs:[],n:0}; } await dormir(800); await releve('fenêtre:'+nom); };
  await fen('formIntervention()',`formIntervention()`);
  await fen('formIntervention(modif)',`formIntervention('${ids.i2}')`);
  await fen('detailIntervention(terminée)',`detailIntervention('${ids.i}')`);
  await fen('detailIntervention(planifiée)',`detailIntervention('${ids.i2}')`);
  for(let e=0;e<6;e++) await fen('assistCloture étape '+(e+1),`assistCloture('${ids.i2}'); asW.step=${e}; assistRender()`);
  await fen('formRapport',`formRapport('${ids.i}')`);
  await fen('ficheClient',`ficheClient('${ids.c}')`);
  await fen('formClient(nouveau)',`formClient()`);
  await fen('formClient(modif)',`formClient('${ids.c}')`);
  await fen('formProduit()',`formProduit()`);
  await fen('formProduit(modif)',`formProduit('${ids.p}')`);
  await fen('formProduitsListe',`formProduitsListe()`);
  await fen('formTech()',`formTech()`);
  await fen('ficheTech',`ficheTech('${ids.t}')`);
  await fen('formUser()',`formUser()`);
  await fen('formFournisseur()',`formFournisseur()`);
  await fen('formContrat()',`formContrat()`);
  await S.ev(`try{ closeModal(); }catch(e){} exportInterventionsCsv(); return 1;`);
  R['csv']={texte:JSON.stringify(await S.ev(`return window.__csv&&{h:window.__csv.h,l:window.__csv.r.length,p:window.__csv.r[0]&&window.__csv.r[0].length};`)),champs:[],n:0};
  fs.writeFileSync(OUT,JSON.stringify(R));
  console.log('écrans relevés :',Object.keys(R).length,'· erreurs de page :',JSON.stringify(S.exceptions.slice(0,3)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});
