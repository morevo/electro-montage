import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { HiOutlineLightningBolt, HiOutlineHome } from 'react-icons/hi'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ElectricParticles from '../components/ElectricParticles'

const smooth = (delay: number) => ({
  duration: 0.7,
  ease: [0.25, 0.1, 0.25, 1] as const,
  delay,
})

export default function NotFound() {
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.3, ease: 'easeIn' } }}
    >
      <Helmet>
        <title>Страница не найдена — ПроЭлектроМонтаж</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <Header />

      <main className="relative flex-1 flex items-center justify-center overflow-hidden electric-bg py-32">
        <ElectricParticles />

        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'linear-gradient(to bottom, var(--color-primary) 0%, transparent 15%, transparent 60%, var(--color-primary) 90%)' }} />

        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={smooth(0.0)}
            className="mb-6"
          >
            <HiOutlineLightningBolt className="text-accent text-5xl sm:text-6xl mx-auto animate-float" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.15)}
            className="text-6xl sm:text-8xl md:text-9xl font-black mb-4 text-accent glow-text"
          >
            404
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.3)}
            className="text-xl sm:text-3xl font-bold mb-4 text-on-surface"
          >
            Страница не найдена
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.45)}
            className="text-on-muted text-sm sm:text-lg mb-10 max-w-lg mx-auto"
          >
            Похоже, короткое замыкание — такой страницы не существует, либо она была перемещена.
            Вернитесь на главную, чтобы найти нужный раздел.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.6)}
          >
            <Link to="/" className="btn-primary gap-2">
              <HiOutlineHome className="text-lg" />
              На главную
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </motion.div>
  )
}
