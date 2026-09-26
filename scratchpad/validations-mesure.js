const fs=require('fs'); const B=fs.readFileSync('app.html','utf8');
const bloc=d=>{const i=B.indexOf(d);let p=0;for(let k=B.indexOf('{',i);k<B.length;k++){if(B[k]==='{')p++;else if(B[k]==='}'){p--;if(!p)return B.slice(i,k+1);}}};
const cst=(d,f)=>{const i=B.indexOf(d);return B.slice(i,B.indexOf(f,i)+f.length)};
const M=new Function(`let db={}; function showAside(){return false} function planBloque(){return false} function metierBloque(){return false} function logEvent(){}
 ${cst('const NAV = [','\n];')} ${B.slice(B.indexOf('const SOUS_CATS=['),B.indexOf('\n',B.indexOf('const SOUS_CATS=[')))} ${cst('const CAPS_HERITE = {','\n};')}
 ${bloc('function defaultPerms(){')} ${bloc('function moduleHeriteRole(role,k){')} ${bloc('function reprendreDroitsImplicites(){')}
 ${bloc('function capDeduitRegle(cap){')} ${bloc('function userCap(u,cap){')} ${bloc('function moduleReglage(u,k){')} ${bloc('function userSeesModule(u,k){')}
 return {setDb:x=>{db=x}, defaultPerms, reprise:()=>reprendreDroitsImplicites(), voit:(u,k)=>userSeesModule(u,k)};`)();
const base={permissions:M.defaultPerms()}; M.setDb(base); M.reprise();
const cas=[['technicien sans rien',{role:'technicien'}],['technicien « valideur » par sa case validerDR',{role:'technicien',acces:{caps:{validerDR:true}}}],
 ['technicien boxValidDR (validé par un DR : celui qui attend)',{role:'technicien',boxValidDR:true}],['technicien, rubrique ouverte à LUI',{role:'technicien',acces:{modules:{validations:true}}}]];
for(const [n,u] of cas) console.log(n.padEnd(62), '→ voit Validations DR :', M.voit(u,'validations'));
