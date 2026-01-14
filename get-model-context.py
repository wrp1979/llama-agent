#!/usr/bin/env python3
"""Extract context length from GGUF model file."""

import sys

def get_context_length(model_path: str, default: int = 8192) -> int:
    """Extract context_length from GGUF metadata."""
    try:
        from gguf import GGUFReader
        reader = GGUFReader(model_path)

        for field in reader.fields.values():
            if 'context_length' in field.name.lower():
                # field.parts[-1] is typically a numpy array with the value
                value = field.parts[-1]
                if hasattr(value, '__iter__') and not isinstance(value, str):
                    return int(value[0])
                return int(value)

        return default
    except Exception as e:
        print(f"Warning: Could not read GGUF metadata: {e}", file=sys.stderr)
        return default

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: get-model-context.py <model_path> [default]", file=sys.stderr)
        sys.exit(1)

    model_path = sys.argv[1]
    default = int(sys.argv[2]) if len(sys.argv) > 2 else 8192

    ctx_length = get_context_length(model_path, default)
    print(ctx_length)
