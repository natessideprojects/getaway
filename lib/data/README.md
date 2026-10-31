# Destination geography

`airport-regions.json` is a compact snapshot downloaded on 2026-10-30 from
[OurAirports public-domain data](https://ourairports.com/data/):

- https://davidmegginson.github.io/ourairports-data/airports.csv
- https://davidmegginson.github.io/ourairports-data/countries.csv

Includes 9,052 three-letter IATA codes for non-closed airports, each mapped to
`[continent, country]`, and 249 countries mapped to `[name, continent]`.
No coordinates, passenger information or credentials are included. Airport
continents take precedence over country geography; country is a fallback when
an airport is unrecognized. Unknown destinations stay in Anywhere results but
are excluded from selected continents, with a visible count. These geographic
conventions follow OurAirports; North America includes Central America and
the Caribbean. Antarctica is not one of the six selectable regions.

SerpApi arrival region IDs are the Wikidata Freebase IDs for Q49, Q18, Q46,
Q15 and Q48, verified on 2026-10-30. Its documentation supports `arrival_area_id`:
https://serpapi.com/google-travel-explore-api
Oceania Q55643 has no Freebase ID in Wikidata, so Oceania is filtered locally.
Travelpayouts regions are always filtered locally on its returned cached fares.
