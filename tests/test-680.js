/* ══ « JE N'ARRIVE PAS À LA SUPPRIMER DE LA LISTE » — 14 septembre 2026 ═══════════════════
   Écran Devis IA de la Tour. ELAN, 442 connexions au compteur, s'affichait sous
   « Accès coupés, espace jamais vu », et le bouton « Retirer de la liste » ne faisait rien.

   Deux défauts, et le second était invisible tant que le premier tenait :

   1. `espacesConnus()` lisait `cnxResume(t).dernier`. Le résumé écrit `derniere`. Le champ
      lu n'existait donc pas : `vu` valait null pour TOUTES les entreprises, sans exception.
      Les trois autres lecteurs de cnxResume (deux routes, un total) écrivent `derniere` —
      cette ligne-là était seule de son orthographe, et personne ne le voyait parce qu'un
      champ absent ne lève rien.

   2. La Tour triait sur `x.vu==null` en croyant trier sur « code tapé à la main ». Une
      entreprise mal classée tombait dans un groupe dont le seul bouton efface une entrée
      d'ACTIVATION — ELAN n'en avait pas. Le bouton partait, le serveur répondait ok, et la
      ligne restait : elle venait de la liste des espaces, que la réponse ne réécrit pas.

   Et un troisième, trouvé en relisant : `vus.add(tc)` était posé AVANT le filtre qui écarte
   les espaces sans nom. Un espace écarté là était marqué « déjà rendu », donc la boucle de
   rattrapage — celle qui existe pour qu'une entreprise activée reste visible — l'ignorait.

   Ce banc LANCE le vrai serveur, isolé, et lui parle en HTTP. ⚠️ Jamais api.teamop.fr.
   La partie Tour lit le vrai tour.html et exécute diaNature telle qu'elle est écrite. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 680 · Devis IA : « espace jamais vu » mentait, et la ligne ne partait pas ──');

/* ── PARTIE 1 · la Tour, telle qu'elle est écrite ────────────────────────────────────────
   diaNature est extraite du fichier réel : un test qui recopierait la fonction ne
   prouverait rien du fichier livré. */
const tour = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const src = tour.match(/function diaNature\(x\)\{[\s\S]*?\n\}/);
v('diaNature est bien trouvée dans tour.html', !!src, true);
if (src) {
  const diaNature = new Function('DIA', src[0] + '; return diaNature;')({ equipes: {
    'code-faute-de-frappe': { actif: false }, 'elan-34oc': { actif: false }, 'client-actif': { actif: true } } });
  /* ⛔ LE défaut : ELAN, qui se connecte tous les jours, était rangé chez les jamais-vues. */
  v('⛔ une entreprise qui s\'est connectée est « prête », jamais « jamais connectée »',
    diaNature({ t: 'elan-34oc', vu: 1757800000000 }), 'prete');
  v('un espace qui n\'a jamais réussi une connexion tombe dans le dernier groupe',
    diaNature({ t: 'code-faute-de-frappe', vu: null }), 'jamaisvu');
  v('une entreprise activée reste active quoi qu\'il arrive', diaNature({ t: 'client-actif', vu: null }), 'actif');
  /* La provenance NE PEUT PAS servir de critère : le serveur rend les codes activés à la
     main dans sa propre liste d'espaces. Trier là-dessus vidait le groupe. */
  v('⛔ un code activé à la main reste classable même s\'il vient de la liste des espaces',
    diaNature({ t: 'code-faute-de-frappe', vu: null }) !== diaNature({ t: 'elan-34oc', vu: 1757800000000 }), true);
}
/* Le bouton doit suivre ce qu'il y a VRAIMENT à retirer — une entrée d'activation — et non
   le groupe d'affichage. C'est la moitié du défaut : un bouton posé sur une ligne qui n'a
   rien à supprimer part, réussit, et ne change rien à l'écran. */
v('« Retirer de la liste » ne s\'affiche que s\'il existe une activation à effacer',
  /var t=x\.t, aRetirer=!!DIA\.equipes\[t\];/.test(tour) && /aRetirer\?'<button[^\n]*diaRetirer/.test(tour), true);
v('« Activer » reste offert à tout espace du groupe', /diaToggle\(\\''\+jsq\(t\)\+'\\',true\)">\u2728 Activer<\/button>'\+/.test(tour), true);
v('⛔ le dernier groupe ne se nomme plus « espace jamais vu » sans le prouver',
  /Jamais connect\u00e9es \u00e0 l\u2019application|Jamais connectées à l’application/.test(tour), true);

/* ── PARTIE 2 · le serveur, lancé pour de vrai ───────────────────────────────────────── */
const banc = path.join(require('os').tmpdir(), 'teamop-test-680-' + process.pid);
let enfant = null;
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie serveur SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  const MDP = 'banc-680-mot-de-passe';
  const monHash = p => crypto.createHash('sha256').update(String(p)).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const hier = Date.now() - 86400000;

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: monHash(MDP) }));
  /* ⚠️ la clé de l'annuaire n'a pas de tiret (espSlug retire tout hors [a-z0-9]) ; `t` si. */
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    'elan': { slug: 'elan', nom: 'ELAN', email: 'e@exemple.fr', t: 'elan-34oc', code: b64({ t: 'elan-34oc', k: 'CLE-PRIVEE-ELAN' }), ts: 2 } }));
  /* Trois populations, une par défaut à prouver :
       elan-34oc     — une entreprise connue, qui se connecte, jamais activée ;
       sans-nom-9z   — connecté mais sans nom présentable ET une activation ÉTEINTE :
                       c'est lui que `vus.add` posé trop tôt faisait disparaître ;
       code-faux-42  — un code tapé à la main que rien ne connaît : le seul vrai « coupé ». */
  fs.writeFileSync(path.join(banc, 'data', 'connexions.json'), JSON.stringify({
    'elan-34oc': [{ ev: 'connexion', ts: hier, login: 'florent', dev: 'd1', version: '670' }],
    'sans-nom-9z': [{ ev: 'connexion', ts: hier, login: 'x', dev: 'd2', version: '670' }] }));
  fs.writeFileSync(path.join(banc, 'data', 'devis-acces.json'), JSON.stringify({
    'sans-nom-9z': { actif: false }, 'code-faux-42': { actif: false } }));

  const PORT = 8300 + (process.pid % 600);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT), TEAMOP_RATTRAPAGE_MS: '300' }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 60; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

  const appel = async (c, corps, jeton, methode) => {
    const r = await fetch(B + c, { method: methode || 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
      body: methode === 'GET' ? undefined : JSON.stringify(corps || {}) });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { statut: r.status, txt, json };
  };

  try {
    const cx = await appel('/api/monitor/login', { nom: 'Patron', pass: MDP });
    v('connexion à la Tour', !!(cx.json && cx.json.token), true);
    const jeton = (cx.json || {}).token;

    const d = await appel('/api/monitor/devisia', null, jeton, 'GET');
    v('l\'écran Devis IA répond', d.statut, 200);
    const ent = ((d.json || {}).entreprises) || [];
    const par = {}; ent.forEach(x => { par[x.t] = x; });

    v('ELAN est dans la liste des espaces connus', !!par['elan-34oc'], true);
    v('… sous son nom d\'entreprise', (par['elan-34oc'] || {}).nom, 'ELAN');
    /* LE défaut du jour : `dernier` lu sur un résumé qui écrit `derniere`. */
    v('⛔ sa dernière connexion est RENDUE (elle valait null pour tout le monde)',
      (par['elan-34oc'] || {}).vu, hier);

    /* Le troisième défaut : marqué « déjà rendu » avant d'avoir été rendu. */
    v('⛔ un espace sans nom mais avec une activation éteinte n\'est plus perdu',
      !!par['sans-nom-9z'], true);
    v('… et sa dernière connexion est juste, elle aussi', (par['sans-nom-9z'] || {}).vu, hier);

    /* Voulu, et antérieur à ce correctif : un code activé reste visible même sans espace
       derrière. C'est ce qui interdit de trier sur la provenance côté Tour. */
    v('un code activé à la main reste visible dans la liste', !!par['code-faux-42'], true);
    v('… en se déclarant jamais connecté, ce qui est vrai', (par['code-faux-42'] || {}).vu, null);

    /* Le bouton. Il n'a de sens que sur le dernier groupe — et là, il doit marcher. */
    const sup = await appel('/api/monitor/devisia', { teamId: 'code-faux-42', supprimer: true }, jeton);
    v('« Retirer de la liste » répond', sup.statut, 200);
    v('… et l\'activation a vraiment disparu de la réponse', !!((sup.json || {}).equipes || {})['code-faux-42'], false);
    const surDisque = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'devis-acces.json'), 'utf8'));
    v('… et du disque, pas seulement de la réponse', !!surDisque['code-faux-42'], false);
    v('… sans emporter l\'autre activation au passage', !!surDisque['sans-nom-9z'], true);

    /* Le contre-test qui compte : retirer ne DOIT PAS faire disparaître une entreprise
       connue de la liste — c'est précisément l'illusion qu'on vient de supprimer. */
    await appel('/api/monitor/devisia', { teamId: 'elan-34oc', supprimer: true }, jeton);
    const d2 = await appel('/api/monitor/devisia', null, jeton, 'GET');
    const ent2 = ((d2.json || {}).entreprises) || [];
    v('ELAN reste dans la liste : ce n\'est pas une activation, il n\'y a rien à retirer',
      ent2.some(x => x.t === 'elan-34oc'), true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + e.message); }

  stop();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { stop(); console.error(e); process.exit(1); });
