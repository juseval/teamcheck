# TeamCheck Electron — Guía de Integración Completa

## Archivos nuevos que debes crear

| Archivo entregado | Destino |
|------------------|---------|
| `main.js` | `electron/main.js` (crear carpeta `electron/`) |
| `preload.js` | `electron/preload.js` |
| `useElectron.ts` | `src/hooks/useElectron.ts` |
| `screenshotService.ts` | `src/services/screenshotService.ts` |
| `ScreencastsPage.tsx` | `src/pages/ScreencastsPage.tsx` |

---

## PASO 1 — Instalar dependencias

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

---

## PASO 2 — package.json (agregar estas secciones)

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev":       "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build:win": "npm run build && electron-builder --win"
  },
  "build": {
    "appId": "com.teamcheck.app",
    "productName": "TeamCheck",
    "directories": { "output": "dist-electron" },
    "files": ["dist/**/*", "electron/**/*", "public/**/*"],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## PASO 3 — vite.config.ts

Agregar `base: './'`:

```ts
export default defineConfig({
  base: './',   // ← agregar
  plugins: [react()],
})
```

---

## PASO 4 — App.tsx (4 cambios)

### 4a. Imports nuevos

```tsx
import { useElectron, isElectron, electronSetScreenshotInterval } from './hooks/useElectron';
import { uploadScreenshot, enforceRetentionPolicy } from './services/screenshotService';
import ScreencastsPage from './pages/ScreencastsPage';
```

### 4b. Hook useElectron (junto a los demás hooks)

```tsx
useElectron({
  employeeId:   user?.id        ?? '',
  companyId:    user?.companyId ?? '',
  employeeName: user?.name      ?? '',
  isWorking:    user?.status === 'Working',
  onIdleDetected: handleIdleDetected,
  onUserReturned: handleUserReturned,
  onClockOutRequired: () => {
    if (user) handleEmployeeAction(user.id, 'Clock Out');
  },
  onScreenshot: async ({ data, employeeId, companyId }) => {
    await uploadScreenshot(data, employeeId, user?.name ?? '', companyId);
  },
});
```

### 4c. En handleEmployeeAction, cuando action === 'Clock In' (agregar al final del bloque Clock In)

```tsx
if (action === 'Clock In' && isElectron) {
  enforceRetentionPolicy(user.companyId); // limpieza asíncrona, no bloquea
}
```

### 4d. Página Screencasts en el <main>

```tsx
{currentPage === 'screencasts' && isAdminOrMaster && (
  <PageErrorBoundary>
    <ScreencastsPage
      employees={employees}
      companyId={user.companyId}
      currentUserRole={user.role}
    />
  </PageErrorBoundary>
)}
```

---

## PASO 5 — SideNav.tsx (agregar ítem)

```tsx
// Ícono inline para Screencasts
const ScreencastIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
  </svg>
);

// Dentro del bloque {userRole !== 'employee' && (...)}
// Agregar junto a Productividad:
<NavItem label="Screencasts" pageName="screencasts"
  currentPage={currentPage} onNavigate={onNavigate} onClick={onClose}>
  <ScreencastIcon />
</NavItem>
```

---

## PASO 6 — Firebase Storage (reglas)

En Firebase Console → Storage → Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /screenshots/{companyId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Índices en Firestore (colección `screenshots`):
- `companyId` ASC + `timestamp` DESC
- `companyId` ASC + `employeeId` ASC + `timestamp` DESC

---

## PASO 7 — Íconos requeridos

Crear en `public/`:
- `icon.png` — 512×512px (para la ventana)
- `icon.ico` — para Windows (convertir en https://convertio.co)
- `tray-icon.png` — 16×16px o 32×32px (para la barra de tareas)

---

## PASO 8 — Cambiar intervalo de screenshots (desde Settings)

Para hacer el intervalo editable desde la UI de Settings, agregar en `SettingsPage.tsx`:

```tsx
import { electronSetScreenshotInterval, isElectron } from '../hooks/useElectron';

// En el componente, un selector:
{isElectron && (
  <div>
    <label>Intervalo de screenshots</label>
    <select onChange={e => electronSetScreenshotInterval(Number(e.target.value))}>
      <option value={3 * 60 * 1000}>Cada 3 min</option>
      <option value={5 * 60 * 1000}>Cada 5 min</option>
      <option value={10 * 60 * 1000}>Cada 10 min</option>
      <option value={15 * 60 * 1000}>Cada 15 min</option>
      <option value={30 * 60 * 1000}>Cada 30 min</option>
    </select>
  </div>
)}
```

---

## PASO 9 — Ejecutar y construir

```bash
# Desarrollo (abre Vite + Electron simultáneamente)
npm run electron:dev

# Generar instalador .exe para Windows
npm run electron:build:win
# El instalador queda en dist-electron/
```

---

## Resumen de lo que ganas con Electron

| Feature | Web | Electron |
|---------|-----|----------|
| Screenshots | ❌ | ✅ cada 3-30 min |
| Inactividad con browser cerrado | ❌ | ✅ |
| Clock Out al suspender PC | ❌ | ✅ |
| Arrancar con Windows | ❌ | ✅ |
| Correr en segundo plano (tray) | ❌ | ✅ |
| Retención automática 30 días | ❌ | ✅ |