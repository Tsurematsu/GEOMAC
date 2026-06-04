import CryptoJS from 'crypto-js';
import globalVar from './globalVar';

// Configuraciones de Encriptación
// IMPORTANTE: Esta es la llave estática compartida con la app de escritorio.
const STATIC_SECRET_KEY = 'FJFDIOKKR45'; 
const URL_PARAM_NAME = 'share-key';

export function validateAccess(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const encryptedToken = urlParams.get(URL_PARAM_NAME);

    // Asegurarse de que el token exista. Si se insertó directamente sin encodeURIComponent en el QR,
    // los signos '+' de Base64 se habrán convertido en espacios. Los restauramos.
    if (!encryptedToken) {
        console.warn('Acceso denegado: No se proporcionó el token de acceso en la URL.');
        globalVar.isAuthorized = false;
        return false;
    }

    const safeToken = encryptedToken.replace(/ /g, '+');

    try {
        // Desencriptar usando AES
        const bytes = CryptoJS.AES.decrypt(safeToken, STATIC_SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            throw new Error('La desencriptación resultó en una cadena vacía. Llave incorrecta o formato inválido.');
        }

        // Intentar parsear como JSON si enviaron un objeto
        try {
            const data = JSON.parse(decryptedString);
            if (data && data.canalAleatorio && data.claveSecretaDinamica) {
                globalVar.canalAleatorio = data.canalAleatorio;
                globalVar.claveSecretaDinamica = data.claveSecretaDinamica;
                globalVar.isAuthorized = true;
                console.log('✅ Autenticación exitosa. Variables dinámicas recuperadas.');
                return true;
            } else {
                throw new Error("El JSON no tiene la estructura esperada.");
            }
        } catch (e) {
            console.warn('Acceso denegado: El token desencriptado no contiene un JSON válido con canalAleatorio y claveSecretaDinamica.');
            globalVar.isAuthorized = false;
            return false;
        }
    } catch (e) {
        console.error('❌ Error crítico al validar el acceso:', e);
        globalVar.isAuthorized = false;
        return false;
    }
}
