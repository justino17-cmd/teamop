// Choisir une palette de techniciens aux couleurs VRAIMENT distinctes (CIEDE2000), en gardant les 7 premières d'aujourd'hui.
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);}
function lab(h){let [r,g,b]=rgb(h);const f=c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);r=f(r);g=f(g);b=f(b);
 let X=(r*0.4124+g*0.3576+b*0.1805)/0.95047,Y=(r*0.2126+g*0.7152+b*0.0722),Z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;
 const t=v=>v>0.008856?Math.cbrt(v):(7.787*v+16/116);return [116*t(Y)-16,500*(t(X)-t(Y)),200*(t(Y)-t(Z))];}
function de00(a,b){const [L1,a1,b1]=a,[L2,a2,b2]=b,rad=Math.PI/180;const C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cb=(C1+C2)/2;
 const G=0.5*(1-Math.sqrt(Math.pow(Cb,7)/(Math.pow(Cb,7)+Math.pow(25,7))));const a1p=(1+G)*a1,a2p=(1+G)*a2;
 const C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);const h=(x,y)=>{let v=Math.atan2(y,x)/rad;return v<0?v+360:v;};
 const h1p=h(a1p,b1),h2p=h(a2p,b2);const dLp=L2-L1,dCp=C2p-C1p;let dhp=h2p-h1p;if(C1p*C2p===0)dhp=0;else if(dhp>180)dhp-=360;else if(dhp<-180)dhp+=360;
 const dHp=2*Math.sqrt(C1p*C2p)*Math.sin(dhp*rad/2);const Lbp=(L1+L2)/2,Cbp=(C1p+C2p)/2;let hbp=h1p+h2p;
 if(C1p*C2p!==0){if(Math.abs(h1p-h2p)>180)hbp=(h1p+h2p<360)?(h1p+h2p+360)/2:(h1p+h2p-360)/2;else hbp=(h1p+h2p)/2;}
 const T=1-0.17*Math.cos((hbp-30)*rad)+0.24*Math.cos(2*hbp*rad)+0.32*Math.cos((3*hbp+6)*rad)-0.20*Math.cos((4*hbp-63)*rad);
 const dth=30*Math.exp(-Math.pow((hbp-275)/25,2));const RC=2*Math.sqrt(Math.pow(Cbp,7)/(Math.pow(Cbp,7)+Math.pow(25,7)));
 const SL=1+0.015*Math.pow(Lbp-50,2)/Math.sqrt(20+Math.pow(Lbp-50,2)),SC=1+0.045*Cbp,SH=1+0.015*Cbp*T,RT=-Math.sin(2*dth*rad)*RC;
 return Math.sqrt(Math.pow(dLp/SL,2)+Math.pow(dCp/SC,2)+Math.pow(dHp/SH,2)+RT*(dCp/SC)*(dHp/SH));}
const lum=h=>{const c=rgb(h).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const NA='#E8A33D';
const FIXES=['#1E7A4E','#2563EB','#7C3AED','#EA580C','#DC2626','#0891B2','#DB2777'];
const CAND=['#65A30D','#4D7C0F','#1E3A8A','#312E81','#4338CA','#C026D3','#A21CAF','#86198F','#92400E','#78350F','#0F766E','#115E59','#475569','#334155','#BE123C','#9F1239','#0369A1','#0284C7','#16A34A','#B45309','#6B21A8','#9D174D','#854D0E','#3F6212','#0E7490','#F43F5E','#8B5CF6','#14B8A6','#D946EF','#57534E','#E11D48','#7E22CE','#1D4ED8','#CA8A04','#A16207','#059669','#4F46E5','#9333EA','#C2410C','#B91C1C'];
const L=h=>lab(h);
let pal=FIXES.slice();
const minD=(h,set)=>Math.min(...set.map(x=>de00(L(h),L(x))));
while(pal.length<16){let best=null,bd=-1;for(const c of CAND){if(pal.includes(c))continue;const d=Math.min(minD(c,pal),de00(L(c),L(NA)));if(d>bd){bd=d;best=c;}}pal.push(best);}
console.log('palette :',JSON.stringify(pal));
for(let n=8;n<=16;n++){const s=pal.slice(0,n);let m=1e9,pr='';for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=de00(L(s[i]),L(s[j]));if(d<m){m=d;pr=s[i]+'~'+s[j];}}console.log(n+' couleurs : écart minimal ΔE00 '+m.toFixed(1)+' ('+pr+')');}
console.log('écart minimal au « Non assigné » :',Math.min(...pal.map(c=>de00(L(c),L(NA)))).toFixed(1));
console.log('contraste max (blanc ou encre #1d1d1f) :',pal.map(c=>c+' '+Math.max(cr(c,'#FFFFFF'),cr(c,'#1D1D1F')).toFixed(2)).join('  '));
console.log('contraste contre fond jour #F2F2F7 et nuit #1C1C1E :',pal.map(c=>c+' '+cr(c,'#F2F2F7').toFixed(1)+'/'+cr(c,'#1C1C1E').toFixed(1)).join('  '));
// ancienne palette pour comparaison
const OLD=["#1E7A4E","#2563EB","#7C3AED","#EA580C","#DC2626","#0891B2","#CA8A04","#DB2777","#15803D","#1D4ED8","#6D28D9","#C2410C","#B91C1C","#0E7490","#A16207","#BE185D"];
let m=1e9,pr='';for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){const d=de00(L(OLD[i]),L(OLD[j]));if(d<m){m=d;pr=OLD[i]+'~'+OLD[j];}}console.log('ancienne palette : écart minimal ΔE00 '+m.toFixed(1)+' ('+pr+')');

// ── Seconde passe : des candidats à MI-TON (lisibles en rond sur une carte blanche ET sur une carte de nuit) ──
function hsl2hex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
 return '#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('').toUpperCase();}
const CARTE_JOUR='#FFFFFF', CARTE_NUIT='#2C2C2E';
const cands=[];
for(let h=0;h<360;h+=4)for(const s of [45,60,75,90]){
  // luminance visée ~0.20 : on cherche la clarté par dichotomie
  let lo=5,hi=95;for(let k=0;k<30;k++){const m=(lo+hi)/2;if(lum(hsl2hex(h,s,m))<0.20)lo=m;else hi=m;}
  const c=hsl2hex(h,s,(lo+hi)/2); if(cr(c,CARTE_JOUR)>=3&&cr(c,CARTE_NUIT)>=2.6) cands.push(c);}
let pal2=FIXES.slice();
while(pal2.length<16){let best=null,bd=-1;for(const c of cands){if(pal2.includes(c))continue;const d=Math.min(minD(c,pal2),de00(L(c),L(NA)));if(d>bd){bd=d;best=c;}}pal2.push(best);}
console.log('\npalette à mi-ton :',JSON.stringify(pal2));
for(const n of [8,10,12,14,16]){const s=pal2.slice(0,n);let m=1e9,pr='';for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=de00(L(s[i]),L(s[j]));if(d<m){m=d;pr=s[i]+'~'+s[j];}}console.log(n+' couleurs : écart minimal ΔE00 '+m.toFixed(1)+' ('+pr+')');}
console.log('au « Non assigné » :',Math.min(...pal2.map(c=>de00(L(c),L(NA)))).toFixed(1));
console.log(pal2.map(c=>c+' jour '+cr(c,CARTE_JOUR).toFixed(1)+' nuit '+cr(c,CARTE_NUIT).toFixed(1)+' encre '+Math.max(cr(c,'#FFFFFF'),cr(c,'#1D1D1F')).toFixed(1)).join('\n'));
