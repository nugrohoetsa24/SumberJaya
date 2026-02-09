import { supabase } from '@/lib/supabase'
import { produk } from '../types'

export async function insertProduct(product: Omit<produk, 'id'>) {
  const { data, error } = await supabase
    .from('produk')
    .insert([produk])
    .select()
    .single()

  if (error) {
    console.error('Insert product error:', error)
    throw error
  }

  return data
}
