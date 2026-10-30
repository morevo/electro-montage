import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlinePhotograph,
  HiOutlineDownload,
  HiOutlineSave,
  HiOutlineX,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { photosApi } from '../api';
import { useCategories } from '../hooks/useCategories';
import { refreshAdminData } from '../lib/refresh';
import Select from '../components/Select';
import IconButton from '../components/IconButton';
import type { Photo } from '../types';

const AMBER = '#f59e0b';
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 20;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface ' +
  'placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm';

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Название из имени файла: "schit-v-dome.jpg" → "Schit v dome" */
function titleFromFile(file: File) {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return 'Фото';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

interface PendingPhoto {
  id: string;
  file: File;
  url: string;
  title: string;
}

/**
 * Отдельная страница вместо модалки: большая форма (фото + метаданные)
 * удобнее на весь экран, а переход между списком и редактором анимирован
 * в App.tsx.
 *
 * Режим создания принимает сразу несколько файлов: они показываются сеткой
 * с названиями, а сохранение уходит одним пакетным запросом.
 */
export default function PhotoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [items, setItems] = useState<PendingPhoto[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [existing, setExisting] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  // Копия items для уборки blob-URL при размонтировании
  const itemsRef = useRef<PendingPhoto[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /* Категория по умолчанию для нового фото */
  useEffect(() => {
    if (!isEdit && !categoryId && categories[0]) setCategoryId(categories[0].id);
  }, [categories, categoryId, isEdit]);

  /* Загрузка редактируемого фото */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    photosApi
      .getPhoto(id)
      .then((photo) => {
        if (cancelled) return;
        setExisting(photo);
        setTitle(photo.title);
        setDescription(photo.description || '');
        setCategoryId(photo.categoryId);
        setPreview(photo.url || `/uploads/portfolio/${photo.filename}`);
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Не удалось загрузить фото');
        navigate('/admin/photos', { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  /* Освобождение blob-URL */
  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    },
    []
  );

  const validate = (file: File): string | null => {
    if (!ALLOWED.includes(file.type)) return 'Поддерживаются только JPG, PNG и WebP';
    if (file.size > MAX_SIZE) return 'Файл больше 10 МБ';
    return null;
  };

  /** Режим редактирования: одно фото-замена для предпросмотра */
  const acceptSingle = useCallback((nextFile: File | undefined) => {
    if (!nextFile) return false;
    const problem = validate(nextFile);
    if (problem) {
      setError(problem);
      return false;
    }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    blobUrlRef.current = url;
    setError('');
    setPreview(url);
    if (!title.trim()) setTitle(titleFromFile(nextFile));
    return true;
  }, [title]);

  /** Режим создания: добавляем сразу пачку файлов */
  const acceptMany = useCallback((fileList: FileList | File[] | null | undefined) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const problems: string[] = [];
    const accepted: PendingPhoto[] = [];

    // Всё считаем ДО setState: в StrictMode React вызывает updater дважды,
    // и побочные эффекты внутри него (createObjectURL, push) дублируют файлы.
    let room = MAX_FILES - itemsRef.current.length;
    for (const file of incoming) {
      const problem = validate(file);
      if (problem) {
        problems.push(`${file.name}: ${problem}`);
        continue;
      }
      if (room <= 0) {
        problems.push(`За один раз можно загрузить не больше ${MAX_FILES} фото`);
        break;
      }
      room -= 1;
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
        title: titleFromFile(file),
      });
    }

    if (accepted.length > 0) {
      setItems((prev) => [...prev, ...accepted].slice(0, MAX_FILES));
    }
    setError(problems.length > 0 ? problems.join('; ') : '');
  }, []);

  const acceptFiles = useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      if (isEdit) {
        acceptSingle(Array.from(fileList || [])[0]);
        return;
      }
      acceptMany(fileList);
    },
    [isEdit, acceptSingle, acceptMany]
  );

  /* Вставка изображений из буфера */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      const pasted: File[] = [];
      for (const item of Array.from(clipboardItems)) {
        if (item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) pasted.push(pastedFile);
        }
      }
      if (pasted.length > 0) {
        e.preventDefault();
        acceptFiles(pasted);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [acceptFiles]);

  const removeItem = (itemId: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === itemId);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== itemId);
    });
  };

  const clearAllItems = () => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const clearReplacement = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreview(existing ? existing.url || `/uploads/portfolio/${existing.filename}` : null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: cat.name })),
    [categories]
  );

  const canDownload = Boolean(existing);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) return setError('Выберите категорию');

    if (isEdit) {
      if (!existing) return;
      if (!title.trim()) return setError('Введите название фото');
      setSaving(true);
      try {
        await photosApi.updatePhoto(existing.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          categoryId,
        });
        refreshAdminData();
        toast.success('Изменения сохранены');
        navigate('/admin/photos');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Не удалось сохранить фото');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (items.length === 0) return setError('Выберите хотя бы одно фото');

    setSaving(true);
    try {
      const titles = items.map((item) => item.title.trim() || titleFromFile(item.file));
      const commonDescription = description.trim() || undefined;

      if (items.length === 1) {
        await photosApi.uploadPhoto(categoryId, items[0].file, titles[0], commonDescription);
      } else {
        await photosApi.uploadPhotos(
          categoryId,
          items.map((item) => item.file),
          titles,
          commonDescription
        );
      }

      refreshAdminData();
      toast.success(
        items.length === 1 ? 'Фото загружено' : `Загружено фото: ${items.length}`
      );
      navigate('/admin/photos');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось загрузить фото');
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = isEdit ? preview : null;
  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/admin/photos"
            className="mt-0.5 p-2 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface border border-transparent hover:border-[var(--color-border)] transition-colors flex-shrink-0"
            aria-label="Назад к списку фото"
            title="Назад к списку"
          >
            <HiOutlineArrowLeft className="text-xl" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface truncate">
              {isEdit ? 'Редактировать фото' : 'Новые фото'}
            </h1>
            <p className="text-on-muted text-sm mt-1">
              {isEdit
                ? 'Обновите название, описание или категорию'
                : 'Можно выбрать сразу несколько файлов — до 20 за раз'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/admin/photos')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-colors"
          >
            Отмена
          </button>
          <motion.button
            type="submit"
            form="photo-editor-form"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
              color: '#0a1628',
              boxShadow: `0 4px 15px ${AMBER}40`,
              border: 'none',
            }}
          >
            <HiOutlineSave className="text-lg" />
            {saving
              ? 'Сохранение…'
              : isEdit
                ? 'Сохранить'
                : items.length > 1
                  ? `Загрузить ${items.length}`
                  : 'Загрузить'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div
          key="editor-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-72 rounded-2xl bg-surface/40 animate-pulse"
        />
      ) : (
        <motion.form
          key="editor-form"
          id="photo-editor-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start"
        >
          {/* Изображение / изображения */}
          <div className="space-y-3">
            {!isEdit && items.length > 0 ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    acceptFiles(e.dataTransfer.files);
                  }}
                  className={`grid grid-cols-2 items-start gap-3 rounded-2xl p-3 transition-colors
                    ${dragging
                      ? 'border-2 border-dashed border-accent bg-accent/10'
                      : 'border border-[var(--color-border)] bg-primary'}`}
                >
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="relative rounded-xl overflow-hidden bg-surface border border-[var(--color-border)]"
                      >
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full aspect-[4/3] object-cover"
                        />
                        {/* Та же кнопка, что в списках фото и категорий */}
                        <IconButton
                          variant="glass-danger"
                          className="absolute top-2 right-2"
                          label={`Убрать ${item.file.name}`}
                          title="Убрать файл"
                          onClick={() => removeItem(item.id)}
                        >
                          <HiOutlineTrash />
                        </IconButton>
                        <div className="p-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id ? { ...row, title: e.target.value } : row
                                )
                              )
                            }
                            placeholder="Название фото"
                            className="w-full px-2 py-1.5 rounded-lg bg-primary border border-[var(--color-border)] text-on-surface text-[11px] outline-none focus:border-accent transition-colors"
                            aria-label={`Название для ${item.file.name}`}
                          />
                          <p className="text-[10px] text-on-muted/50 mt-1 truncate">
                            {formatSize(item.file.size)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Копия карточки фото: медиа 4:3 и точно такой же подвал
                      (те же p-2, py-1.5, text-[11px], mt-1). Поэтому плитка
                      совпадает по высоте с соседним фото и не «прыгает»,
                      когда переносится на новую строку. */}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="group self-start flex flex-col rounded-xl overflow-hidden text-center
                               border border-dashed border-[var(--color-border)] bg-primary
                               text-on-muted hover:text-accent hover:border-accent/60 hover:bg-accent/[0.06]
                               transition-colors"
                  >
                    <span className="w-full shrink-0 aspect-[4/3] flex flex-col items-center justify-center gap-1 px-2">
                      <HiOutlineUpload className="text-2xl transition-transform group-hover:-translate-y-0.5" />
                      <span className="text-[11px] font-medium leading-tight">Добавить ещё</span>
                    </span>
                    <span className="block p-2 text-left">
                      <span className="block px-2 py-1.5 rounded-lg border border-transparent
                                       text-[11px] leading-normal truncate">
                        Ещё {Math.max(0, MAX_FILES - items.length)} из {MAX_FILES}
                      </span>
                      <span className="block text-[10px] mt-1 text-on-muted/50 truncate">
                        JPG, PNG, WebP
                      </span>
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-muted/50">
                  <span>
                    Выбрано: {items.length} · {formatSize(totalSize)}
                  </span>
                  <button
                    type="button"
                    onClick={clearAllItems}
                    className="text-red-400/80 hover:text-red-400 transition-colors"
                  >
                    Очистить всё
                  </button>
                </div>
              </>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  acceptFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center text-center cursor-pointer transition-all
                  ${dragging
                    ? 'border-2 border-dashed border-accent bg-accent/10'
                    : 'border border-[var(--color-border)] bg-primary hover:border-accent/40'}`}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Предпросмотр" className="w-full h-full object-contain" />
                    <div
                      className="absolute top-2 right-2 flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canDownload && (
                        <IconButton
                          href={previewUrl}
                          download={existing?.originalName || 'photo.webp'}
                          label="Скачать фото"
                          title="Скачать фото"
                        >
                          <HiOutlineDownload />
                        </IconButton>
                      )}
                      <IconButton
                        variant="glass-danger"
                        label="Сбросить выбранный файл"
                        title="Убрать выбранный файл"
                        onClick={clearReplacement}
                      >
                        <HiOutlineTrash />
                      </IconButton>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        inputRef.current?.click();
                      }}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
                    >
                      Заменить файл
                    </button>
                  </>
                ) : (
                  <div className="px-6 text-on-muted/70">
                    <HiOutlineUpload className="text-4xl mx-auto mb-3 text-accent/70" />
                    <p className="text-sm font-medium text-on-surface">Перетащите фото сюда</p>
                    <p className="text-xs mt-1">или нажмите, чтобы выбрать файлы</p>
                    <p className="text-[11px] mt-3 text-on-muted/50">
                      JPG, PNG, WebP · до 10 МБ · можно вставить через Ctrl+V
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={!isEdit}
              onChange={(e) => {
                acceptFiles(e.target.files);
                // Сбрасываем value, чтобы можно было выбрать те же файлы снова
                e.target.value = '';
              }}
              className="hidden"
            />

            {isEdit && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-on-muted/50">
                <span className="inline-flex items-center gap-1">
                  <HiOutlinePhotograph /> {existing?.originalName || 'Файл не выбран'}
                </span>
                {existing?.width && existing?.height && (
                  <span>
                    {existing.width}×{existing.height}
                  </span>
                )}
              </div>
            )}

            <p className="text-[11px] text-on-muted/50">
              Скопируйте картинку и нажмите Ctrl+V — изображение подставится автоматически.
            </p>
          </div>

          {/* Поля */}
          <div className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl text-sm text-red-400 bg-red-400/10 border border-red-400/20"
              >
                <HiOutlineX className="text-base mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {isEdit && (
              <div>
                <label htmlFor="photo-title" className="block text-sm font-medium text-on-muted mb-1.5">
                  Название <span className="text-accent">*</span>
                </label>
                <input
                  id="photo-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Щит в частном доме"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-on-muted mb-1.5">
                Категория <span className="text-accent">*</span>
              </label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                placeholder="Выберите категорию"
                ariaLabel="Категория фото"
                disabled={categories.length === 0}
              />
              {categories.length === 0 && (
                <p className="text-[11px] text-amber-400/80 mt-1.5">
                  Сначала создайте категорию на странице «Категории».
                </p>
              )}
            </div>

            <div>
              <label htmlFor="photo-description" className="block text-sm font-medium text-on-muted mb-1.5">
                {isEdit ? 'Описание' : 'Описание (для всех фото)'}
              </label>
              <textarea
                id="photo-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Короткое описание работы — показывается на сайте под фото"
                rows={4}
                className={`${inputClass} resize-none`}
              />
              <p className="text-[11px] text-on-muted/40 mt-1 text-right">{description.length} символов</p>
            </div>

            <div className="rounded-xl bg-primary/60 border border-[var(--color-border)] p-4">
              <p className="text-xs text-on-muted/70">
                {isEdit
                  ? 'Порядок фото в категории меняется перетаскиванием в списке. Замена изображения у существующего фото пока недоступна — загрузите новое и удалите старое.'
                  : 'Названия берутся из имён файлов — их можно поправить прямо на превью. Порядок фото задаётся после загрузки: выберите категорию в списке и перетаскивайте карточки.'}
              </p>
            </div>
          </div>
        </motion.form>
      )}
      </AnimatePresence>
    </div>
  );
}
