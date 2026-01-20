import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import { useState, useMemo, useEffect } from 'react'
import { Bike, Navigation } from 'lucide-react'

const LIBRARIES = ['places']
const STORE_LOCATION = { lat: -34.530019, lng: -58.542822 }

const LiveFleetMap = ({ activeOrders }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    })

    const [selectedOrder, setSelectedOrder] = useState(null)

    const mapCenter = useMemo(() => STORE_LOCATION, [])

    const mapOptions = useMemo(() => ({
        disableDefaultUI: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }],
            },
        ]
    }), [])

    if (loadError) return <div className="text-red-500 bg-red-900/10 p-4 rounded-xl">Error cargando mapa</div>
    if (!isLoaded) return <div className="h-full w-full bg-[#1a1a1a] animate-pulse rounded-xl flex items-center justify-center text-gray-500">Cargando Flota...</div>

    return (
        <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={13}
            options={mapOptions}
        >
            {/* Store Marker */}
            <Marker
                position={STORE_LOCATION}
                icon={{
                    url: 'https://cdn-icons-png.flaticon.com/512/762/762696.png', // Simple shop icon or similar
                    scaledSize: new window.google.maps.Size(40, 40)
                }}
            />

            {/* Active Riders Markers */}
            {activeOrders.map(order => (
                (order.driver_lat && order.driver_lng) && (
                    <Marker
                        key={order.id}
                        position={{ lat: order.driver_lat, lng: order.driver_lng }}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: "#9333ea", // Purple-600
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        }}
                        label={{
                            text: "🛵", // Emoji as label
                            fontSize: "20px",
                            className: "bg-transparent"
                        }}
                        onClick={() => setSelectedOrder(order)}
                    />
                )
            ))}

            {selectedOrder && (
                <InfoWindow
                    position={{ lat: selectedOrder.driver_lat, lng: selectedOrder.driver_lng }}
                    onCloseClick={() => setSelectedOrder(null)}
                >
                    <div className="text-black p-1">
                        <h4 className="font-bold">Pedido #{selectedOrder.id.slice(0, 4)}</h4>
                        <p className="text-xs">Repartidor: {selectedOrder.driver_name || 'Desconocido'}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedOrder.delivery_address}</p>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

export default LiveFleetMap
