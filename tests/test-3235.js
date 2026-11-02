/* ⛔ L'EMPLOYÉ QUI SE CONNECTE SUR L'APPAREIL DU PATRON ARRIVE SUR SON PROPRE PROFIL — 2 novembre 2026.
 * Un client de Justin : « ça envoie l'utilisateur sur le même profil que moi ». Reproduit sur le jumeau (scripts/controle) : sur un
 * appareil où le patron reste connecté (elan_session), l'employé tape SES identifiants dans connexion.html, qui range un jeton
 * elan_cnx_auto puis ouvre app.html — et boot() rouvrait la session du patron avant que l'écran de connexion lise le jeton.
 * Ce banc EXÉCUTE les vraies tranches d'app.html (boot : le choix de la session ; cnxAutoEnAttente ; cnxAutoTenter) :
 *   § 1  jeton frais d'un AUTRE compte → l'ancienne session est fermée, on passe par l'écran de connexion ;
 *   § 2  jeton du MÊME compte, jeton périmé, pas de jeton → la session reprend comme avant ;
 *   § 3  cnxAutoTenter sans « rester connecté » retire la session d'un autre compte restée dans localStorage
 *        (getSession() lit localStorage d'abord : au rechargement, le patron reprenait la main).
 */
'use strict';
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (nom, c) => { if (c) { ok++; console.log('  ✓ ' + nom); } else { ko++; console.log('  ✗ ' + nom); } };

const fonction = nom => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return '';
  let j = SRC.indexOf('{', i), d = 0; for (let k = j; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && !--d) return SRC.slice(i, k + 1); } return ''; };
const iDeb = SRC.indexOf("  let u=db.users.find(x=>x.id===getSession()&&x.actif);");
const iFin = SRC.indexOf("  if(u){ _cnxVia='session'; enterApp(u); }", iDeb);
v('la tranche de boot() qui choisit la session est trouvée', iDeb > 0 && iFin > iDeb);
const TRANCHE = SRC.slice(iDeb, iFin) + "  if(u){ _cnxVia='session'; enterApp(u); } else renderLogin();";
const AUTO = fonction('cnxAutoEnAttente'), TENTER = fonction('cnxAutoTenter'), GETS = fonction('getSession');
v('cnxAutoEnAttente, cnxAutoTenter et getSession sont trouvées', !!(AUTO && TENTER && GETS));

const stock = init => { const m = new Map(Object.entries(init || {})); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, x) => m.set(k, String(x)), removeItem: k => m.delete(k), _m: m }; };
const H = 'a'.repeat(64);
const USERS = [{ id: 'patron', login: 'camille', actif: true, pwdHash: 'b'.repeat(64) }, { id: 'emp', login: 'marc.employe', actif: true, pwdHash: H }];

function boot({ session, jeton }) {
  const localStorage = stock(session ? { elan_session: session } : {}), sessionStorage = stock(jeton ? { elan_cnx_auto: JSON.stringify(jeton) } : {});
  const trace = { entre: null, login: false };
  const f = new Function('localStorage', 'sessionStorage', 'db', 'enterApp', 'renderLogin',
    GETS + AUTO + 'let _cnxVia="";' + TRANCHE);
  f(localStorage, sessionStorage, { users: USERS }, u => { trace.entre = u.id; }, () => { trace.login = true; });
  return { trace, ls: localStorage, ss: sessionStorage };
}
const frais = login => ({ login, h: H, rester: false, ts: Date.now() });

/* § 1 */
let r = boot({ session: 'patron', jeton: frais('marc.employe') });
v('§1 patron connecté + identifiants de l\'employé : la session du patron n\'est PAS rouverte', r.trace.entre === null && r.trace.login === true);
v('§1 … et elle est fermée (ni localStorage ni sessionStorage)', r.ls.getItem('elan_session') === null && r.ss.getItem('elan_session') === null);
v('§1 … le jeton reste pour l\'écran de connexion', !!r.ss.getItem('elan_cnx_auto'));
r = boot({ session: 'patron', jeton: frais('MARC.EMPLOYE') });
v('§1 l\'identifiant se compare sans la casse (connexion.html le garde tel que tapé)', r.trace.entre === null);

/* § 2 */
r = boot({ session: 'patron', jeton: frais('camille') });
v('§2 le patron retape SES identifiants : sa session reprend, rien ne change', r.trace.entre === 'patron');
r = boot({ session: 'patron', jeton: Object.assign(frais('marc.employe'), { ts: Date.now() - 300000 }) });
v('§2 un jeton périmé (5 min) ne ferme rien', r.trace.entre === 'patron');
r = boot({ session: 'patron', jeton: null });
v('§2 sans jeton, la session reprend comme avant', r.trace.entre === 'patron');
r = boot({ session: null, jeton: frais('marc.employe') });
v('§2 sans session, l\'écran de connexion (comme avant)', r.trace.login === true && r.trace.entre === null);

/* § 3 — la vraie cnxAutoTenter, jusqu'à l'entrée */
(async () => {
  async function tenter(rester) {
    const localStorage = stock({ elan_session: 'patron' }), sessionStorage = stock({ elan_cnx_auto: JSON.stringify(Object.assign(frais('marc.employe'), { rester })) });
    let entre = null;
    const f = new Function('localStorage', 'sessionStorage', 'db', 'enterApp', 'syncAttendre', 'syncEnabled', 'syncInit', 'toast', 'document', 'setTimeout',
      'let _syncOn=true,_syncDemarre=true,_cnxVia="";function cnxAutoRevele(){}async ' + TENTER + ';return cnxAutoTenter();');
    await f(localStorage, sessionStorage, { users: USERS }, u => { entre = u.id; }, async () => {}, () => true, () => {}, () => {}, { getElementById: () => null }, () => 0);
    return { entre, ls: localStorage.getItem('elan_session'), ss: sessionStorage.getItem('elan_session') };
  }
  let t = await tenter(false);
  v('§3 sans « rester connecté » : l\'employé entre', t.entre === 'emp' && t.ss === 'emp');
  v('§3 … et la session du patron ne reste pas dans localStorage (le rechargement ne le ramène pas au patron)', t.ls === null);
  t = await tenter(true);
  v('§3 avec « rester connecté » : sa session à lui est gardée', t.entre === 'emp' && t.ls === 'emp');
  console.log(`════ test-3235 : ${ok} ✓ ${ko} ✗ ════`); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception ' + (e && e.stack || e)); console.log(`════ test-3235 : ${ok} ✓ ${ko + 1} ✗ ════`); process.exit(1); });
