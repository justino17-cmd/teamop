/* ══ SONDE — LE TOAST SE DIT, UNE ERREUR SE VOIT COMME UNE ERREUR (audit apple-design, 18 et 34) ═══════════════════════════════
   Dans la vraie page, iPhone : on demande l'ARBRE D'ACCESSIBILITÉ au navigateur (Accessibility.getPartialAXTree) — c'est
   ce que lit VoiceOver, pas notre balisage :
     · #toast est une région « status », vivante (polite pour une confirmation, assertive pour un refus) ;
     · « ↩︎ Annuler » est un bouton, atteignable au clavier (tabIndex 0) ;
     · un refus porte .tst-err et sa pastille « ! » ; une confirmation non ;
     · parti, le toast ne garde aucun texte.
   CAPTURES=dossier : une confirmation, un refus, un « Annuler », jour et nuit.  ⛔ Bêta uniquement, 127.0.0.1. */
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
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); go('dashboard'); return 1;`); await dormir(1500);
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('Accessibility.enable');
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const ax = async (sel) => { const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 }); const q = await S.c.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) return null; const t = await S.c.envoyer('Accessibility.getPartialAXTree', { nodeId: q.nodeId, fetchRelatives: false });
    const n = (t.nodes || [])[0] || {}; const pr = {}; (n.properties || []).forEach(p => { pr[p.name] = p.value && p.value.value; });
    return { role: n.role && n.role.value, nom: n.name && n.name.value, pr }; };
  const etat = () => S.ev(`const t=document.getElementById('toast'); return {txt:t.textContent, err:t.classList.contains('tst-err'), live:t.getAttribute('aria-live'), avant:getComputedStyle(t,'::before').content, show:t.classList.contains('show')};`);
  const shot = async (nom) => { if (!CAP) return; await S.ev(`await new Promise(r=>setTimeout(r,500)); return 1;`); const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(img.data, 'base64')); };
  for (const theme of CAP ? ['light', 'dark'] : ['light']) {
    await S.ev(`setThemePref('${theme}'); return 1;`); await dormir(600);
    console.log('\n' + theme);
    await S.ev(`toast('Client ajouté', 6000); return 1;`); await dormir(150);
    let a = await ax('#toast'), e = await etat();
    c('une confirmation : l’arbre d’accessibilité dit « status », vivante « polite »', a && a.role === 'status' && a.pr.live === 'polite', a);
    c('… sans l’habillage d’alerte', !e.err && e.avant === 'none', e);
    await shot(theme + '-confirmation');
    await S.ev(`toast('Droit « Modifier » requis', 6000); return 1;`); await dormir(150);
    a = await ax('#toast'); e = await etat();
    c('un refus : vivante « assertive » (annoncé tout de suite)', a && a.role === 'status' && a.pr.live === 'assertive', a);
    c('… habillé en alerte, avec sa pastille « ! »', e.err && e.avant === '"!"', e);
    await shot(theme + '-refus');
    await S.ev(`toastAnnuler('Intervention déplacée · jeu. 22 à 10:00', 'void 0', 6000); return 1;`); await dormir(150);
    const b = await ax('#toast .tst-an'); const tab = await S.ev(`const b=document.querySelector('#toast .tst-an'); return b?{tag:b.tagName, tab:b.tabIndex}:null;`);
    c('« ↩︎ Annuler » : un BOUTON pour le lecteur d’écran, atteignable au clavier', b && b.role === 'button' && tab && tab.tag === 'BUTTON' && tab.tab === 0, { b, tab });
    await shot(theme + '-annuler');
  }
  await S.ev(`toast('Serveur injoignable', 300); return 1;`); await dormir(1600);
  const fin = await etat();
  c('parti, le toast ne garde aucun texte', !fin.show && fin.txt === '', fin);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (S.exceptions.length ? '  · exceptions : ' + S.exceptions.slice(0, 3).join(' | ') : ''));
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
