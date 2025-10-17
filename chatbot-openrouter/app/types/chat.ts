export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

export interface ChatError {
  message: string;
  code?: string;
  details?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: ChatError | null;
}
