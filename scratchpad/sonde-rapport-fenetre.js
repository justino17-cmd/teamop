/* Sonde (relecture v744) : dans la VRAIE page (bêta locale, 127.0.0.1), la fenêtre du rapport
   imprimé s'ouvre-t-elle DANS le geste, AVANT d'attendre le réseau ? Ouverte après deux
   allers-retours au serveur, le navigateur la bloquait. On relève l'ORDRE : `window.open` contre
   `photosResoudre` et `planImgsResoudre` (enveloppées pour noter leur passage, sans rien changer).
   Puis : « non » à la question referme la fenêtre, et le texte d'un PDF n'a plus de « ? ».
   SOURCE=<bêta d'avant> pour la contre-épreuve. */
const path = require('path');
const { ouvrir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const v = (t, a, b) => { const c = JSON.stringify(a) === JSON.stringify(b); c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → reçu ' + JSON.stringify(a) + ', attendu ' + JSON.stringify(b))); };
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  try {
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
    const r = await S.ev(`
      db.users=(db.users||[]).filter(u=>u.id!=='u-rf'); db.users.push({id:'u-rf',prenom:'Justin',nom:'Sonde',login:'rf',role:'admin',actif:true,pref:{}});
      db.clients=(db.clients||[]).filter(c=>c.id!=='cli-rf'); db.clients.push({id:'cli-rf',nom:'Café Sonde',type:'pro',_m:1});
      const u=db.users.find(x=>x.id==='u-rf'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){}
      const P='piece:'+'a1b2c3d4'.repeat(8);   // une photo qui vit sur le serveur, contenu pas encore là
      db.plansSite=db.plansSite||{}; db.plansSite['cli-rf']=[{id:'pl-rf',nom:'Salle',mode:'img',img:'piece:'+'b2c3d4e5'.repeat(8),version:1,rooms:[],historique:[],postes:[{id:'q1',num:1,x:20,y:30,type:'appat'}]}];
      db.interventions=(db.interventions||[]).filter(i=>i.id!=='int-rf');
      db.interventions.push({id:'int-rf',titre:'Passage — sonde fenêtre',clientId:'cli-rf',date:todayISO(),heure:'10:00',statut:'terminee',photos:[P],compteRendu:'Consommation \\u2192 à revoir \\u2022 dose \\u2265 5 \\u03BCg \\u2713'});
      const trace=[]; window.__trace=trace;
      const oPh=window.photosResoudre, oPl=window.planImgsResoudre;
      window.photosResoudre=async(...a)=>{ trace.push('photos'); return {n:0}; };
      window.planImgsResoudre=async(...a)=>{ trace.push('plans'); return {n:0,reste:1}; };
      const fen=[]; window.open=function(){ trace.push('open'); const w={ecrit:'',ferme:false,document:{write(s){ w.ecrit+=s; },close(){}},focus(){},print(){},close(){ w.ferme=true; },confirm(){ trace.push('question-dans-la-fenetre'); return window.__rep; }}; fen.push(w); return w; };
      window.confirm=()=>{ trace.push('question-derriere'); return window.__rep; };
      window.__rep=true; await printRapport('int-rf');
      const oui={trace:trace.slice(), ecrit:fen[0]?fen[0].ecrit.length:0, rapport:fen[0]?/RAPPORT D'INTERVENTION/.test(fen[0].ecrit):false};
      trace.length=0; fen.length=0; window.__rep=false; await printRapport('int-rf');
      const non={trace:trace.slice(), ferme:fen[0]?fen[0].ferme:null, rapport:fen[0]?/RAPPORT D'INTERVENTION/.test(fen[0].ecrit):false};
      window.photosResoudre=oPh; window.planImgsResoudre=oPl;
      const i=db.interventions.find(x=>x.id==='int-rf');
      const pdf=typeof rapportPdfStr==='function'?rapportPdfStr(i,docEntete(i.rapportModele),{}):'';
      const ligne=(pdf.match(/\\((Consommation[^)]*)\\) Tj/)||[])[1]||'';
      return {oui,non,ligne,transl:typeof _pdfTranslit==='function'};`);
    console.log(JSON.stringify(r));
    v('⛔ la fenêtre s\'ouvre AVANT d\'attendre photos et plans', r.oui.trace.filter(x => !/question/.test(x)), ['open', 'photos', 'plans']);
    v('   la puce est dans le texte, en WinAnsi (149)', r.ligne.includes('\x95'), true);
    v('   la question se pose DANS la fenêtre (qui a la main), pas derrière', r.oui.trace.filter(x => /question/.test(x)), ['question-dans-la-fenetre', 'question-dans-la-fenetre']);
    v('   « oui » : le rapport est écrit dans cette fenêtre', r.oui.rapport, true);
    v('⛔ « non » : la fenêtre se referme, sans rapport', [r.non.ferme, r.non.rapport], [true, false]);
    v('⛔ le texte du PDF : plus aucun « ? » (flèche, puce, ≥, µ, coche)', [r.ligne.includes('?'), r.ligne.includes('->'), r.ligne.includes('>= 5'), r.ligne.includes('OK')], [false, true, true, true]);
  } finally { await S.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
