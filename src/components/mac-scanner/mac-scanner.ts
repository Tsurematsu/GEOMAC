import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import styles from './mac-scanner.css?inline';
import Tesseract from 'tesseract.js';

@customElement('mac-scanner')
export class MacScanner extends LitElement {
    @state() private isScanning = false;
    @state() private statusMsg = 'Iniciando cámara...';
    @query('video') private videoEl!: HTMLVideoElement;
    @query('canvas') private canvasEl!: HTMLCanvasElement;

    private stream: MediaStream | null = null;
    private scanInterval: any = null;
    private worker: Tesseract.Worker | null = null;

    static styles = unsafeCSS(styles);

    public start() {
        this.isScanning = true;
        setTimeout(() => this.startCamera(), 0);
    }

    public stop() {
        this.isScanning = false;
        this.stopScanner();
    }

    // Pre-carga el motor OCR en segundo plano al montar el componente
    async connectedCallback() {
        super.connectedCallback();
        if (!this.worker) {
            try {
                this.worker = await Tesseract.createWorker('eng');
                await this.worker.setParameters({
                    tessedit_char_whitelist: '0123456789ABCDEFabcdefO:- ',
                });
            } catch(e) {
                console.error("Error preloading OCR", e);
            }
        }
    }

    private async startCamera() {
        if (!this.worker) {
            this.statusMsg = 'Inicializando motor OCR...';
            // Fallback just in case connectedCallback didn't finish
            this.worker = await Tesseract.createWorker('eng');
            await this.worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFabcdefO:- ',
            });
        }
        
        try {
            this.statusMsg = 'Accediendo a la cámara...';
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            if (this.videoEl) {
                this.videoEl.srcObject = this.stream;
                this.videoEl.play();
            }

            this.statusMsg = 'Apunte la cámara a la dirección MAC';
            // Escanea 2 veces por segundo (soportable porque la imagen está recortada)
            this.scanInterval = setInterval(() => this.scanFrame(), 500);

        } catch (err: any) {
            console.error(err);
            this.statusMsg = 'Error: No se pudo acceder a la cámara o cargar OCR.';
        }
    }

    private stopScanner() {
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoEl) {
            this.videoEl.srcObject = null;
        }
    }

    private async scanFrame() {
        if (!this.worker || !this.videoEl || !this.canvasEl) return;
        
        const video = this.videoEl;
        if (video.videoWidth === 0) return;

        const canvas = this.canvasEl;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Recortar SOLO el centro de la imagen donde está el cuadro visual
        // Esto reduce enormemente el área a procesar y multiplica la velocidad
        const cropWidth = video.videoWidth * 0.8;
        const cropHeight = 120; // Aproximadamente el alto del cuadro central
        const startX = (video.videoWidth - cropWidth) / 2;
        const startY = (video.videoHeight - cropHeight) / 2;

        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        try {
            const { data: { text } } = await this.worker.recognize(canvas);
            this.processText(text);
        } catch (e) {
            console.error("OCR Error", e);
        }
    }

    private processText(rawText: string) {
        // Reemplazar letras 'O' por '0' (común error de OCR en Hex)
        const cleanedText = rawText.replace(/O/gi, '0').toUpperCase();
        
        // Buscar patrón MAC: XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX
        const macRegex = /([0-9A-F]{2}[:-]){5}([0-9A-F]{2})/g;
        const match = cleanedText.match(macRegex);
        
        if (match && match.length > 0) {
            const foundMac = match[0].replace(/-/g, ':'); // Estandarizar a dos puntos
            
            this.dispatchEvent(new CustomEvent('mac-scanned', {
                detail: { mac: foundMac },
                bubbles: true,
                composed: true
            }));
            
            this.stop();
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopScanner();
        if (this.worker) {
            this.worker.terminate();
        }
    }

    render() {
        return html`
            <button class="btn-scan" @click=${this.start} title="Escanear MAC" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </button>

            ${this.isScanning ? html`
                <div class="scanner-container fade-in">
                    <div class="video-wrapper">
                        <video playsinline autoplay muted></video>
                        <div class="scan-overlay">
                            <div class="scan-line"></div>
                        </div>
                    </div>
                    <div class="controls">
                        <p class="status-text">${this.statusMsg}</p>
                        <button class="btn-close" type="button" @click=${this.stop}>Cancelar</button>
                    </div>
                    <!-- Hidden canvas for OCR -->
                    <canvas style="display: none;"></canvas>
                </div>
            ` : ''}
        `;
    }
}
