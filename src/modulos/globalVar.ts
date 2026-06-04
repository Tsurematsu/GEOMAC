export interface PuntoGPSData {
    lat: number;
    lng: number;
    alt?: number;
    name: string;
    id: string;
}

interface GlobalVarType {
    puntosGPS: PuntoGPSData[];
    macs: { mac: string; name: string }[];
    associations: { mac: string; puntoId: string }[];
    radiusDistance: number;
}

const globalVar: GlobalVarType = {
    puntosGPS: [],
    macs: [],
    associations: [],
    radiusDistance: 15
}
export default globalVar;