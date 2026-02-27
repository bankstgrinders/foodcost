import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIngredients, getRecipes, CATEGORIES } from '../lib/db';

export default function Dashboard() {
  const [stats, setStats] = useState({
    ingredientCount: 0,
    recipeCount: 0,
    categories: {},
    totalInventoryCost: 0,
  });

  useEffect(() => {
    const ingredients = getIngredients();
    const recipes = getRecipes();

    const categories = {};
    let totalCost = 0;
    ingredients.forEach((i) => {
      categories[i.category] = (categories[i.category] || 0) + 1;
      totalCost += i.purchaseCost || 0;
    });

    setStats({
      ingredientCount: ingredients.length,
      recipeCount: recipes.length,
      categories,
      totalInventoryCost: totalCost,
    });
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Your deli food cost overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Ingredients"
          value={stats.ingredientCount}
          color="green"
        />
        <StatCard
          label="Recipes"
          value={stats.recipeCount}
          color="blue"
        />
        <StatCard
          label="Categories Used"
          value={Object.keys(stats.categories).length}
          color="purple"
        />
        <StatCard
          label="Total Ingredient Cost"
          value={`$${stats.totalInventoryCost.toFixed(2)}`}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction
            to="/ingredients"
            title="Add Ingredients"
            description="Add your deli ingredients with costs"
            icon="🥩"
          />
          <QuickAction
            to="/recipes"
            title="Build Recipes"
            description="Create menu items from ingredients"
            icon="📋"
          />
          <QuickAction
            to="/inventory"
            title="Track Inventory"
            description="Log stock levels and deliveries"
            icon="📦"
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(stats.categories).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Ingredients by Category
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {Object.entries(stats.categories)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div
                  key={category}
                  className="flex justify-between items-center px-4 py-3"
                >
                  <span className="text-sm text-gray-700">{category}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {stats.ingredientCount === 0 && (
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
  };
  return (
    <div
      className={`rounded-xl border p-4 ${colors[color]}`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-75">{label}</p>
    </div>
  );
}

function QuickAction({ to, title, description, icon }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all block"
    >
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-gray-900 mt-2">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
