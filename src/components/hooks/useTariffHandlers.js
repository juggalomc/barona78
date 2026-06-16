import { useState } from 'react';

const normalizePeriod = (p) => {
  if (!p || typeof p !== 'string') return p;
  const parts = p.split('-');
  if (parts.length !== 2) return p;
  return `${parts[0]}-${parts[1].padStart(2, '0')}`;
};

export function useTariffHandlers(supabase, apartments, fetchData, showToast) {
  const [tariffPeriod, setTariffPeriod] = useState('2026-01');
  const [tariffForm, setTariffForm] = useState({
    name: '',
    total_amount: '',
    price_per_m2: '',
    price_per_unit: '',
    is_per_m2: false,
    is_fixed_amount: false,
    vat_rate: 21,
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

  const getTargetCount = (type, excludedIds = []) => {
    if (!apartments || apartments.length === 0) return 0;
    let filtered = apartments;
    if (type === 'residential') filtered = apartments.filter(a => a.is_residential !== false);
    else if (type === 'non_residential') filtered = apartments.filter(a => a.is_residential === false);

    if (excludedIds && excludedIds.length > 0) {
      filtered = filtered.filter(a => !excludedIds.includes(a.id));
    }

    return filtered.length;
  };

  const computeTotalAmount = (form, targetArea, targetCount) => {
    if (form.is_per_m2) return (parseFloat(form.price_per_m2) || 0) * targetArea;
    if (form.is_fixed_amount) return (parseFloat(form.price_per_unit) || 0) * targetCount;
    return parseFloat(form.total_amount) || 0;
  };

  const addTariff = async (e) => {
    e.preventDefault();
    const hasAmount = tariffForm.is_per_m2
      ? tariffForm.price_per_m2
      : tariffForm.is_fixed_amount
        ? tariffForm.price_per_unit
        : tariffForm.total_amount;

    if (!tariffForm.name || !hasAmount) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const targetArea = getTargetArea(tariffForm.target_type, tariffForm.excluded_apartments);
      const targetCount = getTargetCount(tariffForm.target_type, tariffForm.excluded_apartments);

      const dataToInsert = {
        name: tariffForm.name.trim(),
        total_amount: computeTotalAmount(tariffForm, targetArea, targetCount),
        price_per_m2: tariffForm.is_per_m2 ? (parseFloat(tariffForm.price_per_m2) || 0) : null,
        price_per_unit: tariffForm.is_fixed_amount ? (parseFloat(tariffForm.price_per_unit) || 0) : null,
        is_per_m2: !!tariffForm.is_per_m2,
        is_fixed_amount: !!tariffForm.is_fixed_amount,
        vat_rate: parseFloat(tariffForm.vat_rate) || 0,
        period: tariffPeriod,
        include_in_invoice: tariffForm.include_in_invoice,
        target_type: tariffForm.target_type || 'all',
        excluded_apartments: tariffForm.excluded_apartments || []
      };

      const { error } = await supabase.from('tariffs').insert([dataToInsert]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '', price_per_m2: '', price_per_unit: '', is_per_m2: false, is_fixed_amount: false, vat_rate: 21, include_in_invoice: true, target_type: 'all', excluded_apartments: [] });
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
      price_per_m2: tariff.price_per_m2 != null
        ? tariff.price_per_m2
        : (targetArea > 0 ? (parseFloat(tariff.total_amount) / targetArea).toFixed(4) : "0.0000"),
      price_per_unit: tariff.price_per_unit != null ? tariff.price_per_unit : '',
      is_per_m2: !!tariff.is_per_m2,
      is_fixed_amount: !!tariff.is_fixed_amount,
      vat_rate: tariff.vat_rate || 0,
      include_in_invoice: tariff.include_in_invoice !== false,
      target_type: tariff.target_type || 'all',
      excluded_apartments: Array.isArray(tariff.excluded_apartments) ? tariff.excluded_apartments : JSON.parse(tariff.excluded_apartments || '[]')
    });
  };

  const saveEditTariff = async (id) => {
    try {
      const targetArea = getTargetArea(editForm.target_type, editForm.excluded_apartments);
      const targetCount = getTargetCount(editForm.target_type, editForm.excluded_apartments);

      const totalAmount = computeTotalAmount(editForm, targetArea, targetCount);

      const { error } = await supabase
        .from('tariffs')
        .update({
          name: editForm.name,
          total_amount: totalAmount,
          price_per_m2: editForm.is_per_m2 ? (parseFloat(editForm.price_per_m2) || 0) : null,
          price_per_unit: editForm.is_fixed_amount ? (parseFloat(editForm.price_per_unit) || 0) : null,
          is_per_m2: !!editForm.is_per_m2,
          is_fixed_amount: !!editForm.is_fixed_amount,
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
    if (!fromPeriod || !toPeriod) {
      showToast('Izvēlieties mēnešu', 'error');
      return;
    }

    const selectedIds = Object.keys(selectedTariffsToCopy)
      .filter(id => selectedTariffsToCopy[id] === true)
      .map(id => String(id));

    if (selectedIds.length === 0) {
      showToast('Atzīmējiet vismaz vienu tarifu kopēšanai', 'error');
      return;
    }

    try {
      const normalizedFromPeriod = normalizePeriod(fromPeriod);
      const tariffsToCopy = tariffs.filter(t => {
        const periodMatches = normalizePeriod(t.period) === normalizedFromPeriod;
        const idMatches = selectedIds.includes(String(t.id));
        return periodMatches && idMatches;
      });

      if (tariffsToCopy.length === 0) {
        showToast('Šajā mēnesī nav atlasīto tarifu', 'error');
        return;
      }

      const newTariffs = tariffsToCopy.map(t => {
        const excludedApartments = Array.isArray(t.excluded_apartments)
          ? t.excluded_apartments
          : JSON.parse(t.excluded_apartments || '[]');

        return {
          name: t.name,
          total_amount: Number(t.total_amount) || 0,
          price_per_m2: t.price_per_m2 != null ? Number(t.price_per_m2) : null,
          price_per_unit: t.price_per_unit != null ? Number(t.price_per_unit) : null,
          is_per_m2: !!t.is_per_m2,
          is_fixed_amount: !!t.is_fixed_amount,
          vat_rate: Number(t.vat_rate) || 0,
          period: normalizePeriod(toPeriod),
          include_in_invoice: t.include_in_invoice !== false,
          target_type: t.target_type || 'all',
          excluded_apartments: excludedApartments
        };
      });

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
