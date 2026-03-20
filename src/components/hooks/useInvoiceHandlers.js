// src/components/hooks/useInvoiceHandlers-UPDATED.js
// INSTRUKCIJAS: Aizstāj savu esošo useInvoiceHandlers.js ar šo versiju vai integrē izmaiņas

import { useState } from 'react';
import { TOTAL_AREA } from '../shared/constants';

export function useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings = {}, enabledMeters = {}) {
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  const [expandedInvoiceMonth, setExpandedInvoiceMonth] = useState(null);
  const [debtNoteForm, setDebtNoteForm] = useState({ invoiceId: null, note: '' });
  const [overpaymentForm, setOverpaymentForm] = useState({ invoiceId: '', amount: '' });

  // ===== JAUNS: Rēķina Datu Konvertēšana uz UI Formātu =====
  const prepareInvoiceForDisplay = (invoice, apartment) => {
    if (!invoice.invoice_details) return null;

    const details = JSON.parse(invoice.invoice_details);
    
    return {
      invoiceNumber: invoice.invoice_number,
      period: invoice.period,
      dueDate: invoice.due_date,
      dateCreated: invoice.created_at || new Date().toISOString(),
      invoiceDetails: details || [],
      previousDebt: invoice.previous_debt_amount || 0,
      previousDebtNote: invoice.previous_debt_note || '',
      amountWithoutVat: invoice.amount_without_vat || 0,
      vatAmount: invoice.vat_amount || 0,
      totalAmount: invoice.amount_with_vat || invoice.amount || 0,
      apartment: apartment
    };
  };

  // ===== JAUNS: Jauno HTML Rēķinu Ģenerēšana =====
  const generateInvoiceHtmlNew = (invoice, apt, buildingSettings) => {
    const invoiceData = prepareInvoiceForDisplay(invoice, apt);
    
    if (!invoiceData) {
      console.error('Kļūda: rēķina dati nav pieejami');
      return '';
    }

    const {
      invoiceNumber = '—',
      period = '—',
      dueDate = '—',
      dateCreated = '—',
      invoiceDetails = [],
      previousDebt = 0,
      previousDebtNote = '',
      amountWithoutVat = 0,
      vatAmount = 0,
      totalAmount = 0
    } = invoiceData;

    const {
      building_name = 'BIEDRĪBA "BARONA 78"',
      building_address = 'Kr. Barona iela 78-14, Rīga',
      building_code = '40008325768',
      payment_iban = 'LV62HABA0551064112797',
      payment_bank = 'Habib Bank',
      payment_email = 'info@barona78.lv',
      payment_phone = '+371 67800000',
      additional_invoice_info = ''
    } = buildingSettings || {};

    // Servisa detaļu HTML
    const serviceRows = invoiceDetails.map((detail, idx) => {
      const isDebt = detail.type === 'debt' || detail.type === 'overpayment';
      const bgColor = isDebt ? '#fee2e2' : idx % 2 === 0 ? '#fafbfc' : 'white';
      const textColor = isDebt ? '#991b1b' : 'inherit';
      const fontWeight = isDebt ? 'bold' : 'inherit';

      let quantity = '—';
      if (detail.consumption_m3) quantity = `${detail.consumption_m3} m³`;
      else if (detail.declared_persons) quantity = `${detail.declared_persons} pers.`;
      else if (detail.type === 'tariff' || detail.type === 'hot_water') quantity = `${apt.area} m²`;

      return `
        <tr style="background: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${detail.tariff_name}</td>
          <td style="padding: 10px 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">${quantity}</td>
          <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">
            ${detail.price_per_m3 ? `€${parseFloat(detail.price_per_m3).toFixed(2)}` : '—'}
          </td>
          <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0;">
            €${parseFloat(detail.amount_without_vat).toFixed(2)}
          </td>
          <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 500;">
            €${(parseFloat(detail.amount_without_vat) + parseFloat(detail.vat_amount || 0)).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="lv">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rēķins ${invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 0; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'DejaVu Sans', 'Arial Unicode MS', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .page {
            background: white;
            max-width: 210mm;
            height: 297mm;
            margin: 0 auto 20px;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #003399; padding-bottom: 20px; }
          .header-left h1 { font-size: 24px; font-weight: bold; color: #003399; letter-spacing: 0.15em; margin-bottom: 10px; }
          .header-right { text-align: right; font-size: 11px; }
          .company-info { font-weight: bold; font-size: 13px; margin-bottom: 8px; line-height: 1.4; }
          
          .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; font-size: 12px; }
          .meta-label { font-weight: bold; color: #003399; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .party { background: #f9fafb; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
          .party-title { font-weight: bold; font-size: 12px; color: #003399; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #cbd5e1; }
          .party-name { font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #0f172a; }
          .party-text { font-size: 12px; margin: 3px 0; line-height: 1.5; }
          
          table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 12px; }
          table thead { background: #f0f4f8; border-bottom: 2px solid #cbd5e1; }
          table th { padding: 12px; text-align: left; font-weight: 600; color: #1e293b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          
          .totals { margin-top: 30px; padding-top: 20px; border-top: 2px solid #003399; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .total-row.bold { font-weight: bold; font-size: 14px; color: #003399; padding: 12px 0; border-top: 1px solid #003399; }
          
          .final-amount {
            background: linear-gradient(135deg, #003399 0%, #0f172a 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          
          .final-amount-value { font-size: 32px; font-weight: bold; letter-spacing: 0.05em; }
          
          .payment-info { background: #003399; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; font-size: 11px; }
          .payment-info-title { font-weight: bold; text-transform: uppercase; margin-bottom: 15px; font-size: 12px; letter-spacing: 0.1em; }
          .payment-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; line-height: 1.5; }
          .payment-info-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; margin-bottom: 3px; }
          .payment-info-value { font-weight: bold; font-size: 11px; }
          
          .debt-warning { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 12px; }
          .debt-warning-title { font-weight: bold; margin-bottom: 8px; font-size: 13px; }
          
          .footer-notes { font-size: 10px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          .footer-notes p { margin: 6px 0; }
          
          @media (max-width: 768px) {
            .page { padding: 20px; }
            .invoice-meta { grid-template-columns: 1fr; }
            .parties { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- HEADER -->
          <div class="header">
            <div class="header-left">
              <h1>RĒĶINS</h1>
              <p>Par pakalpojumiem</p>
            </div>
            <div class="header-right">
              <div class="company-info">${building_name}<br/>${building_address}</div>
              <div>Reģ. numurs: ${building_code}</div>
            </div>
          </div>

          <!-- INVOICE META -->
          <div class="invoice-meta">
            <div>
              <div class="meta-label">Rēķina numurs</div>
              <div>${invoiceNumber}</div>
              <div class="meta-label" style="margin-top: 12px;">Sagatavots</div>
              <div>${new Date(dateCreated).toLocaleDateString('lv-LV')}</div>
            </div>
            <div>
              <div class="meta-label">Periods</div>
              <div>${period}</div>
              <div class="meta-label" style="margin-top: 12px;">Apmaksas termiņš</div>
              <div>${new Date(dueDate).toLocaleDateString('lv-LV')}</div>
            </div>
          </div>

          <!-- PARTIES -->
          <div class="parties">
            <div class="party">
              <div class="party-title">📤 Saņēmējs (Sniedzējs)</div>
              <div class="party-name">${building_name}</div>
              <div class="party-text">Juridiskā adrese: ${building_address}</div>
              <div class="party-text">Reģ. numurs: ${building_code}</div>
              <div style="margin-top: 12px;">
                <strong>Norēķinu konto:</strong><br/>
                <span style="font-size: 11px;">${payment_iban}</span><br/>
                <span style="font-size: 11px;">${payment_bank}</span>
              </div>
              <div style="margin-top: 8px;">
                <div class="party-text">📧 <strong>${payment_email}</strong></div>
                <div class="party-text">☎️ ${payment_phone}</div>
              </div>
            </div>

            <div class="party">
              <div class="party-title">📥 Maksātājs (Dzīvokļa īpašnieks)</div>
              <div class="party-name">Dzīvoklis Nr. ${apt.number}</div>
              <div class="party-text"><strong>${apt.owner_name}</strong></div>
              <div class="party-text">${apt.apartment_address || 'Kr. Barona iela 78-14'}</div>
              <div style="margin-top: 12px;">
                <div class="party-text"><strong>Platība:</strong> ${apt.area} m²</div>
                <div class="party-text"><strong>Deklarēto personu skaits:</strong> ${apt.declared_persons || 1}</div>
                ${apt.registration_number ? `<div class="party-text"><strong>Reģ. numurs:</strong> ${apt.registration_number}</div>` : ''}
              </div>
            </div>
          </div>

          <!-- SERVICES TABLE -->
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Pakalpojums / Tarifs</th>
                <th style="width: 15%; text-align: center;">Daudzums</th>
                <th style="width: 15%; text-align: right;">Cena</th>
                <th style="width: 15%; text-align: right;">Summa bez PVN</th>
                <th style="width: 15%; text-align: right;">Kopā</th>
              </tr>
            </thead>
            <tbody>
              ${serviceRows}
            </tbody>
          </table>

          <!-- TOTALS -->
          <div class="totals">
            <div class="total-row">
              <span>Summa bez PVN:</span>
              <span>€${amountWithoutVat.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>PVN (21%):</span>
              <span>€${vatAmount.toFixed(2)}</span>
            </div>
            <div class="total-row bold">
              <span>KOPĀ APMAKSAI:</span>
              <span>€${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <!-- FINAL AMOUNT -->
          <div class="final-amount">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; opacity: 0.9;">
              Apmaksas summa (eiro un centi)
            </div>
            <div class="final-amount-value">€${totalAmount.toFixed(2)}</div>
          </div>

          <!-- DEBT WARNING -->
          ${previousDebtNote ? `
            <div class="debt-warning">
              <div class="debt-warning-title">💬 Parāda paskaidrojums</div>
              <div>${previousDebtNote}</div>
            </div>
          ` : ''}

          <!-- PAYMENT INFO -->
          <div class="payment-info">
            <div class="payment-info-title">💳 Maksājuma rekvizīti</div>
            <div class="payment-info-grid">
              <div style="font-size: 10px;">
                <div class="payment-info-label">Saņēmējs</div>
                <div class="payment-info-value">${building_name}</div>
              </div>
              <div style="font-size: 10px;">
                <div class="payment-info-label">Reģ. kods</div>
                <div class="payment-info-value">${building_code}</div>
              </div>
              <div style="font-size: 10px;">
                <div class="payment-info-label">IBAN</div>
                <div class="payment-info-value">${payment_iban}</div>
              </div>
              <div style="font-size: 10px;">
                <div class="payment-info-label">BANKA</div>
                <div class="payment-info-value">${payment_bank}</div>
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="footer-notes">
            <p><strong>ℹ️ Svarīga informācija:</strong></p>
            <p>• Veicot rēķina apmaksu, obligāti norādiet rēķina numuru: <strong>${invoiceNumber}</strong></p>
            <p>• Apmaksas termiņš: <strong>${new Date(dueDate).toLocaleDateString('lv-LV')}</strong></p>
            <p>• Visiem jautājumiem sazināties: ${payment_email} vai ${payment_phone}</p>
            <p><strong>Paldies par laicīgu maksājumu!</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // ===== ESOŠIE HOOKI (bez izmaiņām) =====
  
  const calculatePreviousDebt = (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    const previousDebts = invoices.filter(inv => {
      if (inv.apartment_id !== apartmentId) return false;
      if (inv.paid) return false;
      const [invYear, invMonth] = inv.period.split('-').map(Number);
      if (invYear < currentYear) return true;
      if (invYear === currentYear && invMonth < currentMonth) return true;
      return false;
    });
    const total = previousDebts.reduce((sum, inv) => sum + inv.amount, 0);
    return total;
  };

  const calculateOverpayment = async (apartmentId, currentPeriod) => {
    const [currentYear, currentMonth] = currentPeriod.split('-').map(Number);
    const previousMonth = currentMonth === 1 
      ? `${currentYear - 1}-12` 
      : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;
    
    try {
      const previousInvoice = invoices.find(inv => 
        inv.apartment_id === apartmentId && 
        inv.period === previousMonth
      );
      
      if (!previousInvoice) return 0;

      const finalAmount = parseFloat(previousInvoice.amount_with_vat) || 0;
      if (finalAmount < 0) {
        return Math.abs(finalAmount);
      }
      return 0;
    } catch (err) {
      console.error('Kļūda aprēķinot pārmaksu:', err);
      return 0;
    }
  };

  // ... pārējie esošie hook hooki paliek bez izmaiņām ...

  return {
    invoiceMonth, setInvoiceMonth,
    invoiceFromDate, setInvoiceFromDate,
    invoiceToDate, setInvoiceToDate,
    expandedInvoiceMonth, setExpandedInvoiceMonth,
    debtNoteForm, setDebtNoteForm,
    overpaymentForm, setOverpaymentForm,
    calculatePreviousDebt,
    calculateOverpayment,
    // ===== JAUNI EKSPORTI =====
    prepareInvoiceForDisplay,
    generateInvoiceHtmlNew,
    // ... pārējie esošie eksporti ...
  };
}