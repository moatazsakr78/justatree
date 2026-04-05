// Banner Editor Constants

export const PRESET_GRADIENTS = [
  { name: 'غابة عميقة', value: 'linear-gradient(135deg, #1B3A2D 0%, #2D6A4F 50%, #1B4332 100%)' },
  { name: 'زمرد', value: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #1B3A2D 100%)' },
  { name: 'ليل الغابة', value: 'linear-gradient(135deg, #1A2F23 0%, #1B3A2D 50%, #2D6A4F 100%)' },
  { name: 'ذهبي دافئ', value: 'linear-gradient(135deg, #92400E 0%, #B45309 50%, #D97706 100%)' },
  { name: 'أزرق ملكي', value: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #1E40AF 100%)' },
  { name: 'أحمر أنيق', value: 'linear-gradient(135deg, #5d1f1f 0%, #7f1d1d 50%, #991b1b 100%)' },
  { name: 'بنفسجي', value: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)' },
  { name: 'رمادي عصري', value: 'linear-gradient(135deg, #1F2937 0%, #374151 50%, #4B5563 100%)' },
];

export const REFERENCE_CANVAS = {
  width: 1280,
  height: 480,
};

export const DEVICE_PRESETS = {
  desktop: { width: 1280, height: 480, label: 'كمبيوتر' },
  tablet: { width: 900, height: 360, label: 'تابلت' },
  mobile: { width: 430, height: 300, label: 'هاتف' },
};

export const DEFAULT_ELEMENTS = {
  text: {
    type: 'text' as const,
    position: { x: 40, y: 40 },
    size: { width: 30, height: 10 },
    rotation: 0,
    zIndex: 20,
    opacity: 1,
    content: {
      text: 'نص جديد',
      fontSize: 36,
      fontWeight: '700',
      color: '#FFFFFF',
      textAlign: 'right' as const,
    },
  },
  image: {
    type: 'image' as const,
    position: { x: 10, y: 15 },
    size: { width: 25, height: 60 },
    rotation: 0,
    zIndex: 15,
    opacity: 1,
    content: {
      src: '',
      alt: 'صورة منتج',
      objectFit: 'contain' as const,
    },
  },
  badge: {
    type: 'badge' as const,
    position: { x: 65, y: 15 },
    size: { width: 12, height: 5 },
    rotation: 0,
    zIndex: 25,
    opacity: 1,
    content: {
      badgeText: 'شارة جديدة',
      backgroundColor: '#D4A57430',
      borderColor: '#D4A57450',
      textColor: '#D4A574',
    },
  },
  cta_button: {
    type: 'cta_button' as const,
    position: { x: 60, y: 70 },
    size: { width: 14, height: 7 },
    rotation: 0,
    zIndex: 25,
    opacity: 1,
    content: {
      buttonText: 'تسوق الآن',
      buttonBgColor: '#D4A574',
      buttonTextColor: '#1A2F23',
      borderRadius: 50,
    },
  },
};
