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
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold">AI Todo Manager</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loadingHistory && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Cargando historial...</span>
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex justify-center items-center py-8 text-gray-400">
            No hay mensajes. ¡Empieza una conversación!
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white border rounded-lg px-4 py-3"><Loader2 className="w-4 h-4 animate-spin" /></div></div>}
      </div>
      <div className="border-t bg-white px-6 py-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-3 border rounded-lg"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
