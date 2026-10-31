# Aqua Grid

**Every Drop Counts. Every Flow Matters.**

Web prototype for monitoring water channels around Lefke, Cyprus. Distributed sensors (simulated) help operators see flow changes and explore illustrative micro-hydropower potential.

> Demo only — **simulated data**, not real Lefke measurements.

## What it does

- Monitor channel stations (level, flow, status)
- Flag unusual upstream/downstream reductions for inspection
- Estimate illustrative micro-hydro potential: `P = ρ · g · Q · H · η`

Water delivery stays the primary purpose of the channel. Alerts mean **inspection recommended**, not leak confirmed.

## Pages

| Route | Page |
| --- | --- |
| `/` | Dashboard |
| `/map` | Network Map |
| `/sensors` | Sensor list |
| `/sensors/:sensorId` | Sensor details |
| `/impact` | Impact / About |

Label: **DEMO MODE — SIMULATED SENSOR DATA**

## Stack

React · Vite · Tailwind CSS · React Router · shared client simulation

## Run

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Notes

- All pages share one simulation state
- Crisis/reset controls are for demo scenarios
- Spec: `Aqua_Grid_Agent_Development_Specification.md`
