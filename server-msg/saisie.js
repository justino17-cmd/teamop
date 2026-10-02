/* ══ LA SAISIE AU TERMINAL — MASQUÉE QUAND ON LUI DIT QUE C'EST UN SECRET, ET JAMAIS RÉÉCRITE ═══════════════════════════════════
 *
 * Ce que `configurer-sauvegarde.js` partage avec lui-même et avec les bancs : lire une réponse au clavier SANS la réafficher.
 * (`configurer-sms.js` porte la même mécanique en ligne ; elle n'est pas reprise ici pour ne pas toucher un fichier que ses bancs
 * gardent au texte près — la même lecture, une seule fois par script.)
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md) : Justin recolle toutes ses sorties dans la conversation. Un secret
 * se SAISIT ici, masqué, et va de ce clavier au fichier : jamais en argument (`ps` le montre à toute la machine, l'historique du shell
 * le garde), jamais affiché, jamais recopié dans la conversation.
 *
 * ⛔ AU CLAVIER : LECTURE EN MODE BRUT, CARACTÈRE PAR CARACTÈRE, SANS `readline`. `readline` REDESSINE « invite + ligne » en entier à chaque
 * retour arrière, flèche gauche ou Ctrl-A — les secrets saisis jusque-là s'affichaient EN CLAIR (rejoué sous un vrai terminal pour
 * `configurer-sms.js`, 2 octobre 2026). Ici RIEN n'est jamais réécrit : ce qui est masqué ne reçoit aucun écho, ni à la frappe, ni à la
 * correction ; une valeur visible reçoit l'écho des caractères tapés et de l'effacement, et rien d'autre. Les séquences d'échappement
 * (flèches, Début, Fin, Suppr.) sont lues et IGNORÉES ; Ctrl-C abandonne ; Ctrl-U efface la ligne ; un collage de plusieurs caractères
 * est traité caractère par caractère.
 * ⛔ EN ENTRÉE REDIRIGÉE (les bancs, seule façon d'ÉPROUVER un script avant de le confier) : lecture d'un bloc, distribution des lignes ;
 * une valeur masquée n'est JAMAIS réécrite à l'écran, même redirigée.
 */
'use strict';

const AU_CLAVIER = !!process.stdin.isTTY;
let lignes = null;

function lireToutStdin() {
  return new Promise((resolve) => {
    let d = ''; process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { d += c; });
    process.stdin.on('end', () => resolve(d.split('\n')));
    if (process.stdin.readableEnded) resolve(d.split('\n'));
  });
}

function lireAuClavier(question, masque) {
  return new Promise((resolve) => {
    const entree = process.stdin;
    process.stdout.write(question);
    entree.setRawMode(true); entree.resume(); entree.setEncoding('utf8');
    let tampon = '', echappement = 0;   // echappement : 0 aucun, 1 après ESC, 2 dans « ESC [ … » (jusqu'à l'octet final)
    const effacerEcho = (n) => { if (!masque && n > 0) process.stdout.write('\b \b'.repeat(n)); };
    const fini = () => { entree.removeListener('data', surDonnees); entree.setRawMode(false); entree.pause(); process.stdout.write('\n'); resolve(tampon.trim()); };
    function surDonnees(morceau) {
      for (const ch of morceau) {
        const c = ch.codePointAt(0);
        if (echappement === 1) { echappement = ch === '[' || ch === 'O' ? 2 : 0; continue; }
        if (echappement === 2) { if (c >= 0x40 && c <= 0x7e) echappement = 0; continue; }
        if (ch === '\x1b') { echappement = 1; continue; }
        if (ch === '\r' || ch === '\n') { fini(); return; }
        if (ch === '\x03') { entree.setRawMode(false); process.stdout.write('\n✗ Abandon. Rien n\'a été modifié.\n'); process.exit(130); }
        if (ch === '\x7f' || ch === '\b') { if (tampon.length) { tampon = tampon.slice(0, -1); effacerEcho(1); } continue; }
        if (ch === '\x15') { effacerEcho(tampon.length); tampon = ''; continue; }
        if (c < 0x20 || (c >= 0x7f && c < 0xa0)) continue;
        tampon += ch;
        if (!masque) process.stdout.write(ch);
      }
    }
    entree.on('data', surDonnees);
  });
}

/* Pose une question et rend la réponse (sans les espaces de bord). `masque` : rien n'est réécrit. */
async function demander(question, masque) {
  if (!AU_CLAVIER) {
    if (lignes === null) lignes = await lireToutStdin();
    const r = String(lignes.length ? lignes.shift() : '').trim();
    process.stdout.write(question + (masque ? '' : r) + '\n');
    return r;
  }
  return lireAuClavier(question, masque);
}

const fermer = () => { if (AU_CLAVIER) { try { process.stdin.setRawMode(false); } catch (e) { /* déjà rendu */ } process.stdin.pause(); } };

module.exports = { demander, fermer, AU_CLAVIER };
