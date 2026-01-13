<script lang="ts">
  import { AlertTriangle, Shield, Check, X } from 'lucide-svelte';
  import type { PermissionRequest } from '$lib/types';
  import { respondToPermission } from '$lib/api';

  let {
    permission,
    onResolved
  }: {
    permission: PermissionRequest;
    onResolved: () => void;
  } = $props();

  let isLoading = $state(false);

  async function handleResponse(allow: boolean, scope: 'once' | 'session' | 'always') {
    isLoading = true;
    try {
      await respondToPermission(permission.request_id, allow, scope);
      onResolved();
    } catch (error) {
      console.error('Failed to respond to permission:', error);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
  <div class="card max-w-lg w-full mx-4 space-y-4">
    <div class="flex items-start gap-3">
      {#if permission.dangerous}
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50">
          <AlertTriangle class="h-5 w-5 text-red-400" />
        </div>
      {:else}
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-900/50">
          <Shield class="h-5 w-5 text-yellow-400" />
        </div>
      {/if}

      <div class="flex-1">
        <h3 class="font-semibold text-gray-100">
          Permission Required
        </h3>
        <p class="text-sm text-gray-400 mt-1">
          The agent wants to use <code class="rounded bg-gray-800 px-1.5 py-0.5 text-primary-300">{permission.tool}</code>
        </p>
      </div>
    </div>

    <div class="rounded-lg bg-gray-900 p-3 border border-gray-800">
      <pre class="whitespace-pre-wrap text-sm text-gray-300 font-mono">{permission.details}</pre>
    </div>

    {#if permission.dangerous}
      <div class="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 border border-red-800/50">
        <AlertTriangle class="h-4 w-4 text-red-400 flex-shrink-0" />
        <span class="text-sm text-red-300">This action is potentially dangerous</span>
      </div>
    {/if}

    <div class="flex flex-wrap gap-2 pt-2">
      <button
        class="btn btn-secondary flex items-center gap-2"
        onclick={() => handleResponse(false, 'once')}
        disabled={isLoading}
      >
        <X class="h-4 w-4" />
        Deny
      </button>

      <button
        class="btn btn-primary flex items-center gap-2"
        onclick={() => handleResponse(true, 'once')}
        disabled={isLoading}
      >
        <Check class="h-4 w-4" />
        Allow Once
      </button>

      <button
        class="btn btn-ghost flex items-center gap-2"
        onclick={() => handleResponse(true, 'session')}
        disabled={isLoading}
      >
        Allow for Session
      </button>
    </div>
  </div>
</div>
