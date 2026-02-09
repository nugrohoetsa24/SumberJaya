import { supabase } from '../lib/supabase';
import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Edit2, Trash2, FileText, Share2, MessageCircle, Download, RotateCcw } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { pdfService } from '../services/pdfService';

interface CatalogProps {
  products: Product[];
  categories: Category[];
  isAdmin: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const Catalog: React.FC<CatalogProps> = ({ 
  products, 
  categories, 
  isAdmin, 
  onEditProduct, 
  onDeleteProduct 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter logic: Category + Search Query
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' || 
                            product.name.toLowerCase().includes(query) || 
                            product.code.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleDownloadFullCatalog = async () => {
    setIsGenerating(true);
    try {
      await pdfService.generateCatalogPDF(products, categories);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat PDF katalog.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const handleShareToWhatsApp = async (product: Product, e?: React.MouseEvent) => {
    // Prevent opening modal when sharing from card
    if (e) {
      e.stopPropagation();
    }

    setIsGenerating(true);
    try {
      const message = `Halo, berikut detil produk kami.\n\nNama: ${product.name}\nKode: ${product.code}\nHarga: Rp ${product.price.toLocaleString('id-ID')}\n\nDeskripsi:\n${product.description}\n\nSumber Jaya`;
      
      // Native sharing if supported (e.g., mobile browsers)
      if (navigator.share && navigator.canShare) {
        const blob = await (pdfService as any).generateSingleProductPDFBlob(product);
        const file = new File([blob], `Produk_${product.code}.pdf`, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: product.name,
            text: message,
          });
          return;
        }
      }

      // Fallback: Just trigger PDF download and open WhatsApp link
      await pdfService.generateSingleProductPDF(product);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } catch (e) {
      console.error('Sharing failed', e);
      // Absolute fallback: Only WhatsApp link
      const message = `Halo, berikut detil produk kami.\n\nNama: ${product.name}\nKode: ${product.code}\nHarga: Rp ${product.price.toLocaleString('id-ID')}\n\nDeskripsi:\n${product.description}\n\nSumber Jaya`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    if (window.confirm(`Apakah anda yakin ingin menghapus "${product.name}"?`)) {
      onDeleteProduct(product.id);
      setSelectedProduct(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-10 text-center max-w-2xl mx-auto animate-in fade-in slide-in-from-top duration-700">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
          Katalog Aksesoris
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Pusat aksesoris dan variasi terlengkap untuk kendaraan anda. Temukan produk berkualitas di <span className="text-blue-700 font-bold italic">Sumber Jaya</span>.
        </p>
        <button
          onClick={handleDownloadFullCatalog}
          disabled={isGenerating}
          className="inline-flex items-center px-8 py-4 bg-blue-700 text-white rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-xl hover:shadow-blue-200 disabled:opacity-50 active:scale-95"
        >
          {isGenerating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menyiapkan PDF...
            </span>
          ) : (
            <><FileText className="w-5 h-5 mr-2" /> Download Katalog Lengkap (PDF)</>
          )}
        </button>
      </div>

      {/* Toolbar - Prevent Overlapping with Stacked Layout */}
      <div className="mb-12 space-y-6">
        {/* Row 1: Search Bar (Focus point) */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto flex items-center">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari nama atau kode produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-10 py-4 border-none rounded-xl leading-5 bg-transparent placeholder-gray-400 focus:ring-0 sm:text-base transition-all text-gray-900"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Scroller (Clean scroll area) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center max-w-full overflow-x-auto pb-4 space-x-3 no-scrollbar scroll-smooth px-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
                selectedCategory === 'All' 
                  ? 'bg-blue-700 border-blue-700 text-white shadow-lg shadow-blue-100' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Semua Produk
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
                  selectedCategory === cat.name 
                    ? 'bg-blue-700 border-blue-700 text-white shadow-lg shadow-blue-100' 
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product, idx) => (
            <div key={product.id} className="animate-in fade-in zoom-in duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
              <ProductCard 
                product={product} 
                onClick={setSelectedProduct} 
                onShare={handleShareToWhatsApp}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 shadow-inner flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Filter className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tidak ada produk ditemukan</h3>
          <p className="text-gray-500 max-w-xs mx-auto mb-8">
            Pencarian untuk "{searchQuery}" di kategori "{selectedCategory === 'All' ? 'Semua' : selectedCategory}" tidak membuahkan hasil.
          </p>
          <button 
            onClick={resetFilters}
            className="flex items-center px-8 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Atur Ulang Filter
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-900/60 backdrop-blur-md" 
              onClick={() => setSelectedProduct(null)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-3xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full animate-in zoom-in slide-in-from-bottom-4 duration-300">
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  className="p-2.5 text-gray-400 bg-white/80 backdrop-blur rounded-full hover:text-gray-900 focus:outline-none shadow-md transition-all hover:scale-110 active:scale-95"
                  onClick={() => setSelectedProduct(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row h-full md:min-h-[500px]">
                {/* Image Section */}
                <div className="w-full md:w-1/2 h-80 md:h-auto bg-gray-50 flex items-center justify-center relative">
                  <img 
                    src={selectedProduct.imageUrl || '/no-image.png'}
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-blue-700 shadow-sm">
                      {selectedProduct.category}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between overflow-y-auto max-h-[80vh] md:max-h-none">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">{selectedProduct.code}</span>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">{selectedProduct.name}</h2>
                    
                    <div className="text-3xl font-black text-blue-700 mb-8">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedProduct.price)}
                    </div>

                    <div className="mb-8">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2 text-left">Deskripsi Produk</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed h-32 overflow-y-auto no-scrollbar pr-2 text-left">
                        {selectedProduct.description || 'Tidak ada deskripsi tambahan untuk produk ini.'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => handleShareToWhatsApp(selectedProduct)}
                        disabled={isGenerating}
                        className="flex items-center justify-center w-full bg-[#25D366] text-white py-4 px-6 rounded-2xl font-bold hover:bg-[#128C7E] transition-all shadow-lg shadow-green-100 active:scale-95"
                      >
                        <MessageCircle className="w-5 h-5 mr-3" />
                        Bagikan via WhatsApp
                      </button>
                      <button 
                        onClick={() => pdfService.generateSingleProductPDF(selectedProduct)}
                        disabled={isGenerating}
                        className="flex items-center justify-center w-full bg-gray-100 text-gray-800 py-3.5 px-6 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                      >
                        <Download className="w-5 h-5 mr-3" />
                        Simpan PDF Flyer
                      </button>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-10 pt-6 border-t border-gray-100 flex gap-3">
                      <button 
                        onClick={() => {
                          onEditProduct(selectedProduct);
                          setSelectedProduct(null);
                        }}
                        className="flex-1 flex items-center justify-center bg-indigo-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(selectedProduct)}
                        className="flex-1 flex items-center justify-center bg-red-50 text-red-600 py-3.5 px-4 rounded-xl font-bold hover:bg-red-100 transition-all active:scale-95"
                      >
                         <Trash2 className="w-4 h-4 mr-2" />
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
