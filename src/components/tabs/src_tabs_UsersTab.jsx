import React from 'react';
import { styles } from '../shared/styles';

export function UsersTab({
  users,
  apartments,
  newUserForm, setNewUserForm,
  editingUser, setEditingUser,
  editUserForm, setEditUserForm,
  addUser,
  startEditUser,
  saveEditUser,
  deleteUser
}) {
  return (
    <div style={styles.twoCol}>
      {/* PIEVIENOT LIETOTĀJU */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>➕ Pievienot lietotāju</h2>
        <form onSubmit={addUser} style={styles.form}>
          <input type="email" placeholder="E-pasts *" value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} style={styles.input} />
          <input type="password" placeholder="Parole *" value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} style={styles.input} />
          <select value={newUserForm.apartment_id} onChange={(e) => setNewUserForm({...newUserForm, apartment_id: e.target.value})} style={styles.input}>
            <option value="">-- Izvēlieties dzīvokli --</option>
            {apartments.map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number} - {apt.owner_name}</option>))}
          </select>
          <select value={newUserForm.role} onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})} style={styles.input}>
            <option value="user">Lietotājs</option>
            <option value="admin">Administrators</option>
          </select>
          <button type="submit" style={styles.btn}>Pievienot</button>
        </form>
      </div>

      {/* LIETOTĀJU SARAKSTS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>👥 Lietotāji ({users.length})</h2>
        <div style={styles.list}>
          {users.map(user => {
            const apt = apartments.find(a => a.id === user.apartment_id);
            const isEditing = editingUser === user.id;

            return (
              <div key={user.id} style={styles.listItem}>
                {isEditing ? (
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                    <input type="password" value={editUserForm.password} onChange={(e) => setEditUserForm({...editUserForm, password: e.target.value})} style={{...styles.input, fontSize: '12px'}} />
                    <select value={editUserForm.apartment_id || ''} onChange={(e) => setEditUserForm({...editUserForm, apartment_id: e.target.value})} style={{...styles.input, fontSize: '12px'}}>
                      <option value="">-- Dzīvoklis --</option>
                      {apartments.map(apt => (<option key={apt.id} value={apt.id}>Dzīv. {apt.number} - {apt.owner_name}</option>))}
                    </select>
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})} style={{...styles.input, fontSize: '12px'}}>
                      <option value="user">Lietotājs</option>
                      <option value="admin">Administrators</option>
                    </select>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button onClick={() => saveEditUser(user.id)} style={{...styles.btn, fontSize: '11px', padding: '6px 12px', flex: 1}}>✓ Saglabāt</button>
                      <button onClick={() => setEditingUser(null)} style={{background: '#e5e7eb', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flex: 1}}>Atcelt</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div style={{fontWeight: 'bold'}}>📧 {user.email}</div>
                      <div style={{fontSize: '13px', color: '#666'}}>{apt ? `Dzīv. ${apt.number}` : 'Nav dzīvokļa'} • {user.role === 'admin' ? '👤 Administrators' : 'Lietotājs'}</div>
                    </div>
                    <div style={{display: 'flex', gap: '4px'}}>
                      <button onClick={() => startEditUser(user)} style={{...styles.btnSmall, padding: '4px 8px'}} title="Rediģēt">✏️</button>
                      <button onClick={() => deleteUser(user.id)} style={styles.btnSmall}>🗑️</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
