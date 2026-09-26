// Contraste des avatars teintés (.avatar.av-tc) : fond = mix(tc 24 %, --card), encre = mix(tc p %, --t1),
// dans les quatre combinaisons du thème final. color-mix(in srgb) = interpolation composante par composante.
const P=['#1E7A4E','#2563EB','#7C3AED','#EA580C','#DC2626','#0891B2','#DB2777','#7B6012','#889C16','#A987C5','#C38581','#3EA394','#885741','#18AA52','#E234E2','#35686E'];
const N=['Vert','Bleu','Violet','Orange','Rouge','Cyan','Rose','Bronze','Olive','Lavande','Vieux rose','Menthe','Brun','Vert vif','Fuchsia','Pétrole'];
const T={ 'TEAM OP jour':{card:'#FFFFFF',t1:'#0B1426'}, 'TEAM OP nuit':{card:'#1A2640',t1:'#F0F3F8'},
          'OP GESTION jour':{card:'#FFFFFF',t1:'#0B3B2E'}, 'OP GESTION nuit':{card:'#104A3A',t1:'#E4EFEA'} };
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,p)=>{ const A=rgb(a),B=rgb(b); return A.map((x,i)=>Math.round(x*p/100+B[i]*(100-p)/100)); };
const lum=c=>{ const s=c.map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*s[0]+.7152*s[1]+.0722*s[2]; };
const cr=(a,b)=>{ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
for(const [nom,t] of Object.entries(T)){
  const ligne=[]; for(const p of [55,45,40,35,30,25,20]){ let min=99,pire=''; P.forEach((c,i)=>{ const k=cr(mix(c,t.card,24),mix(c,t.t1,p)); if(k<min){min=k;pire=N[i];} }); ligne.push(`${p}%→${min.toFixed(2)} (${pire})`); }
  console.log(nom.padEnd(16)+' '+ligne.join('  '));
}
