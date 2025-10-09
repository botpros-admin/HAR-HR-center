import { Briefcase, Calendar } from 'lucide-react';

interface WorkExperience {
  employer: string;
  position: string;
  startDate: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
}

interface WorkHistorySectionProps {
  workExperiences: WorkExperience[];
}

export default function WorkHistorySection({ workExperiences }: WorkHistorySectionProps) {
  if (!workExperiences || workExperiences.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Briefcase className="w-6 h-6 text-hartzell-blue" />
        Work History
      </h2>
      <div className="space-y-6">
        {workExperiences.map((experience, index) => (
          <div key={index} className="border-l-4 border-hartzell-blue pl-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{experience.position}</h3>
                <p className="text-hartzell-blue font-medium">{experience.employer}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 mt-1 md:mt-0">
                <Calendar className="w-4 h-4" />
                <span>
                  {experience.startDate} - {experience.currentlyWorking ? 'Present' : experience.endDate}
                </span>
              </div>
            </div>
            {experience.description && (
              <p className="text-gray-700 text-sm mt-2">{experience.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
