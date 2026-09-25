/* Sonde B6 : l'erreur console `syncInit` à la déconnexion. Bêta locale, 127.0.0.1.
   On relève TOUT ce que la console et les exceptions disent, avant et après logout(). */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:3,mobile:true});
  const erreurs=[];
  S.c.sur(m=>{ if(m.method==='Runtime.exceptionThrown') erreurs.push('EXC '+JSON.stringify((m.params.exceptionDetails||{}).exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text).slice(0,400));
    if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='warning')) erreurs.push(m.params.type.toUpperCase()+' '+(m.params.args||[]).map(a=>a.value!==undefined?String(a.value):(a.description||'')).join(' ').slice(0,400)+' @ '+((m.params.stackTrace&&m.params.stackTrace.callFrames||[]).slice(0,3).map(f=>f.functionName+':'+f.lineNumber).join(' < '))); });
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
  /* La synchro ALLUMÉE (le cas où l'erreur a été vue) : une équipe posée, et un Firebase SIMULÉ dans la
     page — le bocal n'a pas de réseau, le vrai SDK ne se chargerait pas. Il répond comme un document
     d'équipe vide : l'application amorce, écoute, puis on se déconnecte pendant qu'elle écoute. */
  if(process.env.SYNC!=='0') await S.ev(`
    localStorage.setItem('elanB_sync_team','elan-gestion-beta'); localStorage.removeItem('elanB_sync_on');
    window.__fbAppels=[];
    window.firebase=(function(){ const apps={};
      const note=n=>window.__fbAppels.push(n);
      const mkAuth=()=>({ currentUser:null, onAuthStateChanged(cb){ setTimeout(()=>cb(this.currentUser),0); return ()=>{}; },
        async signInAnonymously(){ note('anon'); this.currentUser={uid:'anon',isAnonymous:true,getIdToken:async()=>'x'}; return {user:this.currentUser}; },
        async signInWithCustomToken(){ note('jeton'); this.currentUser={uid:'tok',getIdToken:async()=>'x'}; return {user:this.currentUser}; },
        async signOut(){ note('signOut'); this.currentUser=null; }, setPersistence:async()=>{} });
      const snapVide=()=>({exists:false,data:()=>undefined,metadata:{fromCache:false,hasPendingWrites:false}});
      const mkDoc=path=>({ path, id:path.split('/').pop(),
        onSnapshot(a,b,c){ const cb=typeof a==='function'?a:b; note('onSnapshot '+path); setTimeout(()=>{ try{ cb(snapVide()); }catch(e){ console.error('cb onSnapshot', e); } },80); return ()=>note('unsub '+path); },
        async get(){ return snapVide(); }, async set(){ note('set '+path); }, async update(){ note('update '+path); }, async delete(){},
        collection:c=>mkCol(path+'/'+c) });
      const mkCol=path=>({ doc:id=>mkDoc(path+'/'+id), where(){return this;}, limit(){return this;}, orderBy(){return this;},
        async get(){ return {docs:[],empty:true,size:0,forEach(){}}; }, onSnapshot(cb){ setTimeout(()=>cb({docs:[],size:0,empty:true,docChanges:()=>[],forEach(){}}),80); return ()=>{}; } });
      const fs={ collection:mkCol, doc:mkDoc, enablePersistence:async()=>{}, settings(){}, runTransaction:async f=>f({get:async()=>snapVide(),set(){},update(){}}), batch:()=>({set(){},update(){},delete(){},commit:async()=>{}}) };
      const f={ apps:[], app(n){ if(!apps[n]) throw new Error('no app'); return apps[n]; },
        initializeApp(cfg,n){ const a={name:n,_auth:mkAuth(),auth(){return this._auth;},firestore(){return fs;},delete:async()=>{}}; apps[n||'[DEFAULT]']=a; f.apps.push(a); return a; } };
      f.auth=Object.assign(()=>mkAuth(),{Auth:{Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}}});
      f.firestore=Object.assign(()=>fs,{FieldValue:{serverTimestamp:()=>Date.now(),delete:()=>null,arrayUnion:(...x)=>x}});
      return f; })();
    return 1;`);
  await S.ev(`db.users=(db.users||[]).filter(u=>u.id!=='u-dc'); db.users.push({id:'u-dc',prenom:'Justin',nom:'Sonde',login:'dc',role:'admin',actif:true,pref:{}});
    const u=db.users.find(x=>x.id==='u-dc'); currentUser=u; enterApp(u);
    /* DELAI=<ms> : se déconnecter PENDANT le démarrage de la synchro (le cas limite). */
    await new Promise(r=>setTimeout(r,${Number(process.env.DELAI||2500)})); try{ closeModal(true); }catch(e){} return 1;`);
  const avant=erreurs.length; console.log('erreurs à la connexion :', avant); erreurs.forEach(e=>console.log('   ', e));
  await S.ev(`logout(); await new Promise(r=>setTimeout(r,3500)); return 1;`);
  console.log('erreurs APRÈS la déconnexion :', erreurs.length-avant); erreurs.slice(avant).forEach(e=>console.log('   ', e));
  const etat=await S.ev(`return {session:!!localStorage.getItem('elanB_session'), login:!!document.querySelector('#login-form,#login,.login-wrap,[data-ecran=login]'), syncOn: typeof _syncOn!=='undefined'?_syncOn:'?'};`);
  console.log('état :', JSON.stringify(etat));
  console.log('appels Firebase simulés :', JSON.stringify(await S.ev(`return (window.__fbAppels||[]).slice(0,30);`)));
  await S.fermer();
})().catch(e=>{ console.error(e); process.exit(1); });
