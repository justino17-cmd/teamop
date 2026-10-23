/* ══ SONDE — LE COURRIER DES AGENTS DANS LA TOUR (23 octobre 2026, cahier §3, §4, §8) ═══════════════════════════════════
   Ce que la Tour montre de l'autonomie commerciale : sous chaque brouillon, le CONTRÔLE QUALITÉ (« À revoir » avec ses raisons, « non fait », « passé ») et l'AUTHENTIFICATION de
   l'expéditeur ; l'onglet « Courrier des agents » (la signature de Léa, Camille et Chloé, les connaissances que Louis propose et que Justin SEUL valide). Tour réelle servie en local
   (sonde-tour-theme.js), l'API SIMULÉE dans la page — aucune requête ne sort, aucune donnée réelle.
   Jour ET nuit, 1440 ET 1100 px, plus un téléphone (encoches posées). Chaque contrôle prouve d'abord sa population.
     · les trois brouillons montrent chacun le bon état de contrôle (à revoir + 3 raisons / non fait / passé) et la bonne authentification — LUS dans l'écran ;
     · l'onglet affiche trois signatures, 2 propositions (dont une sans réponse), 2 connaissances validées ; rien ne déborde, pas de défilement latéral RÉEL ;
     · les champs sont à 16 px (pas de zoom d'iPhone), les boutons ≥ 44 px au doigt ;
     · « Valider » envoie la question et la réponse CORRIGÉES par Justin (corps de la requête lu) ; « Enregistrer » une signature envoie l'agent et son rôle ;
     · le texte de l'encadré « À revoir » est lisible : le contraste CALCULÉ de son encre sur son fond est ≥ 4,5.
   Usage : node scratchpad/sonde-tour-courrier-agents.js    PROFILS=1440:light  CAPTURES=<dossier> */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const { decoder, contraste, lireCouleur } = require('./png.js');
const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/courrier-agents-captures';
fs.mkdirSync(CAP, { recursive: true });
let nOk = 0, nKo = 0;
const v = (t, cond, detail) => { cond ? nOk++ : nKo++; console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };

const SIMU = String.raw`
(function(){
  if(window.__simuCourrier) return 1; window.__simuCourrier=1;
  var N=Date.now(), H=3600000;
  var AGS=[['victor','Victor','Chef d’orchestre','auto'],['camille','Camille','Courrier et support','auto'],['lea','Léa','Onboarding et fidélisation','auto'],['chloe','Chloé','Devis et interventions','auto'],['louis','Louis','Documentation et aide','brouillon'],['hugo','Hugo','Paiements et accès','brouillon']];
  var VAL=['abc1','abc2','abc3'].map(function(f,i){ return {id:'v'+i,agent:i===2?'chloe':i===1?'camille':'lea',type:'envoyer_mail',statut:'en_attente',ts:N-(i+1)*H,resume:'Réponse à une demande d’une entreprise de nettoyage industriel et de désinsectisation de locaux alimentaires',params:{fil:f}}; });
  var BR={
    abc1:{agent:'lea',a:'dirigeant@entreprise-tres-longue-adresse-de-demonstration.example',objet:'Votre inscription sur teamop.fr',texte:'Bonjour,\n\nNous vous remercions pour votre inscription.',source:'inscription',entreprise:'Établissements Dupont-Lefèvre Nettoyage Industriel',etat:'attente',empreinte:'e1',echecs:0,signature:'Léa — Assistante virtuelle — Équipe TeamOP\ncontact@teamop.fr · teamop.fr',
      controle:{etat:'a_revoir',fautes:['Le courriel parle de gratuité, ce que personne n’a promis.','Aucune question ne termine le courriel.','Le tutoiement est employé alors que nous vouvoyons.'],juge:'echec',reecrit:true},authentifie:true},
    abc2:{agent:'camille',a:'prospect@exemple.example',objet:'Re: Votre logiciel',texte:'Bonjour,\n\nMerci de votre message.',source:'courrier',entreprise:'',etat:'attente',empreinte:'e2',echecs:0,signature:'Camille — Assistante virtuelle — Équipe TeamOP\ncontact@teamop.fr · teamop.fr',controle:{etat:'bon',fautes:[],juge:'ok',reecrit:false},authentifie:true},
    abc3:{agent:'chloe',a:'autre@exemple.example',objet:'Notre proposition',texte:'Bonjour,\n\nVoici notre proposition.',source:'proposition',entreprise:'',etat:'attente',empreinte:'e3',echecs:0,signature:'Chloé — Assistante virtuelle — Équipe TeamOP\ncontact@teamop.fr · teamop.fr',controle:{etat:'non_verifie',fautes:[],juge:'indisponible',reecrit:false},authentifie:false}};
  var SIG={ok:true,equipe:'Équipe TeamOP',site:'teamop.fr',agents:['lea','camille','chloe','louis'].map(function(id){ var a=AGS.filter(function(x){return x[0]===id;})[0]; return {agent:id,nom:a[1],role:id==='chloe'?'Assistante virtuelle chargée des propositions sur mesure':'Assistante virtuelle',defaut:'Assistante virtuelle',apercu:a[1]+' — Assistante virtuelle — Équipe TeamOP\ncontact@teamop.fr · teamop.fr'}; })};
  var CON={ok:true,entrees:[
    {id:'cn00000001',question:'Peut-on exporter ses factures en PDF depuis une entreprise de désinsectisation avec plusieurs sociétés ?',reponse:'',etat:'propose',source:'camille',ts:N-H,decideTs:0,decidePar:''},
    {id:'cn00000002',question:'Existe-t-il une application pour iPhone ?',reponse:'Oui, l’application s’installe depuis le navigateur sur l’écran d’accueil.',etat:'propose',source:'justin',ts:N-2*H,decideTs:0,decidePar:''},
    {id:'cn00000003',question:'Les devis partent-ils en PDF par courriel ?',reponse:'Oui, un devis part en PDF joint, avec le nom et le logo de la société choisie sur le devis.',etat:'valide',source:'justin',ts:N-9*H,decideTs:N-8*H,decidePar:'Justin'},
    {id:'cn00000004',question:'Peut-on utiliser OP GESTION hors ligne ?',reponse:'Oui, les données se synchronisent au retour du réseau.',etat:'valide',source:'camille',ts:N-10*H,decideTs:N-9*H,decidePar:'Justin'}]};
  window.__posts=[];
  var json=function(st,d){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },20); }); };
  var prev=window.fetch;
  window.fetch=function(u,o){
    var s=String(u); if(s.indexOf('https://api.teamop.fr')!==0) return prev(u,o);
    var p=s.slice('https://api.teamop.fr'.length), chemin=p.split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
    if(!/^\/api\/monitor\/(agents|conversations)/.test(chemin)) return prev(u,o);
    if(meth==='POST'){ window.__posts.push({chemin:chemin,corps:JSON.parse(o.body)}); return json(200,{ok:true}); }
    if(chemin==='/api/monitor/agents') return json(200,{ok:true,illisible:false,pause:{actif:false},enAttente:3,cleOk:true,agents:AGS.map(function(a){ return {id:a[0],nom:a[1],role:a[2],mode:a[3],couche:'Équipe',cerveau:true}; })});
    if(chemin==='/api/monitor/agents/validations') return json(200,{ok:true,validations:VAL});
    if(chemin==='/api/monitor/agents/brouillons') return json(200,BR);
    if(chemin==='/api/monitor/agents/signatures') return json(200,SIG);
    if(chemin==='/api/monitor/agents/connaissances') return json(200,CON);
    if(chemin==='/api/monitor/agents/journal') return json(200,{ok:true,journal:[]});
    if(chemin==='/api/monitor/agents/taches') return json(200,{ok:true,taches:[]});
    if(chemin==='/api/monitor/conversations') return json(200,{ok:true,fils:[],nonLus:0,agents:[]});
    return json(404,{error:'route simulée absente'});
  };
  return 1;
})()`;

async function main() {
  const S = await demarrer();
  console.log('Sonde du Courrier des agents — tour.html ' + S.version);
  try {
    const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'light'], ['1100', 'dark'], ['telephone', 'dark']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
    for (const [larg, mode] of profils) {
      console.log('\n── ' + larg + ' · ' + (mode === 'light' ? 'jour' : 'nuit') + ' ──');
      const tel = larg === 'telephone';
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode);
      const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 900, deviceScaleFactor: 1, mobile: false });
      const nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      await ev(SIMU);
      await ev(`window.confirm=()=>true; setTab('agents'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return typeof AG!=='undefined' && AG.loaded && AG.lec.validations===1 && AG.br.lec===1`)) break; }
      await ev(`agSec('valid'); return 1;`); await ev(APAISER);

      /* ── 1. les brouillons : contrôle qualité et authentification ── */
      const B = await ev(`${STABLE} const ap=[...document.querySelectorAll('.ag-apercu')];
        return {n:ap.length, cartes:ap.map(a=>({ctrl:[...a.querySelectorAll('.ag-ctrl')].map(e=>({t:e.textContent.replace(/[\\u00a0\\u202f]/g,' '),cl:e.className,li:e.querySelectorAll('li').length}))}))};`);
      v('(population) trois brouillons lus dans l’écran', B.n === 3, JSON.stringify(B.n));
      const [c1, c2, c3] = B.cartes.map(x => x.ctrl);
      v('⛔ Léa « à revoir » : l’encadré dit POURQUOI (3 raisons) et que le courriel a déjà été réécrit', c1 && c1[0] && /À revoir/.test(c1[0].t) && c1[0].li === 3 && /réécrit une fois/.test(c1[0].t) && /revoir/.test(c1[0].cl), JSON.stringify(c1));
      v('…et l’adresse de Léa est vérifiée : pas d’encadré d’authentification (la source n’est pas un courrier reçu)', c1.length === 1, JSON.stringify(c1.map(x => x.cl)));
      v('Camille « passé » + « Expéditeur vérifié »', c2.length === 2 && /Contrôle qualité passé/.test(c2[0].t) && /Expéditeur vérifié/.test(c2[1].t), JSON.stringify(c2));
      v('⛔ Chloé « non fait » + « Expéditeur non vérifié : ne partira jamais seul »', c3.length === 2 && /Contrôle qualité non fait/.test(c3[0].t) && /Expéditeur non vérifié/.test(c3[1].t) && /jamais seul/.test(c3[1].t), JSON.stringify(c3));
      await c.envoyer('Page.captureScreenshot', { format: 'png' }).then(r => fs.writeFileSync(path.join(CAP, '01-brouillons-' + nom + '.png'), Buffer.from(r.data, 'base64')));
      /* le contraste se lit AU PIXEL (la vitre et le fond translucide se composent : les additionner à la main ment) : le fond = la couleur la plus fréquente de la capture de l'élément,
         l'encre = sa couleur calculée */
      const cibles = await ev(`const e=[...document.querySelectorAll('.ag-ctrl')]; return e.map(x=>{ x.scrollIntoView({block:'center'}); return null; }).length;`);
      v('(population) les encadrés de contrôle sont là (3 brouillons : 5 encadrés)', cibles === 5, String(cibles));
      let pire = 99, mesures = 0;
      for (let k = 0; k < 5; k++) {
        const R = await ev(`${STABLE} const e=document.querySelectorAll('.ag-ctrl')[${k}]; e.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,200)); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,c:getComputedStyle(e).color};`);
        const img = decoder(Buffer.from((await c.envoyer('Page.captureScreenshot', { format: 'png', clip: { x: R.x + 3, y: R.y + 3, width: Math.max(4, R.w - 6), height: Math.max(4, R.h - 6), scale: 1 } })).data, 'base64'));
        const H = new Map(); let fond = null, max = 0;
        for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const i = (y * img.w + x) * 4, kk = (img.data[i] >> 2) + ',' + (img.data[i + 1] >> 2) + ',' + (img.data[i + 2] >> 2), n = (H.get(kk) || 0) + 1; H.set(kk, n); if (n > max) { max = n; fond = [img.data[i], img.data[i + 1], img.data[i + 2]]; } }
        const encre = lireCouleur(R.c);
        if (fond && encre) { mesures++; pire = Math.min(pire, contraste(fond, encre)); }
      }
      v('⛔ l’encre des encadrés se lit, MESURÉE AU PIXEL sur chacun (' + mesures + '/5, le pire : ' + pire + ', seuil 4,5)', mesures === 5 && pire >= 4.5, String(pire));

      /* ── 2. l’onglet « Courrier des agents » ── */
      await ev(`agSec('courrier'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return AG.cour.sigLec===1 && AG.cour.conLec===1`)) break; }
      await ev(APAISER);
      const C = await ev(`${STABLE} const q=s=>[...document.querySelectorAll(s)];
        return {onglet:(q('.ag-onglets button.on')[0]||{}).textContent, sig:q('input[id^="ag-sig-"]').length, apercus:q('.ag-sav .sig').map(e=>e.textContent.replace(/[\\u00a0\\u202f]/g,' ')), roleChloe:(document.getElementById('ag-sig-chloe')||{}).value,
          prop:q('[id^="ag-cn-q-"]').length, valid:q('.ag-ligne b').filter(b=>/devis partent|hors ligne/.test(b.textContent)).length, vide:q('.ag-ligne span').some(s=>/écris-la/.test(s.textContent)),
          tailles:q('.ag-sav input, .ag-sav textarea').map(e=>parseFloat(getComputedStyle(e).fontSize)), boutons:q('.ag-sav .ag-btn, .ag-liste .ag-btn').map(e=>Math.round(e.getBoundingClientRect().height)), nBtn:q('.ag-liste .ag-btn').length};`);
      v('(population) l’onglet est « Courrier des agents », avec 3 signatures + l’équipe (4 champs), 2 propositions + le formulaire d’ajout, 2 validées', C.onglet === 'Courrier des agents' && C.sig === 4 && C.prop === 2 && C.valid === 2, JSON.stringify(C));
      v('les aperçus de signature sont ceux du serveur (« Léa — Assistante virtuelle — Équipe TeamOP »)', C.apercus.length === 3 && C.apercus.every(t => /Assistante virtuelle — Équipe TeamOP/.test(t) && !/Justin/.test(t)), JSON.stringify(C.apercus));
      v('la proposition sans réponse le DIT (« Louis n’a pas la réponse : écris-la »)', C.vide === true);
      v('⛔ tous les champs sont à 16 px au moins (Safari ne zoome pas au toucher)', C.tailles.length >= 8 && C.tailles.every(t => t >= 16), JSON.stringify(C.tailles));
      if (tel) v('⛔ au doigt : tous les boutons font au moins 44 px de haut', C.boutons.length >= 8 && C.boutons.every(h => h >= 44), JSON.stringify(C.boutons));
      const D = await ev(`${STABLE} window.scrollTo(9999,0); await new Promise(r=>setTimeout(r,700)); const a=window.scrollX; window.scrollTo(9999,0); await new Promise(r=>setTimeout(r,300)); const b=window.scrollX; window.scrollTo(0,0); return {a,b,larg:document.documentElement.clientWidth};`);
      v('aucun défilement latéral RÉEL (deux lectures)', D.a === 0 && D.b === 0, JSON.stringify(D));
      await c.envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }).then(r => fs.writeFileSync(path.join(CAP, '02-courrier-' + nom + '.png'), Buffer.from(r.data, 'base64')));

      /* ── 3. les gestes : la requête envoyée est celle que Justin a sous les yeux ── */
      await ev(`document.getElementById('ag-cn-q-cn00000001').value='Peut-on exporter ses factures en PDF ?'; document.getElementById('ag-cn-r-cn00000001').value='Oui, par courriel.'; agCnDecider('cn00000001','valider'); return 1;`);
      await dormir(400);
      const P1 = await ev(`return window.__posts.filter(p=>/connaissances/.test(p.chemin));`);
      v('⛔ « Valider » envoie la question ET la réponse corrigées, avec la décision', P1.length === 1 && P1[0].corps.decision === 'valider' && P1[0].corps.id === 'cn00000001' && P1[0].corps.question === 'Peut-on exporter ses factures en PDF ?' && P1[0].corps.reponse === 'Oui, par courriel.', JSON.stringify(P1));
      await ev(`AG.cour.sigLec=1; return 1;`); await dormir(500);
      await ev(`document.getElementById('ag-cn-r-cn00000002') && (document.getElementById('ag-cn-r-cn00000002').value=''); return 1;`);
      await ev(`agCnDecider('cn00000002','valider'); return 1;`); await dormir(300);
      const P2 = await ev(`return window.__posts.filter(p=>/connaissances/.test(p.chemin)).length;`);
      v('⛔ « Valider » avec une réponse vide : rien n’est envoyé (la page le dit)', P2 === 1, String(P2));
      await ev(`document.getElementById('ag-sig-lea').value='Conseillère virtuelle'; agSigEnreg('lea'); return 1;`); await dormir(400);
      const P3 = await ev(`return window.__posts.filter(p=>/signatures/.test(p.chemin));`);
      v('« Enregistrer » une signature envoie l’agent et son rôle', P3.length === 1 && P3[0].corps.agent === 'lea' && P3[0].corps.role === 'Conseillère virtuelle', JSON.stringify(P3));
      v('aucune exception JavaScript', o.exceptions.length === 0, JSON.stringify(o.exceptions));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + nOk + ' ✓  ' + nKo + ' ✗'); process.exit(nKo ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
