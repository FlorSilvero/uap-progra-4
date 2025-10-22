"use client";

import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  message: {
    id: string;
    role: string;
    content?: string;
    parts?: Array<{ type: string; text: string }>;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  // Obtener el contenido del mensaje (soporta diferentes formatos)
  const content = message.content || message.parts?.[0]?.text || "";
  
  return (
    <div
      className={`flex gap-3 p-4 rounded-lg animate-fadeIn ${
        isUser 
          ? "bg-blue-50 ml-8" 
          : "bg-gray-50 mr-8"
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-blue-600" : "bg-gray-700"
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="font-medium text-sm text-gray-700">
          {isUser ? "Tú" : "Asistente"}
        </div>
        <div className="text-gray-900 whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  );
}
