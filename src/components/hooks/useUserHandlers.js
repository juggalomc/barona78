import { useState } from 'react';

export function useUserHandlers(supabase, fetchData, showToast) {
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    apartment_id: '',
    role: 'user'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    password: '',
    apartment_id: '',
    role: 'user'
  });

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.email || !newUserForm.password || !newUserForm.apartment_id) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('users').insert([{
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        apartment_id: newUserForm.apartment_id,
        role: newUserForm.role
      }]);

      if (error) throw error;
      setNewUserForm({ email: '', password: '', apartment_id: '', role: 'user' });
      fetchData();
      showToast('✓ Lietotājs pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user.id);
    setEditUserForm({
      email: user.email,
      password: user.password,
      apartment_id: user.apartment_id,
      role: user.role
    });
  };

  const saveEditUser = async (id) => {
    if (!editUserForm.email || !editUserForm.password) {
      showToast('Email un parole ir obligāti', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('users').update({
        email: editUserForm.email.trim(),
        password: editUserForm.password,
        apartment_id: editUserForm.apartment_id,
        role: editUserForm.role
      }).eq('id', id);

      if (error) throw error;
      setEditingUser(null);
      fetchData();
      showToast('✓ Lietotājs atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Izdzēst lietotāju?')) return;
    try {
      await supabase.from('users').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  return {
    newUserForm, setNewUserForm,
    editingUser, setEditingUser,
    editUserForm, setEditUserForm,
    addUser,
    startEditUser,
    saveEditUser,
    deleteUser
  };
}
