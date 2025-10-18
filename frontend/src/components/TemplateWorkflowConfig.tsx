'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Info, Plus, Trash2, ChevronUp, ChevronDown,
  User, Shield, Users, Search, X, HelpCircle
} from 'lucide-react';

// ============ TYPES ============

export type SignerType = 'assignee' | 'creating_admin' | 'assignees_manager' | 'specific_person';

export interface TemplateSignerConfig {
  order: number;
  signerType: SignerType;
  roleName: string;
  bitrixId?: number;
  description?: string;
}

export interface DefaultSignerConfig {
  mode: 'single_signer' | 'multi_signer';
  signers?: TemplateSignerConfig[];
  description?: string;
}

interface Employee {
  id: number;
  name: string;
  badgeNumber: string;
  position?: string;
  email?: string;
}

interface TemplateWorkflowConfigProps {
  value: DefaultSignerConfig | null;
  onChange: (config: DefaultSignerConfig) => void;
  currentAdminName?: string;
  employees?: Employee[];
}

// ============ MAIN COMPONENT ============

export function TemplateWorkflowConfig({
  value,
  onChange,
  currentAdminName = 'You',
  employees = [],
}: TemplateWorkflowConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'single_signer' | 'multi_signer'>(
    value?.mode || 'single_signer'
  );
  const [signers, setSigners] = useState<TemplateSignerConfig[]>(
    value?.signers || []
  );

  // Update parent when config changes
  useEffect(() => {
    if (mode === 'single_signer') {
      onChange({ mode: 'single_signer' });
    } else {
      onChange({
        mode: 'multi_signer',
        signers: signers.map((s, idx) => ({ ...s, order: idx + 1 })),
      });
    }
  }, [mode, signers]);

  // Auto-add assignee when switching to multi-signer
  const handleModeChange = (newMode: 'single_signer' | 'multi_signer') => {
    setMode(newMode);
    if (newMode === 'multi_signer' && signers.length === 0) {
      setSigners([{
        order: 1,
        signerType: 'assignee',
        roleName: 'Employee',
        description: 'The employee receiving this document',
      }]);
    }
  };

  const addSigner = () => {
    if (signers.length >= 4) return;

    const newSigner: TemplateSignerConfig = {
      order: signers.length + 1,
      signerType: 'creating_admin',
      roleName: 'HR Admin',
      description: 'The admin who creates the assignment',
    };

    setSigners([...signers, newSigner]);
  };

  const updateSigner = (index: number, updates: Partial<TemplateSignerConfig>) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], ...updates };
    setSigners(updated);
  };

  const removeSigner = (index: number) => {
    if (signers.length <= 1) return; // Can't remove last signer
    setSigners(signers.filter((_, i) => i !== index));
  };

  const moveSigner = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === signers.length - 1)
    ) {
      return;
    }

    const newSigners = [...signers];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSigners[index], newSigners[swapIndex]] = [newSigners[swapIndex], newSigners[index]];
    setSigners(newSigners);
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-hartzell-blue" />
          <span className="font-medium text-gray-900">
            Workflow Configuration
          </span>
          <span className="text-xs text-gray-500">(Optional)</span>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'multi_signer' && signers.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {signers.length} signers
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {!isExpanded && (
        <div className="px-4 py-2 text-sm text-gray-600 border-t border-gray-200">
          {mode === 'single_signer' ? (
            <span>Single-signer by default. Click to configure multi-signature workflows.</span>
          ) : (
            <span>Multi-signer workflow configured: {generatePreviewText(signers, currentAdminName, employees)}</span>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-6 border-t border-gray-200">
          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Signature Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={mode === 'single_signer'}
                  onChange={() => handleModeChange('single_signer')}
                  className="mr-2"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Single Signer</div>
                  <div className="text-xs text-gray-500">Assigned employee only</div>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={mode === 'multi_signer'}
                  onChange={() => handleModeChange('multi_signer')}
                  className="mr-2"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Multi-Signer</div>
                  <div className="text-xs text-gray-500">Sequential signature workflow</div>
                </div>
              </label>
            </div>
          </div>

          {/* Multi-Signer Configuration */}
          {mode === 'multi_signer' && (
            <>
              {/* Signing Sequence */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Signing Sequence
                  </label>
                  <span className="text-xs text-gray-500">
                    {signers.length}/4 signers
                  </span>
                </div>

                <div className="space-y-3">
                  {signers.map((signer, index) => (
                    <SignerCard
                      key={index}
                      signer={signer}
                      index={index}
                      totalSigners={signers.length}
                      onUpdate={(updates) => updateSigner(index, updates)}
                      onRemove={() => removeSigner(index)}
                      onMoveUp={() => moveSigner(index, 'up')}
                      onMoveDown={() => moveSigner(index, 'down')}
                      currentAdminName={currentAdminName}
                      employees={employees}
                    />
                  ))}
                </div>

                {/* Add Signer Button */}
                {signers.length < 4 && (
                  <button
                    type="button"
                    onClick={addSigner}
                    className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-hartzell-blue hover:text-hartzell-blue transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Signer
                  </button>
                )}
              </div>

              {/* Workflow Preview */}
              <WorkflowPreview
                signers={signers}
                currentAdminName={currentAdminName}
                employees={employees}
              />

              {/* Validation Messages */}
              {signers.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    Add at least one signer to your workflow
                  </p>
                </div>
              )}

              {signers.some(s => s.signerType === 'assignees_manager') && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Manager Requirement:</strong> Assignments will fail for employees
                    without a manager assigned in Bitrix24.
                  </div>
                </div>
              )}
            </>
          )}

          {/* Help Text */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <strong>Tip:</strong> Workflows are configured once per template and automatically
              applied to all assignments. This ensures consistency and saves time.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SIGNER CARD COMPONENT ============

function SignerCard({
  signer,
  index,
  totalSigners,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  currentAdminName,
  employees,
}: {
  signer: TemplateSignerConfig;
  index: number;
  totalSigners: number;
  onUpdate: (updates: Partial<TemplateSignerConfig>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  currentAdminName: string;
  employees: Employee[];
}) {
  const [showPersonSelector, setShowPersonSelector] = useState(false);

  const signerTypeOptions = [
    {
      value: 'assignee',
      label: 'Assignee (Employee)',
      description: 'The employee receiving this document',
      icon: User,
      defaultRole: 'Employee',
    },
    {
      value: 'creating_admin',
      label: `Creating Admin (${currentAdminName})`,
      description: 'The admin who creates the assignment',
      icon: Shield,
      defaultRole: 'HR Admin',
    },
    {
      value: 'assignees_manager',
      label: "Assignee's Manager",
      description: 'Looked up from Bitrix24 (requires manager)',
      icon: Users,
      defaultRole: 'Manager',
      warning: true,
    },
    {
      value: 'specific_person',
      label: 'Specific Person',
      description: 'Choose a specific employee',
      icon: User,
      defaultRole: 'Approver',
    },
  ];

  const currentOption = signerTypeOptions.find(opt => opt.value === signer.signerType);
  const selectedPerson = employees.find(emp => emp.id === signer.bitrixId);

  const handleTypeChange = (newType: SignerType) => {
    const option = signerTypeOptions.find(opt => opt.value === newType);
    onUpdate({
      signerType: newType,
      roleName: option?.defaultRole || signer.roleName,
      description: option?.description,
      bitrixId: newType === 'specific_person' ? signer.bitrixId : undefined,
    });

    if (newType === 'specific_person') {
      setShowPersonSelector(true);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${currentOption?.warning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        {/* Order Number */}
        <div className="flex-shrink-0 w-8 h-8 bg-hartzell-blue text-white rounded-full flex items-center justify-center font-semibold text-sm">
          {index + 1}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Signer Type Dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Signer Type
            </label>
            <select
              value={signer.signerType}
              onChange={(e) => handleTypeChange(e.target.value as SignerType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent text-sm"
            >
              {signerTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {currentOption?.description && (
              <p className="mt-1 text-xs text-gray-500">
                {currentOption.description}
              </p>
            )}
          </div>

          {/* Specific Person Selector */}
          {signer.signerType === 'specific_person' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Person
              </label>
              {selectedPerson ? (
                <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{selectedPerson.name}</div>
                    <div className="text-xs text-gray-600">
                      Badge: {selectedPerson.badgeNumber}
                      {selectedPerson.position && ` • ${selectedPerson.position}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({ bitrixId: undefined });
                      setShowPersonSelector(true);
                    }}
                    className="text-sm text-hartzell-blue hover:text-blue-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPersonSelector(true)}
                  className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-hartzell-blue hover:text-hartzell-blue transition-colors"
                >
                  Click to select a person
                </button>
              )}

              {!selectedPerson && (
                <p className="mt-1 text-xs text-red-600">
                  Please select a person for this signer
                </p>
              )}
            </div>
          )}

          {/* Role Name Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role Name
            </label>
            <input
              type="text"
              value={signer.roleName}
              onChange={(e) => onUpdate({ roleName: e.target.value })}
              placeholder="e.g., Employee, Manager, HR Admin"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent text-sm"
            />
          </div>

          {/* Warning for Manager */}
          {signer.signerType === 'assignees_manager' && (
            <div className="flex items-start gap-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
              <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                Requires employees to have a manager assigned in Bitrix24
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {/* Move Up */}
          {index > 0 && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}

          {/* Move Down */}
          {index < totalSigners - 1 && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* Remove */}
          {totalSigners > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Remove signer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Person Selector Modal */}
      {showPersonSelector && (
        <PersonSelectorModal
          employees={employees}
          onSelect={(employeeId) => {
            onUpdate({ bitrixId: employeeId });
            setShowPersonSelector(false);
          }}
          onClose={() => setShowPersonSelector(false)}
        />
      )}
    </div>
  );
}

// ============ PERSON SELECTOR MODAL ============

function PersonSelectorModal({
  employees,
  onSelect,
  onClose,
}: {
  employees: Employee[];
  onSelect: (employeeId: number) => void;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Person</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or badge..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="overflow-y-auto max-h-[400px]">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No employees found
            </div>
          ) : (
            filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => onSelect(emp.id)}
                className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors"
              >
                <div className="font-medium text-gray-900">{emp.name}</div>
                <div className="text-sm text-gray-600">{emp.position || 'No position'}</div>
                <div className="text-xs text-gray-500">Badge: {emp.badgeNumber}</div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ WORKFLOW PREVIEW COMPONENT ============

function WorkflowPreview({
  signers,
  currentAdminName,
  employees,
}: {
  signers: TemplateSignerConfig[];
  currentAdminName: string;
  employees: Employee[];
}) {
  const previewText = generatePreviewText(signers, currentAdminName, employees);
  const exampleText = generateExampleText(signers, currentAdminName, employees);

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">
          Workflow Preview
        </h4>
      </div>

      <div className="space-y-2">
        <div className="text-lg font-medium text-gray-900">
          {previewText}
        </div>

        <div className="text-sm text-blue-700">
          {exampleText}
        </div>
      </div>
    </div>
  );
}

// ============ HELPER FUNCTIONS ============

function generatePreviewText(
  signers: TemplateSignerConfig[],
  currentAdminName: string,
  employees: Employee[]
): string {
  if (signers.length === 0) return 'No signers configured';

  return signers.map(signer => {
    switch (signer.signerType) {
      case 'assignee':
        return signer.roleName || 'Employee';
      case 'creating_admin':
        return `${currentAdminName} (${signer.roleName || 'HR Admin'})`;
      case 'assignees_manager':
        return signer.roleName || 'Manager';
      case 'specific_person':
        const person = employees.find(emp => emp.id === signer.bitrixId);
        return person
          ? `${person.name} (${signer.roleName || 'Approver'})`
          : signer.roleName || 'Specific Person';
      default:
        return signer.roleName || 'Unknown';
    }
  }).join(' → ');
}

function generateExampleText(
  signers: TemplateSignerConfig[],
  currentAdminName: string,
  employees: Employee[]
): string {
  const exampleEmployeeName = 'John Doe';

  const resolvedSigners = signers.map(signer => {
    switch (signer.signerType) {
      case 'assignee':
        return exampleEmployeeName;
      case 'creating_admin':
        return currentAdminName;
      case 'assignees_manager':
        return "John's Manager";
      case 'specific_person':
        const person = employees.find(emp => emp.id === signer.bitrixId);
        return person?.name || 'Selected Person';
      default:
        return 'Unknown';
    }
  });

  return `Example: When you assign this to ${exampleEmployeeName}, the workflow will be:\n${resolvedSigners.join(' → ')}`;
}
