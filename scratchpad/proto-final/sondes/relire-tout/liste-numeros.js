// RELECTURE ADVERSE : la liste « Composés dans l'atelier », les onglets, les quatre chiffres du haut, la fiche d'un client, les numéros (composé / rapide / composé), PROFIL=mac
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v, cents=L.cents;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='liste-'+pr+(nuit?'-nuit':'-jour');
const num=t=>parseInt(String(t).replace(/[\s  ]/g,'').match(/^-?\d+/)[0],10);
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p;
  console.log('── '+tag);
  await L.aller(p,'devis');
  const kp=()=>p.evaluate(()=>[...document.querySelectorAll('#contenu .kpis .kpi')].map(k=>k.innerText.replace(/\s+/g,' ').trim()));
  const onglet=async nom=>{ await L.toucher(c,`#contenu button:has-text("${nom}")`); await L.calme(p,400); return p.evaluate(()=>[...document.querySelectorAll('#contenu .opd-l')].map(e=>e.innerText.replace(/\s+/g,' ').trim())); };
  const k0=await kp(); v(tag+' · population : quatre chiffres',k0.length===4,k0);
  const n0=await p.evaluate(()=>dvNum()); console.log('prochain numéro avant :',n0);
  // A : brouillon
  let f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
  await A.composerDevis(c,f,{client:'vp',objet:'Alpha — Restaurant Le Vieux Port',articles:[{ref:'EL-ALL',qte:2}]});
  const nA=await f.evaluate(()=>D().meta.numero); console.log('numéro de A',nA);
  v(tag+' · le devis composé prend le prochain numéro de la série ('+n0+')',nA===n0,[nA,n0]);
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100); await L.calme(p,500);
  let rows=await onglet('À envoyer');
  // tout-11 (refonte/compositeur-corrections.json) : un document composé se dit avec les MOTS des autres lignes — l'état « À envoyer » (le brouillon numéroté n'écrit plus « Brouillon ») et « préparé le JJ/MM »
  v(tag+' · « À envoyer » : le brouillon composé y est, avec son numéro, « préparé le » et l\'état « À envoyer »',rows.some(r=>r.includes(nA)&&/préparé le/.test(r)&&/À envoyer/.test(r)),rows);
  // l'objet tapé ici contient LUI-MÊME « — Restaurant Le Vieux Port » ; l'atelier ajoute « — <client> » au nom et la ligne (opdNom) retire cet ajout : le client s'écrit UNE fois comme client, et le texte tapé reste tel quel (une seule occurrence de « — Restaurant Le Vieux Port », pas deux)
  v(tag+' · la ligne ne répète pas le client : l\'objet tapé reste tel quel, le suffixe « — client » ajouté par l\'atelier est retiré (1 seule fois « — Restaurant Le Vieux Port »)',rows.some(r=>r.includes(nA)&&/Alpha — Restaurant Le Vieux Port/.test(r)&&(r.match(/— Restaurant Le Vieux Port/g)||[]).length===1),rows.filter(r=>r.includes(nA)));
  const k1=await kp();
  v(tag+' · le chiffre « à finir et envoyer » passe de '+num(k0[0])+' à '+(num(k0[0])+1),num(k1[0])===num(k0[0])+1,[k0[0],k1[0]]);
  await L.capture(c,CAP+`${tag}-1-brouillon.png`);
  rows=await onglet('En attente'); v(tag+' · « En attente » n\'a pas le brouillon',!rows.some(r=>r.includes(nA)),rows.length);
  // envoyer A
  rows=await onglet('À envoyer'); await L.toucher(c,'#contenu .opd-l[data-opd="doc"]'); f=await A.attendreAtelier(c); await L.calme(p,700);
  await X.clic(c,f,'[data-act="envoyer"]:visible'); await p.waitForTimeout(600); await X.clic(c,f,'[data-act="env-go"]:visible'); await p.waitForTimeout(1200);
  const ttcA=await f.evaluate(()=>{ const t=document.querySelector('#vue-editeur .feuille').innerText.replace(/\s+/g,' '); return t; });
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100); await L.calme(p,500);
  const k2=await kp(); rows=await onglet('En attente');
  v(tag+' · « En attente » : A y est avec la pastille d\'attente',rows.some(r=>r.includes(nA)),rows);
  v(tag+' · le chiffre « en attente de réponse » : +1 et +57,60 €',num(k2[1].split('en attente')[1]?.replace(/.*·\s*/,'')||'0')>=0 && cents(k2[1])===cents(k0[1])+5760,[k0[1],k2[1]]);
  const mAtt=s=>parseInt((/en attente de réponse · (\d+)/.exec(s)||[])[1]||'-1',10);
  v(tag+' · … et le nombre de devis en attente passe de '+mAtt(k0[1])+' à '+(mAtt(k0[1])+1),mAtt(k2[1])===mAtt(k0[1])+1,[k0[1],k2[1]]);
  v(tag+' · « à finir et envoyer » revient à '+num(k0[0]),num(k2[0])===num(k0[0]),[k0[0],k2[0]]);
  rows=await onglet('Tous'); v(tag+' · « Tous » : A une seule fois',rows.filter(r=>r.includes(nA)).length===1,rows.filter(r=>r.includes(nA)).length);
  rows=await onglet('Refusés'); v(tag+' · « Refusés, expirés » n\'a pas A',!rows.some(r=>r.includes(nA)));
  // signé (raccourci DIT : la signature au doigt n'est pas rejouée ici)
  rows=await onglet('En attente'); await L.toucher(c,'#contenu .opd-l[data-opd="doc"]'); f=await A.attendreAtelier(c);
  await f.evaluate(()=>{ const d=D(); d.etat='signe'; toucher(); sauverStock(); });
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100); await L.calme(p,500);
  const k3=await kp(); rows=await onglet('Acceptés');
  v(tag+' · « Acceptés » : A y est',rows.some(r=>r.includes(nA)&&/Signé|Accepté/.test(r)),rows.filter(r=>r.includes(nA)));
  const mAcc=s=>parseInt((/acceptés · (\d+)/.exec(s)||[])[1]||'-1',10);
  v(tag+' · le chiffre « acceptés » : +1 et +57,60 €',mAcc(k3[2])===mAcc(k0[2])+1&&cents(k3[2])===cents(k0[2])+5760,[k0[2],k3[2]]);
  await L.capture(c,CAP+`${tag}-2-signe.png`);
  rows=await onglet('En attente'); v(tag+' · … et A a quitté « En attente »',!rows.some(r=>r.includes(nA)));
  // fiche client
  await L.aller(p,'client-x-vp');
  const fiche=await p.evaluate(()=>({l:[...document.querySelectorAll('#contenu .opd-cl')].map(e=>e.innerText.replace(/\s+/g,' ')),b:[...document.querySelectorAll('#contenu [data-opd="devis"]')].map(b=>b.textContent.trim()+'|'+(b.className))}));
  v(tag+' · la fiche du client montre A',fiche.l.some(t=>t.includes(nA)),fiche);
  v(tag+' · la fiche propose « Composer un devis » (principal)',fiche.b.some(t=>/^Composer un devis\|.*btn(?!.*gris)/.test(t)),fiche.b);
  await L.capture(c,CAP+`${tag}-3-fiche-client.png`);
  // numéros : rapide puis composé
  const nR=await A.envoyerRapide(c); console.log('numéro du devis rapide',nR);
  const attendu='D-2026-'+String(parseInt(nA.slice(7),10)+1).padStart(3,'0');
  v(tag+' · le devis RAPIDE envoyé après A prend '+attendu,nR===attendu,nR);
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await A.composerDevis(c,f,{client:'hp',objet:'Bravo',articles:[{ref:'TH-900',qte:1}]});
  const nB=await f.evaluate(()=>D().meta.numero);
  const att2='D-2026-'+String(parseInt(nA.slice(7),10)+2).padStart(3,'0');
  v(tag+' · le devis composé après le rapide prend '+att2,nB===att2,nB);
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1100);
  const tous=await p.evaluate(()=>[...DV.map(x=>x.num),...ATD.docs.filter(x=>x.type==='devis').map(x=>x.numero)].filter(Boolean));
  v(tag+' · aucun numéro donné deux fois ('+tous.join(', ')+')',new Set(tous).size===tous.length,tous);
  // contrats : numéros
  await L.aller(p,'contrats'); const ck=await p.evaluate(()=>CONTRATS.map(k=>k.num));
  console.log('contrats existants',ck.join(','));
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
