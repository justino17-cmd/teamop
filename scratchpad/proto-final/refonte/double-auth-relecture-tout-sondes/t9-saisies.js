const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'iphone'}); const log=(...a)=>console.log(...a);
 log('ATTRS id:',await c.p.evaluate(()=>['cn-id','cn-mdp'].map(i=>{const e=document.getElementById(i);return i+':'+['type','autocomplete','autocapitalize','autocorrect','spellcheck','inputmode','enterkeyhint','maxlength'].map(a=>a+'='+e.getAttribute(a)).join(',')})));
 const kb=await S.provisoire(c,'kb');
 for(const [nom,id] of [['Majuscule','Karim'],['espaces',' karim '],['MAJ','KARIM'],['Email-like','karim@clim-services-17.fr'],['accent','Léa'],['Lea maj','LEA']]){
   await c.p.fill('#cn-id',id); await c.p.fill('#cn-mdp',kb); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(700);
   const conf=await S.attendreSel(c,'#cn-form-confirme',1200); log(nom,JSON.stringify(id),'=> confirme:',conf,'| err:',conf?'':await S.erreur(c));
   if(conf){ await c.p.click('#cnx a:has-text("Annuler"), #cnx button:has-text("Annuler")'); await c.p.waitForTimeout(300); }
 }
 // mdp avec espaces autour
 await c.p.fill('#cn-id','karim'); await c.p.fill('#cn-mdp',' '+kb+' '); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(700); log('mdp avec espaces autour => confirme:',await S.attendreSel(c,'#cn-form-confirme',1200));
 await c.p.evaluate(()=>{const a=document.querySelector('#cnx a, #cnx button'); });
 log('ERRJS',c.err.slice(0,3)); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
