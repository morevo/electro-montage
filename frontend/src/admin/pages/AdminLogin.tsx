import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthScreen from '../../components/AuthScreen';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

const AMBER = '#f59e0b';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@electromontage.ru');
  const [password, setPassword] = useState('ElectroAdmin2024!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuth();
  };

  // Стилизованная форма поверх AuthScreen
  return (
    <div style={{ position: 'relative', zIndex: 10000 }}>
      <AuthScreen onAuth={handleAuth} />

      {/* Наша форма поверх оригинальной */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto', width: '100%', maxWidth: '400px', padding: '0 16px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full"
            style={{
              background: 'var(--color-surface)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: `0 0 40px ${AMBER}10, 0 25px 50px rgba(0,0,0,0.3)`,
            }}
          >
            {/* Заголовок админки */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span style={{ color: AMBER, fontSize: '2rem' }}>⚡</span>
                <h2 className="text-2xl font-bold text-on-surface">Панель управления</h2>
              </div>
              <p className="text-on-muted text-sm">Войдите для управления портфолио</p>
            </div>

            {/* Ошибка */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg text-sm text-center"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                {error}
              </motion.div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-on-muted mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@electromontage.ru"
                  className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
                  disabled={loading}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-on-muted mb-2">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="ElectroAdmin2024!"
                  className="w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm"
                  disabled={loading}
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
                  color: '#0a1628',
                  boxShadow: `0 4px 15px ${AMBER}40, 0 0 30px ${AMBER}15`,
                  border: 'none',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Вход...' : 'Войти в админку'}
              </motion.button>
            </form>

            {/* Подсказка */}
            <p className="mt-6 text-center text-xs text-on-muted/50">
              По умолчанию: admin@electromontage.ru / ElectroAdmin2024!
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}