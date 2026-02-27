import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSyscoCSV } from '../lib/sysco-import';
import { parsePeddlersPDF } from '../lib/peddlers-import';
import { addIngredient, getIngredients, CATEGORIES } from '../lib/db';

const VENDORS = [
  {
    id: 'sysco',
    name: 'Sysco',
    accept: '.csv,.txt',
    description: 'Upload CSV from Sysco Shop → Order History',
  },
  {
    id: 'peddlers',
    name: "Peddler's Son",
    accept: '.pdf',
    description: 'Upload invoice PDF from Peddler\'s Son',
  },
  {
    id: 'pepsi',
    name: 'Pepsi',
    accept: '.csv,.pdf,.txt',
    description: 'Upload CSV or PDF from Pepsi (coming soon)',
    disabled: true,
  },
  {
    id: 'boarshead',
    name: "Boar's Head",
    accept: '.csv,.pdf,.txt',
    description: 'Upload invoice (coming soon)',
    disabled: true,
  },
];

export default function Import() {
  const [vendor, setVendor] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !vendor) return;
    setError('');
    setLoading(true);

    try {
      let items = [];

      if (vendor.id === 'sysco') {
        const text = await file.text();
        items = parseSyscoCSV(text);
      } else if (vendor.id === 'peddlers') {
        items = await parsePeddlersPDF(file);
      }

      if (items.length === 0) {
        setError(
          'No items found in this file. Make sure it matches the expected format for ' +
            vendor.name +
            '.'
        );
        setLoading(false);
        return;
      }

      // Check for duplicates against existing ingredients
      const existing = getIngredients();
      const existingVendorIds = new Set(
        existing
          .filter((i) => i.vendorId || i.syscoId)
          .map((i) => i.vendorId || i.syscoId)
      );

      items.forEach((item) => {
        const id = item.vendorId || item.syscoId;
        item._isDuplicate = id ? existingVendorIds.has(id) : false;
      });

      setParsed(items);
      setSelected(
        new Set(
          items
            .filter((i) => !i._isDuplicate)
            .map((_, idx) => idx)
        )
      );
      setImported(false);
    } catch (err) {
      setError('Error reading file: ' + err.message);
    }
    setLoading(false);
  }

  function toggleItem(idx) {
    const next = new Set(selected);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === parsed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsed.map((_, i) => i)));
    }
  }

  function handleCategoryChange(idx, category) {
    const updated = [...parsed];
    updated[idx] = { ...updated[idx], category };
    setParsed(updated);
  }

  function handleImport() {
    let count = 0;
    for (const idx of selected) {
      const item = parsed[idx];
      addIngredient({
        syscoId: item.syscoId,
        vendorId: item.vendorId,
        name: item.name,
        brand: item.brand || '',
        category: item.category,
        purchaseUnit: item.purchaseUnit,
        purchaseSize: item.purchaseSize,
        purchaseCost: item.purchaseCost,
        costPerUnit: item.costPerUnit,
        supplier: item.supplier,
        notes: item.notes,
      });
      count++;
    }
    setImportCount(count);
    setImported(true);
  }

  function handleReset() {
    setVendor(null);
    setParsed([]);
    setSelected(new Set());
    setImported(false);
    setError('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Import Ingredients
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload invoices from your vendors to bulk-add ingredients.
      </p>

      {/* Vendor Selection */}
      {!vendor && !imported && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Select Vendor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VENDORS.map((v) => (
              <button
                key={v.id}
                onClick={() => !v.disabled && setVendor(v)}
                disabled={v.disabled}
                className={`text-left bg-white rounded-xl border p-4 transition-all ${
                  v.disabled
                    ? 'border-gray-100 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-sm cursor-pointer'
                }`}
              >
                <h3 className="font-medium text-gray-900">{v.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                {v.disabled && (
                  <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-2">
                    Coming soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Upload */}
      {vendor && !imported && parsed.length === 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              Upload {vendor.name} Invoice
            </h2>
          </div>

          <label className="block">
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer">
              {loading ? (
                <>
                  <p className="text-3xl mb-2 animate-spin">⏳</p>
                  <p className="font-medium text-gray-700">
                    Reading file...
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-2">📄</p>
                  <p className="font-medium text-gray-700">
                    Click to upload {vendor.name} file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {vendor.description}
                  </p>
                </>
              )}
              <input
                type="file"
                accept={vendor.accept}
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </div>
          </label>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          {error}
          <button
            onClick={handleReset}
            className="block mt-2 text-red-600 underline text-xs"
          >
            Try again
          </button>
        </div>
      )}

      {/* Success Message */}
      {imported && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
          <p className="text-3xl mb-2">✅</p>
          <h3 className="text-lg font-semibold text-green-800">
            Imported {importCount} ingredients from {vendor?.name}!
          </h3>
          <p className="text-sm text-green-600 mt-1">
            They're now in your ingredients list.
          </p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => navigate('/ingredients')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              View Ingredients
            </button>
            <button
              onClick={handleReset}
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Import Another
            </button>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parsed.length > 0 && !imported && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {vendor?.name} — {parsed.length} items found
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selected.size} selected for import
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1"
              >
                {selected.size === parsed.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selected.size} Items
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {parsed.map((item, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-lg border p-4 transition-colors ${
                  item._isDuplicate
                    ? 'border-amber-200 bg-amber-50'
                    : selected.has(idx)
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleItem(idx)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {item.name}
                      </span>
                      {item.brand && (
                        <span className="text-xs text-gray-400">
                          {item.brand}
                        </span>
                      )}
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {item.supplier}
                      </span>
                      {item._isDuplicate && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                          Already imported
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {item.packSize && <span>Pack: {item.packSize}</span>}
                      <span>
                        Cost:{' '}
                        <b className="text-gray-700">
                          ${item.purchaseCost.toFixed(2)}
                        </b>
                        {item.perLb && ' (per-lb pricing)'}
                      </span>
                      <span>
                        Per {item.purchaseUnit}:{' '}
                        <b className="text-green-700">
                          ${item.costPerUnit.toFixed(4)}
                        </b>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Category:</span>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleCategoryChange(idx, e.target.value)
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {selected.size} Items
            </button>
          </div>
        </>
      )}
    </div>
  );
}
