import mqtt from 'mqtt';
import CryptoJS from 'crypto-js';
import globalVar from './globalVar';

class MqttClientManager {
    private client: mqtt.MqttClient | null = null;
    private topic: string = '';

    public init() {
        if (!globalVar.isAuthorized || !globalVar.canalAleatorio || !globalVar.claveSecretaDinamica) {
            console.warn('MQTT: No se puede inicializar. Faltan llaves dinámicas.');
            return;
        }

        const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
        this.topic = `tsurematsu/acp/${globalVar.canalAleatorio}`;

        console.log(`🔌 Conectando a MQTT WebSocket en ${brokerUrl}...`);
        
        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            console.log('✅ MQTT WebSocket conectado con éxito.');
            
            // Suscribirse al canal
            this.client?.subscribe(this.topic, (err) => {
                if (!err) {
                    console.log(`📡 Suscrito al canal seguro: ${this.topic}`);
                    
                    // Enviar saludo inicial para confirmar la conexión bidireccional
                    this.publicarMensaje("¡Hola Backend! El frontend Vue/Lit está en línea y escuchando. 🚀");
                } else {
                    console.error('Error al suscribirse al canal MQTT', err);
                }
            });
        });

        this.client.on('message', (canal, mensaje) => {
            console.log(`\n[📥 Recibido desde ${canal}]`);
            const textoCifrado = mensaje.toString();
            const mensajeDesencriptado = this.desencriptarDatos(textoCifrado);
            
            if (mensajeDesencriptado) {
                console.log(`Datos Desencriptados:`, mensajeDesencriptado);
                
                // Despachamos un evento global para que la UI pueda reaccionar
                window.dispatchEvent(new CustomEvent('mqtt-message', {
                    detail: { payload: mensajeDesencriptado }
                }));
            }
        });

        this.client.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
        });
    }

    public publicarMensaje(datos: any) {
        if (!this.client || !this.client.connected) {
            console.warn('MQTT: Imposible publicar. Cliente no conectado.');
            return;
        }

        const paqueteSeguro = this.encriptarDatos(datos);
        this.client.publish(this.topic, paqueteSeguro);
        console.log(`[📤 Publicado] Paquete encriptado enviado al canal.`);
    }

    private encriptarDatos(datos: any): string {
        const textoAEncriptar = typeof datos === 'string' ? datos : JSON.stringify(datos);
        const clave = globalVar.claveSecretaDinamica!;
        
        // Encriptar y pasar a Base64 string
        return CryptoJS.AES.encrypt(textoAEncriptar, clave).toString();
    }

    private desencriptarDatos(textoCifrado: string): any {
        try {
            const clave = globalVar.claveSecretaDinamica!;
            const bytes = CryptoJS.AES.decrypt(textoCifrado, clave);
            const textoOriginal = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!textoOriginal) throw new Error("Texto vacío tras desencriptación");

            try {
                return JSON.parse(textoOriginal);
            } catch {
                return textoOriginal;
            }
        } catch (error) {
            console.error("Fallo al desencriptar. ¿Llave dinámica incorrecta o payload corrupto?");
            return null;
        }
    }
}

const mqttManager = new MqttClientManager();
export default mqttManager;
