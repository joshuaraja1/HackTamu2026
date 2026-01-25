import type { SearchFilters } from './types';

const MAKES = ['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Hyundai', 'Kia', 'Mazda', 'Chevrolet', 'Nissan', 'Audi', 'Mercedes'];
const BODY_TYPES = ['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon', 'van'];
const CITIES: Record<string, { lat: number; lon: number }> = {
  'dallas': { lat: 32.7767, lon: -96.7970 },
  'austin': { lat: 30.2672, lon: -97.7431 },
  'houston': { lat: 29.7604, lon: -95.3698 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'la': { lat: 34.0522, lon: -118.2437 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  'nyc': { lat: 40.7128, lon: -74.0060 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'sf': { lat: 37.7749, lon: -122.4194 },
  'seattle': { lat: 47.6062, lon: -122.3321 },
  'miami': { lat: 25.7617, lon: -80.1918 },
  'phoenix': { lat: 33.4484, lon: -112.0740 },
  'philadelphia': { lat: 39.9526, lon: -75.1652 },
  'san antonio': { lat: 29.4241, lon: -98.4936 },
  'san diego': { lat: 32.7157, lon: -117.1611 },
};

/**
 * Parse search query to extract filters
 */
export function parseSearchQuery(queryText: string, existingFilters: SearchFilters = {}): SearchFilters {
  const filters: SearchFilters = { ...existingFilters };
  const lowerQuery = queryText.toLowerCase();

  // Extract makes
  const foundMakes: string[] = [];
  for (const make of MAKES) {
    if (lowerQuery.includes(make.toLowerCase())) {
      foundMakes.push(make);
    }
  }
  if (foundMakes.length > 0) {
    filters.make = foundMakes;
  }

  // Extract body types
  const foundBodyTypes: string[] = [];
  // Check for common synonyms first (before exact matches to avoid duplicates)
  // Handle "family suv" or just "suv"
  if (lowerQuery.includes('suv') || lowerQuery.includes('sport utility') || lowerQuery.includes('sport-utility') || 
      lowerQuery.includes('family suv') || lowerQuery.includes('family-suv')) {
    foundBodyTypes.push('suv');
  }
  if (lowerQuery.includes('pickup') || lowerQuery.includes('pick-up') || lowerQuery.includes('pick up')) {
    foundBodyTypes.push('truck');
  }
  // Then check exact matches
  for (const bodyType of BODY_TYPES) {
    if (lowerQuery.includes(bodyType) && !foundBodyTypes.includes(bodyType)) {
      foundBodyTypes.push(bodyType);
    }
  }
  if (foundBodyTypes.length > 0) {
    filters.bodyType = foundBodyTypes;
  }

  // Extract price (e.g., "under 25k", "under $25,000", "below 30k")
  // Try to match "k" suffix first (most common case)
  const kPattern = /(?:under|below|less than|max|maximum)\s*(?:of\s*)?\$?\s*(\d+)\s*[kK]/i;
  const kMatch = lowerQuery.match(kPattern);
  if (kMatch) {
    const price = parseInt(kMatch[1].replace(/,/g, '')) * 1000; // Convert k to thousands
    filters.budgetMax = price * 100; // Convert to cents
    console.log(`[parseSearchQuery] Extracted budgetMax from 'k' pattern: ${price} dollars = ${filters.budgetMax} cents`);
  } else {
    // Try full number patterns (with commas)
    const fullNumberPattern = /(?:under|below|less than|max|maximum)\s*(?:of\s*)?\$?\s*(\d{1,3}(?:,\d{3})*)/;
    const fullMatch = lowerQuery.match(fullNumberPattern);
    if (fullMatch) {
      const price = parseInt(fullMatch[1].replace(/,/g, ''));
      filters.budgetMax = price * 100; // Convert to cents
      console.log(`[parseSearchQuery] Extracted budgetMax from full number: ${price} dollars = ${filters.budgetMax} cents`);
    } else {
      // Try plain number (last resort)
      const plainPattern = /(?:under|below|less than|max|maximum)\s*(?:of\s*)?\$?\s*(\d+)/;
      const plainMatch = lowerQuery.match(plainPattern);
      if (plainMatch) {
        const price = parseInt(plainMatch[1].replace(/,/g, ''));
        filters.budgetMax = price * 100; // Convert to cents
        console.log(`[parseSearchQuery] Extracted budgetMax from plain number: ${price} dollars = ${filters.budgetMax} cents`);
      }
    }
  }

  // Extract minimum price (e.g., "over 15k", "above $20,000")
  const minPricePatterns = [
    /(?:over|above|more than|min|minimum)\s*(?:of\s*)?\$?\s*(\d+)[kK]?/g,
    /(?:over|above|more than|min|minimum)\s*(?:of\s*)?\$?\s*(\d{1,3}(?:,\d{3})*)/g,
  ];
  
  for (const pattern of minPricePatterns) {
    const matches = [...lowerQuery.matchAll(pattern)];
    for (const match of matches) {
      let priceStr = match[1].replace(/,/g, '');
      let price = parseInt(priceStr);
      if (match[0].includes('k') || match[0].includes('K')) {
        price = price * 1000;
      }
      if (price > 0) {
        filters.budgetMin = price * 100; // Convert to cents
        break;
      }
    }
  }

  // Extract radius (e.g., "within 15 miles", "15 mi", "15 mile radius")
  const radiusPatterns = [
    /(?:within|within\s+a|radius\s+of|up\s+to)\s*(\d+)\s*(?:mile|miles|mi|mi\.)/g,
    /(\d+)\s*(?:mile|miles|mi|mi\.)\s*(?:radius|away|distance)?/g,
  ];
  
  for (const pattern of radiusPatterns) {
    const matches = [...lowerQuery.matchAll(pattern)];
    if (matches.length > 0) {
      const radius = parseInt(matches[0][1]);
      if (radius > 0) {
        filters.radiusMiles = radius;
        break;
      }
    }
  }

  // Extract location (city name)
  for (const [cityName, coords] of Object.entries(CITIES)) {
    // Check for exact word match or partial match at word boundaries
    const cityRegex = new RegExp(`\\b${cityName.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (cityRegex.test(lowerQuery)) {
      filters.city = cityName;
      filters.latitude = coords.lat;
      filters.longitude = coords.lon;
      break;
    }
  }

  // Extract year range
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const yearMatches = [...lowerQuery.matchAll(yearPattern)];
  if (yearMatches.length > 0) {
    const years = yearMatches.map(m => parseInt(m[0])).filter(y => y >= 1900 && y <= new Date().getFullYear() + 1);
    if (years.length > 0) {
      // If only one year specified, allow ±1 year range for flexibility
      if (years.length === 1) {
        const year = years[0];
        filters.yearMin = Math.max(1900, year - 1);
        filters.yearMax = Math.min(new Date().getFullYear() + 1, year + 1);
      } else {
        filters.yearMin = Math.min(...years);
        filters.yearMax = Math.max(...years);
      }
    }
  }

  // Extract drivetrain - use lowercase for consistency with filtering
  // Handle cases where "AWD" might be cut off to "WD"
  if (lowerQuery.includes('awd') || lowerQuery.includes('all wheel') || lowerQuery.includes('all-wheel') || 
      (lowerQuery.includes(' wd') && !lowerQuery.includes('4wd') && !lowerQuery.includes('fwd') && !lowerQuery.includes('rwd'))) {
    filters.drivetrain = ['awd'];
  } else if (lowerQuery.includes('4wd') || lowerQuery.includes('four wheel') || lowerQuery.includes('4-wheel') || lowerQuery.includes('4 wheel')) {
    filters.drivetrain = ['awd']; // 4WD is treated as AWD
  } else if (lowerQuery.includes('fwd') || lowerQuery.includes('front wheel') || lowerQuery.includes('front-wheel')) {
    filters.drivetrain = ['fwd'];
  } else if (lowerQuery.includes('rwd') || lowerQuery.includes('rear wheel') || lowerQuery.includes('rear-wheel')) {
    filters.drivetrain = ['rwd'];
  }

  // Extract fuel type
  if (lowerQuery.includes('electric') || lowerQuery.includes('ev')) {
    filters.fuelType = ['electric'];
  } else if (lowerQuery.includes('hybrid')) {
    filters.fuelType = ['hybrid'];
  } else if (lowerQuery.includes('diesel')) {
    filters.fuelType = ['diesel'];
  }

  // Extract transmission
  if (lowerQuery.includes('manual')) {
    filters.transmission = ['manual'];
  } else if (lowerQuery.includes('automatic')) {
    filters.transmission = ['automatic'];
  }

  // Extract model (e.g., "Camry", "RAV4", "Corolla")
  const commonModels = ['camry', 'corolla', 'rav4', 'highlander', 'tacoma', 'tundra', 'prius', '4runner', 'sienna', 'avalon',
    'civic', 'accord', 'cr-v', 'pilot', 'odyssey', 'fit', 'ridgeline',
    'f-150', 'mustang', 'explorer', 'escape', 'focus', 'edge',
    'model 3', 'model s', 'model x', 'model y',
    '3 series', '5 series', 'x3', 'x5',
    'elantra', 'sonata', 'tucson', 'santa fe',
    'optima', 'sorento', 'sportage', 'telluride',
    'cx-5', 'cx-9', 'mazda3', 'mazda6'];
  
  const foundModels: string[] = [];
  for (const model of commonModels) {
    if (lowerQuery.includes(model)) {
      foundModels.push(model);
    }
  }
  if (foundModels.length > 0) {
    filters.model = foundModels;
  }

  // Extract seats (e.g., "5 seats", "7 seater", "seats 8")
  const seatsPattern = /(\d+)\s*(?:seat|seats|seater)/i;
  const seatsMatch = lowerQuery.match(seatsPattern);
  if (seatsMatch) {
    const seats = parseInt(seatsMatch[1]);
    if (seats >= 2 && seats <= 9) {
      filters.seats = seats;
    }
  }

  // Extract features (e.g., "carplay", "heated seats", "sunroof")
  const featureKeywords: Record<string, string> = {
    'carplay': 'carplay',
    'android auto': 'android_auto',
    'heated seats': 'heated_seats',
    'lane assist': 'lane_assist',
    'adaptive cruise': 'adaptive_cruise',
    'sunroof': 'sunroof',
    'third row': 'third_row',
    'backup camera': 'backup_camera',
    'blind spot': 'blind_spot',
    'remote start': 'remote_start',
    'leather': 'leather',
    'navigation': 'navigation',
    'premium audio': 'premium_audio',
  };

  const foundFeatures: string[] = [];
  for (const [keyword, feature] of Object.entries(featureKeywords)) {
    if (lowerQuery.includes(keyword)) {
      foundFeatures.push(feature);
    }
  }
  if (foundFeatures.length > 0) {
    filters.features = foundFeatures;
  }

  // Keep query text for semantic search
  filters.queryText = queryText;

  console.log('[parseSearchQuery] Extracted filters:', {
    make: filters.make,
    bodyType: filters.bodyType,
    budgetMax: filters.budgetMax,
    radiusMiles: filters.radiusMiles,
    city: filters.city,
    latitude: filters.latitude,
    longitude: filters.longitude,
  });

  return filters;
}

