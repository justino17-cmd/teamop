// Recensement des gestes d'écriture : toutes les valeurs data-<famille>="<verbe>|..." de la page, rangées par famille.
const fs=require('fs'); const src=fs.readFileSync('apercu/prototype-op-gestion.html','utf8').split('\n');
const fam={};
src.forEach((l,i)=>{ const re=/data-([a-z]+)="([A-Za-z0-9~]+)(?:[|"])/g; let m; while((m=re.exec(l))){ const f=m[1],v=m[2]; ((fam[f]=fam[f]||{})[v]=fam[f][v]||[]).push(i+1); } });
const ecr=/(ok|creer|nouveau|ajout|ajouter|save|supprim|suppr|retir|del|rm|modif|renomm|valider|refus|annul|envoy|payer|encaiss|poser|coche|toggle|set|enreg|terminer|fusion|commande|recevoir|archiver|dupliquer|decale|deplace|affecter|assign|inviter|actif|renouv|clore|debut|fin|ajout|garder|appliquer|importer|import|reco|deco|ouvrirok|signer|accepter|facturer)/i;
const out=[]; Object.keys(fam).sort().forEach(f=>{ const vs=Object.keys(fam[f]); out.push(f+' ('+vs.length+') : '+vs.map(v=>v+(ecr.test(v)?'*':'')).join(' ')); });
console.log(out.join('\n'));
