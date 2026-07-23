export const buildBulkInvoiceStatusUpdatePayload = (invoiceIds, paid) => {
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return null;
  }

  return {
    invoiceIds: invoiceIds.filter(Boolean),
    paid
  };
};
