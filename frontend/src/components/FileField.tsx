/**
 * FileField Component
 * Displays file fields from Bitrix24 with download, upload, and delete capability
 */

import { File, FileCheck, Download, Upload, X, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

// Bitrix24 file object structure
interface BitrixFile {
  id?: number;
  url?: string; // Frontend URL (requires browser session)
  urlMachine?: string; // REST API URL with auth token
  downloadUrl?: string; // Legacy
  showUrl?: string; // Legacy
  name?: string;
  size?: number;
}

interface FileFieldProps {
  label: string;
  value: BitrixFile | BitrixFile[] | number | number[] | null | undefined; // Bitrix file objects or legacy IDs
  name: string;
  colSpan?: number;
  isEditing?: boolean;
  isMultiple?: boolean; // Whether this field accepts multiple files
  onFileUploaded?: (updatedEmployee: any) => void; // Callback with updated employee data
}

export default function FileField({
  label,
  value,
  name,
  colSpan = 1,
  isEditing = false,
  isMultiple = false,
  onFileUploaded
}: FileFieldProps) {
  const spanClass = colSpan === 2 ? 'col-span-2' : colSpan === 3 ? 'col-span-3' : '';
  const searchParams = useSearchParams();
  const employeeId = searchParams?.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Optimistic UI state - override actual value during transitions
  const [optimisticHasFile, setOptimisticHasFile] = useState<boolean | null>(null);

  // Clear optimistic state when value prop changes (real data arrived)
  useEffect(() => {
    setOptimisticHasFile(null);
  }, [value]);

  // Helper to check if value is a file object
  const isFileObject = (val: any): val is BitrixFile => {
    return val && typeof val === 'object' && ('url' in val || 'urlMachine' in val || 'downloadUrl' in val || 'showUrl' in val || 'id' in val);
  };

  // Check if file(s) exist - use optimistic state if set, otherwise use actual value
  let hasFiles = false;
  let fileCount = 0;
  let downloadUrl: string | null = null;

  // Helper to check if a value represents a file (not empty/null/undefined)
  const isValidFile = (v: any): boolean => {
    if (v === null || v === undefined || v === '') return false;
    // If it's an object with properties, it's a file object
    if (typeof v === 'object' && Object.keys(v).length > 0) return true;
    // If it's a number (file ID), it's valid
    if (typeof v === 'number' && v > 0) return true;
    return false;
  };

  // Use optimistic state if available, otherwise calculate from value
  if (optimisticHasFile !== null) {
    hasFiles = optimisticHasFile;
    fileCount = optimisticHasFile ? 1 : 0;

    if (hasFiles && employeeId) {
      downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/employee/${employeeId}/file/${name}`;
    }
  } else if (Array.isArray(value)) {
    // Array of files (multiple file field)
    const fileArray = value.filter(isValidFile);
    hasFiles = fileArray.length > 0;
    fileCount = fileArray.length;

    // Use backend proxy URL for downloads (handles Bitrix24 auth)
    if (hasFiles && employeeId) {
      downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/employee/${employeeId}/file/${name}`;
    }
  } else if (isValidFile(value)) {
    // Single file
    hasFiles = true;
    fileCount = 1;

    // Use backend proxy URL for downloads (handles Bitrix24 auth)
    if (employeeId) {
      downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/employee/${employeeId}/file/${name}`;
    }
  }

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !employeeId) return;

    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 25MB.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.uploadEmployeeFile(parseInt(employeeId), name, file, isMultiple);

      setSuccess('File uploaded successfully');

      // OPTIMISTIC UPDATE: Immediately show file attached
      setOptimisticHasFile(true);

      // Pass updated employee data to parent for immediate UI update
      if (onFileUploaded && response.employee) {
        onFileUploaded(response.employee);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to upload file');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file deletion confirmation
  const confirmDelete = async () => {
    if (!employeeId) return;

    setShowDeleteConfirm(false);
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.deleteEmployeeFile(parseInt(employeeId), name);

      setSuccess('File removed successfully');

      // OPTIMISTIC UPDATE: Immediately show no file
      setOptimisticHasFile(false);

      // Pass updated employee data to parent for immediate UI update
      if (onFileUploaded && response.employee) {
        onFileUploaded(response.employee);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to delete file');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleting(false);
    }
  };

  // Display mode
  if (!isEditing) {
    return (
      <div className={`mb-2 ${spanClass}`}>
        <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
        <div className="text-sm text-slate-900 flex items-center gap-2">
          {hasFiles ? (
            <>
              <FileCheck className="w-4 h-4 text-green-600" />
              <span className="text-green-700">
                {fileCount} file{fileCount !== 1 ? 's' : ''} attached
              </span>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  <Download className="w-3 h-3" />
                  View
                </a>
              )}
            </>
          ) : (
            <>
              <File className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">No file</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // Edit mode - show upload, download, and delete buttons
  return (
    <div className={`mb-2 ${spanClass}`}>
      <label className="block text-xs font-medium text-slate-600 mb-0.5">{label}</label>

      {/* Current file status */}
      <div className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-slate-50 flex items-center gap-2 mb-1">
        {hasFiles ? (
          <>
            <FileCheck className="w-4 h-4 text-green-600" />
            <span className="text-slate-700">{fileCount} file{fileCount !== 1 ? 's' : ''} attached</span>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                View
              </a>
            )}
          </>
        ) : (
          <>
            <File className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">No file</span>
          </>
        )}
      </div>

      {/* Upload/Delete buttons */}
      <div className="flex gap-2">
        {/* Upload button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id={`file-upload-${name}`}
            disabled={uploading || deleting}
          />
          <label
            htmlFor={`file-upload-${name}`}
            className={`inline-flex w-full items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              uploading || deleting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3 h-3" />
                {hasFiles ? (isMultiple ? 'Add File' : 'Replace') : 'Upload'}
              </>
            )}
          </label>
        </div>

        {/* Delete button (only show if file exists) */}
        {hasFiles && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={uploading || deleting}
            className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              uploading || deleting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {deleting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <X className="w-3 h-3" />
                Remove
              </>
            )}
          </button>
        )}
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="mt-1 text-xs text-green-600 font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-1 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {isMultiple
                ? 'Are you sure you want to remove all files from this field? This action cannot be undone.'
                : 'Are you sure you want to remove this file? This action cannot be undone.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
