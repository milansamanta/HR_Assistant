import React,{ useState } from 'react'
import './App.css'
import { Send, Plus, MessageSquare, Menu } from 'lucide-react';

// Define the shape of a single message
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  // Strongly typed state arrays and primitives
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Type the form submit event
  const handleSend = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setIsLoading(true);

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    setMessages((prev) => [...prev, {role: 'assistant', content: ''}]);

    try{
      const res = await fetch('http://127.0.0.1:8000/api/send_message', {
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: input.trim()})
      });

      if (!res.body) throw new Error("No Response Body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while(true){
        const {value, done} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split("<end>");
        buffer = lines.pop() || "";
        
        for (const line of lines){
          const trimmed = line.trim();
          if(!trimmed.startsWith("data: ")) continue;
          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "<DONE>") break;
          try{
            const parsed = JSON.parse(data);
            setMessages((prev)=>{
              const lastIdx = prev.length-1;
              const updated = [...prev];
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content+parsed.token
              };
              return updated;
            });
          } catch(err){
            console.log(err);
          }
        }
      }
    } catch(err){
      console.log(err);
    } finally{
      setIsLoading(false);
    }

  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 p-4 flex flex-col transition-transform md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button className="flex items-center gap-2 border border-gray-700 hover:bg-gray-800 rounded-lg p-3 text-sm transition">
          <Plus size={16} /> New chat
        </button>
        <div className="mt-4 flex-1 overflow-y-auto space-y-1">
          <div className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg cursor-pointer text-sm text-gray-300">
            <MessageSquare size={16} /> Previous chat example
          </div>
        </div>
      </aside>

      {/* Main Chat Window */}
      <main className="flex-1 flex flex-col h-full bg-gray-950">
        {/* Top bar */}
        <header className="flex items-center p-4 border-b border-gray-800 md:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              placeholder="Type your query here....."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-gray-500 text-white placeholder-gray-500 shadow-lg"
            />
            <button type="submit" className="absolute right-3 p-2 bg-white text-gray-950 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
