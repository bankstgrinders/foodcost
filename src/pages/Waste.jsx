import { useState, useEffect, useRef } from 'react';
import { getIngredients, getWaste, addWasteEntry, getInventoryLevel } from '../lib/db';

const REASONS = [
  'Expired',
  'Spoiled',
  'Dropped / Damaged',
  'Overproduction',
  'Customer return',
  'Other',
];

export default function Waste() {
  const [ingredients, setIngredients] = useState([]);
  const [wasteLog, setWasteLog] = useState([]);
  const [ingMap, setIngMap] = useState({});

  // Form state
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function reload() {
    const ings = getIngredients();
    const map = {};
    ings.forEach((i) => (map[i.id] = i));
    setIngredients(ings);
    setIngMap(map);
    setWasteLog(getWaste().sort((a, b) => new Date(b.date) - new Date(a.date)));
  }

  const filtered = ingredients.filter((i) => {
    const q = search.toLowerCase();
    return (
      (i.displayName || '').toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q)
    );
  });

  function handleSelect(ing) {
    setSelectedIngredient(ing);
    setSearch(ing.displayName || ing.name);
    setPickerOpen(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedIngredient || !quantity) return;

    addWasteEntry({
      ingredientId: selectedIngredient.id,
      quantity: Number(quantity),
      reason,
      note,
    });

    setSuccess(
      `Logged ${quantity} ${selectedIngredient.purchaseUnit || 'units'} of ${selectedIngredient.displayName || selectedIngredient.name} as waste.`
    );
    setSelectedIngredient(null);
    setQuantity('');
    setReason(REASONS[0]);
    setNote('');
    setSearch('');
    reload();
    setTimeout(() => setSuccess(''), 3000);
  }

  // Summary stats
  const totalWasteCost = wasteLog.reduce((sum, w) => {
    const ing = ingMap[w.ingredientId];
    if (!ing) return sum;
    return sum + (ing.costPerUnit || 0) * (w.quantity || 0);
  }, 0);

  const wastByReason = {};
  wasteLog.forEach((w) => {
    const r = w.reason || 'Other';
    if (!wastByReason[r]) wastByReason[r] = 0;
    const ing = ingMap[w.ingredientId];
    if (ing) wastByReason[r] += (ing.costPerUnit || 0) * (w.quantity || 0);
  });

  // Top wasted ingredients by cost
  const wasteByIngredient = {};
  wasteLog.forEach((w) => {
    const ing = ingMap[w.ingredientId];
    if (!ing) return;
    if (!wasteByIngredient[w.ingredientId]) {
      wasteByIngredient[w.ingredientId] = { ingredient: ing, totalCost: 0, totalQty: 0 };
    }
    wasteByIngredient[w.ingredientId].totalCost += (ing.costPerUnit || 0) * (w.quantity || 0);
    wasteByIngredient[w.ingredientId].totalQty += w.quantity || 0;
  });
  const topWasted = Object.values(wasteByIngredient)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Waste Tracking</h1>
        <p className="text-sm text-gray-500">Log waste to track losses and spot patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border p-4 bg-red-50 text-red-700 border-red-200">
          <p className="text-2xl font-bold">${totalWasteCost.toFixed(2)}</p>
          <p className="text-xs font-medium opacity-75">Total Waste Cost</p>
        </div>
        <div className="rounded-xl border p-4 bg-amber-50 text-amber-700 border-amber-200">
          <p className="text-2xl font-bold">{wasteLog.length}</p>
          <p className="text-xs font-medium opacity-75">Waste Entries</p>
        </div>
        <div className="rounded-xl border p-4 bg-purple-50 text-purple-700 border-purple-200 col-span-2 md:col-span-1">
          <p className="text-2xl font-bold">{Object.keys(wasteByIngredient).length}</p>
          <p className="text-xs font-medium opacity-75">Items Wasted</p>
        </div>
      </div>

      {/* Log Waste Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Waste</h2>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ingredient Picker */}
          <div ref={pickerRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ingredient
            </label>
            <input
              type="text"
              placeholder="Search ingredients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickerOpen(true);
                if (!e.target.value) setSelectedIngredient(null);
              }}
              onFocus={() => setPickerOpen(true)}
              onClick={() => setPickerOpen(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            {pickerOpen && filtered.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filtered.slice(0, 20).map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => handleSelect(ing)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-900">
                      {ing.displayName || ing.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ${(ing.costPerUnit || 0).toFixed(4)}/{ing.purchaseUnit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity{selectedIngredient ? ` (${selectedIngredient.purchaseUnit})` : ''}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="Any details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>

          {/* Cost preview */}
          {selectedIngredient && quantity > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <span className="text-red-700">
                Waste cost:{' '}
                <b>${((selectedIngredient.costPerUnit || 0) * Number(quantity)).toFixed(2)}</b>
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedIngredient || !quantity}
            className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Log Waste
          </button>
        </form>
      </div>

      {/* Waste by Reason */}
      {Object.keys(wastByReason).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Cost by Reason</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {Object.entries(wastByReason)
              .sort(([, a], [, b]) => b - a)
              .map(([reason, cost]) => (
                <div key={reason} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{reason}</span>
                  <span className="text-sm font-bold text-red-700">${cost.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Wasted Items */}
      {topWasted.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Most Wasted Items</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {topWasted.map((item) => (
              <div key={item.ingredient.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.ingredient.displayName || item.ingredient.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {item.totalQty} {item.ingredient.purchaseUnit}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-700">
                  ${item.totalCost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waste Log History */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Waste Log</h2>
        {wasteLog.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-3xl mb-2">🗑️</p>
            <p className="text-sm text-gray-500">No waste logged yet. Use the form above to start tracking.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {wasteLog.slice(0, 20).map((entry) => {
              const ing = ingMap[entry.ingredientId];
              const name = ing ? (ing.displayName || ing.name) : 'Unknown';
              const cost = ing ? (ing.costPerUnit || 0) * (entry.quantity || 0) : 0;
              return (
                <div key={entry.id} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {entry.quantity} {ing?.purchaseUnit || ''}
                    </span>
                    {entry.reason && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-2">
                        {entry.reason}
                      </span>
                    )}
                    {entry.note && (
                      <span className="text-xs text-gray-400 ml-2">— {entry.note}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-700">${cost.toFixed(2)}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
