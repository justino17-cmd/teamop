/* ══ OP MESSAGES, ÉTAPE 2 — LA CONVERSATION, LE MODULE DE DONNÉES, L'ÉCHAPPEMENT ══════════════════════════════════════════════════
   Complète `tests/test-856.js` (la page contre son document : jetons, verre, typographie, rien de l'extérieur). Celui-ci garde ce que l'étape 2 a ajouté :

   1. LA CONVERSATION CONTRE SON DOCUMENT — bulles 17/22, rayons 20/6, photos 118 × 88, vocal à 10 barres, « Lu », saisie à trois points, champ « Message » :
      les valeurs du paquet (THEME + la maquette) sont relues et comparées au CSS de la page ;
   2. L'ÉCHAPPEMENT — la VRAIE fonction `esc` est extraite de la page et EXÉCUTÉE sur des chaînes piégées (« les fonctions réelles, pas leur texte ») ; et aucun
      texte venu d'une personne ne s'écrit dans le balisage sans elle ;
   3. LA SOURCE EST LE SEUL POINT D'ACCÈS — la page ne lit ni n'écrit aucune donnée, elle appelle `window.OPMSG_SOURCE` ; et le MODULE `source.js` est exécuté
      pour de bon (un bac à sable `vm`, une horloge posée) : ce qu'il rend est une COPIE, ce qu'il refuse est refusé, ce qu'il dit aux écouteurs est dit ;
   4. L'HISTORIQUE — « UN GESTE, UNE NAVIGATION » (CLAUDE.md) : une entrée poussée par couche ouverte, rendue par couche fermée, aucun écouteur de balayage ;
   4 bis. LE « + » (5 octobre 2026) — « Nouvelle discussion » : la VRAIE fonction `ndModele` extraite et exécutée (actions selon les capacités, fréquents, A–Z, recherche), le passage d'une feuille à l'autre par
      REMPLACEMENT (un retour = une fois), l'index, les cibles ; les gestes sont joués par `tests/sonde-opmessages-plus.js`, la couture avec le vrai service par `tests/test-995.js` ;
   5. LES REPÈRES PHYSIQUES — champ ≥ 16 px, boutons nommés, bulles à 78 %, aucune boîte centrée par left:50% + translate(-50%).

   ⛔ ET LA CONTRE-ÉPREUVE EST LA MESURE : chaque garde est ÉPROUVÉE en la remettant en défaut sur une COPIE (en mémoire, jamais l'arbre). La liste des
   mutations est dans `tests/mutations-opmessages.js` ; celles qu'un navigateur est seul à voir y portent `sonde: true` et sont jouées par son lanceur contre
   `tests/sonde-opmessages.js`. Une mutation dont le motif ne trouve rien est dite MAL VISÉE, jamais comptée.
   ⛔ Un motif de banc vise du CODE, jamais une phrase : les commentaires sont retirés avant de chercher (CLAUDE.md, trois fois le 19 septembre 2026). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const { MUTATIONS, appliquer } = require('./mutations-opmessages.js');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

const sansCommentairesCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ dans du JS : on ne retire que ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace */
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const ech = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regle = (css, sel) => { const re = new RegExp('(?:^|\\n)[ \\t]*' + ech(sel) + '\\s*\\{([^}]*)\\}', 'g'); let o = ''; for (const m of css.matchAll(re)) o += m[1] + ';\n'; return o; };
const prop = (corps, p) => { const m = new RegExp('(?:^|[;\\s])' + ech(p) + '\\s*:\\s*([^;]+)').exec(corps); return m ? m[1].trim().replace(/\s+/g, ' ') : null; };

/* ── charger le module de données dans un bac à sable : une horloge posée, les minuteries sous contrôle ── */
function chargerSource(SRC) {
  const ctx = { console, module: { exports: {} }, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { timeout: 3000 });
  return ctx.module.exports.creerSourceApercu;
}
const rejet = async p => { try { await p; return null; } catch (e) { return e && e.code; } };

async function controler(PAGE, SRC, DOC) {
  const R = [];
  const v = (t, a, b) => R.push([t, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) !== JSON.stringify(b) ? '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a) : '']);
  const vrai = (t, c, d) => R.push([t, !!c, c ? '' : (d ? '\n      ' + d : '')]);

  const style = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
  const CSS = sansCommentairesCss(style);
  const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
  const JS = sansCommentairesJs(script);
  /* ⛔ 7 octobre 2026 : un commentaire `//` posé au milieu d'une ligne a avalé le `finally` qui la suivait — la page entière ne démarrait plus (plus d'écran de connexion), et les
     178 contrôles de ce banc passaient : ils lisent le TEXTE. Le script se COMPILE d'abord ; l'erreur dit où. */
  { let err = ''; try { new (require('vm').Script)(script, { filename: 'page.js' }); } catch (e) { err = String(e && e.message) + ' — ' + String((e && e.stack) || '').split('\n')[0]; }
    R.push(['⛔ le script de la page se COMPILE (une erreur de syntaxe éteint toute l\'application, et aucun motif ne la voit)', !err, err ? '\n      ' + err : '']); }
  const SRCJS = sansCommentairesJs(SRC);
  const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const corps = nom => { const i = JS.indexOf(nom); if (i < 0) return ''; const f = JS.slice(i).search(/\n  (?:async )?function |\n  \/\* ═══|\n  \$\(/); return JS.slice(i, f > 0 ? i + f : i + 4000); };

  /* 1. LA CONVERSATION CONTRE SON DOCUMENT ───────────────────────────────────────────────────────────────────────────────── */
  vrai('(population) le script de la page est lu (' + JS.length + ' caractères), la feuille (' + CSS.length + '), le module de données (' + SRCJS.length + ')', JS.length > 20000 && CSS.length > 15000 && SRCJS.length > 3000);
  vrai('le document porte ce que la conversation reprend : « bulles 17/22 », « photos 118×88 », « bulles 20/6 px », l\'avatar de 44, « Lu 14:06 », la saisie, le champ « Message » + flèche',
    ['bulles 17/22', 'photos 118×88', 'bulles 20/6 px', 'avatar 44', 'Lu 14:06', 'indicateur de saisie', 'champ « Message » + flèche'].every(t => DOC.includes(t)));
  const bulle = regle(CSS, '.bulle');
  v('bulle : 17 px sur 22, interlettrage -.02em, 78 % de la colonne au plus (document : « bulles 17/22 (-.02em) » ; maquette : max-width 78 %)',
    [prop(bulle, 'font-size'), prop(bulle, 'line-height'), prop(bulle, 'letter-spacing'), prop(bulle, 'max-width')], ['17px', '22px', '-.02em', '78%']);
  v('bulles : reçue 20/20/20/6 sur --bubble-in / --bubble-in-fg, envoyée 20/20/6/20 sur --fill avec l\'encre --on-fill (document : « bulles 20/6 px »)',
    [prop(regle(CSS, '.recue'), 'border-radius'), prop(regle(CSS, '.recue'), 'background'), prop(regle(CSS, '.recue'), 'color'), prop(regle(CSS, '.envoyee'), 'border-radius'), prop(regle(CSS, '.envoyee'), 'background'), prop(regle(CSS, '.envoyee'), 'color')],
    ['20px 20px 20px 6px', 'var(--bubble-in)', 'var(--bubble-in-fg)', '20px 20px 6px 20px', 'var(--fill)', 'var(--on-fill)']);
  vrai('la bulle garde les retours à la ligne (white-space: pre-wrap) et coupe un mot sans espace (overflow-wrap: anywhere) — « pre-wrap »', prop(bulle, 'white-space') === 'pre-wrap' && prop(bulle, 'overflow-wrap') === 'anywhere');
  const ph = regle(CSS, '.photo');
  v('photo : une vignette de 118 × 88, rayon 14 (document : « photos 118×88 »)', [prop(ph, 'width'), prop(ph, 'height'), prop(ph, 'border-radius')], ['118px', '88px', '14px']);
  v('vocal : pilule de rayon 20, disque de lecture de 28, barres de 3 px (rayon 2), durée en 13 px',
    [prop(regle(CSS, '.recue'), 'border-radius') !== null, prop(regle(CSS, '.vocal-disque'), 'width'), prop(regle(CSS, '.onde i'), 'width'), prop(regle(CSS, '.onde i'), 'border-radius'), prop(regle(CSS, '.vocal-duree'), 'font-size')], [true, '28px', '3px', '2px', '13px']);
  const onde = (/\[(\d+(?:,\s*\d+){9})\]\)\.map\(n => '<i style="height:/.exec(JS) || [, ''])[1].replace(/\s/g, '');
  const ondeSrc = (/const ONDE = \[([^\]]*)\]/.exec(SRCJS) || [, ''])[1].replace(/\s/g, '');
  v('la forme d\'onde est celle de la maquette : 10 barres de 8, 14, 18, 10, 16, 6, 12, 18, 9, 14 px (dans la page ET dans les exemples)', [onde, ondeSrc], ['8,14,18,10,16,6,12,18,9,14', '8,14,18,10,16,6,12,18,9,14']);
  v('légendes : datage 11 px / 600, nom d\'auteur et statut 11 px (rien sous 11)', [prop(regle(CSS, '.datage, .systeme'), 'font-size'), prop(regle(CSS, '.datage'), 'font-weight'), prop(regle(CSS, '.msg-nom'), 'font-size'), prop(regle(CSS, '.statut'), 'font-size')], ['11px', '600', '11px', '11px']);
  v('barre de navigation : avatar de 44, nom en 12, badge de 12 px / 600 sur --fill (document : « avatar 44 centré + nom »)',
    [prop(regle(CSS, '.conv-titre .avatar'), 'width'), prop(regle(CSS, '.conv-titre-nom'), 'font-size'), prop(regle(CSS, '.badge'), 'font-size'), prop(regle(CSS, '.badge'), 'font-weight'), prop(regle(CSS, '.badge'), 'background')], ['44px', '12px', '12px', '600', 'var(--fill)']);
  const pt = regle(CSS, '.saisie-ind i');
  v('indicateur de saisie : trois points de 7 px, 1,2 s, décalés de .2 et .4 s ; la bulle de saisie est un coin à 6 (maquette)', [prop(pt, 'width'), prop(pt, 'animation'), prop(regle(CSS, '.saisie-ind i:nth-child(2)'), 'animation-delay'), prop(regle(CSS, '.saisie-ind i:nth-child(3)'), 'animation-delay'), prop(regle(CSS, '.saisie-ind'), 'border-radius')],
    ['7px', 'saisie 1.2s infinite', '.2s', '.4s', '20px 20px 20px 6px']);
  v('barre de saisie : « + » de 34 sur --field, flèche de 28 sur --fill, pilule de 36 (18 de rayon) sur --input-bg, police 17 px', [prop(regle(CSS, '.compo-plus .disque'), 'width'), prop(regle(CSS, '.compo-plus .disque'), 'background'), prop(regle(CSS, '.envoyer .disque'), 'width'), prop(regle(CSS, '.envoyer .disque'), 'background'), prop(regle(CSS, '.pilule-saisie'), 'min-height'), prop(regle(CSS, '.pilule-saisie'), 'border-radius'), prop(regle(CSS, '.pilule-saisie'), 'background'), prop(regle(CSS, '.pilule-saisie textarea'), 'font-size')],
    ['34px', 'var(--field)', '28px', 'var(--fill)', '36px', '18px', 'var(--input-bg)', '17px']);
  vrai('⛔ un champ de saisie fait 16 px au moins (Safari zoome la page en dessous) : le champ « Message » est à 17 px, et le contrôle des champs du balisage passe', /\.pilule-saisie textarea\s*\{[^}]*font-size:\s*17px/.test(CSS));
  v('au doigt, la zone qui répond fait 44 px (boutons de saisie, champ, retour, caméra)', [prop(regle(CSS, '.compo-bouton'), 'width'), (/@media \(pointer: coarse\) \{[^@]*\.compo-bouton \{ width: (\d+)px; height: (\d+)px;/.exec(CSS) || []).slice(1, 3).join('x'), parseFloat(prop(regle(CSS, '.conv-retour'), 'min-height')) >= 44, parseFloat(prop(regle(CSS, '.conv-cam'), 'min-height')) >= 44],
    ['36px', '44x44', true, true]);
  vrai('verre : la barre de navigation et la barre de saisie déclarent le flou ET leur surface (--nav-bar) ET le jumeau -webkit-', ['.conv-nav', '.composer'].every(s => /-webkit-backdrop-filter/.test(regle(CSS, s)) && /(^|[;\s])backdrop-filter/.test(regle(CSS, s)) && /background:\s*var\(--nav-bar\)/.test(regle(CSS, s))));
  vrai('les deux barres portent data-glass (la transparence réduite les remplace par un aplat)', /<header class="conv-nav" data-glass="1">/.test(HTML) && /<footer class="composer" data-glass="1">/.test(HTML));
  vrai('⛔ aucune boîte absolue centrée par left:50% + translate(-50%) (elle ne prend que la moitié de son cadre) — hors la fenêtre à largeur FIXE de la feuille',
    ![...CSS.matchAll(/\{([^{}]*)\}/g)].some(m => /left:\s*50%/.test(m[1]) && /translate\(-50%|translateX\(-50%/.test(m[1]) && !/width:\s*520px/.test(m[1])));

  const csp = (/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(PAGE) || [, ''])[1];
  vrai('la politique du navigateur permet de réécouter son propre vocal (media-src blob:) et rien d\'autre qu\'elle-même : aucun connect-src, aucune adresse', /default-src 'none'/.test(csp) && /media-src blob:(;|$)/.test(csp) && !/connect-src/.test(csp) && !/https?:|\*/.test(csp), csp);
  vrai('(a) la liste CONSOMME le drapeau « neuve » à chaque rendu (une ligne ne rejoue son entrée qu\'UNE fois, pas à chaque frappe dans la recherche)', /const neuves = new Set\(etat\.neuves\); etat\.neuves\.clear\(\);/.test(JS));
  /* 2. L'ÉCHAPPEMENT — la VRAIE fonction, exécutée ──────────────────────────────────────────────────────────────────────────── */
  const defEsc = (/^[ \t]*const esc = (s => [^\n]+);?$/m.exec(JS) || [, ''])[1];
  let esc = null; try { esc = defEsc ? new Function('return ' + defEsc.replace(/;\s*$/, ''))() : null; } catch (e) { esc = null; }
  vrai('(population) la fonction esc est extraite de la page', typeof esc === 'function', defEsc);
  const PIEGES = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '"><svg onload=alert(1)>', '\' onmouseover=\'alert(1)', '&lt;b&gt;gras&lt;/b&gt;', 'a & b < c > d "e" \'f\'', '</span><b>', 'javascript:alert(1)', '${1+1} `x`', ''];
  const decoder = s => s.replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  if (esc) {
    const dehors = PIEGES.map(p => esc(p)).filter(e => /[<>"']/.test(e));
    v('esc() exécuté sur ' + PIEGES.length + ' chaînes piégées : plus un « < > " \' » ne survit', dehors, []);
    v('esc() exécuté : rien ne se perd — chaque chaîne se retrouve à l\'identique en la décodant', PIEGES.filter(p => decoder(esc(p)) !== p), []);
    v('esc() exécuté : ni null, ni nombre, ni objet ne fait jeter (une donnée mal formée s\'affiche, elle ne casse pas l\'écran)', [esc(null), esc(42), esc(undefined)], ['null', '42', 'undefined']);
    v('esc() exécuté : on n\'échappe qu\'UNE fois (« &amp; » devient « &amp;amp; », pas « &amp; »)', esc('&amp;'), '&amp;amp;');
  } else for (const t of ['esc() exécuté sur des chaînes piégées', 'esc() exécuté : rien ne se perd', 'esc() exécuté : ni null, ni nombre', 'esc() exécuté : on n\'échappe qu\'UNE fois']) vrai(t, false);
  /* ⛔ ET AUCUN TEXTE VENU D'UNE PERSONNE NE S'ÉCRIT SANS ELLE : on cherche le CODE (une concaténation nue), pas une phrase */
  const nus = [...JS.matchAll(/\+\s*(m\.texte|c\.nom|c\.court|c\.apercu|c\.id|c\.initiales|m\.id|p\.url|m\.vocal\.url|G\.nom|c\.role|nomAuteur\([^)]*\)|prenom\([^)]*\))\s*\+/g)].map(m => m[1]);
  v('(population) ' + (JS.match(/esc\(/g) || []).length + ' appels à esc() dans la page — aucun texte d\'une bulle, d\'un nom ou d\'un aperçu n\'est concaténé SANS esc() (« sans esc »)', nus, []);
  /* (le texte d'une bulle passe par `texteMentions`, qui l'échappe MORCEAU PAR MORCEAU — exécutée plus bas, § « les mentions ») */
  vrai('le texte d\'une bulle et l\'aperçu de la liste passent par esc() (la bulle par `texteRiche` → `texteMentions` → esc, ses liens compris — section des mentions)', /'<span class="bulle ' \+ sens \+ '" dir="auto">' \+ texteRiche\(m\.texte, c\) \+ '<\/span>'/.test(JS) && /return h \+ texteMentions\(s\.slice\(i\), c\);/.test(JS) && /if \(s\.indexOf\('@'\) < 0 \|\| !multi\(c\)\) return esc\(s\);/.test(JS) && /esc\(c\.apercu\)/.test(JS) && /esc\(c\.nom\)/.test(JS) && /esc\(m\.texte\)/.test(JS));
  vrai('⛔ ni innerHTML ni insertAdjacentHTML ne reçoit directement la valeur d\'un champ (le texte tapé n\'arrive jamais qu\'en value ou par esc)', !/innerHTML\s*=\s*[^;]*\.value\b/.test(JS) && !/insertAdjacentHTML\([^)]*\.value\b/.test(JS) && !/\$\('saisie'\)\.innerHTML/.test(JS));
  vrai('une adresse d\'image n\'entre dans le balisage que si elle commence par blob: (aucune adresse venue d\'ailleurs), et passe par esc()', /const blob = u => typeof u === 'string' && \/\^blob:https\?:/.test(JS) && /blob\(p\.url\)/.test(JS) && /blob\(c\.photo\)/.test(JS));
  {
    /* ⛔ `blob()` N'ACCEPTE QU'UNE VRAIE ADRESSE `blob:` (relecture du gardien, remarque 6) : une chaîne qui COMMENCE par « blob: » passait, et `esc()` laisse passer les parenthèses —
       venue du service, une « photo » aurait fermé le `url(…)` d'un avatar et injecté du CSS. On EXÉCUTE la fonction réelle sur des adresses vraies et piégées. */
    const m = /const blob = (u => [^\n]*?\.test\(u\));/.exec(JS);
    vrai('population : la fonction blob() est trouvée dans la page', !!m);
    const blob = m ? new Function('return ' + m[1])() : () => null;
    v('⛔ une vraie adresse blob: (Chrome, Safari, Firefox, IPv6) passe', ['blob:http://127.0.0.1:8123/3f2b8c1e-9d4a-4b7e-8c21-5a6f7d8e9b0c', 'blob:https://teamop.fr/3f2b8c1e-9d4a-4b7e-8c21-5a6f7d8e9b0c', 'blob:http://[::1]:8080/3f2b8c1e-9d4a-4b7e-8c21-5a6f7d8e9b0c'].map(blob), [true, true, true]);
    v('⛔ des adresses piégées ne passent PAS (parenthèse, guillemet, espace, point-virgule, autre schéma, rien après le schéma)', ['blob:x', 'blob:http://a/b)', 'blob:http://a.fr/3f2b8c1e-9d4a);background:url(//evil/x', 'blob:http://a.fr/3f2b8c1e-9d4a"', 'blob:http://a.fr/3f2b8c1e 9d4a', 'blob:javascript:alert(1)', 'blob:', 'http://a.fr/3f2b8c1e-9d4a-4b7e', 'data:image/png;base64,AAAA', 12, null, undefined].map(blob), Array(12).fill(false));
  }

  /* 3. LA SOURCE EST LE SEUL POINT D'ACCÈS ─────────────────────────────────────────────────────────────────────────────────── */
  vrai('la page ne parle qu\'à window.OPMSG_SOURCE : listage, ouverture, envoi, lecture, création, écoute', ['lister', 'ouvrir', 'envoyer', 'marquerLu', 'creerGroupe', 'ecouter', 'moi', 'contacts'].every(m => new RegExp('source\\.' + m + '\\(').test(JS)));
  v('⛔ aucun écran n\'écrit l\'état directement : jamais messages.push, nonLu =, nonLus =, conversations.unshift/push/splice/sort, ni une affectation dans une conversation reçue (accès direct)',
    ['\\.messages\\.(?:push|unshift|splice|pop)', '\\.nonLus?\\s*=[^=]', 'etat\\.conversations\\.(?:unshift|push|splice|sort|pop|shift)\\b', 'etat\\.conversations\\[[^\\]]*\\]\\s*=[^=]', 'convDonnees\\.[a-z]+\\s*=[^=]', '\\bconvs\\b', 'OPMSG_creerSourceApercu'].filter(re => new RegExp(re).test(JS)), []);
  vrai('(population) l\'état de la page ne garde que des instantanés : la liste rendue par lister() et la conversation rendue par ouvrir()', /etat\.conversations = await source\.lister\(\)/.test(JS) && /c = await source\.ouvrir\(id\)/.test(JS));
  const ouvrir = corps('async function ouvrirConv');
  vrai('⛔ ouvrir une conversation la marque LUE : ouvrirConv appelle source.marquerLu(id) (le point non-lu de la liste tient à cet appel)', /await source\.marquerLu\(id\)/.test(ouvrir), ouvrir.slice(0, 120));
  vrai('la page se rafraîchit quand la source le dit (ecouter) — liste et conversation ouverte, rien d\'autre', /source\.ecouter\(ev => \{.{0,160}rafraichirListe\(\).{0,160}rafraichirConv\(\)/.test(JS.replace(/\n/g, ' ')));
  vrai('l\'envoi, la photo et le vocal ne partent que par source.envoyer (un seul appel, une seule porte)', (JS.match(/source\.envoyer\(/g) || []).length === 1 && /async function envoi\(brouillon, cible\)/.test(JS));
  vrai('le module de données ne touche ni au DOM ni à la page : aucun document, aucun window.location, aucun querySelector', !/\bdocument\b|\bquerySelector|\blocation\b|innerHTML/.test(SRCJS));
  vrai('le module dit en tête que c\'est LUI, et lui seul, qu\'on remplacera pour brancher le serveur (et que rien ne se range sur l\'appareil)', /LE SEUL ENDROIT/.test(SRC) && /remplacé par un module qui parle à ce serveur/.test(SRC.replace(/\s+/g, ' ')) && /rien n'est envoyé nulle part, rien n'est rangé/i.test(SRC.replace(/\s+/g, ' ')));

  /* le module EXÉCUTÉ ------------------------------------------------------------------------------------------------------- */
  let creer = null; try { creer = chargerSource(SRC); } catch (e) { creer = null; }
  vrai('(population) le module de données se charge dans un bac à sable (' + (creer ? 'oui' : 'NON') + ')', typeof creer === 'function');
  if (typeof creer === 'function') {
    let t = Date.UTC(2026, 9, 6, 12, 10), minuteries = []; const maintenant = () => t;
    const S = creer({ maintenant, planifier: (f, ms) => minuteries.push([f, ms]) });
    const evts = []; const desabo = S.ecouter(e => evts.push(e));
    const l0 = await S.lister();
    v('lister() : 6 conversations, du plus récent au plus ancien, dont 2 non lues (v1, v2) et 4 épinglées', [l0.length, l0.every((c, i) => i === 0 || l0[i - 1].t >= c.t), l0.filter(c => c.nonLu).map(c => c.id).sort(), l0.filter(c => c.epingle).length], [6, true, ['v1', 'v2'], 4]);
    const o = await S.ouvrir('v1');
    v('ouvrir(v1) : 6 messages datés d\'avant « maintenant », dans l\'ordre, et une saisie en cours', [o.messages.length, o.messages.every(m => m.t <= t), o.messages.every((m, i) => i === 0 || o.messages[i - 1].t <= m.t), !!o.saisie], [6, true, true, true]);
    v('ouvrir(inconnu) rend null (la page sait retomber sur la liste)', await S.ouvrir('zzz'), null);
    /* ce qu'on reçoit est une COPIE : le modifier ne change rien chez la source (copie) */
    o.messages[0].texte = 'MODIFIÉ'; o.messages.push({ id: 'x' }); o.membres.push('intrus');
    const l1 = await S.lister(); l1[0].nom = 'MODIFIÉ'; l1.find(c => c.id === 'v1').membres.push('intrus'); l1.find(c => c.id === 'v1').admins.push('intrus');
    const o2 = await S.ouvrir('v1'), l2 = await S.lister();
    v('copie : modifier ce que rend ouvrir() ou lister() (texte, liste de messages, membres, admins) ne change RIEN chez la source', [o2.messages.length, o2.messages[0].texte, o2.membres.length, l2.find(c => c.id === 'v1').membres.length, l2.find(c => c.id === 'v1').admins.length, l2[0].nom === 'MODIFIÉ'], [6, 'Tu peux m\'envoyer une photo du compteur ?', 4, 4, 1, false]);
    const c0 = S.contacts(); c0[0].nom = 'X'; v('copie : contacts() et moi() rendent des copies', [S.contacts()[0].nom, (() => { const m = S.moi(); m.nom = 'X'; return S.moi().nom; })()], ['Camille Roux', 'Alex Morel']);
    /* envoyer */
    t += 60000;
    const m1 = await S.envoyer('v3', { texte: '  \r\nBonjour\r\ntout le monde \n ' });
    v('envoyer(texte) : nettoyé (espaces de bord, CRLF → LF), de moi, daté de maintenant, non lu, rendu en copie', [m1.texte, m1.auteur, m1.t === t, m1.lu], ['Bonjour\ntout le monde', 'moi', true, null]);
    const l3 = await S.lister();
    v('envoyer : la conversation REMONTE en tête, l\'aperçu dit « Vous : … », l\'heure est celle du message', [l3[0].id, l3[0].apercu, l3[0].t === t], ['v3', 'Vous : Bonjour tout le monde', true]);
    v('envoyer prévient les écouteurs : la conversation puis la liste (événements « conversation » et « liste »)', evts.slice(0, 2).map(e => e.type + (e.id ? ':' + e.id : '')), ['conversation:v3', 'liste']);
    v('envoyer refuse : vide (« vide »), blanc (« vide »), trop long (« trop-long »), inconnu (« introuvable »), groupe d\'annonces sans être admin (« interdit »)',
      [await rejet(S.envoyer('v3', {})), await rejet(S.envoyer('v3', { texte: '   ' })), await rejet(S.envoyer('v3', { texte: 'x'.repeat(4001) })), await rejet(S.envoyer('zzz', { texte: 'a' })), await rejet(S.envoyer('v5', { texte: 'a' }))],
      ['vide', 'vide', 'trop-long', 'introuvable', 'interdit']);
    v('envoyer accepte 4 000 signes pile, et rien de plus', [(await S.envoyer('v3', { texte: 'x'.repeat(4000) })).texte.length], [4000]);
    const mp = await S.envoyer('v2', { photos: Array.from({ length: 12 }, (_, i) => ({ url: 'blob:x' + i, w: 10, h: 10 })) });
    v('envoyer(photos) : 10 photos au plus, aperçu « 10 photos »', [mp.photos.length, (await S.lister()).find(c => c.id === 'v2').apercu], [10, 'Vous : 10 photos']);
    const mv = await S.envoyer('v2', { vocal: { url: 'blob:v', dur: 2.6, bars: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } });
    v('envoyer(vocal) : durée arrondie, 10 barres au plus, aperçu « Message vocal · 0:03 »', [mv.vocal.dur, mv.vocal.bars.length, (await S.lister())[0].apercu], [3, 10, 'Vous : Message vocal · 0:03']);
    v('envoyer(vocal de 0 s) refusé (« vide »)', await rejet(S.envoyer('v2', { vocal: { url: 'blob:v', dur: 0, bars: [] } })), 'vide');
    /* « Lu » : la source le simule, 1,5 s plus tard, et le DIT */
    const avant = evts.length; const f = minuteries.find(([, ms]) => ms === 1500);
    vrai('« Lu » : un envoi dans une conversation à plusieurs planifie la lecture à 1 500 ms', !!f, JSON.stringify(minuteries.map(x => x[1])));
    t += 1500; if (f) f[0]();
    const o3 = await S.ouvrir('v3');
    v('« Lu » : une fois la minuterie tombée, le dernier message envoyé porte son heure de lecture et les écouteurs sont prévenus', [o3.messages.filter(m => m.lu && m.auteur === 'moi').length >= 1, evts.length > avant], [true, true]);
    /* marquerLu */
    const e1 = evts.length;
    await S.marquerLu('v1');
    v('marquerLu(v1) : plus de non-lu, et la liste ET la conversation sont prévenues (événements)', [(await S.lister()).find(c => c.id === 'v1').nonLu, evts.slice(e1).map(e => e.type + (e.id ? ':' + e.id : ''))], [false, ['liste', 'conversation:v1']]);
    const e2 = evts.length; await S.marquerLu('v1');
    v('marquerLu une seconde fois ne dit rien (idempotent : aucun événement de plus)', evts.length, e2);
    /* creerGroupe */
    t += 1000;
    const g = await S.creerGroupe({ nom: '  Équipe test  ', membres: ['c1', 'c2', 'c2', 'zz'], photo: 'blob:p', annonces: true, ephemeres: 86400 });
    v('creerGroupe : nom nettoyé « Équipe test (3) » (membres dédoublés, inconnus écartés), de moi admin, annonces et éphémères gardés, photo, non lu, en tête de liste', [g.nom, g.court, g.membres, g.admins, g.annoncesSeulement, g.ephemeres, g.photo, g.nonLu, (await S.lister())[0].id === g.id], ['Équipe test (3)', 'Équipe test', ['moi', 'c1', 'c2'], ['moi'], true, 86400, 'blob:p', true, true]);
    const og = await S.ouvrir(g.id);
    v('creerGroupe : son premier message est un message système « Vous avez créé le groupe · Camille, Mathis », et l\'aperçu de la liste le reprend', [og.messages.length, !!og.messages[0].systeme, og.messages[0].texte, g.apercu], [1, true, 'Vous avez créé le groupe · Camille, Mathis', 'Vous avez créé le groupe · Camille, Mathis']);
    v('creerGroupe sans nom devient « Nouveau groupe (n) » ; le nom est plafonné à 80 signes — UNE seule limite, celle du service (décision du 26 octobre 2026 : elle était de 40)', [(await S.creerGroupe({ nom: '   ', membres: ['c3'] })).court, (await S.creerGroupe({ nom: 'M'.repeat(100), membres: ['c3'] })).court.length, (await S.creerGroupe({ nom: 'M'.repeat(60), membres: ['c3'] })).court.length], ['Nouveau groupe', 80, 60]);
    v('creerGroupe sans membre refuse (« vide »), avec des membres inconnus aussi', [await rejet(S.creerGroupe({ nom: 'x', membres: [] })), await rejet(S.creerGroupe({ nom: 'x', membres: ['zz'] }))], ['vide', 'vide']);
    /* ecouter */
    desabo(); const e3 = evts.length; await S.marquerLu('v2'); await S.envoyer('v4', { texte: 'a' });
    v('ecouter : la fonction rendue DÉSABONNE (plus aucun événement après)', evts.length, e3);
    /* les noms et les formes */
    const tous = (await S.lister()).length;
    vrai('(population) ' + tous + ' conversations au total après les essais ; chaque résumé porte ses champs (id, type, nom, initiales, avatar, membres, admins, nonLu, apercu, t)', (await S.lister()).every(c => ['id', 'type', 'nom', 'court', 'initiales', 'avatar', 'epingle', 'membres', 'admins', 'annoncesSeulement', 'ephemeres', 'nonLu', 'nonLus', 'apercu', 't'].every(k => k in c)));
    const sans = creer({ maintenant, planifier: () => { throw new Error('ne doit pas planifier'); }, delaiLu: -1 });
    await sans.envoyer('v3', { texte: 'a' });
    vrai('delaiLu < 0 : aucune lecture simulée (un vrai serveur la dira lui-même)', true);
    /* ⚠️ simulerRecu : HORS CONTRAT, aperçu seulement — c'est ce qui permet d'éprouver ce que la page fait d'un message REÇU (jamais produit sans lui) */
    const S2 = creer({ maintenant, planifier: () => {}, delaiLu: -1 }); const ev2 = []; S2.ecouter(e => ev2.push(e.type + (e.id ? ':' + e.id : '')));
    const rRecu = await S2.simulerRecu('v3', { texte: 'Bien reçu' }, 'c3'); const lRecu = (await S2.lister()).find(c => c.id === 'v3');
    v('simulerRecu : un message d\'un AUTRE arrive (auteur c3), la conversation compte 1 non lu de plus, la conversation puis la liste sont prévenues', [rRecu.auteur, rRecu.texte, lRecu.nonLus, ev2], ['c3', 'Bien reçu', 1, ['conversation:v3', 'liste']]);
    v('simulerRecu : sans auteur, c\'est l\'autre membre d\'une conversation à deux ; une conversation inconnue est refusée (« introuvable »)', [(await S2.simulerRecu('v2', { texte: 'a' })).auteur, await rejet(S2.simulerRecu('zzz', {}))], ['c1', 'introuvable']);
  } else for (let i = 0; i < 6; i++) vrai('module de données exécuté (' + i + ')', false);

  /* 4. L'HISTORIQUE : UN GESTE, UNE NAVIGATION ───────────────────────────────────────────────────────────────────────────────── */
  vrai('⛔ une couche qu\'on ouvre POUSSE une entrée (history.pushState) ; une couche qu\'on ferme la RENDS (history.back), ou, sans entrée à rendre, remplace la route', /history\.pushState\(\{ opmsg: 1, n: h \? h\.n \+ 1 : 1, r, p: etat\.route \}, '', urlDe\(r\)\)/.test(JS) && /history\.back\(\)/.test(JS) && /history\.replaceState\(\{ opmsg: 1, n: h \? h\.n : 0/.test(JS));
  vrai('⛔ ouvrir une conversation, la feuille « Nouveau groupe » et la photo passent toutes par pousser() (une entrée par couche)', /function ouvrirDepuisListe[\s\S]*?pousser\(r\)/.test(JS) && /function ouvrirFeuille\(mode(?:, remplace)?\)[^\n]*pousser\(/.test(JS) && /pousser\(Object\.assign\(\{\}, etat\.route, \{ photo: p\.dataset\.photo \}\)\)/.test(JS));
  vrai('⛔ UN RETOUR, UNE FOIS : `history.back()` est asynchrone (la route ne change qu\'à popstate) — fermer une couche, rendre l\'entrée d\'une fiche, « Message » et le retour du Profil passent TOUS par rendreEntree(), qui note le retour en vol et ne le répète pas ; popstate le lève AVANT d\'appliquer la route. Les seuls autres history.back() défont l\'entrée qu\'un changement de FRAGMENT vient de poser (trois — le lien d\'un contact, l\'invitation d\'un espace, le lien d\'invité d\'une réunion —, chacun avec son popstate) [sonde des réunions, partie D : un seul retour, la page arrive sur l\'agenda]',
    /function rendreEntree\(\) \{\s*if \(retourEnVol\) return;\s*retourEnVol = true;[\s\S]{0,200}?history\.back\(\);\s*\}/.test(JS) && /window\.addEventListener\('popstate', \(\) => \{ retourEnVol = false;[^}]*\}\);\s*window\.addEventListener\('popstate', e => \{\s*menuAuRetour\(e\);\s*if \(e\.state && e\.state\.opmsg\) \{ appliquer\(/.test(JS)
      && (JS.match(/history\.back\(\)/g) || []).length === 4 && (JS.match(/rendreEntree\(\)/g) || []).length === 7);   // la septième (17 octobre 2026) : `menuEntreeRendre`, l'entrée du menu d'un message / du « + » que `fermerMenu` rend ; la cinquième (7 octobre 2026) : « ‹ Agenda » du Profil, qui rend l'entrée d'où l'on venait ; la sixième (12 octobre 2026) : « Annuler » d'« avant d'entrer » posée sur une fiche, qui rend la fiche
  vrai('le retour système (popstate) rejoue la route de l\'entrée — il ne ferme rien lui-même', /window\.addEventListener\('popstate', e => \{\s*menuAuRetour\(e\);\s*if \(e\.state && e\.state\.opmsg\) \{ appliquer\(/.test(JS));
  vrai('⛔ « UN GESTE, UNE NAVIGATION » : aucun écouteur de balayage à la page (touchmove, touchend, swipe) — le navigateur n\'a pas de second retour à jouer ; le seul touchstart est le vide qui réveille :active sur iOS', !/addEventListener\('touch(?:move|end|cancel)'|swipe|overscroll-behavior-x/.test(JS + CSS) && (JS.match(/addEventListener\('touchstart'/g) || []).length === 1 && /addEventListener\('touchstart', function \(\) \{\}, \{ passive: true \}\)/.test(JS));
  /* (7 octobre 2026) le menu déroulant et la demande « Envoyer à … ? » se ferment AVANT toute couche : la fenêtre du motif s'élargit, l'ORDRE des couches reste gardé */
  vrai('Échap ferme la couche du dessus : la photo, la feuille, un enregistrement, le mode « Modifier », la conversation (dans cet ordre — UNE couche par Échap)', /if \(e\.key !== 'Escape'\) return;[\s\S]{0,800}etat\.photo \|\| etat\.groupe\.ouvert[\s\S]{0,260}enr\.etat === 'enregistre'[\s\S]{0,200}else if \(etat\.selection\) \{ e\.preventDefault\(\); quitterSelection\(\);[\s\S]{0,200}else if \(etat\.conv\)/.test(JS)
    && (JS.match(/quitterSelection\(\); \$\('btn-modifier'\)\.focus/g) || []).length === 1);
  vrai('la liste recouverte devient inerte (inert) — sous la conversation ou sous un appel AFFICHÉ (réduit, il ne recouvre plus rien) — et la photo, la feuille ou l\'aperçu d\'envoi de photos rendent tout le fond inerte',
    /const couvre = !!etat\.appelId && !etat\.appelReduit;/.test(JS) && /\$\('contenu'\)\.inert = !!\(couvre \|\| \(etat\.conv && !largeBureau\.matches\)\)/.test(JS) && /\$\('app'\)\.inert = !!\(etat\.groupe\.ouvert \|\| etat\.photo \|\| etat\.menu \|\| ep\.ouvert\)/.test(JS));
  vrai('la liste revient à sa position : elle est notée à l\'ouverture et rendue à la fermeture', /etat\.scrollListe = window\.scrollY/.test(JS) && /window\.scrollTo\(0, etat\.scrollListe\)/.test(JS));
  vrai('la feuille et la conversation se ferment par le MÊME chemin (fermerCouche) : annuler, voile, retour, Échap, glissé', (JS.match(/fermerCouche\b/g) || []).length >= 6 && /function fermerFeuille\(garderPhoto\) \{[^}]*fermerCouche\(\)/.test(JS));

  /* 4 bis. LE « + » : « NOUVELLE DISCUSSION » (Justin, 5 octobre 2026 : « Il faudrait le + avec tout ce qu'on propose. ») ───────────────────────────────────
     La VRAIE fonction `ndModele` est EXTRAITE de la page et EXÉCUTÉE (rien du DOM : contacts, conversations, recherche → actions, fréquents, groupes A–Z) ; le reste
     se lit dans le CODE (commentaires retirés), et la sonde navigateur (`tests/sonde-opmessages-plus.js`) joue les gestes. */
  {
    const iND = JS.indexOf('const ND_ACTIONS = ['), fND = JS.indexOf('function rendreNouvelle()');
    vrai('(population) « Nouvelle discussion » : la table des actions et la fonction `ndModele` sont trouvées dans la page (' + (fND - iND) + ' caractères)', iND > 0 && fND > iND + 800);
    const nomNorme = (JS.match(/const norme = [^\n]+/) || [''])[0];
    const faireND = cap => {
      const ctx = { CAP: cap, console }; vm.createContext(ctx);
      vm.runInContext(nomNorme + '\n' + JS.slice(iND, fND) + '\nthis.ndModele = ndModele; this.ND_ACTIONS = ND_ACTIONS;', ctx, { timeout: 3000 });
      return ctx.ndModele;
    };
    let nd = null; try { nd = iND > 0 && fND > iND ? faireND({ liens: true, appels: true, reunions: true }) : null; } catch (e) { nd = null; }
    vrai('la fonction `ndModele` de la page s\'exécute dans un bac à sable', typeof nd === 'function');
    if (typeof nd === 'function') {
      const C = [{ id: 'z', nom: 'Zoé Vidal', role: '' }, { id: 'e', nom: 'Émile Garnier', role: 'En ligne' }, { id: 'b', nom: 'Bruno Petit', role: 'Sur un chantier' }, { id: 'b2', nom: 'Béatrice Roux', role: '' }, { id: 'n', nom: '3D Impression', role: '' }, { id: 'a', nom: 'Anaïs Lenoir', role: '' }];
      const L = [{ id: 'c1', type: 'groupe', nom: 'Équipe', autre: null, membres: ['moi', 'b2', 'a'] }, { id: 'c2', type: 'direct', autre: 'z' }, { id: 'c3', type: 'direct', autre: 'inconnu' }, { id: 'c4', type: 'canal', autre: null, membres: ['moi', 'n'] }, { id: 'c5', type: 'direct', autre: 'b' }, { id: 'c6', type: 'direct', autre: 'z' }, { id: 'c7', type: 'direct', membres: ['moi', 'e'] }];
      const M = nd(C, L, '');
      v('ndModele : les contacts sont rangés de A à Z, SANS tenir compte des accents ni de la casse (Émile avec les E, Anaïs avec les A), « # » en dernier', M.groupes.map(g => g.lettre + ':' + g.contacts.map(c => c.id).join('+')), ['A:a', 'B:b2+b', 'E:e', 'Z:z', '#:n']);
      v('ndModele : l\'index n\'a QUE les lettres qui existent', M.lettres, ['A', 'B', 'E', 'Z', '#']);
      v('ndModele : « Contacts fréquents » = les conversations À DEUX (jamais un groupe ni un canal), du plus récent au plus ancien, sans doublon, d\'un contact CONNU seulement', M.frequents.map(c => c.id), ['z', 'b', 'e']);
      const six = nd(Array.from({ length: 9 }, (_, i) => ({ id: 'k' + i, nom: 'Contact ' + i })), Array.from({ length: 9 }, (_, i) => ({ id: 'd' + i, type: 'direct', autre: 'k' + i })), '');
      v('ndModele : quatre « fréquents » au plus', six.frequents.map(c => c.id), ['k0', 'k1', 'k2', 'k3']);
      v('ndModele : les actions, dans l\'ordre du service — Nouveau groupe, Nouveau contact, Nouvel appel, Programmer une réunion — et RIEN d\'autre', M.actions.map(a => a[1]), ['Nouveau groupe', 'Nouveau contact', 'Nouvel appel', 'Programmer une réunion']);
      const sans = (cap) => faireND(cap)(C, L, '').actions.map(a => a[0]).join();
      v('ndModele : une capacité absente RETIRE sa ligne (sans liens : pas de « Nouveau contact » ; sans réunions : pas de « Programmer » ; sans appels : pas de « Nouvel appel »)', [sans({ liens: false, appels: true, reunions: true }), sans({ liens: true, appels: true, reunions: false }), sans({ liens: true, appels: false, reunions: true }), sans({})], ['groupe,appel,reunion', 'groupe,contact,appel', 'groupe,contact,reunion', 'groupe']);
      const R = nd(C, L, 'EMILE');
      v('ndModele : la recherche ignore accents et casse (« EMILE » trouve « Émile Garnier »), et ne laisse ni actions ni fréquents', [R.groupes.map(g => g.contacts.map(c => c.id).join()).join(), R.actions.length, R.frequents.length], ['e', 0, 0]);
      v('ndModele : la recherche filtre AUSSI les actions (« nouv » : trois, pas « Programmer » ; « réun » : une)', [nd(C, L, 'nouv').actions.map(a => a[0]).join(), nd(C, L, 'réun').actions.map(a => a[0]).join(), nd(C, L, 'nouv').total], ['groupe,contact,appel', 'reunion', 0]);
      v('ndModele : rien ne correspond → ni action, ni contact, ni groupe (l\'écran dit « Aucun résultat »)', (r => [r.actions.length, r.total, r.groupes.length])(nd(C, L, 'zzzz')), [0, 0, 0]);
      v('ndModele : un contact sans nom est écarté, une liste absente ne jette pas', [nd([{ id: 'x' }, null, { id: 'y', nom: 'Yann' }], null, '').total, nd(null, undefined, '').total], [1, 0]);
      const copie = JSON.stringify(C); nd(C, L, 'b'); vrai('ndModele ne MODIFIE pas la liste de contacts qu\'on lui donne (la source rend une copie, mais la page ne s\'y fie pas)', JSON.stringify(C) === copie);
    } else for (let i = 0; i < 10; i++) vrai('ndModele exécutée (' + i + ')', false);
    const ACTIONS_TXT = JS.slice(iND, JS.indexOf('function ndModele('));
    v('la table des actions : quatre lignes, ces libellés, et seulement eux', [...ACTIONS_TXT.matchAll(/\['(\w+)', '([^']+)'/g)].map(m => m[2]), ['Nouveau groupe', 'Nouveau contact', 'Nouvel appel', 'Programmer une réunion']);
    vrai('⛔ aucune « Communauté » ni « Diffusion » (nous ne les avons pas : on ne promet rien que le service ne tient pas), ni dans le code ni dans la feuille', !/Communaut|Diffusion/i.test(JS.slice(iND, fND) + HTML.slice(HTML.indexOf('id="nd-corps"'), HTML.indexOf('id="nd-corps"') + 900)));
    vrai('⛔ le « + » ouvre « Nouvelle discussion » (et plus directement « Nouveau groupe ») : bouton nommé, ancien bouton « Groupe » disparu', /<button type="button" class="btn-plus" id="btn-plus"[^>]*aria-label="Nouvelle discussion"/.test(HTML) && !/id="btn-groupe"/.test(HTML) && /\$\('btn-plus'\)\.addEventListener\('click', \(\) => ouvrirFeuille\('nouvelle'\)\)/.test(JS));
    vrai('« nouvelle » est une feuille VALIDE de la route (ouvrirFeuilleDom la reconnaît, sinon elle retombait sur « Nouveau groupe »), et son titre est « Nouvelle discussion »', /mode === 'appel' \|\| mode === 'info' \|\| mode === 'nouvelle' \|\|/.test(JS) && /nouv \? 'Nouvelle discussion'/.test(JS));
    const clic = JS.slice(JS.indexOf("$('nd-liste').addEventListener('click'"), JS.indexOf("$('nd-liste').addEventListener('click'") + 1200);
    vrai('⛔ UN RETOUR, UNE FOIS : les quatre actions passent d\'une feuille à l\'autre par REMPLACEMENT (ouvrirFeuille(…, true) et programmerReunion(true)), jamais par une entrée de plus',
      /ouvrirFeuille\('chat', true\)/.test(clic) && /ouvrirFeuille\('contact', true\)/.test(clic) && /ouvrirFeuille\('appel', true\)/.test(clic) && /programmerReunion\(true\)/.test(clic) && /function ouvrirFeuille\(mode, remplace\) \{[^\n]*if \(remplace\) remplacer\(r\); else pousser\(r\);/.test(JS));
    vrai('⛔ passer à une autre feuille GARDE le foyer d\'origine (le « + ») : `declencheur` n\'est repris que pour une ouverture, pas pour un remplacement', /function ouvrirFeuille\(mode, remplace\) \{ if \(!remplace\) declencheur = document\.activeElement;/.test(JS));
    vrai('« Programmer une réunion » ne rouvre rien si la feuille a été fermée pendant l\'attente du forfait (une route périmée ne se réécrit pas)', /const aller = mode => \{ if \(remplace && !\(etat\.route && etat\.route\.feuille === 'nouvelle'\)\) return; ouvrirFeuille\(mode, !!remplace\); \}/.test(JS));
    vrai('toucher un contact ouvre (ou crée) la conversation à deux par `ouvrirConversationAvec` — le MÊME chemin que « Message » —, et un second toucher pendant l\'ouverture est ignoré', /const c = e\.target\.closest\('\[data-nd-contact\]'\); if \(!c \|\| etat\.creation\) return;\s*etat\.creation = true;\s*ouvrirConversationAvec\(\[c\.dataset\.ndContact\]\)\.finally\(\(\) => \{ etat\.creation = false; \}\)/.test(clic));
    vrai('la feuille « Nouvelle discussion » : ✕ rond nommé « Fermer » (il referme par fermerFeuille, donc fermerCouche), pas d\'« Annuler » ni de « Créer » visibles — l\'« Annuler » invisible sort de la tabulation et de l\'arbre d\'accessibilité', /\$\('nd-fermer'\)\.addEventListener\('click', \(\) => fermerFeuille\(false\)\)/.test(JS) && /id="nd-fermer" aria-label="Fermer" hidden/.test(HTML)
      && /\$\('g-annuler'\)\.style\.visibility = nouv \? 'hidden' : ''; \$\('g-annuler'\)\.tabIndex = nouv \? -1 : 0; if \(nouv\) \$\('g-annuler'\)\.setAttribute\('aria-hidden', 'true'\)/.test(JS) && /\$\('g-creer'\)\.style\.display = nouv \? 'none' : ''; \$\('nd-fermer'\)\.hidden = !nouv;/.test(JS));
    vrai('la recherche ne promet que ce que le service sait chercher : « Rechercher un contact » (ni « numéro » ni « @nomdeprofil » — ils n\'existent pas encore côté service), et elle est NOMMÉE', /id="nd-recherche" placeholder="Rechercher un contact"/.test(HTML) && /<span class="sr-seul">Rechercher un contact<\/span><input type="search" id="nd-recherche"/.test(HTML) && !/num[ée]ro|@nom/i.test((/<input type="search" id="nd-recherche"[^>]*>/.exec(HTML) || [''])[0]));
    vrai('« Contacts fréquents » est un en-tête de groupe ; la liste se rend dans le MÊME conteneur que les actions (`#nd-liste`) et l\'index à côté (`#nd-index`, nommé « Index alphabétique »)', /M\.frequents\.length\) h \+= '<div class="rubrique"><span>Contacts fréquents<\/span>/.test(JS) && /<nav class="nd-index" id="nd-index" aria-label="Index alphabétique" hidden>/.test(HTML));
    const idxJS = JS.slice(JS.indexOf('function ndAller('), JS.indexOf('function ndAller(') + 3400);
    vrai('⛔ l\'index fait DÉFILER (ndAller écrit `scrollTop` du conteneur de la liste) au toucher d\'une lettre ET au glissé (pointerdown, pointermove) ; au clavier chaque lettre est un bouton nommé (« Aller à la lettre X »)',
      /\$\('nd-defile'\)\.scrollTop = Math\.max\(0, cible\.offsetTop - 4\)/.test(idxJS) && /addEventListener\('pointerdown'/.test(idxJS) && /addEventListener\('pointermove'/.test(idxJS) && /addEventListener\('click', e => \{ const b = e\.target\.closest\('\[data-nd-lettre\]'\); if \(b\) ndAller/.test(idxJS) && /aria-label="Aller à la lettre /.test(JS));
    vrai('⛔ l\'index est caché quand il ne servirait à rien (moins de deux lettres), et le glissé garde la capture du pointeur — un doigt qui sort du bord ne lâche pas la lettre', /idx\.hidden = M\.lettres\.length < 2/.test(JS) && /setPointerCapture\(e\.pointerId\)/.test(idxJS));
    vrai('⛔ « UN GESTE, UNE NAVIGATION » : l\'index écoute le POINTEUR (jamais touchmove), et son bord ne laisse pas défiler la feuille derrière (touch-action: none)', !/addEventListener\('touch/.test(idxJS) && /\.nd-index \{[^}]*touch-action: none/.test(CSS));
    const cssNd = CSS.slice(CSS.indexOf('.nd-corps {'), CSS.indexOf('.nd-corps {') + 2600);
    vrai('« Nouvelle discussion » : le corps ne défile PAS (la recherche et l\'index restent), la liste défile dans `.nd-defile`, l\'attribut hidden est respecté (un `display:flex` de l\'auteur le ferait mentir)', /\.nd-corps \{[^}]*display: flex[^}]*overflow: hidden/.test(cssNd) && /\.nd-corps\[hidden\] \{ display: none; \}/.test(cssNd) && /\.nd-defile \{[^}]*overflow-y: auto[^}]*padding: 0 44px/.test(cssNd));
    vrai('repères physiques de la feuille : le « + » répond sur 44 × 44, l\'index sur 44 px de large, le ✕ sur 44, l\'encre du « + » est celle de l\'aplat (--on-fill), jamais un blanc écrit en dur', parseFloat(prop(regle(CSS, '.btn-plus'), 'min-height')) >= 44 && parseFloat(prop(regle(CSS, '.btn-plus'), 'min-width')) >= 44 && /\.nd-index \{[^}]*width: 44px/.test(cssNd) && /\.nd-index button \{[^}]*width: 44px/.test(cssNd) && /\.nd-x \{[^}]*padding: 0 4px/.test(cssNd) && /\.btn-plus \.pastille \{[^}]*background: var\(--fill\)[^}]*color: var\(--on-fill\)/.test(CSS) && !/\.btn-plus \.pastille \{[^}]*color: #fff/.test(CSS));
    vrai('la feuille se met à jour quand la source dit « contacts » ou « liste » (un contact accepté pendant qu\'elle est ouverte paraît, « Contacts fréquents » suit la liste)', /else if \(etat\.groupe\.mode === 'nouvelle'\) rendreNouvelle\(\);/.test(JS) && /if \(etat\.groupe\.ouvert && etat\.groupe\.mode === 'nouvelle'\) rendreNouvelle\(\);/.test(JS));
    vrai('chaque ligne du texte venu d\'une personne (nom, statut, recherche) passe par esc() dans la feuille', /esc\(c\.nom\)/.test(JS.slice(fND, fND + 3000)) && /esc\(c\.role\)/.test(JS.slice(fND, fND + 3000)) && /esc\(G\.recherche\.trim\(\)\)/.test(JS.slice(fND, fND + 4000)) && /esc\(c\.id\)/.test(JS.slice(fND, fND + 3000)));
  }

  /* 4 ter. LE MENU DÉROULANT (7 octobre 2026, capture des infos d'une conversation : « Messages éphémères » et « Mettre en sourdine » en menu déroulant) ─────────────────
     La sonde (`tests/sonde-opmessages-deroule.js`) le joue au doigt, à la souris et au clavier, téléphone et bureau, et mesure qu'il reste COLLÉ à sa ligne ; le banc garde les
     décisions qui le tiennent : la couche du dessus et l'ancrage CSS, la fenêtre du bureau sans transformation, le toucher du dehors qui ne fait que refermer, Échap qui referme
     le menu d'abord, un nouveau rendu qui le garde sur la nouvelle ligne. `finSourdine` est EXTRAITE et EXÉCUTÉE. */
  {
    vrai('(population) le menu déroulant : son élément (#deroule, `popover`, une liste role="menu") et ses deux fonctions sont trouvés',
      /<div class="deroule" id="deroule" popover="manual" data-glass="1" hidden><p class="deroule-titre" id="deroule-titre" hidden><\/p><div class="deroule-liste" id="deroule-liste" role="menu"><\/div><\/div>/.test(HTML) && /function ouvrirDeroule\(declencheur, nom, titre, choix, surChoix\) \{/.test(JS) && /function fermerDeroule\(rendreFocusLigne\) \{/.test(JS));
    vrai('les trois lignes OUVRENT le menu (aria-haspopup="menu", aria-expanded, aria-controls) : « Messages éphémères » des infos (un administrateur ; inactive pour les autres), « Mettre en sourdine », « Messages éphémères » de « Nouveau groupe » — et plus aucune ne tourne d\'une valeur à la suivante',
      /data-act="ephemeres" data-valeur="' \+ esc\(String\(i\.ephemeres \|\| 0\)\) \+ '"' \+ \(i\.moiAdmin \? ' aria-haspopup="menu" aria-expanded="false" aria-controls="deroule-liste"' : ' disabled'\)/.test(JS)
      && /data-act="sourdine" data-valeur="' \+ \(sd > Date\.now\(\) \? sd : 0\) \+ '" aria-haspopup="menu" aria-expanded="false" aria-controls="deroule-liste"/.test(JS)
      && /id="g-ephemeres" aria-haspopup="menu" aria-expanded="false" aria-controls="deroule-liste"/.test(HTML) && !/% EPHEMERES\.length/.test(JS));
    vrai('⛔ il s\'accroche à sa ligne EN CSS — la ligne ouverte porte `anchor-name`, le menu `position-anchor` et se retourne vers le haut s\'il manque de place — sans rien mesurer ; il vit dans la couche du dessus (showPopover)',
      /\.reglage\[aria-haspopup="menu"\]\[aria-expanded="true"\] \{ anchor-name: --deroule; \}/.test(CSS) && /@supports \(anchor-name: --deroule\) \{\s*\.deroule \{ position-anchor: --deroule; inset: auto; top: anchor\(bottom\); right: anchor\(right\);[^}]*position-try-fallbacks: flip-block;/.test(CSS) && /D\.showPopover\(\)/.test(JS));
    vrai('⛔ au bureau, la fenêtre des feuilles OUVERTE ne porte aucune transformation (l\'ancrage les ignore : le menu tombait 260 px à droite) — centrée par inset 0 + margin auto, jamais par translate(-50 %)',
      /\.feuille-ouverte \.feuille \{ transform: none; opacity: 1;/.test(CSS) && /\.feuille \{\s*inset: 0; margin: auto; width: 520px;[^}]*height: fit-content;/.test(CSS) && !/\.feuille[^{]*\{[^}]*translate\(-50%/.test(CSS));
    vrai('⛔ le toucher qui referme le menu AU DEHORS ne fait rien d\'autre : il referme (pointerdown, en capture) et le clic qui le suit est AVALÉ — sinon l\'interrupteur voisin basculait, ou la ligne rouvrait le menu qu\'il fermait',
      /document\.addEventListener\('pointerdown', e => \{\s*if \(!etat\.deroule \|\| \$\('deroule'\)\.contains\(e\.target\)\) return;\s*etat\.derouleAvale = Date\.now\(\) \+ 700;\s*fermerDeroule\(true\);\s*\}, true\);/.test(JS)
      && /document\.addEventListener\('click', e => \{\s*if \(!\(etat\.derouleAvale > Date\.now\(\)\)\) return;\s*etat\.derouleAvale = 0; e\.preventDefault\(\); e\.stopPropagation\(\);\s*\}, true\);/.test(JS));
    vrai('⛔ Échap referme le MENU d\'abord, jamais la feuille sous lui : dans le menu il s\'arrête là (stopPropagation), et l\'écoute de la page ferme un menu AVANT toute couche',
      /else if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); fermerDeroule\(true\); \}/.test(JS) && /if \(e\.key !== 'Escape'\) return;\s*if \(etat\.deroule\) \{ e\.preventDefault\(\); fermerDeroule\(true\); return; \}\s*if \(ep\.ouvert\)/.test(JS));
    vrai('le clavier d\'un menu : le focus va au choix EN COURS à l\'ouverture ; ↑ ↓ en boucle, Début, Fin ; Tab le referme et poursuit depuis la ligne ; un choix rend le focus à la ligne',
      /\(l\.find\(b => b\.getAttribute\('aria-checked'\) === 'true'\) \|\| l\[0\]\)\.focus\(\{ preventScroll: true \}\);/.test(JS) && /l\[\(\(i < 0 \? \(pas > 0 \? -1 : 0\) : i\) \+ pas \+ n\) % n\]\.focus\(\);/.test(JS)
      && /else if \(e\.key === 'Home' \|\| e\.key === 'End'\)/.test(JS) && /else if \(e\.key === 'Tab'\) fermerDeroule\(true\);/.test(JS) && /fermerDeroule\(true\);\s*o\.surChoix\(b\.dataset\.valeur\);/.test(JS));
    vrai('⛔ un nouveau rendu des infos garde le menu OUVERT sur la NOUVELLE ligne (une présence qui change ne le referme pas) ; une valeur changée ailleurs le REFERME (sa coche mentirait) — et le « … » d\'un membre se retrouve par SON membre et son rôle (15 octobre 2026 : le premier de la liste prenait le menu)',
      /const n = Array\.from\(corps\.querySelectorAll\('\[data-act="' \+ dr\.dataset\.act \+ '"\]\[aria-haspopup="menu"\]'\)\)\.find\(x => \(x\.dataset\.uid \|\| ''\) === \(dr\.dataset\.uid \|\| ''\)\) \|\| null;/.test(JS)
      && /if \(n && n\.dataset\.valeur === dr\.dataset\.valeur && n\.dataset\.admin === dr\.dataset\.admin\) \{ n\.setAttribute\('aria-expanded', 'true'\); etat\.deroule\.declencheur = n; \}\s*else \{ if \(n\) etat\.deroule\.declencheur = n; fermerDeroule\(true\); \}/.test(JS));
    vrai('une feuille qui s\'ouvre ou se ferme emporte son menu, un rendu en panne aussi (jamais un menu accroché à une ligne disparue)',
      /function ouvrirFeuilleDom\(f\) \{\s*fermerDeroule\(false\);/.test(JS) && /function fermerFeuilleDom\(\) \{\s*fermerDeroule\(false\);/.test(JS) && /if \(panne\) \{ if \(etat\.deroule && corps\.contains\(etat\.deroule\.declencheur\)\) fermerDeroule\(false\);/.test(JS));
    const iF = JS.indexOf('const SOURDINE_TOUJOURS_MS'), fF = JS.indexOf('const CHEVRON_UD');
    let finS = null; try { const ctx = {}; vm.createContext(ctx); vm.runInContext(JS.slice(iF, fF) + '\nthis.f = finSourdine;', ctx, { timeout: 2000 }); finS = ctx.f; } catch (e) { finS = null; }
    vrai('la fonction `finSourdine` de la page s\'exécute dans un bac à sable (' + (fF - iF) + ' caractères)', iF > 0 && fF > iF && typeof finS === 'function');
    if (typeof finS === 'function') {
      const J = 86400000, t0 = Date.now();
      v('finSourdine : au-delà de cinq ans « Toujours » (la ligne) et « pour toujours » (le titre) ; dans une minute « Jusqu\'à HH:MM » ; dans une semaine « Jusqu\'au 14 oct. » sur la ligne, « jusqu\'au mercredi 14 octobre à HH:MM » dans le titre — jamais l\'année',
        [finS(t0 + 9 * 365 * J), finS(t0 + 9 * 365 * J, true), /^Jusqu'à (demain )?\d\d:\d\d$/.test(finS(t0 + 60000)), /^Jusqu'au \d{1,2} \S+$/.test(finS(t0 + 7 * J)), /^jusqu'au \S+ \d{1,2} \S+ à \d\d:\d\d$/.test(finS(t0 + 7 * J, true)), /20\d\d/.test(finS(t0 + 7 * J, true) + finS(t0 + 7 * J))],
        ['Toujours', 'pour toujours', true, true, true, false]);
    }
  }

  /* 4 quater. PERSO / PRO ET « CONFIRMER L'ENVOI » (7 octobre 2026, « côté pro ») — la sonde tests/sonde-opmessages-perso-pro.js les joue au doigt contre le vrai service ;
     le banc garde les décisions : la liste du côté en cours (une recherche cherche partout), ouvrir de l'autre côté y bascule, le nom PRO, la seconde touche avant d'envoyer */
  vrai('Perso / Pro : la liste montre le côté en cours — mais une RECHERCHE cherche des deux côtés (on ne perd pas une conversation parce qu\'on est du mauvais)',
    /etat\.conversations\.filter\(c => c\.invitation !== 'recue' && \(q \|\| \(dansMode\(c\) && !c\.archive\)\)\)/.test(JS) && /const dansMode = c => !modesActifs\(\) \|\| coteDe\(c\) === etat\.mode;/.test(JS));
  /* ⛔ LES ARCHIVÉES ET « MODIFIER » (9 octobre 2026) : le comportement se joue au navigateur (sonde-opmessages-ranger) ; ici, la forme qui le porte */
  vrai('Archivées : une conversation archivée sort de la liste (la recherche la retrouve), une ligne « Archivées » en bas les rassemble, et une épinglée archivée n\'est plus en tête',
    /const archivees = etat\.conversations\.filter\(c => c\.archive && c\.invitation !== 'recue' && dansMode\(c\)\);/.test(JS) && /: etat\.listeArchives \? archivees :/.test(JS)
      && /etat\.conversations\.filter\(c => c\.invitation !== 'recue' && \(q \|\| \(dansMode\(c\) && !c\.archive\)\)\)/.test(JS)
      && /const pied = !etat\.listeInvit && !etat\.listeArchives && !q && !etat\.selection && archivees\.length \? ligneArchives\(archivees\) : '';/.test(JS)
      && /const enHaut = c => epingleHaut && c\.epingle && !c\.archive && c\.invitation !== 'recue' && dansMode\(c\);/.test(JS) && /const pins = epingleHaut \? etat\.conversations\.filter\(enHaut\) : \[\];/.test(JS));
  vrai('« Modifier » : en mode sélection une ligne se COCHE (data-choisir, aria-pressed) au lieu de s\'ouvrir ; on en sort en changeant de vue ou de côté',
    /'<button type="button" class="conv presse conv-choix" data-choisir="' \+ esc\(c\.id\) \+ '" aria-pressed="' \+ pris \+ '">/.test(JS)
      && /if \(r\.vue !== 'messages' && etat\.selection\) quitterSelection\(\);/.test(JS) && /etat\.mode = m; etat\.vcCat = null; etat\.selection = null; etat\.listeArchives = false;/.test(JS));
  /* ⛔ TRANSFÉRER (9 octobre 2026) : ce qui se transfère, l'aperçu, les destinations, l'envoi — les VRAIES fonctions de la page, exécutées dans un bac à sable ;
     la couture avec le vrai service est dans tests/test-945.js, les gestes au doigt dans tests/sonde-opmessages-transfert.js */
  {
    const iT = JS.indexOf('const TR_MAX'), fT = JS.indexOf('function rendreTransfert'), iE = JS.indexOf('const nomConvId'), fE = JS.indexOf('const SOND_FINS');
    const ligneEsc = (/const esc = s => [^\n]*/.exec(JS) || [''])[0];
    let T = null, ctx = null;
    try {
      ctx = { MOI: { id: 'p_moi' }, icone: () => '<svg></svg>', duree: s => s + ' s', nomAuteur: id => id === 'p_ana' ? 'Ana <b>' : 'Quelqu\'un', norme: x => String(x).toLowerCase(),
        modesActifs: () => true, NOM_COTE: { perso: 'Perso', pro: 'Pro' }, coteDe: c => c && c.cote === 'pro' ? 'pro' : 'perso', nomConv: c => c.nom, mots: [], avis0: [], erreurs: [] };
      ctx.etat = { mode: 'perso', groupe: { mode: 'transferer', ouvert: true, tRecherche: '', tVers: [], tCid: '', tEnvoi: false }, conversations: [], convDonnees: { id: 'c_src', messages: [{ id: 'm1', seq: 7, auteur: 'p_ana', t: 1, texte: 'Salut' }] } };
      ctx.$ = () => null;
      ctx.dansMode = c => ctx.coteDe(c) === ctx.etat.mode;
      vm.createContext(ctx);
      vm.runInContext(ligneEsc + '\n' + JS.slice(iT, fT) + '\n' + JS.slice(iE, fE) + `
        var erreurInfo = t => erreurs.push(t || ''), synchroFeuille = () => {}, peindreTransfert = () => {}, fermerFeuille = () => { etat.groupe.ouvert = false; }, mot = t => mots.push(t), avis = t => avis0.push(t),
          phrase = (e, d) => e && e.dit ? e.message : d;
        this.T = { TR_MAX, transferable, apercuTransfert, convsTransfert, cidNeuf, envoyerTransfert };`, ctx, { timeout: 2000 });
      T = ctx.T;
    } catch (e) { T = null; }
    const routes = (() => { try { return lire('server-msg/routes.js'); } catch (e) { return ''; } })();
    const maxServeur = (/const TRANSFERT_MAX = (\d+)/.exec(routes) || [])[1];
    vrai('(population) les fonctions de « Transférer » s\'exécutent dans un bac à sable (' + (fT - iT) + ' + ' + (fE - iE) + ' caractères), et la page plafonne comme le service (' + (T && T.TR_MAX) + ' = ' + maxServeur + ')',
      iT > 0 && fT > iT && iE > 0 && fE > iE && !!T && typeof T.envoyerTransfert === 'function' && String(T.TR_MAX) === maxServeur);
    if (T) {
      const M = o => Object.assign({ id: 'm1', seq: 7, auteur: 'p_ana', t: 1 }, o);
      v('ce qui se transfère : un texte, une photo, un vocal, un fichier ENCORE LÀ, une fiche — pas une position, un sondage, un compte rendu, un message supprimé, en attente, du système, sans numéro, ni un texte vide ni une fiche indisponible',
        [M({ texte: 'Salut' }), M({ photos: [{ url: 'x' }], texte: '' }), M({ vocal: { dur: 3 } }), M({ fichier: { nom: 'a.pdf', piece: 'f_1' } }), M({ carteContact: { prenom: 'Léo' }, texte: 'Léo' }),
         M({ position: { lat: 1, lng: 2 }, texte: '📍 Position partagée' }), M({ sondage: {}, texte: '📊 Sondage : Quand ?' }), M({ compteRendu: {}, texte: 'Compte rendu' }), M({ texte: 'x', supprime: true }), M({ texte: 'x', attente: true }), M({ texte: 'x', systeme: true }),
         M({ texte: 'x', seq: 0 }), M({ texte: '  ' }), M({ fichier: { nom: 'a.pdf', piece: null } }), M({ carteContact: { indisponible: true }, texte: '👤 Fiche de contact' }), M({ photos: [], texte: 'légende' }),
         M({ texte: 'Message illisible', illisible: true })].map(T.transferable),
        [true, true, true, true, true, false, false, false, false, false, false, false, false, false, false, false, false]);
      const a1 = T.apercuTransfert(M({ texte: 'é'.repeat(200) })), a2 = T.apercuTransfert(M({ auteur: 'p_moi', fichier: { nom: '<x>.pdf' } })), a3 = T.apercuTransfert(M({ carteContact: { prenom: 'Léo' }, texte: 'secret' }));
      vrai('l\'aperçu du message : qui l\'a écrit (échappé), le texte coupé à 140 signes avec « … », « Ton message » pour le mien, un nom de fichier échappé — et la fiche ne montre pas son texte',
        a1.includes('Message de Ana &lt;b&gt;') && a1.includes('é'.repeat(140) + '…') && !a1.includes('é'.repeat(141)) && a2.includes('Ton message') && a2.includes('Fichier « &lt;x&gt;.pdf »') && a3.includes('Fiche de Léo') && !a3.includes('secret'),
        JSON.stringify([a1.slice(0, 160), a2, a3]));
      ctx.etat.conversations = [{ id: 'c_a', nom: 'Équipe', cote: 'perso' }, { id: 'c_b', nom: 'Bureau', cote: 'pro' }, { id: 'c_c', nom: 'Inconnu', cote: 'perso', invitation: 'recue' }, { id: 'c_d', nom: 'Vieux', cote: 'perso', archive: true }];
      const sans = T.convsTransfert().map(c => c.id); ctx.etat.groupe.tRecherche = 'u'; const avec = T.convsTransfert().map(c => c.id); ctx.etat.groupe.tRecherche = '';
      v('les destinations : mes conversations du côté en cours (archivées comprises), jamais une invitation pas encore acceptée — une recherche cherche des deux côtés',
        [sans, avec], [['c_a', 'c_d'], ['c_a', 'c_b', 'c_d']]);
      ctx.etat.groupe.tVers = ['c_d']; ctx.etat.groupe.tRecherche = 'bur'; const cachee = T.convsTransfert().map(c => c.id); ctx.etat.groupe.tRecherche = ''; ctx.etat.groupe.tVers = [];
      v('⛔ une ligne COCHÉE reste à l\'écran pendant une recherche qui ne la trouve pas (elle partira : elle ne se cache pas)', cachee, ['c_b', 'c_d']);
      vrai('un identifiant d\'envoi neuf a la forme qu\'attend le service (32 signes hexadécimaux), et deux feuilles n\'ont pas le même', /^[0-9a-f]{32}$/.test(T.cidNeuf()) && T.cidNeuf() !== T.cidNeuf());
      /* l'envoi : un échec PARTIEL garde la feuille ouverte sur ce qui a échoué, et le nouvel essai repart avec le MÊME identifiant d'envoi (le service ne recrée rien de ce qui est parti) */
      const appels = [];
      ctx.source = { transferer: async (conv, mid, vers, cid) => { appels.push({ conv, mid, vers: vers.slice(), cid }); return appels.length === 1 ? [{ conv: 'c_a', ok: true }, { conv: 'c_b', ok: false, error: 'annonces_seules', phrase: 'Seuls les administrateurs peuvent écrire dans ce groupe.' }] : [{ conv: 'c_b', ok: true }]; } };
      Object.assign(ctx.etat.groupe, { tConv: 'c_src', tMid: 'm1', tCid: 'a'.repeat(32), tVers: ['c_a', 'c_b'], ouvert: true });
      await T.envoyerTransfert();
      const apres1 = { echecs: Object.assign({}, ctx.etat.groupe.tEchecs), vers: ctx.etat.groupe.tVers.slice(), ouvert: ctx.etat.groupe.ouvert, err: ctx.erreurs[ctx.erreurs.length - 1], mots: ctx.mots.slice() };
      await T.envoyerTransfert();
      v('⛔ l\'envoi : un échec PARTIEL laisse la feuille ouverte, ne garde cochées que les destinations refusées (avec leur raison, nommées — et sous leur ligne), et le nouvel essai repart avec le MÊME identifiant d\'envoi',
        [apres1.echecs, apres1.vers, apres1.ouvert, /« Bureau » : Seuls les administrateurs/.test(apres1.err || ''), apres1.mots, appels.map(x => x.vers), appels.map(x => x.cid === 'a'.repeat(32)), ctx.etat.groupe.ouvert, ctx.mots[ctx.mots.length - 1]],
        [{ c_b: 'Seuls les administrateurs peuvent écrire dans ce groupe.' }, ['c_b'], true, true, ['Transféré à 1 conversation'], [['c_a', 'c_b'], ['c_b']], [true, true], false, 'Transféré']);
      ctx.etat.groupe = { mode: 'transferer', ouvert: true, tVers: ['c_a'], tCid: 'b'.repeat(32), tConv: 'c_src', tMid: 'm1', tEnvoi: false };
      let n2 = 0; ctx.source = { transferer: () => { n2++; return new Promise(r => setTimeout(() => r([{ conv: 'c_a', ok: true }]), 20)); } };
      const p1 = T.envoyerTransfert(), p2 = T.envoyerTransfert(); await Promise.all([p1, p2]);
      vrai('⛔ deux touches sur « Envoyer » ne transfèrent qu\'une fois (la feuille est « en envoi » jusqu\'à la réponse)', n2 === 1, 'appels : ' + n2);
      /* le message a disparu de la conversation ouverte depuis l'ouverture de la feuille : la page le dit, et ne demande rien au service */
      ctx.etat.groupe = { mode: 'transferer', ouvert: true, tVers: ['c_a'], tCid: 'c'.repeat(32), tConv: 'c_src', tMid: 'm_parti', tEnvoi: false };
      let n3 = 0; ctx.source = { transferer: async () => { n3++; return [{ conv: 'c_a', ok: true }]; } }; ctx.erreurs.length = 0;
      await T.envoyerTransfert();
      v('⛔ un message qui n\'est plus dans la conversation : « Ce message n\'est plus là », sans rien demander au service (pas « Introuvable (la conversation…) »)', [n3, ctx.erreurs[ctx.erreurs.length - 1], ctx.etat.groupe.ouvert], [0, 'Ce message n\'est plus là : il a peut-être été supprimé.', true]);
    }
    vrai('⛔ le menu d\'un message ne propose « Transférer » qu\'à ce qui se transfère, et la feuille ne s\'ouvre que sur un message de la conversation ouverte qui se transfère (sinon elle rend la route d\'en dessous)',
      /if \(CAP\.transferts && transferable\(m\)\) h \+= '<button type="button" class="menu-action" data-menu="transferer" aria-haspopup="dialog">Transférer<\/button>';/.test(JS)
      && /\(CAP\.transferts && mode === 'transferer' && \/\^\\d\{1,12\}\$\/\.test\(arg \|\| ''\)\)/.test(JS)
      && /const m = etat\.convDonnees && etat\.convDonnees\.id === etat\.conv \? etat\.convDonnees\.messages\.find\(x => x\.seq === \+arg\) : null;\s*if \(!m \|\| !transferable\(m\)\) \{ declencheur = null; setTimeout\(\(\) => \{ if \(etat\.route && etat\.route\.feuille\) remplacer\(parentDe\(etat\.route\)\); \}, 0\); return; \}/.test(JS));
    vrai('⛔ un message TRANSFÉRÉ ne propose pas « Modifier » (le service le refuse : il porte les mots de quelqu\'un d\'autre)', /if \(moi && !m\.supprime && !m\.vocal && !m\.fichier && !estCarte\(m\) && !m\.transfere && Date\.now\(\) - m\.t < DELAI_MODIF_MS\) h \+=/.test(JS));
    vrai('« Transféré » au-dessus de la bulle d\'un message transféré (jamais d\'un message supprimé), avant la citation ; cinq conversations au plus, dit à qui en coche une sixième',
      /if \(m\.transfere && !m\.supprime\) h \+= '<span class="msg-transfere">' \+ icone\('i-transferer'\) \+ 'Transféré<\/span>';\s*if \(m\.reponse && !m\.supprime\)/.test(JS)
      && /else if \(G\.tVers\.length >= TR_MAX\) \{ erreurInfo\('Cinq conversations au plus à la fois\.'\); return; \}/.test(JS) && /<symbol id="i-transferer"/.test(PAGE));
  }
  /* ⛔ RETROUVER (9 octobre 2026) : l'occurrence surlignée (échappée), les liens de la galerie (les règles de la bulle), seule la DERNIÈRE réponse s'affiche, « Chercher plus loin »
     ajoute, un échec se dit et se réessaie, la galerie se pagine, un texte piégé (message, nom de fichier, nom d'auteur, identifiant de pièce) s'écrit échappé, un résultat mène AU
     message sans doubler l'historique, avec le focus — les VRAIES fonctions de la page, exécutées ; le service est gardé par tests/test-946.js, les gestes par
     tests/sonde-opmessages-retrouver.js */
  {
    const iL = JS.indexOf('const LIEN_RE'), fL = JS.indexOf('function texteRiche'), iR = JS.indexOf('const normeCar'), fR = JS.indexOf("$('info-corps').addEventListener('input'", iR);
    const ligneEsc = (/const esc = s => [^\n]*/.exec(JS) || [''])[0];
    const tic = () => new Promise(r => setImmediate(r));
    let R = null, ctx = null;
    const els = {}, boutons = {}, el = () => ({ innerHTML: '', hidden: false, textContent: '', setAttribute(k, x) { this['@' + k] = x; }, style: { setProperty() {} } });
    try {
      ctx = { icone: n => '[' + n + ']', libelleListe: () => 'hier', nomAuteur: () => 'Ben', tailleTexte: n => n + ' o', phrase: (e, d) => d, etat: { groupe: { mode: 'chercher', convId: 'c_x' } },
        CAP: { transcription: true }, TR: null,
        cibleMsg: { conv: null, seq: 0, pages: 0, max: 20, retrouver: false, apresFeuille: false, transcription: false }, nav: [],
        document: { querySelector: s => boutons[s] || null, querySelectorAll: () => [] }, setTimeout, clearTimeout };
      ctx.voirMessage = (c, s, r) => { ctx.nav.push(['voir', c, s, r]); Object.assign(ctx.cibleMsg, { conv: c, seq: s, pages: 0, max: 20, retrouver: false, apresFeuille: false, transcription: false }); };
      ctx.fermerFeuille = () => ctx.nav.push(['fermer']);
      ctx.$ = id => (els[id] = els[id] || el());
      vm.createContext(ctx);
      vm.runInContext(ligneEsc + '\n' + JS.slice(iL, fL) + '\n' + JS.slice(iR, fR) + '\nthis.R = { surligner, liensDe, rendreRecherche, lancerRecherche, peindreRecherche, rendreMedias, chargerMedias, allerDepuisFeuille };', ctx, { timeout: 2000 });
      R = ctx.R;
    } catch (e) { R = null; }
    vrai('(population) les fonctions de « Retrouver » s\'exécutent dans un bac à sable (' + (fR - iR) + ' caractères)', iL > 0 && fL > iL && iR > 0 && fR > iR && !!R && typeof R.allerDepuisFeuille === 'function');
    if (R) {
      v('⛔ l\'occurrence est SURLIGNÉE telle qu\'elle est écrite, sans accents ni casse, et tout le reste est ÉCHAPPÉ',
        [R.surligner('Le chantier de Rochefort démarre', 'rochefort'), R.surligner('Réunion à l\'école', ' ECOLE '), R.surligner('<b>x</b> <i>rochefort</i>', 'rochefort'), R.surligner('voir <b>ici', '<B>'), R.surligner('rien <ici>', 'zz')],
        ['Le chantier de <mark>Rochefort</mark> démarre', 'Réunion à l&#39;<mark>école</mark>', '&lt;b&gt;x&lt;/b&gt; &lt;i&gt;<mark>rochefort</mark>&lt;/i&gt;', 'voir <mark>&lt;b&gt;</mark>ici', 'rien &lt;ici&gt;']);
      v('⛔ les liens de la galerie suivent les règles de la bulle : http, https, « www. » (rendu en https), la ponctuation dehors, sans doublon, jamais un hôte qui n\'en est pas un',
        R.liensDe('Voir https://a.fr/x. et www.b.fr, puis https://a.fr/x encore ; https://_x.fr et javascript:alert(1)').map(l => [l.u, l.href]), [['https://a.fr/x', 'https://a.fr/x'], ['www.b.fr', 'https://www.b.fr']]);
      const G = ctx.etat.groupe; R.rendreRecherche();
      let lent = null, appels = [];
      ctx.source = { chercher: (conv, q, avant) => { appels.push([conv, q, avant]); return q === 'premier' ? new Promise(r => { lent = r; }) : Promise.resolve({ resultats: [{ seq: 2, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'second' }], suite: 5 }); } };
      G.rc.q = 'premier'; const p1 = R.lancerRecherche(false);
      G.rc.q = 'second'; const p2 = R.lancerRecherche(false);
      await p2; lent({ resultats: [{ seq: 1, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'premier' }], suite: null }); await p1;
      v('⛔ deux recherches qui se croisent : seule la DERNIÈRE réponse s\'affiche (la lente, arrivée après, est ignorée)', [G.rc.resultats.map(x => x.seq), G.rc.suite, appels.map(x => x[1])], [[2], 5, ['premier', 'second']]);
      ctx.source = { chercher: (conv, q, avant) => { appels.push([conv, q, avant]); return Promise.resolve({ resultats: [{ seq: 1, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'plus loin' }], suite: null }); } };
      await R.lancerRecherche(true);
      v('« Chercher plus loin » reprend à la `suite` et AJOUTE (rien ne disparaît)', [G.rc.resultats.map(x => x.seq), G.rc.suite, appels[appels.length - 1]], [[2, 1], null, ['c_x', 'second', 5]]);
      const n0 = appels.length; G.rc.q = 'a'; await R.lancerRecherche(false);
      const n1 = appels.length; G.rc.q = '\u0301\u0301'; await R.lancerRecherche(false);
      G.rc.q = 'e\u0301'; await R.lancerRecherche(false);
      v('⛔ une requête d\'un seul signe ne part pas au service (ni deux ACCENTS seuls : vides sans leurs signes combinants — une chaîne vide se trouve partout), et vide la liste',
        [n1 - n0, appels.length - n1, G.rc.resultats.length], [0, 0, 0]);
      /* un échec : il se DIT, la liste reste, « Réessayer » paraît (« Chercher plus loin » se cache) ; le réessai rejoue le MÊME geste */
      G.rc.q = 'chantier'; G.rc.resultats = [{ seq: 9, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'chantier' }]; G.rc.suite = 8;
      ctx.source = { chercher: () => Promise.reject(new Error('reseau')) };
      await R.lancerRecherche(true);
      const echec = [G.rc.erreur, G.rc.echecPlus, G.rc.resultats.length, els['rc-etat'].textContent, els['rc-reessayer-zone'].hidden, els['rc-plus-zone'].hidden];
      ctx.source = { chercher: (conv, q, avant) => Promise.resolve({ resultats: [{ seq: 7, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'chantier ' + avant }], suite: null }) };
      await R.lancerRecherche(G.rc.echecPlus && G.rc.suite !== null);
      v('⛔ une recherche qui échoue le DIT, garde ce qui était trouvé, propose « Réessayer » ; le réessai reprend la même suite et efface l\'erreur',
        [echec, G.rc.erreur, G.rc.resultats.map(x => x.texte), els['rc-reessayer-zone'].hidden],
        [['La recherche n\'a pas pu aboutir.', true, 1, 'La recherche n\'a pas pu aboutir.', false, true], '', ['chantier', 'chantier 8'], true]);
      vrai('« Réessayer » (toucher) rejoue la première page, ou la suite si c\'est elle qui avait échoué',
        /if \(e\.target\.closest\('\[data-rc-reessayer\]'\)\) \{ if \(G\.rc && !G\.rc\.enCours\) lancerRecherche\(G\.rc\.echecPlus && G\.rc\.suite !== null\); return; \}/.test(JS)
        && /if \(e\.target\.closest\('\[data-md-reessayer\]'\)\) \{ if \(G\.md && !G\.md\.enCours\) chargerMedias\(G\.md\.echecPlus && G\.md\.suite !== null\); return; \}/.test(JS));
      /* un texte PIÉGÉ et un auteur dont la source a résolu le nom (« Compte supprimé ») */
      R.rendreRecherche(); G.rc.q = 'chantier';
      G.rc.resultats = [{ seq: 3, auteur: 'p_z', moi: false, nom: '<svg onload=1>', t: 1, type: 'fichier', texte: '<img src=x onerror=alert(1)> chantier' }, { seq: 2, auteur: 'p_y', moi: false, nom: 'Compte supprimé', t: 1, type: 'texte', texte: 'chantier' }];
      R.peindreRecherche(); const hR = els['rc-liste'].innerHTML;
      v('⛔ un résultat PIÉGÉ (texte, nom d\'auteur) s\'écrit échappé ; le nom que la source a résolu passe (« Compte supprimé », jamais « ? » ni le nom d\'un contact homonyme)',
        [/<img|<svg/.test(hR), hR.includes('&lt;img src=x onerror=alert(1)&gt;'), hR.includes('&lt;svg onload=1&gt;'), hR.includes('Compte supprimé'), hR.includes('Ben')], [false, true, true, true, false]);
      /* ⛔ (relecture du relecteur, 11 octobre 2026) : un vocal trouvé par ce qu'il dit se reconnaît comme un vocal, et la note dit qu'on cherche dans les vocaux transcrits */
      G.rc.resultats = [{ seq: 6, auteur: 'p_b', moi: false, nom: 'Ben', t: 1, type: 'vocal', texte: 'on se voit au chantier' }, { seq: 5, auteur: 'p_b', moi: false, nom: 'Ben', t: 1, type: 'texte', texte: 'chantier' }];
      R.peindreRecherche(); const hV = els['rc-liste'].innerHTML;
      v('⛔ un vocal trouvé : le micro, « Vocal : » pour le lecteur d\'écran, et la marque qui ouvrira sa transcription — pas sur un texte',
        [/data-rc-seq="6" data-rc-vocal="1">/.test(hV), /\[i-mic\]<span class="sr-seul">Vocal : <\/span>on se voit au/.test(hV), /data-rc-seq="5" data-rc-vocal/.test(hV)], [true, true, false]);
      G.rc.q = ''; R.peindreRecherche(); const noteSans = els['rc-etat'].textContent;
      ctx.TR = { ouverte: true, dureeMaxS: 300 }; vm.runInContext('TR = this.TR', ctx); R.peindreRecherche(); const noteAvec = els['rc-etat'].textContent;
      v('la note dit ce qu\'on cherche — les vocaux transcrits, seulement quand la transcription est installée', [noteSans, noteAvec],
        ['Le texte des messages, les légendes des photos et les noms des fichiers.', 'Le texte des messages, les légendes des photos, les noms des fichiers, et ce que disent les vocaux déjà transcrits.']);
      vm.runInContext('TR = null', ctx);
      /* la galerie */
      ctx.etat.groupe = { mode: 'medias', convId: 'c_x' }; const M = ctx.etat.groupe; boutons['[data-md-plus]'] = el();
      const mAppels = [];
      ctx.source = { medias: (conv, genre, avant) => { mAppels.push([genre, avant]); return Promise.resolve(avant ? { medias: [{ seq: 1, auteur: 'p_b', moi: false, nom: 'Ben', t: 1, pieces: [{ id: 'p2', w: 1, h: 1 }] }], suite: null }
        : { medias: [{ seq: 4, auteur: 'p_b', moi: false, nom: 'Ben', t: 1, pieces: [{ id: '"><img src=x>', w: 1, h: 1 }] }], suite: 7 }); }, pieceUrl: () => new Promise(() => {}) };
      R.rendreMedias(); await tic();
      const hP = els['md-corps'].innerHTML, plus1 = [els['md-plus-zone'].hidden, boutons['[data-md-plus]'].textContent];
      await R.chargerMedias(true);
      v('la galerie (photos) : une page, « Plus » ; la suite reprend à `suite` et AJOUTE ; l\'identifiant d\'une pièce s\'écrit échappé',
        [hP.includes('"><img src=x>'), hP.includes('&quot;&gt;&lt;img src=x&gt;'), plus1, mAppels, M.md.items.map(x => x.seq), els['md-plus-zone'].hidden], [false, true, [false, 'Plus'], [['photo', null], ['photo', 7]], [4, 1], true]);
      M.md.genre = 'fichier';
      ctx.source.medias = () => Promise.resolve({ medias: [{ seq: 5, auteur: 'p_b', moi: false, nom: '"><svg onload=1>', t: 1, fichier: { piece: 'x', nom: '<img src=x onerror=1>.pdf', taille: 10 } }], suite: null });
      await R.chargerMedias(false); const hF = els['md-corps'].innerHTML;
      v('⛔ la galerie (fichiers) : le NOM du fichier et celui de l\'auteur s\'écrivent échappés ; « Voir » dit QUEL message (auteur, date) à qui ne voit pas la ligne',
        [/<img|<svg/.test(hF), hF.includes('&lt;img src=x onerror=1&gt;.pdf'), hF.includes('aria-label="Voir le message de &quot;&gt;&lt;svg onload=1&gt;, hier"')], [false, true, true]);
      M.md.genre = 'lien';
      ctx.source.medias = () => Promise.resolve({ medias: [{ seq: 6, auteur: 'p_b', moi: false, nom: 'Ana', t: 1, texte: 'voir https://a.fr/x"><img src=x> et <b>gras</b>' }], suite: null });
      await R.chargerMedias(false); const hK = els['md-corps'].innerHTML;
      ctx.source.medias = () => Promise.resolve({ medias: [], suite: 12 });
      await R.chargerMedias(false); const videSuite = [els['md-etat'].textContent, els['md-plus-zone'].hidden, boutons['[data-md-plus]'].textContent];
      ctx.source.medias = () => Promise.resolve({ medias: [], suite: null });
      await R.chargerMedias(false); const videFin = [els['md-etat'].textContent, els['md-plus-zone'].hidden];
      v('⛔ la galerie (liens) : un message piégé n\'écrit rien dans la page ; aucun lien dans un lot qui n\'a pas tout relu dit « parmi les messages récents » et propose « Chercher plus loin » — pas « aucun dans la conversation »',
        [/<img|<b>/.test(hK), hK.includes('href="https://a.fr/x"'), videSuite, videFin],
        [false, true, ['Aucun lien parmi les messages récents.', false, 'Chercher plus loin'], ['Aucun lien dans cette conversation.', true]]);
      ctx.source.medias = () => Promise.reject(new Error('reseau'));
      await R.chargerMedias(false);
      v('une galerie qui ne se charge pas le DIT et propose « Réessayer »', [els['md-etat'].textContent, els['md-reessayer-zone'].hidden, els['md-plus-zone'].hidden], ['La liste n\'a pas pu être chargée.', false, true]);
      /* aller au message */
      ctx.etat = { groupe: { mode: 'chercher', convId: 'c_x' }, conv: 'c_x', convDonnees: { id: 'c_x' }, route: { vue: 'messages', conv: 'c_x', feuille: 'chercher:c_x' } };
      ctx.nav.length = 0; R.allerDepuisFeuille(42); const dessous = [ctx.nav.slice(), Object.assign({}, ctx.cibleMsg)];
      ctx.etat = { groupe: { mode: 'chercher', convId: 'c_x' }, conv: 'c_autre', convDonnees: { id: 'c_autre' }, route: { vue: 'messages', conv: 'c_autre', feuille: 'chercher:c_x' } };
      ctx.nav.length = 0; R.allerDepuisFeuille(43); const ailleurs = [ctx.nav.slice(), ctx.cibleMsg.max, ctx.cibleMsg.retrouver, ctx.cibleMsg.apresFeuille];
      v('⛔ un résultat touché, la conversation SOUS la feuille : la feuille se REFERME (on revient à l\'entrée de la conversation — remplacer celle de la feuille en faisait DEUX), le message attend sa fermeture, 60 pages ; sans conversation dessous, la feuille devient la conversation',
        [dessous, ailleurs],
        [[[['fermer']], { conv: 'c_x', seq: 42, pages: 0, max: 60, retrouver: true, apresFeuille: true, transcription: false }], [[['voir', 'c_x', 43, true]], 60, true, false]]);
      ctx.etat = { groupe: { mode: 'chercher', convId: 'c_x' }, conv: 'c_x', convDonnees: { id: 'c_x' }, route: { vue: 'messages', conv: 'c_x', feuille: 'chercher:c_x' } };
      R.allerDepuisFeuille(44, true); const tDessous = ctx.cibleMsg.transcription;
      ctx.etat = { groupe: { mode: 'chercher', convId: 'c_x' }, conv: 'c_autre', convDonnees: { id: 'c_autre' }, route: { vue: 'messages', conv: 'c_autre', feuille: 'chercher:c_x' } };
      R.allerDepuisFeuille(45, true); const tAilleurs = ctx.cibleMsg.transcription;
      R.allerDepuisFeuille(46); const tTexte = ctx.cibleMsg.transcription;
      v('⛔ un VOCAL trouvé : sa transcription s\'ouvrira en arrivant (conversation dessous ou non) ; un texte, non', [tDessous, tAilleurs, tTexte], [true, true, false]);
    }
    vrai('⛔ … et en arrivant, la transcription du vocal visé s\'ouvre AVANT qu\'on cherche son élément (le repeint le remplacerait)',
      /const ouvrirTr = cibleMsg\.transcription; cibleMsg\.transcription = false;\s*(?:\/\*[^]*?\*\/\s*)?if \(ouvrirTr && m\.vocal && transcriptionPossible\(m\) && !trOuvertes\.has\(m\.id\)\) \{ trOuvertes\.set\(m\.id, c\.id\); trEtats\.set\(m\.id, trEtat\(m\)\.etat\); rendreIci\(\); \}\s*const el = document\.querySelector/.test(corps('async function allerAuMessage')));
    vrai('⛔ la feuille refermée montre le message attendu (`apresFeuille`), après avoir rendu le focus — et seulement s\'il est de la conversation ouverte',
      /rendreFocus\(d\);\s*(?:\/\*[^]*?\*\/\s*)?if \(cibleMsg\.apresFeuille\) \{ cibleMsg\.apresFeuille = false; if \(cibleMsg\.conv && cibleMsg\.conv === etat\.conv\) allerAuMessage\(\); \}/.test(corps('function fermerFeuilleDom')));
    vrai('⛔ les deux lignes des Infos n\'existent que si la source sait chercher (CAP.retrouver)',
      /if \(CAP\.retrouver && !i\.supprime\) h \+= '<div class="carte"><button type="button" class="reglage presse" data-act="chercher">/.test(JS));
    /* aller au message (`allerAuMessage`), exécuté : le focus, l'attente dite, « très ancien » ≠ « disparu », le chemin des rappels inchangé */
    const iA = JS.indexOf('const cibleMsg = {'), fA = JS.indexOf('async function rafraichirConv', iA);
    let A = null, cA = null;
    const elMsg = { tabIndex: 0, scrollIntoView() {}, classList: { add() {}, remove() {} }, hasAttribute() { return false; }, addEventListener() {} };
    try {
      cA = { etat: null, CAP: { historique: true }, mots: [], focus: [], pages: 0, phrase: (e, d) => d, avis() {}, rafraichirConv: async () => {}, remplacer() {}, pousser() {}, setTimeout,
        document: { querySelector: () => elMsg }, matchMedia: () => ({ matches: true }), requestAnimationFrame: f => f() };
      cA.mot = t => cA.mots.push(t); cA.rendreFocus = e => cA.focus.push(e); cA.source = { precedents: async () => { cA.pages++; } };
      vm.createContext(cA);
      vm.runInContext(JS.slice(iA, fA) + '\nthis.A = { cibleMsg, voirMessage, allerAuMessage };', cA, { timeout: 2000 });
      A = cA.A;
    } catch (e) { A = null; }
    vrai('(population) `allerAuMessage` s\'exécute dans un bac à sable (' + (fA - iA) + ' caractères)', iA > 0 && fA > iA && !!A);
    if (A) {
      const conv = (aPlus, msgs) => ({ conv: 'c_x', convDonnees: { id: 'c_x', aPlus, messages: msgs }, route: { vue: 'messages' } });
      cA.etat = conv(true, [{ id: 'm50', seq: 50 }]);
      Object.assign(A.cibleMsg, { conv: 'c_x', seq: 50, pages: 0, max: 60, retrouver: true }); await A.allerAuMessage();
      const atteint = [cA.focus.length === 1 && cA.focus[0] === elMsg, elMsg.tabIndex, A.cibleMsg.retrouver];
      A.voirMessage('c_x', 50); await tic();
      v('⛔ depuis « Rechercher », le message atteint prend le FOCUS (tabindex -1 posé) — il restait sur le bouton d\'en-tête ; un rappel (« Voir le message ») ne le déplace pas',
        [atteint, cA.focus.length], [[true, -1, false], 1]);
      cA.etat = conv(true, [{ id: 'm50', seq: 50 }]); cA.mots.length = 0; cA.pages = 0;
      Object.assign(A.cibleMsg, { conv: 'c_x', seq: 10, pages: 0, max: 2, retrouver: true }); await A.allerAuMessage();
      const loin = [cA.mots.slice(), cA.pages];
      cA.mots.length = 0; cA.pages = 0; A.voirMessage('c_x', 10); A.cibleMsg.max = 2; await tic(); await tic(); await tic();
      const rappel = [cA.mots.slice(), cA.pages];
      cA.etat = conv(false, [{ id: 'm50', seq: 50 }]); cA.mots.length = 0;
      Object.assign(A.cibleMsg, { conv: 'c_x', seq: 10, pages: 0, max: 60, retrouver: true }); await A.allerAuMessage();
      v('⛔ un message au-delà des pages qu\'on remonte : l\'attente se DIT, `max` pages et pas une de plus, puis « très ancien » — pas « n\'est plus dans la conversation » ; le rappel garde son chemin ; un message disparu reste « disparu »',
        [loin, rappel, cA.mots],
        [[['Recherche du message dans l\'historique…', 'Ce message est très ancien : remontez la conversation pour le retrouver.'], 2], [['Ce message n\'est plus dans la conversation.'], 2], ['Ce message n\'est plus dans la conversation.']]);
    }
  }
  /* ⛔ LES VOCAUX : VITESSE, REPRISE, ONDE (10 octobre 2026 : « qu'on puisse accélérer les vocaux ») — les VRAIES fonctions exécutées (le tour des vitesses, l'enchaînement),
     la structure de la bulle et du lecteur lue dans le code ; le geste (pause qui garde la position, toucher sur l'onde, reprise, playbackRate du vrai lecteur) est gardé par
     tests/sonde-opmessages.js (étape vocal) */
  {
    /* le lecteur ENTIER (de `const VITESSES` jusqu'à l'onde) dans un bac à sable : un faux document (les bulles d'un fil), un faux `Audio` dont `preservesPitch` vaut FAUX tant
       qu'on ne l'écrit pas (le vrai vaut vrai par défaut : un contrôle sur lui serait creux), une fausse horloge pour le vocal d'exemple */
    const iV = JS.indexOf('const VITESSES = [1, 1.5, 2];'), fV = JS.lastIndexOf('(function () {', JS.indexOf('let tient = null;', iV)), fI = JS.indexOf('})();', fV) + 5;
    let V = null, cV = null;
    const el = (attrs) => { const e = { a: Object.assign({}, attrs || {}), setAttribute(k, x) { e.a[k] = String(x); }, getAttribute(k) { return k in e.a ? e.a[k] : null; }, removeAttribute(k) { delete e.a[k]; }, hasAttribute(k) { return k in e.a; },
      focus() { cV.document.activeElement = e; }, closest(s) { return e.bulle ? (s === '.vocal' ? e.bulle : (s === '[data-vitesse]' && e.role === 'vitesse' ? e : null)) : null; } }; return e; };
    const bulle = (id, dur) => {
      const b = el({ 'data-vocal': id }); b.dataset = { vocal: id };
      const lire = el({ 'aria-label': 'Lire' }), onde = el({ 'aria-valuemax': String(dur), 'aria-valuenow': '0' }), vit = el({ 'aria-label': 'Vitesse de lecture' }), past = { textContent: '' }, d = { textContent: '' };
      vit.role = 'vitesse'; vit.querySelector = s => s === '.vocal-pastille' ? past : null; [lire, onde, vit].forEach(x => { x.bulle = b; });
      const barres = Array.from({ length: 10 }, () => { const x = { on: false }; x.classList = { toggle: (c, on) => { x.on = !!on; } }; return x; });
      b.querySelector = s => ({ '[data-lire]': lire, '.vocal-duree': d, '.onde': onde, '[data-vitesse]': vit, '.onde[data-onde]': onde })[s] || null;
      b.querySelectorAll = s => s === '.onde i' ? barres : [];
      b.joue = () => barres.filter(x => x.on).length; b.vit = vit; b.past = past; b.lire = lire; b.duree = d;
      return b;
    };
    class FauxAudio {
      constructor() { cV.audios.push(this); this.l = {}; this.pp = false; this.playbackRate = 1; this.defaultPlaybackRate = 1; this.readyState = 0; this.currentTime = 0; this.paused = true; this.s = null; this.refus = null; }
      set preservesPitch(x) { this.pp = x; } get preservesPitch() { return this.pp; }
      addEventListener(t, f) { (this.l[t] = this.l[t] || []).push(f); }
      emettre(t) { (this.l[t] || []).forEach(f => f()); }
      set src(u) { this.s = u; this.readyState = 0; this.currentTime = 0; } get src() { return this.s; }
      getAttribute(k) { return k === 'src' ? this.s : null; }
      play() { this.paused = false; cV.joues.push(this.s); const r = this.refus; this.refus = null; return r ? Promise.reject(r) : Promise.resolve(); }
      pause() { this.paused = true; }
    }
    try {
      cV = { source: {}, appels: [], audios: [], joues: [], avis: [], horloge: 1000, tic: null, etat: { convDonnees: null }, MOI: { id: 'p_moi' }, bulles: new Map(), annonce: { textContent: '' }, Audio: FauxAudio };
      cV.document = { activeElement: null,
        querySelector: s => { const m = /data-vocal="([^"]*)"/.exec(s); return m ? cV.bulles.get(m[1]) || null : null; },
        querySelectorAll: s => Array.from(cV.bulles.values()).filter(b => /data-lecture|data-pause/.test(s) ? b.hasAttribute('data-lecture') || b.hasAttribute('data-pause') : true) };
      cV.trouverMessage = id => cV.etat.convDonnees && cV.etat.convDonnees.messages.find(m => m.id === id);
      cV.duree = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      cV.blob = u => typeof u === 'string' && u.indexOf('blob:') === 0; cV.avis = t => cV.avis.liste.push(t); cV.avis.liste = []; cV.phrase = (e, d) => d;
      cV.cm = { l: {}, addEventListener(t, f) { (cV.cm.l[t] = cV.cm.l[t] || []).push(f); } };
      cV.$ = id => id === 'conv-annonce' ? cV.annonce : id === 'conv-messages' ? cV.cm : null; cV.getComputedStyle = () => ({ direction: 'ltr' });
      cV.setInterval = f => { cV.tic = f; return 1; }; cV.clearInterval = () => { cV.tic = null; }; cV.Date = { now: () => cV.horloge };
      cV.arreterEcoute = () => {};      // « Écouter » (28 octobre 2026) : lancer un vocal coupe la synthèse — la vraie `arreterEcoute` est jouée par test-3130
      vm.createContext(cV);
      vm.runInContext(JS.slice(iV, fI) + '\nthis.V = { vitesse, libVitesse, changerVitesse, enchainer, lireVocal, arreterLecture, allerA, appliquerLecture, positionCourante, lect, positions };', cV, { timeout: 2000 });
      V = cV.V;
    } catch (e) { V = null; }
    vrai('(population) le lecteur de vocaux ENTIER (et les gestes de l\'onde) s\'exécute dans un bac à sable (' + (fI - iV) + ' caractères)', iV > 0 && fV > iV && fI > fV && !!V && ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown'].every(t => (cV.cm.l[t] || []).length === 1));
    if (V) try {
      const sans = V.vitesse();
      cV.source = { vitesseVocal: () => 1.5, choisirVitesseVocal: (x) => { cV.appels.push(x); return Promise.resolve(Number(x)); } };
      const compte = V.vitesse();
      V.changerVitesse(); const a = V.vitesse(), an = cV.annonce.textContent; V.changerVitesse(); const b = V.vitesse(); V.changerVitesse(); const c = V.vitesse();
      v('⛔ la vitesse : 1 sans réglage, celle du COMPTE sinon (1,5) ; la pastille fait le tour 1,5 → 2 → 1 → 1,5 et chaque choix part au compte, en chaîne ; libellé « 1,5× » ; le changement est ANNONCÉ (« ' + an + ' »)',
        [sans, compte, a, b, c, cV.appels, V.libVitesse(1.5), V.libVitesse(2), an], [1, 1.5, 2, 1, 1.5, ['2', '1', '1.5'], '1,5×', '2×', 'Vitesse 2×']);
      await new Promise(r => setTimeout(r, 0));
      /* le compte REFUSE : le choix vaut pour la visite (la source, elle, dit toujours 1) */
      cV.source = { vitesseVocal: () => 1.5, choisirVitesseVocal: () => Promise.reject(new Error('refus')) };
      V.changerVitesse(); await new Promise(r => setTimeout(r, 0));
      v('⛔ le compte REFUSE le choix : il vaut quand même pour la visite (2×, pas le 1,5× que le compte garde)', V.vitesse(), 2);
      let compteV = 1.5;                                                                            // un compte qui RETIENT ce qu'on lui confie
      cV.source = { vitesseVocal: () => compteV, choisirVitesseVocal: (x) => { compteV = Number(x); return Promise.resolve(compteV); } };
      V.changerVitesse(); V.changerVitesse(); await new Promise(r => setTimeout(r, 0));          // 2 → 1 → 1,5 : retenu par le compte, la visite rend la main
      const M = (id, auteur, extra) => Object.assign({ id, auteur, t: 1 }, extra || {});
      const fil = (msgs, sansBulle) => { cV.etat.convDonnees = { messages: msgs }; cV.bulles = new Map(msgs.filter(m => m.vocal && !(sansBulle || []).includes(m.id)).map(m => [m.id, bulle(m.id, m.vocal.dur)])); };
      /* — l'enchaînement — */
      fil([M('m1', 'p_ben', { vocal: { dur: 3 } }), M('m2', 'p_ben', { vocal: { dur: 4 } }), M('m3', 'p_ana', { vocal: { dur: 2 } }), M('m4', 'p_ana', { texte: 'ok' }), M('m5', 'p_moi', { vocal: { dur: 2 } }), M('m6', 'p_moi', { vocal: { dur: 2 } }), M('m7', 'p_ben', { vocal: { dur: 2 } }), M('m8', 'p_ben', { vocal: { dur: 2 }, supprime: true }), M('m9', 'p_ben', { vocal: { dur: 2 } }), M('m10', 'p_ben', { vocal: { dur: 2 } })], ['m10']);
      const lus = []; for (const id of ['m1', 'm2', 'm3', 'm5', 'm7', 'm9']) { V.enchainer(id); lus.push(V.lect.mid); V.arreterLecture(true); }
      v('⛔ un vocal écouté jusqu\'au bout enchaîne le vocal SUIVANT de la même personne — pas celui d\'une autre, pas après un texte, jamais les miens, jamais un vocal supprimé, jamais une bulle absente du fil',
        lus, ['m2', null, null, null, null, null]);
      /* — le vrai lecteur — */
      fil([M('w1', 'p_ben', { vocal: { dur: 10, url: 'blob:w1' } }), M('w2', 'p_ben', { vocal: { dur: 6, url: 'blob:w2' } }), M('w3', 'p_ana', { vocal: { dur: 5, url: 'blob:w3' } })]);
      V.lireVocal('w1'); const A1 = cV.audios[0];
      const l1 = { n: cV.audios.length, vit: A1 && A1.playbackRate, def: A1 && A1.defaultPlaybackRate, hauteur: A1 && A1.preservesPitch, src: A1 && A1.src, lecture: cV.bulles.get('w1').hasAttribute('data-lecture'), pastille: cV.bulles.get('w1').past.textContent };
      V.changerVitesse(); const enCours = A1.playbackRate; V.changerVitesse(); V.changerVitesse();     // 2×, puis retour à 1,5×
      v('⛔ le vrai lecteur prend la vitesse choisie, la voix garde sa HAUTEUR, et une vitesse changée en cours d\'écoute vaut tout de suite',
        [l1.n, l1.vit, l1.def, l1.hauteur, l1.src, l1.lecture, l1.pastille, enCours], [1, 1.5, 1.5, true, 'blob:w1', true, '1,5×', 2]);
      A1.readyState = 1; A1.emettre('loadedmetadata'); A1.currentTime = 4;
      V.lireVocal('w1');                                                                            // toucher le vocal qui joue : pause
      const p1 = { pos: V.positions.get('w1'), pause: cV.bulles.get('w1').hasAttribute('data-pause'), barres: cV.bulles.get('w1').joue(), lab: cV.bulles.get('w1').lire.getAttribute('aria-label'), arret: A1.paused };
      V.lireVocal('w1'); const p2 = { t: A1.currentTime, src: A1.src, n: cV.audios.length, joue: !A1.paused };
      A1.currentTime = 10; A1.emettre('ended');
      const p3 = { pos: V.positions.has('w1'), chaine: V.lect.mid, meme: cV.audios.length, src: A1.src };
      v('⛔ une PAUSE garde la position (4 s : 4 barres, « Reprendre ») ; relire repart de LÀ, sur le MÊME élément Audio ; écouté jusqu\'au bout, il repart de zéro et ENCHAÎNE le suivant de la même personne — toujours le même élément (iOS)',
        [p1.pos, p1.pause, p1.barres, /^Reprendre/.test(p1.lab), p1.arret, p2.t, p2.n, p2.joue, p3.pos, p3.chaine, p3.meme, p3.src], [4, true, 4, true, true, 4, 1, true, false, 'w2', 1, 'blob:w2']);
      /* l'enchaînement refusé par le navigateur (aucun geste) : il s'arrête SANS avis ; un refus au toucher, lui, se dit */
      A1.readyState = 1; A1.emettre('loadedmetadata'); A1.currentTime = 6; A1.refus = Object.assign(new Error('x'), { name: 'NotAllowedError' });
      cV.etat.convDonnees.messages.splice(2, 0, M('w2b', 'p_ben', { vocal: { dur: 3, url: 'blob:w2b' } })); cV.bulles.set('w2b', bulle('w2b', 3));
      A1.emettre('ended'); await new Promise(r => setTimeout(r, 0));
      const r1 = { avis: cV.avis.liste.length, mid: V.lect.mid };
      A1.refus = Object.assign(new Error('x'), { name: 'NotAllowedError' }); V.lireVocal('w3'); await new Promise(r => setTimeout(r, 0));
      v('⛔ un enchaînement refusé (iOS, sans geste) s\'arrête sans un mot ; un refus au TOUCHER dit « Touche encore… »', [r1.avis, r1.mid, cV.avis.liste.length, /Touche encore/.test(cV.avis.liste[0] || '')], [0, null, 1, true]);
      /* — l'onde et le clavier — */
      V.allerA('w3', 99);
      const f1 = { pos: V.positions.get('w3'), barres: cV.bulles.get('w3').joue(), pause: cV.bulles.get('w3').hasAttribute('data-pause') };
      V.lireVocal('w3'); const f2 = A1.currentTime; V.arreterLecture();
      V.allerA('w2', 0.1); const f3 = { pos: V.positions.has('w2'), pause: cV.bulles.get('w2').hasAttribute('data-pause') };
      v('⛔ l\'onde : « Fin » sur un vocal au repos MONTRE la fin (10 barres sur 10, en pause) au lieu de revenir à zéro, et relire repart du début ; tout au début, rien n\'est gardé',
        [f1.pos, f1.barres, f1.pause, f2, f3.pos, f3.pause], [5, 10, true, 0, false, false]);
      fil([M('u1', 'p_ben', { vocal: { dur: 5, url: 'blob:u1' } }), M('u2', 'p_ana', { vocal: { dur: 5, url: 'blob:u2' } })]); cV.avis.liste.length = 0;
      A1.refus = Object.assign(new Error('x'), { name: 'AbortError' }); V.lireVocal('u1'); V.lireVocal('u2'); await new Promise(r => setTimeout(r, 0));
      v('⛔ une écoute REMPLACÉE avant d\'avoir démarré (même élément Audio : son play() est abandonné) ne coupe pas la suivante, et ne dit rien', [V.lect.mid, A1.paused, cV.avis.liste.length], ['u2', false, 0]);
      V.arreterLecture();
      /* — les GESTES de l'onde (les vrais écouteurs) : au doigt, rien à l'appui ; un glissé de plus de 8 px vise ; un geste repris par le navigateur rend la position d'avant ; un toucher simple
         vise au relâcher ; à la souris, dès l'appui ; ⌥ + flèche n'est pas à l'onde — */
      fil([M('g1', 'p_ben', { vocal: { dur: 10, url: 'blob:g1' } })]);
      const og = cV.bulles.get('g1').querySelector('.onde'); og.dataset = { onde: 'g1' }; og.isConnected = true; og.closest = sel => sel === '.vocal .onde[data-onde]' ? og : null;
      og.getBoundingClientRect = () => ({ left: 100, width: 100 }); og.setPointerCapture = () => {};
      const ev = (t, o) => (cV.cm.l[t] || []).forEach(f => f(Object.assign({ target: og, pointerId: 7, button: 0, pointerType: 'touch', clientX: 150, preventDefault() {} }, o || {})));
      const kd = (key, o) => (cV.cm.l.keydown || []).forEach(f => f(Object.assign({ target: og, key, preventDefault() {} }, o || {})));
      const pg = () => V.positions.get('g1');
      V.allerA('g1', 3); const g = [pg()];
      ev('pointerdown', { clientX: 150 }); g.push(pg()); ev('pointermove', { clientX: 154 }); g.push(pg()); ev('pointercancel'); g.push(pg());
      ev('pointerdown', { clientX: 150 }); ev('pointermove', { clientX: 170 }); g.push(pg()); ev('pointercancel'); g.push(pg());
      ev('pointerdown', { clientX: 120 }); ev('pointerup', { clientX: 120 }); g.push(pg());
      ev('pointerdown', { clientX: 180, pointerType: 'mouse' }); g.push(pg()); ev('pointerup', { clientX: 180, pointerType: 'mouse' });
      kd('ArrowLeft', { altKey: true }); g.push(pg()); kd('ArrowLeft', { metaKey: true }); g.push(pg()); kd('ArrowLeft'); g.push(pg()); kd('End'); g.push(pg());
      v('⛔ l\'onde, par ses VRAIS écouteurs : au doigt, l\'appui et un frémissement (4 px) ne bougent rien ; un glissé de 20 px vise (7 s), et repris par le navigateur rend 3 s ; un toucher simple vise au relâcher (2 s) ; la souris vise dès l\'appui (8 s) ; ⌥/⌘ + flèche restent au système, la flèche recule de 5 s, Fin montre la fin',
        g, [3, 3, 3, 3, 7, 3, 2, 8, 8, 8, 3, 10]);
      /* — le vocal d'EXEMPLE (sans fichier) : il avance à la vitesse choisie, changée en cours d'écoute — */
      fil([M('x1', 'p_ben', { vocal: { dur: 20 } })]);
      V.changerVitesse(); await new Promise(r => setTimeout(r, 0));                                 // 1,5 → 2
      V.lireVocal('x1'); cV.horloge += 1000; cV.tic(); const e1 = V.positionCourante();
      V.changerVitesse(); cV.horloge += 1000; cV.tic(); const e2 = V.positionCourante();            // 2 → 1
      v('⛔ le vocal d\'exemple avance à la vitesse choisie (1 s à 2× = 2 s), et une vitesse changée en cours d\'écoute vaut dès le tic suivant (+1 s à 1×)', [e1, e2], [2, 3]);
      /* — un vocal à moi parti pendant qu'on l'écoute : l'écoute suit le vrai identifiant — */
      const cid = 'a'.repeat(32);
      fil([M('p:' + cid, 'p_moi', { vocal: { dur: 8, url: 'blob:moi' }, cid, attente: true })]);
      V.lireVocal('p:' + cid);
      cV.etat.convDonnees = { messages: [M('vrai1', 'p_moi', { vocal: { dur: 8, url: 'blob:moi' }, cid })] }; cV.bulles = new Map([['vrai1', bulle('vrai1', 8)]]);
      V.appliquerLecture();
      v('⛔ un vocal à moi qui part pendant qu\'on l\'écoute : l\'écoute continue sous son VRAI identifiant (rattachée par le `cid`), sans s\'arrêter', [V.lect.mid, A1.paused, cV.bulles.get('vrai1').hasAttribute('data-lecture')], ['vrai1', false, true]);
      V.arreterLecture();
      /* — la conversation fermée pendant l'écoute : la position est gardée (la durée ne vient plus du fil) — */
      fil([M('y1', 'p_ben', { vocal: { dur: 30, url: 'blob:y1' } })]);
      V.lireVocal('y1'); A1.readyState = 1; A1.emettre('loadedmetadata'); A1.currentTime = 12;
      cV.etat.convDonnees = null; V.arreterLecture();
      v('⛔ fermer la conversation pendant une écoute GARDE la position (même si le fil n\'est plus là)', V.positions.get('y1'), 12);
      /* — la pastille sous le focus quand l'écoute finit : le focus revient au bouton de lecture — */
      fil([M('z1', 'p_ben', { vocal: { dur: 4, url: 'blob:z1' } })]);
      V.lireVocal('z1'); cV.bulles.get('z1').vit.focus(); A1.currentTime = 4; A1.emettre('ended');
      v('⛔ la pastille avait le focus quand l\'écoute finit : il revient au bouton de lecture de la même bulle (jamais sur la page)', cV.document.activeElement === cV.bulles.get('z1').lire, true);
    } catch (e) { vrai('le lecteur de vocaux s\'exécute sans jeter (' + String(e && e.message || e).slice(0, 160) + ')', false); }
    vrai('⛔ la bulle vocale n\'est plus UN bouton : un conteneur, un bouton de lecture (44 px, le disque de 28 dedans), l\'onde en CURSEUR (role slider, focusable), la pastille de vitesse SANS libellé dans le balisage mémorisé',
      /h \+= '<div class="vocal ' \+ sens \+ ' presse" data-vocal="' \+ esc\(m\.id\) \+ '">' \+\s*'<button type="button" class="vocal-lire" data-lire="/.test(JS) && /'<span class="onde" data-onde="' \+ esc\(m\.id\) \+ '" role="slider" tabindex="0" aria-label="Position dans le message vocal"/.test(JS)
      && /'<button type="button" class="vocal-vitesse" data-vitesse="' \+ esc\(m\.id\) \+ '" aria-label="Vitesse de lecture"><span class="vocal-pastille"><\/span><\/button><\/div>';/.test(JS) && /\.vocal-lire \{ width: 44px; height: 44px; margin: -8px;/.test(CSS));
    vrai('⛔ sur MES vocaux, la place de la pastille est gardée au repos (la bulle ne grandit pas vers la gauche sous le doigt) ; l\'onde qui reste à écouter se voit (opacité .65)',
      /\.vocal-vitesse \{ display: none; visibility: hidden;/.test(CSS) && /\.vocal\.envoyee \.vocal-vitesse \{ display: inline-flex; \}\s*\.vocal\[data-lecture\] \.vocal-vitesse, \.vocal\[data-pause\] \.vocal-vitesse \{ display: inline-flex; visibility: visible; \}/.test(CSS)
      && /\.vocal\[data-lecture\] \.onde i, \.vocal\[data-pause\] \.onde i \{ opacity: \.65; \}/.test(CSS));
    vrai('⛔ fermer la conversation arrête l\'écoute AVANT de vider le fil ; le focus sur l\'onde ou la pastille survit au rendu d\'une bulle',
      /arreterLecture\(\);[^\n]*\n\s*etat\.conv = null; etat\.convDonnees = null;/.test(corps('function fermerConv')) && /actif\.dataset\.onde \? 'onde' : actif\.dataset\.vitesse \? 'vitesse'/.test(JS) && /if \(cle === 'vitesse'\) appliquerLecture\(\);/.test(JS));
    vrai('⛔ toucher l\'onde y VA sans lancer la lecture (le clic qui suit ne relit pas), la pastille passe avant la lecture, et l\'appui long (menu du message) ne part pas de l\'onde',
      /if \(e\.target\.closest\('\[data-vitesse\]'\)\) \{ changerVitesse\(\); return; \}\s*if \(e\.target\.closest\('\.vocal \.onde'\)\) return;/.test(JS) && /if \(!msg \|\| e\.target\.closest\('button, \.onde'\)\) return;/.test(JS)
      && /\.vocal \.onde \{ cursor: pointer; touch-action: pan-y;/.test(CSS));
    vrai('⛔ au DOIGT, l\'onde ne vise qu\'un geste sûr (glissé horizontal de plus de 8 px, ou toucher au relâcher), et un geste repris par le navigateur rend la position d\'avant ; ⌥/Ctrl/⌘ + flèche reste au système',
      /if \(!tient\.doigt\) \{ try \{ o\.setPointerCapture\(e\.pointerId\); \} catch \(er\) \{ \/\* rien \*\/ \} viser\(e\.clientX\); \}/.test(JS) && /if \(Math\.abs\(e\.clientX - tient\.x0\) <= 8\) return;/.test(JS)
      && /if \(!tient\.vise\) viser\(e\.clientX\); tient = null;/.test(JS) && /if \(t\.avant\.joue\) \{ if \(lect\.mid === t\.mid\) allerA\(t\.mid, t\.avant\.s\); \}/.test(JS) && /if \(!o \|\| e\.altKey \|\| e\.ctrlKey \|\| e\.metaKey\) return;/.test(JS));
  }
  vrai('⛔ Perso / Pro : ouvrir une conversation de l\'autre côté (recherche, bannière, lien) y bascule — la conversation ouverte est toujours dans la liste qu\'on voit',
    /if \(modesActifs\(\)\) \{ const c0 = etat\.conversations\.find\(x => x\.id === id\); if \(c0 && coteDe\(c0\) !== etat\.mode\) changerMode\(coteDe\(c0\), true\); \}/.test(corps('async function ouvrirConv')));
  vrai('Perso / Pro : du côté Pro, le titre de l\'onglet dit « OP MESSAGES PRO » et la marque porte la pastille PRO (lue en trois mots)',
    /const suffixeTitre = \(\) => modesActifs\(\) && etat\.mode === 'pro' \? SUFFIXE_TITRE\.replace\('OP MESSAGES', 'OP MESSAGES PRO'\) : SUFFIXE_TITRE;/.test(JS) && (HTML.match(/<span class="marque-pro" hidden><span class="sr-seul"> <\/span>PRO<\/span>/g) || []).length === 2);
  {
    const env = corps('async function envoyerTexte'), iConf = env.indexOf('confirmationRequise()'), iVide = env.indexOf("ta.value = ''");
    vrai('⛔ « Confirmer l\'envoi » : la PREMIÈRE touche demande, la seconde envoie — la demande passe AVANT que le champ se vide et que l\'envoi parte (une modification n\'est pas un envoi)',
      /if \(!\(ctx0 && ctx0\.type === 'modif'\) && confirmationRequise\(\) && etat\.confirmeAttente !== etat\.conv\) \{ demanderConfirmation\(\); return; \}/.test(env) && iConf > 0 && iVide > iConf && env.indexOf('etat.envoiEnCours = true') > iConf);
  }
  vrai('« Confirmer l\'envoi » : retaper le texte annule la demande (on ne confirme pas un texte qu\'on n\'a pas relu) ; « Groupes et canaux » = une conversation à plusieurs ; un compte pro seulement',
    /\$\('saisie'\)\.addEventListener\('input', \(\) => fermerConfirmation\(\)\);/.test(JS) && /return x === 'partout' \|\| \(x === 'groupes' && multi\(convCourante\(\)\)\);/.test(JS) && /const convCourante = \(\) => \(etat\.convDonnees && etat\.convDonnees\.id === etat\.conv \? etat\.convDonnees : null\) \|\| etat\.conversations\.find\(x => x\.id === etat\.conv\) \|\| null;/.test(JS) && /const confirmerActif = \(\) => !!\(etat\.pro && CAP\.confirmerEnvoi/.test(JS));

  /* relecture du 7 octobre 2026 (« vérifie tout de A à Z ») : les six défauts trouvés, gardés sur le CODE */
  vrai('⛔ « Confirmer l\'envoi » : le geste qui DEMANDE ne confirme pas — une touche Entrée tenue (répétition) n\'envoie rien, et la confirmation n\'est prise qu\'après 400 ms (double toucher sur la flèche)',
    /const confirmeTropTot = \(\) => etat\.confirmeAttente === etat\.conv && performance\.now\(\) - \(etat\.confirmeDepuis \|\| 0\) < 400;/.test(JS) && /etat\.confirmeAttente = etat\.conv; etat\.confirmeDepuis = performance\.now\(\);/.test(JS)
      && /\{ e\.preventDefault\(\); if \(e\.repeat \|\| confirmeTropTot\(\)\) return; envoyerTexte\(\); \}/.test(JS));
  vrai('⛔ « Confirmer l\'envoi » vaut aussi dans le chat de la SALLE (une réunion est à plusieurs) : le premier envoi devient « Confirmer », retaper annule',
    /if \(salleConfirmationRequise\(A\) && X\.confirme !== t\) \{ X\.confirme = t; sallePanneauRendre\(A, true\);/.test(JS) && /function salleConfirmationRequise\(A\) \{\s*if \(!confirmerActif\(\) \|\| source\.confirmerEnvoi\(\) === 'jamais'\) return false;/.test(JS) && /<button type="submit">' \+ \(X\.confirme \? 'Confirmer' : 'Envoyer'\) \+ '<\/button>/.test(JS)
      && /if \(enSalle\(A\) && sx\(A\)\.confirme\) \{ sx\(A\)\.confirme = null; sallePanneauRendre\(A, true\); \}/.test(JS));
  vrai('⛔ Perso / Pro : le lien « Invitations » passe du côté de l\'invitation avant d\'ouvrir la liste ; créer ou rejoindre un espace passe côté Pro (sans couvrir « Tu as rejoint… »)',
    /const i0 = etat\.conversations\.find\(c => c\.invitation === 'recue'\); if \(i0 && !dansMode\(i0\)\) changerMode\(coteDe\(i0\), true\);/.test(JS)
      && (JS.match(/chargerEspaces\(\); if \(modesActifs\(\)\) changerMode\('pro', true, true\);/g) || []).length === 2 && /if \(!muet\) annonceMode\(m\);/.test(JS));
  vrai('⛔ focus : Espace HORS d\'un champ est un geste de clavier (l\'anneau rendu se voit) ; et la règle qui éteint l\'anneau rendu au doigt gagne sur les anneaux écrits plus loin',
    /&& !\(e\.key === ' ' && !champTexte\(e\.target\)\)\) return;/.test(JS) && /\[data-focus-doux\]:focus-visible \{ outline: none !important; \}/.test(CSS));

  /* ⛔ L'AGENDA DE PRO (10 octobre 2026 : « la semaine pareil que le mois », « un clic droit […] des manipulations », « glisser […] voulez-vous décaler ce rendez-vous […] ça envoie
     aux deux personnes ») — les VRAIES fonctions exécutées : qui peut décaler, ce que le menu propose selon le rôle, les chevauchements, la case du jour ; le geste (clic droit à
     l'endroit du clic, glisser, la feuille, la notification de l'autre) est joué par tests/sonde-opmessages-agenda-decaler.js contre le vrai service */
  {
    const iA = JS.indexOf('const titreElt = x =>'), fFin = JS.indexOf("if (!etat.groupe.ouvert || etat.groupe.mode !== 'decaler') return;", iA), fA = JS.lastIndexOf("$('info-corps').addEventListener", fFin);
    let G = null, cA = null;
    const maintenant = Date.now(), H = 3600000;
    try {
      cA = { CAP: { agenda: true, salles: true }, source: { decalerReunion() {}, majEvenement() {}, faitEvenement() {}, reporterEvenement() {}, supprimerEvenement() {}, annulerReunion() {} },
        MOI: { id: 'p_moi' }, etat: { conversations: [{ id: 'c_r1', cote: 'pro' }] }, reu: { liste: [], evenements: [], charge: true, mois: 0, jour: 0 }, JOUR_MS: 86400000, NOM_COTE: { perso: 'Perso', pro: 'Pro' },
        STATUTS_REPONSE: [['accepte', 'Accepter'], ['peutetre', 'Peut-être'], ['decline', 'Refuser']], PHRASE_REUNION_PERDUE: 'perdue', ID_EVT: /^e_[0-9a-f]{32}$/,
        FMT_HEURE: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }), FMT_JOUR_LONG: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }),
        FMT_JOUR_COURT: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }), maj1: x => x.charAt(0).toUpperCase() + x.slice(1),
        esc: x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
        libelleEtat: r => r.annulee ? 'Annulée' : r.moi.hote ? 'Organisateur' : r.moi.statut === 'attente' ? 'À répondre' : '', premierDuMois: () => 0, plusJours: (t, n) => t + n * 86400000,
        modesActifs: () => cA.modes === true, coteReu: () => 'pro', coteEvt: () => 'perso', nomPersonne: id => ({ p_bob: 'Bob Martin', p_cleo: 'Cléo Durand', p_dan: 'Dan', p_eve: 'Eve' })[id] || 'Quelqu\'un',
        occurrencesDuJour: () => cA.duJour || [] };
      vm.createContext(cA);
      const iL = JS.indexOf('function localDans(t, tz) {'), fL = JS.indexOf('const PAYS_FUSEAUX = [', iL), ligne = d => { const i = JS.indexOf(d); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
      /* (lot m05) l'heure répétée du changement d'heure se dit : `heureSaison` / `plageHeures` vivent près de FMT_HEURE, hors de la tranche — les VRAIES, avec le FMT_HEURE du bac */
      const iH = JS.indexOf('const heureSaison = '), saison = iH < 0 ? '' : JS.slice(iH, JS.indexOf('\n  };', iH) + 5) + '\n' + ligne('const plageHeures = ') + '\n' + ligne('const FMT_JOUR_FIN = ') + '\n' + ligne('const FMT_JJMM = ') + '\n' + ligne('const autreJour = ') + '\n' + ligne('const minutesDuJour = ') + '\n' + ligne('const jourFinDit = ') + '\n' + ligne('const finLue = ') + '\n' + ligne('const plageLongue = ');
      /* « Y aller » au menu (15 octobre 2026) : la destination se lit par les VRAIES `estUrl` et `destinationGps`, définies hors de la tranche */
      vm.runInContext((iL > 0 && fL > iL ? JS.slice(iL, fL) : '') + '\n' + ligne('const dateDeChaine = s =>') + '\n' + ligne('const minuitDe = t =>') + '\n' + ligne('const estUrl = ') + '\n' + ligne('const destinationGps = ') + '\n' + saison + '\n' + JS.slice(iA, fA) +
        '\nthis.G = { peutDecaler, raisonNonDecalable, htmlMenuAgenda, conflitsAgenda, caseJour, elementAgenda, phrasePrevenus, modeleDecalage, snapDecalage, debutDecale, jourDans, joursEntre, cleAgenda };', cA, { timeout: 2000 });
      G = cA.G;
    } catch (e) { G = null; }
    vrai('(population) les fonctions de l\'agenda de pro s\'exécutent dans un bac à sable (' + (fA - iA) + ' caractères)', iA > 0 && fFin > iA && fA > iA && !!G);
    if (G) try {
      const R = (o) => Object.assign({ id: 'r1', conv: 'c_r1', titre: 'Visite', tz: 'Europe/Paris', annulee: false, repetition: 'aucune', participants: ['p_moi', 'p_bob'], participantsN: 2, rejoignable: false, moi: { hote: true, statut: 'accepte' }, occurrences: [] }, o || {});
      const futur = { debut: maintenant + 26 * H, fin: maintenant + 27 * H, seance: null };
      const x = (r, o) => ({ r, o: o || futur });
      const cas = [x(R()), x(R({ moi: { hote: false, statut: 'attente' } })), x(R({ repetition: 'hebdomadaire' })), x(R({ annulee: true })), x(R(), { debut: maintenant - 3 * H, fin: maintenant - 2 * H, seance: null }), { e: { id: 'e1', titre: 'Dentiste', debut: futur.debut, fin: futur.fin }, o: futur }];
      v('⛔ qui peut DÉCALER : l\'organisateur, une réunion à venir, ni série, ni annulée, ni passée ; un événement à soi — et une phrase dit pourquoi sinon',
        [cas.map(G.peutDecaler), G.raisonNonDecalable(cas[1]), G.raisonNonDecalable(cas[2])], [[true, false, false, false, false, true], 'Seul l\'organisateur peut décaler cette réunion.', 'Une réunion qui se répète se modifie en entier : « Modifier la réunion », dans sa fiche.']);
      const actions = h => Array.from(h.matchAll(/data-ag-menu="([a-z-]+)"(?: data-statut="([a-z]+)" aria-pressed="(true|false)")?/g)).map(m => m[1] + (m[2] ? ':' + m[2] + (m[3] === 'true' ? '*' : '') : ''));
      v('⛔ le menu de l\'ORGANISATEUR : ouvrir, décaler, écrire aux participants, annuler — jamais « répondre », ⛔ jamais le .ics (15 octobre 2026 : « retire aussi » ; le fichier .ics est parti du service le 16 octobre 2026)', actions(G.htmlMenuAgenda(cas[0])), ['ouvrir', 'decaler', 'conversation', 'annuler']);
      v('⛔ le menu de l\'INVITÉ : ouvrir, répondre (sa réponse cochée), écrire — jamais décaler ni annuler, ⛔ jamais le .ics', actions(G.htmlMenuAgenda(x(R({ moi: { hote: false, statut: 'peutetre' } })))), ['ouvrir', 'reponse:accepte', 'reponse:peutetre*', 'reponse:decline', 'conversation']);
      v('une SÉRIE organisée : « Modifier la série… » au lieu de « Décaler… »', actions(G.htmlMenuAgenda(cas[2])).includes('modifier') && !actions(G.htmlMenuAgenda(cas[2])).includes('decaler'), true);
      v('un événement : ouvrir, décaler, fait, reporter, supprimer ; « Voir le message » seulement s\'il vient d\'un message ; « Ranger dans » seulement avec les deux côtés',
        [actions(G.htmlMenuAgenda(cas[5])), (() => { cA.modes = true; const a = actions(G.htmlMenuAgenda({ e: Object.assign({}, cas[5].e, { source: { conv: 'c_x', seq: 3 } }), o: futur })); cA.modes = false; return a; })()],
        [['ouvrir', 'decaler', 'fait', 'reporter', 'supprimer'], ['ouvrir', 'decaler', 'fait', 'reporter', 'voir', 'cote', 'supprimer']]);
      /* « Y aller » (15 octobre 2026) : un lieu, et ni une visio, ni une réunion annulée ou passée, ni un événement fait */
      v('« Y aller » paraît au menu avec un lieu — avant « Écrire aux participants » pour une réunion, après « Reporter » pour un événement — jamais pour une visio, une annulée, une passée, un fait',
        [actions(G.htmlMenuAgenda(x(R({ lieu: '8 rue Lafayette' })))), actions(G.htmlMenuAgenda(x(R({ lieu: 'https://visio.exemple.fr/salle' })))).includes('gps'), actions(G.htmlMenuAgenda(x(R({ lieu: '8 rue Lafayette', annulee: true })))).includes('gps'),
          actions(G.htmlMenuAgenda(x(R({ lieu: '8 rue Lafayette' }), cas[4].o))).includes('gps'), actions(G.htmlMenuAgenda({ e: Object.assign({}, cas[5].e, { lieu: '4 avenue Foch' }), o: futur })),
          actions(G.htmlMenuAgenda({ e: Object.assign({}, cas[5].e, { lieu: '4 avenue Foch', fait: Date.now() }), o: futur })).includes('gps'),
          actions(G.htmlMenuAgenda({ e: Object.assign({}, cas[5].e, { lieu: '4 avenue Foch' }), o: cas[4].o })).includes('gps')],
        [['ouvrir', 'decaler', 'gps', 'conversation', 'annuler'], false, false, false, ['ouvrir', 'decaler', 'fait', 'reporter', 'gps', 'supprimer'], false, false]);
      vrai('le titre du menu est ÉCHAPPÉ (un titre « <img onerror> » reste du texte)', /&lt;img onerror&gt;/.test(G.htmlMenuAgenda(x(R({ titre: '<img onerror>' })))) && !/<img onerror>/.test(G.htmlMenuAgenda(x(R({ titre: '<img onerror>' })))));
      /* les chevauchements : des DEUX côtés (on ne peut pas être à deux endroits), jamais soi-même, ni une réunion annulée ou refusée, ni une journée entière, ni un rappel fait */
      const o = (h1, h2) => ({ debut: maintenant + h1 * H, fin: maintenant + h2 * H, seance: null });
      cA.reu.liste = [R({ id: 'r1', occurrences: [o(26, 27)] }), R({ id: 'r2', titre: 'Perso', occurrences: [o(26.5, 27.5)] }), R({ id: 'r3', annulee: true, occurrences: [o(26, 27)] }), R({ id: 'r4', moi: { hote: false, statut: 'decline' }, occurrences: [o(26, 27)] }), R({ id: 'r5', occurrences: [o(30, 31)] })];
      cA.reu.evenements = [{ id: 'e1', titre: 'A', debut: maintenant + 26 * H, fin: maintenant + 26.25 * H }, { id: 'e2', titre: 'J', journee: true, debut: maintenant, fin: maintenant + 48 * H }, { id: 'e3', titre: 'F', fait: true, debut: maintenant + 26 * H, fin: maintenant + 27 * H }];
      v('⛔ un CHEVAUCHEMENT : r2 et l\'événement e1 — pas la réunion elle-même, ni une annulée, ni une refusée, ni une journée entière, ni un rappel fait, ni ce qui ne touche pas le créneau',
        G.conflitsAgenda(maintenant + 26 * H, maintenant + 27 * H, 'r1').map(y => y.r ? y.r.id : y.e.id).sort(), ['e1', 'r2']);
      v('l\'occurrence d\'une série se retrouve par son début ; une réunion d\'une seule date, même sans début dit', [G.elementAgenda('r', 'r1', maintenant + 26 * H).o.debut, G.elementAgenda('r', 'r5', null).o.debut, G.elementAgenda('r', 'r1', 1), G.elementAgenda('e', 'e1').e.titre], [maintenant + 26 * H, maintenant + 30 * H, cA.reu.liste[0].occurrences.length === 1 ? G.elementAgenda('r', 'r1', 1) : null, 'A']);
      v('qui sera prévenu : les noms (trois au plus, puis « et N autres »), ou que rien n\'est envoyé', [G.phrasePrevenus(['p_bob']).slice(0, 29), /Bob Martin, Cléo Durand, Dan et 1 autre —/.test(G.phrasePrevenus(['p_bob', 'p_cleo', 'p_dan', 'p_eve'])), G.phrasePrevenus([])], ['Seront prévenus : Bob Martin ', true, 'Personne d\'autre n\'est invité : rien n\'est envoyé.']);
      /* ⛔ (relecture, I1) la liste de l'agenda ne porte que QUATRE participants : « qui sera prévenu » compte avec `participantsN` (organisateur compris), jamais avec la liste tronquée */
      cA.reu.liste = [R({ id: 'r6', titre: 'Six invités', participants: ['p_moi', 'p_bob', 'p_cleo', 'p_dan'], participantsN: 7, occurrences: [futur] })];
      const m6 = G.modeleDecalage({ type: 'r', id: 'r6', debut: futur.debut });
      v('⛔ six invités dont trois nommés dans la liste : le modèle en compte SIX, et la phrase dit « et 3 autres » ; sans un nom, la phrase compte encore',
        [m6 && m6.prevenusN, m6 && /Bob Martin, Cléo Durand, Dan et 3 autres —/.test(G.phrasePrevenus(m6.prevenus, m6.prevenusN)), /^Seront prévenus : 2 participants —/.test(G.phrasePrevenus([], 2))], [6, true, true]);
      /* ⛔ (relecture, I5) l'heure gardée est celle du FUSEAU de la réunion : 9 h à New York le mercredi 28 octobre (heure d'été là-bas) → 9 h à New York le mercredi 4 novembre (heure
         d'hiver là-bas) — un calcul à l'heure de l'appareil (Paris, ou UTC) donnerait 8 h à New York */
      const ny28 = Date.UTC(2026, 9, 28, 13, 0), ny4 = Date.UTC(2026, 10, 4, 14, 0);
      v('⛔ décaler de sept jours garde 9 h À NEW YORK (14:00 UTC le 4 novembre, pas 13:00) ; zéro jour ne change rien ; un fuseau illisible retombe sur l\'appareil',
        [G.debutDecale(ny28, 7, 'America/New_York'), G.debutDecale(ny28, 0, 'America/New_York'), G.debutDecale(ny28, 1, 'Pas/UnFuseau') - ny28], [ny4, ny28, 86400000]);
      v('les jours tirés se comptent d\'une case à l\'autre (un minuit de 23 ou 25 h compte un jour) ; une journée entière a la date de SON fuseau',
        [G.joursEntre(1000, 1000 + 2 * 86400000 - 3600000), G.joursEntre(1000, 1000 - 86400000), (d => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate())(new Date(G.jourDans(Date.UTC(2026, 9, 13, 22), 'Europe/Paris')))], [2, -1, 20261014]);
      /* la FICHE d'une réunion (hors de la fenêtre chargée) dit la même chose que l'agenda : qui peut, qui sera prévenu */
      const fiche = (o) => Object.assign({ titre: 'Hors semaine', debut: futur.debut, fin: futur.fin, tz: 'Europe/Paris', annulee: false, repetition: 'aucune', moi: { hote: true }, invites: [{ id: 'p_moi', hote: true }, { id: 'p_bob' }, { id: 'p_cleo' }] }, o || {});
      v('⛔ la fiche : l\'organisateur peut (deux prévenus, pas lui) ; l\'invité, une série, une annulée, une passée ne peuvent pas — et la phrase dit pourquoi',
        [(s => [s.peut, s.prevenusN, s.prevenus.join()])(G.snapDecalage('r_f', fiche())), G.snapDecalage('r_f', fiche({ moi: { hote: false } })).raison, G.snapDecalage('r_f', fiche({ repetition: 'hebdomadaire' })).peut, G.snapDecalage('r_f', fiche({ annulee: true })).raison, G.snapDecalage('r_f', fiche({ debut: maintenant - 3 * H, fin: maintenant - 2 * H })).raison, G.snapDecalage('r_f', null)],
        [[true, 2, 'p_bob,p_cleo'], 'Seul l\'organisateur peut décaler cette réunion.', false, 'Cette réunion est annulée.', 'Cette réunion est passée.', null]);
      /* la case : un conteneur, le numéro en bouton, chaque rendez-vous un bouton (sauf une séance terminée), « +N » au-delà */
      const t = Date.UTC(2026, 9, 12, 22);
      cA.reu.jour = t; cA.duJour = [x(R({ id: 'r1' })), x(R({ id: 'r9', titre: 'Finie' }), { debut: maintenant - 3 * H, fin: maintenant - 2 * H, seance: { dureeS: 600, n: 2 } }), { e: { id: 'e1', titre: 'Dentiste', debut: futur.debut, fin: futur.fin }, o: futur }, x(R({ id: 'r7', titre: 'Quatre' }))];
      const h = G.caseJour(t, t, 3, true);
      v('⛔ la case : un CONTENEUR (jamais un bouton qui en contient d\'autres), le numéro-bouton choisi et « aujourd\'hui », le nom du jour (semaine), deux rendez-vous boutons qu\'on peut tirer, la séance finie en simple texte, « +1 »',
        [/^<div class="mjour avec choisi" data-case="/.test(h), (h.match(/<button type="button" class="mjour-num presse" data-jour="\d+" aria-pressed="true" aria-current="date"/g) || []).length, /class="mjour-nom"/.test(h),
          (h.match(/<button type="button" class="mjour-elt[^"]* bouge presse" data-ag="[re]"/g) || []).length, /<span class="mjour-elt terminee" aria-hidden="true">/.test(h), /class="mjour-plus presse"[^>]*>\+1</.test(h), /<button[^>]*class="mjour[ "][^>]*>(?:(?!<\/button>).)*<button/.test(h)],
        [true, 1, true, 2, true, true, false], h.slice(0, 300));
    } catch (e) { vrai('l\'agenda de pro s\'exécute sans jeter (' + String(e && e.message || e).slice(0, 160) + ')', false); }
    vrai('⛔ le menu d\'un rendez-vous : un troisième visage du cadre des menus (fermé, il perd ses classes), ouvert au clic droit, à l\'appui long et au clavier, sans le délai de l\'appui long quand aucun clic fantôme ne suit',
      /\$\('menu-msg'\)\.classList\.remove\('pj', 'pt', 'ag'\); \$\('menu-fond'\)\.classList\.remove\('pj', 'ancre', 'de-moi', 'ag'\);/.test(JS) && /if \(m0\.agenda\) \{ if \(e\.target === \$\('menu-fond'\)\) fermerMenu\(\); else clicMenuAgenda\(e\); return; \}/.test(JS)
      && /ouvrirMenuAgenda\(el, souris \? \{ x: e\.clientX, y: e\.clientY \} : null, true\);/.test(JS) && /t: sansDelai \? 0 : Date\.now\(\)/.test(JS) && /if \(e\.button === 2\) \{ ag\.droit = Date\.now\(\); return; \}/.test(JS));
    vrai('⛔ annuler une réunion ou supprimer un événement depuis le menu demande une SECONDE touche, dite',
      /if \(act === 'annuler' && b\.dataset\.pret !== '1'\) \{/.test(JS) && /if \(act === 'supprimer' && b\.dataset\.pret !== '1'\) \{/.test(JS));
    vrai('⛔ RIEN NE PART AU LÂCHER : un rendez-vous tiré sur un autre jour ouvre la feuille « Décaler », l\'heure gardée ; la grille ne se redessine pas sous un rendez-vous qu\'on tire',
      /if \(jour !== null\) ouvrirDecaler\(T\.el\.dataset\.ag, T\.el\.dataset\.id, \+T\.el\.dataset\.debut \|\| null, retrouverAgenda\(T\.el, cle\), \{ jour, depart \}\);/.test(JS) && /if \(ag\.tire && ag\.tire\.actif\) \{ ag\.aRendre = true; return; \}/.test(JS)
      && /if \(D\.jour !== null && D\.depart !== null\) \{ const n = joursEntre\(D\.depart, D\.jour\); nd = X\.journee \? plusJours\(base, n\) : debutDecale\(X\.debut, n, X\.tz\); \}/.test(JS) && /\(CAP\.reunions && mode === 'decaler' && \(ID_REUNION\.test\(arg \|\| ''\) \|\| \(CAP\.agenda && ID_EVT\.test\(arg \|\| ''\)\)\)\)/.test(JS));
    vrai('⛔ (relecture) la case ENTIÈRE choisit le jour ; le focus d\'un rendez-vous de plusieurs jours revient sur SA case ; le bouton du menu se retrouve après un rafraîchissement ; Échap pendant un glisser avale le clic JUSQU\'AU relâcher ; un bouton relâché hors de la fenêtre arrête le glisser',
      /const b = e\.target\.closest\('\[data-jour\]'\) \|\| e\.target\.closest\('\.mjour\[data-case\]'\); if \(!b\) return;/.test(JS) && /return c \? \['\[data-case="' \+ p\(c\.dataset\.case\) \+ '"\] ' \+ base, base\] : \[base\];/.test(JS)
      && /const m0 = etat\.menu, d = m0\.agenda \? retrouverAgenda\(m0\.declencheur, m0\.cle\) : m0\.declencheur; etat\.menu = null;/.test(JS) && /declencheur: el, cle: cleAgenda\(el\),/.test(JS)
      && /if \(ag\.avale === e\.pointerId\) \{ ag\.avale = null; ag\.clicAvale = Date\.now\(\) \+ 500; \}/.test(JS) && /ag\.tire = null; ag\.avale = T\.id; finTirer\(T, false\);/.test(JS)
      && /if \(!\(e\.buttons & 1\)\) \{ ag\.tire = null; if \(T\.actif\) finTirer\(T, false\); return; \}/.test(JS));
    vrai('⛔ (relecture) une réunion absente de la fenêtre chargée se RELIT avant de dire « n\'existe plus » ; une réussite ne ferme que SA feuille ; une heure qui n\'existe pas et l\'heure du fuseau de la réunion se disent',
      /if \(type === 'r' && !D\.lu && typeof source\.reunion === 'function'\) \{/.test(JS) && (JS.match(/if \(reu\.decalageForm === F\) \{ reu\.decalage = null; reu\.decalageForm = null; if \(etat\.groupe\.ouvert && etat\.groupe\.mode === 'decaler'\) fermerCouche\(\); \}/g) || []).length === 2
      && /n\\'existe pas ce jour-là \(changement d\\'heure\) : ce sera '/.test(JS) && /'Heure de ' \+ villeDe\(F\.tz\)/.test(JS) && /if \(t === F\.base\)/.test(JS));
    vrai('⛔ (relecture) au doigt sur tablette : 44 px aux rendez-vous, au numéro et à « +N » de la semaine ; au mois, la case entière choisit le jour (les puces ne volent pas le toucher)',
      /@media \(min-width: 700px\) and \(pointer: coarse\) \{\s*\.sem-grille \.mjour-num \{ min-height: 44px; \}\s*\.sem-grille \.mjour-elt \{ min-height: 44px;[^}]*\}\s*\.sem-grille \.mjour-plus \{ min-height: 44px; min-width: 44px;[^}]*\}\s*#mois-jours \.mjour-elt, #mois-jours \.mjour-plus \{ pointer-events: none; \}/.test(CSS));
    vrai('⛔ la feuille envoie l\'heure LOCALE de la réunion dans SON fuseau, avec le motif ; un événement garde sa durée (et ses jours)',
      /source\.decalerReunion\(F\.id, \{ debut: localDans\(t, F\.tz\), fin: localDans\(t \+ F\.duree, F\.tz\), motif \}\)/.test(JS) && /\{ journee: true, debut: ymdDe\(t\), fin: ymdDe\(plusJours\(t, F\.jours - 1\)\) \} : \{ debut: localDans\(t, F\.tz\), fin: localDans\(t \+ F\.duree, F\.tz\) \}/.test(JS));
    vrai('la semaine est une grille dès 700 px (la bande des jours au téléphone) ; un rendez-vous ne garde pas le menu du système au doigt (pas de bulle d\'iOS)',
      /\.sem-jours \{ display: none; \}\s*\.sem-grille \{ display: grid; grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);/.test(CSS) && /-webkit-touch-callout: none;/.test(CSS) && /\.sem-grille \{ display: none; \}/.test(CSS));
  }
  /* ⛔ PERSO / PRO, CE QUI SE DIT (10 octobre 2026 : « je veux que tout soit bien différencié entre perso et pro ») — les VRAIES fonctions : l'étiquette d'une conversation de l'autre côté,
     le « Pro · » d'une bannière, « Confirmer l'envoi » qui ne retient jamais le Perso ; le titre « OP MESSAGES PRO » des notifications est gardé contre le vrai service (test-968, 973, 998) */
  {
    let PP = null, cP = null;
    try {
      cP = { etat: { mode: 'perso', conversations: [{ id: 'c_a', cote: 'pro' }, { id: 'c_b', cote: 'perso' }] }, NOM_COTE: { perso: 'Perso', pro: 'Pro' }, coteDe: c => c.cote, modesActifs: () => cP.modes !== false,
        source: { confirmerEnvoi: () => 'partout' }, multi: () => true, convCourante: () => cP.cc, confirmerActif: () => true };
      vm.createContext(cP);
      const iA = JS.indexOf('const autreCote = c =>'), fA = JS.indexOf('\n', iA), iP = JS.indexOf('function prefixeCote(conv)'), fP = JS.indexOf('\n', iP), iC = JS.indexOf('function confirmationRequise()'), fC = JS.indexOf('\n  }', iC) + 4;
      if (iA < 0 || iP < 0 || iC < 0) throw new Error('fonctions introuvables');
      vm.runInContext(JS.slice(iA, fA) + '\n' + JS.slice(iP, fP) + '\n' + JS.slice(iC, fC) + '\nthis.PP = { autreCote, prefixeCote, confirmationRequise };', cP, { timeout: 2000 });
      PP = cP.PP;
    } catch (e) { PP = null; }
    vrai('(population) les fonctions du Perso / Pro s\'exécutent dans un bac à sable', !!PP);
    if (PP) {
      const [ca, cb] = cP.etat.conversations;
      const perso = [PP.autreCote(ca), PP.autreCote(cb), PP.prefixeCote('c_a'), PP.prefixeCote('c_b'), PP.prefixeCote('c_inconnue'), PP.prefixeCote(null)];
      cP.etat.mode = 'pro'; const pro = [PP.autreCote(ca), PP.autreCote(cb), PP.prefixeCote('c_a'), PP.prefixeCote('c_b')];
      cP.modes = false; const sans = [PP.autreCote(cb), PP.prefixeCote('c_b')]; cP.modes = true;
      v('⛔ côté Perso, une conversation PRO porte l\'étiquette et la bannière « Pro · » ; côté Pro, la Perso « Perso · » ; rien pour le même côté, une conversation inconnue, ni sans les deux côtés',
        [perso, pro, sans], [[true, false, 'Pro · ', '', '', ''], [false, true, '', 'Perso · '], [false, '']]);
      const conf = []; for (const [modes, cc] of [[true, ca], [true, cb], [false, cb], [true, null]]) { cP.modes = modes; cP.cc = cc; conf.push(PP.confirmationRequise()); } cP.modes = true;
      v('⛔ « Confirmer l\'envoi » (réglage du Pro) : une conversation PRO le demande, une conversation PERSO jamais — sans les deux côtés, il vaut partout', conf, [true, false, true, true]);
    }
    vrai('la ligne d\'une conversation porte l\'étiquette de son côté quand c\'est l\'autre ; la bannière d\'un message ou d\'une mention commence par « Pro · » / « Perso · », et celle d\'un message se touche (elle ouvre la conversation)',
      /\(autreCote\(c\) \? '<span class="conv-etiquette cote-' \+ coteDe\(c\) \+ '">' \+ NOM_COTE\[coteDe\(c\)\] \+ '<\/span>' : ''\)/.test(JS)
      && /notifier\(prefixeCote\(ev\.conv\) \+ \(ev\.groupe && ev\.convNom \? ev\.de \+ ' · ' \+ ev\.convNom : ev\.de\), ev\.texte \|\| 'Nouveau message', \/\^c_\[0-9a-f\]\{32\}\$\/\.test\(String\(ev\.conv \|\| ''\)\) \? 'conv:' \+ ev\.conv : ''\);/.test(JS)
      && /notifier\(prefixeCote\(conv\) \+ \(ev\.titre \|\| 'OP MESSAGES'\), ev\.texte \|\| '', conv \? 'conv:' \+ conv : ''\);/.test(JS));
  }
  /* 8 octobre 2026 : le menu d'un message contre sa bulle, « Me le rappeler », l'Agenda au mois — le comportement est mesuré par la sonde tests/sonde-opmessages-menu-rappel.js */
  vrai('le menu d\'un message s\'ancre à la rangée du message (dès 700 px, si le navigateur sait l\'ancre) et l\'ancre part avec lui',
    /@supports \(anchor-name: --menu-msg\)/.test(CSS) && /\.menu-fond\.ancre \.menu-msg \{ position: fixed; position-anchor: --menu-msg;/.test(CSS) && /if \(ancre\) \{ ancre\.classList\.add\('menu-ancre'\); \$\('menu-fond'\)\.classList\.add\('ancre'\);/.test(JS)
      && /\$\('conv-messages'\)\.querySelectorAll\('\.menu-ancre'\)\.forEach\(x => x\.classList\.remove\('menu-ancre'\)\);/.test(JS));
  vrai('« Me le rappeler » pose un ÉVÉNEMENT de l\'agenda, rappel à l\'heure, avec le CHEMIN vers son message (conversation et rang — jamais une copie)',
    /await source\.creerEvenement\(Object\.assign\(\{ titre, lieu: [^}]*rappel: 0, tz: x\.tz \},\s*lien \? \{ source: lien \} : \{\}/.test(JS) && /const lien = Number\.isSafeInteger\(m\.seq\) && m\.seq > 0[^;]*\? \{ conv: c\.id, seq: m\.seq \} : null;/.test(JS) && /if \(act === 'rappel'\) \{ rappelMenu\(\); return; \}/.test(JS));
  vrai('⛔ un rappel se COCHE (le tableau de bord ne montre plus un rappel fait), se REPORTE (l\'heure calculée par le service), et « Voir le message » va au message — chargé de l\'historique s\'il le faut, et DIT s\'il a disparu',
    /bord\.evenements\.filter\(e => !e\.fait && /.test(JS) && /source\.reporterEvenement\(F\.id, dans\)/.test(JS) && /source\.faitEvenement\(F\.id, !F\.fait\)/.test(JS)
      && /await source\.precedents\(c\.id\);[^]*?return allerAuMessage\(\);/.test(JS) && /mot\(plusAncien && cibleMsg\.retrouver \? 'Ce message est très ancien : remontez la conversation pour le retrouver\.' : 'Ce message n\\'est plus dans la conversation\.'\)/.test(JS) && /if \(cibleMsg\.conv === id\) allerAuMessage\(\);/.test(JS));
  vrai('l\'Agenda au mois : la fenêtre chargée est celle qu\'on voit (le mois entier en semaines), et le choix va au COMPTE',
    /const n = \+\+reu\.jeton, \[du, au\] = fenetreAgenda\(\);/.test(JS) && /if \(M\) rendreMois\(auj\);/.test(JS) && /source\.choisirAgendaVue\(v\)/.test(JS) && /reu\.vue = typeof source\.agendaVue === 'function' && source\.agendaVue\(\) === 'mois'/.test(JS));
  vrai('⛔ une occurrence TERMINÉE n\'est plus un bouton (8 octobre 2026 : « quand c\'est terminé, il faudrait pas qu\'on puisse cliquer dessus ») : un bloc, sans data-reunion',
    /const ouvre = se \? '<div class="reunion-ligne terminee'/.test(JS) && /\(se \? '<\/div>' : '<\/button>'\)/.test(JS) && /\.reunion-ligne\.terminee:active \{ transform: none; \}/.test(CSS));
  vrai('⛔ le tableau de bord : la semaine ou le MOIS (7 / 30 jours, relus sur la fenêtre, retenus par le compte), une séance terminée n\'y est plus « prévue », et RIEN à programmer d\'ici',
    /const BORD_PORTEES = \{ semaine: 7, mois: 30 \}/.test(JS) && /o\.debut < fin && !occTerminee\(r, o\)\) occ\.push/.test(JS) && !/data-bord="programmer"/.test(JS)
      && /source\.choisirBordReunions\(v\)/.test(JS) && /source\.reunions\(du, plusJours\(du, bordJours\(\) \+ 1\)\)/.test(JS));
  vrai('⛔ un événement modifié ou supprimé se relit PARTOUT où il s\'affiche — l\'Agenda ET le tableau de bord (8 octobre 2026 : « je peux pas supprimer » : le rappel restait au tableau)',
    /function evenementsRelire\(\) \{\s*chargerReunions\(\);\s*if \(\$\('vue-accueil'\)\.dataset\.pret\) \{[^}]*chargerAccueil\(\); \}/.test(JS) && (JS.match(/fermerCouche\(\); evenementsRelire\(\);|evenementsRelire\(\);\n/g) || []).length >= 2
      && /bord\.evenements = bord\.evenements\.filter\(x => x\.id !== F\.id\)/.test(JS));

  /* 4 quinquies. L'AGENDA PERSO ET L'AGENDA PRO (8 octobre 2026 : « il faudrait bien séparer l'agenda perso et pro ») — tests/sonde-opmessages-agenda-cote.js les joue au doigt
     contre le vrai service, au téléphone et au bureau ; le banc garde les décisions sur le CODE */
  vrai('⛔ Agenda Perso / Pro : la journée ne montre que le côté où l\'on est — les réunions ET les événements (la semaine et le mois comptent par la même fonction)',
    /const duCote = cote => !modesActifs\(\) \|\| cote === etat\.mode;/.test(JS) && /for \(const r of reu\.liste\) if \(duCote\(coteReu\(r\)\)\)/.test(corps('function occurrencesDuJour'))
      && /e\.fin > jour && duCote\(coteEvt\(e\)\)\)/.test(corps('function occurrencesDuJour')) && (JS.match(/occurrencesDuJour\(/g) || []).length >= 4);
  vrai('⛔ le tableau de bord est le côté Pro : ni une réunion, ni un rappel, ni une mention du côté Perso',
    /const pourBord = cote => !modesActifs\(\) \|\| cote === 'pro';/.test(JS) && /if \(!r\.annulee && pourBord\(coteReu\(r\)\)\)/.test(JS) && /\(e\.debut < demain \|\| e\.rappel !== null\) && pourBord\(coteEvt\(e\)\)\)/.test(JS)
      && /x\.t >= t7 && pourBord\(coteDe\(etat\.conversations\.find\(c => c\.id === x\.conv\)\)\)/.test(JS));
  /* (11 octobre 2026, « que dans chaque onglet on ne choisisse pas pro ou perso ») plus de choix dans la fiche : l'élément créé part au service avec le côté où l'on est ;
     modifié, il garde le sien (« Ranger dans » le change) — tests/test-1003.js garde la bascule unique et le passage automatique */
  vrai('un événement et une réunion naissent du côté où l\'on est — sans choix dans la fiche (une seule bascule) ; ils se rangent ensuite par « Ranger dans »',
    !/choixCote|coteChoisi\(|data-choix-cote/.test(JS) && /if \(!F\.id && modesActifs\(\)\) champs\.cote = F\.cote \|\| etat\.mode;/.test(JS) && /if \(!F\.id && modesActifs\(\)\) c\.cote = F\.cote \|\| etat\.mode;/.test(JS));
  vrai('⛔ une réunion a le côté de SA conversation — celui de la liste d\'abord (à jour dès qu\'on la range), puis celui que l\'agenda a lu au service',
    /const coteReu = r => \{ const c = r && etat\.conversations\.find\(x => x\.id === r\.conv\); return c \? coteDe\(c\) : r && \(r\.cote === 'perso' \|\| r\.cote === 'pro'\) \? r\.cote : 'pro'; \};/.test(JS));
  vrai('changer de côté redessine l\'Agenda ; une liste relue où une réunion a changé de côté aussi (rangée ici, ou sur un autre appareil)',
    /if \(\$\('vue-reunions'\) && \$\('vue-reunions'\)\.dataset\.pret && reu\.charge\) rendreReunions\(\);/.test(corps('async function changerMode'))
      && /const cotesAvant = sigCotesReunions\(\);[\s\S]*if \(sigCotesReunions\(\) !== cotesAvant\) \{/.test(corps('async function rafraichirListe')));
  vrai('⛔ la fiche d\'une réunion la range (« Ranger dans ») : sa conversation, pour soi seul — la liste relue AVANT de redessiner (sinon l\'Agenda lirait l\'ancien côté)',
    /await source\.rangerCote\(d\.conv, v === 'auto' \? null : v\);\s*if \(typeof source\.lister === 'function'\) await rafraichirListe\(\);/.test(JS) && /data-reu="cote"/.test(JS));
  vrai('« Me le rappeler » : le rappel prend le côté de sa conversation',
    /modesActifs\(\) \? \{ cote: coteDe\(etat\.conversations\.find\(x => x\.id === c\.id\) \|\| c\) \} : \{\}/.test(JS));
  vrai('⛔ envoyer plus tard : la tuile « Plus tard » et l\'appui long sur la flèche mènent aux heures ; le relâcher d\'un appui long n\'ENVOIE pas ; les programmés viennent du SERVICE (jamais de l\'appareil)',
    /if \(typeof source\.programmerMessage === 'function'\) t\.push\(\['plus-tard'/.test(JS) && /\$\('envoyer'\)\.addEventListener\('click', e => \{ if \(etat\.envoyerLong\) \{ etat\.envoyerLong = false; e\.stopImmediatePropagation\(\); \} \}, true\);/.test(JS)
      && /await source\.programmerMessage\(conv, texte, t, mentionsDe\(texte, convCourante\(\), mentionUI\.choisis\.get\(conv\)\)\);/.test(JS) && /l = await source\.messagesProgrammes\(conv\);/.test(JS) && /chargerProgrammes\(id\);/.test(JS));
  /* LES MENTIONS (8 octobre 2026 : « @prénom dans un groupe, et la personne est prévenue ») — les VRAIES fonctions de la page, EXÉCUTÉES : qui est prévenu, ce que la bulle écrit */
  {
    const iM = JS.indexOf('const MENTION_RE'), fM = JS.indexOf('const MENTIONS_FIN');
    vrai('(population) les mentions : le bloc est trouvé dans la page (' + (fM - iM) + ' caractères)', iM > 0 && fM > iM + 600);
    let T = null;
    try {
      const defs = ['const esc = ', 'const norme = ', 'const contactDe = ', 'const prenom = ', 'const multi = '].map(k => (JS.match(new RegExp(ech(k) + '[^\\n]+')) || [''])[0]).join('\n');
      const ctx = { console }; vm.createContext(ctx);
      vm.runInContext('let MOI = null, CONTACTS = []; const source = {};\n' + defs + '\n' + JS.slice(iM, fM) + '\nthis.T = { mentionnables, mentionsDe, texteMentions, texteRiche, poser: (m, c) => { MOI = m; CONTACTS = c; } };', ctx, { timeout: 2000 });
      T = ctx.T;
    } catch (e) { T = null; }
    vrai('les fonctions des mentions de la page s\'exécutent dans un bac à sable', !!T && typeof T.mentionsDe === 'function' && typeof T.texteMentions === 'function');
    if (T) {
      T.poser({ id: 'p_moi', nom: 'Justin Martin' }, [{ id: 'p_a', nom: 'Camille Dupont' }, { id: 'p_b', nom: 'Camille Roux' }, { id: 'p_c', nom: 'Inès Leroy' }, { id: 'p_d', nom: 'Jean-Pierre Noël' }, { id: 'p_x', nom: 'Compte supprimé', supprime: true }]);
      const g = { type: 'groupe', membres: ['p_moi', 'p_a', 'p_b', 'p_c', 'p_d', 'p_x'] }, d = { type: 'direct', membres: ['p_moi', 'p_c'] };
      v('qui peut être mentionné : les membres d\'un groupe, sans moi ni un compte supprimé ; personne dans une conversation à deux', [T.mentionnables(g).map(p => p.id), T.mentionnables(d).length], [['p_a', 'p_b', 'p_c', 'p_d'], 0]);
      v('qui est prévenu : « @ines » trouve Inès (accents et casse ignorés), « @Jean-Pierre, » avec son trait d\'union, une adresse « camille@exemple.fr » n\'est PAS une mention, « @Justin » (moi) non plus',
        [T.mentionsDe('@ines tu viens ?', g), T.mentionsDe('@Jean-Pierre, ok', g), T.mentionsDe('écris à camille@exemple.fr', g), T.mentionsDe('merci @Justin', g)], [['p_c'], ['p_d'], [], []]);
      v('⛔ deux Camille : « @Camille » tapé à la main ne prévient PERSONNE ; choisi dans la liste, seulement celle qu\'on a choisie ; un choix dont le nom a été effacé du texte ne part pas ; rien dans une conversation à deux',
        [T.mentionsDe('Salut @Camille', g), T.mentionsDe('Salut @Camille', g, ['p_b']), T.mentionsDe('plus personne', g, ['p_c']), T.mentionsDe('@Inès', d)], [[], ['p_b'], [], []]);
      const h1 = T.texteMentions('<img src=x onerror=alert(1)> @Inès & <b>', g), h2 = T.texteMentions('merci @Justin !', g), h3 = T.texteMentions('@Inconnu <i>', g), h4 = T.texteMentions('@Inès', d);
      vrai('⛔ la bulle : le « @Prénom » d\'un membre est en gras, le mien voilé, un inconnu reste du texte — et TOUT le reste est échappé (aucune balise du texte ne s\'ouvre)',
        h1 === '&lt;img src=x onerror=alert(1)&gt; <b class="mention-nom">@Inès</b> &amp; &lt;b&gt;' && h2 === 'merci <b class="mention-nom mention-moi">@Justin</b> !' && h3 === '@Inconnu &lt;i&gt;' && h4 === '@Inès',
        JSON.stringify([h1, h2, h3, h4]));
      /* ── LES LIENS (9 octobre 2026) : une adresse tapée devient un lien qu'on touche — http et https SEULEMENT, échappée, sans aperçu, sans référent ── */
      const L = (t, conv) => T.texteRiche(t, conv || g);
      const A = (href, txt) => '<a class="lien-msg" href="' + href + '" target="_blank" rel="noopener noreferrer nofollow">' + (txt === undefined ? href : txt) + '</a>';
      v('une adresse dans un texte devient un lien (http, https, « www. » complété en https), le reste reste du texte échappé',
        [L('voir https://exemple.fr/a?b=1&c=2 merci'), L('http://exemple.fr'), L('www.exemple.fr/x')],
        ['voir ' + A('https://exemple.fr/a?b=1&amp;c=2') + ' merci', A('http://exemple.fr'), A('https://www.exemple.fr/x', 'www.exemple.fr/x')]);
      v('⛔ la ponctuation qui FINIT la phrase n\'est pas au lien ; une parenthèse n\'y est que si le lien l\'a ouverte (Wikipédia) ; « (https://x.fr) » laisse la sienne dehors',
        [L('lis https://exemple.fr/page. Ensuite'), L('https://fr.wikipedia.org/wiki/Paris_(France), ok'), L('(https://exemple.fr)'), L('« https://exemple.fr »')],
        ['lis ' + A('https://exemple.fr/page') + '. Ensuite', A('https://fr.wikipedia.org/wiki/Paris_(France)') + ', ok', '(' + A('https://exemple.fr') + ')', '« ' + A('https://exemple.fr') + ' »']);
      v('⛔ RIEN d\'autre ne devient un lien : javascript:, data:, mailto:, un « https:// » sans hôte, un hôte qui commence par un signe ; et un « <script> » collé à l\'adresse est coupé et échappé',
        [L('javascript:alert(1)'), L('data:text/html,<b>x</b>'), L('mailto:a@b.fr'), L('https:// rien'), L('https://.exemple.fr'), L('https://exemple.fr<script>alert(1)</script>')],
        ['javascript:alert(1)', 'data:text/html,&lt;b&gt;x&lt;/b&gt;', 'mailto:a@b.fr', 'https:// rien', 'https://.exemple.fr', A('https://exemple.fr') + '&lt;script&gt;alert(1)&lt;/script&gt;']);
      v('⛔ un guillemet ou une apostrophe ne sort pas de l\'attribut : ils arrêtent l\'adresse (« \" onmouseover=… » reste du texte échappé)',
        [L('https://exemple.fr/"onmouseover="alert(1)'), L("https://exemple.fr/'x")],
        [A('https://exemple.fr/') + '&quot;onmouseover=&quot;alert(1)', A('https://exemple.fr/') + '&#39;x']);
      v('⛔ un « @Prénom » DANS une adresse n\'est pas une mention ; à côté d\'une adresse, une mention reste une mention ; dans une conversation à deux, les liens aussi',
        [L('https://exemple.fr/@Inès'), L('@Inès regarde https://exemple.fr'), L('https://exemple.fr', d)],
        [A('https://exemple.fr/@Inès'), '<b class="mention-nom">@Inès</b> regarde ' + A('https://exemple.fr'), A('https://exemple.fr')]);
      v('un texte sans adresse se rend EXACTEMENT comme avant (la mention, l\'échappement)', [L('<img src=x onerror=alert(1)> @Inès & <b>'), L('merci @Justin !')], [h1, h2]);
      v('les crochets et accolades s\'apparient comme les parenthèses ; « * », « _ », « ~ » en fin d\'adresse (le gras, l\'italique d\'un texte) restent dehors',
        [L('[voir https://exemple.fr]'), L('*https://exemple.fr*'), L('https://exemple.fr/a[1]'), L('{https://exemple.fr/x}')],
        ['[voir ' + A('https://exemple.fr') + ']', '*' + A('https://exemple.fr') + '*', A('https://exemple.fr/a[1]'), '{' + A('https://exemple.fr/x') + '}']);
      /* ⛔ (relecture adverse, 9 octobre 2026) : le nettoyage recomptait les parenthèses à chaque caractère retiré — un message permis gelait l'écran de chaque lecteur */
      const chrono = (t) => { const t0 = process.hrtime.bigint(), h = L(t); return [Number(process.hrtime.bigint() - t0) / 1e6, h]; };
      const [ms1, hl1] = chrono('https://a.fr/' + ')'.repeat(7980)), [ms2, hl2] = chrono('https://a.fr/' + ')'.repeat(1980));
      v('⛔ « https://a.fr/ » suivi de 7 980 « ) » (un message permis) se rend en moins de 30 ms (trop long pour une adresse : du texte) ; suivi de 1 980, le lien s\'arrête avant les parenthèses, en moins de 30 ms aussi',
        [ms1 < 30, hl1.indexOf('<a ') < 0, ms2 < 30, hl2.startsWith(A('https://a.fr/'))], [true, true, true, true]);
      v('une « adresse » de plus de 2 000 signes n\'en est pas une : elle reste du texte', L('https://exemple.fr/' + 'a'.repeat(2100)).indexOf('<a ') < 0, true);
    }
    vrai('les liens des bulles : le texte d\'un message ET la légende d\'une photo passent par `texteRiche` (plus par `texteMentions` ni `esc` seuls)',
      /class="bulle ' \+ sens \+ '" dir="auto">' \+ texteRiche\(m\.texte, c\)/.test(JS) && /class="bulle legende ' \+ sens \+ '" dir="auto">' \+ texteRiche\(m\.texte, c\)/.test(JS)
        && !/dir="auto">' \+ texteMentions\(m\.texte/.test(JS) && !/class="bulle legende ' \+ sens \+ '" dir="auto">' \+ esc\(m\.texte\)/.test(JS));
    vrai('les mentions partent avec l\'envoi (et avec un message programmé), la liste « @ » choisit à Entrée SANS envoyer (gardien en capture), Échap ne ferme qu\'elle',
      /cites: ctx0 && ctx0\.type === 'modif' \? \[\] : mentionsDe\(t, convCourante\(\), mentionUI\.choisis\.get\(id\)\)/.test(JS) && /ok = await envoi\(Object\.assign\(.*x\.cites\.length \? \{ mentions: x\.cites \} : \{\}/.test(JS)
        && /else if \(\(e\.key === 'Enter' && !e\.shiftKey\) \|\| e\.key === 'Tab'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); choisirMention\(mentionUI\.i\); \}/.test(JS)
        && /else if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); fermerMentions\(\); \}\s*\}, true\);/.test(JS)
        && /\$\('compo-mentions'\)\.addEventListener\('mousedown', e => e\.preventDefault\(\)\);/.test(JS) && /id="compo-mentions" role="listbox"/.test(HTML));
    vrai('le tableau de bord : un bloc « Mentions » (sept jours, les non lues comptées) ; une mention se lit en ouvrant sa conversation (ou en l\'ayant lue ailleurs) ; une mention reçue se dit par une bannière qui OUVRE la conversation',
      /<span>Mentions<\/span><span id="bord-mentions-n">/.test(JS) && /ms\.length \? ms\.map\(ligneMention\)\.join\(''\) : '<li class="bord-vide"><span>Aucune mention ces sept derniers jours\.<\/span><\/li>'/.test(JS)
        && /mentionsVues\(id\);/.test(JS) && /if \(r4\.status === 'fulfilled'\) \{ bord\.mentions = r4\.value; mentionsSynchro\(\); \}/.test(JS)
        && /if \(ev\.nature === 'mention'\) surMention\(ev\);/.test(JS) && /if \(etat\.conv\) remplacer\(r\); else pousser\(r\);\s*return;\s*\}/.test(JS));
  }
  /* L'ORDRE DU JOUR ET LE COMPTE RENDU (8 octobre 2026) — le service les tient (test-938) ; la page les pose, les coche et dessine la carte. La VRAIE `htmlCompteRendu`, EXÉCUTÉE : ce qu'elle écrit, échappé */
  {
    const iC = JS.indexOf('const REPONSE_CR'), fC = JS.indexOf('function htmlSondage(m, sens)');
    vrai('(population) le compte rendu : sa carte est trouvée dans la page (' + (fC - iC) + ' caractères)', iC > 0 && fC > iC + 800);
    let cr = null;
    try {
      const defs = ['const esc = ', 'const icone = ', 'const maj1 = ', 'const FMT_HEURE = ', 'const FMT_JOUR_LONG = '].map(k => (JS.match(new RegExp(ech(k) + '[^\\n]+')) || [''])[0]).join('\n');
      /* (lot m05) le compte rendu écrit « début–fin » par `heureSaison` (la saison se dit le dimanche du changement d'heure) : la VRAIE, avec le FMT_HEURE du bac */
      /* (re-test final, 17 octobre 2026) une séance qui finit un autre jour le dit par `finLue` (test-2662) : les VRAIES, avec ce qu'elles lisent */
      const iHS = JS.indexOf('const heureSaison = '), saisonCr = iHS < 0 ? '' : JS.slice(iHS, JS.indexOf('\n  };', iHS) + 5)
        + '\n' + ['const FMT_JOUR_FIN = ', 'const autreJour = ', 'const minutesDuJour = ', 'const jourFinDit = ', 'const finLue = '].map(k => (JS.match(new RegExp(ech(k) + '[^\\n]+')) || [''])[0]).join('\n');
      const ctx = { console }; vm.createContext(ctx);
      vm.runInContext(defs + '\n' + saisonCr + '\n' + JS.slice(iC, fC) + '\nthis.f = htmlCompteRendu;', ctx, { timeout: 2000 });
      cr = ctx.f;
    } catch (e) { cr = null; }
    vrai('la fonction `htmlCompteRendu` de la page s\'exécute dans un bac à sable', typeof cr === 'function');
    if (typeof cr === 'function') {
      const x = { titre: 'Revue <b>QX</b>', debut: Date.UTC(2026, 9, 8, 8, 0), fin: Date.UTC(2026, 9, 8, 8, 45), dureeS: 2700, presents: [{ id: 'p1', nom: 'Ana <img src=x onerror=alert(1)>', dureeS: 2700 }, { id: 'p2', nom: 'Ben', dureeS: 600 }], presentsN: 3,
        absents: [{ id: 'p3', nom: 'Cléo', reponse: 'decline' }], absentsN: 1, points: [{ texte: 'Budget & <i>coûts</i>', fait: true }, { texte: 'Planning', fait: false }], documents: 2 };
      const h = cr({ compteRendu: x }, 'recue');
      vrai('⛔ la carte : titre, noms et points ÉCHAPPÉS (aucune balise du service ne s\'ouvre) ; « Présents (3) » avec « et 1 autres », le temps de chacun ; l\'absente et sa réponse ; « Ordre du jour · 1 / 2 » ; « 2 documents partagés »',
        !/<b>QX|<img|<i>coûts/.test(h) && h.includes('Revue &lt;b&gt;QX&lt;/b&gt;') && h.includes('Budget &amp; &lt;i&gt;coûts&lt;/i&gt;') && h.includes('Présents (3)') && h.includes('et 1 autres') && h.includes('45 min') && h.includes('10 min')
          && h.includes('Cléo') && h.includes('a décliné') && h.includes('Ordre du jour · 1 / 2') && (h.match(/class="evt-rond plein"/g) || []).length === 1 && h.includes('2 documents partagés') && /role="group" aria-label="Compte rendu : Revue &lt;b&gt;QX/.test(h), h.slice(0, 400));
      const h2 = cr({ compteRendu: Object.assign({}, x, { absents: [], absentsN: 0, points: [], documents: 0 }) }, 'envoyee');
      vrai('sans absent, sans ordre du jour, sans document : ces rubriques ne paraissent pas (rien de vide n\'est écrit)', !/Absents|Ordre du jour|document/.test(h2) && h2.includes('Présents (3)'));
    }
    vrai('l\'ordre du jour se POSE dans le formulaire (une ligne = un point, vingt et 200 signes dits AVANT de partir ; seulement s\'il a changé, en modifiant), se COCHE dans la fiche et dans la salle (le panneau « Ordre du jour » de « Plus »), et la salle le relit quand la réunion change',
      /<textarea id="rf-odj"/.test(JS) && /if \(odj\.length > 20\) \{ erreurInfo\(/.test(JS) && /ordre_du_jour: odj \};/.test(JS) && /if \(JSON\.stringify\(c\.ordre_du_jour\) !== JSON\.stringify\(I\.odj\)\) ch\.ordre_du_jour = c\.ordre_du_jour;/.test(JS)
        && /data-reu="odj" data-point="/.test(JS) && /else if \(act === 'odj'\) \{/.test(JS) && /case 'ordre': X\.panneau = 'ordre';/.test(JS) && /case 'odj': \{/.test(JS) && /X\.odj = await source\.cocherPoint\(s\.reunion, p\.id, fait\);/.test(JS)
        && /if \(enSalle\(A\) && sx\(A\)\.panneau === 'ordre' && A\.snap && \(!ev\.id \|\| ev\.id === A\.snap\.reunion\)\) salleOrdreCharger\(A\);/.test(JS) && /\} else if \(m\.compteRendu && !m\.supprime\) \{\s*h \+= htmlCompteRendu\(m, sens\);/.test(JS));
  }
  /* « NE PAS DÉRANGER PENDANT UNE RÉUNION » (8 octobre 2026) — le service retient et résume (test-937) ; la page montre « En réunion » et porte l'interrupteur */
  vrai('⛔ « Ne pas déranger pendant une réunion » : la pastille « En réunion » (rouge barrée) passe devant « En ligne », les mots aussi (partout par `presenceTexte`, directement ou par `statutTexte` qui lui laisse la place quand la personne n\'a pas écrit de statut — 17 octobre 2026) ; l\'interrupteur « Pause pendant les réunions » est un réglage du COMPTE ; pas de bannière sur l\'écran d\'un appel',
    /\(c\.enReunion \? '<i class="presence reunion" title="En réunion"><\/i>' : c\.enLigne \? '<i class="presence" title="En ligne"><\/i>' : ''\)/.test(JS) && /const presenceTexte = p => p && p\.enReunion \? 'En réunion' : p && p\.enLigne \? 'En ligne' : '';/.test(JS)
      && (JS.match(/(?:presenceTexte|statutTexte)\(/g) || []).length >= 10 && /const statutTexte = p => p \? \(p\.statut \|\| presenceTexte\(p\)\) : '';/.test(JS) && /\.avatar \.presence\.reunion \{ background: var\(--rouge\); \}/.test(CSS) && /id="reg-notif-pause"/.test(JS)
      && /else if \(quoi === 'pause'\) reg\.notif = await source\.notifPauseReunion\(!reg\.notif\.pauseReunion\);/.test(JS) && /bouton\.id === 'reg-notif-pause'/.test(JS)
      && /&& !\(etat\.appelId && !etat\.appelReduit\)\) notifier\(/.test(JS));

  /* 5. LES REPÈRES PHYSIQUES ───────────────────────────────────────────────────────────────────────────────────────────────── */
  const sansNom = [...HTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].filter(m => !/aria-label=/.test(m[1]) && !m[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()).map(m => (/id="([^"]+)"/.exec(m[1]) || [, '?'])[1]);
  v('(population) ' + (HTML.match(/<button\b/g) || []).length + ' boutons dans le balisage — aucun ne porte une icône SANS nom (aria-label) : retour, caméra, joindre, envoyer, micro, annuler, fermer', sansNom, []);
  vrai('le fil de messages est un « log » sans annonce automatique (il se refait en entier : aria-live="off"), et un message d\'avis a sa propre zone vivante', /id="conv-fil" role="log" aria-live="off"/.test(HTML) && /id="avis" role="status" aria-live="polite"/.test(HTML));
  vrai('les lignes de la liste et les épinglés sont des BOUTONS qui ouvrent la conversation (data-ouvrir), plus des chevrons qui ne répondent pas', /<button type="button" class="conv presse" data-ouvrir=/.test(JS) && /<button type="button" class="epingle-bouton" data-ouvrir=/.test(JS));
  vrai('le champ est un VRAI champ (textarea, 1 ligne au départ, qui ne COUPE pas en silence un texte collé : la limite de 4 000 signes se dit, elle ne se subit pas), l\'envoi se fait à Entrée au bureau (pointeur fin) et à la flèche au doigt', /<textarea id="saisie" rows="1" maxlength="100000"/.test(HTML) && !/maxlength="4000"/.test(HTML) && /TEXTE_MAX = CAP\.texteMax/.test(JS) && /texteMax: 4000/.test(JS) && /texteTropLong\(n\)/.test(JS) && /matchMedia\('\(pointer: fine\)'\)\.matches && !e\.shiftKey/.test(JS));
  vrai('le micro : toucher démarre, maintenir envoie au relâcher, le refus et l\'absence se disent (aucun alert, aucun console.error)', /VOCAL_MIN_MS = 800/.test(JS) && /TENU_MS = 600/.test(JS) && /Le micro est refusé/.test(JS) && /Aucun micro/.test(JS) && !/alert\(|console\.error/.test(JS));
  vrai('l\'image est validée et RÉDUITE par un canvas (1 600 px et environ 250 Ko pour une photo, 512 px et environ 90 Ko pour un groupe ou un profil) avant de partir ; un fichier illisible se dit', /reduireImage\(f, 1600, \.82, 250 \* 1024, lim\.gifMax\)/.test(JS) && /reduireImage\(f, 512, \.85, 90 \* 1024\)/.test(JS) && /createImageBitmap/.test(JS) && /n\\?'a pas pu être lue/.test(JS));

  /* 6. LES CORRECTIFS DE LA RELECTURE ET DU TESTEUR ADVERSE (1er octobre 2026) — le texte garde ce que la sonde joue ──────────────────────────────────────
     ⛔ Un motif de banc vise du CODE : les commentaires sont déjà retirés (JS, CSS). La preuve de comportement est dans tests/sonde-opmessages.js (scénarios
     nommés ci-dessous) ; ces contrôles font tomber le banc AVANT d'attendre la sonde quand le code du correctif disparaît. */
  vrai('adresse : un nom n\'est une VUE que s\'il est à la page (hasOwnProperty) — « #constructor », « #__proto__ » ne masquent plus les quatre vues [sonde : adresses]', /Object\.prototype\.hasOwnProperty\.call\(VUES, p\[0\]\)/.test(JS) && !/VUES\[p\[0\]\]/.test(JS));
  vrai('vocal : changer de conversation coupe la prise de son ET la lecture de l\'ancienne, et un vocal part vers la conversation où il a COMMENCÉ [sonde : vocal-conv]', /if \(etat\.conv && etat\.conv !== id\) \{ arreterLecture\(\); arreterEcoute\(\); annulerEnregistrement\(\); \}/.test(JS) && /enr\.conv = etat\.conv/.test(JS) && /envoi\(\{ vocal: \{ blob: b, url, dur: msVu \/ 1000, bars \} \}, cible\)/.test(JS));
  vrai('double toucher : un second toucher dans les 400 ms ne tombe pas sur ce que le premier a laissé — micro, « + » et caméra refusent (pas « Retour » : il n\'a jamais été sous un de ces gestes) ; la flèche, l\'envoi du vocal, l\'annulation et la croix de la photo l\'arment ; deux clics synchrones = un message [sonde : double-toucher]',
    /const armerRetap = \(\) => \{ retapJusqua = Date\.now\(\) \+ 400; \};/.test(JS) && /\$\('envoyer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\); if \(confirmeTropTot\(\)\) return; envoyerTexte\(\); \}\)/.test(JS) && /if \(retap\(\)\) \{ e\.preventDefault\(\); return; \}/.test(JS) && /\$\('enreg-envoyer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\)/.test(JS) && /\$\('visionneuse-fermer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\); fermerCouche\(\); \}\)/.test(JS) && /ta\.value = ''; delete etat\.brouillons\[id\]; ajusterSaisie\(\); majBoutons\(\); finSaisie\(id\);\s*if \(enVol\) \{ etat\.fileEnvoi\.push\(x\); return; \}\s*etat\.envoiEnCours = true;/.test(JS));
  const jetonsTexte = ['--accent-txt', '--side-actif-fg', '--placeholder', '--sub-meta-sel', '--tab-inactif-fg'];
  vrai('contraste : les encres de TEXTE ont leurs jetons (jour ET nuit) et servent — l\'accent de nuit reste celui des aplats, des anneaux et des contours [sonde : contrastes]', jetonsTexte.every(t => (CSS.match(new RegExp(ech(t) + ':', 'g')) || []).length >= 2 && new RegExp('var\\(' + ech(t) + '\\)').test(CSS)) &&
    /\.lien-texte \{[^}]*color: var\(--accent-txt\)/.test(CSS) && /\.btn-plus \.pastille \{[^}]*color: var\(--on-fill\)/.test(CSS) && /\.side-lien\[aria-current="page"\] \{[^}]*color: var\(--side-actif-fg\)/.test(CSS) && /\.conv\[aria-current="true"\] \{[^}]*--sub-meta: var\(--sub-meta-sel\)/.test(CSS) && /\.recherche input::placeholder \{ color: var\(--placeholder\)/.test(CSS));
  vrai('focus : l\'anneau tient dans le conteneur qui coupe — décalage négatif dans les cartes, rembourrage là où une liste défile, 6 px en haut de la feuille [sonde : focus]',
    /\.carte-liste \.conv:focus-visible, \.carte \.contact:focus-visible, \.carte \.reglage:focus-visible \{ outline-offset: -3px; \}/.test(CSS) && /\.epingles \{[^}]*padding: 4px 4px 12px; margin: 0 -4px/.test(CSS) && /\.puces \{[^}]*padding: 4px 4px 14px; margin: 0 -4px/.test(CSS) && /\.feuille-corps \{[^}]*padding: 6px 16px/.test(CSS));
  vrai('focus : la feuille modale fait tourner Tab dans la feuille (premier ⇄ dernier contrôle) [sonde : focus]', /\$\('feuille'\)\.addEventListener\('keydown'/.test(JS) && /a === premier \|\| a === f/.test(JS) && /a === dernier\) \{ e\.preventDefault\(\); premier\.focus\(\)/.test(JS));
  vrai('message reçu : annoncé (région à part, aria-live polite ; le fil reste « off »), lu quand la page est visible, jamais au premier rendu [sonde : recu]', /<p class="sr-seul" id="conv-annonce" role="status" aria-live="polite" aria-atomic="true">/.test(HTML) && /annoncer\(recus\[recus\.length - 1\]\);/.test(JS) && /if \(document\.visibilityState === 'visible'\) \{ try \{ await source\.marquerLu\(id\)/.test(JS) && /const avant = etat\.convDonnees \?/.test(JS));
  vrai('défilement : chaque vue garde SA position, LUE avant de masquer la vue (le document raccourcit sinon), rendue à l\'arrivée [sonde : defilement-vues]', (() => { const i = JS.indexOf('etat.posVues[prec.vue] ='), j = JS.indexOf("ORDRE.forEach(k => { $('vue-' + k).hidden"); return i > 0 && j > i && /window\.scrollTo\(0, etat\.posVues\[r\.vue\] \|\| 0\)/.test(JS); })());
  vrai('fil : il se met à jour morceau par morceau (peindreMessages), le statut « Lu » en place (majStatut) — plus de innerHTML sur tout le fil [sonde : fil-stable]', /function peindreMessages\(parts\)/.test(JS) && /function majStatut\(el, st\)/.test(JS) && /vieux\.__h === parts\[i\]\.h/.test(JS) && !/\$\('conv-messages'\)\.innerHTML = [^'"]/.test(JS));
  vrai('liste : l\'heure de chaque ligne se remet à jour seule (data-t, toutes les 20 s) ; un texte arabe a sa direction (dir=auto) ; les trois listes sont des role="list" [sonde : fil-stable]', /conv-heure" data-t="/.test(JS) && /\}, 20000\);/.test(JS) && /class="bulle \' \+ sens \+ \'" dir="auto"/.test(JS) && ['id="epingles" role="list"', 'id="liste-conv" role="list"', 'id="g-puces" role="list"'].every(t => HTML.includes(t)));
  vrai('collage : le champ ne coupe pas en silence (plus de maxlength à 4 000), la limite se DIT dès la frappe ; Échap dans la recherche l\'efface sans fermer la conversation [sonde : collage]', /const texteTropLong = n =>/.test(JS) && /if \(n > TEXTE_MAX\) avis\(texteTropLong\(n\)\)/.test(JS) && /if \(e\.target === \$\('recherche-conv'\) && !etat\.photo && !etat\.groupe\.ouvert\)/.test(JS));
  vrai('images : une image dont l\'en-tête est bon et le corps abîmé est refusée (decode() + preuve qu\'un point a été dessiné), un fichier tronqué aussi (PNG, GIF, WebP) [sonde : images]', /i\.decode\(\)\.then\(\(\) => fini\(true\), \(\) => fini\(false\)\)/.test(JS) && /if \(!dessine\) throw new Error\('illisible'\);/.test(JS) && /if \(await fichierTronque\(fichier\)\) throw new Error\('illisible'\);/.test(JS) && /async function fichierTronque\(f\)/.test(JS));
  vrai('couleurs forcées : une bulle, une photo, un vocal et le champ gardent un contour ; l\'onde garde une couleur [sonde : couleurs-forcees]', /@media \(forced-colors: active\) \{[\s\S]*?\.bulle, \.photo, \.vocal, \.saisie-ind, \.pilule-saisie, \.avis-saisie(?:, [.\w-]+)* \{ border: 1px solid CanvasText; \}[\s\S]*?\.onde i, \.enreg-onde i \{ background: CanvasText; \}/.test(CSS));
  /* ⛔ LA TRANSCRIPTION D'UN VOCAL (11 octobre 2026, « comme sur Instagram ») : les VRAIES fonctions de la page, exécutées dans un bac à sable — ce qui se propose, ce qui
     s'affiche à chaque état, la demande qui part une fois, le texte échappé, l'annonce au lecteur d'écran ; la couture avec le vrai service est dans tests/test-1000.js,
     les gestes au doigt dans tests/sonde-opmessages-transcription.js */
  {
    const iT = JS.indexOf('let TR = null, trLu = 0;'), iA = JS.indexOf('function annoncerTranscriptions(c)', iT), fT = iA > 0 ? JS.indexOf('\n  }\n', iA) + 5 : -1;   // jusqu'à la fin d'annoncerTranscriptions
    const ligneEsc = (/const esc = s => [^\n]*/.exec(JS) || [''])[0];
    let K = null, cx = null;
    try {
      cx = { CAP: { transcription: true }, appels: [], rendus: 0, annonce: { textContent: '' }, attente: null, horloge: 1000000, ouvertes: 0, reponseOuverte: null };
      cx.etat = { conv: 'c_a', convDonnees: { id: 'c_a', messages: [] } };
      cx.source = { transcrire: (conv, mid) => { cx.appels.push(conv + '|' + mid); return cx.attente || Promise.resolve({ etat: 'attente' }); },
        transcriptionOuverte: () => { cx.ouvertes++; return Promise.resolve(cx.reponseOuverte); } };
      cx.$ = id => id === 'conv-annonce' ? cx.annonce : null;
      /* « Ça prend plus longtemps que d'habitude » (28 octobre 2026) : le délai de lenteur (≥ 10 s) est RETENU, jamais joué ici — ce bloc-ci garde l'ordinaire ; le délai lui-même est gardé par test-3130. */
      cx.lenteurs = []; cx.clearTimeout = () => {};
      cx.setTimeout = (f, ms) => { if (ms >= 10000) { cx.lenteurs.push(f); return 2; } f(); return 1; };
      cx.Date = { now: () => cx.horloge };
      vm.createContext(cx);
      vm.runInContext(ligneEsc + '\nconst trouverMessage = mid => etat.convDonnees && etat.convDonnees.messages.find(m => m.id === mid);\n' + JS.slice(iT, fT) +
        '\nvar phrase = (e, d) => e && e.dit ? e.message : d, rendreConv = () => { rendus++; };\nthis.K = { get TR() { return TR; }, set TR(x) { TR = x; }, trOuvertes, trLocal, trEntieres, trRelire, transcriptionPossible, htmlTranscription, basculerTranscription, demanderTranscription, annoncerTranscriptions };', cx, { timeout: 2000 });
      K = cx.K;
    } catch (e) { K = null; }
    vrai('(population) le bloc de la transcription s\'exécute dans un bac à sable (' + (fT - iT) + ' caractères)', iT > 0 && fT > iT && !!K);
    if (K) try {
      /* ⛔ (relecture du relecteur) : `/api/config` raté au démarrage cachait la fonction jusqu'au rechargement — elle se redemande, une fois par minute au plus */
      K.trRelire(); await new Promise(r => setTimeout(r, 0));
      const apresEchec = [cx.ouvertes, K.TR];
      K.trRelire(); await new Promise(r => setTimeout(r, 0));
      const tropTot = cx.ouvertes;
      cx.horloge += 61000; cx.reponseOuverte = { ouverte: true, dureeMaxS: 300 }; const r0 = cx.rendus;
      K.trRelire(); await new Promise(r => setTimeout(r, 0));
      const lu = [cx.ouvertes, K.TR, cx.rendus > r0];
      cx.horloge += 61000; K.trRelire(); await new Promise(r => setTimeout(r, 0));
      v('⛔ « est-elle installée ? » : une réponse ratée se redemande — pas deux fois dans la minute, et plus du tout une fois sue (la conversation se repeint alors)',
        [apresEchec, tropTot, lu, cx.ouvertes], [[1, null], 1, [2, { ouverte: true, dureeMaxS: 300 }, true], 2]);
      K.TR = null;
      const V = (id, x) => Object.assign({ id, seq: 3, auteur: 'p_ana', t: 1, vocal: { dur: 4, url: 'blob:x' } }, x || {});
      const m1 = V('m1');
      const possible = [];
      possible.push(K.transcriptionPossible(m1));                                              // TR inconnu : rien
      K.TR = { ouverte: false, dureeMaxS: 300 }; possible.push(K.transcriptionPossible(m1));
      K.TR = { ouverte: true, dureeMaxS: 300 };
      possible.push(K.transcriptionPossible(m1), K.transcriptionPossible(V('m2', { supprime: true })), K.transcriptionPossible(V('m3', { attente: true })), K.transcriptionPossible(Object.assign(V('m4'), { vocal: undefined, texte: 'x' })),
        K.transcriptionPossible(V('m5', { seq: undefined })), K.transcriptionPossible(V('m6', { vocal: { dur: 301 } })));
      cx.CAP.transcription = false; possible.push(K.transcriptionPossible(m1)); cx.CAP.transcription = true;
      v('⛔ « Voir la transcription » ne se propose que si le service l\'a installée, sur un vocal arrivé, pas supprimé, pas plus long que ce qu\'il transcrit — et jamais sans la capacité',
        possible, [false, false, true, false, false, false, false, false, false]);
      const ferme = K.htmlTranscription(m1, 'recue');
      vrai('fermée : un lien « Voir la transcription » (un bouton : son nom dit l\'état, sans `aria-expanded` en double), et aucun texte', /^<button type="button" class="transcrire-lien presse" data-transcrire="m1">Voir la transcription<\/button>$/.test(ferme));
      cx.etat.convDonnees.messages = [m1];
      let relacher; cx.attente = new Promise(r => { relacher = r; });
      K.basculerTranscription('m1');
      const annonceOuverture = cx.annonce.textContent;
      K.demanderTranscription('m1'); K.basculerTranscription('m1'); K.basculerTranscription('m1');
      const enVol = K.htmlTranscription(m1, 'recue');
      v('⛔ ouvrir demande UNE fois (un second essai, puis fermer et rouvrir pendant la demande : toujours un appel) — le LIEN D\'ABORD (il ne bouge pas quand le texte s\'ouvre), puis « Transcription en cours… », relié au lien',
        [cx.appels, /^<button type="button" class="transcrire-lien presse" data-transcrire="m1" aria-controls="tr-m1">Masquer la transcription<\/button><p class="bulle transcription recue tr-note" id="tr-m1" dir="auto"><span class="tr-roue" aria-hidden="true"><\/span>Transcription en cours…<\/p>$/.test(enVol)],
        [['c_a|m1'], true]);
      v('⛔ l\'ouverture s\'annonce au lecteur d\'écran (« Transcription en cours »)', annonceOuverture, 'Transcription en cours');
      relacher({ etat: 'attente' }); await new Promise(r => setTimeout(r, 0));
      cx.annonce.textContent = '';
      K.annoncerTranscriptions(cx.etat.convDonnees); K.annoncerTranscriptions(cx.etat.convDonnees);
      v('⛔ tant que ça attend, des rendus de plus n\'annoncent RIEN (ni un échec, ni une redite)', cx.annonce.textContent, '');
      m1.transcription = { etat: 'prete', texte: 'Viens <img src=x onerror=alert(1)> & « ok »', langue: 'fr' };
      K.annoncerTranscriptions(cx.etat.convDonnees);
      const pret = K.htmlTranscription(m1, 'envoyee');
      v('⛔ le texte arrive : ÉCHAPPÉ (la sortie d\'un modèle est un texte, jamais du balisage), dans une bulle de l\'auteur, avec sa langue ; et le lecteur d\'écran l\'apprend (« Transcription prête »)',
        [/<p class="bulle transcription envoyee" id="tr-m1" dir="auto" lang="fr">Viens &lt;img src=x onerror=alert\(1\)&gt; &amp; « ok »<\/p>$/.test(pret), /<img/.test(pret), cx.annonce.textContent], [true, false, 'Transcription prête']);
      cx.annonce.textContent = ''; K.annoncerTranscriptions(cx.etat.convDonnees);
      v('   un rendu de plus ne la redit pas', cx.annonce.textContent, '');
      const m7 = V('m7', { transcription: { etat: 'vide' } }), m8 = V('m8', { transcription: { etat: 'echec' } }), m9 = V('m9', { transcription: { etat: 'echec', definitif: true } }), m10 = V('m10', { transcription: { etat: 'prete', illisible: true } }),
        m11 = V('m11', { transcription: { etat: 'prete', relis: true } });
      cx.etat.convDonnees.messages = [m1, m7, m8, m9, m10, m11];
      for (const m of [m7, m8, m9, m10, m11]) K.basculerTranscription(m.id);
      const h7 = K.htmlTranscription(m7, 'recue'), h8 = K.htmlTranscription(m8, 'recue'), h9 = K.htmlTranscription(m9, 'recue'), h10 = K.htmlTranscription(m10, 'recue'), h11 = K.htmlTranscription(m11, 'recue');
      v('chaque état se dit : sans parole, échec (et « Réessayer »), échec définitif (sans « Réessayer »), texte illisible, texte pas chargé (et « Réessayer ») — sans redemander ce qui est déjà connu',
        [/>Aucune parole reconnue\.<\/p>/.test(h7), /La transcription n'a pas pu se faire\. <button type="button" class="tr-reessayer" data-transcrire-reessayer="m8">Réessayer<\/button><\/p>/.test(h8),
          /La transcription n'a pas pu se faire\.<\/p>/.test(h9) && !/tr-reessayer/.test(h9), />Ce texte ne peut plus être lu\.<\/p>/.test(h10),
          /Le texte n'a pas pu se charger\. <button type="button" class="tr-reessayer" data-transcrire-reessayer="m11">Réessayer<\/button><\/p>/.test(h11), cx.appels.length], [true, true, true, true, true, 1]);
      cx.attente = Promise.reject(Object.assign(new Error('Beaucoup de vocaux sont en cours de transcription (réessaie dans 60 s).'), { dit: true, statut: 503, code: 'transcription_occupee' }));
      cx.attente.catch(() => {});
      cx.annonce.textContent = '';
      await K.demanderTranscription('m8');
      K.annoncerTranscriptions(cx.etat.convDonnees);
      const h8b = K.htmlTranscription(m8, 'recue');
      v('⛔ « Réessayer » refusé par le service (503) : sa PHRASE s\'affiche, « Réessayer » reste, et le lecteur d\'écran l\'entend',
        [cx.appels.length, /Beaucoup de vocaux sont en cours de transcription \(réessaie dans 60 s\)\. <button type="button" class="tr-reessayer" data-transcrire-reessayer="m8">/.test(h8b), cx.annonce.textContent],
        [2, true, 'Beaucoup de vocaux sont en cours de transcription (réessaie dans 60 s).']);
      /* ⛔ (relecture du relecteur) : « Réessayer » ne se propose que pour ce qui se réessaie — pas un vocal parti, trop long, ou qui n'en est pas un */
      const refus = async (mid, er) => { cx.attente = Promise.reject(er); cx.attente.catch(() => {}); await K.demanderTranscription(mid); return K.htmlTranscription(cx.etat.convDonnees.messages.find(x => x.id === mid), 'recue'); };
      const m12 = V('m12'), m13 = V('m13'), m14 = V('m14');
      cx.etat.convDonnees.messages.push(m12, m13, m14);
      const h12 = await refus('m12', Object.assign(new Error('introuvable'), { statut: 404, code: 'introuvable' }));
      const h13 = await refus('m13', Object.assign(new Error('Ce vocal est trop long pour être transcrit.'), { dit: true, statut: 413, code: 'vocal_trop_long' }));
      const h14 = await refus('m14', Object.assign(new Error('Le réseau ne répond pas.'), { dit: true, statut: 0, code: 'reseau' }));
      v('⛔ un vocal parti : « plus disponible », sans « Réessayer » ; trop long : sa phrase, sans « Réessayer » ; le réseau : « Réessayer »',
        [/>Ce vocal n&#39;est plus disponible\.<\/p>$/.test(h12), /Ce vocal est trop long pour être transcrit\.<\/p>$/.test(h13), /Le réseau ne répond pas\. <button type="button" class="tr-reessayer"/.test(h14)], [true, true, true]);
      /* un LONG vocal : on dit que ça peut prendre du temps ; un long TEXTE : « Voir plus » */
      const mLong = V('m15', { vocal: { dur: 95, url: 'blob:x' } }); cx.etat.convDonnees.messages.push(mLong);
      cx.attente = new Promise(() => {}); cx.annonce.textContent = '';
      K.demanderTranscription('m15');
      v('⛔ un vocal de plus d\'une minute : « peut prendre une minute ou deux », à l\'écran et au lecteur d\'écran',
        [/Transcription en cours… Un long vocal peut prendre une minute ou deux\.<\/p>$/.test(K.htmlTranscription(mLong, 'recue')), cx.annonce.textContent], [true, 'Transcription en cours — un long vocal peut prendre une minute ou deux']);
      const LONG = ('Le chantier de la rue des Lilas avance bien, ' + 'on attaque la toiture demain matin. ').repeat(12);
      const mTexte = V('m16', { transcription: { etat: 'prete', texte: LONG, langue: 'fr' } }); cx.etat.convDonnees.messages.push(mTexte);
      K.basculerTranscription('m16');
      const hc = K.htmlTranscription(mTexte, 'recue');
      const coupe = (/id="tr-m16" dir="auto" lang="fr">([^<]*)… <button type="button" class="tr-plus" data-transcrire-plus="m16">Voir plus<\/button><\/p>$/.exec(hc) || [])[1] || '';
      K.trEntieres.add('m16');
      const hEntier = K.htmlTranscription(mTexte, 'recue');
      v('⛔ un texte de plus de 600 signes se coupe à un MOT, avec « Voir plus » ; déplié, il est entier',
        [coupe.length > 360 && coupe.length <= 600, LONG.startsWith(coupe), /[a-zé]$/.test(coupe), hEntier.includes('>' + esc(LONG) + '</p>') && !/tr-plus/.test(hEntier)], [true, true, true, true]);
      K.basculerTranscription('m1');
      vrai('fermer : le lien revient à « Voir la transcription », et rien ne repart', /^<button type="button" class="transcrire-lien presse" data-transcrire="m1">Voir la transcription<\/button>$/.test(K.htmlTranscription(m1, 'recue')) && cx.appels.length === 6);
      /* ⛔ (relecture du relecteur) : changer de conversation ne referme rien ailleurs — et n'oublie pas une demande en vol */
      K.annoncerTranscriptions({ id: 'c_b', messages: [] });
      const apresAutre = K.trOuvertes.has('m7') && K.trOuvertes.has('m15');
      cx.etat.convDonnees.messages = [m7];
      K.annoncerTranscriptions(cx.etat.convDonnees);
      v('⛔ une AUTRE conversation rendue ne touche pas à ce qui est ouvert ici ; ici, un vocal qui a quitté le fil (supprimé) sort de ce qu\'on a ouvert', [apresAutre, Array.from(K.trOuvertes.keys())], [true, ['m7']]);
      const idPiege = K.htmlTranscription(V('a"b<c'), 'recue');
      vrai('⛔ un identifiant de message piégé ne sort pas de son attribut', /data-transcrire="a&quot;b&lt;c"/.test(idPiege) && !/"b</.test(idPiege));
    } catch (e) { vrai('le bloc de la transcription a jeté : ' + e.message, false); }
    vrai('le message : la transcription se rend SOUS la rangée du vocal (hors de .msg-rang : la bulle garde la largeur de son texte), seulement quand elle est possible',
      /h = h\.slice\(0, debutCorps\) \+ '<span class="msg-rang'[^\n]*\n\s*if \(m\.vocal && transcriptionPossible\(m\)\) h \+= htmlTranscription\(m, sens\);/.test(JS));
    vrai('les gestes : le lien ouvre ou ferme, « Réessayer » redemande, « Voir plus » déplie ; le focus survit au rendu, et passe au lien quand « Réessayer » ou « Voir plus » disparaît',
      /const tl = e\.target\.closest\('\[data-transcrire\]'\);\s*if \(tl\) \{ basculerTranscription\(tl\.dataset\.transcrire\); return; \}/.test(JS) && /const tr = e\.target\.closest\('\[data-transcrire-reessayer\]'\);\s*if \(tr\) \{ demanderTranscription\(tr\.dataset\.transcrireReessayer\); return; \}/.test(JS)
        && /const tp = e\.target\.closest\('\[data-transcrire-plus\]'\);\s*if \(tp\) \{ trEntieres\.add\(tp\.dataset\.transcrirePlus\); rendreIci\(\); return; \}/.test(JS)
        && /actif\.dataset\.transcrire \? 'transcrire' : actif\.dataset\.transcrireReessayer \? 'transcrireReessayer' : actif\.dataset\.transcrirePlus \? 'transcrirePlus'/.test(JS) && /\(cle === 'transcrireReessayer' \|\| cle === 'transcrirePlus' \? col\.querySelector\('\[data-transcrire="'/.test(JS));
    vrai('⛔ le menu d\'un vocal : « Voir la transcription » tant qu\'elle est fermée, « Copier la transcription » une fois là ; après « Voir », le focus va au LIEN (le repeint détruisait le déclencheur du menu : il tombait sur <body>)',
      /if \(transcriptionPossible\(m\)\) \{[^}]*data-menu="copier-transcription">Copier la transcription<\/button>'[^}]*data-menu="transcrire">Voir la transcription<\/button>';/.test(JS)
        && /else if \(act === 'transcrire'\) \{ basculerTranscription\(mid\); const l = document\.querySelector\('#conv-messages \[data-transcrire="' \+ String\(mid\)\.replace\(\/\["\\\\\]\/g, ''\) \+ '"\]'\); if \(l\) l\.focus\(\{ preventScroll: true \}\); \}/.test(JS));
    vrai('⛔ au démarrage ET à l\'ouverture d\'une conversation : la page demande si la transcription est installée (trRelire), sans rien bloquer',
      /\n\s*trRelire\(\);/.test(corps('async function demarrer()')) && /fermerMenu\(\); fermerMentions\(\); trRelire\(\);/.test(corps('async function ouvrirConv')));
    vrai('le lien : 32 px dans la mise en page, 44 px sous le doigt (zone étendue, le vocal ne grandit pas) ; « Réessayer » et « Voir plus » : 44 px ; la roue s\'arrête en mouvement réduit ; un contour en couleurs forcées (le texte est une .bulle : la règle de toutes les bulles)',
      /\.transcrire-lien \{ position: relative;[^}]*min-height: 32px;/.test(CSS) && /@media \(pointer: coarse\) \{ \.transcrire-lien::before \{ content: ''; position: absolute; inset: -6px 0; \} \}/.test(CSS) && !/\.transcrire-lien \{[^}]*min-height: 44px/.test(CSS)
        && /@media \(pointer: coarse\) \{ \.tr-reessayer \{ min-height: 44px;/.test(CSS) && /@media \(pointer: coarse\) \{ \.tr-plus \{ min-height: 44px;/.test(CSS)
        && /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ animation: none !important;/.test(CSS) && !/@media \(prefers-reduced-motion: reduce\) \{ \.tr-roue/.test(CSS) && /@media \(forced-colors: active\) \{[^@]*\.bulle, \.photo, \.vocal[^{]*\{ border: 1px solid CanvasText; \}/.test(CSS));
  }
  vrai('écrans étroits : la barre de la feuille et celle des onglets peuvent RÉTRÉCIR (min-width 0, libellé coupé par une ellipse), plus de 64 px de plancher par bouton [sonde : etroit]', /\.feuille-barre h2 \{[^}]*min-width: 0[^}]*text-overflow: ellipsis/.test(CSS) && /\.feuille-bouton \{[^}]*min-width: 44px/.test(CSS) && /\.tab \{[^}]*min-width: 0/.test(CSS) && /\.tab span \{[^}]*text-overflow: ellipsis/.test(CSS));
  return R;
}

/* ══ EXÉCUTION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  const PAGE = lire('apercu/opmessages/index.html'), SRC = lire('apercu/opmessages/source.js'), DOC = lire('design/opmessages/THEME-OPMESSAGES.md');
  let ok = 0, ko = 0;
  const dire = (t, bon, d) => { if (bon) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d || '')); } };
  console.log('\n══ 1. LA CONVERSATION, L\'ÉCHAPPEMENT, LA SOURCE, L\'HISTORIQUE — sur la page réelle ══\n');
  const base = await controler(PAGE, SRC, DOC);
  for (const [t, bon, d] of base) dire(t, bon, d);
  dire('(population) ' + base.length + ' contrôles joués sur la page et le module réels', base.length >= 95);

  console.log('\n══ 2. LA CONTRE-ÉPREUVE : ON REMET LE DÉFAUT SUR UNE COPIE EN MÉMOIRE, LE BANC DOIT TOMBER (ou l\'indiquer à la sonde) ══\n');
  const neutre = (await controler(PAGE, SRC, DOC)).filter(r => !r[1]).length;
  dire('copie INTACTE : 0 constat rouge (le banc ne crie pas au loup)', neutre === 0, ' — ' + neutre + ' rouge(s)');
  const ids = MUTATIONS.map(m => m.id), doublons = ids.filter((x, i) => ids.indexOf(x) !== i);
  dire('chaque mutation porte un identifiant UNIQUE (deux « A01 » rendent un verdict ambigu, et le lanceur n\'en jouerait qu\'un)', doublons.length === 0, doublons.length ? ' — ' + Array.from(new Set(doublons)).join(', ') : '');
  let mordent = 0, banc = 0, sondeSeule = 0, malVisees = 0;
  const SERIE = MUTATIONS.filter(m => !m.suite);                // la série A (étape 3) est éprouvée par tests/test-859.js
  for (const m of SERIE) {
    const mut = appliquer(m, PAGE, SRC);
    if (!mut.change) { malVisees++; dire('mutation ' + m.id + ' « ' + m.nom + ' » : le motif ne trouve rien à muter (mutation mal visée)', false); continue; }
    if (!m.banc) {
      sondeSeule++; mordent++;
      dire(m.id + ' « ' + m.nom + ' » : posée sans erreur — gardée par la SONDE seule (tests/sonde-opmessages.js, lancée par tests/mutations-opmessages.js)', m.sonde === true);
      continue;
    }
    banc++;
    let rouges = []; try { rouges = (await controler(mut.PAGE, mut.SRC, DOC)).filter(r => !r[1]).map(r => r[0]); } catch (e) { rouges = ['le banc a jeté : ' + e.message]; }
    const nomme = rouges.some(t => m.banc.test(t));
    if (nomme) mordent++;
    dire(m.id + ' « ' + m.nom + ' » : ' + rouges.length + ' ✗, dont celui qui la garde' + (m.sonde ? ' (et la sonde la voit aussi)' : ''), nomme, '\n      rouges : ' + JSON.stringify(rouges.slice(0, 4)));
  }
  dire('(population) ' + SERIE.length + ' mutations : ' + banc + ' attrapées par ce banc, ' + sondeSeule + ' réservées à la sonde, ' + malVisees + ' mal visée(s) — ' + mordent + ' gardées', malVisees === 0 && mordent === SERIE.length && SERIE.length >= 25 && banc >= 20);

  console.log('\n═══ test-857 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('BANC MORT :', e); process.exit(2); });
