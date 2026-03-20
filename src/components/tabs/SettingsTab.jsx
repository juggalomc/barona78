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

  const handleSave = async (prop) => {
    const value = editForm[prop];
    if (!value || value.trim() === '') {
      showToast('Lauks nedrīkst būt tukšs', 'error');
      return;
    }

    const success = await updateSetting(prop, value);
    if (success) {
      setEditingField(null);
      showToast('✓ Iestatījums saglabāts');
    } else {
      showToast('Kļūda saglabājot', 'error');
    }
  };

  const SettingField = ({ label, prop, icon }) => (
    <div style={{marginBottom: '12px', padding: '12px 15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
      <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>
        {icon} {label}
      </div>
      {editingField === prop ? (
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <input
            type="text"
            value={editForm[prop] !== undefined ? editForm[prop] : (settings[prop] || '')}
            onChange={(e) => setEditForm({...editForm, [prop]: e.target.value})}
            style={{
              padding: '10px 12px',
              fontSize: '14px',
              border: '2px solid #0ea5e9',
              borderRadius: '4px',
              flex: 1,
              minWidth: '250px',
              fontFamily: 'inherit'
            }}
            placeholder={settings[prop] || ''}
            autoFocus
          />
          <button
            onClick={() => handleSave(prop)}
            style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap'}}
          >
            ✓
          </button>
          <button
            onClick={() => {
              setEditingField(null);
              setEditForm({...editForm, [prop]: settings[prop] || ''});
            }}
            style={{padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap'}}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <div style={{fontSize: '13px', color: '#666', wordBreak: 'break-word', flex: 1, minWidth: '150px'}}>{settings[prop] || '(tukšs)'}</div>
          <button
            onClick={() => {
              setEditingField(prop);
              setEditForm({...editForm, [prop]: settings[prop] || ''});
            }}
            style={{padding: '6px 12px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0369a1', whiteSpace: 'nowrap'}}
          >
            ✏️ Rediģēt
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ĒKAS INFORMĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🏢 Ēkas Informācija</h2>
        <SettingField label="Ēkas Nosaukums" prop="building_name" icon="🏠" />
        <SettingField label="Reģistrācijas Kods" prop="building_code" icon="📋" />
        <SettingField label="Adrese" prop="building_address" icon="📍" />
      </div>

      {/* MAKSĀJUMA INFORMĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💳 Maksājuma Rekvizīti</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Šī informācija tiks parādīta rēķinu apakšā</strong>
        </div>
        <SettingField label="IBAN" prop="payment_iban" icon="🏦" />
        <SettingField label="Banka" prop="payment_bank" icon="🏛️" />
        <SettingField label="E-pasts" prop="payment_email" icon="📧" />
        <SettingField label="Tālrunis" prop="payment_phone" icon="☎️" />
      </div>

      {/* PAPILDUS INFORMĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📝 Papildus Informācija Rēķinos</h2>
        <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
          <strong>ℹ️ Šī informācija tiks rādīta virs maksājuma rekvizītiem rēķinos</strong>
        </div>
        <div style={{marginBottom: '12px', padding: '12px 15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
          <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>📋 Papildus Teksts</div>
          {editingField === 'additional_invoice_info' ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <textarea
                value={editForm['additional_invoice_info'] !== undefined ? editForm['additional_invoice_info'] : (settings['additional_invoice_info'] || '')}
                onChange={(e) => setEditForm({...editForm, 'additional_invoice_info': e.target.value})}
                style={{
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '2px solid #0ea5e9',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  resize: 'vertical'
                }}
                placeholder="Ievadiet papildus informāciju..."
              />
              <div style={{display: 'flex', gap: '8px'}}>
                <button
                  onClick={() => handleSave('additional_invoice_info')}
                  style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}
                >
                  ✓ Saglabāt
                </button>
                <button
                  onClick={() => {
                    setEditingField(null);
                    setEditForm({...editForm, 'additional_invoice_info': settings['additional_invoice_info'] || ''});
                  }}
                  style={{padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                >
                  ✕ Atcelt
                </button>
              </div>
            </div>
          ) : (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'}}>
              <div style={{fontSize: '13px', color: '#666', wordBreak: 'break-word', flex: 1, minWidth: '150px', whiteSpace: 'pre-wrap'}}>
                {settings['additional_invoice_info'] ? settings['additional_invoice_info'] : '(tukšs)'}
              </div>
              <button
                onClick={() => {
                  setEditingField('additional_invoice_info');
                  setEditForm({...editForm, 'additional_invoice_info': settings['additional_invoice_info'] || ''});
                }}
                style={{padding: '6px 12px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0369a1', whiteSpace: 'nowrap'}}
              >
                ✏️ Rediģēt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GMAIL INTEGRACIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📧 Gmail - E-pastu Nosūtīšana</h2>
        <div style={{fontSize: '12px', lineHeight: '1.8', color: '#666', marginBottom: '15px'}}>
          <p><strong>Lai sūtītu rēķinus pa e-pastu:</strong></p>
          <p>1. Nospiediet "Pierakstīties ar Google"</p>
          <p>2. Atļaujiet piekļuvi Gmail kontam</p>
          <p>3. Rēķini tiks sūtīti uz dzīvokļu e-pasta adresēm</p>
        </div>
        <button
          onClick={() => {
            // Google OAuth flow
            const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // Jāpievienō
            const redirectUri = window.location.origin + '/oauth-callback';
            const scope = 'https://www.googleapis.com/auth/gmail.send';
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
            window.location.href = authUrl;
          }}
          style={{
            padding: '12px 24px',
            background: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          🔐 Pierakstīties ar Google
        </button>
        <div style={{marginTop: '12px', fontSize: '12px', color: '#0369a1', background: '#f0f9ff', padding: '8px', borderRadius: '4px'}}>
          ℹ️ Šobrīd nepieciešams manuāli konfigurēt Google OAuth Client ID
        </div>
      </div>

      {/* PĀRBAUDE */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>✓ Pārbaude</h2>
        <div style={{fontSize: '12px', lineHeight: '1.8', color: '#666'}}>
          <p><strong>✓ Ēkas informācija:</strong> Tiks rādīta rēķinu augšdaļā</p>
          <p><strong>✓ Maksājuma rekvizīti:</strong> Tiks rādīti rēķinu apakšā</p>
          <p><strong>✓ Papildus informācija:</strong> Tiks rādīta virs maksājuma rekvizītiem</p>
          <p><strong>✓ Automātiski:</strong> Visi nākotnē ģenerētie rēķini izmantos jaunos iestatījumus</p>
        </div>
      </div>
    </div>
  );
}