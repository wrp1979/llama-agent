<script lang="ts">
  import { onMount } from 'svelte';
  import { Bot, Plus, Trash2, Terminal, Zap, LayoutDashboard, Store } from 'lucide-svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatInput from '$lib/components/ChatInput.svelte';
  import PermissionDialog from '$lib/components/PermissionDialog.svelte';
  import ServerSelector from '$lib/components/ServerSelector.svelte';
  import ServerDialog from '$lib/components/ServerDialog.svelte';
  import SystemStatus from '$lib/components/SystemStatus.svelte';
  import ModelMarketplace from '$lib/components/ModelMarketplace.svelte';
  import { serversStore } from '$lib/stores/servers.svelte';
  import { sessionsStore, type DbSession } from '$lib/stores/sessions.svelte';
  import {
    createSession as createRemoteSession,
    sendMessage,
    checkServerHealth,
  } from '$lib/api';
  import type { Message, PermissionRequest, AgentStats, AgentServer } from '$lib/types';

  // State
  let dbSessions = $state<DbSession[]>([]);
  let currentDbSession = $state<DbSession | null>(null);
  let messages = $state<Message[]>([]);
  let isLoading = $state(false);
  let pendingPermission = $state<PermissionRequest | null>(null);
  let yoloMode = $state(true);
  let stats = $state<AgentStats | null>(null);
  let cancelStream: (() => void) | null = null;
  let messagesContainer: HTMLDivElement;

  // Server dialog state
  let showServerDialog = $state(false);
  let editingServer = $state<AgentServer | null>(null);
  let isNewServer = $state(false);

  // Dashboard view state
  let showDashboard = $state(false);

  // Marketplace state
  let showMarketplace = $state(false);

  // Derived state
  let activeServer = $derived(serversStore.activeServer);

  // Auto-scroll to bottom
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Check health of active server
  async function checkActiveServerHealth() {
    if (!activeServer) return;

    serversStore.setStatus(activeServer.id, 'connecting');
    const isHealthy = await checkServerHealth(activeServer);
    serversStore.setStatus(activeServer.id, isHealthy ? 'connected' : 'disconnected');
  }

  // Load sessions from database for active server
  async function loadSessions() {
    if (!activeServer) {
      dbSessions = [];
      return;
    }

    try {
      dbSessions = await sessionsStore.listSessions(activeServer.id);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      dbSessions = [];
    }
  }

  // Load messages for current session from database
  async function loadMessages() {
    if (!currentDbSession) {
      messages = [];
      return;
    }

    try {
      messages = await sessionsStore.getMessages(currentDbSession.id);
    } catch (error) {
      console.error('Failed to load messages:', error);
      messages = [];
    }
  }

  // Create new session
  async function handleNewSession() {
    if (!activeServer || activeServer.status !== 'connected') return;

    try {
      isLoading = true;

      // Create session on remote server
      const remoteSession = await createRemoteSession(activeServer, { yolo: yoloMode });

      // Save session to database
      const dbSession = await sessionsStore.createSession(
        activeServer.id,
        remoteSession.session_id,
        yoloMode
      );

      if (dbSession) {
        dbSessions = [dbSession, ...dbSessions];
        currentDbSession = dbSession;
        messages = [];
        stats = null;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      addSystemMessage(`Error: ${error instanceof Error ? error.message : 'Failed to create session'}`);
    } finally {
      isLoading = false;
    }
  }

  // Delete session
  async function handleDeleteSession(session: DbSession) {
    if (!activeServer) return;

    try {
      // Delete from database (cascades to messages)
      await sessionsStore.deleteSession(session.id);

      dbSessions = dbSessions.filter((s) => s.id !== session.id);

      if (currentDbSession?.id === session.id) {
        currentDbSession = dbSessions[0] || null;
        if (currentDbSession) {
          await loadMessages();
        } else {
          messages = [];
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  // Select session
  async function handleSelectSession(session: DbSession) {
    showDashboard = false;
    currentDbSession = session;
    await loadMessages();
    scrollToBottom();
  }

  // Add system message
  function addSystemMessage(content: string) {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date(),
    };
    messages = [...messages, msg];

    // Save to database
    if (currentDbSession) {
      sessionsStore.saveMessage(currentDbSession.id, msg);
    }

    scrollToBottom();
  }

  // Send message
  async function handleSend(content: string) {
    if (!activeServer || activeServer.status !== 'connected') {
      addSystemMessage('Not connected to server');
      return;
    }

    if (!currentDbSession) {
      await handleNewSession();
    }

    if (!currentDbSession?.externalId) return;

    // Track if this is the first message (for title generation)
    const isFirstMessage = messages.length === 0;
    const sessionIdForTitle = currentDbSession.id;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    messages = [...messages, userMessage];
    scrollToBottom();

    // Save user message to database
    sessionsStore.saveMessage(currentDbSession.id, userMessage);

    // Generate title asynchronously for first message
    if (isFirstMessage) {
      sessionsStore.generateTitle(sessionIdForTitle, content).then((title) => {
        if (title) {
          // Update the session in our local list
          dbSessions = dbSessions.map((s) =>
            s.id === sessionIdForTitle ? { ...s, name: title } : s
          );
          // Update current session if it's the same
          if (currentDbSession?.id === sessionIdForTitle) {
            currentDbSession = { ...currentDbSession, name: title };
          }
        }
      });
    }

    // Start streaming
    isLoading = true;
    let assistantMessage: Message | null = null;
    let currentToolMessage: Message | null = null;

    cancelStream = sendMessage(
      activeServer,
      currentDbSession.externalId,
      content,
      (event, data) => {
        const eventData = data as Record<string, unknown>;

        switch (event) {
          case 'iteration_start':
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
            // Save assistant message if exists
            if (assistantMessage && currentDbSession) {
              assistantMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...assistantMessage }];
              sessionsStore.saveMessage(currentDbSession.id, assistantMessage);
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
            if (currentToolMessage && currentDbSession) {
              currentToolMessage.content = (eventData.output as string) || '';
              currentToolMessage.toolSuccess = eventData.success as boolean;
              currentToolMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...currentToolMessage }];
              // Save tool message to database
              sessionsStore.saveMessage(currentDbSession.id, currentToolMessage);
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
            if (assistantMessage && currentDbSession) {
              assistantMessage.isStreaming = false;
              messages = [...messages.slice(0, -1), { ...assistantMessage }];
              // Save final assistant message to database
              sessionsStore.saveMessage(currentDbSession.id, assistantMessage, {
                inputTokens: (eventData.stats as AgentStats)?.input_tokens,
                outputTokens: (eventData.stats as AgentStats)?.output_tokens,
              });
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

  // Server selection
  function handleServerSelect(id: string) {
    serversStore.setActive(id);
    dbSessions = [];
    currentDbSession = null;
    messages = [];
    stats = null;
  }

  // Server dialog handlers
  function handleAddServer() {
    editingServer = null;
    isNewServer = true;
    showServerDialog = true;
  }

  function handleEditServer(server: AgentServer) {
    editingServer = server;
    isNewServer = false;
    showServerDialog = true;
  }

  async function handleSaveServer(serverData: Omit<AgentServer, 'id' | 'status'>) {
    if (isNewServer) {
      const newServer = await serversStore.addServer(serverData);
      serversStore.setActive(newServer.id);
    } else if (editingServer) {
      await serversStore.updateServer(editingServer.id, serverData);
    }
  }

  function handleDeleteServer(id: string) {
    serversStore.removeServer(id);
  }

  // Permission resolved handler
  async function handlePermissionResolved() {
    pendingPermission = null;
  }

  // Initialize
  onMount(() => {
    // Init servers store
    serversStore.init().then(() => {
      // Start health check loop
      checkActiveServerHealth();
    });

    const healthInterval = setInterval(() => {
      checkActiveServerHealth();
    }, 5000);

    return () => {
      clearInterval(healthInterval);
      if (cancelStream) cancelStream();
    };
  });

  // Reload sessions when active server changes or connects
  $effect(() => {
    if (activeServer?.status === 'connected') {
      loadSessions();
    }
  });
</script>

<div class="flex h-full bg-pattern">
  <!-- Sidebar -->
  <aside class="w-64 flex-shrink-0 border-r border-white/[0.06] bg-black/40 backdrop-blur-sm flex flex-col">
    <div class="p-4 border-b border-white/[0.06]">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/20">
          <Bot class="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 class="font-semibold text-gray-100">llama-agent</h1>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 rounded-full {activeServer?.status === 'connected' ? 'bg-green-500' : activeServer?.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}"></div>
            <span class="text-xs text-gray-500">
              {activeServer?.status === 'connected' ? 'Connected' : activeServer?.status === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Server Selector -->
    <div class="p-3 border-b border-white/[0.06]">
      <ServerSelector
        servers={serversStore.servers}
        {activeServer}
        onSelect={handleServerSelect}
        onAddServer={handleAddServer}
        onEditServer={handleEditServer}
      />
    </div>

    <div class="p-3 space-y-2">
      <button
        onclick={handleNewSession}
        disabled={isLoading || activeServer?.status !== 'connected'}
        class="btn btn-primary w-full gap-2"
      >
        <Plus class="h-4 w-4" />
        New Session
      </button>
      <button
        onclick={() => { showDashboard = true; currentDbSession = null; messages = []; }}
        disabled={activeServer?.status !== 'connected'}
        class="btn w-full gap-2 {showDashboard ? 'bg-white/10 text-white border border-white/10' : 'btn-secondary'}"
      >
        <LayoutDashboard class="h-4 w-4" />
        Dashboard
      </button>
      <button
        onclick={() => showMarketplace = true}
        class="btn btn-secondary w-full gap-2"
      >
        <Store class="h-4 w-4" />
        Get Models
      </button>
    </div>

    <!-- Sessions list -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each dbSessions as session}
        <div
          role="button"
          tabindex="0"
          onclick={() => handleSelectSession(session)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSelectSession(session);
            }
          }}
          class="group w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all cursor-pointer {currentDbSession?.id === session.id ? 'bg-white/10 text-gray-100 border border-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}"
        >
          <div class="truncate">
            {#if session.name && !session.name.startsWith('Session ')}
              <span class="text-sm">{session.name}</span>
              <span class="block text-[10px] text-gray-500 truncate font-mono">{session.externalId || session.id.slice(0, 16)}</span>
            {:else}
              <span class="font-mono text-xs">{session.externalId || session.id.slice(0, 16)}</span>
              <span class="block text-[10px] text-gray-500 truncate">
                {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}
              </span>
            {/if}
          </div>
          <button
            onclick={(e) => {
              e.stopPropagation();
              handleDeleteSession(session);
            }}
            class="opacity-0 group-hover:opacity-100 hover:text-red-400"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      {/each}
    </div>

    <!-- Settings -->
    <div class="p-3 border-t border-white/[0.06] space-y-3">
      <label class="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors -mx-2">
        <span class="text-sm text-gray-400 flex items-center gap-2">
          <Zap class="h-4 w-4" />
          YOLO Mode
        </span>
        <input
          type="checkbox"
          bind:checked={yoloMode}
          class="h-5 w-9 appearance-none rounded-full bg-white/10 transition-colors checked:bg-primary-600 relative cursor-pointer after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform checked:after:translate-x-4"
        />
      </label>

      {#if stats}
        <div class="text-xs text-gray-500 space-y-1 p-2 rounded-lg bg-white/[0.02]">
          <div class="flex justify-between">
            <span>Input tokens:</span>
            <span class="font-mono text-gray-400">{stats.input_tokens}</span>
          </div>
          <div class="flex justify-between">
            <span>Output tokens:</span>
            <span class="font-mono text-gray-400">{stats.output_tokens}</span>
          </div>
        </div>
      {/if}
    </div>
  </aside>

  <!-- Main chat area -->
  <main class="flex-1 flex flex-col min-w-0">
    <!-- Messages / Dashboard -->
    <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 space-y-3">
      {#if showDashboard || messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full">
          <div class="w-full max-w-lg">
            {#if activeServer?.status !== 'connected'}
              <div class="text-center mb-6">
                <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600/10 border border-primary-500/20 mb-4 mx-auto">
                  <Terminal class="h-8 w-8 text-primary-400" />
                </div>
                <h2 class="text-xl font-semibold text-gray-200 mb-2">llama-agent</h2>
                <p class="text-gray-500">Connect to a server to start chatting with the agent.</p>
              </div>
            {:else}
              <div class="text-center mb-6">
                <h2 class="text-xl font-semibold text-gray-200 mb-2">System Status</h2>
                <p class="text-gray-500 text-sm">Agent server resources and available models</p>
              </div>

              <SystemStatus onSelectModel={(model) => console.log('Load model:', model)} />

              <div class="mt-6">
                <p class="text-xs text-gray-500 text-center mb-3">Quick prompts</p>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <button onclick={() => { showDashboard = false; handleSend('List files in the current directory'); }} class="card hover:bg-white/[0.06] hover:border-white/10 transition-all text-left p-3">
                    <span class="text-gray-400">List files</span>
                  </button>
                  <button onclick={() => { showDashboard = false; handleSend('What tools do you have available?'); }} class="card hover:bg-white/[0.06] hover:border-white/10 transition-all text-left p-3">
                    <span class="text-gray-400">List tools</span>
                  </button>
                  <button onclick={() => { showDashboard = false; handleSend('Find all TODO comments in this project'); }} class="card hover:bg-white/[0.06] hover:border-white/10 transition-all text-left p-3">
                    <span class="text-gray-400">Find TODOs</span>
                  </button>
                  <button onclick={() => { showDashboard = false; handleSend('Explain the project structure'); }} class="card hover:bg-white/[0.06] hover:border-white/10 transition-all text-left p-3">
                    <span class="text-gray-400">Project structure</span>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        {#each messages as message (message.id)}
          <ChatMessage {message} />
        {/each}
      {/if}
    </div>

    <!-- Input -->
    <ChatInput onSend={handleSend} disabled={isLoading || activeServer?.status !== 'connected'} />
  </main>
</div>

<!-- Permission dialog -->
{#if pendingPermission && activeServer}
  <PermissionDialog
    permission={pendingPermission}
    onResolved={handlePermissionResolved}
  />
{/if}

<!-- Server dialog -->
{#if showServerDialog}
  <ServerDialog
    server={editingServer}
    isNew={isNewServer}
    onSave={handleSaveServer}
    onDelete={handleDeleteServer}
    onClose={() => (showServerDialog = false)}
  />
{/if}

<!-- Model Marketplace -->
{#if showMarketplace}
  <ModelMarketplace onClose={() => showMarketplace = false} />
{/if}
