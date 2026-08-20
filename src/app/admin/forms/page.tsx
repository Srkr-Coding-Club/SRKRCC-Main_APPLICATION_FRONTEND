'use client';

import { FormsRegistryTab } from '@/components/admin/FormsRegistryTab';
import { ManualEntryModal } from '@/components/admin/ManualEntryModal';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { useAdminSubtabNav } from '@/lib/hooks/useAdminSubtabNav';

export const dynamic = 'force-dynamic';

export default function AdminManageFormsPage() {
  const {
    publishedForms,
    showManualEntryModal,
    setShowManualEntryModal,
    selectedClosedForm,
    setSelectedClosedForm,
    manualEntryAnswers,
    setManualEntryAnswers,
    handleAdminManualEntrySubmit,
    handleFormStatusTransition,
    handleEditFormInBuilder,
  } = useAdminData();
  const switchSubtab = useAdminSubtabNav();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <FormsRegistryTab
          forms={publishedForms}
          onSwitchSubtab={switchSubtab}
          onStatusTransition={handleFormStatusTransition}
          onEditInBuilder={handleEditFormInBuilder}
          onOpenManualModal={(f) => {
            setSelectedClosedForm(f);
            setShowManualEntryModal(true);
          }}
        />

        <ManualEntryModal
          isOpen={showManualEntryModal}
          onClose={() => setShowManualEntryModal(false)}
          selectedForm={selectedClosedForm}
          onSubmit={handleAdminManualEntrySubmit}
          manualEntryAnswers={manualEntryAnswers}
          setManualEntryAnswers={setManualEntryAnswers}
        />
      </div>
    </div>
  );
}
