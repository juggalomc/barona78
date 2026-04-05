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
    declared_persons: '',
    registration_number: '',
    apartment_address: '',
    is_residential: true
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
        declared_persons: apartmentForm.declared_persons === '' ? null : parseInt(apartmentForm.declared_persons),
        registration_number: apartmentForm.registration_number || null,
        apartment_address: apartmentForm.apartment_address || null,
        is_residential: !!apartmentForm.is_residential
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
        declared_persons: '',
        registration_number: '',
        apartment_address: '',
        is_residential: true
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
      declared_persons: apt.declared_persons !== null ? apt.declared_persons : '',
      registration_number: apt.registration_number || '',
      apartment_address: apt.apartment_address || '',
      is_residential: apt.is_residential !== false
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
          declared_persons: editApartmentForm.declared_persons === '' ? null : parseInt(editApartmentForm.declared_persons),
          registration_number: editApartmentForm.registration_number || null,
          apartment_address: editApartmentForm.apartment_address || null,
          is_residential: !!editApartmentForm.is_residential
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
