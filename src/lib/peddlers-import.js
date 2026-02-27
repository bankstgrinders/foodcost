// Parse Peddler's Son PDF invoices into our ingredient format
import { CATEGORIES } from './db';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

// Map Peddler's descriptions to our categories
function guessCategory(name) {
  const desc = name.toLowerCase();
  if (desc.includes('chip') || desc.includes('cracker') || desc.includes('pretzel'))
    return 'Dry Goods';
  if (desc.includes('cookie') || desc.includes('brownie') || desc.includes('cake'))
    return 'Other';
  if (
    desc.includes('beef') ||
    desc.includes('turkey') ||
    desc.includes('chicken') ||
    desc.includes('ham') ||
    desc.includes('bacon') ||
    desc.includes('brisket') ||
    desc.includes('salami') ||
    desc.includes('pastrami') ||
    desc.includes('sausage') ||
    desc.includes('pork') ||
    desc.includes('tuna') ||
    desc.includes('crab') ||
    desc.includes('fish')
  )
    return 'Meat & Protein';
  if (
    desc.includes('cheese') ||
    desc.includes('milk') ||
    desc.includes('cream') ||
    desc.includes('butter') ||
    desc.includes('yogurt')
  )
    return 'Cheese & Dairy';
  if (
    desc.includes('bread') ||
    desc.includes('roll') ||
    desc.includes('bun') ||
    desc.includes('wrap') ||
    desc.includes('tortilla') ||
    desc.includes('pita') ||
    desc.includes('bagel')
  )
    return 'Bread & Bakery';
  if (
    desc.includes('lettuce') ||
    desc.includes('tomato') ||
    desc.includes('onion') ||
    desc.includes('pepper') ||
    desc.includes('celery') ||
    desc.includes('cabbage') ||
    desc.includes('spinach') ||
    desc.includes('carrot') ||
    desc.includes('cucumber') ||
    desc.includes('avocado') ||
    desc.includes('pickle') ||
    desc.includes('olive') ||
    desc.includes('mushroom') ||
    desc.includes('potato')
  )
    return 'Produce';
  if (
    desc.includes('sauce') ||
    desc.includes('mayo') ||
    desc.includes('mustard') ||
    desc.includes('dressing') ||
    desc.includes('oil') ||
    desc.includes('vinegar') ||
    desc.includes('ketchup')
  )
    return 'Condiments & Sauces';
  if (
    desc.includes('soda') ||
    desc.includes('juice') ||
    desc.includes('water') ||
    desc.includes('coffee') ||
    desc.includes('tea') ||
    desc.includes('drink')
  )
    return 'Beverages';
  if (
    desc.includes('container') ||
    desc.includes('napkin') ||
    desc.includes('cup') ||
    desc.includes('lid') ||
    desc.includes('bag') ||
    desc.includes('foil') ||
    desc.includes('glove') ||
    desc.includes('paper') ||
    desc.includes('wrap')
  )
    return 'Paper & Supplies';
  return 'Other';
}

// Parse unit and size from the item name (e.g., "CHIPS DIRTY MESQUITE BBQ 2OZ")
function parseItemSize(name, unit) {
  // Try to find size info in the name like "2OZ", "5 LBS", "1.5OZ", "30/36 CT"
  const sizeMatch = name.match(/(\d+\.?\d*)\s*(OZ|LB|LBS|GAL|CT|QT|PT)\b/i);

  if (unit === 'LB') {
    return { purchaseSize: 1, purchaseUnit: 'lb' };
  }

  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const u = sizeMatch[2].toUpperCase();
    const unitMap = {
      OZ: 'oz',
      LB: 'lb',
      LBS: 'lb',
      GAL: 'gallon',
      CT: 'each',
      QT: 'quart',
      PT: 'pint',
    };
    return { purchaseSize: size, purchaseUnit: unitMap[u] || 'each' };
  }

  return { purchaseSize: 1, purchaseUnit: 'case' };
}

// Extract text from PDF and parse it
export async function parsePeddlersPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Get items with their positions for better line reconstruction
    const items = textContent.items.map((item) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }));

    // Sort by Y (top to bottom), then X (left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y; // Reverse Y since PDF coords go bottom-up
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.x - b.x;
    });

    // Group into lines by Y position
    let currentY = null;
    let currentLine = '';
    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > 3) {
        if (currentLine) fullText += currentLine + '\n';
        currentLine = item.text;
        currentY = item.y;
      } else {
        // Add spacing based on X gap
        currentLine += ' ' + item.text;
      }
    }
    if (currentLine) fullText += currentLine + '\n';
  }

  return parseTextContent(fullText);
}

function parseTextContent(text) {
  const lines = text.split('\n');
  const results = [];

  for (const line of lines) {
    // Skip header, service charges, totals, and non-product lines
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('Order qty')) continue;
    if (trimmed.includes('Total')) continue;
    if (trimmed.includes('SERVICE CHARGE')) continue;
    if (trimmed.includes('FSCHG')) continue;

    // Match product lines - pattern: qty unit itemcode itemname ... shipqty unit price linetotal
    // Example: "1 CA G931005 CHIPS DIRTY MESQUITE BBQ 2OZ 1 CA $25.70 $25.70"
    const match = trimmed.match(
      /^(\d+)\s+(CA|EA|3E|CS|BX|BG|LB)\s+(\w+)\s+(.+?)\s+(\d+)\s+(CA|EA|LB|CS|BX|BG)\s+\$?([\d,.]+)\s+\$?([\d,.]+)$/i
    );

    if (match) {
      const orderQty = parseInt(match[1]);
      const orderUnit = match[2];
      const itemCode = match[3];
      const itemName = match[4].trim();
      const shipQty = parseInt(match[5]);
      const shipUnit = match[6];
      const unitPrice = parseFloat(match[7].replace(',', ''));
      const lineTotal = parseFloat(match[8].replace(',', ''));

      const { purchaseSize, purchaseUnit } = parseItemSize(itemName, shipUnit);
      const category = guessCategory(itemName);

      // Clean up name
      const cleanName = itemName
        .split(' ')
        .map((word) => {
          if (word.length <= 2 && !word.match(/\d/)) return word.toLowerCase();
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      results.push({
        vendorId: itemCode,
        name: cleanName,
        category,
        purchaseUnit: shipUnit === 'LB' ? 'lb' : purchaseUnit,
        purchaseSize: shipUnit === 'LB' ? shipQty : purchaseSize,
        purchaseCost: unitPrice,
        costPerUnit: purchaseSize > 0 ? unitPrice / purchaseSize : unitPrice,
        supplier: "Peddler's Son",
        notes: `Item: ${itemCode} | Pack: ${orderUnit}`,
      });
    }
  }

  return results;
}
