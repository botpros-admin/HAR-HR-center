import { useEffect, useRef } from 'react';

interface PlaceResult {
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

interface UseGooglePlacesProps {
  apiKey: string;
  onPlaceSelected: (place: PlaceResult) => void;
}

export function useGooglePlaces({ apiKey, onPlaceSelected }: UseGooglePlacesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const callbackRef = useRef(onPlaceSelected);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    // Load Google Maps script with async loading
    if (!window.google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Define global callback for when Google Maps is ready
      (window as any).initGoogleMaps = () => {
        initAutocomplete();
      };

      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    function initAutocomplete() {
      if (!inputRef.current) return;

      // Wait for google.maps.places to be available
      if (!window.google?.maps?.places) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address'],
      });

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
    }

    function handlePlaceSelect() {
      const place = autocompleteRef.current?.getPlace();
      if (!place || !place.address_components) return;

      const addressComponents = place.address_components;
      let streetNumber = '';
      let street = '';
      let city = '';
      let state = '';
      let zipCode = '';

      addressComponents.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          street = component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }
        if (types.includes('postal_code')) {
          zipCode = component.long_name;
        }
      });

      const fullStreet = `${streetNumber} ${street}`.trim();

      callbackRef.current({
        streetNumber,
        street: fullStreet,
        city,
        state,
        zipCode,
        fullAddress: place.formatted_address || '',
      });
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey]);

  return inputRef;
}
