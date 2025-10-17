"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ErrorMessage } from "./ErrorMessage";
import { validateConversation, sanitizeInput, validateInput } from "../utils/validation";
import { Trash2, MessageSquare } from "lucide-react";

type Message = {
  id: string;
  role: string;
  content?: string;
  parts?: Array<{ type: string; text: string }>;
};

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationError, setConversationError] = useState<string>("");

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Persistir conversación en sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Recuperar conversación al cargar
  useEffect(() => {
    const savedMessages = sessionStorage.getItem("chat-messages");
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Validar que los mensajes tengan el formato correcto
        const validMessages = parsed.filter((m: any) => {
          const hasValidRole = m.role && (m.role === 'user' || m.role === 'assistant');
          const hasValidContent = (m.parts && m.parts[0]?.text) || m.content;
          return hasValidRole && hasValidContent;
        });
        setMessages(validMessages);
        console.log("✅ Mensajes recuperados:", validMessages.length);
      } catch (e) {
        console.error("Error al recuperar mensajes:", e);
        // Limpiar si hay error
        sessionStorage.removeItem("chat-messages");
      }
    }
  }, []);

  // Validar límite de conversación y enviar
  const handleCustomSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setConversationError("");
    setError(null);
    
    console.log("🚀 [handleSubmit] Iniciando envío");
    
    // Sanitizar input
    const sanitized = sanitizeInput(input);
    
    // 1. Validar input
    const validation = validateInput(sanitized);
    if (!validation.valid) {
      setConversationError(validation.error || "Input inválido");
      return;
    }
    
    // 2. Verificar rate limiting
    const { checkRateLimit } = await import("@/app/utils/validation");
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      setConversationError(rateCheck.error || "Demasiados mensajes");
      return;
    }
    
    // 3. Detectar mensajes duplicados
    const { isDuplicateMessage } = await import("@/app/utils/validation");
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMessage && isDuplicateMessage(sanitized, lastUserMessage.content || lastUserMessage.parts?.[0]?.text)) {
      setConversationError("No puedes enviar el mismo mensaje dos veces seguidas");
      return;
    }
    
    // Validar límite de conversación
    const conversationValidation = validateConversation(messages.length);
    if (!conversationValidation.valid) {
      setConversationError(conversationValidation.error || "Error en la conversación");
      return;
    }
    
    // Agregar mensaje del usuario inmediatamente
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: sanitized }]
    };
    
    // Crear array con TODOS los mensajes incluyendo el nuevo
    const allMessages = [...messages, userMessage];
    
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);
    
    console.log("📝 Mensaje del usuario agregado. Total mensajes:", allMessages.length);
    
    // Convertir todos los mensajes al formato correcto para la API
    const apiMessages = allMessages.map((m: any) => {
      let content = "";
      
      // Extraer el contenido según el formato
      if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
        content = m.parts[0].text || "";
      } else if (m.content) {
        content = typeof m.content === 'string' ? m.content : "";
      }
      
      return {
        role: m.role,
        content: content.trim()
      };
    }).filter(m => m.content.length > 0); // Solo enviar mensajes con contenido
    
    console.log("📤 Enviando a la API:", apiMessages.length, "mensajes:", apiMessages);
    console.log("📋 JSON completo enviado:", JSON.stringify({ messages: apiMessages }, null, 2));
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages
        })
      });

      console.log("📡 Respuesta recibida:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      console.log("✅ Iniciando lectura del stream");

      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;
      
      // Crear mensaje del asistente vacío
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        parts: [{ type: "text", text: "" }]
      };
      
      // Agregar el mensaje del asistente a allMessages y al estado
      const messagesWithAssistant = [...allMessages, assistantMessage];
      setMessages(messagesWithAssistant);
      
      // Leer el stream usando la API estándar de ReadableStream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No se pudo leer la respuesta");
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log("✅ Stream completado. Contenido final:", assistantContent);
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          console.log("📦 Chunk recibido:", chunk.substring(0, 100));
          
          // Parsear formato SSE (Server-Sent Events) de OpenAI
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remover "data: "
              
              if (data === '[DONE]') {
                console.log("🏁 Stream marcado como DONE");
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  assistantContent += content;
                  console.log("📥 Contenido acumulado:", assistantContent.substring(0, 100));
                  
                  // Actualizar el mensaje del asistente en tiempo real
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.parts) {
                      lastMsg.parts[0].text = assistantContent;
                    }
                    return updated;
                  });
                }
              } catch (parseError) {
                // Ignorar líneas que no son JSON válido
                console.log("⚠️ No se pudo parsear línea:", data.substring(0, 50));
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error("💥 Error:", error);
      setError(error.message || "Error al comunicarse con la IA");
      setConversationError(error.message || "Error al comunicarse con la IA");
    } finally {
      setIsLoading(false);
      console.log("🏁 Proceso completado");
    }
  };

  // Limpiar conversación
  const clearConversation = () => {
    if (confirm("¿Estás seguro de que quieres borrar toda la conversación?")) {
      setMessages([]);
      sessionStorage.removeItem("chat-messages");
      setConversationError("");
      setError(null);
      setInput("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-screen flex flex-col bg-white shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Chatbot OpenRouter</h1>
            <p className="text-blue-100 text-sm">Powered by AI SDK & Next.js</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            title="Limpiar conversación"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Limpiar</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">No hay mensajes aún</p>
            <p className="text-sm">Empieza una conversación escribiendo un mensaje</p>
          </div>
        )}
        
        {messages.map((message: any) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        
        {isLoading && <TypingIndicator />}
        
        {error && (
          <ErrorMessage 
            message={error || "Ocurrió un error al procesar tu mensaje"} 
          />
        )}
        
        {conversationError && (
          <ErrorMessage 
            message={conversationError}
            onDismiss={() => setConversationError("")}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-6">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleCustomSubmit}
          onStop={() => setIsLoading(false)}
        />
        
        <div className="mt-3 text-xs text-gray-500 text-center">
          <span className="flex items-center justify-center gap-2">
            🔒 Tus conversaciones son seguras y privadas
          </span>
        </div>
      </div>
    </div>
  );
}
