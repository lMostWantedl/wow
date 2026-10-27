export interface EngineTypeOption {
  value: string;
  label: string;
  category: string;
}

export const ENGINE_TYPES: EngineTypeOption[] = [
  // 2-Cylinder
  { value: '2-cyl-na', label: '2 Cylinder Naturally Aspirated (Twin NA)', category: '2 Cylinder' },
  { value: '2-cyl-turbo', label: '2 Cylinder Turbocharged (Twin Turbo)', category: '2 Cylinder' },

  // 3-Cylinder
  { value: '3-cyl-na', label: '3 Cylinder Naturally Aspirated (3-Cyl NA)', category: '3 Cylinder' },
  { value: '3-cyl-turbo', label: '3 Cylinder Turbocharged (3-Cyl Turbo)', category: '3 Cylinder' },

  // 4-Cylinder (Inline-4)
  { value: '4-cyl-na', label: '4 Cylinder Naturally Aspirated (Inline-4 NA)', category: '4 Cylinder (Inline-4)' },
  { value: '4-cyl-turbo', label: '4 Cylinder Turbocharged (Inline-4 Turbo)', category: '4 Cylinder (Inline-4)' },
  { value: '4-cyl-twin-turbo', label: '4 Cylinder Twin-Turbo (Bi-Turbo)', category: '4 Cylinder (Inline-4)' },
  { value: '4-cyl-supercharged', label: '4 Cylinder Supercharged', category: '4 Cylinder (Inline-4)' },

  // 5-Cylinder
  { value: '5-cyl-na', label: '5 Cylinder Naturally Aspirated (Inline-5 NA)', category: '5 Cylinder' },
  { value: '5-cyl-turbo', label: '5 Cylinder Turbocharged (Inline-5 Turbo)', category: '5 Cylinder' },

  // 6-Cylinder (V6 & Inline-6)
  { value: 'v6-na', label: 'V6 Naturally Aspirated (V6 NA)', category: '6 Cylinder (V6 / I6)' },
  { value: 'v6-turbo', label: 'V6 Single-Turbo', category: '6 Cylinder (V6 / I6)' },
  { value: 'v6-twin-turbo', label: 'V6 Twin-Turbo (Bi-Turbo)', category: '6 Cylinder (V6 / I6)' },
  { value: 'i6-na', label: 'Inline-6 Naturally Aspirated (Straight-6 NA)', category: '6 Cylinder (V6 / I6)' },
  { value: 'i6-turbo', label: 'Inline-6 Turbocharged (Straight-6 Turbo)', category: '6 Cylinder (V6 / I6)' },
  { value: 'i6-twin-turbo', label: 'Inline-6 Twin-Turbo', category: '6 Cylinder (V6 / I6)' },

  // 8-Cylinder (V8)
  { value: 'v8-na', label: 'V8 Naturally Aspirated (V8 NA)', category: '8 Cylinder (V8)' },
  { value: 'v8-turbo', label: 'V8 Single-Turbo', category: '8 Cylinder (V8)' },
  { value: 'v8-twin-turbo', label: 'V8 Twin-Turbo (Bi-Turbo)', category: '8 Cylinder (V8)' },
  { value: 'v8-supercharged', label: 'V8 Supercharged', category: '8 Cylinder (V8)' },

  // 10 & 12 Cylinder
  { value: 'v10-na', label: 'V10 Naturally Aspirated (V10 NA)', category: '10 & 12 Cylinder' },
  { value: 'v10-twin-turbo', label: 'V10 Twin-Turbo', category: '10 & 12 Cylinder' },
  { value: 'v12-na', label: 'V12 Naturally Aspirated (V12 NA)', category: '10 & 12 Cylinder' },
  { value: 'v12-twin-turbo', label: 'V12 Twin-Turbo', category: '10 & 12 Cylinder' },
  { value: 'w12-twin-turbo', label: 'W12 Twin-Turbo', category: '10 & 12 Cylinder' },
  { value: 'w16-quad-turbo', label: 'W16 Quad-Turbo', category: '10 & 12 Cylinder' },

  // Boxer / Flat Engines (Subaru / Porsche)
  { value: 'flat-4-na', label: 'Flat-4 / Boxer Naturally Aspirated (Subaru)', category: 'Boxer / Flat' },
  { value: 'flat-4-turbo', label: 'Flat-4 / Boxer Turbocharged (Subaru WRX / Porsche 718)', category: 'Boxer / Flat' },
  { value: 'flat-6-na', label: 'Flat-6 / Boxer Naturally Aspirated (Porsche 911 GT3)', category: 'Boxer / Flat' },
  { value: 'flat-6-twin-turbo', label: 'Flat-6 / Boxer Twin-Turbo (Porsche 911 Turbo)', category: 'Boxer / Flat' },

  // Rotary / Wankel
  { value: 'rotary-na', label: 'Rotary / Wankel Naturally Aspirated (Mazda RX-8)', category: 'Rotary / Wankel' },
  { value: 'rotary-turbo', label: 'Rotary / Wankel Twin-Turbo (Mazda RX-7)', category: 'Rotary / Wankel' },

  // Electric Motor Configurations
  { value: 'ev-single-motor', label: 'Electric - Single Motor (FWD / RWD)', category: 'Electric (EV)' },
  { value: 'ev-dual-motor-awd', label: 'Electric - Dual Motor (AWD)', category: 'Electric (EV)' },
  { value: 'ev-tri-motor-awd', label: 'Electric - Tri Motor Performance (AWD)', category: 'Electric (EV)' },
  { value: 'ev-quad-motor-awd', label: 'Electric - Quad Motor Torque Vectoring', category: 'Electric (EV)' },
];

export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'cng', label: 'CNG (Compressed Natural Gas)' },
  { value: 'lpg', label: 'LPG (Autogas)' },
  { value: 'hybrid', label: 'Hybrid (Petrol-Electric)' },
  { value: 'diesel-hybrid', label: 'Diesel Hybrid' },
  { value: 'phev', label: 'Plug-in Hybrid (PHEV)' },
  { value: 'electric', label: 'Electric (EV)' },
  { value: 'hydrogen', label: 'Hydrogen (FCEV)' },
];

export const TRANSMISSION_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic (Torque Converter)' },
  { value: 'amt', label: 'Automated Manual (AMT / AGS)' },
  { value: 'cvt', label: 'Continuously Variable (CVT)' },
  { value: 'dct', label: 'Dual-Clutch (DCT / DSG)' },
  { value: 'imt', label: 'Intelligent Manual (iMT)' },
  { value: 'single-speed', label: 'Single-Speed Direct Drive (EV)' },
];

export const BODY_TYPES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'suv', label: 'SUV' },
  { value: 'compact-suv', label: 'Compact SUV / Crossover' },
  { value: 'mpv', label: 'MPV / MUV' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'convertible', label: 'Convertible / Cabriolet' },
  { value: 'wagon', label: 'Station Wagon' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'van', label: 'Van / Minivan' },
];

// Helper to group engine types by category for <optgroup> rendering
export const getEngineTypesByCategory = () => {
  const groups: { [key: string]: EngineTypeOption[] } = {};
  for (const item of ENGINE_TYPES) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }
  return groups;
};
