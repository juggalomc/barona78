import React from 'react';

const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  btn: {
    padding: '10px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '10px',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    background: '#f8fafc',
    marginTop: '5px'
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s'
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
  const currentTariffs = tariffs.filter(t => t.period === tariffPeriod);

  const handleExclusionChange = (aptId, isEdit = false) => {
    const form = isEdit ? editForm : tariffForm;
    const setForm = isEdit ? setEditForm : setTariffForm;
    const current = form.excluded_apartments || [];
    const updated = current.includes(aptId)
      ? current.filter(id => id !== aptId)
      : [...current, aptId];
    setForm({ ...form, excluded_apartments: updated });
  };

  const currentForm = editingTariff ? editForm : tariffForm;

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📅 Periods</h2>
        <input type="month" value={tariffPeriod} onChange={(e) => setTariffPeriod(e.target.value)} style={styles.input} />
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{editingTariff ? '✏️ Labot tarifu' : '💰 Pievienot jaunu tarifu'}</h2>
        <form onSubmit={editingTariff ? (e) => { e.preventDefault(); saveEditTariff(editingTariff); } : addTariff} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Tarifa nosaukums" value={currentForm.name} onChange={(e) => editingTariff ? setEditForm({...editForm, name: e.target.value}) : setTariffForm({...tariffForm, name: e.target.value})} style={styles.input} />
            <input type="number" placeholder="PVN likme %" value={currentForm.vat_rate} onChange={(e) => editingTariff ? setEditForm({...editForm, vat_rate: e.target.value}) : setTariffForm({...tariffForm, vat_rate: e.target.value})} style={styles.input} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'center' }}>
            <input 
              type="number" 
              step="0.0001" 
              placeholder={currentForm.is_per_m2 ? "Cena par m²" : "Kopējā summa"} 
              value={currentForm.is_per_m2 ? currentForm.price_per_m2 : currentForm.total_amount} 
              onChange={(e) => editingTariff ? (editForm.is_per_m2 ? setEditForm({...editForm, price_per_m2: e.target.value}) : setEditForm({...editForm, total_amount: e.target.value})) : (tariffForm.is_per_m2 ? setTariffForm({...tariffForm, price_per_m2: e.target.value}) : setTariffForm({...tariffForm, total_amount: e.target.value}))} 
              style={styles.input} 
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={currentForm.is_per_m2} onChange={(e) => editingTariff ? setEditForm({...editForm, is_per_m2: e.target.checked}) : setTariffForm({...tariffForm, is_per_m2: e.target.checked})} />
              Aprēķināt pēc m²
            </label>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '4px' }}>
              🚫 Izslēgtie dzīvokļi (šī pozīcija viņiem netiks rēķināta)
            </label>
            <div style={styles.grid}>
              {apartments.sort((a, b) => parseInt(a.number) - parseInt(b.number)).map(apt => (
                <label key={apt.id} style={styles.checkboxItem}>
                  <input 
                    type="checkbox" 
                    checked={(currentForm.excluded_apartments || []).includes(apt.id)} 
                    onChange={() => handleExclusionChange(apt.id, !!editingTariff)} 
                  />
                  Dz. {apt.number}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={styles.btn}>{editingTariff ? 'Saglabāt' : 'Pievienot'}</button>
            {editingTariff && <button type="button" onClick={() => setEditingTariff(null)} style={{ ...styles.btn, background: '#64748b' }}>Atcelt</button>}
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Mēneša tarifi ({tariffPeriod})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px' }}>Nosaukums</th>
                <th style={{ padding: '10px' }}>Summa</th>
                <th style={{ padding: '10px' }}>Cena par m²</th>
                <th style={{ padding: '10px' }}>Platība</th>
                <th style={{ padding: '10px' }}>PVN</th>
                <th style={{ padding: '10px' }}>Kopā ar PVN</th>
                <th style={{ padding: '10px' }}>Izslēgtie</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Darbības</th>
              </tr>
            </thead>
            <tbody>
              {currentTariffs.map(t => {
                const excludedIds = Array.isArray(t.excluded_apartments) 
                  ? t.excluded_apartments 
                  : JSON.parse(t.excluded_apartments || '[]');
                const area = getTargetArea(t.target_type || 'all', excludedIds);
                const pricePerM2 = area > 0 ? (parseFloat(t.total_amount) / area) : 0;
                const totalWithVat = parseFloat(t.total_amount) * (1 + (parseFloat(t.vat_rate) || 0) / 100);

                return (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{t.name}</td>
                  <td style={{ padding: '10px' }}>€{parseFloat(t.total_amount).toFixed(2)}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>€{pricePerM2.toFixed(4)}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{area.toFixed(2)} m²</td>
                  <td style={{ padding: '10px' }}>{t.vat_rate}%</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>€{totalWithVat.toFixed(2)}</td>
                  <td style={{ padding: '10px', color: '#ef4444', fontSize: '12px' }}>
                    {excludedIds.length > 0 
                      ? excludedIds.map(id => apartments.find(a => a.id === id)?.number).join(', ')
                      : '—'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    <button onClick={() => startEditTariff(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>✏️</button>
                    <button onClick={() => deleteTariff(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑️</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Kopēt tarifus</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="month" value={copySourceMonth || ''} onChange={(e) => setCopySourceMonth(e.target.value)} style={{ ...styles.input, flex: 1 }} />
          <button onClick={() => copySelectedTariffs(tariffs, copySourceMonth, tariffPeriod)} style={{ ...styles.btn, background: '#10b981' }} disabled={!copySourceMonth}>Kopēt uz šo mēnesi</button>
        </div>
      </div>
    </div>
  );
}