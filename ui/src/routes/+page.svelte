<script lang="ts">
  import { onMount } from 'svelte';
  import { Bot, Plus, Settings, Trash2, Terminal, Zap } from 'lucide-svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import PermissionDialog from '$lib/components/PermissionDialog.svelte';
  import { createSession, sendMessage, listSessions, deleteSession } from '$lib/api';
  import type { Message, Session, PermissionRequest, AgentStats } from '$lib/types';

  // State
  let sessions = $state<Session[]>([]);
  let currentSessionId = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let isLoading = $state(false);
  let isConnected = $state(false);
  let pendingPermission = $state<PermissionRequest | null>(null);
  let yoloMode = $state(true);
  let stats = $state<AgentStats | null>(null);
  let cancelStream: (() => void) | null = null;
  let messagesContainer: HTMLDivElement;

  // Auto-scroll to bottom
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Create new session
  async function handleNewSession() {
    try {
      isLoading = true;
      const session = await createSession({ yolo: yoloMode });
      sessions = [session, ...sessions];
      currentSessionId = session.session_id;
      messages = [];
      stats = null;
    } catch (error) {
      console.error('Failed to create session:', error);
      addSystemMessage(`Error: ${error instanceof Error ? error.message : 'Failed to create session'}`);
    } finally {
      isLoading = false;
    }
  }

  // Delete session
  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteSession(sessionId);
      sessions = sessions.filter((s) => s.session_id !== sessionId);
      if (currentSessionId === sessionId) {
        currentSessionId = sessions[0]?.session_id || null;
        messages = [];
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  // Add system message
  function addSystemMessage(content: string) {
    messages = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'system',
        content,
        timestamp: new Date(),
      },
    ];
    scrollToBottom();
  }

  // Send message
  async function handleSend(content: string) {
    if (!currentSessionId) {
      await handleNewSession();
    }

    if (!currentSessionId) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    messages = [...messages, userMessage];
    scrollToBottom();

    // Start streaming
    isLoading = true;
    let assistantMessage: Message | null = null;
    let currentToolMessage: Message | null = null;

    cancelStream = sendMessage(
      currentSessionId,
      content,
      (event, data) => {
        const eventData = data as Record<string, unknown>;

        switch (event) {
          case 'iteration_start':
            // New iteration
            break;

          case 'reasoning_delta':
          case 'text_delta':
            if (!assistantMessage) {
              assistantMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true,
              };
              messages = [...messages, assistantMessage];
            }
            assistantMessage.content += (eventData.content as string) || '';
            messages = [...messages.slice(0, -1), { ...assistantMessage }];
            scrollToBottom();
            break;

          case 'tool_start':
            // Finalize previous assistant message if any
            if (assistantMessage) {
              assistantMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...assistantMessage }];
              assistantMessage = null;
            }

            currentToolMessage = {
              id: crypto.randomUUID(),
              role: 'tool',
              content: `Running ${eventData.name}...\n${eventData.args || ''}`,
              toolName: eventData.name as string,
              timestamp: new Date(),
              isStreaming: true,
            };
            messages = [...messages, currentToolMessage];
            scrollToBottom();
            break;

          case 'tool_result':
            if (currentToolMessage) {
              currentToolMessage.content = (eventData.output as string) || '';
              currentToolMessage.toolSuccess = eventData.success as boolean;
              currentToolMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...currentToolMessage }];
              currentToolMessage = null;
            }
            scrollToBottom();
            break;

          case 'permission_required':
            pendingPermission = eventData as unknown as PermissionRequest;
            break;

          case 'permission_resolved':
            pendingPermission = null;
            break;

          case 'completed':
            if (assistantMessage) {
              assistantMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...assistantMessage }];
            }
            stats = (eventData.stats as AgentStats) || null;
            break;

          case 'error':
            addSystemMessage(`Error: ${eventData.message || 'Unknown error'}`);
            break;
        }
      },
      (error) => {
        addSystemMessage(`Connection error: ${error.message}`);
        isLoading = false;
      },
      () => {
        isLoading = false;
        cancelStream = null;
      }
    );
  }

  // Cancel current stream
  function handleCancel() {
    if (cancelStream) {
      cancelStream();
      cancelStream = null;
      isLoading = false;
    }
  }

  // Check health
  async function checkHealth() {
    try {
      const response = await fetch('/health');
      isConnected = response.ok;
    } catch {
      isConnected = false;
    }
  }

  // Initialize
  onMount(() => {
    checkHealth();
    const healthInterval = setInterval(checkHealth, 5000);

    // Load sessions
    listSessions()
      .then((s) => {
        sessions = s;
      })
      .catch(console.error);

    return () => {
      clearInterval(healthInterval);
      if (cancelStream) cancelStream();
    };
  });

  // Permission resolved handler
  function handlePermissionResolved() {
    pendingPermission = null;
  }
</script>

<div class="flex h-full">
  <!-- Sidebar -->
  <aside class="w-64 flex-shrink-0 border-r border-gray-800 bg-gray-900/30 flex flex-col">
    <div class="p-4 border-b border-gray-800">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
          <Bot class="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 class="font-semibold text-gray-100">llama-agent</h1>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 rounded-full {isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
            <span class="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="p-3">
      <button onclick={handleNewSession} disabled={isLoading} class="btn btn-primary w-full gap-2">
        <Plus class="h-4 w-4" />
        New Session
      </button>
    </div>

    <!-- Sessions list -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each sessions as session}
        <div
          role="button"
          tabindex="0"
          onclick={() => {
            currentSessionId = session.session_id;
            messages = [];
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              currentSessionId = session.session_id;
              messages = [];
            }
          }}
          class="group w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer {currentSessionId === session.session_id ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}"
        >
          <span class="truncate font-mono text-xs">{session.session_id}</span>
          <button
            onclick={(e) => {
              e.stopPropagation();
              handleDeleteSession(session.session_id);
            }}
            class="opacity-0 group-hover:opacity-100 hover:text-red-400"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      {/each}
    </div>

    <!-- Settings -->
    <div class="p-3 border-t border-gray-800 space-y-3">
      <label class="flex items-center justify-between cursor-pointer">
        <span class="text-sm text-gray-400 flex items-center gap-2">
          <Zap class="h-4 w-4" />
          YOLO Mode
        </span>
        <input
          type="checkbox"
          bind:checked={yoloMode}
          class="h-5 w-9 appearance-none rounded-full bg-gray-700 transition-colors checked:bg-primary-600 relative cursor-pointer after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform checked:after:translate-x-4"
        />
      </label>

      {#if stats}
        <div class="text-xs text-gray-500 space-y-1">
          <div class="flex justify-between">
            <span>Input tokens:</span>
            <span class="font-mono">{stats.input_tokens}</span>
          </div>
          <div class="flex justify-between">
            <span>Output tokens:</span>
            <span class="font-mono">{stats.output_tokens}</span>
          </div>
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main chat area -->
  <main class="flex-1 flex flex-col min-w-0">
    <!-- Messages -->
    <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-3">
      {#if messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 mb-4">
            <Terminal class="h-8 w-8 text-purple-400" />
          </div>
          <h2 class="text-xl font-semibold text-gray-200 mb-2">llama-agent</h2>
          <p class="text-gray-500 max-w-md">
            A coding agent that runs entirely inside llama.cpp. Ask me to explore code, run commands, edit files, and more.
          </p>
          <div class="mt-6 grid grid-cols-2 gap-3 text-sm">
            <button onclick={() => handleSend('List files in the current directory')} class="card hover:bg-gray-800/50 transition-colors text-left">
              <span class="text-gray-400">List files in the current directory</span>
            </button>
            <button onclick={() => handleSend('What tools do you have available?')} class="card hover:bg-gray-800/50 transition-colors text-left">
              <span class="text-gray-400">What tools do you have available?</span>
            </button>
            <button onclick={() => handleSend('Find all TODO comments in this project')} class="card hover:bg-gray-800/50 transition-colors text-left">
              <span class="text-gray-400">Find all TODO comments</span>
            </button>
            <button onclick={() => handleSend('Explain the project structure')} class="card hover:bg-gray-800/50 transition-colors text-left">
              <span class="text-gray-400">Explain the project structure</span>
            </button>
          </div>
        </div>
      {:else}
        {#each messages as message (message.id)}
          <ChatMessage {message} />
        {/each}
      {/if}
    </div>

    <!-- Input -->
    <ChatInput onSend={handleSend} disabled={isLoading} />
  </main>
</div>

<!-- Permission dialog -->
{#if pendingPermission}
  <PermissionDialog permission={pendingPermission} onResolved={handlePermissionResolved} />
{/if}
