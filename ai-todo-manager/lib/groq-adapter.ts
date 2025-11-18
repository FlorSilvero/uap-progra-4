// lib/groq-adapter.ts
// Custom Groq adapter with tool-calling support
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface GroqTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
}

export class GroqAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(apiKey: string, model = 'llama-3.3-70b-versatile', baseURL = 'https://api.groq.com/openai/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
  }

  async *streamChatCompletion(
    messages: GroqMessage[],
    tools?: GroqTool[],
    toolChoice: 'none' | 'auto' | 'required' = 'auto',
    temperature = 0.7,
    maxTokens = 2048
  ): AsyncGenerator<GroqStreamChunk, void, unknown> {
    const payload: any = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = toolChoice;
    }

    console.log('📤 Groq request:', {
      url: `${this.baseURL}/chat/completions`,
      model: this.model,
      messageCount: messages.length,
      toolCount: tools?.length || 0,
    });

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.slice(0, 500),
      });
      
      // Handle rate limit with retry suggestion
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          const waitTime = errorData.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
          const message = waitTime 
            ? `Rate limit alcanzado. Esperá ${Math.ceil(parseFloat(waitTime))} segundos y reintentá.`
            : 'Rate limit alcanzado. Esperá unos segundos y reintentá.';
          throw new Error(message);
        } catch (parseErr) {
          throw new Error('Rate limit alcanzado. Esperá unos segundos y reintentá.');
        }
      }
      
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data as GroqStreamChunk;
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}
