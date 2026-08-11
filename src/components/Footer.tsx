export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} <span className="text-white font-semibold">SRKR Coding Club</span>. One Platform. Limitless Possibilities.
        </p>
        <div className="mt-4 sm:mt-0 flex justify-center space-x-6 text-xs text-slate-400">
          <span>Django REST Backend</span>
          <span>•</span>
          <span>Next.js 15 Frontend</span>
          <span>•</span>
          <span>Local PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}
