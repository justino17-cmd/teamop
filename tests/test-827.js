/* ⛔ CE QUE CE FICHIER GARDE — supprimer un compte : une question, une case, « Oui ». Plus de code par e-mail.

   Justin, 26 septembre 2026, capture à l'appui (l'écran « Un code à 6 chiffres vient d'être envoyé à … ») :
   « quand on supprime un compte, je veux plus que ça envoie un code par mail ; je veux que ça mette un
   message “êtes-vous sûr de vouloir supprimer ce compte”, que ça coche la case, et qui clique oui, je
   supprime ce compte ». Le code partait à l'adresse du compte CONNECTÉ : pour retirer chez ELAN un « OP
   Admin » fantôme, il fallait le code reçu dans la boîte de quelqu'un d'autre.

   Ce qui est joué ici, sur les VRAIES fonctions extraites d'app.html :
     · la fenêtre pose la question, une case, et un « Oui » DÉSACTIVÉ tant que la case n'est pas cochée ;
     · sans la case, rien n'est supprimé — même si le bouton a été réactivé à la main ;
     · avec la case : le compte part, sa pierre tombale est posée, le ménage est fait, le journal le dit ;
     · aucun appel au serveur (plus de /api/sendcode ni /api/checkcode sur ce chemin) ;
     · les gardes restent : administrateur seul, jamais son propre compte.
   Au navigateur, dans la vraie page : `scratchpad/sonde-suppression-compte.js`. */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* Une fonction de premier niveau, jusqu'à la déclaration de premier niveau suivante. */
const fonction = nom => { const k = CODE.indexOf('\nfunction ' + nom + '('); if (k < 0) return '';
  const i = k + 1, fin = CODE.slice(i + 10).search(/\n(?:async function |function |const |let |var |window\.|views\.)/);
  return fin < 0 ? '' : CODE.slice(i, i + 10 + fin + 1); };

console.log('1. Le texte : plus aucun code sur ce chemin');
const del = fonction('delUser'), conf = fonction('delUserConfirme');
v('delUser et delUserConfirme sont trouvées', [del.length > 200, conf.length > 200], [true, true]);
v('⛔ plus aucune fonction d’envoi de code pour la suppression', /function delUserEnvoyer\(|function delUserMailSave\(|purpose:'deluser-/.test(CODE), false);
v('⛔ aucun appel au serveur dans les deux portes', /fetch\(|sendcode|checkcode/.test(del + conf), false);
v('la question est celle de Justin', /Êtes-vous sûr de vouloir supprimer ce compte \?/.test(del), true);
v('une case à cocher, et un « Oui » désactivé au départ', /type="checkbox" id="du-ok"/.test(del) && /<button id="du-oui" class="btn danger" disabled/.test(del), true);
v('la garde de rôle est la PREMIÈRE instruction des deux portes', [/^function delUser\(id\)\{ if\(!adminSeul\(\)\) return;/.test(del), /^function delUserConfirme\(\)\{ if\(!adminSeul\(\)\) return;/.test(conf)], [true, true]);
v('la suppression d’un technicien qui a un compte ne parle plus de code', /sa suppression passe par le code de confirmation/.test(CODE), false);

console.log('\n2. Joué : les vraies fonctions, dans un bac à sable');
function monter(opts) {
  const o = opts || {};
  const el = {}; let modale = '', fermee = 0, toasts = [], journal = [], nettoyes = [], sauves = 0, vues = 0, appels = 0;
  const bac = {
    db: { users: [{ id: 'u-admin', login: 'florent', prenom: 'Bruno', nom: 'Folrent', role: 'admin' },
                  { id: 'u-fantome', login: 'florent-3', prenom: 'OP', nom: 'Admin', role: 'admin' }], usersSupprimes: [] },
    currentUser: { id: o.moi || 'u-admin', role: o.role || 'admin' },
    adminSeul: () => (o.role || 'admin') === 'admin',
    toast: t => toasts.push(t), esc: s => String(s), fullName: u => (u.prenom + ' ' + u.nom).trim(),
    openModal: h => { modale = h; el['du-ok'] = { checked: false }; el['du-err'] = { style: {}, textContent: '' }; },
    closeModal: () => { fermee++; }, $: id => el[id] || null,
    usersTombesFusion: (d, b) => (d.usersSupprimes || []).concat(b.usersSupprimes),
    utilisateurNettoyer: u => nettoyes.push(u.id), logEvent: (a, b) => journal.push(a + ' ' + b),
    save: () => { sauves++; }, views: { utilisateurs: () => { vues++; } },
    fetch: () => { appels++; return Promise.reject(new Error('aucun appel attendu')); },
  };
  const noms = Object.keys(bac);
  const f = new Function(...noms, 'let delUserCible="";\n' + del + '\n' + conf + '\nreturn { delUser, delUserConfirme, cible: () => delUserCible };');
  const api = f(...noms.map(n => bac[n]));
  return { api, bac, el, etat: () => ({ modale, fermee, toasts, journal, nettoyes, sauves, vues, appels, users: bac.db.users.map(u => u.id), tombes: bac.db.usersSupprimes.map(t => t.id) }) };
}
{
  const m = monter(); m.api.delUser('u-fantome'); const e = m.etat();
  v('la fenêtre s’ouvre, sur le bon compte', /Supprimer OP Admin/.test(e.modale) && /@florent-3/.test(e.modale), true);
  v('ouvrir la fenêtre ne supprime rien', [e.users.length, e.sauves], [2, 0]);
  m.api.delUserConfirme(); const e2 = m.etat();
  v('⛔ « Oui » sans la case : rien n’est supprimé', [e2.users.length, e2.sauves, e2.tombes.length], [2, 0, 0]);
  v('…et on dit pourquoi', /Cochez la case/.test(m.el['du-err'].textContent), true);
  m.el['du-ok'].checked = true; m.api.delUserConfirme(); const e3 = m.etat();
  v('la case cochée puis « Oui » : le compte part', e3.users, ['u-admin']);
  v('…sa pierre tombale est posée', e3.tombes, ['u-fantome']);
  v('…le ménage est fait (fiche technicien, box, groupes, planning)', e3.nettoyes, ['u-fantome']);
  v('…le journal le dit, et la base est enregistrée', [e3.journal.some(l => /Utilisateur supprimé @florent-3/.test(l)), e3.sauves], [true, 1]);
  v('⛔ aucun appel au serveur de bout en bout', e3.appels, 0);
}
{
  const m = monter({ role: 'technicien' }); m.api.delUser('u-fantome'); m.api.delUserConfirme();
  v('⛔ un non-administrateur n’ouvre rien et ne supprime rien', [m.etat().modale, m.etat().users.length], ['', 2]);
}
{
  const m = monter({ moi: 'u-fantome' }); m.api.delUser('u-fantome'); const e = m.etat();
  v('⛔ on ne supprime jamais son propre compte', [e.modale, e.users.length, e.toasts.some(t => /Impossible de supprimer votre compte/.test(t))], ['', 2, true]);
}

console.log('\n3. La preuve dans la vraie page existe');
v('scratchpad/sonde-suppression-compte.js', fs.existsSync(__dirname + '/../scratchpad/sonde-suppression-compte.js'), true);

console.log(`\n════ test-827 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
