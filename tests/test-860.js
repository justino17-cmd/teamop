/* ⛔ CE QUE CE FICHIER GARDE — UNE DÉCISION D'ACHAT SE PREND SUR UNE LISTE STRIPE LANCÉE APRÈS LA DEMANDE (3 octobre 2026).

   Le client paie « Ajouter Stock », puis reclique : le serveur doit voir le paiement qu'il vient de faire, sinon il vend une
   seconde fois la même option — prélevée en double. `espaceStripeAchat` relisait la liste des abonnements « si elle a plus
   d'une milliseconde » et la disait fraîche si elle avait été RANGÉE moins d'une seconde avant la demande. Deux trous :
     · une liste rangée à l'instant (2 ms, mesuré ici sur `test-850`) ne se relisait pas — et elle avait été LANCÉE avant le
       paiement : sur la machine de GitHub, plus rapide, `test-850` est tombé (un second Stock × 3 accepté, 200) ;
     · une lecture DÉJÀ EN COURS quand la demande arrive se partageait (« une seule lecture à la fois ») — partie avant le
       paiement, elle rendait la liste d'avant ; Stripe lent la fait durer des dizaines de secondes.
   Et une relecture qui RATAIT laissait passer pour fraîche la liste d'avant, si elle avait moins d'une seconde.
   Les lectures sont désormais NUMÉROTÉES à leur départ, et une décision d'achat ne croit qu'une lecture lancée après elle.

   Ce banc extrait les VRAIES fonctions du fichier livré (`stripeListe`, `espaceStripe`, `espaceStripeAchat`, et la déclaration
   du cache) et les exécute contre un Stripe tenu À LA MAIN : chaque lecture photographie ce que Stripe sait à son DÉPART et ne
   rend sa liste que quand le banc la relâche (ou la fait rater). Rien n'est joué au chronomètre : chaque course se pose geste
   par geste. Le rattachement d'une liste à une entreprise (`espaceStripeDans`) n'est pas ce qui se garde ici : un filtre simple
   le remplace. Le comportement de la route entière, sur le vrai serveur, est dans `test-850`. */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

/* la découpe de `test-727` : la fonction par son nom, jusqu'à son accolade fermante */
function extraire(nom) {
  let d0 = SRC.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (SRC.slice(d0 - 6, d0) === 'async ') d0 -= 6;
  let p = 0;
  for (let k = SRC.indexOf('{', d0); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(d0, k + 1); } }
  return '';
}
console.log('\n── 860 · une décision d\'achat lit une liste Stripe lancée APRÈS elle ──');
const FN = ['stripeListe', 'espaceStripe', 'espaceStripeAchat'].map(extraire);
const CACHE = (/^const espStripeCache = .*$/m.exec(SRC) || [''])[0];
vrai('(population) les trois fonctions et la déclaration du cache sont trouvées dans le fichier réel',
  /^async function stripeListe\(/.test(FN[0]) && /^async function espaceStripe\(/.test(FN[1]) && /^async function espaceStripeAchat\(/.test(FN[2]) && /espStripeCache = \{/.test(CACHE));

/* un serveur, un Stripe tenu à la main */
function monter() {
  const STRIPE = { abos: [] }, lectures = [], journal = [];
  const stripeAbosBruts = () => new Promise((res, rej) => {
    const l = { etat: JSON.parse(JSON.stringify(STRIPE.abos)), fini: false };
    l.relacher = () => { l.fini = true; res(l.etat); };
    l.rater = () => { l.fini = true; rej(new Error('panne du banc')); };
    lectures.push(l);
  });
  const espaceStripeDans = (e, liste) => { const a = liste.filter(x => x.ent === e.slug).map(x => x.id); return a.length ? { abos: a } : null; };
  const lib = new Function('config', 'stripeAbosBruts', 'espaceStripeDans', 'STRIPE_CACHE_MS', 'console',
    CACHE + '\n' + FN.join('\n') + '\nreturn { espStripeCache, stripeListe, espaceStripe, espaceStripeAchat };')(
    { stripe: { secretKey: 'sk_de_banc_860' } }, stripeAbosBruts, espaceStripeDans, 300000,
    { error: (...a) => journal.push(a.join(' ')), log: () => {} });
  return { lib, STRIPE, lectures, journal };
}
/* laisser le serveur avancer jusqu'à ce qu'il attende quelque chose (des tours de boucle, pas une durée) */
const laisser = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)); };
const C8A = { slug: 'c8a' };

(async () => {
  /* ── A · une liste rangée À L'INSTANT, mais lancée avant la demande ── */
  {
    const { lib, STRIPE, lectures } = monter();
    STRIPE.abos = [{ id: 'sub_pro', ent: 'c8a' }];
    const p0 = lib.stripeListe(1); await laisser(); lectures[0].relacher(); await p0;   // une lecture complète, d'avant le paiement
    STRIPE.abos.push({ id: 'sub_stock', ent: 'c8a' });                                 // le client vient de payer le Stock
    const pr = lib.espaceStripeAchat(C8A);
    await laisser();
    v('⛔⛔ A · une liste rangée à l\'instant mais LANCÉE avant la demande ne décide pas : la décision relance Stripe (une lecture de plus)', lectures.length, 2);
    if (lectures[1]) lectures[1].relacher();
    const r = await pr;
    v('   et décide sur ce que Stripe sait APRÈS le paiement (le Stock est là, sinon il se vendait deux fois), liste dite fraîche',
      [r.s && r.s.abos, r.fraiche], [['sub_pro', 'sub_stock'], true]);
  }

  /* ── B · une lecture EN COURS quand la demande arrive, lancée avant le paiement ── */
  {
    const { lib, STRIPE, lectures } = monter();
    STRIPE.abos = [{ id: 'sub_pro', ent: 'c8a' }];
    const pFond = lib.stripeListe(1);                       // une lecture de fond (le verdict d'une autre page, le rappel J-7…)
    await laisser();
    vrai('(population) B · une lecture de fond est en cours, lancée avant le paiement', lectures.length === 1 && !lectures[0].fini);
    STRIPE.abos.push({ id: 'sub_stock', ent: 'c8a' });       // le client paie pendant qu'elle tourne
    let rendue = null;
    const pr = lib.espaceStripeAchat(C8A).then(r => { rendue = r; return r; });
    await laisser();
    v('⛔⛔ B · la décision ne PARTAGE pas la lecture d\'avant : elle attend (une seule lecture à la fois) sans rien décider',
      [lectures.length, rendue], [1, null]);
    lectures[0].relacher(); await pFond; await laisser();
    v('   la lecture d\'avant finie, elle en LANCE une à elle — et ne décide toujours pas sur l\'ancienne', [lectures.length, rendue], [2, null]);
    if (lectures[1]) lectures[1].relacher();
    const r = await pr;
    v('   et décide sur la sienne : le Stock payé est vu, liste fraîche', [r.s && r.s.abos, r.fraiche], [['sub_pro', 'sub_stock'], true]);
  }

  /* ── C · la relecture de la décision RATE ── */
  {
    const { lib, STRIPE, lectures, journal } = monter();
    STRIPE.abos = [{ id: 'sub_pro', ent: 'c8a' }];
    const p0 = lib.stripeListe(1); await laisser(); lectures[0].relacher(); await p0;
    STRIPE.abos.push({ id: 'sub_stock', ent: 'c8a' });
    const pr = lib.espaceStripeAchat(C8A);
    await laisser();
    vrai('(population) C · la décision a bien lancé sa relecture', lectures.length === 2);
    if (lectures[1]) lectures[1].rater();
    const r = await pr;
    v('⛔⛔ C · Stripe rate la relecture : la liste d\'avant (rangée il y a un instant) n\'est PAS fraîche — la route refuse (502) au lieu de vendre deux fois',
      r.fraiche, false);
    vrai('   et la panne se dit au journal (la dernière liste connue sert aux autres)', journal.some(l => /la dernière liste connue sert/.test(l)));
    const pr2 = lib.espaceStripeAchat(C8A);
    await laisser();
    v('   la minute qui suit un échec, une nouvelle décision ne relance pas Stripe (pas de rafale) et n\'est pas fraîche non plus',
      [lectures.length, (await pr2).fraiche], [2, false]);
  }

  /* ── D · contre-épreuves : ce qui ne change pas ── */
  {
    const { lib, STRIPE, lectures } = monter();
    STRIPE.abos = [{ id: 'sub_pro', ent: 'c8a' }];
    const a = lib.espaceStripe(C8A), b = lib.espaceStripe(C8A);   // deux verdicts ordinaires, cache vide
    await laisser();
    v('   D · deux lecteurs ordinaires PARTAGENT la même lecture (une seule à la fois, comme avant)', lectures.length, 1);
    lectures[0].relacher();
    v('   et lisent la même liste', [(await a).abos, (await b).abos], [['sub_pro'], ['sub_pro']]);
    STRIPE.abos.push({ id: 'sub_stock', ent: 'c8a' });
    const c = await lib.espaceStripe(C8A);
    v('   un lecteur ordinaire garde le cache tant qu\'il est jeune (rien de plus chez Stripe, la liste d\'avant)', [lectures.length, c.abos], [1, ['sub_pro']]);
    const d1 = lib.espaceStripeAchat(C8A), d2 = lib.espaceStripeAchat(C8A);   // deux décisions d'achat simultanées
    await laisser();
    v('   deux décisions d\'achat simultanées : UNE lecture lancée pour la première…', lectures.length, 2);
    lectures[1].relacher(); await laisser();
    v('   …la seconde, arrivée avant qu\'elle parte, en relance une (pas plus)', lectures.length, 3);
    if (lectures[2]) lectures[2].relacher();
    const [r1, r2] = [await d1, await d2];
    v('   et chacune décide sur une liste fraîche qui voit le Stock', [r1.fraiche, r2.fraiche, r1.s.abos, r2.s.abos],
      [true, true, ['sub_pro', 'sub_stock'], ['sub_pro', 'sub_stock']]);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
