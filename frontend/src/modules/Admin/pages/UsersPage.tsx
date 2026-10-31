import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUserGroup, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import IconButton from '../components/IconButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types';

const AMBER = '#f59e0b';

function roleLabel(role: User['role']) {
  return role === 'SUPER_ADMIN' ? 'Супер-админ' : 'Админ';
}

function UserCard({
  admin,
  isSelf,
  onEdit,
  onDelete,
}: {
  admin: User;
  isSelf: boolean;
  onEdit: (admin: User) => void;
  onDelete: (admin: User) => void;
}) {
  return (
    <div
      onClick={() => onEdit(admin)}
      className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface border
        border-[var(--color-border)] hover:border-accent/30 cursor-pointer
        transition-[border-color,background-color,box-shadow] duration-200"
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent flex-shrink-0">
        <HiOutlineShieldCheck className="text-xl" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-bold text-on-surface truncate">{admin.name || admin.login}</h3>
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent whitespace-nowrap">
            {roleLabel(admin.role)}
          </span>
          {isSelf && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-primary border border-[var(--color-border)] text-on-muted whitespace-nowrap">
              Это вы
            </span>
          )}
        </div>
        <p className="text-sm text-on-muted/70 truncate mt-1">Логин: {admin.login}</p>
      </div>

      <div
        onClick={(event) => event.stopPropagation()}
        className="flex items-center gap-1 sm:gap-1.5 transition-opacity duration-200 opacity-100 sm:opacity-70 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <IconButton variant="ghost" label="Редактировать" onClick={() => onEdit(admin)}>
          <HiOutlinePencil />
        </IconButton>
        <IconButton
          variant="danger"
          label="Удалить"
          title={isSelf ? 'Нельзя удалить свою же учётную запись' : 'Удалить'}
          disabled={isSelf}
          onClick={() => onDelete(admin)}
        >
          <HiOutlineTrash />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * Управление администраторами: список, создание и редактирование — по
 * образцу CategoriesPage, только без перетаскивания (порядок тут не нужен).
 * Доступно только SUPER_ADMIN — страница защищена в App.tsx/AdminLayout,
 * бэкенд проверяет роль ещё раз на каждом запросе.
 */
export default function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { users, loading, deleteUser } = useUsers();
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreatePage = () => navigate('/admin/users/new');
  const openEditPage = (admin: User) => navigate(`/admin/users/${admin.id}/edit`);

  const requestDelete = (admin: User) => {
    if (admin.id === currentUser?.id) return;
    setConfirmUser(admin);
  };

  const handleConfirmDelete = async () => {
    if (!confirmUser) return;
    setDeleting(true);
    try {
      await deleteUser(confirmUser.id);
      toast.success('Администратор удалён');
      setConfirmUser(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить администратора');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Администраторы</h1>
          <p className="text-on-muted text-sm mt-1">
            Кто может входить в админку и менять данные своей учётной записи
          </p>
        </div>
        <motion.button
          onClick={openCreatePage}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${AMBER}, #d97706)`,
            color: '#0a1628',
            boxShadow: `0 4px 15px ${AMBER}40`,
            border: 'none',
          }}
        >
          <HiOutlinePlus className="text-lg" /> Добавить администратора
        </motion.button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="h-20 bg-surface/50 rounded-xl animate-pulse"
            />
          ))
        ) : users.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 rounded-2xl bg-surface/50 border border-[var(--color-border)] border-dashed"
          >
            <HiOutlineUserGroup className="text-4xl text-on-muted/30 mx-auto mb-3" />
            <p className="text-on-muted">Администраторов пока нет</p>
          </motion.div>
        ) : (
          // Без initial={false}: этот AnimatePresence монтируется впервые
          // именно в момент, когда loading становится false — с
          // initial={false} карточки на первом реальном появлении списка
          // выскакивали бы без анимации входа.
          <AnimatePresence>
            {users.map((admin) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <UserCard
                  admin={admin}
                  isSelf={admin.id === currentUser?.id}
                  onEdit={openEditPage}
                  onDelete={requestDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title="Удалить администратора?"
        description={
          confirmUser
            ? `Учётная запись «${confirmUser.login}» будет удалена без возможности восстановления.`
            : undefined
        }
        confirmLabel="Удалить"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setConfirmUser(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
