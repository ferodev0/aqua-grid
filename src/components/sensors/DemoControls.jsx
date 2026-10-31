import { useNetwork } from '../../context/NetworkContext';

/** Crisis/reset controls for the shared simulation (sidebar footer). */
export function DemoControls({ collapsed = false }) {
  const {
    isCrisisActive,
    isRunning,
    triggerCrisis,
    resetSimulation,
    setSimulationRunning,
  } = useNetwork();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={triggerCrisis}
          disabled={isCrisisActive}
          title="Trigger crisis"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          !
        </button>
        <button
          type="button"
          onClick={resetSimulation}
          title="Reset simulation"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          R
        </button>
        <button
          type="button"
          onClick={() => setSimulationRunning(!isRunning)}
          title={isRunning ? 'Pause ticks' : 'Resume ticks'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          {isRunning ? '||' : '▶'}
        </button>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isCrisisActive ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          title={isCrisisActive ? 'Crisis active' : 'Baseline'}
        />
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-slate-200 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Demo controls
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={triggerCrisis}
          disabled={isCrisisActive}
          className="w-full rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trigger crisis
        </button>
        <button
          type="button"
          onClick={resetSimulation}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Reset simulation
        </button>
        <button
          type="button"
          onClick={() => setSimulationRunning(!isRunning)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          {isRunning ? 'Pause ticks' : 'Resume ticks'}
        </button>
        <span
          className={`rounded-lg border px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide ${
            isCrisisActive
              ? 'border-amber-300 bg-amber-100 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {isCrisisActive ? 'Crisis active' : 'Baseline'}
        </span>
      </div>
    </div>
  );
}
