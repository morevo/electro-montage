import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { HiOutlineEye } from 'react-icons/hi'

const categories = ['Все', 'Квартиры', 'Дома', 'Офисы', 'Промышленные'] as const
type Category = typeof categories[number]

interface Project {
  id: number
  title: string
  category: Exclude<Category, 'Все'>
  gradient: string
  description: string
}

const projects: Project[] = [
  { id: 1, title: 'Электрика в студии 45м²', category: 'Квартиры', gradient: 'from-amber-900/40 to-yellow-900/20', description: 'Полная разводка, 28 точек' },
  { id: 2, title: 'Коттедж 200м²', category: 'Дома', gradient: 'from-blue-900/40 to-cyan-900/20', description: 'Электрификация под ключ' },
  { id: 3, title: 'Офис IT-компании', category: 'Офисы', gradient: 'from-purple-900/40 to-indigo-900/20', description: 'Серверная + рабочие места' },
  { id: 4, title: 'Трёхкомнатная квартира', category: 'Квартиры', gradient: 'from-orange-900/40 to-red-900/20', description: 'Замена проводки, щиток' },
  { id: 5, title: 'Склад 500м²', category: 'Промышленные', gradient: 'from-emerald-900/40 to-green-900/20', description: 'Промышленное освещение' },
  { id: 6, title: 'Загородный дом', category: 'Дома', gradient: 'from-teal-900/40 to-cyan-900/20', description: 'Умный дом + электрика' },
  { id: 7, title: 'Коворкинг-пространство', category: 'Офисы', gradient: 'from-rose-900/40 to-pink-900/20', description: 'Дизайнерское освещение' },
  { id: 8, title: 'Производственный цех', category: 'Промышленные', gradient: 'from-slate-700/40 to-zinc-900/20', description: 'Силовые линии, 380В' },
]

export default function Portfolio() {
  const [active, setActive] = useState<Category>('Все')
  const [lightbox, setLightbox] = useState<Project | null>(null)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const filtered = active === 'Все' ? projects : projects.filter((p) => p.category === active)

  return (
    <section id="portfolio" className="py-10 sm:py-14 md:py-20 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Примеры <span className="text-accent">работ</span>
          </h2>
          <p className="section-subtitle">
            Реализованные проекты разной сложности и масштаба
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                active === cat
                  ? 'bg-accent text-primary'
                  : 'bg-surface text-on-muted hover:text-on-surface hover:bg-primary-light'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => setLightbox(project)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient}`} />
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)`,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-4xl text-accent/30 mb-2">⚡</div>
                  <p className="text-white/40 text-xs">{project.category}</p>
                </div>
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-4">
                  <HiOutlineEye className="text-accent text-3xl mb-3" />
                  <h4 className="text-white font-bold text-sm mb-1">{project.title}</h4>
                  <p className="text-on-muted text-xs">{project.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full bg-primary-light rounded-2xl overflow-hidden cursor-default"
            >
              <div className={`aspect-video bg-gradient-to-br ${lightbox.gradient} flex items-center justify-center`}>
                <div className="text-6xl text-accent/30">⚡</div>
              </div>
              <div className="p-6">
                <span className="text-accent text-sm font-medium">{lightbox.category}</span>
                <h3 className="text-xl font-bold mt-1 mb-2">{lightbox.title}</h3>
                <p className="text-on-muted">{lightbox.description}</p>
                <button
                  onClick={() => setLightbox(null)}
                  className="mt-4 btn-primary text-sm py-2 px-6"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
