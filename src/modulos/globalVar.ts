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
    canalAleatorio: string | null;
    claveSecretaDinamica: string | null;
}

const globalVar: GlobalVarType = {
    puntosGPS: [],
    macs: [],
    associations: [],
    radiusDistance: 15,
    isAuthorized: false,
    canalAleatorio: null,
    claveSecretaDinamica: null
}
export default globalVar;