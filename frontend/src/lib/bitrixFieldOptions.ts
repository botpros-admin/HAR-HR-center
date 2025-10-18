/**
 * Bitrix24 Field Options Mappings
 * Maps Bitrix24 option IDs to human-readable labels for select and multiselect fields
 */

export const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: '2002', label: 'Female' },
  { value: '2003', label: 'Male' },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2021', label: 'Single' },
  { value: '2022', label: 'Married' },
  { value: '2023', label: 'Divorced' },
  { value: '2024', label: 'Widowed' },
  { value: '2025', label: 'Separated' },
];

export const CITIZENSHIP_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2026', label: 'US Citizen' },
  { value: '2027', label: 'Permanent Resident' },
  { value: '2028', label: 'Work Visa' },
  { value: '2029', label: 'Other' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2030', label: 'Full-Time' },
  { value: '2031', label: 'Part-Time' },
  { value: '2032', label: 'Contract' },
  { value: '2033', label: 'Temporary' },
  { value: '2034', label: 'Intern' },
  { value: '2035', label: 'Seasonal' },
];

export const TAX_FILING_STATUS_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2039', label: 'Single' },
  { value: '2040', label: 'Married Filing Jointly' },
  { value: '2041', label: 'Married Filing Separately' },
  { value: '2042', label: 'Head of Household' },
];

export const BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2036', label: 'Checking' },
  { value: '2037', label: 'Savings' },
  { value: '2038', label: 'Money Market' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2010', label: 'Direct Deposit' },
  { value: '2011', label: 'Check' },
];

export const TRAINING_STATUS_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2073', label: 'Not Started' },
  { value: '2074', label: 'In Progress' },
  { value: '2075', label: 'Completed' },
  { value: '2076', label: 'Expired' },
];

export const EQUIPMENT_OPTIONS = [
  { value: '2043', label: 'Phone' },
  { value: '2044', label: 'Laptop' },
  { value: '2045', label: 'Tablet' },
  { value: '2046', label: 'Desktop' },
  { value: '2047', label: 'Monitor' },
  { value: '2048', label: 'Headset' },
  { value: '2049', label: 'Other' },
];

export const SOFTWARE_ACCESS_OPTIONS = [
  { value: '2050', label: 'Office 365' },
  { value: '2051', label: 'CRM' },
  { value: '2052', label: 'Accounting' },
  { value: '2053', label: 'Design Software' },
  { value: '2054', label: 'Development Tools' },
  { value: '2055', label: 'Other' },
];

export const ACCESS_LEVEL_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2057', label: 'Basic User' },
  { value: '2058', label: 'Power User' },
  { value: '2059', label: 'Administrator' },
  { value: '2060', label: 'Super Admin' },
];

export const SECURITY_CLEARANCE_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2061', label: 'None' },
  { value: '2062', label: 'Confidential' },
  { value: '2063', label: 'Secret' },
  { value: '2064', label: 'Top Secret' },
];

export const EQUIPMENT_STATUS_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2065', label: 'Issued' },
  { value: '2066', label: 'Returned' },
  { value: '2067', label: 'Lost' },
  { value: '2068', label: 'Damaged' },
];

export const NETWORK_STATUS_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2069', label: 'Active' },
  { value: '2070', label: 'Inactive' },
  { value: '2071', label: 'Suspended' },
  { value: '2072', label: 'Disabled' },
];

export const SKILLS_LEVEL_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2085', label: 'Beginner' },
  { value: '2086', label: 'Intermediate' },
  { value: '2087', label: 'Advanced' },
  { value: '2088', label: 'Expert' },
];

export const SUBSIDIARY_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2012', label: 'Construction' },
  { value: '2013', label: 'Painting' },
  { value: '2014', label: 'Windows & Doors' },
];

export const SALES_TERRITORY_OPTIONS = [
  { value: '', label: 'Not Selected' },
  { value: '2019', label: 'Northern' },
  { value: '2020', label: 'Southern' },
];

export const PROJECT_CATEGORY_OPTIONS = [
  { value: '', label: 'Select Below:' },
  { value: '2015', label: 'Commercial' },
  { value: '2016', label: 'Community' },
  { value: '2017', label: 'Residential' },
  { value: '2018', label: 'Public Sector' },
];

/**
 * Helper function to get label from value for any option set
 */
export function getOptionLabel(options: Array<{ value: string; label: string }>, value: string | number): string {
  const stringValue = String(value);
  const option = options.find(opt => opt.value === stringValue);
  return option?.label || stringValue;
}

/**
 * Helper function to get multiple labels from array of values (for multiselect)
 */
export function getMultiSelectLabels(options: Array<{ value: string; label: string }>, values: string[] | number[]): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(val => getOptionLabel(options, val));
}

/**
 * Reverse mappings for import/export (label → value)
 */
export const REVERSE_MAPPINGS = {
  gender: Object.fromEntries(GENDER_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  maritalStatus: Object.fromEntries(MARITAL_STATUS_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  citizenship: Object.fromEntries(CITIZENSHIP_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  employmentType: Object.fromEntries(EMPLOYMENT_TYPE_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  taxFilingStatus: Object.fromEntries(TAX_FILING_STATUS_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  bankAccountType: Object.fromEntries(BANK_ACCOUNT_TYPE_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  paymentMethod: Object.fromEntries(PAYMENT_METHOD_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  subsidiary: Object.fromEntries(SUBSIDIARY_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  salesTerritory: Object.fromEntries(SALES_TERRITORY_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
  projectCategory: Object.fromEntries(PROJECT_CATEGORY_OPTIONS.filter(o => o.value).map(o => [o.label.toLowerCase(), o.value])),
};
