// Mapeos tomados de la plantilla oficial "Matriz de Asistencias Técnicas"
// (hoja METADATA) del Viceministerio de Fomento a las Mipymes, para que la
// exportación pueda pegarse ahí sin ajustes.

export const regionByProvince: Record<string, string> = {
  Azua: "Del Valle",
  Bahoruco: "Enriquillo",
  Barahona: "Enriquillo",
  Dajabón: "Cibao Noroeste",
  "Distrito Nacional": "Ozama",
  Duarte: "Cibao Noroeste",
  "El Seibo": "Yuma",
  "Elías Piña": "Del Valle",
  Espaillat: "Cibao Norte",
  "Hato Mayor": "Higuamo",
  "Hermanas Mirabal": "Cibao Nordeste",
  Independencia: "Enriquillo",
  "La Altagracia": "Yuma",
  "La Romana": "Yuma",
  "La Vega": "Cibao Sur",
  "María Trinidad Sánchez": "Cibao Nordeste",
  "Monseñor Nouel": "Cibao Norte",
  "Monte Cristi": "Cibao Noroeste",
  "Monte Plata": "Higuamo",
  Pedernales: "Enriquillo",
  Peravia: "Valdesia",
  "Puerto Plata": "Cibao Norte",
  Samaná: "Cibao Nordeste",
  "San Cristóbal": "Valdesia",
  "San José de Ocoa": "Valdesia",
  "San Juan": "Del Valle",
  "San Pedro de Macorís": "Higuamo",
  "Sánchez Ramírez": "Cibao Sur",
  Santiago: "Cibao Norte",
  "Santiago Rodríguez": "Cibao Noroeste",
  "Santo Domingo": "Ozama",
  Valverde: "Cibao Noroeste",
}

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const trimesterByMonthIndex = [
  "1er Trimestre",
  "1er Trimestre",
  "1er Trimestre",
  "2do Trimestre",
  "2do Trimestre",
  "2do Trimestre",
  "3er Trimestre",
  "3er Trimestre",
  "3er Trimestre",
  "4to Trimestre",
  "4to Trimestre",
  "4to Trimestre",
]

export function monthNameFromDate(isoDate: string) {
  const monthIndex = new Date(isoDate).getMonth()
  return monthNames[monthIndex]
}

export function trimesterFromDate(isoDate: string) {
  const monthIndex = new Date(isoDate).getMonth()
  return trimesterByMonthIndex[monthIndex]
}
