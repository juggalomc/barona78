import { calculateApartmentFinancials, calculatePositionPayments } from './summaryCalculations';

describe('summaryCalculations partial payments (FIFO)', () => {
  const invoices = [
    {
      id: 'inv-1',
      apartment_id: 'apt-1',
      period: '2026-08',
      amount: 100,
      paid_amount: 40,
      paid: false,
      invoice_details: JSON.stringify([
        { type: 'tariff', tariff_name: 'Apsaimniekošana', amount_without_vat: 40, vat_amount: 10 }, // total 50
        { type: 'waste', amount_without_vat: 40, vat_amount: 10 } // total 50
      ])
    },
    {
      id: 'inv-2',
      apartment_id: 'apt-1',
      period: '2026-07',
      amount: 80,
      paid_amount: 80,
      paid: true,
      invoice_details: JSON.stringify([
        { type: 'tariff', tariff_name: 'Apsaimniekošana', amount_without_vat: 80, vat_amount: 0 } // total 80
      ])
    }
  ];

  describe('calculateApartmentFinancials', () => {
    it('applies payments in FIFO order to positions', () => {
      const result = calculateApartmentFinancials('apt-1', invoices);
      
      // Total payments: 40 (inv-1) + 80 (inv-2) = 120
      // Charges chronologically:
      // 1. 2026-07 Apsaimniekošana: total = 80 (fully paid, remains 40)
      // 2. 2026-08 Apsaimniekošana: total = 50 (partially paid, gets 40, remains 0)
      // 3. 2026-08 Waste: total = 50 (unpaid, gets 0)
      
      // Apsaimniekošana: totalCharged = 130, totalPaid = 120, currentDebt = 10
      const aps = result.find(r => r.name === 'Apsaimniekošana');
      expect(aps.totalCharged).toBe(130);
      expect(aps.totalPaid).toBe(120);
      expect(aps.currentDebt).toBe(10);

      // Waste: totalCharged = 50, totalPaid = 0, currentDebt = 50
      const waste = result.find(r => r.name === '♻️ Atkritumu izvešana');
      expect(waste.totalCharged).toBe(50);
      expect(waste.totalPaid).toBe(0);
      expect(waste.currentDebt).toBe(50);
    });
  });

  describe('calculatePositionPayments', () => {
    it('calculates position payments based on FIFO allocation for the period', () => {
      const result = calculatePositionPayments('2026-08', invoices);
      
      // For period 2026-08, charges:
      // - Apsaimniekošana: total 50, paid 40
      // - Waste: total 50, paid 0
      const aps = result.find(r => r.name === 'Apsaimniekošana');
      expect(aps.invoiced).toBe(50);
      expect(aps.paid).toBe(40);

      const waste = result.find(r => r.name === '♻️ Atkritumu izvešana');
      expect(waste.invoiced).toBe(50);
      expect(waste.paid).toBe(0);
    });
  });
});
