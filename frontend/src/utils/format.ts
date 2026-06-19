import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

// Format currency (Thai Baht)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format number with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

// Format date (Thai)
export function formatDate(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY');
}

// Format date time (Thai)
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
}

// Format short date
export function formatShortDate(date: string | Date): string {
  return dayjs(date).format('DD MMM YY');
}
