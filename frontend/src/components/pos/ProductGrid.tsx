import { useState, useEffect } from 'react';
import { productsApi, Product } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';
import { formatCurrency } from '../../utils/format';
import { Package } from 'lucide-react';
import { API_BASE_URL } from '../../api/axios';

interface ProductGridProps {
  onAddToCart: (product: Product) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  stockMap?: Record<number, number>;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductGrid({ onAddToCart, search: searchProp, onSearchChange, stockMap }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(searchProp ?? '');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  // sync internal search when controlled externally
  const currentSearch = searchProp !== undefined ? searchProp : search;
  const handleSearchChange = onSearchChange ?? setSearch;

  useEffect(() => {
    loadData();
  }, [currentSearch, selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll(1, 100, currentSearch, selectedCategory),
        categoriesApi.getAll(),
      ]);
      setProducts(productsRes.data.data);
      setCategories((categoriesRes.data as { success: boolean; data: Category[] }).data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category filter (search is controlled from the POS page header) */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหาสินค้า หรือสแกนบาร์โค้ด..."
            value={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : undefined)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="card p-3 text-left hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <div className="relative aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <Package className="text-gray-400" size={40} />
                )}
                {/* ป้ายสินค้าหมด */}
                {stockMap && stockMap[product.id] !== undefined && stockMap[product.id] <= 0 && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                    <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg">สินค้าหมด</span>
                  </div>
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
              <p className="text-primary-600 font-bold">{formatCurrency(product.price)}</p>
              <p className="text-gray-500 text-xs">SKU: {product.sku ?? '-'}</p>
              {/* แสดงสถานะสต็อก */}
              {stockMap && stockMap[product.id] !== undefined && (
                <p className={`text-xs font-medium mt-1 ${stockMap[product.id] <= 0 ? 'text-red-600' : stockMap[product.id] <= 5 ? 'text-orange-500' : 'text-gray-500'}`}>
                  {stockMap[product.id] <= 0 ? 'สินค้าหมด' : `สต็อกเหลือ ${stockMap[product.id]}`}
                </p>
              )}
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-12">
              <Package size={48} className="mb-2" />
              <p>ไม่พบสินค้า</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
