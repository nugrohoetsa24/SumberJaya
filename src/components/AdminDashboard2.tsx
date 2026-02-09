import { supabase } from '../lib/supabase';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, Upload, Download, Trash2, Edit2, X, Image as ImageIcon, 
  Save, UserPlus, Shield, AlertTriangle, CheckCircle2, 
  LayoutGrid, List as ListIcon, Search, Filter, RotateCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, DollarSign, User, Clock
} from 'lucide-react';
import type { Product, Category, AdminUser, HistoryLog } from '../types';
import { parseExcel, exportToExcel } from '../services/excelService';
import { uploadProductImage } from '../services/storageService';
import { pdfService } from '../services/pdfService';
import { AdminManagement } from './AdminManagement';

interface AdminDashboardProps {
  products: Product[];
  categories: Category[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  productToEdit?: Product | null;
  onClearProductToEdit?: () => void;
  adminUsername: string;
}

interface ImportSummary {
  newProducts: number;
  updatedProducts: number;
  newCategories: number;
}

// Tipe untuk sorting
type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'updated-desc' | 'updated-asc';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  products, 
  categories, 
  onUpdateProducts, 
  onUpdateCategories,
  productToEdit,
  onClearProductToEdit,
  adminUsername
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'import' | 'history' | 'settings'>('products');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  
  // STATE UNTUK FILTER & PAGINATION
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Notification states
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  
  // States for confirmation modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    name: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category State
  const [newCategory, setNewCategory] = useState('');

  // Admin Management State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

  // Fetch admins from database
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, username, email, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      const transformedAdmins = data?.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        createdAt: admin.created_at
      })) || [];

      setAdmins(transformedAdmins);
    } catch (error) {
      console.error('Error in fetchAdmins:', error);
    }
  };

  // Fetch history logs from database
  const fetchHistoryLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('history_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      const transformedLogs = data?.map(log => ({
        id: log.id,
        username: log.username,
        action: log.action,
        productName: log.product_name,
        productCode: log.product_code,
        timestamp: log.timestamp
      })) || [];

      setHistoryLogs(transformedLogs);
    } catch (error) {
      console.error('Error in fetchHistoryLogs:', error);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchHistoryLogs();
  }, []);

  useEffect(() => {
    if (productToEdit) {
      setEditingProduct(productToEdit);
      setFormData(productToEdit);
      setIsFormOpen(true);
      setActiveTab('products');
      if (onClearProductToEdit) {
        onClearProductToEdit();
      }
    }
  }, [productToEdit, onClearProductToEdit]);

  // 🔍 FUNGSI FILTER & SORTING
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];
    
    // Filter berdasarkan pencarian
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.code.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter berdasarkan kategori
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'updated-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'updated-desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    
    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // 📄 PAGINATION CALCULATION
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  // Reset page ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsFormOpen(true);
  };

  const initiateDeleteProduct = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
  
    const { error } = await supabase
      .from('produk')
      .delete()
      .eq('id', productToDelete.id);
  
    if (error) {
      alert('Gagal menghapus produk');
      console.error(error);
      return;
    }
  
    // update UI (state)
    onUpdateProducts(
      products.filter(p => p.id !== productToDelete.id)
    );

    // Add to history
    await supabase
      .from('history_logs')
      .insert({
        username: adminUsername,
        action: 'HAPUS',
        product_name: productToDelete.name,
        product_code: productToDelete.code,
        timestamp: new Date().toISOString()
      });
  
    fetchHistoryLogs();
    setProductToDelete(null);
  };

  const initiateDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    // Cek apakah ada produk yang masih menggunakan kategori ini
    const productsInCategory = products.filter(p => p.category === categoryToDelete.name);
    if (productsInCategory.length > 0) {
      alert(`Gagal menghapus: Kategori "${categoryToDelete.name}" masih digunakan oleh ${productsInCategory.length} produk. Silahkan ubah kategori produk tersebut terlebih dahulu.`);
      setCategoryToDelete(null);
      return;
    }

    // Delete from database
    const { error } = await supabase
      .from('category')
      .delete()
      .eq('id', categoryToDelete.id);

    if (error) {
      alert('Gagal menghapus kategori');
      console.error(error);
      return;
    }

    // Update UI
    const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id);
    onUpdateCategories(updatedCategories);

    // Add to history
    await supabase
      .from('history_logs')
      .insert({
        username: adminUsername,
        action: 'HAPUS_KATEGORI',
        product_name: categoryToDelete.name,
        product_code: 'KATEGORI',
        timestamp: new Date().toISOString()
      });

    fetchHistoryLogs();
    setCategoryToDelete(null);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      price: 0,
      category: categories[0]?.name || '',
      description: '',
      imageUrl: ''
    });
    setIsFormOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      console.log('🎯 [UPLOAD] HandleImageUpload called');
      
      if (!file) {
        console.error('❌ No file provided');
        alert('Silakan pilih file gambar terlebih dahulu.');
        throw new Error('No file provided');
      }
      
      console.log('📄 File details:', {
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(2) + ' KB',
        lastModified: new Date(file.lastModified).toLocaleString()
      });
      
      // Validasi sederhana
      if (file.size === 0) {
        alert('File kosong. Silakan pilih file lain.');
        throw new Error('File is empty');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar (maksimal 5MB)');
        throw new Error('File too large');
      }

      // Validasi tipe file
      if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, dll)');
      throw new Error('Invalid file type');
      }
      
      // Tampilkan loading
      setUploadingImage(true);
      
      console.log('🚀 Calling uploadProductImage...');
      const url = await uploadProductImage(file);
      console.log('✅ Upload success, URL:', url);
      
      // Update form data
      setFormData(prev => ({ ...prev, imageUrl: url }));
      
      // Tampilkan alert sukses
      alert('✅ Upload berhasil! Gambar telah disimpan.');
      
    } catch (error: any) {
      console.error('🔥 Upload error:', error);
      alert(`❌ Upload gagal: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingImage(false);
      
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!formData.name || !formData.code || formData.price === undefined) {
      alert('Nama, kode, dan harga wajib diisi');
      return;
    }
  
    const productData = {
      name: formData.name,
      code: formData.code,
      price: Number(formData.price),
      category: formData.category || 'Uncategorized',
      description: formData.description || '',
      image_url: formData.imageUrl || '',
      updated_at: new Date().toISOString()
    };
  
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('produk')
          .upsert({
            id: editingProduct.id,
            ...productData
          })
          .select()
          .single();
  
        if (error) {
          alert('Gagal mengupdate produk');
          console.error('Update errors:', error);
          return;
        }
  
        // Update local state
        onUpdateProducts(
          products.map(p =>
            p.id === editingProduct.id ? { 
              ...p, 
              ...formData,
              updatedAt: new Date().toISOString()
            } : p
          )
        );

        // Add to history
        await supabase
          .from('history_logs')
          .insert({
            username: adminUsername,
            action: 'EDIT',
            product_name: formData.name,
            product_code: formData.code,
            timestamp: new Date().toISOString()
          });
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('produk')
          .insert(productData)
          .select()
          .single();
  
        if (error) {
          alert('Gagal menambahkan produk');
          console.error(error);
          return;
        }
  
        // Add to local state
        const newProduct: Product = {
          id: data.id,
          code: data.code,
          name: data.name,
          price: Number(data.price),
          category: data.category || 'Uncategorized',
          description: data.description || '',
          imageUrl: data.image_url || '',
          updatedAt: data.updated_at || new Date().toISOString()
        };
  
        onUpdateProducts([newProduct, ...products]);

        // Add to history
        await supabase
          .from('history_logs')
          .insert({
            username: adminUsername,
            action: 'TAMBAH',
            product_name: formData.name,
            product_code: formData.code,
            timestamp: new Date().toISOString()
          });
      }

      // Refresh history
      fetchHistoryLogs();
  
      // Close form
      setIsFormOpen(false);
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: ''
      });
  
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Terjadi kesalahan saat menyimpan produk');
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    try {
      const importedData = await parseExcel(file);
  
      let newCategoriesFromImport = new Set<string>();
      let newProducts = 0;
      let updatedProducts = 0;
  
      // 1. PROSES IMPORT PRODUK
      for (const item of importedData) {
        if (!item.code || !item.name || item.price === undefined) continue;
        
        // Track kategori baru
        if (item.category && !categories.some(c => c.name === item.category)) {
          newCategoriesFromImport.add(item.category);
        }

        const payload = {
          name: item.name,
          code: item.code,
          price: Number(item.price),
          category: item.category || 'Uncategorized',
          description: item.description || '',
          image_url: item.imageUrl || '',
          updated_at: new Date().toISOString(),
        };
  
        const { data, error } = await supabase
          .from('produk')
          .upsert(payload, { onConflict: 'code' })
          .select()
          .single();
  
        if (error) {
          console.error('Gagal import produk:', error);
          continue;
        }
  
        const exists = products.some(p => p.code === data.code);
        exists ? updatedProducts++ : newProducts++;
      }

      // 2. TAMBAHKAN KATEGORI BARU KE DATABASE
      if (newCategoriesFromImport.size > 0) {
        const categoriesToAdd = Array.from(newCategoriesFromImport).map(name => ({
          name: name.trim()
        }));

        const { error: categoryError } = await supabase
          .from('category')
          .upsert(categoriesToAdd, { onConflict: 'name' });

        if (categoryError) {
          console.error('Gagal menambah kategori:', categoryError);
        }
      }

      // 3. REFRESH SEMUA DATA DARI DATABASE
      const refreshAllData = async () => {
        console.log('🔄 Memulai refresh data...');
        
        // Refresh produk
        const { data: freshProducts, error: productsError } = await supabase
          .from('produk')
          .select('*')
          .order('updated_at', { ascending: false });

        if (productsError) {
          console.error('Gagal refresh produk:', productsError);
        } else if (freshProducts) {
          const transformedProducts = freshProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            price: Number(p.price) || 0,
            category: p.category || 'Uncategorized',
            description: p.description || '',
            imageUrl: p.image_url || '',
            updatedAt: p.updated_at || p.created_at,
          }));
          onUpdateProducts(transformedProducts);
          console.log('✅ Produk direfresh:', transformedProducts.length);
        }

        // Refresh kategori
        const { data: freshCategories, error: categoriesError } = await supabase
          .from('category')
          .select('*')
          .order('name');

        if (categoriesError) {
          console.error('Gagal refresh kategori:', categoriesError);
        } else if (freshCategories) {
          const transformedCategories = freshCategories.map((c: any) => ({
            id: c.id,
            name: c.name
          }));
          onUpdateCategories(transformedCategories);
          console.log('✅ Kategori direfresh:', transformedCategories.length);
        }
      };

      // 4. PANGGIL FUNGSI REFRESH
      await refreshAllData();

      // 5. SET SUMMARY DAN NOTIFIKASI
      const summary: ImportSummary = {
        newProducts,
        updatedProducts,
        newCategories: newCategoriesFromImport.size
      };

      setImportSummary(summary);
      setShowImportSuccess(true);

      // Add import to history
      await supabase
        .from('history_logs')
        .insert({
          username: adminUsername,
          action: 'IMPORT_EXCEL',
          product_name: `Import ${newProducts + updatedProducts} produk, ${newCategoriesFromImport.size} kategori`,
          product_code: 'EXCEL',
          timestamp: new Date().toISOString()
        });

      fetchHistoryLogs();
      e.target.value = '';
      
      console.log('🎉 Import selesai dengan summary:', summary);
    } catch (err) {
      console.error('❌ Gagal import Excel:', err);
      alert('Gagal import Excel: ' + (err as Error).message);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('Kategori sudah ada!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('category')
        .insert({ name: trimmed })
        .select()
        .single();

      if (error) {
        alert('Gagal menambah kategori');
        console.error(error);
        return;
      }

      // Update local state
      const newCategoryItem: Category = {
        id: data.id,
        name: data.name
      };
      
      onUpdateCategories([...categories, newCategoryItem]);

      // Add to history
      await supabase
        .from('history_logs')
        .insert({
          username: adminUsername,
          action: 'TAMBAH_KATEGORI',
          product_name: trimmed,
          product_code: 'KATEGORI',
          timestamp: new Date().toISOString()
        });

      fetchHistoryLogs();
      setNewCategory('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Terjadi kesalahan saat menambah kategori');
    }
  };

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'TAMBAH':
      case 'IMPORT_EXCEL':
        return 'bg-green-100 text-green-700';
      case 'EDIT':
        return 'bg-blue-100 text-blue-700';
      case 'HAPUS':
        return 'bg-red-100 text-red-700';
      case 'TAMBAH_KATEGORI':
        return 'bg-emerald-100 text-emerald-800';
      case 'HAPUS_KATEGORI':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatActionName = (action: string) => {
    return action.replace('_', ' ');
  };

  // 📊 RENDER PAGINATION CONTROLS
  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(endIndex, filteredAndSortedProducts.length)}
              </span>{' '}
              of <span className="font-medium">{filteredAndSortedProducts.length}</span> results
              {searchQuery && (
                <span className="ml-2 text-gray-500">
                  for "<span className="font-medium">{searchQuery}</span>"
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="ml-2 text-gray-500">
                  in <span className="font-medium">{selectedCategory}</span>
                </span>
              )}
            </p>
          </div>
          
          <div>
            <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {pageNumbers.map(number => (
                <button
                  key={number}
                  onClick={() => setCurrentPage(number)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    currentPage === number
                      ? 'z-10 bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {number}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* HEADER DENGAN TOMBOL LIHAT KATALOG */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <div className="flex items-center mt-1">
            <User className="w-4 h-4 mr-2" />
            <p className="font-semibold text-sm">Halo {adminUsername}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-md"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Lihat Katalog
          </a>
          
          <button 
            onClick={() => exportToExcel(products)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </button>
          
          <button
            onClick={() => pdfService.generateCatalogPDF(products, categories)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
          
          <button 
            onClick={handleAddNew}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex overflow-x-auto no-scrollbar">
          {(['products', 'categories', 'import', 'history', 'settings'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap capitalize ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'products' ? 'Daftar Produk' : 
               tab === 'categories' ? 'Kategori' : 
               tab === 'import' ? 'Mass Edit' : 
               tab === 'history' ? 'Riwayat' : 
               'Pengaturan'}
            </button>
          ))}
        </div>

        {activeTab === 'products' && (
          <div className="flex items-center space-x-2 py-2 md:py-0 px-2">
            <span className="text-xs text-gray-400 font-medium uppercase mr-2">Tampilan:</span>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}
              title="List View"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* TAB CONTENT - PRODUCTS */}
      {activeTab === 'products' && (
        <>
          {/* FILTER BAR */}
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* SEARCH INPUT */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari produk atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              {/* CATEGORY FILTER */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* SORT BY */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ArrowUpDown className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="updated-desc">Terbaru</option>
                  <option value="updated-asc">Terlama</option>
                  <option value="name-asc">Nama A-Z</option>
                  <option value="name-desc">Nama Z-A</option>
                  <option value="price-asc">Harga Terendah</option>
                  <option value="price-desc">Harga Tertinggi</option>
                </select>
              </div>
              
              {/* RESET FILTERS */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSortBy('updated-desc');
                }}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Filter
              </button>
            </div>
            
            {/* FILTER INFO */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">
                Menampilkan {paginatedProducts.length} dari {filteredAndSortedProducts.length} produk
              </span>
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Pencarian: {searchQuery}
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Kategori: {selectedCategory}
                </span>
              )}
            </div>
          </div>

          {viewMode === 'list' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                      <tr>
                        <th className="px-6 py-4">Produk</th>
                        <th className="px-6 py-4">Kode</th>
                        <th className="px-6 py-4">Kategori</th>
                        <th className="px-6 py-4">Terakhir Diperbarui</th>
                        <th className="px-6 py-4 text-right">Harga</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                            {searchQuery || selectedCategory !== 'all' 
                              ? 'Tidak ada produk yang sesuai dengan filter.' 
                              : 'Belum ada produk. Silahkan tambah atau import.'}
                          </td>
                        </tr>
                      ) : paginatedProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition group">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900 line-clamp-1">{product.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{product.code}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {product.updatedAt ? new Date(product.updatedAt).toLocaleString('id-ID', { 
                              dateStyle: 'medium', 
                              timeStyle: 'short' 
                            }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-gray-900">
                            Rp {product.price.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center space-x-2">
                              <button 
                                onClick={() => handleEdit(product)} 
                                className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md transition" 
                                title="Edit Produk"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => initiateDeleteProduct(product, e)} 
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* PAGINATION */}
                {totalPages > 1 && renderPagination()}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedProducts.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400">
                  {searchQuery || selectedCategory !== 'all' 
                    ? 'Tidak ada produk yang sesuai dengan filter.' 
                    : 'Belum ada produk. Silahkan tambah atau import.'}
                </div>
              ) : paginatedProducts.map((product) => (
                <div key={product.id} className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                  <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                      className="p-2 bg-white/90 backdrop-blur shadow-sm text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); initiateDeleteProduct(product, e); }}
                      className="p-2 bg-white/90 backdrop-blur shadow-sm text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-200" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{product.code}</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{product.category}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 h-10">{product.name}</h3>
                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                      <span className="text-lg font-extrabold text-gray-900">Rp {product.price.toLocaleString('id-ID')}</span>
                      <button 
                        onClick={() => handleEdit(product)}
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        Edit &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* PAGINATION UNTUK GRID VIEW */}
              {viewMode === 'grid' && totalPages > 1 && (
                <div className="col-span-full mt-6">
                  {renderPagination()}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* TAB CONTENT - CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nama Kategori Baru"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-gray-900"
              />
              <button 
                onClick={handleAddCategory}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Tambah
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <button 
                    onClick={() => initiateDeleteCategory(cat)} 
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT - IMPORT */}
      {activeTab === 'import' && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Data Produk & Kategori</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Upload file Excel (.xlsx, .xls) untuk memperbarui atau menambah produk secara massal.
            </p>
            <div className="flex flex-col items-center gap-4">
              <label className="cursor-pointer px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">
                <span>Pilih File Excel</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleExcelImport}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Format Excel harus memiliki kolom: code, name, price, category, description, imageUrl
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT - HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900">Riwayat Aktivitas Admin</h3>
            </div>
            <button 
              onClick={fetchHistoryLogs}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Segarkan Riwayat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Aksi</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Belum ada aktivitas tercatat.</td>
                  </tr>
                ) : historyLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{log.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${getActionStyles(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{log.productName}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{log.productCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT - SETTINGS */}
      {activeTab === 'settings' && (
        <AdminManagement currentAdminUsername={adminUsername} />
      )}

      {/* MODAL IMPORT SUCCESS */}
      {showImportSuccess && importSummary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Import Berhasil 🎉
              </h3>

              <p className="text-gray-500 mb-4">
                Berikut ringkasan hasil upload Excel:
              </p>

              <div className="text-left bg-gray-50 rounded-xl p-4 text-sm space-y-2 mb-6">
                <div className="flex justify-between">
                  <span>➕ Produk Baru</span>
                  <span className="font-bold">{importSummary.newProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>✏️ Produk Diperbarui</span>
                  <span className="font-bold">{importSummary.updatedProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>📁 Kategori Baru</span>
                  <span className="font-bold">{importSummary.newCategories}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowImportSuccess(false);
                  setImportSummary(null);
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE PRODUCT */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto w-16 h-16 text-red-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Produk?</h3>
              <p className="text-gray-500 mb-6">Yakin ingin menghapus <span className="font-semibold text-gray-900">"{productToDelete.name}"</span>?</p>
              <div className="flex flex-col gap-2">
                <button onClick={confirmDeleteProduct} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Hapus Produk</button>
                <button onClick={() => setProductToDelete(null)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE CATEGORY */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto w-16 h-16 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Kategori?</h3>
              <p className="text-gray-500 mb-6">Yakin ingin menghapus kategori <span className="font-semibold text-gray-900">"{categoryToDelete.name}"</span>?</p>
              <div className="flex flex-col gap-2">
                <button onClick={confirmDeleteCategory} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Hapus Kategori</button>
                <button onClick={() => setCategoryToDelete(null)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM PRODUK */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsFormOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSaveProduct} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                  </h3>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Produk
                    </label>

                    {/* Simple Upload Area */}
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[200px] flex items-center justify-center">
                      {formData.imageUrl ? (
                        <div className="relative">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="max-h-48 object-contain"
                          />
                          <button 
                            type="button" 
                            onClick={handleRemoveImage} 
                            className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <div className="text-4xl mb-2">📷</div>
                          <p className="font-medium text-gray-700">Klik untuk upload foto</p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG • Maks 5MB</p>
                        </div>
                      )}
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        ref={fileInputRef}
                      />
                    </div>

                    {/* Image Specs */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-100 p-2 rounded">
                        <p className="text-gray-500">Format</p>
                        <p className="font-medium">JPG, PNG</p>
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <p className="text-gray-500">Ukuran</p>
                        <p className="font-medium">Max 5MB</p>
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <p className="text-gray-500">Rasio</p>
                        <p className="font-medium">1:1 / 4:3</p>
                      </div>
                      <div className="bg-gray-100 p-2 rounded">
                        <p className="text-gray-500">Dimensi</p>
                        <p className="font-medium">≥800×600px</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kode Produk (SKU)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: LED-H4-01" 
                        required 
                        value={formData.code || ''} 
                        onChange={e => setFormData({ ...formData, code: e.target.value })} 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: Lampu LED Headlight" 
                        required 
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <select 
                        value={formData.category || ''} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                      >
                        <option value="">Pilih Kategori</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        required 
                        min="0" 
                        value={formData.price || 0} 
                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} 
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" 
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea 
                    rows={4} 
                    placeholder="Tuliskan spesifikasi lengkap produk di sini..." 
                    value={formData.description || ''} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" 
                  />
                </div>

                {uploadingImage && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-700 font-medium">
                        Mengupload gambar...
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex items-center px-6 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 shadow-md"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Produk
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};