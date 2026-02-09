import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Mencoba login dengan admin_users...');
      
      // Query ke tabel admin_users
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username.trim())
        .maybeSingle();

      console.log('📊 Admin data response:', { adminData, adminError });

      if (adminError) {
        console.error('❌ Error query admin_users:', adminError);
        throw new Error('Terjadi kesalahan pada server. Silakan coba lagi.');
      }

      if (!adminData) {
        console.log('👤 Admin tidak ditemukan');
        throw new Error('Username atau password salah');
      }

      // Verifikasi password (plain text untuk testing)
      if (password === adminData.password_hash) {
        console.log('✅ Login admin berhasil:', adminData.username);
        onLoginSuccess(adminData.username);
      } else {
        console.log('❌ Password tidak cocok');
        throw new Error('Username atau password salah');
      }
      
    } catch (err: any) {
      console.error('🔥 Login error:', err);
      setError(err.message || 'Login gagal. Coba gunakan username: admin, password: admin123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Login
      </h2>
      
      
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Username"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Password"
            required
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
      
      
    </div>
  );
};