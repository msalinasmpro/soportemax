import { supabaseAdmin } from './supabase-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword required' });

  try {
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = users.users.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    if (error) throw error;

    return res.status(200).json({ ok: true, user: data.user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}