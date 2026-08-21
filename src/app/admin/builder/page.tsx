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
    handleResetBuilder,
    hasSavedCheckpoint,
    loadFormBySlug,
    resetNewForm,
    isLoadingBuilder,
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

  if (isLoadingBuilder) {
    return (
      <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white dark:bg-[#151722] border border-slate-200 dark:border-slate-800 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Loading Form Schema...</p>
          <p className="text-xs text-slate-400">Fetching latest schema and field configurations</p>
        </div>
      </div>
    );
  }

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
          onResetForm={handleResetBuilder}
          hasSavedCheckpoint={hasSavedCheckpoint}
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
