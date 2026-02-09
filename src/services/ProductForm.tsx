import { useState } from 'react'
import { insertProduct } from '../services/productService'
import { Product } from '../types'

interface Props {
  onSuccess: (product: Product) => void
}

export default function ProductForm({ onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: ''
  })

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const newProduct = await insertProduct({
        ...form,
        price: Number(form.price)
      })

      onSuccess(newProduct)

      setForm({
        name: '',
        code: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: ''
      })
    } catch {
      alert('Gagal menambahkan produk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input placeholder="Nama produk" required
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        className="input"
      />

      <input placeholder="Kode produk" required
        value={form.code}
        onChange={e => setForm({ ...form, code: e.target.value })}
        className="input"
      />

      <input type="number" placeholder="Harga" required
        value={form.price}
        onChange={e => setForm({ ...form, price: +e.target.value })}
        className="input"
      />

      <input placeholder="Kategori"
        value={form.category}
        onChange={e => setForm({ ...form, category: e.target.value })}
        className="input"
      />

      <textarea placeholder="Deskripsi"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        className="input"
      />

      <input placeholder="Image URL (opsional)"
        value={form.imageUrl}
        onChange={e => setForm({ ...form, imageUrl: e.target.value })}
        className="input"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-700 text-white px-6 py-3 rounded-xl font-bold"
      >
        {loading ? 'Menyimpan...' : 'Tambah Produk'}
      </button>
    </form>
  )
}
