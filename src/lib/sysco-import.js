// Parse Sysco CSV exports into our ingredient format
import { CATEGORIES } from './db';

// Map Sysco descriptions to our categories
function guessCategory(description, brand) {
  const desc = (description + ' ' + brand).toLowerCase();
  if (
    desc.includes('chip') ||
    desc.includes('snack') ||
    desc.includes('cracker') ||
    desc.includes('cookie') ||
    desc.includes('pretzel')
  )
    return 'Dry Goods';
  if (
    desc.includes('beef') ||
    desc.includes('turkey') ||
    desc.includes('chicken') ||
    desc.includes('ham') ||
    desc.includes('bacon') ||
    desc.includes('pastrami') ||
    desc.includes('salami') ||
    desc.includes('meatball') ||
    desc.includes('tuna') ||
    desc.includes('crab') ||
    desc.includes('sausage') ||
    desc.includes('pork') ||
    desc.includes('corned')
  )
    return 'Meat & Protein';
  if (desc.includes('cheese') || desc.includes('provolone') || desc.includes('mozzarella') || desc.includes('swiss') || desc.includes('american'))
    return 'Cheese & Dairy';
  if (
    desc.includes('bread') ||
    desc.includes('roll') ||
    desc.includes('dough') ||
    desc.includes('bun') ||
    desc.includes('wrap') ||
    desc.includes('sub') ||
    desc.includes('pita') ||
    desc.includes('bagel')
  )
    return 'Bread & Bakery';
  if (
    desc.includes('lettuce') ||
    desc.includes('tomato') ||
    desc.includes('onion') ||
    desc.includes('pepper') ||
    desc.includes('cabbage') ||
    desc.includes('spinach') ||
    desc.includes('pickle') ||
    desc.includes('olive') ||
    desc.includes('avocado') ||
    desc.includes('produce') ||
    desc.includes('fresh')
  )
    return 'Produce';
  if (
    desc.includes('sauce') ||
    desc.includes('mayo') ||
    desc.includes('mustard') ||
    desc.includes('dressing') ||
    desc.includes('oil') ||
    desc.includes('vinegar') ||
    desc.includes('ketchup') ||
    desc.includes('condiment')
  )
    return 'Condiments & Sauces';
  if (desc.includes('soup') || desc.includes('chowder'))
    return 'Condiments & Sauces';
  if (
    desc.includes('soda') ||
    desc.includes('juice') ||
    desc.includes('water') ||
    desc.includes('coffee') ||
    desc.includes('tea') ||
    desc.includes('beverage') ||
    desc.includes('drink')
  )
    return 'Beverages';
  if (desc.includes('salad') && !desc.includes('lettuce'))
    return 'Other';
  if (
    desc.includes('napkin') ||
    desc.includes('cup') ||
    desc.includes('lid') ||
    desc.includes('bag') ||
    desc.includes('wrap') ||
    desc.includes('foil') ||
    desc.includes('glove') ||
    desc.includes('paper')
  )
    return 'Paper & Supplies';
  return 'Other';
}

// Parse pack/size string like "64/1.5 OZ" or "3/4 LB" or "4/1GAL"
function parsePackSize(packSize) {
  if (!packSize) return { packCount: 1, unitSize: 1, unit: 'each' };

  const cleaned = packSize.trim().replace(/\s+/g, ' ');

  // Match patterns like "64/1.5 OZ", "3/4 LB", "4/1GAL", "100/4.88OZ", "2/150CT"
  const match = cleaned.match(
    /^(\d+)\s*\/\s*([#\d.,-]+)\s*(OZ|LB|GAL|CT|QT|PT|LTR|ML|KG|G|Z|#)?/i
  );

  if (!match) {
    return { packCount: 1, unitSize: 1, unit: 'each' };
  }

  const packCount = parseInt(match[1]) || 1;
  let unitSize = parseFloat(match[2].replace('#', '')) || 1;
  let unit = (match[3] || '').toUpperCase();

  // Handle # as LB
  if (match[2].includes('#')) unit = 'LB';

  // Handle range like "5-9" — use midpoint
  if (match[2].includes('-')) {
    const parts = match[2].replace('#', '').split('-');
    unitSize = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
  }

  // Normalize units
  const unitMap = {
    OZ: 'oz',
    Z: 'oz',
    LB: 'lb',
    '#': 'lb',
    GAL: 'gallon',
    CT: 'each',
    QT: 'quart',
    PT: 'pint',
    '': 'each',
  };

  return {
    packCount,
    unitSize,
    unit: unitMap[unit] || 'each',
  };
}

// Parse a Sysco CSV string into ingredient objects
export function parseSyscoCSV(csvText) {
  const lines = csvText.split('\n').filter((l) => l.trim());
  const results = [];

  for (const line of lines) {
    // Only process P (product) lines
    if (!line.startsWith('P,')) continue;

    // Parse CSV respecting quoted fields
    const fields = parseCSVLine(line);

    // Fields: type, SUPC, Case Qty, Split Qty, Cust #, Pack/Size, Brand, Description, Mfr #, Per Lb, Case $, Each $
    const supc = fields[1] || '';
    const caseQty = parseInt(fields[2]) || 0;
    const splitQty = parseInt(fields[3]) || 0;
    const packSize = fields[5] || '';
    const brand = fields[6] || '';
    const description = fields[7] || '';
    const perLb = (fields[9] || '').toUpperCase() === 'Y';
    const casePrice = fields[10] || '';
    const eachPrice = fields[11] || '';

    const { packCount, unitSize, unit } = parsePackSize(packSize);

    // Determine the cost
    let purchaseCost = 0;
    let purchaseSize = 0;
    let purchaseUnit = unit;
    let pricingNote = '';

    if (perLb) {
      // Per-pound pricing: price is per lb, total size = packCount * unitSize
      const pricePerLb = parseFloat(casePrice) || 0;
      purchaseSize = packCount * unitSize;
      purchaseCost = pricePerLb * purchaseSize;
      purchaseUnit = 'lb';
      pricingNote = `$${pricePerLb.toFixed(3)}/lb`;
    } else if (splitQty > 0 && eachPrice) {
      // Split order — each price
      const price = parseFloat(eachPrice) || 0;
      purchaseCost = price * splitQty;
      purchaseSize = unitSize * splitQty;
      purchaseUnit = unit;
      pricingNote = `Split: $${price.toFixed(2)} each`;
    } else {
      // Case pricing
      purchaseCost = parseFloat(casePrice) || 0;
      purchaseSize = packCount * unitSize;
      purchaseUnit = unit;
    }

    // Handle MARKET pricing
    if (casePrice === 'MARKET' || eachPrice === 'MARKET') {
      pricingNote = (pricingNote ? pricingNote + ' ' : '') + '(MARKET price)';
    }

    const totalQty = caseQty || splitQty || 1;
    const totalCost = purchaseCost * (caseQty > 0 ? caseQty : 1);

    const category = guessCategory(description, brand);

    results.push({
      syscoId: supc,
      name: cleanDescription(description),
      brand,
      category,
      purchaseUnit,
      purchaseSize,
      purchaseCost: purchaseCost,
      costPerUnit: purchaseSize > 0 ? purchaseCost / purchaseSize : 0,
      supplier: 'Sysco',
      packSize: packSize,
      caseQty,
      splitQty,
      perLb,
      notes: [pricingNote, `SUPC: ${supc}`, `Pack: ${packSize}`]
        .filter(Boolean)
        .join(' | '),
      // For preview
      _rawCasePrice: casePrice,
      _rawEachPrice: eachPrice,
      _totalOrderCost: totalCost,
    });
  }

  return results;
}

// Clean up Sysco descriptions to be more readable
function cleanDescription(desc) {
  // Title case and clean up
  return desc
    .split(' ')
    .map((word) => {
      if (word.length <= 2) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse CSV line respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}
