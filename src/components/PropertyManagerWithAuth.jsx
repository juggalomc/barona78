/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUILDING_NAME = "BIEDRĪBA \"BARONA 78\"";
const BUILDING_CODE = "40008325768";
const BUILDING_ADDRESS = "Kr. Barona iela 78-14, Rīga, LV-1001";
const TOTAL_AREA = 1959;

// Toast Component
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  }[type];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: bgColor,
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease-out',
      fontWeight: 500
    }}>
      {message}
    </div>
  );
}

export default function PropertyManager() {
  // ===== AUTH STATE =====
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // ===== USER PORTAL STATE =====
  const [userApartment, setUserApartment] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  
  // ===== ADMIN STATE (PropertyManager) =====
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [waterConsumption, setWaterConsumption] = useState([]);
  const [waterTariffs, setWaterTariffs] = useState([]);
  const [wasteTariffs, setWasteTariffs] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  
  // Enabled meters state - tikai ūdens
  const [enabledMeters, setEnabledMeters] = useState({
    water: true
  });
  
  // ===== NEW: APARTMENT DEBTS & OVERPAYMENTS =====
  const [apartmentDebts, setApartmentDebts] = useState({}); // { apartmentId: { period: total_debt } }
  const [debtNotes, setDebtNotes] = useState({}); // { apartmentId: "Paskaidrojums" }
  const [apartmentOverpayments, setApartmentOverpayments] = useState({}); // { apartmentId: { period: amount } }
  const [globalInvoiceNote, setGlobalInvoiceNote] = useState(''); // Vispārēja informācija
  const [paymentDetails, setPaymentDetails] = useState(''); // Maksājuma informācija
  
  // Users management state
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    password: '',
    apartment_id: '',
    role: 'user'
  });
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    apartment_id: '',
    role: 'user'
  });
  
  const [apartmentForm, setApartmentForm] = useState({
    number: '',
    area: '',
    kadaster: '',
    owner_name: '',
    owner_surname: '',
    personal_code: '',
    phone: '',
    email: '',
    share: '',
    declared_persons: 1
  });

  const [tariffPeriod, setTariffPeriod] = useState('2026-01');
  const [tariffForm, setTariffForm] = useState({
    name: '',
    total_amount: '',
    vat_rate: 0,
    include_in_invoice: true
  });

  const [wasteTariffForm, setWasteTariffForm] = useState({
    period: '2026-01',
    total_amount: '',
    vat_rate: 21,
    include_in_invoice: true
  });

  const [waterTariffForm, setWaterTariffForm] = useState({
    period: '2026-01',
    price_per_m3: '',
    vat_rate: 0,
    include_in_invoice: true
  });

  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  const [invoiceGenerationMode, setInvoiceGenerationMode] = useState('update');
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [editingTariff, setEditingTariff] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingApartment, setEditingApartment] = useState(null);
  const [editApartmentForm, setEditApartmentForm] = useState({});
  const [copySourceMonth, setCopySourceMonth] = useState(null);
  const [selectedTariffsToCopy, setSelectedTariffsToCopy] = useState({});
  
  // ===== NEW: DEBT & OVERPAYMENT EDITING =====
  const [editingApartmentDebt, setEditingApartmentDebt] = useState(null);
  const [debtForm, setDebtForm] = useState({ debt_amount: '', note: '', period: '' });
  const [editingApartmentOverpayment, setEditingApartmentOverpayment] = useState(null);
  const [overpaymentForm, setOverpaymentForm] = useState({ overpayment_amount: '', period: '' });

  // ===== AUTH FUNCTIONS =====
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Aizpildiet email un paroli', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginEmail)
        .single();

      if (error || !data) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      if (data.password !== loginPassword) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      setCurrentUser(data);
      setLoginEmail('');
      setLoginPassword('');
      
      if (data.role === 'admin') {
        fetchData();
      } else {
        fetchUserData(data.apartment_id);
      }
      
      showToast('✓ Pierakstīts!');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setUserApartment(null);
    setUserInvoices([]);
    setActiveTab('overview');
    showToast('✓ Izrakstīts');
  };

  const fetchUserData = async (apartmentId) => {
    try {
      setLoading(true);
      const [aptRes, invRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').eq('id', apartmentId).single(),
        supabase.from('invoices').select('*').eq('apartment_id', apartmentId).order('period', { ascending: false }),
        supabase.from('meter_readings').select('*').eq('apartment_id', apartmentId).order('reading_date', { ascending: false })
      ]);

      setUserApartment(aptRes.data);
      setUserInvoices(invRes.data || []);
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes, wcRes, wtRes, wrRes, usersRes, mrRes, settingsRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('waste_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('users').select('*').order('email', { ascending: true }),
        supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }),
        supabase.from('settings').select('*')
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterConsumption(wcRes.data || []);
      setWaterTariffs(wtRes.data || []);
      setWasteTariffs(wrRes.data || []);
      setUsers(usersRes.data || []);
      setMeterReadings(mrRes.data || []);
      
      // Load settings
      if (settingsRes.data && settingsRes.data.length > 0) {
        const settings = settingsRes.data[0];
        setGlobalInvoiceNote(settings.global_invoice_note || '');
        setPaymentDetails(settings.payment_details || '');
      }
    } catch (error) {
      showToast('Kļūda ielādējot datus', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // ===== NEW: DEBT MANAGEMENT FUNCTIONS =====
  const addOrUpdateDebt = async (apartmentId) => {
    if (!debtForm.debt_amount || !debtForm.period) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('apartment_debts').insert([{
        apartment_id: apartmentId,
        period: debtForm.period,
        debt_amount: parseFloat(debtForm.debt_amount),
        note: debtForm.note || '',
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      
      setEditingApartmentDebt(null);
      setDebtForm({ debt_amount: '', note: '', period: '' });
      showToast('✓ Parāds pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteDebt = async (debtId) => {
    try {
      const { error } = await supabase.from('apartment_debts').delete().eq('id', debtId);
      if (error) throw error;
      showToast('✓ Parāds dzēsts');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // ===== NEW: OVERPAYMENT MANAGEMENT FUNCTIONS =====
  const addOverpayment = async (apartmentId) => {
    if (!overpaymentForm.overpayment_amount || !overpaymentForm.period) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('apartment_overpayments').insert([{
        apartment_id: apartmentId,
        period: overpaymentForm.period,
        amount: parseFloat(overpaymentForm.overpayment_amount),
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      
      setEditingApartmentOverpayment(null);
      setOverpaymentForm({ overpayment_amount: '', period: '' });
      showToast('✓ Pārmaksa pievienota');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteOverpayment = async (overpaymentId) => {
    try {
      const { error } = await supabase.from('apartment_overpayments').delete().eq('id', overpaymentId);
      if (error) throw error;
      showToast('✓ Pārmaksa dzēsta');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // ===== NEW: SETTINGS FUNCTIONS =====
  const saveSettings = async () => {
    try {
      const { error } = await supabase.from('settings').upsert([{
        id: 1,
        global_invoice_note: globalInvoiceNote,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString()
      }]);

      if (error) throw error;
      showToast('✓ Iestatījumi saglabāti');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // Calculate total debt for apartment
  const getApartmentDebt = (apartmentId, period) => {
    // Check if there's any debt before this period
    // This is simplified - you'd want to sum debts from previous periods
    return 0; // Placeholder
  };

  // ===== EXISTING FUNCTIONS CONTINUE BELOW =====

  const addApartment = async (e) => {
    e.preventDefault();
    if (!apartmentForm.number || !apartmentForm.area || !apartmentForm.owner_name) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const dataToInsert = {
        number: apartmentForm.number.trim(),
        area: parseFloat(apartmentForm.area),
        kadaster: apartmentForm.kadaster || null,
        owner_name: apartmentForm.owner_name.trim(),
        owner_surname: apartmentForm.owner_surname || null,
        personal_code: apartmentForm.personal_code || null,
        phone: apartmentForm.phone || null,
        email: apartmentForm.email || null,
        share: apartmentForm.share ? parseFloat(apartmentForm.share) : null,
        declared_persons: parseInt(apartmentForm.declared_persons) || 1
      };

      const { error } = await supabase.from('apartments').insert([dataToInsert]);
      if (error) throw error;

      setApartmentForm({
        number: '',
        area: '',
        kadaster: '',
        owner_name: '',
        owner_surname: '',
        personal_code: '',
        phone: '',
        email: '',
        share: '',
        declared_persons: 1
      });
      showToast('✓ Dzīvoklis pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const editApartment = (apartment) => {
    setEditingApartment(apartment.id);
    setEditApartmentForm({
      number: apartment.number,
      area: apartment.area,
      kadaster: apartment.kadaster,
      owner_name: apartment.owner_name,
      owner_surname: apartment.owner_surname,
      personal_code: apartment.personal_code,
      phone: apartment.phone,
      email: apartment.email,
      share: apartment.share,
      declared_persons: apartment.declared_persons
    });
  };

  const saveApartment = async () => {
    try {
      const { error } = await supabase
        .from('apartments')
        .update(editApartmentForm)
        .eq('id', editingApartment);
      if (error) throw error;
      
      setEditingApartment(null);
      setEditApartmentForm({});
      showToast('✓ Dzīvoklis atjaunināts');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteApartment = async (id) => {
    if (window.confirm('Pārliecinieties, ka vēlaties dzēst šo dzīvokli')) {
      try {
        const { error } = await supabase.from('apartments').delete().eq('id', id);
        if (error) throw error;
        showToast('✓ Dzīvoklis dzēsts');
        fetchData();
      } catch (error) {
        showToast('Kļūda: ' + error.message, 'error');
      }
    }
  };

  const addTariff = async (e) => {
    e.preventDefault();
    if (!tariffForm.name || !tariffForm.total_amount) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('tariffs').insert([{
        name: tariffForm.name.trim(),
        period: tariffPeriod,
        total_amount: parseFloat(tariffForm.total_amount),
        vat_rate: parseFloat(tariffForm.vat_rate),
        include_in_invoice: tariffForm.include_in_invoice,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setTariffForm({ name: '', total_amount: '', vat_rate: 0, include_in_invoice: true });
      showToast('✓ Tarifs pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const editTariff = (tariff) => {
    setEditingTariff(tariff.id);
    setEditForm({
      name: tariff.name,
      total_amount: tariff.total_amount,
      vat_rate: tariff.vat_rate,
      include_in_invoice: tariff.include_in_invoice
    });
  };

  const saveTariff = async () => {
    try {
      const { error } = await supabase
        .from('tariffs')
        .update(editForm)
        .eq('id', editingTariff);
      if (error) throw error;

      setEditingTariff(null);
      setEditForm({});
      showToast('✓ Tarifs atjaunināts');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteTariff = async (id) => {
    if (window.confirm('Pārliecinieties, ka vēlaties dzēst šo tarifu')) {
      try {
        const { error } = await supabase.from('tariffs').delete().eq('id', id);
        if (error) throw error;
        showToast('✓ Tarifs dzēsts');
        fetchData();
      } catch (error) {
        showToast('Kļūda: ' + error.message, 'error');
      }
    }
  };

  const addWasteTariff = async (e) => {
    e.preventDefault();
    if (!wasteTariffForm.total_amount) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('waste_tariffs').insert([{
        period: wasteTariffForm.period,
        total_amount: parseFloat(wasteTariffForm.total_amount),
        vat_rate: parseFloat(wasteTariffForm.vat_rate),
        include_in_invoice: wasteTariffForm.include_in_invoice,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setWasteTariffForm({
        period: '2026-01',
        total_amount: '',
        vat_rate: 21,
        include_in_invoice: true
      });
      showToast('✓ Atkritumu tarifs pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const addWaterTariff = async (e) => {
    e.preventDefault();
    if (!waterTariffForm.price_per_m3) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('water_tariffs').insert([{
        period: waterTariffForm.period,
        price_per_m3: parseFloat(waterTariffForm.price_per_m3),
        vat_rate: parseFloat(waterTariffForm.vat_rate),
        include_in_invoice: waterTariffForm.include_in_invoice,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setWaterTariffForm({
        period: '2026-01',
        price_per_m3: '',
        vat_rate: 0,
        include_in_invoice: true
      });
      showToast('✓ Ūdens tarifs pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.email || !newUserForm.password || !newUserForm.apartment_id) {
      showToast('Aizpildiet obligātos laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('users').insert([{
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        apartment_id: newUserForm.apartment_id,
        role: newUserForm.role,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;

      setNewUserForm({ email: '', password: '', apartment_id: '', role: 'user' });
      showToast('✓ Lietotājs pievienots');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const editUser = (user) => {
    setEditingUser(user.id);
    setEditUserForm({
      email: user.email,
      password: user.password,
      apartment_id: user.apartment_id,
      role: user.role
    });
  };

  const saveUser = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update(editUserForm)
        .eq('id', editingUser);
      if (error) throw error;

      setEditingUser(null);
      setEditUserForm({});
      showToast('✓ Lietotājs atjaunināts');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm('Pārliecinieties, ka vēlaties dzēst šo lietotāju')) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        showToast('✓ Lietotājs dzēsts');
        fetchData();
      } catch (error) {
        showToast('Kļūda: ' + error.message, 'error');
      }
    }
  };

  const addMeterReading = async (e, apartmentId) => {
    e.preventDefault();
    // Add meter reading logic here
  };

  const generateInvoices = async () => {
    if (!invoiceMonth) {
      showToast('Izvēlieties mēnesi', 'error');
      return;
    }

    try {
      setLoading(true);
      // Generate invoice logic here
      showToast('✓ Rēķini ģenerēti');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const regenerateInvoices = async (month, tariffId) => {
    try {
      setLoading(true);
      // Regenerate invoice logic here
      showToast('✓ Rēķins reģenerēts');
      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    if (window.confirm('Pārliecinieties, ka vēlaties dzēst šo rēķinu')) {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) throw error;
        showToast('✓ Rēķins dzēsts');
        fetchData();
      } catch (error) {
        showToast('Kļūda: ' + error.message, 'error');
      }
    }
  };

  const downloadPDF = async (invoice) => {
    // PDF download logic
    showToast('PDF lejupielādēšana sākas...');
  };

  // ===== RENDER =====

  if (!currentUser) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={{marginBottom: '30px', textAlign: 'center'}}>Pierakstīšanās</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Parole"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.btn}>
              Pierakstīties
            </button>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return (
      <div style={styles.app}>
        <div style={{marginLeft: '250px', flex: 1, padding: '40px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
            <div>
              <h1 style={styles.h1}>Mani rēķini</h1>
              <p style={styles.subtitle}>Dzīvoklis: {userApartment?.number}</p>
            </div>
            <button onClick={handleLogout} style={styles.btn}>Iziet</button>
          </div>

          {loading ? (
            <div style={styles.loading}>Ielāde...</div>
          ) : (
            <div>
              {userInvoices.length === 0 ? (
                <div style={{...styles.card, textAlign: 'center'}}>
                  <p>Nav rēķinu</p>
                </div>
              ) : (
                userInvoices.map(invoice => (
                  <div key={invoice.id} style={styles.invoiceCard}>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 'bold'}}>
                        {invoice.period} • {invoice.invoice_number}
                      </div>
                      <div style={{fontSize: '12px', color: '#666'}}>
                        Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                      </div>
                    </div>
                    <div style={{textAlign: 'right', marginRight: '10px'}}>
                      <div style={{fontWeight: 'bold', color: invoice.paid ? '#10b981' : '#ef4444'}}>
                        €{invoice.amount.toFixed(2)}
                      </div>
                      <div style={{fontSize: '12px', color: invoice.paid ? '#10b981' : '#ef4444'}}>
                        {invoice.paid ? 'Apmaksāts' : 'Neatmaksāts'}
                      </div>
                    </div>
                    <button onClick={() => downloadPDF(invoice)} style={{...styles.btnSmall, padding: '6px 12px'}}>
                      📥
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ===== ADMIN VIEW =====

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>PropertyMgmt</div>
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{...styles.navBtn, ...(activeTab === 'overview' ? styles.navBtnActive : {})}}
          >
            📊 Pārskats
          </button>
          <button
            onClick={() => setActiveTab('apartments')}
            style={{...styles.navBtn, ...(activeTab === 'apartments' ? styles.navBtnActive : {})}}
          >
            🏠 Dzīvokļi
          </button>
          <button
            onClick={() => setActiveTab('tariffs')}
            style={{...styles.navBtn, ...(activeTab === 'tariffs' ? styles.navBtnActive : {})}}
          >
            💰 Tarifi
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{...styles.navBtn, ...(activeTab === 'invoices' ? styles.navBtnActive : {})}}
          >
            📄 Rēķini
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            style={{...styles.navBtn, ...(activeTab === 'debts' ? styles.navBtnActive : {})}}
          >
            ⚠️ Parādi
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{...styles.navBtn, ...(activeTab === 'users' ? styles.navBtnActive : {})}}
          >
            👤 Lietotāji
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{...styles.navBtn, ...(activeTab === 'settings' ? styles.navBtnActive : {})}}
          >
            ⚙️ Iestatījumi
          </button>
          <button onClick={handleLogout} style={{...styles.navBtn, color: '#ef4444', marginTop: '20px'}}>
            🚪 Iziet
          </button>
        </nav>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>
              {activeTab === 'overview' && 'Pārskats'}
              {activeTab === 'apartments' && 'Dzīvokļu vadība'}
              {activeTab === 'tariffs' && 'Tarifu vadība'}
              {activeTab === 'invoices' && 'Rēķinu vadība'}
              {activeTab === 'debts' && 'Parādu vadība'}
              {activeTab === 'users' && 'Lietotāju vadība'}
              {activeTab === 'settings' && 'Iestatījumi'}
            </h1>
          </div>
        </div>

        {loading && <div style={styles.loading}>Ielāde...</div>}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === 'settings' && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📋 Vispārēja informācija rēķinos</h2>
              <p style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>
                Šis teksts būs redzams visos ģenerētajos rēķinos zem aprēķiniem
              </p>
              <textarea
                value={globalInvoiceNote}
                onChange={(e) => setGlobalInvoiceNote(e.target.value)}
                placeholder="Piemēram: 'Paldies par laicīgu maksājumu! Maksājuma termiņš 14 dienas.'"
                style={{...styles.input, width: '100%', minHeight: '80px', fontFamily: 'monospace'}}
              />
              <div style={{marginTop: '10px', marginBottom: '20px'}}>
                <h3 style={styles.cardTitle}>💳 Maksājuma informācija</h3>
                <p style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>
                  Šī informācija būs redzama rēķina apakšā (kontaktinformācija, rekvizīti u.tml.)
                </p>
                <textarea
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="Piemēram: 'Biedrības rekvizīti: Konta numurs: LV89UNLA..., SWIFT: UNLALV2X'"
                  style={{...styles.input, width: '100%', minHeight: '100px', fontFamily: 'monospace'}}
                />
              </div>
              <button onClick={saveSettings} style={styles.btn}>
                ✓ Saglabāt iestatījumus
              </button>
            </div>
          </div>
        )}

        {/* ===== DEBTS TAB ===== */}
        {activeTab === 'debts' && (
          <div>
            {apartments.map(apartment => (
              <div key={apartment.id} style={styles.card}>
                <h2 style={styles.cardTitle}>Dzīvoklis {apartment.number} - {apartment.owner_name}</h2>
                
                <div style={{marginBottom: '20px'}}>
                  <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '10px'}}>Pievienot parādu</h3>
                  {editingApartmentDebt === apartment.id ? (
                    <div style={styles.form}>
                      <div style={styles.formRow}>
                        <input
                          type="month"
                          value={debtForm.period}
                          onChange={(e) => setDebtForm({...debtForm, period: e.target.value})}
                          style={styles.input}
                          placeholder="Mēnesis"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={debtForm.debt_amount}
                          onChange={(e) => setDebtForm({...debtForm, debt_amount: e.target.value})}
                          style={styles.input}
                          placeholder="Parāda summa"
                        />
                      </div>
                      <textarea
                        value={debtForm.note}
                        onChange={(e) => setDebtForm({...debtForm, note: e.target.value})}
                        placeholder="Paskaidrojums (pēc nepieciešamības)"
                        style={{...styles.input, width: '100%', minHeight: '60px'}}
                      />
                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                        <button onClick={() => addOrUpdateDebt(apartment.id)} style={styles.btn}>
                          ✓ Saglabāt parādu
                        </button>
                        <button onClick={() => setEditingApartmentDebt(null)} style={{...styles.btn, background: '#999'}}>
                          Atcelt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditingApartmentDebt(apartment.id)} style={styles.btn}>
                      + Pievienot parādu
                    </button>
                  )}
                </div>

                <div>
                  <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '10px'}}>Pievienot pārmaksu</h3>
                  {editingApartmentOverpayment === apartment.id ? (
                    <div style={styles.form}>
                      <div style={styles.formRow}>
                        <input
                          type="month"
                          value={overpaymentForm.period}
                          onChange={(e) => setOverpaymentForm({...overpaymentForm, period: e.target.value})}
                          style={styles.input}
                          placeholder="Mēnesis"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={overpaymentForm.overpayment_amount}
                          onChange={(e) => setOverpaymentForm({...overpaymentForm, overpayment_amount: e.target.value})}
                          style={styles.input}
                          placeholder="Pārmaksas summa"
                        />
                      </div>
                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                        <button onClick={() => addOverpayment(apartment.id)} style={styles.btn}>
                          ✓ Saglabāt pārmaksu
                        </button>
                        <button onClick={() => setEditingApartmentOverpayment(null)} style={{...styles.btn, background: '#999'}}>
                          Atcelt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditingApartmentOverpayment(apartment.id)} style={styles.btn}>
                      + Pievienot pārmaksu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OTHER TABS CONTINUE ... */}
        {activeTab === 'apartments' && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Pievienot jaunu dzīvokli</h2>
              <form onSubmit={addApartment} style={styles.form}>
                <div style={styles.formRow}>
                  <input
                    type="text"
                    placeholder="Dzīvokļa numurs"
                    value={apartmentForm.number}
                    onChange={(e) => setApartmentForm({...apartmentForm, number: e.target.value})}
                    style={styles.input}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Platība (m²)"
                    value={apartmentForm.area}
                    onChange={(e) => setApartmentForm({...apartmentForm, area: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formRow}>
                  <input
                    type="text"
                    placeholder="Īpašnieka vārds"
                    value={apartmentForm.owner_name}
                    onChange={(e) => setApartmentForm({...apartmentForm, owner_name: e.target.value})}
                    style={styles.input}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Īpašnieka uzvārds"
                    value={apartmentForm.owner_surname}
                    onChange={(e) => setApartmentForm({...apartmentForm, owner_surname: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <button type="submit" style={styles.btn}>
                  + Pievienot dzīvokli
                </button>
              </form>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Dzīvokļu saraksts</h2>
              {apartments.length === 0 ? (
                <p>Nav dzīvokļu</p>
              ) : (
                <div style={styles.list}>
                  {apartments.map(apt => (
                    <div key={apt.id} style={styles.listItem}>
                      <div>
                        <strong>Dzīvoklis {apt.number}</strong>
                        <div style={{fontSize: '12px', color: '#666'}}>
                          {apt.owner_name} {apt.owner_surname || ''} • {apt.area}m²
                        </div>
                      </div>
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={() => editApartment(apt)} style={styles.btnSmall}>✏️</button>
                        <button onClick={() => deleteApartment(apt.id)} style={styles.btnSmall}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '400px'
  },
  sidebar: {
    width: '250px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    color: 'white',
    padding: '30px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    overflowY: 'auto'
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '40px',
    textAlign: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  navBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    padding: '12px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'left'
  },
  navBtnActive: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    borderLeft: '3px solid #3b82f6'
  },
  main: {
    marginLeft: '250px',
    flex: 1,
    padding: '40px'
  },
  header: {
    marginBottom: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  h1: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#0f172a',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#0f172a'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border 0.2s'
  },
  btn: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'transform 0.2s'
  },
  btnSmall: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px'
  },
  invoiceCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 15px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
    gap: '10px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#64748b'
  }
};
