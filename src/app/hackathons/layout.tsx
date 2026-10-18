// Every hackathon page (list, detail, dashboard) uses the landing page's typography.
export default function HackathonsLayout({ children }: { children: React.ReactNode }) {
  return <div className="journey-type">{children}</div>;
}
