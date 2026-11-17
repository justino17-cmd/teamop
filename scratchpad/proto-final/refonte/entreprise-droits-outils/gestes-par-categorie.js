// Recensement par famille : chaque valeur data-<famille>="<verbe>…" de la page, rangée par catégorie de droit et par nature (C créer, M modifier, S supprimer, L lecture / interface).
const fs=require('fs'); const src=fs.readFileSync('apercu/prototype-op-gestion.html','utf8').split('\n');
const CAT={ // famille -> catégorie de DR_CATS ('ui' : interface, aucun droit)
 planif:'blocOk a aok anouv anouvok amodif aprepond atdem atenvoi ademid adeplx aexport aflashx amois amot aonglet acal kabsnouv tkxs tnouv tmodif tfait tajout tkxajout tkxauto tkxcherche tkxcompris tkxferme tkxplus tkxrang tkxresume tqui tsdatep tsdevis tsdok tselvide tsfait tsqui tsuggs tpiece planconf plnav plvue plflashx mjajout mqtous mpop kplacer filtreint semc rdv rdvc rdvet rdvnote rdvok rdvraz rdvvoir rr rrouvrir',
 inter:'rlv rg rgf cbx cbzone cbcont cbnote cbrechb suite int fm ctva voirint',
 crm:'ci cnv cnvtype cherchecli ccli cchamp',
 ventes:'dv dvn dvf dvd b ff reglage opd opdz dx dxb dxr dxrb xy xyb ctype cforfait ecctr brouillon tvoir cedrech',
 compta:'cx cxaf cxdq cxgl cxq cxttc cxvis cp cpsys cmpt cmptfin cmptv paie paiefichiers stou stdet stbilan stnav stper pdfdl pdfmail pdfplein pdfplein',
 stock:'sk skadd skf skmvf skmvq skq skvalid sx sxau sxauto sxdadd sxdcop sxdu sxe sxeadd sxper sxqui bx bxl pr prmet prnom prpack prq pru fo fofac fofile fogarder fomet foq pdx pdxachats pdxfacsel pdxstk pdxtri ce ced cm bc mat plein',
 temps:'pt ptx tt l ve vx champ',
 com:'mbx mbxf ml mm mailenvoi courrier',
 achats:'ac axa axid ndfregle rl',
 config:'metf mch',
 espaceclient:'ec',
 admin:'eq eqx eqprof cnx',
};
const famCat={}; Object.entries(CAT).forEach(([c,s])=>s.split(/\s+/).forEach(f=>famCat[f]=c));
const fam={}; src.forEach((l,i)=>{ const re=/data-([a-z]+)="([A-Za-z0-9~]+)(?:[|"])/g; let m; while((m=re.exec(l))){ const f=m[1],v=m[2]; ((fam[f]=fam[f]||{})[v]=fam[f][v]||[]).push(i+1); } });
const nat=v=>{ if(/(suppr|retir|^del|^rm|jeter|efface|desact|annul|archiv|^deco|decook|fermerok|clore|frdel|docdel)/i.test(v)) return 'S';
  if(/(creer|nouv|^ajout|^add|^nv|inviter|dupli|^aj$|creerok|ajoute|ajouter|ajoutok|ligneAj|zadd|regajout|habajout|habok|^plus$)/i.test(v)) return 'C';
  if(/(ok$|^ok|valid|refus|^payer|encaiss|^envoy|poser|coche|terminer|enreg|fusion|recevoir|affecter|assign|renouv|^debut|^fin$|garder|appliquer|import|signer|accepter|facturer|renvoyer|relancer|modif|corrige|reco$|confirm|decaler|verrouil|comptabiliser|distribuer|mchange|retire|reprendre|commande|transfert|prendre|relach|toutval|toutok|virement|magasin|pris|oublie|manque|inv$|invok)/i.test(v)) return 'M';
  return 'L'; };
const tab={}; const annexe=[];
Object.keys(fam).sort().forEach(f=>{ const c=famCat[f]||'ui'; tab[c]=tab[c]||{C:0,M:0,S:0,L:0,fam:[]}; const vs=Object.keys(fam[f]); const par={C:[],M:[],S:[],L:[]};
  vs.forEach(v=>{ const n=nat(v); tab[c][n]++; par[n].push(v); }); tab[c].fam.push(f);
  annexe.push(`${c.padEnd(7)} ${f.padEnd(10)} C:${par.C.join(',')||'-'} | M:${par.M.join(',')||'-'} | S:${par.S.join(',')||'-'} | L:${par.L.length}`); });
console.log('=== TOTAUX par catégorie (verbes distincts data-*) ==='); Object.keys(tab).sort().forEach(c=>{ const t=tab[c]; console.log(c.padEnd(8),'C',String(t.C).padStart(3),'M',String(t.M).padStart(3),'S',String(t.S).padStart(3),'L',String(t.L).padStart(3),' familles:',t.fam.length); });
if(process.argv[2]==='annexe') console.log('\n'+annexe.sort().join('\n'));
