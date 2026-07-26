import { useMemo, useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { HiOutlineFolder, HiOutlinePhotograph, HiX } from 'react-icons/hi'
import { RowsPhotoAlbum } from 'react-photo-album'
import type { Photo } from 'react-photo-album'
import 'react-photo-album/rows.css'
import Lightbox from 'yet-another-react-lightbox'
import type { Slide, SlideImage } from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

interface Project {
  id: number
  title?: string
  category: string
  gradient: string
}

// Категории — по разделам услуг. Фото пока заглушки (градиенты), заменить когда придёт архив от заказчика.
const projects: Project[] = [
  { id: 1, category: 'Подключение к электросетям', gradient: 'from-blue-900/40 to-cyan-900/20' },
  { id: 2, category: 'Подключение к электросетям', gradient: 'from-sky-900/40 to-blue-900/20' },
  { id: 3, category: 'Электропроводка', gradient: 'from-amber-900/40 to-yellow-900/20' },
  { id: 4, category: 'Электропроводка', gradient: 'from-orange-900/40 to-red-900/20' },
  { id: 5, category: 'Уличное освещение', gradient: 'from-purple-900/40 to-indigo-900/20' },
  { id: 6, category: 'Уличное освещение', gradient: 'from-violet-900/40 to-purple-900/20' },
  { id: 7, category: 'Заземление', gradient: 'from-emerald-900/40 to-green-900/20' },
  { id: 8, category: 'Заземление', gradient: 'from-teal-900/40 to-emerald-900/20' },
  { id: 9, category: 'Видеонаблюдение', gradient: 'from-slate-700/40 to-zinc-900/20' },
  { id: 10, category: 'Видеонаблюдение', gradient: 'from-rose-900/40 to-pink-900/20' },
]

// Разные пропорции — чтобы ряды выглядели живо, а не однообразной сеткой.
const ratios = [
  [4, 3],
  [3, 4],
  [16, 9],
  [1, 1],
]

interface AlbumPhoto extends Photo {
  project: Project
}

interface ProjectSlide extends SlideImage {
  project: Project
}

interface Folder {
  category: string
  items: Project[]
}

export default function Portfolio() {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  // Группируем фото по категориям «папками» — так удобнее смотреть, когда фото много и разного качества.
  const folders: Folder[] = useMemo(() => {
    const byCategory = new Map<string, Project[]>()
    for (const project of projects) {
      const list = byCategory.get(project.category) ?? []
      list.push(project)
      byCategory.set(project.category, list)
    }
    return Array.from(byCategory, ([category, items]) => ({ category, items }))
  }, [])

  const openFolder = folders.find((f) => f.category === openCategory) ?? null

  const albumPhotos: AlbumPhoto[] = (openFolder?.items ?? []).map((project, i) => {
    const [width, height] = ratios[i % ratios.length]
    return { src: '', width, height, project }
  })

  const slides: Slide[] = (openFolder?.items ?? []).map((project) => ({
    src: '',
    project,
  })) as ProjectSlide[]

  return (
    <section id="portfolio" className="py-6 relative" ref={ref}>
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
            Фотографии сгруппированы по разделам — выберите категорию, чтобы посмотреть все фото
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {folders.map((folder, i) => {
            const [top, mid, back] = [folder.items[0], folder.items[1] ?? folder.items[0], folder.items[2] ?? folder.items[0]]
            return (
              <motion.button
                key={folder.category}
                type="button"
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                whileHover={{ y: -6 }}
                onClick={() => setOpenCategory(folder.category)}
                className="group text-left cursor-pointer"
              >
                <div className="relative h-36 sm:h-44 mb-4">
                  {/* Стопка фото за папкой — эффект "много снимков" */}
                  <div className={`absolute inset-x-4 top-3 h-full rounded-2xl bg-gradient-to-br ${back.gradient} opacity-40 rotate-[-6deg] transition-transform duration-300 group-hover:rotate-[-9deg]`} />
                  <div className={`absolute inset-x-2 top-1.5 h-full rounded-2xl bg-gradient-to-br ${mid.gradient} opacity-70 rotate-[3deg] transition-transform duration-300 group-hover:rotate-[5deg]`} />
                  <div className={`absolute inset-0 h-full rounded-2xl bg-gradient-to-br ${top.gradient} border border-white/10 overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/30`}>
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)',
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <HiOutlineFolder className="text-5xl sm:text-6xl text-accent/40" />
                    </div>
                    <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-primary/70 text-white/80 text-[11px]">
                      <HiOutlinePhotograph />
                      {folder.items.length}
                    </span>
                  </div>
                </div>
                <h3 className="font-bold group-hover:text-accent transition-colors">{folder.category}</h3>
                <p className="text-on-muted text-xs">{folder.items.length} фото</p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Альбом категории — современная адаптивная раскладка на react-photo-album */}
      <AnimatePresence>
        {openFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Закрываем только если клик пришёлся именно на сам фон (не на дочерние элементы) —
            // так надёжнее, чем полагаться на stopPropagation в каждом внутреннем элементе.
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpenCategory(null)
            }}
            className="fixed inset-0 z-[60] bg-primary-dark overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-6 sm:pb-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">{openFolder.category}</h3>
                  <p className="text-on-muted text-sm">{openFolder.items.length} фото</p>
                </div>
                <button
                  onClick={() => setOpenCategory(null)}
                  aria-label="Закрыть"
                  className="w-10 h-10 rounded-xl bg-surface border border-[var(--color-border)] flex items-center justify-center text-on-muted hover:text-accent hover:border-accent/30 transition-all"
                >
                  <HiX className="text-xl" />
                </button>
              </div>

              <RowsPhotoAlbum
                photos={albumPhotos}
                targetRowHeight={180}
                spacing={8}
                onClick={({ index }) => setLightboxIndex(index)}
                render={{
                  image: (_props, { photo, width, height }) => {
                    const project = (photo as AlbumPhoto).project
                    return (
                      // aspect-ratio держит высоту сама (как родной .react-photo-album--image),
                      // без него высота карточки схлопывалась в 0.
                      <div
                        style={{ width: '100%', aspectRatio: `${width} / ${height}` }}
                        className={`relative rounded-lg overflow-hidden bg-gradient-to-br ${project.gradient} cursor-pointer group/photo`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-2xl text-accent/30 group-hover/photo:scale-110 transition-transform">⚡</div>
                        {project.title && (
                          <span className="absolute bottom-0 inset-x-0 px-2 py-1 text-[11px] text-white/90 bg-primary/70 truncate">
                            {project.title}
                          </span>
                        )}
                      </div>
                    )
                  },
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        controller={{ closeOnBackdropClick: true }}
        render={{
          slide: ({ slide }) => {
            const { project } = slide as ProjectSlide
            return (
              // pointer-events-none пропускает клик по пустому полю дальше — на системный фон слайда,
              // чтобы closeOnBackdropClick мог его поймать. auto включаем только на самой карточке.
              <div className="w-full h-full flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-2xl pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                  <div className={`aspect-video rounded-2xl bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                    <div className="text-7xl text-accent/40">⚡</div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 justify-center">
                    <span className="text-accent text-sm font-medium">{project.category}</span>
                    {project.title && (
                      <>
                        <span className="text-white/30">·</span>
                        <span className="text-white text-sm font-bold">{project.title}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          },
        }}
        styles={{ container: { backgroundColor: 'rgba(6, 14, 26, 0.95)' } }}
      />
    </section>
  )
}
