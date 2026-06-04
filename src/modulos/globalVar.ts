const globalVar = {
    puntosGPS : [
        { lat: 40.7128, lng: -74.0060, alt: 10, name: 'Punto 1', id:"ADD" },
        { lat: 34.0522, lng: -118.2437, alt: 20, name: 'Punto 2', id:"RYS" },
        { lat: 51.5074, lng: -0.1278, alt: 15, name: 'Punto 3', id:"SEV" }
    ],
    macs: ['mac1', 'mac2', 'mac3'],
    associations: [
        { mac: 'mac1', puntoId: 'ADD' },
        { mac: 'mac2', puntoId: 'ADD' },
        { mac: 'mac3', puntoId: 'SEV' }
    ]
}
export default globalVar;