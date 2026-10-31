import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { SensorDeviceMetadataModal } from '../components/sensors/SensorDeviceMetadataModal';
import { SensorEventsPanel } from '../components/sensors/SensorEventsPanel';
import { SensorTelemetryChart } from '../components/sensors/SensorTelemetryChart';
import { StatusBadge } from '../components/sensors/StatusBadge';
import { useNetwork } from '../context/NetworkContext';

function formatUpdatedAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function SensorDetailsPage() {
  const { sensorId } = useParams();
  const [range, setRange] = useState('24h');
  const [metadataOpen, setMetadataOpen] = useState(false);
  const {
    getSensorById,
    getSensorTelemetry,
    getSensorAlerts,
    channelSegments,
  } = useNetwork();

  const sensor = getSensorById(sensorId ?? '');
  const telemetry = sensor
    ? getSensorTelemetry(sensor.id, range)
    : [];
  const alerts = sensor ? getSensorAlerts(sensor.id) : [];
  const segment = sensor
    ? channelSegments.find((s) => s.id === sensor.channelSegmentId)
    : undefined;

  if (!sensor) {
    return (
      <AppLayout title="Sensor Details" denseHeader>
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sensor not found</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-800">
            No station matches this ID
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-mono text-slate-700">
              {sensorId || '(empty)'}
            </span>{' '}
            is not in the shared simulation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/sensors/S03"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Open sample (S03)
            </Link>
            <Link
              to="/sensors"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sensor list
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const primaryMetrics = [
    {
      label: 'Flow rate',
      value: sensor.current.flowRateLps.toFixed(2),
      unit: 'L/s',
    },
    {
      label: 'Water level',
      value: sensor.current.waterLevelM.toFixed(3),
      unit: 'm',
    },
  ];

  const secondaryMetrics = [
    {
      label: 'Flow velocity',
      value:
        sensor.current.flowVelocityMps != null
          ? sensor.current.flowVelocityMps.toFixed(2)
          : '—',
      unit: 'm/s',
    },
    {
      label: 'Battery',
      value:
        sensor.current.batteryPercent != null
          ? String(sensor.current.batteryPercent)
          : '—',
      unit: '%',
    },
    {
      label: 'Signal',
      value:
        sensor.current.signalPercent != null
          ? String(sensor.current.signalPercent)
          : '—',
      unit: '%',
    },
  ];

  const renderMetricCard = (metric, compact = false) => (
    <div
      key={metric.label}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <h4 className="mb-2 text-sm font-medium text-slate-500">{metric.label}</h4>
      <div
        className={`font-bold text-slate-800 ${
          compact ? 'text-2xl' : 'text-3xl'
        }`}
      >
        {metric.value}
        <span className="ml-1 text-sm font-medium text-slate-400">
          {metric.unit}
        </span>
      </div>
    </div>
  );

  return (
    <AppLayout title="Sensor Details" denseHeader>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link to="/sensors" className="hover:text-teal-700">
            Sensors
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono text-slate-700">{sensor.id}</span>
        </nav>
        <button
          type="button"
          onClick={() => setMetadataOpen(true)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
        >
          Device Metadata
        </button>
      </div>

      <section className="mb-3 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">
                Sensor station
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-800">
                {sensor.name}
              </h3>
            </div>
            <StatusBadge status={sensor.status} />
          </div>
          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-slate-500">Location</dt>
              <dd className="min-w-0 text-slate-700">{sensor.location.label}</dd>
              <dt className="text-slate-500">Channel</dt>
              <dd className="min-w-0 text-slate-700">
                {segment?.name ?? sensor.channelSegmentId}
              </dd>
              <dt className="text-slate-500">Last update</dt>
              <dd className="min-w-0 text-slate-700">
                {formatUpdatedAt(sensor.current.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {primaryMetrics.map((metric) => renderMetricCard(metric))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {secondaryMetrics.map((metric) => renderMetricCard(metric, true))}
          </div>
        </div>
      </section>

      <section className="grid min-h-[420px] gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-stretch">
        <SensorTelemetryChart
          points={telemetry}
          range={range}
          onRangeChange={setRange}
          sensorId={sensor.id}
          sensorName={sensor.name}
          currentFlowLps={sensor.current.flowRateLps}
        />
        <SensorEventsPanel alerts={alerts} />
      </section>

      <SensorDeviceMetadataModal
        open={metadataOpen}
        onClose={() => setMetadataOpen(false)}
        sensor={sensor}
        segment={segment}
      />
    </AppLayout>
  );
}
