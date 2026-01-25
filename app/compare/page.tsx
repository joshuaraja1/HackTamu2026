'use client';

import Link from 'next/link';
import { useCompare } from '../context/CompareContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';

export default function ComparePage() {
  const { compareCars, removeFromCompare, clearCompare } = useCompare();

  if (compareCars.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Compare Cars</h1>
            <p className="text-lg text-gray-600 mb-6">
              You need at least 2 cars to compare. Add cars to your compare list by clicking the heart icon on any car.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const priceData = compareCars.map(car => ({
    name: `${car.year} ${car.make} ${car.model}`,
    price: car.price_cents / 100,
  }));

  const mpgData = compareCars.map(car => ({
    name: `${car.year} ${car.make} ${car.model}`,
    city: car.mpg_city || 0,
    highway: car.mpg_highway || 0,
  }));

  const mileageData = compareCars.map(car => ({
    name: `${car.year} ${car.make} ${car.model}`,
    mileage: car.mileage,
  }));

  // Radar chart data (normalized 0-100 scale)
  const maxPrice = Math.max(...compareCars.map(c => c.price_cents));
  const maxMileage = Math.max(...compareCars.map(c => c.mileage));
  const maxMpg = Math.max(...compareCars.map(c => Math.max(c.mpg_city || 0, c.mpg_highway || 0)));
  const maxFeatures = Math.max(...compareCars.map(c => c.features?.length || 0), 1);
  
  const radarData = [
    { metric: 'Value (Lower Price)', ...compareCars.reduce((acc, car, idx) => {
      acc[`car${idx}`] = 100 - ((car.price_cents / maxPrice) * 100);
      return acc;
    }, {} as Record<string, number>) },
    { metric: 'Efficiency (MPG)', ...compareCars.reduce((acc, car, idx) => {
      acc[`car${idx}`] = ((Math.max(car.mpg_city || 0, car.mpg_highway || 0) / maxMpg) * 100);
      return acc;
    }, {} as Record<string, number>) },
    { metric: 'Condition (Low Mileage)', ...compareCars.reduce((acc, car, idx) => {
      acc[`car${idx}`] = 100 - ((car.mileage / maxMileage) * 100);
      return acc;
    }, {} as Record<string, number>) },
    { metric: 'Features', ...compareCars.reduce((acc, car, idx) => {
      acc[`car${idx}`] = ((car.features?.length || 0) / maxFeatures) * 100;
      return acc;
    }, {} as Record<string, number>) },
  ];

  // Calculate analysis metrics
  const analysis = {
    bestValue: compareCars.reduce((best, car) => {
      const value = (car.mpg_highway || 0) / (car.price_cents / 100);
      const bestValue = (best.mpg_highway || 0) / (best.price_cents / 100);
      return value > bestValue ? car : best;
    }, compareCars[0]),
    lowestPrice: compareCars.reduce((lowest, car) => 
      car.price_cents < lowest.price_cents ? car : lowest
    , compareCars[0]),
    bestMpg: compareCars.reduce((best, car) => 
      (car.mpg_highway || 0) > (best.mpg_highway || 0) ? car : best
    , compareCars[0]),
    lowestMileage: compareCars.reduce((lowest, car) => 
      car.mileage < lowest.mileage ? car : lowest
    , compareCars[0]),
    mostFeatures: compareCars.reduce((most, car) => 
      (car.features?.length || 0) > (most.features?.length || 0) ? car : most
    , compareCars[0]),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🚗 Car Marketplace
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={clearCompare}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear All
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Compare {compareCars.length} Cars</h1>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {compareCars.map((car) => (
            <div key={car.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded mb-3 flex items-center justify-center">
                <span className="text-4xl opacity-50">🚗</span>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                {car.year} {car.make} {car.model}
              </h3>
              <p className="text-lg font-bold text-blue-600 mb-1">
                ${(car.price_cents / 100).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {car.mileage.toLocaleString()} miles
              </p>
              <button
                onClick={() => removeFromCompare(car.id)}
                className="text-xs text-red-600 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Metrics Comparison Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Metric</th>
                  {compareCars.map((car) => (
                    <th key={car.id} className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[200px]">
                      {car.year} {car.make} {car.model}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">Price</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      ${(car.price_cents / 100).toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">Mileage</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.mileage.toLocaleString()} miles
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">Year</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.year}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">Body Type</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900 capitalize">
                      {car.body_type}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">Drivetrain</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900 uppercase">
                      {car.drivetrain || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">Fuel Type</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900 capitalize">
                      {car.fuel_type || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">MPG (City)</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.mpg_city || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">MPG (Highway)</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.mpg_highway || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">Seats</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.seats || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">Transmission</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900 capitalize">
                      {car.transmission || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-700">Features</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.features?.length || 0} features
                    </td>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">Location</td>
                  {compareCars.map((car) => (
                    <td key={car.id} className="py-3 px-4 text-center text-gray-900">
                      {car.city}, {car.state}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-8 mb-8">
          {/* Price Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Price Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="price" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* MPG Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Fuel Efficiency (MPG)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mpgData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="city" fill="#10b981" name="City MPG" />
                <Bar dataKey="highway" fill="#3b82f6" name="Highway MPG" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mileage Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mileage Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mileageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} miles`} />
                <Line type="monotone" dataKey="mileage" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart - Overall Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                {compareCars.map((car, idx) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                  return (
                    <Radar
                      key={car.id}
                      name={`${car.year} ${car.make} ${car.model}`}
                      dataKey={`car${idx}`}
                      stroke={colors[idx % colors.length]}
                      fill={colors[idx % colors.length]}
                      fillOpacity={0.3}
                    />
                  );
                })}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Analysis & Recommendations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-600">💰</span> Best Value
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {analysis.bestValue.year} {analysis.bestValue.make} {analysis.bestValue.model}
              </p>
              <p className="text-xs text-gray-500">
                Best MPG-to-price ratio: {analysis.bestValue.mpg_highway || 'N/A'} MPG at ${(analysis.bestValue.price_cents / 100).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600">💵</span> Lowest Price
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {analysis.lowestPrice.year} {analysis.lowestPrice.make} {analysis.lowestPrice.model}
              </p>
              <p className="text-xs text-gray-500">
                ${(analysis.lowestPrice.price_cents / 100).toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-green-600">⛽</span> Best Fuel Economy
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {analysis.bestMpg.year} {analysis.bestMpg.make} {analysis.bestMpg.model}
              </p>
              <p className="text-xs text-gray-500">
                {analysis.bestMpg.mpg_highway || 'N/A'} MPG highway
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-purple-600">🔧</span> Best Condition
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {analysis.lowestMileage.year} {analysis.lowestMileage.make} {analysis.lowestMileage.model}
              </p>
              <p className="text-xs text-gray-500">
                {analysis.lowestMileage.mileage.toLocaleString()} miles
              </p>
            </div>

            <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-orange-600">⭐</span> Most Features
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {analysis.mostFeatures.year} {analysis.mostFeatures.make} {analysis.mostFeatures.model}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {analysis.mostFeatures.features?.length || 0} features
              </p>
              {analysis.mostFeatures.features && analysis.mostFeatures.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {analysis.mostFeatures.features.slice(0, 5).map((feature, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {feature.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

