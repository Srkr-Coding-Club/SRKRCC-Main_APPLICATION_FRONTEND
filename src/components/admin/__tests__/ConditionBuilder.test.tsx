import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConditionBuilder from '../ConditionBuilder';
import type { FormField } from '@/lib/types';

afterEach(cleanup);

const field = (over: Partial<FormField>): FormField => ({
  id: 1, label: 'Q', type: 'TEXT', is_required: false, order: 1, options: [], conditional_logic: {}, ...over,
});

const siblings: FormField[] = [
  field({ id: 1, label: 'Level', type: 'RADIO', options: ['btech', 'mtech'], order: 1 }),
  field({ id: 2, label: 'Age', type: 'NUMBER', order: 2 }),
  field({ id: 3, label: 'Joined', type: 'DATE', order: 3 }),
  field({ id: 4, label: 'Skills', type: 'CHECKBOX', options: ['js', 'py', 'go'], order: 4 }),
];

/** Holds the field in state like the builder does and exposes the latest emitted logic. */
function Harness({ target, initial = {}, sink }: { target: FormField; initial?: any; sink: { logic: any } }) {
  const [logic, setLogic] = useState<any>(initial);
  sink.logic = logic;
  return <ConditionBuilder field={{ ...target, conditional_logic: logic }} siblingFields={siblings} onChange={setLogic} />;
}

const mount = (target: FormField, initial?: any) => {
  const sink = { logic: initial ?? {} };
  render(<Harness target={target} initial={initial} sink={sink} />);
  return sink;
};

describe('ConditionBuilder', () => {
  it('asks for another question when there is nothing to depend on', () => {
    render(<ConditionBuilder field={field({})} siblingFields={[]} onChange={() => {}} />);
    expect(screen.getByText(/Add another question first/)).toBeTruthy();
  });

  it('starts a condition with one rule on the first question', () => {
    const sink = mount(field({ id: 9, label: 'Details' }));
    fireEvent.click(screen.getByText('Add a condition'));
    expect(sink.logic).toEqual({ logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: '' }] });
  });

  it('adds a second rule, switches to ANY, and nests a group', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'btech' }] });
    fireEvent.click(screen.getByText('Add rule'));
    fireEvent.change(screen.getByDisplayValue('all'), { target: { value: 'OR' } });
    fireEvent.click(screen.getByText('Add group'));
    expect(sink.logic.logic).toBe('OR');
    expect(sink.logic.rules).toHaveLength(3);
    expect(sink.logic.rules[2]).toEqual({ logic: 'AND', rules: [{ field: 1, operator: 'equals', value: '' }] });
  });

  it('removes one rule without touching the others, and everything when the last goes', () => {
    const sink = mount(field({ id: 9 }), {
      logic: 'AND', action: 'show',
      rules: [{ field: 1, operator: 'equals', value: 'btech' }, { field: 2, operator: 'gt', value: 18 }],
    });
    fireEvent.click(screen.getAllByLabelText('Remove this rule')[0]);
    expect(sink.logic.rules).toEqual([{ field: 2, operator: 'gt', value: 18 }]);
    fireEvent.click(screen.getByLabelText('Remove this rule'));
    expect(sink.logic).toEqual({});
  });

  it('only offers operators that suit the watched question', () => {
    mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 3, operator: 'equals', value: '' }] });
    const operator = screen.getByLabelText('Operator') as HTMLSelectElement;
    const offered = Array.from(operator.options).map((o) => o.value);
    expect(offered).toContain('before');
    expect(offered).not.toContain('includes_any');
    expect(offered).not.toContain('contains');
  });

  it('resets the operator when the watched question changes to a type that does not support it', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 3, operator: 'before', value: '2024-01-01' }] });
    fireEvent.change(screen.getByLabelText('Question to watch'), { target: { value: '2' } });
    expect(sink.logic.rules[0]).toEqual({ field: 2, operator: 'equals', value: '' });
  });

  it('collects a from and to value for between', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 2, operator: 'between', value: '' }] });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '25' } });
    expect(sink.logic.rules[0].value).toEqual(['18', '25']);
  });

  it('lets a rule compare with another question instead of a fixed value', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 3, operator: 'before', value: '' }] });
    fireEvent.click(screen.getByLabelText(/Compare with another question/));
    expect(sink.logic.rules[0].value_field).toBe(1);
    expect(sink.logic.rules[0].value).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Question to compare with'), { target: { value: '2' } });
    expect(sink.logic.rules[0].value_field).toBe(2);
    fireEvent.click(screen.getByLabelText(/Compare with another question/));
    expect(sink.logic.rules[0]).toEqual({ field: 3, operator: 'before', value: '' });
  });

  it('collects several options for includes_any', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 4, operator: 'includes_any', value: [] }] });
    fireEvent.click(screen.getByLabelText('js'));
    fireEvent.click(screen.getByLabelText('go'));
    expect(sink.logic.rules[0].value).toEqual(['js', 'go']);
  });

  it('flags a rule that has nothing to compare with', () => {
    mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 2, operator: 'gt', value: '' }] });
    expect(screen.getByText('Needs a value to compare with.')).toBeTruthy();
  });

  it('offers limiting options only on choice questions, and stores the chosen options', () => {
    const choice = field({ id: 9, label: 'Branch', type: 'DROPDOWN', options: ['CSE', 'ECE', 'VLSI'] });
    const sink = mount(choice, { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'btech' }] });
    const action = screen.getByDisplayValue('Show this question') as HTMLSelectElement;
    fireEvent.change(action, { target: { value: 'restrict_options' } });
    fireEvent.click(screen.getByLabelText('CSE'));
    fireEvent.click(screen.getByLabelText('ECE'));
    expect(sink.logic.action).toBe('restrict_options');
    expect(sink.logic.action_value).toEqual(['CSE', 'ECE']);
  });

  it('does not offer limiting options on a text question', () => {
    mount(field({ id: 9, type: 'TEXT' }), { logic: 'AND', action: 'show', rules: [{ field: 1, operator: 'equals', value: 'btech' }] });
    const action = screen.getByDisplayValue('Show this question') as HTMLSelectElement;
    expect(Array.from(action.options).map((o) => o.value)).not.toContain('restrict_options');
  });

  it('stores a note and drops the old action value when the action changes', () => {
    const sink = mount(field({ id: 9 }), { logic: 'AND', action: 'show', rules: [{ field: 2, operator: 'lt', value: 18 }] });
    fireEvent.change(screen.getByDisplayValue('Show this question'), { target: { value: 'display_message' } });
    fireEvent.change(screen.getByPlaceholderText(/Note shown under this question/), { target: { value: 'Under 18s need a guardian.' } });
    expect(sink.logic.action_value).toBe('Under 18s need a guardian.');
    fireEvent.change(screen.getByDisplayValue('Show a note'), { target: { value: 'hide' } });
    expect(sink.logic.action).toBe('hide');
    expect('action_value' in sink.logic).toBe(false);
  });

  it('shows the section wording for section headers and hides require/optional', () => {
    mount(field({ id: 9, type: 'SECTION', label: 'Guardian' }), { logic: 'AND', action: 'show', rules: [{ field: 2, operator: 'lt', value: 18 }] });
    const action = screen.getByDisplayValue('Show this section') as HTMLSelectElement;
    expect(Array.from(action.options).map((o) => o.value)).not.toContain('require');
    expect(within(action).getByText('Show a note')).toBeTruthy();
  });

  it('keeps every rule when an old single-rule condition is edited', () => {
    const sink = mount(field({ id: 9 }), { if: 1, equals: 'btech' });
    fireEvent.click(screen.getByText('Add rule'));
    expect(sink.logic.rules).toHaveLength(2);
    expect(sink.logic.rules[0]).toMatchObject({ field: 1, operator: 'equals', value: 'btech' });
  });

  describe('page routing on a page break', () => {
    const pageBreak = field({ id: 20, type: 'PAGE_BREAK', label: 'Page 2' });
    const laterBreaks = [field({ id: 30, type: 'PAGE_BREAK', label: 'Extras', order: 9 }), field({ id: 31, type: 'PAGE_BREAK', label: 'Wrap up', order: 12 })];

    function RoutingHarness({ initial = {}, sink, later = laterBreaks, unsaved = false }: { initial?: any; sink: { logic: any }; later?: FormField[]; unsaved?: boolean }) {
      const [logic, setLogic] = useState<any>(initial);
      sink.logic = logic;
      return (
        <ConditionBuilder
          field={{ ...pageBreak, conditional_logic: logic }}
          siblingFields={siblings}
          onChange={setLogic}
          laterPageBreaks={later}
          hasUnsavedLaterPageBreaks={unsaved}
        />
      );
    }

    it('starts routing with "end the form" and offers only routing actions', () => {
      const sink = { logic: {} as any };
      render(<RoutingHarness sink={sink} />);
      fireEvent.click(screen.getByText('Add routing'));
      expect(sink.logic).toEqual({ logic: 'AND', action: 'end_form', rules: [{ field: 1, operator: 'equals', value: '' }] });
      const action = screen.getByDisplayValue('End the form after the page before this one') as HTMLSelectElement;
      expect(Array.from(action.options).map((o) => o.value)).toEqual(['skip_to_section', 'end_form']);
    });

    it('picks the page to skip to from the later page breaks', () => {
      const sink = { logic: {} as any };
      render(<RoutingHarness sink={sink} initial={{ logic: 'AND', action: 'end_form', rules: [{ field: 1, operator: 'equals', value: 'btech' }] }} />);
      fireEvent.change(screen.getByDisplayValue('End the form after the page before this one'), { target: { value: 'skip_to_section' } });
      expect(screen.getByText('This action needs a value.')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Page to skip to'), { target: { value: '31' } });
      expect(sink.logic.action).toBe('skip_to_section');
      expect(sink.logic.action_value).toBe(31);
      expect(screen.queryByText('This action needs a value.')).toBeNull();
    });

    it('says the form must be saved first when the later pages have no ids yet', () => {
      const sink = { logic: {} as any };
      render(<RoutingHarness sink={sink} later={[]} unsaved initial={{ logic: 'AND', action: 'skip_to_section', rules: [{ field: 1, operator: 'equals', value: 'a' }] }} />);
      expect(screen.getByText(/save the form first/)).toBeTruthy();
    });

    it('explains itself when no question sits above the page break', () => {
      render(<ConditionBuilder field={pageBreak} siblingFields={[]} onChange={() => {}} />);
      expect(screen.getByText(/Routing reacts to answers on earlier pages/)).toBeTruthy();
    });
  });
});
