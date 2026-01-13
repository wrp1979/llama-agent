<script lang="ts">
  import { X, Server, Key, Globe, Trash2, Loader2, Check, AlertCircle } from 'lucide-svelte';
  import type { AgentServer } from '$lib/types';
  import { checkServerHealth } from '$lib/api';

  let {
    server,
    isNew = false,
    onSave,
    onDelete,
    onClose,
  }: {
    server: AgentServer | null;
    isNew?: boolean;
    onSave: (server: Omit<AgentServer, 'id' | 'status'>) => void;
    onDelete?: (id: string) => void;
    onClose: () => void;
  } = $props();

  // Form state - initialized via $derived.by to capture prop values at creation time
  let name = $state('');
  let url = $state('http://');
  let apiKey = $state('');

  // Initialize form with server values when component mounts
  $effect(() => {
    if (server) {
      name = server.name || '';
      url = server.url || 'http://';
      apiKey = server.apiKey || '';
    }
  });
  let isTesting = $state(false);
  let testResult = $state<'success' | 'error' | null>(null);
  let testError = $state('');

  async function handleTest() {
    if (!url) return;

    isTesting = true;
    testResult = null;
    testError = '';

    try {
      const isHealthy = await checkServerHealth({
        id: 'test',
        name: 'test',
        url,
        apiKey,
        status: 'disconnected',
      });

      testResult = isHealthy ? 'success' : 'error';
      if (!isHealthy) {
        testError = 'Server not responding or invalid API key';
      }
    } catch (error) {
      testResult = 'error';
      testError = error instanceof Error ? error.message : 'Connection failed';
    } finally {
      isTesting = false;
    }
  }

  function handleSave() {
    if (!name.trim() || !url.trim()) return;

    onSave({
      name: name.trim(),
      url: url.trim().replace(/\/$/, ''), // Remove trailing slash
      apiKey: apiKey.trim(),
      isLocal: server?.isLocal,
      autoConnect: server?.autoConnect,
    });
    onClose();
  }

  function handleDelete() {
    if (server && onDelete && !server.isLocal) {
      onDelete(server.id);
      onClose();
    }
  }
</script>

<div class="modal-backdrop">
  <div class="modal-content max-w-md p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Server class="h-5 w-5 text-primary-400" />
        <h3 class="font-semibold text-gray-100">
          {isNew ? 'Add Server' : 'Edit Server'}
        </h3>
      </div>
      <button onclick={onClose} class="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
        <X class="h-5 w-5 text-gray-400" />
      </button>
    </div>

    <div class="space-y-4">
      <!-- Name -->
      <div class="space-y-1.5">
        <label for="server-name" class="text-sm text-gray-400">Name</label>
        <div class="relative">
          <Server class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            id="server-name"
            type="text"
            bind:value={name}
            placeholder="My Server"
            class="input pl-10"
            disabled={server?.isLocal}
          />
        </div>
      </div>

      <!-- URL -->
      <div class="space-y-1.5">
        <label for="server-url" class="text-sm text-gray-400">URL</label>
        <div class="relative">
          <Globe class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            id="server-url"
            type="url"
            bind:value={url}
            placeholder="http://localhost:8081"
            class="input pl-10"
            disabled={server?.isLocal}
          />
        </div>
      </div>

      <!-- API Key -->
      <div class="space-y-1.5">
        <label for="server-apikey" class="text-sm text-gray-400">API Key</label>
        <div class="relative">
          <Key class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            id="server-apikey"
            type="password"
            bind:value={apiKey}
            placeholder="sk-..."
            class="input pl-10 font-mono"
          />
        </div>
        <p class="text-xs text-gray-500">
          Leave empty if server doesn't require authentication
        </p>
      </div>

      <!-- Test Connection -->
      <div class="flex items-center gap-2">
        <button
          onclick={handleTest}
          disabled={isTesting || !url}
          class="btn btn-secondary gap-2"
        >
          {#if isTesting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Testing...
          {:else}
            Test Connection
          {/if}
        </button>

        {#if testResult === 'success'}
          <div class="flex items-center gap-1.5 text-green-400">
            <Check class="h-4 w-4" />
            <span class="text-sm">Connected</span>
          </div>
        {:else if testResult === 'error'}
          <div class="flex items-center gap-1.5 text-red-400">
            <AlertCircle class="h-4 w-4" />
            <span class="text-sm">{testError || 'Failed'}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between pt-4 border-t border-white/5">
      <div>
        {#if !isNew && !server?.isLocal && onDelete}
          <button
            onclick={handleDelete}
            class="btn btn-danger gap-2"
          >
            <Trash2 class="h-4 w-4" />
            Remove
          </button>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button onclick={onClose} class="btn btn-secondary">
          Cancel
        </button>
        <button
          onclick={handleSave}
          disabled={!name.trim() || !url.trim()}
          class="btn btn-primary"
        >
          {isNew ? 'Add Server' : 'Save'}
        </button>
      </div>
    </div>

    {#if server?.isLocal}
      <p class="text-xs text-gray-500 text-center">
        Local server settings are managed by the container
      </p>
    {/if}
  </div>
</div>
