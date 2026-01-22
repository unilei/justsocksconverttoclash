export interface ProxyNode {
  name: string;
  type: 'ss' | 'vmess' | 'trojan';
  server: string;
  port: number;
  cipher?: string;
  password?: string;
  uuid?: string;
  alterId?: number;
  network?: string;
  tls?: boolean;
  sni?: string;
  skipCertVerify?: boolean;
  wsPath?: string;
  wsHeaders?: Record<string, string>;
  udp?: boolean;
  country?: string;
}

export interface SavedSubscription {
  id: string;
  userId: string;
  name: string;
  sourceUrl: string;
  config: string;
  createdAt: number;
  lastRefresh: number;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export const COUNTRY_NAMES: Record<string, string> = {
  'US': '🇺🇸 美国',
  'JP': '🇯🇵 日本',
  'HK': '🇭🇰 香港',
  'SG': '🇸🇬 新加坡',
  'TW': '🇹🇼 台湾',
  'KR': '🇰🇷 韩国',
  'GB': '🇬🇧 英国',
  'UK': '🇬🇧 英国',
  'DE': '🇩🇪 德国',
  'FR': '🇫🇷 法国',
  'CA': '🇨🇦 加拿大',
  'AU': '🇦🇺 澳大利亚',
  'NL': '🇳🇱 荷兰',
  'RU': '🇷🇺 俄罗斯',
  'IN': '🇮🇳 印度',
  'BR': '🇧🇷 巴西',
  'CN': '🇨🇳 中国',
  'IT': '🇮🇹 意大利',
  'ES': '🇪🇸 西班牙',
  'PL': '🇵🇱 波兰',
  'TR': '🇹🇷 土耳其',
  'TH': '🇹🇭 泰国',
  'VN': '🇻🇳 越南',
  'PH': '🇵🇭 菲律宾',
  'ID': '🇮🇩 印度尼西亚',
  'MY': '🇲🇾 马来西亚',
  'Unknown': '🌐 未知',
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || `🌐 ${code}`;
}
