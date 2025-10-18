'use client';

import { useState } from 'react';
import { Send, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Toast, ToastContainer } from '@/components/Toast';

interface Assignment {
  id: number;
  templateId: string;
  employeeId: number;
  bitrixId: number;
  signatureRequestId?: string;
  status: 'assigned' | 'sent' | 'signed' | 'declined' | 'expired';
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  assignedAt: string;
  signedAt: string | null;
  notes?: string;
  template: {
    title: string;
    category: string;
    requiresSignature: boolean;
  };
  employee: {
    name: string;
    email: string;
    badgeNumber: string;
  };
}

export default function AssignmentsPage() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [confirmCancel, setConfirmCancel] = useState<{ id: number; name: string } | null>(null);
  const queryClient = useQueryClient();

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch assignments
  const { data, isLoading, error } = useQuery({
    queryKey: ['assignments', filterStatus],
    queryFn: () => api.getAssignments({
      status: filterStatus !== 'all' ? filterStatus : undefined
    })
  });

  // Delete assignment mutation
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => api.deleteAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      showToast('Assignment cancelled successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to cancel assignment', 'error');
    }
  });

  const assignments = data?.assignments || [];

  // Filter by search query (client-side)
  const filteredAssignments = assignments.filter((assignment: Assignment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      assignment.employee.name.toLowerCase().includes(query) ||
      assignment.employee.badgeNumber.toLowerCase().includes(query) ||
      assignment.template.title.toLowerCase().includes(query)
    );
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'sent', label: 'Sent' },
    { value: 'signed', label: 'Signed' },
    { value: 'declined', label: 'Declined' },
    { value: 'expired', label: 'Expired' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading assignments: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Container */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Assignments
          </h1>
          <p className="text-gray-600">
            Assign documents to employees and track signature progress
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-2 bg-hartzell-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Assign Document
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatBox
          label="Total Assigned"
          value={assignments.length}
          color="blue"
        />
        <StatBox
          label="Pending"
          value={assignments.filter((a: Assignment) => ['assigned', 'sent'].includes(a.status)).length}
          color="yellow"
        />
        <StatBox
          label="Completed"
          value={assignments.filter((a: Assignment) => a.status === 'signed').length}
          color="green"
        />
        <StatBox
          label="Overdue"
          value={assignments.filter((a: Assignment) => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'signed').length}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name, badge number, or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent appearance-none bg-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'Try adjusting your search criteria' : 'Get started by assigning a document to employees'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-2 bg-hartzell-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Assign Document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment: Assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-hartzell-blue text-white flex items-center justify-center text-sm font-medium">
                          {assignment.employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.employee.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {assignment.employee.badgeNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{assignment.template.title}</div>
                      <div className="text-xs text-gray-500 capitalize">{assignment.template.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={assignment.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={assignment.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.dueDate ? (
                        <div className={new Date(assignment.dueDate) < new Date() && assignment.status !== 'signed' ? 'text-red-600 font-medium' : ''}>
                          {new Date(assignment.dueDate).toLocaleDateString()}
                          {new Date(assignment.dueDate) < new Date() && assignment.status !== 'signed' && (
                            <span className="block text-xs">OVERDUE</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No deadline</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {assignment.status !== 'signed' && (
                          <button
                            onClick={() => setConfirmCancel({ id: assignment.id, name: assignment.employee.name })}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignModal
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            setShowAssignModal(false);
            showToast('Assignments created successfully!', 'success');
          }}
          onError={(message) => showToast(message, 'error')}
          onValidationError={(message) => showToast(message, 'warning')}
        />
      )}

      {/* Confirmation Modal */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setConfirmCancel(null)}
            />

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Cancel Assignment
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to cancel this assignment for <span className="font-semibold">{confirmCancel.name}</span>? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={() => {
                    deleteMutation.mutate(confirmCancel.id);
                    setConfirmCancel(null);
                  }}
                  disabled={deleteMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Assignment'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(null)}
                  disabled={deleteMutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hartzell-blue sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: 'blue' | 'yellow' | 'green' | 'red' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color].replace('bg-', 'text-').replace('100', '600')}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    assigned: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    signed: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800'
  };

  const icons = {
    assigned: Clock,
    sent: Send,
    signed: CheckCircle,
    declined: XCircle,
    expired: AlertTriangle
  };

  const Icon = icons[status as keyof typeof icons] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function AssignModal({
  onClose,
  onSuccess,
  onError,
  onValidationError
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  onValidationError: (message: string) => void;
}) {
  const [formData, setFormData] = useState({
    templateId: '',
    employeeIds: [] as number[],
    priority: 'medium',
    dueDate: '',
    notes: ''
  });
  const [isMultiSigner, setIsMultiSigner] = useState(false);
  const [signers, setSigners] = useState<Array<{ bitrixId: number; employeeName: string; roleName: string; order: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.getTemplates({ active_only: true })
  });

  // Fetch employees
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees()
  });

  const templates = templatesData?.templates || [];
  const employees = employeesData?.employees || [];

  // Filter employees by search query
  const filteredEmployees = employees.filter((employee: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.badgeNumber.toLowerCase().includes(query) ||
      employee.email?.toLowerCase().includes(query)
    );
  });

  const toggleEmployee = (employeeId: number) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter(id => id !== employeeId)
        : [...prev.employeeIds, employeeId]
    }));
  };

  const selectAll = () => {
    setFormData(prev => ({
      ...prev,
      employeeIds: filteredEmployees.map((e: any) => e.id)
    }));
  };

  const deselectAll = () => {
    setFormData(prev => ({
      ...prev,
      employeeIds: []
    }));
  };

  // Multi-signer functions
  const addSigner = (employee: any, roleName: string = '') => {
    const newOrder = signers.length + 1;
    if (newOrder > 4) {
      onValidationError('Maximum 4 signers allowed per document');
      return;
    }
    setSigners(prev => [...prev, {
      bitrixId: employee.id,
      employeeName: employee.name,
      roleName: roleName || `Signer ${newOrder}`,
      order: newOrder
    }]);
  };

  const removeSigner = (order: number) => {
    setSigners(prev => {
      const filtered = prev.filter(s => s.order !== order);
      // Reorder remaining signers
      return filtered.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
  };

  const moveSignerUp = (order: number) => {
    if (order === 1) return;
    setSigners(prev => {
      const newSigners = [...prev];
      const idx = newSigners.findIndex(s => s.order === order);
      const prevIdx = newSigners.findIndex(s => s.order === order - 1);
      if (idx !== -1 && prevIdx !== -1) {
        newSigners[idx].order = order - 1;
        newSigners[prevIdx].order = order;
      }
      return newSigners.sort((a, b) => a.order - b.order);
    });
  };

  const moveSignerDown = (order: number) => {
    if (order === signers.length) return;
    setSigners(prev => {
      const newSigners = [...prev];
      const idx = newSigners.findIndex(s => s.order === order);
      const nextIdx = newSigners.findIndex(s => s.order === order + 1);
      if (idx !== -1 && nextIdx !== -1) {
        newSigners[idx].order = order + 1;
        newSigners[nextIdx].order = order;
      }
      return newSigners.sort((a, b) => a.order - b.order);
    });
  };

  const updateSignerRole = (order: number, roleName: string) => {
    setSigners(prev => prev.map(s => s.order === order ? { ...s, roleName } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (isMultiSigner) {
      if (signers.length < 2) {
        onValidationError('Multi-signer mode requires at least 2 signers');
        return;
      }
      if (signers.length > 4) {
        onValidationError('Maximum 4 signers allowed per document');
        return;
      }
      // Check for missing role names
      const missingRoles = signers.filter(s => !s.roleName.trim());
      if (missingRoles.length > 0) {
        onValidationError('Please provide a role name for all signers');
        return;
      }
    } else {
      if (formData.employeeIds.length === 0) {
        onValidationError('Please select at least one employee');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isMultiSigner) {
        // Multi-signer mode: send signers array
        await api.createAssignment({
          templateId: formData.templateId,
          signers: signers.map(s => ({
            bitrixId: s.bitrixId,
            order: s.order,
            roleName: s.roleName
          })),
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
          notes: formData.notes || undefined
        });
      } else {
        // Single-signer mode: send employeeIds array
        await api.createAssignment({
          templateId: formData.templateId,
          employeeIds: formData.employeeIds,
          priority: formData.priority,
          dueDate: formData.dueDate || undefined,
          notes: formData.notes || undefined
        });
      }

      onSuccess();
    } catch (error: any) {
      onError(error.message || 'Failed to create assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-hartzell-blue to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Assign Document</h2>
              <p className="text-sm text-blue-100 mt-1">Send a document to employees for signature</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              type="button"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Document Template <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent bg-white shadow-sm"
                required
              >
                <option value="">Choose a document template...</option>
                {templates.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.title} {template.requiresSignature && '✍️'}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Toggle */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-gray-900">Signing Mode</label>
                  <p className="text-xs text-gray-600 mt-1">
                    {isMultiSigner
                      ? 'Multiple signers will sign sequentially in order (1 → 2 → 3)'
                      : 'Each selected employee will sign their own copy'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiSigner(!isMultiSigner);
                    if (!isMultiSigner) {
                      // Switching to multi-signer: clear single selections
                      setFormData(prev => ({ ...prev, employeeIds: [] }));
                    } else {
                      // Switching to single-signer: clear multi selections
                      setSigners([]);
                    }
                  }}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-hartzell-blue focus:ring-offset-2 ${
                    isMultiSigner ? 'bg-hartzell-blue' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isMultiSigner ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-2 text-xs font-medium">
                {isMultiSigner ? (
                  <span className="text-hartzell-blue">✓ Multi-Signer Mode (2-4 signers)</span>
                ) : (
                  <span className="text-gray-600">Single-Signer Mode</span>
                )}
              </div>
            </div>

            {/* Conditional: Single-Signer or Multi-Signer Interface */}
            {!isMultiSigner ? (
              /* Employee Selection (Single-Signer) */
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Employees <span className="text-red-500">*</span>
                  <span className="ml-2 text-hartzell-blue font-bold">
                    ({formData.employeeIds.length} selected)
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-hartzell-blue hover:text-hartzell-blue/80 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, badge number, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent shadow-sm"
                />
              </div>

              {/* Employee List */}
              <div className="border border-gray-300 rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">Loading employees...</p>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">No employees match your search</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredEmployees.map((employee: any) => (
                      <label
                        key={employee.id}
                        className={`flex items-center gap-3 hover:bg-white p-3 rounded-lg cursor-pointer transition-colors ${
                          formData.employeeIds.includes(employee.id) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.employeeIds.includes(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          className="w-4 h-4 rounded text-hartzell-blue focus:ring-hartzell-blue"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.badgeNumber}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            ) : (
              /* Multi-Signer Interface */
              <div>
                {/* Selected Signers List */}
                {signers.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Signing Sequence <span className="text-red-500">*</span>
                      <span className="ml-2 text-hartzell-blue font-bold">
                        ({signers.length} signer{signers.length === 1 ? '' : 's'})
                      </span>
                    </label>
                    <div className="space-y-3">
                      {signers.map((signer, index) => (
                        <div key={signer.order} className="flex items-start gap-3">
                          {/* Order Number */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-hartzell-blue text-white flex items-center justify-center font-bold text-sm mt-1">
                            {signer.order}
                          </div>

                          {/* Signer Details */}
                          <div className="flex-1 bg-white border border-gray-300 rounded-lg p-3">
                            <div className="text-sm font-semibold text-gray-900 mb-2">
                              {signer.employeeName}
                            </div>
                            <input
                              type="text"
                              placeholder="Role (e.g., Employee, Manager, HR)"
                              value={signer.roleName}
                              onChange={(e) => updateSignerRole(signer.order, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
                              required
                            />
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => moveSignerUp(signer.order)}
                              disabled={signer.order === 1}
                              className="p-1 text-gray-600 hover:text-hartzell-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Move up"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSignerDown(signer.order)}
                              disabled={signer.order === signers.length}
                              className="p-1 text-gray-600 hover:text-hartzell-blue disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Move down"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeSigner(signer.order)}
                            className="flex-shrink-0 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mt-1"
                            title="Remove signer"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Visual Sequence Indicator */}
                    {signers.length > 1 && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                        <svg className="w-4 h-4 text-hartzell-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          Document will be signed in order: <strong>{signers.map(s => s.roleName || `Signer ${s.order}`).join(' → ')}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Signer Section */}
                {signers.length < 4 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {signers.length === 0 ? 'Add Signers' : 'Add Another Signer'}
                      {signers.length === 0 && <span className="text-red-500"> *</span>}
                      {signers.length > 0 && <span className="ml-2 text-xs text-gray-500">(Optional, max 4 signers)</span>}
                    </label>

                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search employees to add as signers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent shadow-sm"
                      />
                    </div>

                    {/* Employee Selection List */}
                    <div className="border border-gray-300 rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                      {employees.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">Loading employees...</p>
                        </div>
                      ) : filteredEmployees.filter((e: any) => !signers.some(s => s.bitrixId === e.id)).length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">
                            {searchQuery ? 'No employees match your search' : 'All available employees have been added'}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {filteredEmployees
                            .filter((employee: any) => !signers.some(s => s.bitrixId === employee.id))
                            .map((employee: any) => (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => addSigner(employee)}
                                className="w-full flex items-center gap-3 hover:bg-white p-3 rounded-lg transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm truncate">{employee.name}</div>
                                  <div className="text-xs text-gray-500">{employee.badgeNumber}</div>
                                </div>
                                <UserPlus className="w-5 h-5 text-hartzell-blue flex-shrink-0" />
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Max Signers Notice */}
                {signers.length >= 4 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <strong>Maximum signers reached.</strong> You can have up to 4 signers per document.
                  </div>
                )}
              </div>
            )}

            {/* Priority & Due Date - Side by Side on Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent bg-white shadow-sm"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent shadow-sm resize-none"
                placeholder="Add any special instructions or notes for the employees..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white hover:border-gray-400 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !formData.templateId ||
                  isSubmitting ||
                  (isMultiSigner ? signers.length < 2 : formData.employeeIds.length === 0)
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-hartzell-blue to-blue-600 text-white rounded-lg font-semibold hover:from-hartzell-blue/90 hover:to-blue-600/90 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Creating {isMultiSigner ? 'Multi-Signer Assignment' : 'Assignments'}...
                  </span>
                ) : isMultiSigner ? (
                  `Create Multi-Signer Assignment (${signers.length} signer${signers.length === 1 ? '' : 's'})`
                ) : (
                  `Assign to ${formData.employeeIds.length} Employee${formData.employeeIds.length === 1 ? '' : 's'}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
