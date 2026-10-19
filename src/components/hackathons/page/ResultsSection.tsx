import React from 'react';
import { ExternalLink, Medal } from 'lucide-react';
import type { HackathonResults, ShowcaseProject } from '@/lib/types';

/** Winners first; the full ranked scores only when the organizers chose to show them. */
export function WinnersList({ results }: { results: HackathonResults }) {
  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {results.winners.map((winner) => (
          <li key={winner.id} className="flex items-start gap-3 rounded-2xl border border-journey-accent/30 bg-journey-accent/5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-journey-accent text-white" aria-hidden="true"><Medal className="h-5 w-5" /></span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-journey-accent">{winner.title}{winner.prize ? ` · ${winner.prize}` : ''}</p>
              <p className="text-lg font-bold text-journey-text">{winner.team_name}</p>
              {winner.project_title && (
                <p className="text-sm text-journey-text/80">
                  {winner.project_url ? <a href={winner.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-journey-accent hover:underline">{winner.project_title}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a> : winner.project_title}
                </p>
              )}
              {winner.note && <p className="text-sm text-journey-muted">{winner.note}</p>}
            </div>
          </li>
        ))}
      </ol>

      {results.leaderboard.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="pb-2 text-left text-xs font-bold uppercase tracking-[0.16em] text-journey-muted">Full leaderboard</caption>
            <thead className="text-[11px] font-bold uppercase tracking-wide text-journey-muted">
              <tr><th scope="col" className="py-2 pr-3">#</th><th scope="col" className="py-2 pr-3">Team</th><th scope="col" className="py-2 pr-3">Project</th><th scope="col" className="py-2 text-right">Score</th></tr>
            </thead>
            <tbody className="divide-y divide-journey-text/10">
              {results.leaderboard.map((row) => (
                <tr key={row.submission_id}>
                  <td className="py-2 pr-3 font-bold tabular-nums">{row.rank}</td>
                  <td className="py-2 pr-3 font-semibold text-journey-text">{row.team_name}</td>
                  <td className="py-2 pr-3 text-journey-text/80">{row.project_title}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{row.review_count ? row.score.toFixed(1) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Gallery of every project whose team agreed to be shown. */
export function ProjectShowcase({ projects }: { projects: ShowcaseProject[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id} className="flex flex-col gap-2 rounded-2xl border border-journey-text/10 bg-journey-surface/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-journey-text">{project.project_title}</h3>
            {project.award && <span className="rounded-full bg-journey-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-journey-accent">{project.award}</span>}
          </div>
          <p className="text-xs text-journey-muted">{project.team_name}{project.members.length ? ` · ${project.members.join(', ')}` : ''}</p>
          {project.tagline && <p className="text-sm font-medium text-journey-text/80">{project.tagline}</p>}
          <p className="line-clamp-4 text-sm text-journey-muted">{project.description}</p>
          {project.tech_stack.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {project.tech_stack.map((tech) => <li key={tech} className="rounded-md bg-journey-text/10 px-2 py-0.5 text-[11px] text-journey-text/80">{tech}</li>)}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs font-bold text-journey-accent">
            {[['Code', project.repo_url], ['Demo', project.demo_url], ['Video', project.video_url], ['Slides', project.slides_url]].map(([label, url]) => url && (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:underline">{label}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
