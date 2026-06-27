import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { TemplateCategory } from '@acs/database';
import { RenderVariationSelections } from '@acs/shared';
import { TemplatesService } from '../templates/templates.service';

interface WeightedOption {
  allowed: string[];
  weights: Record<string, number>;
}

interface TemplateConfig {
  fonts?: { allowedPairs?: Array<{ heading: string; body: string }> };
  animations?: WeightedOption;
  transitions?: WeightedOption;
  subtitleStyles?: WeightedOption;
  layouts?: WeightedOption;
  cameraEffects?: WeightedOption;
  backgrounds?: WeightedOption;
  imagePositions?: WeightedOption;
  intros?: { variants: string[]; weights: Record<string, number> };
  outros?: { variants: string[]; weights: Record<string, number> };
  colorPalettes?: { variants: Array<{ name: string }> };
  music?: WeightedOption;
  compositionKey?: string;
}

@Injectable()
export class VariationService {
  constructor(private readonly templatesService: TemplatesService) {}

  async generateRenderConfig(
    _projectVideoStyle?: string | null,
    templateCategory?: TemplateCategory,
  ): Promise<{
    templateKey: string;
    templateVersionId: string;
    variationSeed: string;
    selections: RenderVariationSelections;
    selectionsHash: string;
  }> {
    const templates = await this.templatesService.findAll(true);
    const eligible = templates.filter((t) => {
      if (templateCategory) return t.category === templateCategory;
      return true;
    });

    if (!eligible.length) {
      throw new Error('No eligible templates found for rendering');
    }

    const variationSeed = randomBytes(32).toString('hex');
    const rng = this.createSeededRng(variationSeed);

    const template = eligible[Math.floor(rng() * eligible.length)]!;
    const version = template.versions[0];
    if (!version) throw new Error(`No active version for template: ${template.key}`);

    const config = version.config as TemplateConfig;

    const fontPair = this.pickRandom(config.fonts?.allowedPairs ?? [], rng) ?? {
      heading: 'Inter',
      body: 'Inter',
    };

    const selections: RenderVariationSelections = {
      templateKey: template.key,
      layout: this.pickWeighted(config.layouts, rng),
      animation: this.pickWeighted(config.animations, rng),
      transition: this.pickWeighted(config.transitions, rng),
      subtitleStyle: this.pickWeighted(config.subtitleStyles, rng),
      fontHeading: fontPair.heading,
      fontBody: fontPair.body,
      intro: this.pickWeightedFromVariants(config.intros, rng),
      outro: this.pickWeightedFromVariants(config.outros, rng),
      background: this.pickWeighted(config.backgrounds, rng),
      imagePosition: this.pickWeighted(config.imagePositions, rng),
      cameraEffect: this.pickWeighted(config.cameraEffects, rng),
      musicTrack: this.pickWeighted(config.music, rng),
      colorPalette: this.pickFromArray(
        config.colorPalettes?.variants?.map((v) => v.name) ?? ['default'],
        rng,
      ),
    };

    const selectionsHash = createHash('sha256')
      .update(JSON.stringify(selections))
      .digest('hex')
      .slice(0, 16);

    return {
      templateKey: template.key,
      templateVersionId: version.id,
      variationSeed,
      selections,
      selectionsHash,
    };
  }

  private createSeededRng(seed: string): () => number {
    let h = createHash('sha256').update(seed).digest();
    let i = 0;
    return () => {
      if (i >= h.length - 4) {
        h = createHash('sha256').update(h).digest();
        i = 0;
      }
      const value = h.readUInt32BE(i);
      i += 4;
      return value / 0xffffffff;
    };
  }

  private pickWeighted(option: WeightedOption | undefined, rng: () => number): string {
    if (!option?.allowed?.length) return 'default';
    const total = option.allowed.reduce(
      (sum, key) => sum + (option.weights[key] ?? 1),
      0,
    );
    let roll = rng() * total;
    for (const key of option.allowed) {
      roll -= option.weights[key] ?? 1;
      if (roll <= 0) return key;
    }
    return option.allowed[0]!;
  }

  private pickWeightedFromVariants(
    option: { variants: string[]; weights: Record<string, number> } | undefined,
    rng: () => number,
  ): string {
    if (!option?.variants?.length) return 'default';
    return this.pickWeighted(
      { allowed: option.variants, weights: option.weights },
      rng,
    );
  }

  private pickRandom<T>(arr: T[], rng: () => number): T | undefined {
    if (!arr.length) return undefined;
    return arr[Math.floor(rng() * arr.length)];
  }

  private pickFromArray(arr: string[], rng: () => number): string {
    return arr[Math.floor(rng() * arr.length)] ?? 'default';
  }
}
