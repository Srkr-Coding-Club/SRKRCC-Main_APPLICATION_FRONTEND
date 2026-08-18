'use client';

import { useEffect, useState } from 'react';
import { FeatureFlag, Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { buildAuthFetchOptions } from '@/lib/dataManagement';

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

export function useAdminData() {
  // Flags State — keys match the backend's canonical seed (scripts/seed_flags.py)
  // and src/lib/platformModules.ts's MODULE_KEYS. Events is intentionally not
  // gateable here; it's always-on per the club's own event-visibility rules.
  const [flags, setFlags] = useState<FeatureFlag[]>([
    { id: 1, name: 'Hackathons Engine', key: 'hackathons', is_enabled: true, description: 'Enable general hackathons engine and registration.', updated_at: new Date().toISOString() },
    { id: 2, name: 'IconCoders Flagship', key: 'iconcoders', is_enabled: true, description: 'Enable IconCoders annual flagship hackathon landing and Hall of Fame.', updated_at: new Date().toISOString() },
    { id: 3, name: 'Codequest Daily Problems', key: 'codequest', is_enabled: true, description: 'Enable daily problem of the day, streak tracking, and leaderboards.', updated_at: new Date().toISOString() },
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
  useEffect(() => {
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

  const handleDuplicateField = (field: FormField) => {
    setBuilderFields((prev) => [
      ...prev,
      { ...field, id: Date.now().toString(), label: `${field.label} (Copy)`, order: prev.length + 1 },
    ]);
  };

  const handleAddFieldAtIndex = (type: FormField['type'], label: string, index: number) => {
    setBuilderFields((prev) => {
      const newField: FormField = { id: Date.now().toString(), label, type, is_required: true, order: 0 };
      const updated = [...prev];
      updated.splice(index, 0, newField);
      return updated.map((f, i) => ({ ...f, order: i + 1 }));
    });
  };

  const handleReorderFields = (fields: FormField[]) => {
    setBuilderFields(fields.map((f, i) => ({ ...f, order: i + 1 })));
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
    const flag = flags.find((f) => f.id === id);
    if (!flag) return;
    const nextEnabled = !flag.is_enabled;

    // Optimistic — flip immediately for instant toggle feedback, then best-effort
    // persist. The backend's FeatureFlagViewSet looks flags up by `key`, not `id`.
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, is_enabled: nextEnabled } : f)));
    fetchApi(`/feature-flags/${flag.key}/`, buildAuthFetchOptions('PATCH', { is_enabled: nextEnabled })).catch(() => {
      // Offline/unauthenticated backend — keep the optimistic local toggle,
      // same tolerance as the rest of this hook's mock-backed handlers.
    });
  };

  const filteredUsers = usersList.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()));

  return {
    flags,
    handleToggleFlag,

    usersList,
    userSearch,
    setUserSearch,
    filteredUsers,
    showCreateUserModal,
    setShowCreateUserModal,
    newUser,
    setNewUser,
    handleCreateUser,
    handleRoleChange,

    publishedForms,
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
    isPreviewMode,
    setIsPreviewMode,
    previewAnswers,
    setPreviewAnswers,
    showTestDataModal,
    setShowTestDataModal,
    submittedTestData,
    handleTestPreviewSubmit,

    showManualEntryModal,
    setShowManualEntryModal,
    selectedClosedForm,
    setSelectedClosedForm,
    manualEntryAnswers,
    setManualEntryAnswers,
    formSubmissions,
    handleAdminManualEntrySubmit,

    auditLogs,
  };
}
