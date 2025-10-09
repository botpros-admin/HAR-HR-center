import { Award, Code, Wrench } from 'lucide-react';

interface SkillsSectionProps {
  skills: string | null | undefined;
  certifications: string | null | undefined;
  softwareExperience: string | null | undefined;
}

export default function SkillsSection({ skills, certifications, softwareExperience }: SkillsSectionProps) {
  if (!skills && !certifications && !softwareExperience) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Award className="w-6 h-6 text-hartzell-blue" />
        Skills & Certifications
      </h2>
      <div className="space-y-6">
        {skills && typeof skills === 'string' && skills.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Wrench className="w-4 h-4" />
              <label className="font-medium">Skills</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.split(',').map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        {certifications && typeof certifications === 'string' && certifications.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Award className="w-4 h-4" />
              <label className="font-medium">Certifications & Licenses</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {certifications.split(',').map((cert, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {cert.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        {softwareExperience && typeof softwareExperience === 'string' && softwareExperience.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Code className="w-4 h-4" />
              <label className="font-medium">Software & Systems Experience</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {softwareExperience.split(',').map((software, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {software.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
