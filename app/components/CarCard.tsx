'use client';

import Link from 'next/link';
import type { RecommendationResult } from '@/app/lib/recommend/types';

interface CarCardProps {
  result: RecommendationResult;
  onFavorite?: (carId: string) => void;
  isFavorited?: boolean;
}

export default function CarCard({ result, onFavorite, isFavorited = false }: CarCardProps) {
  const { car, score, reasons } = result;
  const price = (car.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group animate-fadeIn">
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-6xl opacity-20">🚗</div>
        </div>
        <div className="absolute top-3 right-3">
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite(car.id);
              }}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${
                isFavorited
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-gray-800">
            {price}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Title */}
        <Link href={`/car/${car.id}`}>
          <h3 className="text-xl font-bold text-gray-900 mb-1 hover:text-blue-600 transition-colors group-hover:text-blue-600">
            {car.year} {car.make} {car.model} {car.trim && <span className="text-gray-600 font-normal">{car.trim}</span>}
          </h3>
        </Link>
        
        <p className="text-sm text-gray-500 mb-4 capitalize">
          {car.body_type} • {car.mileage.toLocaleString()} miles
        </p>

        {/* Specs badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {car.drivetrain && (
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
              {car.drivetrain.toUpperCase()}
            </span>
          )}
          {car.fuel_type && (
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold capitalize">
              {car.fuel_type}
            </span>
          )}
          {car.seats && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">
              {car.seats} seats
            </span>
          )}
          {car.mpg_highway && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-semibold">
              {car.mpg_highway} mpg
            </span>
          )}
        </div>

        {/* Features */}
        {car.features && car.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {car.features.slice(0, 4).map((feature, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {feature.replace('_', ' ')}
                </span>
              ))}
              {car.features.length > 4 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  +{car.features.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {car.city}, {car.state}
        </div>

        {/* Reasons */}
        {reasons && reasons.length > 0 && (
          <div className="mb-4 pt-4 border-t border-gray-100">
            <div className="text-xs">
              <div className="flex items-center gap-1 text-gray-600 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Why you're seeing this:</span>
              </div>
              <ul className="space-y-1 text-gray-500">
                {reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link
          href={`/car/${car.id}`}
          className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
