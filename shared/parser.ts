import type { ProxyNode } from './types';

export function base64DecodeNode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const padded = padding ? base64 + '='.repeat(4 - padding) : base64;
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf-8');
    }
    return atob(padded);
  } catch {
    return '';
  }
}

function parseSS(uri: string): ProxyNode | null {
  let name = '';
  let server = '';
  let port = 0;
  let cipher = '';
  let password = '';

  try {
    const hashIndex = uri.indexOf('#');
    if (hashIndex > -1) {
      name = decodeURIComponent(uri.slice(hashIndex + 1));
    }

    const mainPart = hashIndex > -1 ? uri.slice(0, hashIndex) : uri;
    const content = mainPart.replace('ss://', '');

    const atIndex = content.indexOf('@');
    if (atIndex > -1) {
      const userInfoEncoded = content.slice(0, atIndex);
      const serverPart = content.slice(atIndex + 1);
      
      const userInfo = base64DecodeNode(userInfoEncoded) || userInfoEncoded;
      const colonIndex = userInfo.indexOf(':');
      if (colonIndex > -1) {
        cipher = userInfo.slice(0, colonIndex);
        password = userInfo.slice(colonIndex + 1);
      }

      const lastColonIndex = serverPart.lastIndexOf(':');
      if (lastColonIndex > -1) {
        server = serverPart.slice(0, lastColonIndex);
        port = parseInt(serverPart.slice(lastColonIndex + 1), 10);
      }
    } else {
      const decoded = base64DecodeNode(content);
      if (decoded) {
        const match = decoded.match(/^(.+?):(.+?)@(.+?):(\d+)$/);
        if (match) {
          cipher = match[1];
          password = match[2];
          server = match[3];
          port = parseInt(match[4], 10);
        }
      }
    }

    if (server && port > 0) {
      name = name || `${server}:${port}`;
      return {
        name,
        type: 'ss',
        server,
        port,
        cipher,
        password,
        udp: true,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function parseVMess(uri: string): ProxyNode | null {
  try {
    const content = uri.replace('vmess://', '');
    const decoded = base64DecodeNode(content);
    const config = JSON.parse(decoded);
    
    const name = config.ps || `${config.add}:${config.port}`;
    const node: ProxyNode = {
      name,
      type: 'vmess',
      server: config.add,
      port: parseInt(config.port, 10),
      uuid: config.id,
      alterId: parseInt(config.aid, 10) || 0,
      cipher: config.scy || 'auto',
      udp: true,
    };

    if (config.net === 'ws') {
      node.network = 'ws';
      node.wsPath = config.path || '/';
      if (config.host) {
        node.wsHeaders = { Host: config.host };
      }
    } else if (config.net) {
      node.network = config.net;
    }

    if (config.tls === 'tls') {
      node.tls = true;
      node.sni = config.sni || config.host || config.add;
      node.skipCertVerify = true;
    }

    return node;
  } catch {
    return null;
  }
}

function parseTrojan(uri: string): ProxyNode | null {
  try {
    const url = new URL(uri);
    const name = decodeURIComponent(url.hash.slice(1)) || `${url.hostname}:${url.port}`;
    const params = new URLSearchParams(url.search);
    
    const node: ProxyNode = {
      name,
      type: 'trojan',
      server: url.hostname,
      port: parseInt(url.port, 10),
      password: decodeURIComponent(url.username),
      udp: true,
      tls: true,
      skipCertVerify: true,
    };

    if (params.get('sni')) {
      node.sni = params.get('sni')!;
    }

    if (params.get('type') === 'ws') {
      node.network = 'ws';
      node.wsPath = params.get('path') || '/';
      if (params.get('host')) {
        node.wsHeaders = { Host: params.get('host')! };
      }
    }

    return node;
  } catch {
    return null;
  }
}

function isValidNode(node: ProxyNode | null): node is ProxyNode {
  if (!node) return false;
  if (!node.server || !node.port || isNaN(node.port) || node.port <= 0) return false;
  if (!node.name) return false;
  return true;
}

export function parseSubscription(content: string): ProxyNode[] {
  const decoded = base64DecodeNode(content.trim());
  const text = decoded || content;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const nodes: ProxyNode[] = [];
  
  for (const line of lines) {
    let node: ProxyNode | null = null;
    
    if (line.startsWith('ss://')) {
      node = parseSS(line);
    } else if (line.startsWith('vmess://')) {
      node = parseVMess(line);
    } else if (line.startsWith('trojan://')) {
      node = parseTrojan(line);
    }
    
    if (isValidNode(node)) {
      nodes.push(node);
    }
  }
  
  return nodes;
}

export type { ProxyNode };
