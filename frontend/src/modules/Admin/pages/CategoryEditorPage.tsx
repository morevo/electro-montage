import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineX, HiOutlineFolder } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { categoriesApi } from '../api';
import { refreshAdminData } from '../lib/refresh';

const AMBER = '#f59e0b';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-primary border border-[var(--color-border)] text-on-surface ' +
  'placeholder:text-on-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-sm';

/**
 * Отдельная страница вместо модалки — по образцу PhotoEditorPage.
 * Тогда формы категорий и фото устроены одинаково: заголовок с «назад»,
 * кнопки «Отмена»/«Сохранить», поля на весь экран, а переход
 * «список ↔ форма» анимируется общим AnimatePresence в App.tsx.
 */
export default function CategoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* Загрузка редактируемой категории */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    categoriesApi
      .getCategory(id)
      .then((category) => {
        if (cancelled) return;
        setName(category.name);
        setDescription(category.description || '');
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Не удалось загрузить категорию');
        navigate('/admin/categories', { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Введите название категории');
      return;
    }

    setSaving(true);
    try {
      // Слаг не спрашиваем: при создании его генерирует сервер из названия,
      // при переименовании он остаётся прежним, чтобы не ломать адреса.
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      if (isEdit) {
        await categoriesApi.updateCategory(id!, payload);
        toast.success('Категория обновлена');
      } else {
        await categoriesApi.createCategory(payload);
        toast.success('Категория создана');
      }
      refreshAdminData();
      navigate('/admin/categories');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сохранить категорию');
      setError(e instanceof Error ? e.message : 'Не удалось сохранить категорию');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            to="/admin/categories"
            className="mt-0.5 p-2 rounded-lg text-on-muted hover:text-on-surface hover:bg-surface border border-transparent hover:border-[var(--color-border)] transition-colors flex-shrink-0"
            aria-label="Назад к списку категорий"
            title="Назад к списку"
          >
            <HiOutlineArrowLeft className="text-xl" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface truncate">
              {isEdit ? 'Редактировать категорию' : 'Новая категория'}
            </h1>
            <p className="text-on-muted text-sm mt-1">
              Категория — это раздел портфолио, который видит посетитель сайта
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/admin/categories')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-surface border border-[var(--color-border)] hover:border-accent/30 transition-colors"
          >
            Отмена
          </button>
          <motion.button
            type="submit"
            form="category-editor-form"
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
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="category-skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-72 rounded-2xl bg-surface/40 animate-pulse"
          />
        ) : (
          <motion.form
            key="category-form"
            id="category-editor-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start"
          >
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

              <div>
                <label htmlFor="category-name" className="block text-sm font-medium text-on-muted mb-1.5">
                  Название <span className="text-accent">*</span>
                </label>
                <input
                  id="category-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Электропроводка"
                  className={inputClass}
                  autoFocus={!isEdit}
                />
              </div>

              <div>
                <label htmlFor="category-description" className="block text-sm font-medium text-on-muted mb-1.5">
                  Описание
                </label>
                <textarea
                  id="category-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание категории — показывается на сайте"
                  rows={5}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-[11px] text-on-muted/40 mt-1 text-right">{description.length} символов</p>
              </div>
            </div>

            {/* Подсказки */}
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/60 border border-[var(--color-border)] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                    <HiOutlineFolder className="text-lg" />
                  </span>
                  <div className="text-xs text-on-muted/70 leading-relaxed">
                    <p className="font-semibold text-on-surface text-sm mb-1.5">Что дальше</p>
                    <p className="mb-2">
                      Порядок разделов на сайте задаётся в списке категорий — стрелками ↑↓ или
                      перетаскиванием за ручку.
                    </p>
                    <p>
                      Фото загружаются на отдельной странице «Фото»: каждое фото относится к
                      выбранной категории.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-primary/60 border border-[var(--color-border)] p-4">
                <p className="text-xs text-on-muted/70 leading-relaxed">
                  {isEdit
                    ? 'Переименование категории безопасно: фото остаются на месте, меняется только название раздела.'
                    : 'Название должно отличаться от уже существующих категорий — иначе сервер ответит ошибкой. Адрес категории сервер сделает сам.'}
                </p>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
