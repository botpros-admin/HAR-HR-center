import { Users, User, Phone, Briefcase } from 'lucide-react';

interface Reference {
  name: string;
  phone: string;
  relationship: string;
}

interface ReferencesSectionProps {
  references: Reference[];
}

export default function ReferencesSection({ references }: ReferencesSectionProps) {
  if (!references || references.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-hartzell-blue" />
        References
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {references.map((reference, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-hartzell-blue" />
              <h3 className="font-semibold text-gray-900">{reference.name}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{reference.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span>{reference.relationship}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
