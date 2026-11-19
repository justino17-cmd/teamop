// « Qui peut quoi » — LES CASES JOUÉES, pas lues (tour 3 « restes équipe », 19 novembre 2026). equipe-droits-profonds.js ne fait que LIRE les boutons qu'une fiche offre : une case dont le geste n'a pas de bouton
// visible à l'ouverture (planif.s, crm.m, achats.s, com.c, com.m, com.s) y paraissait « morte ». Ici, pour CHAQUE case : on crée une personne test par le formulaire d'Équipe (Rémi Poulain), on lui donne toutes les
// cases, on décoche UNE case par la vraie case de sa fiche, on ouvre l'application comme elle, puis on TENTE le geste par plusieurs chemins qui ne sont pas le bouton de la page d'ouverture (menu du clic droit,
// touche Menu du clavier, raccourcis du module de courrier, fiche d'un autre écran, panneau de confirmation…). Verdict, pour chaque chemin :
//   SANS la case : les données (une copie de tous les tableaux de la page + le rangement local) sont IDENTIQUES avant/après, et le refus est DIT (toast « Ce geste n'est pas ouvert à ton compte… ») OU le geste
//                  n'est tout simplement pas proposé (chemin fermé : on le dit « non proposé »). Les données qui bougent = DÉFAUT DE LA PAGE ; un refus muet = défaut mineur.
//   AVEC la case : la contre-épreuve — le même chemin écrit vraiment (sinon le chemin joué n'est pas un geste, et la preuve « rien n'a bougé » ne prouve rien).
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.   usage : node equipe-droits-joues.js [profil] [case …]   (profil : mac par défaut ; iphone, android, ipad…)
const fs = require('fs');
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac'; const FILTRE = process.argv.slice(3);
const SORTIE = process.env.SORTIE_JOUEES || '';
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
// les tableaux de la page qui font « les données » + tout le rangement local (le module de courrier garde son état là)
const SNAP = `(() => { const N = ['ENTREPRISE', 'CLIENTS', 'INTS', 'BUREAU', 'ABSENCES', 'NOTES', 'FACTURES', 'ENCAISSEMENTS', 'CONTRATS', 'DEVIS', 'TACHES', 'DEMANDES_ABS', 'DECISIONS_ABS', 'PRODUITS', 'COMMANDES', 'MVTS', 'MVTS_ATT', 'MAILS', 'ML_BOITES', 'DEM_ACHAT', 'NDF', 'ACHATS', 'VEHICULES', 'POINTAGES', 'NOTIFS', 'AX_EQUIPE', 'JOURNAL', 'FICHES'];
  const o = {}; for (const n of N) { try { o[n] = JSON.stringify(eval(n)); } catch (e) { o[n] = 'ABSENT'; } }
  try { o.LS = JSON.stringify(Object.keys(localStorage).sort().filter(k => !/(_nv_vu_|vues|opg_proto_mode|theme)/i.test(k)).map(k => [k, localStorage.getItem(k)])); } catch (e) { o.LS = 'ERR'; } return o; })()`;
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);

// ── la personne test et le « voir comme » (même montage que equipe-droits-profonds : la fiche, jamais la fonction) ────────────────────────────────────────
async function monter(sans, terrain) {   // sans : { cat, x } | { sp } | null
  const c = await E.marc(PROFIL); const p = c.p;
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', 'Rémi'); await p.fill('#eq-n', 'Poulain'); await p.fill('#eq-m', 'remi@climservices17.fr');
  await p.evaluate(t => { const s = document.getElementById('eq-terrain'); if (s && !!s.checked !== !!t) s.click(); }, !!terrain); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c);
  const k = await p.evaluate(() => EQUIPE.find(q => q.prenom === 'Rémi').k);
  await p.evaluate(({ k }) => { for (const cat of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; }, { k });
  if (sans) {
    await E.fiche(c, k); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; document.querySelectorAll('#calque details.eq-dr-m').forEach(m => { m.open = true; }); });
    const sel = `#calque input[data-eqd="${k}|${sans.cat}|${sans.x}"]`;
    const la = await p.evaluate(s => [...document.querySelectorAll(s)].some(e => e.offsetParent !== null), sel);
    if (!la) throw new Error('la case ' + sans.cat + '.' + sans.x + ' n\'est pas affichée dans la fiche');
    await L.toucher(c, sel + ':visible'); await E.ranger(c);
    const ap = await p.evaluate(({ k, sans }) => eqDe(k).droits.cats[sans.cat][sans.x], { k, sans }); if (ap) throw new Error('la case ' + sans.cat + '.' + sans.x + ' est restée cochée');
  }
  await L.aller(p, 'equipe'); await p.evaluate(() => { fermerPanneau(); }); await p.evaluate(({ id }) => secuVoirComme(id), { id:k }); await L.calme(p, 900);
  const qui = await p.evaluate(() => acteur()); if (qui !== k) throw new Error('pas ouvert comme la personne : ' + qui);
  return { c, p, k };
}
const toastModule = p => p.evaluate(() => { const h = document.querySelector('#courrier-hote [data-opcourrier]') || document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const t = r && r.querySelector('#toast.show, #toast.on, .toast.show'); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
// un chemin : on rend à l'écran sa route, on prépare, on prend la photo des données, on joue, on reprend la photo. `jouer` rend false si le geste n'est pas proposé par ce chemin.
async function tenter(h, ch) {
  const p = h.p; await E.ranger(h.c); await L.aller(p, ch.route); if (ch.prep) await ch.prep(h);
  const avant = await p.evaluate(SNAP + ''); const r0 = await p.evaluate(() => DROITS_REFUS.length);
  let propose = false, err = ''; try { propose = await ch.jouer(h); } catch (e) { err = String(e.message || e).slice(0, 120); }
  await L.calme(p, 700);
  const toast = ((await E.toast(p)) || (await toastModule(p)) || '').slice(0, 140); const apres = await p.evaluate(SNAP + ''); const refus = (await p.evaluate(() => DROITS_REFUS.length)) - r0;
  return { propose:propose === true, note:typeof propose === 'string' ? propose : '', changed:diff(avant, apres), refus, toast, err };
}
// clic droit / appui long / touche Menu : le même événement quel que soit l'appareil
const droit = (p, sel, i) => p.evaluate(({ sel, i }) => { const e = [...document.querySelectorAll(sel)].filter(q => q.offsetParent !== null)[i || 0]; if (!e) return false; e.scrollIntoView({ block:'center' }); const r = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true, clientX:r.left + r.width / 2, clientY:r.top + Math.min(r.height / 2, 12), button:2 })); return true; }, { sel, i });
const menu = async (p, texte) => { const b = p.locator('.ctx button', { hasText:texte }).first(); if (!(await p.locator('.ctx button', { hasText:texte }).count())) return 'menu sans « ' + texte + ' » : ' + JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.replace(/\s+/g, ' ').trim()))); await b.click(); await L.calme(p, 300); return true; };
// ouvre le menu du clic droit sur le premier élément de `sel` dont le menu porte `texte` (certaines cartes n'ont pas « Annuler », certaines barres sont des demandes et pas des absences)
const menuSur = async (p, sel, texte) => { let vu = []; for (let i = 0; i < 12; i++) { if (!(await droit(p, sel, i))) return i === 0 ? 'aucun élément ' + sel : 'menu sans « ' + texte + ' » sur ' + i + ' éléments : ' + JSON.stringify(vu.slice(0, 1)); const n = await p.locator('.ctx button', { hasText:texte }).count(); if (n) { const m = await menu(p, texte); return m; } vu.push(await p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(e => e.textContent.replace(/\\s+/g, ' ').trim()))); await p.evaluate(() => fermerMenu()); } return 'menu sans « ' + texte + ' » sur 12 éléments'; };
const cliquer = async (p, sel, i) => { const ok = await p.evaluate(({ sel, i }) => { const e = [...document.querySelectorAll(sel)].filter(q => q.offsetParent !== null)[i || 0]; if (!e) return false; e.scrollIntoView({ block:'center' }); e.click(); return true; }, { sel, i }); await L.calme(p, 300); return ok; };

// ── les chemins de chaque case ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// un geste « forcé » : le bouton neuf que le menu du clic droit fabrique (aDeclencher), la console, une ancienne page gardée en cache — la garde de la page doit l'arrêter aussi
const forcer = (p, attrs) => p.evaluate(a => { const b = document.createElement('button'); b.type = 'button'; b.hidden = true; Object.entries(a).forEach(([k, x]) => b.setAttribute(k, x)); document.body.appendChild(b); try { b.click(); } finally { b.remove(); } return true; }, attrs);
const premier = (p, expr) => p.evaluate(expr);
// la Boîte mail est un module dans un shadow DOM : on attend ses lignes, on en choisit une
const attendreMail = async p => { await p.waitForFunction(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; return !!(r && r.querySelector('#rows .msg')); }, null, { timeout:9000 }).catch(() => {});
  // au téléphone le module n'affiche qu'un volet à la fois (liste OU lecture) et se souvient du dernier : on revient à la liste
  for (let i = 0; i < 3; i++) { const liste = await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const a = r && r.querySelector('[data-view]'); if (!a || a.getAttribute('data-view') === 'list') return true; const b = r.querySelector('#btnBack'); if (b && b.offsetParent !== null) { b.click(); return false; } return true; }); if (liste) break; await L.calme(p, 400); } };
const choisirMail = async (h, i) => { await attendreMail(h.p); try { await h.p.locator('#rows .msg').nth(i || 0).click({ timeout:6000 }); } catch (e) { const d = await h.p.evaluate(() => { const hh = document.querySelector('[data-opcourrier]'); const r = hh && hh.shadowRoot; const a = r && r.querySelector('[data-view]'); return JSON.stringify({ view:a && a.getAttribute('data-view'), compose:!!(r && r.querySelector('#cSheet')), overlay:!!(r && r.querySelector('#overlay')), route, hash:location.hash }); }); await h.p.screenshot({ path:'/tmp/echec-mail-' + PROFIL + '.png' }); throw new Error('message non cliquable : ' + d); } await L.calme(h.p, 400); };
const touche = async (p, k) => { await p.keyboard.press(k); await L.calme(p, 500); };
// si le message s'ouvre, on l'envoie pour de vrai (c'est le seul moyen de prouver qu'une écriture a eu lieu) ; sinon on dit qu'il ne s'est pas ouvert
const composeEtEnvoie = async p => { if (!(await p.locator('#cSub').count())) return 'la fenêtre de rédaction ne s\'ouvre pas'; await p.fill('#cTo', 'client@exemple.fr'); await p.keyboard.press('Enter'); await p.fill('#cSub', 'Essai de droits'); await p.fill('#cBody', 'Bonjour').catch(() => {}); await p.locator('#cSend').click(); await p.waitForTimeout(6500); await L.calme(p, 300); return true; };   // l'envoi a un délai d'annulation de 5 s : on l'attend, sinon il se termine pendant le chemin suivant
const dansMail = (p, sel, i) => p.evaluate(({ sel, i }) => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const e = r && [...r.querySelectorAll(sel)].filter(q => { const b = q.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.x > -1 && b.x < innerWidth; })[i || 0]; return !!e; }, { sel, i });   // « visible » : une boîte de taille non nulle ET dans la largeur de l'écran (le tiroir fermé du téléphone est dessiné à gauche, hors écran)
// le clic droit dans le module (menu du message) : un événement contextmenu sur la ligne
const menuMail = async (p, texte) => { const ok = await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; const e = r && r.querySelector('#rows .msg'); if (!e) return false; const b = e.getBoundingClientRect(); e.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true, composed:true, clientX:b.left + 40, clientY:b.top + 10, button:2 })); return true; }); if (!ok) return 'aucun message'; await L.calme(p, 400);
  const it = p.locator('[role=menuitem], .menu .mi, .mi', { hasText:texte }); const n = await it.count(); if (!n) return 'menu sans « ' + texte + ' » : ' + JSON.stringify(await p.evaluate(() => { const h = document.querySelector('[data-opcourrier]'); const r = h && h.shadowRoot; return r ? [...r.querySelectorAll('[role=menuitem]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()) : []; })); await it.first().click(); await L.calme(p, 500); return true; };
const CAS = [
  { c:'planif.s', cat:'planif', x:'s', chemins:[
    { n:'absence : menu du clic droit › « Supprimer l’absence »', fermeAttendu:true, route:'absences', prep: h => cliquer(h.p, '[data-aonglet="calendrier"]'), jouer: h => menuSur(h.p, '.ac-x[data-abs]', 'Supprimer l’absence') },
    { n:'absence : geste forcé (bouton data-asuppr fabriqué, comme le menu le fait)', route:'absences', jouer: async h => forcer(h.p, { 'data-asuppr': await premier(h.p, () => ABSENCES[0].id) }) },
    { n:'planning : clic droit sur une intervention › « Supprimer… » › « Oui, supprimer »', fermeAttendu:true, route:'planning', jouer: async h => { const m = await menuSur(h.p, '.pc[data-int]', 'Supprimer…'); if (m !== true) return m; return await cliquer(h.p, '#calque [data-planconf^="supprimer|"]') || 'la fenêtre « Supprimer cette intervention ? » s\'ouvre sans son bouton « Oui, supprimer »'; } },
    { n:'planning : clic droit sur une intervention › « Annuler l’intervention… » › « Oui, annuler »', fermeAttendu:true, route:'planning', jouer: async h => { const m = await menuSur(h.p, '.pc[data-int]', 'Annuler l’intervention'); if (m !== true) return m; return await cliquer(h.p, '#calque [data-planconf^="annuler|"]') || 'la fenêtre « Annuler cette intervention ? » s\'ouvre sans son bouton'; } },
    { n:'planning : geste forcé (data-planconf="supprimer|…")', route:'planning', jouer: async h => forcer(h.p, { 'data-planconf': 'supprimer|' + await premier(h.p, () => INTS[0].id) }) },
    { n:'planning : clic droit sur un créneau bloqué › « Supprimer »', fermeAttendu:true, route:'planning', jouer: async h => { if (!(await droit(h.p, '.pc[data-bur]'))) return 'aucun créneau bloqué'; return await menu(h.p, 'Supprimer'); } }
  ] },
  { c:'planif.c', cat:'planif', x:'c', chemins:[
    { n:'planning : clic droit sur un créneau bloqué › « Dupliquer le lendemain »', fermeAttendu:true, route:'planning', jouer: async h => { if (!(await droit(h.p, '.pc[data-bur]'))) return 'aucun créneau bloqué'; return await menu(h.p, 'Dupliquer le lendemain'); } }
  ] },
  { c:'crm.m', cat:'crm', x:'m', chemins:[
    { n:'devis : l’adresse tapée à l’envoi se range dans la fiche d’un client sans e-mail (appel direct de dvMailRanger, le chemin d’écran passe par dvEnvoyer) — muet par conception', muet:true, route:'devis', prep: h => h.p.evaluate(() => { CLIENTS.vp.mail = ''; }), jouer: h => h.p.evaluate(() => { dvMailRanger({ cli:'vp' }, 'nouvelle@exemple.fr'); return true; }) },
    { n:'fiche client (adresse directe) › Infos : changer le nom puis « Enregistrer »', route:'client-x-vp', prep: h => cliquer(h.p, '[data-oc="infos"]'), jouer: async h => { const ok = await h.p.evaluate(() => { const e = document.querySelector('[data-ci="nom"]'); return !!e && !e.disabled; }); if (!ok) return 'champs de la fiche grisés (« Tu peux regarder cette fiche »)'; await h.p.fill('[data-ci="nom"]', 'Nom changé par essai'); const b = await cliquer(h.p, '[data-action="clientEnreg"]'); return b || 'bouton « Enregistrer » absent'; } },
    { n:'liste Clients › ligne › fiche : changer le téléphone puis « Enregistrer »', route:'clients', jouer: async h => { if (!(await cliquer(h.p, '#contenu [data-go^="client-x-"]'))) return 'aucune ligne cliquable'; await cliquer(h.p, '[data-oc="infos"]'); const ok = await h.p.evaluate(() => { const e = document.querySelector('[data-ci="tel"]'); return !!e && !e.disabled; }); if (!ok) return 'champs de la fiche grisés'; await h.p.fill('[data-ci="tel"]', '06 11 22 33 44'); return await cliquer(h.p, '[data-action="clientEnreg"]') || 'bouton « Enregistrer » absent'; } },
    { n:'geste forcé : saisie injectée dans le champ grisé + bouton data-action="clientEnreg" fabriqué', route:'client-x-vp', prep: h => cliquer(h.p, '[data-oc="infos"]'), jouer: async h => { await h.p.evaluate(() => { const e = document.querySelector('[data-ci="nom"]'); if (e) e.value = 'Nom forcé'; }); return forcer(h.p, { 'data-action':'clientEnreg', 'data-cli':'vp' }); } },
    { n:'fiche client › Appareils › « Modifier » un appareil puis « Enregistrer »', route:'client-x-vp', prep: h => cliquer(h.p, '[data-oc="appareils"]'), jouer: async h => { if (!(await cliquer(h.p, '[data-action="clientAppForm"][data-n="0"]'))) return 'bouton « Modifier » de l’appareil non proposé (onglet en lecture)'; await h.p.fill('#app-nom', 'Appareil renommé par essai'); return (await cliquer(h.p, '#calque [data-action="clientAppEnreg"]')) || 'bouton « Enregistrer » absent'; } },
    { n:'geste forcé : enregistrer un appareil (data-action="clientAppEnreg" fabriqué, formulaire ouvert avant par la voie permise)', route:'client-x-vp', prep: h => cliquer(h.p, '[data-oc="appareils"]'), jouer: async h => { const k = await premier(h.p, () => param); await h.p.evaluate(() => { ouvrirPanneau('<input id="app-nom" value="Forcé"><input id="app-det" value="forcé">'); }); return forcer(h.p, { 'data-action':'clientAppEnreg', 'data-cli':k, 'data-n':'0' }); } },
    { n:'geste forcé depuis un AUTRE écran (Devis) : data-action="clientEnreg" avec des champs de fiche fabriqués — c\'est l\'étiquette « @crm » de la table qui décide, pas l\'écran ouvert', route:'devis', jouer: async h => { await h.p.evaluate(() => { const d = document.createElement('div'); d.id = 'faux-ci'; d.hidden = true; d.innerHTML = '<input data-ci="nom" value="Nom depuis le devis"><input data-ci="contact" value="Contact"><input data-ci="tel" value="06 11 22 33 44"><input data-ci="mail" value="x@exemple.fr"><input data-ci="type" value="pro"><input data-ci="adr" value="1 rue des Essais 17000 La Rochelle"><input data-ci="acces" value="">'; document.body.appendChild(d); }); try { return await forcer(h.p, { 'data-action':'clientEnreg', 'data-cli':'vp' }); } finally { await h.p.evaluate(() => { const d = document.getElementById('faux-ci'); if (d) d.remove(); }); } } },
    { n:'geste forcé : retirer un appareil du client (data-action="clientAppSupprOk")', route:'client-x-vp', jouer: async h => { const k = await premier(h.p, () => Object.keys(CLIENTS).find(x => (CLIENTS[x].appareils || []).length)); return forcer(h.p, { 'data-action':'clientAppSupprOk', 'data-cli':k, 'data-n':'0' }); } }
  ] },
  { c:'achats.s', cat:'achats', x:'s', chemins:[
    { n:'geste forcé : data-axa="demannul|…" fabriqué', route:'achats', prep: async h => { await h.p.evaluate(k => { DEM_ACHAT.unshift({ id:'dz1', qui:k, d:'2026-10-31', h:'09:00', quoi:'Rouleau de gaine', q:2, u:'u', pourquoi:'essai', est:40, quand:null, etat:'attente' }); rendre(); }, h.k); }, jouer: h => forcer(h.p, { 'data-axa':'demannul|dz1' }) },
    { n:'geste forcé : data-rl="ndfsuppr|…" fabriqué', route:'achats', prep: async h => { await h.p.evaluate(k => { NDF.unshift({ id:'nz1', qui:k, d:'2026-10-31', objet:'Péage essai', ttc:8.2, tva:20, recu:true, etat:'attente' }); rendre(); }, h.k); }, jouer: h => forcer(h.p, { 'data-rl':'ndfsuppr|nz1' }) }
  ] },
  { c:'achats.s·terrain', cat:'achats', x:'s', terrain:true, chemins:[
    { n:'Mes frais (adresse directe) : « Annuler la demande » d’achat', route:'techfrais', prep: async h => { await h.p.evaluate(k => { DEM_ACHAT.unshift({ id:'dz1', qui:k, d:'2026-10-31', h:'09:00', quoi:'Rouleau de gaine', q:2, u:'u', pourquoi:'essai', est:40, quand:null, etat:'attente' }); NDF.unshift({ id:'nz1', qui:k, d:'2026-10-31', objet:'Péage essai', ttc:8.2, tva:20, recu:true, etat:'attente' }); rendre(); }, h.k); await L.calme(h.p, 400); }, jouer: async h => (await cliquer(h.p, '[data-axa^="demannul|dz1"]')) || 'bouton « Annuler la demande » non proposé' },
    { n:'Mes frais (adresse directe) : « Modifier » la note › « Supprimer cette note »', route:'techfrais', prep: async h => { await h.p.evaluate(k => { NDF.unshift({ id:'nz1', qui:k, d:'2026-10-31', objet:'Péage essai', ttc:8.2, tva:20, recu:true, etat:'attente' }); rendre(); }, h.k); await L.calme(h.p, 400); }, jouer: async h => { if (!(await cliquer(h.p, '[data-rl^="ndfmod|nz1"]'))) return 'bouton « Modifier » absent'; return (await cliquer(h.p, '#calque [data-rl^="ndfsuppr|nz1"]')) || 'bouton « Supprimer cette note » non proposé dans la fenêtre'; } },
    { n:'(terrain) geste forcé : data-axa="demannul|…" fabriqué', route:'achats', prep: async h => { await h.p.evaluate(k => { DEM_ACHAT.unshift({ id:'dz1', qui:k, d:'2026-10-31', h:'09:00', quoi:'Rouleau de gaine', q:2, u:'u', pourquoi:'essai', est:40, quand:null, etat:'attente' }); rendre(); }, h.k); }, jouer: h => forcer(h.p, { 'data-axa':'demannul|dz1' }) },
    { n:'(terrain) geste forcé : data-rl="ndfsuppr|…" fabriqué', route:'achats', prep: async h => { await h.p.evaluate(k => { NDF.unshift({ id:'nz1', qui:k, d:'2026-10-31', objet:'Péage essai', ttc:8.2, tva:20, recu:true, etat:'attente' }); rendre(); }, h.k); }, jouer: h => forcer(h.p, { 'data-rl':'ndfsuppr|nz1' }) }
  ] },
  { c:'com.c', cat:'com', x:'c', chemins:[
    { n:'Boîte mail : touche « C » (nouveau message) puis envoi', route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { await touche(h.p, 'c'); return await composeEtEnvoie(h.p); } },
    { n:'Boîte mail : barre de lecture › « Transférer » puis envoi', fermeAttendu:true, route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { if (!(await dansMail(h.p, '[data-act="forward"]'))) { // au téléphone, « Transférer » est dans le menu « Répondre ▾ »
        if (await dansMail(h.p, '[data-act="replyMenu"]')) { await h.p.locator('[data-act="replyMenu"]:visible').first().click(); await L.calme(h.p, 400); const it = h.p.locator('[role=menuitem]', { hasText:'Transférer' }); if (await it.count()) { await it.first().click(); await L.calme(h.p, 500); return await composeEtEnvoie(h.p); } } return 'bouton « Transférer » non proposé'; }
      await h.p.locator('[data-act="forward"]:visible').first().click(); await L.calme(h.p, 500); return await composeEtEnvoie(h.p); } },
    { n:'Boîte mail : clic droit sur un message › sélection de plusieurs › « Transférer » puis envoi', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { const m = await menuMail(h.p, 'Sélectionner plusieurs'); if (m !== true) return m; if (!(await dansMail(h.p, '[data-multi="forward"]'))) return 'bouton « Transférer » de la sélection non proposé'; await h.p.locator('[data-multi="forward"]:visible').first().click(); await L.calme(h.p, 500); return await composeEtEnvoie(h.p); } },
    { n:'geste forcé : bouton « ＋ Écrire » de l’hôte (data-mbx-ecrire) fabriqué, puis envoi', route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { await forcer(h.p, { 'data-mbx-ecrire':'1' }); await L.calme(h.p, 600); return await composeEtEnvoie(h.p); } },
    { n:'Boîte mail : « Ajouter une boîte » (data-addaccount) : la fenêtre de connexion s’ouvre (rien n’est écrit tant qu’on ne l’a pas remplie)', ouvertureSeule:true, fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { if (!(await dansMail(h.p, '[data-addaccount]')) && (await dansMail(h.p, '#btnNav'))) { await h.p.locator('#btnNav:visible').first().click(); await L.calme(h.p, 500); }   // au téléphone la liste des boîtes est dans le tiroir
      if (!(await dansMail(h.p, '[data-addaccount]'))) return 'bouton « Ajouter une boîte » non proposé'; await h.p.locator('[data-addaccount]:visible').first().click(); await L.calme(h.p, 500); return (await h.p.locator('#aMail').count()) ? true : 'la fenêtre de connexion d\'une boîte ne s\'ouvre pas'; } }
  ] },
  { c:'com.m', cat:'com', x:'m', chemins:[
    { n:'Boîte mail : touche « F » (drapeau)', route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { await touche(h.p, 'f'); return true; } },
    { n:'Boîte mail : touche « E » (archiver)', route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { await touche(h.p, 'e'); return true; } },
    { n:'Boîte mail : clic droit › « Marquer comme lu / non lu »', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => await menuMail(h.p, 'Marquer comme') },
    { n:'Boîte mail : clic droit › « Répondre » puis envoi (répondre est un geste de la case Modifier)', route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { const m = await menuMail(h.p, 'Répondre'); if (m !== true) return m; return await composeEtEnvoie(h.p); } },
    { n:'Boîte mail : clic droit › « Marquer d’un drapeau »', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => await menuMail(h.p, 'Marquer d’un drapeau') },
    { n:'Boîte mail : sélection de plusieurs messages › « Archiver »', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { const m = await menuMail(h.p, 'Sélectionner plusieurs'); if (m !== true) return m; if (!(await dansMail(h.p, '[data-multi="archive"]'))) return 'bouton « Archiver » de la sélection non proposé'; await h.p.locator('[data-multi="archive"]:visible').first().click(); await L.calme(h.p, 500); return true; } }
  ] },
  { c:'com.s', cat:'com', x:'s', chemins:[
    { n:'Boîte mail : touche « # » (supprimer)', route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { await touche(h.p, '#'); return true; } },
    { n:'Boîte mail : touche « Suppr » (supprimer)', route:'boiteMail', prep: h => choisirMail(h, 0), jouer: async h => { await touche(h.p, 'Delete'); return true; } },
    { n:'Boîte mail : clic droit › « Supprimer »', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => await menuMail(h.p, 'Supprimer') },
    { n:'Boîte mail : sélection de plusieurs messages › « Supprimer »', fermeAttendu:true, route:'boiteMail', prep: h => attendreMail(h.p), jouer: async h => { const m = await menuMail(h.p, 'Sélectionner plusieurs'); if (m !== true) return m; if (!(await dansMail(h.p, '[data-multi="trash"]'))) return 'bouton « Supprimer » de la sélection non proposé'; await h.p.locator('[data-multi="trash"]:visible').first().click(); await L.calme(h.p, 500); return true; } },
    { n:'geste forcé : bouton data-mbx="decook" (retirer une boîte connectée)', route:'boiteMail', jouer: h => forcer(h.p, { 'data-mbx':'decook|b2' }) }
  ] }
];
// ── l'exécution ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
(async () => {
  const sortie = [];
  for (const cas of CAS) {
    if (FILTRE.length && !FILTRE.includes(cas.c)) continue;
    const res = { cas:cas.c, profil:PROFIL, chemins:[] };
    // une session SANS la case, une AVEC : chaque chemin y est joué à son tour
    const sans = await monter({ cat:cas.cat, x:cas.x }, cas.terrain), avec = await monter(null, cas.terrain); const dr = { sans:{}, avec:{} };
    for (const ch of cas.chemins) { dr.sans[ch.n] = await tenter(sans, ch); dr.avec[ch.n] = await tenter(avec, ch); }
    for (const ch of cas.chemins) { const s = dr.sans[ch.n], a = dr.avec[ch.n];
      res.chemins.push({ chemin:ch.n, sans:s, avec:a });
      const T = (s.toast || '').slice(0, 70);
      if (!s.propose) { v(`${cas.c} · ${ch.n} : SANS la case, le chemin n'est pas proposé (${(s.note || '').slice(0, 110)}) et rien n'a bougé`, s.changed.length === 0 && !s.err && !/^aucun/.test(s.note || '') && !/s'ouvre sans/.test(s.note || ''), s);   // « la fenêtre s'ouvre sans son bouton » = un geste proposé puis refusé en silence : défaut, pas « chemin fermé »
        v(`${cas.c} · ${ch.n} : AVEC la case, le même chemin existe et écrit (contre-épreuve : le chemin fermé sans la case était bien un geste)`, a.propose && (ch.ouvertureSeule || a.changed.length >= 1) && a.refus === 0, a); continue; }
      if (ch.fermeAttendu) v(`${cas.c} · ${ch.n} : SANS la case, ce chemin est FERMÉ (l'entrée ou le bouton n'est pas proposé ; un geste proposé puis refusé est un défaut d'affichage)`, false, s);
      v(`${cas.c} · ${ch.n} : SANS la case, rien n'est écrit (${s.changed.join(',') || 'aucune donnée'})`, s.changed.length === 0 && !s.err, s);
      if (!ch.muet) v(`${cas.c} · ${ch.n} : SANS la case, le refus est DIT à l'écran (« ${T} »)`, /pas ouvert à ton compte|Demande à/.test(s.toast) || s.refus >= 1, s);
      v(`${cas.c} · ${ch.n} : AVEC la case, le même chemin écrit vraiment (contre-épreuve)`, a.propose && a.changed.length >= 1 && a.refus === 0, a); }
    sortie.push(res); await L.fin(sans.c); await L.fin(avec.c);
  }
  if (SORTIE) fs.writeFileSync(SORTIE, JSON.stringify(sortie, null, 1));
  console.log('RESUME ' + JSON.stringify(sortie.map(r => ({ cas:r.cas, chemins:r.chemins.map(x => ({ n:x.chemin, propose:x.sans.propose, sansChange:x.sans.changed, sansRefus:x.sans.refus, sansToast:x.sans.toast, avecChange:x.avec.changed, avecPropose:x.avec.propose })) })), null, 1));
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e.message, String(e.stack).split('\n').slice(0, 4).join(' | ')); process.exit(2); });
