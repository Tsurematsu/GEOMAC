import globalVar from '../../modulos/globalVar';

export interface NearbyMac {
    mac: string;
    macName: string;
    pointName: string;
    distance: number;
}

export default class ViewMacScript {
  constructor() {
    console.log('ViewMacScript initialized');
  }

  // Calculate distance between two coordinates in meters using Haversine formula
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  public static getNearbyMacs(currentLat: number, currentLng: number, radiusMeters: number = 50): NearbyMac[] {
    const nearbyPoints = globalVar.puntosGPS.map(pt => ({
        ...pt,
        distance: this.calculateDistance(currentLat, currentLng, pt.lat, pt.lng)
    })).filter(pt => pt.distance <= radiusMeters);

    const nearbyPointIds = nearbyPoints.map(pt => pt.id);

    const nearbyMacs: NearbyMac[] = [];
    for (const assoc of globalVar.associations) {
        if (nearbyPointIds.includes(assoc.puntoId)) {
            const point = nearbyPoints.find(pt => pt.id === assoc.puntoId)!;
            const macObj = globalVar.macs.find(m => m.mac === assoc.mac);
            nearbyMacs.push({
                mac: assoc.mac,
                macName: macObj ? macObj.name : 'Desconocido',
                pointName: point.name,
                distance: point.distance
            });
        }
    }

    return nearbyMacs.sort((a, b) => a.distance - b.distance);
  }
}