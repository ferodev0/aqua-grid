# Aqua Grid --- Agent-Ready Product & Development Specification

**Project name:** Aqua Grid\
**Project type:** Web application prototype\
**Competition theme:** Sustainability\
**Primary audience:** Government departments, municipal councils, local
authorities, water-management operators\
**Project location/context:** Lefke, Cyprus\
**Development context:** 48-hour hackathon; all field hardware and
operational data are simulated\
**Team size:** 5 members, with one primary page owner per application
page

------------------------------------------------------------------------

## 1. Project Vision

Aqua Grid is a web-based monitoring and decision-support concept for the
water channels running through and around Lefke, Cyprus.

The concept is to place distributed sensors along existing water
channels and at selected pools or flow-control points. These sensors
would measure water conditions at different locations. By comparing
measurements along the network, the system could help operators identify
unexpected reductions in flow, understand where further inspection may
be needed, and identify locations that may be suitable for small-scale
micro-hydropower generation.

The long-term vision is a more observable, efficient, and potentially
energy-supporting water infrastructure. Electricity generated at
suitable locations could help power parts of the monitoring system, such
as sensors and communications equipment, subject to engineering,
environmental, operational, and regulatory assessment.

**The hackathon deliverable is a convincing interactive web prototype
that demonstrates this concept. It is not a deployed water-management
system and does not use real measurements from Lefke.**

### Product statement

> Aqua Grid turns an existing water-channel network into a monitored,
> data-informed infrastructure concept: observe the flow, identify
> unusual changes, and evaluate opportunities for sustainable
> micro-hydropower.

### Suggested tagline

**Every Drop Counts. Every Flow Matters.**

------------------------------------------------------------------------

## 2. Problem Definition

Water channels in and around Lefke carry running water through the city
and toward surrounding villages. Based on the problem description
motivating this project, the water level appears to decrease along some
sections of the channels and may become very low or disappear before
reaching certain outlying areas.

At present, the project assumes that there is no unified digital
monitoring interface giving operators a continuous, network-wide view of
water conditions along these channels. The absence of such visibility
can make it difficult to determine:

-   Where and when the water level or flow begins to decrease.
-   Whether a change is local or affects a longer section of the
    network.
-   Which sections should be inspected first.
-   Whether the observed reduction is associated with a leak, an
    authorised withdrawal, a branch or diversion, a temporary
    operational change, or a measurement issue.
-   Whether any locations have sufficient flow and usable height
    difference to justify investigating micro-hydropower generation.

The project must present these as **problems to investigate**, not as
proven causes. A reduction between two sensors does not, by itself,
prove that water is leaking.

### Why this matters

-   **Water stewardship:** Better visibility can support more informed
    inspection and water-distribution decisions.
-   **Agriculture and communities:** More reliable information may help
    operators investigate whether water is reaching the intended areas.
-   **Renewable energy:** Some locations may have suitable conditions
    for small-scale energy recovery, but feasibility must be measured
    rather than assumed.
-   **Public infrastructure:** A shared monitoring interface can help
    municipal and water-management teams understand network conditions
    and prioritise maintenance.

------------------------------------------------------------------------

## 3. Proposed Solution

Aqua Grid consists of four connected capabilities.

### 3.1 Monitor the network

Represent the channel network as a set of connected sections, with
sensor stations at selected points. Each station reports simulated
measurements such as:

-   Water level.
-   Estimated flow rate.
-   Flow velocity, if included in the simulation.
-   Sensor connectivity and last-update time.
-   Operating status.

The prototype should show these measurements in a central dashboard and
on an interactive map.

### 3.2 Analyse changes in flow

Compare upstream and downstream measurements to identify unusual
changes. The prototype should be able to:

-   Display the difference between selected sensor readings.
-   Highlight a section when the difference exceeds a configurable
    demonstration threshold.
-   Generate an alert that asks an operator to investigate.
-   Show the time at which the change was detected and the sensors
    involved.

Use careful language such as **"unusual flow reduction detected"**,
**"possible loss"**, or **"inspection recommended."** Do not state that
a leak has been confirmed.

A real deployment would need to account for channel branches, authorised
water withdrawals, gates, storage pools, changes in channel geometry,
sensor accuracy, and time synchronisation before attributing a
difference to water loss.

### 3.3 Explore micro-hydropower opportunities

The concept includes evaluating selected locations for small-scale
hydroelectric generation. The prototype may display illustrative
candidate locations and an energy estimate based on user-adjustable
assumptions.

The basic theoretical estimate is:

\[ P = `\rho `{=tex}g Q H `\eta`{=tex} \]

Where:

-   \(P\) = estimated electrical power in watts.
-   (`\rho`{=tex}) = water density, approximately 1000 kg/m³ for a
    simplified demonstration.
-   \(g\) = gravitational acceleration, approximately 9.81 m/s².
-   \(Q\) = flow rate in m³/s.
-   \(H\) = usable net hydraulic head in metres.
-   (`\eta`{=tex}) = assumed overall efficiency, expressed as a value
    from 0 to 1.

If the user interface accepts flow in litres per second, convert it to
cubic metres per second before calculating:

\[ Q\_{m\^3/s} = `\frac{Q_{L/s}}{1000}`{=tex} \]

Estimated energy over a period is:

\[ E\_{kWh} = `\frac{P_{W} \times \text{operating hours}}{1000}`{=tex}
\]

All energy figures in the hackathon prototype must be labelled
**illustrative estimates based on simulated inputs**. Do not claim that
a specific Lefke site can generate a particular amount of electricity.

Any real installation would require field measurements and assessment of
irrigation needs, environmental flows, sediment, flood capacity,
maintenance, safety, permits, and possible effects on existing or
historic structures. The prototype should communicate that water
delivery remains the primary purpose of the channel.

### 3.4 Provide an operator-facing web application

The web application is the main hackathon deliverable. It should make
the concept understandable to a municipal or government audience through
a polished interface, credible simulated data, and a short demonstration
scenario.

------------------------------------------------------------------------

## 4. Scope and Hackathon Constraints

### In scope

-   A responsive web application prototype.
-   Four primary pages: Dashboard, Network Map, Sensor Details, and
    Impact / About.
-   Simulated sensor stations and channel data.
-   Semi-dynamic readings that fluctuate around configurable baseline
    values.
-   A manually triggered crisis scenario that causes a sudden reduction
    in water level and/or flow at selected stations.
-   Alerts and visual indicators driven by the simulated data.
-   A clear visual distinction between normal, warning, critical, and
    offline states.
-   A coherent demo flow suitable for a hackathon jury.
-   A shared application layout and consistent design system.

### Out of scope for the 48-hour prototype

-   Physical sensor construction or installation.
-   Real-time connection to field devices.
-   Claims that the displayed values are measured in Lefke.
-   Production-grade authentication, authorisation, or user management.
-   A production database or long-term data retention system.
-   Actual remote control of water gates, pumps, turbines, or other
    infrastructure.
-   An AI model that predicts leaks or diagnoses their causes.
-   Engineering certification or confirmation of hydropower feasibility.

### Mandatory transparency

The application must visibly communicate that:

1.  Sensor readings are simulated.
2.  Sensor locations and channel geometry are illustrative unless
    verified field coordinates are supplied.
3.  Alerts identify unusual patterns for investigation; they do not
    prove leakage.
4.  Hydropower values are theoretical estimates based on simulated
    assumptions.

Suggested persistent label:

**DEMO MODE --- SIMULATED SENSOR DATA**

Do not hide this disclaimer in a settings page or only in the About
section.

------------------------------------------------------------------------

## 5. Target Users and Their Needs

The primary users are public-sector and infrastructure stakeholders,
rather than casual consumers.

  -----------------------------------------------------------------------
  User                    Main need               Relevant application
                                                  capability
  ----------------------- ----------------------- -----------------------
  Municipal               Understand the overall  Dashboard, high-level
  decision-maker          condition of the        statistics, impact
                          network                 summary

  Water-management        Identify sections that  Map, sensor details,
  operator                need inspection         alerts, flow
                                                  comparisons

  Maintenance team        Find a sensor or        Sensor status, last
                          section with abnormal   update, historical
                          status                  charts

  Sustainability /        Understand potential    Impact page,
  planning officer        environmental and       illustrative energy
                          energy benefits         estimates

  Project evaluator /     Understand the problem  Guided demo, crisis
  hackathon jury          and see the solution    simulation, clear
                          working                 explanations
  -----------------------------------------------------------------------

The interface should use plain, professional language. Avoid unexplained
engineering jargon and avoid presenting speculative figures as official
municipal data.

------------------------------------------------------------------------

## 6. Application Information Architecture

The application has four primary pages and a shared global navigation
panel on the left.

### Global layout

-   Fixed or persistent left-side navigation on desktop.
-   Main content area in the centre.
-   Optional contextual side panel on pages that need it.
-   Responsive behaviour for smaller screens: navigation should collapse
    into a drawer or compact menu.
-   Consistent header treatment, typography, spacing, cards, status
    colours, and chart styles.
-   Clear page titles and concise descriptions.
-   A visible Demo Mode indicator.

### Primary navigation

1.  **Dashboard** --- overall network overview.
2.  **Network Map** --- geographic or schematic view of channels and
    sensors.
3.  **Sensors** --- sensor list and individual sensor details.
4.  **Impact / About** --- project explanation and sustainability
    contribution.

The Sensor Details page should support a selected sensor, for example
through a route such as `/sensors/:sensorId`. The Sensors navigation
item may open a sensor directory or a sensible default sensor selection.

------------------------------------------------------------------------

## 7. Page Requirements

## 7.1 Dashboard --- Network Overview

**Purpose:** Give a municipal decision-maker a quick understanding of
the simulated network's current state.

### Layout

-   Global navigation on the left.
-   Page title and Demo Mode indicator at the top.
-   A row of summary cards near the top.
-   A central temporal overview chart.
-   A right-side panel for alerts, recent events, and operational
    statistics.
-   On narrow screens, stack the right-side panel below the chart.

### Suggested summary cards

Use a small set of meaningful metrics:

-   **Active Sensors:** number of sensors currently online.
-   **Network Flow:** aggregate or selected network flow, with the
    aggregation method explained.
-   **Sensors Requiring Attention:** count of warning and critical
    sensors.
-   **Open Alerts:** number of unresolved simulated alerts.
-   **Estimated Power Potential:** optional illustrative value, clearly
    distinguished from generated electricity.

Do not sum sensor flow readings and call the result "total network flow"
if those sensors are measuring the same water at different points along
one channel. For the prototype, either show a clearly defined
representative measurement (for example, the flow at a selected
reference station) or label the value as a demonstration metric.

### Temporal overview chart

-   Show flow over time for one or more selected sensors.
-   Include a clear time range selector, such as 1 hour, 24 hours, or 7
    days.
-   Provide readable axes, units, legends, and tooltips.
-   Update the current reading as simulated values change.
-   Make the crisis scenario visible as a sharp change in the graph.

### Alerts and event panel

Show recent events, for example:

-   "Unusual flow reduction detected between S02 and S03."
-   "Sensor S04 has stopped reporting."
-   "Flow at S03 returned to its normal range."
-   "Crisis simulation activated."

Each event should include a timestamp, severity, affected sensor or
channel section, and a short explanation.

### Acceptance criteria

-   A visitor can understand the network's simulated status within a few
    seconds.
-   Summary cards update when the simulation changes.
-   The temporal chart responds to the selected time range or selected
    sensor.
-   Activating the crisis scenario changes the relevant status
    indicators and creates an alert.
-   All values are identifiable as simulated.

------------------------------------------------------------------------

## 7.2 Network Map --- Channel and Sensor Explorer

**Purpose:** Show where the monitoring stations are located and how they
relate to the channel network.

### Layout

-   Collapsible global navigation on the left.
-   Map occupying most of the central area.
-   An editing / configuration panel on the right.
-   The right panel may be collapsible to provide more map space.

### Map implementation

The requested visual is a Google Maps overview. Use a Google Maps
integration if an API key and suitable configuration are available.

-   Read the API key from an environment variable, for example
    `VITE_GOOGLE_MAPS_API_KEY`.
-   Never commit a real API key to source control.
-   If the key is missing or the map cannot load, show a polished
    schematic map or local SVG fallback rather than a blank page.
-   Do not invent precise sensor coordinates or imply that illustrative
    coordinates are surveyed locations.
-   If illustrative markers are placed on a real map, label them as
    demonstration locations.
-   If exact locations are not available, prefer a clearly labelled
    schematic network diagram.

### Map content

-   Channel lines / canal sections.
-   Sensor markers.
-   Optional pools, junctions, or candidate micro-hydropower points.
-   A legend explaining marker colours and symbols.
-   A small map status summary, such as total demonstration sensors and
    active alerts.

### Sensor marker behaviour

Each sensor marker should have a visual status:

-   Green: Normal.
-   Amber: Warning.
-   Red: Critical.
-   Grey: Offline.

Clicking a marker opens a compact information pop-up containing:

-   Sensor name and ID.
-   Current flow rate and unit.
-   Current water level and unit.
-   Status.
-   Last update time.
-   A button or link to open that sensor's detail page.

The detail navigation must preserve the selected sensor ID.

### Right-side edit panel

The panel is for demonstrating how the network could be configured. It
should support:

-   Add a demonstration sensor.
-   Select or edit a sensor's display name and basic properties.
-   Draw a channel line or add a channel segment, if practical within
    the available map library.
-   Select a sensor or channel segment.
-   Remove a demonstration item, with a confirmation step if deletion is
    implemented.

Changes can remain in client-side application state. Persistent storage
is not required.

Clearly distinguish between **map editing in the prototype** and actual
changes to physical infrastructure. The application must not imply that
drawing a line installs a channel or that adding a marker installs a
sensor.

### Acceptance criteria

-   The map or schematic is visible and usable without a valid Google
    Maps key.
-   All demo sensors can be identified visually.
-   Clicking a sensor opens a useful quick-information pop-up.
-   The pop-up can navigate to the correct sensor detail page.
-   Marker status changes when the simulation or crisis scenario
    changes.
-   Editing actions affect the displayed prototype state, not real
    infrastructure.

------------------------------------------------------------------------

## 7.3 Sensor Details --- Individual Station View

**Purpose:** Let an operator inspect one sensor in more detail.

### Navigation and selection

-   Open this page from a sensor pop-up on the map or from a sensor
    list.
-   Use a route such as `/sensors/S03`.
-   The page must load the sensor identified by the route parameter.
-   If the ID is unknown, show a friendly not-found state with a link
    back to the map or sensor list.

### Sensor overview

Display:

-   Sensor name and unique ID.
-   Channel section / illustrative location.
-   Current operating status.
-   Current water level.
-   Current estimated flow rate.
-   Optional flow velocity.
-   Last update time.
-   Connection / battery status, if these are included in the
    simulation.

### Temporal graphs

Include at least one useful time-series chart. Prefer:

-   Water flow over time.
-   Water level over time.

If both charts are implemented, make them visually distinct and provide
units and tooltips. Provide a time-range selector such as 1 hour, 24
hours, and 7 days.

### Sensor metadata

A compact metadata panel may show:

-   Sensor type.
-   Demonstration installation date.
-   Reporting interval.
-   Simulated battery level.
-   Simulated signal strength.
-   Associated channel segment.
-   Upstream / downstream relationship, if defined.

These are simulated properties and should be treated as such.

### Sensor-specific events

Show recent events affecting this sensor, such as warning thresholds
crossed, offline periods, or recovery after the crisis simulation.

### Acceptance criteria

-   The page always displays the sensor selected by its route.
-   Navigating from different map markers opens different sensor
    records.
-   Current values and graphs update from the shared simulation state.
-   An unknown sensor ID produces a graceful error state.
-   The page clearly distinguishes simulated telemetry from real
    measurements.

------------------------------------------------------------------------

## 7.4 Impact / About --- Project and Sustainability

**Purpose:** Explain why Aqua Grid matters, how it addresses the stated
problem, and how it relates to sustainability goals.

This page should communicate the project to a non-technical
public-sector audience.

### Recommended sections

1.  **The Challenge**

    -   Explain the water-channel monitoring problem in Lefke.
    -   Describe the lack of network-wide visibility as the problem the
        concept aims to address.
    -   Avoid asserting unverified causes of reduced flow.

2.  **Our Approach**

    -   Distributed monitoring stations.
    -   Network-wide visualisation.
    -   Flow comparison and anomaly alerts.
    -   Assessment of suitable micro-hydropower opportunities.
    -   A shared interface for operators and decision-makers.

3.  **Expected Benefits**

    -   Earlier visibility of unusual flow changes.
    -   Better prioritisation of field inspections.
    -   More informed water-management decisions.
    -   Evidence to support future infrastructure planning.
    -   Potential renewable electricity at technically suitable sites.
    -   Potential energy support for parts of the monitoring network.

4.  **United Nations Sustainable Development Goals**

    -   **SDG 6 --- Clean Water and Sanitation:** supports better
        observation and management of water resources.
    -   **SDG 7 --- Affordable and Clean Energy:** explores small-scale
        renewable energy recovery where technically and environmentally
        appropriate.
    -   **SDG 9 --- Industry, Innovation and Infrastructure:**
        demonstrates digital monitoring and more informed infrastructure
        management.
    -   **SDG 11 --- Sustainable Cities and Communities:** supports
        resilient local infrastructure and public-service planning.
    -   **SDG 12 --- Responsible Consumption and Production:**
        encourages more efficient use of available water and
        infrastructure resources.
    -   **SDG 13 --- Climate Action:** explores local resilience and
        renewable-energy opportunities.

    Describe these as the project's intended contributions or areas of
    alignment, not as achieved SDG outcomes.

5.  **Implementation Roadmap**

    -   Phase 1: field survey and stakeholder consultation.
    -   Phase 2: pilot sensor installation at selected points.
    -   Phase 3: calibration and data collection.
    -   Phase 4: anomaly analysis and operational evaluation.
    -   Phase 5: micro-hydropower feasibility study at selected sites.
    -   Phase 6: expansion based on measured results and stakeholder
        approval.

6.  **Limitations and Next Steps**

    -   The current prototype uses simulated data.
    -   Real sensor selection and placement require a field survey.
    -   Flow reduction requires investigation before it can be
        attributed to leakage.
    -   Hydropower potential depends on measured flow, usable head,
        efficiency, and operational constraints.
    -   A real system would require permissions, maintenance planning,
        cybersecurity, and integration with responsible authorities.

### Acceptance criteria

-   The page explains the problem, solution, expected benefits, and
    roadmap.
-   SDG references are accurate and not presented as certification or
    proof of impact.
-   The page states that the current prototype is simulated.
-   The content is concise, visual, and understandable to non-technical
    stakeholders.

------------------------------------------------------------------------

## 8. Simulation and Data Behaviour

Simulation quality is central to the demonstration. The app should feel
coherent and responsive without pretending to be connected to physical
devices.

### 8.1 Shared simulated network

Create one shared simulation service or state store used by all pages.
Do not create independent random values separately inside each page. The
same sensor must show consistent values on the dashboard, map, and
detail page.

Each sensor should have:

-   A stable ID.
-   A display name.
-   A baseline flow rate.
-   A baseline water level.
-   A current flow rate.
-   A current water level.
-   A status.
-   A last-update timestamp.
-   Optional simulated hardware metadata.
-   A channel segment association.

Suggested initial demonstration sensors:

  ID    Display name         Baseline flow   Baseline level Initial status
  ----- ------------------ --------------- ---------------- ----------------
  S01   Upper Channel             12.0 L/s           0.42 m Normal
  S02   Central Channel           10.5 L/s           0.38 m Normal
  S03   Village Approach           8.0 L/s           0.31 m Normal
  S04   Lower Channel              6.5 L/s           0.25 m Normal

These are **fictional demonstration values**, not measurements from
Lefke. They are chosen only to make the prototype understandable. They
can be adjusted to produce a clear demo.

### 8.2 Semi-dynamic readings

-   Update readings at a manageable interval, for example every 2--3
    seconds.
-   Generate small fluctuations around each sensor's baseline.
-   Use bounded variation so readings remain plausible and do not jump
    randomly across the full range.
-   Keep the values stable enough for a live presentation.
-   Derive status from configurable thresholds rather than assigning
    random statuses.
-   Use one shared update mechanism so all pages remain synchronised.
-   Keep a rolling history buffer for charts.

A simple demonstration approach is to vary each baseline by a small
random percentage, while applying any active scenario as a separate
multiplier or state change.

### 8.3 Crisis scenario

Provide a clearly visible **Trigger Crisis Simulation** action. The
action should be available from a logical location such as the dashboard
and/or a dedicated demo controls panel.

When activated:

1.  Change the flow and water-level values of one or more downstream
    sensors sharply.
2.  Keep upstream sensors stable unless the chosen scenario explicitly
    affects them.
3.  Update sensor statuses based on the configured thresholds.
4.  Generate a timestamped alert describing the affected sensor or
    channel section.
5.  Update dashboard summary cards, map marker colours, sensor detail
    values, and temporal charts.
6.  Add a crisis event to the event log.

The crisis should be repeatable and reversible. Provide a **Reset
Simulation** action that restores baseline behaviour and clears or
archives scenario-specific alerts in a predictable way.

Suggested demo scenario:

-   S01 and S02 remain near normal.
-   S03 experiences a sudden flow reduction.
-   S04 experiences a larger downstream reduction.
-   The system flags the S02--S03 and/or S03--S04 sections for
    inspection, depending on the configured comparison logic.

The application should say **"Unexpected downstream flow reduction ---
inspection recommended"**, not **"Leak confirmed."**

### 8.4 Alerts and thresholds

Use a simple deterministic rule-based system. Machine learning is not
required for this prototype.

Possible rules:

-   **Warning:** current flow is below a configurable percentage of that
    sensor's baseline for a defined number of updates.
-   **Critical:** current flow is below a lower configurable percentage
    of baseline.
-   **Offline:** no simulated update has been received within a
    configured time.
-   **Section anomaly:** the upstream/downstream difference exceeds a
    configurable demonstration threshold.

Thresholds must be configurable in code or through a small demo settings
panel. Clearly label them as demonstration thresholds that would need
calibration with real data.

Avoid generating a new duplicate alert on every simulation tick. Create
an alert when a condition changes state, and update or resolve it when
the condition clears.

### 8.5 Data history

Maintain a rolling in-memory history for charts. A simple implementation
is sufficient:

-   Timestamp.
-   Sensor ID.
-   Flow rate.
-   Water level.
-   Status.

The history does not need to survive a page refresh. It should remain
shared while navigating between pages during the demo.

------------------------------------------------------------------------

## 9. Suggested Data Model

The implementation team may adjust the structure, but all pages should
agree on a shared data contract.

### Sensor

``` ts
type SensorStatus = "normal" | "warning" | "critical" | "offline";

interface Sensor {
  id: string;
  name: string;
  channelSegmentId: string;
  location: {
    lat?: number;
    lng?: number;
    label: string;
    isIllustrative: boolean;
  };
  baseline: {
    flowRateLps: number;
    waterLevelM: number;
  };
  current: {
    flowRateLps: number;
    waterLevelM: number;
    flowVelocityMps?: number;
    batteryPercent?: number;
    signalPercent?: number;
    updatedAt: string;
  };
  status: SensorStatus;
}
```

### Channel segment

``` ts
interface ChannelSegment {
  id: string;
  name: string;
  upstreamSensorId?: string;
  downstreamSensorId?: string;
  path: Array<{ lat: number; lng: number }>;
  isIllustrative: boolean;
}
```

### Alert

``` ts
type AlertSeverity = "info" | "warning" | "critical";

interface AquaAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  sensorIds: string[];
  channelSegmentId?: string;
  createdAt: string;
  status: "active" | "resolved";
  source: "simulation" | "system";
}
```

### Telemetry point

``` ts
interface TelemetryPoint {
  timestamp: string;
  sensorId: string;
  flowRateLps: number;
  waterLevelM: number;
}
```

Use ISO timestamps. Keep units explicit in property names or
documentation. Do not mix litres per second and cubic metres per second
without conversion.

------------------------------------------------------------------------

## 10. Technical Architecture

### Required stack

-   **Frontend:** React + Vite.
-   **Backend runtime:** Node.js.
-   **Styling:** Tailwind CSS.
-   **Charts:** A React-compatible chart library such as Recharts.
-   **Map:** Google Maps integration if credentials are available;
    otherwise an SVG/schematic fallback.
-   **Routing:** React Router or an equivalent lightweight routing
    solution.
-   **Shared state:** React Context, Zustand, or another lightweight
    approach.
-   **Simulation:** Client-side service or shared state module.

### Keep the architecture hackathon-friendly

The prototype does not need a complex backend. Since all values are
simulated, the simulation can run in the frontend and be shared across
routes. A small Node.js server may be added if the team needs a backend
endpoint or wants to demonstrate a future API boundary, but do not build
unnecessary infrastructure.

If a backend is used:

-   Keep the API small and documented.
-   Use a single source of truth for simulated sensor state.
-   Do not duplicate simulation logic in both frontend and backend.
-   Ensure the app can still be demonstrated reliably in the chosen
    local setup.

### Suggested project structure

``` text
aqua-grid/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── AppProviders.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── cards/
│   │   ├── charts/
│   │   ├── map/
│   │   ├── sensors/
│   │   └── alerts/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── NetworkMapPage.tsx
│   │   ├── SensorDetailsPage.tsx
│   │   └── ImpactPage.tsx
│   ├── simulation/
│   │   ├── simulationEngine.ts
│   │   ├── demoData.ts
│   │   ├── alertRules.ts
│   │   └── types.ts
│   ├── context/
│   │   └── NetworkContext.tsx
│   ├── hooks/
│   ├── utils/
│   └── main.tsx
├── .env.example
├── package.json
└── README.md
```

This is a suggested structure, not a requirement to create every folder.
Keep the codebase as small as possible while maintaining clear ownership
and integration boundaries.

### Environment configuration

Use `.env.example` to document required configuration, for example:

``` env
VITE_GOOGLE_MAPS_API_KEY=
```

Do not commit `.env` files containing real secrets. If the map key is
unavailable, the fallback map must work.

------------------------------------------------------------------------

## 11. Visual and Interaction Direction

The application should feel like a modern public-infrastructure
monitoring platform: professional, calm, data-oriented, and easy to
understand.

### Design principles

-   Prioritise readability over decoration.
-   Use a consistent spacing and typography system.
-   Use clear labels and units on every metric.
-   Use colour to communicate state, not as decoration.
-   Keep charts uncluttered and readable.
-   Make important alerts visible without overwhelming the page.
-   Use responsive layouts.
-   Ensure controls have clear labels and visible interaction states.
-   Provide empty, loading, and error states where appropriate.

### Suggested visual language

-   Deep navy, slate, or charcoal for the main interface.
-   Neutral surfaces for cards and panels.
-   Blue/teal accents associated with water and monitoring.
-   Green for normal.
-   Amber for warning.
-   Red for critical.
-   Grey for offline or unavailable.

Use the same status colours consistently across the dashboard, map,
sensor pages, and alert list. Do not rely on colour alone: include text
labels or icons as well.

------------------------------------------------------------------------

## 12. Five-Person Team and Agent Ownership

Each team member owns one primary page or shared responsibility.
However, the shared layout, data model, simulation contract, and design
system must be agreed before parallel implementation begins.

  -----------------------------------------------------------------------
  Owner                   Primary responsibility  Deliverables
  ----------------------- ----------------------- -----------------------
  Member 1                Dashboard               Summary cards, temporal
                                                  overview, alert/event
                                                  panel

  Member 2                Network Map             Map or schematic,
                                                  channel paths, sensor
                                                  markers, pop-ups, edit
                                                  panel

  Member 3                Sensor Details          Sensor route, selected
                                                  sensor overview,
                                                  telemetry charts,
                                                  metadata

  Member 4                Impact / About          Problem, solution,
                                                  benefits, SDG
                                                  alignment, roadmap,
                                                  limitations

  Member 5                Integration and         App shell, navigation,
                          simulation              shared types/state,
                                                  simulated data, crisis
                                                  controls, integration
                                                  and final QA
  -----------------------------------------------------------------------

If the team prefers to have all five members implement page features,
assign the fifth member to the shared simulation and integration work as
a cross-page owner rather than creating an unnecessary fifth page.

### Shared rules for all contributors

-   Use the agreed TypeScript interfaces and property names.
-   Import shared sensor and alert data; do not create page-specific
    copies.
-   Do not implement a separate random-data generator inside a page.
-   Use the shared status definitions and units.
-   Do not modify shared routing, layout, or global state without
    communicating with the integration owner.
-   Build page components so they can be integrated into the shared
    application shell.
-   Use realistic but explicitly fictional content.
-   Do not claim that a sensor, channel, or generator has been
    physically installed.

### Parallel-agent workflow

Before coding, the integration owner should create the project skeleton
and commit the shared interfaces, route definitions, layout shell, and
mock data contract. Then page owners can work in parallel against those
contracts.

Each page owner should provide:

1.  The page component.
2.  Any page-specific components.
3.  Any page-specific styles or configuration.
4.  A short note listing imports, assumptions, and required shared
    interfaces.
5.  A brief manual test checklist.

Avoid having multiple agents edit the same global files at the same
time. Agree on filenames and exported component names before delegating
tasks.

------------------------------------------------------------------------

## 13. Suggested Agent Prompts

The following prompts can be given to coding agents. Replace the owner
name or repository context as needed.

### Agent 1 --- Dashboard

> You are responsible for implementing the Aqua Grid Dashboard page in
> an existing React + Vite + Tailwind CSS application. Follow the shared
> project specification and use the shared Sensor, Alert, and
> TelemetryPoint types and shared simulation state. Build a polished
> public-infrastructure monitoring dashboard with summary cards, a
> temporal flow chart, and a recent alerts/events panel. The dashboard
> must update when the shared crisis simulation is triggered. Do not
> create independent random sensor data. Do not invent real Lefke
> measurements. Display a persistent or clearly visible "Demo Mode ---
> Simulated Data" label. Do not change global routing or the shared app
> shell unless explicitly requested. Deliver the page component,
> supporting components, and a concise integration note.

### Agent 2 --- Network Map

> You are responsible for implementing the Aqua Grid Network Map page in
> an existing React + Vite + Tailwind CSS application. Show illustrative
> channel segments and shared simulated sensor stations. Use Google Maps
> only if the configured API key is available; otherwise provide a
> polished schematic/SVG fallback that works without credentials. Sensor
> markers must reflect shared sensor status. Clicking a marker must open
> a pop-up with the sensor ID, current flow, water level, status, last
> update, and a navigation action to that sensor's detail route. Include
> a collapsible right-side demonstration edit panel for
> adding/selecting/editing illustrative sensors or channel lines if
> feasible. Keep all changes in prototype state; do not imply that map
> edits alter physical infrastructure. Do not invent surveyed
> coordinates. Do not create independent random data. Deliver the page
> and an integration note.

### Agent 3 --- Sensor Details

> You are responsible for implementing the Aqua Grid Sensor Details page
> in an existing React + Vite + Tailwind CSS application. The page must
> read the sensor ID from the route and display the corresponding record
> from the shared simulation state. Include current flow, water level,
> status, last update, optional simulated device metadata, and
> historical time-series charts. Support a clear not-found state for
> unknown IDs. Values and charts must remain consistent with the
> dashboard and map and must respond to the shared crisis simulation. Do
> not generate independent random values or invent real-world
> measurements. Display a clear simulated-data label. Do not change
> global routing unless coordinated with the integration owner. Deliver
> the page, supporting components, and an integration note.

### Agent 4 --- Impact / About

> You are responsible for implementing the Aqua Grid Impact / About page
> in an existing React + Vite + Tailwind CSS application. Explain the
> Lefke water-channel monitoring challenge, the proposed distributed
> sensor network, flow anomaly investigation, and the potential for
> micro-hydropower assessment. Present expected benefits and relevant UN
> Sustainable Development Goals: 6, 7, 9, 11, 12, and 13. Clearly
> distinguish intended contributions from achieved outcomes. Do not
> state unverified causes of water reduction as facts. Do not claim that
> hydropower feasibility has been proven. Include a practical
> implementation roadmap and limitations of the simulated hackathon
> prototype. Use a professional, accessible design consistent with the
> app. Deliver the page and an integration note.

### Agent 5 --- Integration, Shared State, and Simulation

> You are the integration owner for Aqua Grid, a React + Vite + Tailwind
> CSS hackathon prototype. Establish the shared app shell, navigation,
> route structure, TypeScript interfaces, shared simulation state,
> initial fictional sensor data, telemetry history, alert rules, and
> crisis/reset controls. Ensure every page reads the same sensor values
> and statuses. Implement bounded semi-dynamic fluctuations around
> stable baselines, and a repeatable crisis scenario that reduces
> downstream flow and water level, updates statuses, records alerts, and
> updates charts. Avoid duplicate alerts on every tick. Provide a reset
> action. Keep the implementation simple and robust for a live demo. The
> application must work without a backend and without a Google Maps API
> key. Do not claim that any data is real. Coordinate shared contracts
> with page owners before they implement against them.

------------------------------------------------------------------------

## 14. Demonstration Script for the Hackathon Jury

The prototype should support a short, repeatable demonstration. Aim for
approximately 3--5 minutes.

### Step 1 --- Introduce the problem

Explain that the concept addresses the lack of continuous visibility
along existing water channels and the need to investigate where flow
changes occur.

### Step 2 --- Show the dashboard

Point out the sensor count, current network status, flow trend, and
recent events. Explicitly mention that the data is simulated for the
hackathon prototype.

### Step 3 --- Explore the network map

Show the illustrative channel path and sensor stations. Click a sensor
and explain how an operator can inspect its current readings.

### Step 4 --- Open an individual sensor

Show its flow and water-level history, status, and simulated device
information.

### Step 5 --- Trigger the crisis scenario

Activate the crisis simulation. Show downstream readings falling, marker
colours changing, and an alert appearing. Explain that the platform
identifies a section requiring investigation; it does not automatically
diagnose a leak.

### Step 6 --- Explain the energy opportunity

Describe how flow and usable head measurements could be used to evaluate
micro-hydropower at suitable locations. If an energy calculator is
included, state that its result is an illustrative estimate, not a
measured output or feasibility finding.

### Step 7 --- Finish with impact

Connect the concept to water stewardship, resilient infrastructure,
renewable energy assessment, and the relevant SDGs. Emphasise that the
next real-world step would be a field survey and a small pilot with the
responsible local stakeholders.

------------------------------------------------------------------------

## 15. Definition of Done

The prototype is ready for presentation when all of the following are
true:

### Application

-   [ ] The application starts reliably using the documented commands.
-   [ ] All four pages are reachable through the global navigation.
-   [ ] The layout is responsive enough for the presentation device.
-   [ ] The Demo Mode / Simulated Data label is visible.
-   [ ] There are no blocking runtime errors.

### Shared simulation

-   [ ] At least four fictional sensors are available.
-   [ ] Sensor values fluctuate within bounded ranges.
-   [ ] The same sensor has consistent values across all pages.
-   [ ] Historical chart data is available.
-   [ ] The crisis scenario can be triggered.
-   [ ] The crisis scenario updates cards, charts, markers, and alerts.
-   [ ] The simulation can be reset.
-   [ ] Alerts do not duplicate on every update tick.

### Dashboard

-   [ ] Summary metrics are understandable and have units or
    definitions.
-   [ ] The temporal chart is readable.
-   [ ] Recent alerts/events are visible.
-   [ ] Crisis changes are reflected.

### Map

-   [ ] The map or schematic fallback loads without an API key.
-   [ ] Sensor markers show current statuses.
-   [ ] Marker pop-ups show useful information.
-   [ ] A pop-up can navigate to the correct sensor detail page.
-   [ ] Illustrative locations are clearly identified.

### Sensor Details

-   [ ] The selected sensor is determined by the route.
-   [ ] Current readings and charts use shared data.
-   [ ] Unknown IDs show a graceful not-found state.

### Impact / About

-   [ ] The problem and solution are explained clearly.
-   [ ] The intended sustainability contributions are described
    accurately.
-   [ ] SDG references are included.
-   [ ] Limitations and next steps are visible.

### Presentation

-   [ ] The team can complete the demonstration without relying on
    network access to external map services.
-   [ ] The crisis scenario has been rehearsed.
-   [ ] The team can explain what is simulated and what would need field
    validation.
-   [ ] No screen presents fictional values as official or measured
    Lefke data.

------------------------------------------------------------------------

## 16. Prioritisation for a 48-Hour Build

If time becomes limited, implement in this order:

### Must have

1.  Shared app shell and navigation.
2.  Shared simulated sensor data.
3.  Dashboard with summary cards and a working chart.
4.  Network schematic with clickable sensor markers.
5.  Sensor details route with current values and a chart.
6.  Crisis trigger and reset.
7.  Impact page with problem, solution, SDGs, and limitations.
8.  Visible simulated-data disclaimer.

### Should have

1.  Google Maps integration, if credentials and setup are ready.
2.  Right-side map editing panel.
3.  Configurable alert thresholds.
4.  Historical time-range selection.
5.  Simulated battery and connectivity information.

### Could have

1.  Micro-hydropower calculator.
2.  Channel drawing tools.
3.  Exporting a simulated report.
4.  Advanced filters and search.
5.  More elaborate animation or visual effects.

**Do not sacrifice the reliability of the core demonstration to add
optional features.** A coherent end-to-end scenario is more valuable
than many unfinished controls.

------------------------------------------------------------------------

## 17. Important Accuracy and Credibility Rules

Every contributor and agent must follow these rules:

-   Do not describe simulated readings as real measurements.
-   Do not present illustrative map positions as surveyed sensor
    installations.
-   Do not claim that the cause of a flow reduction is known.
-   Do not equate a difference between two sensor readings with
    confirmed leakage.
-   Do not claim that a micro-hydropower installation is feasible
    without measured flow and usable head.
-   Do not imply that adding a turbine is automatically sustainable;
    water delivery, environmental flow, sediment, flood capacity,
    maintenance, and permissions matter.
-   Do not describe SDG alignment as verified impact or certification.
-   Do not invent municipal partnerships, official approvals, project
    budgets, or measured savings.
-   Use "potential," "proposed," "illustrative," "simulated," and
    "subject to field validation" where appropriate.

### Core message to communicate

**Aqua Grid is a decision-support concept for making existing water
infrastructure more observable. It aims to help responsible authorities
identify where investigation is needed and evaluate whether selected
locations could support micro-hydropower without compromising the
primary purpose of water distribution.**

The hackathon prototype demonstrates the proposed workflow through a
simulated, interactive web application. A real deployment would begin
with stakeholder consultation, a field survey, calibrated pilot sensors,
and evidence-based evaluation.
