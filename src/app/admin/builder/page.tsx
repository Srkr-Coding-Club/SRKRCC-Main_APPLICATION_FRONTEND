'use client';

import { FormBuilderTab } from '@/components/admin/FormBuilderTab';
import { TestDataModal } from '@/components/admin/TestDataModal';
import { useAdminData } from '@/lib/hooks/useAdminData';

export const dynamic = 'force-dynamic';

export default function AdminBuilderPage() {
  const {
    isPreviewMode,
    setIsPreviewMode,
    formMeta,
    setFormMeta,
    builderFields,
    handleAddFieldFromPalette,
    handleAddFieldAtIndex,
    handleRemoveField,
    handleFieldChange,
    handleDuplicateField,
    handleReorderFields,
    handleSaveForm,
    previewAnswers,
    setPreviewAnswers,
    handleTestPreviewSubmit,
    showTestDataModal,
    setShowTestDataModal,
    submittedTestData,
  } = useAdminData();

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <FormBuilderTab
          isPreviewMode={isPreviewMode}
          setIsPreviewMode={setIsPreviewMode}
          formMeta={formMeta}
          setFormMeta={setFormMeta}
          builderFields={builderFields}
          onAddFieldFromPalette={handleAddFieldFromPalette}
          onAddFieldAtIndex={handleAddFieldAtIndex}
          onDuplicateField={handleDuplicateField}
          onReorderFields={handleReorderFields}
          onRemoveField={handleRemoveField}
          onFieldChange={handleFieldChange}
          onSaveForm={handleSaveForm}
          previewAnswers={previewAnswers}
          setPreviewAnswers={setPreviewAnswers}
          onTestPreviewSubmit={handleTestPreviewSubmit}
        />

        <TestDataModal
          isOpen={showTestDataModal}
          onClose={() => setShowTestDataModal(false)}
          submittedTestData={submittedTestData}
        />
      </div>
    </div>
  );
}
