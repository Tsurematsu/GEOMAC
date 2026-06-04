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
    isAuthorized: boolean;
    dynamicSocketKey: string | null;
}

const globalVar: GlobalVarType = {
    puntosGPS: [],
    macs: [],
    associations: [],
    radiusDistance: 15,
    isAuthorized: false,
    dynamicSocketKey: null
}
export default globalVar;