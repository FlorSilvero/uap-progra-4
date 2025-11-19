// app/page.tsx
'use client';

import { Send, Loader2 } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Cargar historial de conversación al iniciar
  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
            console.log(`📚 Cargados ${data.messages.length} mensajes del historial`);
          }
        }
      } catch (error) {
        console.error('Error cargando historial:', error);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

  const sendMessage = useCallback(async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const messagesToSend = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) {
        // Read server error body (if any) and show it to the user instead of throwing a generic error
        let errText = `HTTP ${response.status}`;
        try {
          errText = await response.text();
        } catch (e) {
          // ignore
        }
        console.error('Server returned error:', errText);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: `Error del servidor: ${errText}` }
              : m
          )
        );
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId ? { ...m, content: accumulated } : m
            )
          );
        }
      }

      if (!accumulated.trim()) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: 'Lo siento, no pude generar una respuesta.' }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: 'Error al procesar la solicitud.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-5 shadow-sm">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Todo Manager ✨
        </h1>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {loadingHistory && (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500 font-medium">Cargando historial...</span>
            </div>
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col justify-center items-center py-16 text-center">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-400 text-lg font-medium">No hay mensajes aún</p>
            <p className="text-gray-300 text-sm mt-2">¡Empieza una conversación!</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
              m.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                : 'bg-white border border-gray-200'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 bg-white/80 backdrop-blur-sm px-6 py-5 shadow-lg">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="px-7 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
