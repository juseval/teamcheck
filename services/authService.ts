// src/services/authService.ts (Firebase v8 compat)
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Configuración de dominios permitidos
const ALLOWED_DOMAINS = ['tuempresa.com', 'micompania.co']; // CAMBIA ESTOS DOMINIOS

// Validar email corporativo
export const isValidCorporateEmail = (email: string): boolean => {
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain?.toLowerCase());
};

// Validar formato de email
export const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Enviar código de verificación por email
export const sendEmailVerificationCode = async (email: string): Promise<void> => {
    // Validar formato de email
    if (!isValidEmail(email)) {
        throw new Error('Formato de correo electrónico inválido');
    }
    
    // Validar dominio corporativo
    if (!isValidCorporateEmail(email)) {
        throw new Error(`Solo se permiten correos corporativos (${ALLOWED_DOMAINS.join(', ')})`);
    }
    
    const actionCodeSettings = {
        // URL a donde será redirigido después de hacer clic en el link
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
    };
    
    try {
        await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
        // Guardar el email en localStorage para verificar después
        window.localStorage.setItem('emailForSignIn', email);
        console.log('Verification email sent to:', email);
    } catch (error: any) {
        console.error('Error sending verification email:', error);
        
        // Manejo de errores específicos de Firebase
        if (error.code === 'auth/invalid-email') {
            throw new Error('Correo electrónico inválido');
        } else if (error.code === 'auth/user-not-found') {
            throw new Error('No se encontró una cuenta con este correo');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Demasiados intentos. Por favor, espera unos minutos.');
        } else {
            throw new Error('No se pudo enviar el código de verificación. Intenta de nuevo.');
        }
    }
};

// Verificar el código del email
export const verifyEmailCode = async (url?: string): Promise<{ email: string; uid: string } | null> => {
    const urlToCheck = url || window.location.href;
    
    if (firebase.auth().isSignInWithEmailLink(urlToCheck)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        // Si el usuario abrió el link en otro dispositivo, pedir el email
        if (!email) {
            email = window.prompt('Por favor, confirma tu correo electrónico para continuar');
        }
        
        if (!email) {
            throw new Error('Se requiere el correo electrónico');
        }
        
        try {
            const result = await firebase.auth().signInWithEmailLink(email, urlToCheck);
            
            // Limpiar el email guardado
            window.localStorage.removeItem('emailForSignIn');
            
            if (result.user) {
                return {
                    email: result.user.email!,
                    uid: result.user.uid
                };
            }
            
            return null;
        } catch (error: any) {
            console.error('Error verifying email:', error);
            
            if (error.code === 'auth/invalid-action-code') {
                throw new Error('El código de verificación ha expirado o es inválido');
            } else if (error.code === 'auth/expired-action-code') {
                throw new Error('El código de verificación ha expirado. Solicita uno nuevo.');
            } else {
                throw new Error('Error al verificar el código. Intenta de nuevo.');
            }
        }
    }
    
    return null;
};

// Cerrar sesión
export const signOut = async (): Promise<void> => {
    try {
        await firebase.auth().signOut();
        window.localStorage.removeItem('emailForSignIn');
    } catch (error) {
        console.error('Error signing out:', error);
        throw new Error('Error al cerrar sesión');
    }
};

// Verificar si hay una sesión activa de Firebase Auth
export const getCurrentFirebaseUser = (): firebase.User | null => {
    return firebase.auth().currentUser;
};

// Listener para cambios en el estado de autenticación
export const onAuthStateChanged = (callback: (user: firebase.User | null) => void): (() => void) => {
    return firebase.auth().onAuthStateChanged(callback);
};