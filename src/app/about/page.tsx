import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  ArrowRight,
  Code2,
  Rocket,
  Handshake,
  Lightbulb,
  Calendar,
  Trophy,
  Terminal,
  Briefcase,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import Image from 'next/image';
import PageHero from '@/components/PageHero';
import ScrollReveal from '@/components/ScrollReveal';
import AlumniCarousel from '@/components/AlumniCarousel';

export const metadata: Metadata = {
  title: 'About the SRKR Coding Club',
  description:
    'SRKR Coding Club is a student-run developer community at SRKR Engineering College. We help students learn to code, build real projects, and compete together through events, hackathons, and daily challenges.',
};

const VALUES = [
  {
    icon: Code2,
    title: 'Learn',
    desc: 'Curiosity becomes capability. We run hands-on sessions on fundamentals, development, and emerging tech, open to every branch and every skill level.',
  },
  {
    icon: Rocket,
    title: 'Build',
    desc: 'Ideas become something real. From small experiments to ambitious products, members turn concepts into working software they can show and ship.',
  },
  {
    icon: Handshake,
    title: 'Collaborate',
    desc: 'Better things are built together. We connect students, developers, and creators to share knowledge, review each other’s work, and solve problems as a team.',
  },
  {
    icon: Lightbulb,
    title: 'Innovate',
    desc: 'Think beyond what already exists. We encourage experimentation, creative thinking, and bold ideas that can grow into meaningful solutions.',
  },
];

const MODULES = [
  {
    icon: Calendar,
    title: 'Events & Workshops',
    href: '/events',
    desc: 'Hands-on workshops, guest tech talks, and bootcamps run through the semester.',
  },
  {
    icon: Trophy,
    title: 'Hackathons',
    href: '/hackathons',
    desc: 'Team build-sprints where you form a squad, ship a prototype, and pitch to judges.',
  },
  {
    icon: Sparkles,
    title: 'IconCoders Flagship',
    href: '/iconcoders',
    desc: 'Our premier annual competition and Hall of Fame for the club’s best problem-solvers.',
  },
  {
    icon: Terminal,
    title: 'CodeQuest Daily',
    href: '/codequest',
    desc: 'A fresh algorithmic problem every day to keep your problem-solving sharp, and your streak alive.',
  },
  {
    icon: Briefcase,
    title: 'Career Hub',
    href: '/career',
    desc: 'Curated internships, placement drives, and referral opportunities for members.',
  },
  {
    icon: BookOpen,
    title: 'Blogs & Write-ups',
    href: '/blogs',
    desc: 'Deep dives, tutorials, and retrospectives written by club members and mentors.',
  },
];

const FACTS = [
  { icon: GraduationCap, label: 'Open to every branch & year' },
  { icon: Users, label: 'Student-run, mentor-guided' },
  { icon: Calendar, label: 'Events every semester' },
];

export default function AboutPage() {
  return (
    <div className="journey-type min-h-screen bg-journey-bg py-8 transition-colors duration-300 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-16 px-5 sm:px-8">
        <PageHero
          icon={<Users className="h-4 w-4" />}
          eyebrow="SRKR CODING CLUB · ABOUT"
          title="Built by students, for students"
          description="We are a student developer community at SRKR Engineering College. Our goal is simple: give every student a place to learn to code, build things that matter, and grow alongside people chasing the same thing."
        />

        <ScrollReveal className="space-y-20 sm:space-y-28">
          {/* Our story */}
          <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16" data-reveal>
            <div className="space-y-5">
              <span className="block font-mono text-xs font-medium uppercase tracking-[0.18em] text-journey-accent">
                Our Story
              </span>
              <h2 className="max-w-[18ch] font-display text-[clamp(2rem,4.2vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-journey-text [font-stretch:112%]">
                From a small group of curious coders to a{' '}
                <span className="text-journey-accent">campus-wide community</span>
              </h2>
              <p className="max-w-[52ch] text-base leading-relaxed text-journey-muted sm:text-lg">
                The SRKR Coding Club started with a handful of students who wanted a space to build
                together outside the classroom. That idea hasn&apos;t changed. It has just grown.
              </p>
              <p className="max-w-[52ch] text-base leading-relaxed text-journey-muted sm:text-lg">
                Today the club runs workshops, hackathons, a daily problem challenge, a technical blog,
                and a career hub, all on one platform that members and organisers use every week. We
                stay deliberately open: no entry test, no fees to participate, and every branch is
                welcome.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {FACTS.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-2 rounded-full border border-journey-text/10 bg-journey-surface/70 px-3.5 py-2 text-xs font-medium text-journey-text"
                  >
                    <f.icon className="h-3.5 w-3.5 shrink-0 text-journey-accent" />
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[32px] bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.2),transparent)] blur-2xl sm:-inset-6" />
              <div className="relative overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface p-2 shadow-[0_20px_45px_-28px_rgba(30,41,59,0.35)] dark:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.8)]">
                <div className="relative h-64 overflow-hidden rounded-[20px] bg-journey-bg sm:h-[400px]">
                  <Image
                    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80"
                    alt="Students working together at laptops"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-transparent" />
                </div>
              </div>
            </div>
          </section>

          {/* What we believe */}
          <section className="space-y-8" data-reveal>
            <div className="max-w-2xl space-y-3">
              <span className="block font-mono text-xs font-medium uppercase tracking-[0.18em] text-journey-accent">What We Believe</span>
              <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.7rem)] font-semibold leading-tight tracking-[-0.025em] text-journey-text [font-stretch:112%]">
                Four things we optimise for
              </h2>
              <p className="text-base leading-relaxed text-journey-muted">
                Every event, challenge, and project the club runs comes back to one of these.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="group relative overflow-hidden rounded-[24px] border border-journey-text/10 bg-journey-surface/60 p-5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-journey-accent/30 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_26px_55px_-26px_rgba(255,122,0,0.22)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)] sm:p-6"
                >
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-journey-accent/20 bg-journey-accent/10 text-journey-accent"
                  >
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-journey-text">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-journey-muted sm:text-base">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What we run */}
          <section className="space-y-8" data-reveal>
            <div className="max-w-2xl space-y-3">
              <span className="block font-mono text-xs font-medium uppercase tracking-[0.18em] text-journey-accent">What We Run</span>
              <h2 className="font-display text-[clamp(1.8rem,3.6vw,2.7rem)] font-semibold leading-tight tracking-[-0.025em] text-journey-text [font-stretch:112%]">
                One club, six ways to get involved
              </h2>
              <p className="text-base leading-relaxed text-journey-muted">
                Pick whichever fits how you like to learn, or do all of them.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {MODULES.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex flex-col rounded-[24px] border border-journey-text/10 bg-journey-surface/60 p-5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_20px_45px_-28px_rgba(30,41,59,0.35)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-journey-accent/30 hover:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_26px_55px_-26px_rgba(255,122,0,0.22)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_20px_45px_-28px_rgba(0,0,0,0.8)] sm:p-6"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-journey-accent/20 bg-journey-accent/10 text-journey-accent">
                    <m.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-journey-text transition-colors group-hover:text-journey-accent">
                    {m.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-journey-muted sm:text-base">
                    {m.desc}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-journey-accent">
                    Explore
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Alumni Carousel */}
          <AlumniCarousel />

          {/* CTA */}
          <section
            className="relative isolate overflow-hidden rounded-[28px] border border-journey-text/10 bg-journey-surface px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
            data-reveal
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-[28rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(var(--journey-accent)/0.18),transparent)]" />
            <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-px w-2/3 bg-gradient-to-r from-journey-accent/60 to-transparent" />
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="block font-mono text-xs font-medium uppercase tracking-[0.18em] text-journey-accent">Your Turn</span>
              <h2 className="font-display text-[clamp(2rem,4.2vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.025em] text-journey-text [font-stretch:112%]">
                Want in?
              </h2>
              <p className="text-base leading-relaxed text-journey-muted sm:text-lg">
                Membership is open to every SRKR student. Join the club, come to an event, and start
                building with people who are into the same things you are.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-journey-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-journey-accent/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
                >
                  Join the Club
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/events"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-journey-text/20 px-5 py-2.5 text-sm font-semibold text-journey-text transition hover:border-journey-accent/40 hover:bg-journey-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-journey-accent focus-visible:ring-offset-2 focus-visible:ring-offset-journey-surface"
                >
                  See Upcoming Events
                </Link>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
