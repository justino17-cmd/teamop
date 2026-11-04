/* test-3245 — CAMILLE NE TOUCHE PAS À LA RÉPONSE D'UN CLIENT FINAL À UN DOCUMENT D'ENTREPRISE (4 novembre 2026).
 *
 * Une facture qu'une entreprise envoie à SON client par notre serveur porte un Message-ID que le serveur retient (`envoisEnt`,
 * `server/index.js`). Si le client y répond et que la réponse arrive quand même chez nous (ancienne copie, entreprise sans adresse
 * dans l'annuaire), Camille ne doit ni la lire pour Claude, ni la classer, ni rédiger de brouillon : c'est le courrier de l'entreprise.
 * Les VRAIS modules (agents, cerveau, brouillons, Camille — `banc-agents-courrier.js`), messagerie et Claude simulés, et la VRAIE
 * fonction `reponseAEnvoiEntreprise` extraite du serveur.
 */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 60000).unref();

/* La vraie fonction du serveur, avec `midNorm` dont elle dépend, extraites du fichier livré. */
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const extraire = (nom) => { const i = SRV.indexOf('function ' + nom + '('); if (i < 0) return ''; let j = SRV.indexOf('\n}', i); return j < 0 ? '' : SRV.slice(i, j + 2); };
const fnMid = SRV.match(/function midNorm\(m\) \{[^\n]*\}/);
const fnRep = extraire('reponseAEnvoiEntreprise');
vrai('les fonctions du serveur sont trouvées', fnMid && fnRep.length > 60);
const ENVOYE = '<a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.doc@teamop.fr>';
const reponseAEnvoiEntreprise = new Function('envoisEntSet', fnMid[0] + '\n' + fnRep + '\nreturn reponseAEnvoiEntreprise;')(new Set([ENVOYE.replace(/^<|>$/g, '').toLowerCase()]));
v('la fonction reconnaît l’envoi par In-Reply-To, par References, et pas un autre mail', [reponseAEnvoiEntreprise([ENVOYE]), reponseAEnvoiEntreprise(['<autre@x>', ENVOYE.toUpperCase()]),
  reponseAEnvoiEntreprise(['<autre@x> ' + ENVOYE]), reponseAEnvoiEntreprise(['<autre@x>']), reponseAEnvoiEntreprise([]), reponseAEnvoiEntreprise(null)], [true, true, true, false, false, false]);

const msg = (o) => Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<rep1@client-3245>', de: 'cliente-finale@ailleurs-3245.fr', deNom: 'Cliente',
  pour: 'contact@teamop.fr', objet: 'Re: Facture FAC-QXZ-3245', texte: 'Bonjour, je conteste la ligne 3 de la facture QXZ.', ts: 0, auto: false, protege: false, authentifie: true }, o);
const poser = (Z, o) => { const m = msg(Object.assign({ ts: Z.horloge.t - 3600000 }, o)); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid: m.uid }; };

(async () => {
  console.log('\n── 3245 · la réponse d’un client final à un document d’entreprise ──');
  {
    const Z = monter({ modes: { camille: 'brouillon' }, reponseAEnvoiEntreprise });
    const r = await Z.camille.surNouveauMessage(poser(Z, { enReponseDe: [ENVOYE] }));
    v('Camille la saute, avec sa raison', r && r.saute, 'reponse_entreprise');
    v('⛔ rien ne part chez Claude', Z.recus.length, 0);
    v('⛔ aucun brouillon, aucune validation', (await Z.validations()).length, 0);
    v('⛔ aucun envoi', Z.envoyes.length, 0);
    v('⛔ elle n’est pas classée (elle reste « à traiter » sous les yeux de Justin)', r && r.classe, undefined);
    const tout = fs.readdirSync(Z.D).map(f => { try { return fs.readFileSync(path.join(Z.D, f), 'utf8'); } catch (e) { return ''; } }).join('\n');
    vrai('⛔ ni l’adresse ni le texte du client final ne sont écrits dans les fichiers des agents', !tout.includes('ailleurs-3245') && !tout.includes('QXZ'));
    v('…au passage suivant, toujours sautée, toujours sans Claude', [(await Z.camille.surNouveauMessage(poser(Z, { enReponseDe: [ENVOYE] }))).saute, Z.recus.length], ['reponse_entreprise', 0]);
    Z.nettoyer();
  }
  console.log('\n── 3245 · contre-épreuve : un mail ordinaire se traite comme avant ──');
  {
    const Z = monter({ modes: { camille: 'brouillon' }, reponseAEnvoiEntreprise });
    const r = await Z.camille.surNouveauMessage(poser(Z, { mid: '<m2@prospect-3245>', de: 'prospect@prospect-3245.fr', objet: 'Votre logiciel', texte: 'Que proposez-vous ?', enReponseDe: ['<autre@x>'] }));
    vrai('un mail qui ne répond pas à un envoi d’entreprise passe par Claude', Z.recus.length === 1 && r && r.saute !== 'reponse_entreprise');
    Z.nettoyer();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
