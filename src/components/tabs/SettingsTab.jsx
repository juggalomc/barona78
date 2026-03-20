import React, { useState } from 'react';
import { styles } from '../shared/styles';

export function SettingsTab({
  settings,
  editForm,
  setEditForm,
  updateSetting,
  showToast
}) {
  const [editingField, setEditingField] = useState(null);

  const handleSave = async (key) => {
    const value = editForm[key];
    if (!value || value.trim() === '') {
      showToast('Lauks nedrīkst būt tukšs', 'error');
      return;
    }

    const success = await updateSetting(key, value);
    if (success) {
      setEditingField(null);
      showToast('✓ Iestatījums saglabāts');
    } else {
      showToast('Kļūda saglabājot', 'error');
    }
  };

  const SettingField = ({ label, key, icon }) => (
    <div style={{...styles.listItem, marginBottom: '12px'}}>
      <div style={{flex: 1}}>
        <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '4px'}}>
          {icon} {label}
        </div>
        {editingField === key ? (
          <div style={{display: 'flex', gap: '8px'}}>
            <input
              type="text"
              value={editForm[key] || ''}
              onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
              style={{...styles.input, flex: 1}}
            />
            <button
              onClick={() => handleSave(key)}
              style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
            >
              ✓
            </button>
            <button
              onClick={() => setEditingField(null)}
              style={{padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
            >
              ✕
            </button>
          </div>
        ) : (
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontSize: '13px', color: '#666', wordBreak: 'break-word'}}>{settings[key]}</div>
            <button
              onClick={() => setEditingField(key)}
              style={{padding: '6px 12px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0369a1'}}
            >
              ✏️ Rediģēt
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* ĒKAS INFORMĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🏢 Ēkas Informācija</h2>
        <SettingField label="Ēkas Nosaukums" key="building_name" icon="🏠" />
        <SettingField label="Reģistrācijas Kods" key="building_code" icon="📋" />
        <SettingField label="Adrese" key="building_address" icon="📍" />
      </div>

      {/* MAKSĀJUMA INFORMĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💳 Maksājuma Informācija</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Šī informācija tiks parādīta rēķinu apakšā</strong>
        </div>
        <SettingField label="IBAN" key="payment_iban" icon="🏦" />
        <SettingField label="Banka" key="payment_bank" icon="🏛️" />
        <SettingField label="E-pasts" key="payment_email" icon="📧" />
        <SettingField label="Tālrunis" key="payment_phone" icon="☎️" />
      </div>

      {/* PĀRBAUDE */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>✓ Pārbaude</h2>
        <div style={{fontSize: '12px', lineHeight: '1.8', color: '#666'}}>
          <p><strong>✓ Ēkas informācija:</strong> Tiks rādīta rēķinu augšdaļā</p>
          <p><strong>✓ Maksājuma informācija:</strong> Tiks rādīta rēķinu apakšā</p>
          <p><strong>✓ Automātiski:</strong> Visi nākotnē ģenerētie rēķini izmantos jaunos iestatījumus</p>
        </div>
      </div>
    </div>
  );
}
