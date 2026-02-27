import { Link } from 'react-router-dom';
import { getIngredients } from '../lib/db';

export default function Recipes() {
  const ingredients = getIngredients();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Recipes</h1>
      <p className="text-sm text-gray-500 mb-6">
        Build menu items from your ingredients to calculate food cost per item.
      </p>

      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        {ingredients.length === 0 ? (
          <>
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
          </>
        ) : (
          <>
            <p className="text-4xl mb-3">📋</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Recipe Builder - Coming in Phase 2
            </h3>
            <p className="text-sm text-gray-500">
              You have {ingredients.length} ingredients ready. Recipe building
              is next!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
