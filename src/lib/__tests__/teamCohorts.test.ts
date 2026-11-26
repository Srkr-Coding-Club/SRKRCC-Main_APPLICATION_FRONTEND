import { describe, expect, it } from 'vitest';
import { breakdownOf, cohortOf, notCompetingSummary } from '../teamCohorts';

describe('teamCohorts', () => {
  it('puts every team in exactly one group, matching the backend rules', () => {
    expect(cohortOf({ status: 'REGISTERED' })).toBe('competing');
    expect(cohortOf({ status: 'REGISTERED', is_waitlisted: true })).toBe('waitlisted');
    expect(cohortOf({ status: 'FORMING' })).toBe('forming');
    expect(cohortOf({ status: 'FORMING', is_waitlisted: true })).toBe('waitlisted');
    expect(cohortOf({ status: 'PAYMENT_PENDING' })).toBe('awaiting_payment');
    expect(cohortOf({ status: 'PAYMENT_REJECTED', is_waitlisted: true })).toBe('awaiting_payment');
    expect(cohortOf({ status: 'WITHDRAWN', is_waitlisted: true })).toBe('removed');
    expect(cohortOf({ status: 'DISQUALIFIED' })).toBe('removed');
  });

  it('adds the groups up to the total and names only the groups that have teams', () => {
    const teams = [
      { status: 'REGISTERED' }, { status: 'REGISTERED' }, { status: 'FORMING' },
      { status: 'REGISTERED', is_waitlisted: true }, { status: 'PAYMENT_PENDING' }, { status: 'WITHDRAWN' },
    ];
    const counts = breakdownOf(teams);
    expect(counts).toEqual({ competing: 2, forming: 1, waitlisted: 1, awaiting_payment: 1, removed: 1, total: 6 });
    expect(notCompetingSummary(counts)).toBe('1 forming · 1 waitlisted · 1 awaiting payment · 1 withdrawn or disqualified');
    expect(notCompetingSummary(breakdownOf([{ status: 'REGISTERED' }]))).toBe('');
  });
});
