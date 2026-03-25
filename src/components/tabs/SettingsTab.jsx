import React, { useState } from 'react';
import { styles } from '../shared/styles';

// Palīgfunkcija e-pastu saņēmēju iegūšanai (dublēta no useInvoiceHandlers, lai izvairītos no importa problēmām)
const getEmailRecipients = (emailField, type) => {
  if (!emailField) return [];
  try {
    // Pārbaudām vai izskatās pēc JSON
    if (emailField.trim().startsWith('[')) {
      const contacts = JSON.parse(emailField);
      if (Array.isArray(contacts)) {
        // Ja type nav norādīts vai ir 'general', izmantojam 'invoice' kā noklusējumu (īpašnieks)
        const filterType = (!type || type === 'general') ? 'invoice' : type;
        return contacts.filter(c => c[filterType] === true).map(c => c.email);
      }
    }
  } catch (e) {
    // Ja nav JSON, izmantojam kā parastu e-pastu
  }
  return [emailField];
};

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
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, active: false });
  const [recipientType, setRecipientType] = useState('all'); // 'all', 'manual'
  const [selectedApts, setSelectedApts] = useState(new Set());

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

  // Iekšējā funkcija sūtīšanai
  const executeSending = async (targets, subject, message, notificationType = 'general') => {
    setSendingEmail(true);
    setSendingProgress({ current: 0, total: 0, active: true });
    try {
      if (!settings.google_apps_script_url) {
        throw new Error('Nav konfigurēts e-pasta serviss');
      }

      const recipientApartments = Array.isArray(targets)
        ? apartments.filter(a => targets.includes(a.id) && a.email)
        : targets === 'all'
          ? apartments.filter(a => a.email)
          : apartments.filter(a => a.id === targets && a.email);

      if (recipientApartments.length === 0) {
        showToast('Nav saņēmēju ar e-pastiem', 'error');
        setSendingEmail(false);
        setSendingProgress({ current: 0, total: 0, active: false });
        return;
      }
      setSendingProgress({ current: 0, total: recipientApartments.length, active: true });

      let sentCount = 0;
      for (const apt of recipientApartments) {
        try {
          const recipients = getEmailRecipients(apt.email, notificationType);
          if (recipients.length === 0) continue;
          
          const toAddresses = recipients.join(',');

          const htmlBody = `
            <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          `;
          await sendEmailViaAppsScript(toAddresses, subject, htmlBody, settings.google_apps_script_url);
          sentCount++;
          setSendingProgress(prev => ({ ...prev, current: prev.current + 1 }));
        } catch (itemError) {
          console.error(`Kļūda sūtot ziņojumu uz dzīv. ${apt.number}:`, itemError);
        }
        // Pauze pat kļūdas gadījumā
        await new Promise(r => setTimeout(r, 15000));
      }
      
      showToast(`✓ Nosūtīts ${sentCount} saņēmējiem`);
      return true;
    } catch (err) {
      showToast('Kļūda sūtot: ' + err.message, 'error');
      return false;
    } finally {
      setSendingEmail(false);
      setSendingProgress({ current: 0, total: 0, active: false });
    }
  };

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!customEmail.subject || !customEmail.message) {
      showToast('Ievadiet tēmu un ziņojumu', 'error');
      return;
    }

    const targets = recipientType === 'all' ? 'all' : Array.from(selectedApts);
    if (recipientType === 'manual' && targets.length === 0) {
      showToast('Lūdzu, atlasiet vismaz vienu dzīvokli', 'error');
      return;
    }

    const success = await executeSending(targets, customEmail.subject, customEmail.message, 'general');
    
    if (success) {
      setCustomEmail({ ...customEmail, subject: '', message: '' });
      setSelectedApts(new Set());
    }
  };

  const toggleAptSelection = (id) => {
    const newSelection = new Set(selectedApts);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedApts(newSelection);
  };

  const sendMeterReadingRequest = async () => {
    if (!window.confirm('Vai tiešām izsūtīt aicinājumu nodot rādījumus visiem dzīvokļiem?')) return;
    
    // Izmantojam saglabāto tekstu vai noklusējuma
    const defaultMsg = `Labdien!\n\nAtgādinām, ka tuvojas skaitītāju rādījumu nodošanas laiks.\nLūdzam iesniegt ūdens skaitītāja rādījumus līdz 27. datumam portālā:\nhttps://barona78.vercel.app/\n\nPaldies!`;
    const message = settings.meter_reading_reminder_text || defaultMsg;
    
    // Iestatām formā un izsūtam
    setCustomEmail({
      recipient: 'all',
      subject: 'Atgādinājums: Ūdens skaitītāju rādījumi',
      message: message // Update UI state too
    });
    
    // Izmantojam 'water' tipu, lai atlasītu pareizos e-pastus
    const success = await executeSending('all', 'Atgādinājums: Ūdens skaitītāju rādījumi', message, 'water');
    if (success) {
      setCustomEmail({ recipient: 'all', subject: '', message: '' });
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
      {/* SŪTĪŠANAS PROGRESS */}
      {sendingProgress.active && (
        <div style={{ ...styles.card, background: '#f0fdf4', border: '1px solid #22c55e', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', fontWeight: '700', color: '#166534' }}>
            <span>📤 Notiek sūtīšana...</span>
            <span>{sendingProgress.current} / {sendingProgress.total}</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${(sendingProgress.current / sendingProgress.total) * 100}%`, height: '100%', background: '#22c55e', transition: 'width 0.4s ease' }}></div>
          </div>
        </div>
      )}

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

      {/* LIETOTĀJU PORTĀLA IESTATĪJUMI */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🌐 Lietotāju Portāls</h2>
        <div style={{marginBottom: '12px', padding: '12px 15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
          <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>📢 Informācija zem rēķiniem</div>
          <div style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>Šis teksts parādīsies lietotājiem portālā uzreiz zem rēķinu saraksta.</div>
          {editingField === 'user_portal_info' ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <textarea
                value={editForm['user_portal_info'] !== undefined ? editForm['user_portal_info'] : (settings['user_portal_info'] || '')}
                onChange={(e) => setEditForm({...editForm, 'user_portal_info': e.target.value})}
                style={{
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '2px solid #0ea5e9',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Piemēram: Lūdzam pievērst uzmanību..."
              />
              <div style={{display: 'flex', gap: '8px'}}>
                <button onClick={() => handleSave('user_portal_info')} style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>✓ Saglabāt</button>
                <button onClick={() => { setEditingField(null); setEditForm({...editForm, 'user_portal_info': settings['user_portal_info'] || ''}); }} style={{padding: '8px 16px', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>✕ Atcelt</button>
              </div>
            </div>
          ) : (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap'}}>
              <div style={{fontSize: '13px', color: '#666', wordBreak: 'break-word', flex: 1, minWidth: '150px', whiteSpace: 'pre-wrap', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0'}}>
                {settings['user_portal_info'] ? settings['user_portal_info'] : '(nav informācijas)'}
              </div>
              <button onClick={() => { setEditingField('user_portal_info'); setEditForm({...editForm, 'user_portal_info': settings['user_portal_info'] || ''}); }} style={{padding: '6px 12px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', color: '#0369a1', whiteSpace: 'nowrap'}}>✏️ Rediģēt</button>
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
            <div style={{display: 'flex', gap: '15px', marginBottom: '5px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer'}}>
                <input type="radio" checked={recipientType === 'all'} onChange={() => setRecipientType('all')} /> Visiem dzīvokļiem
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer'}}>
                <input type="radio" checked={recipientType === 'manual'} onChange={() => setRecipientType('manual')} /> Atlasīt manuāli
              </label>
            </div>

            {recipientType === 'manual' && (
              <div style={{
                maxHeight: '180px', 
                overflowY: 'auto', 
                border: '1px solid #cbd5e1', 
                borderRadius: '4px', 
                padding: '10px', 
                background: 'white',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px'
              }}>
                <div style={{gridColumn: '1/-1', display: 'flex', gap: '10px', marginBottom: '5px', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                   <button type="button" onClick={() => setSelectedApts(new Set(apartments.map(a => a.id)))} style={{fontSize: '11px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer', padding: '2px 6px'}}>Izvēlēties visus</button>
                   <button type="button" onClick={() => setSelectedApts(new Set())} style={{fontSize: '11px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer', padding: '2px 6px'}}>Noņemt visus</button>
                </div>
                {apartments.sort((a,b) => parseInt(a.number) - parseInt(b.number)).map(apt => (
                  <label key={apt.id} style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '12px', 
                    cursor: 'pointer',
                    padding: '2px',
                    background: selectedApts.has(apt.id) ? '#f0f9ff' : 'transparent'
                  }}>
                    <input type="checkbox" checked={selectedApts.has(apt.id)} onChange={() => toggleAptSelection(apt.id)} /> Dzīv. {apt.number}
                  </label>
                ))}
              </div>
            )}

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
          <p><strong>Info:</strong> Sistēma atbalsta vairākus e-pastus vienam dzīvoklim. Dzīvokļa e-pasta laukā var ievadīt JSON formātā: <code>[{`{"email":"a@b.lv", "invoice":true, "water":true}`}, ...]</code>.</p>
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