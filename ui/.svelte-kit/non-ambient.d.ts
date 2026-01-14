
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/config" | "/api/db" | "/api/db/messages" | "/api/db/servers" | "/api/db/sessions" | "/api/db/sessions/generate-title" | "/api/models" | "/api/models/download" | "/api/models/search" | "/api/models/[id]" | "/api/system" | "/api/system/hardware" | "/api/system/models" | "/api/system/status" | "/api/system/switch-model";
		RouteParams(): {
			"/api/models/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/api": { id?: string };
			"/api/config": Record<string, never>;
			"/api/db": Record<string, never>;
			"/api/db/messages": Record<string, never>;
			"/api/db/servers": Record<string, never>;
			"/api/db/sessions": Record<string, never>;
			"/api/db/sessions/generate-title": Record<string, never>;
			"/api/models": { id?: string };
			"/api/models/download": Record<string, never>;
			"/api/models/search": Record<string, never>;
			"/api/models/[id]": { id: string };
			"/api/system": Record<string, never>;
			"/api/system/hardware": Record<string, never>;
			"/api/system/models": Record<string, never>;
			"/api/system/status": Record<string, never>;
			"/api/system/switch-model": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/config" | "/api/config/" | "/api/db" | "/api/db/" | "/api/db/messages" | "/api/db/messages/" | "/api/db/servers" | "/api/db/servers/" | "/api/db/sessions" | "/api/db/sessions/" | "/api/db/sessions/generate-title" | "/api/db/sessions/generate-title/" | "/api/models" | "/api/models/" | "/api/models/download" | "/api/models/download/" | "/api/models/search" | "/api/models/search/" | `/api/models/${string}` & {} | `/api/models/${string}/` & {} | "/api/system" | "/api/system/" | "/api/system/hardware" | "/api/system/hardware/" | "/api/system/models" | "/api/system/models/" | "/api/system/status" | "/api/system/status/" | "/api/system/switch-model" | "/api/system/switch-model/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | string & {};
	}
}