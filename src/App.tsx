import React, { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './lib/supabase';

import { Navbar } from './components/Navbar';
import { Catalog } from './pages/Catalog';
import { AdminDashboard } from './components/AdminDashboard';
import { Login } from './components/Login';

import { Product, Category } from './src/types';

const App: React.FC = () => {
  const [view, setView] = useState<'catalog' | 'login' | 'admin'>('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // =========================
  // FETCH DATA FROM SUPABASE
  // =========================
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      
      try {
        console.log('🔄 Fetching data from Supabase...');
        
        // Fetch products
        const { data: produkData, error: produkError } = await supabase
          .from('produk')
          .select('*')
          .order('created_at', { ascending: false });

        if (produkError) {
          console.error('❌ Error fetching products:', produkError);
          // Coba lagi tanpa auth jika error 401
          if (produkError.code === '401' || produkError.code === '42501') {
            console.log('🔄 Retrying without auth...');
            const { data: retryData, error: retryError } = await supabase
              .from('produk')
              .select('*')
              .order('created_at', { ascending: false });
            
            if (!retryError && retryData) {
              const transformedProducts = retryData.map((item: any) => ({
                id: item.id,
                code: item.code || '',
                name: item.name || '',
                price: Number(item.price) || 0,
                category: item.category || 'Uncategorized',
                description: item.description || '',
                imageUrl: item.image_url || '',
                updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
              }));
              setProducts(transformedProducts);
              console.log('✅ Products loaded (retry):', transformedProducts.length);
            }
          }
        } else if (produkData) {
          const transformedProducts = produkData.map((item: any) => ({
            id: item.id,
            code: item.code || '',
            name: item.name || '',
            price: Number(item.price) || 0,
            category: item.category || 'Uncategorized',
            description: item.description || '',
            imageUrl: item.image_url || '',
            updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
          }));
          setProducts(transformedProducts);
          console.log('✅ Products loaded:', transformedProducts.length);
        }
      } catch (error) {
        console.error('❌ Error in products fetch:', error);
      }

      try {
        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
          .from('category')
          .select('id, name')
          .order('name');

        if (categoryError) {
          console.error('❌ Error fetching categories:', categoryError);
          
          // Set default categories
          const defaultCategories = [
            { id: 'cat_1', name: 'Uncategorized' },
            { id: 'cat_2', name: 'Eksterior' },
            { id: 'cat_3', name: 'Interior' },
            { id: 'cat_4', name: 'Mesin' },
            { id: 'cat_5', name: 'Aksesoris' }
          ];
          setCategories(defaultCategories);
        } else if (categoryData && categoryData.length > 0) {
          console.log('✅ Categories loaded:', categoryData);
          const transformedCategories = categoryData.map((cat: any) => ({
            id: cat.id,
            name: cat.name
          }));
          setCategories(transformedCategories);
        } else {
          console.log('📭 Categories table is empty');
          setCategories([{ id: 'cat_1', name: 'Uncategorized' }]);
        }
      } catch (error) {
        console.error('❌ Unexpected error fetching categories:', error);
        setCategories([{ id: 'cat_1', name: 'Uncategorized' }]);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // =========================
  // AUTH HANDLING
  // =========================
  useEffect(() => {
    console.log('🔐 Checking auth session...');
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          return;
        }
        
        console.log('📊 Session data:', session);
        
        if (session) {
          console.log('✅ User is authenticated:', session.user.email);
          setIsAdmin(true);
          setCurrentUsername(session.user.email || 'User');
          setView('catalog');
        } else {
          console.log('👤 No active session, checking localStorage for admin login...');
          // Cek jika ada admin login di localStorage
          const savedAdmin = localStorage.getItem('currentAdmin');
          if (savedAdmin) {
            const adminData = JSON.parse(savedAdmin);
            setIsAdmin(true);
            setCurrentUsername(adminData.username);
            setView('catalog');
            console.log('✅ Admin restored from localStorage:', adminData.username);
          } else {
            setIsAdmin(false);
            setCurrentUsername('');
            setView('login');
          }
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        setIsAdmin(false);
        setCurrentUsername('');
        setView('login');
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', session ? 'Logged in' : 'Logged out');
      
      if (session) {
        setIsAdmin(true);
        setCurrentUsername(session.user.email || 'User');
        setView('catalog');
      } else {
        // Cek localStorage untuk admin login
        const savedAdmin = localStorage.getItem('currentAdmin');
        if (!savedAdmin) {
          setIsAdmin(false);
          setCurrentUsername('');
          setView('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (username: string) => {
    console.log('✅ Login successful for:', username);
    setIsAdmin(true);
    setCurrentUsername(username);
    
    // Simpan admin info ke localStorage untuk persistensi
    localStorage.setItem('currentAdmin', JSON.stringify({ username }));
    
    setView('catalog');
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    
    try {
      // Hapus dari localStorage
      localStorage.removeItem('currentAdmin');
      
      // Coba logout dari Supabase Auth jika ada session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
      
      setIsAdmin(false);
      setCurrentUsername('');
      setView('login');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Fallback logout
      setIsAdmin(false);
      setCurrentUsername('');
      setView('login');
    }
  };

  // =========================
  // STATE UPDATERS
  // =========================
  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  // =========================
  // CATALOG ACTIONS
  // =========================
  const handleEditFromCatalog = (product: Product) => {
    setProductToEdit(product);
    setView('admin');
    setDashboardKey(prev => prev + 1);
  };

  const handleDeleteFromCatalog = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('produk')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('❌ Delete error:', error);
        alert('Gagal menghapus produk: ' + error.message);
        return;
      }

      // Update UI
      setProducts(prev => prev.filter(p => p.id !== productId));
      console.log('✅ Product deleted successfully');
    } catch (error) {
      console.error('❌ Delete error:', error);
      alert('Gagal menghapus produk');
    }
  };

  // =========================
  // NAVIGATION
  // =========================
  const handleDashboardClick = () => {
    if (isAdmin) {
      setView('admin');
      setDashboardKey(prev => prev + 1);
    } else {
      setView('login');
    }
  };

  const handleHomeClick = () => {
    setView(isAdmin ? 'catalog' : 'login');
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        isAdmin={isAdmin}
        onLoginClick={() => setView('login')}
        onLogoutClick={handleLogout}
        onDashboardClick={handleDashboardClick}
        onHomeClick={handleHomeClick}
        username={currentUsername}
      />

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Memuat data...</p>
          </div>
        ) : (
          <>
            {view === 'catalog' && isAdmin && (
              <Catalog
                products={products}
                categories={categories}
                isAdmin={isAdmin}
                onEditProduct={handleEditFromCatalog}
                onDeleteProduct={handleDeleteFromCatalog}
              />
            )}

            {view === 'login' && (
              <div className="max-w-md mx-auto mt-20 px-4">
                <Login onLoginSuccess={handleLogin} />
              </div>
            )}

            {view === 'admin' && isAdmin && (
              <AdminDashboard
                key={dashboardKey}
                products={products}
                categories={categories}
                onUpdateProducts={handleUpdateProducts}
                onUpdateCategories={handleUpdateCategories}
                productToEdit={productToEdit}
                onClearProductToEdit={() => setProductToEdit(null)}
                adminUsername={currentUsername}
              />
            )}

            {view !== 'login' && !isAdmin && (
              <div className="max-w-md mx-auto mt-20 px-4">
                <div className="text-center">
                  <p className="text-red-500 mb-4">Access denied. Please login as admin.</p>
                  <Login onLoginSuccess={handleLogin} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sumber Jaya - Aksesoris. All rights reserved.
          </p>
          <p className="text-center text-xs text-gray-400 mt-1">
            Logged in as: {currentUsername || 'Not logged in'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;