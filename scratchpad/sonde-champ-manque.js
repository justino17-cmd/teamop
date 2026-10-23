/* ══ SONDE — UN CHAMP QUI MANQUE SE DÉSIGNE (audit apple-design, point 33) ═════════════════════════════════════════════════════
   Dans la vraie page (iPhone), on ouvre de vrais formulaires et on touche pour de vrai leur bouton d'enregistrement
   (Input.dispatchTouchEvent). ⚠️ Un champ VIDE qui porte « required » est arrêté par le navigateur lui-même (sa bulle, sur le
   champ) avant notre code : nos validations servent à ce que le natif laisse passer — un champ rempli d'ESPACES, un champ sans
   « required ». C'est donc ce qu'on joue :
     · un compte (formUser) : prénom et nom faits d'espaces → les DEUX marqués (aria-invalid), le message sous le prénom, À
       L'ÉCRAN, le prénom a le focus ; une lettre tapée dans le prénom efface SA marque et le message, le nom reste marqué ;
     · une tâche dont le titre n'est fait que d'espaces, un conducteur sans nom (des espaces), une absence sans date de début
       (champ sans « required ») : le champ marqué, le message dessous, le focus dessus ;
     · rien n'a été enregistré (la fenêtre est toujours ouverte).
   CAPTURES=dossier : le formulaire du compte marqué, jour et nuit. SOURCE=fichier : la contre-épreuve.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const CAP = process.env.CAPTURES; if (CAP) fs.mkdirSync(CAP, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  /* toucher le bouton d'envoi du formulaire ouvert, pour de vrai */
  const envoyer = async () => { const p = await S.ev(`for(let k=0;k<60&&window._vtEnCours;k++) await new Promise(r=>setTimeout(r,50));   /* un toucher pendant une transition la termine sans cliquer (partie C) */
    window.__envoi=[]; if(!window.__focusLog){ window.__focusLog=[]; document.addEventListener('focusin',e=>__focusLog.push(Math.round(performance.now())+' in '+(e.target.name||e.target.id||e.target.tagName)+' ← '+(new Error().stack.split('\\n').slice(2,4).join('|').replace(/\\s+/g,' '))),true); } const fm=document.querySelector('#modal form'); if(fm&&!fm.__ecoute){ fm.__ecoute=1; fm.addEventListener('submit',()=>__envoi.push('submit'),true);
      fm.addEventListener('invalid',e=>__envoi.push('invalide:'+(e.target.name||e.target.id)),true); }
    /* le bouton d'envoi : dans le formulaire, ou relié à lui par form="…" (le pied de certaines fenêtres est hors du <form>) */
    const b=fm&&(fm.querySelector('[type="submit"]')||(fm.id&&document.querySelector('[type="submit"][form="'+fm.id+'"]'))); if(!b) return null;
    b.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const r=b.getBoundingClientRect(), x=Math.round(r.left+r.width/2), y=Math.round(r.top+r.height/2);
    const t=document.elementFromPoint(x,y); return {x, y, touche:!!t&&(t===b||b.contains(t)), dessus:t?(t.className||t.tagName):''};`);
    if (!p) return false; if (!p.touche) console.log('    ⚠ sous le doigt, pas le bouton : ' + p.dessus); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    /* ⚠ pas un délai fixe : le champ arrive au centre par un défilement DOUX — sous charge (trois suites en parallèle, le
       22 octobre), 900 ms ne suffisaient pas et le champ « n'était pas à l'écran ». On attend que le champ focalisé ne bouge
       plus pendant cinq images (3 s au plus). */
    await dormir(200); await S.ev(`let y=null, calme=0; const t0=performance.now(); while(calme<5&&performance.now()-t0<3000){ await new Promise(r=>requestAnimationFrame(r));
      const a=document.activeElement, n=a&&a.getBoundingClientRect?Math.round(a.getBoundingClientRect().top):0; calme=(n===y)?calme+1:0; y=n; } return 1;`);
    const ev = await S.ev(`const a=document.activeElement; const l=(window.__focusLog||[]).splice(0); return (window.__envoi||[]).concat(['focus:'+(a?(a.name||a.id||a.tagName):'')]).concat(l.slice(-4));`); if (process.env.DIAG) console.log('    envoi :', JSON.stringify(ev)); return true; };
  const remplirAutres = (garde) => S.ev(`const f=document.querySelector('#modal form'); if(!f) return 0; let n=0;
    for(const el of f.querySelectorAll('[required]')){ if(${JSON.stringify(garde)}.includes(el.name)||el.value) continue; n++;
      if(el.tagName==='SELECT'){ const o=[...el.options].find(x=>x.value); if(o) el.value=o.value; }
      else el.value= el.type==='email'?'lea.roux@exemple.fr': el.type==='password'?'Motdepasse8!': el.type==='date'?todayISO(): el.type==='time'?'09:00': el.type==='number'?'1':'lea.roux'; }
    return n;`);
  const etat = (noms) => S.ev(`const f=document.querySelector('#modal form'); if(!f) return {ferme:true}; const out={ouvert:document.getElementById('overlay').classList.contains('open')};
    for(const n of ${JSON.stringify(noms)}){ const el=f.elements[n]; if(!el){ out[n]=null; continue; } const nt=el.nextElementSibling, r=el.getBoundingClientRect(), nr=nt&&nt.classList.contains('champ-manque-note')?nt.getBoundingClientRect():null;
      out[n]={inv:el.getAttribute('aria-invalid'), note:nr?nt.textContent:null, noteVue:!!nr&&nr.top>=0&&nr.bottom<=innerHeight, champVu:r.top>=0&&r.bottom<=innerHeight, focus:document.activeElement===el,
        bord:getComputedStyle(el).borderTopColor, desc:el.getAttribute('aria-describedby')}; }
    return out;`);
  for (const theme of ['light', 'dark']) {
    console.log('\n' + (theme === 'light' ? 'jour' : 'nuit') + ' — un compte, prénom et nom vides');
    await S.ev(`try{ closeModal(true); }catch(e){} (typeof setThemePrefNu==='function'?setThemePrefNu:setThemePref)('${theme}'); go('utilisateurs'); return 1;`); await dormir(1500);
    await S.ev(`formUser(); return 1;`); await dormir(900);
    await S.ev(`const f=document.querySelector('#modal form'); for(const n of ['prenom','nom']){ if(f.elements[n]) f.elements[n].value='   '; } return 1;`);
    await remplirAutres(['prenom', 'nom']);
    c('(population) la fenêtre « Nouvel utilisateur » est ouverte, avec son bouton d’envoi', await envoyer());
    const e = await etat(['prenom', 'nom']);
    c('rien n’est enregistré : la fenêtre est toujours ouverte', e.ouvert === true, e);
    c('le prénom ET le nom sont marqués (aria-invalid)', e.prenom && e.prenom.inv === 'true' && e.nom && e.nom.inv === 'true', e);
    c('le message est sous le PRÉNOM, il nomme les deux champs, et il est à l’écran', e.prenom && /« Prénom » et « Nom » sont obligatoires/.test(e.prenom.note || '') && e.prenom.noteVue, e.prenom);
    c('le prénom a le focus, et le lecteur d’écran relie le message au champ (aria-describedby)', e.prenom && e.prenom.focus && /mq-/.test(e.prenom.desc || ''), e.prenom);
    const rouge = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return !!m && +m[1] > 120 && +m[1] - +m[2] > 50 && +m[1] - +m[3] > 50; };   // un rouge, de jour (foncé) comme de nuit (éclairci pour se lire)
    c('les deux champs ont le même bord rouge (' + (e.prenom && e.prenom.bord) + ')', e.prenom && e.nom && e.prenom.bord === e.nom.bord && rouge(e.prenom.bord), [e.prenom && e.prenom.bord, e.nom && e.nom.bord]);
    if (CAP) { const im = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, 'compte-' + theme + '.png'), Buffer.from(im.data, 'base64')); }
    await S.c.envoyer('Input.insertText', { text: 'L' }); await dormir(300);
    const e2 = await etat(['prenom', 'nom']);
    c('une lettre tapée dans le prénom efface SA marque et le message ; le nom reste marqué', e2.prenom && e2.prenom.inv === null && e2.prenom.note === null && e2.nom && e2.nom.inv === 'true', e2);
  }
  console.log('\nd’autres formulaires');
  for (const [nom, ouvre, champ, vider] of [['une tâche au titre fait d’espaces', `go('planning'); formTache();`, 'titre', '   '], ['un conducteur au nom fait d’espaces', `formConducteur();`, 'nom', '   '],
    ['une absence sans date de début', `go('absences'); formAbsence();`, 'du', '']]) {
    await S.ev(`try{ closeModal(true); }catch(e){} ${ouvre} return 1;`); await dormir(1000);
    const a = await S.ev(`const f=document.querySelector('#modal form'); if(!f||!f.elements['${champ}']) return false; f.elements['${champ}'].value='${vider}'; if('${champ}'==='nom'&&f.elements.prenom) f.elements.prenom.value='Léa';
      if(f.elements.techId&&f.elements.techId.tagName==='SELECT'&&!f.elements.techId.value){ const o=[...f.elements.techId.options].find(x=>x.value); if(o) f.elements.techId.value=o.value; } return true;`);
    if (!a) { c(nom + ' : (population) le formulaire et son champ « ' + champ + ' » sont là', false); continue; }
    await remplirAutres([champ]);
    await envoyer();
    const e = champ === 'du'
      ? await S.ev(`const b=document.getElementById('abs-periode'), nt=b&&b.nextElementSibling, nr=nt&&nt.classList.contains('champ-manque-note')?nt.getBoundingClientRect():null;
          return {ouvert:document.getElementById('overlay').classList.contains('open'), du:b?{inv:b.getAttribute('aria-invalid'), note:nr?nt.textContent:null, noteVue:!!nr&&nr.top>=0&&nr.bottom<=innerHeight, focus:document.activeElement===b}:null};`)
      : await etat([champ]);
    c(nom + ' : ' + (champ === 'du' ? 'le bouton « Période » (le champ est caché)' : 'le champ') + ' est marqué, le message dessous à l’écran, le focus dessus, rien d’enregistré', e.ouvert && e[champ] && e[champ].inv === 'true' && e[champ].noteVue && e[champ].focus, e);
  }
  await S.ev(`try{ closeModal(true); }catch(e){} return 1;`);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
