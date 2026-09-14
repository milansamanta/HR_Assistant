import { useState, useEffect } from 'react';
import type { FC, ChangeEvent, FormEvent } from 'react';
import { UploadCloud, Trash2, FileText, Database, RefreshCw, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

interface DocumentInfo {
  id: string;
  name: string;
  title: string;
  size_bytes: number;
  chunks_count: number;
  modified_at: number;
}

export const DocumentManager: FC = () => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/documents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStatusMessage(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || `File uploaded, chunked into ${data.chunks_count} section(s), and stored in Chroma DB.`
      });
      setSelectedFile(null);
      // Reset file input element if any
      const inputEl = document.getElementById('doc-upload-input') as HTMLInputElement;
      if (inputEl) inputEl.value = '';

      fetchDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to upload document to backend.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will remove the document file and delete all associated vector chunks from Chroma DB.`)) {
      return;
    }

    setDeletingId(filename);
    setStatusMessage(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Delete failed');

      setStatusMessage({
        type: 'success',
        text: data.message || `Document "${filename}" deleted.`
      });
      fetchDocuments();
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to delete document.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Upload Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UploadCloud size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Upload New Policy Document</h2>
            <p className="text-xs text-slate-400">
              Files are automatically parsed, split into text chunks, and stored as vector embeddings in Chroma DB.
            </p>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-red-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 text-center transition bg-slate-950/50">
            <input
              id="doc-upload-input"
              type="file"
              accept=".md"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="doc-upload-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText size={32} className="text-purple-400 mb-1" />
              <span className="text-sm font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to select Markdown (.md) file'}
              </span>
              <span className="text-xs text-slate-500">
                {selectedFile
                  ? `${formatFileSize(selectedFile.size)} - Ready to upload`
                  : 'Supported formats: .md'}
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20"
            >
              {isUploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Chunking & Indexing into Chroma...
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  Upload & Store in Vector DB
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Document Storage Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Stored Documents & Vector Chunks
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {documents.length} File(s)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage files stored on the server and Chroma vector database collection
              </p>
            </div>
          </div>

          <button
            onClick={fetchDocuments}
            disabled={isLoadingDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 rounded-lg transition"
          >
            <RefreshCw size={14} className={isLoadingDocs ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Table List */}
        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <HardDrive size={36} className="mx-auto text-slate-700" />
            <p className="text-sm">No documents found in knowledge base.</p>
            <p className="text-xs text-slate-600">Upload a policy markdown file above to populate the vector store.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Document Title / File</th>
                  <th className="py-3 px-4 text-center">Vector Chunks</th>
                  <th className="py-3 px-4 text-center">File Size</th>
                  <th className="py-3 px-4 text-center">Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-purple-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-white text-sm">{doc.title}</p>
                          <p className="text-slate-500 font-mono text-[11px]">{doc.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium">
                        <Database size={12} /> {doc.chunks_count} chunk(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {formatFileSize(doc.size_bytes)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400">
                      {new Date(doc.modified_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.name)}
                        disabled={deletingId === doc.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs transition disabled:opacity-50"
                      >
                        {deletingId === doc.name ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
