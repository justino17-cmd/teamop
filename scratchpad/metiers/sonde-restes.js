/* SONDE RESTES — ce qu'un client hors 3D lit ENCORE de l'anti-nuisibles, après la relecture du 23 octobre 2026. Pour 3D, plomberie et
   chauffage, à 1440 / 1100 / 390 px, jour et nuit, sur la bêta servie en 127.0.0.1 : l'étape 6 de la clôture guidée, la fiche
   d'intervention (carte « Produits & matériel »), l'assistant devis, le compte-rendu + la consigne que reçoit l'IA, la fiche d'un produit
   sans catégorie, le rapport imprimé (rendu dans un cadre plein écran, photographié), le PDF du rapport (son texte), et le masque
   `metierBloque` rejoué avec BETA_ESSAI = faux (enveloppes et mouvements de box DÉJÀ saisis).
   Mesure : mots de la liste noire (hors 3D), défilement latéral réel (deux trames + lecture forcée, deux fois), et prend une capture.
   Usage : OUT=/chemin node sonde-restes.js [métier…]   ⛔ bêta seulement, 127.0.0.1 seulement. */
const path = require('path');
const { demarrer, dormir } = require('./lib.js');
const OUT = process.env.OUT || path.join(require('os').tmpdir(), 'op-metiers-sonde-restes');
const METIERS = process.argv.slice(2).length ? process.argv.slice(2) : ['3d', 'plomberie', 'chauffage'];
const BIOCIDE = 'biocide|certibiocide|\\\\bAMM\\\\b|animaux domestiques';
const AUTRES = 'nuisible|dératis|désinsect|rongeur|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|rodonticide|insecticide|pièges à glu|Zones traitées';
(async () => {
  const S = await demarrer({ demo: false });
  console.log('page', S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; return 1;`);
  await S.ev(`db.clients=[{id:'c1',nom:'Copropriété Les Lilas',typeClient:'pro',adresse:'12 rue des Lilas',codePostal:'69003',ville:'Lyon',actif:true,email:'a@b.fr'}];
    db.techniciens=[{id:'t1',nom:'Marc Dubois',metier:'Technicien',couleur:'#1E7A4E'}];
    db.produits=[{id:'p1',nom:'Raccord laiton 20/27',categorie:'Raccords et fittings',ref:'R1',fournisseurs:['Négoce Dupont'],prix:2,unite:'unité',qte:5,seuil:2},
      {id:'p2',nom:'Joint sans catégorie',categorie:'',ref:'R2',fournisseurs:['Négoce Dupont'],prix:1,unite:'unité',qte:5,seuil:2}];
    db.interventions=[{id:'i1',num:'INT-2026-001',clientId:'c1',date:todayISO(),heure:'09:00',duree:60,type:'Contrôle',statut:'terminee',techId:'t1',titre:'Passage de contrôle',adresse:'12 rue des Lilas, Lyon',zones:'salle de bain, cave',materiel:'clé à molette',compteRendu:'Joint remplacé.',produitsUtilises:[{produitId:'p1',qte:2}],constat:{recommandations:'Surveiller le joint.'}},
      {id:'i2',num:'INT-2026-002',clientId:'c1',date:todayISO(),heure:'14:00',duree:60,type:'Contrôle',statut:'planifiee',techId:'t1',titre:'Visite du site',produitsUtilises:[{produitId:'p1',qte:1}]}];
    db.fournisseurs=[{id:'f1',nom:'Négoce Dupont',email:'a@b.fr'}]; db.contrats=[]; db.boxes=[]; db.devis=[]; db.factures=[]; db.enveloppes=[]; db.mouvements=[]; save(); return 1;`);
  let ok = 0, ko = 0; const ligne = (b, t) => { b ? ok++ : ko++; console.log((b ? '  ✓ ' : '  ✗ ') + t); };
  const lecture = (sel) => `await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    const mo=document.getElementById('modal'); const racine=${sel==='modal' ? 'mo' : 'document.getElementById("content")'};
    let txt=''; const w=document.createTreeWalker(racine,NodeFilter.SHOW_TEXT); let x; while(x=w.nextNode()){ const p=x.parentElement; if(!p||p.tagName==='SCRIPT'||p.tagName==='STYLE') continue; const s=getComputedStyle(p); if(s.display==='none'||s.visibility==='hidden') continue; txt+=' '+x.nodeValue; }
    txt+=' '+[...racine.querySelectorAll('[placeholder]')].map(e=>e.getAttribute('placeholder')).join(' ');
    window.scrollTo(9999,0); const sx=window.scrollX; window.scrollTo(0,0);
    return {txt:txt.replace(/\\s+/g,' '), sx, len:txt.length, b:(txt.match(new RegExp('${BIOCIDE}','ig'))||[]).map(s=>s.toLowerCase()), a:(txt.match(new RegExp('${AUTRES}','ig'))||[]).map(s=>s.toLowerCase())};`;
  for (const [pn, theme] of [['bureau', 'light'], ['bureau', 'dark'], ['b1100', 'dark'], ['b1100', 'light'], ['tel', 'dark'], ['tel', 'light']]) {
    await S.profil(pn, theme);
    for (const m of METIERS) {
      await S.metier(m);
      const est3d = m === '3d';
      const ecrans = [
        ['clot6', `assistCloture('i2'); asW.step=5; assistRender()`, 'modal'],
        ['fiche', `detailIntervention('i1')`, 'content'],
        ['devis', `devisIAModal()`, 'modal'],
        ['rapport', `formRapport('i1')`, 'modal'],
        ['produit', `formProduit('p2')`, 'modal'] ];
      for (const [nom, code, zone] of ecrans) {
        await S.ev(`try{ closeModal(); }catch(e){} const mm=document.getElementById('modal'); if(mm) mm.innerHTML=''; go('interventions'); return 1;`); await dormir(450);
        await S.ev(`${code}; return 1;`); await dormir(900);
        if (nom === 'fiche') await S.ev(`const h=[...document.querySelectorAll('#content h3, #modal h3')].find(x=>/Produits/.test(x.textContent)); if(h) h.scrollIntoView({block:'center'}); return 1;`);
        await S.ev(lecture(zone)); await dormir(500); const r = await S.ev(lecture(zone));
        await S.snap(`${OUT}/${pn}-${theme}-${m}-${nom}.png`);
        let attendu = r.len > 150 && r.sx === 0;
        let detail = `texte ${r.len}, latéral ${r.sx}`;
        if (!est3d) { attendu = attendu && r.b.length === 0 && r.a.length === 0; detail += `, mots interdits [${[...new Set(r.b.concat(r.a))].join(', ')}]`; }
        else if (nom === 'clot6') { attendu = attendu && /Certibiocide/.test(r.txt); detail += ' (la 3D garde la mention)'; }
        else if (nom === 'devis') { attendu = attendu && /dératisation d'un restaurant/.test(r.txt); detail += ' (la 3D garde son exemple)'; }
        else if (nom === 'fiche') { attendu = attendu && /Zones traitées/.test(r.txt) && /au registre — le stock ne bouge pas/.test(r.txt); detail += ' (la 3D garde Zones traitées et la phrase du registre)'; }
        if (nom === 'produit') { const sel = await S.ev(`const s=document.querySelector('#modal select[name="categorie"]'); return s?{v:s.value, t:s.options[s.selectedIndex].text, n:s.options.length}:null;`);
          attendu = attendu && !!sel && sel.v === '' && sel.t === 'Sans catégorie'; detail += ` · catégorie affichée « ${sel && sel.t} » (${sel && sel.n} options)`; }
        if (nom === 'rapport') { const ia = await S.ev(`window.callClaude=async(sys,ctx)=>{ window.__ia={sys,ctx}; return 'ok'; }; try{ aiHasKey=function(){return true;}; }catch(e){} try{ await aiGenRapport('i1'); }catch(e){ return {err:String(e)}; } return window.__ia||null;`);
          const bon = ia && ia.sys && ia.ctx && (est3d ? /anti-nuisibles/.test(ia.sys) && /Nuisibles :/.test(ia.ctx) : !/nuisible|dératis|infest/i.test(ia.sys) && !/Nuisibles|Méthodes|infestation/i.test(ia.ctx));
          attendu = attendu && !!bon; detail += ` · consigne IA ${ia && ia.sys ? 'lue' : 'non lue ' + JSON.stringify(ia)}`; }
        ligne(attendu, `${pn} ${theme} ${m} ${nom} : ${detail}`);
      }
      /* le rapport imprimé, dans un cadre plein écran qu'on photographie ; et le texte du PDF */
      await S.ev(`try{ closeModal(); }catch(e){} return 1;`);
      await S.ev(`window.__ecrit=''; window.open=function(){ return { document:{ write:function(h){ window.__ecrit+=h; }, close:function(){} }, focus(){}, print(){}, confirm:()=>true, close(){} }; }; await printRapport('i1'); return window.__ecrit.length;`); await dormir(500);
      const imp = await S.ev(`const h=window.__ecrit; const f=document.createElement('iframe'); f.id='sonde-imp'; f.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:99999;background:#fff;border:0'; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(h); f.contentDocument.close();
        await new Promise(r=>setTimeout(r,400)); const t=f.contentDocument.body.innerText.replace(/\\s+/g,' ');
        return {len:t.length, b:(t.match(new RegExp('${BIOCIDE}','ig'))||[]).map(s=>s.toLowerCase()), a:(t.match(new RegExp('${AUTRES}','ig'))||[]).map(s=>s.toLowerCase()), zc:/Zones concernées/.test(t), zt:/Zones traitées/.test(t), prod:/Raccord laiton/.test(t)};`);
      await S.snap(`${OUT}/${pn}-${theme}-${m}-imprime.png`);
      await S.ev(`const f=document.getElementById('sonde-imp'); if(f) f.remove(); return 1;`);
      ligne(imp.len > 100 && imp.prod && (est3d ? imp.zt && !imp.zc : (imp.b.length === 0 && imp.a.length === 0 && imp.zc && !imp.zt)), `${pn} ${theme} ${m} rapport imprimé : texte ${imp.len}, produit lu ${imp.prod}, zones ${imp.zt ? 'traitées' : imp.zc ? 'concernées' : '—'}, mots interdits [${[...new Set(imp.b.concat(imp.a))].join(', ')}]`);
      if (pn === 'bureau' && theme === 'light') {
        const pdf = await S.ev(`const r=await rapportDocument('i1'); if(!r||!r.pdf) return {err:JSON.stringify(r)}; const t=(r.pdf.match(/\\(((?:\\\\.|[^\\\\)])*)\\) Tj/g)||[]).map(x=>x.slice(1,-4).replace(/\\\\(.)/g,'$1')).join(' ');
          return {len:t.length, b:(t.match(new RegExp('${BIOCIDE}','ig'))||[]).map(s=>s.toLowerCase()), zc:/Zones concernées/.test(t), zt:/Zones traitées/.test(t), prod:/Raccord laiton/.test(t)};`);
        ligne(!pdf.err && pdf.len > 200 && pdf.prod && (est3d ? pdf.b.length > 0 && pdf.zt : pdf.b.length === 0 && pdf.zc), `${m} PDF du rapport : ${pdf.err || ('texte ' + pdf.len + ', biocide [' + [...new Set(pdf.b)].join(', ') + '], zones ' + (pdf.zt ? 'traitées' : pdf.zc ? 'concernées' : '—'))}`);
      }
    }
  }
  /* le masque, rejoué hors bêta : la fonction RÉELLE de la page avec BETA_ESSAI = faux */
  for (const m of ['plomberie', 'chauffage']) {
    await S.metier(m);
    const r = await S.ev(`const f=new Function('BETA_ESSAI','return ('+metierBloque.toString()+')')(false); const sauve={e:db.enveloppes,m:db.mouvements};
      db.enveloppes=[]; db.mouvements=[]; const vide=[f('enveloppes'),f('saisieConso'),f('boxes'),f('registre')];
      db.enveloppes=[{id:'e1',clientNom:'X'}]; db.mouvements=[{id:'m1',boxId:'b1'}]; const plein=[f('enveloppes'),f('saisieConso'),f('boxes'),f('registre')];
      db.mouvements=[{id:'m2',boxId:STOCKAGE_ID}]; const stockage=[f('saisieConso')];
      db.enveloppes=sauve.e; db.mouvements=sauve.m; return {vide,plein,stockage};`);
    ligne(JSON.stringify(r) === JSON.stringify({ vide: [true, true, true, true], plein: [false, false, true, true], stockage: [true] }), `${m} metierBloque hors bêta (page réelle) : ${JSON.stringify(r)}`);
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗   · erreurs de page : ' + JSON.stringify(S.exceptions.slice(0, 3)));
  S.fermer();
})().catch(e => { console.error(e); process.exit(1); });
