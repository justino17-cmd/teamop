// Relecture adverse : première connexion complète d'un rôle, au vrai clic, captures à chaque écran.
const W='/home/user/wt-soeur/scratchpad/proto-final/';
const S=require(W+'sondes/secu-commun.js'), L=S.L;
const CAP='/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-double-auth-tout/';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit', qui=process.argv[4]||'marc';
(async()=>{
  const c=await S.ouvrir({profil,nuit});
  const tag=`${qui}-${profil}-${nuit?'nuit':'jour'}`;
  await L.capture(c,CAP+tag+'-0-connexion.png');
  const txt=await c.p.evaluate(()=>document.getElementById('cnx').innerText.replace(/\s+/g,' '));
  console.log('CONNEXION:',txt.slice(0,600));
  const mdp=await S.provisoire(c,qui); console.log('prov',mdp);
  await S.connecter(c,qui,mdp);
  await c.p.waitForTimeout(600);
  await L.capture(c,CAP+tag+'-1-activation.png');
  console.log('ACT:',(await c.p.evaluate(()=>document.getElementById('cnx').innerText.replace(/\s+/g,' '))).slice(0,900));
  console.log('ERR',c.err.slice(0,5));
  await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
