<script lang="ts">
  import { Send, Loader2 } from 'lucide-svelte';

  let {
    onSend,
    disabled = false,
  }: {
    onSend: (message: string) => void;
    disabled?: boolean;
  } = $props();

  let input = $state('');
  let textarea: HTMLTextAreaElement;

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
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }
</script>

<div class="border-t border-gray-800 bg-gray-900/50 p-4">
  <div class="flex gap-3 max-w-4xl mx-auto">
    <div class="flex-1 relative">
      <textarea
        bind:this={textarea}
        bind:value={input}
        onkeydown={handleKeydown}
        oninput={handleInput}
        placeholder="Send a message... (Shift+Enter for new line)"
        rows="1"
        class="input resize-none pr-12 min-h-[44px] max-h-[200px]"
        {disabled}
      ></textarea>
    </div>

    <button
      onclick={handleSubmit}
      disabled={disabled || !input.trim()}
      class="btn btn-primary h-11 w-11 p-0 flex-shrink-0"
    >
      {#if disabled}
        <Loader2 class="h-5 w-5 animate-spin" />
      {:else}
        <Send class="h-5 w-5" />
      {/if}
    </button>
  </div>
</div>
