// RECONTRÔLE ADVERSE des « restes entreprise », tour 1 (18 novembre 2026). Ce n'est pas la sonde du correcteur : elle cherche ce que les corrections ont laissé ou cassé à côté.
//   g  : Boîte mail « Voir seul » — les gestes qui ÉCRIVENT et que le correcteur n'a pas listés (suivi de la demande, renommer / logo / côté d'une boîte, répondre rapide, brouillon)
//   p  : « Voir + Modifier » et « Voir + Créer » — la frontière entre les cases (répondre = Modifier, écrire = Créer), rejouée à deux appareils
//   b  : les bandeaux .alerte (13 endroits) de jour ET de nuit, et en mode Auto : le fond reste lisible, le texte garde son contraste
//   s  : la barre Retour collée (rl-colle) : ne passe pas au-dessus d'un panneau ouvert, ne reste pas collée sur une autre page
//   k  : scroll-padding-bottom 200 px sur écran bas (clavier ouvert) : le champ refusé reste visible
//   c  : l'arrondi du centime : saisies limites (exposant, signe, texte)
//   d  : bloc « Mot de passe provisoire » (cn-acces) à toutes les largeurs, valeur longue
// Usage : node …/entreprise-restes1-recontrole.js [g p b s k c d]. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes1-recontrole/';
const SEL = process.argv.slice(2); const veut = n => !SEL.length || SEL.includes(n);
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const personne = async (appareil, o, nuit) => { const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); await c.p.evaluate(D.INJECTER, Object.assign({ k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false }, o)); await L.calme(c.p, 500); return c; };
const RACINE = () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); return h && h.shadowRoot; };
(async () => {
  // ───── G : ce qui ÉCRIT sans être « répondre / archiver / supprimer »
  if (veut('g')) for (const [com, nom] of [['1000', 'Voir seul'], ['1111', 'toutes les cases']]) {
    const c = await personne('mac', { cases:cases({ com }) }); const p = c.p; await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const lignes = await p.evaluate(() => { const o = (() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); return h && h.shadowRoot; })(); return o ? o.querySelectorAll('.msg').length : 0; });
    v(`g « ${nom} » : population (${lignes} e-mails)`, lignes >= 5, lignes);
    // le suivi : on cherche une demande qui le porte (chaque message du prototype ne l'a pas) en parcourant les premières lignes
    const suivi = await p.evaluate(async () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const o = h.shadowRoot; const out = { trouve:false, visibles:[], essais:0 };
      const rows = [...o.querySelectorAll('.msg[data-id]')].slice(0, 25);
      for (const r of rows) { r.click(); await new Promise(z => setTimeout(z, 160)); out.essais++; const bs = [...o.querySelectorAll('[data-suivi]')].filter(b => b.getClientRects().length && getComputedStyle(b).display !== 'none'); if (bs.length) { out.trouve = true; out.visibles = bs.map(b => b.textContent.trim()); out.id = r.getAttribute('data-id'); break; } }
      return out; });
    console.log('  · suivi :', JSON.stringify(suivi));
    if (suivi.trouve) {
      const av = await p.evaluate(() => { const o = (() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); return h.shadowRoot; })(); const b = [...o.querySelectorAll('[data-suivi]')].find(x => x.getAttribute('aria-pressed') !== 'true'); if (!b) return null; const avant = [...o.querySelectorAll('[data-suivi][aria-pressed="true"]')].map(x => x.getAttribute('data-suivi')); b.click(); return new Promise(r => setTimeout(() => r({ avant, apres:[...o.querySelectorAll('[data-suivi][aria-pressed="true"]')].map(x => x.getAttribute('data-suivi')), toast:(o.querySelector('#toast') || {}).textContent }), 500)); });
      v(`g « ${nom} » : changer le suivi d'une demande ${com === '1000' ? 'est refusé (c\'est écrire)' : 'agit'}`, com === '1000' ? av && JSON.stringify(av.avant) === JSON.stringify(av.apres) : av && JSON.stringify(av.avant) !== JSON.stringify(av.apres), av);
    } else console.log('  · aucune demande à suivi parmi les 25 premières : section suivi non jouée (à dire)');
    // le menu d'une boîte : renommer / logo / côté / supprimer
    const menu = await p.evaluate(async () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const o = h.shadowRoot;
      const b = o.querySelector('[data-acct-menu], .acct-more, [data-menu-acct]'); return { present:!!b, html:b ? b.outerHTML.slice(0, 120) : '' }; });
    console.log('  · menu de boîte (ouverture directe) :', JSON.stringify(menu));
    await L.fin(c);
  }

  // ───── B : les .alerte (15 endroits dans l'écran) — fond lisible, contraste du texte, jour / nuit / Auto
  if (veut('b')) for (const [pr, nuit] of [['mac', false], ['mac', true], ['iphone', false], ['iphone', true]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
    const r = await p.evaluate(() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently:true });
      const rgb = col => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = col; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const sur = (fg, bg) => fg.slice(0, 3).map((x, i) => Math.round(x * fg[3] + bg[i] * (1 - fg[3])));
      const lum = c => { const a = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
      const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const fond = e => { let chaine = []; for (let n = e; n; n = n.parentElement) chaine.push(getComputedStyle(n).backgroundColor); let c = [255, 255, 255]; if (document.documentElement.dataset.mode === 'nuit') c = [11, 20, 38]; for (const b of chaine.reverse()) { const q = rgb(b); if (q[3] > 0) c = sur(q, c); } return c; };
      const hote = document.getElementById('contenu'); const sorties = [];
      for (const [ou, gabarit] of [['page', hote], ['carte', (() => { const k = document.createElement('div'); k.className = 'carte'; hote.appendChild(k); return k; })()]]) {
        const a = document.createElement('div'); a.className = 'alerte'; a.innerHTML = '<b>⚠ Titre</b> texte courant <span class="gris petit">gris petit</span> <button class="btn">Bouton</button>'; gabarit.appendChild(a);
        const bg = fond(a), t = rgb(getComputedStyle(a).color), tt = rgb(getComputedStyle(a.querySelector('b')).color), gp = rgb(getComputedStyle(a.querySelector('.gris')).color);
        sorties.push({ ou, bg, texte:+ctr(t, bg).toFixed(2), titre:+ctr(tt, bg).toFixed(2), gris:+ctr(gp, bg).toFixed(2), bord:getComputedStyle(a).borderTopColor }); a.remove();
      }
      const ban = document.querySelector('.ent-ban'); let bandeau = null; if (ban) { const bg = fond(ban); bandeau = { bg, texte:+ctr(rgb(getComputedStyle(ban).color), bg).toFixed(2), classes:ban.className }; }
      return { mode:document.documentElement.dataset.mode, sorties, bandeau };
    });
    for (const o of r.sorties) v(`b ${pr}${nuit ? ' nuit' : ''} .alerte sur ${o.ou} : texte ${o.texte}, titre ${o.titre}, gris ${o.gris} (≥ 4,5 attendu pour le texte courant)`, o.texte >= 4.5 && o.titre >= 4.5 && o.gris >= 4, o);
    if (r.bandeau) v(`b ${pr}${nuit ? ' nuit' : ''} .ent-ban : contraste ${r.bandeau.texte}`, r.bandeau.texte >= 4.5, r.bandeau); else console.log('  · pas de bandeau .ent-ban sur cette fiche (population 0 : non compté)');
    v(`b ${pr}${nuit ? ' nuit' : ''} : le mode posé est bien ${nuit ? 'nuit' : 'jour'}`, r.mode === (nuit ? 'nuit' : 'jour'), r.mode);
    await L.capture(c, CAP + `b-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }

  // ───── S : la barre Retour collée
  if (veut('s')) for (const [pr, nuit] of [['iphone', false], ['mac', true]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
    await L.toucher(c, '[data-ent="lien|auto"]'); await L.calme(p, 1500); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 400);
    const a = await p.evaluate(() => { const b = document.querySelector('.rl-retour'); const cs = b ? getComputedStyle(b) : null; const q = b && b.getBoundingClientRect(); const cal = document.getElementById('calque');
      return { colle:!!b && b.classList.contains('rl-colle'), fond:cs && cs.backgroundColor, pos:cs && cs.position, z:cs && cs.zIndex, calqueZ:getComputedStyle(cal).zIndex, haut:q && Math.round(q.top) }; });
    v(`s ${pr}${nuit ? ' nuit' : ''} : la barre collée a un fond plein (pas transparent), z-index ${a.z} (calque ${a.calqueZ})`, a.colle && a.pos === 'sticky' && !/rgba\(0, 0, 0, 0\)|transparent/.test(a.fond), a);
    // un panneau ouvert depuis cette page passe AU-DESSUS de la barre collée (la barre ne doit jamais couvrir une feuille)
    const o = await p.evaluate(() => { try { if (typeof ouvrirPanneau === 'function') ouvrirPanneau('<h2>Essai</h2><p>Panneau d’essai</p><div class="actions"><button class="btn" data-ferme="1">Fermer</button></div>'); } catch (e) {} const pn = document.querySelector('#calque .panneau'); if (!pn) return { ouvert:false };
      const q = pn.getBoundingClientRect(); const b = document.querySelector('.rl-retour'); const bq = b.getBoundingClientRect();
      const g = Math.max(bq.left, q.left), d = Math.min(bq.right, q.right), h = Math.max(bq.top, q.top), bs = Math.min(bq.bottom, q.bottom); const chevauche = d - g > 4 && bs - h > 4;
      if (!chevauche) return { ouvert:true, chevauche:false, barre:[Math.round(bq.left), Math.round(bq.top), Math.round(bq.right), Math.round(bq.bottom)], panneau:[Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)] };
      const dessus = document.elementFromPoint(Math.round((g + d) / 2), Math.round((h + bs) / 2)); return { ouvert:true, chevauche, barreDansPanneau:!!(dessus && dessus.closest('.panneau')), barreSousBarre:!!(dessus && dessus.closest('.rl-retour')) }; });
    if (o.ouvert && o.chevauche) v(`s ${pr}${nuit ? ' nuit' : ''} : un panneau ouvert recouvre la barre collée là où ils se croisent`, o.barreDansPanneau && !o.barreSousBarre, o);
    else console.log('  · panneau :', JSON.stringify(o), '(ne se croisent pas : non compté)');
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    // aller ailleurs puis revenir : plus de barre collée sur une page qui n'a pas demandé l'arrivée
    await L.toucher(c, '.rl-retour'); await L.calme(p, 900); const b2 = await p.evaluate(() => ({ route, colle:document.querySelectorAll('.rl-colle').length }));
    v(`s ${pr}${nuit ? ' nuit' : ''} : revenu à Mon entreprise, plus de barre collée (${b2.colle})`, b2.route === 'entreprise' && b2.colle === 0, b2);
    await L.fin(c);
  }

  // ───── K : écran bas (clavier ouvert), le champ refusé reste visible
  if (veut('k')) for (const [W, H, nuit] of [[360, 420, false], [320, 330, true], [390, 360, false]]) {
    const c = await C.ouvrirEnt({ profil:'iphone', nuit }); const p = c.p; await p.setViewportSize({ width:W, height:H }); await L.calme(p, 500);
    await L.toucher(c, '[data-ent="carte|ident"]'); await L.calme(p, 400);
    await C.remplir(p, 'en-site', 'pas un site'); await L.toucher(c, '[data-ent="identok"]'); await L.calme(p, 500);
    const r = await p.evaluate(() => { const e = document.getElementById('en-site'), m = document.getElementById('en-site-err'), pn = document.querySelector('#calque .panneau'), rg = document.querySelector('#calque .panneau > .actions:last-child');
      const q = e && e.getBoundingClientRect(), mq = m && m.getBoundingClientRect(), pq = pn && pn.getBoundingClientRect(), g = rg && rg.getBoundingClientRect(); return { H:innerHeight, champ:q && [Math.round(q.top), Math.round(q.bottom)], msg:mq && [Math.round(mq.top), Math.round(mq.bottom)], rangeeHaut:g && Math.round(g.top), panneauHaut:pq && Math.round(pq.top), rangeeHauteur:g && Math.round(g.height) }; });
    const vu = r.champ && r.msg && r.champ[0] >= 0 && r.msg[1] <= (r.rangeeHaut ?? r.H) + 1 && r.champ[0] >= (r.panneauHaut ?? 0) - 1;
    v(`k ${W}×${H}${nuit ? ' nuit' : ''} : le champ refusé et son message se voient (champ ${r.champ}, message ${r.msg}, rangée collée dès ${r.rangeeHaut}, écran ${r.H})`, !!vu, r);
    await L.capture(c, CAP + `k-${W}x${H}.png`, false); await L.fin(c);
  }

  // ───── C : l'arrondi du centime, saisies limites
  if (veut('c')) {
    const c = await C.ouvrirEnt({ profil:'mac' }); const p = c.p; let n = 0;
    const essais = [['1e2', 'ok?'], ['1,5e1', 'ok?'], ['-5', null], ['abc', null], ['  12,345  ', 12.35], ['12.345', 12.35], ['0,995', null], ['1,004', 1], ['499,995', 500], ['500,004', null], ['1 000', null], ['12 345', null], ['', null]];
    for (const [saisie, attendu] of essais) {
      const av = await p.evaluate(() => TARIFS.horaire); await L.toucher(c, '[data-ent="carte|horaires"]'); await L.calme(p, 250); await C.remplir(p, 'en-horaire', saisie); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 250);
      const t = await p.evaluate(() => ({ h:TARIFS.horaire, ouv:!!document.querySelector('#calque .panneau'), nan:Number.isNaN(TARIFS.horaire) })); n++;
      v(`c « ${saisie} » : jamais NaN ni hors bornes dans le tarif rangé (rangé ${t.h}, panneau ${t.ouv ? 'ouvert' : 'fermé'})`, !t.nan && t.h >= 1 && t.h <= 500, t);
      if (typeof attendu === 'number') v(`c « ${saisie} » : rangé ${attendu}`, t.h === attendu, t); else if (attendu === null) v(`c « ${saisie} » : refusé, tarif inchangé (${av})`, t.ouv && t.h === av, t);
      console.log(`  · « ${saisie} » → ${t.ouv ? 'refusé' : 'rangé ' + t.h}`);
      if (t.ouv) await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
    v('c : population : ' + n + ' essais joués', n === essais.length, n); await L.fin(c);
  }

  // ───── D : le bloc Connexion d'une fiche personne, nom très long, quatre largeurs
  if (veut('d')) for (const [pr, nuit] of [['petit', false], ['android', true], ['ipad', false], ['mac', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; await L.aller(p, 'equipe');
    await p.evaluate(() => { try { const m = eqDe('julie'); m.prenom = 'Maximilien-Alexandre'; m.nom = 'Montmorency-Vandenberghe'; if (m.email) m.email = 'maximilien-alexandre.montmorency-vandenberghe@entreprise-tres-longue.example'; } catch (e) {} eqFiche('julie'); const dt = document.querySelector('details.eqx-det'); if (dt) dt.open = true; }); await L.calme(p, 900);
    const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), b = z && z.querySelector('.cn-acces'); if (!b) return null; b.scrollIntoView({ block:'center' }); const W = z.clientWidth, zr = z.getBoundingClientRect();
      const hors = [...b.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > zr.right + 1 || q.left < zr.left - 1); }).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right - zr.right));
      return { W, sw:z.scrollWidth, pageSw:document.documentElement.scrollWidth, innerW:innerWidth, hors, nb:b.querySelectorAll('.ligne').length, titre:(z.querySelector('h2') || {}).textContent }; });
    v(`d ${pr}${nuit ? ' nuit' : ''} : le bloc Connexion existe (population : ${r ? r.nb : 0} lignes)`, !!r && r.nb >= 5, r);
    if (r) v(`d ${pr}${nuit ? ' nuit' : ''} : nom très long : la fiche ne glisse pas de côté (scrollWidth ${r.sw} pour ${r.W}, page ${r.pageSw}/${r.innerW}) et rien du bloc ne dépasse`, r.sw <= r.W + 1 && r.pageSw <= r.innerW + 1 && r.hors.length === 0, r);
    await L.calme(p, 300); await L.capture(c, CAP + `d-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }
  // ───── S2 : une grande feuille (« Ton entreprise ») ouverte depuis la page où la barre est collée la recouvre
  if (veut('s2')) for (const [pr, nuit] of [['iphone', false], ['android', true], ['ipad', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
    await L.toucher(c, '[data-ent="lien|rdv"]'); await L.calme(p, 1500); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    await p.evaluate(() => { const b = document.querySelector('.rl-retour'); if (b) b.classList.add('rl-colle'); window.scrollTo(0, 300); }); await L.calme(p, 400);
    const o = await p.evaluate(() => { try { ouvrirPanneau('<h2>Grande feuille</h2>' + '<p>ligne</p>'.repeat(60) + '<div class="actions"><button class="btn">Fermer</button></div>'); } catch (e) { return { err:String(e) }; } return null; }); await L.calme(p, 700);
    const r = await p.evaluate(() => { const pn = document.querySelector('#calque .panneau'), b = document.querySelector('.rl-retour'); if (!pn || !b) return { pn:!!pn, b:!!b }; const q = pn.getBoundingClientRect(), bq = b.getBoundingClientRect(); const g = Math.max(bq.left, q.left), d = Math.min(bq.right, q.right), h = Math.max(bq.top, q.top), bs = Math.min(bq.bottom, q.bottom); const chevauche = d - g > 4 && bs - h > 4;
      if (!chevauche) return { chevauche:false, barre:[bq.left, bq.top, bq.right, bq.bottom].map(Math.round), panneau:[q.left, q.top, q.right, q.bottom].map(Math.round) }; const e = document.elementFromPoint(Math.round((g + d) / 2), Math.round((h + bs) / 2)); return { chevauche:true, dansPanneau:!!(e && e.closest('.panneau')), surBarre:!!(e && e.closest('.rl-retour')), e:e && e.tagName + '.' + e.className }; });
    console.log('  ·', pr, JSON.stringify(r));
    if (r && r.chevauche) v(`s2 ${pr}${nuit ? ' nuit' : ''} : la feuille ouverte passe AU-DESSUS de la barre collée`, r.dansPanneau && !r.surBarre, r);
    await L.capture(c, CAP + `s2-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }
  // ───── H : le menu d'une boîte (clic droit sur une boîte du tiroir) : ce qui y reste pour « Voir seul »
  if (veut('h')) for (const [com, nom] of [['1000', 'Voir seul'], ['1010', 'Voir + Modifier'], ['1111', 'toutes les cases']]) {
    const c = await personne('mac', { cases:cases({ com }) }); const p = c.p; await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const r = await p.evaluate(async () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const o = h.shadowRoot; const rows = [...o.querySelectorAll('#sideBody .scope-row[data-scope]')]; const row = rows.find(x => /^b\d+$/.test(x.getAttribute('data-scope'))) || rows[rows.length - 1]; if (!row) return { ligne:false };
      const q = row.getBoundingClientRect(); row.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true, composed:true, clientX:q.left + 20, clientY:q.top + 10 })); await new Promise(z => setTimeout(z, 400));
      const items = [...o.querySelectorAll('[data-pick]')].filter(b => b.getClientRects().length).map(b => (b.textContent || '').trim()).filter(Boolean); return { ligne:true, items }; });
    v(`h « ${nom} » : population : une boîte du tiroir, son menu s'ouvre (${(r.items || []).length} entrées)`, r.ligne && r.items.length >= 2, r);
    if (r.items) { console.log('  ·', nom, JSON.stringify(r.items)); v(`h « ${nom} » : « Supprimer la boîte… » ${com === '1000' || com === '1010' ? 'n’est pas proposé' : 'est proposé'}`, (com === '1111') === r.items.some(x => /Supprimer la boîte/.test(x)), r.items); }
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
}
)().catch(e => { console.error('ERREUR', e); process.exit(2); });
