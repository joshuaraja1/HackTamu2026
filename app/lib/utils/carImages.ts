/**
 * Generate car image URL based on make, model, and year
 * Uses local images from /public/cars directory when available
 */
export function getCarImageUrl(car: {
  make: string;
  model: string;
  year?: number;
  body_type?: string;
}): string {
  const { make, model, year, body_type } = car;
  const makeLower = make.toLowerCase();
  const modelLower = model.toLowerCase();
  
  // Helper function to encode file paths for URLs
  const encodePath = (path: string) => {
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  };
  
  // Only process Toyota cars - use local images for the 6 specific cars
  if (makeLower === 'toyota') {
    // 1. 2019 Toyota 4Runner
    if ((modelLower.includes('4runner') || modelLower.includes('4 runner')) && 
        year === 2019) {
      return encodePath('/cars/2019 4Runner.jpg');
    }
    
    // 2. Toyota Sequoia (ALL years - use 2016 image)
    // This covers 2015, 2016, 2017, and any other Sequoia years
    if (modelLower.includes('sequoia')) {
      return '/cars/2016-Toyota-Sequoia.jpg.avif';
    }
    
    // 3. 2020 Toyota RAV4
    if ((modelLower.includes('rav4') || modelLower.includes('rav 4')) && 
        year === 2020) {
      return '/cars/2020-toyota-rav4-adventure-awd-natl-angular-front-exterior-view_100744555_l.jpg';
    }
    
    // 4. 2021 Toyota Highlander
    if (modelLower.includes('highlander') && year === 2021) {
      return '/cars/2021-Toyota-Highlander-Blue.jpg.avif';
    }
    
    // 5. 2021 Toyota RAV4 (any variant including Prime)
    if ((modelLower.includes('rav4') || modelLower.includes('rav 4')) && 
        year === 2021) {
      return '/cars/2021-Toyota-RAV4-Prime-side-view-Blizzard-Pearl-with-black-roof_o.jpg';
    }
    
    // 6. Use the 002 image for other Toyota models that don't match above
    // This is the 6th image for any other Toyota cars
    return '/cars/002_2026011521.jpg.avif';
  }
  
  // For non-Toyota cars or cars without specific images, use a generic placeholder
  // But make sure it's not a yellow sports car - use a neutral gray SUV
  const seed = `${make}-${model}-${year || 'unknown'}`.toLowerCase();
  const seedHash = seed.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Use only SUV/truck images for fallback (no sports cars)
  const suvImageUrls = [
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&h=450&fit=crop&q=80&auto=format', // Dark gray SUV
    'https://images.unsplash.com/photo-1549317661-bd32c8be0e2a?w=800&h=450&fit=crop&q=80&auto=format', // Blue SUV
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=450&fit=crop&q=80&auto=format', // White truck
  ];
  
  const imageIndex = Math.abs(seedHash) % suvImageUrls.length;
  return suvImageUrls[imageIndex];
}

/**
 * Fallback car image URL (generic car image)
 */
export function getFallbackCarImageUrl(): string {
  // Reliable generic car image
  return 'https://images.unsplash.com/photo-1492144534655-ae79c7c9eb30?w=800&h=450&fit=crop&q=80&auto=format';
}

