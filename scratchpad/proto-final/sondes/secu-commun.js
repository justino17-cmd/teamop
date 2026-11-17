// Outils communs des sondes de la double authentification « OP Security » (voie double-auth, étape 2, 17 novembre 2026).
// ⛔ Tout se passe sur 127.0.0.1, entreprise fictive, aucun serveur : le téléphone est SIMULÉ dans la page (#opsec).
// Les sondes entrent par l'écran de connexion (qui:null) pour jouer le vrai parcours ; `?auto=` ne sert qu'aux autres voies.
const L = require('../lib.js');
exports.L = L;
exports.ID = { marc:'marc', julie:'julie', sm:'sophie', kb:'karim', lr:'lea', tl:'tom' };
// ouvre la page sur l'écran de connexion (le lancement dure 4,4 s) ; calme = mouvement réduit
exports.ouvrir = async opt => { opt = opt || {};
  // l'appareil est déjà relié à l'entreprise (le lien de connexion a été ouvert) : sans ça, l'écran « Bienvenue » demande le lien
  const lie = opt.lien === false ? '' : "try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}";
  // le typographe de la page met des espaces insécables avant « : » et « ? » : les sondes lisent le texte avec des espaces ordinaires (lecture seule, aucune écriture n'est changée)
  const norm = "try{const d=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');Object.defineProperty(Node.prototype,'textContent',{get(){const t=d.get.call(this);return typeof t==='string'?t.replace(/[\\u00a0\\u202f]/g,' '):t},set(v){d.set.call(this,v)},configurable:true})}catch(e){}";
  const c = await L.ouvrir({ qui:null, attente:500, ...opt, init:lie + norm + (opt.init || '') });
  if (opt.lien === false) return c;
  const ok = await L.attendre(c.p, () => !!document.getElementById('cn-id') && !!document.getElementById('opsec'), 20000); if (!ok) throw new Error('l’écran de connexion ne s’est pas ouvert'); await c.p.waitForTimeout(700); return c; };
// attend un élément visible de l'écran de l'ordinateur (#cnx) ou de la page
exports.attendreSel = (c, sel, ms) => c.p.waitForSelector(sel, { state:'visible', timeout:ms || 8000 }).then(() => true, () => false);
// le mot de passe provisoire ou choisi de départ d'une personne : lu dans le bloc « Démonstration » (le SEUL endroit où il s'affiche)
exports.provisoire = (c, k) => c.p.evaluate(id => { const e = document.querySelector('[data-sec-prov="' + id + '"]'); return e ? e.textContent.trim() : null; }, exports.ID[k]);
// « Se connecter » : identifiant + mot de passe
exports.connecter = async (c, k, mdp) => { const id = typeof k === 'string' && exports.ID[k] ? exports.ID[k] : k;
  await c.p.fill('#cn-id', id); await c.p.fill('#cn-mdp', mdp); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(900); };
// le texte du message d'erreur de la carte
exports.erreur = async c => { await c.p.waitForTimeout(150); /* cnxDire écrit à la trame suivante */ return c.p.evaluate(() => ((document.getElementById('cn-err') || {}).textContent || '').replace(/[\u00a0\u202f]/g, ' ')); };
// le nombre affiché sur l'écran de l'ordinateur
exports.lireNombre = async c => { await exports.attendreSel(c, '[data-sec="nombre"]', 8000); return c.p.evaluate(() => (document.querySelector('[data-sec="nombre"]') || {}).textContent.trim()); };
// ouvre le téléphone (pastille en vue étroite, bouton rond en vue large) et choisit la personne
exports.telephone = async (c, k) => { await c.p.evaluate(k => { SECU.telCourant = k; if (!document.getElementById('opsec').hasAttribute('data-ouvert')) opsOuvrir(); opsDessiner(true); }, k); await c.p.waitForTimeout(250); };
exports.fermerTel = async c => { await c.p.evaluate(() => opsFermer()); await c.p.waitForTimeout(250); };
// tape un PIN sur le pavé (clics réels sur les touches)
exports.pin = async (c, code) => { for (const d of String(code)) { await c.p.evaluate(d => { const b = document.querySelector('#opsec [data-ops="pin-touche"][data-k="' + d + '"]'); b.click(); }, d); } await c.p.waitForTimeout(200); };
exports.deverrouiller = async (c, k, pin) => { await exports.telephone(c, k); const v = await c.p.evaluate(() => !!document.querySelector('#opsec .ops-barre')); if (v) return true; await exports.pin(c, pin || '246802'); return c.p.evaluate(() => !!document.querySelector('#opsec .ops-barre')); };
// tape le nombre sur le téléphone de la personne et touche « Approuver »
exports.approuver = async (c, k, nombre, pin) => { await exports.deverrouiller(c, k, pin);
  await c.p.evaluate(n => { const i = document.querySelector('#opsec [data-ops="nombre-champ"]'); i.value = n; i.dispatchEvent(new Event('input', { bubbles:true })); document.querySelector('#opsec [data-ops="approuver"]').click(); }, String(nombre)); await c.p.waitForTimeout(300); };
// les cartes de demande que le téléphone montre (jamais le nombre)
exports.cartes = c => c.p.evaluate(() => [...document.querySelectorAll('#opsec .ops-carte')].map(e => ({ titre:(e.querySelector('h2') || {}).textContent || '', texte:e.textContent.replace(/\s+/g, ' ').trim(), rouge:e.classList.contains('rouge') })));
// attend que l'application soit ouverte (session posée, écran de connexion parti)
exports.attendreApp = async (c, ms, garderGuide) => { const ok = await L.attendre(c.p, () => !!SESSION && !document.getElementById('cnx'), ms || 12000); await c.p.waitForTimeout(500);
  if (!garderGuide) { await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.waitForTimeout(250); } return ok; };
// fait avancer l'horloge de démonstration
exports.avancer = async (c, minutes) => { await c.p.evaluate(m => { SECU.decalage += m * 60000; secuTic(); }, minutes); await c.p.waitForTimeout(300); };
// une personne complète : connexion, activation du téléphone (PIN), code de vérification, mot de passe personnel → l'application s'ouvre
exports.activer = async (c, k, o) => { o = o || {}; const mdp = await exports.provisoire(c, k), pin = o.pin || '135792', perso = o.mdp || ('Cheval-agrafe-batterie-' + k + '-2026');
  await exports.connecter(c, k, mdp);
  if (!await exports.attendreSel(c, '#cn-form-activer', 8000)) throw new Error('écran d’activation absent pour ' + k);
  await exports.telephone(c, k);
  await c.p.evaluate(() => document.querySelector('#opsec [data-ops="commencer"]').click()); await exports.pin(c, pin); await exports.pin(c, pin);
  if (o.saisie) { await c.p.evaluate(() => document.querySelector('#opsec [data-ops="saisir-code"]').click()); const code = await c.p.evaluate(() => document.querySelector('[data-sec="code-activation"]').textContent.trim());
    await c.p.evaluate(({ code, nom }) => { const f = document.querySelector('#opsec [data-ops="form-activation"]'); f.querySelector('[data-ops="code-champ"]').value = code; if (nom) f.querySelector('[data-ops="nom-champ"]').value = nom; f.requestSubmit(); }, { code, nom:o.nom }); }
  else await c.p.evaluate(() => document.querySelector('#opsec [data-ops="scanner"]').click());
  await L.attendre(c.p, kk => !!document.querySelector('#opsec [data-ops="code6"]') || (SECU.comptes[kk] && SECU.comptes[kk].tel), 5000, k); await c.p.waitForTimeout(1000);
  await exports.fermerTel(c); await c.p.click('#cn-form-activer button[type=submit]'); if (!await exports.attendreSel(c, '#cn-form-verifier', 6000)) throw new Error('écran B absent');
  const code6 = await c.p.evaluate(k => { const c = SECU.comptes[k]; return secuTotp(c.tel.cle, secuMaint()); }, k);
  await c.p.fill('#cn-code6', code6); await c.p.click('#cn-form-verifier button[type=submit]'); if (!await exports.attendreSel(c, '#cn-form-premier', 6000)) throw new Error('écran C absent');
  await c.p.fill('#cn-n1', perso); await c.p.fill('#cn-n2', perso); await c.p.click('#cn-form-premier button[type=submit]'); await exports.attendreApp(c, 15000, o.guide); return { mdp:perso, pin }; };
// une connexion de tous les jours : identifiant + mot de passe, nombre lu sur l'écran, tapé sur le téléphone
exports.jour = async (c, k, mdp, pin) => { await exports.connecter(c, k, mdp); const n = await exports.lireNombre(c); await exports.approuver(c, k, n, pin); await exports.attendreApp(c, 15000); return n; };
// fouille de tout rangement : localStorage, sessionStorage, cookies, window.name, adresse, noms d'IndexedDB (rend un texte à chercher)
exports.rangement = async c => { const base = await c.p.evaluate(async () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) o.push('L:' + localStorage.key(i) + '=' + localStorage.getItem(localStorage.key(i))); } catch (e) {}
  try { for (let i = 0; i < sessionStorage.length; i++) o.push('S:' + sessionStorage.key(i) + '=' + sessionStorage.getItem(sessionStorage.key(i))); } catch (e) {}
  o.push('C:' + document.cookie); o.push('N:' + window.name); o.push('U:' + location.href); try { const l = indexedDB.databases ? await indexedDB.databases() : []; l.forEach(d => o.push('I:' + d.name)); } catch (e) {} return o.join('\n'); }); return base; };
exports.etatAvant = c => c.p.evaluate(() => ({ contenu:(document.getElementById('contenu') || {}).innerHTML ? document.getElementById('contenu').innerHTML.length : 0, calque:(document.getElementById('calque') || {}).innerHTML ? document.getElementById('calque').innerHTML.length : 0, journal:typeof JOURNAL !== 'undefined' ? JOURNAL.length : -1, ent:typeof ENTREPRISE !== 'undefined' ? JSON.stringify(ENTREPRISE).length : 0 }));
