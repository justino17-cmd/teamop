// RECONTRÔLE ADVERSE « restes équipe » tour 3 (19 novembre 2026). Rejoue, par d'AUTRES chemins que ceux des correcteurs :
//  C : signes invisibles (collage par événement paste, insertText, milieu, bout, valeurs voisines U+180E, U+3164, U+115F, U+2800, insécables…)
//  F : « clic sur tout » — une personne SANS la case parcourt les écrans et le module de courrier, chaque bouton/entrée de menu est joué, les données sont comparées avant/après
//  usage : node restes-equipe-3-recontrole.js <phase C|F> [profil] [cas…]     ⛔ 127.0.0.1 seulement, entreprise fictive
const fs = require('fs'); const E = require('./equipe-outils.js'); const { L, v } = E;
const PHASE = process.argv[2] || 'C', PROFIL = process.argv[3] || 'mac', FILTRE = process.argv.slice(4);
const OUT = process.env.OUT || '';
const SNAP = `(() => { const N = ['ENTREPRISE', 'CLIENTS', 'INTS', 'BUREAU', 'ABSENCES', 'NOTES', 'FACTURES', 'ENCAISSEMENTS', 'CONTRATS', 'DEVIS', 'TACHES', 'DEMANDES_ABS', 'DECISIONS_ABS', 'PRODUITS', 'COMMANDES', 'MVTS', 'MVTS_ATT', 'MAILS', 'ML_BOITES', 'DEM_ACHAT', 'NDF', 'ACHATS', 'VEHICULES', 'POINTAGES', 'NOTIFS', 'AX_EQUIPE', 'JOURNAL', 'FICHES'];
  const o = {}; for (const n of N) { try { o[n] = JSON.stringify(eval(n)); } catch (e) { o[n] = 'ABSENT'; } }
  try { o.LS = JSON.stringify(Object.keys(localStorage).sort().filter(k => !/(_nv_vu_|vues|opg_proto_mode|theme)/i.test(k)).map(k => [k, localStorage.getItem(k)])); } catch (e) { o.LS = 'ERR'; } return o; })()`;
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 260)); } };

// ── C ─────────────────────────────────────────────────────────────────────────────────────────
const VOISINS = [['U+180E MONGOLIAN VOWEL SEP', '᠎'], ['U+3164 HANGUL FILLER', 'ㅤ'], ['U+115F', 'ᅟ'], ['U+1160', 'ᅠ'], ['U+FFA0', 'ﾠ'], ['U+2800 BRAILLE BLANK', '⠀'], ['U+00A0 insécable', ' '], ['U+202F fine insécable', ' '], ['U+2007', ' '], ['U+034F COMBINING GRAPHEME JOINER', '͏'], ['U+FE0F VARIATION SELECTOR', '️'], ['U+17B4', '឴'], ['U+061C ALM', '؜'], ['U+E0020 TAG SPACE', '\u{E0020}'], ['U+1D173', '\u{1D173}'], ['U+200B ZWSP', '​'], ['U+FEFF BOM', '﻿'], ['U+00AD SHY', '­'], ['U+2062 invisible times', '⁢'], ['U+206F', '⁯'], ['U+202E RLO', '‮'], ['U+200D ZWJ', '‍'], ['U+2028 LS', ' '], ['U+0085 NEL', '\u0085']];
async function phaseC() {
  const c = await E.marc(PROFIL), p = c.p;
  // 1) la fonction, 24 valeurs × 4 positions
  const fon = await p.evaluate(V => V.map(([nom, ch]) => ({ nom, pos: ['Marie' + ch, ch + 'Marie', 'Ma' + ch + 'rie', ch, 'Marie' + ch + ch].map(t => ({ t: JSON.stringify(t), ok: nomPersonneOk(t), ph: nomRefus(t) })) })), VOISINS);
  const trous = [];
  for (const f of fon) for (const x of f.pos) if (x.ok !== null && /[ㅤᅟᅠﾠ͏️឴\u{E0020}᠎⠀؜ᴗ3]/u.test(JSON.parse(x.t))) trous.push(f.nom + ' ' + x.t + ' -> « ' + x.ok + ' »');
  console.log('FONCTION : valeurs invisibles ACCEPTÉES par nomPersonneOk (hors ESPACES normalisés) :'); trous.forEach(t => console.log('   ', t));
  const insec = fon.filter(f => /00A0|202F|2007|2028|0085/.test(f.nom)).map(f => f.nom + ' ' + f.pos.map(x => x.ok).join(' | ')); console.log('espaces voisines :', insec);
  v('C (fonction) les 12 signes de la liste officielle sont refusés dans TOUTES les positions', fon.filter(f => /ZWSP|BOM|SHY|invisible times|U\+206F|RLO|ZWJ/.test(f.nom)).every(f => f.pos.every(x => x.ok === null && /invisible/.test(x.ph))));
  v('C (trou ?) aucun des signes VOISINS n\'est accepté dans un nom (U+180E, U+3164, U+115F, U+1160, U+FFA0, U+2800, U+034F, U+FE0F, U+17B4, U+061C, U+E0020, U+1D173)', trous.length === 0, trous.slice(0, 12));
  // 2) l'interface : collage RÉEL (événement paste avec DataTransfer), insertText (IME), saisie touche à touche, aux 4 sites
  const cas = [['U+200B', '​'], ['U+FEFF', '﻿'], ['U+202E', '‮'], ['U+3164', 'ㅤ'], ['U+180E', '᠎'], ['U+2800', '⠀'], ['U+00A0', ' ']];
  const ecrire = async (sel, texte, mode) => { await p.focus(sel); await p.evaluate(s => { const e = document.querySelector(s); e.value = ''; }, sel);
    if (mode === 'paste') await p.evaluate(({ s, t }) => { const e = document.querySelector(s); const dt = new DataTransfer(); dt.setData('text/plain', t); e.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); const b = new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: null, dataTransfer: dt, bubbles: true, cancelable: true }); if (e.dispatchEvent(b)) { e.value += t; e.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', bubbles: true })); } }, { s: sel, t: texte });
    else if (mode === 'insert') await p.keyboard.insertText(texte);
    else await p.keyboard.type(texte, { delay: 5 }); };
  const rows = [];
  for (const [nom, ch] of cas) for (const mode of ['paste', 'insert']) for (const pos of ['milieu', 'fin']) {
    const texte = pos === 'milieu' ? 'Ma' + ch + 'rie' : pos === 'debut' ? ch + 'Marie' : 'Marie' + ch;
    // Inviter / Prénom
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 150);
    await ecrire('#eq-p', texte, mode); await p.fill('#eq-n', 'Dupont'); await p.fill('#eq-m', `rc3.${rows.length}@climservices17.fr`); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 250);
    const cree = await p.evaluate(m => EQUIPE.find(x => x.mail === m) || null, `rc3.${rows.length}@climservices17.fr`); const valeurChamp = await p.evaluate(() => (document.getElementById('eq-p') || {}).value);
    rows.push({ site: 'inviter-p', nom, mode, pos, champ: JSON.stringify(valeurChamp), cree: cree ? cree.prenom : null }); await E.ranger(c);
    // Modifier / Nom
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 150); await ecrire('#eqx-mn', texte, mode); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 250);
    const nomKb = await p.evaluate(() => eqDe('kb').nom); rows.push({ site: 'modifier-n', nom, mode, pos, champ: '', cree: nomKb }); await E.ranger(c);
    await p.evaluate(() => { eqDe('kb').nom = 'Benali'; });
  }
  const accepts = rows.filter(r => r.cree && r.cree !== 'Benali' && r.cree !== null && (r.site === 'modifier-n' ? r.cree !== 'Benali' : true));
  // ce qui est RANGÉ avec un signe invisible, quel qu'il soit
  const rangeInv = await p.evaluate(() => EQUIPE.filter(x => /[^\p{L}\p{M}\p{N} .’@a-z0-9_-]/u.test(x.prenom + x.nom)).map(x => ({ k: x.k, prenom: JSON.stringify(x.prenom), nom: JSON.stringify(x.nom) })));
  const parNom = {}; rangeInv.forEach(x => { parNom[x.k] = x; });
  console.log('RANGÉS avec un signe hors lettres/chiffres :', JSON.stringify(rangeInv));
  const gardes = rows.filter(r => r.cree && r.cree !== 'Benali');
  const synth = {}; gardes.forEach(r => { const k = r.nom + ' ' + r.site; (synth[k] = synth[k] || []).push(r.mode + '/' + r.pos + ' -> ' + r.cree); });
  console.log('essais :', rows.length, ' acceptés :', gardes.length); Object.entries(synth).forEach(([k, a]) => console.log('  ACCEPTÉ', k, JSON.stringify(a).slice(0, 220)));
  // la liste officielle par l'interface (U+200B, U+FEFF, U+202E) : jamais acceptée
  v('C (interface) U+200B, U+FEFF, U+202E : refusés aux sites Inviter-Prénom et Modifier-Nom, par collage, insertText et frappe, au début, au milieu, en fin', gardes.filter(r => /200B|FEFF|202E/.test(r.nom)).length === 0, gardes.filter(r => /200B|FEFF|202E/.test(r.nom)).slice(0, 6));
  v('C (trou ?) les valeurs VOISINES (U+3164, U+180E, U+2800) sont refusées par l\'interface', gardes.filter(r => /3164|180E|2800/.test(r.nom)).length === 0, gardes.filter(r => /3164|180E|2800/.test(r.nom)).slice(0, 6));
  // un nom qui n'est QUE ce signe
  const seul = await p.evaluate(() => ['ㅤ', 'ᅟ', 'ㅤ'].map(t => nomPersonneOk(t)));
  console.log('nom composé du seul signe U+3164/U+115F :', JSON.stringify(seul));
  // les bonnes valeurs restent acceptées par l'interface
  await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 150); await p.fill('#eqx-mn', "O'Neil"); await p.fill('#eqx-mp', 'Marie-Ève'); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 250);
  v('C « O\'Neil » et « Marie-Ève » acceptés ET rangés', await p.evaluate(() => eqDe('kb').nom === 'O’Neil' && eqDe('kb').prenom === 'Marie-Ève'), await p.evaluate(() => eqDe('kb').prenom + '|' + eqDe('kb').nom));
  // espaces insécables : « Jean-Pierre Durand » (nom composé tapé avec une insécable) doit être accepté et normalisé
  const ins = await p.evaluate(() => [nomPersonneOk('Le Goff'), nomPersonneOk(' Goff'), nomPersonneOk('Goff '), nomPersonneOk('Le Goff')]);
  console.log('insécables :', JSON.stringify(ins));
  // les noms DÉJÀ rangés (fiche d'avant) : nomPersonneNet retire-t-il ces signes ?
  const net = await p.evaluate(() => ['Ma​rie', 'Marie﻿', 'Maㅤrie', 'Ma᠎rie'].map(t => nomPersonneNet(t)));
  console.log('nomPersonneNet (noms déjà rangés) :', JSON.stringify(net));
  await E.fin();
}


// ── F : « clic sur tout » ─────────────────────────────────────────────────────────────────────
async function monter(sans, terrain) {   // sans : { cat, x } | null — personne test créée par le formulaire d'Équipe, toutes cases cochées sauf une
  const c = await E.marc(PROFIL); const p = c.p;
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', 'Rémi'); await p.fill('#eq-n', 'Poulain'); await p.fill('#eq-m', 'remi@climservices17.fr');
  await p.evaluate(t => { const s = document.getElementById('eq-terrain'); if (s && !!s.checked !== !!t) s.click(); }, !!terrain); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400); await E.ranger(c);
  const k = await p.evaluate(() => EQUIPE.find(q => q.prenom === 'Rémi').k);
  await p.evaluate(({ k }) => { for (const cat of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; }, { k });
  if (sans) {
    await E.fiche(c, k); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; document.querySelectorAll('#calque details.eq-dr-m').forEach(m => { m.open = true; }); });
    const sel = `#calque input[data-eqd="${k}|${sans.cat}|${sans.x}"]`; await L.toucher(c, sel + ':visible'); await E.ranger(c);
    const ap = await p.evaluate(({ k, sans }) => eqDe(k).droits.cats[sans.cat][sans.x], { k, sans }); if (ap) throw new Error('case restée cochée');
  }
  await L.aller(p, 'equipe'); await p.evaluate(() => { fermerPanneau(); }); await p.evaluate(({ id }) => secuVoirComme(id), { id:k }); await L.calme(p, 800);
  if ((await p.evaluate(() => acteur())) !== k) throw new Error('pas ouvert comme la personne');
  return { c, p, k };
}
const dr = p => p.evaluate(() => DROITS_REFUS.length);
const toastT = async p => ((await E.toast(p)) || '').slice(0, 110);
// un coup : photo avant, geste, photo après. Rend { changed, refus, toast, err }
async function coup(h, route, prep, geste) {
  const p = h.p; await E.ranger(h.c); await L.aller(p, route); if (prep) await prep(h);
  const a = await p.evaluate(SNAP + ''), r0 = await dr(p); let err = '', res = null; try { res = await geste(h); } catch (e) { err = String(e.message || e).slice(0, 100); }
  await L.calme(p, 350); const t = await toastT(p); const b = await p.evaluate(SNAP + ''); const refus = (await dr(p)) - r0;
  return { changed: diff(a, b), refus, toast: t, err, res };
}
const contextmenu = (p, sel, i) => p.evaluate(({ sel, i }) => { const e = [...document.querySelectorAll(sel)].filter(q => q.offsetParent !== null)[i || 0]; if (!e) return false; e.scrollIntoView({ block:'center' }); const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true, composed:true, clientX:r.left + r.width / 2, clientY:r.top + Math.min(r.height / 2, 12), button:2 })); return true; }, { sel, i });
const entrees = p => p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
const confirmer = async p => { // un panneau de confirmation : on presse son bouton principal « Oui … »
  const b = p.locator('#calque button', { hasText: /^(Oui|Supprimer|Confirmer|Valider)/ }).first(); if (await b.count()) { try { await b.click({ timeout: 1500 }); } catch (e) {} await L.calme(p, 300); } };
const forcer = (p, attrs) => p.evaluate(a => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; Object.entries(a).forEach(([k, x]) => b.setAttribute(k, x)); document.body.appendChild(b); try { b.click(); } finally { b.remove(); } return true; }, attrs);
const cliquer = async (p, sel, i) => { const ok = await p.evaluate(({ sel, i }) => { const e = [...document.querySelectorAll(sel)].filter(q => q.offsetParent !== null)[i || 0]; if (!e) return false; e.scrollIntoView({ block:'center' }); e.click(); return true; }, { sel, i }); await L.calme(p, 250); return ok; };

// chaque entrée de chaque menu du clic droit d'une famille d'éléments : on la joue (aucune entrée « de suppression » ne doit passer sans la case)
async function menusToutes(h, route, prep, sel, max, rapport) {
  const p = h.p; await E.ranger(h.c); await L.aller(p, route); if (prep) await prep(h);
  const n = Math.min(max, await p.evaluate(s => [...document.querySelectorAll(s)].filter(q => q.offsetParent !== null).length, sel));
  rapport.push({ sel, elements: n });
  for (let i = 0; i < n; i++) {
    await E.ranger(h.c); await L.aller(p, route); if (prep) await prep(h);
    if (!(await contextmenu(p, sel, i))) continue; await L.calme(p, 200); const ent = await entrees(p);
    for (let j = 0; j < ent.length; j++) {
      const r = await coup(h, route, async hh => { if (prep) await prep(hh); }, async hh => { await contextmenu(hh.p, sel, i); await L.calme(hh.p, 200); const b = hh.p.locator('.ctx button').nth(j); if (await b.count()) { await b.click({ timeout: 2000 }).catch(() => {}); await L.calme(hh.p, 250); await confirmer(hh.p); } return ent[j]; });
      rapport.push({ sel, i, entree: ent[j], changed: r.changed, refus: r.refus, toast: r.toast, err: r.err });
    }
  }
}
// tous les boutons visibles d'un écran, un par un
async function boutonsTous(h, route, prep, zone, max, rapport) {
  const p = h.p; await E.ranger(h.c); await L.aller(p, route); if (prep) await prep(h);
  const lst = await p.evaluate(z => [...document.querySelectorAll(z + ' button, ' + z + ' [role=button], ' + z + ' summary')].filter(q => q.offsetParent !== null && !q.disabled).map((q, i) => ({ i, t: (q.getAttribute('aria-label') || q.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), d: [...q.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join(' ').slice(0, 70) })), zone);
  rapport.push({ route, zone, boutons: lst.length });
  for (const b of lst.slice(0, max)) {
    if (/^data-(go|ferme|retour|menu|modetheme|tab)/.test(b.d) && !/action|asuppr/.test(b.d)) continue;
    const r = await coup(h, route, prep, async hh => { await hh.p.evaluate(({ z, i }) => { const e = [...document.querySelectorAll(z + ' button, ' + z + ' [role=button], ' + z + ' summary')].filter(q => q.offsetParent !== null && !q.disabled)[i]; if (e) { e.scrollIntoView({ block: 'center' }); e.click(); } }, { z: zone, i: b.i }); await L.calme(hh.p, 200); await confirmer(hh.p); });
    if (r.changed.length || r.refus || r.err) rapport.push({ bouton: b.t, d: b.d, changed: r.changed, refus: r.refus, toast: r.toast, err: r.err });
  }
}

// ── le module de courrier (shadow DOM) : chaque bouton / entrée de menu visible, un par un ─────
const MOD = 'const h = document.querySelector("[data-opcourrier]"); const r = h && h.shadowRoot;';
const attendreMail = async p => { await p.waitForFunction(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; return !!(r && r.querySelector('#rows .msg')); }, null, { timeout: 9000 }).catch(() => {}); await L.calme(p, 300);
  for (let i = 0; i < 3; i++) { const liste = await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const a = r && r.querySelector('[data-view]'); if (!a || a.getAttribute('data-view') === 'list') return true; const b = r.querySelector('#btnBack'); if (b && b.offsetParent !== null) { b.click(); return false; } return true; }); if (liste) break; await L.calme(p, 300); } };
const modListe = (p, mode) => p.evaluate(({ MOD, mode }) => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; if (!r) return [];
  const vis = q => { const b = q.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.x > -1 && b.x < innerWidth && getComputedStyle(q).visibility !== 'hidden'; };
  const sel = mode === 'menu' ? '[role=menuitem], .menu .mi, .mi' : 'button, [role=button], [data-act], [data-q], [data-folder], [data-multi], summary';
  return [...r.querySelectorAll(sel)].filter(vis).map((q, i) => ({ i, t: (q.getAttribute('aria-label') || q.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), d: [...q.attributes].filter(a => /^data-/.test(a.name)).map(a => a.name + '=' + a.value).join(' ').slice(0, 60) })); }, { MOD, mode });
const modClic = (p, mode, i) => p.evaluate(({ mode, i }) => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const vis = q => { const b = q.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.x > -1 && b.x < innerWidth && getComputedStyle(q).visibility !== 'hidden'; };
  const sel = mode === 'menu' ? '[role=menuitem], .menu .mi, .mi' : 'button, [role=button], [data-act], [data-q], [data-folder], [data-multi], summary'; const e = [...r.querySelectorAll(sel)].filter(vis)[i]; if (!e) return false; e.click(); return true; }, { mode, i });
const composeEnvoie = async p => { if (!(await p.locator('#cSub').count())) return false; await p.fill('#cTo', 'client@exemple.fr'); await p.keyboard.press('Enter'); await p.fill('#cSub', 'Recontrôle droits'); await p.locator('#cSend').click().catch(() => {}); await p.waitForTimeout(6200); await L.calme(p, 250); return true; };
const prepMail = async h => { await h.p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; if (!r) return; for (const sel of ['[data-scope=pro]', '[data-folder=inbox]']) { const e = r.querySelector(sel); if (e) e.click(); } }); await L.calme(h.p, 250); await attendreMail(h.p); try { await h.p.locator('#rows .msg').nth(0).click({ timeout: 5000 }); } catch (e) {} await L.calme(h.p, 350); };
async function moduleTout(h, R) {
  const p = h.p;
  // inventaire des boutons (message ouvert) puis un par un
  await E.ranger(h.c); await L.aller(p, 'boiteMail'); await prepMail(h);
  const ent = await modListe(p, 'bouton'); R.push({ inventaire_boutons: ent.map(x => x.t + (x.d ? ' [' + x.d + ']' : '')).slice(0, 90) });
  const interdits = /^(data-nav|data-folder)/;
  for (const b of ent) {
    if (/^Précédent|^Suivant|Retour|Fermer|Menu|Rechercher/i.test(b.t) && !/data-act/.test(b.d)) continue;
    if (/data-scope|data-folder/.test(b.d)) continue;   // navigation : elle ne change que la vue
    const r = await coup(h, 'boiteMail', prepMail, async hh => { await modClic(hh.p, 'bouton', b.i); await L.calme(hh.p, 350); const comp = await composeEnvoie(hh.p); return comp ? 'composé+envoyé' : ''; });
    if (r.changed.length || r.refus || r.err || r.res) R.push({ bouton: b.t, d: b.d, changed: r.changed, refus: r.refus, toast: r.toast, err: r.err, res: r.res });
  }
  // le menu du clic droit d'un message : chaque entrée
  await E.ranger(h.c); await L.aller(p, 'boiteMail'); await prepMail(h);
  const menuDe = async hh => { await hh.p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const e = r && r.querySelector('#rows .msg'); if (!e) return; const b = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true, clientX: b.left + 40, clientY: b.top + 10, button: 2 })); }); await L.calme(hh.p, 350); };
  await menuDe({ p }); const mi = await modListe(p, 'menu'); R.push({ menu_message: mi.map(x => x.t) }); await E.ranger(h.c);
  for (const m of mi) { const r = await coup(h, 'boiteMail', prepMail, async hh => { await menuDe(hh); await modClic(hh.p, 'menu', m.i); await L.calme(hh.p, 350); const comp = await composeEnvoie(hh.p); return comp ? 'composé+envoyé' : ''; }); R.push({ entree_menu: m.t, changed: r.changed, refus: r.refus, toast: r.toast, err: r.err, res: r.res }); }
  // touches
  for (const k of ['c', 'r', 'a', 'f', 'e', 'u', 'm', 'v', 's', 'l', 'j', '#', 'Delete', 'Shift+i', 'Shift+u', 'z', 'Control+z', 'Shift+r', 'Shift+3', 'Backspace', 'x', 'Shift+x', 'Control+a', 'Escape']) {
    const r = await coup(h, 'boiteMail', prepMail, async hh => { await hh.p.keyboard.press(k); await L.calme(hh.p, 350); const comp = await composeEnvoie(hh.p); return comp ? 'composé+envoyé' : ''; });
    R.push({ touche: k, changed: r.changed, refus: r.refus, toast: r.toast, res: r.res }); }
}

const p_prepFrais = async h => { await h.p.evaluate(k => { if (!DEM_ACHAT.some(d => d.id === 'dz1')) DEM_ACHAT.unshift({ id:'dz1', qui:k, d:'2026-10-31', h:'09:00', quoi:'Rouleau de gaine', q:2, u:'u', pourquoi:'essai', est:40, quand:null, etat:'attente' }); if (!NDF.some(d => d.id === 'nz1')) NDF.unshift({ id:'nz1', qui:k, d:'2026-10-31', objet:'Péage essai', ttc:8.2, tva:20, recu:true, etat:'attente' }); rendre(); }, h.k); };
const CASES = {

  'crm.m': { cat:'crm', x:'m', run: async (h, R) => {
    const p = h.p; const cli = () => p.evaluate(() => Object.keys(CLIENTS).find(x => x !== '__nv' && (CLIENTS[x].appareils || []).length) || Object.keys(CLIENTS)[0]);
    const k = await cli(); R.push({ client: k });
    const clientRoute = 'client-x-' + k;
    // chaque onglet de la fiche : tous les boutons, un par un (ce qui change CLIENTS sans refus est un trou)
    for (const ong of ['infos', 'appareils', 'historique', 'factures', 'contrats', 'documents']) {
      await boutonsTous(h, clientRoute, async hh => { await cliquer(hh.p, '[data-oc="' + ong + '"]'); }, '#contenu', 30, R);
    }
    // menus du clic droit sur une ligne de la liste Clients, sur la fiche ; la liste des interventions et des devis
    await menusToutes(h, 'clients', null, '#contenu [data-go^="client-x-"]', 3, R);
    await boutonsTous(h, 'clients', null, '#contenu', 25, R);
    // la fiche client vue depuis un devis / une intervention : « modifier les coordonnées »
    await boutonsTous(h, 'devis', null, '#contenu', 25, R);
    await boutonsTous(h, 'interventions', null, '#contenu', 25, R);
    // le SIREN d'un client professionnel : geste de la Conformité (compta › Modifier), pas de la case Clients
    const sir = await coup(h, 'clients', null, async hh => { await hh.p.evaluate(() => { const o = Object.keys(CLIENTS).find(x => CLIENTS[x].type === 'pro'); window.__pro = o; cxSirenForm(); }); await L.calme(hh.p, 300); await hh.p.evaluate(() => { const i = document.querySelector('[data-cxsiren="' + window.__pro + '"]'); if (i) i.value = '552 081 317'; }); await hh.p.evaluate(() => { const b = document.querySelector('[data-cx="sirenok"]'); if (b) b.click(); }); await L.calme(hh.p, 300); return await hh.p.evaluate(() => CLIENTS[window.__pro].siren); });
    R.push({ siren_geste_conformite: sir.res, changed: sir.changed, refus: sir.refus, toast: sir.toast });
    // Entrée dans un champ de la fiche (envoi du formulaire au clavier) après un changement de valeur
    const ent = await coup(h, clientRoute, async hh => { await cliquer(hh.p, '[data-oc="infos"]'); }, async hh => { const ok = await hh.p.evaluate(() => { const e = document.querySelector('[data-ci="tel"], #contenu input[type=tel], #contenu input.saisie'); if (!e) return false; e.focus(); e.value = '06 99 99 99 99'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }); await hh.p.keyboard.press('Enter'); await L.calme(hh.p, 300); return ok; });
    R.push({ entree_clavier_champ_fiche: ent.res, changed: ent.changed, refus: ent.refus, toast: ent.toast });
  } },
  'achats.s': { cat:'achats', x:'s', run: async (h, R) => {
    await boutonsTous(h, 'achats', null, '#contenu', 40, R);
    await boutonsTous(h, 'achats', h => cliquer(h.p, '[data-onglet], [role=tab]'), '#contenu', 25, R);
    await menusToutes(h, 'achats', null, '#contenu [data-axa], #contenu .carte, #contenu tr', 4, R);
    for (const route of ['commandes', 'fournisseurs', 'techfrais', 'vehicules']) await boutonsTous(h, route, null, '#contenu', 25, R);
  } },
  'achats.s·terrain': { cat:'achats', x:'s', terrain:true, run: async (h, R) => {
    await p_prepFrais(h);
    await boutonsTous(h, 'techfrais', p_prepFrais, '#contenu', 40, R);
    await menusToutes(h, 'techfrais', p_prepFrais, '#contenu .carte, #contenu li, #contenu [data-rl]', 5, R);
    await boutonsTous(h, 'achats', p_prepFrais, '#contenu', 25, R);
  } },
  'com.c': { cat:'com', x:'c', run: (h, R) => moduleTout(h, R) },
  'com.m': { cat:'com', x:'m', run: (h, R) => moduleTout(h, R) },
  'com.s': { cat:'com', x:'s', run: (h, R) => moduleTout(h, R) },
  'planif.s': { cat:'planif', x:'s', run: async (h, R) => {
    await menusToutes(h, 'planning', null, '.pc[data-bur]', 6, R);
    await menusToutes(h, 'planning', null, '.pc[data-int]', 4, R);
    await menusToutes(h, 'absences', h => cliquer(h.p, '[data-aonglet="calendrier"]'), '.ac-x[data-abs]', 8, R);
    await boutonsTous(h, 'absences', h => cliquer(h.p, '[data-aonglet="calendrier"]'), '#contenu', 40, R);

    // le panneau de détail d'une absence (le bouton rouge « Annuler l'absence ») : proposé ? et si on le presse ?
    { await E.ranger(h.c); await L.aller(h.p, 'absences'); await cliquer(h.p, '[data-aonglet="calendrier"]');
      await contextmenu(h.p, '.ac-x[data-abs]', 1); await L.calme(h.p, 200); const b = h.p.locator('.ctx button', { hasText: 'Voir le détail' }); if (await b.count()) { await b.first().click(); await L.calme(h.p, 400); }
      const btns = await h.p.evaluate(() => [...document.querySelectorAll('#calque button')].filter(q => q.offsetParent !== null).map(q => q.textContent.replace(/\s+/g, ' ').trim() + ' [' + [...q.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name).join(',') + ']'));
      const a0 = await h.p.evaluate(SNAP + ''), r0 = await dr(h.p);
      const clic = await h.p.evaluate(() => { const q = document.querySelector('#calque [data-asuppr]'); if (!q) return 'absent'; const vis = q.offsetParent !== null && getComputedStyle(q).display !== 'none'; q.click(); return vis ? 'visible, cliqué' : 'caché, cliqué'; });
      await L.calme(h.p, 400); const b0 = await h.p.evaluate(SNAP + ''); R.push({ panneau_absence: btns, asuppr: clic, changed: diff(a0, b0), refus: (await dr(h.p)) - r0, toast: await toastT(h.p) }); }
    // touches sur un créneau bloqué et sur une absence
    for (const [route, prep, sel] of [['planning', null, '.pc[data-bur]'], ['absences', h => cliquer(h.p, '[data-aonglet="calendrier"]'), '.ac-x[data-abs]']]) for (const k of ['Delete', 'Backspace', 'ContextMenu', 'Shift+F10', 'Control+z']) {
      const r = await coup(h, route, prep, async hh => { await hh.p.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(q => q.offsetParent !== null)[0]; if (e) { e.setAttribute('tabindex', '0'); e.focus(); } }, sel); await hh.p.keyboard.press(k); await L.calme(hh.p, 300); const ent = await entrees(hh.p); const b = hh.p.locator('.ctx button', { hasText: /Supprimer|Annuler/ }); if (await b.count()) { await b.first().click().catch(() => {}); await L.calme(hh.p, 250); await confirmer(hh.p); } return ent; });
      R.push({ touche: k, sur: sel, changed: r.changed, refus: r.refus, toast: r.toast, entrees: r.res }); }
    // appel direct des fonctions de la page
    for (const [n, code] of [['menuBloc direct', () => { const b = BUREAU[0]; menuBloc(b.id, 10, 10); return [...document.querySelectorAll('.ctx button')].map(e => e.textContent.trim()); }], ['aDeclencher asuppr direct', () => { aDeclencher({ 'data-asuppr': ABSENCES[0].id }); return 'ok'; }], ['aDeclencher planconf supprimer', () => { aDeclencher({ 'data-planconf': 'supprimer|' + INTS[0].id }); return 'ok'; }], ['annuler()', () => { try { annuler(); } catch (e) { return String(e); } return 'ok'; }]]) {
      const r = await coup(h, 'planning', null, async hh => hh.p.evaluate(code)); R.push({ direct: n, changed: r.changed, refus: r.refus, toast: r.toast, res: r.res, err: r.err }); }
  } },
};
async function phaseF() {
  for (const nom of Object.keys(CASES)) { if (FILTRE.length && !FILTRE.includes(nom)) continue; const cs = CASES[nom]; const R = []; const _p = R.push.bind(R); R.push = (...a) => { a.forEach(x => console.log(JSON.stringify(x).slice(0, 420))); return _p(...a); };
    const sans = await monter(process.env.AVEC ? null : { cat: cs.cat, x: cs.x }, cs.terrain); await cs.run(sans, R); await L.fin(sans.c);
    console.log('=== ' + nom); R.forEach(r => console.log(JSON.stringify(r))); if (OUT) fs.writeFileSync(OUT + '-' + nom + '.json', JSON.stringify(R, null, 1)); }
  await E.fin();
}

// ── A, B, D : en-tête désactivée, phrase de la fiche de soi, gestes d'un compte désactivé — mesurés ET photographiés ─────
const NUIT = process.argv.includes('nuit'), CAPD = '/tmp/rc3/cap/'; try { fs.mkdirSync(CAPD, { recursive: true }); } catch (e) {}
async function phaseABD() {
  const c = await E.marc(PROFIL, NUIT), p = c.p, suf = PROFIL + (NUIT ? '-nuit' : '-jour');
  const sur = () => p.evaluate(() => { const s = document.querySelector('#calque .panneau .surtitre'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const btns = () => p.evaluate(() => [...document.querySelectorAll('#calque button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().replace(/\s+/g, ' ')));
  const desact = async k => { await E.fiche(c, k); await L.toucher(c, `[data-eq="desact|${k}"]`); await L.calme(p, 350); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 350); } };
  // D1 : la fiche reste ouverte pendant la désactivation : les deux gestes disparaissent-ils tout de suite ?
  await E.fiche(c, 'sm'); const avant = await btns(); const avantS = await sur();
  v('D (contre-épreuve) compte ACTIF : « Nouveau téléphone » et « Déconnecter partout » proposés', avant.includes('Nouveau téléphone') && avant.includes('Déconnecter partout'), avant);
  await L.toucher(c, '[data-eq="desact|sm"]'); await L.calme(p, 350); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 450); }
  const ouv = await p.evaluate(() => !!document.querySelector('#calque .panneau')); const apres = ouv ? await btns() : []; const sap = ouv ? await sur() : '';
  console.log('  fiche encore ouverte après désactivation :', ouv, '| en-tête :', sap, '| boutons :', JSON.stringify(apres));
  if (ouv) v('D la fiche laissée OUVERTE pendant la désactivation ne garde ni « Nouveau téléphone » ni « Déconnecter partout »', !apres.includes('Nouveau téléphone') && !apres.includes('Déconnecter partout'), apres);
  await E.ranger(c); await E.fiche(c, 'sm'); const g2 = await btns(); const s2 = await sur();
  v('A+D fiche rouverte : en-tête « désactivé(e) » et plus les deux gestes', /désactivé\(e\)/.test(s2) && !g2.includes('Nouveau téléphone') && !g2.includes('Déconnecter partout'), { s2, g2 });
  await L.capture(c, CAPD + `fiche-desactivee-${suf}.png`);
  // D2 : gestes forcés sur une désactivée (data-sec2 fabriqué) : rien ne doit casser, rien ne doit s'écrire de travers
  const forcer = (a) => p.evaluate(a => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; b.setAttribute('data-sec2', a); document.body.appendChild(b); try { b.click(); } finally { b.remove(); } }, a);
  await E.ranger(c); const tel0 = await p.evaluate(() => JSON.stringify(secuCompte('sm').tel)); const ses0 = await p.evaluate(() => JSON.stringify(SECU.sessions.sm || null));
  await forcer('deconnecter|sm'); await L.calme(p, 300); const pan = await p.evaluate(() => { const q = document.querySelector('#calque .panneau h2'); return q ? q.textContent.trim() : ''; }); await E.ranger(c);
  await forcer('telephone|sm'); await L.calme(p, 300); const pan2 = await p.evaluate(() => { const q = document.querySelector('#calque .panneau h2'); return q ? q.textContent.trim() : ''; }); await E.ranger(c);
  console.log('  gestes forcés sur la désactivée : deconnecter ->', JSON.stringify(pan), '| telephone ->', JSON.stringify(pan2));
  const errs = (c.err || []).filter(x => !/favicon|manifest/i.test(String(x)));
  v('D aucun plantage de la page pendant les gestes forcés', errs.length === 0, errs.slice(0, 3));
  // A : en-têtes — invitée désactivée, désactivée+verrouillée, lecteur
  await E.ranger(c); await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250); await p.fill('#eq-p', 'Anne-Sophie'); await p.fill('#eq-n', 'Montgolfier-Delacroix-Vandenberghe'); await p.fill('#eq-m', 'as.long@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c);
  const k = await p.evaluate(() => EQUIPE.find(x => x.prenom === 'Anne-Sophie').k); await E.fiche(c, k); const sA = await sur(); await desact(k); await E.ranger(c); await E.fiche(c, k); const sD = await sur();
  v('A nom très long : « invitation envoyée » avant, « désactivé(e) » après', /invitation envoyée/.test(sA) && /désactivé\(e\)/.test(sD), { sA, sD }); await L.capture(c, CAPD + `fiche-invitee-longue-desactivee-${suf}.png`);
  const dep = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? q.scrollWidth > q.clientWidth + 1 : null; }); v('A le panneau ne déborde pas à l\'horizontale', dep === false, dep);
  await E.ranger(c); await E.fiche(c, 'marc'); const sM = await sur(); const phr = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); const ph = [...P.querySelectorAll('small')].find(x => /ci-dessous/.test(x.textContent)); const cp = [...P.querySelectorAll('button')].find(b => /Copier le lien/.test(b.textContent)); const bt = [...P.querySelectorAll('button')].find(b => /M’envoyer un lien/.test(b.textContent)); return { phrase: ph ? ph.textContent.trim() : '', apresCopier: !!(ph && cp && (cp.compareDocumentPosition(ph) & 4)), boutonApres: !!(ph && bt && (ph.compareDocumentPosition(bt) & 4)) }; });
  v('B fiche de soi : « Copier le lien » avant la phrase, bouton « M’envoyer un lien » après (ordre du DOM)', phr.apresCopier && phr.boutonApres, phr);
  await p.evaluate(() => { const e = [...document.querySelectorAll('#calque small')].find(x => /ci-dessous/.test(x.textContent)); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await L.capture(c, CAPD + `fiche-soi-${suf}.png`);
  // B bis : la fiche d'un AUTRE ne dit pas « ci-dessous » à tort
  await E.ranger(c); await E.fiche(c, 'kb'); const autre = await p.evaluate(() => [...document.querySelectorAll('#calque small')].filter(x => /ci-dessous|ci-dessus/.test(x.textContent)).map(x => x.textContent.trim().slice(0, 140)));
  console.log('  phrases « ci-dessous/ci-dessus » sur la fiche d\'un autre :', JSON.stringify(autre));
  await E.fin();
}

// ── K : les touches du module de courrier, isolées (état des lignes avant/après, pas le rangement local) ─────
const sigMod = p => p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; if (!r) return null; const rows = [...r.querySelectorAll('#rows .msg')].map(e => (e.getAttribute('data-id') || '') + ':' + e.className.replace(/\s+/g, '.') + ':' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)); const fol = [...r.querySelectorAll('[data-folder]')].map(e => e.getAttribute('data-folder') + '=' + (e.textContent || '').replace(/\D+/g, ' ').trim()); return JSON.stringify({ rows, fol }); });
async function phaseK() {
  for (const cas of (FILTRE.length ? FILTRE : ['com.m', 'com.c', 'com.s'])) {
    const [cat, x] = cas.split('.'); const keys = { 'com.m': ['e', 'f', 'u', 'j', 'm', 'v', 's', 'r', 'a', 'Shift+r', 'Shift+a', 'z', '1', '2', '3', 'Shift+i', 'Shift+u'], 'com.c': ['c', 'r', 'a', 'Shift+r', 'Shift+f', 'Control+Enter', 'Shift+a', 'Control+Shift+f'], 'com.s': ['#', 'Delete', 'Backspace', 'Shift+3', 'd', 'x', 'Control+Backspace'] }[cas];
    for (const avec of [false, true]) { const h = await monter(avec ? null : { cat, x }); const out = [];
      for (const k of keys) { await E.ranger(h.c); await L.aller(h.p, 'boiteMail'); await prepMail(h); const a = await sigMod(h.p), m0 = await h.p.evaluate(SNAP + ''); const r0 = await dr(h.p); await h.p.keyboard.press(k); await L.calme(h.p, 450); const compose = (await h.p.locator('#cSub').count()) > 0; if (compose) { await h.p.keyboard.press('Escape'); await L.calme(h.p, 250); } const b = await sigMod(h.p); const m1 = await h.p.evaluate(SNAP + ''); out.push({ cas, avec, touche: k, rowsChange: a !== b, compose, snapChanged: diff(m0, m1).filter(z => z !== 'LS'), refus: (await dr(h.p)) - r0, toast: await toastT(h.p) }); }
      out.forEach(o => console.log(JSON.stringify(o))); await L.fin(h.c); } }
  await E.fin();
}

async function phaseL() {   // L : ouvrir un message le marque-t-il lu, sans la case com.m ?
  for (const avec of [false, true]) { const h = await monter(avec ? null : { cat: 'com', x: 'm' }); const p = h.p;
    await L.aller(p, 'boiteMail'); await prepMail(h); await L.aller(p, 'boiteMail'); await attendreMail(p);
    const lire = () => p.evaluate(() => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; return [...r.querySelectorAll('#rows .msg')].map(e => (e.getAttribute('data-id') || '?') + ':' + (/unread/.test(e.className) ? 'NONLU' : 'lu')).join(' '); });
    const a = await lire(), m0 = await p.evaluate(() => JSON.stringify(MAILS)); const nonLu = await p.evaluate(() => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; const e = [...r.querySelectorAll('#rows .msg')].findIndex(q => /unread/.test(q.className)); return e; });
    if (nonLu >= 0) { await p.locator('#rows .msg').nth(nonLu).click(); await L.calme(p, 500); }
    const b = await lire(), m1 = await p.evaluate(() => JSON.stringify(MAILS));
    console.log(JSON.stringify({ avec, indexNonLu: nonLu, avant: a, apres: b, MAILS_change: m0 !== m1, refus: await dr(p) })); await L.fin(h.c); }
  await E.fin();
}

async function phaseP() {   // P : dans chaque dossier du module, les gestes de suppression existent-ils sans com.s ?
  const h = await monter({ cat: 'com', x: 's' }); const p = h.p; const sortie = {};
  for (const d of ['trash', 'junk', 'archive', 'drafts', 'scheduled', 'sent', 'inbox']) {
    await L.aller(p, 'boiteMail'); await attendreMail(p);
    await p.evaluate(d => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; const e = r.querySelector('[data-folder=' + d + ']'); if (e) e.click(); }, d); await L.calme(p, 500);
    const lignes = await p.locator('#rows .msg').count(); if (lignes) { await p.locator('#rows .msg').nth(0).click().catch(() => {}); await L.calme(p, 350); }
    const bt = await modListe(p, 'bouton'); const noms = bt.map(x => x.t + (x.d ? '[' + x.d + ']' : ''));
    let men = []; if (lignes) { await p.evaluate(() => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; const e = r.querySelector('#rows .msg'); const b = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true, clientX: b.left + 40, clientY: b.top + 10, button: 2 })); }); await L.calme(p, 300); men = (await modListe(p, 'menu')).map(x => x.t); await p.keyboard.press('Escape'); }
    sortie[d] = { messages: lignes, suspects: noms.filter(n => /vider|suppr|défin|effac|purg|trash/i.test(n)), menu: men };
    console.log(d, JSON.stringify(sortie[d])); }
  // un vidage par la fonction du module / touche en dossier corbeille
  await p.evaluate(() => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; const e = r.querySelector('[data-folder=trash]'); if (e) e.click(); }); await L.calme(p, 400);
  const a = await p.evaluate(SNAP + ''); if (await p.locator('#rows .msg').count()) await p.locator('#rows .msg').nth(0).click(); for (const k of ['Delete', '#', 'Shift+Delete', 'Control+Backspace']) { await p.keyboard.press(k); await L.calme(p, 300); }
  const b = await p.evaluate(SNAP + ''); console.log('touches de suppression dans la corbeille : changed =', JSON.stringify(diff(a, b).filter(z => z !== 'LS')), '| refus =', await dr(p));
  await L.fin(h.c); await E.fin();
}

(async () => { if (PHASE === 'P') await phaseP(); else if (PHASE === 'L') await phaseL(); else if (PHASE === 'K') await phaseK(); else if (PHASE === 'C') await phaseC(); else if (PHASE === 'ABD') await phaseABD(); else await phaseF(); })().catch(async e => { console.log('ÉCHEC DE LA SONDE :', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
