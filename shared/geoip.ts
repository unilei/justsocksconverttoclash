import { COUNTRY_NAMES, getCountryName } from './types';

const geoCache = new Map<string, string>();
const TIMEOUT = 8000;

async function queryCountryIs(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.country.is/${server}`)}`
      : `https://api.country.is/${server}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const data = await response.json();
      if (data.country && typeof data.country === 'string' && data.country.length === 2) {
        return data.country;
      }
    }
  } catch {
    // Network error
  }
  return null;
}

async function queryIpwhoIs(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://ipwho.is/${server}`)}`
      : `https://ipwho.is/${server}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.country_code && data.country_code.length === 2) {
        return data.country_code;
      }
    }
  } catch {
    // Network error
  }
  return null;
}

async function queryIpApi(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy 
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://ip-api.com/json/${server}?fields=status,countryCode`)}`
      : `http://ip-api.com/json/${server}?fields=status,countryCode`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success' && data.countryCode && data.countryCode.length === 2) {
        return data.countryCode;
      }
    }
  } catch {
    // Network error
  }
  return null;
}

async function queryIpinfo(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://ipinfo.io/${server}/json`)}`
      : `https://ipinfo.io/${server}/json`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const data = await response.json();
      if (data.country && data.country.length === 2) {
        return data.country;
      }
    }
  } catch {
    // Network error
  }
  return null;
}

async function queryIpapiCo(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://ipapi.co/${server}/country/`)}`
      : `https://ipapi.co/${server}/country/`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed && trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed)) {
        return trimmed;
      }
    }
  } catch {
    // Rate limited or network error
  }
  return null;
}

async function queryFreeGeoIp(server: string, useProxy: boolean): Promise<string | null> {
  try {
    const url = useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://freegeoip.app/json/${server}`)}`
      : `https://freegeoip.app/json/${server}`;
    
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const data = await response.json();
      if (data.country_code && data.country_code.length === 2) {
        return data.country_code;
      }
    }
  } catch {
    // Network error
  }
  return null;
}

type GeoQueryFn = (server: string, useProxy: boolean) => Promise<string | null>;

const GEO_PROVIDERS: GeoQueryFn[] = [
  queryCountryIs,
  queryIpwhoIs,
  queryIpApi,
  queryIpinfo,
  queryIpapiCo,
  queryFreeGeoIp,
];

export async function lookupCountry(server: string, useProxy = false): Promise<string> {
  if (geoCache.has(server)) {
    return geoCache.get(server)!;
  }

  for (const query of GEO_PROVIDERS) {
    try {
      const result = await query(server, useProxy);
      if (result) {
        geoCache.set(server, result);
        return result;
      }
    } catch {
      continue;
    }
  }

  geoCache.set(server, 'Unknown');
  return 'Unknown';
}

export async function lookupCountries(servers: string[], useProxy = false): Promise<Map<string, string>> {
  const uniqueServers = [...new Set(servers)];
  const results = new Map<string, string>();

  const batchSize = 10;
  for (let i = 0; i < uniqueServers.length; i += batchSize) {
    const batch = uniqueServers.slice(i, i + batchSize);
    const promises = batch.map(async (server) => {
      const country = await lookupCountry(server, useProxy);
      results.set(server, country);
    });

    await Promise.all(promises);

    if (i + batchSize < uniqueServers.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

export { COUNTRY_NAMES, getCountryName };
