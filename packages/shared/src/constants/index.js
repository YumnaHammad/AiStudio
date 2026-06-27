"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PREFIX = exports.API_VERSION = exports.WS_ROOM = exports.R2_PATH_PREFIX = exports.WORKER_MAX_RETRIES = exports.WORKER_BACKUP_PROVIDERS = exports.WORKER_DEFAULT_PROVIDERS = exports.WORKER_PIPELINE_ORDER = void 0;
const index_js_1 = require("../enums/index.js");
/** Canonical ordered list of AI worker steps in the pipeline */
exports.WORKER_PIPELINE_ORDER = [
    index_js_1.WorkerKey.RESEARCH,
    index_js_1.WorkerKey.FACT_CHECKER,
    index_js_1.WorkerKey.SCRIPT,
    index_js_1.WorkerKey.TRANSLATION,
    index_js_1.WorkerKey.VOICE,
    index_js_1.WorkerKey.SCENE_PLANNER,
    index_js_1.WorkerKey.ASSET_FINDER,
    index_js_1.WorkerKey.THUMBNAIL,
    index_js_1.WorkerKey.SEO,
    index_js_1.WorkerKey.PODCAST,
    index_js_1.WorkerKey.SOCIAL_MEDIA,
    index_js_1.WorkerKey.QUALITY_CHECK,
];
/** Default primary provider per worker */
exports.WORKER_DEFAULT_PROVIDERS = {
    [index_js_1.WorkerKey.RESEARCH]: 'openai',
    [index_js_1.WorkerKey.FACT_CHECKER]: 'openai',
    [index_js_1.WorkerKey.SCRIPT]: 'openai',
    [index_js_1.WorkerKey.TRANSLATION]: 'openai',
    [index_js_1.WorkerKey.VOICE]: 'elevenlabs',
    [index_js_1.WorkerKey.SCENE_PLANNER]: 'openai',
    [index_js_1.WorkerKey.ASSET_FINDER]: 'pexels',
    [index_js_1.WorkerKey.THUMBNAIL]: 'openai-images',
    [index_js_1.WorkerKey.SEO]: 'openai',
    [index_js_1.WorkerKey.PODCAST]: 'openai',
    [index_js_1.WorkerKey.SOCIAL_MEDIA]: 'openai',
    [index_js_1.WorkerKey.QUALITY_CHECK]: 'openai',
};
/** Backup provider when primary fails after retries */
exports.WORKER_BACKUP_PROVIDERS = {
    [index_js_1.WorkerKey.RESEARCH]: 'anthropic',
    [index_js_1.WorkerKey.FACT_CHECKER]: 'anthropic',
    [index_js_1.WorkerKey.SCRIPT]: 'anthropic',
    [index_js_1.WorkerKey.TRANSLATION]: 'anthropic',
    [index_js_1.WorkerKey.VOICE]: 'openai-tts',
    [index_js_1.WorkerKey.SCENE_PLANNER]: 'anthropic',
    [index_js_1.WorkerKey.ASSET_FINDER]: 'pixabay',
    [index_js_1.WorkerKey.SEO]: 'anthropic',
    [index_js_1.WorkerKey.PODCAST]: 'anthropic',
    [index_js_1.WorkerKey.SOCIAL_MEDIA]: 'anthropic',
    [index_js_1.WorkerKey.QUALITY_CHECK]: 'anthropic',
};
/** Default retry count before provider failover */
exports.WORKER_MAX_RETRIES = 3;
/** R2 storage path prefixes */
exports.R2_PATH_PREFIX = {
    VOICE: 'voices',
    VIDEO_RAW: 'videos/raw',
    VIDEO_OPTIMIZED: 'videos/optimized',
    THUMBNAIL: 'thumbnails',
    ASSET: 'assets',
    PODCAST: 'podcasts',
    SUBTITLE: 'subtitles',
    SOCIAL: 'social',
    LOGS: 'logs',
};
/** WebSocket room prefixes */
exports.WS_ROOM = {
    PROJECT: 'project',
    WORKSPACE: 'workspace',
    USER: 'user',
};
/** API route prefix */
exports.API_VERSION = 'v1';
exports.API_PREFIX = `/api/${exports.API_VERSION}`;
//# sourceMappingURL=index.js.map