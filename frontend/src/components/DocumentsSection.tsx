import { FileText, Download, Calendar } from 'lucide-react';

interface DocumentsSectionProps {
  documents: {
    resumeUrl: string | null;
    coverLetterUrl: string | null;
    applicationId: string | null;
    submittedAt: string | null;
  };
  onError?: (message: string) => void;
}

export default function DocumentsSection({ documents, onError }: DocumentsSectionProps) {
  if (!documents.resumeUrl && !documents.coverLetterUrl && !documents.applicationId) {
    return null;
  }

  const handleDownload = async (type: 'resume' | 'cover-letter') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/employee/documents/${type}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'resume' ? 'resume.pdf' : 'cover-letter.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      if (onError) {
        onError('Failed to download document. Please try again.');
      }
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-6 h-6 text-hartzell-blue" />
        Application Documents
      </h2>
      <div className="space-y-4">
        {documents.applicationId && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span>Application ID: <strong className="text-gray-900">{documents.applicationId}</strong></span>
            </div>
            {documents.submittedAt && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(documents.submittedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
        {documents.resumeUrl && (
          <button
            onClick={() => handleDownload('resume')}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-hartzell-blue hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-hartzell-blue" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Resume</p>
                <p className="text-sm text-gray-600">Click to download</p>
              </div>
            </div>
            <Download className="w-5 h-5 text-gray-400 group-hover:text-hartzell-blue" />
          </button>
        )}
        {documents.coverLetterUrl && (
          <button
            onClick={() => handleDownload('cover-letter')}
            className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-hartzell-blue hover:bg-blue-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-hartzell-blue" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Cover Letter</p>
                <p className="text-sm text-gray-600">Click to download</p>
              </div>
            </div>
            <Download className="w-5 h-5 text-gray-400 group-hover:text-hartzell-blue" />
          </button>
        )}
      </div>
    </div>
  );
}
