'use client';

import { Suspense, useState } from 'react';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { UserDirectory } from '@/components/admin/directory/UserDirectory';
import { EMPTY_NEW_USER } from '@/lib/adminUserForm';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  // The directory loads its own pages; this hook is only the "create account" form (include nothing: no other data is needed).
  const { showCreateUserModal, setShowCreateUserModal, newUser, setNewUser, handleCreateUser } = useAdminData({ include: [] });
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Suspense fallback={null}>
          <UserDirectory scope="users" onCreate={() => setShowCreateUserModal(true)} reloadKey={reloadKey} />
        </Suspense>

        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => { setShowCreateUserModal(false); setNewUser(EMPTY_NEW_USER); }}
          onSubmit={async (event) => { await handleCreateUser(event); setReloadKey((key) => key + 1); }}
          newUser={newUser}
          setNewUser={setNewUser}
        />
      </div>
    </div>
  );
}
