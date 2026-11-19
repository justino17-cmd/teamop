// Angle « ponts » · sonde 1 : TOUT ce que le prototype range sur l'appareil (localStorage, sessionStorage, IndexedDB, cookies, window.name, adresse),
// avant et après « Se déconnecter », et ce que la personne SUIVANTE (une autre, du même appareil) y retrouve.
// Chaque contrôle compte sa population d'abord (une absence sur un rangement vide ne prouve rien).
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const SENSIBLE = [ ['iban', /FR\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}/i], ['mot de passe', /(mdp|motdepasse|password|passwd)\s*["':=]/i], ['courriel', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i], ['téléphone', /(?:\+33|0)[1-9](?:[ .]?\d{2}){4}/], ['jeton', /(token|jeton|secret)\s*["':=]/i] ];
const lib_attendreMail = p => L.attendre(p, () => { const r = window.R && window.R(); return !!r && r.querySelectorAll('.msg').length > 0; }, 9000).then(() => p.waitForTimeout(500));
const inventaire = p => p.evaluate(async () => {
  const r = { local: {}, session: {}, cookies: document.cookie, nom: window.name, adresse: location.href, idb: [] };
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); r.local[k] = localStorage.getItem(k); }
  for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); r.session[k] = sessionStorage.getItem(k); }
  try { r.idb = (await indexedDB.databases()).map(d => d.name); } catch (e) {}
  return r; });
const resume = inv => Object.entries(inv.local).concat(Object.entries(inv.session).map(([k, v]) => ['(session) ' + k, v])).map(([k, v]) => ({ cle: k, octets: v.length, sensible: SENSIBLE.filter(([, re]) => re.test(v)).map(([n]) => n), debut: v.slice(0, 70) }));
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: 'window.R=()=>{const e=document.querySelector("#courrier-hote [data-opcourrier]");return e?e.shadowRoot:null};' });
  const p = c.p;
  // 1. une session de gérant qui TRAVAILLE : un devis composé dans l'atelier, une réponse écrite dans la Boîte mail, des écrans visités
  const A0 = require('../sondes/atelier-outils.js');
  const f = await A0.ouvrirAtelier(c, 'devis', 'devis');
  if (f) { await A0.composerDevis(c, f, { client: 'hp', objet: 'Devis ZXQ-STOCKAGE-5530', articles: [{ ref: 'GS-20', qte: 2 }] }); await f.locator('[data-act="retour"]:visible').first().click().catch(() => {}); await p.waitForTimeout(900); }
  await L.aller(p, 'boiteMail'); await lib_attendreMail(p);
  await p.evaluate(() => { try { courrierOuvrir('m1'); } catch (e) {} }); await p.waitForTimeout(900);
  await p.locator('#courrier-hote .msg.sel').first().click().catch(() => {}); await p.keyboard.press('r'); await p.waitForTimeout(700);
  await p.locator('#courrier-hote #cBody').fill('Brouillon ZXQ-STOCKAGE-5531 : rappelez-moi.').catch(e => console.log('composeur :', e.message.slice(0, 80))); await p.waitForTimeout(300);
  await p.locator('#courrier-hote #cDraft').click().catch(e => console.log('brouillon :', e.message.slice(0, 80))); await p.waitForTimeout(900);
  for (const h of ['clients', 'factures', 'equipe', 'entreprise']) { try { await L.aller(p, h); } catch (e) {} }
  const A = await inventaire(p); const RA = resume(A);
  console.log('AVANT déconnexion : localStorage', Object.keys(A.local).length, 'clés · sessionStorage', Object.keys(A.session).length, '· cookies', JSON.stringify(A.cookies), '· window.name', JSON.stringify(A.nom), '· IndexedDB', JSON.stringify(A.idb));
  RA.forEach(x => console.log('  ·', x.cle, x.octets + ' o', x.sensible.length ? '⚠ ' + x.sensible.join('+') : '', '|', x.debut.replace(/\s+/g, ' ')));
  L.v('population : le rangement n\'est pas vide (sinon rien ne se prouve)', Object.keys(A.local).length + Object.keys(A.session).length > 0, { local: Object.keys(A.local), session: Object.keys(A.session) });
  L.v('aucun cookie posé', A.cookies === '', A.cookies); L.v('window.name vide', A.nom === '', A.nom);
  L.v('population : le devis et le brouillon de la personne sont bien rangés (marques ZXQ-STOCKAGE)', ['ZXQ-STOCKAGE-5530', 'ZXQ-STOCKAGE-5531'].map(m => Object.values(A.local).some(v => v.includes(m))).every(Boolean), Object.keys(A.local));
  L.v('aucun mot de passe, jeton ni IBAN rangé en clair avant déconnexion', RA.every(x => !x.sensible.some(s => s === 'iban' || s === 'mot de passe' || s === 'jeton')), RA.filter(x => x.sensible.length).map(x => x.cle + ':' + x.sensible));
  fs.writeFileSync(CAP + 'stockage-avant.json', JSON.stringify(A, null, 1));
  // 2. « Se déconnecter » : ce qui reste
  await p.evaluate(() => { try { sessionFermer(); } catch (e) { console.error('sessionFermer', e); } }); await p.waitForTimeout(900);
  const B = await inventaire(p), RB = resume(B);
  console.log('APRÈS déconnexion : localStorage', Object.keys(B.local).length, 'clés :', Object.keys(B.local).join(', '));
  const reste = Object.keys(B.local).filter(k => !/^opg_proto_(espace|mode|vues|barre)$/.test(k));
  console.log('  clés qui survivent hors réglages d\'affichage :', reste);
  RB.filter(x => x.sensible.length).forEach(x => console.log('  ⚠ après déconnexion :', x.cle, x.sensible.join('+')));
  fs.writeFileSync(CAP + 'stockage-apres.json', JSON.stringify(B, null, 1));
  L.v('après « Se déconnecter », aucune clé ne porte de document de l\'entreprise (devis, contrats, courrier écrit)', reste.length === 0, reste.map(k => k + ' ' + (B.local[k] || '').length + ' o'));
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
