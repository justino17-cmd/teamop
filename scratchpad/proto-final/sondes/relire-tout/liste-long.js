// RELECTURE ADVERSE : la carte « Composés dans l'atelier » avec des valeurs LONGUES (objet de 200 signes, mot de 60 lettres, gros montant) — rien ne déborde, rien ne se chevauche, les lignes se touchent au doigt.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'petit', nuit=process.env.NUIT==='1', tag='llong-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis'); let f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const long='Remplacement complet du groupe extérieur de la climatisation du restaurant et reprise de la liaison frigorifique avec mise en service '.repeat(1)+'X'.repeat(60);
  await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await f.locator('#vv-objet').fill(long);
  await X.clic(c,f,'[data-vv="art-add"][data-id="DKO-K4V"]'); const q=f.locator('[data-vv-q]').first(); await q.fill('9999'); await q.press('Tab'); await p.waitForTimeout(300);
  await X.clic(c,f,'[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1300);
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1200); await L.calme(p,500);
  await p.evaluate(()=>{ const e=document.querySelector('#contenu .opd-liste'); if(e) e.scrollIntoView({block:'center'}); }); await L.calme(p,400);
  const m=await p.evaluate(()=>{ const ligne=document.querySelector('#contenu .opd-l'); const R=ligne.getBoundingClientRect(); const out=[]; for(const e of ligne.querySelectorAll('*')){ const r=e.getBoundingClientRect(); if(r.width>0&&(r.right>innerWidth+1||r.left<-1)) out.push(e.tagName+'.'+e.className+' '+Math.round(r.right)); }
    const kids=[...ligne.children].map(e=>{const r=e.getBoundingClientRect(); return {c:e.className,x:Math.round(r.left),w:Math.round(r.width),y:Math.round(r.top),h:Math.round(r.height)};});
    return {W:innerWidth,sw:document.documentElement.scrollWidth,ligne:{w:Math.round(R.width),h:Math.round(R.height)},sortent:out.slice(0,5),kids,txt:ligne.innerText.replace(/\s+/g,' ').slice(0,200)}; });
  console.log('  ligne :',JSON.stringify(m));
  v(`${tag} · la page ne glisse pas de côté (${m.sw} ≤ ${m.W})`,m.sw<=m.W+1,m);
  v(`${tag} · rien de la ligne ne sort de l'écran`,m.sortent.length===0,m.sortent);
  v(`${tag} · la ligne se touche au doigt (≥ 44 px de haut : ${m.ligne.h})`,m.ligne.h>=44);
  // chevauchement des blocs de la ligne
  const chev=await p.evaluate(()=>{ const l=document.querySelector('#contenu .opd-l'); const b=[...l.children].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0); const x=[]; for(let i=0;i<b.length;i++) for(let j=i+1;j<b.length;j++){ const a=b[i],c=b[j]; if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1) x.push([i,j]); } return x; });
  v(`${tag} · les blocs de la ligne (numéro, texte, date, montant, pastille) ne se chevauchent pas`,chev.length===0,chev);
  await L.capture(c,CAP+tag+'-ligne.png');
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});
