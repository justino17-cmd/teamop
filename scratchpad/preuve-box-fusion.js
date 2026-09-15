/* boxFusionFine EXTRAITE DU FICHIER LIVRE, executee sur le cas de Justin. */
const fs=require('fs');
const APP=fs.readFileSync('/home/user/teamop/app.html','utf8');
const d=APP.indexOf('function boxFusionFine(');
let n=0,f=d;
for(let i=APP.indexOf('{',d);i<APP.length;i++){ if(APP[i]==='{')n++; else if(APP[i]==='}'){n--; if(!n){f=i;break;}} }
const boxFusionFine=new Function(APP.slice(d,f+1)+'; return boxFusionFine;')();

const somme=b=>Object.values(b.stock||{}).reduce((t,v)=>t+(+v||0),0);
const T=1757000000000;

console.log('\n== CAS 1 : la box de Justin, 200 lignes, DATEES (_ms complet) ==');
{
  const justin={id:'b1',_m:T+1000,stock:{},_ms:{}};
  for(let i=0;i<200;i++){ justin.stock['p'+i]=36; justin._ms['p'+i]=T; }
  const tech={id:'b1',_m:T+2000,stock:{p0:36},_ms:{p0:T+2000}};   // le technicien a touche UNE ligne
  const r=boxFusionFine(tech,justin);   // le technicien gagne (_m plus recent)
  console.log('  Justin  : '+somme(justin)+' u sur '+Object.keys(justin.stock).length+' lignes');
  console.log('  apres fusion : '+somme(r)+' u sur '+Object.keys(r.stock).length+' lignes');
}

console.log('\n== CAS 2 : les memes lignes, mais NON DATEES (_ms partiel) ==');
{
  const justin={id:'b1',_m:T+1000,stock:{},_ms:{}};
  for(let i=0;i<200;i++){ justin.stock['p'+i]=36; }      // du stock, aucune date
  justin._ms['p0']=T;                                     // une seule ligne datee
  const tech={id:'b1',_m:T+2000,stock:{p0:36},_ms:{p0:T+2000}};
  const r=boxFusionFine(tech,justin);
  console.log('  Justin  : '+somme(justin)+' u sur '+Object.keys(justin.stock).length+' lignes');
  console.log('  apres fusion : '+somme(r)+' u sur '+Object.keys(r.stock).length+' lignes');
  console.log('  >>> PERDU : '+(somme(justin)-somme(r))+' u, '+(Object.keys(justin.stock).length-Object.keys(r.stock).length)+' lignes');
}

console.log('\n== CAS 3 : _ms vide des deux cotes (le pire, et le plus banal) ==');
{
  const justin={id:'b1',_m:T+1000,stock:{},_ms:{}};
  for(let i=0;i<200;i++){ justin.stock['p'+i]=36; }
  const tech={id:'b1',_m:T+2000,stock:{},_ms:{}};        // box vue, jamais remplie sur cet appareil
  const r=boxFusionFine(tech,justin);
  console.log('  Justin  : '+somme(justin)+' u sur '+Object.keys(justin.stock).length+' lignes');
  console.log('  le technicien : 0 u');
  console.log('  apres fusion : '+somme(r)+' u sur '+Object.keys(r.stock).length+' lignes');
  console.log('  >>> la garde a-t-elle protege ? '+(r===null?'OUI (retombe sur l ancienne regle)':'NON — la box est VIDEE'));
}
