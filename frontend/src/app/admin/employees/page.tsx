'use client';

import { Search, User, Mail, Phone, Briefcase, RefreshCw, Eye, ArrowUpDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import ImportExportModal from '@/components/ImportExportModal';

export default function EmployeesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [divisionFilter, setDivisionFilter] = useState<string[]>(['Construction', 'Painting', 'Windows & Doors']);
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.division-dropdown')) {
        setIsDivisionDropdownOpen(false);
      }
    };

    if (isDivisionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDivisionDropdownOpen]);

  const employees = data?.employees || [];

  // Helper to format array fields
  const formatArray = (arr: any) => {
    if (!arr) return '';
    if (Array.isArray(arr)) return arr.join('; ');
    return String(arr);
  };

  // Helper to format boolean
  const formatBoolean = (val: any) => {
    if (val === true || val === 'Y' || val === 'true') return 'Y';
    if (val === false || val === 'N' || val === 'false') return 'N';
    return '';
  };

  // Export to Excel function with ALL fields
  const handleExport = () => {
    // Prepare comprehensive data for export
    const exportData = filteredEmployees.map((emp: any) => ({
      // Personal Information
      'First Name': emp.firstName || '',
      'Middle Name': emp.middleName || '',
      'Last Name': emp.lastName || '',
      'Preferred Name': emp.preferredName || '',
      'Date of Birth': emp.dateOfBirth || '',
      'Gender': emp.gender || '',
      'Marital Status': emp.maritalStatus || '',
      'Citizenship Status': emp.citizenship || '',
      'Personal Email': formatArray(emp.personalEmail),
      'Personal Phone': formatArray(emp.personalPhone),
      'Work Cell Phone': emp.workPhone || '',
      'Office Phone': emp.officePhone || '',
      'Office Extension': emp.officeExtension || '',
      'Address Line 1': emp.addressLine1 || '',
      'Address Line 2': emp.addressLine2 || '',
      'City': emp.city || '',
      'State': emp.state || '',
      'ZIP Code': emp.zipCode || '',

      // Emergency Contact
      'Emergency Contact Name': emp.emergencyContactName || '',
      'Emergency Contact Phone': emp.emergencyContactPhone || '',
      'Emergency Contact Relationship': emp.emergencyContactRelationship || '',

      // Employment Details
      'Badge Number': emp.badgeNumber || '',
      'Position': emp.position || '',
      'Subsidiary': emp.subsidiary || '',
      'Status': emp.employmentStatus || '',
      'Hire Date': emp.hireDate || '',
      'Employment Type': emp.employmentType || '',
      'Shift': emp.shift || '',
      'Pay Rate': emp.payRate || '',
      'Benefits Eligible': formatBoolean(emp.benefitsEligible),
      'Sales Territory': emp.salesTerritory || '',
      'Project Category': emp.projectCategory || '',
      'WC Code': emp.wcCode || '',

      // Citizenship & Work Authorization
      'Visa/Work Authorization Expiry': emp.visaExpiry || '',

      // Compensation & Benefits
      'SSN': emp.ssn || '',
      'PTO Days': emp.ptoDays || '',
      'Health Insurance': emp.healthInsurance || '',
      '401(k) Enrollment': emp.has401k || '',
      'Life Insurance Beneficiaries': emp.lifeBeneficiaries || '',

      // Tax & Payroll Information
      'Payment Method': emp.paymentMethod || '',
      'Tax Filing Status': emp.taxFilingStatus || '',
      'W-4 Exemptions': emp.w4Exemptions || '',
      'Additional Federal Withholding': emp.additionalFedWithhold || '',
      'Additional State Withholding': emp.additionalStateWithhold || '',

      // Banking & Direct Deposit
      'Bank Name': emp.bankName || '',
      'Account Holder Name': emp.bankAccountName || '',
      'Account Type': emp.bankAccountType || '',
      'Routing Number': emp.bankRouting || '',
      'Account Number': emp.bankAccountNumber || '',

      // Dependents & Beneficiaries
      'Dependent Names': formatArray(emp.dependentNames),
      'Dependent SSNs': formatArray(emp.dependentSsns),
      'Dependent Relationships': formatArray(emp.dependentRelationships),

      // Education & Skills
      'Education Level': emp.educationLevel || '',
      'School': emp.schoolName || '',
      'Graduation Year': emp.graduationYear || '',
      'Fields of Study': formatArray(emp.fieldsOfStudy),
      'Skills': formatArray(emp.skills),
      'Certifications': formatArray(emp.certifications),
      'Skills Level': emp.skillsLevel || '',

      // Training & Compliance
      'Required Training Status': emp.requiredTrainingStatus || '',
      'Safety Training Status': emp.safetyTrainingStatus || '',
      'Compliance Training Status': emp.complianceTrainingStatus || '',
      'Training Completion Date': emp.trainingDate || '',
      'Next Training Due': emp.nextTrainingDue || '',
      'Training Notes': emp.trainingNotes || '',

      // IT & Equipment
      'Software Experience': formatArray(emp.softwareExperience),
      'Equipment Assigned': formatArray(emp.equipmentAssigned),
      'Equipment Status': emp.equipmentStatus || '',
      'Equipment Return Tracking': emp.equipmentReturn || '',
      'Software Access': formatArray(emp.softwareAccess),
      'Access Permissions': formatArray(emp.accessPermissions),
      'Access Level': emp.accessLevel || '',
      'Security Clearance': emp.securityClearance || '',
      'Network Status': emp.networkStatus || '',
      'VPN Access': formatBoolean(emp.vpnAccess),
      'Remote Access Approved': formatBoolean(emp.remoteAccess),

      // Vehicle & Licensing
      "Driver's License Expiry": emp.driversLicenseExpiry || '',
      'Auto Insurance Expiry': emp.autoInsuranceExpiry || '',

      // Performance & Reviews
      'Performance Review Dates': formatArray(emp.reviewDates),
      'Termination Date': emp.terminationDate || '',
      'Rehire Eligible': formatBoolean(emp.rehireEligible),

      // Additional Information
      'Notes': emp.additionalInfo || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    ws['!cols'] = Array(Object.keys(exportData[0] || {}).length).fill({ wch: 20 });

    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Hartzell_Employees_Complete_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch = !searchQuery ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && emp.employmentStatus === 'Active') ||
      (statusFilter === 'inactive' && emp.employmentStatus === 'Inactive');

    const matchesDivision = divisionFilter.length === 0 ||
      divisionFilter.includes(emp.subsidiary) ||
      (!emp.subsidiary && divisionFilter.includes('N/A'));

    return matchesSearch && matchesStatus && matchesDivision;
  });

  // Handle division filter
  const toggleDivision = (division: string) => {
    setDivisionFilter(prev =>
      prev.includes(division)
        ? prev.filter(d => d !== division)
        : [...prev, division]
    );
  };

  const toggleSelectAll = () => {
    const allDivisions = ['Construction', 'Painting', 'Windows & Doors'];
    setDivisionFilter(divisionFilter.length === allDivisions.length ? [] : allDivisions);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hartzell-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load employees. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Compact header with filters in one row */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Employees</h1>
            <span className="text-sm text-gray-500">({filteredEmployees.length} {statusFilter !== 'all' ? statusFilter : 'total'})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Division Filter Dropdown */}
            <div className="relative division-dropdown">
              <button
                onClick={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors border border-gray-300"
              >
                <span>Division {divisionFilter.length < 3 && `(${divisionFilter.length})`}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDivisionDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                  <div className="p-2">
                    {/* Select All Option */}
                    <label className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200 mb-1">
                      <input
                        type="checkbox"
                        checked={divisionFilter.length === 3}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-hartzell-blue border-gray-300 rounded focus:ring-2 focus:ring-hartzell-blue"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {divisionFilter.length === 3 ? 'Deselect All' : 'Select All'}
                      </span>
                    </label>

                    {/* Individual Division Options */}
                    {['Construction', 'Painting', 'Windows & Doors'].map(division => (
                      <label key={division} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={divisionFilter.includes(division)}
                          onChange={() => toggleDivision(division)}
                          className="w-4 h-4 text-hartzell-blue border-gray-300 rounded focus:ring-2 focus:ring-hartzell-blue"
                        />
                        <span className="ml-2 text-sm text-gray-700">{division}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              title="Import or Export employee data"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Import / Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, badge number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
          >
            <option value="all">All Employees</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No employees found
          </h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No employees in the system yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto relative">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Employee
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Division
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="sticky right-0 z-20 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee: any) => (
                  <tr
                    key={employee.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      employee.employmentStatus === 'Inactive' ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-hartzell-blue rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 overflow-hidden">
                          {(() => {
                            // Check if profile photo exists
                            const hasPhoto = employee.profilePhoto &&
                              (
                                (typeof employee.profilePhoto === 'object' && Object.keys(employee.profilePhoto).length > 0) ||
                                (typeof employee.profilePhoto === 'number' && employee.profilePhoto > 0) ||
                                (Array.isArray(employee.profilePhoto) && employee.profilePhoto.length > 0)
                              );

                            if (hasPhoto) {
                              const photoUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/employee/${employee.id}/file/profilePhoto`;
                              return (
                                <img
                                  src={photoUrl}
                                  alt={employee.name}
                                  className="w-full h-full object-cover"
                                />
                              );
                            }

                            // Fallback to initials
                            return employee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                          })()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.subsidiary || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center text-sm text-gray-900">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" />
                        <span className="truncate max-w-xs">{employee.position || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm text-gray-900">
                        {employee.email && (
                          <div className="flex items-center mb-0.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" />
                            <span className="truncate max-w-xs">{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 mr-1.5 flex-shrink-0" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`sticky right-0 z-20 px-4 py-2 whitespace-nowrap text-right shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.1)] ${
                      employee.employmentStatus === 'Inactive' ? 'bg-red-50/50' : 'bg-white'
                    }`}>
                      <button
                        onClick={() => router.push(`/admin/employees/detail?id=${employee.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium text-hartzell-blue hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employees={employees}
        onExport={handleExport}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }}
      />
    </div>
  );
}
