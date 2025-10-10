'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Edit, Eye, Plus, Search, Filter, MousePointer, Type, CheckSquare, Calendar, X, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Toast, ToastContainer } from '@/components/Toast';
// Dynamically import react-pdf to avoid SSR issues
import dynamic from 'next/dynamic';

// Load react-pdf components only on client side
const Document = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
);

// Configure PDF.js worker (client-side only) - using cdnjs for CORS support
if (typeof window !== 'undefined') {
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  });
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileSize: number;
  requiresSignature: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export default function TemplatesPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'view' | 'edit'>('edit');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const queryClient = useQueryClient();

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch templates
  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', categoryFilter],
    queryFn: () => api.getTemplates({
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      active_only: true
    })
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => api.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete template:', error);
    }
  });

  const templates = data?.templates || [];

  // Filter by search query (client-side)
  const filteredTemplates = templates.filter((template: DocumentTemplate) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.fileName.toLowerCase().includes(query)
    );
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'tax', label: 'Tax Forms' },
    { value: 'benefits', label: 'Benefits' },
    { value: 'policy', label: 'Policies' },
    { value: 'other', label: 'Other' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading templates: {(error as Error).message}</div>
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
            Document Templates
          </h1>
          <p className="text-gray-600">
            Manage templates for employee documents and signatures
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-hartzell-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Upload Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent appearance-none bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'Try adjusting your search criteria' : 'Get started by uploading your first template'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-hartzell-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Upload Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={() => {
                setCurrentTemplate(template);
                setEditorMode('view');
                setShowFieldEditor(true);
              }}
              onEdit={() => {
                setCurrentTemplate(template);
                setEditorMode('edit');
                setShowFieldEditor(true);
              }}
              onDelete={() => {
                setTemplateToDelete(template.id);
                setShowDeleteModal(true);
              }}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={(template) => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            setShowUploadModal(false);
            setCurrentTemplate(template);
            setShowFieldEditor(true);
            showToast('Template uploaded successfully!', 'success');
          }}
          onError={(message) => showToast(message, 'error')}
          onValidationError={(message) => showToast(message, 'warning')}
        />
      )}

      {/* Field Editor Modal */}
      {showFieldEditor && currentTemplate && (
        <FieldEditorModal
          template={currentTemplate}
          mode={editorMode}
          onClose={() => {
            setShowFieldEditor(false);
            setCurrentTemplate(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            setShowFieldEditor(false);
            setCurrentTemplate(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Template?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this template? All signature field configurations will be permanently removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTemplateToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (templateToDelete) {
                    deleteMutation.mutate(templateToDelete);
                  }
                  setShowDeleteModal(false);
                  setTemplateToDelete(null);
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onView,
  onEdit,
  onDelete,
  isDeleting
}: {
  template: DocumentTemplate;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const categoryColors: Record<string, string> = {
    onboarding: 'bg-blue-100 text-blue-800',
    tax: 'bg-purple-100 text-purple-800',
    benefits: 'bg-green-100 text-green-800',
    policy: 'bg-yellow-100 text-yellow-800',
    other: 'bg-gray-100 text-gray-800'
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-hartzell-blue" />
            <span className={`text-xs font-medium px-2 py-1 rounded ${categoryColors[template.category] || categoryColors.other}`}>
              {template.category}
            </span>
          </div>
          {template.requiresSignature && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
              Signature
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">File:</span>
          <span className="text-gray-900 font-medium text-xs truncate max-w-[150px]" title={template.fileName}>
            {template.fileName}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Size:</span>
          <span className="text-gray-900 font-medium">{formatFileSize(template.fileSize)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-900 font-medium">{new Date(template.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-4 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="View fields"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-hartzell-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          title="Edit fields"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function UploadModal({
  onClose,
  onSuccess,
  onError,
  onValidationError
}: {
  onClose: () => void;
  onSuccess: (template: any) => void;
  onError: (message: string) => void;
  onValidationError: (message: string) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'onboarding',
    requiresSignature: true
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      onValidationError('Please select a file');
      return;
    }

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('requiresSignature', String(formData.requiresSignature));

      const result = await api.uploadTemplate(uploadFormData);
      onSuccess(result.template);
    } catch (error: any) {
      onError(error.message || 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(droppedFile.type)) {
        onValidationError('Invalid file type. Only PDF, DOC, and DOCX are allowed.');
        return;
      }

      // Validate file size (max 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (droppedFile.size > maxSize) {
        onValidationError('File too large. Maximum size is 25MB.');
        return;
      }

      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Document Template</h2>
          <p className="text-sm text-gray-600 mt-1">Add a new template for employee signatures</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document File *
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? 'border-hartzell-blue bg-blue-50'
                  : 'border-gray-300 hover:border-hartzell-blue'
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-hartzell-blue hover:underline">Click to upload</span>
                {' or drag and drop'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (max 25MB)</p>
              {file && (
                <p className="text-sm text-green-600 mt-2 font-medium">{file.name}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              placeholder="e.g., Drug Test Consent Form"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              required
            >
              <option value="onboarding">Onboarding</option>
              <option value="tax">Tax Forms</option>
              <option value="benefits">Benefits</option>
              <option value="policy">Policies</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hartzell-blue focus:border-transparent"
              placeholder="Brief description of this document..."
            />
          </div>

          {/* Requires Signature */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresSignature"
              checked={formData.requiresSignature}
              onChange={(e) => setFormData({ ...formData, requiresSignature: e.target.checked })}
              className="w-4 h-4 text-hartzell-blue border-gray-300 rounded focus:ring-hartzell-blue"
            />
            <label htmlFor="requiresSignature" className="text-sm text-gray-700">
              This document requires employee signature
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !formData.title || isUploading}
              className="flex-1 px-6 py-3 bg-hartzell-blue text-white rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
interface Field {
  id: string;
  type: 'signature' | 'initials' | 'checkbox' | 'date' | 'text';
  pageNumber: number; // Which page (1-indexed)
  x: number;          // Percentage (0-100) relative to page width
  y: number;          // Percentage (0-100) relative to page height
  width: number;      // Percentage (0-100) relative to page width
  height: number;     // Percentage (0-100) relative to page height
  label?: string;
  required: boolean;  // Mandatory vs optional - employees can't proceed without completing required fields
}

function FieldEditorModal({
  template,
  mode = 'edit',
  onClose,
  onSuccess
}: {
  template: any;
  mode?: 'view' | 'edit';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [draggingField, setDraggingField] = useState<{ id: string; startX: number; startY: number; fieldX: number; fieldY: number; pageNumber: number } | null>(null);
  const [resizingField, setResizingField] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number; pageNumber: number } | null>(null);
  const [draggingNewField, setDraggingNewField] = useState<{ type: Field['type']; x: number; y: number; pageNumber?: number } | null>(null);

  // Refs to track each page's overlay div for coordinate calculations
  const pageOverlayRefs = useState<Map<number, HTMLDivElement>>(new Map())[0];
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // PDF page tracking state
  const [numPages, setNumPages] = useState<number>(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [pageWidths, setPageWidths] = useState<number[]>([]);

  const isViewMode = mode === 'view';
  const allPagesLoaded = loadedPages.size === numPages && numPages > 0;

  // Load PDF as blob to ensure authentication works
  useEffect(() => {
    let mounted = true;
    let blobUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setPdfLoading(true);
        setPdfError(null);

        const response = await fetch(`https://hartzell.work/api/admin/templates/${template.id}/download`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/pdf'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        if (mounted) {
          setPdfBlobUrl(blobUrl);
          setPdfLoading(false);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (mounted) {
          setPdfError((error as Error).message);
          setPdfLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [template.id]);

  // Load existing fields and convert from PDF points to percentages
  useEffect(() => {
    if (!template.fieldPositions || !allPagesLoaded) return;

    try {
      const parsed = typeof template.fieldPositions === 'string'
        ? JSON.parse(template.fieldPositions)
        : template.fieldPositions;

      // Convert from PDF points to percentage coordinates
      const convertedFields = parsed.map((f: any, i: number) => {
        const pageIndex = (f.page || f.pageNumber || 1) - 1;
        const pageWidth = pageWidths[pageIndex] || 800;
        const pageHeight = pageHeights[pageIndex] || 1132;

        // Convert PDF points to percentages
        // X: straightforward conversion (left edge)
        // Y: flip axis back (PDF origin is bottom-left, React is top-left)
        //    PDF Y is the BOTTOM of the field, React Y is the TOP
        const percentX = (f.x / pageWidth) * 100;
        const percentHeight = (f.height / pageHeight) * 100;
        const percentY = ((pageHeight - f.y - f.height) / pageHeight) * 100;
        const percentWidth = (f.width / pageWidth) * 100;

        return {
          ...f,
          id: f.id || `field_${i}`,
          x: percentX,
          y: percentY,
          width: percentWidth,
          height: percentHeight,
          pageNumber: f.page || f.pageNumber || 1
        };
      });

      setFields(convertedFields);
    } catch (e) {
      console.error('Failed to parse field positions:', e);
    }
  }, [template.fieldPositions, allPagesLoaded, pageWidths, pageHeights, loadedPages, numPages]);

  const fieldTypes = [
    { type: 'signature' as const, label: 'Signature', icon: MousePointer, color: 'bg-blue-600', example: 'John Doe' },
    { type: 'initials' as const, label: 'Initials', icon: Type, color: 'bg-indigo-600', example: 'JD' },
    { type: 'checkbox' as const, label: 'Checkbox', icon: CheckSquare, color: 'bg-slate-600', example: '☑' },
    { type: 'date' as const, label: 'Date', icon: Calendar, color: 'bg-cyan-700', example: new Date().toLocaleDateString() },
    { type: 'text' as const, label: 'Text', icon: Type, color: 'bg-gray-600', example: 'Enter text...' }
  ];

  const fieldDimensions = {
    signature: { width: 20, height: 5 },
    initials: { width: 10, height: 5 },
    checkbox: { width: 3, height: 3 },
    date: { width: 15, height: 5 },
    text: { width: 20, height: 5 }
  };

  // Handle drag start from sidebar
  const handleSidebarDragStart = (e: React.DragEvent, fieldType: Field['type']) => {
    if (isViewMode) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('fieldType', fieldType);
  };

  // Handle drag over document - updated for multi-page support
  const handleDragOver = (e: React.DragEvent, pageNum: number) => {
    if (isViewMode || !draggingNewField) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Get the page overlay element to calculate coordinates relative to this page
    const pageOverlay = e.currentTarget as HTMLElement;
    const rect = pageOverlay.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDraggingNewField({ type: draggingNewField.type, x, y, pageNumber: pageNum });
  };

  // Handle drop on document - updated for multi-page support
  const handleDrop = (e: React.DragEvent, pageNum: number) => {
    if (isViewMode) return;
    e.preventDefault();

    const fieldType = e.dataTransfer.getData('fieldType') as Field['type'];
    if (!fieldType) return;

    // Get the page overlay element to calculate coordinates relative to this page
    const pageOverlay = e.currentTarget as HTMLElement;
    const rect = pageOverlay.getBoundingClientRect();
    const cursorX = ((e.clientX - rect.left) / rect.width) * 100;
    const cursorY = ((e.clientY - rect.top) / rect.height) * 100;

    // Center the field on cursor position (same as preview)
    const fieldWidth = fieldDimensions[fieldType].width;
    const fieldHeight = fieldDimensions[fieldType].height;
    const x = Math.max(0, Math.min(100 - fieldWidth, cursorX - fieldWidth / 2));
    const y = Math.max(0, Math.min(100 - fieldHeight, cursorY - fieldHeight / 2));

    const newField: Field = {
      id: `field_${Date.now()}`,
      type: fieldType,
      x,
      y,
      width: fieldWidth,
      height: fieldHeight,
      pageNumber: pageNum, // Use the actual page number from drop target
      label: `${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} ${fields.filter(f => f.type === fieldType).length + 1}`,
      required: true // Default to mandatory
    };

    setFields([...fields, newField]);
    setDraggingNewField(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    if (e.currentTarget === e.target) {
      setDraggingNewField(null);
    }
  };

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const handleToggleRequired = (fieldId: string) => {
    setFields(fields.map(f =>
      f.id === fieldId ? { ...f, required: !f.required } : f
    ));
  };

  const handleFieldMouseDown = (e: React.MouseEvent, field: Field) => {
    e.stopPropagation();

    setDraggingField({
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      fieldX: field.x,
      fieldY: field.y,
      pageNumber: field.pageNumber
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, field: Field) => {
    e.stopPropagation();

    setResizingField({
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: field.width,
      startHeight: field.height,
      pageNumber: field.pageNumber
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingField) {
      // Get the rect of the specific page this field is on
      const pageOverlay = pageOverlayRefs.get(draggingField.pageNumber);
      if (!pageOverlay) return;

      const rect = pageOverlay.getBoundingClientRect();
      const deltaX = ((e.clientX - draggingField.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - draggingField.startY) / rect.height) * 100;

      setFields(fields.map(f =>
        f.id === draggingField.id
          ? {
              ...f,
              x: Math.max(0, Math.min(100 - f.width, draggingField.fieldX + deltaX)),
              y: Math.max(0, Math.min(100 - f.height, draggingField.fieldY + deltaY))
            }
          : f
      ));
    } else if (resizingField) {
      // Get the rect of the specific page this field is on
      const pageOverlay = pageOverlayRefs.get(resizingField.pageNumber);
      if (!pageOverlay) return;

      const rect = pageOverlay.getBoundingClientRect();
      const deltaX = ((e.clientX - resizingField.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - resizingField.startY) / rect.height) * 100;

      setFields(fields.map(f =>
        f.id === resizingField.id
          ? {
              ...f,
              width: Math.max(3, Math.min(50, resizingField.startWidth + deltaX)),
              height: Math.max(2, Math.min(15, resizingField.startHeight + deltaY))
            }
          : f
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggingField(null);
    setResizingField(null);
  };

  const handleMouseLeave = () => {
    setDraggingField(null);
    setResizingField(null);
  };

  const handleSaveFields = async () => {
    setIsSaving(true);

    try {
      // Convert fields from percentage coordinates to PDF points
      const fieldPositions = fields.map(field => {
        const pageIndex = field.pageNumber - 1;
        const pageWidth = pageWidths[pageIndex] || 800; // Default to canvas width
        const pageHeight = pageHeights[pageIndex] || 1132; // Default to A4-ish height

        // Convert percentage to PDF points
        // X: straightforward conversion (left edge)
        // Y: flip axis (PDF origin is bottom-left, React is top-left)
        //    PDF Y is the BOTTOM of the field, React Y is the TOP
        const pdfX = (field.x / 100) * pageWidth;
        const pdfY = pageHeight - (((field.y + field.height) / 100) * pageHeight);
        const pdfWidth = (field.width / 100) * pageWidth;
        const pdfHeight = (field.height / 100) * pageHeight;

        return {
          type: field.type,
          x: pdfX,
          y: pdfY,
          width: pdfWidth,
          height: pdfHeight,
          page: field.pageNumber,
          label: field.label,
          required: field.required ?? true, // Default to required if not set
          // Include page dimensions for backend coordinate transformation
          pageHeight: pageHeight,
          pageWidth: pageWidth
        };
      });

      // Save to backend
      await api.updateTemplateFields(template.id, fieldPositions);

      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500); // Show success message briefly before closing
    } catch (error: any) {
      console.error('Failed to save fields:', error);
      // Could add error state here if needed
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldColor = (type: Field['type']) => {
    return fieldTypes.find(ft => ft.type === type)?.color || 'bg-gray-500';
  };

  const getFieldExample = (type: Field['type']) => {
    return fieldTypes.find(ft => ft.type === type)?.example || '';
  };

  const getFieldExampleStyle = (type: Field['type']) => {
    switch (type) {
      case 'signature':
        return 'font-serif italic text-base';
      case 'initials':
        return 'font-serif italic font-bold text-sm';
      case 'checkbox':
        return 'text-2xl';
      case 'date':
        return 'text-xs';
      case 'text':
        return 'text-xs italic opacity-80';
      default:
        return 'text-xs';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isViewMode ? 'View Signature Fields' : 'Place Signature Fields'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {template.title}
                {!isViewMode && ' - Drag field types from sidebar onto document • Drag to move • Resize from corner'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area - Flex Row for PDF and Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 overflow-y-auto">
            <div
              className="flex items-start justify-center p-2 sm:p-4"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Removed fixed aspectRatio to allow multi-page scrolling */}
              <div className="w-full max-w-4xl">
                <div
                  ref={setContainerRef}
                  className="relative w-full bg-white shadow-lg rounded-lg"
                >
                {/* PDF iframe with loading and error states */}
                {pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hartzell-blue mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading PDF...</p>
                    </div>
                  </div>
                )}
                {pdfError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                    <div className="text-center max-w-md p-6">
                      <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load PDF</h3>
                      <p className="text-sm text-gray-600 mb-4">{pdfError}</p>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
                {pdfBlobUrl && !pdfLoading && !pdfError && !allPagesLoaded && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hartzell-blue mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading pages... ({loadedPages.size}/{numPages || '?'})</p>
                    </div>
                  </div>
                )}
                {pdfBlobUrl && !pdfLoading && !pdfError && (
                  <Document
                    file={pdfBlobUrl}
                    onLoadSuccess={({ numPages: pages }) => {
                      setNumPages(pages);
                      setPdfLoading(false);
                    }}
                    onLoadError={(error) => {
                      console.error('PDF load error:', error);
                      setPdfError('Failed to load PDF');
                    }}
                    loading=""
                    className={allPagesLoaded ? '' : 'hidden'}
                  >
                    {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                      <div key={pageNum} className="relative mb-4 bg-white shadow-lg rounded-lg">
                        {/* Page number indicator */}
                        <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded z-20 pointer-events-none">
                          Page {pageNum} of {numPages}
                        </div>

                        <Page
                          pageNumber={pageNum}
                          width={800}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={(page) => {
                            const { width, height } = page;
                            setPageWidths(prev => {
                              const updated = [...prev];
                              updated[pageNum - 1] = width;
                              return updated;
                            });
                            setPageHeights(prev => {
                              const updated = [...prev];
                              updated[pageNum - 1] = height;
                              return updated;
                            });
                            setLoadedPages(prev => new Set([...prev, pageNum]));
                          }}
                          loading=""
                        />

                        {/* Per-page field overlay - MUST use exact same dimensions as percentage calculation */}
                        <div
                          ref={(el) => {
                            if (el) pageOverlayRefs.set(pageNum, el);
                          }}
                          className="absolute top-0 left-0 rounded-lg"
                          style={{
                            width: '800px',
                            height: pageWidths[pageNum - 1] && pageHeights[pageNum - 1]
                              ? `${(800 / pageWidths[pageNum - 1]) * pageHeights[pageNum - 1]}px`
                              : 'auto',
                            pointerEvents: 'auto'
                          }}
                          onDragOver={(e) => handleDragOver(e, pageNum)}
                          onDrop={(e) => handleDrop(e, pageNum)}
                          onDragLeave={handleDragLeave}
                        >
                {fields
                  .filter(field => field.pageNumber === pageNum)
                  .map((field) => (
                  <div
                    key={field.id}
                    className={`absolute pointer-events-auto ${getFieldColor(field.type)} border-2 ${field.required ? 'border-red-400' : 'border-white'} rounded group select-none transition-all ${isViewMode ? 'cursor-default opacity-40' : 'cursor-move opacity-35 hover:opacity-60'}`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`
                    }}
                    onMouseDown={isViewMode ? undefined : (e) => handleFieldMouseDown(e, field)}
                  >
                    {/* Required indicator - always visible */}
                    {field.required && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold z-10">
                        *
                      </div>
                    )}

                    {/* Field example - always visible */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className={`text-white drop-shadow-md ${getFieldExampleStyle(field.type)}`}>
                        {getFieldExample(field.type)}
                      </span>
                    </div>

                    {/* Field label - only visible on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-80 rounded flex flex-col items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-semibold">
                        {field.label}
                      </span>
                      <span className={`text-xs mt-1 ${field.required ? 'text-red-300' : 'text-gray-300'}`}>
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </div>

                    {/* Delete button - only in edit mode */}
                    {!isViewMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveField(field.id);
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-600 transition-opacity z-10"
                        title="Remove field"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {/* Toggle Required/Optional button - only in edit mode */}
                    {!isViewMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRequired(field.id);
                        }}
                        className="absolute -top-2 -left-2 w-5 h-5 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-blue-600 transition-opacity z-10 text-xs font-bold"
                        title={field.required ? 'Make optional' : 'Make required'}
                      >
                        {field.required ? '*' : '?'}
                      </button>
                    )}

                    {/* Resize handle - only in edit mode */}
                    {!isViewMode && (
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-500 rounded-tl cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onMouseDown={(e) => handleResizeMouseDown(e, field)}
                        title="Resize"
                      />
                    )}
                  </div>
                ))}

                {/* Drag preview - show field outline while dragging on this page only */}
                {!isViewMode && draggingNewField && draggingNewField.pageNumber === pageNum && (
                  <div
                    className={`absolute pointer-events-none ${getFieldColor(draggingNewField.type)} opacity-40 border-2 border-dashed border-white rounded`}
                    style={{
                      left: `${draggingNewField.x}%`,
                      top: `${draggingNewField.y}%`,
                      width: `${fieldDimensions[draggingNewField.type].width}%`,
                      height: `${fieldDimensions[draggingNewField.type].height}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-white drop-shadow-md ${getFieldExampleStyle(draggingNewField.type)}`}>
                        {getFieldExample(draggingNewField.type)}
                      </span>
                    </div>
                  </div>
                )}
                        </div>
                      </div>
                    ))}
                  </Document>
                )}
            </div>
          </div>
          </div>
          </div>

          {/* Sidebar - Field Types */}
          {!isViewMode && (
            <div className="w-64 border-l border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Field Types</h3>
                <p className="text-xs text-gray-600 mt-1">Drag onto document</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {fieldTypes.map(({ type, label, icon: Icon, color, example }) => (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => {
                      handleSidebarDragStart(e, type);
                      setDraggingNewField({ type, x: 0, y: 0 });
                    }}
                    onDragEnd={() => setDraggingNewField(null)}
                    className={`${color} text-white p-4 rounded-lg cursor-move shadow-md hover:shadow-lg transition-all flex flex-col gap-3`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs opacity-80">Drag to place</div>
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded px-3 py-2 text-center border border-white border-opacity-30">
                      <div className={`text-sm ${type === 'signature' ? 'font-serif italic' : type === 'initials' ? 'font-serif italic font-bold' : type === 'checkbox' ? 'text-xl' : ''}`}>
                        {example}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="text-sm order-2 sm:order-1">
              {saveSuccess ? (
                <span className="text-green-600 font-medium">✓ Fields saved successfully!</span>
              ) : (
                <span className="text-gray-600">
                  <span className="font-medium">{fields.length}</span> field{fields.length !== 1 ? 's' : ''} {isViewMode ? 'configured' : 'placed'}
                  {fields.length > 0 && (
                    <>
                      {' • '}
                      <span className="text-red-600 font-medium">{fields.filter(f => f.required).length} required</span>
                      {' • '}
                      <span className="text-gray-500">{fields.filter(f => !f.required).length} optional</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
              {isViewMode ? (
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Skip for Now
                  </button>
                  <button
                    onClick={handleSaveFields}
                    disabled={fields.length === 0 || isSaving || saveSuccess}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-hartzell-blue text-white rounded-lg font-medium hover:bg-hartzell-blue/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Fields'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
