import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNetwork } from '../../context/NetworkContext';
import { DemoControls } from '../sensors/DemoControls';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    match: (pathname) => pathname === '/',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    ),
  },
  {
    id: 'map',
    label: 'Network Map',
    to: '/map',
    match: (pathname) => pathname.startsWith('/map'),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    ),
  },
  {
    id: 'sensors',
    label: 'Sensors',
    to: '/sensors',
    match: (pathname) => pathname.startsWith('/sensors'),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    id: 'impact',
    label: 'Impact / About',
    to: '/impact',
    match: (pathname) => pathname.startsWith('/impact'),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
];

/**
 * Shared shell adapted from origin/dashboard DashboardLayout design language.
 */
export function AppLayout({ title, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { pathname } = useLocation();
  const { demoBannerText } = useNetwork();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex items-center justify-between p-6">
          <h1
            className={`overflow-hidden whitespace-nowrap font-bold tracking-wide text-teal-600 transition-all duration-300 ${
              isSidebarOpen
                ? 'w-auto text-2xl opacity-100'
                : 'w-0 text-[0px] opacity-0'
            }`}
          >
            Aqua Grid
          </h1>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-teal-600 focus:outline-none"
            title={isSidebarOpen ? 'Menüyü Daralt' : 'Menüyü Genişlet'}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-x-hidden px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <NavLink
                key={item.id}
                to={item.to}
                title={item.label}
                className={`flex items-center gap-4 whitespace-nowrap rounded-lg border px-3 py-3 text-left transition-all ${
                  active
                    ? isSidebarOpen
                      ? 'border-teal-200 bg-teal-50 font-semibold text-teal-700'
                      : 'justify-center border-transparent bg-transparent text-teal-600 hover:bg-teal-50'
                    : `border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 ${
                        isSidebarOpen ? '' : 'justify-center'
                      }`
                }`}
              >
                <svg
                  className="h-6 w-6 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {item.icon}
                </svg>
                <span
                  className={`transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'hidden opacity-0'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <DemoControls collapsed={!isSidebarOpen} />
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto p-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
          <div className="rounded border border-amber-300 bg-amber-100 px-4 py-1.5 text-sm font-bold tracking-wide text-amber-700 shadow-sm">
            {demoBannerText}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
