import React from 'react';
import { styles } from '../shared/styles';

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
            <input type="email" placeholder="E-pasts" value={apartmentForm.email} onChange={(e) => setApartmentForm({...apartmentForm, email: e.target.value})} style={styles.input} />
            <input type="tel" placeholder="Telefons" value={apartmentForm.phone} onChange={(e) => setApartmentForm({...apartmentForm, phone: e.target.value})} style={styles.input} />
          </div>
          <div style={styles.formRow}>
            <input type="number" placeholder="Deklarēto personu skaits" min="1" value={apartmentForm.declared_persons} onChange={(e) => setApartmentForm({...apartmentForm, declared_persons: e.target.value})} style={styles.input} />
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
                  <input type="email" placeholder="E-pasts" value={editApartmentForm.email || ''} onChange={(e) => setEditApartmentForm({...editApartmentForm, email: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                  <input type="number" placeholder="Deklarēto personu skaits" min="1" value={editApartmentForm.declared_persons} onChange={(e) => setEditApartmentForm({...editApartmentForm, declared_persons: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
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
                    <div style={{fontSize: '13px', color: '#666'}}>📐 {apt.area} m² • 👤 {apt.declared_persons || 1} • {apt.owner_name}</div>
                    {apt.email && <div style={{fontSize: '12px', color: '#3b82f6'}}>📧 {apt.email}</div>}
                    {(() => {
                      const apartmentDebt = invoices.filter(inv => inv.apartment_id === apt.id && !inv.paid && new Date(inv.due_date) <= new Date()).reduce((sum, inv) => sum + inv.amount, 0);
                      if (apartmentDebt > 0) {
                        return <div style={{fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: '500'}}>⚠️ Parāds: €{apartmentDebt.toFixed(2)}</div>;
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