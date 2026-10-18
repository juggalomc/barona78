import React, { useRef, useEffect } from 'react';
import { 
  Receipt, 
  Calendar, 
  Plus, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Copy, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react';

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
    marginBottom: '20px',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#ffffff'
  },
  btn: {
    padding: '9px 16px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.15s'
  },
  btnSecondary: {
    padding: '6px 12px',
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '12.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.15s, border-color 0.15s'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '8px',
    maxHeight: '180px',
    overflowY: 'auto',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#f8fafc',
    marginTop: '6px'
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12.5px',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '6px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    transition: 'all 0.15s'
  }
};

export function TariffsTab({
  tariffs,
  uniqueTariffPeriods,
  apartments,
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
}) {
  const selectAllCheckboxRef = useRef(null);
  const currentTariffs = tariffs.filter(t => t.period === tariffPeriod);

  // Selection states for current period tariffs
  const allCurrentSelected = currentTariffs.length > 0 && currentTariffs.every(t => !!selectedTariffsToCopy[String(t.id)]);
  const someCurrentSelected = currentTariffs.some(t => !!selectedTariffsToCopy[String(t.id)]);
  const selectedCount = currentTariffs.filter(t => !!selectedTariffsToCopy[String(t.id)]).length;

  // Handle native checkbox indeterminate state
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = !allCurrentSelected && someCurrentSelected;
    }
  }, [allCurrentSelected, someCurrentSelected]);

  // Toggle all tariffs in current period
  const handleToggleSelectAll = () => {
    if (allCurrentSelected) {
      // Unselect all in current period
      setSelectedTariffsToCopy(prev => {
        const next = { ...prev };
        currentTariffs.forEach(t => {
          delete next[String(t.id)];
        });
        return next;
      });
    } else {
      // Select all in current period
      setSelectedTariffsToCopy(prev => {
        const next = { ...prev };
        currentTariffs.forEach(t => {
          next[String(t.id)] = true;
        });
        return next;
      });
    }
  };

  const handleSelectAllExplicit = () => {
    setSelectedTariffsToCopy(prev => {
      const next = { ...prev };
      currentTariffs.forEach(t => {
        next[String(t.id)] = true;
      });
      return next;
    });
  };

  const handleDeselectAllExplicit = () => {
    setSelectedTariffsToCopy(prev => {
      const next = { ...prev };
      currentTariffs.forEach(t => {
        delete next[String(t.id)];
      });
      return next;
    });
  };

  const handleExclusionChange = (aptId, isEdit = false) => {
    const form = isEdit ? editForm : tariffForm;
    const setForm = isEdit ? setEditForm : setTariffForm;
    const current = form.excluded_apartments || [];
    const updated = current.includes(aptId)
      ? current.filter(id => id !== aptId)
      : [...current, aptId];
    setForm({ ...form, excluded_apartments: updated });
  };

  const handleSelectAllApartmentsExclusion = (isEdit = false) => {
    const form = isEdit ? editForm : tariffForm;
    const setForm = isEdit ? setEditForm : setTariffForm;
    setForm({ ...form, excluded_apartments: apartments.map(a => a.id) });
  };

  const handleClearApartmentsExclusion = (isEdit = false) => {
    const form = isEdit ? editForm : tariffForm;
    const setForm = isEdit ? setEditForm : setTariffForm;
    setForm({ ...form, excluded_apartments: [] });
  };

  const currentForm = editingTariff ? editForm : tariffForm;

  const getCalcType = (form) => {
    if (form.is_discount) return 'discount';
    if (form.is_per_m2) return 'per_m2';
    if (form.is_fixed_amount) return 'fixed_amount';
    return 'area';
  };

  const handleCalcTypeChange = (value) => {
    const form = editingTariff ? editForm : tariffForm;
    const setForm = editingTariff ? setEditForm : setTariffForm;
    setForm({
      ...form,
      is_discount: value === 'discount',
      is_per_m2: value === 'per_m2',
      is_fixed_amount: value === 'fixed_amount'
    });
  };

  const calcType = getCalcType(currentForm);

  const amountLabel = calcType === 'discount'
    ? 'Atlaides summa (€)'
    : calcType === 'per_m2'
      ? 'Cena par m² (€/m²)'
      : calcType === 'fixed_amount'
        ? 'Summa katram dzīvoklim (€)'
        : 'Kopējā summa (€)';

  const amountValue = calcType === 'discount'
    ? currentForm.total_amount
    : calcType === 'per_m2'
      ? currentForm.price_per_m2
      : calcType === 'fixed_amount'
        ? currentForm.price_per_unit
        : currentForm.total_amount;

  const amountField = calcType === 'discount'
    ? 'total_amount'
    : calcType === 'per_m2'
      ? 'price_per_m2'
      : calcType === 'fixed_amount'
        ? 'price_per_unit'
        : 'total_amount';

  const handleAmountChange = (value) => {
    if (editingTariff) {
      setEditForm({ ...editForm, [amountField]: value });
    } else {
      setTariffForm({ ...tariffForm, [amountField]: value });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. PERIOD SELECTOR */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={styles.cardTitle}>
              <Calendar size={18} style={{ color: '#2563eb' }} />
              Aktīvais tarifu periods
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Izvēlieties mēnesi, kuram apskatīt vai definēt tarifus
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="month" 
              value={tariffPeriod} 
              onChange={(e) => setTariffPeriod(e.target.value)} 
              style={{ ...styles.input, width: 'auto', fontWeight: '600' }} 
            />
          </div>
        </div>
      </div>

      {/* 2. TARIFFS LIST & TABLE */}
      <div style={styles.card}>
        {/* Header with Title and "Select All" Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={styles.cardTitle}>
                <Receipt size={18} style={{ color: '#2563eb' }} />
                Mēneša tarifi ({tariffPeriod})
              </h2>
              <span style={{ fontSize: '12px', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                {currentTariffs.length} {currentTariffs.length === 1 ? 'tarifs' : 'tarifi'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {selectedCount > 0 
                ? `Iezīmēti ${selectedCount} no ${currentTariffs.length} tarifiem kopēšanai`
                : 'Iezīmējiet tarifus, lai kopētu uz citu periodu'}
            </p>
          </div>

          {/* Direct "Iezīmēt visus" and "Noņemt" Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              style={{
                ...styles.btnSecondary,
                background: allCurrentSelected ? '#eff6ff' : '#ffffff',
                borderColor: allCurrentSelected ? '#3b82f6' : '#cbd5e1',
                color: allCurrentSelected ? '#1d4ed8' : '#0f172a'
              }}
              title="Iezīmēt vai noņemt visus tarifus šajā periodā"
            >
              {allCurrentSelected ? <CheckSquare size={15} style={{ color: '#2563eb' }} /> : <Square size={15} />}
              <span style={{ fontWeight: '600' }}>
                {allCurrentSelected ? 'Noņemt visus' : 'Iezīmēt visus tarifus'}
              </span>
            </button>

            {selectedCount > 0 && !allCurrentSelected && (
              <button
                type="button"
                onClick={handleDeselectAllExplicit}
                style={{
                  ...styles.btnSecondary,
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  background: '#fef2f2'
                }}
                title="Notīrīt atlasi"
              >
                <X size={14} />
                <span>Notīrīt ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                {/* Working Checkbox in Table Header */}
                <th style={{ padding: '12px 14px', width: '44px', textAlign: 'center' }}>
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allCurrentSelected}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    title={allCurrentSelected ? 'Noņemt visus tarifus' : 'Iezīmēt visus tarifus'}
                    aria-label="Iezīmēt visus tarifus"
                  />
                </th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px' }}>Nosaukums</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px' }}>Tips</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'right' }}>Summa</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'right' }}>Cena par m²</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'right' }}>Platība</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'center' }}>PVN</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'right' }}>Kopā ar PVN</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px' }}>Izslēgtie</th>
                <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600', fontSize: '12.5px', textAlign: 'right' }}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {currentTariffs.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    Šim mēnesim ({tariffPeriod}) nav ievadītu tarifu. Pievienojiet jaunu zemāk vai kopējiet no cita mēneša.
                  </td>
                </tr>
              ) : (
                currentTariffs.map(t => {
                  const isChecked = !!selectedTariffsToCopy[String(t.id)];
                  const excludedIds = Array.isArray(t.excluded_apartments) 
                    ? t.excluded_apartments 
                    : JSON.parse(t.excluded_apartments || '[]');
                  const area = getTargetArea(t.target_type || 'all', excludedIds);
                  const pricePerM2 = area > 0 ? (parseFloat(t.total_amount) / area) : 0;
                  const totalWithVat = parseFloat(t.total_amount) * (1 + (parseFloat(t.vat_rate) || 0) / 100);
                  const typeLabel = t.is_per_m2
                    ? 'Cena par m²'
                    : t.is_fixed_amount
                      ? `Fiksēta (€${(parseFloat(t.price_per_unit) || 0).toFixed(2)}/dz.)`
                      : t.is_discount
                        ? 'Atlaide'
                        : 'Pēc platības';

                  return (
                    <tr 
                      key={t.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f0f9ff' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedTariffsToCopy(prev => ({ ...prev, [String(t.id)]: !prev[String(t.id)] }))}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          aria-label={`Atlasīt tarifu ${t.name}`}
                        />
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>{t.name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px' }}>{typeLabel}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        €{parseFloat(t.total_amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        €{pricePerM2.toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {area.toFixed(2)} m²
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>{t.vat_rate}%</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        €{totalWithVat.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#ef4444', fontSize: '12px' }}>
                        {excludedIds.length > 0 
                          ? excludedIds.map(id => apartments.find(a => a.id === id)?.number).filter(Boolean).join(', ')
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button 
                            type="button"
                            onClick={() => startEditTariff(t)} 
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', padding: '6px 8px', color: '#334155' }}
                            title="Labot tarifu"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => deleteTariff(t.id)} 
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', padding: '6px 8px', color: '#dc2626' }}
                            title="Dzēst tarifu"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. COPY SELECTED TARIFFS TO ANOTHER MONTH */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h2 style={styles.cardTitle}>
            <Copy size={18} style={{ color: '#16a34a' }} />
            Kopēt atlasītos tarifus uz citu mēnesi
          </h2>
          {selectedCount > 0 && (
            <span style={{ fontSize: '12px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600' }}>
              Atlasīti {selectedCount}
            </span>
          )}
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
          Iezīmējiet tarifus tabulā augstāk, norādiet mērķa mēnesi un nokopējiet ar vienu klikšķi.
        </p>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
              Mērķa mēnesis (uz kuru kopēt):
            </label>
            <input
              type="month"
              value={copySourceMonth || ''}
              onChange={(e) => setCopySourceMonth(e.target.value)}
              style={styles.input}
            />
          </div>

          <button
            type="button"
            onClick={() => copySelectedTariffs(tariffs, tariffPeriod, copySourceMonth)}
            style={{ 
              ...styles.btn, 
              background: '#16a34a',
              opacity: (!copySourceMonth || selectedCount === 0) ? 0.6 : 1,
              cursor: (!copySourceMonth || selectedCount === 0) ? 'not-allowed' : 'pointer'
            }}
            disabled={!copySourceMonth || selectedCount === 0}
          >
            <Copy size={15} />
            <span>Kopēt {selectedCount > 0 ? `(${selectedCount})` : ''} uz {copySourceMonth || 'mēnesi'}</span>
          </button>
        </div>

        {selectedCount === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f59e0b', marginTop: '12px' }}>
            <AlertCircle size={14} />
            <span>Lūdzu, atzīmējiet vismaz vienu tarifu tabulā augstāk (vai nospiediet pogu "Iezīmēt visus tarifus").</span>
          </div>
        )}
      </div>

      {/* 4. ADD / EDIT TARIFF FORM */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={styles.cardTitle}>
            {editingTariff ? <Edit2 size={18} style={{ color: '#2563eb' }} /> : <Plus size={18} style={{ color: '#2563eb' }} />}
            {editingTariff ? 'Labot tarifu' : 'Pievienot jaunu tarifu'}
          </h2>
        </div>

        <form onSubmit={editingTariff ? (e) => { e.preventDefault(); saveEditTariff(editingTariff); } : addTariff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Tarifa nosaukums
              </label>
              <input 
                type="text" 
                placeholder="Piem. Apsaimniekošana" 
                value={currentForm.name || ''} 
                onChange={(e) => editingTariff ? setEditForm({...editForm, name: e.target.value}) : setTariffForm({...tariffForm, name: e.target.value})} 
                style={styles.input} 
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                PVN likme %
              </label>
              <input 
                type="number" 
                placeholder="21" 
                value={currentForm.vat_rate !== undefined ? currentForm.vat_rate : 21} 
                onChange={(e) => editingTariff ? setEditForm({...editForm, vat_rate: e.target.value}) : setTariffForm({...tariffForm, vat_rate: e.target.value})} 
                style={styles.input} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Aprēķina tips
              </label>
              <select
                value={calcType}
                onChange={(e) => handleCalcTypeChange(e.target.value)}
                style={styles.input}
              >
                <option value="area">Kopējā summa (sadalīta pēc platības)</option>
                <option value="per_m2">Cena par m²</option>
                <option value="fixed_amount">Fiksēta summa katram dzīvoklim</option>
                <option value="discount">Atlaide</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>
                {amountLabel}
              </label>
              <input 
                type="number" 
                step="0.0001" 
                placeholder={calcType === 'area' ? "0.00" : "0.0000"} 
                value={amountValue || ''} 
                onChange={(e) => handleAmountChange(e.target.value)} 
                style={{ ...styles.input, fontVariantNumeric: 'tabular-nums' }} 
                required
              />
            </div>
          </div>

          {/* Dzīvokļu atlase ar "Iezīmēt visus" pogām */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                {calcType === 'discount'
                  ? '🎯 Dzīvokļi, kuriem piemērot atlaidi'
                  : '🚫 Izslēgtie dzīvokļi (šī pozīcija viņiem netiks rēķināta)'}
              </label>

              {/* Quick exclusion actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAllApartmentsExclusion(!!editingTariff)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0 }}
                >
                  Iezīmēt visus dzīvokļus
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={() => handleClearApartmentsExclusion(!!editingTariff)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: 0 }}
                >
                  Notīrīt visus
                </button>
              </div>
            </div>

            <div style={styles.grid}>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => {
                const isExcluded = (currentForm.excluded_apartments || []).includes(apt.id);
                return (
                  <label 
                    key={apt.id} 
                    style={{
                      ...styles.checkboxItem,
                      borderColor: isExcluded ? '#3b82f6' : '#e2e8f0',
                      background: isExcluded ? '#eff6ff' : '#ffffff'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isExcluded} 
                      onChange={() => handleExclusionChange(apt.id, !!editingTariff)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: isExcluded ? '600' : 'normal' }}>Dz. {apt.number}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button type="submit" style={styles.btn}>
              <Check size={16} />
              <span>{editingTariff ? 'Saglabāt izmaiņas' : 'Pievienot tarifu'}</span>
            </button>
            {editingTariff && (
              <button 
                type="button" 
                onClick={() => setEditingTariff(null)} 
                style={{ ...styles.btn, background: '#64748b' }}
              >
                <X size={16} />
                <span>Atcelt</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}