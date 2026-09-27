/* ══ SONDE — SUPPRIMER DEPUIS LA TOUR : UNE QUESTION, UNE CASE, « OUI » (v2.69) ══════════════════
   Justin, 27 septembre 2026 : « Fait les 4 » — plus de code par e-mail, comme dans OP GESTION.
   Tout se joue AU DOIGT (vrais événements tactiles) sur tour.html servi en local, l'API simulée dans
   la page (sonde-tour-theme.js) : aucune requête ne sort, aucune donnée réelle n'entre. Les routes de
   suppression sont SCRIPTÉES ici — chaque réponse du serveur est choisie — et leurs corps relevés.
   Ce qu'on prouve, et que `test-833` ne peut pas voir (il n'a pas de page) :
     · « Oui » éteint ne part pas, même touché ; la case le rallume ; un toucher = un ordre ;
     · le corps porte `confirme:true` et rien d'autre ne part ;
     · un refus du serveur se DIT dans le panneau, « Oui » redevient touchable ;
     · un serveur d'avant (code envoyé) : le code est demandé, puis la suppression passe ;
     · « Annuler » ne fait rien partir ; le panneau tient dans l'écran d'un téléphone, cibles ≥ 44 px.
   Usage : node scratchpad/sonde-tour-suppr.js
           TOUR_FICHIER=<tour v2.68> node scratchpad/sonde-tour-suppr.js   (contre-épreuve) */
'use strict';
const { demarrer, onglet, STABLE, APAISER, dormir } = require('./sonde-tour-theme.js');

const ok = [], ko = [];
const v = (t, cond, detail) => { (cond ? ok : ko).push(t); console.log((cond ? '  ✓ ' : '  ✗ ') + t + (detail !== undefined ? ' — ' + detail : '')); };

/* Les routes de suppression, scriptées : une file de réponses par route ; chaque corps est relevé. */
const SCRIPTER = `
  if(!window.__suppr){ window.__suppr=1; window.__corps=[]; window.__script={}; window.__prompts=[]; window.__repPrompt=null;
    window.prompt=function(q){ window.__prompts.push(String(q)); return window.__repPrompt; };
    var suivant=window.fetch;
    window.fetch=function(u,o){
      var s=String(u), p=s.replace('https://api.teamop.fr','').split('?')[0], meth=((o&&o.method)||'GET').toUpperCase();
      if(meth==='POST'&&/\\/(supprimer|retirer)$/.test(p)){
        var b={}; try{ b=JSON.parse((o&&o.body)||'{}'); }catch(e){}
        window.__corps.push({p:p,b:b});
        var f=window.__script[p]||[], r=f.length?f.shift():{st:500,d:{error:'réponse non scriptée'}};
        return new Promise(function(res){ setTimeout(function(){ res(new Response(JSON.stringify(r.d),{status:r.st||200,headers:{'Content-Type':'application/json'}})); },r.lent||80); });
      }
      if(meth==='POST'&&p==='/api/monitor/entreprise/dossier'&&window.__dossier) return Promise.resolve(new Response(JSON.stringify(window.__dossier),{status:200,headers:{'Content-Type':'application/json'}}));
      if(meth==='POST'&&p==='/api/monitor/entreprise/apercu-suppression') return Promise.resolve(new Response(JSON.stringify({ok:true,apercu:{slugs:['boulmartin'],dansAnnuaire:true,comptesAnnuaire:3,connexions:41,erreurs:2,comptesSite:1,boites:0,abonnesPush:2,ecransOuverts:5,mailsRecus:0,mailsEnvoyes:4,mailsEcrits:1,promos:[],partagees:[],comptesSiteHorsAnnuaire:[]}}),{status:200,headers:{'Content-Type':'application/json'}}));
      return suivant(u,o);
    };
  }
  return 1;`;
const N = Date.now(), H = 3600000;
const DOSSIER = { ok: true, t: 'boulmartin-7k2q', nom: 'Boulangerie Martin', utilisateurs: [
  { login: 'claire', nom: 'Claire Martin', dansAnnuaire: true, derniere: N - 2 * H },
  { login: 'tom', nom: 'Tom Leroy', dansAnnuaire: true, derniere: 0 },
  { login: 'zoe', nom: 'Zoé Garnier-Descamps de la Roche', dansAnnuaire: true, derniere: 0 }], erreurs: [], connexions: [] };

/* l'état du panneau, tel que l'œil le voit */
/* ⚠️ l'observateur typographique de la Tour pose une espace INSÉCABLE devant « ? » et « : » : on compare
   des textes ramenés à l'espace ordinaire, sinon une phrase juste se lit fausse d'un caractère invisible.
   Et le toast se lit même panneau fermé — c'est là que la réussite se dit. */
const PANNEAU = `${STABLE}
  const n=x=>String(x||'').replace(/[\u00a0\u202f]/g,' ');
  const tt=document.getElementById('toast'), toast=tt&&getComputedStyle(tt).display!=='none'?n(tt.textContent):'';
  const d=document.getElementById('tour-panneau'); if(!d) return {ouvert:false,toast};
  const box=d.firstElementChild, rb=box.getBoundingClientRect();
  const q=box.querySelector('.sup-q'), cb=document.getElementById('sup-ok'), oui=document.getElementById('sup-oui'), err=document.getElementById('sup-err');
  const lab=cb&&cb.closest('label'), ann=[...box.querySelectorAll('button')].find(b=>/Annuler/.test(b.textContent));
  const r=e=>{ if(!e) return null; const x=e.getBoundingClientRect(); return {l:Math.round(x.left),r:Math.round(x.right),t:Math.round(x.top),b:Math.round(x.bottom),h:Math.round(x.height),w:Math.round(x.width)}; };
  return {ouvert:!d.classList.contains('part'),titre:n((box.querySelector('.sup-titre')||{}).textContent),question:q?n(q.textContent):'',
    coche:!!(cb&&cb.checked),ouiEteint:!!(oui&&oui.disabled),ouiTxt:oui?n(oui.textContent):'',err:err&&!err.hidden?n(err.textContent):'',
    li:box.querySelectorAll('li').length,fermer:[...box.querySelectorAll('button')].filter(b=>/^Fermer$/.test(b.textContent.trim())).length,
    box:r(box),lab:r(lab),oui:r(oui),ann:r(ann),vw:innerWidth,vh:innerHeight,sx:document.documentElement.scrollWidth,
    toast};`;

async function main() {
  const S = await demarrer();
  console.log('Sonde des suppressions de la Tour — tour.html ' + S.version);
  try {
    for (const [appareil, mode] of [['telephone', 'dark'], ['telephone', 'light'], ['bureau', 'light']]) {
      console.log('\n── ' + appareil + ' · ' + mode + ' ──');
      const o = await onglet(S, appareil, mode);
      const ev = o.ev;
      await ev(SCRIPTER);
      await ev('window.__dossier=' + JSON.stringify(DOSSIER) + '; return 1;');
      const doigt = appareil === 'telephone';
      /* Toucher un élément pour de vrai : amené au milieu de l'écran, et on PROUVE que le point touché
         est bien lui (règle du dépôt : une frappe qui tombe à côté se dit, elle ne se compte pas). */
      const frapper = async (sel, nom) => {
        const p = await ev(`const e=(${sel}); if(!e) return null; e.scrollIntoView({block:'center'}); ${STABLE}
          const r=e.getBoundingClientRect(); if(!r.width||!r.height) return {vide:1}; const x=r.left+r.width/2, y=r.top+r.height/2;
          const t=document.elementFromPoint(x,y); return {x,y,juste:!!t&&(t===e||e.contains(t)||(t.closest&&t.closest('label')&&t.closest('label').contains(e)))};`);
        if (!p || p.vide || !p.juste) { v('frappe perdue sur ' + nom, false, JSON.stringify(p)); return false; }
        if (doigt) {
          await o.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
          await dormir(50); await o.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await o.c.envoyer('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
        }
        await dormir(120); return true;
      };
      const etat = () => ev(PANNEAU);
      const corps = () => ev('return window.__corps.slice();');
      /* ⚠️ entSel BASCULE : rappelée sur la fiche déjà ouverte, elle la refermerait — on repart de la liste.
         Et chaque scénario repart d'un toast éteint : celui du scénario d'avant se lirait comme le sien. */
      const ouvrirFiche = async () => { await ev(`var t=document.getElementById('toast'); if(t){ t.textContent=''; t.style.display='none'; }
        setTab('entreprises',true); ENT.sel=null; render(); ${APAISER} entSel('boulmartin-7k2q'); await new Promise(r=>setTimeout(r,1200)); ${APAISER} return 1;`); };

      /* ══ 1. Supprimer UN compte ══ */
      await ouvrirFiche();
      const nb = await ev(`return [...document.querySelectorAll('#vue button')].filter(b=>b.textContent.trim()==='Supprimer').length;`);
      v('population : la fiche montre un « Supprimer » par compte (3)', nb === 3, nb);
      await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/compteSupprimer\\('claire'\\)/.test(b.getAttribute('onclick')||''))`, 'Supprimer (claire)');
      await dormir(400);
      let e = await etat();
      v('le panneau s’ouvre, titre au nom du compte', e.ouvert && /claire/.test(e.titre), e.titre);
      v('la question est posée, en gras', e.question === 'Es-tu sûr de vouloir supprimer ce compte ?', e.question);
      v('« Oui » naît éteint, la case vide', e.ouiEteint && !e.coche, 'éteint=' + e.ouiEteint + ' coché=' + e.coche);
      v('un seul bouton pour renoncer (« Annuler », pas de « Fermer » en plus)', !!e.ann && e.fermer === 0, 'Fermer ×' + e.fermer);
      await frapper(`document.getElementById('sup-oui')`, 'Oui (éteint)').catch(() => {});
      v('⛔ « Oui » éteint touché : rien ne part', (await corps()).length === 0, JSON.stringify(await corps()));
      await frapper(`document.querySelector('.sup-case span')`, 'la phrase de la case');
      e = await etat();
      v('toucher la PHRASE coche la case (toute la ligne répond), « Oui » s’allume', e.coche && !e.ouiEteint, 'coché=' + e.coche + ' éteint=' + e.ouiEteint);
      await ev(`window.__script['/api/monitor/compte/supprimer']=[{d:{ok:true,attente:true},lent:400}]; return 1;`);
      await frapper(`document.getElementById('sup-oui')`, 'Oui');
      e = await etat();
      v('pendant l’appel, « Oui » est éteint et le dit', e.ouiEteint && /Suppression…/.test(e.ouiTxt), e.ouiTxt);
      await ev(`document.getElementById('sup-oui')&&document.getElementById('sup-oui').click(); return 1;`);   // un second toucher, programmé
      await dormir(700);
      let c = await corps();
      v('⛔ un toucher, un ordre : UNE requête, avec confirme:true, sans code', c.length === 1 && c[0].b.confirme === true && c[0].b.login === 'claire' && c[0].b.t === 'boulmartin-7k2q' && !('code' in c[0].b), JSON.stringify(c));
      e = await etat();
      v('réussi : le panneau se ferme, le toast le dit', !e.ouvert && /Suppression ordonnée/.test(e.toast), e.toast);

      /* ══ 2. Le lot, et un refus du serveur ══ */
      await ev(`window.__corps=[]; window.__script['/api/monitor/comptes/supprimer']=[{st:409,d:{error:'Journal de connexions saturé (500 événements) pour cet espace : « jamais connecté » n’y est plus une preuve.'}}]; return 1;`);
      await ouvrirFiche();
      await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/comptesInutilisesSupprimer/.test(b.getAttribute('onclick')||''))`, 'Supprimer les comptes jamais utilisés');
      await dormir(400); e = await etat();
      v('le lot : la question nomme le nombre, la liste montre chaque compte', e.question === 'Es-tu sûr de vouloir supprimer ces 2 comptes ?' && await ev(`return [...document.querySelectorAll('#tour-panneau .reg-t1')].map(x=>x.textContent).join(',')`) === 'tom,zoe', e.question);
      await frapper(`document.getElementById('sup-ok')`, 'la case');
      await frapper(`document.getElementById('sup-oui')`, 'Oui');
      await dormir(500); e = await etat();
      c = await corps();
      v('le corps porte la liste relue et confirme:true', c.length === 1 && c[0].b.confirme === true && JSON.stringify(c[0].b.logins) === '["tom","zoe"]', JSON.stringify(c));
      v('⛔ refusé : le refus se DIT dans le panneau, qui reste ouvert', e.ouvert && /Journal de connexions saturé/.test(e.err), e.err);
      v('…et « Oui » redevient touchable (la case est toujours cochée)', !e.ouiEteint && e.coche && e.ouiTxt === 'Oui, supprimer', e.ouiTxt);
      await frapper(`[...document.querySelectorAll('#tour-panneau button')].find(b=>/Annuler/.test(b.textContent))`, 'Annuler');
      await dormir(600); e = await etat();
      v('« Annuler » ferme, sans rien envoyer de plus', !e.ouvert && (await corps()).length === 1);

      /* ══ 3. Le serveur d'avant : un code est parti — la Tour le demande, puis la suppression passe ══ */
      await ev(`window.__corps=[]; window.__prompts=[]; window.__repPrompt='482913';
        window.__script['/api/monitor/compte/supprimer']=[{d:{ok:true,codeEnvoye:true,dest:'p***@teamop.fr'}},{d:{ok:true,attente:true}}]; return 1;`);
      await ouvrirFiche();
      await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/compteSupprimer\\('tom'\\)/.test(b.getAttribute('onclick')||''))`, 'Supprimer (tom)');
      await dormir(400);
      await frapper(`document.getElementById('sup-ok')`, 'la case'); await frapper(`document.getElementById('sup-oui')`, 'Oui');
      await dormir(700); e = await etat(); c = await corps();
      const pr = await ev('return window.__prompts.slice();');
      v('serveur d’avant : le code est demandé une fois, en disant pourquoi', pr.length === 1 && /pas encore à jour/.test(pr[0]) && /p\*\*\*@teamop\.fr/.test(pr[0]), JSON.stringify(pr));
      v('…puis envoyé : deux requêtes, la seconde porte le code', c.length === 2 && c[0].b.confirme === true && c[1].b.code === '482913', JSON.stringify(c));
      v('…et la réussite se dit', !e.ouvert && /Suppression ordonnée/.test(e.toast), e.toast);
      /* code non saisi */
      await ev(`window.__corps=[]; window.__prompts=[]; window.__repPrompt=null;
        window.__script['/api/monitor/compte/supprimer']=[{d:{ok:true,codeEnvoye:true,dest:'p***@teamop.fr'}}]; return 1;`);
      await ouvrirFiche();
      await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/compteSupprimer\\('zoe'\\)/.test(b.getAttribute('onclick')||''))`, 'Supprimer (zoe)');
      await dormir(400);
      await frapper(`document.getElementById('sup-ok')`, 'la case'); await frapper(`document.getElementById('sup-oui')`, 'Oui');
      await dormir(600); e = await etat();
      v('⛔ code non saisi : rien n’est annoncé réussi, le panneau le dit', e.ouvert && /Code non saisi — rien n’a été supprimé/.test(e.err) && !/Suppression ordonnée/.test(e.toast), e.err + ' | ' + e.toast);
      await ev('tourPanneauFermer(); return 1;'); await dormir(500);

      /* ══ 4. Supprimer une entreprise partout : la question vit sous l'inventaire ══ */
      await ev(`window.__corps=[]; window.__prompts=[]; window.__script['/api/monitor/entreprise/supprimer']=[{d:{ok:true,supprime:true,t:'boulmartin-7k2q',nom:'Boulangerie Martin',fait:{},ecrit:true,avertissement:''}}]; return 1;`);
      await ouvrirFiche();
      await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/entSupprimer\\(/.test(b.getAttribute('onclick')||''))`, 'Supprimer partout');
      await dormir(500); e = await etat();
      v('le panneau montre ce qui va disparaître (l’inventaire)', e.ouvert && e.li >= 6, e.li + ' lignes');
      v('…puis la question, et « Oui, supprimer partout » éteint', e.question === 'Es-tu sûr de vouloir supprimer définitivement cette entreprise ?' && e.ouiEteint && e.ouiTxt === 'Oui, supprimer partout', e.question + ' · ' + e.ouiTxt);
      v('⛔ plus rien à retaper, plus de code : aucune fenêtre du navigateur', (await ev('return window.__prompts.length;')) === 0);
      /* au téléphone, tout se voit et se touche */
      if (doigt) {
        v('le panneau tient dans la largeur de l’écran (rien ne dépasse)', e.box.l >= 0 && e.box.r <= e.vw && e.sx <= e.vw, JSON.stringify(e.box) + ' / ' + e.vw);
        v('la case se touche sur toute sa ligne : ≥ 44 px', e.lab && e.lab.h >= 44, e.lab && e.lab.h + ' px');
        v('« Oui » et « Annuler » : ≥ 44 px', e.oui.h >= 44 && e.ann.h >= 44, e.oui.h + ' / ' + e.ann.h + ' px');
      }
      await frapper(`document.getElementById('sup-ok')`, 'la case'); await frapper(`document.getElementById('sup-oui')`, 'Oui, supprimer partout');
      await dormir(800); e = await etat(); c = await corps();
      v('supprimée : une requête { t, confirme:true }, le panneau se ferme, le toast le dit', c.length === 1 && c[0].b.t === 'boulmartin-7k2q' && c[0].b.confirme === true && !e.ouvert && /supprimée partout/.test(e.toast), JSON.stringify(c) + ' · ' + e.toast);

      /* ══ 5. Au clavier (bureau) : Échap ferme sans rien envoyer ══ */
      if (!doigt) {
        await ev(`window.__corps=[]; return 1;`);
        await ouvrirFiche();
        await frapper(`[...document.querySelectorAll('#vue button')].find(b=>/compteSupprimer\\('claire'\\)/.test(b.getAttribute('onclick')||''))`, 'Supprimer (claire)');
        await dormir(400);
        await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await o.c.envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await dormir(600); e = await etat();
        v('Échap ferme le panneau, rien ne part', !e.ouvert && (await corps()).length === 0);
      }
      v('aucune exception JavaScript', o.exceptions.length === 0, o.exceptions.slice(0, 3).join(' | '));
      await o.fermer();
    }
  } finally { S.fermer(); }
  console.log('\n' + ok.length + ' ✓  ' + ko.length + ' ✗');
  process.exit(ko.length ? 1 : 0);
}
main().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
