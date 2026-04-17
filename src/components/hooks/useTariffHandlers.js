import { useState } from 'react';

export function useTariffHandlers(supabase, apartments, fetchData, showToast) {
  const [tariffPeriod, setTariffPeriod] = useState('2026-01');
  const [tariffForm, setTariffForm] = useState({
    name: '',
    total_amount: '',
    price_per_m2: '',
    is_per_m2: false,
    vat_rate: 0,
    include_in_invoice: true,
    target_type: 'all',
    excluded_apartments: []
  });
  const [editingTariff, setEditingTariff] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copySourceMonth, setCopySourceMonth] = useState(null);
  const [selectedTariffsToCopy, setSelectedTariffsToCopy] = useState({});

  const getTargetArea = (type, excludedIds = []) => {
    if (!apartments || apartments.length === 0) return 0; // Should return 0 if no apartments
    let filtered = apartments;
    if (type === 'residential') filtered = apartments.filter(a => a.is_residential !== false);
    else if (type === 'non_residential') filtered = apartments.filter(a => a.is_residential === false);
    
    if (excludedIds && excludedIds.length > 0) {
      filtered = filtered.filter(a => !excludedIds.includes(a.id));
    }
    
    return filtered.reduce((sum, a) => sum + (parseFloat(a.area) || 0), 0);
  };

  const addTariff = async (e) => {
    e.preventDefault();
    const hasAmount = tariffForm.is_per_m2 ? tariffForm.price_per_m2 : tariffForm.total_amount;

    if (!tariffForm.name || !hasAmount) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const targetArea = getTargetArea(tariffForm.target_type, tariffForm.excluded_apartments);
      
      const dataToInsert = {
        name: tariffForm.name.trim(),
        total_amount: tariffForm.is_per_m2 
          ? parseFloat(tariffForm.price_per_m2) * targetArea 
          : parseFloat(tariffForm.total_amount),
        vat_rate: parseFloat(tariffForm.vat_rate) || 0,
        period: tariffPeriod,
        include_in_invoice: tariffForm.include_in_invoice,
        target_type: tariffForm.target_type || 'all',
        excluded_apartments: tariffForm.excluded_apartments || []
      };

      const { error } = await supabase.from('tariffs').insert([dataToInsert]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '', price_per_m2: '', is_per_m2: false, vat_rate: 0, include_in_invoice: true, target_type: 'all', excluded_apartments: [] });
      fetchData();
      showToast('✓ Tarifs pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditTariff = (tariff) => {
    setEditingTariff(tariff.id);
    const targetArea = getTargetArea(tariff.target_type || 'all');
    setEditForm({
      name: tariff.name,
      total_amount: tariff.total_amount,
      price_per_m2: targetArea > 0 ? (parseFloat(tariff.total_amount) / targetArea).toFixed(4) : "0.0000",
      is_per_m2: false, // Pēc noklusējuma rediģējam kopējo summu, lietotājs var pārslēgt
      vat_rate: tariff.vat_rate || 0,
      include_in_invoice: tariff.include_in_invoice !== false,
      target_type: tariff.target_type || 'all',
      excluded_apartments: Array.isArray(tariff.excluded_apartments) ? tariff.excluded_apartments : JSON.parse(tariff.excluded_apartments || '[]')
    });
  };

  const saveEditTariff = async (id) => {
    try {
      const targetArea = getTargetArea(editForm.target_type, editForm.excluded_apartments);
      
      const totalAmount = editForm.is_per_m2 
        ? parseFloat(editForm.price_per_m2) * targetArea 
        : parseFloat(editForm.total_amount);

      const { error } = await supabase
        .from('tariffs')
        .update({
          name: editForm.name,
          total_amount: totalAmount,
          vat_rate: parseFloat(editForm.vat_rate) || 0,
          include_in_invoice: editForm.include_in_invoice,
          target_type: editForm.target_type || 'all',
          excluded_apartments: editForm.excluded_apartments || []
        })
        .eq('id', id);
      
      if (error) throw error;
      setEditingTariff(null);
      fetchData();
      showToast('✓ Tarifs atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteTariff = async (id) => {
    if (!window.confirm('Izdzēst tarifu?')) return;
    try {
      await supabase.from('invoices').delete().eq('tariff_id', id);
      await supabase.from('tariffs').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const copySelectedTariffs = async (tariffs, fromPeriod, toPeriod) => {
    const selectedIds = Object.keys(selectedTariffsToCopy).filter(id => selectedTariffsToCopy[id]);
    if (selectedIds.length === 0) {
      showToast('Atlasiet vismaz vienu tarifu', 'error');
      return;
    }

    try {
      const tariffsToCopy = tariffs.filter(t => t.period === fromPeriod && selectedIds.includes(t.id));
      const newTariffs = tariffsToCopy.map(t => ({
        name: t.name,
        total_amount: t.total_amount,
        vat_rate: t.vat_rate,
        period: toPeriod,
        target_type: t.target_type || 'all',
        excluded_apartments: t.excluded_apartments || []
      }));

      const { error } = await supabase.from('tariffs').insert(newTariffs);
      if (error) throw error;

      setSelectedTariffsToCopy({});
      setCopySourceMonth(null);
      fetchData();
      showToast(`✓ Kopēti ${newTariffs.length} tarifi`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  return {
    tariffPeriod, setTariffPeriod,
    tariffForm, setTariffForm,
    editingTariff, setEditingTariff,
    editForm, setEditForm,
    copySourceMonth, setCopySourceMonth,
    selectedTariffsToCopy, setSelectedTariffsToCopy,
    addTariff,
    startEditTariff,
    saveEditTariff,
    deleteTariff,
    copySelectedTariffs,
    getTargetArea
  };
}
