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

// Extend HTMLElement for PlaceAutocompleteElement
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': any;
    }
  }
}

export function useGooglePlaces({ apiKey, onPlaceSelected }: UseGooglePlacesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const callbackRef = useRef(onPlaceSelected);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    // Skip if API key is not provided
    if (!apiKey) return;

    // Load Google Maps script with Extended Component Library
    if (!window.google?.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;

      // Define global callback for when Google Maps is ready
      (window as any).initGoogleMaps = () => {
        initAutocomplete();
      };

      document.head.appendChild(script);
    } else {
      // If Google Maps is already loaded, delay slightly to ensure ref is attached
      setTimeout(initAutocomplete, 100);
    }

    function initAutocomplete() {
      if (!inputRef.current) {
        // If input ref is not ready, try again
        setTimeout(initAutocomplete, 100);
        return;
      }

      // Wait for google.maps.places to be available
      if (!window.google?.maps?.places) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      // Use the updated Autocomplete widget (not deprecated)
      // The new API uses locationRestriction instead of componentRestrictions
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      autocompleteElementRef.current = autocomplete;

      // Use the modern event listener approach
      autocomplete.addListener('place_changed', () => {
        handlePlaceSelect(autocomplete);
      });
    }

    function handlePlaceSelect(autocomplete: google.maps.places.Autocomplete) {
      const place = autocomplete.getPlace();

      if (!place || !place.address_components) {
        console.warn('No place data available');
        return;
      }

      const addressComponents = place.address_components;
      let streetNumber = '';
      let street = '';
      let city = '';
      let state = '';
      let zipCode = '';

      // Parse address components using the standard types
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
          state = component.short_name; // Use short name for state abbreviation
        }
        if (types.includes('postal_code')) {
          zipCode = component.long_name;
        }
      });

      const fullStreet = streetNumber && street
        ? `${streetNumber} ${street}`.trim()
        : street || streetNumber || '';

      // Call the callback with structured place data
      callbackRef.current({
        streetNumber,
        street: fullStreet,
        city,
        state,
        zipCode,
        fullAddress: place.formatted_address || '',
      });
    }

    // Cleanup function
    return () => {
      if (autocompleteElementRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteElementRef.current);
        autocompleteElementRef.current = null;
      }
    };
  }, [apiKey]);

  return inputRef;
}
