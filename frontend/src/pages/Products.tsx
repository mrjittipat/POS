import { useState, useEffect, useRef } from 'react';
import { productsApi, Product } from '../api/products.api';
import { categoriesApi } from '../api/categories.api';
import { formatCurrency } from '../utils/format';
import * as XLSX from 'xlsx';
import { Plus, Edit, Trash2, X, ImagePlus, Trash, ChevronLeft, ChevronRight, ShoppingBag, Upload, Download, FileDown } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useAuthStore } from '../store';
import { cleanupParkedBillsByProductIds } from '../utils/posStorage';

interface Category {
  id: number;
  name: string;
}

/* ===== นำเข้าสินค้า (CSV) ===== */

// แปลงชื่อหัวคอลัมน์ (ภาษาอังกฤษ + ไทย) เป็นคีย์มาตรฐาน
const HEADER_MAP: Record<string, string> = {
  name: 'name', 'ชื่อสินค้า': 'name', 'ชื่อ': 'name',
  price: 'price', 'ราคา': 'price', 'ราคาขาย': 'price',
  cost: 'cost', 'ต้นทุน': 'cost',
  unit: 'unit', 'หน่วย': 'unit',
  sku: 'sku', 'รหัสสินค้า': 'sku',
  barcode: 'barcode', 'บาร์โค้ด': 'barcode',
  category: 'category', 'หมวดหมู่': 'category',
};

const IMPORT_CONDITIONS = [
  'เลือกแท็บ "CSV / Excel / SQL" ตามประเภทไฟล์ที่คุณมี แล้วอัปโหลดไฟล์ (แถวแรก/แถวหัวตารางคือหัวคอลัมน์)',
  'หัวคอลัมน์ที่รองรับ: name (ชื่อสินค้า), price (ราคา), cost (ต้นทุน), unit (หน่วย), sku, barcode, category (หมวดหมู่)',
  'name: จำเป็น ต้องไม่ว่าง และห้ามซ้ำกับสินค้าที่มีอยู่ / ในไฟล์',
  'price: จำเป็น ต้องเป็นตัวเลข 0 ขึ้นไป',
  'cost: ไม่บังคับ ตัวเลข 0 ขึ้นไป (เว้นไว้ = 0)',
  'unit: ไม่บังคับ (เว้นไว้ = ชิ้น)',
  'sku / barcode: ไม่บังคับ แต่ห้ามซ้ำกับระบบ / ในไฟล์ (บาร์โค้ดเว้นไว้จะสุ่มให้อัตโนมัติ)',
  'category: ไม่บังคับ ต้องมีหมวดหมู่นั้นในระบบอยู่ก่อน มิฉะนั้นจะข้ามแถว',
  'รายการที่ไม่ผ่านเงื่อนไขจะถูกข้าม (ไม่นำเข้า) พร้อมแจ้งเหตุผล ต่อ 1 ครั้งไม่เกิน 500 แถว',
];

const IMPORT_HEADERS = ['name', 'price', 'cost', 'unit', 'sku', 'barcode', 'category'];

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCSVToRows(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => {
    const key = HEADER_MAP[String(h).toLowerCase()];
    return key || String(h).toLowerCase();
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function buildTemplateCSV(): string {
  return [
    IMPORT_HEADERS.join(','),
    ['โค้ก 1.25L', '25', '18', 'ขวด', 'BEV-002', '5449000000996', 'เครื่องดื่ม'].join(','),
    ['น้ำดื่ม 600ml', '10', '7', 'ขวด', 'BEV-001', '8850999320001', ''].join(','),
  ].join('\n');
}

// Parse Excel (.xlsx/.xls) แผ่นแรก → rows
function parseExcelToRows(arrayBuffer: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const rows: Record<string, string>[] = [];
  for (const item of raw) {
    const row: Record<string, string> = {};
    Object.keys(item).forEach((key) => {
      const canon = HEADER_MAP[String(key).trim().toLowerCase()] || String(key).trim().toLowerCase();
      const v = item[key] as unknown;
      row[canon] = v == null ? '' : String(v).trim();
    });
    rows.push(row);
  }
  return rows;
}

// แยกสตริงโดยคำนึงถึงเครื่องหมายคำพูด (สำหรับ SQL)
function splitOutsideQuotes(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'") {
      if (inQ && input[i + 1] === "'") { cur += "'"; i++; } else inQ = !inQ;
      cur += ch;
    } else if (inQ) {
      cur += ch;
    } else if (ch === delimiter) {
      parts.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

// แยกแต่ละ tuple ใน VALUES (...),(...)
function splitSQLTuples(valuesStr: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let depth = 0;
  let inQ = false;
  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    if (ch === "'") {
      if (inQ && valuesStr[i + 1] === "'") { cur += "'"; i++; } else inQ = !inQ;
      cur += ch;
      continue;
    }
    if (inQ) { cur += ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim() !== '') parts.push(cur);
  return parts;
}

// Parse SQL INSERT INTO products ... → rows
function parseSQLToRows(sql: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lower = sql.toLowerCase();
  let idx = 0;
  for (;;) {
    const start = lower.indexOf('insert into', idx);
    if (start === -1) break;
    const openParen = sql.indexOf('(', start);
    if (openParen === -1) break;

    let depth = 1;
    let i = openParen + 1;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    if (depth !== 0) break;
    const colList = sql.slice(openParen + 1, i - 1);

    const valuesIdx = lower.indexOf('values', i);
    if (valuesIdx === -1) break;
    const parenStart = sql.indexOf('(', valuesIdx);
    if (parenStart === -1) break;
    depth = 1;
    let j = parenStart + 1;
    while (j < sql.length && depth > 0) {
      if (sql[j] === '(') depth++;
      else if (sql[j] === ')') depth--;
      j++;
    }
    if (depth !== 0) break;
    const valuesStr = sql.slice(parenStart + 1, j - 1);

    const cols = splitOutsideQuotes(colList, ',').map((c) => c.trim().replace(/[`"]/g, '').toLowerCase());
    const canonicalCols = cols.map((c) => HEADER_MAP[c] || c);
    const tuples = splitSQLTuples(valuesStr);
    for (const t of tuples) {
      const cells = splitOutsideQuotes(t, ',');
      const row: Record<string, string> = {};
      canonicalCols.forEach((col, ci) => {
        let v = (cells[ci] ?? '').trim();
        v = v.replace(/^'/, '').replace(/'$/, '');
        if (v.toUpperCase() === 'NULL') v = '';
        row[col] = v;
      });
      rows.push(row);
    }
    idx = j;
  }
  return rows;
}

export default function Products() {
  const { showConfirm, toast } = useDialog();
  const { user } = useAuthStore();
  const canWrite = user?.role !== 'cashier'; // พนักงานขายดูได้อย่างเดียว
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
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // นำเข้าข้อมูลสินค้า
  const [showImport, setShowImport] = useState(false);
  const [importFormat, setImportFormat] = useState<'csv' | 'excel' | 'sql'>('csv');
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<Record<string, string>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: { index: number; name: string; reason: string }[] } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // ส่งออกข้อมูลสินค้า
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'sql'>('csv');
  const [exporting, setExporting] = useState(false);

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
      // includeInactive=true เพื่อให้เห็นสินค้าที่พักชั่วคราวในหน้าจัดการ
      const productsRes = await productsApi.getAll(currentPage, itemsPerPage, search, undefined, true);
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
    data.append('is_active', formData.is_active ? 'true' : 'false');

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
      is_active: product.is_active,
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
          // Clean up parked bills
          const cleanup = cleanupParkedBillsByProductIds([id]);
          loadData();

          let message = 'ลบสินค้าสำเร็จ';
          if (cleanup.removedBills > 0 || cleanup.cleanedBills > 0) {
            message += ` (ลบพักบิล ${cleanup.removedBills} บิล, ทำความสะอาด ${cleanup.cleanedBills} บิล)`;
          }
          toast({ message, type: 'success' });
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', sku: '', barcode: '', category_id: '', price: '', cost: '', unit: 'ชิ้น', is_active: true });
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setRemoveImage(false);
  };

  /* ----- นำเข้าสินค้า ----- */
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apply = (rows: Record<string, string>[]) => {
      setImportFileName(file.name);
      setImportRows(rows);
      setImportResult(null);
      if (rows.length === 0) {
        toast({ message: 'ไม่พบข้อมูลในไฟล์ (เช็คหัวคอลัมน์ / แถวข้อมูล)', type: 'warning' });
      }
    };

    if (importFormat === 'excel') {
      const reader = new FileReader();
      reader.onload = () => apply(parseExcelToRows(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        apply(importFormat === 'sql' ? parseSQLToRows(text) : parseCSVToRows(text));
      };
      reader.readAsText(file, 'utf-8');
    }
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + buildTemplateCSV()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // เทมเพลตตามรูปแบบที่เลือก (CSV / Excel / SQL)
  const downloadTemplateForFormat = () => {
    if (importFormat === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([
        { name: 'โค้ก 1.25L', price: 25, cost: 18, unit: 'ขวด', sku: 'BEV-002', barcode: '5449000000996', category: 'เครื่องดื่ม' },
        { name: 'น้ำดื่ม 600ml', price: 10, cost: 7, unit: 'ขวด', sku: 'BEV-001', barcode: '8850999320000', category: '' },
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'products');
      XLSX.writeFile(wb, 'template_products.xlsx');
    } else if (importFormat === 'sql') {
      const sql = [
        '-- ตัวอย่าง SQL (ใส่ข้อมูลแค่ใน VALUES)',
        `INSERT INTO products (name, price, cost, unit, sku, barcode, category) VALUES`,
        `('โค้ก 1.25L', 25, 18, 'ขวด', 'BEV-002', '5449000000996', 'เครื่องดื่ม');`,
      ].join('\n');
      const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_products.sql';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      downloadTemplate();
    }
  };

  const submitImport = async () => {
    if (!importRows || importRows.length === 0) return;
    setImporting(true);
    try {
      const res = await productsApi.importProducts(importRows);
      const data = (res.data as { data: { imported: number; skipped: { index: number; name: string; reason: string }[] } }).data;
      setImportResult(data);
      toast({ message: `นำเข้าสำเร็จ ${data.imported} รายการ`, type: 'success' });
      loadData();
    } catch {
      toast({ message: 'เกิดข้อผิดพลาดในการนำเข้า', type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => {
    setShowImport(false);
    setImportResult(null);
    setImportRows(null);
    setImportFileName('');
  };

  /* ----- ส่งออกข้อมูลสินค้า ----- */
  const handleExport = async () => {
    try {
      setExporting(true);
      // ดึงสินค้าทั้งหมด (ไม่จำกัดหน้า)
      const res = await productsApi.getAll(1, 999999, undefined, undefined, true);
      const allProducts = res.data.data;

      if (allProducts.length === 0) {
        toast({ message: 'ไม่มีสินค้าในระบบ', type: 'warning' });
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      if (exportFormat === 'csv') {
        // สร้าง CSV
        const headers = ['name', 'price', 'cost', 'unit', 'sku', 'barcode', 'category', 'is_active'];
        const rows = allProducts.map((p) => {
          const categoryName = categories.find((c) => c.id === p.category_id)?.name || '';
          return [
            `"${(p.name || '').replace(/"/g, '""')}"`,
            p.price,
            p.cost,
            p.unit,
            p.sku || '',
            p.barcode || '',
            `"${categoryName.replace(/"/g, '""')}"`,
            p.is_active ? 'เปิดใช้งาน' : 'พักชั่วคราว',
          ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_backup_${timestamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (exportFormat === 'excel') {
        // สร้าง Excel
        const data = allProducts.map((p) => {
          const categoryName = categories.find((c) => c.id === p.category_id)?.name || '';
          return {
            name: p.name,
            price: p.price,
            cost: p.cost,
            unit: p.unit,
            sku: p.sku || '',
            barcode: p.barcode || '',
            category: categoryName,
            is_active: p.is_active ? 'เปิดใช้งาน' : 'พักชั่วคราว',
          };
        });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'products');
        XLSX.writeFile(wb, `products_backup_${timestamp}.xlsx`);
      } else if (exportFormat === 'sql') {
        // สร้าง SQL INSERT
        const lines: string[] = [];
        lines.push('-- สำรองข้อมูลสินค้า');
        lines.push('-- สร้างเมื่อ: ' + new Date().toISOString());
        lines.push('');
        for (const p of allProducts) {
          const categoryName = categories.find((c) => c.id === p.category_id)?.name || '';
          const name = (p.name || '').replace(/'/g, "''");
          const sku = (p.sku || '').replace(/'/g, "''");
          const barcode = (p.barcode || '').replace(/'/g, "''");
          const category = categoryName.replace(/'/g, "''");
          const unit = p.unit.replace(/'/g, "''");
          lines.push(
            `INSERT INTO products (name, price, cost, unit, sku, barcode, category, is_active) VALUES ('${name}', ${p.price}, ${p.cost}, '${unit}', '${sku}', '${barcode}', '${category}', ${p.is_active ? 1 : 0});`
          );
        }
        const sql = lines.join('\n');
        const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_backup_${timestamp}.sql`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ message: `ส่งออกข้อมูล ${allProducts.length} รายการสำเร็จ`, type: 'success' });
      setShowExport(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({ message: 'เกิดข้อผิดพลาดในการส่งออก', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  /* ----- เลือกลบสินค้าหลายชิ้น ----- */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const startSelect = () => { setSelectedIds([]); setSelectMode(true); };
  const cancelSelect = () => { setSelectedIds([]); setSelectMode(false); };
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === products.length ? [] : products.map((p) => p.id)));
  };
  const confirmBatchDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm({
      title: 'ลบสินค้าที่เลือก',
      message: `ต้องการลบสินค้า ${selectedIds.length} รายการ? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      variant: 'danger',
      confirmText: 'ลบทั้งหมด',
      onConfirm: async () => {
        try {
          for (const id of selectedIds) {
            await productsApi.delete(id);
          }
          // Clean up parked bills
          const cleanup = cleanupParkedBillsByProductIds(selectedIds);

          let message = 'ลบสินค้าที่เลือกแล้ว';
          if (cleanup.removedBills > 0 || cleanup.cleanedBills > 0) {
            message += ` (ลบพักบิล ${cleanup.removedBills} บิล, ทำความสะอาด ${cleanup.cleanedBills} บิล)`;
          }
          toast({ message, type: 'success' });
          setSelectedIds([]);
          setSelectMode(false);
          loadData();
        } catch (error) {
          toast({ message: 'เกิดข้อผิดพลาดในการลบ', type: 'error' });
        }
      },
    });
  };

  // Determine which image to show in preview
  const displayImage = imagePreview || existingImage;

  // จำนวนคอลัมน์ตาราง (บวกคอลัมน์ checkbox เมื่อโหมดเลือก)
  const colCount = (canWrite ? 7 : 6) + (selectMode ? 1 : 0);

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
        {selectMode ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">เลือกแล้ว {selectedIds.length} รายการ</span>
            <button onClick={cancelSelect} className="btn btn-secondary">ยกเลิก</button>
            <button
              onClick={confirmBatchDelete}
              disabled={selectedIds.length === 0}
              className="btn btn-danger flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} />
              ลบที่เลือก ({selectedIds.length})
            </button>
          </div>
        ) : (
          canWrite && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExport(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FileDown size={18} />
                ส่งออกข้อมูลสินค้า
              </button>
              <button
                onClick={() => { setShowImport(true); setImportResult(null); }}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Upload size={18} />
                นำเข้าข้อมูลสินค้า
              </button>
              <button onClick={startSelect} className="btn btn-secondary flex items-center gap-2">
                <Trash2 size={16} />
                เลือกลบสินค้า
              </button>
              <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
                <Plus size={18} />
                เพิ่มสินค้า
              </button>
            </div>
          )
        )}
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selectMode && (
                <th className="text-left py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary-600"
                    title="เลือกทั้งหมด"
                  />
                </th>
              )}
              <th className="text-left py-3 px-4 text-gray-600 font-medium">สินค้า</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">SKU</th>
              <th className="text-left py-3 px-4 text-gray-600 font-medium">บาร์โค้ด</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ราคา</th>
              <th className="text-right py-3 px-4 text-gray-600 font-medium">ต้นทุน</th>
              <th className="text-center py-3 px-4 text-gray-600 font-medium">สถานะ</th>
              {canWrite && <th className="text-center py-3 px-4 text-gray-600 font-medium">จัดการ</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 h-[57px]">
                {selectMode && (
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 accent-primary-600"
                    />
                  </td>
                )}
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                    {product.is_active ? 'เปิดใช้งาน' : 'พักชั่วคราว'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {canWrite ? (
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="block text-center text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Fill empty rows to keep table height constant (10 rows) */}
            {products.length > 0 && products.length < itemsPerPage &&
              Array.from({ length: itemsPerPage - products.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-t border-gray-50 h-[57px]">
                  <td colSpan={colCount} className="px-4">&nbsp;</td>
                </tr>
              ))
            }
            {products.length === 0 && !loading && (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-gray-400">ไม่พบสินค้า</td>
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
                    onChange={(e) => {
                      // Convert Thai keyboard layout to English digits
                      const thaiToEnglishMap: Record<string, string> = {
                        'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5',
                        'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0',
                        '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
                        '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
                      };

                      let normalized = '';
                      for (const char of e.target.value) {
                        normalized += thaiToEnglishMap[char] || char;
                      }

                      setFormData({ ...formData, barcode: normalized });
                    }}
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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">สถานะ</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="input focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="inactive">พักสินค้าชั่วคราว</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">สินค้าที่พักชั่วคราวจะไม่แสดงในหน้าขาย</p>
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

      {/* Import products modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeImport}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Upload size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">นำเข้าข้อมูลสินค้า</h3>
                  <p className="text-xs text-gray-500">อัปโหลดไฟล์ CSV เพื่อเพิ่มสินค้าจำนวนมาก</p>
                </div>
              </div>
              <button
                onClick={closeImport}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* เงื่อนไข */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">เงื่อนไข / ข้อกำหนดของไฟล์</p>
                <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
                  {IMPORT_CONDITIONS.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* เลือกรูปแบบไฟล์ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รูปแบบไฟล์</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'excel', 'sql'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => { setImportFormat(f); setImportRows(null); setImportFileName(''); setImportResult(null); }}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        importFormat === f
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f === 'csv' ? 'CSV' : f === 'excel' ? 'Excel (.xlsx)' : 'SQL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* เลือกไฟล์ */}
              <div>
                <div className="flex items-center gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls,.sql,text/csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="btn btn-secondary flex items-center gap-2 flex-1"
                  >
                    <Upload size={16} />
                    {importFileName || `เลือกไฟล์ ${importFormat === 'csv' ? 'CSV' : importFormat === 'excel' ? 'Excel' : 'SQL'}`}
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplateForFormat}
                    className="btn flex items-center gap-2 text-primary-600 border border-primary-200 hover:bg-primary-50"
                  >
                    <Download size={16} />
                    เทมเพลต
                  </button>
                </div>
                {importRows && importRows.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    พบ {importRows.length} แถว จากไฟล์ {importFileName} — แถวที่ไม่ผ่านเงื่อนไขจะถูกข้ามอัตโนมัติ
                  </p>
                )}
              </div>

              {/* ผลลัพธ์ */}
              {importResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
                    ✅ นำเข้าสำเร็จ {importResult.imported} รายการ
                  </div>
                  {importResult.skipped.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-orange-700 mb-1.5">
                        ข้าม {importResult.skipped.length} รายการ (ไม่ผ่านเงื่อนไข):
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.skipped.map((s, i) => (
                          <p key={i} className="text-xs text-orange-700">
                            แถวที่ {s.index} · {s.name} — {s.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeImport} className="btn btn-secondary flex-1">ปิด</button>
                <button
                  type="button"
                  onClick={submitImport}
                  disabled={!importRows || importRows.length === 0 || importing}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload size={16} />
                  {importing ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export products modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowExport(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileDown size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">ส่งออกข้อมูลสินค้า</h3>
                  <p className="text-xs text-gray-500">สำรองข้อมูลสินค้าทั้งหมดในระบบ</p>
                </div>
              </div>
              <button
                onClick={() => setShowExport(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">รายละเอียด</p>
                <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
                  <li>ส่งออกข้อมูลสินค้าทั้งหมด ({totalItems} รายการ) รวมทั้งที่พักชั่วคราว</li>
                  <li>ข้อมูลที่ส่งออก: ชื่อสินค้า, ราคา, ต้นทุน, หน่วย, SKU, บาร์โค้ด, หมวดหมู่, สถานะ</li>
                  <li>ไฟล์ที่ส่งออกสามารถนำกลับเข้าระบบได้ (ผ่านฟีเจอร์นำเข้า)</li>
                  <li>ไม่รวมรูปภาพสินค้า (เฉพาะข้อมูลเท่านั้น)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">เลือกรูปแบบไฟล์</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'excel', 'sql'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setExportFormat(f)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        exportFormat === f
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f === 'csv' ? 'CSV' : f === 'excel' ? 'Excel (.xlsx)' : 'SQL'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExport(false)} className="btn btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileDown size={16} />
                  {exporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
