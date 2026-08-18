'use client';

import { UsersTab } from '@/components/admin/UsersTab';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  const {
    userSearch,
    setUserSearch,
    filteredUsers,
    showCreateUserModal,
    setShowCreateUserModal,
    newUser,
    setNewUser,
    handleCreateUser,
    handleRoleChange,
  } = useAdminData();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <UsersTab
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          filteredUsers={filteredUsers}
          onOpenCreateModal={() => setShowCreateUserModal(true)}
          onRoleChange={handleRoleChange}
        />

        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSubmit={handleCreateUser}
          newUser={newUser}
          setNewUser={setNewUser}
        />
      </div>
    </div>
  );
}
