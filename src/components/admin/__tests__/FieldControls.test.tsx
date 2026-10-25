import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalculatedFieldEditor, CrossFieldRulesEditor, FieldControls, HiddenFieldEditor, PipeInsert, messageKeysFor } from '../FieldControls';
import type { FormField, ValidationRules } from '@/lib/types';

afterEach(cleanup);

const field = (over: Partial<FormField>): FormField => ({
  id: 1, label: 'Q', type: 'TEXT', is_required: false, order: 1, options: [], ...over,
});

/** Applies each patch the way the builder does (merge into validation_rules) and exposes the result. */
function Harness({ initial, sink, children }: {
  initial: FormField; sink: { rules: ValidationRules };
  children: (field: FormField, onChange: (patch: Partial<ValidationRules>) => void) => React.ReactNode;
}) {
  const [current, setCurrent] = useState(initial);
  sink.rules = current.validation_rules || {};
  return <>{children(current, (patch) => setCurrent({ ...current, validation_rules: { ...(current.validation_rules || {}), ...patch } }))}</>;
}

const mount = (initial: FormField, children: Parameters<typeof Harness>[0]['children']) => {
  const sink = { rules: initial.validation_rules || {} };
  render(<Harness initial={initial} sink={sink}>{children}</Harness>);
  return sink;
};

describe('FieldControls', () => {
  it('offers "unique" only on questions where it makes sense', () => {
    mount(field({ type: 'TEXT' }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    expect(screen.getByLabelText(/used only once/)).toBeTruthy();
    cleanup();
    mount(field({ type: 'PARAGRAPH' }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    expect(screen.queryByLabelText(/used only once/)).toBeNull();
  });

  it('turns unique on and off', () => {
    const sink = mount(field({ type: 'TEXT' }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/used only once/));
    expect(sink.rules.unique).toBe(true);
    fireEvent.click(screen.getByLabelText(/used only once/));
    expect(sink.rules.unique).toBeUndefined();
  });

  it('sets and clears places per option', () => {
    const sink = mount(field({ type: 'RADIO', options: ['Morning', 'Evening'] }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Places for Morning'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Places for Evening'), { target: { value: '12.7' } });
    expect(sink.rules.optionLimits).toEqual({ Morning: 30, Evening: 12 });
    fireEvent.change(screen.getByLabelText('Places for Morning'), { target: { value: '' } });
    expect(sink.rules.optionLimits).toEqual({ Evening: 12 });
    fireEvent.change(screen.getByLabelText('Places for Evening'), { target: { value: '0' } });
    expect(sink.rules.optionLimits).toBeUndefined();
  });

  it('sets a default answer in the shape the question needs', () => {
    const text = mount(field({ type: 'TEXT' }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('No default'), { target: { value: 'Hyderabad' } });
    expect(text.rules.defaultValue).toBe('Hyderabad');
    cleanup();

    const boxes = mount(field({ type: 'CHECKBOX', options: ['js', 'py'] }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'js' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'py' }));
    expect(boxes.rules.defaultValue).toEqual(['js', 'py']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'js' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'py' }));
    expect(boxes.rules.defaultValue).toBeUndefined();
    cleanup();

    const radio = mount(field({ type: 'RADIO', options: ['a', 'b'] }), (f, onChange) => <FieldControls field={f} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('No default'), { target: { value: 'b' } });
    expect(radio.rules.defaultValue).toBe('b');
  });

  it('lists a message box for what can actually go wrong with this question', () => {
    const q = field({
      type: 'TEXT', is_required: true,
      validation_rules: { minLength: 3, maxLength: 10, unique: true, pattern: '[a-z]+', integerOnly: false },
    });
    expect(messageKeysFor(q).map((k) => k.key)).toEqual(['required', 'unique', 'minLength', 'maxLength', 'pattern']);
    expect(messageKeysFor(field({ type: 'EMAIL' })).map((k) => k.key)).toEqual(['type']);
    expect(messageKeysFor(field({ type: 'RADIO', options: ['a'] })).map((k) => k.key)).toEqual(['options']);
    expect(messageKeysFor(field({ type: 'SECTION' }))).toEqual([]);
  });

  it('saves the wording and drops it again when the box is emptied', () => {
    const sink = mount(
      field({ type: 'TEXT', is_required: true, validation_rules: { minLength: 3 } }),
      (f, onChange) => <FieldControls field={f} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('Message: Left empty'), { target: { value: 'We do need your name.' } });
    fireEvent.change(screen.getByLabelText('Message: Too short'), { target: { value: 'Give us a bit more!' } });
    expect(sink.rules.messages).toEqual({ required: 'We do need your name.', minLength: 'Give us a bit more!' });
    fireEvent.change(screen.getByLabelText('Message: Too short'), { target: { value: '   ' } });
    expect(sink.rules.messages).toEqual({ required: 'We do need your name.' });
    fireEvent.change(screen.getByLabelText('Message: Left empty'), { target: { value: '' } });
    expect(sink.rules.messages).toBeUndefined();
  });
});

describe('HiddenFieldEditor', () => {
  it('records the link parameter and the fallback value', () => {
    const sink = mount(field({ type: 'HIDDEN' }), (f, onChange) => <HiddenFieldEditor field={f} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('ref'), { target: { value: ' utm_source ' } });
    fireEvent.change(screen.getByPlaceholderText('website'), { target: { value: 'website' } });
    expect(sink.rules).toMatchObject({ queryParam: 'utm_source', defaultValue: 'website' });
    fireEvent.change(screen.getByPlaceholderText('ref'), { target: { value: '' } });
    expect(sink.rules.queryParam).toBeUndefined();
  });
});

describe('CalculatedFieldEditor', () => {
  const earlier = [
    field({ id: 11, label: 'Price', type: 'NUMBER', order: 1 }),
    field({ id: 12, label: 'Quantity', type: 'NUMBER', order: 2 }),
    field({ id: 13, label: 'Name', type: 'TEXT', order: 3 }),
    field({ id: 1700000000000, label: 'Unsaved', type: 'NUMBER', order: 4 }),
  ];
  const calc = (rules: ValidationRules) => field({ id: 20, type: 'CALCULATED', validation_rules: rules });

  it('inserts an earlier number question into the formula, and only saved number questions are offered', () => {
    const sink = mount(calc({ formula: '{11} *' }), (f, onChange) => <CalculatedFieldEditor field={f} earlierFields={earlier} onChange={onChange} />);
    const picker = screen.getByDisplayValue('Pick a question...') as HTMLSelectElement;
    expect(Array.from(picker.options).map((o) => o.value)).toEqual(['', '11', '12']);
    fireEvent.change(picker, { target: { value: '12' } });
    expect(sink.rules.formula).toBe('{11} * {12}');
  });

  it('shows a worked example for a good formula and explains a bad one', () => {
    mount(calc({ formula: '{11} * {12} + 1.5' }), (f, onChange) => <CalculatedFieldEditor field={f} earlierFields={earlier} onChange={onChange} />);
    expect(screen.getByText(/the result is 2.5/)).toBeTruthy();
    cleanup();

    mount(calc({ formula: '{11} +' }), (f, onChange) => <CalculatedFieldEditor field={f} earlierFields={earlier} onChange={onChange} />);
    expect(screen.getByText(/ends unexpectedly/)).toBeTruthy();
    cleanup();

    mount(calc({ formula: '{99} + 1' }), (f, onChange) => <CalculatedFieldEditor field={f} earlierFields={earlier} onChange={onChange} />);
    expect(screen.getByText('{99} is not another question on this form.')).toBeTruthy();
  });

  it('keeps decimals within 0 to 6', () => {
    const sink = mount(calc({ formula: '{11}' }), (f, onChange) => <CalculatedFieldEditor field={f} earlierFields={earlier} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '9' } });
    expect(sink.rules.decimals).toBe(6);
    fireEvent.change(screen.getByDisplayValue('6'), { target: { value: '-3' } });
    expect(sink.rules.decimals).toBe(0);
  });
});

describe('PipeInsert', () => {
  it('inserts a token for a saved earlier question and hides itself when there is none', () => {
    const tokens: string[] = [];
    const earlier = [field({ id: 5, label: 'Your name' }), field({ id: 1700000000000, label: 'Unsaved' })];
    const { unmount } = render(<PipeInsert earlierFields={earlier} onInsert={(t) => tokens.push(t)} />);
    const select = screen.getByLabelText('Insert an earlier answer') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', '5']);
    fireEvent.change(select, { target: { value: '5' } });
    expect(tokens).toEqual(['{{5}}']);
    unmount();

    const { container } = render(<PipeInsert earlierFields={[]} onInsert={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('CrossFieldRulesEditor', () => {
  const siblings = [field({ id: 5, label: 'Start date', type: 'DATE' }), field({ id: 6, label: 'Email', type: 'EMAIL' })];
  const editor = (rules?: any[]) => mount(
    field({ id: 9, type: 'DATE', validation_rules: rules ? { crossField: rules } : {} }),
    (f, onChange) => <CrossFieldRulesEditor field={f} siblingFields={siblings} onChange={onChange} />,
  );

  it('adds several comparisons and keeps them all', () => {
    const sink = editor();
    fireEvent.click(screen.getByText('+ Add a comparison'));
    fireEvent.click(screen.getByText('+ Add a comparison'));
    expect(sink.rules.crossField).toEqual([{ op: 'eq', field: 5 }, { op: 'eq', field: 5 }]);
    fireEvent.change(screen.getAllByLabelText('Comparison')[0], { target: { value: 'gte' } });
    fireEvent.change(screen.getAllByLabelText('Compared with')[1], { target: { value: '6' } });
    expect(sink.rules.crossField).toEqual([{ op: 'gte', field: 5 }, { op: 'eq', field: 6 }]);
  });

  it('does not lose the rules or messages it did not touch when one is edited (old single-rule editor did)', () => {
    const sink = editor([{ op: 'gte', field: 5, message: 'End must not be before start' }, { op: 'ne', field: 6 }]);
    fireEvent.change(screen.getAllByLabelText('Comparison')[1], { target: { value: 'eq' } });
    expect(sink.rules.crossField).toEqual([{ op: 'gte', field: 5, message: 'End must not be before start' }, { op: 'eq', field: 6 }]);
  });

  it('asks for a trigger value only for "required when", and drops it when the comparison changes', () => {
    const sink = editor([{ op: 'required_if', field: 6, equals: 'yes' }]);
    expect((screen.getByLabelText('Value that makes it required') as HTMLInputElement).value).toBe('yes');
    fireEvent.change(screen.getByLabelText('Comparison'), { target: { value: 'ne' } });
    expect(sink.rules.crossField).toEqual([{ op: 'ne', field: 6 }]);
    expect(screen.queryByLabelText('Value that makes it required')).toBeNull();
  });

  it('stores a message per comparison and removes comparisons one by one', () => {
    const sink = editor([{ op: 'eq', field: 5 }, { op: 'ne', field: 6 }]);
    fireEvent.change(screen.getAllByLabelText('Message for this comparison')[0], { target: { value: 'Must match' } });
    expect(sink.rules.crossField![0]).toEqual({ op: 'eq', field: 5, message: 'Must match' });
    fireEvent.click(screen.getAllByLabelText('Remove comparison')[0]);
    expect(sink.rules.crossField).toEqual([{ op: 'ne', field: 6 }]);
    fireEvent.click(screen.getByLabelText('Remove comparison'));
    expect(sink.rules.crossField).toBeUndefined();
  });

  it('renders nothing when there is nothing to compare with', () => {
    const { container } = render(<CrossFieldRulesEditor field={field({})} siblingFields={[]} onChange={() => {}} />);
    expect(container.innerHTML).toBe('');
  });
});
