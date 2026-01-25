/**
 * Query Expansion - Expands search queries with synonyms and related terms
 * to improve semantic search results
 */

// Synonym mappings for common car-related terms
const SYNONYMS: Record<string, string[]> = {
  // Body types
  'suv': ['sport utility vehicle', 'sport-utility vehicle', 'crossover', 'cuv', 'family suv'],
  'crossover': ['suv', 'sport utility vehicle', 'cuv'],
  'truck': ['pickup', 'pick-up', 'pickup truck'],
  'pickup': ['truck', 'pick-up', 'pickup truck'],
  'sedan': ['car', 'four door', '4-door'],
  'coupe': ['two door', '2-door', 'sports car'],
  'wagon': ['estate', 'station wagon'],
  'van': ['minivan', 'mini-van', 'people mover'],
  'minivan': ['van', 'mini-van', 'people mover'],
  
  // Features
  'family': ['suv', 'minivan', 'van', 'wagon', '7 seater', '8 seater'],
  'sporty': ['coupe', 'sports car', 'performance'],
  'luxury': ['premium', 'high-end', 'upscale'],
  'economy': ['affordable', 'budget', 'cheap', 'inexpensive'],
  'reliable': ['dependable', 'durable', 'long-lasting'],
  'fuel efficient': ['good mpg', 'high mpg', 'gas saver', 'efficient'],
  'spacious': ['roomy', 'large', 'big', 'comfortable'],
  
  // Drivetrain
  'awd': ['all wheel drive', 'all-wheel drive', '4wd', 'four wheel drive', '4-wheel drive'],
  '4wd': ['awd', 'all wheel drive', 'four wheel drive'],
  'fwd': ['front wheel drive', 'front-wheel drive'],
  'rwd': ['rear wheel drive', 'rear-wheel drive'],
  
  // Fuel types
  'hybrid': ['gas electric', 'gas-electric', 'hybrid electric'],
  'electric': ['ev', 'electric vehicle', 'battery', 'plug-in'],
  'ev': ['electric', 'electric vehicle', 'battery'],
  
  // Transmission
  'manual': ['stick shift', 'standard', 'stick'],
  'automatic': ['auto', 'at'],
  
  // Use cases
  'commute': ['daily driver', 'city car', 'urban'],
  'road trip': ['highway', 'long distance', 'travel'],
  'off road': ['off-road', 'trail', 'adventure'],
  'towing': ['haul', 'tow', 'trailer'],
};

// Related terms that should expand the search
const RELATED_TERMS: Record<string, string[]> = {
  'family': ['suv', 'minivan', '7 seats', '8 seats', 'third row'],
  'adventure': ['suv', 'truck', 'awd', '4wd', 'off road'],
  'city': ['compact', 'small', 'fwd', 'fuel efficient'],
  'highway': ['comfortable', 'cruise control', 'adaptive cruise'],
  'winter': ['awd', '4wd', 'all wheel drive'],
  'summer': ['convertible', 'sunroof', 'open top'],
  'work': ['truck', 'pickup', 'towing', 'hauling'],
  'luxury': ['leather', 'premium audio', 'navigation', 'heated seats'],
};

/**
 * Expand a query with synonyms and related terms
 */
export function expandQuery(originalQuery: string): string[] {
  const lowerQuery = originalQuery.toLowerCase();
  const expandedQueries: Set<string> = new Set([originalQuery]); // Always include original
  
  // Add synonyms
  for (const [term, synonyms] of Object.entries(SYNONYMS)) {
    if (lowerQuery.includes(term)) {
      for (const synonym of synonyms) {
        // Replace term with synonym
        const expanded = lowerQuery.replace(new RegExp(term, 'gi'), synonym);
        if (expanded !== lowerQuery) {
          expandedQueries.add(expanded);
        }
        // Also add query with synonym appended
        expandedQueries.add(`${lowerQuery} ${synonym}`);
      }
    }
  }
  
  // Add related terms
  for (const [term, related] of Object.entries(RELATED_TERMS)) {
    if (lowerQuery.includes(term)) {
      for (const relatedTerm of related) {
        expandedQueries.add(`${lowerQuery} ${relatedTerm}`);
      }
    }
  }
  
  // Convert back to array and limit to top 5 expansions to avoid too many queries
  const expansions = Array.from(expandedQueries).slice(0, 5);
  
  console.log(`[expandQuery] Expanded "${originalQuery}" to ${expansions.length} queries:`, expansions);
  
  return expansions;
}

/**
 * Generate multiple query variations for better semantic matching
 */
export function generateQueryVariations(query: string): string[] {
  const variations: string[] = [query]; // Original always first
  
  const lowerQuery = query.toLowerCase();
  
  // Add variations with common modifiers
  if (!lowerQuery.includes('car') && !lowerQuery.includes('vehicle')) {
    variations.push(`${query} car`);
    variations.push(`${query} vehicle`);
  }
  
  // Add variations for common patterns
  if (lowerQuery.includes('family')) {
    variations.push(query.replace(/family/gi, 'family suv'));
    variations.push(query.replace(/family/gi, '7 seater'));
  }
  
  if (lowerQuery.includes('suv') && !lowerQuery.includes('family')) {
    variations.push(query.replace(/suv/gi, 'family suv'));
  }
  
  // Remove duplicates
  return [...new Set(variations)].slice(0, 3); // Limit to 3 variations
}

