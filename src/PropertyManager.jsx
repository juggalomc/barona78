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
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [waterConsumption, setWaterConsumption] = useState([]);
  const [waterTariffs, setWaterTariffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  
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
    vat_rate: 0
  });

  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [editingTariff, setEditingTariff] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copySourceMonth, setCopySourceMonth] = useState(null);
  const [selectedTariffsToCopy, setSelectedTariffsToCopy] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes, wcRes, wtRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*').order('period', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterConsumption(wcRes.data || []);
      setWaterTariffs(wtRes.data || []);
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
        period: tariffPeriod
      };

      const { error } = await supabase.from('tariffs').insert([dataToInsert]);
      if (error) throw error;
      
      setTariffForm({ name: '', total_amount: '', vat_rate: 0 });
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

  const regenerateInvoices = async (period, tariffId = null) => {
    if (!window.confirm('Reģenerēt rēķinus? Esošie tiks dzēsti!')) return;
    
    try {
      // Dzēst esošos rēķinus
      await supabase.from('invoices').delete().eq('period', period);

      const invoicesToAdd = [];
      const [year, month] = period.split('-');
      const periodTariffs = tariffs.filter(t => t.period === period);
      const waterTariff = waterTariffs.find(w => w.period === period);

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
            vat_amount: vatAmount
          });
        }

        // Pievienot ūdens patēriņu
        const waterConsumptionRecord = waterConsumption.find(w => w.apartment_id === apt.id && w.period === period);
        const waterTariff = waterTariffs.find(w => w.period === period);

        if (waterConsumptionRecord && waterTariff) {
          const waterConsumptionM3 = parseFloat(waterConsumptionRecord.consumption_m3) || 0;
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

        const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
        const invoiceNumber = `${year}/${month}-${apt.number}`;
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

        invoicesToAdd.push({
          apartment_id: apt.id,
          tariff_id: periodTariffs[0].id,
          invoice_number: invoiceNumber,
          period: period,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0,
          due_date: dueDate,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails)
        });
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

    const periodTariffs = tariffs.filter(t => t.period === invoiceMonth);
    if (periodTariffs.length === 0) {
      showToast(`Nav tarifū periodam ${invoiceMonth}`, 'error');
      return;
    }

    try {
      const invoicesToAdd = [];
      const [year, month] = invoiceMonth.split('-');

      for (const apt of apartments) {
        // Aprēķināt visus tarifus šim dzīvoklim
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
            vat_amount: vatAmount
          });
        }

        // Pievienot ūdens patēriņu
        const waterConsumptionRecord = waterConsumption.find(w => w.apartment_id === apt.id && w.period === invoiceMonth);
        const waterTariff = waterTariffs.find(w => w.period === invoiceMonth);

        if (waterConsumptionRecord && waterTariff) {
          const waterConsumptionM3 = parseFloat(waterConsumptionRecord.consumption_m3) || 0;
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

        const totalAmountWithVat = Math.round((totalAmountWithoutVat + totalVatAmount) * 100) / 100;
        const invoiceNumber = `${year}/${month}-${apt.number}`;
        const dueDate = new Date(year, month, 15).toISOString().split('T')[0];

        invoicesToAdd.push({
          apartment_id: apt.id,
          tariff_id: periodTariffs[0].id, // Primārais tarifs (tiks glabāts attiecībās)
          invoice_number: invoiceNumber,
          period: invoiceMonth,
          amount: totalAmountWithVat,
          amount_without_vat: totalAmountWithoutVat,
          amount_with_vat: totalAmountWithVat,
          vat_amount: totalVatAmount,
          vat_rate: 0, // Nav viena VAT, jo var būt dažādi
          due_date: dueDate,
          paid: false,
          invoice_details: JSON.stringify(invoiceDetails) // Saglabāt detalizējumu
        });
      }

      const { error } = await supabase.from('invoices').insert(invoicesToAdd);
      if (error) throw error;

      setInvoiceMonth('');
      fetchData();
      showToast(`✓ Ģenerēti ${invoicesToAdd.length} rēķini`);
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterTariff = async (e) => {
    e.preventDefault();
    try {
      const priceValue = parseFloat(document.getElementById('waterPrice')?.value || 0);
      const vatValue = parseFloat(document.getElementById('waterVat')?.value || 0);

      // Validēt vērtības
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
        .eq('period', tariffPeriod);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from('water_tariffs')
          .update({
            price_per_m3: priceValue,
            vat_rate: vatValue
          })
          .eq('id', existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('water_tariffs')
          .insert([{
            period: tariffPeriod,
            price_per_m3: priceValue,
            vat_rate: vatValue
          }]);
        if (error) throw error;
      }

      fetchData();
      showToast('✓ Ūdens tarifs saglabāts');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const saveWaterConsumption = async (apartmentId, consumption) => {
    try {
      const consumptionValue = parseFloat(consumption);
      
      // Validēt vērtību
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
      vat_rate: tariff.vat_rate || 0
    });
  };

  const saveEditTariff = async (id) => {
    try {
      const { error } = await supabase
        .from('tariffs')
        .update({
          name: editForm.name,
          total_amount: parseFloat(editForm.total_amount),
          vat_rate: parseFloat(editForm.vat_rate) || 0
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

  const downloadPDF = (invoice) => {
    const apt = apartments.find(a => a.id === invoice.apartment_id);
    const invoiceDetails = invoice.invoice_details ? JSON.parse(invoice.invoice_details) : [];
    const amountWithoutVat = invoice.amount_without_vat || 0;
    const vatAmount = invoice.vat_amount || 0;
    const amountWithVat = invoice.amount_with_vat || invoice.amount;

    const tableRows = invoiceDetails.map(detail => {
      if (detail.type === 'water') {
        return `
          <tr>
            <td>${detail.tariff_name}</td>
            <td style="text-align: center;">${detail.consumption_m3} m³</td>
            <td style="text-align: right;">€${detail.price_per_m3.toFixed(4)}</td>
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

    const vatRows = invoiceDetails
      .filter(d => d.vat_rate > 0)
      .map(detail => `
        <tr style="background: #f9fafb;">
          <td colspan="3" style="text-align: right; font-size: 11px;">PVN (${detail.vat_rate}%) - ${detail.tariff_name}:</td>
          <td style="text-align: right; font-size: 11px;">€${detail.vat_amount.toFixed(2)}</td>
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
            ${tableRows}
            ${vatRows}
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
        </header>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>⏳ Ielāde...</div>
          ) : activeTab === 'overview' ? (
            <div>
              <div style={styles.statsGrid}>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{apartments.length}</div>
                  <div style={styles.statLabel}>Dzīvokļi</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{tariffs.length}</div>
                  <div style={styles.statLabel}>Tarifi</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statValue}>{invoices.length}</div>
                  <div style={styles.statLabel}>Rēķini</div>
                </div>
                <div style={{...styles.stat, background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)'}}>
                  <div style={styles.statValue}>€{totalDebt.toFixed(2)}</div>
                  <div style={styles.statLabel}>Parāds</div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💳 Kopsavilkums</h2>
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Kopā apmaksāt</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#0066cc'}}>€{totalAmount.toFixed(2)}</div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Apmaksāts</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981'}}>
                      €{(totalAmount - totalDebt).toFixed(2)}
                    </div>
                  </div>
                  <div style={styles.summaryItem}>
                    <div style={styles.summaryLabel}>Parāds</div>
                    <div style={{fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b'}}>€{totalDebt.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'apartments' ? (
            <div style={styles.twoCol}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>➕ Pievienot dzīvokli</h2>
                <form onSubmit={addApartment} style={styles.form}>
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      placeholder="Numurs *"
                      value={apartmentForm.number}
                      onChange={(e) => setApartmentForm({...apartmentForm, number: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Platība (m²) *"
                      value={apartmentForm.area}
                      onChange={(e) => setApartmentForm({...apartmentForm, area: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Vārds *"
                    value={apartmentForm.owner_name}
                    onChange={(e) => setApartmentForm({...apartmentForm, owner_name: e.target.value})}
                    style={styles.input}
                  />
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      placeholder="Uzvārds"
                      value={apartmentForm.owner_surname}
                      onChange={(e) => setApartmentForm({...apartmentForm, owner_surname: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="text"
                      placeholder="Personas kods"
                      value={apartmentForm.personal_code}
                      onChange={(e) => setApartmentForm({...apartmentForm, personal_code: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formRow}>
                    <input
                      type="email"
                      placeholder="E-pasts"
                      value={apartmentForm.email}
                      onChange={(e) => setApartmentForm({...apartmentForm, email: e.target.value})}
                      style={styles.input}
                    />
                    <input
                      type="tel"
                      placeholder="Telefons"
                      value={apartmentForm.phone}
                      onChange={(e) => setApartmentForm({...apartmentForm, phone: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formRow}>
                    <input
                      type="number"
                      placeholder="Deklarēto personu skaits"
                      min="1"
                      value={apartmentForm.declared_persons}
                      onChange={(e) => setApartmentForm({...apartmentForm, declared_persons: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.btn}>Pievienot</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📋 Dzīvokļi ({apartments.length})</h2>
                <div style={styles.list}>
                  {apartments.map(apt => (
                    <div key={apt.id} style={styles.listItem}>
                      <div>
                        <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                        <div style={{fontSize: '13px', color: '#666'}}>📐 {apt.area} m² • 👤 {apt.declared_persons || 1} • {apt.owner_name}</div>
                      </div>
                      <button onClick={() => deleteApartment(apt.id)} style={styles.btnSmall}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'tariffs' ? (
            <div style={styles.twoCol}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>➕ Pievienot tarifu</h2>
                <form onSubmit={addTariff} style={styles.form}>
                  <div>
                    <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
                    <input
                      type="month"
                      value={tariffPeriod}
                      onChange={(e) => setTariffPeriod(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Nosaukums *"
                    value={tariffForm.name}
                    onChange={(e) => setTariffForm({...tariffForm, name: e.target.value})}
                    style={styles.input}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Summa mājai (€) *"
                    value={tariffForm.total_amount}
                    onChange={(e) => setTariffForm({...tariffForm, total_amount: e.target.value})}
                    style={styles.input}
                  />
                  <div>
                    <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>PVN (%) - 0 ja bez PVN</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="PVN procentu likme"
                      value={tariffForm.vat_rate}
                      onChange={(e) => setTariffForm({...tariffForm, vat_rate: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.btn}>Pievienot</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💰 Tarifi pa mēnešiem</h2>
                
                {copySourceMonth && (
                  <div style={{background: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px'}}>
                    <div style={{marginBottom: '10px'}}>📋 Kopēšanas režīms - atlasiet tarifus no <strong>{new Date(copySourceMonth + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</strong></div>
                    <button
                      onClick={() => copySelectedTariffs(copySourceMonth, tariffPeriod)}
                      style={{...styles.btn, fontSize: '12px', padding: '8px 12px', marginRight: '8px'}}
                    >
                      ✓ Kopēt atlasītos
                    </button>
                    <button
                      onClick={() => {setCopySourceMonth(null); setSelectedTariffsToCopy({});}}
                      style={{background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                    >
                      ✕ Atcelt
                    </button>
                  </div>
                )}

                {uniqueTariffPeriods.map(period => {
                  const periodTariffs = tariffs.filter(t => t.period === period);

                  return (
                    <div key={period} style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                        <div style={{fontWeight: 'bold', fontSize: '14px'}}>
                          📅 {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                        </div>
                        <button
                          onClick={() => setCopySourceMonth(copySourceMonth === period ? null : period)}
                          style={{...styles.btnSmall, fontSize: '12px', padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontWeight: '500'}}
                          title="Kopēt tarifus"
                        >
                          📋 {copySourceMonth === period ? 'Atcelt' : 'Kopēt'}
                        </button>
                      </div>
                      
                      {periodTariffs.map(tar => {
                        const pricePerSqm = parseFloat(tar.total_amount) / TOTAL_AREA;
                        const isEditing = editingTariff === tar.id;

                        return (
                          <div key={tar.id} style={{...styles.listItem, marginBottom: '8px', display: 'flex', gap: '8px'}}>
                            {copySourceMonth === period && (
                              <input
                                type="checkbox"
                                checked={selectedTariffsToCopy[tar.id] || false}
                                onChange={(e) => setSelectedTariffsToCopy({...selectedTariffsToCopy, [tar.id]: e.target.checked})}
                                style={{width: '18px', height: '18px', cursor: 'pointer', minWidth: '18px'}}
                              />
                            )}
                            
                            {isEditing ? (
                              <div style={{flex: 1, display: 'flex', gap: '8px', flexDirection: 'column'}}>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                  style={{...styles.input, fontSize: '12px'}}
                                />
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.total_amount}
                                    onChange={(e) => setEditForm({...editForm, total_amount: e.target.value})}
                                    style={{...styles.input, fontSize: '12px'}}
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="PVN %"
                                    value={editForm.vat_rate}
                                    onChange={(e) => setEditForm({...editForm, vat_rate: e.target.value})}
                                    style={{...styles.input, fontSize: '12px'}}
                                  />
                                </div>
                                <div style={{display: 'flex', gap: '8px'}}>
                                  <button
                                    onClick={() => saveEditTariff(tar.id)}
                                    style={{...styles.btn, fontSize: '11px', padding: '6px 12px', flex: 1}}
                                  >
                                    ✓ Saglabāt
                                  </button>
                                  <button
                                    onClick={() => setEditingTariff(null)}
                                    style={{background: '#e5e7eb', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', flex: 1}}
                                  >
                                    Atcelt
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{flex: 1}}>
                                <div style={{fontWeight: 'bold', fontSize: '13px'}}>{tar.name}</div>
                                <div style={{fontSize: '12px', color: '#666'}}>
                                  €{parseFloat(tar.total_amount).toFixed(2)} • €{pricePerSqm.toFixed(4)}/m²
                                  {tar.vat_rate > 0 && ` • PVN: ${tar.vat_rate}%`}
                                </div>
                              </div>
                            )}
                            
                            {!isEditing && (
                              <div style={{display: 'flex', gap: '4px'}}>
                                <button
                                  onClick={() => startEditTariff(tar)}
                                  style={{...styles.btnSmall, padding: '4px 8px'}}
                                  title="Rediģēt"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteTariff(tar.id)}
                                  style={{...styles.btnSmall, padding: '4px 8px'}}
                                  title="Dzēst"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'water' ? (
            <div style={styles.twoCol}>
              {/* Water Tariff */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💧 Ūdens Tarifs</h2>
                <form onSubmit={saveWaterTariff} style={styles.form}>
                  <div>
                    <label style={{fontSize: '12px', color: '#666', fontWeight: '500'}}>Periods</label>
                    <input
                      type="month"
                      value={tariffPeriod}
                      onChange={(e) => setTariffPeriod(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cena par m³ (€) *"
                    id="waterPrice"
                    defaultValue={waterTariffs.find(w => w.period === tariffPeriod)?.price_per_m3 || ''}
                    style={styles.input}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="PVN (%)"
                    id="waterVat"
                    defaultValue={waterTariffs.find(w => w.period === tariffPeriod)?.vat_rate || 0}
                    style={styles.input}
                  />
                  <button type="submit" style={styles.btn}>Saglabāt Tarifu</button>
                </form>
              </div>

              {/* Water Consumption */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💧 Patēriņš - {new Date(tariffPeriod + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}</h2>
                <div style={styles.list}>
                  {apartments.map(apt => {
                    const consumption = waterConsumption.find(w => w.apartment_id === apt.id && w.period === tariffPeriod);
                    const waterTariff = waterTariffs.find(w => w.period === tariffPeriod);
                    const consumptionValue = consumption?.consumption_m3 || '';
                    const amount = consumptionValue ? parseFloat(consumptionValue) * parseFloat(waterTariff?.price_per_m3 || 0) : 0;
                    const vatAmount = amount * parseFloat(waterTariff?.vat_rate || 0) / 100;
                    const totalAmount = amount + vatAmount;

                    return (
                      <div key={apt.id} style={{...styles.listItem, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <div>
                          <div style={{fontWeight: 'bold'}}>Dzīv. {apt.number}</div>
                          <div style={{fontSize: '12px', color: '#666'}}>€{totalAmount.toFixed(2)}</div>
                        </div>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="m³"
                            value={consumptionValue}
                            onChange={(e) => saveWaterConsumption(apt.id, e.target.value)}
                            style={{...styles.input, width: '80px', padding: '8px'}}
                          />
                          <span style={{fontSize: '12px', color: '#666', minWidth: '40px'}}>m³</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📄 Ģenerēt rēķinus</h2>
                <form onSubmit={generateInvoices} style={{display: 'flex', gap: '10px'}}>
                  <select
                    value={invoiceMonth}
                    onChange={(e) => setInvoiceMonth(e.target.value)}
                    style={{...styles.input, flex: 1}}
                  >
                    <option value="">-- Izvēlieties mēnesi --</option>
                    {uniqueTariffPeriods.map(period => (
                      <option key={period} value={period}>
                        {new Date(period + '-01').toLocaleDateString('lv-LV', {month: 'long', year: 'numeric'})}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={styles.btn}>Ģenerēt</button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💳 Rēķini ({invoices.length})</h2>
                
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
                                  <div key={invoice.id} style={styles.invoiceCard}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                                      <input
                                        type="checkbox"
                                        checked={invoice.paid || false}
                                        onChange={() => toggleInvoicePaid(invoice.id, invoice.paid)}
                                        style={{width: '18px', height: '18px', cursor: 'pointer'}}
                                      />
                                      <div style={{flex: 1}}>
                                        <div style={{fontWeight: '600', fontSize: '13px'}}>
                                          Dzīv. {apt?.number} • {tariff?.name}
                                        </div>
                                        <div style={{fontSize: '12px', color: '#666'}}>
                                          {invoice.invoice_number} • Termiņš: {new Date(invoice.due_date).toLocaleDateString('lv-LV')}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '10px'}}>
                                      {invoice.vat_rate > 0 && (
                                        <div style={{fontSize: '11px', color: '#999', marginBottom: '2px'}}>
                                          €{invoice.amount_without_vat?.toFixed(2) || '0.00'} + €{invoice.vat_amount?.toFixed(2) || '0.00'}
                                        </div>
                                      )}
                                      <div style={{
                                        fontWeight: 'bold',
                                        color: invoice.paid ? '#10b981' : '#ef4444',
                                        minWidth: '80px',
                                        textAlign: 'right'
                                      }}>
                                        €{invoice.amount.toFixed(2)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => downloadPDF(invoice)}
                                      style={{...styles.btnSmall, padding: '6px 12px'}}
                                      title="Lejupielādēt PDF"
                                    >
                                      📥
                                    </button>
                                    <button
                                      onClick={() => regenerateInvoices(month, invoice.tariff_id)}
                                      style={{...styles.btnSmall, padding: '6px 12px', fontSize: '14px'}}
                                      title="Reģenerēt šo rēķinu"
                                    >
                                      🔄
                                    </button>
                                    <button
                                      onClick={() => deleteInvoice(invoice.id)}
                                      style={{...styles.btnSmall, padding: '6px 12px'}}
                                      title="Dzēst"
                                    >
                                      🗑️
                                    </button>
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
            </div>
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
    marginBottom: '40px'
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  stat: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    color: 'white',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '12px',
    opacity: 0.9
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
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
  },
  summaryItem: {
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#64748b'
  }
};
