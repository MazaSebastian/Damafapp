import { useState, useEffect, useRef } from 'react'
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api'
import { supabase } from '../supabaseClient'
import { Bike, Store } from 'lucide-react'

// Library configuration
const LIBRARIES = ['places']

const LiveTrackingMap = ({ order }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    })

    const [driverLocation, setDriverLocation] = useState(null)
    const [directions, setDirections] = useState(null)
    const [storeLocation, setStoreLocation] = useState(null)

    // Initial Addresses
    // Store Location fallback
    const DEFAULT_STORE = { lat: -34.530019, lng: -58.542822 }

    useEffect(() => {
        // Fetch real store location from settings first
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('*')
            let storeLoc = DEFAULT_STORE
            if (data) {
                const lat = data.find(s => s.key === 'store_lat')?.value
                const lng = data.find(s => s.key === 'store_lng')?.value
                if (lat && lng) storeLoc = { lat: parseFloat(lat), lng: parseFloat(lng) }
            }
            setStoreLocation(storeLoc)
        }
        fetchSettings()

        // Set initial driver location if exists
        if (order.driver_lat && order.driver_lng) {
            setDriverLocation({ lat: order.driver_lat, lng: order.driver_lng })
        }

        // Subscribe to Realtime Updates for THIS order
        const channel = supabase
            .channel(`tracking_${order.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `id=eq.${order.id}`
            }, (payload) => {
                const newOrder = payload.new
                if (newOrder.driver_lat && newOrder.driver_lng) {
                    console.log('📍 New Driver Location:', newOrder.driver_lat, newOrder.driver_lng)
                    setDriverLocation({ lat: newOrder.driver_lat, lng: newOrder.driver_lng })
                }
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [order.id])

    // Calculate Route when we have locations
    useEffect(() => {
        if (isLoaded && storeLocation && window.google) {
            // If we have driver location, route from Driver -> Customer
            // If not, route from Store -> Customer (as estimation)
            const origin = driverLocation || storeLocation
            const destination = order.delivery_address // String address works for Google Directions

            const directionsService = new window.google.maps.DirectionsService()
            directionsService.route({
                origin: origin,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirections(result)
                } else {
                    console.error(`Directions request failed: ${status}`)
                }
            })
        }
    }, [isLoaded, storeLocation, driverLocation, order.delivery_address])


    if (loadError) return <div>Error loading map</div>
    if (!isLoaded || !storeLocation) return <div className="h-64 bg-gray-800 animate-pulse rounded-xl flex items-center justify-center text-gray-500">Cargando Mapa en vivo...</div>

    return (
        <div className="relative h-64 md:h-80 w-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={driverLocation || storeLocation}
                zoom={14}
                options={{
                    disableDefaultUI: true,
                    styles: [ // Dark Mode
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                    ]
                }}
            >
                {/* Store Marker */}
                <Marker
                    position={storeLocation}
                    icon={{
                        url: 'https://maps.google.com/mapfiles/kml/pal2/icon10.png',
                        scaledSize: new window.google.maps.Size(30, 30)
                    }}
                />

                {/* Driver Marker (The Moto!) */}
                {driverLocation && (
                    <Marker
                        position={driverLocation}
                        icon={{
                            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, // Simple arrow for now, or replace with Bike Icon URL
                            scale: 6,
                            fillColor: "#ff9900",
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: "#ffffff",
                            rotation: 0 // Ideally we would calculate heading
                        }}
                        animation={window.google.maps.Animation.DROP}
                    />
                )}

                {/* Direction Line */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true, // We draw our own
                            polylineOptions: {
                                strokeColor: "#ff9900",
                                strokeWeight: 5,
                                strokeOpacity: 0.7
                            }
                        }}
                    />
                )}
            </GoogleMap>

            {driverLocation && (
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-green-500/50 shadow-lg animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    EN VIVO
                </div>
            )}
        </div>
    )
}

export default LiveTrackingMap
