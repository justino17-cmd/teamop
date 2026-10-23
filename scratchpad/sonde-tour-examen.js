/* ══ SONDE — L'ONGLET « EXAMEN » DE LA TOUR (23 octobre 2026) ═════════════════════════════════════════════════════════════════════
   Cahier §13. Justin : « je veux que tu testes tout comme je te l'explique quand tout est en ligne » ; « Faire passer l'examen à l'équipe » (« ah oui, ça c'est pas con »).
   tour.html servi en local, jour ET nuit, 1440 ET 1100 px, plus un téléphone. L'API est SIMULÉE DANS LA PAGE (aucune requête ne sort) : ce que le serveur fait de ces routes, c'est
   `test-2931` / `test-2932` ; ce que les fonctions de l'écran font de ses réponses, c'est `test-2933`. Ce qu'on prouve ici, et que les bancs sans page ne voient pas :
     · l'écran se dessine dans chaque état — repos (coût annoncé), en cours (neuf scénarios, appels, dollars), résultat (✓ ✗ … ?), clé montrée, illisible — sans exception ;
     · aucun défilement latéral (page et cartes), même avec un constat de 200 caractères sans espace ni une clé de 53 signes ;
     · ⛔ un verdict se lit par son SIGNE et son MOT, jamais par la seule teinte (✓ ✗ … ? + « Réussi », « Échec »…) ; chaque signe a un contraste ≥ 3:1 sur son fond (calculé sur les couleurs
       rendues ; les jetons de la Tour sont opaques) et les textes ≥ 4,5:1 ;
     · la conversation dépliée défile EN ELLE-MÊME (hauteur bornée) ; les cibles tactiles ≥ 44 px au téléphone ;
     · la clé s'affiche dans un encart d'alerte, ne dépasse pas la carte, disparaît à « J'ai copié la clé » ;
     · aucune exception JavaScript.
   Chaque contrôle prouve d'abord sa population. Usage : node scratchpad/sonde-tour-examen.js
     PROFILS=1440:light,1100:dark  CAPTURES=<dossier>  TOUR_FICHIER=<tour d'avant>  (contre-épreuve : la sonde doit TOMBER sur une Tour sans onglet Examen) */
'use strict';
const fs = require('fs'), path = require('path');
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');
const EX = require('../server/examen.js');

const CAP = process.env.CAPTURES || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/examen-captures';
fs.mkdirSync(CAP, { recursive: true });
const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined && !cond ? ' — ' + detail : '')); };
const cap = async (o, nom) => { const r = await o.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); };

/* Les données de l'API simulée : les VRAIS titres des neuf scénarios, des verdicts de chaque sorte, un constat sans espace de 200 signes. */
const LONG = 'https://exemple-tres-long.test/' + 'a'.repeat(170);
const scenarios = EX.SCENARIOS.map(s => {
  const verifs = [
    { libelle: 'Margaux répond elle-même, dans son fil', etat: 'ok', detail: '' },
    { libelle: 'personne d’autre n’est sollicité (un seul agent appelé)', etat: 'ok', detail: '' },
  ];
  let etat = 'ok';
  if (s.n === 2) { etat = 'ko'; verifs.push({ libelle: 'chargée (3 tâches), elle en passe une à un collègue', etat: 'ko', detail: 'aucune tâche passée ; charge de Camille : 4 ' + LONG }); }
  if (s.n === 6) { verifs.push({ libelle: 'Léa — signé « Léa » par le serveur (prénom de l’agent, ajouté à l’envoi)', etat: 'attente', detail: 'en attente de la signature par agent (chantier auto-commercial) — constat : signature ajoutée : « L’équipe TEAM OP »' }, { libelle: 'Léa — contrôle qualité du serveur vert sur chaque courriel', etat: 'attente', detail: 'en attente de le contrôle qualité automatique des mails (chantier auto-commercial)' }); }
  if (s.n === 7) { verifs.push({ libelle: 'remboursement — refus poli et clair', etat: 'attente', detail: 'en attente de la réponse « pas de remboursement, mais résiliable à tout moment » de Camille — constat : Nous revenons vers vous rapidement.' }); }
  if (s.n === 8) { etat = 'inconnu'; verifs.push({ libelle: 'vendredi — le bilan se termine normalement', etat: 'inconnu', detail: 'Claude a été en panne (ou le plafond de l’examen atteint) pendant ce scénario — à relancer' }); }
  if (s.n === 6 || s.n === 7) etat = 'ok';
  const conv = [{ fil: 'margaux', de: 'justin', nom: 'Justin', texte: 'Margaux, sur la compta, tu en es où ? Et le dossier DOS-900001, il a bien payé ?', systeme: false },
    { fil: 'margaux', de: 'margaux', nom: 'Margaux', texte: 'Sur la compta globale je ne vois que ce que le serveur me donne. Pour DOS-900001, oui, il a bien payé, formule pro.\nUne deuxième ligne, pour voir le retour à la ligne.', systeme: false },
    { fil: 'clients', de: 'systeme', nom: 'Système', texte: 'Camille a passé « Préparer la liste des questions » à Léa : j’ai trois travaux en cours.', systeme: true }];
  for (let i = 0; i < 24; i++) conv.push({ fil: 'equipe', de: 'victor', nom: 'Victor', texte: 'Message numéro ' + (i + 1) + ' : une phrase assez longue pour prendre de la place dans la conversation de l’essai, comme une vraie réponse.', systeme: false });
  return { n: s.n, cle: s.cle, titre: s.titre, etat, verifs, conversation: conv, appels: 3 + s.n, duree: 4 + s.n };
});
const bilan = { ok: scenarios.filter(s => s.etat === 'ok').length, ko: scenarios.filter(s => s.etat === 'ko').length, attente: 0, inconnu: scenarios.filter(s => s.etat === 'inconnu').length };

/* le simulateur de la messagerie (agents, fils, tâches…), LU dans la sonde voisine : une seule définition de ce que l'écran Agents reçoit */
const { analyserMentions } = require('../server/conversations.js');
const voisine = fs.readFileSync(path.join(__dirname, 'sonde-tour-messagerie.js'), 'utf8');
const mm = /const SIMU = String\.raw`([\s\S]*?)`;\n\n\/\* l'observateur/.exec(voisine);
if (!mm) { console.log('  ✗ le simulateur de la messagerie est introuvable dans sonde-tour-messagerie.js'); process.exit(1); }
const SIMU_AGENTS = new Function('analyserMentions', 'return String.raw`' + mm[1] + '`;')(analyserMentions);

const SIMU = String.raw`
(function(){
  if(window.__ex) return 1;
  var N=Date.now(), H=3600000;
  var SC=${JSON.stringify(scenarios)}, BIL=${JSON.stringify(bilan)};
  var etat=window.__ex={ posts:[], gets:0, courant:null, cle:null, resultats:[], echec:0, prochain:0, cleOk:true, nouvelleCle:'exam_'+'0123456789abcdef'.repeat(3), lancer:0 };
  var json=function(st,d,lent){ return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(d),{status:st,headers:{'Content-Type':'application/json'}})); },lent||20); }); };
  var resume=function(r){ return {id:r.id,debut:r.debut,fin:r.fin,duree:r.duree,source:r.source,etat:r.etat,raison:r.raison||'',bilan:r.bilan,appels:r.appels,usd:r.usd,scenarios:r.scenarios.map(function(s){ return {n:s.n,titre:s.titre,etat:s.etat}; })}; };
  etat.complet=function(id){ return etat.resultats.filter(function(r){ return r.id===id; })[0]; };
  var prev=window.fetch;
  window.fetch=function(u,o){
    var s=String(u); if(s.indexOf('https://api.teamop.fr')!==0) return prev(u,o);
    var chemin=s.slice('https://api.teamop.fr'.length).split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
    if(chemin==='/api/monitor/agents/examen'&&meth==='GET'){ etat.gets++;
      if(etat.echec>0){ etat.echec--; return json(503,{error:'Les fichiers de l’examen sont illisibles'}); }
      return json(200,{ok:true,cleOk:etat.cleOk,limites:{appelsMax:200,usdMax:12,moisUsdMax:40,parHeure:1,parJour:6},courant:etat.courant,dernier:0,prochainPossible:etat.prochain,
        cle:etat.cle?{existe:true,creeLe:N-2*H,par:'Justin'}:{existe:false},resultats:etat.resultats.map(resume)}); }
    if(chemin==='/api/monitor/agents/examen/resultat'&&meth==='GET'){ var id=(/id=([^&]+)/.exec(s)||[])[1]; var r=id?etat.complet(decodeURIComponent(id)):etat.resultats[0];
      return r?json(200,{ok:true,resultat:r}):json(404,{error:'Aucun résultat'}); }
    if(chemin==='/api/monitor/agents/examen/lancer'&&meth==='POST'){ etat.posts.push(['lancer']); etat.lancer++;
      etat.courant={id:'cour01',debut:Date.now(),source:'tour',appels:11,usd:0.31,appelsMax:200,usdMax:12,scenarios:SC.map(function(x,i){ return {n:x.n,titre:x.titre,etat:i<3?(i===1?'ko':'ok'):i===3?'en_cours':'a_venir'}; })};
      return json(202,{ok:true,id:'cour01',appelsMax:200,usdMax:12},300); }
    if(chemin==='/api/monitor/agents/examen/cle'&&meth==='POST'){ etat.posts.push(['cle']); etat.cle=true; return json(200,{ok:true,cle:etat.nouvelleCle,remplacee:false},200); }
    if(chemin==='/api/monitor/agents/examen/cle/supprimer'&&meth==='POST'){ etat.posts.push(['cle-supprimer']); etat.cle=null; return json(200,{ok:true,supprimee:true},200); }
    return prev(u,o);
  };
  etat.poserResultat=function(){ etat.resultats=[{id:'res001',debut:N-40*60000,fin:N-30*60000,duree:612,source:'cle',etat:'termine',bilan:BIL,appels:87,usd:1.84,scenarios:SC},
    {id:'res000',debut:N-30*H,fin:N-30*H+500000,duree:498,source:'tour',etat:'termine',bilan:{ok:9,ko:0,attente:0,inconnu:0},appels:90,usd:1.9,scenarios:SC.map(function(x){ return Object.assign({},x,{etat:'ok'}); })},
    {id:'res-1',debut:N-60*H,fin:0,duree:0,source:'tour',etat:'interrompu',raison:'le serveur a redémarré pendant l’examen',bilan:{ok:0,ko:0,attente:0,inconnu:0},appels:0,usd:0,scenarios:[]}]; };
  return 1;
})()`;

const ETAT = `${STABLE}
  const cs=e=>getComputedStyle(e), vue=document.getElementById('vue');
  const carte=[...document.querySelectorAll('.ex-carte')], q=s=>[...document.querySelectorAll(s)];
  const parse=c=>{ const m=/rgba?\(([^)]+)\)/.exec(c); if(!m) return null; const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const lumRGB=p=>{ const f=x=>{ x/=255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4); }; return 0.2126*f(p.r)+0.7152*f(p.g)+0.0722*f(p.b); };
  /* le fond RÉEL d'un élément : tous les fonds de ses ancêtres, composés du plus lointain au plus proche (un fond semi-transparent se pose sur ce qui est dessous) */
  const fondEff=e=>{ const pile=[]; for(let n=e;n;n=n.parentElement){ const p=parse(cs(n).backgroundColor); if(p&&p.a>0) pile.push(p); } let base={r:255,g:255,b:255}; const dark=matchMedia('(prefers-color-scheme: dark)').matches; if(dark) base={r:10,g:12,b:16};
    for(let i=pile.length-1;i>=0;i--){ const p=pile[i]; base={r:base.r*(1-p.a)+p.r*p.a,g:base.g*(1-p.a)+p.g*p.a,b:base.b*(1-p.a)+p.b*p.a}; } return base; };
  const ratioEl=e=>{ const f=parse(cs(e).color), b=fondEff(e); if(!f) return null; const x=lumRGB(f), y=lumRGB(b); return Math.round(((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05))*100)/100; };
  const signes=q('.ex-badge').map(e=>({t:e.textContent.trim(),c:e.className.replace('ex-badge','').trim(),r:ratioEl(e),fg:cs(e).color,bg:cs(e).backgroundColor})).filter(x=>x.t);
  const verifs=q('.ex-v').map(e=>({c:e.className.replace('ex-v','').trim(),signe:e.querySelector('i').textContent,mot:e.querySelector('.ex-sr')?e.querySelector('.ex-sr').textContent:'',r:ratioEl(e.querySelector('i')),rt:ratioEl(e.querySelector('div'))}));
  const petits=q('#vue button').filter(b=>{ const r=b.getBoundingClientRect(); return r.width>0&&r.height>0&&r.height<43.5; }).map(b=>b.textContent.trim().slice(0,30)+' '+Math.round(b.getBoundingClientRect().height));
  /* un élément dans un conteneur qui DÉFILE (la barre d'onglets) n'est pas un débordement de page : on remonte les ancêtres (règle du dépôt, dansRouleau) */
  const dansRouleau=e=>{ for(let n=e.parentElement;n&&n.id!=='vue';n=n.parentElement){ const o=cs(n).overflowX; if(o==='auto'||o==='scroll') return true; } return false; };
  const dep=[...document.querySelectorAll('#vue *')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.right>innerWidth+1&&!dansRouleau(e); }).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,30)+' →'+Math.round(e.getBoundingClientRect().right));
  const conv=document.querySelector('.ex-conv');
  return {texte:(vue.innerText||'').replace(/\\s+/g,' '), nCartes:carte.length, bouton:[...vue.querySelectorAll('button')].map(b=>({t:b.textContent.trim().slice(0,40),off:b.disabled,h:Math.round(b.getBoundingClientRect().height)})),
    signes, verifs, petits, dep, sx:document.documentElement.scrollWidth, iw:innerWidth, sxX:(window.scrollTo(9999,0),window.scrollX),
    convH:conv?Math.round(conv.getBoundingClientRect().height):0, convDefile:conv?conv.scrollHeight>conv.clientHeight+2:null,
    cleCode:document.querySelector('.ex-cle code')?{w:Math.round(document.querySelector('.ex-cle code').getBoundingClientRect().width),pw:Math.round(document.querySelector('.ex-cle').getBoundingClientRect().width),t:document.querySelector('.ex-cle code').textContent}:null,
    alerte:!!document.querySelector('.ex-cle[role="alert"]'), nSections:q('.ex-sc').length, nListe:q('.ex-liste li').length, cmd:!!document.querySelector('.ex-cmd'),
    conseil:q('.ex-cout span').map(e=>e.textContent), prog:q('.ex-prog li').length, toast:(document.getElementById('toast')||{}).textContent||''};`;

async function main() {
  const S = await demarrer();
  console.log('Sonde de l’examen — tour.html ' + S.version);
  try {
    const profils = [['1440', 'light'], ['1440', 'dark'], ['1100', 'light'], ['1100', 'dark'], ['telephone', 'dark'], ['telephone', 'light']].filter(p => !process.env.PROFILS || process.env.PROFILS.split(',').includes(p.join(':')));
    for (const [larg, mode] of profils) {
      console.log('\n── ' + larg + ' · ' + (mode === 'light' ? 'jour' : 'nuit') + ' ──');
      const tel = larg === 'telephone';
      const o = await onglet(S, tel ? 'telephone' : 'bureau', mode);
      const { c, ev } = o;
      if (!tel) await c.envoyer('Emulation.setDeviceMetricsOverride', { width: +larg, height: 900, deviceScaleFactor: 1, mobile: false });
      const nom = larg + '-' + (mode === 'light' ? 'jour' : 'nuit');
      await ev(SIMU_AGENTS); await ev(SIMU);
      await ev(`window.confirm=()=>true; setTab('agents'); return 1;`);
      for (let i = 0; i < 80; i++) { await dormir(100); if (await ev(`return typeof AG!=='undefined' && AG.loaded===true`)) break; }
      const aOnglet = await ev(`return typeof exVue==='function' && typeof agSec==='function'`);
      v('population : la Tour porte l’onglet Examen (exVue)', aOnglet === true);
      if (!aOnglet) { await o.fermer(); continue; }
      await ev(`agSec('examen'); return 1;`);
      for (let i = 0; i < 60; i++) { await dormir(100); if (await ev(`return !!document.querySelector('.ex-carte')`)) break; }
      await ev(APAISER);

      /* ── 1. repos : aucun résultat, aucune clé ── */
      let E = await ev(ETAT);
      v('population : l’onglet Examen est ouvert dans la barre (huit onglets, « Examen » choisi)', /Examen/.test(E.texte) && E.nCartes >= 2, JSON.stringify([E.nCartes]));
      v('⛔ le coût est annoncé AVANT de lancer : 200 appels, 12 $, budget du mois, 40 $ par mois pour l’examen, un par heure', E.conseil.length === 5 && /200 appels/.test(E.conseil[0]) && /12 \$/.test(E.conseil[1]) && /budget/.test(E.conseil[2]) && /40 \$ par mois/.test(E.conseil[3]) && /par heure/.test(E.conseil[4]), JSON.stringify(E.conseil));
      v('le bouton « Faire passer l’examen à l’équipe » est actif', E.bouton.some(b => /Faire passer l’examen à l’équipe/.test(b.t) && !b.off), JSON.stringify(E.bouton));
      v('« Aucun examen n’a encore été joué » (la lecture a réussi) et « Aucune clé n’est vivante »', /Aucun examen n’a encore été joué/.test(E.texte) && /Aucune clé n’est vivante/.test(E.texte));
      v('les deux commandes à donner à Claude Code sont là, sans clé', E.cmd && /\$CLE_EXAMEN/.test(E.texte) && !/exam_[a-f0-9]{20}/.test(E.texte));
      v('aucun défilement latéral, rien ne dépasse', E.sx <= E.iw && E.sxX === 0 && E.dep.length === 0, JSON.stringify([E.sx, E.iw, E.sxX, E.dep]));
      if (tel) v('au doigt : tous les boutons ≥ 44 px', E.petits.length === 0, JSON.stringify(E.petits));
      await cap(o, '01-repos-' + nom);

      /* ── 2. lancer → en cours ── */
      await ev(`window.__ex.posts.length=0; window.confirm=()=>false; document.querySelector('button[onclick="exLancer()"]').click(); return 1;`); await dormir(300);
      let P = await ev(`return window.__ex.posts.slice();`);
      v('⛔ « Faire passer l’examen » → « Non » à la confirmation : rien n’est parti', P.length === 0, JSON.stringify(P));
      await ev(`window.confirm=m=>{ window.__confirmMsg=m; return true; }; document.querySelector('button[onclick="exLancer()"]').click(); return 1;`);
      for (let i = 0; i < 40; i++) { await dormir(100); if (await ev(`return !!document.querySelector('.ex-prog')`)) break; }
      await ev(APAISER); E = await ev(ETAT);
      P = await ev(`return {posts:window.__ex.posts.slice(),msg:window.__confirmMsg,toast:(document.getElementById('toast')||{}).textContent};`);
      v('« Oui » : la route reçoit le lancement ; la confirmation dit le coût (200 appels, 12 $) et que rien de réel n’est touché', JSON.stringify(P.posts) === '[["lancer"]]' && /200 appels/.test(P.msg) && /12 \$/.test(P.msg) && /aucun vrai fil/.test(P.msg), JSON.stringify(P));
      v('⛔ en cours : « Examen en cours », les neuf scénarios avec leur état en TOUTES LETTRES, appels et dollars sur leurs plafonds', E.prog === 9 && /Examen en cours/.test(E.texte) && /11 appels sur 200 au plus/.test(E.texte) && /0,31 \$ sur 12 \$ au plus/.test(E.texte) && /en cours…/.test(E.texte) && /à venir/.test(E.texte) && /échec/.test(E.texte) && /réussi/.test(E.texte), E.texte.slice(0, 500));
      v('…et le bouton est grisé (« Examen en cours… »)', E.bouton.some(b => /Examen en cours…/.test(b.t) && b.off), JSON.stringify(E.bouton));
      v('…rien ne dépasse', E.sx <= E.iw && E.sxX === 0 && E.dep.length === 0, JSON.stringify([E.sx, E.iw, E.sxX, E.dep]));
      await cap(o, '02-en-cours-' + nom);

      /* ── 3. le résultat : ✓ ✗ … ? ── */
      await ev(`window.__ex.courant=null; window.__ex.poserResultat(); EX.voir=''; exCharger(); return 1;`);
      for (let i = 0; i < 60; i++) { await dormir(100); if (await ev(`return document.querySelectorAll('.ex-sc').length===9`)) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('population : neuf scénarios, trois examens gardés, le résultat lu', E.nSections === 9 && E.nListe === 3 && /Résultat/.test(E.texte), JSON.stringify([E.nSections, E.nListe]));
      v('⛔ le bilan se lit en mots : « ✓ 6 réussis », « ✗ 1 échec », « ? 1 à relancer »', /✓ 7 réussis/.test(E.texte) || /✓ 6 réussis/.test(E.texte), E.texte.slice(0, 400));
      v('⛔ un verdict = un SIGNE + un MOT (✓ Réussi, ✗ Échec, … En attente, ? À relancer), jamais la teinte seule', ['ok', 'ko', 'attente', 'inconnu'].every(k => E.verifs.some(x => x.c === k && x.signe && x.mot.length > 4)) && E.signes.some(s => s.t === '✓') && E.signes.some(s => s.t === '✗') && E.signes.some(s => s.t === '?'), JSON.stringify(E.verifs.map(x => [x.c, x.signe, x.mot]).slice(0, 8)));
      v('les « en attente » sont NOMMÉES (le module qui manque) et comptées sur leur scénario', /en attente de la signature par agent/.test(E.texte) && /3 en attente d’un module|2 en attente d’un module|1 en attente d’un module/.test(E.texte));
      const bas = E.signes.concat(E.verifs).filter(x => x.r !== null && x.r < 3).concat(E.verifs.filter(x => x.rt !== null && x.rt < 4.5));
      v('chaque signe est lisible sur son fond (contraste ≥ 3:1) et chaque texte de contrôle ≥ 4,5:1 — couleurs rendues, fonds composés', E.signes.length >= 9 && E.verifs.length >= 20 && bas.length === 0, JSON.stringify(bas.slice(0, 4)));
      v('aucun défilement latéral, même avec un constat de 200 signes sans espace', E.sx <= E.iw && E.sxX === 0 && E.dep.length === 0, JSON.stringify([E.sx, E.iw, E.sxX, E.dep]));
      if (tel) v('au doigt : tous les boutons ≥ 44 px', E.petits.length === 0, JSON.stringify(E.petits));
      await cap(o, '03-resultat-' + nom);
      await ev(`exBasculer('res001:2'); return 1;`); await ev(APAISER); E = await ev(ETAT);
      v('la conversation dépliée est BORNÉE (≤ 420 px) et défile en elle-même', E.convH > 100 && E.convH <= 421 && E.convDefile === true, JSON.stringify([E.convH, E.convDefile]));
      v('…sans défilement latéral', E.sx <= E.iw && E.sxX === 0 && E.dep.length === 0, JSON.stringify([E.sx, E.iw, E.sxX, E.dep]));
      await ev(`document.querySelector('.ex-conv').scrollIntoView({block:'center'}); return 1;`); await ev(APAISER);
      await cap(o, '04-conversation-' + nom);
      await ev(`exBasculer('res001:2'); exOuvrir('res-1'); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if (/interrompu/.test(await ev(`return document.getElementById('vue').innerText`))) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('un examen interrompu par un redémarrage se DIT (« interrompu : le serveur a redémarré… »)', /Cet examen a été interrompu/.test(E.texte) && /le serveur a redémarré/.test(E.texte));
      await ev(`exOuvrir('res000'); return 1;`); await dormir(500); await ev(APAISER); E = await ev(ETAT);
      v('rouvrir un ancien examen : ses neuf ✓', /✓ 9 réussis/.test(E.texte) && E.signes.filter(s => s.t === '✓').length >= 9);

      /* ── 4. la clé ── */
      await ev(`window.__ex.posts.length=0; document.querySelector('button[onclick="exCleCreer()"]').click(); return 1;`);
      for (let i = 0; i < 40; i++) { await dormir(100); if (await ev(`return !!document.querySelector('.ex-cle[role="alert"]')`)) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('⛔ la clé est MONTRÉE dans un encart d’alerte, entière, avec « Copier » et « J’ai copié la clé »', E.alerte && E.cleCode && /^exam_[a-f0-9]{48}$/.test(E.cleCode.t) && /ne sera plus jamais affichée/.test(E.texte) && E.bouton.some(b => /Copier la clé/.test(b.t)) && E.bouton.some(b => /J’ai copié la clé/.test(b.t)), JSON.stringify(E.cleCode));
      v('…elle tient dans l’encart (53 signes sans espace) et la page ne défile pas de côté', E.cleCode && E.cleCode.w <= E.cleCode.pw && E.sx <= E.iw && E.sxX === 0, JSON.stringify([E.cleCode, E.sx, E.iw]));
      if (tel) v('au doigt : tous les boutons ≥ 44 px', E.petits.length === 0, JSON.stringify(E.petits));
      await ev(`document.querySelector('.ex-cle').scrollIntoView({block:'center'}); return 1;`); await ev(APAISER);
      await cap(o, '05-cle-' + nom);
      await ev(`document.querySelector('button[onclick="exCleCacher()"]').click(); return 1;`); await ev(APAISER); E = await ev(ETAT);
      v('⛔ « J’ai copié la clé » : elle disparaît de la page, l’écran dit qu’elle existe et depuis quand', !E.alerte && !/exam_[a-f0-9]{20}/.test(E.texte) && /Une clé est vivante depuis le/.test(E.texte) && /Remplacer la clé/.test(E.texte) && /Supprimer la clé/.test(E.texte));
      await ev(`window.confirm=()=>true; document.querySelector('button[onclick="exCleSupprimer()"]').click(); return 1;`);
      for (let i = 0; i < 40; i++) { await dormir(100); if (/Aucune clé n’est vivante/.test(await ev(`return document.getElementById('vue').innerText`))) break; }
      E = await ev(ETAT); P = await ev(`return window.__ex.posts.slice();`);
      v('supprimer : la route est appelée, l’écran revient à « Aucune clé n’est vivante »', JSON.stringify(P) === '[["cle"],["cle-supprimer"]]' && /Aucune clé n’est vivante/.test(E.texte), JSON.stringify(P));

      /* ── 5. illisible ── */
      await ev(`window.__ex.echec=1; exCharger(); return 1;`);
      for (let i = 0; i < 30; i++) { await dormir(100); if (/n’a pas pu être lu/.test(await ev(`return document.getElementById('vue').innerText`))) break; }
      await ev(APAISER); E = await ev(ETAT);
      v('⛔ un 503 du serveur : « L’examen n’a pas pu être lu » + la raison + Réessayer — jamais « Aucun examen n’a eu lieu »', /n’a pas pu être lu/.test(E.texte) && /on ne sait pas si un examen est en cours/.test(E.texte) && E.bouton.some(b => /Réessayer/.test(b.t)) && !/Aucun examen n’a encore été joué/.test(E.texte), E.texte.slice(0, 300));
      await cap(o, '06-illisible-' + nom);
      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.log('  ✗ sonde morte : ' + (e && e.stack || e)); process.exit(1); });
