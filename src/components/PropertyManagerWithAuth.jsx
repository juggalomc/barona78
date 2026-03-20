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
  const [invoiceGenerationMode, setInvoiceGenerationMode] = useState('update'); // 'update' vai 'separate'
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [editingTariff, setEditingTariff] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingApartment, setEditingApartment] = useState(null);
  const [editApartmentForm, setEditApartmentForm] = useState({});
  const [copySourceMonth, setCopySourceMonth] = useState(null);
  const [selectedTariffsToCopy, setSelectedTariffsToCopy] = useState({});
  
  // Parāds un pārmaksa
  const [debtNoteForm, setDebtNoteForm] = useState({ invoiceId: null, note: '' });
  const [overpaymentForm, setOverpaymentForm] = useState({ apartmentId: null, amount: '', month: '' });

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
        fetchData(); // Admin ielāde datus
      } else {
        fetchUserData(data.apartment_id); // User ielāde tikai savu datu
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
      const [aptRes, tarRes, invRes, wcRes, wtRes, wrRes, usersRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('waste_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('users').select('*').order('email', { ascending: true }),
        supabase.from('meter_readings').select('*').order('reading_date', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterConsumption(wcRes.data || []);
      setWaterTariffs(wtRes.data || []);
      setWasteTariffs(wrRes.data || []);
      setUsers(usersRes.data || []);
      setMeterReadings(mrRes.data || []);
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

  // Aprēķināt parādu no iepriekšējiem mēnešiem
  const calculatePreviousDebt = (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    
    const previousDebts = invoices.filter(inv => {
      if (inv.apartment_id !== apartmentId) return false;
      if (inv.paid) return false;
      
      const [invYear, invMonth] = inv.period.split('-').map(Number);
      
      // Jāatrodas iepriekš mūsu pašreizējā mēneša
      if (invYear < currentYear) return true;
      if (invYear === currentYear && invMonth < currentMonth) return true;
      
      return false;
    });
    
    const totalDebt = previousDebts.reduce((sum, inv) => sum + inv.amount, 0);
    return totalDebt;
  };

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
      fetchData();
      showToast('✓ Dzīvoklis pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const addTariff = async (e) => {
    e.preventDefault();
    if (!tariffForm.name || !tariffForm.total_amount) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const dataToInsert = {
        name: tariffForm.name.trim(),
        total_amount: parseFloat(tariffForm.total_amount),
        vat_rate: parseFloat(tariffForm.vat_rate) || 0,
        period: tariffPeriod,
        include_in_invoice: tariffForm.include_in_invoice
      };

      const { error } = await supabase.from('tariffs').insert([dataToInsert]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '', vat_rate: 0, include_in_invoice: true });
      fetchData();
      showToast('✓ Tarifs pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const copySelectedTariffs = async (fromPeriod, toPeriod) => {
    const selectedIds = Object.keys(selectedTariffsToCopy).filter(id => selectedTariffsToCopy[id]);
    if (selectedIds.length === 0) {
      showToast('Atlasiet vismaz vienu tarifu', 'error');
      return;
    }

    try {
      const tariffsToCopy = tariffs.filter(t => t.period === fromPeriod && selectedIds.includes(t.id));
      const newTariffs = tariffsToCopy.map(t => ({
        name: t.name,
        total_amount: t.total_amount,
        vat_rate: t.vat_rate,
        period: toPeriod
      }));

      const { error } = await supabase.from('tariffs').insert(newTariffs);
      if (error) throw error;

      setSelectedTariffsToCopy({});
      setCopySourceMonth(null);
      fetchData();
      showToast(`✓ Kopēti ${newTariffs.length} tarifi`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveDebtNote = async (invoiceId, note) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ previous_debt_note: note })
        .eq('id', invoiceId);
      
      if (error) throw error;
      fetchData();
      setDebtNoteForm({ invoiceId: null, note: '' });
      showToast('✓ Parāda paskaidrojums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveOverpayment = async (e) => {
    e.preventDefault();
    if (!overpaymentForm.apartmentId || !overpaymentForm.amount || !overpaymentForm.month) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const amount = parseFloat(overpaymentForm.amount);
      if (amount <= 0) {
        showToast('Pārmaksa jābūt lielāka par 0', 'error');
        return;
      }

      // Saglabāt pārmaksu pie dzīvokļa
      const { error } = await supabase
        .from('apartment_overpayments')
        .insert([{
          apartment_id: overpaymentForm.apartmentId,
          period: overpaymentForm.month,
          amount: amount
        }]);

      if (error) throw error;

      setOverpaymentForm({ apartmentId: null, amount: '', month: '' });
      fetchData();
      showToast('✓ Pārmaksa saglabāta');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // Aprēķināt pārmaksu nākamajam mēnesim
  const calculateOverpayment = (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    const previousMonth = currentMonth === 1 
      ? `${currentYear - 1}-12` 
      : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
    
    const overpayment = invoices.find(inv => 
      inv.apartment_id === apartmentId && 
      inv.overpayment_month === previousMonth
    )?.overpayment_amount || 0;

    return overpayment;
  };

  const regenerateInvoices = async (period, tariffId = null) => {
    if (!window.confirm('Reģenerēt rēķinus? Esošie tiks dzēsti!')) return;
    
    try {
      // Dzēst esošos rēķinus
      await supabase.from('invoices').delete().eq('period', period);

      const invoicesToAdd = [];
      let updatedCount = 0;
      const [year, month] = period.split('-');
      
      const monthNum = parseInt(month);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const dateFrom = `${year}-${month}-01`;
      const dateTo = `${year}-${month}-${daysInMonth}`;
      
      const periodTariffs = tariffs.filter(t => t.period === period && t.include_in_invoice !== false);
      const waterTariff = waterTariffs.find(w => w.period === period);
      
      if (periodTariffs.length === 0) {
        const allPeriodTariffs = tariffs.filter(t => t.period === period);
        if (allPeriodTariffs.length === 0) {
          showToast(`Nav tarifuu periodam ${period}. Pievienojiet tarifus vispirms!`, 'error');
        } else {
          showToast(`Visi tarifi periodam ${period} ir neatzīmēti. Atzīmējiet "Iekļaut rēķinā" checkbox!`, 'error');
        }
        return;
      }

      for (const apt of apartments) {
        let totalAmountWithoutVat = 0;
        let totalVatAmount = 0;
        let invoiceDetails = [];

        for (const tariff of periodTariffs) {
          const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
          const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
          const vatRate = parseFloat(tariff.vat_rate) || 0;
          const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;

          totalAmountWithoutVat += amountWithoutVat;
          totalVatAmount += vatAmount;

          invoiceDetails.push({
            tariff_id: tariff.id,
            tariff_name: tariff.name,
            amount_without_vat: amountWithoutVat,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            type: 'tariff'
          });
        }

        const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === period);

        if (waterReading && waterTariff && enabledMeters.water && waterTariff.include_in_invoice !== false) {
          const waterConsumptionM3 = parseFloat(waterReading.reading_value) || 0;
          const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
          const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
          const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
          const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += waterAmountWithoutVat;
          totalVatAmount += waterVatAmount;

          invoiceDetails.push({
            tariff_id: waterTariff.id,
            tariff_name: `Ūdens (${waterConsumptionM3} m³)`,
            consumption_m3: waterConsumptionM3,
            price_per_m3: waterPricePerM3,
            amount_without_vat: waterAmountWithoutVat,
            vat_rate: waterVatRate,
            vat_amount: waterVatAmount,
            type: 'water'
          });
        }

        const wasteTariff = wasteTariffs.find(w => w.period === period);
        if (wasteTariff && wasteTariff.include_in_invoice !== false) {
          const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
          
          if (totalDeclaredPersons > 0) {
            const declaredPersonsInApt = parseInt(apt.declared_persons) || 1;
            const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
            const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
            const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;

            totalAmountWithoutVat += wasteAmountWithoutVat;
            totalVatAmount += wasteVatAmount;

            invoiceDetails.push({
              tariff_id: wasteTariff.id,
              tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`,
              declared_persons: declaredPersonsInApt,
              total_persons: totalDeclaredPersons,
              amount_without_vat: wasteAmountWithoutVat,
              vat_rate: wasteVatRate,
              vat_amount: wasteVatAmount,
              type: 'waste'
            });
          }
        }

        // ===== PARĀDS NO IEPRIEKŠĒJIEM MĒNEŠIEM =====
        const previousDebt = calculatePreviousDebt(apt.id, period);
        if (previousDebt > 0) {
          totalAmountWithoutVat += previousDebt;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem',
            amount_without_vat: previousDebt,
            vat_rate: 0,
            vat_amount: 0,
            type: 'debt'
          });
        }

        // ===== PĀRMAKSA =====
        const overpayment = calculateOverpayment(apt.id, period);
        if (overpayment > 0) {
          totalAmountWithoutVat -= overpayment;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '💰 Pārmaksa no iepriekšējā mēneša',
            amount_without_vat: -overpayment,
            vat_rate: 0,
            vat_amount: 0,
            type: 'overpayment'
          });
        }

        if (invoiceDetails.length === 0) continue;

        const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
        
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

        invoicesToAdd.push({
          apartment_id: apt.id,
          tariff_id: periodTariffs[0]?.id,
          invoice_number: invoiceNumber,
          period: period,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0,
          due_date: dueDate,
          date_from: dateFrom,
          date_to: dateTo,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails),
          previous_debt_amount: previousDebt,
          overpayment_amount: overpayment,
          overpayment_month: period
        });
      }

      if (invoicesToAdd.length === 0 && updatedCount === 0) {
        if (periodTariffs.length === 0) {
          showToast(`Nav atzīmētu tarifū periodam ${period}. Atzīmējiet "Iekļaut rēķinā" checkbox!`, 'error');
        } else {
          showToast('Nav dzīvokļu ar atzīmētajiem tarifiem šajā mēnesī. Pievienojiet dzīvokļus!', 'error');
        }
        return;
      }

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
      if (error) throw error;

      fetchData();
      showToast(`✓ Reģenerēti ${invoicesToAdd.length} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const generateInvoices = async (e) => {
    e.preventDefault();
    if (!invoiceMonth) {
      showToast('Izvēlieties mēnesi', 'error');
      return;
    }

    const periodTariffs = tariffs.filter(t => t.period === invoiceMonth && t.include_in_invoice === true);
    
    if (periodTariffs.length === 0) {
      showToast(`Nav atzīmētu tarifū periodam ${invoiceMonth}. Pārbaudiet vai tarifi ir checked "Include in invoice"`, 'error');
      return;
    }

    try {
      const invoicesToAdd = [];
      let updatedCount = 0;
      const [year, month] = invoiceMonth.split('-');
      
      let dateFrom = invoiceFromDate;
      let dateTo = invoiceToDate;
      
      if (!dateFrom || !dateTo) {
        const monthNum = parseInt(month);
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        dateFrom = dateFrom || `${year}-${month}-01`;
        dateTo = dateTo || `${year}-${month}-${daysInMonth}`;
      }

      for (const apt of apartments) {
        
        let totalAmountWithoutVat = 0;
        let totalVatAmount = 0;
        let invoiceDetails = [];

        for (const tariff of periodTariffs) {
          const pricePerSqm = parseFloat(tariff.total_amount) / TOTAL_AREA;
          const amountWithoutVat = Math.round(pricePerSqm * parseFloat(apt.area) * 100) / 100;
          const vatRate = parseFloat(tariff.vat_rate) || 0;
          const vatAmount = Math.round(amountWithoutVat * vatRate / 100 * 100) / 100;

          totalAmountWithoutVat += amountWithoutVat;
          totalVatAmount += vatAmount;

          invoiceDetails.push({
            tariff_id: tariff.id,
            tariff_name: tariff.name,
            amount_without_vat: amountWithoutVat,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            type: 'tariff'
          });
        }

        const waterReading = meterReadings.find(mr => mr.apartment_id === apt.id && mr.meter_type === 'water' && mr.period === invoiceMonth);
        const waterTariff = waterTariffs.find(w => w.period === invoiceMonth);

        if (waterReading && waterTariff && enabledMeters.water && waterTariff.include_in_invoice !== false) {
          const waterConsumptionM3 = parseFloat(waterReading.reading_value) || 0;
          const waterPricePerM3 = parseFloat(waterTariff.price_per_m3) || 0;
          const waterAmountWithoutVat = Math.round(waterConsumptionM3 * waterPricePerM3 * 100) / 100;
          const waterVatRate = parseFloat(waterTariff.vat_rate) || 0;
          const waterVatAmount = Math.round(waterAmountWithoutVat * waterVatRate / 100 * 100) / 100;

          totalAmountWithoutVat += waterAmountWithoutVat;
          totalVatAmount += waterVatAmount;

          invoiceDetails.push({
            tariff_id: waterTariff.id,
            tariff_name: `Ūdens (${waterConsumptionM3} m³)`,
            consumption_m3: waterConsumptionM3,
            price_per_m3: waterPricePerM3,
            amount_without_vat: waterAmountWithoutVat,
            vat_rate: waterVatRate,
            vat_amount: waterVatAmount,
            type: 'water'
          });
        }

        const wasteTariff = wasteTariffs.find(w => w.period === invoiceMonth);
        if (wasteTariff && wasteTariff.include_in_invoice !== false) {
          const totalDeclaredPersons = apartments.reduce((sum, a) => sum + (parseInt(a.declared_persons) || 1), 0);
          
          if (totalDeclaredPersons > 0) {
            const declaredPersonsInApt = parseInt(apt.declared_persons) || 1;
            const wasteAmountWithoutVat = Math.round((parseFloat(wasteTariff.total_amount) / totalDeclaredPersons * declaredPersonsInApt) * 100) / 100;
            const wasteVatRate = parseFloat(wasteTariff.vat_rate) || 0;
            const wasteVatAmount = Math.round(wasteAmountWithoutVat * wasteVatRate / 100 * 100) / 100;

            totalAmountWithoutVat += wasteAmountWithoutVat;
            totalVatAmount += wasteVatAmount;

            invoiceDetails.push({
              tariff_id: wasteTariff.id,
              tariff_name: `♻️ Atkritumu izvešana (${declaredPersonsInApt} pers.)`,
              declared_persons: declaredPersonsInApt,
              total_persons: totalDeclaredPersons,
              amount_without_vat: wasteAmountWithoutVat,
              vat_rate: wasteVatRate,
              vat_amount: wasteVatAmount,
              type: 'waste'
            });
          }
        }

        // ===== PARĀDS NO IEPRIEKŠĒJIEM MĒNEŠIEM =====
        const previousDebt = calculatePreviousDebt(apt.id, invoiceMonth);
        if (previousDebt > 0) {
          totalAmountWithoutVat += previousDebt;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '⚠️ Parāds no iepriekšējiem mēnešiem',
            amount_without_vat: previousDebt,
            vat_rate: 0,
            vat_amount: 0,
            type: 'debt'
          });
        }

        // ===== PĀRMAKSA =====
        const overpayment = calculateOverpayment(apt.id, invoiceMonth);
        if (overpayment > 0) {
          totalAmountWithoutVat -= overpayment;
          invoiceDetails.push({
            tariff_id: null,
            tariff_name: '💰 Pārmaksa no iepriekšējā mēneša',
            amount_without_vat: -overpayment,
            vat_rate: 0,
            vat_amount: 0,
            type: 'overpayment'
          });
        }

        if (invoiceDetails.length === 0) continue;

        const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
        
        const now = new Date();
        const timestamp = Math.floor(Date.now() / 1000);
        const invoiceNumber = `${year}/${month}-${apt.number}-${timestamp}`;
        
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

        invoicesToAdd.push({
          apartment_id: apt.id,
          tariff_id: periodTariffs[0].id,
          invoice_number: invoiceNumber,
          period: invoiceMonth,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0,
          due_date: dueDate,
          date_from: dateFrom,
          date_to: dateTo,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails),
          previous_debt_amount: previousDebt,
          overpayment_amount: overpayment,
          overpayment_month: invoiceMonth
        });
      }

      if (invoicesToAdd.length === 0 && updatedCount === 0) {
        console.log('DEBUG: invoicesToAdd skaits:', invoicesToAdd.length, 'updatedCount:', updatedCount);
        console.log('DEBUG: apartments skaits:', apartments.length, 'periodTariffs skaits:', periodTariffs.length);
        showToast('⚠️ Nav ko ģenerēt. Pārbaudiet:\n1. Vai ir dzīvokļi?\n2. Vai tarifiem ir checked "Include in invoice"?\n3. Vai tarifiem ir pareizs periods?', 'error');
        return;
      }

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
      if (error) throw error;

      setInvoiceMonth('');
      setInvoiceFromDate('');
      setInvoiceToDate('');
      fetchData();
      const message = `✓ Ģenerēti ${invoicesToAdd.length} jauni rēķini${updatedCount > 0 ? `, atjaunināti ${updatedCount}` : ''}`;
      showToast(message);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterTariff = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(waterTariffForm.price_per_m3 || 0);
      const vatValue = parseFloat(waterTariffForm.vat_rate || 0);
      const period = waterTariffForm.period;
      const includeInvoice = waterTariffForm.include_in_invoice;

      if (isNaN(priceValue) || priceValue < 0 || priceValue > 9999.99) {
        showToast('Nepareiza cena par m³', 'error');
        return;
      }

      if (isNaN(vatValue) || vatValue < 0 || vatValue > 100) {
        showToast('PVN jābūt no 0 līdz 100%', 'error');
        return;
      }

      const { data: existing } = await supabase
        .from('water_tariffs')
        .select('*')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('water_tariffs')
          .update({
            price_per_m3: priceValue,
            vat_rate: vatValue,
            include_in_invoice: includeInvoice
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('water_tariffs')
          .insert([{
            period: period,
            price_per_m3: priceValue,
            vat_rate: vatValue,
            include_in_invoice: includeInvoice
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWasteTariff = async (e) => {
    e.preventDefault();
    try {
      const totalAmount = parseFloat(wasteTariffForm.total_amount || 0);
      const vatRate = parseFloat(wasteTariffForm.vat_rate || 0);
      const period = wasteTariffForm.period;
      const includeInvoice = wasteTariffForm.include_in_invoice;

      if (isNaN(totalAmount) || totalAmount <= 0) {
        showToast('Summa jābūt lielāka par 0', 'error');
        return;
      }

      if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
        showToast('PVN jābūt no 0 līdz 100%', 'error');
        return;
      }

      const { data: existing } = await supabase
        .from('waste_tariffs')
        .select('*')
        .eq('period', period);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('waste_tariffs')
          .update({
            total_amount: totalAmount,
            vat_rate: vatRate,
            include_in_invoice: includeInvoice
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('waste_tariffs')
          .insert([{
            period: period,
            total_amount: totalAmount,
            vat_rate: vatRate,
            include_in_invoice: includeInvoice
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Atkritumu izvešanas tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterMeterReading = async (apartmentId, readingValue, period) => {
    try {
      const value = parseFloat(readingValue);
      
      if (readingValue === '' || readingValue === null) {
        const existing = meterReadings.find(mr => mr.apartment_id === apartmentId && mr.meter_type === 'water' && mr.period === period);
        if (existing) {
          await supabase.from('meter_readings').delete().eq('id', existing.id);
          fetchData();
        }
        return;
      }

      if (isNaN(value) || value < 0) {
        showToast('Nepareiza ūdens patēriņa vērtība', 'error');
        return;
      }

      if (value > 9999.99) {
        showToast('Patēriņš nevar būt lielāks par 9999.99 m³', 'error');
        return;
      }

      const existing = meterReadings.find(mr => mr.apartment_id === apartmentId && mr.meter_type === 'water' && mr.period === period);

      if (existing) {
        const { error } = await supabase
          .from('meter_readings')
          .update({ reading_value: value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('meter_readings')
          .insert([{
            apartment_id: apartmentId,
            meter_type: 'water',
            reading_date: today,
            reading_value: value,
            period: period
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Ūdens rādījums saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterConsumption = async (apartmentId, consumption) => {
    try {
      const consumptionValue = parseFloat(consumption);
      
      if (isNaN(consumptionValue) || consumptionValue < 0) {
        showToast('Nepareiza ūdens patēriņa vērtība', 'error');
        return;
      }

      if (consumptionValue > 9999.99) {
        showToast('Patēriņš nevar būt lielāks par 9999.99 m³', 'error');
        return;
      }

      const { data: existing } = await supabase
        .from('water_consumption')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('period', tariffPeriod);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('water_consumption')
          .update({ consumption_m3: consumptionValue })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('water_consumption')
          .insert([{
            apartment_id: apartmentId,
            period: tariffPeriod,
            consumption_m3: consumptionValue
          }]);
        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const toggleInvoicePaid = async (invoiceId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ paid: !currentStatus })
        .eq('id', invoiceId);
      
      if (error) throw error;
      fetchData();
      showToast(!currentStatus ? '✓ Apmaksāts' : '✓ Neapmaksāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditApartment = (apt) => {
    setEditingApartment(apt.id);
    setEditApartmentForm({
      number: apt.number,
      area: apt.area,
      kadaster: apt.kadaster || '',
      owner_name: apt.owner_name,
      owner_surname: apt.owner_surname || '',
      personal_code: apt.personal_code || '',
      phone: apt.phone || '',
      email: apt.email || '',
      share: apt.share || '',
      declared_persons: apt.declared_persons || 1
    });
  };

  const saveEditApartment = async (id) => {
    try {
      const { error } = await supabase
        .from('apartments')
        .update({
          number: editApartmentForm.number,
          area: parseFloat(editApartmentForm.area),
          kadaster: editApartmentForm.kadaster || null,
          owner_name: editApartmentForm.owner_name,
          owner_surname: editApartmentForm.owner_surname || null,
          personal_code: editApartmentForm.personal_code || null,
          phone: editApartmentForm.phone || null,
          email: editApartmentForm.email || null,
          share: editApartmentForm.share ? parseFloat(editApartmentForm.share) : null,
          declared_persons: parseInt(editApartmentForm.declared_persons) || 1
        })
        .eq('id', id);
      
      if (error) throw error;
      setEditingApartment(null);
      fetchData();
      showToast('✓ Dzīvoklis atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteApartment = async (id) => {
    if (!window.confirm('Izdzēst dzīvokli?')) return;
    try {
      await supabase.from('invoices').delete().eq('apartment_id', id);
      await supabase.from('apartments').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditTariff = (tariff) => {
    setEditingTariff(tariff.id);
    setEditForm({
      name: tariff.name,
      total_amount: tariff.total_amount,
      vat_rate: tariff.vat_rate || 0,
      include_in_invoice: tariff.include_in_invoice !== false
    });
  };

  const saveEditTariff = async (id) => {
    try {
      const { error } = await supabase
        .from('tariffs')
        .update({
          name: editForm.name,
          total_amount: parseFloat(editForm.total_amount),
          vat_rate: parseFloat(editForm.vat_rate) || 0,
          include_in_invoice: editForm.include_in_invoice
        })
        .eq('id', id);
      
      if (error) throw error;
      setEditingTariff(null);
      fetchData();
      showToast('✓ Tarifs atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteTariff = async (id) => {
    if (!window.confirm('Izdzēst tarifu?')) return;
    try {
      await supabase.from('invoices').delete().eq('tariff_id', id);
      await supabase.from('tariffs').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Izdzēst rēķinu?')) return;
    try {
      await supabase.from('invoices').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // ===== USERS MANAGEMENT =====
  const addUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.email || !newUserForm.password || !newUserForm.apartment_id) {
      showToast('Aizpildiet visus laukus', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('users').insert([{
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        apartment_id: newUserForm.apartment_id,
        role: newUserForm.role
      }]);

      if (error) throw error;
      setNewUserForm({ email: '', password: '', apartment_id: '', role: 'user' });
      fetchData();
      showToast('✓ Lietotājs pievienots');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user.id);
    setEditUserForm({
      email: user.email,
      password: user.password,
      apartment_id: user.apartment_id,
      role: user.role
    });
  };

  const saveEditUser = async (id) => {
    if (!editUserForm.email || !editUserForm.password) {
      showToast('Email un parole ir obligāti', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('users').update({
        email: editUserForm.email.trim(),
        password: editUserForm.password,
        apartment_id: editUserForm.apartment_id,
        role: editUserForm.role
      }).eq('id', id);

      if (error) throw error;
      setEditingUser(null);
      fetchData();
      showToast('✓ Lietotājs atjaunināts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Izdzēst lietotāju?')) return;
    try {
      await supabase.from('users').delete().eq('id', id);
      fetchData();
      showToast('✓ Izdzēsts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  // Aprēķināt rēķina statusu (Apmaksāts/Gaida/Parāds)
  const getInvoiceStatus = (invoice) => {
    if (invoice.paid) {
      return { status: 'Apmaksāts', color: '#10b981', emoji: '✓' };
    }
    
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    
    if (today > dueDate) {
      return { status: 'Parāds', color: '#ef4444', emoji: '⚠️' };
    } else {
      return { status: 'Gaida atmaksu', color: '#f59e0b', emoji: '⏳' };
    }
  };

  // Eksportēt rēķinus uz CSV
  const exportInvoicesToCSV = () => {
    const headers = ['Rēķina numurs', 'Dzīvoklis', 'Īpašnieks', 'Periods', 'Summa (EUR)', 'Termiņš', 'Statuss', 'Apmaksāts'];
    
    const rows = invoices.map(inv => {
      const apt = apartments.find(a => a.id === inv.apartment_id);
      const status = getInvoiceStatus(inv);
      return [
        inv.invoice_number,
        apt?.number || '-',
        `${apt?.owner_name || '-'} ${apt?.owner_surname || ''}`,
        inv.period,
        inv.amount.toFixed(2),
        new Date(inv.due_date).toLocaleDateString('lv-LV'),
        status.status,
        inv.paid ? 'Jā' : 'Nē'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `recini_${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    showToast(`✓ Eksportēti ${invoices.length} rēķini`);
  };

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
    const amountWithoutVat = invoice.amount_without_vat || 0;
    const vatAmount = invoice.vat_amount || 0;
    const amountWithVat = invoice.amount_with_vat || invoice.amount;

    const rowsWithoutVat = invoiceDetails.filter(d => d.type !== 'debt' && d.type !== 'overpayment' && (d.vat_rate === 0 || d.vat_rate === undefined)).map(detail => {
      if (detail.type === 'water') {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${detail.consumption_m3} m³</td>
            <td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      } else if (detail.type === 'waste') {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${detail.declared_persons} pers.</td>
            <td style="text-align: right;">€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${apt.area} m²</td>
            <td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      }
    }).join('');

    const rowsWithVat = invoiceDetails.filter(d => d.type !== 'debt' && d.type !== 'overpayment' && d.vat_rate > 0).map(detail => {
      if (detail.type === 'water') {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${detail.consumption_m3} m³</td>
            <td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      } else if (detail.type === 'waste') {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${detail.declared_persons} pers.</td>
            <td style="text-align: right;">€${(detail.amount_without_vat / detail.declared_persons).toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${apt.area} m²</td>
            <td style="text-align: right;">€${(detail.amount_without_vat / apt.area).toFixed(4)}</td>
            <td style="text-align: right;">€${detail.amount_without_vat.toFixed(2)}</td>
          </tr>
        `;
      }
    }).join('');

    // Parāds rindas
    const debtDetails = invoiceDetails.filter(d => d.type === 'debt');
    const debtRows = debtDetails.map(detail => `
      <tr style="background: #fee2e2;">
        <td style="color: #991b1b; font-weight: bold;">${detail.tariff_name}</td>
        <td></td>
        <td></td>
        <td style="text-align: right; color: #991b1b; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td>
      </tr>
    `).join('');

    // Pārmaksa rindas
    const overpaymentDetails = invoiceDetails.filter(d => d.type === 'overpayment');
    const overpaymentRows = overpaymentDetails.map(detail => `
      <tr style="background: #dbeafe;">
        <td style="color: #0369a1; font-weight: bold;">${detail.tariff_name}</td>
        <td></td>
        <td></td>
        <td style="text-align: right; color: #0369a1; font-weight: bold;">€${detail.amount_without_vat.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .title { font-size: 24px; font-weight: bold; }
            .company-info { text-align: right; font-size: 12px; }
            .divider { border-top: 3px solid #000; margin: 30px 0; }
            .payment-info-box { background: #003399; color: white; padding: 20px; margin: 30px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            th { text-align: left; padding: 10px; border-bottom: 2px solid #000; font-size: 12px; font-weight: bold; }
            td { padding: 12px 10px; }
            .amount-total { font-size: 32px; font-weight: bold; color: #003399; text-align: right; margin: 20px 0; }
            .info-title { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">RĒĶINS</div>
            <div class="company-info">
              <div style="font-weight: bold; margin-bottom: 10px;">${BUILDING_NAME}</div>
              <div>${BUILDING_CODE}</div>
              <div style="font-size: 11px; margin-top: 5px;">${BUILDING_ADDRESS}</div>
            </div>
          </div>

          <div style="font-size: 12px;">
            <p><strong>Nr:</strong> ${invoice.invoice_number}</p>
            <p><strong>PERIODS:</strong> ${invoice.period}</p>
            <p><strong>NO DATUMA:</strong> ${invoice.date_from ? new Date(invoice.date_from).toLocaleDateString('lv-LV') : '-'}</p>
            <p><strong>LĪDZ DATUMAM:</strong> ${invoice.date_to ? new Date(invoice.date_to).toLocaleDateString('lv-LV') : '-'}</p>
            <p><strong>IZRAKSTĪTS:</strong> ${new Date().toLocaleDateString('lv-LV')}</p>
          </div>

          <div class="divider"></div>

          <div style="margin-bottom: 20px;">
            <div class="info-title">Maksātājs</div>
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">
              ${apt.owner_name} ${apt.owner_surname || ''}
            </div>
            <div style="font-size: 12px;">Personas kods: ${apt.personal_code || '-'}</div>
          </div>

          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
            <div class="info-title">Īpašums</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">Dzīvoklis Nr. ${apt.number}</div>
            <div style="font-size: 14px;">Aprēķina platība: ${apt.area} m²</div>
          </div>

          <table>
            <tr>
              <th>PAKALPOJUMS</th>
              <th style="text-align: center;">DAUDZ.</th>
              <th style="text-align: right;">CENA</th>
              <th style="text-align: right;">SUMMA</th>
            </tr>
            ${rowsWithoutVat}
            ${rowsWithVat}
            ${debtRows}
            ${overpaymentRows}
            ${invoiceDetails.filter(d => d.vat_rate === 0 || d.vat_rate === undefined).length > 0 && invoiceDetails.filter(d => d.type !== 'debt' && d.type !== 'overpayment' && d.vat_rate > 0).length > 0 ? `
              <tr style="background: #f9fafb; height: 15px;"></tr>
              <tr style="background: #f9fafb;">
                <td colspan="4" style="text-align: right; font-size: 11px; padding: 8px;">
                  Summa bez PVN: <strong>€${invoiceDetails.filter(d => d.type !== 'debt' && d.type !== 'overpayment' && (d.vat_rate === 0 || d.vat_rate === undefined)).reduce((sum, d) => sum + d.amount_without_vat, 0).toFixed(2)}</strong>
                </td>
              </tr>
            ` : ''}
          </table>

          <div style="text-align: right; margin: 20px 0; border-top: 2px solid #000; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
              <span>Summa bez PVN:</span>
              <span>€${amountWithoutVat.toFixed(2)}</span>
            </div>
            ${vatAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px;">
                <span>PVN kopā:</span>
                <span>€${vatAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div style="font-size: 12px; margin-bottom: 15px;">KOPĀ APMAKSAI (EUR):</div>
            <div class="amount-total">€${amountWithVat.toFixed(2)}</div>
          </div>

          <div class="payment-info-box">
            <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">Maksājuma informācija</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="margin-bottom: 5px;">SAŅEMĒJA IBAN</div>
                <div style="font-weight: bold;">LV62HABA0551064112797</div>
              </div>
              <div>
                <div style="margin-bottom: 5px;">MAKSĀJUMA MĒRĶIS</div>
                <div style="font-weight: bold;">Rēķins ${invoice.invoice_number}</div>
              </div>
            </div>
            <div style="margin-top: 15px; font-size: 11px;">
              Maksājuma termiņš: ${new Date(invoice.due_date).toLocaleDateString('lv-LV')}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Grupēt rēķinus pa mēnešiem
  const groupedInvoices = {};
  invoices.forEach(inv => {
    if (!groupedInvoices[inv.period]) {
      groupedInvoices[inv.period] = [];
    }
    groupedInvoices[inv.period].push(inv);
  });

  const sortedMonths = Object.keys(groupedInvoices).sort().reverse();
  const uniqueTariffPeriods = [...new Set(tariffs.map(t => t.period))].sort().reverse();

  // Aprēķināt parādu
  const totalDebt = invoices
    .filter(inv => !inv.paid)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // ===== LOGIN SCREEN =====
  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ textAlign: 'center', color: '#003399', marginBottom: '30px', fontSize: '28px' }}>🏢 BARONA 78</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="E-pasts"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
            <input
              type="password"
              placeholder="Parole"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
            <button type="submit" style={{ padding: '12px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              Pierakstīties
            </button>
          </form>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      </div>
    );
  }

  // ===== USER PORTAL =====
  if (currentUser && currentUser.role === 'user') {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ background: '#003399', color: 'white', padding: '30px', borderRadius: '8px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>🏠 Dzīvoklis {userApartment?.number}</h1>
            <p style={{ margin: '5px 0 0 0', color: '#ddd', fontSize: '14px' }}>{userApartment?.owner_name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '4px' }}>Kopā apmaksāt:</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>€{userInvoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>
                Parāds: €{userInvoices.filter(i => !i.paid && new Date(i.due_date) <= new Date()).reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}
              </div>
            </div>
            <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Izrakstīties</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h2>📄 Rēķinu vēsture</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userInvoices.length === 0 ? (
                <p style={{ color: '#999' }}>Nav rēķinu</p>
              ) : (
                userInvoices.map(inv => (
                  <div key={inv.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Rēķins {inv.invoice_number}
                        {(() => {
                          const status = getInvoiceStatus(inv);
                          return (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '500',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: status.color,
                              color: 'white'
                            }}>
                              {status.emoji} {status.status}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {inv.period} • Termiņš: {new Date(inv.due_date).toLocaleDateString('lv-LV')}<br/>
                        📅 {inv.date_from ? new Date(inv.date_from).toLocaleDateString('lv-LV') : '-'} — {inv.date_to ? new Date(inv.date_to).toLocaleDateString('lv-LV') : '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: inv.paid ? '#10b981' : '#ef4444' }}>€{inv.amount.toFixed(2)}</div>
                      <button
                        onClick={() => downloadPDF(inv)}
                        style={{ fontSize: '12px', marginTop: '8px', padding: '4px 8px', background: '#003399', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        📥 PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ===== ADMIN PANEL =====
  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideIn {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={styles.sidebar}>
        <div style={styles.logo}>🏢 BARONA 78</div>
        <nav style={styles.nav}>
          {[
            { id: 'overview', label: '📊 Pārskats' },
            { id: 'apartments', label: '🏠 Dzīvokļi' },
            { id: 'users', label: '👥 Lietotāji' },
            { id: 'tariffs', label: '💰 Tarifi' },
            { id: 'water', label: '💧 Ūdens' },
            { id: 'invoices', label: '📄 Rēķini' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? {...styles.navBtn, ...styles.navBtnActive} : styles.navBtn}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Rēķinu Vadības Sistēma</h1>
            <p style={styles.subtitle}>Inteligenta mājas apsaimniekošana</p>
          </div>
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Izrakstīties</button>
        </header>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>⏳ Ielāde...</div>
          ) : activeTab === 'invoices' ? (
            <div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
                <div style={{background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '6px', padding: '12px', marginBottom: '15px', fontSize: '13px', color: '#0369a1'}}>
                  <strong>ℹ️ Vairāki rēķini per dzīvokli:</strong> Var ģenerēt vairākus rēķinus uz vienu dzīvokli vienā mēnesī.
                  <br/>Rēķini tiks numurēti kā <code style={{background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px'}}>2026/03-14-1</code>, 
                  <code style={{background: '#e0f2fe', padding: '2px 6px', borderRadius: '3px', marginLeft: '4px'}}>2026/03-14-2</code>, utt.
                </div>
                <form onSubmit={generateInvoices} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <select
                      value={invoiceMonth}
                      onChange={(e) => setInvoiceMonth(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">-- Izvēlieties mēnesi --</option>
                      {uniqueTariffPeriods.map(period => (
                        <option key={period} value={period}>
                          {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div>
                      <label style={{fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block'}}>No datuma</label>
                      <input
                        type="date"
                        value={invoiceFromDate}
                        onChange={(e) => setInvoiceFromDate(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={{fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block'}}>Līdz datumam</label>
                      <input
                        type="date"
                        value={invoiceToDate}
                        onChange={(e) => setInvoiceToDate(e.target.value)}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <button type="submit" style={styles.btn}>Ģenerēt</button>
                </form>
              </div>

              <div style={styles.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                  <h2 style={styles.cardTitle}>💳 Rēķini ({invoices.length})</h2>
                  <button
                    onClick={exportInvoicesToCSV}
                    style={{padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}
                    title="Eksportēt uz CSV"
                  >
                    📊 CSV Export
                  </button>
                </div>
                
                {sortedMonths.length === 0 ? (
                  <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>Nav rēķinu</div>
                ) : (
                  <div>
                    {sortedMonths.map(month => {
                      const monthInvoices = groupedInvoices[month];
                      const monthTotal = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                      const monthUnpaid = monthInvoices.filter(i => !i.paid).reduce((sum, inv) => sum + inv.amount, 0);
                      const isExpanded = expandedInvoiceMonth === month;

                      return (
                        <div key={month} style={{marginBottom: '15px'}}>
                          <div
                            onClick={() => setExpandedInvoiceMonth(isExpanded ? null : month)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '15px',
                              background: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <div>
                              <div style={{fontWeight: 'bold', fontSize: '14px'}}>
                                📅 {new Date(month + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                              </div>
                              <div style={{fontSize: '12px', color: '#666'}}>
                                €{monthTotal.toFixed(2)} • Parāds: €{monthUnpaid.toFixed(2)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                regenerateInvoices(month);
                              }}
                              style={{...styles.btnSmall, fontSize: '12px', padding: '4px 8px', background: '#fcd34d', color: '#000', borderRadius: '4px', marginRight: '10px', fontWeight: '500'}}
                              title="Reģenerēt visus rēķinus"
                            >
                              🔄 Regen.
                            </button>
                            <div style={{fontSize: '18px'}}>{isExpanded ? '▼' : '▶'}</div>
                          </div>

                          {isExpanded && (
                            <div style={{marginTop: '10px'}}>
                              {monthInvoices.map(invoice => {
                                const apt = apartments.find(a => a.id === invoice.apartment_id);
                                const tariff = tariffs.find(t => t.id === invoice.tariff_id);
                                return (
                                  <div key={invoice.id} style={{...styles.invoiceCard, flexWrap: 'wrap'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 100%', marginBottom: '10px'}}>
                                      <input
                                        type="checkbox"
                                        checked={invoice.paid || false}
                                        onChange={() => toggleInvoicePaid(invoice.id, invoice.paid)}
                                        style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                      />
                                      <div style={{flex: 1}}>
                                        <div style={{fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                          Dzīv. {apt?.number} • {tariff?.name}
                                          {(() => {
                                            const status = getInvoiceStatus(invoice);
                                            return (
                                              <span style={{
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: status.color,
                                                color: 'white'
                                              }}>
                                                {status.emoji} {status.status}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666'}}>
                                          {invoice.invoice_number} • Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                                        </div>

                                        {invoice.previous_debt_amount > 0 && (
                                          <div style={{fontSize: '12px', color: '#991b1b', marginTop: '4px', padding: '8px', background: '#fee2e2', borderRadius: '4px'}}>
                                            <strong>⚠️ Parāds no iepriekš:</strong> €{invoice.previous_debt_amount.toFixed(2)}
                                            {invoice.previous_debt_note && (
                                              <div style={{marginTop: '4px', fontStyle: 'italic'}}>{invoice.previous_debt_note}</div>
                                            )}
                                          </div>
                                        )}

                                        {invoice.overpayment_amount > 0 && (
                                          <div style={{fontSize: '12px', color: '#0369a1', marginTop: '4px', padding: '8px', background: '#dbeafe', borderRadius: '4px'}}>
                                            <strong>💰 Pārmaksa:</strong> -€{invoice.overpayment_amount.toFixed(2)}
                                          </div>
                                        )}

                                        {debtNoteForm.invoiceId === invoice.id && (
                                          <div style={{marginTop: '8px', display: 'flex', gap: '8px'}}>
                                            <input
                                              type="text"
                                              placeholder="Parāda paskaidrojums..."
                                              value={debtNoteForm.note}
                                              onChange={(e) => setDebtNoteForm({...debtNoteForm, note: e.target.value})}
                                              style={{...styles.input, flex: 1, fontSize: '12px'}}
                                            />
                                            <button
                                              onClick={() => saveDebtNote(invoice.id, debtNoteForm.note)}
                                              style={{padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500'}}
                                            >
                                              ✓ Saglabāt
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 100%', marginBottom: '10px'}}>
                                      <div style={{flex: 1}}>
                                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                                          {invoice.vat_rate > 0 && (
                                            <div style={{fontSize: '11px', color: '#999', marginBottom: '2px'}}>
                                              €{invoice.amount_without_vat?.toFixed(2) || '0.00'} + €{invoice.vat_amount?.toFixed(2) || '0.00'}
                                            </div>
                                          )}
                                          <div style={{
                                            fontWeight: 'bold',
                                            color: invoice.paid ? '#10b981' : '#ef4444',
                                            minWidth: '80px',
                                            textAlign: 'right',
                                            fontSize: '14px'
                                          }}>
                                            €{invoice.amount.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => downloadPDF(invoice)}
                                        style={{...styles.btnSmall, padding: '6px 12px'}}
                                        title="Lejupielādēt PDF"
                                      >
                                        📥
                                      </button>
                                      {invoice.previous_debt_amount > 0 && (
                                        <button
                                          onClick={() => setDebtNoteForm({invoiceId: invoice.id, note: invoice.previous_debt_note || ''})}
                                          style={{...styles.btnSmall, padding: '6px 12px', background: '#fecaca', borderRadius: '4px', fontSize: '14px'}}
                                          title="Pievienot parāda paskaidrojumu"
                                        >
                                          📝
                                        </button>
                                      )}
                                      <button
                                        onClick={() => deleteInvoice(invoice.id)}
                                        style={{...styles.btnSmall, padding: '6px 12px'}}
                                        title="Dzēst"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💰 Dzīvokļa pārmaksa</h2>
                <form onSubmit={saveOverpayment} style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px'}}>
                    <select
                      value={overpaymentForm.apartmentId}
                      onChange={(e) => setOverpaymentForm({...overpaymentForm, apartmentId: e.target.value})}
                      style={styles.input}
                    >
                      <option value="">-- Izvēlieties dzīvokli --</option>
                      {apartments.map(apt => (
                        <option key={apt.id} value={apt.id}>
                          Dzīv. {apt.number} - {apt.owner_name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={overpaymentForm.month}
                      onChange={(e) => setOverpaymentForm({...overpaymentForm, month: e.target.value})}
                      style={styles.input}
                    >
                      <option value="">-- Mēnesis --</option>
                      {uniqueTariffPeriods.map(period => (
                        <option key={period} value={period}>
                          {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Pārmaksas summa (€)"
                      value={overpaymentForm.amount}
                      onChange={(e) => setOverpaymentForm({...overpaymentForm, amount: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.btn}>Saglabāt pārmaksu</button>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* Placeholder for other tabs */}
              <div style={{textAlign: 'center', color: '#999', padding: '40px'}}>Šis tabs ir izstrādē...</div>
            </>
          )}
        </div>
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
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
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
  content: {},
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
