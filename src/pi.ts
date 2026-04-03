// src/pi.ts — Pi RPC connection wrapper
//
// Encapsulates LLM interaction via Pi's RPC interface.
// Implementation references:
//   - ~/Projects/minora-ui/ (team lead module for Pi RPC integration)
//   - ~/Projects/oh-my-superpowers/bin/omp (--model/--mode engineering)
//   - Obsidian vault: pi-coding-agent research notes
//
// Phase 1: interface definitions + placeholder. Full implementation in Phase 2.

export interface PiClientOptions {
  model?: string;
  mode?: string;  // text | stream | json | interactive
}

export interface PiResponse {
  content: string;
  model: string;
}

export interface PiClient {
  options: PiClientOptions;
  sendMessage(message: string, skills?: string[]): Promise<PiResponse>;
  close(): void;
}

export function createPiClient(options: PiClientOptions = {}): PiClient {
  return {
    options,
    async sendMessage(_message: string, _skills?: string[]): Promise<PiResponse> {
      throw new Error(
        'Pi RPC not yet connected. Full implementation in Phase 2. ' +
        'Refer to ~/Projects/minora-ui/ for Pi RPC integration patterns.'
      );
    },
    close() {
      // no-op until connected
    },
  };
}
