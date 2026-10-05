'use client';

import React, { useRef } from 'react';
import DemoFrame from './DemoFrame';
import { useScrollSteps } from '../useScrollSteps';

const COMMAND = 'whoami';
const ANSWER = 'future developer';
const STEPS = COMMAND.length + ANSWER.length + 1;

/* Chapter 01: a terminal wakes up and answers the only question that matters on day one. */
export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useScrollSteps(ref, STEPS);
  const typed = COMMAND.slice(0, step);
  const answered = step > COMMAND.length ? ANSWER.slice(0, step - COMMAND.length - 1) : '';
  const done = step >= STEPS;

  return (
    <div ref={ref} className="mx-auto max-w-md lg:mx-0">
      <DemoFrame title="terminal">
        <div className="space-y-2 px-5 py-6 font-mono text-[15px] leading-relaxed sm:text-base" aria-label={`$ ${COMMAND}, then ${ANSWER}`}>
          <p className="text-journey-text">
            <span className="mr-3 text-journey-muted">$</span>
            {typed}
            {step <= COMMAND.length && <Caret />}
          </p>
          <p className={`text-journey-accent transition-opacity duration-300 ${step > COMMAND.length ? 'opacity-100' : 'opacity-0'}`}>
            <span className="mr-3 text-journey-muted">&gt;</span>
            {answered}
            {step > COMMAND.length && !done && <Caret />}
          </p>
          <p className={`text-journey-text transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-0'}`}>
            <span className="mr-3 text-journey-muted">$</span>
            <Caret />
          </p>
        </div>
      </DemoFrame>
    </div>
  );
}

function Caret() {
  return <span aria-hidden="true" className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.15em] bg-journey-text/80 animate-[journeyCaret_1.1s_steps(1)_infinite]" />;
}
