/* Sonde de la PAGE DE COMMANDE (28 octobre 2026) — le configurateur (la formule déduite des cases) et le simulateur (« Voir mon application »).
   ⛔ 127.0.0.1 seulement : la page est servie par un petit serveur statique, ses appels `/api/…` vont au VRAI serveur du dépôt lancé isolément
   (config et données jetables) — jamais api.teamop.fr, jamais app.html (CLAUDE.md : le navigateur piloté ne voit que le site et la démonstration).
   Prouve, téléphone ET bureau, jour ET nuit :
     · la formule SUIT les cases : décocher les rubriques Business → Pro 15 € ; cocher Stock → Business 25 € (et Pro devient inatteignable) ; cocher « Ma couleur
       d'entreprise » → Business Premium 50 € ; décocher → on redescend. La population est comptée avant de croire un zéro ;
     · un lien de formule (?formule=pro) n'est jamais baissé en silence : si les cases appellent Business, la page le DIT (« Vous aviez choisi Pro ») ;
     · le simulateur : rien n'est chargé avant le clic (demo.html pèse plus de 4 Mo), puis le cadre s'ouvre avec EXACTEMENT les rubriques cochées et la formule ;
       décocher une rubrique recharge le cadre avec la liste neuve ;
     · le cadre ne range rien : la base que le visiteur a faite dans la démonstration n'est ni écrasée ni remplacée, et la démonstration seule (sans paramètre)
       remet les rubriques à « tout ouvert » ;
     · aucune requête hors 127.0.0.1 ; aucune exception ; aucun défilement latéral (mesuré APRÈS deux trames et une lecture forcée, deux fois).
   Usage : node scratchpad/commande/sonde-commande.js      (captures dans $SONDE_SORTIE, défaut /tmp)                                                               */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const { ouvrir, dormir, RACINE } = require('../demo/lib.js');
const SORTIE = process.env.SONDE_SORTIE || os.tmpdir();
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

async function serveurApi() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-cmd-')), data = path.join(dir, 'data'); fs.mkdirSync(data);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')), vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'sonde', adminPassHash: crypto.createHash('sha256').update('x').digest('hex') }));
  const port = await portLibre();
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(dir, 'config.json'), TEAMOP_DATA: data, PORT: String(port) }), stdio: ['ignore', 'ignore', 'ignore'] });
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + port + '/health')).ok) break; } catch (e) { /* pas encore */ } }
  return { port, fermer: () => { try { enfant.kill('SIGKILL'); } catch (e) { /* idem */ } try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* idem */ } } };
}

/* un double-rAF + une lecture forcée, DEUX fois (CLAUDE.md : un débordement se confirme à la seconde lecture) */
const DEBORD = `const att=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{void document.body.offsetWidth;r();})));
  await att(); const a=document.documentElement.scrollWidth-innerWidth; await new Promise(r=>setTimeout(r,700)); await att(); const b=document.documentElement.scrollWidth-innerWidth;
  const barre=document.documentElement.scrollHeight>innerHeight; return {a,b,barre};`;

(async () => {
  const API = await serveurApi();
  const S = await ouvrir({ page: 'recap-abonnement.html', proxyApi: API.port });
  try {
    const ref = await (await fetch('http://127.0.0.1:' + API.port + '/api/metiers')).json();
    const PLANS = Object.fromEntries(Object.entries(ref.rubriques).map(([k, r]) => [k, r.plan]));
    vrai('(population) le serveur sert le plan de chaque rubrique cochable : ' + Object.keys(PLANS).length + ' rubriques, dont ' + Object.values(PLANS).filter(p => p === 'business').length + ' Business',
      Object.keys(PLANS).length === 38 && Object.values(PLANS).filter(p => p === 'business').length === 16);

    for (const [nomProfil, L, H, mobile, theme] of [['téléphone, jour', 390, 844, true, 'light'], ['téléphone, nuit', 390, 844, true, 'dark'], ['bureau, jour', 1280, 900, false, 'light'], ['bureau, nuit', 1280, 900, false, 'dark']]) {
      console.log('\n══ ' + nomProfil + ' ══');
      await S.profil(L, H, mobile, theme);
      await S.goto('/recap-abonnement.html?composer=1&metier=plomberie');
      const vues0 = S.reseau.length;   // les requêtes d'AVANT cette page (le profil précédent a ouvert le cadre) ne comptent pas
      vrai('la grille des rubriques est là (population)', await S.attendre('document.querySelectorAll("#rubriquesAbo input[data-rub]").length>20', 20000));
      const etat = () => S.ev(`const coches=[...document.querySelectorAll('#rubriquesAbo input[data-rub]:checked')].map(i=>i.getAttribute('data-rub'));
        const act=document.querySelector('.puce-formule.active'); const off=[...document.querySelectorAll('.puce-formule[disabled]')].map(b=>b.dataset.formule);
        const ded=document.getElementById('deduction'); return {coches,actif:act&&act.dataset.formule,off,ded:ded?ded.textContent:'',prix:(document.querySelector('.prix-grand')||{}).textContent||'',
          fonctions:[...document.querySelectorAll('input[data-fonction]:checked')].map(i=>i.getAttribute('data-fonction')),nbFonctions:document.querySelectorAll('input[data-fonction]').length}`);
      const attendu = (coches, fonctions) => { let f = 0; const r = ['pro', 'business', 'premium']; coches.forEach(k => { f = Math.max(f, r.indexOf(PLANS[k] || 'pro')); }); (fonctions || []).forEach(k => { f = Math.max(f, k === 'logo' ? 1 : 2); }); return r[f]; };
      let e = await etat();
      vrai('(population) des rubriques cochées par le conseil du métier : ' + e.coches.length + ', quatre fonctions de l\'entreprise offertes : ' + e.nbFonctions, e.coches.length >= 8 && e.nbFonctions === 4, e);
      vrai('la formule affichée est celle que les cases appellent (' + attendu(e.coches) + ')', e.actif === attendu(e.coches), [e.actif, attendu(e.coches)]);

      /* tout ce qui est Business se décoche : Pro à 15 € */
      for (const k of e.coches.filter(k => PLANS[k] === 'business')) await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="${k}"]').click(); return 1;`);
      await dormir(300); e = await etat();
      vrai('plus aucune rubrique Business cochée → Pro, 15 €, et la phrase le dit', e.actif === 'pro' && /15/.test(e.prix) && /Formule Pro/.test(e.ded) && e.off.length === 0, e);
      /* Stock */
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('« Stock » coché → Business, 25 €, « parce que vous avez coché Stock », Pro n\'est plus permis', e.actif === 'business' && /25/.test(e.prix) && /parce que vous avez coché Stock/.test(e.ded) && e.off.join() === 'pro', e);
      vrai('   … le clavier n\'a pas perdu sa place (la case touchée garde le focus)', await S.ev(`return document.activeElement && document.activeElement.getAttribute('data-rub')==='stock'`));
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="bons"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('   … avec « Bons de commande » : les deux raisons sont dites', /Stock et Bons de commande/.test(e.ded), e.ded);
      /* la couleur d'entreprise */
      await S.ev(`document.querySelector('input[data-fonction="couleur"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('« Ma couleur d\'entreprise » cochée → Business Premium, 50 €, Pro et Business inatteignables', e.actif === 'premium' && /50/.test(e.prix) && e.off.join() === 'pro,business' && /couleur/.test(e.ded), e);
      await S.ev(`document.querySelector('input[data-fonction="couleur"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('   … décochée, on REDESCEND à Business (la formule suit les cases)', e.actif === 'business' && /25/.test(e.prix), e);
      /* le logo : Business */
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); document.querySelector('#rubriquesAbo input[data-rub="bons"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('   … sans Stock ni Bons : Pro de nouveau', e.actif === 'pro', e);
      await S.ev(`document.querySelector('input[data-fonction="logo"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('« Mon logo » coché → Business', e.actif === 'business' && e.fonctions.join() === 'logo', e);
      await S.ev(`document.querySelector('input[data-fonction="logo"]').click(); return 1;`); await dormir(300);
      /* un clic sur une formule au-dessus : permis, et il tient quand on décoche */
      await S.ev(`document.querySelector('.puce-formule[data-formule="premium"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('un clic sur Business Premium (au-dessus du minimum) est permis', e.actif === 'premium', e);
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('   … et cocher Stock ne le baisse PAS (une formule voulue ne descend pas)', e.actif === 'premium', e);
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); document.querySelector('.puce-formule[data-formule="pro"]').click(); return 1;`); await dormir(300); e = await etat();
      vrai('   … redescendre à Pro est permis tant que les cases le permettent', e.actif === 'pro', e);

      /* le corps de paiement : strictement ce qui partait déjà (price, quantity, metier, cats) */
      const corps = await S.ev(`return {choix: typeof choixPaiement==='function'?choixPaiement():null, prix:(STRIPE_PRICES[formuleActive]||{}).mensuel}`);
      vrai('le paiement n\'envoie que le métier et les rubriques (aucune formule déduite, aucune fonction)', corps.choix && Object.keys(corps.choix).sort().join() === 'cats,metier' && /^price_/.test(corps.prix || ''), corps);

      /* le simulateur */
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); return 1;`); await dormir(300);
      const avantClic = await S.ev(`return {section:!document.getElementById('carteSimulateur').hidden, cadre:!!document.getElementById('simCadre'), bouton:!!document.getElementById('simLancer')}`);
      vrai('le simulateur est là mais RIEN n\'est chargé avant le clic (aucun cadre)', avantClic.section && !avantClic.cadre && avantClic.bouton, avantClic);
      vrai('   … et aucune requête vers demo.html n\'est partie', !S.reseau.slice(vues0).some(u => /demo\.html/.test(u)));
      await S.ev(`document.getElementById('simLancer').click(); return 1;`);
      vrai('un clic ouvre le cadre', await S.attendre('document.getElementById("simCadre")&&document.getElementById("simCadre").contentWindow&&document.getElementById("simCadre").contentWindow.document.getElementById("content")&&document.getElementById("simCadre").contentWindow.document.getElementById("content").children.length>0', 60000));
      const dedans = await S.ev(`const f=document.getElementById('simCadre'), w=f.contentWindow; const coches=[...document.querySelectorAll('#rubriquesAbo input[data-rub]:checked')].map(i=>i.getAttribute('data-rub')).sort();
        const ap=JSON.parse(w.eval('JSON.stringify({cats:catsListe(),forfait:forfait(),metier:db.metier})'));   // l'évaluation DANS le cadre : \`db\` est une déclaration lexicale, pas une propriété de window
        return {src:f.getAttribute('src'), cats:ap.cats, forfait:ap.forfait, coches, metier:ap.metier, bandeau:!!w.document.getElementById('demo-bandeau'), sim:w.__demoSimulateur}`);
      vrai('le cadre porte le métier, les rubriques cochées et la formule : ' + dedans.src, /sim=1/.test(dedans.src) && /metier=plomberie/.test(dedans.src) && /formule=business/.test(dedans.src) && dedans.metier === 'plomberie' && dedans.forfait === 'business', dedans);
      vrai('   … le menu de l\'application ne montre QUE les rubriques cochées (' + dedans.coches.length + ')', JSON.stringify((dedans.cats || []).slice().sort()) === JSON.stringify(dedans.coches) && dedans.coches.length > 5, [dedans.cats, dedans.coches]);
      vrai('   … sans le bandeau « Recommencer / Changer de métier » (il effacerait l\'appareil)', dedans.bandeau === false && dedans.sim === true);
      const nav = await S.ev(`const w=document.getElementById('simCadre').contentWindow; return [...w.document.querySelectorAll('#sidebar .nav-item, #nav .nav-item, .nav-item')].filter(n=>n.offsetParent!==null).length`);
      console.log('   (éléments de menu visibles dans le cadre : ' + nav + ')');

      /* décocher une rubrique recharge le cadre avec la liste neuve */
      await S.ev(`document.querySelector('#rubriquesAbo input[data-rub="stock"]').click(); return 1;`);
      vrai('décocher « Stock » recharge le cadre : la liste du menu perd « stock » et la formule redescend', await S.attendre(`(function(){const w=document.getElementById('simCadre').contentWindow; try{const a=JSON.parse(w.eval('JSON.stringify({c:catsListe(),f:forfait()})')); return a.c&&a.c.indexOf('stock')<0&&a.f==='pro'}catch(e){return false}})()`, 40000));
      /* appareil : bureau/téléphone, sans défilement latéral */
      for (const ap of ['bureau', 'tel']) {
        await S.ev(`document.querySelector('[data-sim="${ap}"]').click(); return 1;`); await dormir(500);
        const g = await S.ev(`const b=document.getElementById('simBoite').getBoundingClientRect(), sc=document.getElementById('simScene').getBoundingClientRect(); return {cls:document.getElementById('simBoite').className, l:Math.round(b.width), sc:Math.round(sc.width), pressed:document.querySelector('[data-sim="${ap}"]').getAttribute('aria-pressed')}`);
        vrai('l\'appareil « ' + ap + ' » : le cadre tient dans la page (' + g.l + ' px dans ' + g.sc + ')', g.cls.indexOf(ap) >= 0 && g.l <= g.sc && g.pressed === 'true', g);
        const d = await S.ev(DEBORD);
        vrai('   … aucun défilement latéral (deux lectures : ' + d.a + ' puis ' + d.b + ' ; la barre verticale est présente : ' + d.barre + ')', d.b <= 0, d);
      }
      await S.snap(path.join(SORTIE, 'commande-' + nomProfil.replace(/[ ,]+/g, '-') + '.png'));
      vrai('aucune exception JavaScript, aucune requête hors 127.0.0.1 (' + S.reseau.length + ' vues)', S.exceptions.length === 0 && S.exterieur.length === 0, [S.exceptions.slice(0, 3), S.exterieur.slice(0, 3)]);
    }

    /* un lien de formule n'est pas baissé en silence */
    console.log('\n══ ?formule=pro ══');
    await S.profil(390, 844, true, 'light');
    await S.goto('/recap-abonnement.html?formule=pro&metier=3d');
    await S.attendre('document.querySelectorAll("#rubriquesAbo input[data-rub]").length>20', 20000);
    const p = await S.ev(`const act=document.querySelector('.puce-formule.active'); const ded=document.getElementById('deduction'); return {actif:act&&act.dataset.formule, ded:ded?ded.textContent:''}`);
    vrai('un lien « Pro » avec des cases Business : la page passe à Business ET le dit (« Vous aviez choisi Pro »)', p.actif === 'business' && /Vous aviez choisi Pro/.test(p.ded), p);

    /* le cadre ne range rien ; la démonstration seule remet tout à zéro */
    console.log('\n══ le simulateur ne range rien, la démonstration seule se remet à zéro ══');
    await S.profil(1280, 900, false, 'light');
    await S.goto('/demo.html?metier=nettoyage');
    await S.attendre('window.db&&db.demoPublique&&db.demoPublique.metier==="nettoyage"&&document.getElementById("content")&&document.getElementById("content").children.length>0', 60000);
    await S.ev(`db.marqueDuVisiteur='essai-3133'; save(); return 1;`);
    const rangement0 = await S.ev(`return {base:(localStorage.getItem('elanD_gestion_v2')||'').indexOf('essai-3133')>0, etat:localStorage.getItem('elanD_demo_etat')}`);
    vrai('(population) le visiteur a fait un essai dans la démonstration (rangé, métier nettoyage)', rangement0.base && /nettoyage/.test(rangement0.etat || ''), rangement0);
    await S.goto('/recap-abonnement.html?composer=1&metier=plomberie');
    await S.attendre('document.querySelectorAll("#rubriquesAbo input[data-rub]").length>20', 20000);
    await S.ev(`document.getElementById('simLancer').click(); return 1;`);
    await S.attendre('(function(){try{return document.getElementById("simCadre").contentWindow.eval("db.metier")}catch(e){return ""}})()==="plomberie"', 60000);
    await dormir(800);
    const apres = await S.ev(`return {base:(localStorage.getItem('elanD_gestion_v2')||'').indexOf('essai-3133')>0, etat:localStorage.getItem('elanD_demo_etat'), cats:localStorage.getItem('elanD_cats')}`);
    vrai('⛔ le cadre du simulateur n\'a RIEN écrasé : l\'essai du visiteur est toujours rangé, son métier aussi', apres.base && /nettoyage/.test(apres.etat || '') && !/plomberie/.test(apres.etat || ''), apres);
    await S.goto('/demo.html');
    await S.attendre('window.db&&db.demoPublique&&document.getElementById("content")&&document.getElementById("content").children.length>0', 60000);
    const seule = await S.ev(`return {metier:db.demoPublique&&db.demoPublique.metier, marque:db.marqueDuVisiteur, cats:catsListe(), forfait:forfait(), bandeau:!!document.getElementById('demo-bandeau')}`);
    vrai('⛔ la démonstration seule retrouve l\'essai du visiteur, TOUTES les rubriques (cats remis à zéro) et son bandeau', seule.metier === 'nettoyage' && seule.marque === 'essai-3133' && seule.cats === null && seule.bandeau === true, seule);
    vrai('aucune exception, rien hors 127.0.0.1 sur tout le parcours', S.exceptions.length === 0 && S.exterieur.length === 0, [S.exceptions.slice(0, 3), S.exterieur.slice(0, 3)]);
  } finally { S.fermer(); API.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
