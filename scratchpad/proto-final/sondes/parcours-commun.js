// Outils communs des sondes « UNE SEMAINE DE L'ENTREPRISE » (17 novembre 2026) : les parcours qui passent la main d'un rôle à l'autre
// DANS LA MÊME PAGE (les données du prototype vivent dans la page : on ne recharge jamais entre deux rôles).
// ⛔ 127.0.0.1 seulement, entreprise fictive « Clim Services 17 », aucun serveur. Chaque contrôle prouve d'abord sa population.
// Les contrôles « (donnée) » relisent le tableau de la page ; les contrôles « (écran) » relisent ce que la personne LIT. Les deux doivent s'accorder.
const fs = require('fs'), path = require('path');
const L = require('../lib.js'), v = L.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/parcours';
fs.mkdirSync(CAP, { recursive: true });
const INIT = 'window.R=()=>{const e=document.querySelector("#courrier-hote [data-opcourrier]");return e?e.shadowRoot:null};';
exports.L = L; exports.v = v; exports.CAP = CAP; exports.INIT = INIT;
const PROFIL = process.env.PROFIL || 'mac';
exports.PROFIL = PROFIL;
exports.NUIT = process.env.NUIT === '1';
exports.S = (c, f, a) => c.p.evaluate(f, a);
exports.cap = async (c, nom) => { try { await L.capture(c, path.join(CAP, nom + '.png')); } catch (e) { console.log('  · capture ratée ' + nom + ' : ' + e.message); } };
exports.cents = L.cents;
// l'argent se recalcule à la main, au centime : ttc(ht, tva%) en centimes entiers
exports.ttc = (ht, tva) => Math.round(Math.round(ht * 100) * (1 + tva / 100));
// démarrer : le prototype en mode application, ouvert comme `qui` (gérant par défaut)
exports.demarrer = async (o) => { const c = await L.ouvrir(Object.assign({ profil:PROFIL, qui:'marc', attente:1400, init:INIT, nuit:exports.NUIT }, o || {}));
  /* la double authentification : toute ouverture de session (les parcours appellent sessionOuvrir directement, pas seulement passer()) voile la banque tant que le téléphone n'a pas confirmé. La sonde n'est pas là pour jouer le téléphone :
     elle pose la confirmation sur chaque session qu'elle ouvre (échéance lointaine). Le téléphone lui-même est joué par les sondes de la voie double-auth. */
  await c.p.evaluate(() => { const o = sessionOuvrir; window.sessionOuvrir = function (k) { const r = o.apply(this, arguments); try { SECU.confirmeA[k] = secuMaint() + 1e12; } catch (e) {} return r; }; });
  return c; };
// passer la main : la personne se déconnecte, l'autre se connecte (même page, mêmes données) ; rend { ROLE, route, SESSION }
exports.passer = async (c, k, vers) => {
  /* depuis la double authentification, se déconnecter remet SECU.auto à faux : la banque de la Comptabilité se voile (« confirme sur ton téléphone ») pour la personne qui revient. La sonde n'est pas là pour jouer le téléphone :
     elle pose la confirmation valable pour la session qu'elle ouvre (une échéance lointaine, la fenêtre de 5 minutes ne tombe pas au milieu d'un parcours). Le test de la confirmation vit dans les sondes de la voie double-auth. */
  const ok = await c.p.evaluate(k => { try { sessionFermer('deconnexion'); } catch (e) {} const r = sessionOuvrir(k); try { SECU.confirmeA[k] = secuMaint() + 1e12; } catch (e) {} return r; }, k);
  await L.calme(c.p, 700);
  const e = await c.p.evaluate(() => ({ ROLE, route, SESSION, cnx:!!document.getElementById('cnx') }));
  if (vers) await L.aller(c.p, vers);
  return Object.assign({ ok }, e);
};
exports.txt = (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? (e.innerText || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; }, sel);
exports.net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
exports.clic = async (c, sel, opt) => { const ok = await L.toucher(c, sel, opt); if (!ok) console.log('   (pas atteint : ' + sel + ')'); return ok; };
// une section : une exception ne doit pas arrêter les autres, elle tombe comme un contrôle
exports.sec = async (nom, f) => { try { await f(); } catch (e) { v('SECTION ' + nom + ' : aucune exception', false, String(e && e.message || e).slice(0, 300) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } };
// signer au doigt / à la souris : un vrai tracé dans le canvas (la signature naît des événements de pointeur)
exports.signer = async (c, sel) => { await c.p.evaluate(s => document.querySelector(s).scrollIntoView({ block:'center' }), sel); await L.calme(c.p, 300);
  const bb = await c.p.locator(sel).first().boundingBox(); if (!bb) return false;
  const x = bb.x, y = bb.y, w = bb.width, h = bb.height;
  // le tracé doit TOUCHER le canvas : si une barre fixe le recouvre, c'est un défaut de l'écran, pas de la sonde
  const touche = await c.p.evaluate(([s, px, py]) => { const e = document.elementFromPoint(px, py); return !!e && (e === document.querySelector(s)); }, [sel, x + w * .5, y + h * .5]);
  if (!touche) return false;
  await c.p.mouse.move(x + w * .2, y + h * .6); await c.p.mouse.down(); for (let k = 0; k <= 8; k++) await c.p.mouse.move(x + w * (.2 + k * .07), y + h * (.35 + (k % 2) * .3)); await c.p.mouse.up(); await L.calme(c.p, 300); return true; };
// une petite image PNG pour les « photos » du terrain
exports.PNG = path.join(CAP, 'photo-test.png');
if (!fs.existsSync(exports.PNG)) fs.writeFileSync(exports.PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
// toucher dans un CADRE (l'atelier) : au doigt sur téléphone et tablette, à la souris sur ordinateur
exports.cl = async (c, f, sel) => { const l = f.locator(sel).first(); try { if (c.doigt) await l.tap({ timeout:8000 }); else await l.click({ timeout:8000 }); } catch (e) { console.log('   (cadre : geste non atteint : ' + sel + ')'); throw e; } await c.p.waitForTimeout(250); };
exports.fermer = async () => { await L.fermer(); const ko = L.bilan(); return ko; };
