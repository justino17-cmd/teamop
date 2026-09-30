/* Mesure : les pierres tombales dans le document de l'équipe grossissent-elles sans fin ?
   Vraies fonctions d'app.html (estampiller, ombreRelever, fusionnerBases, tombesElaguer).
   Deux appareils, journal plein à 500, chacun journalise des gestes, et on pousse/reçoit. */
const fs=require('fs'); const APP=fs.readFileSync(process.env.SOURCE||(__dirname+'/../app.html'),'utf8');   // SOURCE=… pour une autre version (contre-épreuve : la v749 rend 8 000)
function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g; suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000); let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break; const t=bout.slice(0,k+1); try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }
const CODE=['const COLLS_HORS_FUSION=','function collsFusion(d){','const COLLS_DICT=','function dictFusion(prio,autre){','function recEmpreinte(r){','const stockEmpreinte=','const MS_MAX=',
  'let _ombre={}, _ombreStock={};','function ombreRelever(o,os){','const TOMBE_JOURS=','function estampiller(){','function msElaguer(ms,st,now){','function boxFusionFine(gagnante,perdante){',
  'function tombesElaguer(t,now){','function tombesUnion(a,b){','function numMaxUnion(a,b){','function fusionnerBases(local,remote,prioriteLocale){'].map(decoupe).join('\n');
const neuf=b=>new Function('etat',`let db=etat.db; const syncEnabled=()=>true; ${CODE}
  return { estampiller, ombreRelever, fusionnerBases, get:()=>db, set:d=>{db=d;} };`)({db:b});
const cp=o=>JSON.parse(JSON.stringify(o));
let seq=0; const uid=()=>'j'+(seq++).toString(36).padStart(8,'0');
const base={ journal:Array.from({length:500},(x,i)=>({id:uid(),ts:1727000000000+i,type:'x',txt:'ligne'})), clients:[], _tombes:{} };
const A=neuf(cp(base)), B=neuf(cp(base)); A.ombreRelever(); B.ombreRelever();
let nuage=cp(base);
const logEvent=(X)=>{ const d=X.get(); d.journal.unshift({id:uid(),ts:Date.now()+seq,type:'x',txt:'geste'}); if(d.journal.length>500) d.journal.length=500; };
const pousser=(X)=>{ X.estampiller(); const d=X.fusionnerBases(X.get(),cp(nuage),true); X.set(d); X.ombreRelever(); nuage=cp(d); };
const recevoir=(X)=>{ const d=X.fusionnerBases(X.get(),cp(nuage),false); X.set(d); X.ombreRelever(); };
const compte=d=>Object.values(d._tombes||{}).reduce((n,t)=>n+Object.keys(t||{}).length,0);
const lignes=[];
for(let g=1; g<=8000; g++){ const X=g%2?A:B, Y=g%2?B:A; logEvent(X); pousser(X); recevoir(Y);
  if([100,1000,3000,6000,8000].includes(g)) lignes.push([g, compte(nuage), Math.round(JSON.stringify(nuage._tombes).length/1024)+' Ko', compte(A.get())]); }
console.log('gestes journalisés · tombes dans le document de l\'équipe · poids des tombes · tombes locales de A');
lignes.forEach(l=>console.log('  '+l.join(' · ')));
