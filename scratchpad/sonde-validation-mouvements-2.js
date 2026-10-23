/* Sonde de la relecture du 23 octobre 2026 — « Validation des mouvements » :
   1. ficheDemande REFUSÉE : « Refusé par », pas « Validé par » ; validée : « Validé par » ;
   2. la rangée d'une commande en « réception notée » (fiche de box) : le titre ne s'écrase plus (badge retiré),
      mesuré à 360 et 402 px, valeur longue ; et la fenêtre du bon + la liste des bons (autres badges) tiennent ;
   3. le toast de refus cite le libellé exact du droit. */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
(async () => {
  const S = await ouvrir({});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); }; return 1;`);
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.ev(`db.users=(db.users||[]).filter(u=>!/^u-v2-/.test(u.id));
    db.users.push({id:'u-v2-a',prenom:'Justin',nom:'Roux',login:'jr-v2',role:'admin',actif:true,pref:{}},
      {id:'u-v2-t',prenom:'Karim',nom:'Benali',login:'kb-v2',role:'technicien',actif:true,pref:{}});
    db.produits=(db.produits||[]).filter(p=>!/^p-v2-/.test(p.id));
    produitCreer({id:'p-v2-a',nom:'ADVION GEL BLATTES 30G',ref:'ADV30',categorie:'TP18 — Insecticide',unite:'u',qte:0,seuil:2},{semis:true});
    db.boxes=[{id:'bx-v2',nom:'Box Véhicule Nord',numero:'BX-V2-1',stock:{'p-v2-a':{u:10,ctn:0}},userIds:['u-v2-a'],actif:true}];
    db.bons=(db.bons||[]).filter(b=>!/^bn-v2-/.test(b.id));
    db.bons.push({id:'bn-v2-1',numero:'BC-2026-9001',date:todayISO(),fournisseurId:'',fournisseur:'Fournisseur À Nom Très Long SARL',boxId:'bx-v2',statut:'arrivageNote',lignes:[{produitId:'p-v2-a',designation:'ADVION GEL BLATTES 30G',quantite:12,unite:'u'}]});
    db.demandes=(db.demandes||[]).filter(d=>!/^dm-v2-/.test(d.id));
    db.demandes.push({id:'dm-v2-r',num:'DC-9001',boxId:'bx-v2',boxNom:'Box Véhicule Nord',chefId:'u-v2-t',chefNom:'Karim Benali',date:todayISO(),statut:'refuse',drNom:'Justin Roux',motifRefus:'Trop cher',lignes:[{produitId:'p-v2-a',quantite:3}]},
      {id:'dm-v2-v',num:'DC-9002',boxId:'bx-v2',boxNom:'Box Véhicule Nord',chefId:'u-v2-t',chefNom:'Karim Benali',date:todayISO(),statut:'valide',drNom:'Justin Roux',lignes:[{produitId:'p-v2-a',quantite:3}]});
    save(); return 1;`);
  const connecter = async id => S.ev(`try{ closeModal(true); }catch(e){} const u=db.users.find(x=>x.id===${JSON.stringify(id)}); currentUser=u; enterApp(u);
      await new Promise(r=>setTimeout(r,1500)); try{ closeModal(true); }catch(e){} const f=document.getElementById('fdr-banner'); if(f) f.remove(); return 1;`);
  await connecter('u-v2-a');
  const lbl = async id => S.ev(`ficheDemande(${JSON.stringify(id)}); await new Promise(r=>setTimeout(r,500)); const l=[...document.querySelectorAll('.modal .dt-lbl')].map(e=>e.textContent.trim()); closeModal(true); return l;`);
  const r1 = await lbl('dm-v2-r'), r2 = await lbl('dm-v2-v');
  vrai('population : la fiche refusée liste ses libellés', r1.includes('Box concernée') && r1.includes('Motif de refus'), r1);
  vrai('demande REFUSÉE : « Refusé par » et pas « Validé par »', r1.includes('Refusé par') && !r1.includes('Validé par'), r1);
  vrai('demande VALIDÉE : « Validé par »', r2.includes('Validé par') && !r2.includes('Refusé par'), r2);
  for (const w of [360, 402, 1100]) {
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 700 });
    await connecter('u-v2-a');
    const m = await S.ev(`boxView='bx-v2'; go('boxes'); await new Promise(r=>setTimeout(r,800)); try{ openBox('bx-v2'); }catch(e){} await new Promise(r=>setTimeout(r,900));
      const carte=[...document.querySelectorAll('#content .card')].find(c=>/Commande envoyée au fournisseur|Commande prévue/.test(c.textContent));
      if(!carte) return null; const t=[...carte.querySelectorAll('div')].find(e=>/^(Commande envoyée au fournisseur|Commande prévue)$/.test(e.textContent.trim()));
      const r=t.getBoundingClientRect(); const lh=parseFloat(getComputedStyle(t).lineHeight)||19;
      return {large:Math.round(r.width), haut:Math.round(r.height), lignes:Math.round(r.height/lh), badge:!!carte.querySelector('.st'), txt:carte.textContent.replace(/\\s+/g,' ').slice(0,120)};`);
    vrai('population : la rangée de commande « réception notée » existe (' + w + ' px)', !!m, m);
    if (m) { console.log('    · titre : ' + m.large + ' × ' + m.haut + ' px, ' + m.lignes + ' ligne(s)'); vrai('le titre tient sur une ligne et garde sa largeur à ' + w + ' px', m.lignes <= 1 && m.large > 150, m); vrai('plus de badge dans la rangée', !m.badge, m); }
    /* fenêtre du bon et liste des bons : le badge reste, il doit tenir */
    const b = await S.ev(`ficheBon('bn-v2-1',false); await new Promise(r=>setTimeout(r,600));
      const f=document.querySelector('.modal .modal-foot'); const st=f&&f.querySelector('.st'); const sw=document.documentElement.scrollWidth;
      const o=st?(()=>{const r=st.getBoundingClientRect(),fr=f.getBoundingClientRect(); return {l:Math.round(r.left),rr:Math.round(r.right),fl:Math.round(fr.left),fr:Math.round(fr.right),h:Math.round(r.height)};})():null;
      closeModal(true); return {o, deborde: sw>innerWidth+1};`);
    vrai('fenêtre du bon (' + w + ' px) : badge présent, dans la barre de pied, sans défilement latéral', !!b.o && b.o.l >= b.o.fl - 1 && b.o.rr <= b.o.fr + 1 && !b.deborde, b);
    const l = await S.ev(`go('commandes'); await new Promise(r=>setTimeout(r,900));
      const row=document.querySelector('#content .pl-row.lgb'); if(!row) return null; const st=row.querySelector('.st-purple'); const info=row.querySelector('.pl-info');
      const rr=row.getBoundingClientRect(), sr=st.getBoundingClientRect(), ir=info.getBoundingClientRect();
      return {rowL:Math.round(rr.left),rowR:Math.round(rr.right),stL:Math.round(sr.left),stR:Math.round(sr.right),infoW:Math.round(ir.width),infoH:Math.round(ir.height)};`);
    vrai('liste des bons (' + w + ' px) : la ligne existe', !!l, l);
    if (l) { console.log('    · ' + JSON.stringify(l)); vrai('… le badge est dans la rangée et le texte garde ≥ 120 px', l.stL >= l.rowL - 1 && l.stR <= l.rowR + 1 && l.infoW >= 120, l); }
  }
  /* toast de refus d'un technicien */
  await connecter('u-v2-t');
  const toast = await S.ev(`window.__toasts.length=0; try{ validerDemande('dm-v2-r','valide'); }catch(e){} return window.__toasts.slice();`);
  vrai('le refus cite « Valider les mouvements de box et les demandes »', toast.some(x => x.includes('« Valider les mouvements de box et les demandes »')), toast);
  vrai('aucune exception', S.exceptions.length === 0, S.exceptions);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
