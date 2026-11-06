import { AuthUser } from './auth';
import { FormRestrictions } from './types';
import { displayCollegeName, DEFAULT_COLLEGE_NAME } from './colleges';

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  customMessage?: string;
  needsSignIn?: boolean;
}

export function formatYearLabel(year: number): string {
  switch (year) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    default:
      return `${year}th Year`;
  }
}

export function formatYearsList(years: number[]): string {
  if (years.length === 0) return '';
  if (years.length === 1) return formatYearLabel(years[0]);
  const sorted = [...years].sort((a, b) => a - b);
  const labels = sorted.map(formatYearLabel);
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}

/**
 * Checks whether an authenticated user fulfills the criteria configured
 * in the form's `restrictions`. Returns whether they are eligible and any
 * specific reasons why they cannot fill out the form.
 */
export function evaluateFormEligibility(
  user: AuthUser | null,
  restrictions?: FormRestrictions | null,
): EligibilityResult {
  // If restrictions are not configured or explicitly disabled, everyone is eligible
  if (!restrictions || !restrictions.enabled) {
    return { eligible: true, reasons: [] };
  }

  const customMessage = restrictions.custom_restriction_message?.trim() || undefined;

  // Unauthenticated users cannot be verified against criteria
  if (!user) {
    return {
      eligible: false,
      reasons: ['Please sign in to verify your eligibility for this form.'],
      customMessage,
      needsSignIn: true,
    };
  }

  const reasons: string[] = [];

  // 1. Club Member Only Check
  if (restrictions.club_members_only) {
    const hasClubId = Boolean(user.club_id && String(user.club_id).trim() !== '');
    const isAffiliate = user.role === 'AFFILIATE' || user.role === 'CLUB_LEAD' || user.role === 'ADMIN';
    if (!hasClubId && !isAffiliate) {
      reasons.push('This form is open exclusively to registered Club Members.');
    }
  }

  // 2. Allowed Roles Check
  if (restrictions.allowed_roles && restrictions.allowed_roles.length > 0) {
    const userRole = user.role;
    if (!userRole || !restrictions.allowed_roles.includes(userRole)) {
      const roleLabels = restrictions.allowed_roles.join(', ');
      reasons.push(`Restricted to specific roles (${roleLabels}). Your role: ${userRole || 'None'}.`);
    }
  }

  // 3. Academic Year of Study Check
  if (restrictions.allowed_years && restrictions.allowed_years.length > 0) {
    const userYear = user.year !== undefined && user.year !== null ? Number(user.year) : null;
    if (userYear === null || !restrictions.allowed_years.includes(userYear)) {
      const allowedStr = formatYearsList(restrictions.allowed_years);
      const userYearStr = userYear ? formatYearLabel(userYear) : 'Year not specified on profile';
      reasons.push(`Open to ${allowedStr} students only (Your profile: ${userYearStr}).`);
    }
  }

  // 4. Branch / Department Check
  if (restrictions.allowed_branches && restrictions.allowed_branches.length > 0) {
    const userBranch = (user.branch || '').trim().toUpperCase();
    const allowed = restrictions.allowed_branches.map((b) => b.trim().toUpperCase());
    if (!userBranch || !allowed.includes(userBranch)) {
      reasons.push(
        `Open to ${restrictions.allowed_branches.join(', ')} branches only (Your profile: ${userBranch || 'Branch not set'}).`,
      );
    }
  }

  // 5. College Check
  const userCollege = (displayCollegeName(user) || '').trim();
  if (restrictions.home_college_only) {
    const isHome =
      !userCollege ||
      userCollege.toLowerCase().includes('srkr') ||
      userCollege.toLowerCase() === DEFAULT_COLLEGE_NAME.toLowerCase();
    if (!isHome) {
      reasons.push(`Restricted to students of ${DEFAULT_COLLEGE_NAME} (Your profile: ${userCollege}).`);
    }
  } else if (restrictions.allowed_colleges && restrictions.allowed_colleges.length > 0) {
    const allowed = restrictions.allowed_colleges.map((c) => c.trim().toLowerCase());
    const isMatch = allowed.some((c) => userCollege.toLowerCase().includes(c));
    if (!isMatch) {
      reasons.push(`Restricted to selected colleges (${restrictions.allowed_colleges.join(', ')}).`);
    }
  }

  // 6. Specific Member Whitelist Check (Email, Roll Number, or Club ID)
  if (restrictions.allowed_members && restrictions.allowed_members.length > 0) {
    const userEmail = (user.email || '').trim().toLowerCase();
    const userRoll = (user.roll_number || '').trim().toLowerCase();
    const userClubId = (user.club_id || '').trim().toUpperCase();

    const allowedTokens = restrictions.allowed_members
      .map((m) => m.trim())
      .filter(Boolean);

    const matchesWhitelist = allowedTokens.some((token) => {
      const tokenLower = token.toLowerCase();
      const tokenUpper = token.toUpperCase();
      return (
        (userEmail && tokenLower === userEmail) ||
        (userRoll && tokenLower === userRoll) ||
        (userClubId && tokenUpper === userClubId)
      );
    });

    if (!matchesWhitelist) {
      reasons.push('This form is restricted to pre-approved invited members only.');
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    customMessage,
    needsSignIn: false,
  };
}

