import * as THREE from 'three';

/* Soft radial falloff used for the distant beacon and light halos. */
export function createGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.12, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface LabelLine {
  text: string;
  tone: 'primary' | 'muted' | 'accent';
}

const LABEL_FONT_PX = 26;
const LABEL_LINE_PX = 38;
const LABEL_PADDING_PX = 22;
const LABEL_RULE_PX = 2;
const LABEL_FONT = `500 ${LABEL_FONT_PX}px "JetBrains Mono", ui-monospace, monospace`;
const TONE_COLOR: Record<LabelLine['tone'], string> = {
  primary: 'rgba(245,245,245,0.82)',
  muted: 'rgba(148,163,184,0.6)',
  accent: 'rgba(255,165,0,0.95)',
};

/* A projected terminal fragment: small monospace lines behind a gold rule, on clear glass. */
export function createLabelTexture(lines: LabelLine[]) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { texture: new THREE.CanvasTexture(canvas), aspect: 1 };

  ctx.font = LABEL_FONT;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line.text).width));
  canvas.width = Math.ceil(textWidth + LABEL_PADDING_PX * 2 + LABEL_RULE_PX * 4);
  canvas.height = Math.ceil(lines.length * LABEL_LINE_PX + LABEL_PADDING_PX * 2);

  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,165,0,0.7)';
  ctx.fillRect(0, LABEL_PADDING_PX * 0.6, LABEL_RULE_PX, canvas.height - LABEL_PADDING_PX * 1.2);
  lines.forEach((line, i) => {
    ctx.fillStyle = TONE_COLOR[line.tone];
    ctx.fillText(line.text, LABEL_PADDING_PX + LABEL_RULE_PX * 2, LABEL_PADDING_PX + LABEL_LINE_PX * (i + 0.5));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

export function loadTexture(url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}
