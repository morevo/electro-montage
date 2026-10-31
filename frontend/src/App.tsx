import { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import Preloader from '@/modules/Main/components/Preloader'
import Header from '@/modules/Main/components/Header'
import Hero from '@/modules/Main/components/Hero'
import About from '@/modules/Main/components/About'
import Services from '@/modules/Main/components/Services'
import Portfolio from '@/modules/Main/components/Portfolio'
import Advantages from '@/modules/Main/components/Advantages'
import Contacts from '@/modules/Main/components/Contacts'
import Footer from '@/modules/Main/components/Footer'
import ServicePage from '@/modules/Shared/pages/ServicePage'
import NotFound from '@/modules/Shared/pages/NotFound'
import AdminLogin from '@/modules/Admin/pages/AdminLogin'
import AdminLayout from '@/modules/Admin/components/AdminLayout'
import CategoriesPage from '@/modules/Admin/pages/CategoriesPage'
import CategoryEditorPage from '@/modules/Admin/pages/CategoryEditorPage'
import PhotosPage from '@/modules/Admin/pages/PhotosPage'
import PhotoEditorPage from '@/modules/Admin/pages/PhotoEditorPage'
import AdminGuidePage from '@/modules/Admin/pages/AdminGuidePage'
import UsersPage from '@/modules/Admin/pages/UsersPage'
import UserEditorPage from '@/modules/Admin/pages/UserEditorPage'
import { AuthProvider } from '@/modules/Admin/context/AuthContext'
import { useAuth } from '@/modules/Admin/hooks/useAuth'

const pageTransition = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: 'easeIn' } },
}

// Переход между страницами админки — те же тайминги, что у страницы услуги
// (ServicePage): вход 0.5s easeOut, выход 0.3s. Но не через AnimatePresence:
// на вложенных страницах (у них свои AnimatePresence) mode="wait" периодически
// не дожидался окончания exit — URL менялся, а старая страница оставалась
// висеть. Поэтому фазы ведём сами, анимирует CSS-класс из index.css.
const ADMIN_PAGE_EXIT_MS = 300

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Сколько стоят электромонтажные работы?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Стоимость зависит от объёма и сложности работ. Монтаж проводки — от 500 руб/м², установка розеток и выключателей — от 400 руб/точка, сборка щитка — от 8 000 руб. Точную стоимость мастер рассчитает после осмотра объекта.',
      },
    },
    {
      '@type': 'Question',
      name: 'В каких районах вы работаете?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Мы выполняем электромонтажные работы по всей Москве и Московской области. Выезд мастера на замер — бесплатный.',
      },
    },
    {
      '@type': 'Question',
      name: 'Даёте ли вы гарантию на работы?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Да, на все выполненные работы предоставляется гарантия. Используем только сертифицированные материалы и соблюдаем все нормы ПУЭ.',
      },
    },
    {
      '@type': 'Question',
      name: 'Как быстро вы можете приехать?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Мастер может приехать в день обращения или в удобное для вас время. Работаем без выходных с 08:00 до 22:00.',
      },
    },
  ],
}

function HomePage() {
  useEffect(() => {
    const saved = sessionStorage.getItem('homeScrollY')
    if (saved === null) return
    sessionStorage.removeItem('homeScrollY')
    requestAnimationFrame(() => {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'auto' })
    })
  }, [])

  return (
    <motion.div
      className="min-h-screen"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Helmet>
        <title>ПроЭлектроМонтаж — Профессиональные электромонтажные работы в Москве и МО</title>
        <meta name="description" content="Профессиональные электромонтажные работы в Москве и Московской области. Монтаж проводки, установка щитков, освещение, розетки, умный дом. Гарантия качества. Бесплатный выезд на замер." />
        <link rel="canonical" href="https://abcn77.ru/" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Portfolio />
        <Advantages />
        <Contacts />
      </main>
      <Footer />
    </motion.div>
  )
}

function AdminRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Показываемая страница и фаза перехода. Сначала гасим текущую (0.3s),
  // только потом меняем location — иначе контент подменяется резко.
  const [rendered, setRendered] = useState(location)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (location.pathname === rendered.pathname) {
      setLeaving(false)
      return
    }
    setLeaving(true)
    const timer = setTimeout(() => {
      setRendered(location)
      setLeaving(false)
    }, ADMIN_PAGE_EXIT_MS)
    return () => clearTimeout(timer)
  }, [location, rendered])

  if (loading) {
    // Лёгкий индикатор вместо полноэкранного прелоадера при переходе по табам админки
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin"
          aria-label="Загрузка"
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />
  }

  // Раздел «Администраторы» виден и доступен только супер-админу — так же,
  // как бэкенд ограничивает весь /api/users одной этой ролью.
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  return (
    <AdminLayout>
      {/* Переход между страницами админки: табы в меню, список → форма фото,
          список → форма категории. Во время выхода остаётся старая страница,
          а не мигает новая — поэтому рендерим по отложенному location. */}
      <div
        key={rendered.pathname}
        className={leaving ? 'admin-page-out' : 'admin-page-in'}
      >
        <Routes location={rendered}>
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/new" element={<CategoryEditorPage />} />
            <Route path="categories/:id/edit" element={<CategoryEditorPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="photos/new" element={<PhotoEditorPage />} />
            <Route path="photos/:id/edit" element={<PhotoEditorPage />} />
            <Route path="guide" element={<AdminGuidePage />} />
            {isSuperAdmin && (
              <>
                <Route path="users" element={<UsersPage />} />
                <Route path="users/new" element={<UserEditorPage />} />
                <Route path="users/:id/edit" element={<UserEditorPage />} />
              </>
            )}
            {/* Абсолютный путь обязателен: относительный Navigate внутри
                Routes с отложенным location приклеивался к текущему URL
                и уводил в /admin/guide/guide/guide… */}
            <Route path="" element={<Navigate to="/admin/guide" replace />} />
            <Route path="*" element={<Navigate to="/admin/photos" replace />} />
          </Routes>
        </div>
    </AdminLayout>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  // Ключом служит только верхнеуровневый раздел ("", "services", "admin").
  // Если ключом брать весь pathname, то при каждом переходе внутри админки
  // внешний AnimatePresence mode="wait" размонтирует AuthProvider, сайдбар
  // и контент целиком: каждый клик по меню показывал спиннер и убивал
  // плавность. Внутренний AnimatePresence в AdminRoutes анимирует страницы
  // админки по отдельности — ради этого наружу он и оставлен только смена раздела.
  const section = location.pathname.split('/')[1] || 'home'

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={section}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServicePage />} />
        <Route
            path="/admin/*"
            element={
              <AuthProvider>
                <Routes>
                  <Route path="login" element={<AdminLogin />} />
                  <Route path="*" element={<AdminRoutes />} />
                </Routes>
              </AuthProvider>
            }
          />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  // Авторизация отключена — сайт открытый, показываем сразу прелоадер и контент.
  // const [authed, setAuthed] = useState(false)
  // const handleAuth = useCallback(() => setAuthed(true), [])
  // Прелоадер — только для публичного сайта: в админке он тормозит вход
  const [loading, setLoading] = useState(() => !window.location.pathname.startsWith('/admin'))
  const handlePreloaderComplete = useCallback(() => setLoading(false), [])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-primary)',
            color: 'var(--color-on-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          },
          success: { iconTheme: { primary: '#f59e0b', secondary: '#0a1628' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0a1628' } },
        }}
      />
      <BrowserRouter basename="/">
        {/* Без AnimatePresence: прелоадер сам плавно затухает и размонтируется,
            иначе в StrictMode exit-анимация может не сработать и слой останется сверху. */}
        {loading ? (
          <Preloader key="preloader" onComplete={handlePreloaderComplete} />
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <AnimatedRoutes />
          </motion.div>
        )}
      </BrowserRouter>
    </>
  )
}
