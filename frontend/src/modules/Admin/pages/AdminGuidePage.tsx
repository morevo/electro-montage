import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineBookOpen,
  HiOutlineFolder,
  HiOutlinePhotograph,
  HiOutlineArrowRight,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineLightBulb,
  HiOutlineExclamationCircle,
  HiOutlineDownload,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
} from 'react-icons/hi';

const AMBER = '#f59e0b';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

/* ── Карточка раздела ── */
function Section({
  icon: Icon,
  title,
  lead,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lead: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      {...fadeUp}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl bg-surface border border-[var(--color-border)] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent flex-shrink-0">
          <Icon className="text-xl" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-on-surface">{title}</h2>
          <p className="text-sm text-on-muted mt-0.5">{lead}</p>
        </div>
      </div>
      <div className="space-y-3 text-sm text-on-muted leading-relaxed">{children}</div>
    </motion.section>
  );
}

/* ── Пункт списка с маркером ── */
function Point({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: AMBER }}
        aria-hidden
      />
      <p className="min-w-0">{children}</p>
    </div>
  );
}

/* ── Подсказка ── */
function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-accent/20 bg-accent/[0.06] px-3.5 py-3 text-[13px] text-on-surface/90">
      <HiOutlineLightBulb className="text-accent text-base flex-shrink-0 mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const steps = [
  {
    n: 1,
    title: 'Создайте категории',
    text: 'Категория — это раздел портфолио: «Щиты», «Освещение», «Проводка».',
    to: '/admin/categories',
    action: 'Категории',
    icon: HiOutlineFolder,
  },
  {
    n: 2,
    title: 'Загрузите фото',
    text: 'Каждое фото попадает в выбранную категорию и сразу появляется на сайте.',
    to: '/admin/photos',
    action: 'Фото',
    icon: HiOutlinePhotograph,
  },
  {
    n: 3,
    title: 'Расставьте порядок',
    text: 'Стрелками или перетаскиванием за ручку — так фото увидят посетители.',
    to: '/admin/photos',
    action: 'Порядок',
    icon: HiOutlineChevronUp,
  },
];

export default function AdminGuidePage() {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-4xl">
      {/* ── Шапка ── */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-accent/20 p-6 sm:p-8"
        style={{
          background:
            'radial-gradient(120% 120% at 0% 0%, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.04) 38%, transparent 70%), var(--color-surface)',
          boxShadow: `0 20px 60px ${AMBER}0d`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-accent bg-accent/12 border border-accent/25">
          <HiOutlineBookOpen className="text-sm" />
          Инструкция
        </span>

        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-on-surface">
          Как работать с админкой
        </h1>
        <p className="mt-2 text-sm sm:text-base text-on-muted max-w-2xl">
          Коротко и по-человечески: как добавить категорию, загрузить фото и расставить их в нужном
          порядке. Специальных знаний не нужно — всё делается кнопками и перетаскиванием.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <Link
            to="/admin/categories"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#0a1628] transition-transform hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${AMBER}, #d97706)`, boxShadow: `0 6px 20px ${AMBER}40` }}
          >
            <HiOutlineFolder className="text-base" />
            Начать с категорий
          </Link>
          <Link
            to="/admin/photos"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-on-surface bg-primary border border-[var(--color-border)] hover:border-accent/40 transition-colors"
          >
            <HiOutlinePhotograph className="text-base" />
            Перейти к фото
          </Link>
        </div>
      </motion.div>

      {/* ── Три шага ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.n}
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl bg-surface border border-[var(--color-border)] p-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-[#0a1628] flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #d97706)` }}
              >
                {step.n}
              </span>
              <step.icon className="text-on-muted/60 text-lg" />
            </div>
            <h3 className="font-bold text-sm text-on-surface">{step.title}</h3>
            <p className="text-xs text-on-muted mt-1 flex-1">{step.text}</p>
            <Link
              to={step.to}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:gap-2 transition-all"
            >
              {step.action}
              <HiOutlineArrowRight className="text-sm" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Категории ── */}
      <Section
        icon={HiOutlineFolder}
        title="Категории"
        lead="Разделы, по которым на сайте сгруппировано портфолио."
        delay={0.1}
      >
        <Point>
          Кнопка <b className="text-on-surface">«Добавить категорию»</b> открывает отдельную
          страницу с двумя полями: <b className="text-on-surface">название</b> и{' '}
          <b className="text-on-surface">описание</b>. Та же страница открывается, когда
          правите существующий раздел.
        </Point>
        <Point>
          Отдельного поля для адреса страницы больше нет: короткий адрес (слаг) сервер делает сам
          из названия и при переименовании не меняет — ссылки на сайте остаются рабочими.
        </Point>
        <Point>
          <b className="text-on-surface">Описание</b> необязательно: одна короткая фраза, которая
          поясняет, какие работы в разделе.
        </Point>
        <Point>
          Карандаш <HiOutlinePencil className="inline text-sm text-accent" /> открывает ту же
          страницу для правки, а корзина <HiOutlineTrash className="inline text-sm text-red-400" />
          удаляет категорию <b className="text-on-surface">вместе со всеми фото внутри</b>.
        </Point>
        <Tip>
          Создайте категории до загрузки фото — при добавлении фото категорию нужно выбрать
          обязательно, и список берётся именно отсюда.
        </Tip>
      </Section>

      {/* ── Фото ── */}
      <Section
        icon={HiOutlinePhotograph}
        title="Фото"
        lead="Загрузка, подписи и замена изображений."
        delay={0.12}
      >
        <Point>
          <b className="text-on-surface">«Загрузить фото»</b> открывает редактор. Файлы можно
          выбрать кнопкой, перетащить в рамку или вставить из буфера через{' '}
          <b className="text-on-surface">Ctrl+V</b>.
        </Point>
        <Point>
          <b className="text-on-surface">Можно загрузить сразу несколько фото</b> — до 20 штук за
          раз. Выделите их в окне выбора (Ctrl+клик или Shift+клик), и они появятся сеткой превью:
          название у каждого берётся из имени файла и правится прямо на превью, а категория и
          описание — общие для всей пачки.
        </Point>
        <Point>
          Форматы: JPG, PNG, WebP. Максимальный размер каждого файла —{' '}
          <b className="text-on-surface">10 МБ</b>. Большую картинку лучше сжать заранее — сайт
          грузится быстрее.
        </Point>
        <Point>
          <b className="text-on-surface">Название</b> видно посетителю под фото,{' '}
          <b className="text-on-surface">описание</b> — короткая строка о работе.
        </Point>
        <Point>
          На карточке фото есть кнопки: скачать{' '}
          <HiOutlineDownload className="inline text-sm text-accent" />, открыть оригинал и
          редактировать.
        </Point>
        <Point>
          <b className="text-on-surface">Удаление по одному и пачкой.</b> На каждой карточке есть
          чекбокс в левом нижнем углу превью: отметьте несколько фото — внизу появится панель с
          кнопкой «Удалить». Перед удалением админка спросит подтверждение. Файлы стираются с
          сервера без возможности восстановления.
        </Point>
        <Tip>
          Заменить картинку у уже загруженного фото нельзя: загрузите новое фото и удалите старое.
          Название и категорию при этом менять можно в любой момент.
        </Tip>
      </Section>

      {/* ── Порядок ── */}
      <Section
        icon={HiOutlineChevronUp}
        title="Порядок категорий и фото"
        lead="Порядок в админке — это порядок на сайте."
        delay={0.14}
      >
        <Point>
          <b className="text-on-surface">Стрелки ↑ ↓</b> на карточке — самый надёжный способ: одно
          нажатие поднимает или опускает элемент на одну позицию.
        </Point>
        <Point>
          <b className="text-on-surface">Ручка из шести точек</b> слева — для перетаскивания: нажмите
          и, не отпуская, ведите карточку. Пока вы её держите, остальные элементы расходятся и
          освобождают место — видно, куда именно она встанет.
        </Point>
        <Point>
          Сохраняется автоматически, отдельной кнопки нет. После отпускания появится сообщение
          «Порядок обновлён».
        </Point>
        <Point>
          У фото порядок действует <b className="text-on-surface">внутри выбранной категории</b>.
          Поэтому в фильтре «Все категории» ручка неактивна — выберите категорию, и порядок снова
          можно менять.
        </Point>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary border border-[var(--color-border)] text-xs text-on-muted">
            <HiOutlineChevronUp className="text-accent" /> выше
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary border border-[var(--color-border)] text-xs text-on-muted">
            <HiOutlineChevronDown className="text-accent" /> ниже
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary border border-[var(--color-border)] text-xs text-on-muted">
            <span className="tracking-[0.15em] text-accent">⋮⋮</span> перетащить
          </span>
        </div>
      </Section>

      {/* ── Администраторы ── */}
      <Section
        icon={HiOutlineUserGroup}
        title="Администраторы"
        lead="Кто может входить в админку и менять данные своей учётной записи."
        delay={0.15}
      >
        <Point>
          Раздел <b className="text-on-surface">«Администраторы»</b> в меню слева виден только
          супер-админу. Там — список всех, кто может войти в админку, кнопка «Добавить
          администратора» и редактирование каждой учётной записи.
        </Point>
        <Point>
          <b className="text-on-surface">Новый администратор</b>: логин (без «@», только латиница,
          цифры, точка, дефис, подчёркивание), имя — по желанию, пароль от 6 символов. Сразу после
          создания он может входить в админку с этими данными.
        </Point>
        <Point>
          <b className="text-on-surface">Свои данные</b> правятся там же: откройте свою карточку
          (отмечена подписью «Это вы») — можно поменять логин, имя и пароль. Поле «Пароль» можно
          оставить пустым, тогда он не изменится.
        </Point>
        <Point>
          <HiOutlineShieldCheck className="inline text-sm text-accent" />{' '}
          <b className="text-on-surface">Роль</b>: «Супер-админ» видит раздел «Администраторы» и
          управляет остальными; «Админ» работает с категориями и фото, но этот раздел ему не
          виден. Себе роль поменять нельзя — это защита от случайной потери доступа.
        </Point>
        <Point>
          Удалить можно любого администратора, кроме самого себя — кнопка удаления для своей
          строки отключена специально.
        </Point>
        <Tip>
          Если администраторов должно быть несколько — заведите отдельную учётную запись каждому,
          а не делитесь одним паролем. Так понятно, кто и что менял, и можно забрать доступ у
          одного человека, не трогая остальных.
        </Tip>
      </Section>

      {/* ── Что видит посетитель ── */}
      <Section
        icon={HiOutlineBookOpen}
        title="Что видит посетитель"
        lead="Портфолио на сайте собирается из того, что вы сделали в админке."
        delay={0.16}
      >
        <Point>
          Фото показываются по категориям, сверху — те, что вы поставили первыми.
        </Point>
        <Point>
          Новая категория и новое фото появляются на сайте сразу после сохранения — обновлять
          ничего не нужно.
        </Point>
        <Point>
          Пустая категория на сайте не показывается, поэтому можно спокойно создать раздел заранее.
        </Point>
      </Section>

      {/* ── Если что-то пошло не так ── */}
      <Section
        icon={HiOutlineExclamationCircle}
        title="Если что-то не получилось"
        lead="Три частые ситуации и что делать."
        delay={0.18}
      >
        <Point>
          <b className="text-on-surface">Не появляется категория в списке фото</b> — обновите
          страницу: список категорий подгружается один раз при открытии.
        </Point>
        <Point>
          <b className="text-on-surface">Фото не загружается</b> — проверьте размер (до 10 МБ) и
          формат: JPG, PNG или WebP.
        </Point>
        <Point>
          <b className="text-on-surface">Порядок не меняется</b> — в фильтре выбрано «Все категории».
          Выберите конкретную категорию.
        </Point>
        <Point>
          Если ничего не помогает — выйдите и войдите заново через кнопку «Выйти» внизу меню.
        </Point>
      </Section>

      <motion.p
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-[11px] text-on-muted/40 text-center pt-1"
      >
        Инструкция всегда доступна в меню слева — раздел «Инструкция».
      </motion.p>
    </div>
  );
}
