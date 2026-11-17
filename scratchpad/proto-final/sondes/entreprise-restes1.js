// RESTES « entreprise », tour 1 (17 novembre 2026) : ce que le recontrôle a laissé ouvert, rejoué dans la vraie page.
//   m  : tout-08 — la Boîte mail lit les droits (Voir seul = lire et rien d'autre) : gestes non proposés ET refusés (clavier, hôte), cinq jeux de cases, mac
//   mt : la même chose au téléphone (iphone, nuit) : rien n'est proposé, et rien ne déborde
//   d  : la fiche « Droits » d'une personne ne glisse plus de côté (bloc Connexion) à 320, 360, 390
//   r  : tout-11 — après chaque lien de « Ce qui se règle ailleurs », la barre « ‹ Retour · Mon entreprise » reste à l'écran (et ramène)
//   a  : l'arrondi du centime (1,005 → 1,01 ; 8,575 → 8,58 ; 10,075 → 10,08 ; 1,255 → 1,26)
//   c  : la rangée « Enregistrer » collée ne cache pas le champ refusé (rejouée par entreprise-recontrole.js casse1, ici une seule carte)
// Usage : node scratchpad/proto-final/sondes/entreprise-restes1.js [m mt d r a c]   (sans argument : tout). Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
// ⛔ 127.0.0.1 seulement, entreprise fictive Clim Services 17.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-restes1/';
const SEL = process.argv.slice(2); const veut = n => !SEL.length || SEL.includes(n);
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const personne = async (appareil, o, nuit) => { const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); await c.p.evaluate(D.INJECTER, Object.assign({ k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false }, o)); await L.calme(c.p, 500); return c; };
// ce que le module montre, lu dans son arbre d'ombre : les boutons VISIBLES (nom, étiquette ou info-bulle)
const BOUTONS = () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const o = h && h.shadowRoot; const opc = o && o.querySelector('.opc');
  const vis = e => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  return { ok:!!o, attrs:opc ? ['data-ecrire', 'data-ranger', 'data-supprimer'].map(a => opc.getAttribute(a)) : null, boutons:o ? [...o.querySelectorAll('button')].filter(vis).map(b => (b.getAttribute('aria-label') || b.title || b.textContent || '').trim()).filter(Boolean) : [],
    toast:o && o.querySelector('#toast') ? o.querySelector('#toast').textContent.replace(/\s+/g, ' ').trim() : '', toastOn:!!(o && o.querySelector('#toast.show')), feuille:o ? !!o.querySelector('.sheet') : false, lignes:o ? o.querySelectorAll('.msg').length : 0 }; };
const OUVRIR_UN = () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const r = h && h.shadowRoot.querySelector('.msg[data-id]'); if (r) { r.click(); r.focus(); } return !!r; };
const MAC = [['1000', 'Voir seul', { ecrire:false, ranger:false, supprimer:false }], ['1010', 'Voir + Modifier', { ecrire:false, ranger:true, supprimer:false }], ['1100', 'Voir + Créer', { ecrire:true, ranger:false, supprimer:false }],
  ['1001', 'Voir + Supprimer', { ecrire:false, ranger:false, supprimer:true }], ['1111', 'toutes les cases', { ecrire:true, ranger:true, supprimer:true }]];
const A_ECRIRE = ["Nouveau message", "Transférer", "＋ Écrire"], A_RANGER = ['Répondre', 'Répondre à tous', 'Drapeau', 'Archiver', 'Marquer comme non lu', 'Déplacer dans les indésirables'], A_SUPPR = ['Supprimer'];
(async () => {
  // ───── M : la Boîte mail lit les droits
  if (veut('m')) for (const [com, nom, att] of MAC) {
    const c = await personne('mac', { cases:cases({ com }) }); const p = c.p; await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const a0 = await p.evaluate(BOUTONS); v(`m « ${nom} » : le module est monté (population : ${a0.lignes} e-mails dans la liste)`, a0.ok && a0.lignes >= 5, a0.lignes);
    await p.evaluate(OUVRIR_UN); await L.calme(p, 700); const a = await p.evaluate(BOUTONS); const B = a.boutons.join('|');
    const a1 = (liste) => liste.filter(x => a.boutons.includes(x));
    v(`m « ${nom} » : « Nouveau message » et « Transférer » ${att.ecrire ? 'sont proposés' : 'ne sont PAS proposés'}`, att.ecrire ? a1(A_ECRIRE).length >= 1 : a1(A_ECRIRE).length === 0, a1(A_ECRIRE));
    const he = await p.evaluate(() => !!document.querySelector('.mbx-ecrire')); v(`m « ${nom} » : le bouton « ＋ Écrire » de l'en-tête de la rubrique ${att.ecrire ? 'est proposé' : 'n’est PAS proposé'}`, he === att.ecrire, he);
    v(`m « ${nom} » : répondre, drapeau, archiver, marquer, ranger ${att.ranger ? 'sont proposés' : 'ne sont PAS proposés'}`, att.ranger ? a1(A_RANGER).length >= 4 : a1(A_RANGER).length === 0, a1(A_RANGER));
    v(`m « ${nom} » : « Supprimer » ${att.supprimer ? 'est proposé' : 'n’est PAS proposé'}`, att.supprimer ? a1(A_SUPPR).length === 1 : a1(A_SUPPR).length === 0, a1(A_SUPPR));
    v(`m « ${nom} » : la personne LIT toujours (la liste, « Boîte de réception », la recherche restent là)`, /Boîte de réception/.test(B) && a.lignes >= 5, a.boutons.slice(0, 6));
    // les raccourcis clavier : un geste refusé se DIT (la phrase des autres rubriques) et ne change rien ; un geste permis agit
    const geste = async (touche, quoi, permis, attendu) => {
      await p.evaluate(OUVRIR_UN); await L.calme(p, 350);   // un geste qui agit redessine la liste : le focus revient sur une ligne avant la touche suivante
      const etat0 = await p.evaluate(() => ({ lignes:BOUTONS_N(), refus:DROITS_REFUS.length })); await p.keyboard.press(touche); await L.calme(p, 500);
      const t = await p.evaluate(BOUTONS), e1 = await p.evaluate(() => ({ lignes:BOUTONS_N(), refus:DROITS_REFUS.length }));
      if (permis) v(`m « ${nom} » : « ${touche} » (${quoi}) agit`, attendu(t, etat0, e1), { toast:t.toast, feuille:t.feuille, etat0, e1 });
      else v(`m « ${nom} » : « ${touche} » (${quoi}) est refusé par la phrase des autres rubriques, rien ne change`, /pas ouvert à ton compte/.test(t.toast) && !t.feuille && e1.lignes === etat0.lignes && e1.refus === etat0.refus + 1, { toast:t.toast, feuille:t.feuille, etat0, e1 });
      await p.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const d = h.shadowRoot.querySelector('[data-dpick="cancel"], .sheet [aria-label="Annuler"]'); if (d) d.click(); try { COURRIER.inst.fermer(); } catch (e) {} }); await L.calme(p, 300); };
    await p.evaluate(() => { window.BOUTONS_N = () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); return h.shadowRoot.querySelectorAll('.msg').length; }; });
    await geste('f', 'drapeau', att.ranger, (t) => /marqué|Drapeau/i.test(t.toast));
    await geste('c', 'nouveau message', att.ecrire, (t) => t.feuille);
    await p.evaluate(OUVRIR_UN); await L.calme(p, 400);
    await geste('e', 'archiver', att.ranger, (t, e0, e1) => /archiv/i.test(t.toast) && e1.lignes === e0.lignes - 1);
    await p.evaluate(OUVRIR_UN); await L.calme(p, 400);
    await geste('Delete', 'supprimer', att.supprimer, (t, e0, e1) => /supprim/i.test(t.toast) && e1.lignes === e0.lignes - 1);
    // l'hôte : « Écrire à… » d'une fiche client et « Répondre » depuis une tâche passent par la même porte
    const h = await p.evaluate(() => { const n0 = DROITS_REFUS.length; COURRIER.inst.ecrire('x@exemple.fr', 'Essai', ''); return new Promise(r => setTimeout(() => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); r({ feuille:!!h.shadowRoot.querySelector('.sheet'), refus:DROITS_REFUS.length - n0 }); }, 700)); });
    v(`m « ${nom} » : « Écrire à… » venu de l'hôte ${att.ecrire ? 'ouvre le message' : 'est refusé (rien ne s’ouvre, un refus compté)'}`, att.ecrire ? h.feuille : !h.feuille && h.refus === 1, h);
    if (com === '1000' || com === '1111') await L.capture(c, CAP + `m-${com}-mac.png`, false);
    await L.fin(c);
  }

  // ───── MT : au téléphone, jour et nuit
  if (veut('mt')) for (const [pr, nuit, com, nom] of [['iphone', true, '1000', 'Voir seul'], ['iphone', false, '1010', 'Voir + Modifier'], ['android', false, '1000', 'Voir seul'], ['iphone', false, '1111', 'toutes les cases']]) {
    const c = await personne(pr, { cases:cases({ com }) }, nuit); const p = c.p; await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const a = await p.evaluate(BOUTONS); const seul = com === '1000';
    v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : le module est monté (population : ${a.boutons.length} boutons, ${a.lignes} e-mails)`, a.ok && a.boutons.length > 3, a.boutons.length);
    v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : « Nouveau message » ${com === '1111' ? 'est proposé' : 'n’est pas proposé'}`, com === '1111' ? a.boutons.includes('Nouveau message') : !a.boutons.includes('Nouveau message'), a.boutons.filter(x => /Nouveau/.test(x)));
    const he = await p.evaluate(() => !!document.querySelector('.mbx-ecrire')); v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : « ＋ Écrire » de l'en-tête ${com === '1111' ? 'est proposé' : 'n’est pas proposé'}`, he === (com === '1111'), he);
    v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : « Sélectionner » ${seul ? 'n’est pas proposé (rien à faire en sélection)' : 'est proposé'}`, seul ? !a.boutons.includes('Sélectionner') : a.boutons.includes('Sélectionner'), a.boutons.filter(x => /Sélection/.test(x)));
    await p.evaluate(OUVRIR_UN); await L.calme(p, 900); const b = await p.evaluate(BOUTONS);
    v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : un e-mail ouvert ${seul ? 'ne propose ni Répondre ni Archiver ni Supprimer' : com === '1010' ? 'propose Répondre et Archiver, pas Supprimer' : 'propose tout'}`,
      seul ? !b.boutons.some(x => /^(Répondre|Archiver|Supprimer|Drapeau|Transférer)/.test(x)) : com === '1010' ? b.boutons.some(x => /^Répondre/.test(x)) && !b.boutons.includes('Supprimer') : b.boutons.includes('Supprimer'), b.boutons);
    const lat = await p.evaluate(() => { const W = innerWidth; return { deborde:document.documentElement.scrollWidth > W + 1, sw:document.documentElement.scrollWidth, W }; });
    v(`mt ${pr}${nuit ? ' nuit' : ''} « ${nom} » : rien ne dépasse de côté`, !lat.deborde, lat);
    await L.capture(c, CAP + `mt-${com}-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }

  // ───── D : la fiche « Droits » d'une personne ne glisse plus de côté (bloc Connexion)
  if (veut('d')) for (const [pr, nuit] of [['petit', true], ['android', false], ['iphone', false], ['petit', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiche('julie'); const dt = document.querySelector('details.eqx-det'); if (dt) dt.open = true; }); await L.calme(p, 900);
    const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), b = z && z.querySelector('.cn-acces'); if (!b) return null; b.scrollIntoView({ block:'center' }); const W = z.clientWidth, zr = z.getBoundingClientRect();
      const hors = [...b.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && (q.right > zr.right + 1 || q.left < zr.left - 1); }).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right - zr.right));
      return { W, sw:z.scrollWidth, hors, boutons:[...b.querySelectorAll('.btn')].map(e => Math.round(e.getBoundingClientRect().width)), nb:b.querySelectorAll('.ligne').length }; });
    v(`d ${pr}${nuit ? ' nuit' : ''} : le bloc Connexion existe (population : ${r ? r.nb : 0} lignes)`, !!r && r.nb >= 5, r);
    if (r) v(`d ${pr}${nuit ? ' nuit' : ''} : la fiche ne glisse pas de côté (scrollWidth ${r.sw} pour ${r.W}) et rien du bloc ne dépasse`, r.sw <= r.W + 1 && r.hors.length === 0, r);
    await L.calme(p, 300); await L.capture(c, CAP + `d-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }

  // ───── R : la barre « ‹ Retour · Mon entreprise » reste à l'écran après chacun des liens, et ramène
  if (veut('r')) for (const pr of ['iphone', 'android', 'mac']) for (const lien of ['rdv', 'auto', 'ndf', 'stock', 'boites']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p; const H = L.PROFILS[pr].h;
    await L.toucher(c, `[data-ent="lien|${lien}"]`); await L.calme(p, 1500); const ici = await p.evaluate(() => route);
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 400);
    const a = await p.evaluate(() => { const b = document.querySelector('.rl-retour'); const q = b && b.getBoundingClientRect(); return { barre:!!b, t:b ? b.textContent.replace(/\s+/g, ' ').trim() : '', haut:q ? Math.round(q.top) : 0, bas:q ? Math.round(q.bottom) : 0, sy:Math.round(scrollY) }; });
    v(`r ${pr} « ${lien} » (${ici}, page défilée de ${a.sy} px) : la barre « Retour · Mon entreprise » est à l'écran (${a.haut} → ${a.bas} sur ${H})`, a.barre && /Mon entreprise/.test(a.t) && a.haut >= 0 && a.bas <= H, a);
    if (lien === 'auto' || lien === 'ndf') await L.capture(c, CAP + `r-${lien}-${pr}.png`, false);
    // le toucher sur la barre ramène à Mon entreprise (même quand elle est collée)
    await L.toucher(c, '.rl-retour'); await L.calme(p, 900); const b = await p.evaluate(() => ({ route, barre:!!document.querySelector('.rl-retour') }));
    v(`r ${pr} « ${lien} » : un toucher sur la barre ramène à Mon entreprise, sans barre en boucle`, b.route === 'entreprise' && !b.barre, b);
    await L.fin(c);
  }

  // ───── A : l'arrondi du centime (les demi-centimes décimaux)
  if (veut('a')) {
    const c = await C.ouvrirEnt({ profil:'mac' }); const p = c.p; const essais = [['1,005', 1.01], ['8,575', 8.58], ['10,075', 10.08], ['1,255', 1.26], ['65,555', 65.56], ['65', 65], ['0,5', null], ['501', null]]; let n = 0;
    for (const [saisie, attendu] of essais) {
      await L.toucher(c, '[data-ent="carte|horaires"]'); await L.calme(p, 250); await C.remplir(p, 'en-horaire', saisie); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 250);
      const t = await p.evaluate(() => ({ h:TARIFS.horaire, ouv:!!document.querySelector('#calque .panneau') })); n++;
      if (attendu === null) v(`a « ${saisie} » : refusé (hors de 1 à 500 €), le tarif ne bouge pas`, t.ouv, t); else v(`a « ${saisie} » : rangé ${attendu}`, t.h === attendu && !t.ouv, t);
      if (t.ouv) await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
    v('a : population : huit essais joués', n === 8, n); await L.fin(c);
  }

  // ───── C : la rangée « Enregistrer » collée ne cache pas le champ refusé (tous les cas : entreprise-recontrole.js casse1 — 12 essais)
  if (veut('c')) for (const [pr, nuit] of [['iphone', false], ['petit', true]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; await L.toucher(c, '[data-ent="carte|ident"]'); await L.calme(p, 300);
    await C.remplir(p, 'en-site', 'pas un site'); await L.toucher(c, '[data-ent="identok"]'); await L.calme(p, 400);
    const r = await p.evaluate(() => { const e = document.getElementById('en-site'), m = document.getElementById('en-site-err'), rg = document.querySelector('#calque .panneau > .actions:last-child'); const g = rg && rg.getBoundingClientRect(), q = e.getBoundingClientRect(), mq = m && m.getBoundingClientRect(); return { champBas:Math.round(q.bottom), msgBas:mq ? Math.round(mq.bottom) : null, rangeeHaut:g ? Math.round(g.top) : null, actif:document.activeElement === e }; });
    v(`c ${pr}${nuit ? ' nuit' : ''} : le champ refusé a le focus et se voit AU-DESSUS de la rangée collée, son message aussi`, r.actif && r.rangeeHaut !== null && r.champBas <= r.rangeeHaut && r.msgBas !== null && r.msgBas <= r.rangeeHaut, r);
    await L.capture(c, CAP + `c-${pr}${nuit ? '-nuit' : ''}.png`, false); await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
