import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getIngredients,
  getInventoryLevels,
  setInventoryLevel,
  logDelivery,
  logUsage,
  getDeliveryLog,
  getUsageLog,
} from '../lib/db';

export default function Inventory() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [levels, setLevels] = useState([]);
  const [tab, setTab] = useState('stock'); // stock | usage | log
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  // Delivery/Usage form
  const [actionIngredientId, setActionIngredientId] = useState('');
  const [actionQty, setActionQty] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Set min level
  const [editingMinId, setEditingMinId] = useState(null);
  const [minValue, setMinValue] = useState('');

  // Set on-hand
  const [editingOnHandId, setEditingOnHandId] = useState(null);
  const [onHandValue, setOnHandValue] = useState('');

  const [deliveryLog, setDeliveryLog] = useState([]);
  const [usageLog, setUsageLog] = useState([]);

  useEffect(() => {
    refreshData();
  }, []);

  function refreshData() {
    setIngredients(getIngredients());
    setLevels(getInventoryLevels());
    setDeliveryLog(getDeliveryLog());
    setUsageLog(getUsageLog());
  }

  function getIngredientById(id) {
    return ingredients.find((i) => i.id === id);
  }

  function getIngredientName(id) {
    const i = getIngredientById(id);
    if (!i) return 'Unknown';
    return i.displayName || i.name;
  }

  function getLevelForIngredient(ingredientId) {
    return levels.find((l) => l.ingredientId === ingredientId);
  }

  // Build a merged list: all ingredients with their stock levels
  const stockList = ingredients
    .map((ing) => {
      const level = getLevelForIngredient(ing.id);
      return {
        ...ing,
        onHand: level?.onHand ?? 0,
        minLevel: level?.minLevel ?? 0,
        lastUpdated: level?.lastUpdated,
        isLow: level ? level.onHand <= level.minLevel && level.minLevel > 0 : false,
      };
    })
    .filter((item) => {
      const searchTerm = search.toLowerCase();
      const matchesSearch =
        (item.displayName && item.displayName.toLowerCase().includes(searchTerm)) ||
        item.name.toLowerCase().includes(searchTerm);
      const matchesLow = showLowOnly ? item.isLow : true;
      return matchesSearch && matchesLow;
    });

  const lowStockCount = ingredients.filter((ing) => {
    const level = getLevelForIngredient(ing.id);
    return level && level.onHand <= level.minLevel && level.minLevel > 0;
  }).length;

  // Ingredient picker for delivery/usage
  const filteredPicker = ingredients.filter(
    (i) =>
      (i.displayName && i.displayName.toLowerCase().includes(pickerSearch.toLowerCase())) ||
      i.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  function handleDelivery(e) {
    e.preventDefault();
    if (!actionIngredientId || !actionQty) return;
    logDelivery({
      ingredientId: actionIngredientId,
      quantity: parseFloat(actionQty),
      note: actionNote,
    });
    setActionIngredientId('');
    setActionQty('');
    setActionNote('');
    refreshData();
  }

  function handleUsage(e) {
    e.preventDefault();
    if (!actionIngredientId || !actionQty) return;
    logUsage({
      ingredientId: actionIngredientId,
      quantity: parseFloat(actionQty),
      note: actionNote,
    });
    setActionIngredientId('');
    setActionQty('');
    setActionNote('');
    refreshData();
  }

  function handleSetMin(ingredientId) {
    const current = getLevelForIngredient(ingredientId);
    setInventoryLevel(ingredientId, {
      onHand: current?.onHand,
      minLevel: parseFloat(minValue) || 0,
    });
    setEditingMinId(null);
    setMinValue('');
    refreshData();
  }

  function handleSetOnHand(ingredientId) {
    const current = getLevelForIngredient(ingredientId);
    setInventoryLevel(ingredientId, {
      onHand: parseFloat(onHandValue) || 0,
      minLevel: current?.minLevel,
    });
    setEditingOnHandId(null);
    setOnHandValue('');
    refreshData();
  }

  // Quick action: log delivery/usage directly from stock row
  function handleQuickDelivery() {
    navigate('/import');
  }

  function handleQuickUsage(ingredientId) {
    setActionIngredientId(ingredientId);
    setTab('usage');
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">
            {ingredients.length} ingredients tracked
            {lowStockCount > 0 && (
              <span className="text-red-600 font-medium ml-2">
                · {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {[
          { id: 'stock', label: 'Stock Levels' },
          { id: 'delivery', label: 'Log Delivery', link: '/import' },
          { id: 'usage', label: 'Log Usage' },
          { id: 'log', label: 'History' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => t.link ? navigate(t.link) : setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stock Levels Tab */}
      {tab === 'stock' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showLowOnly
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {showLowOnly ? `Low Stock (${lowStockCount})` : 'Show Low Only'}
            </button>
          </div>

          {stockList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {ingredients.length === 0
                ? 'No ingredients yet. Import some first!'
                : 'No items match your filters.'}
            </div>
          ) : (
            <div className="space-y-2">
              {stockList.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg border p-4 ${
                    item.isLow
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">
                          {item.displayName || item.name}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                        {item.isLow && (
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
                            LOW STOCK
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          On hand:{' '}
                          <b className={item.isLow ? 'text-red-700' : 'text-gray-900'}>
                            {item.onHand} {item.purchaseUnit}
                          </b>
                        </span>
                        <span>
                          Min:{' '}
                          {editingMinId === item.id ? (
                            <span className="inline-flex gap-1 items-center">
                              <input
                                type="number"
                                autoFocus
                                step="any"
                                min="0"
                                value={minValue}
                                onChange={(e) => setMinValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSetMin(item.id);
                                  if (e.key === 'Escape') setEditingMinId(null);
                                }}
                                className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-green-500"
                              />
                              <button
                                onClick={() => handleSetMin(item.id)}
                                className="text-green-600 text-xs font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMinId(null)}
                                className="text-gray-400 text-xs"
                              >
                                ×
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingMinId(item.id);
                                setMinValue(item.minLevel.toString());
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              {item.minLevel > 0 ? `${item.minLevel} ${item.purchaseUnit}` : 'Set'}
                            </button>
                          )}
                        </span>
                        {item.lastUpdated && (
                          <span className="text-xs text-gray-400">
                            Updated: {new Date(item.lastUpdated).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {editingOnHandId === item.id ? (
                        <span className="inline-flex gap-1 items-center">
                          <input
                            type="number"
                            autoFocus
                            step="any"
                            min="0"
                            value={onHandValue}
                            onChange={(e) => setOnHandValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSetOnHand(item.id);
                              if (e.key === 'Escape') setEditingOnHandId(null);
                            }}
                            className="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={() => handleSetOnHand(item.id)}
                            className="text-green-600 text-xs font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingOnHandId(null)}
                            className="text-gray-400 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingOnHandId(item.id);
                            setOnHandValue(item.onHand.toString());
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Count
                        </button>
                      )}
                      <button
                        onClick={() => handleQuickDelivery(item.id)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium px-3 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        + In
                      </button>
                      <button
                        onClick={() => handleQuickUsage(item.id)}
                        className="text-sm text-amber-600 hover:text-amber-800 font-medium px-3 py-1 rounded hover:bg-amber-50 transition-colors"
                      >
                        - Out
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Log Usage
          </h2>
          <form onSubmit={handleUsage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingredient *
              </label>
              <div className="relative">
                {actionIngredientId ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 border border-amber-300 bg-amber-50 rounded-lg px-3 py-2 text-sm text-gray-900">
                      {getIngredientName(actionIngredientId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActionIngredientId('')}
                      className="text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      onFocus={() => setPickerOpen(true)}
                      onClick={() => setPickerOpen(true)}
                      onBlur={() => setTimeout(() => setPickerOpen(false), 200)}
                      placeholder="Click to browse or type to search..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                    {pickerOpen && filteredPicker.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {filteredPicker.map((ing) => {
                          const level = getLevelForIngredient(ing.id);
                          return (
                            <button
                              key={ing.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setActionIngredientId(ing.id);
                                setPickerOpen(false);
                                setPickerSearch('');
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                            >
                              <span className="text-gray-900">
                                {ing.displayName || ing.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {level ? `${level.onHand} ${ing.purchaseUnit}` : '—'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  min="0"
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                  placeholder="e.g., 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="e.g., Waste, dropped, used for catering"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!actionIngredientId || !actionQty}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Log Usage
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {tab === 'log' && (
        <div>
          <div className="space-y-2">
            {[...deliveryLog.map((e) => ({ ...e, type: 'delivery' })),
              ...usageLog.map((e) => ({ ...e, type: 'usage' }))]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 50)
              .map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-white rounded-lg border p-3 flex items-center justify-between ${
                    entry.type === 'delivery'
                      ? 'border-green-200'
                      : 'border-amber-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          entry.type === 'delivery'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.type === 'delivery' ? '+ IN' : '- OUT'}
                      </span>
                      <span className="font-medium text-sm text-gray-900">
                        {getIngredientName(entry.ingredientId)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{entry.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${
                      entry.type === 'delivery' ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {entry.type === 'delivery' ? '+' : '-'}{entry.quantity}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            {deliveryLog.length === 0 && usageLog.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No history yet. Log a delivery or usage to get started.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
