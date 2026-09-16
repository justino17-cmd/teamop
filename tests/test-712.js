/* ══ UNE PHOTO QUI N'ARRIVE PAS N'EST PAS UNE PHOTO SUPPRIMÉE ══════════════════════════════

   La moitié APPLICATION de l'étape 0 du socle (l'autre est `tests/test-711.js`, côté serveur).
   Justin, 16 septembre 2026 : « Les pièces jointes → ton VPS ».

   ⛔ CE QUE CE BANC GARDE, ET C'EST LA DETTE LA PLUS CHÈRE DE CE DÉPÔT.
   Le 11 septembre, un refus rendu en JSON a fait dire à l'écran « Connecte ta boîte mail » à
   quelqu'un dont la boîte marchait très bien : `_mailboxes` valait `[]` (« aucune ») là où il
   fallait `null` (« on n'a pas pu savoir »). On réclamait son mot de passe Gmail à un client
   sans problème. La même faute ici coûterait pire : une photo de poste d'appâtage annoncée
   « supprimée » à un technicien qui est simplement dans une cave sans réseau — et sur le
   terrain, hors réseau est la situation NORMALE, pas l'exception.

   `pieceLire` rend donc TROIS choses, jamais deux :
     {dataUrl}            la pièce
     {absente:true}       le serveur a répondu 404 : c'est un FAIT
     {inconnu:true,motif} réseau, clé, entreprise fermée, déchiffrement — on ne sait pas

   ⚠️ LES FONCTIONS SONT EXTRAITES DU FICHIER LIVRÉ ET EXÉCUTÉES, pas relues. Une garde qu'on
   lit au lieu de l'exercer est une garde qu'on croit avoir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ── extraction par ancres de texte, sur le fichier réel ─────────────────────────────────── */
const i0 = APP.indexOf('const PIECE_CLAIR_MAX=');
const i1 = APP.indexOf('async function sauvegardeDeposer(');
console.log('\n── 712 · les deux fonctions sortent du fichier livré ──');
v('le bloc est retrouvé', i0 > 0 && i1 > i0, true);
const SRC = APP.slice(i0, i1);
v('il porte pieceDeposer', /async function pieceDeposer\(/.test(SRC), true);
v('il porte pieceLire', /async function pieceLire\(/.test(SRC), true);
/* ⛔ Le drapeau de compression doit VOYAGER. Sans lui, la relecture rend du charabia sans
   erreur — la panne la plus difficile à diagnostiquer de toute la famille. */
v('⛔ le dépôt envoie le drapeau de compression', /z:\(e\.z\?1:0\)/.test(SRC), true);
v('⛔ la relecture le repasse à syncDecrypt', /z:j\.z/.test(SRC), true);

/* ── le banc : de vrais appels, avec un serveur simulé ───────────────────────────────────── */
function banc(opts) {
  const o = opts || {};
  const envois = [], chiffres = [];
  const ctx = {
    PUSH_API: 'http://banc', SYNC_SALT: 'sel-du-banc',
    gzipPossible: () => o.gzip !== false,
    sauvKh: async () => (o.sansEspace ? null : { t: 'ent-banc', kh: 'k'.repeat(64) }),
    /* ⛔ LE FAUX CHIFFREMENT NE RECOPIE PAS LE CLAIR — premier jet de ce banc, et il rendait le
       contrôle « le clair ne part pas » incapable de distinguer un vrai chiffrement d'une
       absence de chiffrement. Il rend une valeur OPAQUE, et note à part ce qu'on lui a donné. */
    syncEncrypt: async (clair) => { chiffres.push(clair); return o.chiffrementCasse ? null : { enc: 'OPAQUE-' + chiffres.length, iv: 'IV', salt: 'sel-du-banc', z: 1 }; },
    syncDecrypt: async (x) => (o.dechiffrementCasse ? null : (o.clair != null ? o.clair : String(x.enc))),
    fetch: async (url, init) => {
      envois.push({ url, corps: JSON.parse(init.body) });
      if (o.reseauCoupe) throw new Error('Failed to fetch');
      const rep = o.reponse || { status: 200, j: { ok: true, id: 'a'.repeat(64), octets: 10, plafond: 99 } };
      return { ok: rep.status < 400, status: rep.status, json: async () => { if (rep.pasDuJson) throw new Error('pas du json'); return rep.j; } };
    },
    console: { log() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { ctx, envois, chiffres };
}

(async () => {
  console.log('\n── 712 · déposer : ce qui part, et ce qui se dit quand ça ne part pas ──');
  { const b = banc({});
    const r = await b.ctx.pieceDeposer('data:image/jpeg;base64,AAAA');
    v('le dépôt rend l\'identifiant du serveur', r.id, 'a'.repeat(64));
    v('… et le corps envoyé porte t, kh, iv, enc et z',
      Object.keys(b.envois[0].corps).sort(), ['enc', 'iv', 'kh', 't', 'z']);
    v('⛔ z vaut bien 1 quand syncEncrypt a compressé', b.envois[0].corps.z, 1);
    /* ⛔ Le clair ne part JAMAIS tel quel : c'est tout l'intérêt. Deux faits, pas un :
       syncEncrypt a bien reçu la photo, ET ce qui part est sa sortie, pas l'entrée. */
    v('⛔ la photo est bien passée au chiffrement', b.chiffres[0], 'data:image/jpeg;base64,AAAA');
    v('⛔ et ce qui part est la SORTIE du chiffrement', b.envois[0].corps.enc, 'OPAQUE-1');
    v('⛔ le clair n\'apparaît nulle part dans le corps envoyé',
      JSON.stringify(b.envois[0].corps).indexOf('data:image/jpeg') < 0, true); }

  { const b = banc({});
    v('une pièce vide est refusée ici, sans appeler le serveur', (await b.ctx.pieceDeposer('')).motif, 'vide');
    v('… et rien n\'a été envoyé', b.envois.length, 0); }
  { const b = banc({});
    const r = await b.ctx.pieceDeposer('x'.repeat(5 * 1024 * 1024));
    v('une pièce trop lourde est refusée AVANT le réseau', r.motif, 'trop-gros');
    v('… et rien n\'a été envoyé (on ne fait pas monter 5 Mo pour se faire dire non)', b.envois.length, 0); }
  { const b = banc({ sansEspace: true });
    v('sans espace d\'équipe : motif « sans-espace »', (await b.ctx.pieceDeposer('abc')).motif, 'sans-espace'); }
  { const b = banc({ chiffrementCasse: true });
    v('chiffrement impossible : motif « chiffrement », pas une exception', (await b.ctx.pieceDeposer('abc')).motif, 'chiffrement'); }
  { const b = banc({ reseauCoupe: true });
    v('réseau coupé : motif « reseau », pas une exception', (await b.ctx.pieceDeposer('abc')).motif, 'reseau'); }
  /* ⛔ LE MOTIF DU SERVEUR REMONTE TEL QUEL. C'est lui qui permet à l'écran de dire « l'espace
     de pièces jointes est plein » plutôt que « erreur » — la leçon du 11 septembre. */
  { const b = banc({ reponse: { status: 507, j: { error: 'plein', motif: 'plein', plafond: 512 } } });
    const r = await b.ctx.pieceDeposer('abc');
    v('⛔ un refus « plein » remonte son motif, pas « erreur »', r.motif, 'plein');
    v('… et son message, pour l\'écran', r.message, 'plein'); }
  { const b = banc({ reponse: { status: 413, j: { motif: 'trop-gros' } } });
    v('un 413 remonte « trop-gros »', (await b.ctx.pieceDeposer('abc')).motif, 'trop-gros'); }

  console.log('\n── 712 · ⛔ LIRE : trois états, jamais deux ──');
  const ID = 'b'.repeat(64);
  { const b = banc({ clair: 'data:image/jpeg;base64,ZZZ', reponse: { status: 200, j: { ok: true, iv: 'IV', enc: 'OPAQUE', z: 1 } } });
    const r = await b.ctx.pieceLire(ID);
    v('une pièce présente est rendue déchiffrée', r.dataUrl, 'data:image/jpeg;base64,ZZZ');
    v('… sans drapeau d\'absence ni d\'inconnu', [r.absente, r.inconnu], [undefined, undefined]);
    /* Le cache : ouvrir deux fois ne redemande pas. */
    await b.ctx.pieceLire(ID);
    v('relire la même pièce ne refait pas d\'appel', b.envois.length, 1); }

  { const b = banc({ reponse: { status: 404, j: { error: 'pièce introuvable', motif: 'absente' } } });
    const r = await b.ctx.pieceLire(ID);
    v('⛔ 404 → { absente:true } : c\'est un FAIT', r.absente, true);
    v('… et surtout PAS « inconnu »', r.inconnu, undefined); }

  /* ⛔ LE CONTRÔLE QUI COMPTE LE PLUS DE CE FICHIER. Un technicien dans une cave n'a pas perdu
     sa photo. Si ces quatre cas rendaient `absente`, l'écran lui dirait qu'elle est supprimée. */
  { const b = banc({ reseauCoupe: true });
    const r = await b.ctx.pieceLire(ID);
    v('⛔ réseau coupé → { inconnu:true }, JAMAIS « absente »', [r.inconnu, r.absente], [true, undefined]);
    v('… avec le motif « reseau »', r.motif, 'reseau'); }
  { const b = banc({ reponse: { status: 403, j: { motif: 'ferme' } } });
    const r = await b.ctx.pieceLire(ID);
    v('⛔ entreprise fermée (403) → inconnu, jamais « absente »', [r.inconnu, r.absente], [true, undefined]);
    v('… avec le motif du serveur', r.motif, 'ferme'); }
  { const b = banc({ sansEspace: true });
    const r = await b.ctx.pieceLire(ID);
    v('⛔ sans espace d\'équipe → inconnu, jamais « absente »', [r.inconnu, r.absente], [true, undefined]); }
  { const b = banc({ dechiffrementCasse: true, reponse: { status: 200, j: { ok: true, iv: 'IV', enc: 'OPAQUE', z: 0 } } });
    const r = await b.ctx.pieceLire(ID);
    /* `syncDecrypt` rend `null` pour trois causes distinctes — clé étrangère, bloc abîmé,
       navigateur sans décompression. Aucune ne veut dire « la pièce n'existe pas ». */
    v('⛔ déchiffrement impossible → inconnu, jamais « absente »', [r.inconnu, r.absente], [true, undefined]);
    v('… motif « dechiffrement »', r.motif, 'dechiffrement'); }
  { const b = banc({ dechiffrementCasse: true, gzip: false, reponse: { status: 200, j: { ok: true, iv: 'IV', enc: 'OPAQUE', z: 1 } } });
    const r = await b.ctx.pieceLire(ID);
    /* Un Safari d'avant 16.4 déchiffre parfaitement et ne sait pas décompresser. La cause est
       CERTAINE (z posé ET la fonction manque), donc on la nomme au lieu de dire « abîmé ». */
    v('⛔ navigateur sans décompression : la cause est NOMMÉE', r.motif, 'sans-decompression'); }
  { const b = banc({});
    const r = await b.ctx.pieceLire('pas-un-identifiant');
    v('un identifiant qui n\'en est pas → inconnu, sans appeler le serveur', r.inconnu, true);
    v('… et rien n\'a été envoyé', b.envois.length, 0); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
