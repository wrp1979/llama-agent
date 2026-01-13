<script lang="ts">
  import { Terminal, User, Bot, CheckCircle, XCircle, Loader2 } from 'lucide-svelte';
  import type { Message } from '$lib/types';

  let { message }: { message: Message } = $props();

  const roleStyles = {
    user: 'bg-primary-900/30 border-primary-800',
    assistant: 'bg-gray-900/50 border-gray-800',
    tool: 'bg-gray-900/30 border-gray-700',
    system: 'bg-yellow-900/20 border-yellow-800',
  };

  const roleIcons = {
    user: User,
    assistant: Bot,
    tool: Terminal,
    system: Bot,
  };
</script>

<div class="group flex gap-3 px-4 py-3 {roleStyles[message.role]} rounded-lg border">
  <div class="flex-shrink-0 mt-1">
    {#if message.role === 'user'}
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600">
        <User class="h-4 w-4 text-white" />
      </div>
    {:else if message.role === 'tool'}
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700">
        <Terminal class="h-4 w-4 text-gray-300" />
      </div>
    {:else}
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
        <Bot class="h-4 w-4 text-white" />
      </div>
    {/if}
  </div>

  <div class="flex-1 min-w-0 space-y-1">
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-400">
        {message.role === 'user' ? 'You' : message.role === 'tool' ? message.toolName || 'Tool' : 'Agent'}
      </span>
      {#if message.role === 'tool'}
        {#if message.toolSuccess === true}
          <CheckCircle class="h-3 w-3 text-green-500" />
        {:else if message.toolSuccess === false}
          <XCircle class="h-3 w-3 text-red-500" />
        {/if}
      {/if}
      {#if message.isStreaming}
        <Loader2 class="h-3 w-3 animate-spin text-primary-400" />
      {/if}
    </div>

    <div class="prose prose-sm max-w-none">
      {#if message.role === 'tool'}
        <pre class="whitespace-pre-wrap text-xs text-gray-400">{message.content}</pre>
      {:else}
        <div class="whitespace-pre-wrap text-gray-200">{message.content}</div>
      {/if}
    </div>
  </div>
</div>
