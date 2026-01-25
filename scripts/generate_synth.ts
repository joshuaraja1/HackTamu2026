import * as fs from 'fs';
import * as path from 'path';

interface SyntheticCar {
  make: string;
  model: string;
  trim?: string;
  year: number;
  body_type: string;
  price_cents: number;
  mileage: number;
  drivetrain?: string;
  fuel_type?: string;
  transmission?: string;
  engine?: string;
  mpg_city?: number;
  mpg_highway?: number;
  seats?: number;
  doors?: number;
  color: string;
  vin: string;
  features?: string[];
  description?: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  seller_name: string;
  seller_phone: string;
}

const MAKES = ['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Hyundai', 'Kia', 'Mazda'];
const TOYOTA_MODELS: Record<string, string[]> = {
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', 'Prius', '4Runner', 'Sienna', 'Avalon'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Ridgeline', 'Odyssey'],
  Ford: ['F-150', 'Explorer', 'Mustang', 'Escape', 'Edge', 'Expedition'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5'],
  Hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe'],
  Kia: ['Forte', 'Optima', 'Sportage', 'Sorento'],
  Mazda: ['Mazda3', 'Mazda6', 'CX-5', 'CX-9'],
};

const BODY_TYPES = ['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon'];
const DRIVETRAINS = ['FWD', 'RWD', 'AWD', '4WD'];
const FUEL_TYPES = ['gas', 'hybrid', 'electric', 'diesel'];
const TRANSMISSIONS = ['automatic', 'manual', 'CVT'];
const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Brown'];
const FEATURES = ['CarPlay', 'heated_seats', 'lane_assist', 'adaptive_cruise', 'sunroof', 'third_row', 'leather', 'navigation'];
const CITIES = [
  { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970, zip: '75201' },
  { city: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431, zip: '78701' },
  { city: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698, zip: '77001' },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437, zip: '90001' },
  { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060, zip: '10001' },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298, zip: '60601' },
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

function generatePhone(): string {
  return `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function generateCar(index: number): SyntheticCar {
  const make = randomElement(MAKES);
  const models = TOYOTA_MODELS[make] || ['Model A', 'Model B'];
  const model = randomElement(models);
  const bodyType = randomElement(BODY_TYPES);
  const year = randomInt(2015, 2024);
  const age = 2024 - year;
  
  // Price correlated with year and mileage
  const basePrice = randomInt(15000, 50000) * 100; // cents
  const mileage = randomInt(5000, 150000 - age * 10000);
  const priceAdjustment = Math.floor((mileage / 1000) * -50 + (age * -500));
  const price_cents = Math.max(500000, basePrice + priceAdjustment); // min $5k

  // Body type determines seats
  let seats = 5;
  if (bodyType === 'suv' || bodyType === 'truck') {
    seats = randomElement([5, 7, 8]);
  } else if (bodyType === 'sedan' || bodyType === 'coupe') {
    seats = randomElement([4, 5]);
  }

  // Features based on price
  const numFeatures = price_cents > 3000000 ? randomInt(4, 8) : randomInt(0, 4);
  const selectedFeatures = FEATURES.sort(() => Math.random() - 0.5).slice(0, numFeatures);

  // MPG based on fuel type
  const fuel_type = randomElement(FUEL_TYPES);
  let mpg_city = 20;
  let mpg_highway = 28;
  if (fuel_type === 'hybrid') {
    mpg_city = randomInt(40, 55);
    mpg_highway = randomInt(45, 60);
  } else if (fuel_type === 'electric') {
    mpg_city = 100; // MPGe
    mpg_highway = 100;
  } else if (fuel_type === 'diesel') {
    mpg_city = randomInt(25, 35);
    mpg_highway = randomInt(30, 40);
  } else {
    mpg_city = randomInt(18, 30);
    mpg_highway = randomInt(25, 40);
  }

  const location = randomElement(CITIES);
  const drivetrain = randomElement(DRIVETRAINS);
  const transmission = randomElement(TRANSMISSIONS);

  // Description
  const descriptions = [
    `Well-maintained ${year} ${make} ${model} in excellent condition.`,
    `Clean ${year} ${make} ${model} with low mileage and great features.`,
    `One-owner ${year} ${make} ${model}, garage kept and regularly serviced.`,
    `Excellent ${year} ${make} ${model} with all maintenance records available.`,
  ];
  const description = randomElement(descriptions);

  return {
    make,
    model,
    trim: randomElement(['', 'LE', 'XLE', 'Limited', 'Sport', 'Premium', 'Base']),
    year,
    body_type: bodyType,
    price_cents,
    mileage,
    drivetrain,
    fuel_type,
    transmission,
    engine: `${randomInt(2, 6)}.${randomInt(0, 9)}L ${randomElement(['V6', 'V8', 'I4', 'I6'])}`,
    mpg_city,
    mpg_highway,
    seats,
    doors: bodyType === 'coupe' ? 2 : 4,
    color: randomElement(COLORS),
    vin: generateVIN(),
    features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
    description,
    city: location.city,
    state: location.state,
    zip: location.zip,
    latitude: location.lat + randomFloat(-0.1, 0.1),
    longitude: location.lon + randomFloat(-0.1, 0.1),
    seller_name: `${make} Dealer ${randomInt(1, 10)}`,
    seller_phone: generatePhone(),
  };
}

function generateUsers(count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      full_name: `User ${i + 1}`,
    });
  }
  return users;
}

function generateInteractions(carIds: string[], userIds: string[], count: number) {
  const interactions = [];
  const types = ['view', 'favorite', 'purchase'];
  
  for (let i = 0; i < count; i++) {
    const userId = randomElement(userIds);
    const carId = randomElement(carIds);
    const type = randomElement(types);
    const weight = type === 'purchase' ? 3 : type === 'favorite' ? 2 : 1;
    
    // Create multiple interactions per user/car pair with weights
    for (let j = 0; j < weight; j++) {
      interactions.push({
        user_id: userId,
        car_id: carId,
        interaction_type: type,
        metadata: {},
      });
    }
  }
  
  return interactions;
}

async function main() {
  console.log('Generating synthetic data...');

  // Generate cars
  const cars: SyntheticCar[] = [];
  for (let i = 0; i < 3000; i++) {
    cars.push(generateCar(i));
  }

  // Generate users
  const users = generateUsers(300);

  // Generate interactions
  const carIds = cars.map((_, i) => `car-${i + 1}`);
  const userIds = users.map(u => u.id);
  const interactions = generateInteractions(carIds, userIds, 25000);

  // Write to JSON files
  const outputDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'cars.json'),
    JSON.stringify(cars, null, 2)
  );
  console.log(`Generated ${cars.length} cars`);

  fs.writeFileSync(
    path.join(outputDir, 'users.json'),
    JSON.stringify(users, null, 2)
  );
  console.log(`Generated ${users.length} users`);

  fs.writeFileSync(
    path.join(outputDir, 'interactions.json'),
    JSON.stringify(interactions, null, 2)
  );
  console.log(`Generated ${interactions.length} interactions`);

  console.log('Synthetic data generated successfully!');
  console.log(`Output directory: ${outputDir}`);
}

main().catch(console.error);

