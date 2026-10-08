/* ------------------------------------------------------------------ */
/* Real moments from club events, shown in the home page's "Built by  */
/* students" section. The section stays hidden until this list has    */
/* entries.                                                           */
/*                                                                    */
/* Add only real photographs from SRKR Coding Club events - no stock  */
/* images and no AI-generated people. Put files in                    */
/* public/community/ (WebP or AVIF, about 1600px on the long side)    */
/* and describe each one specifically in `alt`.                       */
/* ------------------------------------------------------------------ */

export interface CommunityMoment {
  src: string;
  alt: string;
  /** Short, factual caption, e.g. "HackOverflow 2K25, hour 18". */
  caption: string;
  /** Landscape photos span two columns on desktop. */
  wide?: boolean;
}

export const COMMUNITY_MOMENTS: CommunityMoment[] = [];
