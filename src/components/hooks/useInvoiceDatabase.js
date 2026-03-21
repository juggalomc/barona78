/**
 * Datubāzes operācijas
 * - Save debt note
 * - Save/update overpayment
 * - Toggle paid status
 * - Delete invoices
 */

export async function saveDebtNote(supabase, invoiceId, note, fetchData, showToast) {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ previous_debt_note: note })
      .eq('id', invoiceId);
    
    if (error) throw error;
    fetchData();
    showToast('✓ Parāda paskaidrojums saglabāts');
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}

export async function saveOverpayment(supabase, invoices, invoiceId, amount, fetchData, showToast) {
  try {
    if (!invoiceId || !amount) {
      showToast('Izvēlieties rēķinu un ievadiet summu', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      showToast('Pārmaksa jābūt lielāka par 0', 'error');
      return;
    }

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      showToast('Rēķins nav atrasts', 'error');
      return;
    }

    let invoiceDetails = [];
    if (invoice.invoice_details) {
      try {
        invoiceDetails = JSON.parse(invoice.invoice_details);
      } catch (e) {
        invoiceDetails = [];
      }
    }

    invoiceDetails = invoiceDetails.filter(d => d.type !== 'overpayment');

    invoiceDetails.push({
      tariff_id: null,
      tariff_name: '💰 Pārmaksa',
      amount_without_vat: -numAmount,
      vat_rate: 0,
      vat_amount: 0,
      type: 'overpayment'
    });

    let newAmountWithoutVat = 0;
    let newVatAmount = 0;
    
    invoiceDetails.forEach(detail => {
      if (detail.type !== 'overpayment') {
        newAmountWithoutVat += parseFloat(detail.amount_without_vat) || 0;
        newVatAmount += parseFloat(detail.vat_amount) || 0;
      } else {
        newAmountWithoutVat -= numAmount;
      }
    });

    const newAmountWithVat = Math.round((newAmountWithoutVat + newVatAmount) * 100) / 100;

    const { error } = await supabase
      .from('invoices')
      .update({
        amount: newAmountWithVat,
        amount_without_vat: newAmountWithoutVat,
        amount_with_vat: newAmountWithVat,
        overpayment_amount: numAmount,
        invoice_details: JSON.stringify(invoiceDetails)
      })
      .eq('id', invoiceId);

    if (error) throw error;
    fetchData();
    showToast('✓ Pārmaksa saglabāta uz rēķina');
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}

export async function updateOverpayment(supabase, invoices, invoiceId, newAmount, fetchData, showToast) {
  try {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      showToast('Rēķins nav atrasts', 'error');
      return;
    }

    let invoiceDetails = [];
    if (invoice.invoice_details) {
      try {
        invoiceDetails = JSON.parse(invoice.invoice_details);
      } catch (e) {
        invoiceDetails = [];
      }
    }

    invoiceDetails = invoiceDetails.filter(d => d.type !== 'overpayment');

    let updatedAmountWithoutVat = 0;
    let updatedVatAmount = 0;

    invoiceDetails.forEach(detail => {
      updatedAmountWithoutVat += parseFloat(detail.amount_without_vat) || 0;
      updatedVatAmount += parseFloat(detail.vat_amount) || 0;
    });

    if (newAmount > 0) {
      invoiceDetails.push({
        tariff_id: null,
        tariff_name: '💰 Pārmaksa',
        amount_without_vat: -newAmount,
        vat_rate: 0,
        vat_amount: 0,
        type: 'overpayment'
      });
      updatedAmountWithoutVat -= newAmount;
    }

    const updatedAmountWithVat = Math.round((updatedAmountWithoutVat + updatedVatAmount) * 100) / 100;

    const { error } = await supabase
      .from('invoices')
      .update({
        amount: updatedAmountWithVat,
        amount_without_vat: updatedAmountWithoutVat,
        amount_with_vat: updatedAmountWithVat,
        overpayment_amount: newAmount,
        invoice_details: JSON.stringify(invoiceDetails)
      })
      .eq('id', invoiceId);

    if (error) throw error;
    fetchData();
    showToast('✓ Pārmaksa atjaunināta');
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}

export async function deleteOverpayment(supabase, invoices, invoiceId, fetchData, showToast) {
  if (!window.confirm('Dzēst pārmaksu?')) return;
  
  try {
    await updateOverpayment(supabase, invoices, invoiceId, 0, fetchData, showToast);
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}

export async function toggleInvoicePaid(supabase, invoiceId, currentStatus, fetchData, showToast) {
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
}

export async function deleteInvoice(supabase, id, fetchData, showToast) {
  if (!window.confirm('Izdzēst rēķinu?')) return;
  try {
    await supabase.from('invoices').delete().eq('id', id);
    fetchData();
    showToast('✓ Izdzēsts');
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}

export async function deleteInvoices(supabase, ids, fetchData, showToast) {
  if (!window.confirm(`Izdzēst ${ids.length} rēķinus?`)) return;
  try {
    for (const id of ids) {
      await supabase.from('invoices').delete().eq('id', id);
    }
    fetchData();
    showToast(`✓ Izdzēsti ${ids.length} rēķini`);
  } catch (error) {
    showToast('Kļūda: ' + error.message, 'error');
  }
}
