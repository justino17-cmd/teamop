/* Le VRAI serveur de TeamOP (server/index.js), isolé sur 127.0.0.1 — configuration et données jetables, fausse boîte IMAP (tests/faux-imap.js) et faux relais SMTP — pour les sondes
   navigateur d'OP Courrier côté Tour. ⛔ Aucune boîte n'est connectée au départ : la sonde la connecte par l'interface, comme Justin. Jamais teamop.fr. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..', '..');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => { c.on('error', () => {}); let t = '', corps = false, msg = ''; c.write('220 banc\r\n');
    c.on('data', d => { t += d.toString('utf8'); let i; while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n'); else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); } else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  return f;
}
exports.demarrer = async function (opt) {
  opt = opt || {};
  const racineSrv = path.join(RACINE, 'server');
  const webpush = require(path.join(racineSrv, 'node_modules', 'web-push'));
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-courrier-'));
  const F = facteur(); const smtp = await new Promise(res => F.s.listen(0, '127.0.0.1', () => res(F.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MDP = 'mdp-sonde-courrier', BOITE = 'tour@sonde-courrier.example';
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() }] }));
  const IMAP = path.join(banc, 'faux-imap.json'), T0 = Date.now() - 2 * 86400000;
  const msgs = []; let n = 0;
  const poser = (dossier, o) => { n++; msgs.push(Object.assign({ dossier, uid: n, messageId: o.mid || ('<s' + n + '@sonde>'), from: o.de || 'claire.martin@client-essai.example', fromNom: o.nom || 'Claire Martin', to: BOITE, subject: o.objet, text: o.texte || 'Bonjour,\n\nCeci est un message d’essai.', ts: T0 + n * 3600000, flags: o.lu ? ['\\Seen'] : [] }, o.pieces ? { pieces: o.pieces } : {})); };
  if (opt.messages !== false) {
    poser('INBOX', { objet: 'Question sur ma facture de mars', nom: 'Claire Martin', texte: 'Bonjour,\n\nPouvez-vous me renvoyer ma facture de mars ?\n\nMerci d’avance.' });
    poser('INBOX', { objet: 'Devis signé', nom: 'Paul Bernard', de: 'paul.bernard@client-essai.example', lu: true, pieces: [{ nom: 'devis.pdf', type: 'application/pdf', taille: 2345 }] });
    poser('Envoyés', { objet: 'Votre abonnement', nom: BOITE, de: BOITE, lu: true });
    poser('Archives', { objet: 'Ancien échange', lu: true });
  }
  if (opt.gestes) {   /* les quatre gestes de l'ancien écran (v2.91) : une demande à pièces jointes (nom hostile) et le journal des envois du serveur */
    poser('INBOX', { objet: 'Demande avec pièces', nom: 'Léa Moreau', de: 'lea.moreau@client-essai.example', mid: '<demande-sonde@sonde>', texte: 'Bonjour, voici le rapport et la photo.', pieces: [
      { nom: '../../rapport:T3?.pdf', type: 'text/html', b64: Buffer.from('<html><script>window.__execute=1</script>%PDF-sonde</html>').toString('base64') },
      { nom: 'photo.png', type: 'image/png', b64: Buffer.from('PNGsonde').toString('base64') }] });
    const TJ = Date.now() - 7200000;
    fs.writeFileSync(path.join(D, 'mails-envoyes.json'), JSON.stringify([
      { ts: TJ + 3000, a: 'neuf@client-essai.example', sujet: 'Bienvenue sur OP GESTION', txt: 'Votre espace est prêt.\n\nVotre lien : <b>pas du gras</b>' },
      { ts: TJ + 2000, a: 'rate@client-essai.example', sujet: '⚠️ NON PARTI — Invitation', txt: 'Invitation', echec: 1 },
      { ts: TJ + 1000, a: 'ancien@client-essai.example', sujet: 'Code de confirmation', txt: '' }]));
  }
  fs.writeFileSync(IMAP, JSON.stringify({ boites: { [BOITE]: { messages: msgs, actions: [] } }, pannes: {} }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', smtp: { host: '127.0.0.1', port: smtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const port = await libre(); let journal = '';
  const enfant = spawn(process.execPath, ['-r', path.join(RACINE, 'tests', 'faux-imap.js'), path.join(racineSrv, 'index.js')], { env: Object.assign({}, process.env, {
    TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token',
    TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs', TEAMOP_MAIL_NONLUS_MS: '1000',
    FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: racineSrv }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + port + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  if (!vivant) throw new Error('serveur de sonde muet : ' + journal.slice(-400));
  const arreter = () => { try { enfant.kill('SIGKILL'); } catch (e) {} try { F.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  return { port, smtp, MDP, BOITE, facteur: F, arreter, journal: () => journal, lireEtat: () => JSON.parse(fs.readFileSync(IMAP, 'utf8')), lireSuivi: () => { try { return JSON.parse(fs.readFileSync(path.join(D, 'mail-suivi.json'), 'utf8')); } catch (e) { return {}; } }, lireBoites: () => { try { return JSON.parse(fs.readFileSync(path.join(D, 'mail-boites.json'), 'utf8')); } catch (e) { return []; } } };
};
