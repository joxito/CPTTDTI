export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validAreaCodes = ["809", "829", "849"]

export function formatPhoneNumber(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 10)
  const areaCode = digits.slice(0, 3)
  const middle = digits.slice(3, 6)
  const last = digits.slice(6, 10)

  let formatted = areaCode
  if (middle) formatted += `-${middle}`
  if (last) formatted += `-${last}`

  return formatted
}

export function initialsFromName(name: string | null | undefined) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "")
  return initials.join("") || "?"
}

export function formatCedula(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 11)
  const office = digits.slice(0, 3)
  const sequence = digits.slice(3, 10)
  const checkDigit = digits.slice(10, 11)

  let formatted = office
  if (sequence) formatted += `-${sequence}`
  if (checkDigit) formatted += `-${checkDigit}`

  return formatted
}
