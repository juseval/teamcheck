// src/services/screenshotService.ts
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface Screenshot {
  id:           string;
  employeeId:   string;
  employeeName: string;
  companyId:    string;
  timestamp:    number;   // ms epoch
  storageUrl:   string;   // URL pública de Firebase Storage
  storagePath:  string;   // ruta interna para poder borrar
}

// ── Constantes ────────────────────────────────────────────────────────────────
const COLLECTION     = 'screenshots';
const RETENTION_DAYS = 30;

// ── Verificar que Storage esté disponible ─────────────────────────────────────
function checkStorageAvailable(): boolean {
  try {
    getStorage();
    return true;
  } catch (err) {
    console.error(
      '[Screenshots] ❌ Firebase Storage NO está habilitado.\n' +
      'Ve a https://console.firebase.google.com → tu proyecto → Storage → "Get Started"\n' +
      'Error:', (err as Error).message
    );
    return false;
  }
}

// ── Subir captura ─────────────────────────────────────────────────────────────
/**
 * Sube un screenshot (base64 JPEG) a Firebase Storage y guarda los metadatos
 * en Firestore.  Se llama desde App.tsx → useElectron → onScreenshot.
 */
export async function uploadScreenshot(
  base64Data:   string,
  employeeId:   string,
  employeeName: string,
  companyId:    string,
): Promise<void> {
  // Validar datos
  if (!base64Data || !employeeId || !companyId) {
    console.warn('[Screenshots] ⚠️ Datos incompletos, ignorando captura:', {
      hasData: !!base64Data,
      employeeId,
      companyId,
    });
    return;
  }

  if (!checkStorageAvailable()) return;

  const storage = getStorage();
  const db      = getFirestore();

  const timestamp   = Date.now();
  const storagePath = `screenshots/${companyId}/${employeeId}/${timestamp}.jpg`;

  // Quitar prefijo data:image/jpeg;base64, si viene con él
  const raw = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  console.log(`[Screenshots] 📤 Subiendo captura... (${Math.round(raw.length * 0.75 / 1024)}KB)`);

  try {
    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, raw, 'base64', { contentType: 'image/jpeg' });

    const storageUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, COLLECTION), {
      employeeId,
      employeeName,
      companyId,
      timestamp,
      storageUrl,
      storagePath,
      createdAt: Timestamp.now(),
    });

    console.log('[Screenshots] ✅ Captura subida correctamente:', storagePath);
  } catch (err: any) {
    // Errores comunes y sus soluciones
    const msg = err.message || err.code || String(err);

    if (msg.includes('storage/unauthorized') || msg.includes('storage/unauthenticated')) {
      console.error(
        '[Screenshots] ❌ Permisos de Storage denegados.\n' +
        'Revisa las reglas de seguridad en Firebase Console → Storage → Rules.\n' +
        'Reglas para desarrollo:\n' +
        '  rules_version = \'2\';\n' +
        '  service firebase.storage {\n' +
        '    match /b/{bucket}/o {\n' +
        '      match /screenshots/{allPaths=**} {\n' +
        '        allow read, write: if request.auth != null;\n' +
        '      }\n' +
        '    }\n' +
        '  }'
      );
    } else if (msg.includes('storage/unknown') || msg.includes('ERR_NAME_NOT_RESOLVED')) {
      console.error(
        '[Screenshots] ❌ Firebase Storage no está habilitado en este proyecto.\n' +
        'Ve a https://console.firebase.google.com → tu proyecto → Storage → "Get Started"'
      );
    } else if (msg.includes('storage/quota-exceeded')) {
      console.error('[Screenshots] ❌ Se superó la cuota de Firebase Storage.');
    } else {
      console.error('[Screenshots] ❌ Error al subir captura:', msg);
    }
  }
}

// ── Obtener capturas de la empresa ────────────────────────────────────────────
export async function getCompanyScreenshots(
  companyId:  string,
  from:       number,
  to:         number,
  maxResults: number = 200,
): Promise<Screenshot[]> {
  const db = getFirestore();

  try {
    const q = query(
      collection(db, COLLECTION),
      where('companyId',  '==', companyId),
      where('timestamp',  '>=', from),
      where('timestamp',  '<=', to),
      orderBy('timestamp', 'desc'),
      limit(maxResults),
    );

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Screenshot));
  } catch (err: any) {
    // Fallback sin orderBy si falta índice
    if (err.message?.includes('index')) {
      console.warn('[Screenshots] Índice faltante, usando fallback. Crea el índice desde el link en la consola.');
      const q = query(
        collection(db, COLLECTION),
        where('companyId', '==', companyId),
        where('timestamp', '>=', from),
        where('timestamp', '<=', to),
        limit(maxResults),
      );
      const snap = await getDocs(q);
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Screenshot))
        .sort((a, b) => b.timestamp - a.timestamp);
    }
    console.error('[Screenshots] Error al obtener capturas:', err.message);
    return [];
  }
}

// ── Política de retención (30 días) ──────────────────────────────────────────
export async function enforceRetentionPolicy(companyId: string): Promise<void> {
  const db      = getFirestore();

  let storage: ReturnType<typeof getStorage>;
  try {
    storage = getStorage();
  } catch {
    // Storage no habilitado — nada que limpiar
    return;
  }

  const cutoff = Date.now() - RETENTION_DAYS * 86_400_000;

  try {
    const q = query(
      collection(db, COLLECTION),
      where('companyId', '==', companyId),
      where('timestamp', '<',  cutoff),
      orderBy('timestamp', 'asc'),
      limit(50),
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    await Promise.all(
      snap.docs.map(async (d) => {
        const { storagePath } = d.data() as Screenshot;
        if (storagePath) {
          try { await deleteObject(ref(storage, storagePath)); }
          catch { /* already deleted */ }
        }
        await deleteDoc(doc(db, COLLECTION, d.id));
      }),
    );

    console.log(`[RetentionPolicy] Eliminadas ${snap.size} capturas antiguas (companyId=${companyId})`);
  } catch (err: any) {
    console.warn('[RetentionPolicy] Error:', err.message);
  }
}