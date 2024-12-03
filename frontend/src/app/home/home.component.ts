import { Component, OnInit, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type * as L from 'leaflet';

interface Zone {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface QuoteResult {
  basePrice: number;
  distanceCharge: number;
  serviceCharge: number;
  nightCharge: number;
  total: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  styles: [`
    :host ::ng-deep #map {
      height: 400px;
      width: 100%;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }
    :host ::ng-deep .leaflet-container {
      z-index: 1;
    }
    :host ::ng-deep .leaflet-control-container {
      z-index: 2;
    }
    :host ::ng-deep .custom-div-icon {
      background: transparent;
      border: none;
    }
  `]
})
export class HomeComponent implements OnInit, AfterViewInit {
  private L!: typeof L;
  private map!: L.Map;
  private mapInitialized = false;
  quoteForm: FormGroup;
  quoteResult: QuoteResult | null = null;
  estimatedTime: number = 0;
  markers: any[] = [];
  isBrowser: boolean;

  // Definir las constantes como propiedades de clase
  private readonly BASE_RATE_PER_HOUR: number = 1500;
  private readonly FIXED_RATE: number = 800;

  // Límites de CDMX (aproximados)
  private readonly CDMX_BOUNDS = {
    north: 19.6,
    south: 19.1,
    east: -98.9,
    west: -99.4
  };

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

  ngOnInit() {
    // Inicialización del formulario si es necesario
  }

  async ngAfterViewInit() {
    if (this.isBrowser && !this.mapInitialized) {
      await this.loadLeaflet();
      this.initializeMap();
      this.mapInitialized = true;
    }
  }

  private async loadLeaflet() {
    if (!this.L) {
      const L = await import('leaflet');
      this.L = L.default;
    }
  }

  private initializeMap() {
    if (!this.isBrowser || !this.L || this.mapInitialized) return;

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    mapContainer.innerHTML = '';

    const cdmxCenter: [number, number] = [19.4326, -99.1332];
    const maxBounds: L.LatLngBoundsLiteral = [
      [this.CDMX_BOUNDS.south, this.CDMX_BOUNDS.west],
      [this.CDMX_BOUNDS.north, this.CDMX_BOUNDS.east]
    ];

    this.map = this.L.map('map', {
      center: cdmxCenter,
      zoom: 11,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: maxBounds,
      maxBoundsViscosity: 1.0
    });

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

    this.map.on('click', (e: any) => {
      if (this.isPointInCDMX(e.latlng)) {
        this.handleMapClick(e);
      } else {
        alert('Por favor selecciona un punto dentro de la Ciudad de México');
      }
    });
  }

  private isPointInCDMX(latlng: any): boolean {
    return latlng.lat >= this.CDMX_BOUNDS.south &&
      latlng.lat <= this.CDMX_BOUNDS.north &&
      latlng.lng >= this.CDMX_BOUNDS.west &&
      latlng.lng <= this.CDMX_BOUNDS.east;
  }

  private async getAddressFromLatLng(latlng: any): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`
      );
      const data = await response.json();
      return data.display_name || `${latlng.lat}, ${latlng.lng}`;
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      return `${latlng.lat}, ${latlng.lng}`;
    }
  }

  private async handleMapClick(e: any) {
    const latlng = e.latlng;

    if (this.markers.length === 0) {
      const address = await this.getAddressFromLatLng(latlng);
      const startMarker = this.L.marker(latlng, {
        icon: this.L.divIcon({
          html: `<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
          className: 'custom-div-icon'
        })
      }).addTo(this.map);

      this.markers.push(startMarker);
      this.quoteForm.patchValue({
        origin: address,
        originCoords: `${latlng.lat},${latlng.lng}` // Guardamos las coordenadas en un campo oculto
      });
      startMarker.bindPopup(address).openPopup();

    } else if (this.markers.length === 1) {
      const address = await this.getAddressFromLatLng(latlng);
      const endMarker = this.L.marker(latlng, {
        icon: this.L.divIcon({
          html: `<div style="background-color: #FF5252; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
          className: 'custom-div-icon'
        })
      }).addTo(this.map);

      this.markers.push(endMarker);
      this.quoteForm.patchValue({
        destination: address,
        destinationCoords: `${latlng.lat},${latlng.lng}` // Guardamos las coordenadas en un campo oculto
      });
      endMarker.bindPopup(address).openPopup();

      // Dibujar la ruta
      const points = this.markers.map(marker => marker.getLatLng());
      const polyline = this.L.polyline(points, {
        color: '#9d36ff',
        weight: 4,
        opacity: 0.7
      }).addTo(this.map);

      this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      this.updateRoute();
    } else {
      // Reset
      this.markers.forEach(marker => this.map.removeLayer(marker));
      this.markers = [];
      this.map.eachLayer((layer: any) => {
        if (layer instanceof this.L.Polyline) {
          this.map.removeLayer(layer);
        }
      });
      this.quoteForm.patchValue({
        origin: '',
        destination: '',
        originCoords: '',
        destinationCoords: ''
      });
      this.handleMapClick(e);
    }
  }

  async updateRoute() {
    const originCoords = this.quoteForm.get('originCoords')?.value;
    const destinationCoords = this.quoteForm.get('destinationCoords')?.value;

    if (originCoords && destinationCoords) {
      try {
        const [originLat, originLng] = originCoords.split(',').map(Number);
        const [destLat, destLng] = destinationCoords.split(',').map(Number);

        const distance = this.calculateDistance(
          { lat: originLat, lon: originLng },
          { lat: destLat, lon: destLng }
        );

        const estimatedTimeMinutes = Math.ceil((distance / 40) * 60);
        this.estimatedTime = estimatedTimeMinutes;

        // Agregar popup con tiempo estimado
        const hours = Math.floor(estimatedTimeMinutes / 60);
        const minutes = estimatedTimeMinutes % 60;
        const timeText = hours > 0
          ? `${hours}h ${minutes}min`
          : `${minutes}min`;

        // Encontrar la línea (polyline) existente y agregar el popup
        this.map.eachLayer((layer: any) => {
          if (layer instanceof this.L.Polyline) {
            const center = layer.getBounds().getCenter();
            this.L.popup({
              className: 'time-popup',
              closeButton: false,
              offset: [0, -10]
            })
              .setLatLng(center)
              .setContent(`
                <div class="estimated-time">
                  <i class="fas fa-clock"></i>
                  Tiempo estimado: ${timeText}
                </div>
              `)
              .openOn(this.map);
          }
        });

        this.calculateQuote(estimatedTimeMinutes);
      } catch (error) {
        console.error('Error al calcular la ruta:', error);
      }
    }
  }

  private calculateDistance(point1: { lat: number, lon: number }, point2: { lat: number, lon: number }): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLon = this.deg2rad(point2.lon - point1.lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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

    // Usar el tiempo estimado del mapa si está disponible
    if (!durationInMinutes && this.estimatedTime) {
      durationInMinutes = this.estimatedTime;
    }

    if (durationInMinutes) {
      const hours = Math.ceil(durationInMinutes / 60);
      const hourlyRate = hours * this.BASE_RATE_PER_HOUR;
      const total = hourlyRate + this.FIXED_RATE;

      // Verificar si es horario nocturno (entre 22:00 y 6:00)
      const time = this.quoteForm.get('time')?.value;
      let nightCharge = 0;

      if (time) {
        const [hours24, minutes] = time.split(':').map(Number);
        const isNightTime = hours24 >= 22 || hours24 < 6;
        nightCharge = isNightTime ? total * 0.2 : 0;
      }

      // Aplicar cargo adicional según el tipo de vehículo
      const serviceType = this.quoteForm.get('serviceType')?.value;
      let vehicleCharge = 0;
      if (serviceType === 'van') {
        vehicleCharge = total * 0.15;
      }

      this.quoteResult = {
        basePrice: hourlyRate,
        serviceCharge: this.FIXED_RATE,
        distanceCharge: vehicleCharge,
        nightCharge: nightCharge,
        total: total + nightCharge + vehicleCharge
      };
    }
  }

  requestQuote() {
    // Implementar la lógica para solicitar el servicio
    console.log('Solicitud de servicio enviada', this.quoteResult);
    // Aquí puedes agregar la lógica para enviar la solicitud
  }

  scrollToContact(event: Event) {
    event.preventDefault();
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToQuote(event: Event) {
    event.preventDefault();
    const quoteSection = document.getElementById('quote');
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  calculateRoute() {
    // Implementa la lógica para calcular la ruta
    console.log('Calculando ruta...');
    // Aquí puedes agregar la lógica para calcular la ruta
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.mapInitialized = false;
      this.markers = [];
    }
  }
}
