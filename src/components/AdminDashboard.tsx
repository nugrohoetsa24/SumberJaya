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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsFormOpen(true);
  };

  const initiateDeleteProduct = (product: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      const updatedProducts = products.filter(p => p.id !== productToDelete.id);
      onUpdateProducts(updatedProducts);
      
      storageService.addHistory({
        username: adminUsername,
        action: 'HAPUS',
        productName: productToDelete.name,
        productCode: productToDelete.code
      });
      refreshLogs();
      setProductToDelete(null);
    }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        alert("Ukuran file terlalu besar (Maksimal 5MB). Mohon kompres foto anda.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
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

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.price) return;

    if (editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? { ...p, ...formData, updatedAt: new Date().toISOString() } as Product : p
      );
      onUpdateProducts(updatedProducts);
      
      storageService.addHistory({
        username: adminUsername,
        action: 'EDIT',
        productName: formData.name!,
        productCode: formData.code!
      });
    } else {
      const newProduct: Product = {
        id: `prod_${Date.now()}`,
        updatedAt: new Date().toISOString(),
        ...formData as any
      };
      onUpdateProducts([...products, newProduct]);
      
      storageService.addHistory({
        username: adminUsername,
        action: 'TAMBAH',
        productName: newProduct.name,
        productCode: newProduct.code
      });
    }
    refreshLogs();
    setIsFormOpen(false);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await parseExcel(file);
      let updatedProducts = [...products];
      let newCategories = [...categories];
      let newProductCount = 0;
      let updateProductCount = 0;
      let newCategoryCount = 0;

      importedData.forEach(importedItem => {
        if (!importedItem.code) return;

        if (importedItem.category) {
          const catExists = newCategories.some(c => c.name.toLowerCase() === importedItem.category?.toLowerCase());
          if (!catExists) {
            newCategories.push({
              id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: importedItem.category
            });
            newCategoryCount++;
          }
        }

        const existingIndex = updatedProducts.findIndex(p => p.code === importedItem.code);
        if (existingIndex >= 0) {
          updatedProducts[existingIndex] = {
            ...updatedProducts[existingIndex],
            ...importedItem,
            updatedAt: new Date().toISOString()
          } as Product;
          updateProductCount++;
        } else {
          updatedProducts.push({
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: '', 
            updatedAt: new Date().toISOString(),
            ...importedItem
          } as Product);
          newProductCount++;
        }
      });

      if (newCategoryCount > 0) {
        onUpdateCategories(newCategories);
      }
      onUpdateProducts(updatedProducts);
      
      storageService.addHistory({
        username: adminUsername,
        action: 'TAMBAH',
        productName: `Import Excel (${newProductCount + updateProductCount} produk)`,
        productCode: 'EXCEL'
      });
      refreshLogs();

      setImportSummary({
        newProducts: newProductCount,
        updatedProducts: updateProductCount,
        newCategories: newCategoryCount
      });
      setShowImportSuccess(true);
      e.target.value = ''; 
    } catch (error) {
      console.error(error);
      alert('Gagal membaca file Excel. Pastikan format sesuai.');
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
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <div className="flex items-center mt-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit">
            <User className="w-4 h-4 mr-2" />
            <p className="font-semibold text-sm">Halo {adminUsername}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportToExcel(products)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Excel
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

      {/* MODALS */}
      {showImportSuccess && importSummary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Berhasil!</h3>
              <p className="text-gray-500 mb-6">Data Excel anda telah diproses.</p>
              <button onClick={() => setShowImportSuccess(false)} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">Selesai</button>
            </div>
          </div>
        </div>
      )}

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

      {isFormOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsFormOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSaveProduct} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto Produk</label>
                    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center group">
                      {formData.imageUrl ? (
                        <>
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full z-10"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-1 text-sm text-gray-500">Tidak ada foto</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                        <label className="cursor-pointer opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-4 py-2 rounded-lg font-medium shadow-lg">
                          Upload Foto
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={fileInputRef} />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <div className="flex items-center space-x-2 mb-3 text-blue-800">
                        <Info className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Panduan Foto Produk</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] py-1 border-b border-blue-100/50">
                          <span className="text-blue-600 font-medium">Format File</span>
                          <span className="font-bold text-blue-900">JPG, PNG, WebP</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] py-1 border-b border-blue-100/50">
                          <span className="text-blue-600 font-medium">Rasio / Dimensi</span>
                          <span className="font-bold text-blue-900">1:1 (800x800 px)</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] py-1">
                          <span className="text-blue-600 font-medium">Ukuran Ideal</span>
                          <span className="font-bold text-blue-900">&lt; 1 MB (Max 5MB)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kode Produk (SKU)</label>
                      <input type="text" placeholder="Contoh: LED-H4-01" required value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
                      <input type="text" placeholder="Contoh: Lampu LED Headlight" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <select value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900">
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Harga (Rp)</label>
                      <input type="number" placeholder="0" required min="0" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                  <textarea rows={4} placeholder="Tuliskan spesifikasi lengkap produk di sini..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900" />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white">Batal</button>
                  <button type="submit" className="flex items-center px-6 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 shadow-md"><Save className="w-4 h-4 mr-2" />Simpan Produk</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
