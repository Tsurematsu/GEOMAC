import globalVar from '../../modulos/globalVar';

export interface LocationData {
    lat: number;
    lng: number;
    alt: number | null;
    accuracy: number;
}

export interface PuntoGPS {
    lat: number;
    lng: number;
    alt?: number;
    name: string;
    id: string;
}

export default class RegistMacScript {
    public static async fetchInitialData() {
        try {
            const res = await fetch('/api/geomac');
            if (res.ok) {
                const data = await res.json();
                globalVar.puntosGPS = data.puntosGPS || [];
                globalVar.macs = data.macs || [];
                globalVar.associations = data.associations || [];
                if (data.radiusDistance) {
                    globalVar.radiusDistance = data.radiusDistance;
                }
            }
        } catch (e) {
            console.error('Failed to fetch initial data:', e);
        }
    }
    constructor(){
        console.log('RegistMacScript initialized');
    }

    public static getGPS_point(): Promise<LocationData> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        alt: position.coords.altitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    public static watchGPS_point(onUpdate: (loc: LocationData) => void, onError: (err: any) => void): number {
        if (!navigator.geolocation) {
            onError(new Error('Geolocation is not supported by your browser'));
            return -1;
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                onUpdate({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    alt: position.coords.altitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                onError(error);
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );
    }

    public static clearWatch(watchId: number) {
        if (navigator.geolocation && watchId !== -1) {
            navigator.geolocation.clearWatch(watchId);
        }
    }

    public static getAllPoints(): PuntoGPS[] {
        return globalVar.puntosGPS;
    }

    public static async addGPSPoint(location: LocationData): Promise<PuntoGPS> {
        const pointId = `PT-${Date.now()}`;
        const newPoint = {
            lat: location.lat,
            lng: location.lng,
            alt: location.alt || 0,
            name: `Punto GPS ${globalVar.puntosGPS.length + 1}`,
            id: pointId
        };
        
        const res = await fetch('/api/geomac', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addPunto', data: newPoint })
        });
        
        if (!res.ok) throw new Error('Error al guardar en la base de datos');

        globalVar.puntosGPS.push(newPoint);
        return newPoint;
    }

    public static async removeGPSPoint(pointId: string) {
        const res = await fetch('/api/geomac', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'removePunto', id: pointId })
        });
        
        if (!res.ok) throw new Error('Error al borrar en la base de datos');

        // Remove point
        const ptIndex = globalVar.puntosGPS.findIndex(p => p.id === pointId);
        if (ptIndex !== -1) {
            globalVar.puntosGPS.splice(ptIndex, 1);
        }

        // Remove associations for this point
        globalVar.associations = globalVar.associations.filter(a => a.puntoId !== pointId);
    }

    public static async renameGPSPoint(pointId: string, newName: string) {
        const res = await fetch('/api/geomac', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'renamePunto', id: pointId, name: newName })
        });

        if (!res.ok) throw new Error('Error al renombrar en la base de datos');

        const pt = globalVar.puntosGPS.find(p => p.id === pointId);
        if (pt) {
            pt.name = newName;
        }
    }

    public static async registerMacToPoint(mac: string, macName: string, pointId: string) {
        const nameToSave = macName.trim() || 'Desconocido';
        const res = await fetch('/api/geomac', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addMacAssociation', mac, macName: nameToSave, puntoId: pointId })
        });
        
        if (!res.ok) throw new Error('Error al guardar MAC en la base de datos');

        const existingMac = globalVar.macs.find(m => m.mac === mac);
        if (existingMac) {
            existingMac.name = nameToSave;
        } else {
            globalVar.macs.push({ mac, name: nameToSave });
        }

        const existingAssoc = globalVar.associations.find(a => a.mac === mac && a.puntoId === pointId);
        if (!existingAssoc) {
            globalVar.associations.push({ mac, puntoId: pointId });
        }
    }

    public static getMacsByPoint(pointId: string): {mac: string, name: string}[] {
        return globalVar.associations
            .filter(a => a.puntoId === pointId)
            .map(a => {
                const macObj = globalVar.macs.find(m => m.mac === a.mac);
                return {
                    mac: a.mac,
                    name: macObj ? macObj.name : 'Desconocido'
                };
            });
    }

    public static async removeMacFromPoint(mac: string, pointId: string) {
        const res = await fetch('/api/geomac', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'removeMacAssociation', mac, puntoId: pointId })
        });

        if (!res.ok) throw new Error('Error al borrar MAC de la base de datos');

        const index = globalVar.associations.findIndex(a => a.mac === mac && a.puntoId === pointId);
        if (index !== -1) {
            globalVar.associations.splice(index, 1);
        }
    }
}