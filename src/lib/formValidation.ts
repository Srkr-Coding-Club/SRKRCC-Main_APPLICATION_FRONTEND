import { FormField } from './types';

interface FileLike {
  name: string;
  size: number;
}

export function hasConstraintOptions(type: FormField['type']): boolean {
  return type === 'TEXT' || type === 'PARAGRAPH' || type === 'NUMBER' || type === 'CHECKBOX' || type === 'DATE' || type === 'FILE' || type === 'MULTI_FILE';
}

export function hasActiveValidation(field: FormField): boolean {
  const r = field.validation_rules;
  if (!r) return false;
  return Object.values(r).some((v) => v !== undefined && v !== '');
}

export function getConstraintHint(field: FormField): string | null {
  const r = field.validation_rules;
  if (!r) return null;

  switch (field.type) {
    case 'TEXT':
    case 'PARAGRAPH':
      if (r.minLength != null && r.maxLength != null) return `${r.minLength}-${r.maxLength} characters`;
      if (r.maxLength != null) return `Max ${r.maxLength} characters`;
      if (r.minLength != null) return `Min ${r.minLength} characters`;
      if (r.pattern) return 'Must match a required format';
      return null;
    case 'NUMBER':
      if (r.minValue != null && r.maxValue != null) return `Number between ${r.minValue} and ${r.maxValue}`;
      if (r.maxValue != null) return `Number up to ${r.maxValue}`;
      if (r.minValue != null) return `Number at least ${r.minValue}`;
      return null;
    case 'CHECKBOX':
      if (r.minSelected != null && r.maxSelected != null) return `Choose ${r.minSelected}-${r.maxSelected} options`;
      if (r.maxSelected != null) return `Choose up to ${r.maxSelected} options`;
      if (r.minSelected != null) return `Choose at least ${r.minSelected} options`;
      return null;
    case 'DATE':
      if (r.minDate && r.maxDate) return `Between ${r.minDate} and ${r.maxDate}`;
      if (r.minDate) return `On or after ${r.minDate}`;
      if (r.maxDate) return `On or before ${r.maxDate}`;
      return null;
    case 'FILE':
    case 'MULTI_FILE': {
      const parts: string[] = [];
      if (r.allowedFileTypes) parts.push(`Accepted: ${r.allowedFileTypes}`);
      if (r.maxFileSizeMB) parts.push(`Max ${r.maxFileSizeMB}MB`);
      return parts.length ? parts.join(' • ') : null;
    }
    default:
      return null;
  }
}

export function validateFieldValue(field: FormField, value: any): string | null {
  const r = field.validation_rules || {};
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (field.is_required && isEmpty) {
    return `${field.label} is required.`;
  }
  if (isEmpty) return null;

  switch (field.type) {
    case 'TEXT':
    case 'PARAGRAPH': {
      const str = String(value);
      if (r.minLength != null && str.length < r.minLength) return r.patternError || `Must be at least ${r.minLength} characters.`;
      if (r.maxLength != null && str.length > r.maxLength) return r.patternError || `Must be at most ${r.maxLength} characters.`;
      if (r.pattern) {
        try {
          if (!new RegExp(r.pattern).test(str)) return r.patternError || 'Value does not match the required format.';
        } catch {
          // admin-authored pattern is invalid regex — ignore rather than block submission
        }
      }
      return null;
    }
    case 'NUMBER': {
      const num = Number(value);
      if (Number.isNaN(num)) return 'Must be a valid number.';
      if (r.minValue != null && num < r.minValue) return r.patternError || `Must be at least ${r.minValue}.`;
      if (r.maxValue != null && num > r.maxValue) return r.patternError || `Must be at most ${r.maxValue}.`;
      return null;
    }
    case 'CHECKBOX': {
      const arr = Array.isArray(value) ? value : [];
      if (r.minSelected != null && arr.length < r.minSelected) return r.patternError || `Select at least ${r.minSelected} option(s).`;
      if (r.maxSelected != null && arr.length > r.maxSelected) return r.patternError || `Select at most ${r.maxSelected} option(s).`;
      return null;
    }
    case 'DATE': {
      if (r.minDate && String(value) < r.minDate) return r.patternError || `Date must be on or after ${r.minDate}.`;
      if (r.maxDate && String(value) > r.maxDate) return r.patternError || `Date must be on or before ${r.maxDate}.`;
      return null;
    }
    case 'FILE':
    case 'MULTI_FILE': {
      const files: FileLike[] = Array.isArray(value) ? value : [value];
      const allowed = r.allowedFileTypes
        ? r.allowedFileTypes.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [];
      for (const f of files) {
        if (allowed.length) {
          const ext = `.${(f.name.split('.').pop() || '').toLowerCase()}`;
          if (!allowed.includes(ext)) return r.patternError || `File type not allowed. Accepted: ${r.allowedFileTypes}`;
        }
        if (r.maxFileSizeMB && f.size > r.maxFileSizeMB * 1024 * 1024) {
          return r.patternError || `File exceeds ${r.maxFileSizeMB}MB limit.`;
        }
      }
      return null;
    }
    default:
      return null;
  }
}
