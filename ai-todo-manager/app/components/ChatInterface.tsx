// @ts-nocheck
'use client';

import { useChat } from 'ai/react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onResponse: (response) => {
      console.log('📥 Respuesta recibida:', response);
    },
    onFinish: (message) => {
      console.log('✅ Mensaje finalizado:', message);
    },
    onError: (error) => {
      console.error('❌ Error:', error);
    }
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Todo Manager</h1>
        <p className="text-sm text-gray-600">Gestiona tus tareas conversacionalmente</p>
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              ¡Hola! Soy tu asistente de tareas
            </h2>
            <p className="text-gray-500 mb-6">
              Puedo ayudarte a crear, organizar y gestionar tus tareas
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              <SuggestionCard 
                emoji="➕"
                text="Agregar tarea: comprar leche"
              />
              <SuggestionCard 
                emoji="📋"
                text="Muéstrame todas mis tareas"
              />
              <SuggestionCard 
                emoji="✅"
                text="Completar tarea 1"
              />
              <SuggestionCard 
                emoji="🗑️"
                text="Eliminar tarea 2"
              />
              <SuggestionCard 
                emoji="📊"
                text="¿Cuántas tareas he completado?"
              />
              <SuggestionCard 
                emoji="⏳"
                text="Mostrar tareas pendientes"
              />
            </div>
          </div>
        )}

        {messages.map((message: any) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🤖</span>
                  <span className="text-xs font-semibold text-gray-500">Asistente</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Mostrar tool calls si existen */}
              {message.toolInvocations && message.toolInvocations.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.toolInvocations.map((toolInvocation: any, index: number) => (
                    <div key={index} className="bg-gray-100 rounded p-2 text-xs">
                      <div className="font-semibold text-gray-700">
                        🔧 {toolInvocation.toolName}
                      </div>
                      {toolInvocation.state === 'result' && (
                        <div className="mt-1 text-gray-600">
                          {JSON.stringify(toolInvocation.result, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pensando...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe tu mensaje... Ej: 'Agregar tarea: llamar al doctor'"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Enviar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SuggestionCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors cursor-pointer">
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm text-gray-700">{text}</span>
      </div>
    </div>
  );
}
