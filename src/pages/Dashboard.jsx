import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getIngredients,
  getRecipes,
  getInventoryLevels,
  getDeliveryLog,
  getUsageLog,
  getWaste,
} from '../lib/db';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ingredients = getIngredients();
    const recipes = getRecipes();
    const levels = getInventoryLevels();
    const deliveryLog = getDeliveryLog();
    const usageLog = getUsageLog();
    const waste = getWaste();

    // Build ingredient lookup
    const ingMap = {};
    ingredients.forEach((i) => (ingMap[i.id] = i));

    // Recipe profitability
    const recipeStats = recipes
      .filter((r) => r.salePrice > 0 && r.costPerServing > 0)
      .map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        salePrice: r.salePrice,
        costPerServing: r.costPerServing,
        profit: r.profit || r.salePrice - r.costPerServing,
        foodCostPercent: r.foodCostPercent || (r.costPerServing / r.salePrice) * 100,
      }))
      .sort((a, b) => a.foodCostPercent - b.foodCostPercent);

    // Overall avg food cost %
    const avgFoodCost =
      recipeStats.length > 0
        ? recipeStats.reduce((sum, r) => sum + r.foodCostPercent, 0) / recipeStats.length
        : 0;

    // Low stock
    const lowStock = levels
      .filter((l) => l.minLevel > 0 && l.onHand <= l.minLevel)
      .map((l) => ({
        ...l,
        ingredient: ingMap[l.ingredientId],
      }))
      .filter((l) => l.ingredient);

    // Total waste cost
    const wasteCost = waste.reduce((sum, w) => {
      const ing = ingMap[w.ingredientId];
      if (!ing) return sum;
      return sum + (ing.costPerUnit || 0) * (w.quantity || 0);
    }, 0);

    // Recent activity (last 10)
    const recentActivity = [
      ...deliveryLog.map((e) => ({ ...e, type: 'delivery' })),
      ...usageLog.map((e) => ({ ...e, type: 'usage' })),
      ...waste.map((e) => ({ ...e, type: 'waste' })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    // Total inventory value (on-hand * cost per unit)
    const inventoryValue = levels.reduce((sum, l) => {
      const ing = ingMap[l.ingredientId];
      if (!ing) return sum;
      return sum + (l.onHand || 0) * (ing.costPerUnit || 0);
    }, 0);

    setData({
      ingredientCount: ingredients.length,
      recipeCount: recipes.length,
      recipeStats,
      avgFoodCost,
      lowStock,
      wasteCost,
      wasteCount: waste.length,
      recentActivity,
      inventoryValue,
      ingMap,
    });
  }, []);

  if (!data) return null;

  const topProfitable = data.recipeStats.slice(0, 5);
  const leastProfitable = [...data.recipeStats].reverse().slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Your deli food cost overview</p>
      </div>

      {data.ingredientCount === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🥪</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Welcome to FoodCost!
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Start by adding your deli ingredients to calculate food costs.
          </p>
          <Link
            to="/ingredients"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Add Your First Ingredient
          </Link>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Avg Food Cost %"
              value={
                data.avgFoodCost > 0
                  ? `${data.avgFoodCost.toFixed(1)}%`
                  : '—'
              }
              color={
                data.avgFoodCost <= 30
                  ? 'green'
                  : data.avgFoodCost <= 35
                  ? 'amber'
                  : 'red'
              }
            />
            <StatCard
              label="Inventory Value"
              value={`$${data.inventoryValue.toFixed(2)}`}
              color="blue"
            />
            <StatCard
              label="Low Stock Items"
              value={data.lowStock.length}
              color={data.lowStock.length > 0 ? 'red' : 'green'}
            />
            <StatCard
              label="Waste Cost"
              value={`$${data.wasteCost.toFixed(2)}`}
              color={data.wasteCost > 0 ? 'amber' : 'green'}
            />
          </div>

          {/* Second row stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Ingredients"
              value={data.ingredientCount}
              color="purple"
            />
            <StatCard
              label="Recipes"
              value={data.recipeCount}
              color="blue"
            />
            <StatCard
              label="Recipes Priced"
              value={data.recipeStats.length}
              color="green"
            />
            <StatCard
              label="Waste Entries"
              value={data.wasteCount}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Most Profitable */}
            {topProfitable.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Best Food Cost %
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {topProfitable.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 py-3 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {r.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {r.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            r.foodCostPercent <= 30
                              ? 'text-green-700'
                              : r.foodCostPercent <= 35
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {r.foodCostPercent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          ${r.profit.toFixed(2)} profit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Least Profitable */}
            {leastProfitable.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Needs Attention (Highest Food Cost %)
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {leastProfitable.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 py-3 flex justify-between items-center"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {r.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {r.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            r.foodCostPercent <= 30
                              ? 'text-green-700'
                              : r.foodCostPercent <= 35
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {r.foodCostPercent.toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          ${r.profit.toFixed(2)} profit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          {data.lowStock.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Low Stock Alerts
              </h2>
              <div className="bg-red-50 rounded-xl border border-red-200 divide-y divide-red-100">
                {data.lowStock.map((item) => (
                  <div
                    key={item.ingredientId}
                    className="px-4 py-3 flex justify-between items-center"
                  >
                    <span className="text-sm font-medium text-red-900">
                      {item.ingredient.displayName || item.ingredient.name}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-700">
                        {item.onHand} {item.ingredient.purchaseUnit}
                      </span>
                      <span className="text-xs text-red-400 ml-2">
                        min: {item.minLevel}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2">
                  <Link
                    to="/inventory"
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    View Inventory →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {data.recentActivity.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Recent Activity
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {data.recentActivity.map((entry) => {
                  const ing = data.ingMap[entry.ingredientId];
                  const name = ing
                    ? ing.displayName || ing.name
                    : 'Unknown';
                  const typeConfig = {
                    delivery: {
                      badge: '+ IN',
                      badgeClass: 'bg-green-100 text-green-700',
                      qtyClass: 'text-green-700',
                      prefix: '+',
                    },
                    usage: {
                      badge: '- OUT',
                      badgeClass: 'bg-amber-100 text-amber-700',
                      qtyClass: 'text-amber-700',
                      prefix: '-',
                    },
                    waste: {
                      badge: 'WASTE',
                      badgeClass: 'bg-red-100 text-red-700',
                      qtyClass: 'text-red-700',
                      prefix: '-',
                    },
                  };
                  const cfg = typeConfig[entry.type];
                  return (
                    <div
                      key={entry.id}
                      className="px-4 py-3 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                        >
                          {cfg.badge}
                        </span>
                        <span className="text-sm text-gray-900">{name}</span>
                        {entry.note && (
                          <span className="text-xs text-gray-400">
                            — {entry.note}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${cfg.qtyClass}`}>
                          {cfg.prefix}{entry.quantity}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <QuickAction to="/import" title="Import Invoice" icon="📥" />
              <QuickAction to="/recipes" title="Build Recipe" icon="📋" />
              <QuickAction to="/inventory" title="Check Stock" icon="📦" />
              <QuickAction to="/waste" title="Log Waste" icon="🗑️" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-75">{label}</p>
    </div>
  );
}

function QuickAction({ to, title, icon }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all block text-center"
    >
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-gray-900 mt-1 text-sm">{title}</h3>
    </Link>
  );
}
