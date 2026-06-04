import { LitElement, html, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import styles from './pager-registmac.css?inline';
import RegistMacScript, { type PuntoGPS } from './RegistMacScript';
import '../../components/mac-scanner/mac-scanner';

@customElement('pager-registmac')
export class PagerRegistmac extends LitElement {
  @state()
  private errorMsg: string | null = null;

  @state()
  private loadingNewPoint: boolean = false;

  @state()
  private points: PuntoGPS[] = [];

  @state()
  private selectedPointId: string | null = null;

  @state()
  private macInput: string = '';

  @state()
  private successMsg: string | null = null;

  @state()
  private associatedMacs: string[] = [];

  @state()
  private isEditingName: boolean = false;

  @state()
  private editingNameValue: string = '';

  connectedCallback() {
    super.connectedCallback();
    this.refreshPoints();
  }

  private refreshPoints() {
    this.points = [...RegistMacScript.getAllPoints()];
  }

  private async addNewPoint() {
    this.loadingNewPoint = true;
    this.errorMsg = null;
    this.successMsg = null;
    try {
      const loc = await RegistMacScript.getGPS_point();
      const newPt = await RegistMacScript.addGPSPoint(loc);
      this.refreshPoints();
      this.selectPoint(newPt.id); // Auto-select and open modal
    } catch (err: any) {
      this.errorMsg = err.message || 'Error al obtener ubicación. Asegúrese de otorgar permisos.';
    } finally {
      this.loadingNewPoint = false;
    }
  }

  private selectPoint(id: string) {
    this.selectedPointId = id;
    this.successMsg = null;
    this.macInput = '';
    this.isEditingName = false;
    this.refreshMacs();
  }

  private startEditingName(currentName: string) {
    this.isEditingName = true;
    this.editingNameValue = currentName;
  }

  private async savePointName() {
    if (!this.selectedPointId || !this.editingNameValue.trim()) {
        this.isEditingName = false;
        return;
    }
    try {
        await RegistMacScript.renameGPSPoint(this.selectedPointId, this.editingNameValue.trim());
        this.isEditingName = false;
        this.refreshPoints();
    } catch(e: any) {
        this.errorMsg = e.message;
    }
  }

  private refreshMacs() {
    if (this.selectedPointId) {
        this.associatedMacs = RegistMacScript.getMacsByPoint(this.selectedPointId);
    } else {
        this.associatedMacs = [];
    }
  }

  private handleMacScanned(e: CustomEvent) {
    this.macInput = e.detail.mac;
    // Auto-register upon successful scan for better UX
    this.registerMac();
  }

  private handleMacInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.macInput = target.value;
  }

  private async registerMac() {
    if (!this.macInput.trim() || !this.selectedPointId) return;
    
    try {
        await RegistMacScript.registerMacToPoint(this.macInput.trim(), this.selectedPointId);
        this.successMsg = `MAC añadida exitosamente.`;
        this.macInput = '';
        this.refreshMacs();
    } catch(e: any) {
        this.errorMsg = e.message;
    }
  }

  private async removeMac(mac: string) {
    if (!this.selectedPointId) return;
    try {
        await RegistMacScript.removeMacFromPoint(mac, this.selectedPointId);
        this.refreshMacs();
    } catch(e: any) {
        this.errorMsg = e.message;
    }
  }

  private async removePoint(id: string, e: Event) {
    e.stopPropagation(); // Prevent opening the modal
    try {
        await RegistMacScript.removeGPSPoint(id);
        if (this.selectedPointId === id) {
            this.selectedPointId = null;
        }
        this.refreshPoints();
    } catch(e: any) {
        this.errorMsg = e.message;
    }
  }

  render(): TemplateResult {
    const selectedPoint = this.points.find(p => p.id === this.selectedPointId);

    return html`
      <div class="page-container fade-in">
        <div class="header-section">
          <h2>Puntos GPS</h2>
          <p>Selecciona un punto existente para añadir MACs o crea uno nuevo con tu ubicación actual.</p>
        </div>

        ${this.errorMsg ? html`
          <div class="status-card glass-panel error fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>${this.errorMsg}</p>
            <button class="btn btn-primary" @click=${() => this.errorMsg = null}>Entendido</button>
          </div>
        ` : ''}

        <div class="points-list">
          <div class="list-header">
            <h3>Puntos Registrados (${this.points.length})</h3>
            <button class="btn btn-primary btn-sm" @click=${this.addNewPoint} ?disabled=${this.loadingNewPoint}>
              ${this.loadingNewPoint ? html`<div class="spinner-small"></div> Añadiendo...` : html`+ Añadir Punto`}
            </button>
          </div>

          ${this.points.length === 0 ? html`
            <div class="empty-state glass-panel">
              <p>No hay puntos GPS registrados aún.</p>
            </div>
          ` : html`
            <div class="list-container glass-panel">
              ${this.points.map(pt => html`
                <div class="point-item" @click=${() => this.selectPoint(pt.id)}>
                  <div class="point-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div class="point-details">
                    <span class="point-name">${pt.name}</span>
                    <span class="point-coords">Lat: ${pt.lat.toFixed(5)}, Lng: ${pt.lng.toFixed(5)}<br/>Alt: ${(pt.alt || 0).toFixed(1)}m</span>
                  </div>
                  <div class="point-actions">
                    <button class="btn-delete-point" @click=${(e: Event) => this.removePoint(pt.id, e)} title="Eliminar punto">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                    <div class="arrow-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>

        ${selectedPoint ? html`
          <div class="modal-overlay fade-in" @click=${(e: Event) => {
              if (e.target === e.currentTarget) this.selectedPointId = null;
          }}>
            <div class="modal-content glass-panel slide-up">
              <div class="modal-header">
                <div class="modal-title">
                    ${this.isEditingName ? html`
                        <div class="edit-name-group">
                            <input 
                                type="text" 
                                .value=${this.editingNameValue} 
                                @input=${(e: Event) => this.editingNameValue = (e.target as HTMLInputElement).value}
                                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.savePointName()}
                                autofocus
                            />
                            <button class="btn btn-primary btn-sm" @click=${this.savePointName}>Guardar</button>
                        </div>
                    ` : html`
                        <h3 class="editable-title" @click=${() => this.startEditingName(selectedPoint.name)}>
                            ${selectedPoint.name}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </h3>
                    `}
                    <p class="modal-subtitle">Asociar y gestionar MACs</p>
                </div>
                <button class="close-btn" @click=${() => this.selectedPointId = null}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              
              <div class="modal-body">
                  <div class="input-group">
                    <mac-scanner @mac-scanned=${this.handleMacScanned}></mac-scanner>
                    <input 
                      type="text" 
                      placeholder="Ej. 00:1B:44:11:3A:B7" 
                      .value=${this.macInput}
                      @input=${this.handleMacInput}
                      @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.registerMac()}
                    />
                    <button class="btn btn-primary" @click=${this.registerMac} ?disabled=${!this.macInput.trim()}>
                      Añadir
                    </button>
                  </div>

                  ${this.successMsg ? html`
                    <div class="success-msg fade-in">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <span>${this.successMsg}</span>
                    </div>
                  ` : ''}

                  <div class="macs-list-container">
                    <h4>MACs Asociadas (${this.associatedMacs.length})</h4>
                    ${this.associatedMacs.length === 0 ? html`
                        <p class="empty-macs">No hay MACs registradas para este punto.</p>
                    ` : html`
                        <ul class="macs-list">
                            ${this.associatedMacs.map(mac => html`
                                <li class="mac-list-item fade-in">
                                    <span class="mac-address">${mac}</span>
                                    <button class="btn-delete" @click=${() => this.removeMac(mac)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    </button>
                                </li>
                            `)}
                        </ul>
                    `}
                  </div>
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
    'pager-registmac': PagerRegistmac;
  }
}
