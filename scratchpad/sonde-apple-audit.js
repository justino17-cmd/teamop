/* ══ SONDE — AUDIT « APPLE-DESIGN » DE TOUTE L'INTERFACE D'OP GESTION ══════════════════════════
   Justin, 21 octobre 2026 : « Utilise le skill apple-design et audite toute l'interface de mon app
   avec. Liste chaque problème trouvé, du plus grave au moins grave, avec le fichier et la ligne. »
   L'application porte déjà beaucoup du skill (projection d'élan, retour à l'appui, chemin de sortie
   des fenêtres, préférences d'accessibilité) : on ne relit donc pas, on MESURE ce qui manque encore,
   écran par écran, sur un iPhone (Safari 26, nuit, au doigt) et un Mac (Safari 26, jour, souris).
   Ce qui est mesuré, et pourquoi (sections du skill) :
   · §1 RÉPONSE — chaque commande (bouton, ligne cliquable, pastille…) change-t-elle à l'APPUI ?
     On force `:active` (CSS.forcePseudoState) et on compare le style calculé. Une commande qui ne
     bouge pas à l'appui « ne répond pas » tant que le geste n'est pas fini ;
   · §10 SURVOL COLLÉ — au téléphone, `(hover:none)` posé comme sur un iPhone : une règle `:hover`
     qui change encore l'aspect y reste collée après le toucher ;
   · §15 TYPOGRAPHIE — un grand texte sans resserrement, un petit texte resserré, un interligne
     lâche sur un titre ;
   · §11 PERFORMANCE DU MOUVEMENT — une transition sur une propriété de mise en page (ou `all`) ;
   · §14 ANIMATIONS RÉDUITES / TRANSPARENCE RÉDUITE / CONTRASTE ACCRU — ce qui bouge encore, ce qui
     reste translucide, ce qui n'a pas de bord ;
   · §7 SYMÉTRIE — une fenêtre et un menu entrent ET sortent par le même chemin, depuis leur origine ;
   · animations infinies (fatigue, batterie).
   ⛔ Population comptée partout : un « 0 » sur zéro élément essayé ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                           */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const SORTIE = process.argv[2] || path.join(__dirname, 'audit-apple.json');
const SEULES = process.env.SEULES ? process.env.SEULES.split(',') : null;

/* ── côté page : les candidats d'un écran ─────────────────────────────────────────────────── */
function collecter() {
  const ETATS = /^(on|active|sel|actif|cur|open|ouvert|pose|entre|hover|focus|tab-cur|is-.*)$/;
  const sig = (el) => {
    const cl = (typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '')
      .split(/\s+/).filter(c => c && !ETATS.test(c)).sort().slice(0, 4).join('.');
    return el.tagName.toLowerCase() + (cl ? '.' + cl : '') + (el.getAttribute('onclick') ? '[onclick]' : '');
  };
  const dansTiroirFerme = (el) => { const s = el.closest('#sidebar,.sidebar'); if (!s) return false; const r = s.getBoundingClientRect(); return r.right <= 2; };
  const visible = (el) => { if (!el.isConnected) return false; const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false; if (r.bottom < 0 || r.top > innerHeight * 3) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    return !dansTiroirFerme(el); };
  document.querySelectorAll('[data-audit-i]').forEach(e => e.removeAttribute('data-audit-i'));
  /* les commandes : tout ce qui se touche pour agir */
  const SEL = 'button,a[href],[onclick],[role=button],[role=tab],.chip,.tab,summary,select,input[type=checkbox],input[type=radio],label.switch,.list-row,.pl-row';
  const vues = new Set(), cmd = [];
  let n = 0, pop = 0;
  for (const el of document.querySelectorAll(SEL)) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    if (!visible(el)) continue;
    /* un conteneur qui ne fait que bloquer un clic n'agit pas */
    if ((el.getAttribute('onclick') || '').trim() === 'event.stopPropagation()') continue;
    pop++;
    const s = sig(el); if (vues.has(s)) continue; vues.add(s);
    el.setAttribute('data-audit-i', String(n));
    cmd.push({ i: n, sig: s, txt: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) });
    n++; if (n >= 70) break;
  }
  /* la typographie : chaque élément qui porte du texte en propre */
  const typo = {}; let popT = 0;
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const deja = new Set();
  for (let t = marcheur.nextNode(); t; t = marcheur.nextNode()) {
    if (!t.nodeValue || !t.nodeValue.trim()) continue;
    const el = t.parentElement; if (!el || deja.has(el)) continue; deja.add(el);
    if (el.closest('script,style,svg,#hl-ecran')) continue;
    if (!visible(el)) continue;
    popT++;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight), r = el.getBoundingClientRect();
    const maj = cs.textTransform === 'uppercase', lignes = Math.round(r.height / (lh || 1));
    const motifs = [];
    if (fs >= 24 && ls >= 0 && !maj) motifs.push('grand-sans-resserrement');
    if (fs <= 12 && ls < -0.01 && !maj) motifs.push('petit-resserre');
    if (fs >= 24 && lh / fs > 1.35 && lignes >= 1) motifs.push('titre-interligne-lache');
    if (fs >= 13 && fs <= 17 && lignes >= 3 && lh / fs < 1.3) motifs.push('corps-interligne-serre');
    if (!motifs.length) continue;
    const s = sig(el);
    for (const m of motifs) {
      const k = m + ' ' + s;
      if (!typo[k]) { typo[k] = { motif: m, sig: s, fs, ls: +ls.toFixed(2), lh: +(lh / fs).toFixed(2), fw: cs.fontWeight, txt: t.nodeValue.trim().slice(0, 40), n: 0 };
        if (!el.hasAttribute('data-audit-t')) el.setAttribute('data-audit-t', k); }
      typo[k].n++;
    }
  }
  /* les transitions sur une propriété de mise en page */
  const trans = {}; let popTr = 0;
  const MISE = /(^|,\s*)(all|width|height|min-height|max-height|min-width|max-width|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|inset|flex[a-z-]*|grid[a-z-]*|font-size|line-height|border-width)\s*(,|$)/;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.transitionDuration.split(',').every(d => parseFloat(d) === 0)) continue;
    if (!visible(el)) continue;
    popTr++;
    const props = cs.transitionProperty.split(',').map(x => x.trim()), durs = cs.transitionDuration.split(',').map(parseFloat);
    const fautives = props.filter((p, k) => MISE.test(p) && (durs[k % durs.length] || 0) > 0);
    if (!fautives.length) continue;
    const s = sig(el), k = s + ' ' + fautives.join(',');
    if (!trans[k]) { trans[k] = { sig: s, props: fautives.join(','), dur: cs.transitionDuration, n: 0 }; el.setAttribute('data-audit-tr', k); }
    trans[k].n++;
  }
  /* les animations qui tournent sans fin */
  const infinies = document.getAnimations().filter(a => a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming().iterations === Infinity && a.playState === 'running')
    .map(a => ({ nom: a.animationName || a.id || '(script)', cible: a.effect.target ? sig(a.effect.target) : '', duree: a.effect.getComputedTiming().duration }));
  return { cmd, pop, typo: Object.values(typo), popT, trans: Object.values(trans), popTr, infinies };
}

/* ── côté page : ce qu'un élément montre (pour comparer repos / appui / survol) ─────────── */
const LIRE = `function(){ const cs=getComputedStyle(this);
  return [cs.transform,cs.scale,cs.translate,cs.opacity,cs.backgroundColor,cs.backgroundImage.slice(0,120),cs.boxShadow,cs.filter,cs.color,cs.borderTopColor,cs.outlineStyle+' '+cs.outlineColor,cs.textDecorationLine].join(' ¦ ')
    +' ⟂'+cs.transitionDuration+' '+cs.transitionProperty.slice(0,80); }`;

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  console.log('page mesurée :', S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  await S.ev(`if(document.startViewTransition&&!window.__vtSuivi){ window.__vtSuivi=1; window.__vtN=0; window.__vtTot=0; const o=document.startViewTransition.bind(document);
    document.startViewTransition=function(cb){ window.__vtN++; window.__vtTot++; const vt=o(cb); const f=()=>{ window.__vtN--; }; vt.finished.then(f,f); return vt; }; } return 1;`);
  const calme = async () => { for (let i = 0; i < 50; i++) { if (await S.ev(`return !(window.__vtN>0) && !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await dormir(350); await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  const fermerTout = () => S.ev(`try{ closeModal(true); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} const b=document.getElementById('fdr-banner'); if(b) b.remove(); return 1;`);
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');

  const R = { version: S.version, profils: {}, sansAppui: {}, survolColle: {}, typo: {}, trans: {}, infinies: {}, regles: {} };
  const noeud = async (attr, val) => { const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 });
    try { const q = await S.c.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '[' + attr + '="' + String(val).replace(/"/g, '\\"') + '"]' }); return q.nodeId || 0; } catch (e) { return 0; } };
  const lireNoeud = async (nodeId) => { const o = (await S.c.envoyer('DOM.resolveNode', { nodeId })).object;
    return (await S.c.envoyer('Runtime.callFunctionOn', { objectId: o.objectId, returnByValue: true, functionDeclaration: LIRE })).result.value; };
  /* la règle qui GAGNE pour une propriété, nommée par son sélecteur (CSS.getMatchedStylesForNode) */
  const regleDe = async (nodeId, prop, pseudo) => {
    try {
      if (pseudo) await S.c.envoyer('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [pseudo] });
      const m = await S.c.envoyer('CSS.getMatchedStylesForNode', { nodeId });
      if (pseudo) await S.c.envoyer('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      const regles = (m.matchedCSSRules || []).slice().reverse();
      for (const rm of regles) {
        const st = rm.rule.style; if (!st) continue;
        const d = st.cssProperties.find(p => p.name === prop && !p.disabled && p.text);
        if (d && rm.rule.origin === 'regular') return rm.rule.selectorList.text.slice(0, 160);
      }
    } catch (e) {}
    return '';
  };

  for (const nomP of ['tel', 'bureau']) {
    const P = PROFILS[nomP];
    await poserProfil(S, P);
    await S.c.envoyer('Emulation.setEmulatedMedia', { features: P.tac ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }] });
    await S.ev(`setPlatForce('${P.plat}'); setThemePref('${P.theme}'); return 1;`); await dormir(500);
    const media = await S.ev(`return {sansSurvol:matchMedia('(hover:none)').matches, doigt:matchMedia('(pointer:coarse)').matches, plat:document.documentElement.dataset.plat, verre:document.documentElement.dataset.verre};`);
    console.log('\n══ ' + P.lbl + ' ══ ' + JSON.stringify(media));
    if (P.tac && !media.sansSurvol) { console.log('⛔ le téléphone ne se déclare pas sans survol — mesure arrêtée'); S.fermer(); process.exit(2); }
    let vues = await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k)
      .concat(['carteBox','produitsDonnes']).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
    if (SEULES) vues = vues.filter(v => SEULES.includes(v));
    const Rp = R.profils[nomP] = { vues: 0, commandes: 0, essais: 0, typoPop: 0, transPop: 0 };
    for (const v of vues) {
      await fermerTout();
      await S.ev(`try{ go('${v}'); }catch(e){} return 1;`); await dormir(500); await calme(); await fermerTout();
      let c; try { c = await S.ev(`return (${collecter.toString()})();`); } catch (e) { console.log('  ✗ ' + v + ' : ' + e.message.slice(0, 120)); continue; }
      Rp.vues++; Rp.commandes += c.pop; Rp.typoPop += c.popT; Rp.transPop += c.popTr;
      for (const t of c.typo) { const k = t.motif + ' ' + t.sig; const x = R.typo[k] || (R.typo[k] = Object.assign({ vues: [], profils: [] }, t));
        if (!x.vues.includes(v)) x.vues.push(v); if (!x.profils.includes(nomP)) x.profils.push(nomP);
        if (!x.regle) { const id = await noeud('data-audit-t', k); if (id) x.regle = await regleDe(id, t.motif.includes('interligne') ? 'line-height' : 'letter-spacing'); } }
      for (const t of c.trans) { const k = t.sig + ' ' + t.props; const x = R.trans[k] || (R.trans[k] = Object.assign({ vues: [], profils: [] }, t));
        if (!x.vues.includes(v)) x.vues.push(v); if (!x.profils.includes(nomP)) x.profils.push(nomP);
        if (!x.regle) { const id = await noeud('data-audit-tr', k); if (id) x.regle = await regleDe(id, 'transition') || await regleDe(id, 'transition-property'); } }
      for (const a of c.infinies) { const k = a.nom + ' ' + a.cible; R.infinies[k] = R.infinies[k] || Object.assign({ vues: [] }, a); if (!R.infinies[k].vues.includes(v)) R.infinies[k].vues.push(v); }
      /* l'appui, et (au doigt) le survol collé */
      for (const cm of c.cmd) {
        const id = await noeud('data-audit-i', cm.i); if (!id) continue;
        let repos; try { repos = await lireNoeud(id); } catch (e) { continue; }
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: ['active'] });
        let appui = await lireNoeud(id);
        const visuel = (s) => s.split(' ⟂')[0];
        /* ⛔ une TRANSITION sur l'état appuyé : lu à l'instant de l'appui, le style n'a pas encore bougé. Mesuré le 22 octobre
           2026 sur .tf-rangee (transition .2s) : « aucun retour » était faux — le retour existe, il arrive LENTEMENT. On relit
           400 ms plus tard : ce qui a bougé entre-temps est un appui LENT (§ 1 : « instant »), pas un appui absent. */
        let lent = false;
        if (visuel(appui) === visuel(repos)) { await dormir(400); const tard = await lireNoeud(id); if (visuel(tard) !== visuel(repos)) { lent = true; appui = tard; } }
        await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] });
        Rp.essais++;
        if (lent) { const x = R.appuiLent = R.appuiLent || {}; x[cm.sig] = x[cm.sig] || { sig: cm.sig, txt: cm.txt, transition: (appui.split(' ⟂')[1] || '').slice(0, 90), vues: [] }; if (!x[cm.sig].vues.includes(v)) x[cm.sig].vues.push(v); }
        else if (visuel(appui) === visuel(repos)) {
          const x = R.sansAppui[cm.sig] || (R.sansAppui[cm.sig] = { sig: cm.sig, txt: cm.txt, vues: [], profils: [] });
          if (!x.vues.includes(v)) x.vues.push(v); if (!x.profils.includes(nomP)) x.profils.push(nomP);
        } else {
          /* un appui qui répond APRÈS le doigt : la transition vers l'état appuyé dépasse 150 ms */
          const d = (appui.split(' ⟂')[1] || '').split(' ')[0].split(',').map(parseFloat);
          if (Math.max.apply(null, d) > 0.15) { const k = cm.sig; const x = R.appuiLent = R.appuiLent || {}; x[k] = x[k] || { sig: k, txt: cm.txt, transition: (appui.split(' ⟂')[1] || '').slice(0, 90), vues: [] }; if (!x[k].vues.includes(v)) x[k].vues.push(v); }
        }
        if (P.tac) {
          await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: ['hover'] });
          let survol = await lireNoeud(id);
          if (visuel(survol) === visuel(repos)) { await dormir(300); survol = await lireNoeud(id); }   /* même piège : une transition de survol */
          await S.c.envoyer('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] });
          if (visuel(survol) !== visuel(repos)) {
            const x = R.survolColle[cm.sig] || (R.survolColle[cm.sig] = { sig: cm.sig, txt: cm.txt, vues: [], diff: '' });
            if (!x.vues.includes(v)) x.vues.push(v);
            if (!x.diff) { const a = visuel(repos).split(' ¦ '), b = visuel(survol).split(' ¦ ');
              const NOMS = ['transform', 'scale', 'translate', 'opacity', 'fond', 'image', 'ombre', 'filtre', 'encre', 'bord', 'contour', 'soulignement'];
              x.diff = NOMS.filter((_, k) => a[k] !== b[k]).join(',');
              x.regle = await regleDe(id, x.diff.includes('fond') ? 'background-color' : x.diff.includes('ombre') ? 'box-shadow' : x.diff.includes('transform') ? 'transform' : x.diff.includes('encre') ? 'color' : 'background', 'hover'); }
          }
        }
      }
      process.stdout.write('.');
    }
    console.log('\n' + nomP + ' : ' + JSON.stringify(Rp));
  }

  /* ── les fenêtres et les menus : entrée, sortie, origine ─────────────────────────────────── */
  const animsDe = (sel) => `return document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.matches&&a.effect.target.matches(${JSON.stringify(sel)}))
    .map(a=>({nom:a.animationName||a.transitionProperty||'(script)', duree:a.effect.getComputedTiming().duration, ease:(a.effect.getTiming().easing||''),
      kf:JSON.stringify(a.effect.getKeyframes().map(k=>{ const o={}; for(const p of ['transform','translate','scale','opacity','filter']) if(k[p]!==undefined) o[p]=k[p]; return o; })).slice(0,220),
      origine:getComputedStyle(a.effect.target).transformOrigin}));`;
  R.fenetres = {};
  for (const nomP of ['tel', 'bureau']) {
    const P = PROFILS[nomP]; await poserProfil(S, P);
    await S.ev(`setPlatForce('${P.plat}'); return 1;`); await S.ev(`go('clients'); return 1;`); await dormir(600); await calme();
    await S.ev(`openModal('<h3>Essai</h3><div class="field"><label>Nom</label><input></div><div class="actions"><button class="btn">Annuler</button></div>'); return 1;`);
    await dormir(30);
    const entree = await S.ev(animsDe('#overlay,#modal,.modal'));
    await dormir(800);
    const ecoutes = [];
    for (const sel of ['#modal', '#overlay']) { const id = await noeud('id', sel.slice(1)); if (!id) continue;
      const o = (await S.c.envoyer('DOM.resolveNode', { nodeId: id })).object;
      try { const l = await S.c.envoyer('DOMDebugger.getEventListeners', { objectId: o.objectId, depth: 0 }); ecoutes.push(sel + ':' + l.listeners.map(x => x.type).join('/')); } catch (e) {} }
    const geo = await S.ev(`const m=document.getElementById('modal'), r=m.getBoundingClientRect(); return {haut:Math.round(r.top), bas:Math.round(innerHeight-r.bottom), large:Math.round(r.width), poignee:!!m.querySelector('.poignee,.grabber,.sheet-handle,[class*=poign]'), classe:m.className};`);
    await S.ev(`closeModal(); return 1;`); await dormir(30);
    const sortie = await S.ev(animsDe('#overlay,#modal,.modal'));
    await dormir(400);
    R.fenetres[nomP] = { entree, sortie, ecoutes, geo };
  }

  /* ── animations réduites : ce qui bouge encore ───────────────────────────────────────────── */
  const P = PROFILS.tel; await poserProfil(S, P);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
  await S.ev(`setPlatForce('${P.plat}'); return 1;`); await dormir(400);
  R.reduit = { actif: await S.ev(`return matchMedia('(prefers-reduced-motion: reduce)').matches;`), mouvements: {}, vt: 0 };
  const vt0 = await S.ev(`return window.__vtTot||0;`);
  const bouge = `return document.getAnimations().filter(a=>a.playState==='running'||a.playState==='pending').map(a=>{ const kf=a.effect&&a.effect.getKeyframes?a.effect.getKeyframes():[];
      const mv=kf.some(k=>['transform','translate','scale','rotate'].some(p=>k[p]!==undefined&&k[p]!=='none'&&k[p]!=='')) || (a.transitionProperty&&/transform|translate|scale|rotate/.test(a.transitionProperty));
      const t=a.effect&&a.effect.target; const cl=t?(t.id?'#'+t.id:t.tagName.toLowerCase()+'.'+String(t.className&&t.className.baseVal!==undefined?t.className.baseVal:t.className).split(/\\s+/).slice(0,3).join('.')):'';
      return mv?{nom:a.animationName||a.transitionProperty||'(script)',cible:cl,duree:a.effect.getComputedTiming().duration,iter:a.effect.getComputedTiming().iterations}:null; }).filter(Boolean);`;
  for (const v of ['dashboard', 'interventions', 'planning', 'clients', 'stock']) {
    await S.ev(`try{ go('${v}'); }catch(e){} return 1;`); await dormir(40);
    for (const a of await S.ev(bouge)) { const k = a.nom + ' ' + a.cible; R.reduit.mouvements[k] = R.reduit.mouvements[k] || Object.assign({ vues: [] }, a); R.reduit.mouvements[k].vues.push(v); }
    await dormir(700); await calme();
  }
  await S.ev(`openModal('<h3>Essai</h3><p>x</p>'); return 1;`); await dormir(30);
  for (const a of await S.ev(bouge)) { const k = a.nom + ' ' + a.cible; R.reduit.mouvements[k] = R.reduit.mouvements[k] || Object.assign({ vues: ['fenêtre'] }, a); }
  await S.ev(`closeModal(); return 1;`); await dormir(30);
  for (const a of await S.ev(bouge)) { const k = a.nom + ' ' + a.cible; R.reduit.mouvements[k] = R.reduit.mouvements[k] || Object.assign({ vues: ['fermeture'] }, a); }
  R.reduit.vt = (await S.ev(`return window.__vtTot||0;`)) - vt0;
  R.reduit.defilementDoux = await S.ev(`return getComputedStyle(document.documentElement).scrollBehavior;`);

  /* ── transparence réduite et contraste accru ─────────────────────────────────────────────── */
  const verres = `const out={}; let n=0; for(const el of document.querySelectorAll('body *')){ const cs=getComputedStyle(el); const bf=cs.backdropFilter||cs.webkitBackdropFilter||'none';
      if(bf==='none') continue; const r=el.getBoundingClientRect(); if(r.width<4||r.height<4) continue; if(el.checkVisibility&&!el.checkVisibility({opacityProperty:true,visibilityProperty:true})) continue; n++;
      const k=(el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+String(typeof el.className==='string'?el.className:'').split(/\\s+/).filter(Boolean).slice(0,3).join('.'));
      out[k]=out[k]||{n:0,bf:bf.slice(0,60),fond:cs.backgroundColor,bord:cs.borderTopWidth+' '+cs.borderTopColor}; out[k].n++; } return {n,familles:out};`;
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  R.transparence = { actif: await S.ev(`return matchMedia('(prefers-reduced-transparency: reduce)').matches;`), vues: {} };
  for (const v of ['dashboard', 'interventions', 'clients']) { await S.ev(`try{ go('${v}'); }catch(e){} return 1;`); await dormir(600); await calme(); R.transparence.vues[v] = await S.ev(verres); }
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-contrast', value: 'more' }] });
  R.contraste = { actif: await S.ev(`return matchMedia('(prefers-contrast: more)').matches;`), vues: {} };
  for (const v of ['dashboard', 'interventions']) { await S.ev(`try{ go('${v}'); }catch(e){} return 1;`); await dormir(600); await calme(); R.contraste.vues[v] = await S.ev(verres); }
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [] });

  R.exceptions = S.exceptions.slice(0, 20);
  fs.writeFileSync(SORTIE, JSON.stringify(R, null, 1));
  console.log('\nécrit : ' + SORTIE);
  console.log('sans retour à l’appui : ' + Object.keys(R.sansAppui).length + ' familles · appui lent : ' + Object.keys(R.appuiLent || {}).length
    + ' · survol collé (doigt) : ' + Object.keys(R.survolColle).length + ' · typo : ' + Object.keys(R.typo).length + ' · transitions de mise en page : ' + Object.keys(R.trans).length
    + ' · infinies : ' + Object.keys(R.infinies).length + ' · bouge encore (réduit) : ' + Object.keys(R.reduit.mouvements).length);
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + (e.stack || e.message)); process.exit(1); });
