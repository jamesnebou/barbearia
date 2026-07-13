export function paidAmount(record) {
  if (!record) return 0;
  if (Array.isArray(record.pagamentos)) {
    return record.pagamentos
      .filter((payment) => payment.status === "pago")
      .reduce((total, payment) => total + Number(payment.valor || 0), 0);
  }
  return Number(record.valor_pago || 0);
}
