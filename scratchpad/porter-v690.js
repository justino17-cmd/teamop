/* ⛔ CONSERVÉ POUR MÉMOIRE — le report v690, exécuté une fois le 15 septembre 2026 au soir.
   Le relancer tel quel échouerait : ses ancres n'existent plus (c'est justement la garantie).
   Port de la compression phase 2 + de la passe de performance, de la branche de travail vers
   main. ⛔ Le piège git est noté dans REPRISE.md : main et la branche portent la v676 sous DEUX
   commits différents, donc `git merge` ne trouve plus de base commune et met 3 Mo en conflit.
   Les blocs se reportent donc à la main — mais JAMAIS à l'aveugle : chaque ancre est affirmée
   UNIQUE dans le fichier, et le texte neuf est EXTRAIT du fichier de la branche (celui qui a été
   mesuré au navigateur), pas retapé. */
const fs=require('fs');
const CIBLE='/home/user/teamop/app.html';
const BR='/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/branche-app.html';
let L=fs.readFileSync(CIBLE,'utf8').split('\n');
const br=fs.readFileSync(BR,'utf8').split('\n');
const blocBr=(a,b)=>br.slice(a-1,b);            // lignes 1-indexées, bornes incluses

let faits=0;
function ligneUnique(t){
  const i=[]; L.forEach((l,k)=>{ if(l===t) i.push(k); });
  if(i.length!==1) throw new Error('ligne trouvée '+i.length+' fois, attendu 1 :\n  '+t.slice(0,110));
  return i[0];
}
function bloc(nom,debut,fin,a,b){
  const i=ligneUnique(debut), j=(fin===debut)?i:ligneUnique(fin);
  if(j<i) throw new Error(nom+' : fin avant début');
  const neuf=blocBr(a,b);
  if(!neuf.length||neuf[neuf.length-1]===undefined) throw new Error(nom+' : bloc branche vide');
  L=L.slice(0,i).concat(neuf, L.slice(j+1));
  faits++; console.log('  ✓ '+nom+'  ('+(j-i+1)+' l. → '+neuf.length+' l.)');
}
function ligne(nom,vieux,neuf){
  const i=ligneUnique(vieux);
  if(L.indexOf(neuf)>=0) throw new Error(nom+' : le texte neuf est déjà là');
  L[i]=neuf; faits++; console.log('  ✓ '+nom);
}
/* Remplace `nb` lignes à partir de `debut` (ligne unique), en AFFIRMANT le texte de la
   dernière ligne remplacée — un décalage d'une ligne ne doit pas passer en silence. */
function blocN(nom,debut,nb,derniere,a,b){
  const i=ligneUnique(debut);
  if(L[i+nb-1]!==derniere) throw new Error(nom+' : la '+nb+'e ligne n\'est pas celle attendue :\n  vue : '+String(L[i+nb-1]).slice(0,110)+'\n  att : '+derniere.slice(0,110));
  const neuf=blocBr(a,b);
  L=L.slice(0,i).concat(neuf, L.slice(i+nb));
  faits++; console.log('  ✓ '+nom+'  ('+nb+' l. → '+neuf.length+' l.)');
}
function avant(nom,ancre,lignes){
  const i=ligneUnique(ancre);
  L=L.slice(0,i).concat(lignes, L.slice(i));
  faits++; console.log('  ✓ '+nom+'  (+'+lignes.length+' l.)');
}
function apres(nom,ancre,lignes){
  const i=ligneUnique(ancre);
  L=L.slice(0,i+1).concat(lignes, L.slice(i+1));
  faits++; console.log('  ✓ '+nom+'  (+'+lignes.length+' l.)');
}

console.log('── Les formateurs de date, gardés ──');
bloc('formateurs + eur + isoDe + fmtTs',
  "const eur = n => (Number(n)||0).toLocaleString('fr-FR') + ' €';",
  "function fmtTs(ts){ return new Date(ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }",
  5348, 5400);

console.log('── Compression, phase 2 ──');
bloc('syncEncrypt reprend les octets déjà pesés',
  'async function syncEncrypt(plain){ const saltB64=SYNC_SALT;',
  '  return {enc:_b64e(ct),iv:_b64e(iv),salt:saltB64}; }',
  6436, 6445);
bloc('nuageIllisible + syncReadRemote',
  "async function syncReadRemote(d){ if(!d) return null; if(d.enc) return await syncDecrypt(d); if(d.db) return d.db; /* rétrocompat (ancien format clair) */ return null; }",
  "async function syncReadRemote(d){ if(!d) return null; if(d.enc) return await syncDecrypt(d); if(d.db) return d.db; /* rétrocompat (ancien format clair) */ return null; }",
  6451, 6466);
apres('NUAGE_ENC_MAX + nuageDocOctets',
  'const B_NUAGE_KO=NUAGE_BUDGET/1024;',
  blocBr(6952,6965));
avant('syncAllegerNuage',
  'function syncRegreffer(local, fusion){ try{',
  blocBr(7042,7078));

console.log('── syncPush : la quatrième porte, la mesure, le refus, l\'écriture ──');
/* ⛔ `if(_versionBloquee) return;` apparaît QUATRE fois dans le fichier. L'ancre est donc la
   ligne de commentaire juste au-dessus, unique, et on remplace les DEUX lignes. */
blocN('quatrième porte : _nuageIllisible',
  '     — écran de connexion : rien à pousser. */', 2, '  if(_versionBloquee) return;',
  7095, 7099);
ligne('on mesure compressé avant d\'alléger',
  '    const alle=syncAlleger(db);',
  '    const alle=await syncAllegerNuage(db);');
bloc('le refus se dit en taille de DOCUMENT',
  "      const det='base '+Math.round(alle.taille/1024)+' Ko pour '+Math.round(B_NUAGE_KO)+' Ko permis · '",
  "        +((alle.parColl&&alle.parColl.length)?'plus lourdes : '+alle.parColl.join(', '):'aucune collection mesurée');",
  7173, 7180);
bloc('un seul gzip par envoi',
  '    const ts=Date.now(); const _tsAvant=_syncTs; _syncTs=ts; const e=await syncEncrypt(JSON.stringify(alle.copie));',
  '    const ts=Date.now(); const _tsAvant=_syncTs; _syncTs=ts; const e=await syncEncrypt(JSON.stringify(alle.copie));',
  7195, 7199);

console.log('── isoDe : les boucles de dates ──');
[
 ["  const today=new Date(); const d=o=>{const x=new Date(today);x.setDate(x.getDate()+o);return x.toLocaleDateString('sv-SE');};",
  "  const today=new Date(); const d=o=>{const x=new Date(today);x.setDate(x.getDate()+o);return isoDe(x);};", 2],
 ["function dpMoisPrem(iso){ const d=new Date(iso+'T00:00:00'); return new Date(d.getFullYear(),d.getMonth(),1).toLocaleDateString('sv-SE'); }",
  "function dpMoisPrem(iso){ const d=new Date(iso+'T00:00:00'); return isoDe(new Date(d.getFullYear(),d.getMonth(),1)); }", 1],
 ["function dpMoisDecale(iso,n){ const d=new Date(iso+'T00:00:00'); return new Date(d.getFullYear(),d.getMonth()+n,1).toLocaleDateString('sv-SE'); }",
  "function dpMoisDecale(iso,n){ const d=new Date(iso+'T00:00:00'); return isoDe(new Date(d.getFullYear(),d.getMonth()+n,1)); }", 1],
 ["    const iso=new Date(an,mo,j).toLocaleDateString('sv-SE');",
  "    const iso=isoDe(new Date(an,mo,j));", 1],
 ["  for(let k=d.getDate();k<=fin;k++) out.push(new Date(d.getFullYear(),d.getMonth(),k).toLocaleDateString('sv-SE'));",
  "  for(let k=d.getDate();k<=fin;k++) out.push(isoDe(new Date(d.getFullYear(),d.getMonth(),k)));", 1],
 ["    const out=[], d=new Date(y,m,1); while(d.getMonth()===m){ out.push(d.toLocaleDateString('sv-SE')); d.setDate(d.getDate()+1); } return out; }",
  "    const out=[], d=new Date(y,m,1); while(d.getMonth()===m){ out.push(isoDe(d)); d.setDate(d.getDate()+1); } return out; }", 1],
 ["    const iso=d.toLocaleDateString('sv-SE'), dans=(d.getMonth()===mo-1), we=(d.getDay()===0||d.getDay()===6);",
  "    const iso=isoDe(d), dans=(d.getMonth()===mo-1), we=(d.getDay()===0||d.getDay()===6);", 1],
 ["function weekDays(ref){ const d=new Date(ref+'T00:00:00'); const dow=(d.getDay()+6)%7; const mon=new Date(d); mon.setDate(d.getDate()-dow); return Array.from({length:7},(_,k)=>{const x=new Date(mon);x.setDate(mon.getDate()+k);return x.toLocaleDateString('sv-SE');}); }",
  "function weekDays(ref){ const d=new Date(ref+'T00:00:00'); const dow=(d.getDay()+6)%7; const mon=new Date(d); mon.setDate(d.getDate()-dow); return Array.from({length:7},(_,k)=>{const x=new Date(mon);x.setDate(mon.getDate()+k);return isoDe(x);}); }", 1],
].forEach(([v,nf,combien])=>{
  /* le semis et la démo portent la MÊME ligne : les deux doivent passer à isoDe. */
  const i=[]; L.forEach((l,k)=>{ if(l===v) i.push(k); });
  if(i.length!==combien) throw new Error('isoDe : '+i.length+' occurrence(s), attendu '+combien+' :\n  '+v.slice(0,100));
  i.forEach(k=>{ L[k]=nf; });
  faits++; console.log('  ✓ isoDe ×'+combien+' — '+v.trim().slice(0,58)+'…');
});

console.log('── Planning : le réglage des jours, lu une fois ──');
blocN('planJoursSem gardé en cache',
  'function planJoursSem(){', 7, '}',
  10010, 10026);
apres('planJoursSemSet oublie le cache',
  "  try{ localStorage.setItem('elan_plan_jsem',l.join(',')); }catch(e){}",
  ['  _jsemCache=null;   // seul point d\'écriture : c\'est ici, et nulle part ailleurs, qu\'on oublie']);

console.log('── Historique : 80 lignes, puis un bouton ──');
blocN('HIST_PAS + journalView par tranches',
  'function journalView(title,sub){', 10,
  "      <div class=\"tl-time\">${fmtTs(j.ts)}</div></div>`).join('') : emptyState('🕘','Aucun évènement.','','')}</div>`;",
  23723, 23748);

fs.writeFileSync(CIBLE, L.join('\n'));
console.log('\n'+faits+' reports appliqués.');
