import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REGISTRATION, RegistrationDetailsFields, registrationErrors, type RegistrationConfig } from '../RegistrationDetailsFields';

const config: RegistrationConfig = {
  rules: 'Be kind.',
  require_rules_acceptance: true,
  registration_questions: [
    { key: 'laptop', label: 'I will bring my own laptop', type: 'checkbox', required: true },
    { key: 'city', label: 'City', type: 'text', required: true },
    { key: 'diet', label: 'Dietary needs', type: 'select', required: false, options: ['Veg', 'Non-veg'] },
  ],
};

afterEach(() => cleanup());

describe('RegistrationDetailsFields errors', () => {
  const errors = registrationErrors(config, EMPTY_REGISTRATION);
  const renderFields = () => render(<RegistrationDetailsFields config={config} value={EMPTY_REGISTRATION} onChange={vi.fn()} errors={errors} />);

  it('reports every missing answer, including the required checkbox question', () => {
    expect(Object.keys(errors).sort()).toEqual(['accept_rules', 'city', 'laptop']);
  });

  it('shows the message for a required checkbox question (it used to be dropped)', () => {
    renderFields();
    const alerts = screen.getAllByRole('alert').map((node) => node.textContent);
    expect(alerts).toContain('This answer is required.');
    expect(alerts.filter((text) => text === 'This answer is required.')).toHaveLength(2);
    expect(alerts).toContain('Please accept the rules to continue.');
  });

  it('ties each message to its field so a screen reader reads it with the field', () => {
    renderFields();
    for (const label of [/I have read and accept the rules/, /I will bring my own laptop/, /^City/]) {
      const field = screen.getByLabelText(label);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      const message = document.getElementById(field.getAttribute('aria-describedby') ?? '');
      expect(message?.getAttribute('role')).toBe('alert');
    }
  });

  it('has no axe violations with the errors showing', async () => {
    renderFields();
    expect((await axe.run(document.body, { rules: { region: { enabled: false }, 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  });

  it('renders no alerts when everything is answered', () => {
    const answered = { acceptRules: true, answers: { laptop: true, city: 'Bhimavaram' } };
    render(<RegistrationDetailsFields config={config} value={answered} onChange={vi.fn()} errors={registrationErrors(config, answered)} />);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});
