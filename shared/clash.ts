import yaml from 'js-yaml';
import type { ProxyNode } from './types';
import { getCountryName } from './types';

interface ClashProxy {
  name: string;
  type: string;
  server: string;
  port: number;
  cipher?: string;
  password?: string;
  uuid?: string;
  alterId?: number;
  network?: string;
  tls?: boolean;
  sni?: string;
  'skip-cert-verify'?: boolean;
  'ws-opts'?: {
    path?: string;
    headers?: Record<string, string>;
  };
  udp?: boolean;
}

function nodeToClashProxy(node: ProxyNode): ClashProxy {
  const countryPrefix = node.country ? getCountryName(node.country) : '';
  const displayName = countryPrefix ? `${countryPrefix} | ${node.name}` : node.name;
  
  const proxy: ClashProxy = {
    name: displayName,
    type: node.type,
    server: node.server,
    port: node.port,
    udp: node.udp,
  };

  if (node.type === 'ss') {
    proxy.cipher = node.cipher;
    proxy.password = node.password;
  } else if (node.type === 'vmess') {
    proxy.uuid = node.uuid;
    proxy.alterId = node.alterId;
    proxy.cipher = node.cipher;
    if (node.network) {
      proxy.network = node.network;
    }
    if (node.tls) {
      proxy.tls = true;
      if (node.sni) {
        proxy.sni = node.sni;
      }
      proxy['skip-cert-verify'] = node.skipCertVerify;
    }
    if (node.network === 'ws') {
      proxy['ws-opts'] = {
        path: node.wsPath,
        headers: node.wsHeaders,
      };
    }
  } else if (node.type === 'trojan') {
    proxy.password = node.password;
    if (node.sni) {
      proxy.sni = node.sni;
    }
    proxy['skip-cert-verify'] = node.skipCertVerify;
    if (node.network === 'ws') {
      proxy.network = 'ws';
      proxy['ws-opts'] = {
        path: node.wsPath,
        headers: node.wsHeaders,
      };
    }
  }

  return proxy;
}

function getDisplayName(node: ProxyNode): string {
  const countryPrefix = node.country ? getCountryName(node.country) : '';
  return countryPrefix ? `${countryPrefix} | ${node.name}` : node.name;
}

export function generateClashConfig(nodes: ProxyNode[]): string {
  const proxies = nodes.map(nodeToClashProxy);
  const proxyNames = nodes.map(n => getDisplayName(n));

  const countryGroups: Record<string, string[]> = {};
  for (const node of nodes) {
    const country = node.country || 'Unknown';
    if (!countryGroups[country]) {
      countryGroups[country] = [];
    }
    countryGroups[country].push(getDisplayName(node));
  }

  const countryProxyGroups = Object.entries(countryGroups)
    .filter(([, names]) => names.length > 0)
    .map(([country, names]) => ({
      name: getCountryName(country),
      type: 'select',
      proxies: names,
    }));

  const countryGroupNames = countryProxyGroups.map(g => g.name);

  const config = {
    'port': 7890,
    'socks-port': 7891,
    'allow-lan': false,
    'mode': 'rule',
    'log-level': 'silent',
    'external-controller': '127.0.0.1:9090',
    'secret': '',
    'dns': {
      'enable': true,
      'ipv6': false,
      'nameserver': [
        '223.5.5.5',
        '180.76.76.76',
        '119.29.29.29',
        '117.50.11.11',
        '117.50.10.10',
        '114.114.114.114',
        'https://dns.alidns.com/dns-query',
        'https://doh.360.cn/dns-query',
      ],
      'fallback': [
        '8.8.8.8',
        'tls://dns.rubyfish.cn:853',
        'tls://1.0.0.1:853',
        'tls://dns.google:853',
        'https://dns.rubyfish.cn/dns-query',
        'https://cloudflare-dns.com/dns-query',
        'https://dns.google/dns-query',
      ],
      'fallback-filter': {
        'geoip': true,
        'ipcidr': ['240.0.0.0/4', '0.0.0.0/32', '127.0.0.1/32'],
        'domain': [
          '+.google.com',
          '+.facebook.com',
          '+.youtube.com',
          '+.xn--ngstr-lra8j.com',
          '+.google.cn',
          '+.googleapis.cn',
          '+.gvt1.com',
        ],
      },
    },
    'proxies': proxies,
    'proxy-groups': [
      {
        name: 'Proxy',
        type: 'select',
        proxies: ['Auto', ...countryGroupNames, ...proxyNames],
      },
      {
        name: 'Auto',
        type: 'url-test',
        url: 'http://www.gstatic.com/generate_204',
        interval: 300,
        proxies: proxyNames,
      },
      ...countryProxyGroups,
    ],
    'rules': [
      'DOMAIN-SUFFIX,chatgpt.com,Proxy',
      'DOMAIN-SUFFIX,openai.com,Proxy',
      'DOMAIN-SUFFIX,ghcr.io,Proxy',
      'DOMAIN-SUFFIX,googleapis.cn,Proxy',
      'DOMAIN-KEYWORD,googleapis.cn,Proxy',
      'DOMAIN,safebrowsing.urlsec.qq.com,DIRECT',
      'DOMAIN,safebrowsing.googleapis.com,DIRECT',
      'DOMAIN,ocsp.apple.com,Proxy',
      'DOMAIN-SUFFIX,digicert.com,Proxy',
      'DOMAIN-SUFFIX,entrust.net,Proxy',
      'DOMAIN,ocsp.verisign.net,Proxy',
      'DOMAIN-SUFFIX,apps.apple.com,Proxy',
      'DOMAIN,itunes.apple.com,Proxy',
      'DOMAIN-SUFFIX,blobstore.apple.com,Proxy',
      'DOMAIN-SUFFIX,music.apple.com,DIRECT',
      'DOMAIN-SUFFIX,mzstatic.com,DIRECT',
      'DOMAIN-SUFFIX,itunes.apple.com,DIRECT',
      'DOMAIN-SUFFIX,icloud.com,DIRECT',
      'DOMAIN-SUFFIX,icloud-content.com,DIRECT',
      'DOMAIN-SUFFIX,me.com,DIRECT',
      'DOMAIN-SUFFIX,akadns.net,DIRECT',
      'DOMAIN-SUFFIX,aaplimg.com,DIRECT',
      'DOMAIN-SUFFIX,cdn-apple.com,DIRECT',
      'DOMAIN-SUFFIX,apple.com,DIRECT',
      'DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT',
      'DOMAIN,e.crashlytics.com,REJECT',
      'DOMAIN-SUFFIX,cn,DIRECT',
      'DOMAIN-KEYWORD,amazon,Proxy',
      'DOMAIN-KEYWORD,google,Proxy',
      'DOMAIN-KEYWORD,gmail,Proxy',
      'DOMAIN-KEYWORD,youtube,Proxy',
      'DOMAIN-KEYWORD,facebook,Proxy',
      'DOMAIN-SUFFIX,fb.me,Proxy',
      'DOMAIN-SUFFIX,fbcdn.net,Proxy',
      'DOMAIN-KEYWORD,twitter,Proxy',
      'DOMAIN-KEYWORD,instagram,Proxy',
      'DOMAIN-KEYWORD,dropbox,Proxy',
      'DOMAIN-SUFFIX,twimg.com,Proxy',
      'DOMAIN-KEYWORD,blogspot,Proxy',
      'DOMAIN-SUFFIX,youtu.be,Proxy',
      'DOMAIN-KEYWORD,whatsapp,Proxy',
      'DOMAIN-KEYWORD,github,Proxy',
      'DOMAIN-SUFFIX,telegram.org,Proxy',
      'DOMAIN-SUFFIX,t.me,Proxy',
      'IP-CIDR,91.108.4.0/22,Proxy,no-resolve',
      'IP-CIDR,91.108.8.0/22,Proxy,no-resolve',
      'IP-CIDR,91.108.12.0/22,Proxy,no-resolve',
      'IP-CIDR,91.108.16.0/22,Proxy,no-resolve',
      'IP-CIDR,91.108.56.0/22,Proxy,no-resolve',
      'IP-CIDR,149.154.160.0/22,Proxy,no-resolve',
      'IP-CIDR,149.154.164.0/22,Proxy,no-resolve',
      'IP-CIDR,149.154.168.0/22,Proxy,no-resolve',
      'IP-CIDR,149.154.172.0/22,Proxy,no-resolve',
      'DOMAIN-SUFFIX,local,DIRECT',
      'IP-CIDR,127.0.0.0/8,DIRECT',
      'IP-CIDR,172.16.0.0/12,DIRECT',
      'IP-CIDR,192.168.0.0/16,DIRECT',
      'IP-CIDR,10.0.0.0/8,DIRECT',
      'IP-CIDR,17.0.0.0/8,DIRECT',
      'IP-CIDR,100.64.0.0/10,DIRECT',
      'GEOIP,CN,DIRECT',
      'MATCH,Proxy',
    ],
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}
