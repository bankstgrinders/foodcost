import { useState, useEffect } from 'react';
import {
  getIngredients,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  CATEGORIES,
  UNITS,
} from '../lib/db';

const emptyForm = {
  name: '',
  category: CATEGORIES[0],
  purchaseUnit: UNITS[0],
  purchaseSize: '',
  purchaseCost: '',
  supplier: '',
  notes: '',
};

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    setIngredients(getIngredients());
  }, []);

  function refreshData() {
    setIngredients(getIngredients());
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      ...form,
      purchaseSize: parseFloat(form.purchaseSize) || 0,
      purchaseCost: parseFloat(form.purchaseCost) || 0,
    };
    // Calculate cost per unit
    data.costPerUnit =
      data.purchaseSize > 0 ? data.purchaseCost / data.purchaseSize : 0;

    if (editingId) {
      updateIngredient(editingId, data);
    } else {
      addIngredient(data);
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    refreshData();
  }

  function handleEdit(ingredient) {
    setForm({
      name: ingredient.name,
      category: ingredient.category,
      purchaseUnit: ingredient.purchaseUnit,
      purchaseSize: ingredient.purchaseSize.toString(),
      purchaseCost: ingredient.purchaseCost.toString(),
      supplier: ingredient.supplier || '',
      notes: ingredient.notes || '',
    });
    setEditingId(ingredient.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    deleteIngredient(id);
    setDeleteConfirm(null);
    refreshData();
  }

  function handleCancel() {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  }

  const filtered = ingredients.filter((i) => {
    const matchesSearch = i.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === 'All' || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredients</h1>
          <p className="text-sm text-gray-500">
            {ingredients.length} total ingredients
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
          + Add Ingredient
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Turkey Breast"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Size *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    step="any"
                    min="0"
                    value={form.purchaseSize}
                    onChange={(e) =>
                      setForm({ ...form, purchaseSize: e.target.value })
                    }
                    placeholder="e.g., 5"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                  <select
                    value={form.purchaseUnit}
                    onChange={(e) =>
                      setForm({ ...form, purchaseUnit: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Cost ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={form.purchaseCost}
                  onChange={(e) =>
                    setForm({ ...form, purchaseCost: e.target.value })
                  }
                  placeholder="e.g., 45.99"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                  placeholder="e.g., Sysco, US Foods"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            {/* Cost preview */}
            {form.purchaseSize && form.purchaseCost && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  Cost per {form.purchaseUnit}:{' '}
                  <span className="font-bold">
                    $
                    {(
                      parseFloat(form.purchaseCost) /
                      parseFloat(form.purchaseSize)
                    ).toFixed(4)}
                  </span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {editingId ? 'Save Changes' : 'Add Ingredient'}
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
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search ingredients..."
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
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Ingredient List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {ingredients.length === 0
            ? 'No ingredients yet. Click "+ Add Ingredient" to get started.'
            : 'No ingredients match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ingredient) => (
            <div
              key={ingredient.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">
                    {ingredient.name}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {ingredient.category}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  ${ingredient.purchaseCost.toFixed(2)} / {ingredient.purchaseSize}{' '}
                  {ingredient.purchaseUnit}
                  <span className="mx-2">·</span>
                  <span className="text-green-700 font-medium">
                    ${ingredient.costPerUnit.toFixed(4)} per {ingredient.purchaseUnit}
                  </span>
                  {ingredient.supplier && (
                    <>
                      <span className="mx-2">·</span>
                      {ingredient.supplier}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(ingredient)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
                {deleteConfirm === ingredient.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(ingredient.id)}
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
                    onClick={() => setDeleteConfirm(ingredient.id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
