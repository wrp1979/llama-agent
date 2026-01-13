<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Search, Download, X, ArrowLeft, Loader2, Package, HardDrive,
    TrendingUp, Heart, Clock, ExternalLink, ChevronRight,
    CheckCircle, AlertTriangle, AlertCircle, XCircle, Cpu, Zap
  } from 'lucide-svelte';

  interface HFModel {
    id: string;
    author: string;
    name: string;
    downloads: number;
    likes: number;
    tags: string[];
    lastModified: string;
  }

  interface ModelCompatibility {
    status: 'excellent' | 'good' | 'warning' | 'poor';
    message: string;
    canRun: boolean;
    recommendedGpuLayers: number;
    estimatedTotalLayers: number;
    vramRequired: number;
    ramRequired: number;
    willFitInVram: boolean;
  }

  interface ModelFile {
    name: string;
    size: number;
    sizeFormatted: string;
    quantization: string;
    compatibility: ModelCompatibility;
  }

  interface ModelDetails {
    id: string;
    author: string;
    name: string;
    downloads: number;
    likes: number;
    tags: string[];
    description: string;
    lastModified: string;
    files: ModelFile[];
  }

  interface DownloadStatus {
    status: 'idle' | 'downloading' | 'completed' | 'error';
    repoId: string;
    filename: string;
    progress: number;
    speed: string;
    eta: string;
    message: string;
  }

  let {
    onClose = () => {},
  }: {
    onClose?: () => void;
  } = $props();

  // State
  let searchQuery = $state('');
  let models = $state<HFModel[]>([]);
  let selectedModel = $state<ModelDetails | null>(null);
  let isLoading = $state(false);
  let isLoadingDetails = $state(false);
  let downloadStatus = $state<DownloadStatus | null>(null);
  let downloadInterval: ReturnType<typeof setInterval> | null = null;
  let confirmDownload = $state<{ file: ModelFile; show: boolean } | null>(null);
  let error = $state<string | null>(null);

  // Popular authors for quick filters
  const popularAuthors = [
    { id: 'bartowski', name: 'bartowski' },
    { id: 'unsloth', name: 'unsloth' },
    { id: 'TheBloke', name: 'TheBloke' },
    { id: 'QuantFactory', name: 'QuantFactory' },
  ];

  async function searchModels(query: string = '', author: string = '') {
    isLoading = true;
    error = null;

    try {
      let url = '/api/models/search?limit=20';
      if (query) url += `&q=${encodeURIComponent(query)}`;
      if (author) url += `&author=${encodeURIComponent(author)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        models = data.models || [];
      } else {
        error = 'Failed to search models';
      }
    } catch (e) {
      error = 'Connection error';
    } finally {
      isLoading = false;
    }
  }

  async function loadModelDetails(modelId: string) {
    isLoadingDetails = true;
    error = null;

    try {
      const response = await fetch(`/api/models/${encodeURIComponent(modelId)}`);
      if (response.ok) {
        const data = await response.json();
        selectedModel = data.model;
      } else {
        error = 'Failed to load model details';
      }
    } catch (e) {
      error = 'Connection error';
    } finally {
      isLoadingDetails = false;
    }
  }

  function handleDownloadClick(file: ModelFile) {
    // If compatibility is warning or poor, show confirmation dialog
    if (file.compatibility.status === 'warning' || file.compatibility.status === 'poor') {
      confirmDownload = { file, show: true };
    } else {
      startDownload(selectedModel!.id, file.name);
    }
  }

  function confirmAndDownload() {
    if (confirmDownload && selectedModel) {
      startDownload(selectedModel.id, confirmDownload.file.name);
      confirmDownload = null;
    }
  }

  function getCompatibilityColor(status: ModelCompatibility['status']): string {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  function getCompatibilityBg(status: ModelCompatibility['status']): string {
    switch (status) {
      case 'excellent': return 'bg-green-500/10 border-green-500/30';
      case 'good': return 'bg-blue-500/10 border-blue-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'poor': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  }

  async function startDownload(repoId: string, filename: string) {
    try {
      const response = await fetch('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId, filename }),
      });

      if (response.ok) {
        // Start polling for download status
        startDownloadPolling();
      } else {
        error = 'Failed to start download';
      }
    } catch (e) {
      error = 'Connection error';
    }
  }

  async function cancelDownload() {
    try {
      await fetch('/api/models/download', { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to cancel download:', e);
    }
  }

  async function fetchDownloadStatus() {
    try {
      const response = await fetch('/api/models/download');
      if (response.ok) {
        const data = await response.json();
        downloadStatus = data.status;

        // Stop polling if download completed or errored
        if (downloadStatus?.status === 'completed' || downloadStatus?.status === 'error') {
          stopDownloadPolling();
        }
      }
    } catch (e) {
      console.error('Failed to fetch download status:', e);
    }
  }

  function startDownloadPolling() {
    fetchDownloadStatus();
    downloadInterval = setInterval(fetchDownloadStatus, 1000);
  }

  function stopDownloadPolling() {
    if (downloadInterval) {
      clearInterval(downloadInterval);
      downloadInterval = null;
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  function handleSearch() {
    searchModels(searchQuery);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  onMount(() => {
    // Load popular models on mount
    searchModels();
    // Check for ongoing download
    fetchDownloadStatus();
  });

  onDestroy(() => {
    stopDownloadPolling();
  });
</script>

<div class="modal-backdrop">
  <div class="w-full max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-white/5">
      {#if selectedModel}
        <button
          onclick={() => selectedModel = null}
          class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft class="h-5 w-5" />
          <span>Back to search</span>
        </button>
      {:else}
        <div class="flex items-center gap-3">
          <Package class="h-6 w-6 text-primary-400" />
          <h2 class="text-lg font-semibold text-white">Model Marketplace</h2>
        </div>
      {/if}
      <button onclick={onClose} class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- Download Progress Banner -->
    {#if downloadStatus && downloadStatus.status === 'downloading'}
      <div class="px-4 py-3 bg-primary-900/30 border-b border-primary-700/50">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Loader2 class="h-4 w-4 text-primary-400 animate-spin" />
            <span class="text-sm text-primary-300">Downloading {downloadStatus.filename}</span>
          </div>
          <button onclick={cancelDownload} class="text-xs text-red-400 hover:text-red-300">
            Cancel
          </button>
        </div>
        <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-300"
            style="width: {downloadStatus.progress}%"
          ></div>
        </div>
        <div class="flex justify-between mt-1 text-xs text-gray-400">
          <span>{downloadStatus.message}</span>
          <span>{downloadStatus.speed} • ETA: {downloadStatus.eta}</span>
        </div>
      </div>
    {/if}

    {#if downloadStatus && downloadStatus.status === 'completed'}
      <div class="px-4 py-3 bg-green-900/30 border-b border-green-700/50 flex items-center justify-between">
        <span class="text-sm text-green-300">Download complete: {downloadStatus.filename}</span>
        <button onclick={() => downloadStatus = null} class="text-xs text-green-400 hover:text-green-300">
          Dismiss
        </button>
      </div>
    {/if}

    {#if downloadStatus && downloadStatus.status === 'error'}
      <div class="px-4 py-3 bg-red-900/30 border-b border-red-700/50 flex items-center justify-between">
        <span class="text-sm text-red-300">{downloadStatus.message}</span>
        <button onclick={() => downloadStatus = null} class="text-xs text-red-400 hover:text-red-300">
          Dismiss
        </button>
      </div>
    {/if}

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
      {#if selectedModel}
        <!-- Model Details View -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="mb-6">
            <h3 class="text-xl font-semibold text-white mb-1">{selectedModel.name}</h3>
            <p class="text-sm text-gray-400">by {selectedModel.author}</p>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <TrendingUp class="h-4 w-4" />
                {formatNumber(selectedModel.downloads)} downloads
              </span>
              <span class="flex items-center gap-1">
                <Heart class="h-4 w-4" />
                {formatNumber(selectedModel.likes)} likes
              </span>
              <a
                href="https://huggingface.co/{selectedModel.id}"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-1 text-primary-400 hover:text-primary-300"
              >
                <ExternalLink class="h-4 w-4" />
                View on HF
              </a>
            </div>
          </div>

          <div class="mb-4">
            <h4 class="text-sm font-medium text-gray-300 mb-2">Available Quantizations</h4>
            <p class="text-xs text-gray-500 mb-3">
              Select a quantization to download. Smaller sizes = faster but lower quality.
            </p>
          </div>

          <div class="space-y-2">
            {#each selectedModel.files as file}
              <div class="p-3 rounded-xl border transition-all {getCompatibilityBg(file.compatibility.status)}">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <!-- Compatibility Icon -->
                    {#if file.compatibility.status === 'excellent'}
                      <CheckCircle class="h-5 w-5 text-green-400" />
                    {:else if file.compatibility.status === 'good'}
                      <Cpu class="h-5 w-5 text-blue-400" />
                    {:else if file.compatibility.status === 'warning'}
                      <AlertTriangle class="h-5 w-5 text-yellow-400" />
                    {:else}
                      <XCircle class="h-5 w-5 text-red-400" />
                    {/if}
                    <div>
                      <p class="text-sm text-gray-200">{file.quantization}</p>
                      <p class="text-xs text-gray-500">{file.name}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-400">{file.sizeFormatted}</span>
                    <button
                      onclick={() => handleDownloadClick(file)}
                      disabled={downloadStatus?.status === 'downloading' || !file.compatibility.canRun}
                      class="btn btn-primary py-1.5 text-xs disabled:opacity-50"
                    >
                      <Download class="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
                <!-- Compatibility Info -->
                <div class="mt-2 flex items-center gap-4 text-xs {getCompatibilityColor(file.compatibility.status)}">
                  <span class="flex items-center gap-1">
                    <Zap class="h-3 w-3" />
                    {file.compatibility.recommendedGpuLayers}/{file.compatibility.estimatedTotalLayers} GPU layers
                  </span>
                  <span>{file.compatibility.message}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Search View -->
        <div class="p-4 border-b border-white/5">
          <!-- Search Input -->
          <div class="flex gap-2 mb-4">
            <div class="flex-1 relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                bind:value={searchQuery}
                onkeydown={handleKeydown}
                placeholder="Search GGUF models..."
                class="input pl-10"
              />
            </div>
            <button
              onclick={handleSearch}
              disabled={isLoading}
              class="btn btn-primary"
            >
              Search
            </button>
          </div>

          <!-- Quick Filters -->
          <div class="flex flex-wrap gap-2">
            <span class="text-xs text-gray-500">Popular:</span>
            {#each popularAuthors as author}
              <button
                onclick={() => searchModels('', author.id)}
                class="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded-md border border-white/5 transition-colors"
              >
                {author.name}
              </button>
            {/each}
          </div>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto p-4">
          {#if isLoading}
            <div class="flex items-center justify-center py-12">
              <Loader2 class="h-8 w-8 text-primary-400 animate-spin" />
            </div>
          {:else if error}
            <div class="text-center py-12">
              <p class="text-red-400">{error}</p>
              <button onclick={() => searchModels()} class="mt-2 text-primary-400 hover:text-primary-300">
                Try again
              </button>
            </div>
          {:else if models.length === 0}
            <div class="text-center py-12 text-gray-500">
              <Package class="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No models found. Try a different search.</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each models as model}
                <button
                  onclick={() => loadModelDetails(model.id)}
                  class="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-200 truncate">{model.name}</p>
                    <p class="text-xs text-gray-500">{model.author}</p>
                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <TrendingUp class="h-3 w-3" />
                        {formatNumber(model.downloads)}
                      </span>
                      <span class="flex items-center gap-1">
                        <Heart class="h-3 w-3" />
                        {formatNumber(model.likes)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight class="h-5 w-5 text-gray-500 flex-shrink-0" />
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Confirmation Dialog for Incompatible Models -->
{#if confirmDownload?.show}
  <div class="modal-backdrop" style="z-index: 60;">
    <div class="w-full max-w-md bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
      <div class="flex items-center gap-3 mb-4">
        {#if confirmDownload.file.compatibility.status === 'warning'}
          <div class="p-2 rounded-full bg-yellow-500/20">
            <AlertTriangle class="h-6 w-6 text-yellow-400" />
          </div>
        {:else}
          <div class="p-2 rounded-full bg-red-500/20">
            <AlertCircle class="h-6 w-6 text-red-400" />
          </div>
        {/if}
        <h3 class="text-lg font-semibold text-white">
          {confirmDownload.file.compatibility.status === 'warning' ? 'Performance Warning' : 'Compatibility Issue'}
        </h3>
      </div>

      <div class="mb-6">
        <p class="text-gray-300 mb-3">
          {confirmDownload.file.compatibility.message}
        </p>

        <div class="p-3 rounded-lg bg-white/5 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Model:</span>
            <span class="text-gray-300">{confirmDownload.file.quantization}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Size:</span>
            <span class="text-gray-300">{confirmDownload.file.sizeFormatted}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">GPU Layers:</span>
            <span class="text-gray-300">{confirmDownload.file.compatibility.recommendedGpuLayers} / {confirmDownload.file.compatibility.estimatedTotalLayers}</span>
          </div>
          {#if !confirmDownload.file.compatibility.willFitInVram}
            <div class="flex justify-between">
              <span class="text-gray-500">RAM Required:</span>
              <span class="text-yellow-400">{(confirmDownload.file.compatibility.ramRequired / 1000).toFixed(1)} GB</span>
            </div>
          {/if}
        </div>

        {#if confirmDownload.file.compatibility.status === 'poor'}
          <p class="mt-3 text-red-400 text-sm">
            ⚠️ This model may fail to load or run extremely slowly. Consider a smaller quantization.
          </p>
        {:else}
          <p class="mt-3 text-yellow-400 text-sm">
            💡 The model will run but with reduced performance due to CPU offloading.
          </p>
        {/if}
      </div>

      <div class="flex gap-3">
        <button
          onclick={() => confirmDownload = null}
          class="flex-1 btn bg-white/5 hover:bg-white/10 text-gray-300"
        >
          Cancel
        </button>
        <button
          onclick={confirmAndDownload}
          class="flex-1 btn {confirmDownload.file.compatibility.status === 'poor' ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'} text-white"
        >
          Download Anyway
        </button>
      </div>
    </div>
  </div>
{/if}
