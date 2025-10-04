'use client';

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Upload, CheckCircle, FileText, Award, Users } from 'lucide-react';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

const POSITIONS = [
  'Manufacturing Technician',
  'Quality Control Inspector',
  'Assembly Line Worker',
  'Warehouse Associate',
  'Machine Operator',
  'Production Supervisor',
  'Maintenance Technician',
  'Supply Chain Coordinator',
  'Engineering Technician',
  'Administrative Assistant',
  'Human Resources Specialist',
  'Other'
];

const EDUCATION_LEVELS = [
  'High School Diploma/GED',
  'Some College',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate',
  'Trade/Vocational Certificate'
];

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',

    // Position Information
    position: '',
    positionOther: '',
    desiredSalary: '',
    availableStartDate: '',
    employmentType: 'Full-time',
    shift: 'Day',
    willingToRelocate: '',

    // Work Experience
    hasWorkExperience: '',
    currentEmployer: '',
    currentPosition: '',
    yearsExperience: '',

    // Education
    educationLevel: '',
    schoolName: '',
    graduationYear: '',
    fieldOfStudy: '',

    // Skills & Certifications
    skills: '',
    certifications: '',
    softwareExperience: '',

    // References
    reference1Name: '',
    reference1Phone: '',
    reference1Relationship: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Relationship: '',

    // Legal
    authorizedToWork: '',
    requiresSponsorship: '',
    over18: '',
    backgroundCheckConsent: '',
    felonyConviction: '',
    felonyExplanation: '',

    // Additional
    howDidYouHear: '',
    additionalInfo: ''
  });

  const [files, setFiles] = useState({
    resume: null as File | null,
    coverLetter: null as File | null
  });

  // Google Places Autocomplete for address
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const addressInputRef = useGooglePlaces({
    apiKey: googleMapsApiKey,
    onPlaceSelected: (place) => {
      setFormData(prev => ({
        ...prev,
        addressLine1: place.street,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode
      }));
    }
  });

  const totalSteps = 6;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Auto-format phone number
    if (name === 'phone' || name === 'reference1Phone' || name === 'reference2Phone') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length >= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 3) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    // Auto-format ZIP code
    if (name === 'zipCode') {
      const cleaned = value.replace(/\D/g, '').slice(0, 5);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'coverLetter') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      alert('Please complete the CAPTCHA verification');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('data', JSON.stringify({ ...formData, turnstileToken }));

      if (files.resume) {
        submitData.append('resume', files.resume);
      }
      if (files.coverLetter) {
        submitData.append('coverLetter', files.coverLetter);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/applications/submit`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="card max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for applying to Hartzell. We've received your application and will review it shortly.
          </p>
          <p className="text-gray-600">
            You'll hear from our HR team within 3-5 business days if your qualifications match our current openings.
          </p>
          <div className="mt-8">
            <a href="/" className="btn btn-primary">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-hartzell-blue to-blue-700 bg-clip-text text-transparent mb-2">
            Join the Hartzell Team
          </h1>
          <p className="text-lg text-gray-600">Complete your application below</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-900">Step {step} of {totalSteps}</span>
            <span className="text-sm font-semibold text-hartzell-blue">{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-hartzell-blue to-blue-600 h-3 rounded-full transition-all duration-300 shadow-md"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="M."
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="input pl-10"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="input pl-10"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    required
                    className="input"
                    placeholder="Start typing your address..."
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Start typing and select from the dropdown to auto-fill city, state, and ZIP
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="form-label">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="NY"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="input"
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Position Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Position Information</h2>
                </div>

                <div>
                  <label className="form-label">
                    Position Applying For <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    className="input"
                  >
                    <option value="">Select a position...</option>
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                {formData.position === 'Other' && (
                  <div>
                    <label className="form-label">
                      Please specify position
                    </label>
                    <input
                      type="text"
                      name="positionOther"
                      value={formData.positionOther}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter position title"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Employment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleInputChange}
                      required
                      className="input"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Preferred Shift <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="shift"
                      value={formData.shift}
                      onChange={handleInputChange}
                      required
                      className="input"
                    >
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                      <option value="Swing">Swing Shift</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Desired Salary (Annual)
                    </label>
                    <input
                      type="text"
                      name="desiredSalary"
                      value={formData.desiredSalary}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="$50,000"
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Available Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="availableStartDate"
                      value={formData.availableStartDate}
                      onChange={handleInputChange}
                      required
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Willing to Relocate? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willingToRelocate"
                        value="yes"
                        checked={formData.willingToRelocate === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willingToRelocate"
                        value="no"
                        checked={formData.willingToRelocate === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Work Experience & Education */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Experience & Education</h2>
                </div>

                <div>
                  <label className="form-label">
                    Do you have work experience? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasWorkExperience"
                        value="yes"
                        checked={formData.hasWorkExperience === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasWorkExperience"
                        value="no"
                        checked={formData.hasWorkExperience === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                {formData.hasWorkExperience === 'yes' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">
                          Current/Most Recent Employer
                        </label>
                        <input
                          type="text"
                          name="currentEmployer"
                          value={formData.currentEmployer}
                          onChange={handleInputChange}
                          className="input"
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <label className="form-label">
                          Position/Title
                        </label>
                        <input
                          type="text"
                          name="currentPosition"
                          value={formData.currentPosition}
                          onChange={handleInputChange}
                          className="input"
                          placeholder="Job Title"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">
                        Years of Relevant Experience
                      </label>
                      <select
                        name="yearsExperience"
                        value={formData.yearsExperience}
                        onChange={handleInputChange}
                        className="input"
                      >
                        <option value="">Select...</option>
                        <option value="<1">Less than 1 year</option>
                        <option value="1-2">1-2 years</option>
                        <option value="3-5">3-5 years</option>
                        <option value="6-10">6-10 years</option>
                        <option value="10+">10+ years</option>
                      </select>
                    </div>
                  </>
                )}

                <hr className="my-6" />

                <div>
                  <label className="form-label">
                    Highest Education Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="educationLevel"
                    value={formData.educationLevel}
                    onChange={handleInputChange}
                    required
                    className="input"
                  >
                    <option value="">Select education level...</option>
                    {EDUCATION_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      School/Institution Name
                    </label>
                    <input
                      type="text"
                      name="schoolName"
                      value={formData.schoolName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="University/School Name"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Graduation Year
                    </label>
                    <input
                      type="text"
                      name="graduationYear"
                      value={formData.graduationYear}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="2020"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Field of Study/Major
                  </label>
                  <input
                    type="text"
                    name="fieldOfStudy"
                    value={formData.fieldOfStudy}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="e.g., Mechanical Engineering"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Skills & References */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Skills & References</h2>
                </div>

                <div>
                  <label className="form-label">
                    Relevant Skills (comma separated)
                  </label>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleInputChange}
                    rows={3}
                    className="input"
                    placeholder="e.g., Welding, Quality Control, Forklift Operation, Team Leadership"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Certifications/Licenses
                  </label>
                  <textarea
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleInputChange}
                    rows={2}
                    className="input"
                    placeholder="e.g., OSHA Safety Certification, Forklift License"
                  />
                </div>

                <div>
                  <label className="form-label">
                    Software/Systems Experience
                  </label>
                  <input
                    type="text"
                    name="softwareExperience"
                    value={formData.softwareExperience}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="e.g., SAP, Microsoft Office, AutoCAD"
                  />
                </div>

                <hr className="my-6" />

                <h3 className="text-lg font-semibold text-gray-900">Professional References</h3>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Reference 1</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="reference1Name"
                        value={formData.reference1Name}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="reference1Phone"
                        value={formData.reference1Phone}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Relationship
                      </label>
                      <input
                        type="text"
                        name="reference1Relationship"
                        value={formData.reference1Relationship}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Former Supervisor"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Reference 2 (Optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="reference2Name"
                        value={formData.reference2Name}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="reference2Phone"
                        value={formData.reference2Phone}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="(555) 987-6543"
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        Relationship
                      </label>
                      <input
                        type="text"
                        name="reference2Relationship"
                        value={formData.reference2Relationship}
                        onChange={handleInputChange}
                        className="input"
                        placeholder="Colleague"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Legal & Background */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Legal & Background</h2>
                </div>

                <div>
                  <label className="form-label">
                    Are you legally authorized to work in the United States? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="authorizedToWork"
                        value="yes"
                        checked={formData.authorizedToWork === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="authorizedToWork"
                        value="no"
                        checked={formData.authorizedToWork === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Will you require visa sponsorship now or in the future? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="requiresSponsorship"
                        value="yes"
                        checked={formData.requiresSponsorship === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="requiresSponsorship"
                        value="no"
                        checked={formData.requiresSponsorship === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Are you 18 years of age or older? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="over18"
                        value="yes"
                        checked={formData.over18 === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="over18"
                        value="no"
                        checked={formData.over18 === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Have you ever been convicted of a felony? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="felonyConviction"
                        value="yes"
                        checked={formData.felonyConviction === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="felonyConviction"
                        value="no"
                        checked={formData.felonyConviction === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                {formData.felonyConviction === 'yes' && (
                  <div>
                    <label className="form-label">
                      Please explain <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="felonyExplanation"
                      value={formData.felonyExplanation}
                      onChange={handleInputChange}
                      required={formData.felonyConviction === 'yes'}
                      rows={3}
                      className="input"
                      placeholder="Please provide details..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: A conviction record will not necessarily disqualify you from employment.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="backgroundCheckConsent"
                      checked={formData.backgroundCheckConsent === 'yes'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        backgroundCheckConsent: e.target.checked ? 'yes' : ''
                      }))}
                      required
                      className="mr-3 mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      I authorize Hartzell to conduct a background check and verify the information provided in this application. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 6: Documents & Submit */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Documents & Additional Info</h2>
                </div>

                <div>
                  <label className="form-label">
                    Upload Resume <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange(e, 'resume')}
                    required
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-hartzell-blue file:text-white
                      hover:file:bg-blue-700
                      cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (Max 5MB)</p>
                  {files.resume && (
                    <p className="text-sm text-green-600 mt-2">✓ {files.resume.name}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Upload Cover Letter (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileChange(e, 'coverLetter')}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-gray-100 file:text-gray-700
                      hover:file:bg-gray-200
                      cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (Max 5MB)</p>
                  {files.coverLetter && (
                    <p className="text-sm text-green-600 mt-2">✓ {files.coverLetter.name}</p>
                  )}
                </div>

                <hr className="my-6" />

                <div>
                  <label className="form-label">
                    How did you hear about this position?
                  </label>
                  <select
                    name="howDidYouHear"
                    value={formData.howDidYouHear}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="Indeed">Indeed</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Company Website">Company Website</option>
                    <option value="Employee Referral">Employee Referral</option>
                    <option value="Job Fair">Job Fair</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Additional Information
                  </label>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    rows={4}
                    className="input"
                    placeholder="Is there anything else you'd like us to know about your application?"
                  />
                </div>

                <hr className="my-6" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    CAPTCHA Verification <span className="text-red-500">*</span>
                  </label>
                  <TurnstileWidget onVerify={setTurnstileToken} />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Important:</strong> By submitting this application, you certify that all information provided is true and complete to the best of your knowledge. Any false or misleading information may result in disqualification from employment or termination if employed.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="btn btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !files.resume || !turnstileToken}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
