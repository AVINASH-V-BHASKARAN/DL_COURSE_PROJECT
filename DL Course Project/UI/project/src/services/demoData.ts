import type { AqiBand } from '@/types';

// CPCB National Air Quality Index categories (India)
export const AQI_BANDS: AqiBand[] = [
  {
    label: 'Good',
    min: 0,
    max: 50,
    color: '#5BBA6F',
    textColor: '#0B3A16',
    advice: 'Air quality is satisfactory and poses minimal risk. Outdoor activities are safe for everyone.',
  },
  {
    label: 'Satisfactory',
    min: 51,
    max: 100,
    color: '#C6FF4D',
    textColor: '#0B2A05',
    advice: 'Minor breathing discomfort to sensitive people. Most activities remain safe.',
  },
  {
    label: 'Moderate',
    min: 101,
    max: 200,
    color: '#F7E05B',
    textColor: '#3A2F00',
    advice: 'Breathing discomfort for children, elderly, and people with lung or heart conditions.',
  },
  {
    label: 'Poor',
    min: 201,
    max: 300,
    color: '#FF9E3D',
    textColor: '#2A1400',
    advice: 'Breathing discomfort to most people on prolonged exposure. Reduce outdoor exertion.',
  },
  {
    label: 'Very Poor',
    min: 301,
    max: 400,
    color: '#FF5C4D',
    textColor: '#2A0606',
    advice: 'Respiratory illness on prolonged exposure. Sensitive groups should stay indoors.',
  },
  {
    label: 'Severe',
    min: 401,
    max: 500,
    color: '#7E0023',
    textColor: '#FFE5E5',
    advice: 'Serious health impact even on healthy people. Avoid all outdoor activity.',
  },
];

export function aqiCategory(aqi: number): AqiBand {
  const v = Math.max(0, Math.min(500, aqi));
  return AQI_BANDS.find((b) => v >= b.min && v <= b.max) ?? AQI_BANDS[0];
}
