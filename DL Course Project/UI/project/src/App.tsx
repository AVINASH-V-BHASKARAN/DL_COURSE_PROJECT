import { Suspense, lazy } from 'react';
import Navbar from '@/components/Navbar';
import AtmosphericBackground from '@/components/AtmosphericBackground';
import HeroSection from '@/components/HeroSection';
import OverviewSection from '@/components/OverviewSection';
import ScrollProgress from '@/components/ScrollProgress';

const PredictionPanel = lazy(() => import('@/components/PredictionPanel'));
const HistoricalExplorer = lazy(() => import('@/components/HistoricalExplorer'));
const LSTMWorkflow = lazy(() => import('@/components/LSTMWorkflow'));
const AirQualityGuide = lazy(() => import('@/components/AirQualityGuide'));
const Footer = lazy(() => import('@/components/Footer'));

function SectionFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime/20 border-t-lime" />
    </div>
  );
}

export default function App() {
  return (
    <div className="relative min-h-screen">
      <AtmosphericBackground />
      <ScrollProgress />
      <Navbar />
      <main>
        <HeroSection />
        <OverviewSection />
        <Suspense fallback={<SectionFallback />}>
          <PredictionPanel />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <HistoricalExplorer />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <LSTMWorkflow />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <AirQualityGuide />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <Footer />
        </Suspense>
      </main>
    </div>
  );
}
