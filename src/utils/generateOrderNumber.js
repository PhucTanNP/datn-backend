/**
 * Generate order number: DRC-2024-00001
 */
const generateOrderNumber = async (prisma) => {
  const year = new Date().getFullYear();
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: `DRC-${year}-`,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let nextNum = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }

  return `DRC-${year}-${String(nextNum).padStart(5, '0')}`;
};

module.exports = generateOrderNumber;
