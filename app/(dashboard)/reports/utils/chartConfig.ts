// Chart theme configuration for Recharts
// Matches the dark theme of Just A Tree POS

export const CHART_COLORS = {
  primary: '#3B82F6',    // Blue - main accent
  success: '#10B981',    // Green - positive values
  warning: '#F59E0B',    // Orange - warnings
  danger: '#EF4444',     // Red - negative values
  purple: '#8B5CF6',     // Purple - secondary
  cyan: '#06B6D4',       // Cyan - info
  pink: '#EC4899',       // Pink - accent
  indigo: '#6366F1',     // Indigo - accent
  teal: '#14B8A6',       // Teal - accent
  orange: '#F97316',     // Orange - accent
};

// Colors for Pie/Bar charts with multiple categories
export const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange/Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Violet
  '#0EA5E9', // Sky blue
];

// Dark theme configuration
export const DARK_THEME = {
  backgroundColor: '#151C25',
  textColor: '#8B9DB7',
  textColorMuted: '#8B9DB7',
  gridColor: 'rgba(148,163,184,0.08)',
  tooltipBackground: '#151C25',
  tooltipBorder: 'rgba(148,163,184,0.08)',
  cardBackground: '#151C25',
  cardBorder: 'rgba(148,163,184,0.08)',
};

// Get chart configuration for Recharts components
export const getChartConfig = () => ({
  tooltip: {
    contentStyle: {
      backgroundColor: DARK_THEME.tooltipBackground,
      border: `1px solid ${DARK_THEME.tooltipBorder}`,
      borderRadius: '8px',
      color: DARK_THEME.textColor,
      direction: 'rtl' as const,
      padding: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    },
    labelStyle: {
      color: DARK_THEME.textColor,
      fontWeight: 600,
      marginBottom: '4px',
    },
    itemStyle: {
      color: DARK_THEME.textColor,
    },
  },
  cartesianGrid: {
    strokeDasharray: '3 3',
    stroke: DARK_THEME.gridColor,
    vertical: false,
  },
  xAxis: {
    tick: { fill: DARK_THEME.textColorMuted, fontSize: 12 },
    axisLine: { stroke: DARK_THEME.gridColor },
    tickLine: { stroke: DARK_THEME.gridColor },
  },
  yAxis: {
    tick: { fill: DARK_THEME.textColorMuted, fontSize: 12 },
    axisLine: { stroke: DARK_THEME.gridColor },
    tickLine: { stroke: DARK_THEME.gridColor },
  },
  legend: {
    wrapperStyle: {
      color: DARK_THEME.textColor,
      direction: 'rtl' as const,
    },
  },
});

// Format numbers for Arabic display
export const formatNumberAr = (value: number): string => {
  return value.toLocaleString('ar-EG');
};

// Format currency for Arabic display
export const formatCurrencyAr = (value: number): string => {
  return `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
};

// Format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Arabic day names
export const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

// Arabic month names
export const ARABIC_MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

// Get Arabic day name from day number (0 = Sunday)
export const getArabicDayName = (dayNumber: number): string => {
  return ARABIC_DAY_NAMES[dayNumber] || '';
};

// Format hour range for Arabic display
export const formatHourRange = (hour: number): string => {
  const startHour = hour;
  const endHour = hour === 23 ? 0 : hour + 1;
  const startPeriod = startHour < 12 ? 'ص' : 'م';
  const endPeriod = endHour < 12 || endHour === 0 ? 'ص' : 'م';
  const displayStartHour = startHour === 0 ? 12 : startHour > 12 ? startHour - 12 : startHour;
  const displayEndHour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;

  return `${displayStartHour}:00 ${startPeriod} - ${displayEndHour}:00 ${endPeriod}`;
};

// Payment method translations
export const PAYMENT_METHOD_TRANSLATIONS: Record<string, string> = {
  'cash': 'نقدي',
  'نقدي': 'نقدي',
  'card': 'بطاقة',
  'بطاقة': 'بطاقة',
  'credit': 'آجل',
  'آجل': 'آجل',
  'transfer': 'تحويل',
  'تحويل': 'تحويل',
  'check': 'شيك',
  'شيك': 'شيك',
  'wallet': 'محفظة',
  'محفظة': 'محفظة',
  'instapay': 'انستاباي',
  'vodafone_cash': 'فودافون كاش',
};

export const getPaymentMethodAr = (method: string): string => {
  return PAYMENT_METHOD_TRANSLATIONS[method?.toLowerCase()] || method || 'غير محدد';
};
