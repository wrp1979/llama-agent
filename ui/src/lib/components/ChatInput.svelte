<script lang="ts">
  import { Send, Loader2 } from 'lucide-svelte';

  let {
    onSend,
    disabled = false,
    contextTokens = 0,
    maxContextTokens = 0,
  }: {
    onSend: (message: string) => void;
    disabled?: boolean;
    contextTokens?: number;
    maxContextTokens?: number;
  } = $props();

  let input = $state('');
  let textarea: HTMLTextAreaElement;

  // Estimate tokens (~4 chars per token for English text)
  let estimatedTokens = $derived(Math.ceil(input.length / 4));

  // Total tokens (context + new message)
  let totalTokens = $derived(contextTokens + estimatedTokens);

  // Format token count for display
  function formatTokens(n: number): string {
    if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'k';
    }
    return n.toString();
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      input = '';
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 320) + 'px';
    }
  }
</script>

<div class="border-t border-white/[0.06] bg-black/30 backdrop-blur-sm p-4">
  <div class="max-w-4xl mx-auto">
    <!-- Token counter bar -->
    <div class="flex items-center justify-between mb-2 px-1">
      <div class="flex items-center gap-3 text-xs text-gray-500">
        {#if input.length > 0}
          <span class="font-mono">
            <span class="text-gray-400">~{formatTokens(estimatedTokens)}</span> tokens
          </span>
        {/if}
        {#if contextTokens > 0}
          <span class="font-mono">
            Context: <span class="text-gray-400">{formatTokens(contextTokens)}</span>
            {#if maxContextTokens > 0}
              <span class="text-gray-600">/ {formatTokens(maxContextTokens)}</span>
            {/if}
          </span>
        {/if}
      </div>
      <span class="text-[10px] text-gray-600">Shift+Enter for new line</span>
    </div>

    <!-- Input area -->
    <div class="flex gap-3 items-end">
      <div class="flex-1 relative">
        <textarea
          bind:this={textarea}
          bind:value={input}
          onkeydown={handleKeydown}
          oninput={handleInput}
          placeholder="Type your message..."
          rows="2"
          class="input resize-none pr-4 min-h-[72px] max-h-[320px] py-3 leading-relaxed"
          {disabled}
        ></textarea>
      </div>

      <button
        onclick={handleSubmit}
        disabled={disabled || !input.trim()}
        class="btn btn-primary h-12 w-12 p-0 flex-shrink-0 mb-0.5"
      >
        {#if disabled}
          <Loader2 class="h-5 w-5 animate-spin" />
        {:else}
          <Send class="h-5 w-5" />
        {/if}
      </button>
    </div>
  </div>
</div>
