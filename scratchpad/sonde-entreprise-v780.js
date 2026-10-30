/* ══ SONDE — LES DOCUMENTS CLIENT AU NOM DE L'ENTREPRISE (v780) ══════════════════════════════
   Justin, 29 octobre 2026 : « nous on n'est pas affichés sur les devis, on est juste la plate-forme ;
   tout ce qui part au client doit être à l'entreprise » — « vérifie que ça marche ».
   Dans la VRAIE page (beta.html de la branche, 127.0.0.1, rien ne sort) : « Ton entreprise » à la
   connexion de l'administrateur, la facture arrêtée sans adresse ni SIRET puis repartie une fois
   l'entreprise complétée (aperçu ET envoi avec PDF joint), le devis qui passe avec un avertissement,
   le logo, et une seconde société (Plomberie Pro 17) avec SON SIRET sur SA facture.
   Usage : SOURCE=/home/user/teamop-v779/beta.html node scratchpad/sonde-entreprise-v780.js [captures] */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const CAP = process.argv[2] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/captures-entreprise';
fs.mkdirSync(CAP, { recursive: true });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };

(async () => {
  const S = await ouvrir({ source: process.env.SOURCE || '/home/user/teamop-v779/beta.html' });
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const capture = async nom => { const r = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); };
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.maybeProfilePhoto=function(){}; window.__docs=[]; window.__mails=[]; window.__toasts=[];
    window.open=function(){ const d={html:''}; window.__docs.push(d); return { document:{ write(x){ d.html+=x; }, close(){} }, focus(){}, print(){}, close(){} }; };
    window.srvMail=async function(to,subject,body,okMsg,cat,box,opts){ window.__mails.push({to,subject,body,opts:opts||null}); return true; };
    const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); try{ return t0.apply(this,arguments); }catch(e){} };
    try{ sessionStorage.removeItem('elanB_ent_plus_tard'); localStorage.setItem('elanB_lang','fr'); }catch(e){}
    db.entreprise={nom:'Clim Ouest'}; db.societes=[]; db.societesStyle={};
    db.clients=(db.clients||[]).filter(c=>c.id!=='cS').concat([{id:'cS',nom:'Restaurant Le Port',email:'contact@leport.fr',adresse:'5 quai Duperré',codePostal:'17000',ville:'La Rochelle'}]);
    db.factures=(db.factures||[]).filter(f=>!/^fS/.test(f.id)).concat([
      {id:'fS1',num:'FA-2026-901',clientId:'cS',date:'2026-10-29',tva:20,statut:'brouillon',rapportModele:'',lignes:[{designation:'Entretien climatisation',qte:1,pu:180}]}]);
    db.devis=(db.devis||[]).filter(d=>!/^dS/.test(d.id)).concat([{id:'dS1',num:'DV-2026-901',clientId:'cS',date:'2026-10-29',tva:20,statut:'brouillon',rapportModele:'',lignes:[{designation:'Pose split',qte:1,pu:1900}]}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uS').concat([{id:'uS',prenom:'Justin',nom:'Sonde',login:'justin-sonde',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uS'); enterApp(currentUser); return 1;`);

  console.log('── 1. à la connexion de l’administrateur ──');
  let vu = false; for (let k = 0; k < 20 && !vu; k++) { await dormir(500); vu = await S.ev(`return !!document.getElementById('ent-completer')`); }
  vrai('« Ton entreprise » s’ouvre seule (entreprise sans adresse ni SIRET)', vu);
  const txt1 = await S.ev(`const m=document.getElementById('ent-completer'); return m?m.closest('.modal,#modal,body').innerText:''`);
  vrai('… elle dit que c’est l’entreprise que le client voit, jamais OP GESTION, et demande nom, logo, adresse, SIRET',
    /jamais OP GESTION/.test(txt1) && /Ajouter ton logo/.test(txt1) && /SIRET/.test(txt1) && /Adresse/.test(txt1), txt1.slice(0, 300));
  await capture('1-ton-entreprise');
  await S.ev(`[...document.querySelectorAll('#ent-completer button')].find(b=>/Plus tard/.test(b.textContent)).click(); return 1;`); await dormir(400);
  vrai('« Plus tard » la ferme pour la séance', await S.ev(`const f=document.getElementById('ent-completer'); return !(f&&f.closest('.open')) && sessionStorage.getItem('elanB_ent_plus_tard')==='1'`));
  await S.ev(`entAccueilCheck(); return 1;`); await dormir(300);
  vrai('… et elle ne revient pas dans la même séance', await S.ev(`const f=document.getElementById('ent-completer'); return !(f&&f.closest('.open'))`));

  console.log('── 2. un devis, entreprise incomplète ──');
  await S.ev(`window.__docs=[]; window.__toasts=[]; printDoc('devis','dS1'); return 1;`); await dormir(300);
  const d2 = await S.ev(`return {n:__docs.length, html:(__docs[0]||{}).html||'', t:__toasts.slice()}`);
  vrai('le devis s’imprime quand même, au nom de « Clim Ouest », sans « OP GESTION »', d2.n === 1 && /Clim Ouest/.test(d2.html) && !/OP GESTION/.test(d2.html), { n: d2.n });
  vrai('… avec un avertissement qui dit quoi compléter', d2.t.some(t => /adresse.*SIRET/.test(t)), d2.t);

  console.log('── 3. une facture, entreprise incomplète ──');
  await S.ev(`window.__docs=[]; closeModal&&closeModal(); printDoc('factures','fS1'); return 1;`); await dormir(400);
  vrai('⛔ la facture NE sort PAS', await S.ev(`return __docs.length===0`));
  const t3 = await S.ev(`const m=document.getElementById('ent-completer'); return m?m.closest('.modal,#modal,body').innerText:''`);
  vrai('… « Ton entreprise » s’ouvre et nomme les mentions obligatoires manquantes', /Avant ta facture, complète l'adresse et le SIRET/.test(t3), t3.slice(0, 200));
  await capture('2-facture-bloquee');
  await S.ev(`const f=document.getElementById('ent-completer'); f.adresse.value='12 rue des Lilas'; f.cp.value='17000'; f.ville.value='La Rochelle'; f.siret.value='1234'; f.requestSubmit(); return 1;`); await dormir(300);
  vrai('un SIRET de 4 chiffres est refusé (et rien n’est enregistré)', await S.ev(`return !db.entreprise.siret && __toasts.some(t=>/14 chiffres/.test(t))`));
  await S.ev(`const c=document.createElement('canvas'); c.width=c.height=120; const x=c.getContext('2d'); x.fillStyle='#0B5CAD'; x.fillRect(0,0,120,120); x.fillStyle='#fff'; x.font='bold 60px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('CO',60,64);
    db.entreprise.logo=c.toDataURL('image/png');
    const f=document.getElementById('ent-completer'); f.siret.value='12345678900017'; f.tvaIntra.value='FR12123456789'; f.iban.value='FR76 3000 4000 0500 0012 3456 789'; f.requestSubmit(); return 1;`);
  await dormir(900);
  const e3 = await S.ev(`return {E:{nom:db.entreprise.nom,adresse:db.entreprise.adresse,siret:db.entreprise.siret,logo:!!db.entreprise.logo}, n:__docs.length, html:(__docs[0]||{}).html||''}`);
  vrai('l’entreprise est enregistrée (nom, adresse, SIRET, logo gardé)', e3.E.adresse === '12 rue des Lilas' && e3.E.siret === '12345678900017' && e3.E.logo, e3.E);
  vrai('… et la facture repart d’elle-même', e3.n === 1);
  vrai('… à son nom, avec son adresse, son SIRET et son logo — sans « OP GESTION »',
    /Clim Ouest/.test(e3.html) && /12 rue des Lilas/.test(e3.html) && /123[\s ]?456[\s ]?789[\s ]?00017|12345678900017/.test(e3.html) && /<img[^>]+src="data:image/.test(e3.html) && !/OP GESTION/.test(e3.html));
  fs.writeFileSync(path.join(CAP, '3-facture.html'), e3.html);

  console.log('── 4. l’envoi par e-mail, PDF joint ──');
  await S.ev(`window.__mails=[]; Promise.resolve(envoiDoc('factures','fS1','email')); return 1;`); await dormir(2500);
  const m4 = await S.ev(`const m=__mails[0]; if(!m) return null; const a=(m.opts&&m.opts.atts||[])[0]; return {to:m.to, brand:m.opts&&m.opts.brandName, body:m.body, pdf:a?atob(a.content):''}`);
  vrai('la facture part au client, avec son PDF joint', !!m4 && m4.to === 'contact@leport.fr' && /^%PDF/.test(m4.pdf), m4 && { to: m4.to, pdf: (m4.pdf || '').slice(0, 8) });
  vrai('… le PDF porte « Clim Ouest » et son SIRET, jamais « OP GESTION »', !!m4 && /Clim Ouest/.test(m4.pdf) && /12345678900017|123 456 789 00017/.test(m4.pdf) && !/OP GESTION/.test(m4.pdf + m4.body));
  if (m4 && m4.pdf) fs.writeFileSync(path.join(CAP, '4-facture.pdf'), Buffer.from(m4.pdf, 'latin1'));

  console.log('── 5. une seconde société, avec SON SIRET ──');
  await S.ev(`const c=document.createElement('canvas'); c.width=c.height=120; const x=c.getContext('2d'); x.fillStyle='#C0392B'; x.fillRect(0,0,120,120); x.fillStyle='#fff'; x.font='bold 60px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText('P',60,64);
    db.societes=['Plomberie Pro 17']; db.societesStyle={'Plomberie Pro 17':{couleur:'#C0392B',logo:c.toDataURL('image/png'),raison:'Plomberie Pro 17 SARL',siret:'98765432100011',adresse:'8 av. de Rochefort',cp:'17300',ville:'Rochefort',tel:'05 46 99 99 99'}};
    db.factures.push({id:'fS2',num:'FA-2026-902',clientId:'cS',date:'2026-10-29',tva:10,statut:'brouillon',rapportModele:'Plomberie Pro 17',lignes:[{designation:'Recherche de fuite',qte:1,pu:240}]});
    save(); window.__docs=[]; printDoc('factures','fS2'); return 1;`); await dormir(400);
  const h5 = await S.ev(`return (__docs[0]||{}).html||''`);
  vrai('sa facture porte SON nom, SON SIRET, SON adresse et SON logo', /Plomberie Pro 17/.test(h5) && /98765432100011|987 654 321 00011/.test(h5) && /Rochefort/.test(h5) && /<img[^>]+src="data:image/.test(h5));
  vrai('… et rien de « Clim Ouest » (ni son SIRET, ni son adresse) ni d’« OP GESTION »', !/12345678900017|12 rue des Lilas|Clim Ouest|OP GESTION/.test(h5));
  fs.writeFileSync(path.join(CAP, '5-facture-plomberie.html'), h5);

  vrai('aucune erreur JavaScript pendant tout le parcours', !S.exceptions.length, S.exceptions.slice(0, 3));
  console.log(`\n════ sonde-entreprise-v780 : ${ok} ✓ ${ko} ✗ ════`);
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
