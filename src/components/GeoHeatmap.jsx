import { GoogleMap, useLoadScript, HeatmapLayer } from '@react-google-maps/api'
import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const LIBRARIES = ['visualization', 'places']

// Wrapper: Fetches API Key from DB (same pattern as DeliveryMap)
const GeoHeatmap = (props) => {
    const [mapsApiKey, setMapsApiKey] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchMapsKey = async () => {
            const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'google_maps_api_key').single()
            if (data?.value) {
                setMapsApiKey(data.value)
            } else {
                console.error('Google Maps API Key missing for Heatmap', error)
                setError('Falta configurar la API Key de Google Maps en Ajustes → Credenciales')
            }
        }
        fetchMapsKey()
    }, [])

    if (error) return <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-sm">{error}</div>
    if (!mapsApiKey) return <div className="h-96 bg-white/5 animate-pulse rounded-3xl flex items-center justify-center text-[var(--color-text-muted)]">Cargando Mapa de Calor...</div>

    return <GeoHeatmapContent apiKey={mapsApiKey} {...props} />
}

// Actual Map Component
const GeoHeatmapContent = ({ apiKey, orders }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
        id: 'google-map-heatmap'
    })

    // Process orders into Heatmap points
    const heatmapData = useMemo(() => {
        if (!orders || !window.google) return []

        return orders
            .filter(o => o.delivery_lat && o.delivery_lng)
            .map(o => new window.google.maps.LatLng(o.delivery_lat, o.delivery_lng))
    }, [orders, isLoaded])

    // Fallback store location
    const center = { lat: -34.530019, lng: -58.542822 }

    const options = {
        radius: 30,
        opacity: 0.7,
    }

    if (loadError) return <div className="p-4 text-red-400 bg-red-900/10 rounded-lg">Error loading Maps: {loadError.message}</div>
    if (!isLoaded) return <div className="h-96 bg-white/5 animate-pulse rounded-3xl flex items-center justify-center">Cargando Mapa de Calor...</div>

    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-white/5 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                Actualizar Mapa de Calor
            </h3>
            <div className="h-96 w-full rounded-2xl overflow-hidden border border-white/10 relative">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={center}
                    zoom={13}
                    options={{
                        disableDefaultUI: true,
                        styles: [ // Minimal Dark
                            { elementType: "geometry", stylers: [{ color: "#212121" }] },
                            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                            { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                            { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
                            { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
                            { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                            { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
                            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
                            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
                            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                            { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
                            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
                            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
                            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
                            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
                            { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
                            { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                            { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
                            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
                        ]
                    }}
                >
                    {heatmapData.length > 0 && <HeatmapLayer data={heatmapData} options={options} />}
                </GoogleMap>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white/70 border border-white/5">
                    {heatmapData.length} puntos de entrega
                </div>
            </div>
        </div>
    )
}

export default GeoHeatmap
