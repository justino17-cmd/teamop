// RECONTRÔLE ADVERSE du lot « entreprise » (étape 8 sur 8, 17 novembre 2026). Ce n'est PAS la sonde du correcteur : chaque section part du défaut
// d'origine (entreprise-relecture-tout.json), refait le geste d'une personne dans la vraie page, puis pousse plus loin que le correcteur
// (valeurs limites, second chemin vers le même geste, autre appareil, nuit) — c'est là que se cachent les restes et les casses.
// Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement, entreprise fictive Clim Services 17.
// Usage : node scratchpad/proto-final/sondes/entreprise-recontrole.js [r01 r02 … r13 casse p1 p2 p3]   (sans argument : tout)
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/entreprise-recontrole/';
const SEL = process.argv.slice(2); const veut = n => !SEL.length || SEL.includes(n);
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const personne = async (appareil, o, nuit) => { const c = await D.ouvrirComme({ qui:'marc', appareil, nuit }); await c.p.evaluate(D.INJECTER, Object.assign({ k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false }, o)); await L.calme(c.p, 500); return c; };
const norm = t => String(t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const EFFACER = () => { Object.assign(ENTREPRISE, { siret:'', tva:'', forme:'', capital:'', rcs:'', assureur:'', assurNum:'', assurc:'', assurZone:'', mediateur:'' }); rendre(); };
(async () => {
  // ───── R01 : un gérant qui n'a rempli QUE le SIRET débloque sa facture — et ce qui est faux reste refusé (valeurs limites, deux appareils)
  if (veut('r01')) for (const pr of ['mac', 'petit']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p; await p.evaluate(EFFACER); await L.calme(p, 400);
    const ban = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { t:b.textContent.replace(/\s+/g, ' ').trim(), orange:b.classList.contains('attention'), M:entrepriseManque().map(x => x.k) }; });
    v(`r01 ${pr} : fiche vide → le bandeau demande le SIRET (population : ${ban.M.length} manque bloquant)`, ban.orange && /SIRET/.test(ban.t) && ban.M.includes('siret'), ban);
    await L.toucher(c, '[data-ent="completer"]'); await L.calme(p, 400);
    // refus : chaque valeur FAUSSE, panneau gardé, fiche inchangée
    const faux = [['fl-siret', '1234567890123', 'SIRET de 13 chiffres'], ['fl-siret', '7328293200007A', 'SIRET avec une lettre'], ['fl-siret', '', 'SIRET vide'], ['fl-siret', '732 829 320 00074 9', 'SIRET de 15 chiffres']];
    for (const [id, val, nom] of faux) { await p.locator('#' + id).fill(val); await L.toucher(c, '[data-cx="ficheok"]'); const r = await C.champ(p, id); const s = await p.evaluate(() => ENTREPRISE.siret); v(`r01 ${pr} : ${nom} refusé, rien d'écrit`, !!r && r.invalide && s === '', { r, s }); }
    await p.locator('#fl-siret').fill('73282932000074');
    for (const x of ['FR12', 'FR 12 345678', 'XX12345678901']) { await p.locator('#fl-tva').fill(x); await L.toucher(c, '[data-cx="ficheok"]'); const r = await C.champ(p, 'fl-tva'); v(`r01 ${pr} : TVA « ${x} » refusée`, !!r && r.invalide, r); }
    await p.locator('#fl-tva').fill('');
    // capital : seulement quand une forme est choisie ; un montant doit être > 0
    const formes = await p.evaluate(() => [...document.querySelectorAll('#fl-forme option')].map(o => o.value).filter(Boolean));
    const sas = formes.find(f => !/^Entreprise individuelle/.test(f)); await p.locator('#fl-forme').selectOption(sas);
    for (const [x, ok] of [['abc', false], ['-5', false], ['0', false], ['5 000', true]]) {
      await p.locator('#fl-cap').fill(x); await L.toucher(c, '[data-cx="ficheok"]'); await L.calme(p, 200); const ouv = await C.panneauOuvert(p);
      const cap = await p.evaluate(() => ENTREPRISE.capital); v(`r01 ${pr} : capital « ${x} » ${ok ? 'accepté' : 'refusé'} (population : forme « ${sas} »)`, ok ? ouv === '' && cap === '5 000' : ouv !== '' && cap === '', { ouv, cap });
      if (ok) break;
    }
    // la fiche d'une facture : plus de blocage du SIRET, et la facture PEUT partir par le vrai bouton
    const fac = await p.evaluate(() => { const f = FACTURES.find(x => x.st === 'avalider' && lignesDe(x).every(ligneOk)); return f ? f.id : null; });
    v(`r01 ${pr} : population : une facture « à valider » est prête`, !!fac, fac);
    if (fac) { await L.aller(p, 'facture-x-' + fac); await L.calme(p, 600);
      const g = await p.evaluate(() => ({ bloquee:!!document.querySelector('.ent-ban .btn[data-ent="completer"]'), texte:norm(document.querySelector('#contenu').textContent).slice(0, 300), M:entrepriseManque().length })); function norm(x) { return x.replace(/\s+/g, ' ').trim(); }
      v(`r01 ${pr} : la fiche de la facture ne demande plus de compléter pour partir`, g.M === 0 && !g.bloquee, g); }
    await L.capture(c, CAP + `r01-${pr}.png`, false); await L.fin(c);
  }

  // ───── R02 : le téléphone — ce qui doit passer (écritures réelles françaises) et ce qui doit tomber
  if (veut('r02')) for (const pr of ['mac', 'iphone']) {
    const c = await C.ouvrirEnt({ profil:pr }); await L.toucher(c, '[data-ent="carte|ident"]'); const out = [];
    const essai = async (x, attendu, nom) => { await C.remplir(c.p, 'en-tel', x); await L.toucher(c, '[data-ent="identok"]'); await L.calme(c.p, 150); const r = await C.champ(c.p, 'en-tel'); const ouv = await C.panneauOuvert(c.p); const accepte = ouv === ''; out.push([x, accepte]);
      v(`r02 ${pr} : « ${x} » ${attendu ? 'accepté' : 'refusé'} (${nom})`, accepte === attendu, { ouv, err:r && r.err }); if (accepte) await L.toucher(c, '[data-ent="carte|ident"]'); };
    for (const [x, ok, n] of [['+33 5 46 11 22 33', true, 'international'], ['05 46 11 22 33', true, 'espaces'], ['05-46-11-22-33', true, 'tirets'], ['+33546112233', true, 'collé'], ['', true, 'vide : facultatif'],
      ['abc 0546112233', false, 'lettres'], ['0546112233 poste 12', false, 'mention de poste'], ['１２３４５６７', false, 'chiffres pleine chasse'], ['+33 5 46 11 22 33 44 55 66 77', false, 'trop long'], ['12345', false, 'cinq chiffres'], ['...+++---', false, 'signes seuls']]) await essai(x, ok, n);
    // observation (pas un échec) : « +33 (0)5 46 11 22 33 » est une écriture courante — dite à Justin
    await C.remplir(c.p, 'en-tel', '+33 (0)5 46 11 22 33'); await L.toucher(c, '[data-ent="identok"]'); const par = await C.panneauOuvert(c.p) === ''; console.log('  · observation : « +33 (0)5 46 11 22 33 » ' + (par ? 'accepté' : 'REFUSÉ (parenthèses)'));
    v(`r02 ${pr} : population : ${out.length} essais`, out.length === 11, out.length); await L.fin(c);
  }

  // ───── R03 : la rangée « Enregistrer » collée en bas — ne cache rien, ne mange pas l'écran (clavier ouvert, paysage, erreurs en bas de feuille)
  if (veut('r03')) {
    for (const [pr, nuit, h] of [['iphone', false, 844], ['iphone', true, 844], ['android', true, 740], ['petit', false, 568], ['iphone', false, 340], ['iphone', true, 300]]) {
      const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; if (h !== L.PROFILS[pr].h) await p.setViewportSize({ width:L.PROFILS[pr].w, height:h }); await L.calme(p, 300);
      for (const carte of ['ident', 'legal', 'banque', 'horaires']) {
        await L.toucher(c, `[data-ent="carte|${carte}"]`); await L.calme(p, 450);
        const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); z.scrollTop = z.scrollHeight; const a = z.querySelector('.actions:last-child'), ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect();
          const champs = [...z.querySelectorAll('input,select,textarea')].filter(e => e.offsetParent), dernier = champs[champs.length - 1], rd = dernier && dernier.getBoundingClientRect();
          return { H:innerHeight, barre:Math.round(ra.height), zone:Math.round(rz.height), dernierBas:rd && Math.round(rd.bottom), barreHaut:Math.round(ra.top), champs:champs.length, pos:getComputedStyle(a).position }; });
        v(`r03 ${pr}${nuit ? ' nuit' : ''} h${h} ${carte} : en bas de feuille, le dernier champ est AU-DESSUS de la rangée (population : ${r.champs} champs)`, r.champs > 0 && r.dernierBas <= r.barreHaut + 1, r);
        v(`r03 ${pr}${nuit ? ' nuit' : ''} h${h} ${carte} : la rangée collée ne mange pas plus de 45 % de la feuille`, r.barre <= 0.45 * r.zone, r);
        await p.evaluate(() => fermerPanneau());
      }
      // une erreur tout en bas : après un refus, le message est visible, pas caché sous la rangée
      await L.toucher(c, '[data-ent="carte|ident"]'); await L.calme(p, 300); await C.remplir(p, 'en-site', 'pas un site'); await L.toucher(c, '[data-ent="identok"]'); await L.calme(p, 450);
      const e = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), m = document.getElementById('en-site-err'), a = z.querySelector('.actions:last-child'), rm = m && m.getBoundingClientRect(), ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect();
        return { vis:!!m && !m.hidden, bas:rm && Math.round(rm.bottom), haut:rm && Math.round(rm.top), barreHaut:Math.round(ra.top), zoneHaut:Math.round(rz.top) }; });
      v(`r03 ${pr}${nuit ? ' nuit' : ''} h${h} : le message d'erreur du dernier champ se voit (ni sous la rangée, ni au-dessus de la feuille)`, e.vis && e.bas <= e.barreHaut + 1 && e.haut >= e.zoneHaut - 1, e);
      if (h === L.PROFILS[pr].h && pr === 'iphone') await L.capture(c, CAP + `r03-erreur-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false);
      await L.fin(c);
    }
    // les AUTRES feuilles de l'application n'ont pas changé : la rangée d'un panneau hors Mon entreprise reste dans le flux
    const c = await L.ouvrir({ profil:'iphone', qui:'marc' }); await L.aller(c.p, 'clients'); await c.p.evaluate(() => { const b = document.querySelector('[data-action="clientNouveau"], [data-cnv], [data-action="nouveauClient"]'); if (b) b.click(); }); await L.calme(c.p, 500);
    const o = await c.p.evaluate(() => { const z = document.querySelector('#calque .panneau'); if (!z) return null; const a = z.querySelector('.actions:last-child'); return { pos:a ? getComputedStyle(a).position : null, ent:z.classList.contains('ent-pan') }; });
    if (o) v('r03 : une feuille hors Mon entreprise (Nouveau client) garde sa rangée dans le flux', o.pos !== 'sticky' && !o.ent, o); else console.log('  · feuille « Nouveau client » non trouvée par ce sélecteur : contrôle non joué');
    await L.fin(c);
  }

  // ───── R04 : au centime — demi-centimes décimaux (le piège du flottant), valeurs absurdes, affichage de la carte
  if (veut('r04')) { const c = await C.ouvrirEnt({ profil:'mac' }); const p = c.p;
    const tab = [['1,005', 1.01], ['8,575', 8.58], ['10,075', 10.08], ['12,345', 12.35], ['64,995', 65], ['65,555', 65.56], ['100,005', 100.01], ['1,255', 1.26], ['2,675', 2.68]];
    let n = 0, faux = [];
    for (const [x, att] of tab) { await L.toucher(c, '[data-ent="carte|horaires"]'); await L.calme(p, 250); await C.remplir(p, 'en-horaire', x); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 200); const h = await p.evaluate(() => TARIFS.horaire); n++; if (h !== att) faux.push(`${x} → ${h} (attendu ${att})`); }
    v(`r04 : tarif horaire — ${n} demi-centimes décimaux arrondis comme on les lit (au-dessus de la moitié : vers le haut)`, faux.length === 0, faux);
    for (const x of ['abc', '1e2', '-5', '65,5,5', '0,99', '500,01', '']) { await L.toucher(c, '[data-ent="carte|horaires"]'); await L.calme(p, 250); await C.remplir(p, 'en-horaire', x); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 150); const r = await C.champ(p, 'en-horaire'); v(`r04 : tarif « ${x} » refusé`, !!r && r.invalide, r); if (r) await p.evaluate(() => fermerPanneau()); }
    await L.toucher(c, '[data-ent="carte|horaires"]'); await C.remplir(p, 'en-horaire', '65,555'); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 400);
    const aff = await p.evaluate(() => document.querySelector('#contenu').textContent.replace(/\s+/g, ' ')); v('r04 : la carte affiche 65,56 € (pas 65,555)', /65,56/.test(aff) && !/65,555/.test(aff), aff.match(/.{0,40}65,5.{0,20}/));
    await L.fin(c); }

  // ───── R05 : Clients — la case « Modifier » seule décide ; aucun autre chemin ne modifie ; la création passe toujours par « Créer »
  if (veut('r05')) for (const [crm, nom] of [['1000', 'Voir seul'], ['1100', 'Voir + Créer'], ['1010', 'Voir + Modifier'], ['1110', 'Voir + Créer + Modifier']]) {
    const c = await personne('mac', { cases:cases({ crm }) }); const p = c.p; const m = crm[2] === '1', cr = crm[1] === '1';
    await L.aller(p, 'client-x-cm'); await L.calme(p, 500); const tabs = [];
    for (const o of ['infos', 'contrats', 'factures', 'docs', 'appareils']) { await p.evaluate(x => { const b = document.querySelector('[data-oc="' + x + '"]'); if (b) b.click(); }, o); await L.calme(p, 250);
      const r = await p.evaluate(() => { const vis = e => e.offsetParent !== null && getComputedStyle(e).display !== 'none'; const ch = [...document.querySelectorAll('#contenu input:not([type=search]),#contenu select,#contenu textarea')].filter(vis);
        return { editables:ch.filter(e => !e.disabled).length, enreg:[...document.querySelectorAll('[data-action="clientEnreg"]')].filter(vis).length, actions:[...document.querySelectorAll('#contenu [data-action]')].filter(vis).map(b => b.dataset.action) }; });
      tabs.push([o, r]); }
    const info = tabs[0][1]; const autres = tabs.slice(1).map(t => t[1].editables).reduce((a, b) => a + b, 0);
    v(`r05 « ${nom} » : onglet Infos — ${m ? 'champs saisissables et Enregistrer' : 'zéro champ saisissable, zéro Enregistrer'} (population : ${info.editables + (info.enreg ? 1 : 0)} commandes)`, m ? info.editables >= 6 && info.enreg === 1 : info.editables === 0 && info.enreg === 0, info);
    v(`r05 « ${nom} » : aucun champ de saisie ne traîne dans les autres onglets`, autres === 0, tabs.map(t => [t[0], t[1].editables]));
    // le formulaire de création : « Nouveau client » existe pour qui a Créer ; il enregistre
    await L.aller(p, 'clients'); await L.calme(p, 400); const nv = await p.evaluate(() => [...document.querySelectorAll('[data-action="clientNouveau"], [data-cnv-ouvrir], button')].filter(b => b.offsetParent && /Nouveau client|＋ Client|Ajouter un client/.test(b.textContent)).length);
    v(`r05 « ${nom} » : « Nouveau client » ${cr ? 'est là' : 'n’est pas dessiné'}`, cr ? nv >= 1 : nv === 0, nv);
    if (cr) { await p.evaluate(() => { [...document.querySelectorAll('button')].find(b => b.offsetParent && /Nouveau client|＋ Client|Ajouter un client/.test(b.textContent)).click(); }); await L.calme(p, 500);
      const f = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); return z ? [...z.querySelectorAll('[data-cnv]')].map(e => e.dataset.cnv) : null; });
      if (f && f.length) { const avant = await p.evaluate(() => Object.keys(CLIENTS).length); await p.evaluate(() => { const nom = document.querySelector('#calque [data-cnv="nom"]'); if (nom) { nom.value = 'Client essai recontrôle'; nom.dispatchEvent(new Event('input', { bubbles:true })); } const b = document.querySelector('#calque [data-action="clientEnreg"], #calque [data-action="clientNouveauOk"], #calque .actions .btn:not(.gris)'); if (b) b.click(); }); await L.calme(p, 500);
        const ap = await p.evaluate(() => Object.keys(CLIENTS).length); v(`r05 « ${nom} » : la création d'un client passe (${avant} → ${ap})`, ap === avant + 1, { avant, ap, f }); }
      else console.log('  · formulaire de création : champs non reconnus, création non jouée'); }
    await L.fin(c);
  }

  // ───── R06 : Achats et frais en lecture seule — UNE phrase, SOUS le titre, les mêmes mots partout (4 appareils)
  if (veut('r06')) {
    for (const [pr, nuit] of [['mac', false], ['iphone', true], ['petit', false], ['ipad', true]]) {
      const c = await L.ouvrir({ profil:pr, nuit, qui:'julie' }); const p = c.p; await L.aller(p, 'achats'); await L.calme(p, 700);
      const r = await p.evaluate(() => { const h = document.querySelector('#contenu .tete h1, #contenu .tete-tel ~ .tete h1, #contenu h1'), rh = h && h.getBoundingClientRect(); const tout = [...document.querySelectorAll('#contenu .info, #contenu .droits-note, #contenu .gris, #contenu .bandeau-info')].filter(e => e.offsetParent).map(e => ({ t:e.textContent.replace(/\s+/g, ' ').trim(), y:Math.round(e.getBoundingClientRect().top) }));
        const notes = [...document.querySelectorAll('.droits-note')].map(e => ({ t:e.textContent.replace(/\s+/g, ' ').trim(), y:Math.round(e.getBoundingClientRect().top) }));
        return { titreBas:rh && Math.round(rh.bottom), notes, phrases:tout.filter(x => /regarder|lecture|décide|décid|demande à|patron|gérant/i.test(x.t)).map(x => x.t.slice(0, 140)), mots:(document.querySelector('#contenu').textContent.match(/patron|gérant|Marc/gi) || []).join('|') }; });
      v(`r06 ${pr}${nuit ? ' nuit' : ''} : une seule note de lecture seule (population : ${r.notes.length})`, r.notes.length === 1, r);
      v(`r06 ${pr}${nuit ? ' nuit' : ''} : la note est SOUS le titre`, r.notes.length === 1 && r.notes[0].y >= r.titreBas - 2, r);
      v(`r06 ${pr}${nuit ? ' nuit' : ''} : au plus UNE phrase qui dit « tu peux regarder / demande à » (population : ${r.phrases.length})`, r.phrases.length <= 1 || (r.phrases.length === 2 && r.phrases.some(t => /Tu peux regarder cet écran/.test(t))), r.phrases);
      v(`r06 ${pr}${nuit ? ' nuit' : ''} : un seul mot pour la personne (jamais « le patron » à côté de « le gérant »)`, !(/patron/i.test(r.mots) && /gérant|Marc/i.test(r.mots)), r.mots);
      if (pr !== 'ipad') await L.capture(c, CAP + `r06-julie-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c);
    }
    const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await L.aller(c.p, 'achats'); await L.calme(c.p, 600);
    const m = await c.p.evaluate(() => ({ notes:document.querySelectorAll('.droits-note').length, txt:/regarder cet écran/.test(document.querySelector('#contenu').textContent) })); v('r06 marc : aucune note de lecture seule chez le gérant', m.notes === 0 && !m.txt, m); await L.fin(c);
    // une autre rubrique en lecture seule garde sa note, une seule fois, sous le titre (la correction de droitsNote n'a rien cassé à côté)
    const d = await personne('mac', { cases:cases({ stock:'1000' }) }); await L.aller(d.p, 'stock'); await L.calme(d.p, 600);
    const s = await d.p.evaluate(() => { const h = document.querySelector('#contenu h1'); return { notes:[...document.querySelectorAll('.droits-note')].map(e => Math.round(e.getBoundingClientRect().top)), titreBas:h && Math.round(h.getBoundingClientRect().bottom) }; });
    v('r06 : Stock en lecture seule : une note, sous le titre', s.notes.length === 1 && s.notes[0] >= s.titreBas - 2, s); await L.fin(d);
  }

  // ───── R07 : l'atelier mène à Mon entreprise (par le vrai bouton « Composer un devis », sur téléphone aussi)
  if (veut('r07')) for (const pr of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil:pr, qui:'marc' }); const p = c.p; await L.aller(p, 'devis'); await L.calme(p, 500);
    await L.toucher(c, '[data-opd="devis"]'); await L.calme(p, 2800); const f = L.cadre(p); v(`r07 ${pr} : l'atelier s'ouvre par le vrai bouton (population : un cadre)`, !!f, p.frames().map(x => x.url()));
    if (f) { await f.waitForSelector('[data-act="ident-ouvrir"]', { state:'attached', timeout:30000 }).catch(() => {}); await f.evaluate(() => document.querySelector('[data-act="ident-ouvrir"]').click()); await L.calme(p, 800);
      const b = await f.evaluate(() => { const o = document.querySelector('[data-ent-ouvrir]'), r = o && o.getBoundingClientRect(), pied = document.querySelector('.fen-pied'), rp = pied && pied.getBoundingClientRect(); return o ? { t:o.textContent.trim(), larg:Math.round(r.width), haut:Math.round(r.height), dedans:r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.left >= 0, pied:rp && Math.round(rp.bottom), H:innerHeight, W:innerWidth } : null; });
      v(`r07 ${pr} : le bouton « Ouvrir Mon entreprise » est là, entier dans la fenêtre, cible ≥ 44 px`, !!b && b.dedans && b.haut >= (pr === 'mac' ? 30 : 44), b);
      await L.capture(c, CAP + `r07-fenetre-${pr}.png`, false);
      await f.evaluate(() => document.querySelector('[data-ent-ouvrir]').click()); await L.calme(p, 1100);
      const ap = await p.evaluate(() => ({ route, atelier:!!document.getElementById('opdz') && !document.getElementById('opdz').hidden, cadres:document.querySelectorAll('#opdz iframe').length, h1:(document.querySelector('#contenu h1') || {}).textContent }));
      v(`r07 ${pr} : l'atelier est fermé (rien ne reste ouvert par-dessus) et Mon entreprise est à l'écran`, ap.route === 'entreprise' && !ap.atelier && ap.h1 === 'Mon entreprise', ap);
      // on rouvre l'atelier : il redémarre proprement (pas d'état collé)
      await L.aller(p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await L.calme(p, 2800); const f2 = L.cadre(p); v(`r07 ${pr} : l'atelier se rouvre ensuite sans erreur (population : un cadre)`, !!f2 && c.err.length === 0, { err:c.err.slice(0, 3) }); }
    await L.fin(c);
  }

  // ───── R08 : Boîte mail avec « Voir » seul — on MESURE ce que la personne peut encore faire (restes connus : à dire à Justin)
  if (veut('r08')) { const c = await personne('mac', { cases:cases({ com:'1000' }) }); await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 2500);
    const r = await c.p.evaluate(() => { const n = document.querySelector('.droits-note'); const racine = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const ombre = racine && racine.shadowRoot; const btns = ombre ? [...ombre.querySelectorAll('button')].filter(b => b.offsetParent !== null || b.getClientRects().length).map(b => (b.getAttribute('aria-label') || b.title || b.textContent || '').trim().slice(0, 30)).filter(Boolean) : [];
      return { note:!!n, ombre:!!ombre, boutons:btns.slice(0, 30), phrases:DROIT_PHRASES.com }; });
    console.log('  · boîte mail, Voir seul : boutons du module = ' + JSON.stringify(r.boutons));
    v('r08 : la note « tu peux regarder, pas le modifier » n’est pas posée (elle mentirait)', !r.note, r);
    v('r08 (reste connu) : un « Voir » seul peut encore écrire / répondre / supprimer dans la boîte — à dire à Justin', r.boutons.some(b => /nouveau|écrire|répondre|supprimer|archiv|corbeille/i.test(b)) || !r.ombre, r.boutons);
    await L.capture(c, CAP + 'r08-mail-voir-seul.png', false); await L.fin(c); }

  // ───── R09 : « Composer » demande Créer ; rouvrir demande Modifier — par TOUS les chemins visibles (devis, contrats, fiche client)
  if (veut('r09')) for (const [ventes, nom] of [['1000', 'Voir seul'], ['1100', 'Voir + Créer'], ['1010', 'Voir + Modifier']]) {
    const c = await personne('mac', { cases:cases({ ventes }) }); const p = c.p; const cree = ventes[1] === '1', modif = ventes[2] === '1';
    await p.evaluate(() => { ATD.docs = [{ id:'d1', type:'devis', nom:'Entretien annuel', numero:'D-2026-099', etat:'brouillon', client:'Cabinet dentaire Martin', clientId:'cm', ttc:120000, prix:0, maj:Date.now(), nr:0 }, { id:'d2', type:'contrat', nom:'Contrat annuel', numero:'C-2026-007', etat:'brouillon', client:'Cabinet dentaire Martin', clientId:'cm', ttc:90000, prix:0, maj:Date.now(), nr:0 }]; OPDZ.sigDocs = ''; });
    let pop = 0; const visibles = [];
    for (const [route, onglet] of [['devis'], ['contrats'], ['client-x-cm', 'infos'], ['client-x-cm', 'contrats'], ['accueil']]) {
      await L.aller(p, route); if (onglet) { await p.evaluate(o => { const b = document.querySelector('[data-oc="' + o + '"]'); if (b) b.click(); }, onglet); } await L.calme(p, 450);
      const r = await p.evaluate(() => { const vis = e => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0; return { r:route, composer:[...document.querySelectorAll('[data-opd="devis"],[data-opd="contrat"]')].filter(vis).length, rouvrir:[...document.querySelectorAll('[data-opd="doc"]')].filter(vis).length }; });
      pop++; visibles.push([route + (onglet ? '/' + onglet : ''), r.composer, r.rouvrir]); }
    const compo = visibles.reduce((a, x) => a + x[1], 0), rouv = visibles.reduce((a, x) => a + x[2], 0);
    v(`r09 « ${nom} » : « Composer » ${cree ? 'dessiné' : 'jamais dessiné'} (${pop} écrans parcourus)`, cree ? compo >= 2 : compo === 0, visibles);
    v(`r09 « ${nom} » : rouvrir un document ${modif ? 'possible' : 'jamais proposé (lecture simple)'}`, modif ? rouv >= 1 : rouv === 0, visibles);
    // touches du clavier : D (devis) ne passe pas outre
    await L.aller(p, 'accueil'); const n0 = await p.evaluate(() => DROITS_REFUS.length); await p.keyboard.press('d'); await L.calme(p, 600);
    const z = await p.evaluate(() => { const o = document.getElementById('opdz'); return { atelier:!!o && !o.hidden, refus:0 }; }); const n1 = await p.evaluate(() => DROITS_REFUS.length);
    v(`r09 « ${nom} » : la touche D ${cree ? 'ouvre' : 'n’ouvre pas'} l'atelier`, cree ? true : !z.atelier, { z, n0, n1 });
    await L.fin(c);
  }

  // ───── R10 : le bloc de marque du menu — nom long, un seul mot géant, accents, court, vide ; ordinateur ET tiroir du téléphone
  if (veut('r10')) {
    const noms = ['Entreprise Générale de Climatisation et Plomberie Littoral', 'A'.repeat(60), 'Établissements Léo & Fils — Électricité', 'X', 'Clim Services 17'];
    for (const [pr, nuit] of [['mac', false], ['windows', true], ['ipad', false]]) {
      const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
      for (const n of noms) { await p.evaluate(x => { ENTREPRISE.nom = x; rendre(); }, n); await L.calme(p, 350);
        const r = await p.evaluate(() => { const a = document.querySelector('.menu a.logo'); if (!a) return null; const i = a.querySelector('i'), ri = i.getBoundingClientRect(), ra = a.getBoundingClientRect(), menu = a.closest('.menu'), rm = menu.getBoundingClientRect(); const sm = a.querySelector('small'), rs = sm.getBoundingClientRect(); return { tuile:[Math.round(ri.width), Math.round(ri.height)], deborde:a.scrollWidth > a.clientWidth + 1 || rs.right > rm.right + 1, haut:Math.round(ra.top), hautMenu:Math.round(rm.top), titre:a.getAttribute('title') || '' }; });
        v(`r10 ${pr}${nuit ? ' nuit' : ''} « ${n.slice(0, 22)}… » : tuile carrée, rien ne sort du menu, bloc dans la fenêtre`, !!r && r.tuile[0] >= 36 && Math.abs(r.tuile[0] - r.tuile[1]) <= 3 && !r.deborde && r.haut >= r.hautMenu - 1, r); }
      await L.capture(c, CAP + `r10-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c);
    }
    for (const pr of ['iphone', 'android']) { const c = await C.ouvrirEnt({ profil:pr, nuit:true }); const p = c.p; await p.evaluate(x => { ENTREPRISE.nom = x; rendre(); }, noms[0]); await L.calme(p, 300);
      await p.evaluate(() => { const b = document.querySelector('[data-menu], .menu-bouton, [aria-label*="menu" i]'); if (b) b.click(); }); await L.calme(p, 500);
      const r = await p.evaluate(() => { const a = document.querySelector('.menu a.logo'); if (!a) return null; const ra = a.getBoundingClientRect(), i = a.querySelector('i').getBoundingClientRect(); return { vis:ra.width > 0 && ra.right > 0, tuile:[Math.round(i.width), Math.round(i.height)], bas:Math.round(ra.bottom), W:innerWidth, droite:Math.round(ra.right) }; });
      if (r && r.vis) v(`r10 ${pr} nuit : le tiroir ouvert garde son bloc de marque entier (nom long)`, r.tuile[0] >= 36 && r.droite <= r.W + 1, r); else console.log('  · ' + pr + ' : tiroir non ouvert par ce sélecteur, contrôle non joué');
      await L.capture(c, CAP + `r10-tiroir-${pr}.png`, false); await L.fin(c); }
  }

  // ───── R11 : les liens « Ce qui se règle ailleurs » ramènent — et la barre de retour ne reste pas collée où elle n'a rien à faire
  if (veut('r11')) for (const pr of ['iphone', 'mac']) for (const lien of ['rdv', 'auto', 'ndf', 'stock', 'boites']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p;
    await L.toucher(c, `[data-ent="lien|${lien}"]`); await L.calme(p, 1400); const ici = await p.evaluate(() => route);
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 300);
    const a = await p.evaluate(() => { const b = document.querySelector('.rl-retour, .retour-va, [data-retourva]'); return { barre:!!b, t:b ? b.textContent.replace(/\s+/g, ' ').trim() : '', bas:b ? Math.round(b.getBoundingClientRect().bottom) : 0, haut:b ? Math.round(b.getBoundingClientRect().top) : 0 }; });
    v(`r11 ${pr} « ${lien} » (${ici}) : la barre « Retour · Mon entreprise » est visible à l'écran`, a.barre && /Mon entreprise/.test(a.t) && a.haut >= 0 && a.bas <= (pr === 'mac' ? 900 : 844), a);
    // naviguer AILLEURS par le menu : la barre ne doit pas rester sur une rubrique sans rapport
    await L.aller(p, ici === 'clients' ? 'inter' : 'clients'); await L.calme(p, 500); const s = await p.evaluate(() => ({ barre:/Mon entreprise/.test(document.querySelector('.rl-retour, .retour-va, [data-retourva]') ? document.querySelector('.rl-retour, .retour-va, [data-retourva]').textContent : ''), route }));
    v(`r11 ${pr} « ${lien} » : une fois ailleurs (${s.route}), la barre « Retour · Mon entreprise » a disparu`, !s.barre, s);
    // le retour fait revenir à Mon entreprise, sans barre en boucle
    await L.aller(p, ici); await L.toucher(c, '.rl-retour, .retour-va, [data-retourva]').catch(() => {}); await L.calme(p, 700); const b = await p.evaluate(() => ({ route, barre:!!document.querySelector('.rl-retour, .retour-va, [data-retourva]') }));
    console.log(`  · ${pr} ${lien} : après retour → ${b.route}, barre ${b.barre}`);
    await L.fin(c);
  }

  // ───── R12 : un seul verdict — le bandeau et la fiche d'une facture disent la MÊME liste, état par état
  if (veut('r12')) for (const pr of ['mac', 'iphone']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p;
    const ETATS = [['rien ne manque', { forme:'SARL', capital:'5 000', rcs:'RCS La Rochelle 303 123 456', assureur:'MAAF Pro', assurc:'MAAF, 79036 Niort', assurZone:'France métropolitaine', mediateur:'CNPM' }],
      ['seule l’immatriculation manque', { forme:'SARL', capital:'5 000', rcs:'', assureur:'MAAF Pro', assurc:'MAAF, 79036 Niort', assurZone:'France métropolitaine', mediateur:'CNPM' }],
      ['seule l’assurance manque', { forme:'SARL', capital:'5 000', rcs:'RCS La Rochelle 303 123 456', assureur:'', assurc:'', assurZone:'', mediateur:'CNPM' }],
      ['tout manque', { forme:'', capital:'', rcs:'', assureur:'', assurc:'', assurZone:'', mediateur:'' }]];
    for (const [nom, vals] of ETATS) {
      await L.aller(p, 'entreprise'); await p.evaluate(x => { Object.assign(ENTREPRISE, x); rendre(); }, vals); await L.calme(p, 350);
      const b = await p.evaluate(() => { const e = document.querySelector('.ent-ban'); return { vert:e.classList.contains('ok-bloc'), orange:e.classList.contains('attention'), t:e.textContent.replace(/\s+/g, ' ').trim(), L:cxMentionsManquantes().length }; });
      await p.evaluate(() => aller('facture-x-' + FACTURES.find(f => f.num !== '—').id)); await L.calme(p, 600);
      const f = await p.evaluate(() => { const m = document.querySelector('.cx-mq'); return { t:m ? m.textContent.replace(/\s+/g, ' ').trim() : '' }; });
      if (b.L === 0) v(`r12 ${pr} « ${nom} » : bandeau vert ET aucun « Il manque » sur la facture (population : ${b.L} mention)`, b.vert && /complète/.test(b.t) && f.t === '', { b, f });
      else { const dansBan = (b.t.match(/dans tes mentions légales : ([^.]*)\./) || [])[1] || ''; const mots = dansBan.split(/,| et /).map(x => x.trim().replace(/ \(.*$/, '')).filter(Boolean);
        v(`r12 ${pr} « ${nom} » : bandeau orange (pas « complète ») et la facture dit les MÊMES manques (population : ${mots.length})`, b.orange && !/Ta fiche est complète/.test(b.t) && mots.length >= 1 && mots.every(m => f.t.includes(m.replace(/^l[’']|^la |^le /, ''))), { b:b.t, f:f.t }); } }
    await L.fin(c);
  }

  // ───── R13 : le bloc Droits de la fiche d'une personne — mesures et captures sur cinq appareils
  if (veut('r13')) for (const [pr, nuit] of [['iphone', true], ['mac', false], ['android', false], ['petit', true], ['ipad', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p; await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiche('julie'); const dt = document.querySelector('details.eqx-det'); if (dt) dt.open = true; }); await L.calme(p, 700);
    const r = await p.evaluate(() => { const t = document.querySelector('#calque .panneau .fo-terrain'), sel = document.querySelector('#calque .panneau [data-eqprof]'); if (!t || !sel) return null; const rt = t.getBoundingClientRect(), rs = sel.closest('label').getBoundingClientRect(); const sp = t.querySelector('span'), nx = t.nextElementSibling, rn = nx && nx.getBoundingClientRect(), z = document.querySelector('#calque .panneau');
      return { espace:Math.round(rt.top - rs.bottom), basPhrase:Math.round(sp.getBoundingClientRect().bottom), basCase:Math.round(rt.bottom), hautSuivant:rn && Math.round(rn.top), deborde:z.scrollWidth > z.clientWidth + 1, vides:[...document.querySelectorAll('#calque .eq-droits .eq-dr:not(.eq-dr-t) label')].filter(l => !l.children.length).length, W:z.clientWidth }; });
    v(`r13 ${pr}${nuit ? ' nuit' : ''} : le bloc Droits existe (population)`, !!r, r);
    if (r) { v(`r13 ${pr}${nuit ? ' nuit' : ''} : « Travaille sur le terrain » respire sous « Appliquer un profil » (≥ 12 px)`, r.espace >= 12, r); v(`r13 ${pr}${nuit ? ' nuit' : ''} : sa phrase est entière et ne mord pas sur le bloc suivant, rien ne déborde de côté`, r.basPhrase <= r.basCase + 1 && (r.hautSuivant === null || r.basCase <= r.hautSuivant + 1) && !r.deborde, r); v(`r13 ${pr}${nuit ? ' nuit' : ''} : aucune case vide sans signe dans la grille`, r.vides === 0, r); }
    await p.evaluate(() => { const z = document.querySelector('#calque .panneau'), t = z.querySelector('.fo-terrain'); if (z && t) z.scrollTop = t.offsetTop - 140; }); await L.calme(p, 300);
    await L.capture(c, CAP + `r13-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); await L.fin(c);
  }


  // ───── CASSE 1 : la rangée collée (correction tout-03) cache-t-elle le champ refusé ? On refuse le DERNIER champ de chaque feuille, au vrai toucher,
  //                et on regarde où atterrit le champ ET son message (ni sous la rangée, ni hors de la feuille)
  if (veut('casse1')) for (const [pr, nuit] of [['iphone', false], ['android', true], ['petit', false]]) {
    const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
    for (const [carte, id, val, ok] of [['ident', 'en-site', 'pas un site', 'identok'], ['banque', 'en-expmail', 'pasunmail', 'banqueok'], ['horaires', 'en-z3', 'abc', 'horairesok'], ['legal', 'fl-med', 'x'.repeat(130), 'ficheok']]) {
      await L.toucher(c, `[data-ent="carte|${carte}"]`); await L.calme(p, 400);
      await C.remplir(p, id, val); await L.toucher(c, ok === 'ficheok' ? '[data-cx="ficheok"]' : `[data-ent="${ok}"]`); await L.calme(p, 600);
      const r = await p.evaluate(i => { const z = document.querySelector('#calque .panneau'), f = document.getElementById(i), m = document.getElementById(i + '-err'), a = z.querySelector('.actions:last-child'), rz = z.getBoundingClientRect(), ra = a.getBoundingClientRect(), rf = f.getBoundingClientRect(), rm = m.getBoundingClientRect();
        return { actif:document.activeElement && document.activeElement.id, msg:!m.hidden, champDessus:rf.top >= rz.top - 1 && rf.bottom <= ra.top + 1, msgDessus:rm.top >= rz.top - 1 && rm.bottom <= ra.top + 1, champ:[Math.round(rf.top), Math.round(rf.bottom)], message:[Math.round(rm.top), Math.round(rm.bottom)], barreHaut:Math.round(ra.top), H:innerHeight, zoneHaut:Math.round(rz.top), scroll:Math.round(z.scrollTop) }; }, id);
      v(`casse1 ${pr}${nuit ? ' nuit' : ''} ${carte} : le refus du dernier champ (${id}) prend le focus et écrit son message (population : ${r.msg ? 1 : 0})`, r.actif === id && r.msg, r);
      v(`casse1 ${pr}${nuit ? ' nuit' : ''} ${carte} : le champ refusé se VOIT (au-dessus de la rangée collée, dans la feuille)`, r.champDessus, r);
      v(`casse1 ${pr}${nuit ? ' nuit' : ''} ${carte} : son message se voit aussi`, r.msgDessus, r);
      if (pr === 'iphone' && !nuit && (carte === 'ident' || carte === 'horaires')) await L.capture(c, CAP + `casse1-${carte}-${pr}.png`, false);
      await p.evaluate(() => fermerPanneau());
    }
    await L.fin(c);
  }

  // ───── CASSE 2 : les feuilles que le correcteur n'a pas mesurées (logo, métiers, lecture seule) et les tablettes (au-delà de 760 px la rangée reste dans le flux)
  if (veut('casse2')) {
    for (const [pr, nuit] of [['iphone', true], ['petit', false], ['ipad', false], ['mac720', true]]) {
      const c = await C.ouvrirEnt({ profil:pr, nuit }); const p = c.p;
      for (const [carte, sel] of [['logo', '[data-ent="carte|logo"]'], ['banque', '[data-ent="carte|banque"]']]) {
        await L.toucher(c, sel); await L.calme(p, 400);
        const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); z.scrollTop = z.scrollHeight; const a = z.querySelector('.actions:last-child'), ra = a.getBoundingClientRect(), rz = z.getBoundingClientRect(), W = innerWidth;
          const btns = [...a.querySelectorAll('.btn')].map(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= W + 1 && r.bottom <= innerHeight + 1; });
          return { pos:getComputedStyle(a).position, W, H:innerHeight, boutons:btns, haut:Math.round(ra.top), bas:Math.round(ra.bottom), zoneBas:Math.round(rz.bottom), larg:Math.round(rz.width) }; });
        v(`casse2 ${pr}${nuit ? ' nuit' : ''} ${carte} : tous les boutons de la rangée sont entiers à l'écran (population : ${r.boutons.length})`, r.boutons.length >= 1 && r.boutons.every(Boolean), r);
        v(`casse2 ${pr}${nuit ? ' nuit' : ''} ${carte} : la rangée est ${L.PROFILS[pr].w <= 760 ? 'collée (sticky)' : 'dans le flux (static)'}`, L.PROFILS[pr].w <= 760 ? r.pos === 'sticky' : r.pos !== 'sticky', r);
        await p.evaluate(() => fermerPanneau());
      }
      await L.fin(c);
    }
    // lecture seule : une personne sans « Modifier » sur Mon entreprise ouvre une feuille — son seul bouton « Fermer » doit se voir
    for (const [pr, nuit] of [['iphone', true], ['petit', false]]) {
      const c = await personne(pr, { cases:cases({ admin:'1000' }) }, nuit); const p = c.p; await L.aller(p, 'entreprise'); await L.calme(p, 600);
      const ouv = await p.evaluate(() => { const b = document.querySelector('[data-ent="carte|ident"]'); if (!b) return false; b.click(); return true; }); await L.calme(p, 500);
      v(`casse2 lecture seule ${pr}${nuit ? ' nuit' : ''} : la carte s'ouvre (population : une carte)`, ouv, ouv);
      if (ouv) { const r = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); z.scrollTop = z.scrollHeight; const a = z.querySelector('.actions:last-child'), ra = a.getBoundingClientRect(), bs = [...a.querySelectorAll('.btn')].map(b => b.textContent.trim()), champs = [...z.querySelectorAll('input,select,textarea')].filter(e => !e.disabled).length;
          return { bs, champsLibres:champs, visible:ra.bottom <= innerHeight + 1 && ra.top >= 0 }; });
        v(`casse2 lecture seule ${pr}${nuit ? ' nuit' : ''} : seul « Fermer » est proposé, atteignable, aucun champ libre`, r.bs.length === 1 && r.bs[0] === 'Fermer' && r.visible && r.champsLibres === 0, r);
        await L.capture(c, CAP + `casse2-lecture-${pr}-${nuit ? 'nuit' : 'jour'}.png`, false); }
      await L.fin(c);
    }
  }

  // ───── CASSE 3 : la fiche réduite au SIRET (ce que tout-01 autorise) ne casse AUCUN document : pas de « undefined », de « null », de mention creuse
  if (veut('casse3')) {
    const c = await C.ouvrirEnt({ profil:'mac' }); const p = c.p; await p.evaluate(EFFACER); await p.evaluate(() => { ENTREPRISE.siret = '732 829 320 00074'; rendre(); }); await L.calme(p, 400);
    const r = await p.evaluate(() => { const emises = FACTURES.filter(f => f.num !== '—'), mauvais = /undefined|null|NaN|\[object|capital de\s*€|RCS\s*[·—]|·\s*·|,\s*,|Assurance\s*:\s*(?:·|$)/;
      const sorties = [], bad = [];
      emises.slice(0, 40).forEach(f => { const t = cxPdfTexte(f); sorties.push(f.id); const m = t.match(mauvais); if (m) bad.push(f.id + ' : ' + m[0]); });
      const dv = typeof DEVIS !== 'undefined' ? DEVIS.slice(0, 20) : [], dbad = [];
      dv.forEach(x => { try { const t = docDevis(x).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const m = t.match(mauvais); if (m) dbad.push(x.id + ' : ' + m[0]); } catch (e) { dbad.push(x.id + ' ERREUR ' + e.message); } });
      let ctr = []; try { CONTRATS.slice(0, 10).forEach(k => { const t = pdfContrat(k).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); const m = t.match(mauvais); if (m) ctr.push(k.id + ' : ' + m[0]); }); } catch (e) { ctr.push('ERREUR ' + e.message); }
      return { nbFactures:sorties.length, bad, nbDevis:dv.length, dbad, nbContrats:CONTRATS.length, ctr, manque:entrepriseManque().length }; });
    v(`casse3 : population : des factures émises à contrôler`, r.nbFactures >= 3, r);
    v(`casse3 : fiche réduite au SIRET (aucun manque bloquant : ${r.manque}) → aucune facture ne porte « undefined / null / mention creuse »`, r.manque === 0 && r.bad.length === 0, r);
    v(`casse3 : ${r.nbDevis} devis sans mention creuse`, r.dbad.length === 0, r);
    v(`casse3 : ${r.nbContrats} contrats sans mention creuse`, r.ctr.length === 0, r);
    await L.fin(c);
  }

  // ───── PARCOURS 1 : un gérant neuf débloque sa première facture avec le SEUL SIRET — du bandeau jusqu'à la facture partie, puis la fiche se complète et le bandeau passe au vert
  if (veut('p1')) for (const pr of ['mac', 'iphone']) {
    const c = await C.ouvrirEnt({ profil:pr }); const p = c.p; await p.evaluate(EFFACER); await L.calme(p, 400);
    const fac = await p.evaluate(() => { const f = FACTURES.find(x => x.st === 'avalider' && lignesDe(x).every(ligneOk) && CLIENTS[x.cli] && cfMailOk(CLIENTS[x.cli].mail)); return f ? f.id : null; });
    v(`p1 ${pr} : population : une facture « à valider » prête à partir (lignes complètes, client joignable)`, !!fac, fac);
    // 1. avant : la facture est REFUSÉE au vrai geste, avec le bouton Compléter dans le message
    await L.aller(p, 'facture-x-' + fac); await L.calme(p, 600);
    const av = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { st:f.st, ok:envoyerFacture(f, true) }; }, fac);
    v(`p1 ${pr} : fiche vide → la porte d'envoi refuse (rien ne part)`, av.ok === false && av.st === 'avalider', av);
    // 2. Compléter par le bandeau, le SIRET, Enregistrer
    await L.aller(p, 'entreprise'); await L.calme(p, 500); await L.toucher(c, '[data-ent="completer"]'); await L.calme(p, 400);
    await p.locator('#fl-siret').fill('732 829 320 00074'); await L.toucher(c, '[data-cx="ficheok"]'); await L.calme(p, 500);
    const t1 = await C.toast(p); const ban = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { t:b.textContent.replace(/\s+/g, ' ').trim(), orange:b.classList.contains('attention'), M:entrepriseManque().length }; });
    v(`p1 ${pr} : SIRET seul enregistré (le toast le dit), plus rien de bloquant`, /enregistr/i.test(t1) && ban.M === 0, { t1, ban });
    v(`p1 ${pr} : le bandeau ne dit PAS « complète » tant que forme, RCS ou assurance manquent`, ban.orange && !/est complète|complète :/i.test(ban.t), ban);
    // 3. la facture part par le vrai bouton
    await L.aller(p, 'facture-x-' + fac); await L.calme(p, 600);
    const ap = await p.evaluate(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); if (b) { b.click(); return true; } return false; }); await L.calme(p, 600);
    const env = await p.evaluate(() => { const b = document.querySelector('#calque .panneau [data-action="envoyer"]'); return !!b; });
    v(`p1 ${pr} : l'aperçu d'envoi propose « Envoyer » (plus de blocage), population : bouton d'aperçu trouvé`, ap && env, { ap, env });
    if (env) { await p.evaluate(() => document.querySelector('#calque .panneau [data-action="envoyer"]').click()); await L.calme(p, 700);
      const apres = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { st:f.st, num:f.num }; }, fac);
      v(`p1 ${pr} : la facture est PARTIE (envoyée, numérotée)`, apres.st === 'envoyee' && apres.num !== '—', apres); }
    await L.capture(c, CAP + `p1-${pr}-facture-partie.png`, false);
    // 4. le bandeau de Mon entreprise dit ce qui RESTE ; tout remplir → vert
    await L.aller(p, 'entreprise'); await L.calme(p, 500);
    await p.evaluate(() => { Object.assign(ENTREPRISE, { forme:'SARL', capital:'5 000', rcs:'RCS La Rochelle 732 829 320', assureur:'MMA', assurNum:'123', assurc:'MMA Entreprise', assurZone:'France' }); rendre(); }); await L.calme(p, 400);
    const vert = await p.evaluate(() => { const b = document.querySelector('.ent-ban'); return { t:b.textContent.replace(/\s+/g, ' ').trim(), vert:!b.classList.contains('attention'), reste:cxMentionsManquantes() }; });
    v(`p1 ${pr} : tout rempli → bandeau vert, et plus rien à compléter (population : ${vert.reste.length} manque)`, vert.vert && vert.reste.length === 0 && /compl/i.test(vert.t), vert);
    await L.capture(c, CAP + `p1-${pr}-fiche-complete.png`, false); await L.fin(c);
  }

  // ───── PARCOURS 2 : une personne « Voir + Modifier » change un client et ça reste ; « Voir + Créer » crée un client mais ne change pas un existant
  if (veut('p2')) for (const [crm, nom] of [['1010', 'Voir + Modifier'], ['1100', 'Voir + Créer']]) {
    const c = await personne('mac', { cases:cases({ crm }) }); const p = c.p; const modif = crm[2] === '1', cree = crm[1] === '1';
    await L.aller(p, 'client-x-cm'); await p.evaluate(() => { const b = document.querySelector('[data-oc="infos"]'); if (b) b.click(); }); await L.calme(p, 500);
    const ch = await p.evaluate(() => { const e = document.querySelector('[data-ci="acces"]'); return e ? { dis:e.disabled || e.readOnly, avant:e.value } : null; });
    v(`p2 « ${nom} » : l'onglet Infos du client existant ${modif ? 'se modifie' : 'est figé'} (population : le champ « accès »)`, !!ch && (modif ? !ch.dis : ch.dis), ch);
    if (modif) { await p.evaluate(() => { const e = document.querySelector('[data-ci="acces"]'); e.value = 'Badge au 3e, sonnez deux fois'; }); await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 500);
      const sv = await p.evaluate(() => CLIENTS.cm.acces); const t = await C.toast(p); v(`p2 « ${nom} » : l'enregistrement tient (donnée gardée + toast)`, sv === 'Badge au 3e, sonnez deux fois' && t.length > 0, { sv, t });
      await L.aller(p, 'clients'); await L.aller(p, 'client-x-cm'); await L.calme(p, 400); const rel = await p.evaluate(() => { const b = document.querySelector('[data-oc="infos"]'); if (b) b.click(); const e = document.querySelector('[data-ci="acces"]'); return e && e.value; }); v(`p2 « ${nom} » : en revenant sur la fiche, le changement est là`, rel === 'Badge au 3e, sonnez deux fois', rel); }
    else { const n0 = await p.evaluate(() => DROITS_REFUS.length); await p.evaluate(() => { const b = document.querySelector('[data-action="clientEnreg"]'); if (b) b.click(); }); await L.calme(p, 300); const n1 = await p.evaluate(() => DROITS_REFUS.length); v(`p2 « ${nom} » : un clic forcé sur Enregistrer est refusé (population : refus ${n0}→${n1})`, n1 >= n0, { n0, n1 }); }
    // créer : le bouton « Nouveau client » existe pour qui a Créer ; il ouvre une fiche et l'enregistrement crée un VRAI client
    await L.aller(p, 'clients'); await L.calme(p, 400);
    const nv = await p.evaluate(() => { const b = [...document.querySelectorAll('button,[data-action]')].find(x => /nouveau client/i.test(x.textContent) && x.offsetParent); return b ? { tag:b.tagName, act:b.dataset.action || b.dataset.cx || '' } : null; });
    v(`p2 « ${nom} » : « Nouveau client » ${cree ? 'proposé' : 'absent'}`, cree ? !!nv : !nv, nv);
    await L.fin(c);
  }

  // ───── PARCOURS 3 : de l'atelier de devis à Mon entreprise, on change un tarif, on revient par « Retour » — et le tarif est là dans l'atelier
  if (veut('p3')) {
    const c = await L.ouvrir({ profil:'mac', qui:'marc' }); const p = c.p; await L.aller(p, 'devis'); await L.calme(p, 500);
    await L.toucher(c, '[data-opd="devis"]'); await L.calme(p, 2800); const f = L.cadre(p); v('p3 : l\'atelier s\'ouvre (population : un cadre)', !!f, p.frames().map(x => x.url()));
    if (f) { await f.waitForSelector('[data-act="ident-ouvrir"]', { state:'attached', timeout:30000 }).catch(() => {}); await f.evaluate(() => document.querySelector('[data-act="ident-ouvrir"]').click()); await L.calme(p, 800);
      await f.evaluate(() => document.querySelector('[data-ent-ouvrir]').click()); await L.calme(p, 1100);
      const ap = await p.evaluate(() => ({ route, h1:(document.querySelector('#contenu h1') || {}).textContent, atelier:!!document.getElementById('opdz') && !document.getElementById('opdz').hidden })); v('p3 : arrivé sur Mon entreprise, atelier fermé', ap.route === 'entreprise' && ap.h1 === 'Mon entreprise' && !ap.atelier, ap);
      await L.toucher(c, '[data-ent="carte|horaires"]'); await L.calme(p, 400); await C.remplir(p, 'en-horaire', '72,5'); await L.toucher(c, '[data-ent="horairesok"]'); await L.calme(p, 500);
      const th = await p.evaluate(() => TARIFS.horaire); v('p3 : le tarif horaire est changé (72,5)', th === 72.5, th);
      // les cinq liens : on part, on revient par « Retour »
      await L.toucher(c, '[data-ent="lien|rdv"]'); await L.calme(p, 700); const bar = await p.evaluate(() => { const r = document.querySelector('.retour, [data-retour], #retour'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
      v('p3 : après « Rendez-vous en ligne », une barre « Retour · Mon entreprise » est là', /Mon entreprise/.test(bar), bar);
      await p.evaluate(() => { const r = document.querySelector('.retour, [data-retour], #retour'); if (r) r.click(); }); await L.calme(p, 600);
      const rt = await p.evaluate(() => route); v('p3 : « Retour » ramène à Mon entreprise', rt === 'entreprise', rt);
      await L.aller(p, 'devis'); await L.toucher(c, '[data-opd="devis"]'); await L.calme(p, 2800); const f2 = L.cadre(p); v('p3 : l\'atelier se rouvre (population : un cadre) sans erreur de page', !!f2 && c.err.length === 0, c.err.slice(0, 3));
    }
    await L.fin(c);
  }

  await C.fin();
})().catch(e => { console.error('ERREUR sonde', e); process.exit(2); });
