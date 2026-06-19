import { useState, useEffect, useRef } from 'react';
import { productsApi, Product } from '../api/products.api';
import { categoriesApi } from '../api/categories.api';
import { formatCurrency } from '../utils/format';
import { Plus, Edit, Trash2, X, ImagePlus, Trash, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

interface Category {
  id: number;
  name: string;
}

export default function Products() {
  const { showConfirm, toast } = useDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    price: '',
    cost: '',
    unit: 'ชิ้น',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [search, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const productsRes = await productsApi.getAll(currentPage, itemsPerPage, search);
      setProducts(productsRes.data.data);
      setTotalPages(productsRes.data.pagination.totalPages);
      setTotalItems(productsRes.data.pagination.total);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
    try {
      const categoriesRes = await categoriesApi.getAll();
      const payload = categoriesRes.data as { success: boolean; data: Category[] };
      if (payload.success && Array.isArray(payload.data)) {
        setCategories(payload.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('barcode', formData.barcode);
    data.append('category_id', formData.category_id);
    data.append('price', formData.price);
    data.append('cost', formData.cost);
    data.append('unit', formData.unit);

    // Append image file if selected
    if (imageFile) {
      data.append('image', imageFile);
    }

    // If editing and image was removed, send flag to clear it
    if (editingId && removeImage && !imageFile) {
      data.append('remove_image', 'true');
    }

    try {
      if (editingId) {
        await productsApi.update(editingId, data);
      } else {
        await productsApi.create(data);
      }
      resetForm();
      loadData();
      toast({ message: editingId ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', type: 'success' });
    } catch (error) {
      console.error('Failed to save product:', error);
      toast({ message: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      category_id: product.category_id?.toString() || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      unit: product.unit,
    });
    // Set existing image for preview
    setExistingImage(product.image_url || null);
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(false);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'ลบสินค้า',
      message: 'ต้องการลบสินค้านี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
      variant: 'danger',
      confirmText: 'ลบ',
      onConfirm: async () => {
        try {
          await productsApi.delete(id);
          loadData();
          toast({ message: 'ลบสินค้าสำเร็จ', type: 'success' });
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', sku: '', barcode: '', category_id: '', price: '', cost: '', unit: 'ชิ้น' });
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setRemoveImage(false);
  };

  // Determine which image to show in preview
  const displayImage = imagePreview || existingImage;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-64"
          />
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">สินค้า</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">SKU</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">บาร์โค้ด</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ราคา</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ต้นทุน</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">สถานะ</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 h-[57px]">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImagePlus size={16} className="text-gray-400" />
                      </div>
                    )}
                    <span className="font-medium">{product.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-500">{product.sku || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{product.barcode || '-'}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(product.price)}</td>
                <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(product.cost)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Fill empty rows to keep table height constant (10 rows) */}
            {products.length > 0 && products.length < itemsPerPage &&
              Array.from({ length: itemsPerPage - products.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-t border-gray-50 h-[57px]">
                  <td colSpan={7} className="px-4">&nbsp;</td>
                </tr>
              ))
            }
            {products.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">ไม่พบสินค้า</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            แสดง {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} สินค้า
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  {editingId ? <ShoppingBag size={20} className="text-primary-600" /> : <Plus size={20} className="text-primary-600" />}
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                </h3>
              </div>
              <button
                onClick={resetForm}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Image upload section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">รูปภาพสินค้า</label>
                <div className="flex items-center gap-4">
                  {/* Image preview / placeholder */}
                  <div
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {displayImage ? (
                      <img src={displayImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                          <ImagePlus size={20} className="text-gray-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1.5 block">เพิ่มรูป</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                    >
                      <ImagePlus size={14} />
                      {displayImage ? 'เปลี่ยนรูป' : 'เลือกรูป'}
                    </button>
                    {displayImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-sm py-2 px-4 flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                      >
                        <Trash size={14} />
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-400 mt-2">รองรับ JPG, PNG, WebP, GIF (สูงสุด 5MB)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อสินค้า *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="ชื่อสินค้า"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">บาร์โค้ด</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="885..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมวดหมู่</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ราคาขาย *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ต้นทุน</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">หน่วย</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="ชิ้น"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingId ? 'บันทึก' : 'เพิ่มสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
