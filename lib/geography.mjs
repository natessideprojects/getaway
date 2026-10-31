import data from './data/airport-regions.json' with {type:'json'};
// Airport geography wins over a suggested attraction's country. This keeps the
// region tied to the actual arrival airport, including cross-border suggestions.
const countriesByName=new Map(Object.entries(data.countries).map(([code,[name,region]])=>[name.toLowerCase(),{countryCode:code,country:name,destinationRegion:region}]));
export function destinationGeography(offer){
 const airport=data.airports[String(offer.destination||'').toUpperCase()];
 if(airport)return {countryCode:airport[1],country:data.countries[airport[1]]?.[0],destinationRegion:airport[0]};
 const country=String(offer.country||'').trim();
 if(data.countries[country.toUpperCase()]){const [name,region]=data.countries[country.toUpperCase()];return {countryCode:country.toUpperCase(),country:name,destinationRegion:region};}
 return countriesByName.get(country.toLowerCase())||{destinationRegion:null};
}
