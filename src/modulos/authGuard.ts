import CryptoJS from 'crypto-js';
import globalVar from './globalVar';

// Configuraciones de Encriptación
// IMPORTANTE: Esta es la llave estática compartida con la app de escritorio.
const STATIC_SECRET_KEY = 'FJFDIOKKR45'; 
const URL_PARAM_NAME = 'share-key';

export function validateAccess(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const encryptedToken = urlParams.get(URL_PARAM_NAME);

    if (!encryptedToken) {
        console.warn('Acceso denegado: No se proporcionó el token de acceso en la URL.');
        globalVar.isAuthorized = false;
        return false;
    }

    try {
        // Desencriptar usando AES (Ajusta el algoritmo si la app de escritorio usa otro modo)
        // CryptoJS.AES.decrypt asume AES-256-CBC de forma estándar.
        const bytes = CryptoJS.AES.decrypt(encryptedToken, STATIC_SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            throw new Error('La desencriptación resultó en una cadena vacía. Llave incorrecta o formato inválido.');
        }

        const data = JSON.parse(decryptedString);

        // Guardar la llave dinámica para uso posterior con los sockets
        if (data && data.dynamicKey) {
            globalVar.dynamicSocketKey = data.dynamicKey;
            globalVar.isAuthorized = true;
            console.log('✅ Autenticación exitosa. Llave dinámica recuperada.');
            return true;
        } else {
            console.warn('Acceso denegado: El JSON desencriptado no contiene la llave dinámica esperada.');
            globalVar.isAuthorized = false;
            return false;
        }
    } catch (e) {
        console.error('❌ Error crítico al validar el acceso:', e);
        globalVar.isAuthorized = false;
        return false;
    }
}
