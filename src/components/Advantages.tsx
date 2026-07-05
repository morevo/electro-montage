import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineCurrencyDollar,
  HiOutlineBadgeCheck,
  HiOutlineUserGroup,
  HiOutlineCube
} from 'react-icons/hi'
import { IconType } from 'react-icons'

interface Advantage {
  icon: IconType
  title: string
  description: string
}

const advantages: Advantage[] = [
  {
    icon: HiOutlineShieldCheck,
    title: 'Гарантия 5 лет',
    description: 'Предоставляем расширенную гарантию на все виды выполненных работ',
  },
  {
    icon: HiOutlineBadgeCheck,
    title: 'Лицензии и допуски',
    description: 'Все необходимые лицензии, допуски СРО и сертификаты',
  },
  {
    icon: HiOutlineClock,
    title: 'Точные сроки',
    description: 'Выполняем работы в оговорённые сроки, без задержек и переносов',
  },
  {
    icon: HiOutlineCurrencyDollar,
    title: 'Честные цены',
    description: 'Прозрачное ценообразование, смета фиксируется до начала работ',
  },
  {
    icon: HiOutlineUserGroup,
    title: 'Опытная команда',
    description: 'Специалисты с опытом от 5 лет, регулярное повышение квалификации',
  },
  {
    icon: HiOutlineCube,
    title: 'Качественные материалы',
    description: 'Используем только сертифицированные кабели, автоматику и комплектующие',
  },
]

export default function Advantages() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="advantages" className="py-10 sm:py-14 md:py-20 bg-primary-dark/50 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Почему <span className="text-accent">выбирают нас</span>
          </h2>
          <p className="section-subtitle">
            Надёжность, качество и профессионализм в каждом проекте
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((adv, i) => {
            const AdvIcon = adv.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="group flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-surface border border-[var(--color-border)]
                           hover:border-accent/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0
                                group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                  <AdvIcon className="text-accent text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-accent transition-colors">
                    {adv.title}
                  </h3>
                  <p className="text-on-muted text-sm leading-relaxed">
                    {adv.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
