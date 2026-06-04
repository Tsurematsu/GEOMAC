import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import styles from './qr-scanner.css?inline';
import jsQR from 'jsqr';

@customElement('qr-scanner')
export class QrScanner extends LitElement {
    @state() private isScanning = false;
    @state() private statusMsg = 'Iniciando cámara...';
    @query('video') private videoEl!: HTMLVideoElement;
    @query('canvas') private canvasEl!: HTMLCanvasElement;

    private stream: MediaStream | null = null;
    private scanInterval: any = null;

    static styles = unsafeCSS(styles);

    public start() {
        this.isScanning = true;
        setTimeout(() => this.startCamera(), 0);
    }

    public stop() {
        this.isScanning = false;
        this.stopScanner();
    }

    private async startCamera() {
        try {
            this.statusMsg = 'Accediendo a la cámara...';
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            if (this.videoEl) {
                this.videoEl.srcObject = this.stream;
                this.videoEl.play();
            }

            this.statusMsg = 'Apunte la cámara al Código QR';
            
            // Wait a bit for video to start playing before scanning
            this.videoEl.addEventListener('playing', () => {
                // jsQR es extremadamente rápido, podemos escanear cada 200ms
                this.scanInterval = setInterval(() => this.scanFrame(), 200);
            });

        } catch (err: any) {
            console.error(err);
            this.statusMsg = 'Error: No se pudo acceder a la cámara.';
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

    private scanFrame() {
        if (!this.videoEl || !this.canvasEl) return;
        
        const video = this.videoEl;
        // Check if video is ready
        if (video.videoWidth === 0 || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        const canvas = this.canvasEl;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Draw full frame to canvas to read QR
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            // Decodificar el QR
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert", // Optimize for speed
            });

            if (code && code.data) {
                // QR Encontrado!
                this.dispatchEvent(new CustomEvent('qr-scanned', {
                    detail: { token: code.data },
                    bubbles: true,
                    composed: true
                }));
                this.stop();
            }
        } catch (e) {
            console.error("QR Error", e);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopScanner();
    }

    render() {
        return html`
            <button class="btn-scan" @click=${this.start} type="button" style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; width: 100%; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 16px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
                🔑 Escanear QR de Acceso
            </button>

            ${this.isScanning ? html`
                <div class="scanner-container fade-in">
                    <div class="video-wrapper">
                        <video playsinline autoplay muted></video>
                        <div class="scan-overlay" style="height: 250px; width: 250px;">
                            <div class="scan-line"></div>
                        </div>
                    </div>
                    <div class="controls">
                        <p class="status-text">${this.statusMsg}</p>
                        <button class="btn-close" type="button" @click=${this.stop}>Cancelar</button>
                    </div>
                    <!-- Hidden canvas for jsQR -->
                    <canvas style="display: none;"></canvas>
                </div>
            ` : ''}
        `;
    }
}
