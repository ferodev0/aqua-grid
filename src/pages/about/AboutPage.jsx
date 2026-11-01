import { useEffect, useRef } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useLanguage } from '../../context/LanguageContext';
import aboutContent from './aboutContent.json';
import './AboutPage.css';

const DEFAULT_EN_COPY = {
  hero: {
    kicker: 'A clear view of every drop',
    title: 'Observe the flow, spot the crack.',
    intro:
      'Aqua Grid is a concept for connecting water-channel observations across Lefke—helping local municipalities & producers to spot the water loss problems in the aqueducts and water canals.',
    tags: ['Water monitoring', 'Shared insight', 'Careful exploration'],
    mark: 'LEFKE · WATER · COMMUNITY',
    footLeft: 'THE IDEA',
    footRight: 'From a single reading to a connected picture',
  },
  storyHeading: {
    eyebrow: 'A connected story',
    title: 'Deep attention, plain route.',
    body: 'Follow the channel from the challenge to the questions this project hopes to help answer.',
  },
  storyStops: aboutContent.storyStops,
  goalsHeading: {
    eyebrow: 'Intended alignment',
    title: 'Part of a wider set of goals.',
    body: 'The project explores connections to these UN Sustainable Development Goals. They describe intent—not proof of impact.',
  },
  goals: aboutContent.goals,
  nextHeading: {
    eyebrow: 'From concept to fieldwork',
    title: 'Build the evidence before the network.',
    body: 'A responsible next step is a measured one. Each phase should guide the next, with local knowledge and approval at the centre.',
  },
  roadmap: aboutContent.roadmap,
  prototypeNote: {
    title: 'A concept, not a live monitoring system.',
    body: 'This prototype uses simulated sensor data. Real readings, suitable sensor locations, causes of flow changes, and any hydropower potential would all need to be established through fieldwork and technical assessment.',
  },
  footer: 'Better visibility starts with better questions.',
};

export function AboutPage({ title }) {
  const { language, t } = useLanguage();
  const storyRef = useRef(null);
  const waterPathRef = useRef(null);

  const copy =
    (language !== 'en' && aboutContent.localized?.[language]) ||
    DEFAULT_EN_COPY;

  useEffect(() => {
    const story = storyRef.current;
    const waterPath = waterPathRef.current;
    const scroller = story?.closest('main');

    if (!story || !waterPath || !scroller) return undefined;

    let renderedPathLength = waterPath.getTotalLength();
    const measureRenderedPath = () => {
      const pathLength = waterPath.getTotalLength();
      const transform = waterPath.getScreenCTM();
      if (!transform) return;

      const sampleCount = Math.ceil(pathLength / 2);
      let previousPoint;
      renderedPathLength = 0;

      for (let index = 0; index <= sampleCount; index += 1) {
        const point = waterPath.getPointAtLength(
          (pathLength * index) / sampleCount,
        );
        const x = transform.a * point.x + transform.c * point.y;
        const y = transform.b * point.x + transform.d * point.y;

        if (previousPoint) {
          renderedPathLength += Math.hypot(
            x - previousPoint.x,
            y - previousPoint.y,
          );
        }

        previousPoint = { x, y };
      }

      waterPath.style.strokeDasharray = `${renderedPathLength} ${renderedPathLength}`;
    };

    const leadPx = 80;

    const updateWater = () => {
      const storyCards = story.querySelectorAll('.aqua-about-story-row');
      const firstCard = storyCards[0];
      const lastCard = storyCards[storyCards.length - 1];

      if (!firstCard || !lastCard) {
        waterPath.style.strokeDashoffset = `${renderedPathLength}`;
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const firstCardRect = firstCard.getBoundingClientRect();
      const lastCardRect = lastCard.getBoundingClientRect();
      const scrollMarker =
        scrollerRect.top + scroller.clientHeight * 0.5 + leadPx;
      const firstCardCenter = firstCardRect.top + firstCardRect.height * 0.5;
      const lastCardCenter = lastCardRect.top + lastCardRect.height * 0.5;
      const distance = lastCardCenter - firstCardCenter;
      const progress =
        lastCardRect.bottom <= scrollerRect.bottom
          ? 1
          : Math.min(
              1,
              Math.max(
                0,
                distance > 0
                  ? (scrollMarker - firstCardCenter) / distance
                  : 0,
              ),
            );

      waterPath.style.strokeDashoffset = `${renderedPathLength * (1 - progress)}`;
    };

    const refreshCanal = () => {
      measureRenderedPath();
      updateWater();
    };

    refreshCanal();
    scroller.addEventListener('scroll', updateWater, { passive: true });
    window.addEventListener('resize', refreshCanal);

    const resizeObserver = new ResizeObserver(refreshCanal);
    resizeObserver.observe(story);

    return () => {
      scroller.removeEventListener('scroll', updateWater);
      window.removeEventListener('resize', refreshCanal);
      resizeObserver.disconnect();
    };
  }, [language]);

  return (
    <AppLayout title={title ?? t('nav.impact')}>
      <div className="aqua-about">
        <section className="aqua-about-hero">
          <div className="aqua-about-hero-copy">
            <p className="aqua-about-kicker">{copy.hero.kicker}</p>
            <h1>{copy.hero.title}</h1>
            <p className="aqua-about-intro">{copy.hero.intro}</p>
            <div className="aqua-about-hero-tags">
              {copy.hero.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
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
            <span>{copy.hero.mark}</span>
          </div>
          <div className="aqua-about-hero-foot">
            <span>{copy.hero.footLeft}</span>
            <span className="aqua-about-hero-rule" />
            <span>{copy.hero.footRight}</span>
          </div>
        </section>

        <section className="aqua-about-story-section">
          <div className="aqua-about-section-heading">
            <div>
              <p className="aqua-about-eyebrow">{copy.storyHeading.eyebrow}</p>
              <h2>{copy.storyHeading.title}</h2>
            </div>
            <p>{copy.storyHeading.body}</p>
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
            {copy.storyStops.map((stop) => (
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
              <p className="aqua-about-eyebrow">{copy.goalsHeading.eyebrow}</p>
              <h2>{copy.goalsHeading.title}</h2>
            </div>
            <p>{copy.goalsHeading.body}</p>
          </div>
          <div className="aqua-about-goal-grid">
            {copy.goals.map(([number, name, description]) => (
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
            <p className="aqua-about-eyebrow">{copy.nextHeading.eyebrow}</p>
            <h2>{copy.nextHeading.title}</h2>
            <p>{copy.nextHeading.body}</p>
          </div>
          <ol className="aqua-about-roadmap">
            {copy.roadmap.map((phase, index) => (
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
            <h2>{copy.prototypeNote.title}</h2>
            <p>{copy.prototypeNote.body}</p>
          </div>
        </aside>
        <footer className="aqua-about-footer">
          <span>AQUA GRID</span>
          <span>{copy.footer}</span>
        </footer>
      </div>
    </AppLayout>
  );
}
