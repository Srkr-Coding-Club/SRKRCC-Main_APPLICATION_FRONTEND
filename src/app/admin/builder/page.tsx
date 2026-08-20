'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FormBuilderTab } from '@/components/admin/FormBuilderTab';
import { TestDataModal } from '@/components/admin/TestDataModal';
import { useAdminData } from '@/lib/hooks/useAdminData';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function BuilderContent() {
  const searchParams = useSearchParams();
  const formSlug = searchParams.get('slug');
  const isNew = searchParams.get('new');

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
    loadFormBySlug,
    resetNewForm,
    previewAnswers,
    setPreviewAnswers,
    handleTestPreviewSubmit,
    showTestDataModal,
    setShowTestDataModal,
    submittedTestData,
  } = useAdminData();

  useEffect(() => {
    if (formSlug) {
      loadFormBySlug(formSlug);
    } else if (isNew === 'true') {
      resetNewForm();
    }
  }, [formSlug, isNew]);

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

export default function AdminBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#0D0E15]">
          <div className="flex items-center space-x-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="text-sm font-medium">Loading Form Canvas...</span>
          </div>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}
