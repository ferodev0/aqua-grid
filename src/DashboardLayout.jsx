import React, { useState } from 'react';
import './index.css'
export default function DashboardLayout() {
  // Menünün açık/kapalı durumunu tutan state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Dinamik Genişlikli Left Navigation Panel */}
      <aside 
        className={`bg-white flex flex-col border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Header Alanı ve Toggle Butonu */}
        <div className="p-6 flex items-center justify-between">
          <h1 
            className={`font-bold text-teal-600 tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${
              isSidebarOpen ? 'w-auto opacity-100 text-2xl' : 'w-0 opacity-0 text-[0px]'
            }`}
          >
            Aqua Grid
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-teal-600 focus:outline-none transition-colors"
            title={isSidebarOpen ? "Menüyü Daralt" : "Menüyü Genişlet"}
          >
            {/* Hamburger / Çarpı veya Yön İkonu (SVG) */}
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {isSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /> // Sola ok
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /> // Hamburger menü
              )}
            </svg>
          </button>
        </div>

        {/* Navigasyon Linkleri */}
        <nav className="flex flex-col gap-2 px-3 flex-1 overflow-x-hidden">
          <button 
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border transition-all whitespace-nowrap ${
              isSidebarOpen 
                ? 'bg-teal-50 text-teal-700 font-semibold border-teal-200' 
                : 'bg-transparent text-teal-600 border-transparent hover:bg-teal-50 justify-center'
            }`}
            title="Dashboard"
          >
            {/* Dashboard İkonu (Temsili) */}
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Dashboard
            </span>
          </button>
          
          <button 
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen 
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Network Map"
          >
            {/* Map İkonu */}
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Network Map
            </span>
          </button>
          
          <button 
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen 
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Sensors"
          >
            {/* Sensors İkonu */}
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Sensors
            </span>
          </button>
          
          <button 
            className={`flex items-center gap-4 text-left px-3 py-3 rounded-lg border border-transparent transition-all whitespace-nowrap ${
              isSidebarOpen 
                ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 justify-center'
            }`}
            title="Impact / About"
          >
            {/* Info İkonu */}
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Impact / About
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        
        {/* Header with Mandatory Disclaimer */}
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-800">Network Overview</h2>
          <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded text-sm font-bold border border-amber-300 tracking-wide shadow-sm">
            DEMO MODE — SIMULATED SENSOR DATA
          </div>
        </header>

        {/* Top Summary Cards (Flexbox) */}
        <section className="flex gap-4 mb-6">
          <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Estimated Power Potential</h3>
            <div className="text-3xl font-bold text-slate-800">-- W</div>
          </div>
          
          <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Active Sensors</h3>
            <div className="text-3xl font-bold text-slate-800">-- / --</div>
          </div>

          <div className="flex-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium mb-2">Network Flow</h3>
            <div className="text-3xl font-bold text-slate-800">-- L/s</div>
          </div>
        </section>

        {/* Adjacent Chart and Log Panels */}
        <section className="flex gap-3 flex-1 min-h-[450px]">
          
          {/* Chart Panel */}
          <div className="flex-[2] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Monthly Water Flow Rate</h3>
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">1H | 24H | 7D</div>
            </div>
            
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 bg-slate-50">
              [ Temporal Chart Placeholder ]
            </div>
          </div>

          {/* Sensor Status Logs Panel */}
          <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Sensor Status Logs</h3>
            
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">YYYY-MM-DD HH:MM</span>
                <span className="text-sm text-slate-600">[ Log Entry Placeholder ]</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">YYYY-MM-DD HH:MM</span>
                <span className="text-sm text-slate-600">[ Log Entry Placeholder ]</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-400 block mb-1">YYYY-MM-DD HH:MM</span>
                <span className="text-sm text-slate-600">[ Log Entry Placeholder ]</span>
              </div>
            </div>
          </div>
          
        </section>
      </main>
    </div>
  );
}