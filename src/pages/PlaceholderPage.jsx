import { AppLayout } from '../components/layout/AppLayout';

/** Temporary stubs for routes owned by other team members. */
export function PlaceholderPage({ title, note }) {
  return (
    <AppLayout title={title}>
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 shadow-sm">
        {note ?? `[ ${title} — owned by another branch ]`}
      </div>
    </AppLayout>
  );
}
