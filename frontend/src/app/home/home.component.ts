import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

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
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  quoteForm!: FormGroup;
  quoteResult: QuoteResult | null = null;

  zones: Zone[] = [
    {
      id: 'polanco',
      name: 'Polanco',
      coordinates: { lat: 19.4319, lng: -99.1937 }
    },
    {
      id: 'santafe',
      name: 'Santa Fe',
      coordinates: { lat: 19.3598, lng: -99.2770 }
    },
    {
      id: 'reforma',
      name: 'Reforma',
      coordinates: { lat: 19.4270, lng: -99.1676 }
    },
    {
      id: 'interlomas',
      name: 'Interlomas',
      coordinates: { lat: 19.3989, lng: -99.2898 }
    }
  ];

  // Agregar las tarifas base y cargos
  private readonly RATES = {
    basic: {
      basePrice: 8000,
      distanceMultiplier: 1,
      description: '1 vehículo, 2 escoltas'
    },
    premium: {
      basePrice: 18000,
      distanceMultiplier: 1.5,
      description: '2 vehículos, 4 escoltas'
    },
    executive: {
      basePrice: 35000,
      distanceMultiplier: 2,
      description: '3 vehículos, 6 escoltas'
    }
  };

  private readonly ADDITIONAL_CHARGES = {
    nightRate: 0.25,
    weekendRate: 0.15,
    distanceBase: 500
  };

  constructor(private fb: FormBuilder) {
    this.initForm();
  }

  ngOnInit() {
    // Removemos la suscripción automática que estaba causando problemas
  }

  private initForm() {
    this.quoteForm = this.fb.group({
      origin: ['', [Validators.required]],
      destination: ['', [Validators.required]],
      serviceType: ['', [Validators.required]],
      date: ['', [Validators.required]],
      time: ['', [Validators.required]]
    });
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  calculateDistance(origin: Zone, destination: Zone): number {
    const R = 6371;
    const lat1 = this.toRad(origin.coordinates.lat);
    const lat2 = this.toRad(destination.coordinates.lat);
    const dLat = this.toRad(destination.coordinates.lat - origin.coordinates.lat);
    const dLon = this.toRad(destination.coordinates.lng - origin.coordinates.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  calculateQuote() {
    console.log('Formulario:', this.quoteForm.value);
    console.log('Estado del formulario:', this.quoteForm.valid);

    if (this.quoteForm.valid) {
      const formValues = this.quoteForm.value;
      const origin = this.zones.find(z => z.id === formValues.origin);
      const destination = this.zones.find(z => z.id === formValues.destination);

      if (!origin || !destination) {
        console.error('Origen o destino no encontrado');
        return;
      }

      const serviceRate = this.RATES[formValues.serviceType as keyof typeof this.RATES];
      const basePrice = serviceRate.basePrice;
      const distance = this.calculateDistance(origin, destination);
      const distanceCharge = Math.round(distance * this.ADDITIONAL_CHARGES.distanceBase * serviceRate.distanceMultiplier);

      // Cargo por servicio ya está incluido en el precio base
      const serviceCharge = 0;

      const selectedTime = new Date(`2024-01-01T${formValues.time}`);
      const nightCharge = (selectedTime.getHours() >= 22 || selectedTime.getHours() < 6) ?
        Math.round(basePrice * this.ADDITIONAL_CHARGES.nightRate) : 0;

      const total = basePrice + distanceCharge + serviceCharge + nightCharge;

      this.quoteResult = {
        basePrice,
        distanceCharge,
        serviceCharge,
        nightCharge,
        total
      };

      // Scroll hacia los resultados
      setTimeout(() => {
        const resultElement = document.querySelector('.quote_result');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  requestQuote() {
    if (this.quoteResult) {
      alert(`Cotización enviada por un total de $${this.quoteResult.total.toLocaleString()} MXN. Nos pondremos en contacto contigo pronto.`);
    }
  }

  scrollToQuote(event: Event) {
    event.preventDefault();
    const quoteSection = document.getElementById('quote');
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToContact(event: Event) {
    event.preventDefault();
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
