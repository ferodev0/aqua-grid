import { useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import './AboutPage.css';

const STORY_STOPS = [
  {
    number: '01',
    eyebrow: 'The challenge',
    title: 'A channel is a network, not a single reading.',
    body: 'In Lefke, understanding how water moves through a channel takes more than checking one point. Aqua Grid explores how distributed observations could give communities a clearer picture of changing conditions.',
    note: 'Changes in flow need investigation; their cause should not be assumed.',
    side: 'left',
  },
  {
    number: '02',
    eyebrow: 'Our approach',
    title: 'Connect the points. Make patterns easier to see.',
    body: 'A proposed network of monitoring stations brings flow readings into one shared view. Comparing locations over time could help surface unusual changes and guide where a closer look is needed.',
    note: 'The current dashboard is a working concept powered by simulated readings.',
    side: 'right',
  },
  {
    number: '03',
    eyebrow: 'What it could support',
    title: 'Better questions for better decisions.',
    body: 'Earlier visibility may help teams prioritise field inspections, make more informed water-management decisions, and build evidence for future infrastructure planning.',
    note: 'At suitable sites, measured data could also inform a micro-hydropower feasibility study—not prove one.',
    side: 'left',
  },
  {
    number: '04',
    eyebrow: 'A careful next step',
    title: 'Measure first. Expand with evidence.',
    body: 'A real deployment would begin with people and place: consult stakeholders, survey the channel, and select a small number of appropriate pilot sites.',
    note: 'Sensor placement, permissions, maintenance, and operating needs all require local evaluation.',
    side: 'right',
  },
  {
    number: '05',
    eyebrow: 'The bigger picture',
    title: 'Infrastructure that helps communities adapt.',
    body: 'Aqua Grid is intended to explore how practical monitoring can support responsible water use, resilient local services, and carefully assessed clean-energy opportunities.',
    note: 'These are areas of intended contribution, not achieved or certified outcomes.',
    side: 'left',
  },
];

const GOALS = [
  ['06', 'Clean water', 'Support better observation and management of water resources.'],
  ['07', 'Clean energy', 'Explore renewable energy recovery where appropriate.'],
  ['09', 'Resilient infrastructure', 'Use digital monitoring to inform infrastructure decisions.'],
  ['11', 'Sustainable communities', 'Support resilient local services and planning.'],
  ['12', 'Responsible resource use', 'Encourage more informed use of water and infrastructure.'],
  ['13', 'Climate action', 'Explore local resilience and renewable-energy opportunities.'],
];

const ROADMAP = [
  'Survey the channel and consult local stakeholders',
  'Select suitable sites for a small sensor pilot',
  'Install, calibrate, and collect real-world data',
  'Evaluate anomalies and operational usefulness',
  'Assess hydropower feasibility at selected sites',
  'Consider expansion with evidence and approval',
];

export function AboutPage({ title = 'Impact / About' }) {
  const storyRef = useRef(null);
  const waterPathRef = useRef(null);

  useEffect(() => {
    const story = storyRef.current;
    const waterPath = waterPathRef.current;
    const scroller = story?.closest('main');

    if (!story || !waterPath || !scroller) return undefined;

    const pathLength = waterPath.getTotalLength();
    waterPath.style.strokeDasharray = `${pathLength} ${pathLength}`;

    const updateWater = () => {
      const storyTop =
        story.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
      const progress = Math.min(
        1,
        Math.max(
          0,
          (scroller.scrollTop + scroller.clientHeight * 0.5 - storyTop) /
            story.offsetHeight,
        ),
      );

      waterPath.style.strokeDashoffset = `${pathLength * (1 - progress)}`;
    };

    updateWater();
    scroller.addEventListener('scroll', updateWater, { passive: true });
    window.addEventListener('resize', updateWater);

    return () => {
      scroller.removeEventListener('scroll', updateWater);
      window.removeEventListener('resize', updateWater);
    };
  }, []);

  return (
    <AppLayout title={title}>
      <div className="aqua-about">
        <section className="aqua-about-hero">
          <div className="aqua-about-hero-copy">
            <p className="aqua-about-kicker">
              <span className="aqua-about-kicker-mark" aria-hidden="true" />
              A clearer view of every drop
            </p>
            <h1>Follow the flow. Understand the whole channel.</h1>
            <p className="aqua-about-intro">
              Aqua Grid is a concept for connecting water-channel observations
              across Lefke—helping people see what is changing, where to look
              closer, and what to explore next.
            </p>
            <div className="aqua-about-hero-tags">
              <span>Water monitoring</span>
              <span>Shared insight</span>
              <span>Careful exploration</span>
            </div>
          </div>
          <div className="aqua-about-hero-mark" aria-hidden="true">
            <div className="aqua-about-drop">
              <svg viewBox="0 0 64 84" fill="none">
                <path
                  d="M32 4C24 19 9 35 9 51a23 23 0 1 0 46 0C55 35 40 19 32 4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M17 52c5-4 9-4 14 0s9 4 14 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
                <path
                  d="M21 62c4-3 7-3 11 0s7 3 11 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <span>LEFKE · WATER · COMMUNITY</span>
          </div>
          <div className="aqua-about-hero-foot">
            <span>THE IDEA</span>
            <span className="aqua-about-hero-rule" />
            <span>From a single reading to a connected picture</span>
          </div>
        </section>

        <section className="aqua-about-story-section">
          <div className="aqua-about-section-heading">
            <div>
              <p className="aqua-about-eyebrow">A connected story</p>
              <h2>Small observations. A clearer way forward.</h2>
            </div>
            <p>
              Follow the channel from the challenge to the questions this
              project hopes to help answer.
            </p>
          </div>

          <div className="aqua-about-story" ref={storyRef}>
            <svg
              className="aqua-about-canal"
              viewBox="0 0 100 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="aqua-about-canal-bed"
                d="M50 0 L50 105 L18 170 L18 285 L50 350 L82 420 L82 535 L50 600 L18 670 L18 785 L50 850 L50 1000"
              />
              <path
                ref={waterPathRef}
                className="aqua-about-canal-water"
                d="M50 0 L50 105 L18 170 L18 285 L50 350 L82 420 L82 535 L50 600 L18 670 L18 785 L50 850 L50 1000"
              />
            </svg>
            {STORY_STOPS.map((stop) => (
              <article
                className={`aqua-about-story-row aqua-about-story-row--${stop.side}`}
                key={stop.number}
              >
                <div className="aqua-about-story-card">
                  <div className="aqua-about-card-meta">
                    <span className="aqua-about-step">{stop.number}</span>
                    <span className="aqua-about-eyebrow">{stop.eyebrow}</span>
                  </div>
                  <h3>{stop.title}</h3>
                  <p>{stop.body}</p>
                  <p className="aqua-about-card-note">{stop.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="aqua-about-goals">
          <div className="aqua-about-section-heading">
            <div>
              <p className="aqua-about-eyebrow">Intended alignment</p>
              <h2>Part of a wider set of goals.</h2>
            </div>
            <p>
              The project explores connections to these UN Sustainable
              Development Goals. They describe intent—not proof of impact.
            </p>
          </div>
          <div className="aqua-about-goal-grid">
            {GOALS.map(([number, name, description]) => (
              <article className="aqua-about-goal-card" key={number}>
                <span className="aqua-about-goal-number">{number}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="aqua-about-next">
          <div className="aqua-about-next-intro">
            <p className="aqua-about-eyebrow">From concept to fieldwork</p>
            <h2>Build the evidence before the network.</h2>
            <p>
              A responsible next step is a measured one. Each phase should
              guide the next, with local knowledge and approval at the centre.
            </p>
          </div>
          <ol className="aqua-about-roadmap">
            {ROADMAP.map((phase, index) => (
              <li key={phase}>
                <span>0{index + 1}</span>
                <p>{phase}</p>
              </li>
            ))}
          </ol>
        </section>

        <aside className="aqua-about-prototype-note">
          <span className="aqua-about-note-icon" aria-hidden="true">
            i
          </span>
          <div>
            <h2>A concept, not a live monitoring system.</h2>
            <p>
              This prototype uses simulated sensor data. Real readings,
              suitable sensor locations, causes of flow changes, and any
              hydropower potential would all need to be established through
              fieldwork and technical assessment.
            </p>
          </div>
        </aside>
        <footer className="aqua-about-footer">
          <span>AQUA GRID</span>
          <span>Better visibility starts with better questions.</span>
        </footer>
      </div>
    </AppLayout>
  );
}
