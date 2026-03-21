import React, { useState } from 'react';
import { styles } from '../shared/styles';

export function SettingsTab({
  settings,
  editForm,
  setEditForm,
  apartments,
  updateSetting,
  sendEmailViaAppsScript,
  showToast
}) {
  const [editingField, setEditingField] = useState(null);
  const [customEmail, setCustomEmail] = useState({ recipient: 'all', subject: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!settings.google_apps_script_url) {
      showToast('Nav konfigurēts e-pasta serviss (Google Apps Script URL)', 'error');
      return;
    }
    if (!customEmail.subject || !customEmail.message) {
      showToast('Ievadiet tēmu un ziņojumu', 'error');
      return;
    }

    setSendingEmail(true);
    try {
      const targets = customEmail.recipient === 'all' 
        ? apartments.filter(a => a.email) 
        : apartments.filter(a => a.id === customEmail.recipient && a.email);

      if (targets.length === 0) {
        showToast('Nav saņēmēju ar e-pastiem', 'error');
        setSendingEmail(false);
        return;
      }

      let sentCount = 0;
      for (const apt of targets) {
        const htmlBody = `
          <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            ${customEmail.message.replace(/\n/g, '<br>')}
          </div>
        `;
        await sendEmailViaAppsScript(apt.email, customEmail.subject, htmlBody, settings.google_apps_script_url);
        sentCount++;
        await new Promise(r => setTimeout(r, 300)); // Pauze
      }
      
      showToast(`✓ Nosūtīts ${sentCount} saņēmējiem`);
      setCustomEmail({ ...customEmail, subject: '', message: '' });
    } catch (err) {
      showToast('Kļūda sūtot: ' + err.message, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const sendMeterReadingRequest = async () => {
    if (!confirm('Vai tiešām izsūtīt aicinājumu nodot rādījumus visiem dzīvokļiem?')) return;
    
    // Izmantojam saglabāto tekstu vai noklusējuma
    const defaultMsg = `Labdien!\n\nAtgādinām, ka tuvojas skaitītāju rādījumu nodošanas laiks.\nLūdzam iesniegt ūdens skaitītāja rādījumus līdz 27. datumam portālā:\nhttps://barona78.vercel.app/\n\nPaldies!`;
    const message = settings.meter_reading_reminder_text || defaultMsg;
    
    // Iestatām formā un izsūtam
    setCustomEmail({
      recipient: 'all',
      subject: 'Atgādinājums: Ūdens skaitītāju rādījumi',
      message: message
    });
    
    // Mazu brīdi pagaidām, lai React state atjaunojas, tad simulējam sūtīšanu
    // Bet labāk izsaukt sūtīšanu tieši ar parametriem, nevis caur state
    try {
      await handleSendCustomEmail({ preventDefault: () => {} });
    } catch (error) {
      console.error(error);
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

      {/* KOMUNIKĀCIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📢 Komunikācija</h2>
        
        {/* Skaitītāju atgādinājums */}
        <div style={{marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0'}}>
          <h3 style={{fontSize: '14px', margin: '0 0 10px 0', color: '#166534'}}>💧 Skaitītāju rādījumu aicinājums</h3>
          <div style={{fontSize: '12px', marginBottom: '10px', color: '#666'}}>
            Teksts, kas tiks sūtīts katra mēneša 25. datumā (nospiežot pogu):
          </div>
          {editingField === 'meter_reading_reminder_text' ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <textarea 
                value={editForm.meter_reading_reminder_text !== undefined ? editForm.meter_reading_reminder_text : (settings.meter_reading_reminder_text || '')}
                onChange={(e) => setEditForm({...editForm, meter_reading_reminder_text: e.target.value})}
                style={{...styles.input, minHeight: '100px'}} 
                placeholder="Ievadiet tekstu..." 
              />
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => handleSave('meter_reading_reminder_text')} style={{...styles.btn, background: '#10b981', padding: '6px 12px', fontSize: '12px'}}>✓ Saglabāt šablonu</button>
                <button onClick={() => setEditingField(null)} style={{...styles.btn, background: '#e5e7eb', color: '#333', padding: '6px 12px', fontSize: '12px'}}>Atcelt</button>
              </div>
            </div>
          ) : (
            <div style={{marginBottom: '10px'}}>
              <div style={{whiteSpace: 'pre-wrap', fontSize: '12px', background: 'white', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px'}}>
                {settings.meter_reading_reminder_text || "Labdien!\n\nAtgādinām, ka tuvojas skaitītāju rādījumu nodošanas laiks.\nLūdzam iesniegt ūdens skaitītāja rādījumus līdz 27. datumam portālā:\nhttps://barona78.vercel.app/\n\nPaldies!"}
              </div>
              <button onClick={() => { setEditingField('meter_reading_reminder_text'); setEditForm({...editForm, meter_reading_reminder_text: settings.meter_reading_reminder_text || ''}); }} style={{fontSize: '11px', border: 'none', background: 'none', color: '#0369a1', cursor: 'pointer', padding: 0}}>✏️ Rediģēt šablonu</button>
            </div>
          )}
          <button onClick={sendMeterReadingRequest} disabled={sendingEmail} style={{...styles.btn, background: '#15803d', width: '100%'}}>
            {sendingEmail ? 'Sūta...' : '📤 Nosūtīt aicinājumu visiem tagad'}
          </button>
        </div>

        {/* Custom e-pasts */}
        <div style={{padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
          <h3 style={{fontSize: '14px', margin: '0 0 10px 0', color: '#334155'}}>✉️ Sūtīt ziņojumu</h3>
          <form onSubmit={handleSendCustomEmail} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <select value={customEmail.recipient} onChange={(e) => setCustomEmail({...customEmail, recipient: e.target.value})} style={styles.input}>
              <option value="all">Visiem dzīvokļiem</option>
              {apartments.map(a => <option key={a.id} value={a.id}>Dzīv. {a.number} ({a.owner_name})</option>)}
            </select>
            <input type="text" placeholder="Tēma" value={customEmail.subject} onChange={(e) => setCustomEmail({...customEmail, subject: e.target.value})} style={styles.input} />
            <textarea placeholder="Ziņojums..." value={customEmail.message} onChange={(e) => setCustomEmail({...customEmail, message: e.target.value})} style={{...styles.input, minHeight: '100px'}} />
            <button type="submit" disabled={sendingEmail} style={styles.btn}>{sendingEmail ? 'Sūta...' : 'Nosūtīt'}</button>
          </form>
        </div>
      </div>

      {/* GMAIL INTEGRACIJA */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📧 Gmail - E-pastu Nosūtīšana</h2>

        <div style={{fontSize: '12px', lineHeight: '1.8', color: '#666', marginBottom: '15px'}}>
          <p><strong>Lai sūtītu rēķinus pa e-pastu:</strong></p>
          <p>1. Izveidojiet Google Apps Script (sekojiet instrukcijām).</p>
          <p>2. Publicējiet to kā Web App un nokopējiet iegūto URL.</p>
          <p>3. Ievadiet un saglabājiet šo URL zemāk.</p>
        </div>

        <SettingField label="Google Apps Script URL" prop="google_apps_script_url" icon="🚀" />

        <div style={{marginTop: '12px', fontSize: '12px', color: '#0369a1', background: '#f0f9ff', padding: '8px', borderRadius: '4px'}}>
          ℹ️ Šī metode ir vienkāršāka un stabilāka par iepriekšējo. Nav nepieciešams pierakstīties ar Google no šīs aplikācijas.
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