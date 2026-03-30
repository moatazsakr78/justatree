/**
 * Note template resolution for safe automations.
 * Replaces placeholders like {day_name} and {date} with actual values.
 */

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function resolveNoteTemplate(template: string, timezone = 'Africa/Cairo'): string {
  if (!template) return ''

  const now = new Date()

  // Get Cairo date parts
  const cairoDateStr = now.toLocaleDateString('en-US', { timeZone: timezone })
  const cairoDate = new Date(cairoDateStr)
  const dayIndex = cairoDate.getDay() // 0=Sun..6=Sat

  // Format date as dd/mm/yyyy
  const formattedDate = now.toLocaleDateString('ar-EG', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  return template
    .replace(/\{day_name\}/g, ARABIC_DAYS[dayIndex])
    .replace(/\{date\}/g, formattedDate)
}
