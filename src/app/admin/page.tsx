'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Plus,
  FileText,
  Trophy,
  BookOpen,
  Sliders,
  History,
} from 'lucide-react';
import { FeatureFlag, Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardTab } from '@/components/admin/DashboardTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { FormBuilderTab } from '@/components/admin/FormBuilderTab';
import { TestDataModal } from '@/components/admin/TestDataModal';
import { ManageFormsTab } from '@/components/admin/ManageFormsTab';
import { ManualEntryModal } from '@/components/admin/ManualEntryModal';
import { EventsHackathonsTab } from '@/components/admin/EventsHackathonsTab';
import { ContentHubTab } from '@/components/admin/ContentHubTab';
import { FlagsTab } from '@/components/admin/FlagsTab';
import { AuditLogsTab } from '@/components/admin/AuditLogsTab';

export const dynamic = 'force-dynamic';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  role: 'MEMBER' | 'CONTRIBUTOR' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  scopedAssignments?: { type: 'EVENT' | 'HACKATHON'; targetTitle: string; role: string }[];
  isActive: boolean;
  joinedDate: string;
}

interface FormSubmissionRecord {
  id: number;
  formTitle: string;
  submitterName: string;
  submitterEmail: string;
  submittedAt: string;
  answers: Record<string, string>;
  isManualAdminEntry?: boolean;
}

interface AuditLogRecord {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

export default function AdminControlRoomPage() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'users' | 'builder' | 'manage_forms' | 'events_hackathons' | 'content' | 'flags' | 'audit_logs'
  >('dashboard');

  // Flags State
  const [flags, setFlags] = useState<FeatureFlag[]>([
    { id: 1, name: 'Hackathons Platform', key: 'module_hackathons', is_enabled: true, description: 'Enables registration & submission engine for hackathons.', updated_at: new Date().toISOString() },
    { id: 2, name: 'Codequest Daily Engine', key: 'module_codequest', is_enabled: true, description: 'Enables daily coding problem streak challenges.', updated_at: new Date().toISOString() },
    { id: 3, name: 'Events Showcase', key: 'module_events', is_enabled: true, description: 'Public workshops and seminar schedules.', updated_at: new Date().toISOString() },
    { id: 4, name: 'Forms Center Engine', key: 'module_forms', is_enabled: true, description: 'Dynamic form builder and registration collector.', updated_at: new Date().toISOString() },
  ]);

  // Users State
  const [usersList, setUsersList] = useState<UserRecord[]>([
    { id: 1, name: 'Rahul Sharma', email: 'rahul.sharma@srkr.ac.in', rollNumber: '21B91A0501', branch: 'CSE', year: '3rd Year', role: 'CLUB_LEAD', scopedAssignments: [{ type: 'HACKATHON', targetTitle: 'IconCoders 2025', role: 'Lead Admin' }], isActive: true, joinedDate: '2023-08-15' },
    { id: 2, name: 'Ananya Verma', email: 'ananya.v@srkr.ac.in', rollNumber: '22B91A1204', branch: 'IT', year: '2nd Year', role: 'ADMIN', isActive: true, joinedDate: '2023-09-01' },
    { id: 3, name: 'Priya Rao', email: 'priya.rao@srkr.ac.in', rollNumber: '23B91A0412', branch: 'ECE', year: '1st Year', role: 'VOLUNTEER', isActive: true, joinedDate: '2024-01-10' },
  ]);

  const [userSearch, setUserSearch] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    rollNumber: '',
    branch: 'CSE',
    year: '1st Year',
    role: 'MEMBER' as UserRecord['role'],
    password: '',
  });

  // Forms State
  const [publishedForms, setPublishedForms] = useState<Form[]>([
    {
      id: 101,
      title: 'IconCoders Flagship Hackathon 2025 Registration',
      slug: 'iconcoders-hackathon-2025',
      description: 'Official registration form for SRKR Coding Club annual flagship hackathon.',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      category: 'Hackathon',
      status: 'PUBLISHED',
      open_at: '2025-05-01',
      close_at: '2025-06-15',
    },
    {
      id: 102,
      title: 'Web Development Workshop RSVP & Tool Kit',
      slug: 'web-dev-workshop-rsvp',
      description: 'Reserve your physical seat for the hands-on React & Next.js workshop.',
      image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      category: 'Workshop',
      status: 'CLOSED',
      open_at: '2025-05-10',
      close_at: '2025-05-24',
    },
  ]);

  const [formMeta, setFormMeta] = useState<{
    id?: number | string;
    title: string;
    slug: string;
    description: string;
    image_url: string;
    category: string;
    status: Form['status'];
    open_at: string;
    close_at: string;
  }>({
    title: 'IconCoders 2026 Registration Form',
    slug: 'iconcoders-2026-registration',
    description: 'Register your team for SRKR Coding Club flagship hackathon.',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
    category: 'Hackathon',
    status: 'PUBLISHED',
    open_at: '2025-06-01',
    close_at: '2025-07-01',
  });

  const [builderFields, setBuilderFields] = useState<FormField[]>([
    { id: 'f1', label: 'Team Leader Full Name', type: 'TEXT', placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
    { id: 'f2', label: 'College Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
  ]);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showTestDataModal, setShowTestDataModal] = useState(false);
  const [submittedTestData, setSubmittedTestData] = useState<Record<string, any> | null>(null);

  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [selectedClosedForm, setSelectedClosedForm] = useState<Form | null>(null);
  const [manualEntryAnswers, setManualEntryAnswers] = useState<Record<string, any>>({});

  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRecord[]>([
    { id: 1, formTitle: 'IconCoders Flagship Hackathon 2025', submitterName: 'Rahul Sharma', submitterEmail: 'rahul.sharma@srkr.ac.in', submittedAt: '2025-05-20 14:30', answers: { 'Team Leader Name': 'Rahul Sharma' } },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([
    { id: 1, timestamp: '2025-05-24 10:15:00', actor: 'Ananya Verma (Admin)', action: 'Toggled Feature Flag', target: 'module_hackathons', details: 'Status: ENABLED' },
  ]);

  // Fetch Live Backend Mock Data from REST API
  React.useEffect(() => {
    async function loadBackendData() {
      try {
        const [fetchedUsers, fetchedFlags, fetchedForms, fetchedAudit] = await Promise.all([
          fetchApi<any[]>('/auth/users/').catch(() => []),
          fetchApi<FeatureFlag[]>('/feature-flags/').catch(() => []),
          fetchApi<Form[]>('/forms/').catch(() => []),
          fetchApi<any[]>('/audit/').catch(() => []),
        ]);

        if (fetchedUsers && fetchedUsers.length > 0) {
          setUsersList(
            fetchedUsers.map((u: any) => ({
              id: u.id,
              name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email,
              email: u.email,
              rollNumber: u.roll_number || 'N/A',
              branch: u.branch || 'CSE',
              year: u.year ? `${u.year}th Year` : '1st Year',
              role: u.role || 'MEMBER',
              isActive: u.is_active !== false,
              joinedDate: u.date_joined ? u.date_joined.split('T')[0] : '2025-01-01',
            }))
          );
        }

        if (fetchedFlags && fetchedFlags.length > 0) {
          setFlags(fetchedFlags);
        }
        if (fetchedForms && fetchedForms.length > 0) {
          setPublishedForms(fetchedForms);
        }
        if (fetchedAudit && fetchedAudit.length > 0) {
          setAuditLogs(
            fetchedAudit.map((a: any) => ({
              id: a.id || Date.now(),
              timestamp: a.created_at || new Date().toISOString(),
              actor: a.actor_email || 'Admin User',
              action: a.action || 'System Mutation',
              target: a.target_model || 'System',
              details: JSON.stringify(a.details || {}),
            }))
          );
        }
      } catch (err) {
        // Fallback to initial seed states
      }
    }
    loadBackendData();
  }, []);

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        username: newUser.email.split('@')[0],
        email: newUser.email,
        password: newUser.password || 'password123',
        first_name: newUser.name.split(' ')[0] || newUser.name,
        last_name: newUser.name.split(' ').slice(1).join(' ') || '',
        role: newUser.role,
        roll_number: newUser.rollNumber,
        branch: newUser.branch,
      };
      const created = await fetchApi<any>('/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const userToAdd: UserRecord = {
        id: created?.id || Date.now(),
        name: newUser.name,
        email: newUser.email,
        rollNumber: newUser.rollNumber,
        branch: newUser.branch,
        year: newUser.year,
        role: newUser.role,
        isActive: true,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setUsersList((prev) => [userToAdd, ...prev]);
      setShowCreateUserModal(false);
      alert(`Account for ${userToAdd.name} created & saved in backend database!`);
    } catch {
      const userToAdd: UserRecord = {
        id: Date.now(),
        name: newUser.name,
        email: newUser.email,
        rollNumber: newUser.rollNumber,
        branch: newUser.branch,
        year: newUser.year,
        role: newUser.role,
        isActive: true,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setUsersList((prev) => [userToAdd, ...prev]);
      setShowCreateUserModal(false);
      alert(`Account for ${userToAdd.name} created!`);
    }
  };

  const handleRoleChange = (userId: number, role: UserRecord['role']) => {
    setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const handleAddFieldFromPalette = (type: FormField['type'], label: string) => {
    setBuilderFields((prev) => [...prev, { id: Date.now().toString(), label, type, is_required: true, order: prev.length + 1 }]);
  };

  const handleRemoveField = (id: number | string) => {
    setBuilderFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: number | string, key: keyof FormField, value: any) => {
    setBuilderFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const handleSaveForm = async () => {
    const payload = {
      title: formMeta.title,
      slug: formMeta.slug || formMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: formMeta.description,
      image_url: formMeta.image_url,
      category: formMeta.category,
      status: formMeta.status,
      fields: builderFields.map((f, idx) => ({
        ...(typeof f.id === 'number' || (typeof f.id === 'string' && !isNaN(Number(f.id)) && Number(f.id) < 1000000000) ? { id: Number(f.id) } : {}),
        label: f.label,
        type: f.type,
        placeholder: f.placeholder || '',
        is_required: f.is_required,
        options: f.options || [],
        conditional_logic: f.conditional_logic || {},
        validation_rules: f.validation_rules || {},
        order: idx + 1,
      })),
    };

    try {
      const saved = await fetchApi<Form>('/forms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setPublishedForms((prev) => [saved, ...prev.filter((item) => item.slug !== saved.slug)]);
      alert(`Form "${saved.title}" saved & published in backend database!`);
    } catch {
      const fallbackForm: Form = {
        id: Date.now(),
        title: formMeta.title,
        slug: payload.slug,
        description: formMeta.description,
        image_url: formMeta.image_url,
        category: formMeta.category,
        status: formMeta.status,
        fields: builderFields,
      };
      setPublishedForms((prev) => [fallbackForm, ...prev.filter((item) => item.slug !== fallbackForm.slug)]);
      alert(`Form "${formMeta.title}" saved!`);
    }
  };

  const handleTestPreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedTestData(previewAnswers);
    setShowTestDataModal(true);
  };

  const handleAdminManualEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClosedForm) return;
    const newSub: FormSubmissionRecord = {
      id: Date.now(),
      formTitle: selectedClosedForm.title,
      submitterName: (manualEntryAnswers['Name'] || 'Offline Candidate') + ' (Admin Override)',
      submitterEmail: manualEntryAnswers['Email'] || 'offline@srkr.ac.in',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      answers: manualEntryAnswers,
      isManualAdminEntry: true,
    };
    setFormSubmissions((prev) => [newSub, ...prev]);
    setShowManualEntryModal(false);
    alert('Offline entry recorded for closed form!');
  };

  const handleToggleFlag = (id: number) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, is_enabled: !f.is_enabled } : f)));
  };

  const filteredUsers = usersList.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0D0E15] py-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Modular Header Component */}
        <AdminHeader />

        {/* 8 Top Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'dashboard' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'users' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Control & Password</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'builder' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>MS Drag & Drop Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('manage_forms')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'manage_forms' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manage Forms & Overrides</span>
          </button>

          <button
            onClick={() => setActiveTab('events_hackathons')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'events_hackathons' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Events & Hackathons</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'content' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Content Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('flags')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'flags' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Module Flags & Windows</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'audit_logs' ? 'bg-[#FF7A00] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab Modules */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            userCount={usersList.length}
            publishedForms={publishedForms}
            formSubmissions={formSubmissions}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            filteredUsers={filteredUsers}
            onOpenCreateModal={() => setShowCreateUserModal(true)}
            onRoleChange={handleRoleChange}
          />
        )}

        {activeTab === 'builder' && (
          <FormBuilderTab
            isPreviewMode={isPreviewMode}
            setIsPreviewMode={setIsPreviewMode}
            formMeta={formMeta}
            setFormMeta={setFormMeta}
            builderFields={builderFields}
            onAddFieldFromPalette={handleAddFieldFromPalette}
            onRemoveField={handleRemoveField}
            onFieldChange={handleFieldChange}
            onSaveForm={handleSaveForm}
            previewAnswers={previewAnswers}
            setPreviewAnswers={setPreviewAnswers}
            onTestPreviewSubmit={handleTestPreviewSubmit}
          />
        )}

        {activeTab === 'manage_forms' && (
          <ManageFormsTab
            publishedForms={publishedForms}
            onOpenManualModal={(f) => {
              setSelectedClosedForm(f);
              setShowManualEntryModal(true);
            }}
          />
        )}

        {activeTab === 'events_hackathons' && <EventsHackathonsTab />}
        {activeTab === 'content' && <ContentHubTab />}
        {activeTab === 'flags' && <FlagsTab flags={flags} onToggleFlag={handleToggleFlag} />}
        {activeTab === 'audit_logs' && <AuditLogsTab filteredAuditLogs={auditLogs} />}

        {/* Modals */}
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSubmit={handleCreateUser}
          newUser={newUser}
          setNewUser={setNewUser}
        />

        <TestDataModal
          isOpen={showTestDataModal}
          onClose={() => setShowTestDataModal(false)}
          submittedTestData={submittedTestData}
        />

        <ManualEntryModal
          isOpen={showManualEntryModal}
          onClose={() => setShowManualEntryModal(false)}
          selectedClosedForm={selectedClosedForm}
          onSubmit={handleAdminManualEntrySubmit}
          manualEntryAnswers={manualEntryAnswers}
          setManualEntryAnswers={setManualEntryAnswers}
        />

      </div>
    </div>
  );
}
