import { motion } from 'framer-motion'
import { HiOutlineLightningBolt } from 'react-icons/hi'
import { FiChevronDown } from 'react-icons/fi'
import ElectricParticles from './ElectricParticles'
import { scrollToSection } from '../utils/scroll'

const smooth = (delay: number) => ({
  duration: 0.7,
  ease: [0.25, 0.1, 0.25, 1] as const,
  delay,
})

export default function Hero() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollToSection('#about')
  }

  return (
    <section id="hero" className="relative flex items-center justify-center overflow-hidden electric-bg pt-28 sm:pt-32">
      <ElectricParticles />

      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, var(--color-primary) 0%, transparent 15%, transparent 60%, var(--color-primary) 90%)' }} />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">

        {/* 1. Иконка — 0.0s */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={smooth(0.0)}
          className="mb-6"
        >
          <HiOutlineLightningBolt className="text-accent text-5xl sm:text-6xl md:text-8xl mx-auto animate-float"/>
        </motion.div>

        {/* 2. Заголовок — 0.15 / 0.30 / 0.45s */}
        <motion.h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-tight">
          {[
            "Профессиональные",
            "электромонтажные",
            "работы"
          ].map((word, i) => (
            <motion.span
              key={word} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={smooth(0.15 + i * 0.15)}
              className={`block ${i === 1 ? "text-accent glow-text" : "text-on-surface"}`}
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>

        {/* 3. Подпись — 0.6s */}
        <motion.p
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={smooth(0.6)}
          className="text-on-muted text-sm sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto"
        >
          Выполняем полный спектр электромонтажных работ для частного сектора, квартир, домов и коммерческих объектов.
          Гарантия качества и безопасности.
        </motion.p>

        {/* 4. Кнопки — 0.75s */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {[
            { label: "Наши услуги", href: "#services", cls: "btn-outline text-sm sm:text-lg" },
          ].map(({ label, href, cls }, i) => (
            <motion.div
              key={href} initial={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }}
              transition={smooth(0.75 + i * 0.15)}
            >

              <a href={href}
              onClick={(e) => {
              e.preventDefault();
              scrollToSection(href)
            }}
              className={cls}
              >
              {label}
            </a>
            </motion.div>
            ))}
        </div>

        {/* 5. Стрелка — 1.1s. Обычный блок в потоке, а не absolute — чтобы никогда не перекрывала кнопку выше при короткой секции */}
        <motion.a
          href="#about" onClick={handleScroll} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={smooth(1.1)}
          className="mt-12 inline-block text-accent cursor-pointer"
        >
          <FiChevronDown className="text-4xl animate-bounce-slow"/>
        </motion.a>
      </div>
    </section>
  )
}