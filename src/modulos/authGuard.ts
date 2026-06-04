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

        let dynamicKey = null;

        // Intentar parsear como JSON si enviaron un objeto
        try {
            const data = JSON.parse(decryptedString);
            if (data && data.dynamicKey) {
                dynamicKey = data.dynamicKey;
            }
        } catch (e) {
            // Si no es un JSON, asumimos que pasaron la llave dinámica como un string de texto plano
            dynamicKey = decryptedString;
        }

        // Guardar la llave dinámica para uso posterior con los sockets
        if (dynamicKey) {
            globalVar.dynamicSocketKey = dynamicKey;
            globalVar.isAuthorized = true;
            console.log('✅ Autenticación exitosa. Llave dinámica recuperada:', dynamicKey);
            return true;
        } else {
            console.warn('Acceso denegado: El token desencriptado no contiene una llave válida.');
            globalVar.isAuthorized = false;
            return false;
        }
    } catch (e) {
        console.error('❌ Error crítico al validar el acceso:', e);
        globalVar.isAuthorized = false;
        return false;
    }
}
