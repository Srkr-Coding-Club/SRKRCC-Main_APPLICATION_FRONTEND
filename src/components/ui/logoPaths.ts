import { CLUB_LOGO_INK, CLUB_LOGO_RAYS, type LogoShape } from '@/components/hero-intro/webgl/clubLogo';

/* SVG path data built from the same traced outlines the 3D intro uses for the   */
/* Sun's logo (clubLogo.ts): y is flipped (the source data is y-up, SVG is       */
/* y-down). Built once at module load, not per render.                          */
function shapesToPath(shapes: LogoShape[]): string {
  return shapes
    .map(({ outer }) => {
      const point = ([x, y]: [number, number]) => `${x},${-y}`;
      return `M${point(outer[0])} ${outer.slice(1).map((p) => `L${point(p)}`).join(' ')} Z`;
    })
    .join(' ');
}

// Bulb outline before the brain squiggle, so the silhouette reads before the detail.
export const CLUB_LOGO_INK_PATH = shapesToPath([CLUB_LOGO_INK[1], CLUB_LOGO_INK[0]]);
export const CLUB_LOGO_RAYS_PATH = shapesToPath(CLUB_LOGO_RAYS);

// Covers the ink (x:[-0.40,0.40] y:[-0.89,0.49]) and the wider rays (x:[-0.74,0.74] y:[-0.28,0.83]).
export const CLUB_LOGO_VIEWBOX = '-0.85 -0.95 1.7 1.95';
