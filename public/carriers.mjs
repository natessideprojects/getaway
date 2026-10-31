// Common carrier names for entry/display only, not a claim of routes at an airport.
export const carriers=[
 ['AA','American Airlines'],['DL','Delta'],['UA','United'],['WN','Southwest'],
 ['F9','Frontier'],['NK','Spirit'],['B6','JetBlue'],['AS','Alaska Airlines'],
 ['AC','Air Canada'],['WS','WestJet'],['BA','British Airways'],['AF','Air France'],
 ['KL','KLM'],['LH','Lufthansa'],['IB','Iberia'],['EI','Aer Lingus'],
 ['VS','Virgin Atlantic'],['TK','Turkish Airlines'],['EK','Emirates'],['QR','Qatar Airways'],
 ['SQ','Singapore Airlines'],['NH','ANA'],['JL','Japan Airlines'],['QF','Qantas']
].map(([code,name])=>({code,name}));
export function carrierName(code){return carriers.find(c=>c.code===code)?.name||code;}
