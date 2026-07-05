import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { HiOutlineLightningBolt, HiArrowLeft, HiCheck } from 'react-icons/hi'
import { services } from '../data/services'
import Header from '../components/Header'
import Footer from '../components/Footer'

const pageVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

export default function ServicePage() {
  const { id } = useParams<{ id: string }>()
  const service = services.find((s) => s.id === id)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-on-muted text-xl mb-6">Услуга не найдена</p>
        <Link to="/" className="btn-primary">На главную</Link>
      </div>
    )
  }

  const Icon = service.icon
  const pageTitle = `${service.title} — ЭлектроМонтаж | Профессиональные электромонтажные работы`
  const pageDescription = service.fullDescription
  const pageUrl = `https://abcn77.ru/services/${service.id}`

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.fullDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: 'ЭлектроМонтаж',
      url: 'https://abcn77.ru/',
    },
    areaServed: {
      '@type': 'City',
      name: 'Москва',
    },
    url: pageUrl,
  }

  return (
    <motion.div
      className="min-h-screen"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://abcn77.ru/og-image.jpg" />
        <meta property="og:locale" content="ru_RU" />
        <meta property="og:site_name" content="ЭлектроМонтаж" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://abcn77.ru/og-image.jpg" />

        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <Header />

      <main className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-on-muted hover:text-accent transition-colors group"
            >
              <HiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
              Назад к услугам
            </Link>
          </motion.div>

          {/* Hero block */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative p-5 sm:p-8 md:p-12 rounded-3xl bg-surface border border-accent/20 mb-10 overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/3 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <Icon className="text-accent text-4xl" />
              </div>
              <div>
                <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Наша услуга</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3">{service.title}</h1>
                <p className="text-on-muted text-base sm:text-lg leading-relaxed">{service.fullDescription}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl bg-surface border border-[var(--color-border)]"
            >
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <HiOutlineLightningBolt className="text-accent" />
                Что входит в услугу
              </h2>
              <ul className="space-y-3">
                {service.features.map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex items-start gap-3 text-on-muted"
                  >
                    <HiCheck className="text-accent flex-shrink-0 mt-0.5 text-lg" />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Price + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="p-6 rounded-2xl bg-accent/10 border border-accent/20">
                <p className="text-on-muted text-sm mb-1">Стоимость</p>
                <p className="text-2xl sm:text-3xl font-black text-accent">{service.price}</p>
                <p className="text-on-muted text-xs mt-2">Точная цена рассчитывается после осмотра объекта</p>
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-[var(--color-border)]">
                <h3 className="font-bold mb-3">Получите бесплатный расчёт</h3>
                <p className="text-on-muted text-sm mb-5">Оставьте заявку — мастер осмотрит объект и подготовит точную смету</p>
                <Link
                  to="/#contacts"
                  className="btn-primary block text-center"
                  onClick={() => {
                    setTimeout(() => {
                      document.querySelector('#contacts')?.scrollIntoView({ behavior: 'smooth' })
                    }, 100)
                  }}
                >
                  Заказать звонок
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Other services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold mb-6">Другие услуги</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.filter((s) => s.id !== service.id).map((s, i) => {
                const OtherIcon = s.icon
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + i * 0.06 }}
                  >
                    <Link
                      to={`/services/${s.id}`}
                      className="group flex items-center gap-3 p-4 rounded-xl bg-surface border border-[var(--color-border)]
                                 hover:border-accent/30 hover:bg-primary-light transition-all duration-300"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                        <OtherIcon className="text-accent text-xl" />
                      </div>
                      <span className="text-sm font-medium group-hover:text-accent transition-colors">{s.title}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </motion.div>
  )
}
