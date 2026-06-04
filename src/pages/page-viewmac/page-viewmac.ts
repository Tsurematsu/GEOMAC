import { LitElement, html, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import styles from './page-viewmac.css?inline';
import RegistMacScript, { type LocationData } from '../pager-registmac/RegistMacScript';
import ViewMacScript, { type NearbyMac } from './ViewMacScript';
import globalVar from '../../modulos/globalVar';
import mqttClient from '../../modulos/mqttClient';

@customElement('page-viewmac')
export class PageViewmac extends LitElement {
  @state()
  private location: LocationData | null = null;

  @state()
  private errorMsg: string | null = null;

  @state()
  private loading: boolean = true;

  @state()
  private nearbyMacs: NearbyMac[] = [];

  @state()
  private selectedMacToApply: NearbyMac | null = null;

  private watchId: number = -1;

  connectedCallback() {
    super.connectedCallback();
    this.startWatching();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    RegistMacScript.clearWatch(this.watchId);
  }

  private startWatching() {
    this.loading = true;
    this.errorMsg = null;

    this.watchId = RegistMacScript.watchGPS_point(
      (loc) => {
        this.location = loc;
        this.nearbyMacs = ViewMacScript.getNearbyMacs(loc.lat, loc.lng, globalVar.radiusDistance);
        this.loading = false;
      },
      (err) => {
        this.errorMsg = err.message || 'Error al obtener ubicación.';
        this.loading = false;
      }
    );
  }

  private applySelectedMac() {
    if (!this.selectedMacToApply) return;

    mqttClient.publicarMensaje({ macAddress: this.selectedMacToApply.mac });

    // Cerramos el modal
    this.selectedMacToApply = null;

    // Opcional: mostrar un pequeño feedback
    // alert("¡Instrucción MQTT enviada! Revisa el escritorio.");
  }

  render(): TemplateResult {
    return html`
      <div class="page-container fade-in">
        <div class="header-section">
          <h2>MACs Cercanas</h2>
          <p>Direcciones MAC registradas a menos de ${globalVar.radiusDistance} metros.</p>
        </div>

        ${this.loading ? html`
          <div class="status-card glass-panel loading">
            <div class="spinner"></div>
            <p>Buscando en el radar (${globalVar.radiusDistance}m)...</p>
          </div>
        ` : this.errorMsg ? html`
          <div class="status-card glass-panel error">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>${this.errorMsg}</p>
            <button class="btn btn-primary" @click=${() => { RegistMacScript.clearWatch(this.watchId); this.startWatching(); }}>Reintentar</button>
          </div>
        ` : html`
          <div class="gps-info glass-panel success">
            <div class="gps-header">
              <span class="status-dot"></span>
              <h3>Posición Actual (Tiempo Real)</h3>
            </div>
            <div class="coordinates">
              <div class="coord-item">
                <span class="label">Lat</span>
                <span class="value">${this.location?.lat.toFixed(6)}</span>
              </div>
              <div class="coord-item">
                <span class="label">Lng</span>
                <span class="value">${this.location?.lng.toFixed(6)}</span>
              </div>
              <div class="coord-item">
                <span class="label">Alt</span>
                <span class="value">${(this.location?.alt || 0).toFixed(1)}m</span>
              </div>
            </div>
          </div>
          <div class="radar-summary">
            <div class="radar-icon">
              <span class="pulse"></span>
            </div>
            <div class="summary-details">
                <p>Se encontraron <strong>${this.nearbyMacs.length}</strong> dispositivos cercanos a tu ubicación.</p>
                ${this.nearbyMacs.length > 0 ? html`
                    <p class="macs-inline-list">${this.nearbyMacs.map(m => m.mac).join(', ')}</p>
                ` : ''}
            </div>
          </div>

          <div class="mac-list">
            ${this.nearbyMacs.length === 0 ? html`
              <div class="empty-state glass-panel">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                <p>No hay MACs registradas en este radio de ${globalVar.radiusDistance}m.</p>
              </div>
            ` : this.nearbyMacs.map((item) => html`
              <div class="mac-item glass-panel" @click=${() => this.selectedMacToApply = item} style="cursor: pointer; transition: transform 0.2s ease;">
                <div class="mac-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                </div>
                <div class="mac-details">
                  <span class="mac-name-tag" style="font-size: 14px; font-weight: bold; color: var(--accent); margin-bottom: 4px; display: block;">${item.macName}</span>
                  <span class="mac-address">${item.mac}</span>
                  <span class="punto-name">${item.pointName} • A ${Math.round(item.distance)}m de ti</span>
                </div>
              </div>
            `)}
          </div>
        `}

        ${this.selectedMacToApply ? html`
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;">
                <div class="modal-card glass-panel" style="width: 100%; max-width: 400px; padding: 24px; text-align: center; border: 1px solid var(--accent);">
                    <div style="background: var(--accent); color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <h3 style="margin-bottom: 12px; font-size: 20px;">¿Aplicar esta MAC?</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">¿Deseas enviar la instrucción remota a tu escritorio para que aplique esta configuración de red?</p>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <strong style="color: var(--accent); display: block; font-size: 18px; margin-bottom: 4px;">${this.selectedMacToApply.macName}</strong>
                        <span style="font-family: monospace; font-size: 16px; letter-spacing: 1px;">${this.selectedMacToApply.mac}</span>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button class="btn" style="flex: 1; background: transparent; border: 1px solid var(--text-secondary); color: var(--text-secondary);" @click=${() => this.selectedMacToApply = null}>Cancelar</button>
                        <button class="btn" style="flex: 1; background: var(--accent); border: none; color: white;" @click=${this.applySelectedMac}>Aplicar MAC</button>
                    </div>
                </div>
            </div>
        ` : ''}

      </div>
    `;
  }

  static styles = unsafeCSS(styles);
}

declare global {
  interface HTMLElementTagNameMap {
    'page-viewmac': PageViewmac;
  }
}
