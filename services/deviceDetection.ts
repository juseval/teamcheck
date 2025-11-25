// src/utils/deviceDetection.ts

export const isMobileDevice = (): boolean => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Detectar dispositivos móviles por User Agent
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Detectar si es una pantalla táctil pequeña
    const isSmallScreen = window.innerWidth < 768;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return mobileRegex.test(userAgent) || (isSmallScreen && isTouchDevice);
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        return 'mobile';
    }
    
    if (/iPad|Android/i.test(userAgent) && width >= 768) {
        return 'tablet';
    }
    
    return 'desktop';
};

export const blockMobileAccess = (): { blocked: boolean; message: string } => {
    if (isMobileDevice()) {
        return {
            blocked: true,
            message: 'Esta aplicación solo está disponible desde computadoras de escritorio por razones de seguridad.'
        };
    }
    return { blocked: false, message: '' };
};