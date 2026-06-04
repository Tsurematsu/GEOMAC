import CryptoJS from 'crypto-js';
import globalVar from './globalVar';

// Configuraciones de Encriptación
// IMPORTANTE: Esta es la llave estática compartida con la app de escritorio.
const URL_PARAM_NAME = 'share-key';

export async function validateAccess(): Promise<boolean> {
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

    // 1. Obtener la llave estática desde la base de datos NeonDB
    let staticSecretKey = 'FJFDIOKKR45'; // Fallback
    try {
        const response = await fetch('/api/geomac?action=get_config');
        if (response.ok) {
            const data = await response.json();
            if (data.config && data.config['static_secret_key']) {
                staticSecretKey = data.config['static_secret_key'];
            }
        }
    } catch (e) {
        console.warn("No se pudo conectar a NeonDB para obtener la llave estática, usando fallback.", e);
    }

    try {
        // Desencriptar usando AES con la llave obtenida
        const bytes = CryptoJS.AES.decrypt(safeToken, staticSecretKey);
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
