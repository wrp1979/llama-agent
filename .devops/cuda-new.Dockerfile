ARG UBUNTU_VERSION=24.04
ARG CUDA_VERSION=13.0.0
ARG BASE_CUDA_DEV_CONTAINER=nvidia/cuda:${CUDA_VERSION}-devel-ubuntu${UBUNTU_VERSION}
ARG BASE_CUDA_RUN_CONTAINER=nvidia/cuda:${CUDA_VERSION}-runtime-ubuntu${UBUNTU_VERSION}

# ============================================================================
# Stage 1: Build dependencies (cached - rarely changes)
# ============================================================================
FROM ${BASE_CUDA_DEV_CONTAINER} AS build-deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        python3 \
        python3-pip \
        git \
        libcurl4-openssl-dev \
        libgomp1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ============================================================================
# Stage 2: Build C++ (cached if source unchanged)
# ============================================================================
FROM build-deps AS build

ARG CUDA_DOCKER_ARCH=default

# Copy only files needed for CMake configuration first
COPY CMakeLists.txt CMakePresets.json ./
COPY cmake/ cmake/
COPY vendor/ vendor/
COPY ggml/ ggml/
COPY src/ src/
COPY common/ common/
COPY include/ include/
COPY tools/ tools/
COPY examples/ examples/
COPY scripts/ scripts/
COPY pocs/ pocs/

# Configure and build
RUN if [ "${CUDA_DOCKER_ARCH}" != "default" ]; then \
        export CMAKE_ARGS="-DCMAKE_CUDA_ARCHITECTURES=${CUDA_DOCKER_ARCH}"; \
    fi && \
    cmake -B build \
        -DGGML_NATIVE=OFF \
        -DGGML_CUDA=ON \
        -DGGML_BACKEND_DL=ON \
        -DGGML_CPU_ALL_VARIANTS=ON \
        -DLLAMA_BUILD_TESTS=OFF \
        ${CMAKE_ARGS} \
        -DCMAKE_EXE_LINKER_FLAGS=-Wl,--allow-shlib-undefined . && \
    cmake --build build --config Release -j$(nproc)

# Collect artifacts
RUN mkdir -p /app/lib /app/bin && \
    find build -name "*.so*" -exec cp -P {} /app/lib \; && \
    cp build/bin/* /app/bin/

# ============================================================================
# Stage 3: Python scripts (cached separately)
# ============================================================================
FROM build-deps AS python-scripts

# Copy only Python-related files
COPY requirements.txt ./
COPY requirements/ requirements/
COPY *.py ./
COPY gguf-py/ gguf-py/
COPY .devops/tools.sh ./tools.sh

# ============================================================================
# Stage 4: Base runtime image
# ============================================================================
FROM ${BASE_CUDA_RUN_CONTAINER} AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgomp1 \
        curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /app

# Copy shared libraries
COPY --from=build /app/lib/ /app/

# ============================================================================
# Stage 5: Full image with Python
# ============================================================================
FROM base AS full

# Install Python and pip first (cached layer)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        python3 \
        python3-pip \
        python3-wheel && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install deps (cached if requirements unchanged)
COPY --from=python-scripts /app/requirements.txt ./
COPY --from=python-scripts /app/requirements/ ./requirements/
RUN pip install --break-system-packages --no-cache-dir --upgrade setuptools && \
    pip install --break-system-packages --no-cache-dir -r requirements.txt

# Copy binaries (from C++ build)
COPY --from=build /app/bin/ /app/

# Copy Python scripts and tools (changes more often)
COPY --from=python-scripts /app/*.py /app/tools.sh /app/
COPY --from=python-scripts /app/gguf-py/ /app/gguf-py/

ENTRYPOINT ["/app/tools.sh"]

# ============================================================================
# Stage 6: Light image (CLI only)
# ============================================================================
FROM base AS light

COPY --from=build /app/bin/llama-cli /app/bin/llama-completion /app/

ENTRYPOINT ["/app/llama-cli"]

# ============================================================================
# Stage 7: Server image
# ============================================================================
FROM base AS server

ENV LLAMA_ARG_HOST=0.0.0.0

COPY --from=build /app/bin/llama-server /app/

HEALTHCHECK CMD ["curl", "-f", "http://localhost:8080/health"]

ENTRYPOINT ["/app/llama-server"]
