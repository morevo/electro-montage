import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineX, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { usersApi } from '../api';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import Select from '../components/Select';
import type { User, UserRole } from '../types';

const AMBER = '#f59e0b';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface ' +
  'placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Админ' },
  { value: 'SUPER_ADMIN', label: 'Супер-админ (управляет другими администраторами)' },
];

/**
 * Регистрация нового администратора и правка текущего — одна и та же форма,
 * по образцу CategoryEditorPage/PhotoEditorPage: отдельная страница вместо
 * модалки, переход список ↔ форма анимируется общим AnimatePresence в App.tsx.
 */
export default function UserEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createUser, updateUser } = useUsers();
  const { user: currentUser, refreshAuth } = useAuth();
  const isEdit = Boolean(id);
  const isSelf = isEdit && id === currentUser?.id;

  const [existing, setExisting] = useState<User | null>(null);
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    usersApi
      .getUser(id)
      .then((admin) => {
        if (cancelled) return;
        setExisting(admin);
        setLogin(admin.login);
        setName(admin.name || '');
        setRole(admin.role);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Не удалось загрузить администратора');
        navigate('/admin/users', { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!login.trim()) return setError('Введите логин');
    if (login.includes('@')) return setError('Логин — не e-mail: латиница, цифры, точка, дефис и подчёркивание');
    if (!isEdit && password.length < 6) return setError('Пароль должен содержать минимум 6 символов');
    if (isEdit && password && password.length < 6) return setError('Пароль должен содержать минимум 6 символов');

    setSaving(true);
    try {
      if (isEdit) {
        await updateUser(id!, {
          login: login.trim(),
          name: name.trim() || undefined,
          password: password || undefined,
          // Себе роль не меняем — иначе можно случайно отобрать у себя
          // доступ к разделу «Администраторы» и остаться без возможности
          // его вернуть (поле ниже тоже задизейблено для своей строки).
          role: isSelf ? undefined : role,
        });
        toast.success('Изменения сохранены');
        if (isSelf) await refreshAuth();
      } else {
        await createUser({ login: login.trim(), password, name: name.trim() || undefined });
        toast.success('Администратор создан');
      }
      navigate('/admin/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить администратора';
      toast.error(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/admin/users"
            className="mt-0.5 p-2 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface border border-transparent hover:border-[var(--color-border)] transition-colors flex-shrink-0"
            aria-label="Назад к списку администраторов"
            title="Назад к списку"
          >
            <HiOutlineArrowLeft className="text-xl" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface truncate">
              {isEdit ? (isSelf ? 'Мои данные' : 'Редактировать администратора') : 'Новый администратор'}
            </h1>
            <p className="text-on-muted text-sm mt-1">
              {isEdit ? 'Логин, имя и пароль для входа в админку' : 'Создайте учётную запись для входа в админку'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-colors"
          >
            Отмена
          </button>
          <motion.button
            type="submit"
            form="user-editor-form"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
              color: '#0a1628',
              boxShadow: `0 4px 15px ${AMBER}40`,
              border: 'none',
            }}
          >
            <HiOutlineSave className="text-lg" />
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="user-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-72 rounded-2xl bg-surface/40 animate-pulse"
          />
        ) : (
          <motion.form
            key="user-form"
            id="user-editor-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start"
          >
            <div className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-sm text-red-400 bg-red-400/10 border border-red-400/20"
                >
                  <HiOutlineX className="text-base mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div>
                <label htmlFor="user-login" className="block text-sm font-medium text-on-muted mb-1.5">
                  Логин <span className="text-accent">*</span>
                </label>
                <input
                  id="user-login"
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="admin_xxxxxxxx"
                  className={inputClass}
                  autoFocus={!isEdit}
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="user-name" className="block text-sm font-medium text-on-muted mb-1.5">
                  Имя
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="user-password" className="block text-sm font-medium text-on-muted mb-1.5">
                  Пароль {isEdit ? <span className="text-on-muted/50">(оставьте пустым, чтобы не менять)</span> : <span className="text-accent">*</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? '••••••••••••' : 'Минимум 6 символов'}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-muted mb-1.5">Роль</label>
                <Select
                  value={role}
                  onChange={(v) => setRole(v as UserRole)}
                  options={roleOptions}
                  ariaLabel="Роль администратора"
                  disabled={isSelf}
                />
                {isSelf && (
                  <p className="text-[11px] text-on-muted/50 mt-1.5">
                    Себе роль менять нельзя — так нельзя случайно потерять доступ к этому разделу.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-primary/60 border border-[var(--color-border)] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                    <HiOutlineShieldCheck className="text-lg" />
                  </span>
                  <div className="text-xs text-on-muted/70 leading-relaxed">
                    <p className="font-semibold text-on-surface text-sm mb-1.5">О ролях</p>
                    <p className="mb-2">
                      <b className="text-on-surface">Супер-админ</b> — помимо категорий и фото, видит раздел
                      «Администраторы» и может создавать, редактировать и удалять других админов.
                    </p>
                    <p>
                      <b className="text-on-surface">Админ</b> — работает с категориями и фото, но не имеет
                      доступа к управлению администраторами.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-primary/60 border border-[var(--color-border)] p-4">
                <p className="text-xs text-on-muted/70 leading-relaxed">
                  {existing
                    ? 'Логин должен отличаться от уже существующих — иначе сервер ответит ошибкой.'
                    : 'Новый администратор сразу сможет войти в админку с указанным логином и паролем.'}
                </p>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
