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
  vrai('le texte d\'une bulle et l\'aperçu de la liste passent par esc()', /'<span class="bulle ' \+ sens \+ '" dir="auto">' \+ esc\(m\.texte\) \+ '<\/span>'/.test(JS) && /esc\(c\.apercu\)/.test(JS) && /esc\(c\.nom\)/.test(JS) && /esc\(m\.texte\)/.test(JS));
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
    v('creerGroupe sans nom devient « Nouveau groupe (n) » ; le nom est plafonné à 40 signes', [(await S.creerGroupe({ nom: '   ', membres: ['c3'] })).court, (await S.creerGroupe({ nom: 'M'.repeat(60), membres: ['c3'] })).court.length], ['Nouveau groupe', 40]);
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
  vrai('⛔ une couche qu\'on ouvre POUSSE une entrée (history.pushState) ; une couche qu\'on ferme la RENDS (history.back), ou, sans entrée à rendre, remplace la route', /history\.pushState\(\{ opmsg: 1, n: h \? h\.n \+ 1 : 1/.test(JS) && /history\.back\(\)/.test(JS) && /history\.replaceState\(\{ opmsg: 1, n: h \? h\.n : 0/.test(JS));
  vrai('⛔ ouvrir une conversation, la feuille « Nouveau groupe » et la photo passent toutes par pousser() (une entrée par couche)', /function ouvrirDepuisListe[\s\S]*?pousser\(r\)/.test(JS) && /function ouvrirFeuille\(mode(?:, remplace)?\)[^\n]*pousser\(/.test(JS) && /pousser\(Object\.assign\(\{\}, etat\.route, \{ photo: p\.dataset\.photo \}\)\)/.test(JS));
  vrai('⛔ UN RETOUR, UNE FOIS : `history.back()` est asynchrone (la route ne change qu\'à popstate) — fermer une couche, rendre l\'entrée d\'une fiche, « Message » et le retour du Profil passent TOUS par rendreEntree(), qui note le retour en vol et ne le répète pas ; popstate le lève AVANT d\'appliquer la route. Les seuls autres history.back() défont l\'entrée qu\'un changement de FRAGMENT vient de poser (trois — le lien d\'un contact, l\'invitation d\'un espace, le lien d\'invité d\'une réunion —, chacun avec son popstate) [sonde des réunions, partie D : un seul retour, la page arrive sur l\'agenda]',
    /function rendreEntree\(\) \{\s*if \(retourEnVol\) return;\s*retourEnVol = true;[\s\S]{0,200}?history\.back\(\);\s*\}/.test(JS) && /window\.addEventListener\('popstate', \(\) => \{ retourEnVol = false;[^}]*\}\);\s*window\.addEventListener\('popstate', e => appliquer\(/.test(JS)
      && (JS.match(/history\.back\(\)/g) || []).length === 4 && (JS.match(/rendreEntree\(\)/g) || []).length === 5);   // la cinquième (7 octobre 2026) : « ‹ Agenda » du Profil, qui rend l'entrée d'où l'on venait
  vrai('le retour système (popstate) rejoue la route de l\'entrée — il ne ferme rien lui-même', /window\.addEventListener\('popstate', e => appliquer\(/.test(JS));
  vrai('⛔ « UN GESTE, UNE NAVIGATION » : aucun écouteur de balayage à la page (touchmove, touchend, swipe) — le navigateur n\'a pas de second retour à jouer ; le seul touchstart est le vide qui réveille :active sur iOS', !/addEventListener\('touch(?:move|end|cancel)'|swipe|overscroll-behavior-x/.test(JS + CSS) && (JS.match(/addEventListener\('touchstart'/g) || []).length === 1 && /addEventListener\('touchstart', function \(\) \{\}, \{ passive: true \}\)/.test(JS));
  /* (7 octobre 2026) le menu déroulant et la demande « Envoyer à … ? » se ferment AVANT toute couche : la fenêtre du motif s'élargit, l'ORDRE des couches reste gardé */
  vrai('Échap ferme la couche du dessus : la photo, la feuille, un enregistrement, la conversation (dans cet ordre)', /if \(e\.key !== 'Escape'\) return;[\s\S]{0,800}etat\.photo \|\| etat\.groupe\.ouvert[\s\S]{0,260}enr\.etat === 'enregistre'[\s\S]{0,200}etat\.conv/.test(JS));
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
    vrai('⛔ un nouveau rendu des infos garde le menu OUVERT sur la NOUVELLE ligne (une présence qui change ne le referme pas) ; une valeur changée ailleurs le REFERME (sa coche mentirait)',
      /if \(n && n\.dataset\.valeur === dr\.dataset\.valeur\) \{ n\.setAttribute\('aria-expanded', 'true'\); etat\.deroule\.declencheur = n; \}\s*else \{ if \(n\) etat\.deroule\.declencheur = n; fermerDeroule\(true\); \}/.test(JS));
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
    /etat\.conversations\.filter\(c => c\.invitation !== 'recue' && \(q \|\| dansMode\(c\)\)\)/.test(JS) && /const dansMode = c => !modesActifs\(\) \|\| coteDe\(c\) === etat\.mode;/.test(JS));
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
    /if \(confirmerActif\(\) && source\.confirmerEnvoi\(\) !== 'jamais' && X\.confirme !== t\) \{ X\.confirme = t; sallePanneauRendre\(A, true\);/.test(JS) && /<button type="submit">' \+ \(X\.confirme \? 'Confirmer' : 'Envoyer'\) \+ '<\/button>/.test(JS)
      && /if \(enSalle\(A\) && sx\(A\)\.confirme\) \{ sx\(A\)\.confirme = null; sallePanneauRendre\(A, true\); \}/.test(JS));
  vrai('⛔ Perso / Pro : le lien « Invitations » passe du côté de l\'invitation avant d\'ouvrir la liste ; créer ou rejoindre un espace passe côté Pro (sans couvrir « Tu as rejoint… »)',
    /const i0 = etat\.conversations\.find\(c => c\.invitation === 'recue'\); if \(i0 && !dansMode\(i0\)\) changerMode\(coteDe\(i0\), true\);/.test(JS)
      && (JS.match(/chargerEspaces\(\); if \(modesActifs\(\)\) changerMode\('pro', true, true\);/g) || []).length === 2 && /if \(!muet\) annonceMode\(m\);/.test(JS));
  vrai('⛔ focus : Espace HORS d\'un champ est un geste de clavier (l\'anneau rendu se voit) ; et la règle qui éteint l\'anneau rendu au doigt gagne sur les anneaux écrits plus loin',
    /&& !\(e\.key === ' ' && !champTexte\(e\.target\)\)\) return;/.test(JS) && /\[data-focus-doux\]:focus-visible \{ outline: none !important; \}/.test(CSS));

  /* 8 octobre 2026 : le menu d'un message contre sa bulle, « Me le rappeler », l'Agenda au mois — le comportement est mesuré par la sonde tests/sonde-opmessages-menu-rappel.js */
  vrai('le menu d\'un message s\'ancre à la rangée du message (dès 700 px, si le navigateur sait l\'ancre) et l\'ancre part avec lui',
    /@supports \(anchor-name: --menu-msg\)/.test(CSS) && /\.menu-fond\.ancre \.menu-msg \{ position: fixed; position-anchor: --menu-msg;/.test(CSS) && /if \(ancre\) \{ ancre\.classList\.add\('menu-ancre'\); \$\('menu-fond'\)\.classList\.add\('ancre'\);/.test(JS)
      && /\$\('conv-messages'\)\.querySelectorAll\('\.menu-ancre'\)\.forEach\(x => x\.classList\.remove\('menu-ancre'\)\);/.test(JS));
  vrai('« Me le rappeler » pose un ÉVÉNEMENT de l\'agenda, rappel à l\'heure, avec le CHEMIN vers son message (conversation et rang — jamais une copie)',
    /await source\.creerEvenement\(Object\.assign\(\{ titre, lieu: [^}]*rappel: 0, tz: x\.tz \},\s*Number\.isSafeInteger\(m\.seq\)[^;]*\{ source: \{ conv: c\.id, seq: m\.seq \} \}/.test(JS) && /if \(act === 'rappel'\) \{ rappelMenu\(\); return; \}/.test(JS));
  vrai('⛔ un rappel se COCHE (le tableau de bord ne montre plus un rappel fait), se REPORTE (l\'heure calculée par le service), et « Voir le message » va au message — chargé de l\'historique s\'il le faut, et DIT s\'il a disparu',
    /bord\.evenements\.filter\(e => !e\.fait && /.test(JS) && /source\.reporterEvenement\(F\.id, dans\)/.test(JS) && /source\.faitEvenement\(F\.id, !F\.fait\)/.test(JS)
      && /await source\.precedents\(c\.id\);[^]*?return allerAuMessage\(\);/.test(JS) && /mot\('Ce message n\\'est plus dans la conversation\.'\)/.test(JS) && /if \(cibleMsg\.conv === id\) allerAuMessage\(\);/.test(JS));
  vrai('l\'Agenda au mois : la fenêtre chargée est celle qu\'on voit (le mois entier en semaines), et le choix va au COMPTE',
    /const n = \+\+reu\.jeton, \[du, au\] = fenetreAgenda\(\);/.test(JS) && /if \(M\) rendreMois\(auj\);/.test(JS) && /source\.choisirAgendaVue\(v\)/.test(JS) && /reu\.vue = typeof source\.agendaVue === 'function' && source\.agendaVue\(\) === 'mois'/.test(JS));
  vrai('⛔ une occurrence TERMINÉE n\'est plus un bouton (8 octobre 2026 : « quand c\'est terminé, il faudrait pas qu\'on puisse cliquer dessus ») : un bloc, sans data-reunion',
    /const ouvre = se \? '<div class="reunion-ligne terminee'/.test(JS) && /\(se \? '<\/div>' : '<\/button>'\)/.test(JS) && /\.reunion-ligne\.terminee:active \{ transform: none; \}/.test(CSS));
  vrai('⛔ le tableau de bord : la semaine ou le MOIS (7 / 30 jours, relus sur la fenêtre, retenus par le compte), une séance terminée n\'y est plus « prévue », et RIEN à programmer d\'ici',
    /const BORD_PORTEES = \{ semaine: 7, mois: 30 \}/.test(JS) && /o\.debut < fin && !\(o\.seance && !r\.salleOuverte\)\) occ\.push/.test(JS) && !/data-bord="programmer"/.test(JS)
      && /source\.choisirBordReunions\(v\)/.test(JS) && /source\.reunions\(du, plusJours\(du, bordJours\(\) \+ 1\)\)/.test(JS));
  vrai('⛔ un événement modifié ou supprimé se relit PARTOUT où il s\'affiche — l\'Agenda ET le tableau de bord (8 octobre 2026 : « je peux pas supprimer » : le rappel restait au tableau)',
    /function evenementsRelire\(\) \{\s*chargerReunions\(\);\s*if \(\$\('vue-accueil'\)\.dataset\.pret\) \{[^}]*chargerAccueil\(\); \}/.test(JS) && (JS.match(/fermerCouche\(\); evenementsRelire\(\);|evenementsRelire\(\);\n/g) || []).length >= 2
      && /bord\.evenements = bord\.evenements\.filter\(x => x\.id !== F\.id\)/.test(JS));
  vrai('⛔ envoyer plus tard : la tuile « Plus tard » et l\'appui long sur la flèche mènent aux heures ; le relâcher d\'un appui long n\'ENVOIE pas ; les programmés viennent du SERVICE (jamais de l\'appareil)',
    /if \(typeof source\.programmerMessage === 'function'\) t\.push\(\['plus-tard'/.test(JS) && /\$\('envoyer'\)\.addEventListener\('click', e => \{ if \(etat\.envoyerLong\) \{ etat\.envoyerLong = false; e\.stopImmediatePropagation\(\); \} \}, true\);/.test(JS)
      && /await source\.programmerMessage\(conv, texte, t\);/.test(JS) && /l = await source\.messagesProgrammes\(conv\);/.test(JS) && /chargerProgrammes\(id\);/.test(JS));

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
  vrai('vocal : changer de conversation coupe la prise de son ET la lecture de l\'ancienne, et un vocal part vers la conversation où il a COMMENCÉ [sonde : vocal-conv]', /if \(etat\.conv && etat\.conv !== id\) \{ arreterLecture\(\); annulerEnregistrement\(\); \}/.test(JS) && /enr\.conv = etat\.conv/.test(JS) && /envoi\(\{ vocal: \{ blob: b, url, dur: msVu \/ 1000, bars \} \}, cible\)/.test(JS));
  vrai('double toucher : un second toucher dans les 400 ms ne tombe pas sur ce que le premier a laissé — micro, « + » et caméra refusent (pas « Retour » : il n\'a jamais été sous un de ces gestes) ; la flèche, l\'envoi du vocal, l\'annulation et la croix de la photo l\'arment ; deux clics synchrones = un message [sonde : double-toucher]',
    /const armerRetap = \(\) => \{ retapJusqua = Date\.now\(\) \+ 400; \};/.test(JS) && /\$\('envoyer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\); if \(confirmeTropTot\(\)\) return; envoyerTexte\(\); \}\)/.test(JS) && /if \(retap\(\)\) \{ e\.preventDefault\(\); return; \}/.test(JS) && /\$\('enreg-envoyer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\)/.test(JS) && /\$\('visionneuse-fermer'\)\.addEventListener\('click', \(\) => \{ armerRetap\(\); fermerCouche\(\); \}\)/.test(JS) && /if \(etat\.envoiEnCours\) \{ etat\.envoiSuivant = true; return; \}/.test(JS) && /ta\.value = ''; delete etat\.brouillons\[id\]; ajusterSaisie\(\); majBoutons\(\);\n    try \{/.test(JS));
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
