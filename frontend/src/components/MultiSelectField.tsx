/**
 * MultiSelectField Component
 * Displays and edits multiselect fields (like Equipment Assigned, Software Access)
 * Shows option labels instead of IDs using provided options map
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { getOptionLabel, getMultiSelectLabels } from '@/lib/bitrixFieldOptions';

interface MultiSelectFieldProps {
  label: string;
  value: string[] | number[] | null | undefined;
  name: string;
  options: Array<{ value: string; label: string }>;
  colSpan?: number;
  isEditing?: boolean;
  handleFieldChange?: (name: string, value: any) => void;
  validationErrors?: Record<string, string>;
}

export default function MultiSelectField({
  label,
  value,
  name,
  options,
  colSpan = 1,
  isEditing = false,
  handleFieldChange,
  validationErrors = {}
}: MultiSelectFieldProps) {
  const spanClass = colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : '';
  const hasError = validationErrors[name];

  // Convert value to array of strings
  const valueArray = Array.isArray(value) ? value.map(v => String(v)) : [];

  // Display mode
  if (!isEditing) {
    const labels = getMultiSelectLabels(options, valueArray);

    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
        <div className="text-sm text-slate-900">
          {labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {labels.map((labelText, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {labelText}
                </span>
              ))}
            </div>
          ) : (
            '—'
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  const handleToggleOption = (optionValue: string) => {
    if (!handleFieldChange) return;

    const currentValues = new Set(valueArray);

    if (currentValues.has(optionValue)) {
      currentValues.delete(optionValue);
    } else {
      currentValues.add(optionValue);
    }

    handleFieldChange(name, Array.from(currentValues));
  };

  return (
    <div className={`mb-2 ${spanClass}`}>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>
      <div className={`w-full px-2 py-2 text-sm border rounded ${hasError ? 'border-red-500' : 'border-slate-300'}`}>
        <div className="flex flex-wrap gap-2">
          {options.filter(opt => opt.value).map((option) => {
            const isSelected = valueArray.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggleOption(option.value)}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
                {isSelected && <X className="w-3 h-3 ml-1" />}
              </button>
            );
          })}
        </div>
        {valueArray.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">Click options to select</p>
        )}
      </div>
      {hasError && <p className="text-xs text-red-500 mt-0.5">{hasError}</p>}
    </div>
  );
}
