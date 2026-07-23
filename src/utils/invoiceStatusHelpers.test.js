import { buildBulkInvoiceStatusUpdatePayload } from './invoiceStatusHelpers';

describe('buildBulkInvoiceStatusUpdatePayload', () => {
  it('returns selected invoice ids together with the target paid state', () => {
    expect(buildBulkInvoiceStatusUpdatePayload(['1', '2', '3'], true)).toEqual({
      invoiceIds: ['1', '2', '3'],
      paid: true
    });
  });

  it('returns null when there are no selected invoices', () => {
    expect(buildBulkInvoiceStatusUpdatePayload([], false)).toBeNull();
  });
});
