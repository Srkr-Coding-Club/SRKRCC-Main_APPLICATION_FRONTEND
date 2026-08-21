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

  // Dynamic Flags State — fetched live from backend
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  // Users State — fetched live from backend
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
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

  // Forms State — fetched live from backend
  const [publishedForms, setPublishedForms] = useState<Form[]>([]);

  const [formMeta, setFormMeta] = useState<{
    id?: number | string;
    originalSlug?: string;
    title: string;
    slug: string;
    description: string;
    image_url: string;
    category: string;
    status: Form['status'];
    version?: number;
    open_at: string;
    close_at: string;
    allow_multiple_responses?: boolean;
    allow_response_editing?: boolean;
    enable_prefill?: boolean;
    max_responses_per_user?: number;
    allow_edits_until?: string;
  }>({
    title: '',
    slug: '',
    description: '',
    image_url: '',
    category: 'General',
    status: 'DRAFT',
    open_at: '',
    close_at: '',
    allow_multiple_responses: false,
    allow_response_editing: true,
    enable_prefill: true,
    allow_edits_until: '',
  });

  const [builderFields, setBuilderFields] = useState<FormField[]>([
    { id: 'f1', label: 'Full Name', type: 'TEXT', placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
    { id: 'f2', label: 'College Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
  ]);

  // Checkpoint for reverting form changes back to last saved state
  const [savedCheckpoint, setSavedCheckpoint] = useState<{
    formMeta: any;
    builderFields: FormField[];
  } | null>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [showTestDataModal, setShowTestDataModal] = useState(false);
  const [submittedTestData, setSubmittedTestData] = useState<Record<string, any> | null>(null);

  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [selectedClosedForm, setSelectedClosedForm] = useState<Form | null>(null);
  const [manualEntryAnswers, setManualEntryAnswers] = useState<Record<string, any>>({});

  // Submissions & Audit Logs State — fetched live from backend
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // Loading States
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(true);
  const [isLoadingFlags, setIsLoadingFlags] = useState(true);
  const [isLoadingBuilder, setIsLoadingBuilder] = useState(false);

  const refetchForms = async () => {
    setIsLoadingForms(true);
    try {
      const fetchedForms = await fetchApi<any>('/forms/').catch(() => []);
      const formsArray = Array.isArray(fetchedForms)
        ? fetchedForms
        : (fetchedForms as any)?.results || [];
      setPublishedForms(formsArray);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const refetchAll = async (silent = false) => {
    if (!silent) {
      setIsLoadingForms(true);
      setIsLoadingUsers(true);
      setIsLoadingFlags(true);
      setIsLoadingAuditLogs(true);
      setIsLoadingSubmissions(true);
    }

    try {
      const [fetchedUsers, fetchedFlags, fetchedForms, fetchedAudit, fetchedSubmissions] = await Promise.all([
        fetchApi<any[]>('/auth/users/').catch(() => []),
        fetchApi<FeatureFlag[]>('/feature-flags/').catch(() => []),
        fetchApi<any>('/forms/').catch(() => []),
        fetchApi<any[]>('/audit/').catch(() => []),
        fetchApi<any>('/forms/submissions/').catch(() => []),
      ]);

      const usersArray = Array.isArray(fetchedUsers)
        ? fetchedUsers
        : (fetchedUsers as any)?.results || [];
      if (usersArray.length > 0) {
        setUsersList(
          usersArray.map((u: any) => ({
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

      const flagsArray = Array.isArray(fetchedFlags)
        ? fetchedFlags
        : (fetchedFlags as any)?.results || [];
      if (flagsArray.length > 0) {
        setFlags(flagsArray);
      }

      const formsArray = Array.isArray(fetchedForms)
        ? fetchedForms
        : (fetchedForms as any)?.results || [];
      setPublishedForms(formsArray);

      const auditArray = Array.isArray(fetchedAudit)
        ? fetchedAudit
        : (fetchedAudit as any)?.results || [];
      if (auditArray.length > 0) {
        setAuditLogs(
          auditArray.map((a: any) => ({
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
        : (fetchedSubmissions as any)?.results || [];

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
              submitterName: s.user?.name || s.user_name || s.user_email || 'Student',
              submitterEmail: s.user?.email || s.user_email || 'student@srkr.ac.in',
              submittedAt: s.submitted_at ? s.submitted_at.replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 16),
              answers: ansMap,
              isManualAdminEntry: s.is_manual_entry ?? false,
            };
          })
        );
      }
    } catch (err) {
      console.error('[Admin Data Fetch Error]:', err);
    } finally {
      setIsLoadingForms(false);
      setIsLoadingUsers(false);
      setIsLoadingFlags(false);
      setIsLoadingAuditLogs(false);
      setIsLoadingSubmissions(false);
    }
  };

  // Live background polling and focus revalidation
  useEffect(() => {
    refetchAll(false);

    // Poll live data every 8 seconds when window is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refetchAll(true);
      }
    }, 8000);

    const handleFocus = () => {
      refetchAll(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
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
    } catch (err: any) {
      toast.error('Account Not Created', err?.message || `Could not create an account for ${newUser.name}. Nothing was saved.`);
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
    const defaultMeta = {
      id: undefined,
      originalSlug: undefined,
      title: '',
      slug: '',
      description: '',
      image_url: '',
      category: 'General',
      status: 'DRAFT' as Form['status'],
      version: 1,
      open_at: '',
      close_at: '',
      allow_multiple_responses: false,
      allow_edits_until: '',
    };
    const defaultFields: FormField[] = [
      { id: 'f1', label: 'Full Name', type: 'TEXT', placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
      { id: 'f2', label: 'Email Address', type: 'EMAIL', placeholder: 'student@srkr.ac.in', is_required: true, order: 2 },
    ];
    setFormMeta(defaultMeta);
    setBuilderFields(defaultFields);
    setSavedCheckpoint(null);
  };

  const handleResetBuilder = () => {
    if (savedCheckpoint) {
      setFormMeta(JSON.parse(JSON.stringify(savedCheckpoint.formMeta)));
      setBuilderFields(JSON.parse(JSON.stringify(savedCheckpoint.builderFields)));
      toast.info('Form Reset', `Reverted back to last saved checkpoint (${savedCheckpoint.formMeta.title || 'Untitled Form'}).`);
    } else {
      resetNewForm();
      toast.info('Form Reset', 'Blank form template restored.');
    }
  };

  const loadFormBySlug = async (slug: string) => {
    setIsLoadingBuilder(true);
    try {
      const form = await fetchApi<Form>(`/forms/${slug}/`);
      if (form) {
        handleEditFormInBuilder(form);
        return form;
      }
    } catch (e) {
      console.warn('Unable to load form by slug:', slug);
    } finally {
      setIsLoadingBuilder(false);
    }
  };

  const handleEditFormInBuilder = (form: Form) => {
    const meta = {
      id: form.id,
      originalSlug: form.slug,
      title: form.title,
      slug: form.slug,
      description: form.description || '',
      image_url: form.image_url || '',
      category: form.category || 'General',
      status: form.status || 'DRAFT',
      version: form.version || 1,
      open_at: form.open_at || '',
      close_at: form.close_at || '',
      allow_multiple_responses: form.allow_multiple_responses ?? false,
      allow_edits_until: form.allow_edits_until || '',
    };
    const fields: FormField[] =
      form.fields && form.fields.length > 0
        ? form.fields.map((f, i) => ({ ...f, order: f.order ?? i + 1 }))
        : [
            { id: 'f1', label: 'Full Name', type: 'TEXT' as const, placeholder: 'e.g. Ramesh Varma', is_required: true, order: 1 },
          ];

    setFormMeta(meta);
    setBuilderFields(fields);
    setSavedCheckpoint({
      formMeta: JSON.parse(JSON.stringify(meta)),
      builderFields: JSON.parse(JSON.stringify(fields)),
    });
  };

  const handleSaveForm = async (
    targetStatus?: Form['status'],
    scheduleOptions?: { open_at?: string; close_at?: string }
  ) => {
    const finalStatus = targetStatus || formMeta.status || 'DRAFT';
    const slug = formMeta.slug || formMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let cleanImageUrl: string | null = formMeta.image_url?.trim() || null;
    if (
      cleanImageUrl &&
      !cleanImageUrl.startsWith('http://') &&
      !cleanImageUrl.startsWith('https://') &&
      !cleanImageUrl.startsWith('data:') &&
      !cleanImageUrl.startsWith('blob:') &&
      !cleanImageUrl.startsWith('/')
    ) {
      cleanImageUrl = `https://${cleanImageUrl}`;
    }
    const cleanOpenAt = scheduleOptions?.open_at || formMeta.open_at || null;
    const cleanCloseAt = scheduleOptions?.close_at || formMeta.close_at || null;
    const cleanEditsUntil = formMeta.allow_edits_until || null;

    const payload = {
      title: formMeta.title,
      slug: slug,
      description: formMeta.description || '',
      image_url: cleanImageUrl,
      category: formMeta.category || 'General',
      status: finalStatus,
      open_at: cleanOpenAt ? cleanOpenAt : null,
      close_at: cleanCloseAt ? cleanCloseAt : null,
      allow_multiple_responses: formMeta.allow_multiple_responses ?? false,
      allow_response_editing: formMeta.allow_response_editing ?? true,
      enable_prefill: formMeta.enable_prefill ?? true,
      allow_edits_until: cleanEditsUntil ? cleanEditsUntil : null,
      fields: builderFields.map((f, idx) => {
        const isRealDbId = typeof f.id === 'number' && f.id > 0 && f.id < 2000000000;
        return {
          ...(isRealDbId ? { id: f.id } : {}),
          label: f.label,
          type: f.type,
          placeholder: f.placeholder || '',
          description: f.description || '',
          is_required: !!f.is_required,
          options: f.options || [],
          rows: f.rows || [],
          min_value: f.min_value ?? null,
          max_value: f.max_value ?? null,
          conditional_logic: f.conditional_logic || {},
          validation_rules: f.validation_rules || {},
          order: idx + 1,
        };
      }),
    };

    const lookupSlug = formMeta.originalSlug || formMeta.slug || slug;
    const isExistingForm =
      (typeof formMeta.id === 'number' && formMeta.id > 0) ||
      !!formMeta.originalSlug ||
      publishedForms.some((f) => f.slug === lookupSlug && f.id !== undefined);

    try {
      let saved: Form;
      if (isExistingForm) {
        // Form is already registered in backend: perform PUT update directly
        saved = await fetchApi<Form>(`/forms/${lookupSlug}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Brand new form: ensure slug is unique before POST
        let uniqueSlug = slug;
        if (publishedForms.some((f) => f.slug === uniqueSlug)) {
          uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        }
        const createPayload = { ...payload, slug: uniqueSlug };

        try {
          saved = await fetchApi<Form>('/forms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          });
        } catch (postErr: any) {
          const errMsg = String(postErr?.message || '').toLowerCase();
          if (
            errMsg.includes('slug') ||
            errMsg.includes('already exists') ||
            errMsg.includes('unique')
          ) {
            // Slug collision on new form: append random suffix and retry POST
            const fallbackSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
            saved = await fetchApi<Form>('/forms/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...createPayload, slug: fallbackSlug }),
            });
          } else {
            throw postErr;
          }
        }
      }

      const updatedMeta = {
        id: saved.id,
        originalSlug: saved.slug,
        slug: saved.slug,
        title: saved.title || formMeta.title,
        description: saved.description || '',
        category: saved.category || 'General',
        image_url: saved.image_url || '',
        status: saved.status,
        version: saved.version || (formMeta.version ? formMeta.version + 1 : 1),
        open_at: saved.open_at || '',
        close_at: saved.close_at || '',
        allow_multiple_responses: saved.allow_multiple_responses ?? false,
        allow_response_editing: saved.allow_response_editing ?? true,
        enable_prefill: saved.enable_prefill ?? true,
        allow_edits_until: saved.allow_edits_until || '',
      };

      const updatedFields: FormField[] =
        saved.fields && saved.fields.length > 0
          ? saved.fields.map((f, i) => ({ ...f, order: f.order ?? i + 1 }))
          : builderFields;

      setFormMeta(updatedMeta);
      setBuilderFields(updatedFields);
      setSavedCheckpoint({
        formMeta: JSON.parse(JSON.stringify(updatedMeta)),
        builderFields: JSON.parse(JSON.stringify(updatedFields)),
      });

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
      toast.success('Form Saved', `Form "${saved.title}" (v${saved.version || 1}) ${statusMsg}!`);
      return saved;
    } catch (err: any) {
      console.error('[Save Form Error]:', err);
      toast.error('Form Save Failed', err?.message || 'Unable to save form to server. Showing local preview.');
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
      refetchAll(true);
      return updated;
    } catch (err: any) {
      // Optimistic local-only fallback (offline/unreachable backend) — the
      // toast is the only thing telling the admin this never actually
      // persisted, so it must never be silent.
      toast.error('Not Saved to Server', err?.message || `Could not ${action} this form — showing an unsaved local preview only.`);
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

    let persisted = false;
    try {
      await fetchApi(`/forms/${selectedClosedForm.slug}/manual-entry/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload }),
      });
      persisted = true;
      refetchAll(true);
    } catch (err: any) {
      toast.error('Not Saved to Server', err?.message || `Could not record this entry for "${selectedClosedForm.title}" — showing an unsaved local preview only.`);
    }

    let foundName = '';
    let foundEmail = '';
    selectedClosedForm.fields?.forEach((f) => {
      const val = manualEntryAnswers[f.id] || manualEntryAnswers[String(f.id)] || manualEntryAnswers[f.label];
      if (val) {
        const lbl = f.label.toLowerCase();
        if (!foundName && (lbl.includes('name') || f.type === 'TEXT')) foundName = String(val);
        if (!foundEmail && (lbl.includes('email') || f.type === 'EMAIL')) foundEmail = String(val);
      }
    });

    const newSub: FormSubmissionRecord = {
      id: Date.now(),
      formTitle: selectedClosedForm.title,
      submitterName: (foundName || manualEntryAnswers['Name'] || manualEntryAnswers['Full Name'] || 'Offline Candidate') + ' (Admin Override)',
      submitterEmail: foundEmail || manualEntryAnswers['Email'] || manualEntryAnswers['College Email'] || 'offline@srkr.ac.in',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      answers: manualEntryAnswers,
      isManualAdminEntry: true,
    };
    setFormSubmissions((prev) => [newSub, ...prev]);
    setShowManualEntryModal(false);
    setManualEntryAnswers({});
    if (persisted) {
      toast.success('Manual Entry Recorded', `Entry saved for "${selectedClosedForm.title}"!`);
    }
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
    })
      .then(() => {
        toast.success(nextEnabled ? 'Module Enabled' : 'Module Disabled', `"${flag.name}" is now ${nextEnabled ? 'live' : 'hidden'} for all visitors.`);
      })
      .catch((err: any) => {
        // Roll the optimistic flip back — the toggle above never actually
        // persisted, so the UI must not keep claiming it did.
        setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, is_enabled: !nextEnabled } : f)));
        toast.error('Not Saved to Server', err?.message || `Could not update "${flag.name}". Reverted.`);
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
    handleResetBuilder,
    hasSavedCheckpoint: !!savedCheckpoint,
    isPreviewMode,
    setIsPreviewMode,
    previewAnswers,
    setPreviewAnswers,
    showTestDataModal,
    setShowTestDataModal,
    submittedTestData,
    handleTestPreviewSubmit,

    // Loading States & Live Sync
    isLoadingForms,
    isLoadingUsers,
    isLoadingSubmissions,
    isLoadingAuditLogs,
    isLoadingFlags,
    isLoadingBuilder,
    refetchForms,
    refetchAll,

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
