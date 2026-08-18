# Plantilla de Dashboard

Plantilla de proyecto para un panel de administración, construida con **Vite + React + TypeScript**, **Tailwind CSS v4** y componentes al estilo **shadcn/ui**.

Está inspirada en la estructura visual de dashboards modernos (sidebar, KPIs, gráficos, tablas, actividad), pero todo el código, los componentes y los datos de ejemplo fueron escritos desde cero para este proyecto — no contiene código ni assets de ningún template comercial.

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) (vía `@tailwindcss/vite`)
- Componentes UI propios al estilo [shadcn/ui](https://ui.shadcn.com/) (Radix UI + `class-variance-authority`)
- [React Router](https://reactrouter.com/) para las rutas
- [Recharts](https://recharts.org/) para los gráficos
- [lucide-react](https://lucide.dev/) para los íconos

## Cómo empezar

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`.

Para generar el build de producción:

```bash
npm run build
npm run preview
```

## Estructura del proyecto

```
src/
  components/
    dashboard/    -> componentes propios del dashboard (KPIs, gráficos, tablas, actividad)
    layout/        -> sidebar, topbar, layout general, selector de tema
    ui/            -> componentes base reutilizables (button, card, table, badge, etc.)
  data/
    dashboard-data.ts -> datos de ejemplo (mock). Reemplazalos por datos reales de tu API.
  hooks/
    use-theme.tsx  -> lógica de tema claro/oscuro/sistema
  pages/
    dashboard.tsx  -> página principal
    orders.tsx, customers.tsx, analytics.tsx, products.tsx, settings.tsx -> páginas de ejemplo listas para completar
  App.tsx           -> definición de rutas
  main.tsx          -> punto de entrada
```

## Cómo extender la plantilla

1. **Agregar una página nueva**: creá un archivo en `src/pages/`, agregalo como `<Route>` en `src/App.tsx` y un link en `src/components/layout/sidebar.tsx`.
2. **Conectar datos reales**: reemplazá el contenido de `src/data/dashboard-data.ts` por llamadas a tu API (podés usar `fetch`, React Query, etc.).
3. **Agregar más componentes de UI**: seguí el patrón de los archivos en `src/components/ui/` (basados en Radix UI + Tailwind).
4. **Cambiar colores del tema**: editá las variables CSS en `src/index.css` (sección `:root` para claro, `.dark` para oscuro).

## Nota sobre persistencia de tema

El selector de tema (claro/oscuro/sistema) guarda la preferencia en memoria durante la sesión. Si querés que persista entre recargas, podés guardarla en `localStorage` dentro de `src/hooks/use-theme.tsx`.
