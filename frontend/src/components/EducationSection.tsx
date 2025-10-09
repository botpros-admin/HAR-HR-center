import { GraduationCap } from 'lucide-react';

interface EducationSectionProps {
  education: {
    level: string | null;
    school: string | null;
    graduationYear: string | null;
    fieldOfStudy: string | null;
  };
}

export default function EducationSection({ education }: EducationSectionProps) {
  if (!education.level && !education.school && !education.graduationYear && !education.fieldOfStudy) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-hartzell-blue" />
        Education
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {education.level && (
          <InfoField label="Education Level" value={education.level} />
        )}
        {education.school && (
          <InfoField label="School Name" value={education.school} />
        )}
        {education.graduationYear && (
          <InfoField label="Graduation Year" value={education.graduationYear} />
        )}
        {education.fieldOfStudy && (
          <InfoField label="Field of Study" value={education.fieldOfStudy} />
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">
        <label>{label}</label>
      </div>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}
