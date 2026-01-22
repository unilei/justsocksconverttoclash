import { SubscriptionDoc } from './db';
import { parseSubscription, lookupCountries, generateClashConfig, ProxyNode } from '../../shared';

async function fetchSubscriptionContent(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return await response.text();
}

export async function refreshSubscription(subscription: SubscriptionDoc): Promise<string> {
  const content = await fetchSubscriptionContent(subscription.sourceUrl);
  const nodes = parseSubscription(content);
  
  if (nodes.length === 0) {
    throw new Error('No valid nodes found');
  }

  const servers = nodes.map(n => n.server);
  const countryMap = await lookupCountries(servers);

  const nodesWithCountry: ProxyNode[] = nodes.map(node => ({
    ...node,
    country: countryMap.get(node.server) || 'Unknown',
  }));

  return generateClashConfig(nodesWithCountry);
}
