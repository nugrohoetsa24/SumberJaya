import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AdminUser, AdminFormData } from '../src/types';

interface AdminManagementProps {
  currentAdminUsername: string;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ currentAdminUsername }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState<AdminFormData>({
    username: '',
    password: '',
    email: ''
  });

  // Fetch admin users
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, username, email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const transformedAdmins = data.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        createdAt: admin.created_at
      }));
      
      setAdmins(transformedAdmins);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      setMessage({ type: 'error', text: 'Gagal mengambil data admin' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setMessage({ type: 'error', text: 'Username dan password harus diisi' });
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Password minimal 6 karakter' });
      return;
    }

    setLoading(true);
    try {
      // Untuk sementara, simpan password sebagai plain text
      // Ini tidak aman, tapi untuk testing dulu
      const passwordHash = formData.password; // Simpan sebagai plain text sementara

      // Insert admin ke database
      const { error } = await supabase
        .from('admin_users')
        .insert({
          username: formData.username.trim(),
          password_hash: passwordHash, // Plain text untuk testing
          email: formData.email?.trim() || null
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error('Username sudah digunakan');
        }
        throw error;
      }

      // Reset form
      setFormData({ username: '', password: '', email: '' });
      setMessage({ type: 'success', text: 'Admin berhasil ditambahkan' });
      
      // Refresh list
      await fetchAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      setMessage({ type: 'error', text: error.message || 'Gagal menambahkan admin' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, username: string) => {
    if (username === 'admin') {
      setMessage({ type: 'error', text: 'Admin utama tidak dapat dihapus' });
      return;
    }

    if (username === currentAdminUsername) {
      setMessage({ type: 'error', text: 'Tidak dapat menghapus akun sendiri' });
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus admin "${username}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Admin berhasil dihapus' });
      await fetchAdmins();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      setMessage({ type: 'error', text: 'Gagal menghapus admin' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Admin</h2>
        
        {/* Pesan */}
        {message.text && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Form Tambah Admin */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Tambah Admin Baru</h3>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Username"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimal 6 karakter"
                  required
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (opsional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>
            </div>
            
            
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menambahkan...' : 'Tambah Admin'}
            </button>
          </form>
        </div>

        {/* Daftar Admin */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Daftar Admin</h3>
          
          {loading && admins.length === 0 ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : admins.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Belum ada admin</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">No</th>
                    <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Username</th>
                    <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Tanggal Dibuat</th>
                    <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin, index) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-b text-sm text-gray-700">{index + 1}</td>
                      <td className="py-3 px-4 border-b text-sm text-gray-700">
                        {admin.username}
                        {admin.username === 'admin' && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Utama
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 border-b text-sm text-gray-700">
                        {admin.email || '-'}
                      </td>
                      <td className="py-3 px-4 border-b text-sm text-gray-700">
                        {new Date(admin.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4 border-b text-sm">
                        <button
                          onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                          disabled={admin.username === 'admin' || admin.username === currentAdminUsername}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            admin.username === 'admin' || admin.username === currentAdminUsername
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={
                            admin.username === 'admin' 
                              ? 'Admin utama tidak dapat dihapus' 
                              : admin.username === currentAdminUsername
                              ? 'Tidak dapat menghapus akun sendiri'
                              : 'Hapus admin'
                          }
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};