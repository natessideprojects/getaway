const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function departureDates(s){
 const last=s.trip==='round'?[s.end,addDays(s.horizon,-s.stay)].sort()[0]:s.end;
 if(last<s.start)return [];
 const span=Math.round((Date.parse(last+'T12:00Z')-Date.parse(s.start+'T12:00Z'))/86400000);
 const count=Math.min(7,span+1);
 return Array.from({length:count},(_,i)=>addDays(s.start,count===1?0:Math.round(i*span/(count-1))));
}
