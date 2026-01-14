export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: null,
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/config",
				pattern: /^\/api\/config\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/config/_server.ts.js'))
			},
			{
				id: "/api/db/messages",
				pattern: /^\/api\/db\/messages\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/db/messages/_server.ts.js'))
			},
			{
				id: "/api/db/servers",
				pattern: /^\/api\/db\/servers\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/db/servers/_server.ts.js'))
			},
			{
				id: "/api/db/sessions",
				pattern: /^\/api\/db\/sessions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/db/sessions/_server.ts.js'))
			},
			{
				id: "/api/db/sessions/generate-title",
				pattern: /^\/api\/db\/sessions\/generate-title\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/db/sessions/generate-title/_server.ts.js'))
			},
			{
				id: "/api/models/download",
				pattern: /^\/api\/models\/download\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/models/download/_server.ts.js'))
			},
			{
				id: "/api/models/search",
				pattern: /^\/api\/models\/search\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/models/search/_server.ts.js'))
			},
			{
				id: "/api/models/[id]",
				pattern: /^\/api\/models\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/models/_id_/_server.ts.js'))
			},
			{
				id: "/api/system/hardware",
				pattern: /^\/api\/system\/hardware\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/hardware/_server.ts.js'))
			},
			{
				id: "/api/system/models",
				pattern: /^\/api\/system\/models\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/models/_server.ts.js'))
			},
			{
				id: "/api/system/status",
				pattern: /^\/api\/system\/status\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/status/_server.ts.js'))
			},
			{
				id: "/api/system/switch-model",
				pattern: /^\/api\/system\/switch-model\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/system/switch-model/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
