import { useState, useRef, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { HiOutlineFolder, HiOutlinePhotograph, HiOutlineDownload, HiX } from 'react-icons/hi'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Download from 'yet-another-react-lightbox/plugins/download'
import type { Slide } from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { publicApi } from '../../Shared/api'
import type { Category as AdminCategory, Photo as AdminPhoto } from '../../Shared/types'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  sortOrder: number
  photos: Photo[]
}

interface Photo {
  id: string
  title: string
  description?: string
  filename: string
  width: number | null
  height: number | null
  sortOrder: number
  url: string
  category?: string
  categoryObj?: Pick<AdminCategory, 'id' | 'name' | 'slug'>
}

interface Folder {
  category: string
  items: Photo[]
}

export default function Portfolio() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const data = await publicApi.getCategories()
        // Преобразуем админ-категории в локальные с обязательным photos
        const transformed: Category[] = data.map(cat => ({
          ...cat,
          photos: (cat.photos ?? []).map(p => {
            const { category: adminCategory, ...rest } = p
            return {
              ...rest,
              url: p.url || `/uploads/portfolio/${p.filename}`,
              category: adminCategory?.name,
              categoryObj: adminCategory,
            }
          }),
        }))
        setCategories(transformed)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки портфолио')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const folders: Folder[] = categories
    .map(cat => ({
      category: cat.name,
      items: (cat.photos ?? [])
        .map((photo) => ({
          ...photo,
          url: photo.url || `/uploads/portfolio/${photo.filename}`,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    // Пустые категории не рисуем — иначе нет обложки
    .filter(folder => folder.items.length > 0)

  const openFolder = folders.find((f) => f.category === openCategory) ?? null

  const slides: Slide[] = (openFolder?.items ?? []).map((project) => ({
    src: project.url,
    width: project.width ?? undefined,
    height: project.height ?? undefined,
    alt: project.title,
    title: project.title,
    // Показываем описание, добавленное в админке; иначе — категорию
    description: project.description?.trim() || project.category,
  }))

  if (loading) {
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
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                className="h-44 sm:h-52 bg-surface/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id="portfolio" className="py-6 relative" ref={ref}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center py-12">
          <p className="text-red-400">{error}</p>
        </div>
      </section>
    )
  }

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
                  <div
                    className="absolute inset-x-4 top-3 h-full rounded-2xl bg-surface bg-contain bg-no-repeat bg-center opacity-40 rotate-[-6deg] transition-transform duration-300 group-hover:rotate-[-9deg]"
                    style={{ backgroundImage: `url(${back.url})` }}
                  />
                  <div
                    className="absolute inset-x-2 top-1.5 h-full rounded-2xl bg-surface bg-contain bg-no-repeat bg-center opacity-70 rotate-[3deg] transition-transform duration-300 group-hover:rotate-[5deg]"
                    style={{ backgroundImage: `url(${mid.url})` }}
                  />
                  <div
                    className="absolute inset-0 h-full rounded-2xl bg-surface bg-contain bg-no-repeat bg-center border border-white/10 overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/30"
                    style={{ backgroundImage: `url(${top.url})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white/80">
                      <HiOutlineFolder className="text-xl" />
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

      <AnimatePresence>
        {openFolder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {(openFolder?.items ?? []).map((project, index) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group/photo bg-surface border border-[var(--color-border)] hover:border-accent/40 transition-colors"
                  >
                    <img
                      src={project.url}
                      alt={project.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover/photo:scale-105"
                    />
                    <span className="absolute bottom-0 inset-x-0 px-2 py-1 text-[11px] text-white/90 bg-primary/70 truncate opacity-0 group-hover/photo:opacity-100 transition-opacity">
                      {project.title}
                    </span>
                    {/* Скачать фото — кнопка есть и здесь, и в лайтбоксе */}
                    <a
                      href={project.url}
                      download={project.filename}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Скачать ${project.title}`}
                      title="Скачать фото"
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-primary/80 border border-white/10 flex items-center justify-center text-white/80 hover:text-accent hover:border-accent/40 transition-all opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
                    >
                      <HiOutlineDownload />
                    </a>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        plugins={[Zoom, Captions, Download]}
        controller={{ closeOnBackdropClick: true }}
        zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300, doubleClickDelay: 300, pinchZoomDistanceFactor: 100, scrollToZoom: true }}
        styles={{ container: { backgroundColor: 'rgba(6, 14, 26, 0.95)' } }}
      />
    </section>
  )
}