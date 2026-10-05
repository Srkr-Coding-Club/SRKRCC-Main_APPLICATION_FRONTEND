'use client';

import React, { useRef } from 'react';
import DemoFrame from './DemoFrame';
import { useScrollSteps } from '../useScrollSteps';

type Token = [text: string, tone?: 'keyword' | 'string' | 'muted'];

const SOURCE: Token[][] = [
  [['#include <stdio.h>', 'muted']],
  [],
  [['int', 'keyword'], [' main(', undefined], ['void', 'keyword'], [') {']],
  [['    printf('], ['"Hello, World!\\n"', 'string'], [');']],
  [['    '], ['return', 'keyword'], [' 0;']],
  [['}']],
];
const RUN = ['gcc hello.c -o hello', './hello'];
const OUTPUT = 'Hello, World!';
const STEPS = SOURCE.length + RUN.length + 1;

const TONE: Record<NonNullable<Token[1]>, string> = {
  keyword: 'text-journey-accent',
  string: 'text-journey-text',
  muted: 'text-journey-muted',
};

/* Chapter 02: hello.c writes itself, compiles and runs - the first program, start to finish. */
export default function CompileDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollSteps(ref, STEPS);
  const linesShown = Math.min(step, SOURCE.length);
  const runShown = Math.max(0, Math.min(step - SOURCE.length, RUN.length));
  const ran = step >= STEPS;

  return (
    <div ref={ref} className="mx-auto max-w-lg lg:mx-0">
      <DemoFrame title="hello.c" aside={<span className={ran ? 'text-journey-accent' : ''}>{ran ? 'exit 0' : 'editing'}</span>}>
        <pre className="overflow-x-auto px-5 py-5 font-mono text-[13px] leading-[1.75] text-journey-text/90 sm:text-sm">
          {SOURCE.map((line, i) => (
            <div key={i} className={`flex transition-opacity duration-300 ${i < linesShown ? 'opacity-100' : 'opacity-0'}`}>
              <span aria-hidden="true" className="mr-5 w-4 select-none text-right text-journey-muted/50">
                {i + 1}
              </span>
              <code>
                {line.length === 0 ? ' ' : line.map(([text, tone], j) => (
                  <span key={j} className={tone ? TONE[tone] : undefined}>
                    {text}
                  </span>
                ))}
              </code>
            </div>
          ))}
        </pre>
        <div className="border-t border-journey-text/10 bg-journey-bg/60 px-5 py-4 font-mono text-[13px] leading-[1.8] sm:text-sm">
          {RUN.map((command, i) => (
            <p key={command} className={`transition-opacity duration-300 ${i < runShown ? 'opacity-100' : 'opacity-0'}`}>
              <span className="mr-3 text-journey-muted">$</span>
              <span className="text-journey-text">{command}</span>
            </p>
          ))}
          <p className={`text-journey-accent transition-all duration-500 ${ran ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}>{OUTPUT}</p>
        </div>
      </DemoFrame>
    </div>
  );
}
