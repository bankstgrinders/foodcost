// Simple localStorage database for the food cost app
// This keeps data on the device. We'll add cloud sync (Supabase) later.

const DB_KEY = 'foodcost_db';

const defaultData = {
  ingredients: [],
  recipes: [],
  inventory: [],
  waste: [],
  inventoryLevels: [],
  deliveryLog: [],
  usageLog: [],
};

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { ...defaultData };
    const data = JSON.parse(raw);
    // Merge with defaults so new fields are always present
    return { ...defaultData, ...data };
  } catch {
    return { ...defaultData };
  }
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Ingredients ----

export function getIngredients() {
  return getDB().ingredients;
}

export function addIngredient(ingredient) {
  const db = getDB();
  const newIngredient = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...ingredient,
  };
  db.ingredients.push(newIngredient);
  saveDB(db);
  return newIngredient;
}

export function updateIngredient(id, updates) {
  const db = getDB();
  const index = db.ingredients.findIndex((i) => i.id === id);
  if (index === -1) return null;
  db.ingredients[index] = { ...db.ingredients[index], ...updates };
  saveDB(db);
  return db.ingredients[index];
}

export function deleteIngredient(id) {
  const db = getDB();
  db.ingredients = db.ingredients.filter((i) => i.id !== id);
  saveDB(db);
}

// ---- Recipes ----

export function getRecipes() {
  return getDB().recipes;
}

export function addRecipe(recipe) {
  const db = getDB();
  const newRecipe = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...recipe,
  };
  db.recipes.push(newRecipe);
  saveDB(db);
  return newRecipe;
}

export function updateRecipe(id, updates) {
  const db = getDB();
  const index = db.recipes.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.recipes[index] = { ...db.recipes[index], ...updates };
  saveDB(db);
  return db.recipes[index];
}

export function deleteRecipe(id) {
  const db = getDB();
  db.recipes = db.recipes.filter((r) => r.id !== id);
  saveDB(db);
}

// ---- Inventory ----

export function getInventory() {
  return getDB().inventory;
}

export function addInventoryEntry(entry) {
  const db = getDB();
  const newEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    ...entry,
  };
  db.inventory.push(newEntry);
  saveDB(db);
  return newEntry;
}

// ---- Waste Log ----

export function getWaste() {
  return getDB().waste;
}

export function addWasteEntry(entry) {
  const db = getDB();
  const newEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    ...entry,
  };
  db.waste.push(newEntry);
  saveDB(db);
  return newEntry;
}

// ---- Inventory Levels ----

export function getInventoryLevels() {
  return getDB().inventoryLevels;
}

export function getInventoryLevel(ingredientId) {
  const level = getDB().inventoryLevels.find((i) => i.ingredientId === ingredientId);
  return level || null;
}

export function setInventoryLevel(ingredientId, { onHand, minLevel }) {
  const db = getDB();
  const index = db.inventoryLevels.findIndex((i) => i.ingredientId === ingredientId);
  const timestamp = new Date().toISOString();

  if (index !== -1) {
    const existing = db.inventoryLevels[index];
    const updated = {
      ...existing,
      onHand: onHand ?? existing.onHand ?? 0,
      minLevel: minLevel ?? existing.minLevel ?? 0,
      lastUpdated: timestamp,
    };
    db.inventoryLevels[index] = updated;
    saveDB(db);
    return updated;
  }

  const newEntry = {
    id: generateId(),
    ingredientId,
    onHand: onHand ?? 0,
    minLevel: minLevel ?? 0,
    lastUpdated: timestamp,
  };
  db.inventoryLevels.push(newEntry);
  saveDB(db);
  return newEntry;
}

// ---- Delivery Log ----

export function logDelivery({ ingredientId, quantity, note }) {
  const db = getDB();
  const qty = Number(quantity) || 0;
  const entry = {
    id: generateId(),
    ingredientId,
    quantity: qty,
    date: new Date().toISOString(),
    note: note || '',
  };
  db.deliveryLog.push(entry);

  const levelIndex = db.inventoryLevels.findIndex((i) => i.ingredientId === ingredientId);
  const timestamp = new Date().toISOString();

  if (levelIndex !== -1) {
    const level = db.inventoryLevels[levelIndex];
    db.inventoryLevels[levelIndex] = {
      ...level,
      onHand: (level.onHand || 0) + qty,
      lastUpdated: timestamp,
    };
  } else {
    db.inventoryLevels.push({
      id: generateId(),
      ingredientId,
      onHand: qty,
      minLevel: 0,
      lastUpdated: timestamp,
    });
  }

  saveDB(db);
  return entry;
}

export function getDeliveryLog() {
  return getDB().deliveryLog;
}

// ---- Usage Log ----

export function logUsage({ ingredientId, quantity, note }) {
  const db = getDB();
  const qty = Number(quantity) || 0;
  const entry = {
    id: generateId(),
    ingredientId,
    quantity: qty,
    date: new Date().toISOString(),
    note: note || '',
  };
  db.usageLog.push(entry);

  const levelIndex = db.inventoryLevels.findIndex((i) => i.ingredientId === ingredientId);
  const timestamp = new Date().toISOString();

  if (levelIndex !== -1) {
    const level = db.inventoryLevels[levelIndex];
    db.inventoryLevels[levelIndex] = {
      ...level,
      onHand: Math.max(0, (level.onHand || 0) - qty),
      lastUpdated: timestamp,
    };
  } else {
    db.inventoryLevels.push({
      id: generateId(),
      ingredientId,
      onHand: 0,
      minLevel: 0,
      lastUpdated: timestamp,
    });
  }

  saveDB(db);
  return entry;
}

export function getUsageLog() {
  return getDB().usageLog;
}

// ---- Export/Import (for backup & moving between devices) ----

export function exportData() {
  return JSON.stringify(getDB(), null, 2);
}

export function importData(jsonString) {
  const data = JSON.parse(jsonString);
  saveDB(data);
}

// ---- Categories for deli ingredients ----

export const CATEGORIES = [
  'Meat & Protein',
  'Cheese & Dairy',
  'Bread & Bakery',
  'Produce',
  'Condiments & Sauces',
  'Beverages',
  'Dry Goods',
  'Paper & Supplies',
  'Other',
];

export const UNITS = [
  'lb',
  'oz',
  'kg',
  'g',
  'each',
  'case',
  'gallon',
  'quart',
  'pint',
  'liter',
  'dozen',
  'bag',
  'box',
  'slice',
  'portion',
];
