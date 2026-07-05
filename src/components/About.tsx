import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineUserGroup } from 'react-icons/hi'
import { IconType } from 'react-icons'

interface CounterProps {
  target: number
  suffix?: string
  duration?: number
}

function AnimatedCounter({ target, suffix = '', duration = 2 }: CounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const end = target
    const stepTime = (duration * 1000) / end
    const timer = setInterval(() => {
      start += Math.ceil(end / 60)
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, stepTime)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return (
    <span ref={ref} className="text-3xl sm:text-4xl md:text-5xl font-black text-accent">
      {count}{suffix}
    </span>
  )
}

interface Stat {
  icon: IconType
  value: number
  suffix: string
  label: string
}

const stats: Stat[] = [
  { icon: HiOutlineLightningBolt, value: 12, suffix: '+', label: 'Лет опыта' },
  { icon: HiOutlineShieldCheck, value: 850, suffix: '+', label: 'Выполненных проектов' },
  { icon: HiOutlineUserGroup, value: 600, suffix: '+', label: 'Довольных клиентов' },
]

export default function About() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="about" className="py-10 sm:py-14 md:py-20 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            О <span className="text-accent">компании</span>
          </h2>
          <p className="section-subtitle">
            Надёжная электрика — основа вашего комфорта и безопасности
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center mb-10 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl border border-accent/20 hover:border-accent/40 flex items-center justify-center glow-box overflow-hidden relative transition-all"
                 style={{
                   background: 'linear-gradient(135deg, #0f2140 0%, #060e1a 100%)'
                 }}>
              {/* Декоративная сетка */}
              <div className="absolute inset-0 opacity-5 pointer-events-none"
                   style={{
                     backgroundImage: `
                       linear-gradient(var(--color-border) 1px, transparent 1px),
                       linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
                     `,
                     backgroundSize: '20px 20px'
                   }}
              />
              
              {/* Внутреннее свечение */}
              <div className="absolute inset-0 pointer-events-none"
                   style={{
                     background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.03) 0%, transparent 70%)'
                   }}
              />
              
              <div className="text-center p-8 relative z-10">
                <HiOutlineLightningBolt className="text-accent text-8xl mx-auto mb-4 opacity-30" />
                <div className="text-on-muted text-sm">Фото команды за работой</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-xl sm:text-2xl font-bold mb-4">
              Профессиональный подход к каждому проекту
            </h3>
            <p className="text-on-muted mb-4 leading-relaxed">
              Компания «ЭлектроМонтаж» — это команда сертифицированных специалистов с многолетним опытом работы в сфере электромонтажа. Мы выполняем работы любой сложности: от замены розетки до полной электрификации промышленных объектов.
            </p>
            <p className="text-on-muted mb-6 leading-relaxed">
              Каждый проект начинается с детальной проектировки и заканчивается тщательной проверкой всех систем. Используем только сертифицированные материалы и современное оборудование.
            </p>
            <ul className="space-y-3">
              {['Все работы по ГОСТу и ПУЭ', 'Сертифицированные специалисты', 'Гарантия на все виды работ'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-on-muted">
                  <HiOutlineLightningBolt className="text-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((stat, i) => {
            const StatIcon = stat.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-all"
              >
                <StatIcon className="text-accent text-3xl mx-auto mb-3" />
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                <p className="text-on-muted mt-2">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
