import React from 'react';
import Image from 'next/image';
import { COMMUNITY_MOMENTS } from '@/content/community';
import PathNode from './PathNode';

/* ------------------------------------------------------------------ */
/* Built by students: real photographs from club events, the proof    */
/* that the path leads somewhere. Renders nothing until real photos   */
/* are added to src/content/community.ts.                             */
/* ------------------------------------------------------------------ */
export default function BuiltByStudents() {
  if (COMMUNITY_MOMENTS.length === 0) return null;

  return (
    <section id="community" aria-labelledby="community-title" className="relative scroll-mt-20 py-24 sm:py-32">
      <div className="relative">
        <PathNode className="top-[0.55rem]" />
        <h2 id="community-title" className="font-display text-[clamp(2rem,4.2vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-journey-text [font-stretch:112%]">
          Built by students.
        </h2>
        <p className="mt-4 max-w-[46ch] text-base text-journey-muted sm:text-lg">The people you’ll learn, compete and build with.</p>
      </div>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMMUNITY_MOMENTS.map((moment) => (
          <li key={moment.src} className={moment.wide ? 'sm:col-span-2' : undefined}>
            <figure>
              <div className={`relative overflow-hidden rounded-xl bg-journey-surface ${moment.wide ? 'aspect-[16/9]' : 'aspect-[4/5]'}`}>
                <Image
                  src={moment.src}
                  alt={moment.alt}
                  fill
                  sizes={moment.wide ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-sm text-journey-muted">{moment.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
