const COUNTRY_ALIASES = {
  india: ['IN', 'India'],
  'united states': ['US', 'United States'],
  usa: ['US', 'United States'],
  us: ['US', 'United States'],
  'united kingdom': ['GB', 'United Kingdom'],
  uk: ['GB', 'United Kingdom'],
  britain: ['GB', 'United Kingdom'],
  japan: ['JP', 'Japan'],
  canada: ['CA', 'Canada'],
  australia: ['AU', 'Australia'],
  germany: ['DE', 'Germany'],
  france: ['FR', 'France'],
  singapore: ['SG', 'Singapore'],
  brazil: ['BR', 'Brazil'],
  italy: ['IT', 'Italy'],
  spain: ['ES', 'Spain'],
  mexico: ['MX', 'Mexico'],
  netherlands: ['NL', 'Netherlands'],
  switzerland: ['CH', 'Switzerland'],
};

function rootOf(searchData) {
  if (Array.isArray(searchData)) return searchData[0] || null;
  return searchData || null;
}

export function normalizeSearchData(searchData) {
  const root = rootOf(searchData);
  return root || {};
}

function findLocationEntity(root) {
  return (root?.entities || []).find(
    (entity) => entity?.collectionType === 'HD_LOCATION' || entity?.entityType === 'LOCATION'
  );
}

function fromEntity(entity) {
  if (!entity?.entityInfo) return null;
  const geo = entity.entityInfo.geo;
  const countryCode = geo?.countryCode || entity.entityInfo.countryCode || entity.entityInfo.Country;
  const countryName = geo?.country || entity.entityInfo.country || entity.entityInfo.hdLabel;
  if (!countryCode && !countryName) return null;
  return {
    countryCode: countryCode ? String(countryCode).toUpperCase() : null,
    countryName: countryName || countryCode,
    resolved: Boolean(countryCode || countryName),
    source: 'entity',
  };
}

function fromUserLocation(root) {
  const position = root?.userLocation?.position;
  const code = position?.countryCode;
  const name = position?.country;
  if (!code && !name) return null;
  return {
    countryCode: code ? String(code).toUpperCase() : null,
    countryName: name || code,
    resolved: Boolean(code || name),
    source: 'user-location',
  };
}

function fromQuery(query) {
  const lower = String(query || '').toLowerCase();
  for (const [alias, [code, name]] of Object.entries(COUNTRY_ALIASES)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) {
      return { countryCode: code, countryName: name, resolved: true, source: 'query-fallback' };
    }
  }
  return null;
}

export function parseHyperDartSearchData(searchData) {
  const root = normalizeSearchData(searchData);
  const rawQuery = root.query || root.queryTerm || '';
  const entity = fromEntity(findLocationEntity(root));
  if (entity?.countryCode) return { rawQuery, ...entity };
  const userLocation = fromUserLocation(root);
  if (userLocation?.countryCode) return { rawQuery, ...userLocation };
  const fallback = fromQuery(rawQuery);
  return fallback ? { rawQuery, ...fallback } : { rawQuery, countryCode: null, countryName: null, resolved: false, source: 'none' };
}

export function getRawQuery(searchData, fallback = '') {
  return parseHyperDartSearchData(searchData).rawQuery || fallback;
}

export function resolveCountry(searchData, query = '') {
  const parsed = parseHyperDartSearchData(searchData);
  if (parsed.countryCode) return { countryCode: parsed.countryCode, countryName: parsed.countryName };
  const fallback = fromQuery(query);
  return fallback ? { countryCode: fallback.countryCode, countryName: fallback.countryName } : null;
}
