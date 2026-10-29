const HEADER_OFFSET = 80

export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector)
  if (!target) return

  const targetTop = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' })
}
