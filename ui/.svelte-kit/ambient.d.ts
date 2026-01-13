
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const GJS_DEBUG_TOPICS: string;
	export const DOCKER_BUILDKIT: string;
	export const LESSOPEN: string;
	export const USER: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const npm_config_user_agent: string;
	export const MOZ_X11_EGL: string;
	export const CXXFLAGS: string;
	export const GIT_EDITOR: string;
	export const XDG_SESSION_TYPE: string;
	export const MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: string;
	export const __GLX_VENDOR_LIBRARY_NAME: string;
	export const npm_node_execpath: string;
	export const MOZ_DISABLE_RDD_SANDBOX: string;
	export const CLUTTER_DISABLE_MIPMAPPED_TEXT: string;
	export const SHLVL: string;
	export const npm_config_noproxy: string;
	export const HOME: string;
	export const TERMINFO: string;
	export const MOZ_ENABLE_WAYLAND: string;
	export const OLDPWD: string;
	export const DESKTOP_SESSION: string;
	export const NVM_BIN: string;
	export const KITTY_INSTALLATION_DIR: string;
	export const npm_package_json: string;
	export const NVM_INC: string;
	export const GIO_LAUNCHED_DESKTOP_FILE: string;
	export const GNOME_SHELL_SESSION_MODE: string;
	export const GTK_MODULES: string;
	export const KITTY_PID: string;
	export const MANAGERPID: string;
	export const npm_config_userconfig: string;
	export const npm_config_local_prefix: string;
	export const SYSTEMD_EXEC_PID: string;
	export const SSH_ASKPASS: string;
	export const MAKEFLAGS: string;
	export const GSM_SKIP_SSH_AGENT_WORKAROUND: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const COLORTERM: string;
	export const LIBVIRT_DEFAULT_URI: string;
	export const GIO_LAUNCHED_DESKTOP_FILE_PID: string;
	export const COLOR: string;
	export const NVM_DIR: string;
	export const DEBUGINFOD_URLS: string;
	export const MUTTER_DEBUG_TRIPLE_BUFFERING: string;
	export const npm_config_audit: string;
	export const LOGNAME: string;
	export const WINDOWID: string;
	export const JOURNAL_STREAM: string;
	export const _: string;
	export const npm_config_prefix: string;
	export const npm_config_npm_version: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const XDG_SESSION_CLASS: string;
	export const KITTY_PUBLIC_KEY: string;
	export const USERNAME: string;
	export const TERM: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const npm_config_cache: string;
	export const GNOME_DESKTOP_SESSION_ID: string;
	export const npm_config_ignore_scripts: string;
	export const WINDOWPATH: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const SESSION_MANAGER: string;
	export const COMPOSE_MENU: string;
	export const INVOCATION_ID: string;
	export const NODE: string;
	export const npm_package_name: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const XDG_MENU_PREFIX: string;
	export const XDG_RUNTIME_DIR: string;
	export const CFLAGS: string;
	export const GBM_BACKEND: string;
	export const DOCKER_CLI_HINTS: string;
	export const DISPLAY: string;
	export const DESKTOP_STARTUP_ID: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const LANG: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const LIBVA_DRIVER_NAME: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XAUTHORITY: string;
	export const LS_COLORS: string;
	export const npm_config_fund: string;
	export const npm_config_loglevel: string;
	export const npm_lifecycle_script: string;
	export const SSH_AUTH_SOCK: string;
	export const __GL_SYNC_TO_VBLANK: string;
	export const __GL_YIELD: string;
	export const SHELL: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const QT_ACCESSIBILITY: string;
	export const LOCALE_ARCHIVE_2_27: string;
	export const GDMSESSION: string;
	export const MAESTRO_CLI_NO_ANALYTICS: string;
	export const KITTY_WINDOW_ID: string;
	export const COMPOSE_DOCKER_CLI_BUILD: string;
	export const LESSCLOSE: string;
	export const CLAUDECODE: string;
	export const GPG_AGENT_INFO: string;
	export const DISABLE_NON_ESSENTIAL_MODEL_CALLS: string;
	export const GJS_DEBUG_OUTPUT: string;
	export const ANDROID_SDK_ROOT: string;
	export const WLR_NO_HARDWARE_CURSORS: string;
	export const npm_config_globalconfig: string;
	export const npm_config_init_module: string;
	export const JAVA_HOME: string;
	export const PWD: string;
	export const npm_execpath: string;
	export const XDG_CONFIG_DIRS: string;
	export const ANDROID_HOME: string;
	export const NVM_CD_FLAGS: string;
	export const XDG_DATA_DIRS: string;
	export const npm_config_global_prefix: string;
	export const QTWEBENGINE_DICTIONARIES_PATH: string;
	export const NVD_BACKEND: string;
	export const npm_command: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const MANPATH: string;
	export const BRAVE_API_KEY: string;
	export const EDITOR: string;
	export const INIT_CWD: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		GJS_DEBUG_TOPICS: string;
		DOCKER_BUILDKIT: string;
		LESSOPEN: string;
		USER: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		npm_config_user_agent: string;
		MOZ_X11_EGL: string;
		CXXFLAGS: string;
		GIT_EDITOR: string;
		XDG_SESSION_TYPE: string;
		MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: string;
		__GLX_VENDOR_LIBRARY_NAME: string;
		npm_node_execpath: string;
		MOZ_DISABLE_RDD_SANDBOX: string;
		CLUTTER_DISABLE_MIPMAPPED_TEXT: string;
		SHLVL: string;
		npm_config_noproxy: string;
		HOME: string;
		TERMINFO: string;
		MOZ_ENABLE_WAYLAND: string;
		OLDPWD: string;
		DESKTOP_SESSION: string;
		NVM_BIN: string;
		KITTY_INSTALLATION_DIR: string;
		npm_package_json: string;
		NVM_INC: string;
		GIO_LAUNCHED_DESKTOP_FILE: string;
		GNOME_SHELL_SESSION_MODE: string;
		GTK_MODULES: string;
		KITTY_PID: string;
		MANAGERPID: string;
		npm_config_userconfig: string;
		npm_config_local_prefix: string;
		SYSTEMD_EXEC_PID: string;
		SSH_ASKPASS: string;
		MAKEFLAGS: string;
		GSM_SKIP_SSH_AGENT_WORKAROUND: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		COLORTERM: string;
		LIBVIRT_DEFAULT_URI: string;
		GIO_LAUNCHED_DESKTOP_FILE_PID: string;
		COLOR: string;
		NVM_DIR: string;
		DEBUGINFOD_URLS: string;
		MUTTER_DEBUG_TRIPLE_BUFFERING: string;
		npm_config_audit: string;
		LOGNAME: string;
		WINDOWID: string;
		JOURNAL_STREAM: string;
		_: string;
		npm_config_prefix: string;
		npm_config_npm_version: string;
		MEMORY_PRESSURE_WATCH: string;
		XDG_SESSION_CLASS: string;
		KITTY_PUBLIC_KEY: string;
		USERNAME: string;
		TERM: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		npm_config_cache: string;
		GNOME_DESKTOP_SESSION_ID: string;
		npm_config_ignore_scripts: string;
		WINDOWPATH: string;
		npm_config_node_gyp: string;
		PATH: string;
		SESSION_MANAGER: string;
		COMPOSE_MENU: string;
		INVOCATION_ID: string;
		NODE: string;
		npm_package_name: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		XDG_MENU_PREFIX: string;
		XDG_RUNTIME_DIR: string;
		CFLAGS: string;
		GBM_BACKEND: string;
		DOCKER_CLI_HINTS: string;
		DISPLAY: string;
		DESKTOP_STARTUP_ID: string;
		NoDefaultCurrentDirectoryInExePath: string;
		LANG: string;
		XDG_CURRENT_DESKTOP: string;
		LIBVA_DRIVER_NAME: string;
		XDG_SESSION_DESKTOP: string;
		XAUTHORITY: string;
		LS_COLORS: string;
		npm_config_fund: string;
		npm_config_loglevel: string;
		npm_lifecycle_script: string;
		SSH_AUTH_SOCK: string;
		__GL_SYNC_TO_VBLANK: string;
		__GL_YIELD: string;
		SHELL: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		QT_ACCESSIBILITY: string;
		LOCALE_ARCHIVE_2_27: string;
		GDMSESSION: string;
		MAESTRO_CLI_NO_ANALYTICS: string;
		KITTY_WINDOW_ID: string;
		COMPOSE_DOCKER_CLI_BUILD: string;
		LESSCLOSE: string;
		CLAUDECODE: string;
		GPG_AGENT_INFO: string;
		DISABLE_NON_ESSENTIAL_MODEL_CALLS: string;
		GJS_DEBUG_OUTPUT: string;
		ANDROID_SDK_ROOT: string;
		WLR_NO_HARDWARE_CURSORS: string;
		npm_config_globalconfig: string;
		npm_config_init_module: string;
		JAVA_HOME: string;
		PWD: string;
		npm_execpath: string;
		XDG_CONFIG_DIRS: string;
		ANDROID_HOME: string;
		NVM_CD_FLAGS: string;
		XDG_DATA_DIRS: string;
		npm_config_global_prefix: string;
		QTWEBENGINE_DICTIONARIES_PATH: string;
		NVD_BACKEND: string;
		npm_command: string;
		MEMORY_PRESSURE_WRITE: string;
		MANPATH: string;
		BRAVE_API_KEY: string;
		EDITOR: string;
		INIT_CWD: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
