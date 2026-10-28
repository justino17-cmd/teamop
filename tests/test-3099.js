/* ⛔ CE QUE CE FICHIER GARDE — LA FONCTION D'UN CONTACT SOUS SON NOM, DANS LA LISTE ET L'EN-TÊTE D'OP MESSAGES (28 octobre 2026).

   Le patron, devant la liste de ses seize agents dans OP MESSAGES : « le nom de l'agent et les fonctions, genre Théo il fait quoi, qui gère quoi, comme ça je suis pas perdu ».
   Le pont range déjà le RÔLE d'un agent dans le statut de sa personne-robot (« Sauvegardes et données ») ; Contacts l'affichait, la liste des conversations non. Trois morceaux,
   chacun joué pour de vrai :
     1. le SERVICE (le vrai `stockage.js`) : la liste des conversations rend `autre.statut` pour une directe — sans une requête de plus par ligne ;
     2. le MODULE de la page (la vraie `resume()` de `source-serveur.js`) : `sousTitre` = ce statut, borné à 80 signes, vide pour un groupe, un compte supprimé, une invitation ;
     3. la PAGE (la vraie `ligneConv()` de l'interface source, `apercu/opmessages/index.html`) : une ligne `conv-role` sous le nom, ÉCHAPPÉE, et rien quand il n'y a pas de fonction ;
        l'en-tête d'une conversation ouverte dit la fonction sous le nom ; la feuille garde la hauteur de la ligne (l'aperçu passe sur une ligne).
   Et la page SERVIE (`server-msg/public/`) porte la même chose : le générateur a été rejoué.
   ⛔ Les trois morceaux sont dans trois fichiers que rien ne relie à l'exécution : c'est exactement la couture que ce dépôt a déjà payée (« chacune était juste, et elles ne se parlaient pas »). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const RACINE = T.RACINE;
const SRC = fs.readFileSync(path.join(T.SERVICE, 'public/source-serveur.js'), 'utf8');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const SERVI_HTML = fs.readFileSync(path.join(T.SERVICE, 'public/index.html'), 'utf8');
const SERVI_JS = fs.readFileSync(path.join(T.SERVICE, 'public/opmsg-ui.js'), 'utf8');
/* une fonction découpée à ses accolades, depuis sa déclaration : la même fonction que la page exécute, jamais une copie */
const fn = (texte, nom) => { const i = texte.indexOf('function ' + nom + '('); if (i < 0) return ''; let d = 0, j = texte.indexOf('{', i); for (; j < texte.length; j++) { if (texte[j] === '{') d++; else if (texte[j] === '}') { d--; if (!d) break; } } return texte.slice(i, j + 1); };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ROLE = 'Sauvegardes et données';

(async () => {
  console.log('── test-3099 · la fonction d’un contact sous son nom (liste et en-tête) ──');

  /* ── 1 · le service : `autre.statut` dans la liste ── */
  console.log('\n1. Le vrai stockage : la liste d’une directe porte le statut de l’autre');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3099-'));
    process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {} });
    const h = { t: 1790000000000 };
    const S = ouvrir({ chemin: path.join(bac, 'msg.db'), scelleur: creerScelleur(crypto.randomBytes(32)), horloge: () => h.t });
    const pers = nom => S.personneCreer({ identifiant: 'beta:' + nom, prenom: nom, nom: 'Test', origine: 'beta', verifie: true });
    const justin = pers('JustinQX'), theo = pers('TheoQX'), muet = pers('MuetQX');
    S.personneMaj(theo.id, { statut: ROLE });
    const d1 = S.convDirecteObtenir(justin.id, theo.id).id, d2 = S.convDirecteObtenir(justin.id, muet.id).id;
    S.messageEnvoyer({ conv: d1, auteur: theo.id, cid: 'cidQXtheo0001', type: 'texte', texte: 'Sauvegarde ok' });
    S.messageEnvoyer({ conv: d2, auteur: muet.id, cid: 'cidQXmuet0001', type: 'texte', texte: 'Bonjour' });
    const g = S.convCreerGroupe({ createur: justin.id, nom: 'GroupeQX', membres: [theo.id] });
    const l = S.convListe(justin.id);
    v('(population) trois conversations : deux directes et un groupe', [l.length, l.filter(x => x.type === 'direct').length], [3, 2]);
    const lt = l.find(x => x.id === d1), lm = l.find(x => x.id === d2), lg = l.find(x => x.id === (g.id || g.conv || g));
    v('⛔ la directe avec l’agent porte SON statut (le rôle que le pont y range)', lt && lt.autre && lt.autre.statut, ROLE);
    v('une personne sans statut : une chaîne vide, jamais undefined (la page concatène)', lm && lm.autre && lm.autre.statut, '');
    vrai('un groupe n’a pas d’« autre »', !!lg && !lg.autre);
    /* la même personne, vue par l'autre bout : Théo voit le statut de Justin (vide), pas le sien */
    const lt2 = S.convListe(theo.id).find(x => x.id === d1);
    v('vu de l’agent : le statut de Justin (vide), pas le sien', lt2 && lt2.autre && [lt2.autre.id === justin.id, lt2.autre.statut], [true, '']);
  }

  /* ── 2 · le module de la page : `sousTitre` ── */
  console.log('\n2. La vraie resume() de source-serveur.js : sousTitre = le statut, borné, vide quand il le faut');
  {
    const corps = fn(SRC, 'resume');
    vrai('(population) la fonction resume(c) est trouvée dans source-serveur.js', corps.length > 400);
    const ctx = {
      noter: () => {}, nomComplet: p => (p.prenom + ' ' + (p.nom || '')).trim(), NOM_SUPPRIME: 'Compte supprimé', texteSysteme: () => 'ligne', estMoi: () => false, prenomDe: () => 'X',
      convs: new Map(), supprimesIds: new Set(), initialesDe: n => n.slice(0, 2).toUpperCase(), indexAvatar: () => 0, photoPiece: () => null, themeDe: () => null, moiApi: { id: 'moi' },
      enLigne: new Set(), enReunion: new Set(), maintenant: () => 1790000000000, apercuPiece: () => '', Array, Object, String, Number, Math, JSON,
    };
    vm.createContext(ctx);
    vm.runInContext(corps + '\nthis.resume = resume;', ctx, { timeout: 3000 });
    const base = { id: 'c1', type: 'direct', dernier_seq: 1, dernier_ts: 1, non_lus: 0, role: 'membre', muet_jusqua: 0 };
    const r1 = ctx.resume(Object.assign({}, base, { autre: { id: 'p1', prenom: 'Théo', nom: 'Test', avatar: null, statut: ROLE } }));
    v('⛔ une directe : sousTitre = le statut de l’autre', r1.sousTitre, ROLE);
    const r2 = ctx.resume(Object.assign({}, base, { autre: { id: 'p1', prenom: 'Théo', nom: 'Test', avatar: null, statut: '  trop   d’espaces  ' + 'x'.repeat(200) } }));
    v('borné à 80 signes, espaces repliés', [r2.sousTitre.length, /\s\s/.test(r2.sousTitre)], [80, false]);
    const r3 = ctx.resume(Object.assign({}, base, { autre: { id: 'p1', prenom: 'Théo', nom: 'Test', avatar: null, statut: '' } }));
    v('sans statut : vide', r3.sousTitre, '');
    const r4 = ctx.resume(Object.assign({}, base, { type: 'groupe', nom: 'Équipe', autre: null }));
    v('un groupe : vide', r4.sousTitre, '');
    const r5 = ctx.resume(Object.assign({}, base, { autre: { id: 'p1', prenom: 'Théo', nom: 'Test', avatar: null, statut: ROLE, supprime: true } }));
    v('un compte supprimé : vide (on ne dit plus rien de lui)', r5.sousTitre, '');
    const r6 = ctx.resume(Object.assign({}, base, { invitation: 'recue', autre: { id: 'p1', prenom: 'Théo', nom: '', avatar: null, statut: ROLE } }));
    v('une invitation : vide (l’invité n’en sait pas plus que la fiche)', r6.sousTitre, '');
    const r7 = ctx.resume(Object.assign({}, base, { autre: { id: 'p1', prenom: 'Théo', nom: 'Test', avatar: null } }));
    v('un service d’avant (pas de champ statut) : vide, pas « undefined »', r7.sousTitre, '');
  }

  /* ── 3 · la page : ligneConv et l'en-tête ── */
  console.log('\n3. La vraie ligneConv() de l’interface : la fonction sous le nom, échappée, absente quand il n’y en a pas');
  {
    const corps = fn(PAGE, 'ligneConv');
    vrai('(population) ligneConv(c, neuve) est trouvée dans apercu/opmessages/index.html', corps.length > 400);
    const ctx = {
      etat: { conv: null, selection: null, listeArchives: false }, enSourdine: () => false, icone: () => '<svg></svg>', CHEVRON: '<svg class="chev"></svg>', esc,
      avatar: () => '<span class="avatar"></span>', nomConv: c => c.nom, libelleListe: () => '15:35', autreCote: () => false, coteDe: () => 'pro', NOM_COTE: { pro: 'Pro', perso: 'Perso' }, Number, String,
    };
    vm.createContext(ctx);
    vm.runInContext(corps + '\nthis.ligneConv = ligneConv;', ctx, { timeout: 3000 });
    const h1 = ctx.ligneConv({ id: 'c1', type: 'direct', nom: 'Théo', apercu: 'Sauvegarde ok', t: 1, nonLu: false, sousTitre: ROLE }, false);
    vrai('⛔ la ligne porte <span class="conv-role">…</span> avec la fonction', h1.includes('<span class="conv-role">' + ROLE + '</span>'));
    vrai('…placée APRÈS la ligne du nom et AVANT l’aperçu (sous le nom)', h1.indexOf('conv-nom') < h1.indexOf('conv-role') && h1.indexOf('conv-role') < h1.indexOf('conv-apercu'));
    const h2 = ctx.ligneConv({ id: 'c2', type: 'direct', nom: 'Max', apercu: '', t: 1, nonLu: false, sousTitre: '' }, false);
    vrai('sans fonction : aucun conv-role (pas de ligne vide)', !h2.includes('conv-role'));
    const h3 = ctx.ligneConv({ id: 'c3', type: 'direct', nom: 'X', apercu: '', t: 1, nonLu: false, sousTitre: '<b onmouseover=x>Rôle</b> & "fin"' }, false);
    vrai('⛔ la fonction est ÉCHAPPÉE : un statut écrit par une personne ne devient jamais du HTML', !h3.includes('<b onmouseover') && h3.includes('&lt;b onmouseover=x&gt;Rôle&lt;/b&gt; &amp; &quot;fin&quot;'));
    const h4 = ctx.ligneConv({ id: 'c4', type: 'groupe', nom: 'Équipe', apercu: 'x', t: 1, nonLu: false }, false);
    vrai('un groupe (pas de sousTitre) : aucun conv-role', !h4.includes('conv-role'));
    /* l'en-tête de la conversation ouverte */
    vrai('⛔ l’en-tête d’une conversation ouverte dit la fonction sous le nom (conv-titre-role, échappée)', /\$\('conv-titre'\)\.innerHTML = [^\n]*\(c\.sousTitre \? '<span class="conv-titre-role">' \+ esc\(c\.sousTitre\) \+ '<\/span>' : ''\)/.test(PAGE));
    /* la feuille */
    const css = PAGE.slice(0, PAGE.indexOf('</style>'));
    vrai('la feuille dessine .conv-role sur UNE ligne coupée (nowrap + ellipsis)', /\.conv-role\s*\{[^}]*white-space:\s*nowrap[^}]*\}/.test(css) && /\.conv-role\s*\{[^}]*text-overflow:\s*ellipsis[^}]*\}/.test(css));
    vrai('…et ramène l’aperçu à une ligne quand la fonction est là (la hauteur de la ligne ne saute pas)', /\.conv-corps:has\(\.conv-role\) \.conv-apercu\s*\{\s*-webkit-line-clamp:\s*1;?\s*\}/.test(css));
    vrai('…et dessine .conv-titre-role dans l’en-tête', /\.conv-titre-role\s*\{[^}]*text-overflow:\s*ellipsis[^}]*\}/.test(css));
  }

  /* ── 4 · la page SERVIE porte la même chose (le générateur a tourné) ── */
  console.log('\n4. Ce que le service SERT est à jour');
  {
    vrai('⛔ opmsg-ui.js (servi) porte la ligne conv-role de ligneConv', SERVI_JS.includes('(c.sousTitre ? \'<span class="conv-role">\' + esc(c.sousTitre) + \'</span>\' : \'\')'));
    vrai('…et l’en-tête conv-titre-role', SERVI_JS.includes('<span class="conv-titre-role">'));
    vrai('index.html (servi) porte les trois règles', /\.conv-role\s*\{/.test(SERVI_HTML) && /\.conv-corps:has\(\.conv-role\)/.test(SERVI_HTML) && /\.conv-titre-role\s*\{/.test(SERVI_HTML));
    vrai('source-serveur.js ne lit le statut que d’une DIRECTE non supprimée et sans invitation (le motif du code)', /sousTitre: direct && c\.autre && !supprime && !c\.invitation && typeof c\.autre\.statut === 'string'/.test(SRC));
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });
