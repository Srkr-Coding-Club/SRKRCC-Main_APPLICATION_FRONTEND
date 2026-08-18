'use client';

import React, { useState } from 'react';
import { Activity, FileText, Inbox, Upload, Users } from 'lucide-react';
import { Form } from '@/lib/types';
import { DataHealthTab } from './DataHealthTab';
import { FormsRegistryTab } from './FormsRegistryTab';
import { ResponsesViewerTab } from './ResponsesViewerTab';
import { CSVIngestionTab } from './CSVIngestionTab';
import { MembersTab } from './MembersTab';

interface ManageFormsTabProps {
  publishedForms: Form[] | { results?: Form[] };
  onOpenManualModal: (form: Form) => void;
}

type SubTabId = 'health' | 'forms' | 'responses' | 'csv' | 'members';

interface SubTabItem {
  id: SubTabId;
  label: string;
  icon: React.ElementType;
}

const SUBTABS: SubTabItem[] = [
  { id: 'health', label: 'Data Health', icon: Activity },
  { id: 'forms', label: 'Forms Registry', icon: FileText },
  { id: 'responses', label: 'Responses', icon: Inbox },
  { id: 'csv', label: 'CSV Ingestion', icon: Upload },
  { id: 'members', label: 'Members', icon: Users },
];

export function ManageFormsTab({
  publishedForms,
  onOpenManualModal,
}: ManageFormsTabProps) {
  const formsList: Form[] = Array.isArray(publishedForms)
    ? publishedForms
    : publishedForms?.results || [];

  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('health');
  const [selectedFormSlug, setSelectedFormSlug] = useState<string | undefined>(undefined);

  const handleSwitchSubtab = (tab: string, formSlug?: string) => {
    if (formSlug) {
      setSelectedFormSlug(formSlug);
    }
    setActiveSubTab(tab as SubTabId);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A1A2E] dark:text-white tracking-tight">
            Club Data Management Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            System diagnostics, form directory registry, response analytics, CSV data pipelines & member records.
          </p>
        </div>
      </div>

      {/* 5-Section Pill Nav Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-[#151722] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        {SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-orange-500 text-white shadow-[0_2px_10px_rgba(249,115,22,0.3)]'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab Contents */}
      <div className="pt-2">
        {activeSubTab === 'health' && (
          <DataHealthTab onSwitchSubtab={handleSwitchSubtab} />
        )}

        {activeSubTab === 'forms' && (
          <FormsRegistryTab
            forms={formsList}
            onSwitchSubtab={handleSwitchSubtab}
            onOpenManualModal={onOpenManualModal}
          />
        )}

        {activeSubTab === 'responses' && (
          <ResponsesViewerTab
            forms={formsList}
            initialFormSlug={selectedFormSlug}
          />
        )}

        {activeSubTab === 'csv' && (
          <CSVIngestionTab
            forms={formsList}
            onSwitchSubtab={handleSwitchSubtab}
          />
        )}

        {activeSubTab === 'members' && (
          <MembersTab forms={formsList} />
        )}
      </div>
    </div>
  );
}
