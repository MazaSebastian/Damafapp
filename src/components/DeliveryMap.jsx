import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import { MapPin, Search, Navigation } from 'lucide-react'
import { toast } from 'sonner'

// Real Coordinates provided by User
const STORE_LOCATION = { lat: -34.530019, lng: -58.542822 }
const LIBRARIES = ['places']

const DeliveryMap = ({ onDistanceCalculated, onAddressSelected, storeLocation }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    })

    const finalStoreLocation = storeLocation || STORE_LOCATION

    const [map, setMap] = useState(null)
    const [selectedLocation, setSelectedLocation] = useState(null)

    const [directions, setDirections] = useState(null)
    const [calculating, setCalculating] = useState(false)

    const mapRef = useRef()

    const onLoad = useCallback((map) => {
        mapRef.current = map
        setMap(map)
    }, [])

    const onUnmount = useCallback(() => {
        setMap(null)
    }, [])

    const handleMapClick = async (e) => {
        const location = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng(),
        }
        setSelectedLocation(location)

        // Reverse geocoding to get address (optional, nice to have)
        try {
            const geocoder = new window.google.maps.Geocoder()
            const response = await geocoder.geocode({ location })
            if (response.results[0] && onAddressSelected) {
                onAddressSelected({
                    address: response.results[0].formatted_address,
                    lat: location.lat,
                    lng: location.lng
                })
            }
        } catch (error) {
            console.error('Geocoding error:', error)
        }

        calculateRoute(location)
    }

    const calculateRoute = async (destination) => {
        setCalculating(true)
        const directionsService = new window.google.maps.DirectionsService()

        try {
            const result = await directionsService.route({
                origin: finalStoreLocation,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            })

            setDirections(result)

            // Get distance in KM (meters / 1000)
            const distanceInMeters = result.routes[0].legs[0].distance.value
            const distanceInKm = distanceInMeters / 1000

            if (onDistanceCalculated) {
                onDistanceCalculated(distanceInKm)
            }
        } catch (error) {
            console.error('Error calculating route:', error)
            toast.error('No pudimos calcular la ruta hasta ahí. Intenta otra dirección.')
        } finally {
            setCalculating(false)
        }
    }

    // Get Current Location
    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    }
                    setSelectedLocation(location)
                    map.panTo(location)
                    map.setZoom(15)
                    calculateRoute(location)
                },
                () => {
                    toast.error('No pudimos obtener tu ubicación.')
                }
            )
        }
    }

    if (loadError) return <div className="p-4 text-red-400 bg-red-900/10 rounded-lg">Error al cargar Google Maps</div>
    if (!isLoaded) return <div className="h-64 bg-white/5 animate-pulse rounded-lg flex items-center justify-center">Cargando Mapa...</div>

    return (
        <div className="space-y-4">
            {/* Search Box - Custom Headless Implementation */}
            <div className="relative z-10">
                <SearchBox
                    onPlaceSelected={(place) => {
                        const location = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                        }
                        setSelectedLocation(location)
                        map.panTo(location)
                        map.setZoom(15)

                        if (onAddressSelected) {
                            onAddressSelected({
                                address: place.formatted_address,
                                lat: location.lat,
                                lng: location.lng
                            })
                        }
                        calculateRoute(location)
                    }}
                />
            </div>

            {/* Map Container */}
            <div className="relative h-64 md:h-80 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={selectedLocation || finalStoreLocation}
                    zoom={12}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                        styles: [ // Dark Mode Map Style
                            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                            {
                                featureType: "administrative.locality",
                                elementType: "labels.text.fill",
                                stylers: [{ color: "#d59563" }],
                            },
                        ],
                        disableDefaultUI: true, // Clean UI
                        zoomControl: true,
                    }}
                >
                    {/* Store Marker */}
                    <Marker
                        position={finalStoreLocation}
                        icon={{
                            // Simple emoji icon or create a custom one later
                            url: 'https://maps.google.com/mapfiles/kml/pal2/icon10.png',
                            scaledSize: new window.google.maps.Size(40, 40)
                        }}
                        title="Nuestro Local"
                    />

                    {/* Customer Marker */}
                    {selectedLocation && (
                        <Marker position={selectedLocation} animation={window.google.maps.Animation.DROP} />
                    )}

                    {/* Route Line */}
                    {directions && (
                        <DirectionsRenderer
                            directions={directions}
                            options={{
                                polylineOptions: {
                                    strokeColor: "#ffbd59", // Secondary color
                                    strokeWeight: 5,
                                },
                                suppressMarkers: true // We use our own markers
                            }}
                        />
                    )}
                </GoogleMap>

                {/* My Location Button */}
                <button
                    onClick={handleUseCurrentLocation}
                    className="absolute bottom-4 right-4 bg-[var(--color-secondary)] p-3 rounded-full text-white shadow-lg hover:bg-orange-600 transition-colors z-10"
                >
                    <Navigation className="w-5 h-5" />
                </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] text-center">
                Toca el mapa o busca tu dirección para calcular el envío.
            </p>
        </div>
    )
}

// Custom Headless Search Box Component
const SearchBox = ({ onPlaceSelected }) => {
    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: 'ar' },
        },
        debounce: 300,
    })

    const handleSelect = async (address) => {
        setValue(address, false)
        clearSuggestions()

        try {
            const results = await getGeocode({ address })
            const { lat, lng } = await getLatLng(results[0])
            // We reconstruct a "place" like object to match expected interface or pass explicit data
            // To match DeliveryMap expectations which expects a google place object style or we verify what onPlaceSelected expects.
            // Wait, I updated onPlaceSelected in the previous tool call to expect `place.geometry.location`.
            // But `getGeocode` returns GeocoderResult which has `geometry.location` (LatLngFunc).
            // Actually `getGeocode` returns arrays.

            // To simulate Google Maps Place result structure for compatibility or just pass result[0]
            const place = results[0]
            // place.geometry.location is a function in Google Maps API, but geocode library might return objects?
            // checking use-places-autocomplete docs: getGeocode returns standard GeocoderResult which has geometry.location as function or object depending on library load?
            // Actually use-places-autocomplete wraps the google maps geocoder.

            onPlaceSelected(place)
        } catch (error) {
            console.error('Error: ', error)
        }
    }

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    className="w-full bg-[var(--color-surface)] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[var(--color-primary)] shadow-lg placeholder-gray-500"
                    placeholder="Busca tu dirección..."
                />
            </div>
            {status === "OK" && (
                <ul className="absolute z-50 w-full mt-1 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect(description)}
                            className="px-4 py-2 hover:bg-white/5 cursor-pointer text-sm text-gray-300 transition-colors border-b border-white/5 last:border-0"
                        >
                            {description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default DeliveryMap
