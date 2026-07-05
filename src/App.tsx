import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import AuthScreen from './components/AuthScreen'
import Preloader from './components/Preloader'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import Services from './components/Services'
import Portfolio from './components/Portfolio'
import Advantages from './components/Advantages'
import Reviews from './components/Reviews'
import Contacts from './components/Contacts'
import Footer from './components/Footer'
import ServicePage from './pages/ServicePage'

const pageTransition = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.3, ease: 'easeIn' } },
}

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
  return (
    <motion.div
      className="min-h-screen"
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Helmet>
        <title>ЭлектроМонтаж — Профессиональные электромонтажные работы в Москве и МО</title>
        <meta name="description" content="Профессиональные электромонтажные работы в Москве и Московской области. Монтаж проводки, установка щитков, освещение, розетки, умный дом. Гарантия качества. Бесплатный выезд на замер." />
        <link rel="canonical" href="https://elektromontazh.ru/" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <Header />
      <main>
        <Hero />
        <About />
        <Services />
        <Portfolio />
        <Advantages />
        <Reviews />
        <Contacts />
      </main>
      <Footer />
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServicePage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const handleAuth = useCallback(() => setAuthed(true), [])
  const handlePreloaderComplete = useCallback(() => setLoading(false), [])

  return (
    <BrowserRouter basename="/electro-montage/">
      <AnimatePresence mode="wait">
        {!authed ? (
          <AuthScreen key="auth" onAuth={handleAuth} />
        ) : loading ? (
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
      </AnimatePresence>
    </BrowserRouter>
  )
}
