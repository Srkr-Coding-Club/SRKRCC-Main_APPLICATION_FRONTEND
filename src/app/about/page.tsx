import React from 'react';
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
import SectionHeading from '@/components/SectionHeading';
import ScrollReveal from '@/components/ScrollReveal';

export const metadata: Metadata = {
  title: 'About the SRKR Coding Club',
  description:
    'SRKR Coding Club is a student-run developer community at SRKR Engineering College — we help students learn to code, build real projects, and compete together through events, hackathons, and daily challenges.',
};

const VALUES = [
  {
    icon: Code2,
    title: 'Learn',
    accent: '#8B2E3B',
    desc: 'Curiosity becomes capability. We run hands-on sessions on fundamentals, development, and emerging tech — open to every branch and every skill level.',
  },
  {
    icon: Rocket,
    title: 'Build',
    accent: '#FF7A00',
    desc: 'Ideas become something real. From small experiments to ambitious products, members turn concepts into working software they can show and ship.',
  },
  {
    icon: Handshake,
    title: 'Collaborate',
    accent: '#FFA500',
    desc: 'Better things are built together. We connect students, developers, and creators to share knowledge, review each other’s work, and solve problems as a team.',
  },
  {
    icon: Lightbulb,
    title: 'Innovate',
    accent: '#C2410C',
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
    desc: 'A fresh algorithmic problem every day to keep your problem-solving sharp — and your streak alive.',
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
    <div className="min-h-screen bg-[var(--background)] py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <PageHero
          icon={<Users className="h-4 w-4 text-[#FF7A00]" />}
          eyebrow="SRKR CODING CLUB · ABOUT"
          title="Built by students, for students"
          description="We are a student developer community at SRKR Engineering College. Our goal is simple: give every student a place to learn to code, build things that matter, and grow alongside people chasing the same thing."
        />

        <ScrollReveal className="space-y-16">
          {/* Our story */}
          <section className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center" data-reveal>
            <div className="space-y-5">
              <span className="block text-xs font-bold tracking-[0.3em] text-[#FF7A00] uppercase">
                Our Story
              </span>
              <h2 className="font-poppins font-extrabold leading-tight tracking-tight text-3xl sm:text-4xl text-[#1A1A2E] dark:text-white">
                From a small group of curious coders to a{' '}
                <span className="ember-text">campus-wide community</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                The SRKR Coding Club started with a handful of students who wanted a space to build
                together outside the classroom. That idea hasn&apos;t changed — it has just grown.
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Today the club runs workshops, hackathons, a daily problem challenge, a technical blog,
                and a career hub — all on one platform that members and organisers use every week. We
                stay deliberately open: no entry test, no fees to participate, and every branch is
                welcome.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {FACTS.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    <f.icon className="w-3.5 h-3.5 text-[#FF7A00]" />
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-6 rounded-[10px] blur-2xl opacity-70 pointer-events-none"
                style={{ background: 'radial-gradient(closest-side, var(--glow-mid), transparent)' }}
              />
              <div
                className="relative z-10 p-[2px] rounded-[10px]"
                style={{ background: 'linear-gradient(135deg, #FFA500, #FF7A00 45%, #8B2E3B 85%)' }}
              >
                <div className="relative h-[320px] sm:h-[400px] overflow-hidden rounded-[10px] bg-white dark:bg-[#151722]">
                  <Image
                    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1000&q=80"
                    alt="Students working together at laptops"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-tr from-[#1A1A2E]/40 via-transparent to-transparent"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* What we believe */}
          <section className="space-y-8" data-reveal>
            <SectionHeading
              icon={Sparkles}
              eyebrow="What We Believe"
              title="Four things we optimise for"
              description="Every event, challenge, and project the club runs comes back to one of these."
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${v.accent}1A`, color: v.accent }}
                  >
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-poppins font-bold text-lg text-[#1A1A2E] dark:text-white">
                    {v.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What we run */}
          <section className="space-y-8" data-reveal>
            <SectionHeading
              icon={Rocket}
              eyebrow="What We Run"
              title="One club, six ways to get involved"
              description="Pick whichever fits how you like to learn — or do all of them."
            />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {MODULES.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151722] p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-[#FF7A00]/40 transition-all flex flex-col"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF7A00] flex items-center justify-center mb-4">
                    <m.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-poppins font-bold text-base text-[#1A1A2E] dark:text-white group-hover:text-[#FF7A00] transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                    {m.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#FF7A00]">
                    Explore
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A1A2E] via-[#8B2E3B] to-[#FF7A00] p-8 sm:p-12 text-white"
            data-reveal
          >
            <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-4">
              <h2 className="font-poppins font-extrabold text-2xl sm:text-3xl tracking-tight">
                Want in?
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Membership is open to every SRKR student. Join the club, come to an event, and start
                building with people who are into the same things you are.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-[#1A1A2E] font-bold text-sm px-5 py-2.5 hover:bg-slate-100 transition"
                >
                  Join the Club
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 text-white font-bold text-sm px-5 py-2.5 hover:bg-white/10 transition"
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
