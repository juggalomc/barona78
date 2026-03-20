import { useState } from 'react';

export function useApartmentHandlers(supabase, fetchData, showToast) {
  const [apartmentForm, setApartmentForm] = useState({
    number: '',
    area: '',
    kadaster: '',
    owner_name: '',
    owner_surname: '',
    personal_code: '',
    phone: '',
    email: '',
    share: '',
    declared_persons: 1
  });
  const [editingApartment, setEditingApartment] = useState(null);
  const [editApartmentForm, setEditApartmentForm] = useState({});

  const addApartment = async (e) => {
    e.preventDefault();
    if (!apartmentForm.number || !apartmentForm.area || !apartmentForm.owner_name) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const dataToInsert = {
        number: apartmentForm.number.trim(),
        area: parseFloat(apartmentForm.area),
        kadaster: apartmentForm.kadaster || null,
        owner_name: apartmentForm.owner_name.trim(),
        owner_surname: apartmentForm.owner_surname || null,
        personal_code: apartmentForm.personal_code || null,
        phone: apartmentForm.phone || null,
        email: apartmentForm.email || null,
        share: apartmentForm.share ? parseFloat(apartmentForm.share) : null,
        declared_persons: parseInt(apartmentForm.declared_persons) || 1
      };

      const { error } = await supabase.from('apartments').insert([dataToInsert]);
      if (error) throw error;
      
      setApartmentForm({
        number: '',
        area: '',
        kadaster: '',
        owner_name: '',
        owner_surname: '',
        personal_code: '',
        phone: '',
        email: '',
        share: '',
        declared_persons: 1
      });
      fetchData();
      showToast('✓ Dzīvoklis pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditApartment = (apt) => {
    setEditingApartment(apt.id);
    setEditApartmentForm({
      number: apt.number,
      area: apt.area,
      kadaster: apt.kadaster || '',
      owner_name: apt.owner_name,
      owner_surname: apt.owner_surname || '',
      personal_code: apt.personal_code || '',
      phone: apt.phone || '',
      email: apt.email || '',
      share: apt.share || '',
      declared_persons: apt.declared_persons || 1
    });
  };

  const saveEditApartment = async (id) => {
    try {
      const { error } = await supabase
        .from('apartments')
        .update({
          number: editApartmentForm.number,
          area: parseFloat(editApartmentForm.area),
          kadaster: editApartmentForm.kadaster || null,
          owner_name: editApartmentForm.owner_name,
          owner_surname: editApartmentForm.owner_surname || null,
          personal_code: editApartmentForm.personal_code || null,
          phone: editApartmentForm.phone || null,
          email: editApartmentForm.email || null,
          share: editApartmentForm.share ? parseFloat(editApartmentForm.share) : null,
          declared_persons: parseInt(editApartmentForm.declared_persons) || 1
        })
        .eq('id', id);
      
      if (error) throw error;
      setEditingApartment(null);
      fetchData();
      showToast('✓ Dzīvoklis atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteApartment = async (id) => {
    if (!window.confirm('Izdzēst dzīvokli?')) return;
    try {
      await supabase.from('invoices').delete().eq('apartment_id', id);
      await supabase.from('apartments').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  return {
    apartmentForm, setApartmentForm,
    editingApartment, setEditingApartment,
    editApartmentForm, setEditApartmentForm,
    addApartment,
    startEditApartment,
    saveEditApartment,
    deleteApartment
  };
}
