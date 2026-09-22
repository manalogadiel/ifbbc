import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { VisionValues } from './components/VisionValues';
import { CoreGroupsSection } from './components/CoreGroupsSection';
import { ServiceSchedule } from './components/ServiceSchedule';
import { LeadershipSection } from './components/LeadershipSection';
import { SermonPlayer } from './components/SermonPlayer';
import { GivingModule } from './components/GivingModule';
import { LocationSection } from './components/LocationSection';
import { Footer } from './components/Footer';
import { PlanVisitModal } from './components/PlanVisitModal';
import { PrayerWallModal } from './components/PrayerWallModal';

export const AppContent: React.FC = () => {
  const [visitModalOpen, setVisitModalOpen] = useState<boolean>(false);
  const [giveModalOpen, setGiveModalOpen] = useState<boolean>(false);
  const [prayerModalOpen, setPrayerModalOpen] = useState<boolean>(false);
  const [selectedServiceTime, setSelectedServiceTime] = useState<string>('10:00 AM');

  const handleOpenVisit = (serviceTime?: string) => {
    if (serviceTime) {
      setSelectedServiceTime(serviceTime);
    }
    setVisitModalOpen(true);
  };

  const handleScrollToSermons = () => {
    const el = document.getElementById('sermons');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-chalk-50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 ease-out relative selection:bg-royal-500 selection:text-white">
      {/* Precision Swiss Grid Background Overlay */}
      <div className="fixed inset-0 pointer-events-none swiss-grid-pattern z-0 opacity-80" />

      {/* Main Structural Wrapper */}
      <div className="relative z-10">
        {/* Navigation Bar */}
        <Navbar
          onOpenVisit={() => handleOpenVisit()}
          onOpenPrayer={() => setPrayerModalOpen(true)}
        />

        {/* Section 1: Hero with Optimized WebP Scroll Background */}
        <Hero
          onOpenPrayer={() => setPrayerModalOpen(true)}
          onScrollToSermons={handleScrollToSermons}
        />

        {/* Section 2: Vision & 10 Core Values */}
        <VisionValues />

        {/* 02 // 5 Core Groups & Event Poster Gallery */}
        <CoreGroupsSection />

        {/* 03 // Weekly Service Schedule */}
        <ServiceSchedule
          onOpenVisit={handleOpenVisit}
        />

        {/* 04 // Pastoral Leadership */}
        <LeadershipSection />

        {/* 05 // Expository Sermons & Media Archive */}
        <SermonPlayer />

        {/* 06 // Online Giving & BPI Stewardship */}
        <GivingModule />

        {/* 07 // Physical Campus & Location */}
        <LocationSection />

        {/* 08 // Liturgical Footer */}
        <Footer />
      </div>

      {/* Interactive Modals */}
      <PlanVisitModal
        isOpen={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        initialServiceTime={selectedServiceTime}
      />

      <PrayerWallModal
        isOpen={prayerModalOpen}
        onClose={() => setPrayerModalOpen(false)}
      />

      {giveModalOpen && (
        <GivingModule
          isModal={true}
          onClose={() => setGiveModalOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
