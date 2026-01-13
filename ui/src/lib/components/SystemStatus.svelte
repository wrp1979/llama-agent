<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Cpu, HardDrive, Gauge, Thermometer, Database, Layers } from 'lucide-svelte';

  interface SystemStatus {
    timestamp: number;
    gpu: {
      name: string;
      memory_total_mb: number;
      memory_used_mb: number;
      memory_free_mb: number;
      utilization_percent: number;
      temperature_c: number;
    } | null;
    memory: {
      total_mb: number;
      free_mb: number;
      available_mb: number;
      used_mb: number;
    };
    disk: {
      total_gb: number;
      used_gb: number;
      available_gb: number;
      mount_point: string;
    };
    models: Array<{
      name: string;
      size_gb: number;
      modified: number;
    }>;
    active_model: string | null;
  }

  let {
    onSelectModel = (model: string) => {},
  }: {
    onSelectModel?: (model: string) => void;
  } = $props();

  let status = $state<SystemStatus | null>(null);
  let hasLoaded = $state(false);  // Track if we've loaded at least once
  let error = $state<string | null>(null);
  let interval: ReturnType<typeof setInterval>;

  async function fetchStatus() {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        // Update status in place without triggering full re-render
        if (status && data.status) {
          // Update existing object properties
          Object.assign(status, data.status);
        } else {
          status = data.status;
        }
        error = null;
      } else if (!hasLoaded) {
        error = 'Failed to fetch status';
      }
    } catch (e) {
      if (!hasLoaded) {
        error = 'Connection error';
      }
    } finally {
      hasLoaded = true;
    }
  }

  function formatSize(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  function formatDiskSize(gb: number): string {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(2)} TB`;
    }
    return `${gb.toFixed(1)} GB`;
  }

  function getUsageColor(percent: number): string {
    if (percent >= 90) return 'text-red-400';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-green-400';
  }

  function getTempColor(temp: number): string {
    if (temp >= 80) return 'text-red-400';
    if (temp >= 60) return 'text-yellow-400';
    return 'text-green-400';
  }

  onMount(() => {
    fetchStatus();
    interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  // Derived values
  let gpuMemoryPercent = $derived(
    status?.gpu ? Math.round((status.gpu.memory_used_mb / status.gpu.memory_total_mb) * 100) : 0
  );
  let ramPercent = $derived(
    status?.memory ? Math.round((status.memory.used_mb / status.memory.total_mb) * 100) : 0
  );
  let diskPercent = $derived(
    status?.disk ? Math.round((status.disk.used_gb / status.disk.total_gb) * 100) : 0
  );
</script>

<div class="space-y-4">
  {#if !hasLoaded}
    <div class="animate-pulse space-y-4">
      <div class="h-20 bg-gray-800 rounded-lg"></div>
      <div class="h-20 bg-gray-800 rounded-lg"></div>
    </div>
  {:else if error && !status}
    <div class="text-center text-gray-500 py-8">
      <p>{error}</p>
      <button onclick={fetchStatus} class="mt-2 text-primary-400 hover:text-primary-300">
        Retry
      </button>
    </div>
  {:else if status}
    <!-- GPU Section -->
    {#if status.gpu}
      <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div class="flex items-center gap-2 mb-3">
          <Cpu class="h-5 w-5 text-green-400" />
          <h3 class="font-semibold text-gray-200">{status.gpu.name}</h3>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- VRAM -->
          <div>
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>VRAM</span>
              <span class={getUsageColor(gpuMemoryPercent)}>
                {formatSize(status.gpu.memory_used_mb)} / {formatSize(status.gpu.memory_total_mb)}
              </span>
            </div>
            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                style="width: {gpuMemoryPercent}%"
              ></div>
            </div>
          </div>

          <!-- GPU Utilization -->
          <div>
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>GPU Load</span>
              <span class={getUsageColor(status.gpu.utilization_percent)}>
                {status.gpu.utilization_percent}%
              </span>
            </div>
            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
                style="width: {status.gpu.utilization_percent}%"
              ></div>
            </div>
          </div>
        </div>

        <!-- Temperature -->
        <div class="flex items-center gap-2 mt-3 text-sm">
          <Thermometer class="h-4 w-4 {getTempColor(status.gpu.temperature_c)}" />
          <span class="{getTempColor(status.gpu.temperature_c)}">{status.gpu.temperature_c}°C</span>
        </div>
      </div>
    {/if}

    <!-- System Memory -->
    <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div class="flex items-center gap-2 mb-3">
        <Gauge class="h-5 w-5 text-blue-400" />
        <h3 class="font-semibold text-gray-200">System Memory</h3>
      </div>

      <div class="flex justify-between text-xs text-gray-400 mb-1">
        <span>RAM</span>
        <span class={getUsageColor(ramPercent)}>
          {formatSize(status.memory.used_mb)} / {formatSize(status.memory.total_mb)}
        </span>
      </div>
      <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
          style="width: {ramPercent}%"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {formatSize(status.memory.available_mb)} available
      </p>
    </div>

    <!-- Storage -->
    <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div class="flex items-center gap-2 mb-3">
        <HardDrive class="h-5 w-5 text-orange-400" />
        <h3 class="font-semibold text-gray-200">Storage</h3>
      </div>

      <div class="flex justify-between text-xs text-gray-400 mb-1">
        <span>Models Directory</span>
        <span class={getUsageColor(diskPercent)}>
          {formatDiskSize(status.disk.used_gb)} / {formatDiskSize(status.disk.total_gb)}
        </span>
      </div>
      <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
          style="width: {diskPercent}%"
        ></div>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        {formatDiskSize(status.disk.available_gb)} available
      </p>
    </div>

    <!-- Models -->
    <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div class="flex items-center gap-2 mb-3">
        <Layers class="h-5 w-5 text-pink-400" />
        <h3 class="font-semibold text-gray-200">Models</h3>
      </div>

      {#if status.models.length === 0}
        <p class="text-sm text-gray-500">No models found</p>
      {:else}
        <div class="space-y-2">
          {#each status.models as model}
            <div
              class="flex items-center justify-between p-2 rounded-lg transition-colors {model.name === status.active_model ? 'bg-primary-900/30 border border-primary-700/50' : 'hover:bg-gray-700/50'}"
            >
              <div class="flex items-center gap-2 min-w-0">
                <Database class="h-4 w-4 flex-shrink-0 {model.name === status.active_model ? 'text-primary-400' : 'text-gray-500'}" />
                <div class="min-w-0">
                  <p class="text-sm truncate {model.name === status.active_model ? 'text-primary-300 font-medium' : 'text-gray-300'}">
                    {model.name.replace('.gguf', '')}
                  </p>
                  <p class="text-xs text-gray-500">{model.size_gb.toFixed(1)} GB</p>
                </div>
              </div>
              {#if model.name === status.active_model}
                <span class="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Active</span>
              {:else}
                <button
                  onclick={() => onSelectModel(model.name)}
                  class="text-xs text-gray-400 hover:text-primary-400 px-2 py-1 rounded hover:bg-gray-700"
                >
                  Load
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
