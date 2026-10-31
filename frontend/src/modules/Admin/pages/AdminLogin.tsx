import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthScreen from '@/modules/Main/components/AuthScreen';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  // Если пользователь уже авторизован — сразу уводим в админку
  useEffect(() => {
    if (!loading && user) {
      navigate('/admin/guide', { replace: true });
    }
  }, [user, loading, navigate]);

  // После входа ведём сразу в инструкцию: новому админу полезнее прочитать
  // её, чем увидеть список категорий.
  const from = (location.state as any)?.from?.pathname || '/admin/guide';

  const handleLogin = useCallback(
    // входящее имя не называем login — оно перекрыло бы login из useAuth()
    async (loginValue: string, password: string) => {
      await login(loginValue, password);
      navigate(from, { replace: true });
    },
    [login, navigate, from],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin"
          aria-label="Загрузка"
        />
      </div>
    );
  }

  if (user) {
    return null; // Редирект сработает в useEffect
  }

  return <AuthScreen onAuth={handleLogin} />;
}
