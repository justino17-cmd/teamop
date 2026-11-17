// Ce que donnerait « le menu suit la case Voir » appliquée telle quelle aux profils du prototype (sans distinguer écran d'équipe / écran personnel).
const fs=require('fs'); const s=fs.readFileSync('apercu/prototype-op-gestion.html','utf8');
const P=(n)=>{ const m=new RegExp('  '+n+':\\{ nom:.*').exec(s); return m[0]; };
const V=(l)=>{ const o={}; const re=/(\w+):\{ v:(\d), c:(\d), m:(\d), s:(\d) \}/g; let m; while((m=re.exec(l))) o[m[1]]={v:+m[2],c:+m[3],m:+m[4],s:+m[5]}; return o; };
const prof={ resp:V(P('resp')), secr:V(P('secr')), tech:V(P('tech')) };
// resp : tousOui sauf admin/compta en lecture
prof.resp={planif:{v:1},inter:{v:1},crm:{v:1},ventes:{v:1},compta:{v:1},stock:{v:1},temps:{v:1},com:{v:1},achats:{v:1},admin:{v:1}};
const R={accueil:'compta',statistiques:'compta',historique:'admin',planning:'planif',interventions:'inter',taches:'planif',absences:'planif',clients:'crm',devis:'ventes',contrats:'ventes',boiteMail:'com',comptabilite:'compta',achats:'achats',stock:'stock',produits:'stock',boxes:'stock',equipe:'admin',pointage:'temps',vehicules:'temps'};
const AUJ={ secr:['taches','interventions','clients','devis','contrats','comptabilite','achats'], resp:['taches','interventions','clients','devis','contrats','comptabilite','achats'], tech:['majournee','taches','techfrais','mesheures','moncamion','absences'] };
for(const k of ['resp','secr','tech']){ const d=Object.keys(R).filter(r=>prof[k][R[r]]&&prof[k][R[r]].v); const act=AUJ[k]; 
 console.log(k.padEnd(5),'menu décidé ('+act.length+') :',act.join(' ')); console.log('      « Voir » seul ('+d.length+') :',d.join(' ')); console.log('      promis par les cases et absent du menu :',d.filter(x=>!act.includes(x)).join(' ')||'—'); console.log('      au menu sans que la case le promette :',act.filter(x=>!d.includes(x)&&!['majournee','techfrais','mesheures','moncamion'].includes(x)).join(' ')||'—'); }
