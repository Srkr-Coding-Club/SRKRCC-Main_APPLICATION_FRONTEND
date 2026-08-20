'use client';

import { useEffect, useState } from 'react';
import { FeatureFlag, Form, FormField } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { buildAuthFetchOptions } from '@/lib/dataManagement';
import { useToast } from '@/context/ToastContext';

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
  const { toast } = useToast();
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
    allow_multiple_responses?: boolean;
    allow_edits_until?: string;
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
        const [fetchedUsers, fetchedFlags, fetchedForms, fetchedAudit, fetchedSubmissions] = await Promise.all([
          fetchApi<any[]>('/auth/users/').catch(() => []),
          fetchApi<FeatureFlag[]>('/feature-flags/').catch(() => []),
          fetchApi<Form[]>('/forms/').catch(() => []),
          fetchApi<any[]>('/audit/').catch(() => []),
          fetchApi<any>('/forms/submissions/').catch(() => []),
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
              timestamp: a.timestamp || a.created_at?.replace('T', ' ').substring(0, 19) || new Date().toISOString().substring(0, 19),
              actor: a.actor_name || a.actor_email || 'System',
              action: a.action || 'System Mutation',
              target: a.target || a.target_model || 'System',
              details: typeof a.details === 'object' ? JSON.stringify(a.details) : String(a.details || ''),
            }))
          );
        }

        const rawSubs = Array.isArray(fetchedSubmissions)
          ? fetchedSubmissions
          : fetchedSubmissions?.results || [];

        if (rawSubs.length > 0) {
          setFormSubmissions(
            rawSubs.map((s: any) => {
              const ansMap: Record<string, any> = {};
              if (s.answers && Array.isArray(s.answers)) {
                s.answers.forEach((ans: any) => {
                  const key = ans.field_label || `Field ${ans.field}`;
                  ansMap[key] = ans.value;
                });
              }
              return {
                id: s.id,
                formTitle: s.form_title || 'Form Submission',
                submitterName: s.user_name || s.user_email || 'Student',
                submitterEmail: s.user_email || 'student@srkr.ac.in',
                submittedAt: s.submitted_at ? s.submitted_at.replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16),
                answers: ansMap,
                isManualAdminEntry: s.is_manual_entry ?? false,
              };
            })
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
      toast.success('Account Created', `Account for ${userToAdd.name} created & saved in backend database!`);
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
      toast.success('Account Created', `Account for ${userToAdd.name} created!`);
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

  const resetNewForm = () => {
    setFormMeta({
      id: undefined,
      title: 'Untitled Registration Form',
      slug: '',
      description: '',
      image_url: '',
      category: 'General',
      status: 'DRAFT',
      open_at: '',
      close_at: '',
      allow_multiple_responses: false,
      allow_edits_until: '',
    });
    setBuilderFields([
      { id: 'f1', label: 'Full Name', type: 'TEXT', placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
      { id: 'f2', label: 'Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
    ]);
  };

  const loadFormBySlug = async (slug: string) => {
    try {
      const form = await fetchApi<Form>(`/forms/${slug}/`);
      if (form) {
        handleEditFormInBuilder(form);
        return form;
      }
    } catch (e) {
      console.warn('Unable to load form by slug:', slug);
    }
  };

  const handleEditFormInBuilder = (form: Form) => {
    setFormMeta({
      id: form.id,
      title: form.title,
      slug: form.slug,
      description: form.description || '',
      image_url: form.image_url || '',
      category: form.category || 'General',
      status: form.status || 'DRAFT',
      open_at: form.open_at || '',
      close_at: form.close_at || '',
      allow_multiple_responses: form.allow_multiple_responses ?? false,
      allow_edits_until: form.allow_edits_until || '',
    });
    if (form.fields && form.fields.length > 0) {
      setBuilderFields(form.fields.map((f, i) => ({ ...f, order: f.order ?? i + 1 })));
    } else {
      setBuilderFields([
        { id: 'f1', label: 'Full Name', type: 'TEXT', placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
      ]);
    }
  };

  const handleSaveForm = async (
    targetStatus?: Form['status'],
    scheduleOptions?: { open_at?: string; close_at?: string }
  ) => {
    const finalStatus = targetStatus || formMeta.status || 'DRAFT';
    const slug = formMeta.slug || formMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const payload = {
      title: formMeta.title,
      slug: slug,
      description: formMeta.description,
      image_url: formMeta.image_url,
      category: formMeta.category,
      status: finalStatus,
      open_at: scheduleOptions?.open_at || formMeta.open_at || null,
      close_at: scheduleOptions?.close_at || formMeta.close_at || null,
      allow_multiple_responses: formMeta.allow_multiple_responses ?? false,
      allow_edits_until: formMeta.allow_edits_until || null,
      fields: builderFields.map((f, idx) => ({
        ...(typeof f.id === 'number' || (typeof f.id === 'string' && !isNaN(Number(f.id)) && Number(f.id) < 1000000000) ? { id: Number(f.id) } : {}),
        label: f.label,
        type: f.type,
        placeholder: f.placeholder || '',
        description: f.description || '',
        is_required: f.is_required,
        options: f.options || [],
        rows: f.rows || [],
        min_value: f.min_value ?? null,
        max_value: f.max_value ?? null,
        conditional_logic: f.conditional_logic || {},
        validation_rules: f.validation_rules || {},
        order: idx + 1,
      })),
    };

    const existingForm = publishedForms.find(
      (f) => (formMeta.id && f.id === formMeta.id) || (formMeta.slug && f.slug === formMeta.slug) || f.slug === slug
    );
    const isExisting = !!(formMeta.id || existingForm);
    const targetSlug = formMeta.slug || existingForm?.slug || slug;

    try {
      let saved: Form;
      if (isExisting) {
        saved = await fetchApi<Form>(`/forms/${targetSlug}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        try {
          saved = await fetchApi<Form>('/forms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (postErr: any) {
          // If slug collision occurs on backend, seamlessly update existing form
          if (postErr?.message?.includes('slug') || postErr?.error?.includes('slug') || postErr?.status === 400) {
            saved = await fetchApi<Form>(`/forms/${targetSlug}/`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } else {
            throw postErr;
          }
        }
      }

      setFormMeta((prev) => ({
        ...prev,
        id: saved.id,
        slug: saved.slug,
        title: saved.title || prev.title,
        description: saved.description || '',
        category: saved.category || 'General',
        image_url: saved.image_url || '',
        status: saved.status,
        open_at: saved.open_at || '',
        close_at: saved.close_at || '',
      }));

      // Update URL without reload so future saves will maintain the slug
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set('slug', saved.slug);
        url.searchParams.delete('new');
        window.history.replaceState({}, '', url.toString());
      }

      setPublishedForms((prev) => [
        saved,
        ...prev.filter((item) => item.slug !== saved.slug && item.id !== saved.id),
      ]);

      const statusMsg =
        finalStatus === 'PUBLISHED'
          ? 'published live for responses'
          : finalStatus === 'SCHEDULED'
          ? 'scheduled for automatic launch'
          : 'saved to database as draft';
      toast.success('Form Saved', `Form "${saved.title}" successfully ${statusMsg}!`);
      return saved;
    } catch (err: any) {
      const fallbackForm: Form = {
        id: formMeta.id || Date.now(),
        title: formMeta.title,
        slug: payload.slug,
        description: formMeta.description,
        image_url: formMeta.image_url,
        category: formMeta.category,
        status: finalStatus,
        open_at: payload.open_at || undefined,
        close_at: payload.close_at || undefined,
        fields: builderFields,
        response_count: 0,
      };
      setPublishedForms((prev) => [
        fallbackForm,
        ...prev.filter((item) => item.slug !== fallbackForm.slug && item.id !== fallbackForm.id),
      ]);
      toast.info('Saved Offline', `Form "${formMeta.title}" saved locally (${finalStatus})`);
      return fallbackForm;
    }
  };

  const handleFormStatusTransition = async (
    formSlug: string,
    action: 'publish' | 'unpublish' | 'close' | 'schedule' | 'reopen',
    extraData?: any
  ) => {
    try {
      const updated = await fetchApi<Form>(`/forms/${formSlug}/${action}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extraData || {}),
      });
      setPublishedForms((prev) => prev.map((f) => (f.slug === formSlug ? { ...f, ...updated } : f)));
      toast.success('Status Updated', `Form status transitioned to ${action.toUpperCase()}`);
      return updated;
    } catch {
      // Local fallback status mapping
      const nextStatusMap: Record<string, Form['status']> = {
        publish: 'PUBLISHED',
        unpublish: 'DRAFT',
        close: 'CLOSED',
        schedule: 'SCHEDULED',
        reopen: 'DRAFT',
      };
      const nextStatus = nextStatusMap[action] || 'DRAFT';
      setPublishedForms((prev) =>
        prev.map((f) =>
          f.slug === formSlug
            ? {
                ...f,
                status: nextStatus,
                ...(extraData?.open_at ? { open_at: extraData.open_at } : {}),
                ...(extraData?.close_at ? { close_at: extraData.close_at } : {}),
              }
            : f
        )
      );
    }
  };

  const handleTestPreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedTestData(previewAnswers);
    setShowTestDataModal(true);
  };

  const handleAdminManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClosedForm) return;

    const answersPayload = Object.entries(manualEntryAnswers).map(([key, value]) => {
      const numFieldId = Number(key);
      const fieldId = !isNaN(numFieldId)
        ? numFieldId
        : selectedClosedForm.fields?.find((f) => f.label.toLowerCase() === key.toLowerCase())?.id || 1;
      return {
        field: Number(fieldId),
        value: value,
      };
    });

    try {
      await fetchApi(`/forms/${selectedClosedForm.slug}/manual-entry/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload }),
      });
      // Increment response count
      setPublishedForms((prev) =>
        prev.map((f) => (f.id === selectedClosedForm.id ? { ...f, response_count: (f.response_count || 0) + 1 } : f))
      );
    } catch {
      // Fallback
    }

    const newSub: FormSubmissionRecord = {
      id: Date.now(),
      formTitle: selectedClosedForm.title,
      submitterName: (manualEntryAnswers['Name'] || manualEntryAnswers['Full Name'] || 'Offline Candidate') + ' (Admin Override)',
      submitterEmail: manualEntryAnswers['Email'] || manualEntryAnswers['College Email'] || 'offline@srkr.ac.in',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      answers: manualEntryAnswers,
      isManualAdminEntry: true,
    };
    setFormSubmissions((prev) => [newSub, ...prev]);
    setShowManualEntryModal(false);
    setManualEntryAnswers({});
    toast.success('Offline Entry Recorded', `Special entry recorded for "${selectedClosedForm.title}"!`);
  };

  const handleToggleFlag = (id: number) => {
    const flag = flags.find((f) => f.id === id);
    if (!flag) return;
    const nextEnabled = !flag.is_enabled;

    // Optimistic — flip immediately for instant toggle feedback, then best-effort
    // persist. The backend's FeatureFlagViewSet looks flags up by `key`, not `id`.
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, is_enabled: nextEnabled } : f)));
    fetchApi(`/feature-flags/${flag.key}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: nextEnabled }),
    }).catch(() => {
      // Offline fallback
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
    setPublishedForms,
    formMeta,
    setFormMeta,
    builderFields,
    setBuilderFields,
    handleAddFieldFromPalette,
    handleAddFieldAtIndex,
    handleRemoveField,
    handleFieldChange,
    handleDuplicateField,
    handleReorderFields,
    handleSaveForm,
    handleFormStatusTransition,
    handleEditFormInBuilder,
    loadFormBySlug,
    resetNewForm,
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
