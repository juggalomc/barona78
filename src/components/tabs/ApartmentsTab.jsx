import React, { useState } from 'react';
import { styles } from '../shared/styles';

// Palīgfunkcija JSON parsēšanai vai string apstrādei
const parseEmails = (jsonOrString) => {
  if (!jsonOrString) return [];
  try {
    if (jsonOrString.trim().startsWith('[')) {
      const parsed = JSON.parse(jsonOrString);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  // Atpakaļsaderība: ja ir vienkāršs strings, uzskatām to par galveno e-pastu ar visām tiesībām
  return jsonOrString ? [{ email: jsonOrString, invoice: true, water: true }] : [];
};

function EmailManager({ value, onChange, styles }) {
  const [newEmail, setNewEmail] = useState('');
  const emails = parseEmails(value);

  const updateList = (newList) => {
    if (newList.length === 0) {
      onChange('');
      return;
    }
    onChange(JSON.stringify(newList));
  };

  const add = (e) => {
    e.preventDefault();
    if(!newEmail || !newEmail.includes('@')) return; 
    updateList([...emails, { email: newEmail, invoice: true, water: true }]);
    setNewEmail('');
  };

  const remove = (index) => {
    const newList = [...emails];
    newList.splice(index, 1);
    updateList(newList);
  };

  const update = (index, field, val) => {
    const newList = [...emails];
    newList[index][field] = val;
    updateList(newList);
  };

  return (
    <div style={{border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', background: '#f8fafc', marginBottom: '10px'}}>
       <div style={{fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px'}}>E-pasti un paziņojumi (R-rēķini, Ū-ūdens):</div>
       {emails.length === 0 && <div style={{fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '5px'}}>Nav pievienotu e-pastu</div>}
       {emails.map((item, idx) => (
         <div key={idx} style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'5px'}}>
           <input type="text" value={item.email} onChange={(e)=>update(idx,'email',e.target.value)} style={{...styles.input, fontSize:'12px', padding:'4px', flex:1}} placeholder="E-pasts" />
           <div style={{display:'flex', alignItems:'center', gap:'2px', background:'#e2e8f0', padding:'2px 5px', borderRadius:'4px'}} title="Saņemt rēķinus"><input type="checkbox" checked={item.invoice !== false} onChange={(e)=>update(idx,'invoice',e.target.checked)} style={{margin:0, cursor:'pointer'}} /><span style={{fontSize:'10px', fontWeight:'bold'}}>R</span></div>
           <div style={{display:'flex', alignItems:'center', gap:'2px', background:'#e2e8f0', padding:'2px 5px', borderRadius:'4px'}} title="Saņemt ūdens paziņojumus"><input type="checkbox" checked={item.water !== false} onChange={(e)=>update(idx,'water',e.target.checked)} style={{margin:0, cursor:'pointer'}} /><span style={{fontSize:'10px', fontWeight:'bold'}}>Ū</span></div>
           <button onClick={(e) => { e.preventDefault(); remove(idx); }} style={{color:'#ef4444', border:'none', background:'none', cursor:'pointer', fontWeight:'bold', padding:'0 5px'}}>✕</button>
         </div>
       ))}
       <div style={{display:'flex', gap:'5px', marginTop: '5px'}}><input type="email" placeholder="Pievienot e-pastu..." value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') add(e); }} style={{...styles.input, fontSize:'12px', padding:'4px', flex:1}} /><button onClick={add} style={{...styles.btnSmall, background:'#10b981', color:'white', border:'none', padding:'4px 10px'}}>➕</button></div>
    </div>
  );
}

export function ApartmentsTab({
  apartments,
  invoices,
  apartmentForm, setApartmentForm,
  editingApartment, setEditingApartment,
  editApartmentForm, setEditApartmentForm,
  addApartment,
  startEditApartment,
  saveEditApartment,
  deleteApartment
}) {
  return (
    <div style={styles.twoCol}>
      {/* PIEVIENOT DZĪVOKLI */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>➕ Pievienot dzīvokli</h2>
        <form onSubmit={addApartment} style={styles.form}>
          <div style={styles.formRow}>
            <input type="text" placeholder="Numurs *" value={apartmentForm.number} onChange={(e) => setApartmentForm({...apartmentForm, number: e.target.value})} style={styles.input} />
            <input type="number" step="0.01" placeholder="Platība (m²) *" value={apartmentForm.area} onChange={(e) => setApartmentForm({...apartmentForm, area: e.target.value})} style={styles.input} />
          </div>
          <input type="text" placeholder="Vārds *" value={apartmentForm.owner_name} onChange={(e) => setApartmentForm({...apartmentForm, owner_name: e.target.value})} style={styles.input} />
          <div style={styles.formRow}>
            <input type="text" placeholder="Uzvārds" value={apartmentForm.owner_surname} onChange={(e) => setApartmentForm({...apartmentForm, owner_surname: e.target.value})} style={styles.input} />
            <input type="text" placeholder="Personas kods" value={apartmentForm.personal_code} onChange={(e) => setApartmentForm({...apartmentForm, personal_code: e.target.value})} style={styles.input} />
          </div>
          <div style={styles.formRow}>
            <div style={{flex: 1}}><EmailManager value={apartmentForm.email} onChange={(val) => setApartmentForm({...apartmentForm, email: val})} styles={styles} /></div>
            <input type="tel" placeholder="Telefons" value={apartmentForm.phone} onChange={(e) => setApartmentForm({...apartmentForm, phone: e.target.value})} style={styles.input} />
          </div>
          <div style={styles.formRow}>
            <input type="number" placeholder="Deklarēto personu skaits" min="0" value={apartmentForm.declared_persons} onChange={(e) => setApartmentForm({...apartmentForm, declared_persons: e.target.value})} style={styles.input} />
            <select
              value={String(apartmentForm.is_residential !== false)}
              onChange={(e) => setApartmentForm({...apartmentForm, is_residential: e.target.value === 'true'})}
              style={styles.input}
            >
              <option value="true">🏠 Dzīvojamā telpa</option>
              <option value="false">🏢 Nedzīvojamā telpa</option>
            </select>
          </div>
          <input type="text" placeholder="Reģistrācijas numurs" value={apartmentForm.registration_number} onChange={(e) => setApartmentForm({...apartmentForm, registration_number: e.target.value})} style={styles.input} />
          <input type="text" placeholder="Dzīvokļa adrese" value={apartmentForm.apartment_address} onChange={(e) => setApartmentForm({...apartmentForm, apartment_address: e.target.value})} style={styles.input} />
          <button type="submit" style={styles.btn}>Pievienot</button>
        </form>
      </div>

      {/* DZĪVOKĻU SARAKSTS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📋 Dzīvokļi ({apartments.length})</h2>
        <div style={styles.list}>
          {apartments.map(apt => (
            <div key={apt.id} style={styles.listItem}>
              {editingApartment === apt.id ? (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <input type="text" value={editApartmentForm.number} onChange={(e) => setEditApartmentForm({...editApartmentForm, number: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <input type="number" step="0.01" value={editApartmentForm.area} onChange={(e) => setEditApartmentForm({...editApartmentForm, area: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <input type="text" value={editApartmentForm.owner_name} onChange={(e) => setEditApartmentForm({...editApartmentForm, owner_name: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <EmailManager value={editApartmentForm.email || ''} onChange={(val) => setEditApartmentForm({...editApartmentForm, email: val})} styles={styles} />
                  <input type="number" placeholder="Deklarēto personu skaits" min="0" value={editApartmentForm.declared_persons} onChange={(e) => setEditApartmentForm({...editApartmentForm, declared_persons: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <select
                    value={String(editApartmentForm.is_residential !== false)}
                    onChange={(e) => setEditApartmentForm({...editApartmentForm, is_residential: e.target.value === 'true'})}
                    style={{...styles.input, fontSize: '12px'}}
                  >
                    <option value="true">🏠 Dzīvojamā telpa</option>
                    <option value="false">🏢 Nedzīvojamā telpa</option>
                  </select>
                  <input type="text" placeholder="Reģistrācijas numurs" value={editApartmentForm.registration_number || ''} onChange={(e) => setEditApartmentForm({...editApartmentForm, registration_number: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <input type="text" placeholder="Dzīvokļa adrese" value={editApartmentForm.apartment_address || ''} onChange={(e) => setEditApartmentForm({...editApartmentForm, apartment_address: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button onClick={() => saveEditApartment(apt.id)} style={{...styles.btn, fontSize: '11px', padding: '6px 12px', flex: 1}}>✓ Saglabāt</button>
                    <button onClick={() => setEditingApartment(null)} style={{background: '#e5e7eb', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flex: 1}}>Atcelt</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                    <div style={{fontSize: '13px', color: '#666'}}>
                      {apt.is_residential === false ? '🏢' : '🏠'} • 📐 {apt.area} m² • 👤 {apt.declared_persons || 0} • {apt.owner_name}
                    </div>
                    {apt.email && (
                      <div style={{fontSize: '12px', color: '#3b82f6', marginTop: '2px'}}>
                        {apt.email.trim().startsWith('[') ? (
                          parseEmails(apt.email).map((e,i) => <div key={i}>📧 {e.email} <span style={{fontSize:'10px', color:'#64748b'}}>({e.invoice?'R':''}{e.water?'Ū':''})</span></div>)
                        ) : (
                          <div>📧 {apt.email}</div>
                        )}
                      </div>
                    )}
                    {(() => {
                      const aptInvoices = invoices.filter(inv => inv.apartment_id === apt.id && !inv.paid);
                      if (aptInvoices.length > 0) {
                        const latest = aptInvoices.reduce((prev, curr) => prev.period > curr.period ? prev : curr);
                        return (
                          <div style={{fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500'}}>
                            ⚠️ Parāds: €{latest.amount.toFixed(2)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div style={{display: 'flex', gap: '4px'}}>
                    <button onClick={() => startEditApartment(apt)} style={{...styles.btnSmall, padding: '4px 8px'}} title="Rediģēt">✏️</button>
                    <button onClick={() => deleteApartment(apt.id)} style={styles.btnSmall}>🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}