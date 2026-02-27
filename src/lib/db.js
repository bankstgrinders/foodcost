// Simple localStorage database for the food cost app
// This keeps data on the device. We'll add cloud sync (Supabase) later.

const DB_KEY = 'foodcost_db';

const defaultData = {
  ingredients: [],
  recipes: [],
  inventory: [],
  waste: [],
};

function getDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { ...defaultData };
    return JSON.parse(raw);
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
