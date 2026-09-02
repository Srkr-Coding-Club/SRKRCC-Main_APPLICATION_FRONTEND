'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users,
  Search,
  Download,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Building2,
  Phone,
  UserCheck,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { User, PaginatedResponse, Form } from '@/lib/types';
import { fetchApi } from '@/lib/api-client';
import { useToast } from '@/context/ToastContext';
import { DetailDrawer } from './DetailDrawer';

interface MembersTabProps {
  forms?: Form[];
}

function MemberDetailContent({ member, onCopyClubId, copiedId }: { member: User; onCopyClubId: (id: string) => void; copiedId: string | null }) {
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || member.email.split('@')[0];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B2E3B] via-[#FF7A00] to-[#FFA500] p-0.5 shadow-md flex-shrink-0">
          <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-[#151722] flex items-center justify-center text-[#1A1A2E] dark:text-white font-black text-xl">
            {fullName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1A1A2E] dark:text-white truncate">{fullName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {member.club_id && (
              <button
                onClick={() => onCopyClubId(member.club_id!)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs hover:bg-orange-500/20 transition"
              >
                <span>{member.club_id}</span>
                {copiedId === member.club_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              member.membership_status === 'ACTIVE'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}>
              {member.membership_status || 'ACTIVE'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {member.role}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch / Dept</span>
          <div className="text-sm font-bold text-[#1A1A2E] dark:text-white mt-0.5">{member.branch || 'Not Specified'}</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</span>
          <div className="text-sm font-bold text-[#1A1A2E] dark:text-white mt-0.5">{member.phone_number || 'N/A'}</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Referred / Onboarded By</span>
          <div className="text-sm font-bold text-orange-400 mt-0.5 truncate">{member.referred_by_display || member.referred_by_raw || 'Direct / None'}</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member Since</span>
          <div className="text-sm font-bold text-[#1A1A2E] dark:text-white mt-0.5">
            {member.registered_at
              ? new Date(member.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : member.created_at
              ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Account Provenance */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Account Source: <strong className="text-slate-700 dark:text-slate-200">{member.created_from || 'SELF_REGISTRATION'}</strong></span>
        <span>User ID: <strong className="font-mono text-slate-700 dark:text-slate-200">#{member.id}</strong></span>
      </div>
    </div>
  );
}

export function MembersTab({ forms = [] }: MembersTabProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email Campaign Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page_size: '500',
        ...(search && { search }),
      });
      const res = await fetchApi<PaginatedResponse<User> | User[]>(`/auth/users/?${params}`);
      const userList = Array.isArray(res) ? res : res?.results || [];
      setMembers(userList);
    } catch (err: any) {
      toast.error('Failed to Load Members', err?.message || 'Is backend server running?');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleCopyClubId = (clubId: string) => {
    navigator.clipboard.writeText(clubId);
    setCopiedId(clubId);
    toast.success('Club ID Copied', `Copied ${clubId} to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    if (statusFilter !== 'ALL' && (m.membership_status || 'ACTIVE') !== statusFilter) return false;
    if (branchFilter !== 'ALL' && (m.branch || '').toUpperCase() !== branchFilter.toUpperCase()) return false;
    return true;
  });

  const uniqueBranches = Array.from(
    new Set(members.map((m) => m.branch).filter(Boolean))
  ).sort() as string[];

  // CSV Export
  const handleExportCSV = () => {
    if (filteredMembers.length === 0) {
      toast.error('No Data', 'No members to export.');
      return;
    }
    const headers = ['S.No', 'Full Name', 'Email', 'Phone Number', 'Branch', 'Club ID', 'Member', 'Registration Date', 'Status'];
    const rows = filteredMembers.map((m, idx) => [
      idx + 1,
      `"${(`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username).replace(/"/g, '""')}"`,
      `"${m.email}"`,
      `"${m.phone_number || ''}"`,
      `"${m.branch || ''}"`,
      `"${m.club_id || ''}"`,
      `"${m.referred_by_display || m.referred_by_raw || ''}"`,
      `"${m.registered_at ? new Date(m.registered_at).toLocaleDateString('en-US') : ''}"`,
      `"${m.membership_status || 'ACTIVE'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `srkrcc_members_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV Exported', `Exported ${filteredMembers.length} member records.`);
  };

  // Dispatch Email Broadcast
  const handleSendEmailCampaign = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Missing Fields', 'Please enter both subject and message body.');
      return;
    }
    setSendingEmail(true);
    try {
      const recipientEmails = filteredMembers.map((m) => m.email);
      await fetchApi('/auth/emails/send/', {
        method: 'POST',
        body: JSON.stringify({
          template_name: 'member_announcement',
          recipients: recipientEmails,
          campaign_name: emailSubject,
        }),
      });
      toast.success('Email Broadcast Queued', `Dispatched campaign to ${recipientEmails.length} recipients.`);
      setIsEmailModalOpen(false);
      setEmailSubject('');
      setEmailMessage('');
    } catch (err: any) {
      toast.error('Dispatch Failed', err?.message || 'Failed to dispatch email campaign.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#151722] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-[#1A1A2E] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              SRKR Coding Club Member Directory
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black">
              {filteredMembers.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official single-source-of-truth roster with permanent Club IDs (<span className="font-mono text-orange-400">25SCC...</span>) and referral lineage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/csv-ingestion"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Backup Data</span>
          </Link>

          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
          >
            <Mail className="w-4 h-4 text-orange-400" />
            <span>Broadcast Email</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Name, Email, Phone, or Club ID (e.g. 25SCC277)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500 font-semibold"
        >
          <option value="ALL">All Membership Statuses</option>
          <option value="ACTIVE">Active Members</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ALUMNI">Alumni</option>
        </select>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white dark:bg-[#151722] border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500 font-semibold"
        >
          <option value="ALL">All Branches</option>
          {uniqueBranches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Members Directory Table */}
      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading club members…</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-xs bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
          <p className="font-bold text-sm text-[#1A1A2E] dark:text-white">No members matched your search filters</p>
          <p className="text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or import legacy spreadsheets via the Ingestion Wizard.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setBranchFilter('ALL');
            }}
            className="px-4 py-2 bg-orange-500/10 text-orange-400 rounded-xl font-bold text-xs hover:bg-orange-500/20 transition inline-block mt-2"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-[#0f0f1a] border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Club ID</th>
                  <th className="px-5 py-3.5">Member Name & Email</th>
                  <th className="px-5 py-3.5">Branch</th>
                  <th className="px-5 py-3.5">Phone Number</th>
                  <th className="px-5 py-3.5">Referred By</th>
                  <th className="px-5 py-3.5">Joined Date</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredMembers.map((m) => {
                  const displayName = `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || m.email.split('@')[0];
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition cursor-pointer"
                    >
                      {/* Club ID Badge */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        {m.club_id ? (
                          <button
                            onClick={() => handleCopyClubId(m.club_id!)}
                            title="Click to copy Club ID"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs hover:bg-orange-500/20 transition"
                          >
                            <span>{m.club_id}</span>
                            {copiedId === m.club_id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 opacity-60" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono italic">Pending</span>
                        )}
                      </td>

                      {/* Name & Email */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#1A1A2E] dark:text-white">{displayName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                      </td>

                      {/* Branch */}
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {m.branch || '—'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {m.phone_number || '—'}
                      </td>

                      {/* Referred By */}
                      <td className="px-5 py-3.5 text-[11px] text-orange-400 font-semibold truncate max-w-[140px]">
                        {m.referred_by_display || m.referred_by_raw || '—'}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-3.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {m.registered_at
                          ? new Date(m.registered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : m.created_at
                          ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>

                      {/* Membership Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            m.membership_status === 'ACTIVE'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {m.membership_status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member Detail Drawer */}
      <DetailDrawer
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        title="Member Information"
      >
        {selectedMember && (
          <MemberDetailContent
            member={selectedMember}
            onCopyClubId={handleCopyClubId}
            copiedId={copiedId}
          />
        )}
      </DetailDrawer>

      {/* Email Broadcast Modal */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#151722] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A2E] dark:text-white">Email Member Roster</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Broadcasting to <strong>{filteredMembers.length}</strong> selected members
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Campaign Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome to SRKR Coding Club 2025!"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    placeholder="Hello {{full_name}}, your Club ID is {{club_id}}..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-[#1A1A2E] dark:text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Allowed parameters: <span className="font-mono text-orange-400">&#123;&#123;full_name&#125;&#125;</span>, <span className="font-mono text-orange-400">&#123;&#123;club_id&#125;&#125;</span>, <span className="font-mono text-orange-400">&#123;&#123;branch&#125;&#125;</span>, <span className="font-mono text-orange-400">&#123;&#123;email&#125;&#125;</span>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0f0f1a] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmailCampaign}
                  disabled={sendingEmail}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
