/* ⛔ CE QUE CE FICHIER GARDE — LA BOÎTE MAIL DE LA TOUR (v2.88, 17 octobre 2026).

   Justin : « je veux une vraie boîte mail intégrée dans la Tour » ; « mêmes boîtes, triées » entre les deux consoles.
   Le parcours entier (lire, répondre, transférer, écrire avec pièces, ranger, déplacer, supprimer) se joue au navigateur
   contre le vrai serveur et une boîte IMAP de banc : `scratchpad/sonde-courrier.js` (27 ✓ au bureau, 27 ✓ au téléphone).
   Ici, les vraies fonctions de la page, dans un bac à sable, pour ce qui doit tenir sans navigateur :
     · un message HTML se lit dans un cadre ISOLÉ (ni script, ni accès à la Tour) et sans image distante tant qu'on ne
       les demande pas ;
     · un courriel protégé (code de sécurité) n'offre ni Déplacer ni Supprimer ;
     · Répondre / Répondre à tous / Transférer : le bon destinataire, jamais notre propre boîte en copie, « Re: » une
       seule fois, le fil (`enReponseA`) ;
     · les pièces : 12 au plus, 12 Mo au plus, et une pièce encore en lecture n'est jamais envoyée vide ;
     · la liste demande la console OUVERTE, et une réponse périmée (on a changé de boîte) ne remplace pas la liste ;
     · la relève de fond ne recharge pas la liste sous un message qu'on écrit. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(__dirname, '..', 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
function bloc(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(|\\nvar ' + nom + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.|try\{)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['COUR', '_gestes', 'geste', 'esc', 'jsq', 'nMot', 'chargerMessages', 'chargerMail', 'courAdrs', 'courHtml', 'lecture', 'courTaille', 'courSignature',
  'courBoiteDefaut', 'courNouveau', 'compoOuvrir', 'courRe', 'courCitation', 'courRepondre', 'courEnB64', 'COUR_MAX_PIECES', 'courPieces', 'courCorps', 'courEnvoyer'];
const SRCS = NOMS.map(bloc);
console.log('\n── test-1018 : la boîte mail de la Tour ──');
vrai('(population) les fonctions de la boîte mail sont trouvées dans tour.html', SRCS.every(Boolean), NOMS.filter((n, i) => !SRCS[i]).join(', '));

function bac(extra) {
  const j = { toasts: [], rendus: 0, posts: [], gets: [] };
  const ctx = Object.assign({ console, Promise, setTimeout, clearTimeout, JSON, String, Object, Array, Number, Math, Date, RegExp, encodeURIComponent,
    toast: t => j.toasts.push(String(t)), render: () => { j.rendus++; }, renderNav: () => { j.rendus++; }, rendreEnGardantLeFocus: () => { j.rendus++; },
    svg: () => '', fmtDateLong: () => 'le jour', supVide: (i, t) => '<vide>' + t + '</vide>', supSquel: () => '<squel>', mailEtroit: () => false,
    mailTeteLecture: (n, a, ts, o, b) => '<tete>' + b + '</tete>', mailDossiersDe: () => [{ chemin: 'INBOX', role: 'inbox' }, { chemin: 'Archives', role: 'archive' }],
    MAIL_PUBLICS: ['gmail.com'], APPS_TOUR: { gestion: { nom: 'OP GESTION' }, messages: { nom: 'OP MESSAGES' } }, APP: 'gestion', TAB: 'support',
    MSG: { boites: [{ boite: { id: 'b1', email: 'support@teamop.fr' }, dossiers: [] }], messages: [], sel: { boite: 'toutes' }, nonLus: 0 },
    CLI: { list: [] }, ENT: { liste: [] }, INJOIGNABLE: 'injoignable', msgErreur: () => 'refusé', setBdg() {}, chargerReglagesCourrier() {}, document: { getElementById: () => null },
    apiGet: u => { j.gets.push(u); return extra && extra.reponse ? extra.reponse(u) : Promise.resolve({ messages: [], total: 0, page: 0, pages: 1 }); },
    apiPost: (u, b) => { j.posts.push({ u, b }); return Promise.resolve({ ok: true, d: {} }); } }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(SRCS.join('\n'), ctx);
  return { ctx, j };
}
const MSGH = { uid: 7, dossier: 'INBOX', boite: 'b1', boiteEmail: 'support@teamop.fr', de: 'paul@client.fr', deNom: 'Paul', objet: 'Devis', ts: 1,
  pour: [{ adr: 'support@teamop.fr', nom: 'TEAM OP' }, { adr: 'associe@client.fr', nom: '' }], copie: [{ adr: 'compta@client.fr', nom: '' }], texte: 'Bonjour', mid: '<m7@x>',
  html: '<p>Bonjour</p><img src="https://pixel.example/x.gif"><script>alert(1)</script>', pieces: [], console: 'atrier', interlocuteur: 'paul@client.fr' };

(async () => {
  /* 1. lire */
  {
    const { ctx } = bac(); ctx.MSG.ouvert = JSON.parse(JSON.stringify(MSGH)); ctx.MSG.lu = 'b1|INBOX|7';
    const h = ctx.lecture();
    const ifr = /<iframe class="cour-html"[^>]*sandbox="([^"]*)"[^>]*srcdoc="([^"]*)"/.exec(h);
    vrai('(population) le message HTML se lit dans un cadre', !!ifr, h.slice(0, 200));
    vrai('⛔ le cadre n’accorde ni script ni accès à la Tour (sandbox sans allow-scripts ni allow-same-origin)', ifr && !/allow-scripts|allow-same-origin/.test(ifr[1]), ifr && ifr[1]);
    vrai('⛔ une règle de sécurité dans le cadre : aucune image distante tant qu’on ne les demande pas', ifr && /default-src &#39;none&#39;|default-src 'none'/.test(ifr[2].replace(/&amp;/g, '&')) && /img-src data: cid:;/.test(ifr[2]), ifr && ifr[2].slice(0, 200));
    vrai('…et l’écran dit que des images sont bloquées', /Images distantes bloquées/.test(h));
    vrai('« À trier » propose de ranger l’adresse dans une console', /À trier/.test(h) && /courRanger\('paul@client\.fr','messages'\)/.test(h));
    vrai('les gestes d’un message : Répondre, Répondre à tous, Transférer, Déplacer, Supprimer', ['Répondre', 'Répondre à tous', 'Transférer', 'Déplacer', 'Supprimer'].every(x => h.includes(x)));
    ctx.COUR.images['b1|INBOX|7'] = true;
    vrai('« Afficher les images » ne rouvre que CE message', /img-src data: cid: https: http:/.test(ctx.lecture()));
    ctx.MSG.ouvert.protege = true;
    const hp = ctx.lecture();
    vrai('⛔ un courriel protégé n’offre ni Déplacer ni Supprimer (le serveur les refuse)', !/>Supprimer</.test(hp) && !/Déplacer/.test(hp) && /protégé/.test(hp));
    ctx.MSG.ouvert = null; ctx.MSG.luErr = 'Le serveur a refusé (502).';
    vrai('un message qui ne s’ouvre pas le DIT (pas « aucun message ouvert »)', /ne s’ouvre pas/.test(ctx.lecture()) && !/Aucun message ouvert/.test(ctx.lecture()));
  }
  /* 2. répondre, à tous, transférer */
  {
    const { ctx } = bac(); ctx.MSG.ouvert = JSON.parse(JSON.stringify(MSGH));
    ctx.courRepondre(false);
    v('Répondre : à l’expéditeur, « Re: » une fois, dans le fil', [ctx.COUR.c.a, ctx.COUR.c.objet, ctx.COUR.c.enReponseA && ctx.COUR.c.enReponseA.mid, ctx.COUR.c.copie], ['paul@client.fr', 'Re: Devis', '<m7@x>', '']);
    ctx.MSG.ouvert.objet = 'RE : Devis'; ctx.courRepondre(false);
    v('« Re: » ne s’empile pas (Re: Re:)', ctx.COUR.c.objet, 'RE : Devis');
    ctx.MSG.ouvert.objet = 'Devis'; ctx.courRepondre(true);
    v('⛔ Répondre à tous : les autres en copie, jamais notre propre boîte ni l’expéditeur deux fois', ctx.COUR.c.copie.split(', ').sort(), ['associe@client.fr', 'compta@client.fr']);
    ctx.MSG.ouvert.de = 'support@teamop.fr'; ctx.courRepondre(false);
    v('⛔ répondre à un message ENVOYÉ écrit à ses destinataires — jamais à notre propre boîte', ctx.COUR.c.a, 'associe@client.fr');
    vrai('la citation garde le message d’origine, ligne par ligne', /a écrit :\n> Bonjour/.test(ctx.courCitation(MSGH)));
  }
  /* 3. les pièces */
  {
    const { ctx, j } = bac({ FileReader: function () { this.readAsDataURL = () => { setTimeout(() => { this.result = 'data:x;base64,QUJD'; this.onload(); }, 5); }; } });
    ctx.courNouveau({ a: 'x@y.fr' });
    const f = (n, s) => ({ name: n, size: s, type: 'text/plain' });
    ctx.courPieces({ files: Array.from({ length: 13 }, (_, i) => f('p' + i + '.txt', 10)), value: 'x' });
    v('⛔ 12 pièces au plus — la treizième est refusée, et on le dit', ctx.COUR.c.pieces.length, 12);
    await dormir(40);
    vrai('…le refus est dit', j.toasts.some(t => /12 pièces/.test(t)), j.toasts.join(' | '));
    ctx.COUR.c.pieces = []; j.toasts.length = 0;
    ctx.courPieces({ files: [f('gros.bin', 12 * 1048576 + 1)], value: 'x' }); await dormir(20);
    v('⛔ 12 Mo au plus en tout', [ctx.COUR.c.pieces.length, j.toasts.some(t => /12 Mo/.test(t))], [0, true]);
    ctx.courPieces({ files: [f('a.txt', 3)], value: 'x' });
    ctx.COUR.c.texte = 'Bonjour';
    ctx.courEnvoyer();
    vrai('⛔ une pièce encore en lecture n’est jamais envoyée vide : l’envoi attend', !j.posts.some(p => /envoyer/.test(p.u)) && j.toasts.some(t => /encore en lecture/.test(t)), j.toasts.join(' | '));
    await dormir(30);
    ctx.courEnvoyer(); await dormir(10);
    const env = j.posts.filter(p => /\/mail\/envoyer/.test(p.u));
    v('…puis part, avec la pièce lue (et rien de plus)', env.length && env[0].b.pieces.map(p => [p.nom, p.b64]), [['a.txt', 'QUJD']]);
    j.posts.length = 0; ctx.courNouveau({ a: 'x@y.fr' }); ctx.COUR.c.texte = 'x';
    ctx.courEnvoyer(); ctx.courEnvoyer(); await dormir(10);
    v('⛔ un double clic sur Envoyer n’envoie qu’une fois', j.posts.filter(p => /\/mail\/envoyer/.test(p.u)).length, 1);
  }
  /* 4. la liste */
  {
    let lacher = []; const { ctx, j } = bac({ reponse: u => new Promise(r => lacher.push(() => r({ messages: [{ uid: /boite=A/.test(u) ? 1 : 2 }], total: 1, page: 0, pages: 1 }))) });
    ctx.APP = 'messages';
    ctx.MSG.sel = { boite: 'A', dossier: 'INBOX' }; ctx.chargerMessages();
    ctx.MSG.sel = { boite: 'B', dossier: 'INBOX' }; ctx.chargerMessages();
    vrai('la liste demande la console OUVERTE (OP MESSAGES : ses messages et ceux « à trier »)', j.gets.every(u => /console=messages/.test(u)), j.gets.join(' '));
    lacher[1](); await dormir(5); lacher[0](); await dormir(5);
    v('⛔ la réponse de la boîte A, arrivée APRÈS celle de B, ne remplace pas la liste de B', ctx.MSG.messages.map(m => m.uid), [2]);
  }
  {
    const { ctx, j } = bac({ reponse: u => Promise.resolve(/dossiers/.test(u) ? { boites: [{ boite: { id: 'b1' }, nonLus: 3 }] } : { messages: [], total: 0, page: 0, pages: 1 }) });
    ctx.MSG.compo = true; ctx.chargerMail(false, true); await dormir(10);
    v('⛔ la relève de fond met à jour les non-lus mais ne recharge pas la liste sous un message qu’on écrit', [ctx.MSG.nonLus, j.gets.some(u => /\/mail\/liste/.test(u))], [3, false]);
    ctx.MSG.compo = false; ctx.MSG.ouvert = null; ctx.MSG.page = 0; ctx.chargerMail(false, true); await dormir(10);
    vrai('…et la recharge quand rien n’est en cours', j.gets.some(u => /\/mail\/liste/.test(u)));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
