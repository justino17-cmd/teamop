/* ELAN, 26 septembre 2026 : « chez elan ça a recréé un compte admin » — OP Admin @florent-3.
   Cette sonde rejoue, au navigateur, le chemin EXACT d'un appareil qui rejoint une entreprise sans
   base locale (navigateur neuf, navigation privée, stockage vidé par Safari) : le lien de connexion
   (`#entreprise=…`, par la vraie `teamopLienCheck`), les deux rechargements, `load()`, `boot()`,
   PUIS la vraie synchro — `syncInit`, `docEquipe`, le premier instantané — contre un faux serveur
   posé dans la page (fetch intercepté avant tout script) qui rend le document d'équipe qu'on lui
   donne et garde ce que l'appareil lui ENVOIE.

   ⛔ La bêta n'a pas de compte de départ (`BETA_ESSAI`) : le défaut n'y existe pas. On sert donc une
   copie de la bêta où SEUL ce drapeau vaut `false` — le chemin de production, sans aucune donnée
   d'entreprise (préfixe elanB_, 127.0.0.1, aucun réseau). Jamais app.html.

   Deux cas, et le second compte autant que le premier :
     A. entreprise EXISTANTE (un vrai « florent », un ancien fantôme « florent-2 ») → l'appareil
        ne fabrique AUCUN compte, et n'en ENVOIE aucun au serveur ;
     B. entreprise NEUVE (document d'équipe vide) → la porte d'entrée existe, une seule, sous
        l'identifiant de départ et le mot de passe provisoire du lien.
   Usage : SOURCE=/chemin/beta.html node scratchpad/sonde-admin-fantome.js */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('./pilote.js');
const SP = '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad';
const SOURCE = process.env.SOURCE || path.join(__dirname, '..', 'beta.html');

let ok = 0, ko = 0;
const vrai = (t, c, detail) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (detail !== undefined ? '\n      ' + JSON.stringify(detail) : '')); } };

function copieProduction() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const n = (src.match(/const BETA_ESSAI=true;/g) || []).length;
  if (n !== 1) throw new Error('drapeau BETA_ESSAI trouvé ' + n + ' fois (attendu : 1)');
  const f = path.join(SP, 'essai-production.html');
  fs.writeFileSync(f, src.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;'));
  return f;
}

/* Le faux serveur : posé AVANT tout script de chaque document. Il ne répond qu'aux trois routes du
   document d'équipe ; tout le reste part au vrai fetch, qui échoue (aucun réseau ici) — comme un
   appareil en bord de réseau, ce qui laisse le lien passer (`lienEspaceConnu` → « incertain »). */
const FAUX_SERVEUR = `(function(){
  const vrai=window.fetch.bind(window);
  const lireDoc=()=>{ try{ return JSON.parse(sessionStorage.getItem('__doc_faux')||'null'); }catch(e){ return null; } };
  window.fetch=async function(u,o){ const url=String((u&&u.url)||u||'');
    const rep=(j,s)=>new Response(JSON.stringify(j),{status:s||200,headers:{'Content-Type':'application/json'}});
    if(url.indexOf('/api/doc/lire')>=0){ const d=lireDoc(); return rep({doc:d,v:d?1:0}); }
    if(url.indexOf('/api/doc/ecrire')>=0){ let c={}; try{ c=JSON.parse((o&&o.body)||'{}'); }catch(e){}
      const l=JSON.parse(sessionStorage.getItem('__ecrits')||'[]'); l.push(c.doc||null); sessionStorage.setItem('__ecrits',JSON.stringify(l.slice(-5)));
      return rep({ok:true,v:2}); }
    if(url.indexOf('/api/doc/attendre')>=0){ await new Promise(r=>setTimeout(r,30000)); return rep({v:1}); }
    return vrai(u,o); };
})();`;

const H = c => c.repeat(64);
/* Un document d'équipe EN CLAIR (`db`, l'ancien format que `syncReadRemote` lit encore) : une
   base complète venue de l'application elle-même, dont on ne remplace que les comptes. */
const EQUIPE_EXISTANTE = `
  const base=JSON.parse(JSON.stringify(db)); base.users=[
    {id:'u-bruno-essai',prenom:'Bruno',nom:'Folrent',login:'florent',role:'admin',pwdHash:'${H('b')}',email:'bruno@exemple.invalid',actif:true},
    {id:'u-ancien-fantome',prenom:'OP',nom:'Admin',login:'florent-2',role:'admin',pinHash:'${H('c')}',actif:true,loginConflit:'florent'}];
  return JSON.stringify({db:JSON.stringify(base),ts:Date.now()-1000,writer:'un-autre-appareil'});`;

async function rejoindre(S, docEquipe) {
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: FAUX_SERVEUR });
  const mh = await S.ev(`const mh=await sha256('Provisoire-ELAN!');
    const o={t:'t-essai-fantome',k:'k-essai-fantome-0123456789',n:'ELAN essai',a:'florent',mh:mh};
    const code=btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    ${docEquipe ? `sessionStorage.setItem('__doc_faux', (function(){ ${docEquipe} })());` : `sessionStorage.removeItem('__doc_faux');`}
    sessionStorage.removeItem('__ecrits');
    window.horsLigneDebut=function(){};
    setTimeout(()=>{ location.hash='entreprise='+code; location.reload(); },50); return mh;`);
  await dormir(3000);
  /* le lien vide l'appareil et recharge ; on attend l'application ET le premier instantané */
  let pret = false;
  for (let i = 0; i < 150; i++) { await dormir(300);
    try { if (await S.ev(`return typeof db!=='undefined' && !!db && localStorage.getItem('elanB_sync_team')==='t-essai-fantome' && !/entreprise=/.test(location.hash) && typeof _syncGotInitial!=='undefined' && _syncGotInitial===true`)) { pret = true; break; } } catch (e) {} }
  await dormir(2500);   // la fusion et le renvoi éventuel (syncPush attend un peu)
  return { mh, pret };
}

const LIRE = `const ecrits=JSON.parse(sessionStorage.getItem('__ecrits')||'[]');
  let envoyes=null; const dernier=ecrits.filter(Boolean).pop();
  if(dernier){ try{ const p=await syncReadRemote(dernier); envoyes=p?(JSON.parse(p).users||[]).map(u=>u.login):['(illisible)']; }catch(e){ envoyes=['(erreur '+e.message+')']; } }
  return {users:(db.users||[]).map(u=>({id:u.id,login:u.login,prenom:u.prenom,nom:u.nom,role:u.role,emp:annuaireEmpreinte(u),email:!!u.email})),
    ann:annuaireComptes().map(u=>u.login), envoyes, nbEcrits:ecrits.length,
    cles:['elanB_admin_login','elanB_admin_mdph','elanB_frais'].map(k=>localStorage.getItem(k))};`;

async function cas(nom, fichier, jeu) {
  console.log('\n' + nom);
  const S = await ouvrir({ source: fichier });
  try { return await jeu(S); } finally { S.fermer(); }
}

(async () => {
  const fichier = copieProduction();
  const version = (fs.readFileSync(fichier, 'utf8').match(/APP_VERSION\s*=\s*'([^']*)'/) || [])[1];
  console.log('Copie de production de la bêta ' + version + ' (BETA_ESSAI=false) — ' + path.basename(SOURCE));

  await cas('A. Un navigateur neuf rejoint une entreprise EXISTANTE par son lien', fichier, async S => {
    const { mh, pret } = await rejoindre(S, EQUIPE_EXISTANTE);
    vrai('le premier instantané de l’équipe est bien arrivé (la vraie synchro a tourné)', pret);
    const r = await S.ev(LIRE);
    console.log('    comptes sur l’appareil : ' + JSON.stringify(r.users.map(u => '@' + u.login + ' ' + u.prenom + ' ' + u.nom)));
    console.log('    envoyés au serveur : ' + JSON.stringify(r.envoyes) + ' (' + r.nbEcrits + ' écriture(s))');
    const neufs = r.users.filter(u => u.id !== 'u-bruno-essai' && u.id !== 'u-ancien-fantome');
    vrai('l’appareil n’a fabriqué AUCUN compte', neufs.length === 0, neufs.map(u => ({ login: u.login, id: u.id, role: u.role })));
    vrai('aucun « @florent-3 »', !r.users.some(u => u.login === 'florent-3'), r.users.map(u => u.login));
    vrai('rien de neuf n’est ENVOYÉ au serveur (l’équipe ne reçoit pas de fantôme)',
      !r.envoyes || r.envoyes.every(l => l === 'florent' || l === 'florent-2'), r.envoyes);
    vrai('aucun compte neuf ne partirait dans l’annuaire de connexion', r.ann.every(l => l === 'florent' || l === 'florent-2'), r.ann);
    const f = r.users.find(u => u.login === 'florent-3');
    if (f) console.log('    ⚠ @florent-3 : ' + f.prenom + ' ' + f.nom + ', rôle ' + f.role + ', mot de passe = '
      + (f.emp === mh ? 'le mot de passe PROVISOIRE du lien' : f.emp ? 'une empreinte posée' : 'aucun') + ', annuaire : ' + r.ann.includes('florent-3'));
    vrai('les clés du lien sont consommées (rien ne traîne pour plus tard)', r.cles[0] === null && r.cles[1] === null, r.cles);
  });

  await cas('B. Une entreprise NEUVE (document d’équipe vide) : la porte d’entrée existe, une seule', fichier, async S => {
    const { mh, pret } = await rejoindre(S, null);
    vrai('le premier instantané (vide) est bien arrivé', pret);
    const r = await S.ev(LIRE);
    console.log('    comptes : ' + JSON.stringify(r.users.map(u => '@' + u.login + ' (' + u.role + ', ' + u.id + ')')));
    vrai('un seul compte, administrateur', r.users.length === 1 && r.users[0].role === 'admin', r.users);
    vrai('…sous l’identifiant de départ de l’entreprise (« florent »)', !!r.users[0] && r.users[0].login === 'florent', r.users.map(u => u.login));
    vrai('…avec le mot de passe provisoire du lien', !!r.users[0] && r.users[0].emp === mh);
    vrai('…et l’identifiant FIXE du compte de départ (un identifiant aléatoire s’empile)', !!r.users[0] && r.users[0].id === 'u-op-admin', r.users[0] && r.users[0].id);
    vrai('les clés du lien sont consommées', r.cles[0] === null && r.cles[1] === null, r.cles);
  });

  /* ── Le PORTAIL : « 🚀 Activer mon espace » (espace.html, `activate`) pose les clés de l'entreprise,
     retire la base et le drapeau de vidage, et demande `elan_create_admin` : l'application ouvre
     « Créez votre compte administrateur ». Le bouton reste dans le fil des messages POUR TOUJOURS :
     le retoucher depuis un nouveau téléphone, pour une entreprise qui EXISTE, ne doit rien créer. */
  const activerPortail = async (S, docEquipe) => {
    await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: FAUX_SERVEUR });
    await S.ev(`${docEquipe ? `sessionStorage.setItem('__doc_faux', (function(){ ${docEquipe} })());` : `sessionStorage.removeItem('__doc_faux');`}
      sessionStorage.removeItem('__ecrits');
      localStorage.setItem('elanB_sync_team','t-essai-fantome'); localStorage.setItem('elanB_sync_secret','k-essai-fantome-0123456789'); localStorage.setItem('elanB_sync_on','1');
      localStorage.removeItem(STORE_KEY); localStorage.removeItem('elanB_vierge_v1'); localStorage.setItem('elanB_frais','1');
      sessionStorage.setItem('elanB_create_admin','1');
      window.horsLigneDebut=function(){};
      setTimeout(()=>location.reload(),50); return 1;`);
    await dormir(2500);
    let etat = null;
    for (let i = 0; i < 120; i++) { await dormir(300);
      try { etat = await S.ev(`if(typeof db==='undefined'||!db) return null; return {formulaire:!!document.getElementById('ca-prenom'), connexion:!!document.getElementById('li-login'), recu:(typeof _syncGotInitial!=='undefined'&&_syncGotInitial===true)};`);
        if (etat && (etat.recu || etat.formulaire)) break; } catch (e) {} }
    await dormir(2500);
    try { etat = await S.ev(`return {formulaire:!!document.getElementById('ca-prenom'), connexion:!!document.getElementById('li-login'), recu:(typeof _syncGotInitial!=='undefined'&&_syncGotInitial===true)};`); } catch (e) {}
    return etat || {};
  };
  /* La personne remplit le formulaire comme elle le ferait : SON nom, l'identifiant de l'entreprise. */
  const remplir = async S => {
    await S.ev(`window.horsLigneDebut=function(){}; const v=(i,x)=>{ const e=document.getElementById(i); if(e) e.value=x; };
      v('ca-prenom','Bruno'); v('ca-nom','Folrent'); v('ca-login','florent'); v('ca-pin','MotDePasse-2026'); v('ca-pin2','MotDePasse-2026');
      await submitCreateAdmin({preventDefault(){}}); return 1;`);
    for (let i = 0; i < 60; i++) { await dormir(300); try { if (await S.ev(`return typeof _syncGotInitial!=='undefined'&&_syncGotInitial===true`)) break; } catch (e) {} }
    await dormir(3000);
  };

  await cas('C. Portail : « Activer mon espace » retouché pour une entreprise EXISTANTE', fichier, async S => {
    const e = await activerPortail(S, EQUIPE_EXISTANTE);
    console.log('    écran : ' + (e.formulaire ? '« Créez votre compte administrateur »' : e.connexion ? 'connexion' : '?') + (e.recu ? ' · équipe lue' : ' · équipe PAS encore lue'));
    vrai('⛔ le formulaire « Créez votre compte administrateur » n’est PAS proposé (l’équipe a déjà ses comptes)', !e.formulaire, e);
    vrai('…c’est l’écran de connexion qui s’ouvre, une fois l’équipe lue', !!e.connexion && !!e.recu, e);
    if (e.formulaire) await remplir(S);   // l'ancienne version : on joue le geste jusqu'au bout pour voir ce qu'il fabrique
    const r = await S.ev(LIRE);
    console.log('    comptes : ' + JSON.stringify(r.users.map(u => '@' + u.login + ' ' + u.prenom + ' ' + u.nom)) + ' · envoyés : ' + JSON.stringify(r.envoyes));
    const neufs = r.users.filter(u => u.id !== 'u-bruno-essai' && u.id !== 'u-ancien-fantome');
    vrai('aucun compte fabriqué, rien de neuf envoyé à l’équipe', neufs.length === 0 && (!r.envoyes || r.envoyes.every(l => l === 'florent' || l === 'florent-2')), { neufs: neufs.map(u => '@' + u.login), envoyes: r.envoyes });
  });

  await cas('D. Portail : « Activer mon espace » pour une entreprise NEUVE — le formulaire est la porte', fichier, async S => {
    const e = await activerPortail(S, null);
    vrai('le formulaire « Créez votre compte administrateur » est proposé', !!e.formulaire, e);
    if (e.formulaire) await remplir(S);
    const r = await S.ev(LIRE);
    console.log('    comptes : ' + JSON.stringify(r.users.map(u => '@' + u.login + ' (' + u.role + ')')) + ' · envoyés : ' + JSON.stringify(r.envoyes));
    vrai('un seul compte, administrateur, à l’identifiant choisi', r.users.length === 1 && r.users[0].role === 'admin' && r.users[0].login === 'florent', r.users);
    vrai('…et il part à l’équipe', Array.isArray(r.envoyes) && r.envoyes.length === 1 && r.envoyes[0] === 'florent', r.envoyes);
  });

  console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
