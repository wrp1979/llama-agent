export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolSuccess?: boolean;
  isStreaming?: boolean;
}

export interface Session {
  session_id: string;
  created_at?: string;
  message_count?: number;
}

export interface ToolCall {
  name: string;
  args: string;
}

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface PermissionRequest {
  request_id: string;
  tool: string;
  details: string;
  dangerous: boolean;
}

export interface AgentStats {
  input_tokens: number;
  output_tokens: number;
  duration_ms?: number;
}
