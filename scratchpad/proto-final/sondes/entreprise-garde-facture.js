// « Mon entreprise » : une facture ne PART pas tant que le nom, l'adresse ou le SIRET manquent. UNE porte (envoyerFacture, qui rend un booléen),
// QUATRE appelants qui la lisent : envoyer, toutValider, terminer (refus silencieux : c'est le geste du technicien), aperçu d'envoi (qui dit le manque
// AVANT le bouton). Le toast ne ment jamais (« Facture envoyée » absent après un refus ; « 0 facture envoyée » jamais), le manque se dit UNE fois pour un
// lot, un client sans e-mail retient l'envoi automatique, devis et contrat préviennent sans bloquer, et « Compléter » ouvre la bonne carte.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (factures, appelants) avant de conclure.
const { L, v, ouvrirEnt, toast, panneauOuvert, fin } = require('./entreprise-commun.js');
// prépare une intervention TERMINABLE (tous les contrôles cochés, signée), à facturer au forfait ; rend son identifiant
const PREP = (id, cli) => `(() => { INTS.push({ id:'${id}', d:AUJ, h:'09:00', dur:60, tech:'sm', cli:'${cli}', titre:'Essai Mon entreprise', type:'Entretien', st:'planifiee', fact:{ mode:'forfait', forfait:100, tva:20, zone:1 } });
  const F = fiche('${id}'); F.coches = Object.fromEntries(tousControles(F).map(k => [k, true])); F.signature = 'signee'; F.absent = false; F.compte = 'Entretien réalisé.'; return manque(F).length; })()`;
async function etat(c, id) { return c.p.evaluate(i => { const f = FACTURES.find(x => x.int === i); return f ? { st:f.st, num:f.num } : null; }, id); }
(async () => {
  for (const [qui, peut] of [['marc', true], ['julie', false]]) {
    const c = await ouvrirEnt({ profil:'mac', qui }); const nom = qui === 'marc' ? 'gérant' : 'bureau';
    const cli = await c.p.evaluate(() => Object.keys(CLIENTS).find(k => CLIENTS[k].mail && CLIENTS[k].type === 'pro'));
    // ── 4. terminer : refus silencieux, la facture attend « à valider »
    await c.p.evaluate(() => { ENTREPRISE.siret = ''; reglages.auto = true; });
    const m1 = await c.p.evaluate(PREP('t-ent-1', cli)); v(`${nom} : population : l’intervention d’essai est terminable (rien ne manque)`, m1 === 0, m1);
    await c.p.evaluate(() => { ACTIONS.terminer({ dataset:{ id:'t-ent-1' } }); }); await L.calme(c.p, 300);
    const f1 = await etat(c, 't-ent-1'), t4 = await toast(c.p);
    v(`${nom} : terminer sans SIRET : la facture est préparée mais RESTE « à valider »`, f1 && f1.st === 'avalider' && f1.num === '—', f1);
    v(`${nom} : terminer : refus SILENCIEUX (le toast habituel, aucune phrase sur le SIRET : le technicien n’y peut rien)`, /Terminée/.test(t4) && !/SIRET|Il manque/.test(t4), t4);
    // ── 1. SIRET vidé : l'aperçu dit le manque avant le bouton
    const dispo = await c.p.evaluate(() => { const f = FACTURES.find(x => x.int === 't-ent-1'); return f ? f.id : null; });
    v(`${nom} : population : une facture « à valider » prête à partir existe`, !!dispo, dispo);
    await c.p.evaluate(id => { ACTIONS.apercuEnvoi({ dataset:{ id } }); }, dispo); await L.calme(c.p, 300);
    const ap = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { envoyer:!!P.querySelector('[data-action="envoyer"]'), ban:(P.querySelector('.ent-ban') || {}).textContent || '', bouton:[...P.querySelectorAll('.ent-ban .btn')].map(b => b.textContent) } : null; });
    const txt = (ap && ap.ban || '').replace(/[  ]/g, ' ');
    v(`${nom} : l’aperçu n’offre plus « Valider et envoyer »`, ap && ap.envoyer === false, ap);
    v(`${nom} : l’aperçu dit ${peut ? 'le manque avec « Ça prend trente secondes »' : 'qui prévenir (« demande à Marc de la compléter »)'}`, peut ? /Il manque ton SIRET sur ta fiche : une facture doit le porter\. Ça prend trente secondes\./.test(txt) : /Il manque le SIRET sur la fiche de l’entreprise : demande à Marc de la compléter\./.test(txt), txt);
    v(`${nom} : le bouton « Compléter ma fiche » ${peut ? 'remplace « Envoyer »' : 'n’existe pas (le bureau ne peut pas la compléter)'}`, peut ? (ap.bouton || []).join('|') === 'Compléter ma fiche' : (ap.bouton || []).length === 0, ap && ap.bouton);
    if (peut) { await L.toucher(c, '#calque [data-ent="completer"]'); await L.calme(c.p, 500);
      const o = await c.p.evaluate(() => ({ h:location.hash, ouvert:!!document.getElementById('fl-siret'), h2:(document.querySelector('#calque .panneau h2') || {}).textContent }));
      v('« Compléter ma fiche » ouvre Mon entreprise ET la carte du SIRET (mentions légales)', o.h === '#entreprise' && o.ouvert, o); await L.ranger(c.p); }
    else await L.ranger(c.p);
    // ── 2. envoyer (appelé de force) : rien ne part, le panneau reste, le toast ne ment pas
    await c.p.evaluate(id => { ACTIONS.apercuEnvoi({ dataset:{ id } }); }, dispo);
    await c.p.evaluate(id => { ACTIONS.envoyer({ dataset:{ id } }); }, dispo); await L.calme(c.p, 300);
    const e1 = await c.p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { st:f.st, num:f.num }; }, dispo), t1 = await toast(c.p), p1 = await panneauOuvert(c.p);
    v(`${nom} : envoyer(appel forcé) : la facture reste « à valider », sans numéro`, e1.st === 'avalider' && e1.num === '—', e1);
    v(`${nom} : envoyer : le toast dit le manque, jamais « Facture envoyée »`, /Il manque/.test(t1) && !/Facture envoyée/.test(t1), t1);
    v(`${nom} : envoyer : le panneau n’est pas refermé comme si c’était parti`, p1 !== '', p1);
    await L.ranger(c.p);
    // ── 3. toutValider : une seule phrase pour tout le lot, jamais « 0 facture envoyée »
    const prets = await c.p.evaluate(() => FACTURES.filter(f => f.st === 'avalider' && lignesDe(f).every(l => l.pu != null)).length);
    await c.p.evaluate(() => { ACTIONS.toutValider({}); }); await L.calme(c.p, 300);
    const tv = await toast(c.p), apres = await c.p.evaluate(() => FACTURES.filter(f => f.st === 'avalider' && lignesDe(f).every(l => l.pu != null)).length);
    v(`${nom} : population : ${prets} facture(s) prête(s) dans le lot`, prets >= 1, prets);
    v(`${nom} : toutValider : aucune n’est partie`, apres === prets, { prets, apres });
    v(`${nom} : toutValider : « Aucune facture n’est partie : il manque… » dit UNE fois, sans « 0 facture envoyée »`, /Aucune facture n’est partie : il manque/.test(tv) && (tv.match(/il manque/gi) || []).length === 1 && !/0 facture/.test(tv), tv);
    // ── 5. SIRET rempli : tout part
    await c.p.evaluate(() => { ENTREPRISE.siret = '732 829 320 00074'; });
    const m2 = await c.p.evaluate(PREP('t-ent-2', cli)); await c.p.evaluate(() => { ACTIONS.terminer({ dataset:{ id:'t-ent-2' } }); }); await L.calme(c.p, 300);
    const f2 = await etat(c, 't-ent-2'); v(`${nom} : SIRET rempli : terminer envoie la facture toute seule (numéro définitif, « envoyée »)`, m2 === 0 && f2 && f2.st === 'envoyee' && /^FAC-/.test(f2.num), { m2, f2 });
    // client SANS e-mail : l'envoi automatique est retenu
    const sans = await c.p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => CLIENTS[x].type === 'part'); CLIENTS[k]._mail = CLIENTS[k].mail; CLIENTS[k].mail = ''; return k; });
    const m3 = await c.p.evaluate(PREP('t-ent-3', sans)); await c.p.evaluate(() => { ACTIONS.terminer({ dataset:{ id:'t-ent-3' } }); }); await L.calme(c.p, 300);
    const f3 = await etat(c, 't-ent-3'); v(`${nom} : client sans e-mail : la facture attend « à valider » (retenue)`, m3 === 0 && f3 && f3.st === 'avalider', { m3, f3 });
    await c.p.evaluate(k => { CLIENTS[k].mail = CLIENTS[k]._mail; }, sans);
    // envoyer et toutValider avec l'identité complète : tout part, le toast dit la vérité
    const d2 = await c.p.evaluate(() => { const f = FACTURES.find(x => x.st === 'avalider' && lignesDe(x).every(l => l.pu != null)); return f && f.id; });
    await c.p.evaluate(id => { ACTIONS.apercuEnvoi({ dataset:{ id } }); }, d2); await L.calme(c.p, 250);
    const bouton = await c.p.evaluate(() => !!document.querySelector('#calque [data-action="envoyer"]')); v(`${nom} : identité complète : l’aperçu offre « Valider et envoyer »`, bouton, bouton);
    await c.p.evaluate(id => { ACTIONS.envoyer({ dataset:{ id } }); }, d2); await L.calme(c.p, 300);
    const t5 = await toast(c.p), st5 = await c.p.evaluate(id => FACTURES.find(x => x.id === id).st, d2); v(`${nom} : envoyer : partie, toast « Facture envoyée »`, st5 === 'envoyee' && /Facture envoyée/.test(t5), { st5, t5 });
    const n6 = await c.p.evaluate(() => FACTURES.filter(f => f.st === 'avalider' && lignesDe(f).every(l => l.pu != null)).length);
    await c.p.evaluate(() => { ACTIONS.toutValider({}); }); await L.calme(c.p, 300);
    const t6 = await toast(c.p), a6 = await c.p.evaluate(() => FACTURES.filter(f => f.st === 'avalider' && lignesDe(f).every(l => l.pu != null)).length);
    v(`${nom} : toutValider (identité complète) : ${n6} facture(s) partie(s), le toast les COMPTE`, a6 === 0 && new RegExp('^' + n6 + ' facture').test(t6.replace(/\s+/g, ' ')), { n6, a6, t6 });
    // ── 6. nom ou adresse manquants : le même verrou (la liste dit tout ce qui manque)
    await c.p.evaluate(() => { ENTREPRISE.nom = ''; ENTREPRISE.adr = '4 rue du Port'; ENTREPRISE.siret = ''; });
    const M = await c.p.evaluate(() => entrepriseManque().map(m => m.k)); v(`${nom} : nom, adresse (sans code postal) et SIRET manquants : les trois sont dits`, M.join('|') === 'nom|adr|siret', M);
    const msg = await c.p.evaluate(() => entMessageManque(entrepriseManque()).replace(/[  ]/g, ' ')); v(`${nom} : le message liste « {a, b et c} »`, peut ? /Il manque le nom de ton entreprise, ton adresse et ton SIRET sur ta fiche : une facture doit les porter\./.test(msg) : /Il manque le nom de l’entreprise, l’adresse et le SIRET sur la fiche de l’entreprise : demande à Marc/.test(msg), msg);
    // ── 7. devis et contrat : pas bloqués, mais le même message
    if (peut) {
      await c.p.evaluate(() => { dvInit(); const x = DV.find(d => d.e === 'brouillon' && dvComplet(d)) || DV.find(d => dvComplet(d)); dvEnvoyer(x); }); await L.calme(c.p, 300);
      const dp = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { ban:(P.querySelector('.ent-ban') || {}).textContent || '', envoi:!!P.querySelector('[data-pe], [data-action], .btn.large, .actions .btn') } : null; });
      v('devis : le panneau d’envoi prévient (« Le devis peut partir quand même ») et ne bloque pas', !!dp && /Il manque/.test(dp.ban) && /Le devis peut partir quand même/.test(dp.ban.replace(/\s+/g, ' ')) && dp.envoi, dp);
      await L.ranger(c.p);
      const ct = await c.p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => cfMailOk(CLIENTS[x].mail)); BROUILLON.cli = k; BROUILLON.prix = 180; const n = CONTRATS.length; ACTIONS.creerContrat(); return { cree:CONTRATS.length > n, toast:(document.getElementById('toast') || {}).textContent || '' }; });
      v('contrat : créé et envoyé malgré le manque, le toast prévient', ct.cree && /Contrat envoyé/.test(ct.toast) && /Il manque/.test(ct.toast), ct);
    }
    // ── 8. « Comment ça marche » ne promet que ce qui existe
    const cm = await c.p.evaluate(() => { ACTIONS.commentAuto(); const P = document.querySelector('#calque .panneau'); return { t:P.textContent.replace(/\s+/g, ' '), lien:!!P.querySelector('[data-go="entreprise"]') }; });
    v(`${nom} : « Comment ça marche » : ni plafond ni « premier passage » (ils n’existent pas)`, !/plafond|premier passage/i.test(cm.t), cm.t.slice(0, 80));
    v(`${nom} : « Comment ça marche » : les quatre retenues vraies (prix, e-mail, « Je ne peux pas finir », nom/adresse/SIRET) et le lien vers Mon entreprise`, /n’a pas de prix/.test(cm.t) && /pas d’adresse e-mail/.test(cm.t) && /Je ne peux pas finir/.test(cm.t) && /il manque ton nom, ton adresse ou ton SIRET dans Mon entreprise/.test(cm.t) && cm.lien, cm);
    v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await fin();
})();
