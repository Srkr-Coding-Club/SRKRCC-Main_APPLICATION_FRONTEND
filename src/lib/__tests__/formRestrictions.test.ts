import { describe, it, expect } from 'vitest';
import { evaluateFormEligibility, formatYearLabel, formatYearsList } from '../formRestrictions';
import { AuthUser } from '../auth';
import { FormRestrictions } from '../types';

const baseUser: AuthUser = {
  id: 1,
  username: 'teststudent',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'Student',
  role: 'NON_AFFILIATE',
  year: 3,
  branch: 'CSE',
  roll_number: '21B91A0501',
  club_id: '25SCC100',
  college: null,
};

describe('formRestrictions', () => {
  it('formats year labels correctly', () => {
    expect(formatYearLabel(1)).toBe('1st Year');
    expect(formatYearLabel(2)).toBe('2nd Year');
    expect(formatYearLabel(3)).toBe('3rd Year');
    expect(formatYearLabel(4)).toBe('4th Year');
    expect(formatYearsList([1, 2])).toBe('1st Year & 2nd Year');
    expect(formatYearsList([2, 3, 4])).toBe('2nd Year, 3rd Year & 4th Year');
  });

  it('allows access when restrictions are undefined or disabled', () => {
    expect(evaluateFormEligibility(baseUser, undefined)).toEqual({
      eligible: true,
      reasons: [],
    });
    expect(evaluateFormEligibility(baseUser, { enabled: false })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it('flags unauthenticated users as needing sign in', () => {
    const res = evaluateFormEligibility(null, { enabled: true, club_members_only: true });
    expect(res.eligible).toBe(false);
    expect(res.needsSignIn).toBe(true);
  });

  it('evaluates club members only restriction', () => {
    const nonMember: AuthUser = { ...baseUser, club_id: undefined, role: 'NON_AFFILIATE' };
    const member: AuthUser = { ...baseUser, club_id: '25SCC100', role: 'AFFILIATE' };

    const restriction: FormRestrictions = { enabled: true, club_members_only: true };
    expect(evaluateFormEligibility(nonMember, restriction).eligible).toBe(false);
    expect(evaluateFormEligibility(member, restriction).eligible).toBe(true);
  });

  it('evaluates allowed roles restriction', () => {
    const studentUser: AuthUser = { ...baseUser, role: 'NON_AFFILIATE' };
    const leadUser: AuthUser = { ...baseUser, role: 'CLUB_LEAD' };

    const restriction: FormRestrictions = { enabled: true, allowed_roles: ['CLUB_LEAD', 'ADMIN'] };
    expect(evaluateFormEligibility(studentUser, restriction).eligible).toBe(false);
    expect(evaluateFormEligibility(leadUser, restriction).eligible).toBe(true);
  });

  it('evaluates year of study restriction', () => {
    const year2User: AuthUser = { ...baseUser, year: 2 };
    const year3User: AuthUser = { ...baseUser, year: 3 };

    const restriction: FormRestrictions = { enabled: true, allowed_years: [3, 4] };
    expect(evaluateFormEligibility(year2User, restriction).eligible).toBe(false);
    expect(evaluateFormEligibility(year3User, restriction).eligible).toBe(true);
  });

  it('evaluates branch restriction', () => {
    const cseUser: AuthUser = { ...baseUser, branch: 'CSE' };
    const eceUser: AuthUser = { ...baseUser, branch: 'ECE' };

    const restriction: FormRestrictions = { enabled: true, allowed_branches: ['CSE', 'AIML'] };
    expect(evaluateFormEligibility(eceUser, restriction).eligible).toBe(false);
    expect(evaluateFormEligibility(cseUser, restriction).eligible).toBe(true);
  });

  it('evaluates whitelist restriction by email, roll number, or club id', () => {
    const restriction: FormRestrictions = {
      enabled: true,
      allowed_members: ['vip@example.com', '21b91a0501', '25SCC999'],
    };

    expect(evaluateFormEligibility(baseUser, restriction).eligible).toBe(true); // matches roll number

    const otherUser: AuthUser = {
      ...baseUser,
      email: 'stranger@example.com',
      roll_number: '22B91A0599',
      club_id: '25SCC111',
    };
    expect(evaluateFormEligibility(otherUser, restriction).eligible).toBe(false);
  });

  it('includes custom restriction message when set', () => {
    const nonMember: AuthUser = { ...baseUser, club_id: undefined, role: 'NON_AFFILIATE' };
    const restriction: FormRestrictions = {
      enabled: true,
      club_members_only: true,
      custom_restriction_message: 'This application is strictly for active club members.',
    };

    const res = evaluateFormEligibility(nonMember, restriction);
    expect(res.eligible).toBe(false);
    expect(res.customMessage).toBe('This application is strictly for active club members.');
  });
});

