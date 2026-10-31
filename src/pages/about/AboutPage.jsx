import { AppLayout } from '../../components/layout/AppLayout';

/** Temporary stubs for routes owned by other team members. */
export function AboutPage({ title, note }) {
  return (
    <AppLayout title={title}>
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 shadow-sm">
        {note ?? `[ ${title} — This is the about page test ]`}
      </div>
    </AppLayout>
  );
}
