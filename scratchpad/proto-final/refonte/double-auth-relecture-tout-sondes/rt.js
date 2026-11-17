// Outils de la relecture : gestes RÉELS (souris/doigt), jamais d'appel de fonction de la page quand un geste existe.
const W='/home/user/wt-soeur/scratchpad/proto-final/';
const S=require(W+'sondes/secu-commun.js'), L=S.L;
const CAP='/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-double-auth-tout/';
const norm=t=>(t||'').replace(/[  ]/g,' ').replace(/\s+/g,' ').trim();
const R={S,L,CAP,norm};
R.txt=(c,sel)=>c.p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/[  ]/g,' ').replace(/\s+/g,' ').trim():null},sel||'#cnx');
R.vis=(c,sel)=>c.p.evaluate(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'},sel);
// ouvre le téléphone par le geste de la personne (bouton rond ou pastille)
R.ouvrirTel=async c=>{ if(await R.vis(c,'#opsec .ops-barre, #opsec [data-ops="pin-touche"], #opsec [data-ops="commencer"]')) return true;
  const sel=['#opsec [data-ops="ouvrir"]','[data-ops="ouvrir"]','.ops-pastille','.ops-rond'];
  for(const s of sel){ if(await R.vis(c,s)){ await c.p.click(s,{timeout:3000}).catch(()=>{}); await c.p.waitForTimeout(400); return true; } }
  return false; };
R.pinR=async(c,code)=>{ for(const d of String(code)){ await c.p.click('#opsec [data-ops="pin-touche"][data-k="'+d+'"]',{timeout:4000}); } await c.p.waitForTimeout(300); };
R.tel=c=>R.txt(c,"#opsec .ops-ecran, #opsec");
R.fermeTel=async c=>{ if(await R.vis(c,'#opsec [data-ops="revenir"]')) await c.p.click('#opsec [data-ops="revenir"]'); else if(await R.vis(c,'#opsec [data-ops="cacher"]')) await c.p.click('#opsec [data-ops="cacher"]'); await c.p.waitForTimeout(300); };
R.cap=(c,nom)=>L.capture(c,CAP+nom+'.png');
module.exports=R;
// entrer en tant que quelqu'un (téléphone déjà activé : appeler D.tous avant), avec le retour réel de la vue du téléphone en vue étroite
R.entrer=async(c,k)=>{ const mdp=await S.provisoire(c,k); await S.connecter(c,k,mdp); const n=await S.lireNombre(c); await S.approuver(c,k,n,'246802'); await c.p.waitForTimeout(500);
  if(await R.vis(c,'#opsec [data-ops="revenir"]')){ await c.p.click('#opsec [data-ops="revenir"]'); await c.p.waitForTimeout(500); }
  if(await S.attendreSel(c,'#cn-form-premier',3000)){ const p='cheval agrafe batterie '+k; await c.p.fill('#cn-n1',p); await c.p.fill('#cn-n2',p); await c.p.click('#cn-form-premier button[type=submit]'); }
  const ok=await S.attendreApp(c,15000,true); await c.p.waitForTimeout(1300); await c.p.evaluate(()=>{const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click();}); await c.p.waitForTimeout(400); return ok; };
