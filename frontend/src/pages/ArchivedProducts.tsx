import { useState, useEffect } from 'react';
import { archivedApi, ArchivedProduct } from '../api/archived.api';
import { formatCurrency } from '../utils/format';
import { ArchiveRestore, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useNavigate } from 'react-router-dom';

export default function ArchivedProducts() {
  const { showConfirm, toast } = useDialog();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ArchivedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, [search, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await archivedApi.getAll(currentPage, itemsPerPage, search);
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.total);
    } catch (error) {
      console.error('Failed to load archived products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkRestore = () => {
    if (selectedIds.size === 0) {
      toast({ message: 'กรุณาเลือกสินค้าที่ต้องการกู้คืน', type: 'error' });
      return;
    }
    showConfirm({
      title: 'กู้คืนสินค้า',
      message: `ต้องการกู้คืนสินค้า ${selectedIds.size} รายการกลับมาใช้งาน?`,
      variant: 'info',
      confirmText: 'กู้คืน',
      onConfirm: async () => {
        let success = 0;
        let failed = 0;
        for (const id of selectedIds) {
          try {
            await archivedApi.restore(id);
            success++;
          } catch (error) {
            failed++;
          }
        }
        toast({ message: `กู้คืนสำเร็จ ${success} รายการ${failed > 0 ? ` ล้มเหลว ${failed} รายการ` : ''}`, type: success > 0 ? 'success' : 'error' });
        setSelectedIds(new Set());
        loadData();
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      toast({ message: 'กรุณาเลือกสินค้าที่ต้องการลบ', type: 'error' });
      return;
    }
    showConfirm({
      title: 'ลบสินค้าถาวร',
      message: `ต้องการลบสินค้า ${selectedIds.size} รายการถาวรจริงๆ? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      variant: 'danger',
      confirmText: 'ลบถาวร',
      onConfirm: async () => {
        let success = 0;
        let failed = 0;
        for (const id of selectedIds) {
          try {
            await archivedApi.delete(id);
            success++;
          } catch (error) {
            failed++;
          }
        }
        toast({ message: `ลบสำเร็จ ${success} รายการ${failed > 0 ? ` ล้มเหลว ${failed} รายการ` : ''}`, type: success > 0 ? 'success' : 'error' });
        setSelectedIds(new Set());
        loadData();
      },
    });
  };

  const handleRestore = (product: ArchivedProduct) => {
    showConfirm({
      title: 'กู้คืนสินค้า',
      message: `ต้องการกู้คืนสินค้า "${product.name}" กลับมาใช้งาน?`,
      variant: 'info',
      confirmText: 'กู้คืน',
      onConfirm: async () => {
        try {
          await archivedApi.restore(product.id);
          toast({ message: 'กู้คืนสินค้าสำเร็จ', type: 'success' });
          loadData();
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการกู้คืน', type: 'error' });
        }
      },
    });
  };

  const handleDelete = (product: ArchivedProduct) => {
    showConfirm({
      title: 'ลบสินค้าถาวร',
      message: `ต้องการลบสินค้า "${product.name}" ถาวรจริงๆ? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      variant: 'danger',
      confirmText: 'ลบถาวร',
      onConfirm: async () => {
        try {
          await archivedApi.delete(product.id);
          toast({ message: 'ลบสินค้าถาวรสำเร็จ', type: 'success' });
          loadData();
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">สินค้าที่ลบแล้ว</h1>
            <p className="text-sm text-gray-500">กู้คืนหรือลบสินค้าที่เก็บถาวรถาวร</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {bulkMode && selectedIds.size > 0 && (
            <>
              <button
                onClick={handleBulkRestore}
                className="btn btn-primary flex items-center gap-2"
              >
                <ArchiveRestore size={16} />
                กู้คืน ({selectedIds.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger flex items-center gap-2"
              >
                <Trash2 size={16} />
                ลบถาวร ({selectedIds.size})
              </button>
            </>
          )}
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedIds(new Set());
            }}
            className={`btn ${bulkMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            {bulkMode ? 'ยกเลิก' : 'เลือกจัดการสินค้า'}
          </button>
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {bulkMode && (
                <th className="text-center py-3 px-4 text-gray-600 font-medium w-12">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
              )}
              <th className="text-left py-3 px-4 text-gray-600 font-medium">สินค้า</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">SKU</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">บาร์โค้ด</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ราคา</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ต้นทุน</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">วันที่ลบ</th>
              {!bulkMode && <th className="text-center py-3 px-4 text-gray-600 font-medium">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 h-[57px]">
                {bulkMode && (
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4"
                    />
                  </td>
                )}
                <td className="py-3 px-4">
                  <span className="font-medium">{product.name}</span>
                </td>
                <td className="py-3 px-4 text-gray-500">{product.sku || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{product.barcode || '-'}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(product.price)}</td>
                <td className="py-3 px-4 text-right text-gray-500">{formatCurrency(product.cost)}</td>
                <td className="py-3 px-4 text-center text-sm text-gray-500">
                  {new Date(product.deleted_at).toLocaleDateString('th-TH')}
                </td>
                {!bulkMode && (
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleRestore(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="กู้คืนสินค้า"
                      >
                        <ArchiveRestore size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="ลบถาวร"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {/* Fill empty rows */}
            {products.length > 0 && products.length < itemsPerPage &&
              Array.from({ length: itemsPerPage - products.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-t border-gray-50 h-[57px]">
                  <td colSpan={bulkMode ? 8 : 7} className="px-4">&nbsp;</td>
                </tr>
              ))
            }
            {products.length === 0 && !loading && (
              <tr>
                <td colSpan={bulkMode ? 8 : 7} className="py-12 text-center text-gray-400">ไม่พบสินค้าที่ลบ</td>
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
    </div>
  );
}
