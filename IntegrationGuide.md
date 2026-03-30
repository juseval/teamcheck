# ─────────────────────────────────────────────────────────────────────────────
# GUÍA DE INTEGRACIÓN — Sistema de Productividad / Inactividad
# ─────────────────────────────────────────────────────────────────────────────

## Archivos nuevos que debes crear / copiar en tu proyecto

| Archivo entregado              | Destino en tu proyecto                        |
|-------------------------------|-----------------------------------------------|
| useIdleDetection.ts           | src/hooks/useIdleDetection.ts                 |
| ProductivityPage.tsx          | src/pages/ProductivityPage.tsx                |
| IdleAlertToast.tsx            | src/components/IdleAlertToast.tsx             |
| apiService_idleLog_additions  | (instrucciones abajo)                         |

────────────────────────────────────────────────────────────────────────────────
## PASO 1 — types.ts  →  agrega IdleLogEntry

Abre `src/types.ts` y añade al final (o donde estén los otros tipos):

```ts
export interface IdleLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  idleStartedAt: number;   // epoch ms — cuando comenzó la inactividad
  resumedAt?: number;      // epoch ms — cuando el usuario volvió a ser activo
  durationSeconds?: number;
  thresholdMinutes: number; // umbral aleatorio que se usó ese ciclo
  createdAt: number;
}
```

────────────────────────────────────────────────────────────────────────────────
## PASO 2 — apiService.ts  →  agrega los 4 métodos de idle

Dentro de `createRealApi()`, después del último método existente, pega:

```ts
addIdleLogEntry: async (entry: Omit<IdleLogEntry, 'id' | 'createdAt'>) => {
  const ref = db!.collection('idleLog').doc();
  const doc = { ...entry, id: ref.id, createdAt: Date.now() };
  await ref.set(doc);
  return doc as IdleLogEntry;
},

updateIdleLogEntry: async (id: string, updates: Partial<IdleLogEntry>) => {
  await db!.collection('idleLog').doc(id).update(updates);
},

getIdleLog: async (): Promise<IdleLogEntry[]> => {
  const cid = await getCachedCompanyId();
  if (!cid) return [];
  const snap = await db!.collection('idleLog')
    .where('companyId', '==', cid)
    .orderBy('idleStartedAt', 'desc')
    .limit(500)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as IdleLogEntry));
},

streamIdleLog: (callback: (entries: IdleLogEntry[]) => void) => {
  const user = auth!.currentUser;
  if (!user) return () => {};
  let unsub = () => {};
  const setup = (cid: string) => {
    unsub = db!.collection('idleLog')
      .where('companyId', '==', cid)
      .orderBy('idleStartedAt', 'desc')
      .limit(500)
      .onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as IdleLogEntry))),
        _err => {
          unsub = db!.collection('idleLog')
            .where('companyId', '==', cid)
            .limit(500)
            .onSnapshot(snap =>
              callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as IdleLogEntry))
                .sort((a, b) => b.idleStartedAt - a.idleStartedAt))
            );
        }
      );
  };
  if (_companyIdCache?.uid === user.uid) setup(_companyIdCache.companyId);
  else db!.collection('employees').doc(user.uid).get().then(doc => {
    const cid = doc.data()?.companyId;
    if (cid) { _companyIdCache = { uid: user.uid, companyId: cid }; setup(cid); }
  });
  return () => unsub();
},
```

Dentro de `createMockApi()`, añade:

```ts
addIdleLogEntry: async (entry: any) => ({ ...entry, id: String(Date.now()), createdAt: Date.now() }),
updateIdleLogEntry: async (_id: string, _u: any) => {},
getIdleLog: async () => [] as IdleLogEntry[],
streamIdleLog: (_cb: any) => () => {},
```

Al final del archivo, en el bloque `export const { ... } = api;`, agrega:

```
addIdleLogEntry, updateIdleLogEntry, getIdleLog, streamIdleLog,
```

────────────────────────────────────────────────────────────────────────────────
## PASO 3 — SideNav.tsx  →  agrega ítem "Productividad"

Busca el array/objeto de navegación (donde están 'tracker', 'dashboard', etc.)
y agrega una entrada nueva para admin y master:

```tsx
// Ejemplo — ajusta según tu estructura real
{ id: 'productivity', label: 'Productividad', icon: '📊', roles: ['admin', 'master'] },
```

Si usas íconos SVG de Icons.tsx, puedes usar el ícono de gráfica existente o
añadir uno nuevo. El id de la página debe ser exactamente `'productivity'`.

────────────────────────────────────────────────────────────────────────────────
## PASO 4 — App.tsx  →  6 cambios

### 4a. Importaciones nuevas (arriba del todo, junto a los demás imports)

```tsx
import { useIdleDetection, IdleEvent } from './hooks/useIdleDetection';
import { addIdleLogEntry, updateIdleLogEntry, streamIdleLog } from './services/apiService';
import { IdleLogEntry } from './types';
import ProductivityPage from './pages/ProductivityPage';
import IdleAlertToast from './components/IdleAlertToast';
```

### 4b. Estado nuevo (dentro de AppContent, junto a los demás useState)

```tsx
const [idleLog, setIdleLog] = useState<IdleLogEntry[]>([]);
const idleAlertTriggerRef = useRef<((event: IdleEvent) => void) | null>(null);
const currentIdleEntryRef = useRef<string | null>(null); // id del entry "en curso"
```

### 4c. Stream de idleLog (dentro del useEffect que escucha companyId)

Dentro del `useEffect` que ya tienes con `user?.companyId`, añade:

```tsx
const unsubIdle = streamIdleLog(setIdleLog);
// en el return de cleanup:
return () => {
  unsubEmployeesRef.current();
  unsubLogRef.current();
  unsubIdle();           // ← añade esta línea
};
```

### 4d. Handler de inactividad detectada (junto a los demás handlers)

```tsx
const handleIdleDetected = async (event: IdleEvent) => {
  try {
    const entry = await addIdleLogEntry({
      employeeId: event.employeeId,
      employeeName: event.employeeName,
      companyId: event.companyId,
      idleStartedAt: event.idleStartedAt,
      thresholdMinutes: event.thresholdMinutes,
    });
    currentIdleEntryRef.current = entry.id;
  } catch (e) { console.warn('idle log error', e); }
};

const handleUserReturned = async () => {
  if (currentIdleEntryRef.current) {
    const resumedAt = Date.now();
    const entry = idleLog.find(e => e.id === currentIdleEntryRef.current);
    const durationSeconds = entry
      ? Math.floor((resumedAt - entry.idleStartedAt) / 1000)
      : undefined;
    await updateIdleLogEntry(currentIdleEntryRef.current, { resumedAt, durationSeconds });
    currentIdleEntryRef.current = null;
  }
};
```

### 4e. Hook de inactividad (justo después de los demás hooks/effects)

```tsx
const isWorking = user?.status === 'Working';

useIdleDetection({
  employeeId: user?.id ?? '',
  employeeName: user?.name ?? '',
  companyId: user?.companyId ?? '',
  isActive: isWorking,
  onIdleDetected: handleIdleDetected,
  onIdleAlert: (event) => {
    // Solo notifica visualmente a admin/master
    if (user?.role === 'admin' || user?.role === 'master') {
      idleAlertTriggerRef.current?.(event);
    }
    // Si el propio empleado es admin/master, también se loguea
  },
});

// Registrar retorno al trabajo: cuando el usuario mueve el mouse/tecla
// (el hook resetea solo, pero necesitamos cerrar el entry)
useEffect(() => {
  if (!isWorking) return;
  const handleReturn = () => handleUserReturned();
  window.addEventListener('mousemove', handleReturn, { once: true });
  return () => window.removeEventListener('mousemove', handleReturn);
}, [idleLog]); // re-subscribe cuando el log cambia
```

### 4f. JSX — página + toast (dentro del bloque `<main>` y fuera de él)

Dentro de `<main>`, junto a los demás bloques de página:

```tsx
{currentPage === 'productivity' && isAdminOrMaster && (
  <PageErrorBoundary>
    <ProductivityPage
      employees={employees}
      idleLog={idleLog}
      currentUserRole={user.role}
    />
  </PageErrorBoundary>
)}
```

Justo antes del cierre del div principal `</div>` (antes de los modales):

```tsx
<IdleAlertToast
  registerTrigger={(fn) => { idleAlertTriggerRef.current = fn; }}
  onViewProductivity={() => setCurrentPage('productivity')}
/>
```

────────────────────────────────────────────────────────────────────────────────
## PASO 5 — Firestore: índice compuesto (opcional pero recomendado)

En Firebase Console → Firestore → Índices → Crear índice compuesto:

  Colección: idleLog
  Campo 1: companyId   ASC
  Campo 2: idleStartedAt DESC

Sin el índice, el sistema usa el fallback automático (sin ordenar en servidor).

────────────────────────────────────────────────────────────────────────────────
¡Listo! Con estos 5 pasos el sistema de productividad queda completamente
integrado con tu arquitectura Firebase + React existente.