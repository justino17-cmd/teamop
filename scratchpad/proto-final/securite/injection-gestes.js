// SONDE « injection par les gestes » (audit de sécurité, angle injection, 17 novembre 2026).
// Tape une charge NUMÉROTÉE dans chaque champ texte des écrans et des panneaux que l'application ouvre (comme un vrai utilisateur :
// on ouvre « ＋ Nouveau », « Modifier », « Ajouter »…, on remplit, on valide), puis revisite TOUS les écrans, toutes les fiches, et
// regarde si une charge sort de son texte (balise créée, gestionnaire en ligne, adresse javascript:, style piégé) ou s'exécute.
// Le numéro de la charge dit QUEL champ (route › bouton › champ) l'a laissée sortir ; le gabarit fautif est nommé par la copie
// instrumentée (injection-instr.js : ligne du fichier d'origine).
// Usage : node injection-gestes.js [--qui=marc] [--routes=a,b] [--profil=mac] [--ouvrir=8]
// Rend « N ✓ · M ✗ » (✗ = une charge est sortie ou a exécuté du code) ; JSON dans le dossier des captures.
process.env.RACINE = require('./injection-instr.js').preparer();   // copie instrumentée : jamais les pages elles-mêmes
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const QUI = arg('qui', 'marc'), PROFIL = arg('profil', 'mac'), SEUL = arg('routes', ''), OUVRIR = +arg('ouvrir', 8), CLICS = +arg('clics', 4), SCEN = arg('scenario', ''), PUIS = arg('puis', ''), ROLE_ = arg('role', ''), CLICS_R = Object.fromEntries(arg('clicsroute', '').split(',').filter(Boolean).map(x => x.split('='))), ETIQ = arg('etiq', SEUL.replace(/,/g, '+').slice(0, 30) || 'tout');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/securite/';
fs.mkdirSync(SORTIE, { recursive: true });
const avec = (pr, ms) => Promise.race([pr, new Promise((_, r) => setTimeout(() => r(new Error('DELAI')), ms))]);
// boutons qui OUVRENT un formulaire / une saisie ; boutons qui VALIDENT ; boutons qu'on ne touche jamais dans un panneau
const OUVRE = /^(＋|\+|nouveau|nouvelle|ajouter|créer|modifier|✎|saisir|poser|répondre|écrire|demander|planifier|déclarer|noter|commenter|proposer|renommer|éditer|ajout|inviter|importer|je |ce n.est pas|signaler|décrire|corriger|justifier|expliquer|refuser|relancer)/i;
const VALIDE = /(enregistrer|créer|ajouter|valider|envoyer|confirmer|poser|sauvegarder|appliquer|accepter|terminer|noter|inviter|joindre|répondre|ok$|oui|signaler|justifier|corriger|refuser|relancer)/i;
const PAS = /(supprimer|retirer|annuler|fermer|✕|effacer|se déconnecter|quitter|réinitialiser)/i;
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI === 'null' ? null : QUI, init: O.INIT, guide: false, attente: 1500 });
  const { p } = c; p.on('dialog', d => (d.type() === 'prompt' ? d.accept(O.CHARGE('nPrompt')) : d.accept()).catch(() => {}));
  if (ROLE_) { const [k, cli] = ROLE_.split(':'); await avec(p.evaluate(({ k, cli }) => rlChanger(k, cli ? { cli } : {}), { k, cli }), 8000); await L.calme(p, 800); console.log('  · rôle posé :', ROLE_); }
  const legende = {}; const formulaires = []; let nChamps = 0, nGestes = 0, nEcransSaisie = 0, nPanneaux = 0;
  const charge = (desc) => { const id = 'n' + (++nChamps); legende[id] = desc; return { id, val: O.CHARGE(id) }; };
  const routesTous = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r)));
  const aSaisir = SEUL ? SEUL.split(',') : routesTous;
  // remplit, dans tous les cadres, chaque champ texte visible sous `racine` ; rend le nombre de champs remplis
  const COMPACTE = id => `¤${id}¤"'><img/src=x/onerror=__xss('${id}')>`;   // sans espace : passe un champ courriel
  const remplir = async (racine, ctx) => { let n = 0;
    for (const f of p.frames()) { let infos; try { infos = await avec(f.evaluate(sel => { const R = sel === 'DOC' ? document : (document.querySelector(sel) || null); if (!R) return []; const out = [];
        R.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach((e, i) => { const t = (e.type || 'text').toLowerCase(); if (e.tagName === 'INPUT' && ['checkbox', 'radio', 'button', 'submit', 'file', 'hidden', 'range', 'color', 'image', 'reset'].includes(t)) return; if (e.disabled || e.readOnly) return;
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; const nom = (e.id || e.name || '') + '|' + (e.placeholder || e.getAttribute('aria-label') || (e.closest('label') && e.closest('label').textContent.trim().slice(0, 30)) || '');
          const num = e.tagName === 'INPUT' && (t === 'number' || /numeric|decimal/.test(e.inputMode || '') || /^\d/.test(e.value || '') && /min|pause|durée|prix|qté|quantité|montant|km|%/i.test(nom));
          const genre = e.tagName === 'SELECT' ? 'select' : t === 'email' ? 'courriel' : t === 'tel' ? 'tel' : t === 'date' ? 'date' : t === 'time' ? 'heure' : t === 'month' ? 'mois' : num ? 'nombre' : 'texte';
          e.setAttribute('data-sonde', String(i)); out.push({ i, nom, genre, plein: !!(e.value && genre !== 'texte' && genre !== 'courriel') }); }); return out; }, racine), 4000); } catch (e) { continue; }
      for (const x of infos) { const ch = x.genre === 'texte' || x.genre === 'courriel' ? charge(ctx + ' › ' + x.nom) : null; const val = ch ? (x.genre === 'courriel' ? COMPACTE(ch.id) + '@exemple.fr' : ch.val) : null;
        try { await avec(f.evaluate(({ i, v, genre, plein }) => { const e = document.querySelector('[data-sonde="' + i + '"]'); if (!e) return; e.removeAttribute('data-sonde'); e.focus();
            if (genre === 'select') { if (!e.value || e.selectedIndex <= 0) { const o = [...e.options].find((o, k) => k > 0 && o.value && !o.disabled); if (o) e.value = o.value; } }
            else if (genre === 'tel') e.value = '0546001717'; else if (genre === 'date') { if (!plein) e.value = (typeof AUJ === 'string' ? AUJ : new Date().toISOString().slice(0, 10)); } else if (genre === 'heure') { if (!plein) e.value = '09:00'; } else if (genre === 'mois') { if (!plein) e.value = '2026-10'; } else if (genre === 'nombre') { if (!plein) e.value = '5'; }
            else if (e.isContentEditable) e.textContent = v; else { const set = Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; set.call(e, v); }
            e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, { i: x.i, v: val, genre: x.genre, plein: x.plein }), 4000); if (ch) n++; } catch (e) {} } }
    return n; };
  const boutons = (f, zone, re) => f.evaluate(({ zone, re, pas }) => { const R = document.querySelector(zone) || document, out = [], R2 = new RegExp(re, 'i'), P = new RegExp(pas, 'i');
    R.querySelectorAll('button, a.btn, [data-action], summary').forEach(b => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return; const t = (b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); if (!t || P.test(t) || !R2.test(t)) return; out.push(t.slice(0, 40)); }); return [...new Set(out)]; }, { zone, re: re.source, pas: PAS.source });
  const cliquer = (f, zone, t) => f.evaluate(({ zone, t }) => { const R = document.querySelector(zone) || document; const b = [...R.querySelectorAll('button, a.btn, [data-action], summary')].find(b => { const r = b.getBoundingClientRect(); return r.width && r.height && (b.textContent || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40) === t; }); if (!b) return false; b.click(); return true; }, { zone, t });
  const trouves = new Map(), vus = new Set();
  const lire = async ou => { for (const f of p.frames()) { let r; try { r = await avec(f.evaluate(O.LIRE), 5000); } catch (e) { continue; } r.vues.forEach(x => vus.add(x)); for (const s of r.sorti) { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou, ous: new Set() }); trouves.get(k).ous.add(ou.split(' ▸')[0]); } } };
  // 1 bis) SCÉNARIO dirigé (à la place de la saisie générique) : les gestes d'une vraie personne, étape par étape
  const executer = async ([genre, sel, x]) => {
    if (genre === 'aller') { await avec(p.evaluate(r => aller(r), sel), 12000); return L.calme(p, 400); }
    if (genre === 'attendre') return p.waitForTimeout(sel);
    if (genre === 'lire') return lire(SCEN + ' ▸ ' + sel);
    if (genre === 'clic') { const ok = await avec(p.evaluate(s => { const b = [...document.querySelectorAll(s)].find(b => { const r = b.getBoundingClientRect(); return r.width && r.height && !b.disabled; }); if (!b) return false; b.click(); return true; }, sel), 4000); if (!ok) console.log('  · scénario : introuvable ou grisé', sel); nGestes++; return p.waitForTimeout(450); }
    const ch = genre === 'texte' || genre === 'courriel' ? charge(SCEN + ' › ' + x) : null, v = ch ? (genre === 'courriel' ? COMPACTE(ch.id) + '@exemple.fr' : ch.val) : x;
    const ok = await avec(p.evaluate(({ s, v }) => { const e = [...document.querySelectorAll(s)].find(e => { const r = e.getBoundingClientRect(); return r.width && r.height; }); if (!e) return false; e.focus();
      if (e.tagName === 'SELECT') e.value = v; else { const set = Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set; set.call(e, v); }
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }, { s: sel, v }), 4000);
    if (!ok) console.log('  · scénario : champ introuvable', sel); else if (genre === 'valeur') nChamps++; return p.waitForTimeout(150); };
  if (SCEN) { const { [SCEN]: pas } = require('./injection-scenarios.js'); if (!pas) throw new Error('scénario inconnu : ' + SCEN); nEcransSaisie++;
    for (const st of pas) { try { await executer(st); } catch (e) { console.log('  · étape', st[0], st[1], String(e).slice(0, 60)); } }
    const t = await p.evaluate(() => { const t = document.getElementById('toast'); return (t && t.textContent || '').replace(/\s+/g, ' ').slice(0, 120); }); formulaires.push({ r: SCEN, t: 'scénario', champs: nChamps, issue: 'dernier message : ' + t }); nPanneaux++; }
  // 1) SAISIE : par écran, les champs en ligne, puis chaque bouton qui ouvre un formulaire
  for (const r of (SCEN ? [] : aSaisir)) { try {
    await avec(p.evaluate(x => aller(x), r), 12000); await L.calme(p, 400); nEcransSaisie++;
    nChamps += 0; await remplir('#contenu', r + ' (écran)');
    const ouv = (await avec(boutons(p, '#contenu', OUVRE), 5000)).slice(0, OUVRIR);
    for (const t of ouv) { try { await avec(p.evaluate(x => aller(x), r), 12000); await L.calme(p, 300);
        if (!(await avec(cliquer(p, '#contenu', t), 4000))) continue; nGestes++; await p.waitForTimeout(450);
        const n = await remplir('#calque .panneau', r + ' › ' + t); const n2 = n ? 0 : await remplir('#contenu', r + ' › ' + t + ' (en ligne)'); if (n || n2) nPanneaux++;
        // valide par le dernier bouton qui ressemble à une validation, dans le panneau (ou, à défaut, dans l'écran)
        const val = (await avec(boutons(p, '#calque .panneau', VALIDE), 4000)); let issue = 'pas de bouton de validation';
        if (val.length) { await avec(cliquer(p, '#calque .panneau', val[val.length - 1]), 4000); await p.waitForTimeout(500);
          issue = await avec(p.evaluate(() => { const o = document.querySelector('#calque .panneau'), t = document.getElementById('toast'); return (o && o.offsetParent !== null ? 'REFUSÉ' : 'enregistré') + ' · ' + ((t && t.classList.contains('on') && t.textContent) || '').replace(/\s+/g, ' ').slice(0, 90); }), 3000).catch(() => '?'); }
        formulaires.push({ r, t, champs: n + n2, issue });
        await avec(p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }), 3000);
      } catch (e) { await avec(L.ranger(p), 4000).catch(() => {}); if (/DELAI/.test(String(e))) break; } }
  } catch (e) { console.log('  · écran', r, String(e).slice(0, 60)); } }
  formulaires.forEach(f => console.log('  FORM', f.r, '›', f.t, '·', f.champs, 'champs ·', f.issue)); console.log(`saisie : ${nEcransSaisie} écrans · ${nGestes} formulaires ouverts · ${nPanneaux} panneaux remplis · ${nChamps} champs`);
  // 1 ter) CHANGEMENT DE PERSONNE : ce que la première a tapé est relu par une AUTRE (un technicien écrit, le patron lit) — la frontière qui compte
  if (PUIS) { const ok = await avec(p.evaluate(k => { try { return sessionOuvrir(k); } catch (e) { return String(e); } }, PUIS), 8000); await L.calme(p, 800); console.log('  · session reprise par', PUIS, ':', ok); }
  // 2) BALAYAGE : tous les écrans, toutes les fiches, et les gestes de l'écran (aperçus, panneaux) ; on lit chaque cadre
  const adr = await p.evaluate(() => { const P = []; try { Object.keys(CLIENTS).forEach(k => P.push('client-x-' + k)); } catch (e) {} try { INTS.forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { FACTURES.forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {}
    try { Object.keys(DEVIS_REG).forEach(k => P.push('devis-x-' + k)); } catch (e) {} try { CONTRATS.forEach(k => { P.push('contrat-x-' + k.id); P.push('signer-x-' + k.id); }); } catch (e) {} return P; });
  const tous = routesTous.concat(adr); let visites = 0, clics = 0;
  for (const r of tous) { try { await avec(p.evaluate(x => aller(x), r), 12000); await L.calme(p, 400); visites++; await lire(r);
      const gs = (await avec(L.gestes(p, '#contenu'), 6000)).slice(0, +(CLICS_R[r.split('-x-')[0]] || CLICS));
      for (const g of gs) { if (PAS.test(g.lib)) continue; try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await p.waitForTimeout(200); clics++; await lire(r + ' ▸ ' + g.lib); await L.ranger(p);
          if ((await p.evaluate(() => location.hash)) !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
    } catch (e) { console.log('  · visite', r, String(e).slice(0, 60)); } }
  const hits = await p.evaluate(() => window.__hits.slice()), orig = await p.evaluate(() => window.__orig || []), puits = await p.evaluate(() => window.__puits || []);
  const lignes = {}, toutesLignes = {}; orig.forEach(o => { const t = lignes[o.tok]; if (!t || o.len < t.len) lignes[o.tok] = o; (toutesLignes[o.tok] = toutesLignes[o.tok] || new Set()).add(o.pg.replace('prototype-', '').replace('.html', '') + ':' + o.l + (o.len > 3000 ? '(gros)' : '')); });
  // la gravité d'une sortie : 'gestionnaire…' / 'balise' = exécution possible (HTML injecté) ; on les groupe par gabarit fautif
  const sorties = [...trouves.values()].map(s => { const o = lignes[s.champ]; return { ...s, ous: [...s.ous], chemin: legende[s.champ] || '?', ligne: o ? o.pg + ':' + o.l : null, lignes: [...(toutesLignes[s.champ] || [])].filter(x => !/\(gros\)/.test(x)).slice(0, 12) }; });
  const groupe = {}; sorties.forEach(s => { const k = (s.ligne || '?') + ' ← ' + s.chemin.split(' › ').slice(0, 2).join(' › '); (groupe[k] = groupe[k] || []).push(s); });
  console.log(`\nbalayage : ${visites} écrans/fiches · ${clics} clics · champs vus à l'écran : ${vus.size} / ${nChamps}`);
  Object.entries(groupe).sort().forEach(([k, v]) => console.log('  SORTIE', k, '·', [...new Set(v.map(s => s.sorte))].join(' / '), '· vue sur :', [...new Set(v.map(s => s.ou))].slice(0, 3).join(' | ').slice(0, 90)));
  { const hh = {}; hits.forEach(h => { hh[h] = (hh[h] || 0) + 1; }); Object.entries(hh).forEach(([h, n]) => console.log('  EXÉCUTION ←', h, legende[h] || '?', '×' + n)); }
  sorties.forEach(s => console.log('  DÉTAIL', s.champ, s.sorte, '·', s.chemin, '· écrans :', s.ous.slice(0, 8).join(' | '), '· gabarits :', s.lignes.join(', ')));
  L.v('population : des champs ont été remplis', nChamps >= 1, nChamps);
  L.v('population : des écrans ont été visités', visites >= 30, visites);
  L.v(`aucune charge n'est sortie de son texte (${sorties.length} sorties)`, sorties.length === 0, sorties.slice(0, 3));
  L.v(`aucune charge n'a exécuté de code (${hits.length})`, hits.length === 0, hits.slice(0, 3));
  fs.writeFileSync(SORTIE + `gestes-${QUI}-${PROFIL}-${ETIQ}.json`, JSON.stringify({ formulaires, champs: nChamps, ecransSaisie: nEcransSaisie, formulaires: nGestes, panneaux: nPanneaux, visites, clics, vus: vus.size, sorties, hits: hits.map(h => [h, legende[h]]), legende }, null, 1));
  console.log('  erreurs JS :', c.err.length, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
