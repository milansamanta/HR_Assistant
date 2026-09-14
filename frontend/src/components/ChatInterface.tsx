import { useState, useRef, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Send, Plus, Bot, User as UserIcon, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  role: 'user' | 'admin';
}

const PRESET_QUESTIONS = [
  "What are the health coverage tiers under the benefits policy?",
  "How many annual leave days are provided per year?",
  "What are the password security requirements?",
  "How is Leave Travel Allowance (LTA) reimbursed?"
];

export const ChatInterface: FC<ChatInterfaceProps> = ({ role }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your HR Policy Assistant. How can I help you today regarding company policies, health benefits, or leave structures?`
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    setError(null);
    setIsLoading(true);

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setInput('');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      if (!res.body) {
        throw new Error('No response stream received from backend server');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('<end>');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.replace(/^data:\s*/, '');
          if (data === '<DONE>') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: updated[lastIdx].content + parsed.token
                };
                return updated;
              });
            }
          } catch (err) {
            console.error('SSE JSON Parse error:', err);
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to connect to the backend server. Is FastAPI running on http://127.0.0.1:8000?');
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx].role === 'assistant' && updated[lastIdx].content === '') {
          updated[lastIdx] = {
            role: 'assistant',
            content: '⚠️ Failed to get a response from the policy engine. Please check backend connection.'
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendQuery(input);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your HR Policy Assistant. How can I help you today regarding company policies, health benefits, or leave structures?`
      }
    ]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-6">
      {/* Header bar for Chat */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              HR Assistant Chat
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Mode: {role === 'admin' ? 'Admin Test' : 'User Query'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Retrieves answer context directly from vector store knowledge base
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 rounded-lg transition"
        >
          <Plus size={14} /> New Chat
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-purple-400'
              }`}
            >
              {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              {msg.content ? (
                msg.content
              ) : (
                <div className="flex items-center gap-2 text-slate-400 py-1">
                  <RefreshCw size={14} className="animate-spin text-blue-400" />
                  <span className="text-xs">Searching policy chunks & generating response...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      {messages.length <= 2 && !isLoading && (
        <div className="my-3">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles size={12} className="text-blue-400" /> Frequently Asked Policy Questions:
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(q)}
                className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-left transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box Form */}
      <div className="pt-3 border-t border-slate-800/80">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything about company policies, leave rules, or benefits..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
