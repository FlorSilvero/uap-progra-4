"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { validateInput, sanitizeInput } from "../utils/validation";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop?: () => void;
}

export function ChatInput({ 
  input, 
  isLoading, 
  onInputChange, 
  onSubmit,
  onStop 
}: ChatInputProps) {
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    // Sanitizar input
    const sanitized = sanitizeInput(input);
    
    // Validar input
    const validation = validateInput(sanitized);
    if (!validation.valid) {
      setError(validation.error || "Input inválido");
      return;
    }
    
    // Si la validación pasa, actualizar el input sanitizado y enviar
    if (sanitized !== input) {
      onInputChange(sanitized);
    }
    
    onSubmit(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enviar con Enter, nueva línea con Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        handleSubmit(new Event("submit") as any);
      }
    }
  };

  const characterCount = input?.length || 0;
  const maxCharacters = 4000;
  const isNearLimit = characterCount > maxCharacters * 0.9;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && (
        <div className="text-red-600 text-sm px-2">{error}</div>
      )}
      
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => {
            onInputChange(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
          disabled={isLoading}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
        />
        
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Enviar mensaje"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <div className="flex justify-between items-center px-2 text-xs text-gray-500">
        <span>Enter para enviar • Shift+Enter para nueva línea</span>
        <span className={isNearLimit ? "text-red-600 font-medium" : ""}>
          {characterCount}/{maxCharacters}
        </span>
      </div>
    </form>
  );
}
