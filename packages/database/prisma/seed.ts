import { PrismaClient, TemplateCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Valid UUID v4 — legacy seed used a non-standard id rejected by API validation */
const DEFAULT_CAMPAIGN_ID = 'a0000000-0000-4000-8000-000000000001';
const LEGACY_CAMPAIGN_ID = '00000000-0000-0000-0000-000000000001';

const WORKER_PROMPTS: Array<{
  workerKey: string;
  purpose: string;
  description: string;
  content: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}> = [
  {
    workerKey: 'research',
    purpose: 'Topic Research',
    description: 'Deep research on the given topic with citations',
    variables: [
      { name: 'topic', type: 'string', required: true, description: 'The content topic' },
      { name: 'language', type: 'string', required: true, description: 'Target language code' },
      { name: 'duration_target', type: 'number', required: false, description: 'Target video duration in seconds' },
    ],
    content: `You are a professional research analyst for video content production.

Research the following topic thoroughly: {{topic}}

Target language: {{language}}
{{#if duration_target}}Target video duration: {{duration_target}} seconds{{/if}}

Provide comprehensive research including:
1. Key facts and historical context
2. Important dates, figures, and statistics
3. Interesting anecdotes and human stories
4. Controversies or debates (if any)
5. Visual opportunities (what would look great on screen)

Return structured JSON with:
- summary: executive summary (2-3 paragraphs)
- keyPoints: array of key facts
- timeline: chronological events if applicable
- figures: important people/entities
- statistics: relevant numbers with sources
- anecdotes: engaging stories
- visualSuggestions: scene ideas
- citations: array of {title, url, snippet}

Be factual, cite sources, and prioritize accuracy over sensationalism.`,
  },
  {
    workerKey: 'fact-checker',
    purpose: 'Fact Verification',
    description: 'Verify research facts and flag inaccuracies',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'research', type: 'json', required: true, description: 'Research artifact JSON' },
    ],
    content: `You are a rigorous fact-checker for video content.

Topic: {{topic}}

Research to verify:
{{research}}

Verify each key fact, statistic, and claim. For each item:
- status: VERIFIED | UNVERIFIED | DISPUTED | FALSE
- originalClaim: the claim text
- correction: corrected version if needed
- source: verification source
- confidence: 0-100

Return JSON:
- overallScore: 0-100 accuracy score
- verifiedResearch: corrected/enhanced research object (same structure as input)
- flaggedItems: array of issues found
- approved: boolean (true if score >= 80 and no FALSE items)`,
  },
  {
    workerKey: 'script',
    purpose: 'Video Script Generation',
    description: 'Write engaging narration script from verified research',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'language', type: 'string', required: true },
      { name: 'video_style', type: 'string', required: false },
      { name: 'duration_target', type: 'number', required: false },
      { name: 'verified_research', type: 'json', required: true },
    ],
    content: `You are an expert video scriptwriter.

Topic: {{topic}}
Language: {{language}}
Style: {{video_style}}
{{#if duration_target}}Target duration: {{duration_target}} seconds{{/if}}

Verified research:
{{verified_research}}

Write a compelling narration script optimized for voiceover.

Rules:
- Hook viewers in the first 10 seconds
- Use short, clear sentences for narration
- Include natural pauses (mark with ...)
- Structure in sections with clear transitions
- Match target duration (~150 words per minute)
- No stage directions — narration only

Return JSON:
- title: video title
- hook: opening hook (1-2 sentences)
- sections: array of {heading, narration, estimatedDurationSeconds}
- fullScript: complete narration text
- wordCount: total words
- estimatedDurationSeconds: total duration`,
  },
  {
    workerKey: 'translation',
    purpose: 'Script Translation',
    description: 'Translate script to target language if different from source',
    variables: [
      { name: 'script', type: 'string', required: true },
      { name: 'source_language', type: 'string', required: true },
      { name: 'target_language', type: 'string', required: true },
    ],
    content: `Translate the following video narration script from {{source_language}} to {{target_language}}.

Preserve tone, pacing, and emotional impact. Adapt idioms naturally.

Script:
{{script}}

Return JSON:
- translatedScript: full translated text
- language: target language code
- notes: any cultural adaptations made`,
  },
  {
    workerKey: 'voice',
    purpose: 'Voice Direction Metadata',
    description: 'Prepare voice synthesis parameters from script',
    variables: [
      { name: 'script', type: 'string', required: true },
      { name: 'language', type: 'string', required: true },
      { name: 'video_style', type: 'string', required: false },
    ],
    content: `Analyze this narration script and return voice synthesis parameters.

Script:
{{script}}

Language: {{language}}
Style: {{video_style}}

Return JSON:
- text: the full script text for TTS
- voiceStyle: recommended voice character (e.g., authoritative, warm, energetic)
- pacing: slow | normal | fast
- emphasisPoints: array of {text, reason}
- pauseMarkers: array of {afterText, durationMs}`,
  },
  {
    workerKey: 'scene-planner',
    purpose: 'Scene Planning',
    description: 'Break script into timed scenes aligned with voice',
    variables: [
      { name: 'script', type: 'string', required: true },
      { name: 'word_timings', type: 'json', required: true },
      { name: 'video_style', type: 'string', required: false },
      { name: 'topic', type: 'string', required: true },
    ],
    content: `You are a cinematic video scene planner. Break the narration into visual scenes that feel like a professional documentary or short film.

Topic: {{topic}}
Style: {{video_style}}

Script:
{{script}}

Word timings (ms):
{{word_timings}}

Plan each scene as a story beat with clear visual storytelling:
- narration: text segment aligned to voice timing
- durationMs: from word timings
- visualDescription: cinematic shot description (wide establishing, close-up detail, slow motion feel, etc.)
- animation: ken-burns, fade, slide, zoom, parallax
- transition: dissolve, crossfade, wipe (prefer smooth cinematic transitions over hard cuts)
- layout: full-bleed (default for cinematic)
- cameraEffect: pan-left, pan-right, zoom-in, zoom-out, ken-burns
- background: gradient, blurred
- assetKeywords: 3-5 Pexels search terms for cinematic stock VIDEO (e.g. "ocean sunset cinematic", "city night timelapse")

Prefer landscape cinematic footage. Each scene should match the narration mood.

Return JSON:
- scenes: array ordered by index
- totalDurationMs: sum of scene durations`,
  },
  {
    workerKey: 'asset-finder',
    purpose: 'Asset Search Planning',
    description: 'Generate search queries for stock assets per scene',
    variables: [
      { name: 'scenes', type: 'json', required: true },
      { name: 'topic', type: 'string', required: true },
      { name: 'video_style', type: 'string', required: false },
    ],
    content: `Generate cinematic stock asset search queries for each scene.

Topic: {{topic}}
Style: {{video_style}}
Scenes: {{scenes}}

For each scene return:
- sceneIndex: number
- imageQueries: array of 2 fallback search terms for still images
- videoQueries: array of 3 search terms optimized for Pexels/Pixabay cinematic VIDEO (add words like cinematic, film, 4k, timelapse, slow motion when relevant)
- preferredType: VIDEO (default for cinematic content)
- fallbackToAi: boolean (true only if stock unlikely to have good matches)

Return JSON: { assetSearches: [...] }`,
  },
  {
    workerKey: 'thumbnail',
    purpose: 'Thumbnail Generation Prompt',
    description: 'Create DALL-E prompt for video thumbnail',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'video_style', type: 'string', required: false },
    ],
    content: `Create a compelling YouTube thumbnail image prompt.

Topic: {{topic}}
Title: {{title}}
Style: {{video_style}}

Return JSON:
- imagePrompt: detailed DALL-E prompt (photorealistic, high contrast, readable at small size)
- negativePrompt: what to avoid
- textOverlay: suggested text for thumbnail (max 5 words)
- colorScheme: primary colors`,
  },
  {
    workerKey: 'seo',
    purpose: 'SEO Metadata',
    description: 'Generate SEO title, description, tags, and chapters',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'script', type: 'string', required: true },
      { name: 'platform', type: 'string', required: true },
    ],
    content: `Generate SEO metadata for video publishing.

Topic: {{topic}}
Title: {{title}}
Platform: {{platform}}

Script excerpt:
{{script}}

Return JSON:
- title: optimized title (max 100 chars)
- description: full description with keywords (max 5000 chars)
- tags: array of 15-30 tags
- keywords: array of primary keywords
- chapters: array of {timestamp, title}
- hashtags: array for social`,
  },
  {
    workerKey: 'podcast',
    purpose: 'Podcast Show Notes',
    description: 'Generate podcast version show notes from script',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'script', type: 'string', required: true },
      { name: 'title', type: 'string', required: true },
    ],
    content: `Create podcast show notes from this video script.

Topic: {{topic}}
Title: {{title}}

Script:
{{script}}

Return JSON:
- episodeTitle: podcast episode title
- showNotes: formatted show notes (markdown)
- summary: 2-paragraph episode summary
- timestamps: array of {time, topic}
- keyTakeaways: array of bullet points`,
  },
  {
    workerKey: 'social-media',
    purpose: 'Social Media Posts',
    description: 'Generate platform-specific social posts',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'platforms', type: 'json', required: true },
      { name: 'seo', type: 'json', required: false },
    ],
    content: `Create social media posts for video promotion.

Topic: {{topic}}
Title: {{title}}
Platforms: {{platforms}}
SEO data: {{seo}}

For each platform create optimized post:
- platform: name
- content: post text (respect character limits)
- hashtags: relevant hashtags
- callToAction: CTA text
- bestPostTime: suggested posting time

Return JSON: { posts: [...] }`,
  },
  {
    workerKey: 'quality-check',
    purpose: 'Quality Assurance',
    description: 'Final quality check before rendering',
    variables: [
      { name: 'topic', type: 'string', required: true },
      { name: 'script', type: 'string', required: true },
      { name: 'scenes', type: 'json', required: true },
      { name: 'seo', type: 'json', required: false },
    ],
    content: `Perform final quality check on content before video rendering.

Topic: {{topic}}
Script: {{script}}
Scenes: {{scenes}}
SEO: {{seo}}

Evaluate:
1. Narrative coherence and flow
2. Factual consistency
3. Scene coverage (every narration segment has visuals)
4. Duration alignment
5. SEO completeness
6. Brand safety

Return JSON:
- approved: boolean
- overallScore: 0-100
- checks: array of {name, passed, score, notes}
- blockers: array of critical issues (empty if approved)
- suggestions: array of optional improvements`,
  },
];

const TEMPLATE_SEEDS: Array<{
  key: string;
  name: string;
  category: TemplateCategory;
  description: string;
  config: Record<string, unknown>;
}> = [
  {
    key: 'history-documentary',
    name: 'History Documentary',
    category: TemplateCategory.HISTORY,
    description: 'Cinematic history documentary style with Ken Burns effects',
    config: {
      fonts: {
        heading: 'Playfair Display',
        body: 'Source Sans Pro',
        subtitle: 'Roboto',
        allowedPairs: [
          { heading: 'Playfair Display', body: 'Source Sans Pro' },
          { heading: 'Merriweather', body: 'Open Sans' },
          { heading: 'Cinzel', body: 'Lato' },
        ],
      },
      animations: {
        allowed: ['ken-burns-zoom-in', 'ken-burns-zoom-out', 'ken-burns-pan', 'fade', 'parallax'],
        weights: { 'ken-burns-zoom-in': 30, 'ken-burns-zoom-out': 25, 'ken-burns-pan': 25, fade: 10, parallax: 10 },
      },
      transitions: {
        allowed: ['dissolve-500', 'dissolve-800', 'fade-black', 'slide-left', 'cut'],
        weights: { 'dissolve-500': 35, 'dissolve-800': 25, 'fade-black': 20, 'slide-left': 15, cut: 5 },
      },
      subtitleStyles: {
        allowed: ['cinematic-bottom', 'karaoke-highlight', 'minimal-center', 'documentary-block'],
        weights: { 'cinematic-bottom': 40, 'karaoke-highlight': 25, 'minimal-center': 20, 'documentary-block': 15 },
      },
      layouts: {
        allowed: ['full-bleed', 'split-60-40', 'split-50-50', 'picture-in-picture'],
        weights: { 'full-bleed': 40, 'split-60-40': 30, 'split-50-50': 20, 'picture-in-picture': 10 },
      },
      cameraEffects: {
        allowed: ['slow-zoom-in', 'slow-zoom-out', 'pan-left', 'pan-right', 'static'],
        weights: { 'slow-zoom-in': 25, 'slow-zoom-out': 25, 'pan-left': 20, 'pan-right': 20, static: 10 },
      },
      backgrounds: {
        allowed: ['dark-gradient', 'sepia-texture', 'blurred-asset', 'solid-dark'],
        weights: { 'dark-gradient': 35, 'sepia-texture': 25, 'blurred-asset': 25, 'solid-dark': 15 },
      },
      imagePositions: {
        allowed: ['center', 'left', 'right', 'alternating'],
        weights: { center: 30, left: 25, right: 25, alternating: 20 },
      },
      intros: {
        variants: ['title-fade', 'title-slide', 'logo-reveal', 'chapter-card'],
        weights: { 'title-fade': 30, 'title-slide': 30, 'logo-reveal': 20, 'chapter-card': 20 },
      },
      outros: {
        variants: ['fade-to-black', 'subscribe-card', 'credits-scroll', 'end-title'],
        weights: { 'fade-to-black': 30, 'subscribe-card': 30, 'credits-scroll': 20, 'end-title': 20 },
      },
      colorPalettes: {
        variants: [
          { name: 'sepia-classic', primary: '#2C1810', secondary: '#8B7355', accent: '#D4A574' },
          { name: 'navy-gold', primary: '#1A1A2E', secondary: '#16213E', accent: '#C9A227' },
          { name: 'earth-tone', primary: '#3E2723', secondary: '#5D4037', accent: '#A1887F' },
        ],
      },
      music: {
        allowed: ['orchestral-epic', 'ambient-cinematic', 'piano-emotional', 'documentary-suspense'],
        weights: { 'orchestral-epic': 30, 'ambient-cinematic': 30, 'piano-emotional': 25, 'documentary-suspense': 15 },
      },
      logoPosition: 'bottom-right',
      compositionKey: 'HistoryDocumentary',
    },
  },
  {
    key: 'news-broadcast',
    name: 'News Broadcast',
    category: TemplateCategory.NEWS,
    description: 'Professional news broadcast layout with lower thirds',
    config: {
      fonts: {
        heading: 'Oswald',
        body: 'Roboto',
        subtitle: 'Roboto Condensed',
        allowedPairs: [
          { heading: 'Oswald', body: 'Roboto' },
          { heading: 'Bebas Neue', body: 'Open Sans' },
        ],
      },
      animations: { allowed: ['slide-in', 'fade', 'zoom', 'wipe'], weights: { 'slide-in': 35, fade: 30, zoom: 20, wipe: 15 } },
      transitions: { allowed: ['wipe-left', 'dissolve-300', 'cut', 'slide-up'], weights: { 'wipe-left': 35, 'dissolve-300': 30, cut: 20, 'slide-up': 15 } },
      subtitleStyles: { allowed: ['news-lower-third', 'breaking-banner', 'standard-bottom'], weights: { 'news-lower-third': 50, 'breaking-banner': 25, 'standard-bottom': 25 } },
      layouts: { allowed: ['split-anchor', 'full-bleed', 'sidebar-graphic'], weights: { 'split-anchor': 45, 'full-bleed': 35, 'sidebar-graphic': 20 } },
      cameraEffects: { allowed: ['static', 'subtle-zoom'], weights: { static: 70, 'subtle-zoom': 30 } },
      backgrounds: { allowed: ['news-studio', 'blue-gradient', 'blurred-asset'], weights: { 'news-studio': 40, 'blue-gradient': 35, 'blurred-asset': 25 } },
      imagePositions: { allowed: ['right', 'left', 'background'], weights: { right: 40, left: 35, background: 25 } },
      intros: { variants: ['news-open', 'headline-flash', 'channel-brand'], weights: { 'news-open': 50, 'headline-flash': 30, 'channel-brand': 20 } },
      outros: { variants: ['news-close', 'subscribe-lower-third'], weights: { 'news-close': 60, 'subscribe-lower-third': 40 } },
      colorPalettes: {
        variants: [
          { name: 'news-blue', primary: '#0D47A1', secondary: '#1565C0', accent: '#FFC107' },
          { name: 'news-red', primary: '#B71C1C', secondary: '#D32F2F', accent: '#FFFFFF' },
        ],
      },
      music: { allowed: ['news-intro', 'ambient-neutral'], weights: { 'news-intro': 60, 'ambient-neutral': 40 } },
      logoPosition: 'top-left',
      compositionKey: 'NewsBroadcast',
    },
  },
  {
    key: 'education-explainer',
    name: 'Education Explainer',
    category: TemplateCategory.EDUCATION,
    description: 'Clean educational explainer with diagrams and highlights',
    config: {
      fonts: {
        heading: 'Poppins',
        body: 'Inter',
        subtitle: 'Inter',
        allowedPairs: [
          { heading: 'Poppins', body: 'Inter' },
          { heading: 'Nunito', body: 'Source Sans Pro' },
        ],
      },
      animations: { allowed: ['pop-in', 'draw-line', 'highlight', 'fade', 'slide-up'], weights: { 'pop-in': 25, 'draw-line': 25, highlight: 20, fade: 15, 'slide-up': 15 } },
      transitions: { allowed: ['slide-right', 'dissolve-400', 'morph', 'cut'], weights: { 'slide-right': 35, 'dissolve-400': 30, morph: 20, cut: 15 } },
      subtitleStyles: { allowed: ['highlight-keyword', 'clean-bottom', 'boxed'], weights: { 'highlight-keyword': 40, 'clean-bottom': 35, boxed: 25 } },
      layouts: { allowed: ['centered', 'split-explain', 'full-graphic'], weights: { centered: 35, 'split-explain': 40, 'full-graphic': 25 } },
      cameraEffects: { allowed: ['static', 'focus-zoom'], weights: { static: 60, 'focus-zoom': 40 } },
      backgrounds: { allowed: ['white-clean', 'light-gradient', 'chalkboard', 'grid-pattern'], weights: { 'white-clean': 30, 'light-gradient': 30, chalkboard: 20, 'grid-pattern': 20 } },
      imagePositions: { allowed: ['center', 'beside-text', 'full-width'], weights: { center: 35, 'beside-text': 40, 'full-width': 25 } },
      intros: { variants: ['topic-card', 'question-hook', 'chapter-title'], weights: { 'topic-card': 40, 'question-hook': 35, 'chapter-title': 25 } },
      outros: { variants: ['summary-card', 'quiz-cta', 'fade-clean'], weights: { 'summary-card': 40, 'quiz-cta': 30, 'fade-clean': 30 } },
      colorPalettes: {
        variants: [
          { name: 'edu-blue', primary: '#1E88E5', secondary: '#E3F2FD', accent: '#FF6F00' },
          { name: 'edu-green', primary: '#43A047', secondary: '#E8F5E9', accent: '#FDD835' },
        ],
      },
      music: { allowed: ['upbeat-learning', 'soft-focus', 'acoustic-light'], weights: { 'upbeat-learning': 40, 'soft-focus': 35, 'acoustic-light': 25 } },
      logoPosition: 'top-right',
      compositionKey: 'EducationExplainer',
    },
  },
];

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      plan: 'free',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: 'main' },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Main Workspace',
      slug: 'main',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aicontentstudio.local' },
    update: {},
    create: {
      email: 'admin@aicontentstudio.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: adminUser.id },
    },
    update: { role: 'OWNER' },
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: 'OWNER',
    },
  });

  const legacyCampaign = await prisma.campaign.findUnique({
    where: { id: LEGACY_CAMPAIGN_ID },
  });
  if (legacyCampaign) {
    const linkedProjects = await prisma.project.count({
      where: { campaignId: LEGACY_CAMPAIGN_ID },
    });
    if (linkedProjects === 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE campaigns SET id = $1::uuid WHERE id = $2::uuid`,
        DEFAULT_CAMPAIGN_ID,
        LEGACY_CAMPAIGN_ID,
      );
      console.log('Migrated default campaign to valid UUID');
    }
  }

  const campaign = await prisma.campaign.upsert({
    where: { id: DEFAULT_CAMPAIGN_ID },
    update: {},
    create: {
      id: DEFAULT_CAMPAIGN_ID,
      workspaceId: workspace.id,
      name: 'Default Campaign',
      description: 'Default campaign for content projects',
    },
  });

  console.log(`Created organization, workspace, admin user, and campaign`);

  for (const promptData of WORKER_PROMPTS) {
    const existing = await prisma.prompt.findFirst({
      where: { workerKey: promptData.workerKey, purpose: promptData.purpose },
    });

    const prompt =
      existing ??
      (await prisma.prompt.create({
        data: {
          workerKey: promptData.workerKey,
          purpose: promptData.purpose,
          description: promptData.description,
        },
      }));

    const versionCount = await prisma.promptVersion.count({
      where: { promptId: prompt.id },
    });

    if (versionCount === 0) {
      await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: 1,
          content: promptData.content,
          variables: promptData.variables,
          isActive: true,
          createdBy: adminUser.id,
        },
      });
    }

    console.log(`Seeded prompt: ${promptData.workerKey}`);
  }

  for (const templateData of TEMPLATE_SEEDS) {
    const template = await prisma.template.upsert({
      where: { key: templateData.key },
      update: {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
      },
      create: {
        key: templateData.key,
        name: templateData.name,
        category: templateData.category,
        description: templateData.description,
        isActive: true,
      },
    });

    const versionCount = await prisma.templateVersion.count({
      where: { templateId: template.id },
    });

    if (versionCount === 0) {
      await prisma.templateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          config: templateData.config,
          isActive: true,
        },
      });
    }

    console.log(`Seeded template: ${templateData.key}`);
  }

  console.log('Seed completed successfully.');
  console.log('');
  console.log('Default credentials:');
  console.log('  Email:    admin@aicontentstudio.local');
  console.log('  Password: Admin123!');
  console.log(`  Campaign ID: ${campaign.id}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
