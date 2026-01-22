import { useState } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { login, register } from '../lib/auth';

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isLogin
        ? await login(username, password)
        : await register(username, password);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || '操作失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Clash 订阅转换</h1>
          <p className="text-zinc-500">登录后管理你的订阅</p>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                isLogin
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-center rounded-lg transition-all ${
                !isLogin
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-sm mb-2 block">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名..."
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="text-zinc-400 text-sm mb-2 block">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码..."
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          <p className="text-zinc-600 text-xs text-center mt-4">
            {isLogin ? '没有账号？' : '已有账号？'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-teal-500 hover:text-teal-400 ml-1"
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
