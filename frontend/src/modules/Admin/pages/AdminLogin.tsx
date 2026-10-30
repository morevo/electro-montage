import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AuthScreen from '@/modules/Main/components/AuthScreen';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

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

  return <AuthScreen onAuth={handleLogin} />;
}
