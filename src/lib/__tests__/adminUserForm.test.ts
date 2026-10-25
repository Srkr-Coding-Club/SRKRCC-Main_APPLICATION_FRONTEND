import { describe, expect, it } from 'vitest';
import {
  EMPTY_NEW_USER,
  buildRegisterPayload,
  firstErrorField,
  mapRegisterErrors,
  validateNewUser,
  type NewUserForm,
} from '../adminUserForm';
import { validateAffiliateId } from '../validation/auth';

const valid = (over: Partial<NewUserForm> = {}): NewUserForm => ({
  ...EMPTY_NEW_USER, name: 'Ravi Kumar', email: 'Ravi@Example.org', year: '3', password: 'StrongPass123!', ...over,
});
const college = { id: 7, code: 'C-7', name: 'Godavari Institute', district: 'East Godavari', state: 'AP' };

describe('Club ID formats', () => {
  it('accepts the three formats the club uses, in any case', () => {
    for (const id of ['25SCC123', '26SCC123', '21CCA041', '1CCA041', '25scc123', '21cca041']) expect(validateAffiliateId(id), id).toBeUndefined();
  });

  it('refuses everything else and says what is accepted', () => {
    for (const id of ['', '25XYZ123', '25SCC12', '5SCC123', '123SCC123', 'SCC123', '25CCA', 'abc', '25 SCC']) {
      const message = validateAffiliateId(id);
      expect(message, id).toBeTruthy();
    }
    expect(validateAffiliateId('25XYZ123')).toContain('25SCC277 or 21CCA041');
    expect(validateAffiliateId('5SCC123')).toContain('two-digit year');
  });
});

describe('validateNewUser', () => {
  it('passes a complete form', () => {
    expect(validateNewUser(valid())).toEqual({});
  });

  it('asks for everything the server requires', () => {
    const errors = validateNewUser(EMPTY_NEW_USER);
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'password']);
    expect(validateNewUser(valid({ year: '' })).year).toBeTruthy();
    expect(validateNewUser(valid({ year: '5' })).year).toBeTruthy();
    expect(validateNewUser(valid({ branch: 'XYZ' })).branch).toBeTruthy();
  });

  it('checks the optional fields only when they are filled in', () => {
    expect(validateNewUser(valid({ rollNumber: '', phoneNumber: '' }))).toEqual({});
    expect(validateNewUser(valid({ rollNumber: '123' })).rollNumber).toBeTruthy();
    expect(validateNewUser(valid({ phoneNumber: '12345' })).phoneNumber).toBeTruthy();
    expect(validateNewUser(valid({ rollNumber: '21B91A0501', phoneNumber: '9876543210' }))).toEqual({});
  });

  it('checks a typed college name but accepts a catalogue one or none', () => {
    expect(validateNewUser(valid({ college: { college, otherName: null } }))).toEqual({});
    expect(validateNewUser(valid({ college: { college: null, otherName: '' } })).college).toBeTruthy();
    expect(validateNewUser(valid({ college: { college: null, otherName: 'x' } })).college).toBeTruthy();
    expect(validateNewUser(valid({ college: { college: null, otherName: '<b>x</b>' } })).college).toBeTruthy();
    expect(validateNewUser(valid({ college: { college: null, otherName: 'Village Polytechnic' } }))).toEqual({});
  });

  it('needs a club id for an affiliate, in one of the formats, and checks one given to anybody else', () => {
    expect(validateNewUser(valid({ role: 'AFFILIATE' })).clubId).toBeTruthy();
    expect(validateNewUser(valid({ role: 'AFFILIATE', clubId: '21CCA041' }))).toEqual({});
    expect(validateNewUser(valid({ role: 'AFFILIATE', clubId: '5SCC1' })).clubId).toBeTruthy();
    expect(validateNewUser(valid({ role: 'VOLUNTEER', clubId: '' }))).toEqual({});
    expect(validateNewUser(valid({ role: 'NON_AFFILIATE', clubId: 'nope' })).clubId).toBeTruthy();
  });

  it('checks the name and email like the server does', () => {
    expect(validateNewUser(valid({ name: 'R2D2' })).name).toBeTruthy();
    expect(validateNewUser(valid({ name: 'Ravi' }))).toEqual({});
    expect(validateNewUser(valid({ email: 'not-an-email' })).email).toBeTruthy();
    expect(validateNewUser(valid({ password: 'short' })).password).toBeTruthy();
  });
});

describe('buildRegisterPayload', () => {
  it('sends the year as a number, the college, and a lower-cased email', () => {
    const payload = buildRegisterPayload(valid({ college: { college, otherName: null }, rollNumber: '21b91a0501', phoneNumber: '98765 43210', role: 'AFFILIATE', clubId: '21cca041' }));
    expect(payload).toEqual({
      email: 'ravi@example.org', password: 'StrongPass123!', first_name: 'Ravi', last_name: 'Kumar', role: 'AFFILIATE', branch: 'CSE', year: 3,
      roll_number: '21B91A0501', phone_number: '9876543210', college_id: 7, club_id: '21CCA041',
    });
  });

  it('sends a typed college name instead of an id, trimmed', () => {
    const payload = buildRegisterPayload(valid({ college: { college: null, otherName: '  Village Polytechnic ' } }));
    expect(payload.other_college_name).toBe('Village Polytechnic');
    expect(payload).not.toHaveProperty('college_id');
  });

  it('leaves the college out when nothing was chosen, so the server uses the home college', () => {
    const payload = buildRegisterPayload(valid());
    expect(payload).not.toHaveProperty('college_id');
    expect(payload).not.toHaveProperty('other_college_name');
  });

  it('leaves out blank optional fields and handles one-word and long names', () => {
    const payload = buildRegisterPayload(valid({ name: '  Ravi  ', rollNumber: '', phoneNumber: '', clubId: '' }));
    expect(payload).toMatchObject({ first_name: 'Ravi', last_name: '' });
    for (const key of ['roll_number', 'phone_number', 'club_id']) expect(payload).not.toHaveProperty(key);
    expect(buildRegisterPayload(valid({ name: 'Anna Maria de la Cruz' }))).toMatchObject({ first_name: 'Anna', last_name: 'Maria de la Cruz' });
  });

  it('never sends the id of a college when a typed name is chosen', () => {
    expect(buildRegisterPayload(valid({ college: { college, otherName: 'Other' } }))).not.toHaveProperty('college_id');
  });
});

describe('mapRegisterErrors', () => {
  it('puts each server message under its own field', () => {
    const mapped = mapRegisterErrors({
      year: ['Year of study must be between 1 and 4.'], college_id: ['Select a college from the list.'], other_college_name: ['too short'],
      first_name: ['First name is required.'], last_name: ['bad'], roll_number: ['taken'], phone_number: ['bad phone'], club_id: ['taken'], email: ['exists'],
    });
    expect(mapped).toEqual({
      year: 'Year of study must be between 1 and 4.', college: 'Select a college from the list.', name: 'First name is required.',
      rollNumber: 'taken', phoneNumber: 'bad phone', clubId: 'taken', email: 'exists',
    });
  });

  it('sends anything it does not know to the form-level message, and ignores non-bodies', () => {
    expect(mapRegisterErrors({ detail: 'Registration failed.' })).toEqual({ form: 'Registration failed.' });
    expect(mapRegisterErrors({ non_field_errors: ['conflict'] })).toEqual({ form: 'conflict' });
    for (const body of [null, undefined, 'text', 5, ['x']]) expect(mapRegisterErrors(body)).toEqual({});
  });

  it('copes with empty message lists', () => {
    expect(mapRegisterErrors({ year: [] })).toEqual({});
  });
});

describe('firstErrorField', () => {
  it('follows the order the form shows its fields', () => {
    expect(firstErrorField({ password: 'x', email: 'y' })).toBe('email');
    expect(firstErrorField({ form: 'only a general message' })).toBeNull();
    expect(firstErrorField({})).toBeNull();
  });
});
