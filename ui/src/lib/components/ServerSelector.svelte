<script lang="ts">
  import { ChevronDown, Server, Plus, Settings, Wifi, WifiOff, Loader2 } from 'lucide-svelte';
  import type { AgentServer } from '$lib/types';
  import type { Component } from 'svelte';

  let {
    servers,
    activeServer,
    onSelect,
    onAddServer,
    onEditServer,
  }: {
    servers: AgentServer[];
    activeServer: AgentServer | null;
    onSelect: (id: string) => void;
    onAddServer: () => void;
    onEditServer: (server: AgentServer) => void;
  } = $props();

  let isOpen = $state(false);

  function getStatusIcon(status: AgentServer['status']): { icon: Component; class: string } {
    switch (status) {
      case 'connected':
        return { icon: Wifi, class: 'text-green-500' };
      case 'connecting':
        return { icon: Loader2, class: 'text-yellow-500 animate-spin' };
      case 'error':
        return { icon: WifiOff, class: 'text-red-500' };
      default:
        return { icon: WifiOff, class: 'text-gray-500' };
    }
  }

  function handleSelect(id: string) {
    onSelect(id);
    isOpen = false;
  }

  // Get icon component for active server
  let activeStatusIcon = $derived(activeServer ? getStatusIcon(activeServer.status) : null);
</script>

<div class="relative">
  <button
    onclick={() => (isOpen = !isOpen)}
    class="w-full flex items-center justify-between gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm transition-colors hover:bg-gray-700"
  >
    <div class="flex items-center gap-2 min-w-0">
      <Server class="h-4 w-4 flex-shrink-0 text-gray-400" />
      <span class="truncate">{activeServer?.name || 'Select Server'}</span>
    </div>
    <div class="flex items-center gap-1.5">
      {#if activeStatusIcon}
        {#if activeServer?.status === 'connected'}
          <Wifi class="h-3.5 w-3.5 text-green-500" />
        {:else if activeServer?.status === 'connecting'}
          <Loader2 class="h-3.5 w-3.5 text-yellow-500 animate-spin" />
        {:else}
          <WifiOff class="h-3.5 w-3.5 text-gray-500" />
        {/if}
      {/if}
      <ChevronDown class="h-4 w-4 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}" />
    </div>
  </button>

  {#if isOpen}
    <div
      class="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
    >
      <div class="max-h-64 overflow-y-auto p-1">
        {#each servers as server}
          <div
            role="button"
            tabindex="0"
            onclick={() => handleSelect(server.id)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(server.id); }}
            class="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-700 cursor-pointer {activeServer?.id === server.id ? 'bg-gray-700' : ''}"
          >
            <div class="flex items-center gap-2 min-w-0">
              {#if server.status === 'connected'}
                <Wifi class="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              {:else if server.status === 'connecting'}
                <Loader2 class="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 animate-spin" />
              {:else if server.status === 'error'}
                <WifiOff class="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              {:else}
                <WifiOff class="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
              {/if}
              <span class="truncate">{server.name}</span>
              {#if server.isLocal}
                <span class="rounded bg-primary-900/50 px-1.5 py-0.5 text-[10px] text-primary-300">
                  local
                </span>
              {/if}
            </div>
            <button
              onclick={(e) => {
                e.stopPropagation();
                onEditServer(server);
                isOpen = false;
              }}
              class="p-1 rounded hover:bg-gray-600"
            >
              <Settings class="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        {/each}
      </div>

      <div class="border-t border-gray-700 p-1">
        <button
          onclick={() => {
            onAddServer();
            isOpen = false;
          }}
          class="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary-400 transition-colors hover:bg-gray-700"
        >
          <Plus class="h-4 w-4" />
          Add Server
        </button>
      </div>
    </div>
  {/if}
</div>

{#if isOpen}
  <button
    class="fixed inset-0 z-40"
    onclick={() => (isOpen = false)}
    aria-label="Close menu"
  ></button>
{/if}
