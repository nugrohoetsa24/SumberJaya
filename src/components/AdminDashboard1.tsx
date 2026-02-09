import { supabase } from '../lib/supabase';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Upload, Download, Trash2, Edit2, X, Image as ImageIcon, 
  Save, Settings, UserPlus, Shield, AlertTriangle, CheckCircle2, 
  LayoutGrid, List as ListIcon, MoreVertical, Info, Clock, User,
  RotateCcw
} from 'lucide-react';
import { Product, Category, AdminUser, ViewMode, HistoryLog } from '../types';
import { parseExcel, exportToExcel } from '../services/excelService';
import { storageService } from '../services/storageService';
import { pdfService } from '../services/pdfService';
import { uploadProductImage, deleteProductImage } from '../services/storageService';

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  
  // Notification states
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  
  // States for confirmation modals
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category State
  const [newCategory, setNewCategory] = useState('');

  // Admin Management State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });

  useEffect(() => {
    setAdmins(storageService.getAdmins());
    setHistoryLogs(storageService.getHistory());
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

  const refreshLogs = () => {
    setHistoryLogs(storageService.getHistory());
  };

  // Di AdminDashboard.tsx, tambahkan:
useEffect(() => {
  console.log('📦 Products loaded:', products);
  products.forEach(p => {
    console.log(`📸 Product ${p.code}:`, {
      name: p.name,
      imageUrl: p.imageUrl,
      hasImage: !!p.imageUrl
    });
  });
}, [products]);

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

    try {
      // 1. Hapus gambar dari storage jika ada
      if (productToDelete.imageUrl) {
        await deleteProductImage(productToDelete.imageUrl);
      }
  
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
  
    storageService.addHistory({
      username: adminUsername,
      action: 'HAPUS',
      productName: productToDelete.name,
      productCode: productToDelete.code,
    });
  
    refreshLogs();
    setProductToDelete(null);
  };
  

  const initiateDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      // Cek apakah ada produk yang masih menggunakan kategori ini
      const productsInCategory = products.filter(p => p.category === categoryToDelete.name);
      if (productsInCategory.length > 0) {
        alert(`Gagal menghapus: Kategori "${categoryToDelete.name}" masih digunakan oleh ${productsInCategory.length} produk. Silahkan ubah kategori produk tersebut terlebih dahulu.`);
        setCategoryToDelete(null);
        return;
      }

      const updatedCategories = categories.filter(c => c.id !== categoryToDelete.id);
      onUpdateCategories(updatedCategories);

      storageService.addHistory({
        username: adminUsername,
        action: 'HAPUS_KATEGORI',
        productName: categoryToDelete.name,
        productCode: 'KATEGORI'
      });
      refreshLogs();

      setCategoryToDelete(null);
    }
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
        return;
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
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar (maksimal 5MB)');
        return;
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
  
    // =========================
    // UPDATE menggunakan RPC
    // =========================
    if (editingProduct) {
      const { data, error } = await supabase
        .rpc('update_product', {
          product_id: editingProduct.id,
          product_name: formData.name,
          product_code: formData.code,
          product_price: Number(formData.price),
          product_category: formData.category || null,
          product_description: formData.description || null,
          product_image_url: formData.imageUrl || null
        });
  
      if (error) {
        alert('Gagal mengupdate produk');
        console.error(error);
        return;
      }
  
      onUpdateProducts(
        products.map(p =>
          p.id === editingProduct.id ? { ...p, ...formData } : p
        )
      );
    }
  
    // =========================
    // INSERT
    // =========================
    else {
      const { data, error } = await supabase
        .from('produk')
        .insert({
          name: formData.name,
          code: formData.code,
          price: Number(formData.price),
          category: formData.category,
          description: formData.description,
          image_url: formData.imageUrl,
        })
        .select()
        .single();
  
      if (error) {
        alert('Gagal menambahkan produk');
        console.error(error);
        return;
      }
  
      onUpdateProducts([data, ...products]);
    }
  
    setIsFormOpen(false);
    setEditingProduct(null);
  };
 
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    try {
      const importedData = await parseExcel(file);
  
      let newCategoriesFromImport = new Set<string>();
      let newProducts = 0;
      let updatedProducts = 0;
  
      for (const item of importedData) {
        if (!item.code || !item.name || item.price === undefined) continue;
        
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
          console.error('Gagal import:', error);
          continue;
        }
  
        const exists = products.some(p => p.code === data.code);
        exists ? updatedProducts++ : newProducts++;
      }

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

      // 🔄 reload produk dari database
      const { data: freshProducts } = await supabase
        .from('produk')
        .select('*')
        .order('updated_at', { ascending: false });

      const refreshAllData = async () => {
          // Refresh produk
          const { data: freshProducts } = await supabase
            .from('produk')
            .select('*')
            .order('updated_at', { ascending: false });
          }

      if (freshProducts) {
        onUpdateProducts(
          freshProducts.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            price: p.price,
            category: p.category,
            description: p.description,
            imageUrl: p.image_url,
            updatedAt: p.updated_at,
          }))
        );
      }
  
      storageService.addHistory({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        username: adminUsername,
        action: 'TAMBAH',
        productName: `Import Excel (${newProducts + updatedProducts})`,
        productCode: 'EXCEL',
      });
  
      refreshLogs();
      setShowImportSuccess(true);
  
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert('Gagal import Excel');
    }
  };
  

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      onUpdateCategories([...categories, { id: `cat_${Date.now()}`, name: trimmed }]);
      
      storageService.addHistory({
        username: adminUsername,
        action: 'TAMBAH_KATEGORI',
        productName: trimmed,
        productCode: 'KATEGORI'
      });
      refreshLogs();
      
      setNewCategory('');
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) return;
    if (admins.some(a => a.username === newAdmin.username)) {
      alert('Username sudah digunakan!');
      return;
    }
    const updatedAdmins = [...admins, newAdmin];
    setAdmins(updatedAdmins);
    storageService.saveAdmins(updatedAdmins);
    setNewAdmin({ username: '', password: '' });
  };

  const handleDeleteAdmin = (username: string) => {
    if (admins.length <= 1) {
      alert('Tidak bisa menghapus admin terakhir!');
      return;
    }
    if (confirm(`Hapus admin "${username}"?`)) {
      const updatedAdmins = admins.filter(a => a.username !== username);
      setAdmins(updatedAdmins);
      storageService.saveAdmins(updatedAdmins);
    }
  };

  const getActionStyles = (action: HistoryLog['action']) => {
    switch (action) {
      case 'TAMBAH': return 'bg-green-100 text-green-700';
      case 'EDIT': return 'bg-blue-100 text-blue-700';
      case 'HAPUS': return 'bg-red-100 text-red-700';
      case 'TAMBAH_KATEGORI': return 'bg-emerald-100 text-emerald-800';
      case 'HAPUS_KATEGORI': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatActionName = (action: HistoryLog['action']) => {
    return action.replace('_', ' ');
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
          {/* Tombol Lihat Katalog - Navigasi ke /katalog */}
          <a
            href="/katalog"
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
              {tab === 'products' ? 'Daftar Produk' : tab === 'categories' ? 'Kategori' : tab === 'import' ? 'Mass Edit' : tab === 'history' ? 'Riwayat' : 'Pengaturan'}
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
          {viewMode === 'list' ? (
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
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          Belum ada produk. Silahkan tambah atau import.
                        </td>
                      </tr>
                    ) : products.map((product) => (
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
                              <div className="font-medium text-gray-900">{product.name}</div>
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
                            <button onClick={() => handleEdit(product)} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md transition" title="Edit Produk">
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
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-400">
                  Belum ada produk. Silahkan tambah atau import.
                </div>
              ) : products.map((product) => (
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
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
              </label>
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
              onClick={refreshLogs}
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
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Manajemen Admin</h3>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                <UserPlus className="w-4 h-4 mr-2" />
                Tambah Admin Baru
              </h4>
              <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Username" 
                  required
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                />
                <input 
                  type="text" 
                  placeholder="Password" 
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                />
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium">
                  Tambah
                </button>
              </form>
            </div>
            <div className="p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Daftar Admin</h4>
              <div className="space-y-3">
                {admins.map((admin, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {admin.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{admin.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteAdmin(admin.username)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Admin"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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