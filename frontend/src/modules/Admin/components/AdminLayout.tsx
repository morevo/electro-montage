import { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  HiOutlinePhotograph,
  HiOutlineFolder,
  HiOutlineBookOpen,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineUserGroup,
  HiOutlineExternalLink,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const AMBER = '#f59e0b';
const COLLAPSE_KEY = 'admin-sidebar-collapsed';

/* ── Частицы на фоне (как в AuthScreen/Hero) ── */
function AdminParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;

    const particles: {
      x: number; y: number; size: number; speedX: number; speedY: number;
      opacity: number; pulse: number;
    }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.6,
        speedY: (Math.random() - 0.5) * 0.6,
        opacity: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX; p.y += p.speedY; p.pulse += 0.02;
        p.opacity = 0.1 + Math.sin(p.pulse) * 0.2;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity * 0.15})`; ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />;
}

/* ── Сайдбар навигации ── */
function AdminSidebar({
  mobileOpen,
  collapsed,
  showUsers,
  onCloseMobile,
  onLogout,
}: {
  mobileOpen: boolean;
  collapsed: boolean;
  showUsers: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}) {
  // Инструкция живёт отдельно: она прижата к низу колонки, прямо над «Выйти»,
  // а рабочие разделы — сверху. «Администраторы» видны только супер-админу —
  // так же, как бэкенд ограничивает доступ к /api/users одной этой ролью.
  const navItems = [
    { path: '/admin/categories', label: 'Категории', icon: HiOutlineFolder },
    { path: '/admin/photos', label: 'Фото', icon: HiOutlinePhotograph },
    ...(showUsers ? [{ path: '/admin/users', label: 'Администраторы', icon: HiOutlineUserGroup }] : []),
  ];
  const guideItem = { path: '/admin/guide', label: 'Инструкция', icon: HiOutlineBookOpen };

  const renderNavItem = (item: (typeof navItems)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={onCloseMobile}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
        ${collapsed ? 'lg:justify-center lg:px-2' : ''}
        ${isActive
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'text-on-muted border border-transparent hover:text-on-surface hover:bg-surface'}
      `}
    >
      <item.icon className="text-xl flex-shrink-0" />
      <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
    </NavLink>
  );

  return (
    <>
      {/* Затемнение на мобильных */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 h-full bg-primary/95 backdrop-blur-md border-r border-[var(--color-border)] z-50 flex flex-col
                    overflow-y-auto overscroll-contain lg:overflow-y-visible
                    w-full ${collapsed ? 'lg:w-20' : 'lg:w-64'}
                    transition-[width,transform] duration-300 ease-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Лого — высота совпадает с хэдером (h-16). Кнопка свернуть — рядом с заголовком */}
        <div
          className={`flex items-center h-16 border-b border-[var(--color-border)] flex-shrink-0
                      ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between'} px-4 sm:px-6`}
        >
        <Link to="/admin/guide">
          <div className="flex items-center gap-2.5 min-w-0">
            <span style={{ color: AMBER, fontSize: '1.5rem', lineHeight: 1 }}>⚡</span>
            <span className={`font-bold text-lg text-on-surface truncate ${collapsed ? 'lg:hidden' : ''}`}>
              Админка
            </span>
          </div>
        </Link>

          {/* Мобильное закрытие */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 -mr-1 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface transition-colors"
            aria-label="Закрыть меню"
          >
            <HiOutlineX className="text-xl" />
          </button>
        </div>

        {/* Навигация: рабочие разделы сверху, инструкция — внизу, над «Выйти» */}
        <nav className={`flex-1 flex flex-col p-3 ${collapsed ? 'lg:px-2' : ''}`}>
          <div className="space-y-2">{navItems.map(renderNavItem)}</div>
          <div className="mt-auto pt-3 space-y-2">
            {renderNavItem(guideItem)}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? 'На главную' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                          text-on-muted border border-transparent hover:text-accent hover:bg-accent/[0.06]
                          ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
            >
              <HiOutlineExternalLink className="text-xl flex-shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>На главную</span>
            </a>
          </div>
        </nav>

        {/* Низ: выход */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Выйти' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-on-muted
                        hover:text-red-400 hover:bg-red-400/10 transition-all
                        ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <HiOutlineLogout className="text-xl flex-shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Выйти</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Хэдер ── */
function AdminHeader({
  onMenu,
  collapsed,
  onToggleCollapse,
}: {
  onMenu: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const location = useLocation();

  const resolveTitle = (pathname: string) => {
    if (pathname === '/admin/photos/new') return 'Новое фото';
    if (/^\/admin\/photos\/[^/]+\/edit$/.test(pathname)) return 'Редактирование фото';
    if (pathname.startsWith('/admin/photos')) return 'Управление фото';
    if (pathname === '/admin/categories/new') return 'Новая категория';
    if (/^\/admin\/categories\/[^/]+\/edit$/.test(pathname)) return 'Редактирование категории';
    if (pathname.startsWith('/admin/categories')) return 'Управление категориями';
    if (pathname === '/admin/users/new') return 'Новый администратор';
    if (/^\/admin\/users\/[^/]+\/edit$/.test(pathname)) return 'Администратор';
    if (pathname.startsWith('/admin/users')) return 'Администраторы';
    if (pathname.startsWith('/admin/guide')) return 'Инструкция';
    return 'Админка';
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 ${collapsed ? 'lg:left-20' : 'lg:left-64'} h-16 bg-primary/95
                  backdrop-blur-md border-b border-[var(--color-border)] z-30 flex items-center gap-3 px-4 sm:px-6
                  transition-[left] duration-300 ease-out`}
    >
      {/* На мобильных — открыть drawer, на десктопе — свернуть/развернуть сайдбар */}
      <button
        type="button"
        onClick={onMenu}
        className="lg:hidden p-2 -ml-1 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface transition-colors"
        aria-label="Открыть меню"
      >
        <HiOutlineMenu className="text-2xl" />
      </button>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden lg:inline-flex p-2 -ml-1.5 rounded-lg text-on-muted hover:text-accent hover:bg-accent/10 transition-colors"
        aria-label={collapsed ? 'Развернуть боковое меню' : 'Свернуть боковое меню'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      >
        <HiOutlineMenuAlt2 className="text-xl" />
      </button>

      <h1 className="text-lg sm:text-xl font-bold text-on-surface truncate">
        {resolveTitle(location.pathname)}
      </h1>
    </header>
  );
}

/* ── Подтверждение выхода ── */
function LogoutConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-surface border border-[var(--color-border)] p-6"
            style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-400/10 text-red-400">
                <HiOutlineLogout className="text-xl" />
              </span>
              <h2 className="text-lg font-bold text-on-surface">Выйти из админки?</h2>
            </div>
            <p className="text-sm text-on-muted mb-6">
              Придётся войти заново, чтобы продолжить управлять портфолио.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-primary border border-[var(--color-border)] hover:border-accent/30 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AdminLayoutProps {
  children?: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Закрываем мобильное меню при смене страницы
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const handleLogout = async () => {
    setConfirmLogout(false);
    await logout();
    toast.success('Вы вышли из админки');
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Частицы на фоне */}
      <AdminParticles />

      {/* Радиальное свечение */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 1 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vmax',
          height: '80vmax',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${AMBER}20 0%, ${AMBER}08 30%, transparent 55%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <AdminSidebar
        mobileOpen={sidebarOpen}
        collapsed={collapsed}
        showUsers={user?.role === 'SUPER_ADMIN'}
        onCloseMobile={() => setSidebarOpen(false)}
        onLogout={() => setConfirmLogout(true)}
      />
      <AdminHeader
        onMenu={() => setSidebarOpen(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      {/* Контент */}
      <main
        className={`pt-16 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'} relative z-10
                    transition-[padding] duration-300 ease-out`}
      >
        {/* Горизонтальные отступы — здесь, а не на <main>: иначе lg:pl-64
            перебивает lg:px-8 и контент прижимается к границе сайдбара.
            Слева отступ заметно больше — элементы списка не липнут к меню.
            max-width центрирует содержимое на широких экранах. */}
        <div className="pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-12 lg:pr-8 xl:pl-16 xl:pr-10 pb-10 max-w-6xl mx-auto">
          <div className="py-6 sm:py-8">{children}</div>
        </div>
      </main>

      <LogoutConfirm
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
