import { useState } from 'react';
import { RoleSelection } from './components/RoleSelection';
import { ChatInterface } from './components/ChatInterface';
import { DocumentManager } from './components/DocumentManager';
import { ShieldCheck, User as UserIcon, LogOut, FileText, MessageSquare, Bot } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [adminTab, setAdminTab] = useState<'documents' | 'chat'>('documents');

  // Starting Page: Role Selection
  if (role === null) {
    return <RoleSelection onSelectRole={(selectedRole) => setRole(selectedRole)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-md">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight m-0 p-0 leading-tight">
              HR Assistant System
            </h1>
            <p className="text-[11px] text-slate-400 m-0 p-0">
              Vector DB Policy Engine
            </p>
          </div>
        </div>

        {/* Center: Admin Tabs (Only shown for Admin role) */}
        {role === 'admin' && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAdminTab('documents')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                adminTab === 'documents'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText size={14} /> Document Upload & Delete
            </button>
            <button
              onClick={() => setAdminTab('chat')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                adminTab === 'chat'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <MessageSquare size={14} /> Policy Chat Test
            </button>
          </div>
        )}

        {/* Right: Active Role Badge & Switch Role Button */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            role === 'admin'
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
          }`}>
            {role === 'admin' ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
            <span>Role: {role === 'admin' ? 'Admin' : 'User'}</span>
          </div>

          <button
            onClick={() => setRole(null)}
            title="Switch Role"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700"
          >
            <LogOut size={14} /> Switch Role
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1">
        {role === 'user' ? (
          /* USER ROLE: ONLY gives the chat interface! */
          <ChatInterface role="user" />
        ) : (
          /* ADMIN ROLE: Can upload & delete documents or test chat */
          <div className="py-2">
            {adminTab === 'documents' ? (
              <DocumentManager />
            ) : (
              <ChatInterface role="admin" />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
