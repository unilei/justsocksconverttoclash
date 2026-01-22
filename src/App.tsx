import { useState, useCallback, useEffect, useRef } from 'react';
import { Copy, Download, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink, Link, Clock, Trash2, Save, LogOut } from 'lucide-react';
import { parseSubscription, generateClashConfig, lookupCountries, ProxyNode, SavedSubscription } from '../shared';
import { generateId, getSubscriptions, saveSubscription, deleteSubscription, getSubscription, getSubscriptionUrl } from './lib/storage';
import { isLoggedIn, getUser, logout, User } from './lib/auth';
import { Login } from './components/Login';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [nodeCount, setNodeCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SavedSubscription[]>([]);
  const [subName, setSubName] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [currentSubId, setCurrentSubId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const refreshTimerRef = useRef<number | null>(null);

  const fetchSubscription = useCallback(async (url: string): Promise<string> => {
    const corsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    for (const proxyUrl of corsProxies) {
      try {
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (response.ok) {
          return await response.text();
        }
      } catch {
        continue;
      }
    }
    throw new Error('无法获取订阅内容，请手动访问链接复制内容');
  }, []);

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      const subs = await getSubscriptions();
      setSubscriptions(subs);

      const params = new URLSearchParams(window.location.search);
      const subId = params.get('sub');
      if (subId) {
        const sub = await getSubscription(subId);
        if (sub) {
          setOutput(sub.config);
          setCurrentSubId(subId);
          setSubName(sub.name);
          setAutoRefresh(sub.autoRefresh);
          setRefreshInterval(sub.refreshInterval);
        }
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (autoRefresh && currentSubId && refreshInterval > 0) {
      refreshTimerRef.current = window.setInterval(() => {
        const sub = subscriptions.find(s => s.id === currentSubId);
        if (sub) {
          // Auto refresh - would need to call refresh logic
        }
      }, refreshInterval * 60 * 1000);
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [user, autoRefresh, currentSubId, refreshInterval, subscriptions]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setSubscriptions([]);
    setOutput('');
    setCurrentSubId(null);
  };

  const handleLoginSuccess = () => {
    setUser(getUser());
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  const handleConvert = async () => {
    setError('');
    setCopied(false);
    setLoading(true);
    setStatusText('正在获取订阅...');

    try {
      let content = input.trim();

      if (content.startsWith('http://') || content.startsWith('https://')) {
        content = await fetchSubscription(content);
      }

      setStatusText('正在解析节点...');
      const nodes = parseSubscription(content);

      if (nodes.length === 0) {
        setError('未能解析到任何有效节点，请检查输入内容');
        setStatusText('');
        return;
      }

      setStatusText(`正在查询 ${nodes.length} 个节点的地理位置...`);
      const servers = nodes.map(n => n.server);
      const countryMap = await lookupCountries(servers, true);

      const nodesWithCountry: ProxyNode[] = nodes.map(node => ({
        ...node,
        country: countryMap.get(node.server) || 'Unknown',
      }));

      setNodeCount(nodesWithCountry.length);
      setStatusText('正在生成配置...');
      const clashConfig = generateClashConfig(nodesWithCountry);
      setOutput(clashConfig);
      setStatusText('');
    } catch (err) {
      setError(`转换失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setStatusText('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clash-config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setNodeCount(0);
    setError('');
    setCopied(false);
    setGeneratedLink('');
    setCurrentSubId(null);
  };

  const handleSaveSubscription = async () => {
    if (!input.trim() || !output) {
      setError('请先转换订阅后再保存');
      return;
    }

    const sourceUrl = input.trim();
    const id = currentSubId || generateId();
    const now = Date.now();

    const sub: SavedSubscription = {
      id,
      userId: user.id,
      name: subName || `订阅 ${new Date().toLocaleDateString()}`,
      sourceUrl,
      config: output,
      createdAt: currentSubId ? (subscriptions.find(s => s.id === id)?.createdAt || now) : now,
      lastRefresh: now,
      autoRefresh,
      refreshInterval,
    };

    await saveSubscription(sub);

    setCurrentSubId(id);
    setSubscriptions(await getSubscriptions());

    setGeneratedLink(getSubscriptionUrl(id));
  };

  const handleRefreshSubscription = async (id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    if (!sub) return;

    setLoading(true);
    setStatusText('正在刷新订阅...');

    try {
      const content = await fetchSubscription(sub.sourceUrl);
      const nodes = parseSubscription(content);

      if (nodes.length === 0) {
        setError('刷新失败：未能解析到任何有效节点');
        return;
      }

      setStatusText(`正在查询 ${nodes.length} 个节点的地理位置...`);
      const servers = nodes.map(n => n.server);
      const countryMap = await lookupCountries(servers, true);

      const nodesWithCountry: ProxyNode[] = nodes.map(node => ({
        ...node,
        country: countryMap.get(node.server) || 'Unknown',
      }));

      const clashConfig = generateClashConfig(nodesWithCountry);
      setOutput(clashConfig);
      setNodeCount(nodesWithCountry.length);

      const now = Date.now();
      const updatedSub: SavedSubscription = {
        ...sub,
        config: clashConfig,
        lastRefresh: now,
      };
      await saveSubscription(updatedSub);
      setSubscriptions(await getSubscriptions());
    } catch (err) {
      setError(`刷新失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setStatusText('');
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    await deleteSubscription(id);
    setSubscriptions(await getSubscriptions());
    if (currentSubId === id) {
      setCurrentSubId(null);
      setGeneratedLink('');
    }
  };

  const handleLoadSubscription = (sub: SavedSubscription) => {
    setInput(sub.sourceUrl);
    setCurrentSubId(sub.id);
    setSubName(sub.name);
    setAutoRefresh(sub.autoRefresh);
    setRefreshInterval(sub.refreshInterval);
    setOutput(sub.config);
    setGeneratedLink(getSubscriptionUrl(sub.id));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('复制链接失败');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
                Clash 订阅转换
              </h1>
              <p className="text-zinc-500 text-sm">
                将 JustMySocks 等订阅转换为 Clash Verge 格式
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 text-sm">{user.username}</span>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-medium">
                输入订阅内容
              </label>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                SS / VMess / Trojan
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴订阅URL或订阅内容（Base64编码）..."
              className="w-full h-80 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 resize-none font-mono text-sm transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={handleConvert}
                disabled={loading || !input.trim()}
                className="flex-1 py-3 px-6 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {loading ? (statusText || '处理中...') : '转换'}
              </button>
              <button
                onClick={handleClear}
                className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all"
              >
                清空
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-medium">
                Clash 配置输出
              </label>
              {nodeCount > 0 && (
                <span className="text-xs text-teal-400 flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" />
                  {nodeCount} 个节点
                </span>
              )}
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="转换后的 Clash YAML 配置将显示在这里..."
              className="w-full h-80 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 placeholder-zinc-600 focus:outline-none resize-none font-mono text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex-1 py-3 px-6 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-200 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? '已复制!' : '复制配置'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!output}
                className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-200 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          </div>
        </div>

        {output && (
          <div className="mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-zinc-200 font-medium mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-teal-500" />
              保存订阅 & 生成链接
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-zinc-500 text-sm mb-2 block">订阅名称</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="输入订阅名称..."
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 text-teal-500 focus:ring-teal-500/50"
                  />
                  <label htmlFor="autoRefresh" className="text-zinc-400 text-sm">自动刷新</label>
                </div>
                {autoRefresh && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 60)}
                      min={1}
                      className="w-20 p-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                    <span className="text-zinc-500 text-sm">分钟</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleSaveSubscription}
                className="py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存订阅
              </button>
              {generatedLink && (
                <>
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 min-w-0 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-4 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium rounded-lg transition-all flex items-center gap-2"
                  >
                    <Link className="w-4 h-4" />
                    {linkCopied ? '已复制!' : '复制链接'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {subscriptions.length > 0 && (
          <div className="mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-zinc-200 font-medium mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" />
              已保存的订阅
            </h2>
            <div className="space-y-3">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-800">
                  <div>
                    <div className="text-zinc-200 font-medium">{sub.name}</div>
                    <div className="text-zinc-500 text-xs mt-1">
                      上次刷新: {new Date(sub.lastRefresh).toLocaleString()}
                      {sub.autoRefresh && ` · 每 ${sub.refreshInterval} 分钟自动刷新`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadSubscription(sub)}
                      className="py-1.5 px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-all"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleRefreshSubscription(sub.id)}
                      disabled={loading}
                      className="py-1.5 px-3 bg-teal-600/20 hover:bg-teal-600/30 disabled:bg-zinc-800 text-teal-400 disabled:text-zinc-600 text-sm rounded-lg transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      刷新
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h2 className="text-zinc-200 font-medium mb-4">使用说明</h2>
          <ol className="text-zinc-500 space-y-2 text-sm list-decimal list-inside">
            <li>从 JustMySocks 官网复制订阅链接（URL）</li>
            <li>直接粘贴订阅 URL 到左侧输入框</li>
            <li>点击"转换"按钮，工具会自动获取并解析</li>
            <li>复制右侧生成的配置或下载 YAML 文件</li>
            <li>在 Clash Verge 中导入配置文件</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h3 className="text-zinc-300 text-sm font-medium mb-2">支持的协议</h3>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">Shadowsocks</span>
              <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">VMess</span>
              <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded">Trojan</span>
            </div>
          </div>
          <p className="text-zinc-600 text-xs mt-4 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            也可以手动访问订阅链接，复制页面内容后粘贴
          </p>
        </div>

        <footer className="mt-8 text-center text-zinc-600 text-sm">
          <p>仅供学习交流使用，请遵守当地法律法规</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
