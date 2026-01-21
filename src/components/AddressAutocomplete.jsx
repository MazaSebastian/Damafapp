import { useState, useEffect } from 'react'
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete'
import { useLoadScript } from '@react-google-maps/api'
import { MapPin, Loader2 } from 'lucide-react'

const LIBRARIES = ['places', 'visualization'] // Must match GeoHeatmap to share the script instance

const AddressAutocomplete = ({ onSelect, defaultValue = '', placeholder = 'Buscar dirección...', className }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
        id: 'google-map-script' // Adding ID helps react-google-maps/api dedupe the script load
    })

    if (loadError) return <div className="text-red-500 text-xs">Error loading maps</div>
    if (!isLoaded) return <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="animate-spin w-4 h-4" /> Cargando mapa...</div>

    return (
        <PlacesInput
            onSelect={onSelect}
            defaultValue={defaultValue}
            placeholder={placeholder}
            className={className}
        />
    )
}

const PlacesInput = ({ onSelect, defaultValue, placeholder, className }) => {
    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: 'ar' }, // Limit to Argentina
        },
        debounce: 300,
        defaultValue
    })

    useEffect(() => {
        if (defaultValue) {
            setValue(defaultValue, false)
        }
    }, [defaultValue, setValue])

    const handleSelect = async (address) => {
        setValue(address, false)
        clearSuggestions()
        onSelect(address)
    }

    return (
        <div className="relative w-full">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready}
                    className={className}
                    placeholder={placeholder}
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

export default AddressAutocomplete
