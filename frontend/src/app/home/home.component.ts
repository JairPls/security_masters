/// <reference types="google.maps" />

import { Component, OnInit, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  map!: google.maps.Map;
  quoteForm: FormGroup;
  quoteResult: any = null;
  estimatedTime: number = 0;
  isBrowser: boolean;
  basePrice: number = 0;
  private readonly BASE_RATE_PER_HOUR: number = 1500;
  private readonly FIXED_RATE: number = 800;
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  originMarker: google.maps.Marker | null = null;
  destinationMarker: google.maps.Marker | null = null;
  selectionMode: 'origin' | 'destination' = 'origin';
  private activeInfoWindow: google.maps.InfoWindow | null = null;

  constructor(
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.quoteForm = this.fb.group({
      origin: ['', Validators.required],
      destination: ['', Validators.required],
      originCoords: [''],
      destinationCoords: [''],
      serviceType: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required]
    });
  }

  ngOnInit() { }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.loadGoogleMapsScript().then(() => {
        this.initializeMap();
      }).catch(error => {
        console.error('Error loading Google Maps script:', error);
      });
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
      } else {
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDaKW-fZH-NyQQw8Erkh_g3o-rbuIH_F-w&libraries=places&v=weekly';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject('Error loading Google Maps script');
        document.head.appendChild(script);
      }
    });
  }

  private initializeMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    this.map = new google.maps.Map(mapContainer, {
      center: { lat: 19.4326, lng: -99.1332 },
      zoom: 11,
      restriction: {
        latLngBounds: {
          north: 19.5928,
          south: 19.1223,
          west: -99.3643,
          east: -98.9400
        },
        strictBounds: true
      }
    });

    // Crear el panel de control personalizado
    const controlDiv = document.createElement('div');
    controlDiv.className = 'map-controls p-2 bg-white rounded-4 shadow-sm';
    controlDiv.style.cssText = 'position: absolute; left: 10px; top: 10px; max-width: 320px; z-index: 1;';

    // Estilos para los botones activos
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .btn-map.active {
        background-color: #9d36ff !important;
        border-color: #9d36ff !important;
        color: white !important;
      }
      .btn-map {
        background-color: white;
        border: 1px solid #dee2e6;
        color: #6c757d;
        transition: all 0.3s ease;
      }
      .btn-map:hover:not(.active) {
        background-color: #f8f9fa;
        border-color: #9d36ff;
        color: #9d36ff;
      }
    `;
    document.head.appendChild(styleTag);

    controlDiv.innerHTML = `
      <div class="d-flex flex-column gap-2">
        <div class="btn-group">
          <button class="btn btn-sm px-3 py-1 btn-map ${this.selectionMode === 'origin' ? 'active' : ''} rounded-start-4" id="selectOrigin" style="font-size: 0.85rem;">
            <i class="fas fa-map-marker-alt me-1"></i> Origen
          </button>
          <button class="btn btn-sm px-3 py-1 btn-map ${this.selectionMode === 'destination' ? 'active' : ''} rounded-end-4" id="selectDestination" style="font-size: 0.85rem;">
            <i class="fas fa-flag me-1"></i> Destino
          </button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-danger px-3 py-1 rounded-start-4" id="clearOrigin" style="font-size: 0.85rem;">
            <i class="fas fa-times me-1"></i> Borrar
          </button>
          <button class="btn btn-sm btn-outline-danger px-3 py-1 rounded-end-4" id="clearDestination" style="font-size: 0.85rem;">
            <i class="fas fa-times me-1"></i> Borrar
          </button>
        </div>
      </div>
    `;

    // Agregar el panel al contenedor del mapa
    mapContainer.style.position = 'relative';
    mapContainer.appendChild(controlDiv);

    // Agregar event listeners a los botones
    document.getElementById('selectOrigin')?.addEventListener('click', () => {
      this.setSelectionMode('origin');
      this.updateButtonStates();
    });
    document.getElementById('selectDestination')?.addEventListener('click', () => {
      this.setSelectionMode('destination');
      this.updateButtonStates();
    });
    document.getElementById('clearOrigin')?.addEventListener('click', () => this.clearMarker('origin'));
    document.getElementById('clearDestination')?.addEventListener('click', () => this.clearMarker('destination'));

    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#9d36ff',
        strokeWeight: 4
      }
    });

    this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
      this.handleMapClick(e.latLng);
    });
  }

  private updateButtonStates() {
    const originBtn = document.getElementById('selectOrigin');
    const destBtn = document.getElementById('selectDestination');

    if (originBtn && destBtn) {
      originBtn.className = `btn btn-sm px-3 py-1 btn-map rounded-start-4 ${this.selectionMode === 'origin' ? 'active' : ''}`;
      destBtn.className = `btn btn-sm px-3 py-1 btn-map rounded-end-4 ${this.selectionMode === 'destination' ? 'active' : ''}`;
    }
  }

  private handleMapClick(latLng: google.maps.LatLng | null) {
    if (!latLng) return;

    if (this.selectionMode === 'origin') {
      this.setMarker('origin', latLng);
    } else if (this.selectionMode === 'destination') {
      this.setMarker('destination', latLng);
      this.calculateRoute();
    }
  }

  private setMarker(type: 'origin' | 'destination', latLng: google.maps.LatLng) {
    const marker = new google.maps.Marker({
      position: latLng,
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: type === 'origin' ? '#9d36ff' : '#8929ff',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      }
    });

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;

        if (type === 'origin') {
          if (this.originMarker) this.originMarker.setMap(null);
          this.originMarker = marker;
          this.quoteForm.patchValue({
            origin: address,
            originCoords: latLng.toJSON()
          });
          // Cambiar automáticamente al modo de selección de destino
          if (!this.destinationMarker) {
            this.setSelectionMode('destination');
          }
        } else {
          if (this.destinationMarker) this.destinationMarker.setMap(null);
          this.destinationMarker = marker;
          this.quoteForm.patchValue({
            destination: address,
            destinationCoords: latLng.toJSON()
          });
          this.calculateRoute();
        }
      }
    });
  }

  calculateRoute() {
    const origin = this.quoteForm.get('originCoords')?.value;
    const destination = this.quoteForm.get('destinationCoords')?.value;

    if (origin && destination) {
      const departureTime = new Date();

      this.directionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: departureTime,
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        },
        (response, status) => {
          if (status === google.maps.DirectionsStatus.OK && response) {
            this.directionsRenderer.setDirections(response);
            const route = response.routes[0];
            if (route && route.legs[0]) {
              const duration = route.legs[0].duration_in_traffic?.value ?? route.legs[0].duration?.value ?? 0;
              this.estimatedTime = duration / 60;

              const durationText = route.legs[0].duration_in_traffic
                ? route.legs[0].duration_in_traffic.text
                : route.legs[0].duration?.text ?? '';

              // Limpiar InfoWindow anterior si existe
              if (this.activeInfoWindow) {
                this.activeInfoWindow.close();
              }

              // Crear nuevo InfoWindow
              this.activeInfoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 10px;">
                    <strong>Tiempo estimado:</strong> ${durationText}
                    <br>
                    <small style="color: #666;">Incluye tráfico actual</small>
                  </div>
                `
              });

              const bounds = new google.maps.LatLngBounds();
              bounds.extend(route.legs[0].start_location);
              bounds.extend(route.legs[0].end_location);
              const midPoint = bounds.getCenter();
              this.activeInfoWindow.setPosition(midPoint);
              this.activeInfoWindow.open(this.map);

              this.quoteForm.patchValue({
                origin: route.legs[0].start_address,
                destination: route.legs[0].end_address
              });

              this.calculateQuote(this.estimatedTime);
            }
          } else {
            console.error('Error al calcular la ruta: ' + status);
          }
        }
      );
    }
  }

  calculateQuote(durationInMinutes?: number) {
    if (!this.quoteForm.valid) {
      Object.keys(this.quoteForm.controls).forEach(key => {
        const control = this.quoteForm.get(key);
        if (control && control.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    if (!durationInMinutes && !this.estimatedTime) {
      this.calculateRoute();
      return;
    }

    if (!durationInMinutes && this.estimatedTime) {
      durationInMinutes = this.estimatedTime;
    }

    if (durationInMinutes) {
      const hours = Math.ceil(durationInMinutes / 60);
      const hourlyRate = hours * this.BASE_RATE_PER_HOUR;
      const total = hourlyRate + this.FIXED_RATE;

      this.quoteResult = {
        basePrice: hourlyRate,
        serviceCharge: this.FIXED_RATE,
        total: total
      };
    }
  }

  scrollToContact(event: Event) {
    event.preventDefault();
    const element = document.getElementById('contact');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToQuote(event: Event) {
    event.preventDefault();
    const element = document.getElementById('quote');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  setSelectionMode(mode: 'origin' | 'destination') {
    this.selectionMode = mode;
    this.updateButtonStates();
  }

  clearMarker(type: 'origin' | 'destination') {
    if (type === 'origin') {
      if (this.originMarker) {
        this.originMarker.setMap(null);
        this.originMarker = null;
      }
      this.quoteForm.patchValue({
        origin: '',
        originCoords: ''
      });
    } else {
      if (this.destinationMarker) {
        this.destinationMarker.setMap(null);
        this.destinationMarker = null;
      }
      this.quoteForm.patchValue({
        destination: '',
        destinationCoords: ''
      });
    }

    // Limpiar la ruta
    if (this.directionsRenderer) {
      this.directionsRenderer.set('directions', null);
    }

    // Limpiar el InfoWindow
    if (this.activeInfoWindow) {
      this.activeInfoWindow.close();
      this.activeInfoWindow = null;
    }

    // Reiniciar valores de cotización
    this.quoteResult = null;
    this.estimatedTime = 0;
  }
}