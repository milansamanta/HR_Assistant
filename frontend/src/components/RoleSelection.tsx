import type { FC } from 'react';
import { User, ShieldCheck, MessageSquare, Database, UploadCloud, Trash2, Sparkles, ArrowRight } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'user' | 'admin') => void;
}

export const RoleSelection: FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full text-center z-10 space-y-8">
        {/* Header Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-blue-400 font-medium tracking-wide">
            <Sparkles size={14} /> AI-Powered HR Policy Assistant
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Select Your Role to Continue
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Choose how you would like to interact with the HR Assistant workspace. Users get query access, while Admins manage knowledge base documents.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* USER CARD */}
          <div 
            onClick={() => onSelectRole('user')}
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 text-left transition-all duration-300 shadow-xl hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <User size={28} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  User Workspace
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Access the AI chat interface to ask questions about company policies, leave entitlements, health benefits, and IT guidelines.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-blue-400" /> Interactive AI Policy Chat interface
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" /> Real-time answer streaming & context retrieval
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-400" /> Clean read-only user access
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-sm font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Continue as User</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* ADMIN CARD */}
          <div 
            onClick={() => onSelectRole('admin')}
            className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-8 text-left transition-all duration-300 shadow-xl hover:shadow-purple-500/10 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  Admin Workspace
                </h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Manage policy documents. Upload new Markdown/Text files for chunking & Chroma vector database storage, delete obsolete files, and test chat responses.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <UploadCloud size={14} className="text-purple-400" /> Upload & automatic document chunking
                </li>
                <li className="flex items-center gap-2">
                  <Database size={14} className="text-purple-400" /> Chroma Vector DB indexing & storage
                </li>
                <li className="flex items-center gap-2">
                  <Trash2 size={14} className="text-purple-400" /> Delete documents from server & vector store
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 flex items-center justify-between text-sm font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Continue as Admin</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
