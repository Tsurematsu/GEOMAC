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
    alt: number;
    name: string;
    id: string;
}

export default class RegistMacScript {
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

    public static addGPSPoint(location: LocationData): PuntoGPS {
        const pointId = `PT-${Date.now()}`;
        const newPoint = {
            lat: location.lat,
            lng: location.lng,
            alt: location.alt || 0,
            name: `Punto GPS ${globalVar.puntosGPS.length + 1}`,
            id: pointId
        };
        
        globalVar.puntosGPS.push(newPoint);
        return newPoint;
    }

    public static removeGPSPoint(pointId: string) {
        // Remove point
        const ptIndex = globalVar.puntosGPS.findIndex(p => p.id === pointId);
        if (ptIndex !== -1) {
            globalVar.puntosGPS.splice(ptIndex, 1);
        }

        // Remove associations for this point
        globalVar.associations = globalVar.associations.filter(a => a.puntoId !== pointId);
    }

    public static renameGPSPoint(pointId: string, newName: string) {
        const pt = globalVar.puntosGPS.find(p => p.id === pointId);
        if (pt) {
            pt.name = newName;
        }
    }

    public static registerMacToPoint(mac: string, pointId: string) {
        if (!globalVar.macs.includes(mac)) {
            globalVar.macs.push(mac);
        }

        // Avoid duplicate association
        const existing = globalVar.associations.find(a => a.mac === mac && a.puntoId === pointId);
        if (!existing) {
            globalVar.associations.push({
                mac: mac,
                puntoId: pointId
            });
        }
    }

    public static getMacsByPoint(pointId: string): string[] {
        return globalVar.associations
            .filter(a => a.puntoId === pointId)
            .map(a => a.mac);
    }

    public static removeMacFromPoint(mac: string, pointId: string) {
        const index = globalVar.associations.findIndex(a => a.mac === mac && a.puntoId === pointId);
        if (index !== -1) {
            globalVar.associations.splice(index, 1);
        }
    }
}