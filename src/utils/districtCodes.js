// Two-way table between a district's name (city and district together, as in
// 臺北市大安區) and the segment that stands for it in a shared link.
// The segment is the district's usual first three zipcode digits. Where two
// districts share one, both keep their full name, which is also always
// accepted when reading a link so a code that turns ambiguous after a data
// update still resolves.
export function buildDistrictCodes(database) {
  const primary = new Map();
  for (const [city, { areas }] of Object.entries(database)) {
    for (const [area, { roads }] of Object.entries(areas)) {
      const counts = new Map();
      for (const road of Object.values(roads)) {
        for (const { zipcode } of road.scopes) {
          const prefix = String(zipcode).padStart(6, '0').slice(0, 3);
          counts.set(prefix, (counts.get(prefix) || 0) + 1);
        }
      }
      const [prefix] = [...counts].sort((a, b) => b[1] - a[1])[0] || [];
      primary.set(`${city}${area}`, prefix);
    }
  }

  const sharing = new Map();
  for (const prefix of primary.values()) sharing.set(prefix, (sharing.get(prefix) || 0) + 1);

  const segments = new Map();
  const districts = new Map();
  for (const [district, prefix] of primary) {
    const segment = prefix && sharing.get(prefix) === 1 ? prefix : district;
    segments.set(district, segment);
    districts.set(segment, district);
    districts.set(district, district);
  }

  return {
    segmentOf: (district) => segments.get(district) ?? null,
    districtOf: (segment) => districts.get(segment) ?? null,
  };
}
