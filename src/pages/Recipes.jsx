import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getIngredients,
  getRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  UNITS,
} from '../lib/db';

const MENU_CATEGORIES = [
  'Sandwiches',
  'Salads',
  'Soups',
  'Sides',
  'Beverages',
  'Breakfast',
  'Platters',
  'Desserts',
  'Other',
];

const emptyForm = {
  name: '',
  category: MENU_CATEGORIES[0],
  servings: '1',
  salePrice: '',
  notes: '',
  ingredients: [], // { ingredientId, quantity, unit }
};

export default function Recipes() {
  const [allIngredients, setAllIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  // For the ingredient picker in the form
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setAllIngredients(getIngredients());
    setRecipes(getRecipes());
  }, []);

  function refreshData() {
    setAllIngredients(getIngredients());
    setRecipes(getRecipes());
  }

  function getIngredientById(id) {
    return allIngredients.find((i) => i.id === id);
  }

  function calcRecipeCost(recipeIngredients) {
    let total = 0;
    for (const ri of recipeIngredients) {
      const ingredient = getIngredientById(ri.ingredientId);
      if (ingredient) {
        total += ingredient.costPerUnit * (parseFloat(ri.quantity) || 0);
      }
    }
    return total;
  }

  function handleAddIngredientToRecipe(ingredientId) {
    const ingredient = getIngredientById(ingredientId);
    if (!ingredient) return;
    // Don't add duplicates
    if (form.ingredients.some((i) => i.ingredientId === ingredientId)) return;
    setForm({
      ...form,
      ingredients: [
        ...form.ingredients,
        {
          ingredientId,
          quantity: '',
          unit: ingredient.purchaseUnit,
        },
      ],
    });
    setIngredientSearch('');
    setPickerOpen(false);
  }

  function handleRemoveIngredientFromRecipe(ingredientId) {
    setForm({
      ...form,
      ingredients: form.ingredients.filter(
        (i) => i.ingredientId !== ingredientId
      ),
    });
  }

  function handleIngredientQuantityChange(ingredientId, quantity) {
    setForm({
      ...form,
      ingredients: form.ingredients.map((i) =>
        i.ingredientId === ingredientId ? { ...i, quantity } : i
      ),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      name: form.name,
      category: form.category,
      servings: parseInt(form.servings) || 1,
      salePrice: parseFloat(form.salePrice) || 0,
      notes: form.notes,
      ingredients: form.ingredients.map((i) => ({
        ...i,
        quantity: parseFloat(i.quantity) || 0,
      })),
    };

    // Calculate totals
    data.totalCost = calcRecipeCost(data.ingredients);
    data.costPerServing =
      data.servings > 0 ? data.totalCost / data.servings : 0;
    data.foodCostPercent =
      data.salePrice > 0 ? (data.costPerServing / data.salePrice) * 100 : 0;
    data.profit = data.salePrice - data.costPerServing;

    if (editingId) {
      updateRecipe(editingId, data);
    } else {
      addRecipe(data);
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    refreshData();
  }

  function handleEdit(recipe) {
    setForm({
      name: recipe.name,
      category: recipe.category,
      servings: recipe.servings.toString(),
      salePrice: recipe.salePrice.toString(),
      notes: recipe.notes || '',
      ingredients: recipe.ingredients.map((i) => ({
        ...i,
        quantity: i.quantity.toString(),
      })),
    });
    setEditingId(recipe.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    deleteRecipe(id);
    setDeleteConfirm(null);
    refreshData();
  }

  function handleCancel() {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  }

  // Filter the ingredient picker dropdown
  const filteredPickerIngredients = allIngredients.filter(
    (i) =>
      i.name.toLowerCase().includes(ingredientSearch.toLowerCase()) &&
      !form.ingredients.some((fi) => fi.ingredientId === i.id)
  );

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch = r.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === 'All' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const recipeCost = calcRecipeCost(form.ingredients);
  const servings = parseInt(form.servings) || 1;
  const costPerServing = servings > 0 ? recipeCost / servings : 0;
  const salePrice = parseFloat(form.salePrice) || 0;
  const foodCostPct =
    salePrice > 0 ? (costPerServing / salePrice) * 100 : 0;

  if (allIngredients.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recipes</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">📋</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Add ingredients first
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            You need ingredients before you can build recipes.
          </p>
          <Link
            to="/ingredients"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Go to Ingredients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500">
            {recipes.length} menu items
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          + New Recipe
        </button>
      </div>

      {/* Recipe Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Turkey Club Sandwich"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {MENU_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servings per batch
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.servings}
                  onChange={(e) =>
                    setForm({ ...form, servings: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salePrice}
                  onChange={(e) =>
                    setForm({ ...form, salePrice: e.target.value })
                  }
                  placeholder="e.g., 12.99"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            {/* Ingredient Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingredients
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  onFocus={() => setPickerOpen(true)}
                  onBlur={() => setTimeout(() => setPickerOpen(false), 200)}
                  placeholder="Click to browse or type to search ingredients..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
                {pickerOpen && filteredPickerIngredients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredPickerIngredients.map((ingredient) => (
                      <button
                        key={ingredient.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          handleAddIngredientToRecipe(ingredient.id)
                        }
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <span className="text-gray-900">{ingredient.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{ingredient.category}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          ${ingredient.costPerUnit.toFixed(4)}/
                          {ingredient.purchaseUnit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected ingredients with quantities */}
            {form.ingredients.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 grid grid-cols-12 gap-2">
                  <span className="col-span-5">Ingredient</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-2">Unit</span>
                  <span className="col-span-2 text-right">Cost</span>
                  <span className="col-span-1"></span>
                </div>
                {form.ingredients.map((ri) => {
                  const ingredient = getIngredientById(ri.ingredientId);
                  if (!ingredient) return null;
                  const lineCost =
                    ingredient.costPerUnit * (parseFloat(ri.quantity) || 0);
                  return (
                    <div
                      key={ri.ingredientId}
                      className="px-4 py-2 grid grid-cols-12 gap-2 items-center border-t border-gray-100"
                    >
                      <span className="col-span-5 text-sm text-gray-900 truncate">
                        {ingredient.name}
                      </span>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={ri.quantity}
                          onChange={(e) =>
                            handleIngredientQuantityChange(
                              ri.ingredientId,
                              e.target.value
                            )
                          }
                          placeholder="0"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>
                      <span className="col-span-2 text-xs text-gray-500">
                        {ri.unit}
                      </span>
                      <span className="col-span-2 text-sm text-right font-medium text-gray-700">
                        ${lineCost.toFixed(2)}
                      </span>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveIngredientFromRecipe(ri.ingredientId)
                          }
                          className="text-red-400 hover:text-red-600 text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cost Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Recipe Cost:</span>
                <span className="font-bold text-gray-900">
                  ${recipeCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Cost per Serving ({servings} servings):
                </span>
                <span className="font-bold text-gray-900">
                  ${costPerServing.toFixed(2)}
                </span>
              </div>
              {salePrice > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                    <span className="text-gray-600">Sale Price:</span>
                    <span className="font-medium text-gray-900">
                      ${salePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Profit per Serving:</span>
                    <span
                      className={`font-bold ${
                        salePrice - costPerServing > 0
                          ? 'text-green-700'
                          : 'text-red-600'
                      }`}
                    >
                      ${(salePrice - costPerServing).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Food Cost %:</span>
                    <span
                      className={`font-bold ${
                        foodCostPct <= 30
                          ? 'text-green-700'
                          : foodCostPct <= 35
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {foodCostPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Target: under 30% is great, 30-35% is okay, over 35% needs
                    attention
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Prep instructions, variations, etc."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Save Changes' : 'Create Recipe'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      {recipes.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          >
            <option value="All">All Categories</option>
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Recipe List */}
      {filteredRecipes.length === 0 && recipes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No recipes yet. Click "+ New Recipe" to build your first menu item.
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No recipes match your search.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecipes.map((recipe) => {
            const isExpanded = expandedRecipe === recipe.id;
            return (
              <div
                key={recipe.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() =>
                    setExpandedRecipe(isExpanded ? null : recipe.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {recipe.name}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {recipe.category}
                      </span>
                      {recipe.foodCostPercent > 0 && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            recipe.foodCostPercent <= 30
                              ? 'bg-green-100 text-green-700'
                              : recipe.foodCostPercent <= 35
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {recipe.foodCostPercent.toFixed(1)}% food cost
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Cost: ${recipe.costPerServing?.toFixed(2) || '0.00'}
                      {recipe.salePrice > 0 && (
                        <>
                          <span className="mx-2">·</span>
                          Price: ${recipe.salePrice.toFixed(2)}
                          <span className="mx-2">·</span>
                          <span className="text-green-700 font-medium">
                            Profit: ${recipe.profit?.toFixed(2) || '0.00'}
                          </span>
                        </>
                      )}
                      <span className="mx-2">·</span>
                      {recipe.ingredients?.length || 0} ingredients
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                    {deleteConfirm === recipe.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(recipe.id)}
                          className="text-sm text-red-600 font-medium px-3 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-sm text-gray-600 font-medium px-2 py-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(recipe.id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded ingredient breakdown */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      INGREDIENT BREAKDOWN
                    </p>
                    {recipe.ingredients?.map((ri) => {
                      const ingredient = getIngredientById(ri.ingredientId);
                      if (!ingredient) return null;
                      const cost = ingredient.costPerUnit * ri.quantity;
                      return (
                        <div
                          key={ri.ingredientId}
                          className="flex justify-between text-sm py-1"
                        >
                          <span className="text-gray-700">
                            {ingredient.name} — {ri.quantity} {ri.unit}
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${cost.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                      <span>Total Cost</span>
                      <span>${recipe.totalCost?.toFixed(2) || '0.00'}</span>
                    </div>
                    {recipe.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {recipe.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
