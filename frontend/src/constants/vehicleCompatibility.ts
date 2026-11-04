export interface VehicleMakePreset {
  make: string;
  models: {
    name: string;
    generations?: string[];
  }[];
}

export const POPULAR_VEHICLE_MAKES: VehicleMakePreset[] = [
  {
    make: 'Maruti Suzuki',
    models: [
      { name: 'Swift', generations: ['3rd Gen (2018-2024)', '2nd Gen (2011-2017)', '4th Gen (2024+)', '1st Gen (2005-2010)'] },
      { name: 'Dzire', generations: ['3rd Gen (2017-2024)', '2nd Gen (2012-2017)', '4th Gen (2024+)'] },
      { name: 'Baleno', generations: ['2nd Gen (2022+)', '1st Gen (2015-2022)'] },
      { name: 'Brezza', generations: ['2nd Gen (2022+)', '1st Gen Vitara Brezza (2016-2022)'] },
      { name: 'Ertiga', generations: ['2nd Gen (2018+)', '1st Gen (2012-2018)'] },
      { name: 'WagonR', generations: ['3rd Gen (2019+)', '2nd Gen (2010-2019)', '1st Gen (1999-2010)'] },
      { name: 'Ciaz', generations: ['Facelift (2018+)', 'Type 1 (2014-2018)'] },
      { name: 'Grand Vitara', generations: ['1st Gen (2022+)'] },
      { name: 'Fronx', generations: ['1st Gen (2023+)'] },
      { name: 'Alto / Alto K10', generations: ['K10 Gen 3 (2022+)', 'Alto 800 (2012-2023)', 'Type 1'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Hyundai',
    models: [
      { name: 'Creta', generations: ['2nd Gen (2020-2024)', '1st Gen (2015-2019)', 'Facelift (2024+)'] },
      { name: 'i20', generations: ['3rd Gen (2020+)', '2nd Gen Elite (2014-2020)', '1st Gen (2008-2014)'] },
      { name: 'Verna', generations: ['6th Gen (2023+)', '5th Gen (2017-2023)', '4th Gen Fluidic (2011-2017)'] },
      { name: 'Venue', generations: ['Facelift (2022+)', '1st Gen (2019-2022)'] },
      { name: 'Grand i10 Nios', generations: ['Nios (2019+)', 'Grand i10 (2013-2019)'] },
      { name: 'Tucson', generations: ['4th Gen (2022+)', '3rd Gen (2016-2022)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Toyota',
    models: [
      { name: 'Innova Crysta', generations: ['2nd Gen Crysta (2016-2023)', '1st Gen (2005-2015)'] },
      { name: 'Innova Hycross', generations: ['1st Gen TNGA (2022+)'] },
      { name: 'Fortuner', generations: ['2nd Gen Facelift (2021+)', '2nd Gen (2016-2020)', '1st Gen (2009-2016)'] },
      { name: 'Glanza', generations: ['2nd Gen (2022+)', '1st Gen (2019-2022)'] },
      { name: 'Urban Cruiser Hyryder', generations: ['1st Gen (2022+)'] },
      { name: 'Etios / Liva', generations: ['1st Gen (2010-2020)'] },
      { name: 'Hilux', generations: ['8th Gen (2022+)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Honda',
    models: [
      { name: 'City', generations: ['5th Gen (2020+)', '4th Gen (2014-2020)', '3rd Gen (2008-2014)', '2nd Gen Dolphin (2003-2008)'] },
      { name: 'Amaze', generations: ['2nd Gen (2018+)', '1st Gen (2013-2018)'] },
      { name: 'Elevate', generations: ['1st Gen (2023+)'] },
      { name: 'Jazz', generations: ['3rd Gen (2015-2023)', '2nd Gen (2009-2015)'] },
      { name: 'WR-V', generations: ['1st Gen (2017-2023)'] },
      { name: 'Civic', generations: ['10th Gen (2019-2021)', '8th Gen (2006-2012)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Tata',
    models: [
      { name: 'Nexon', generations: ['Facelift (2023+)', '1st Gen (2017-2023)'] },
      { name: 'Punch', generations: ['1st Gen (2021+)'] },
      { name: 'Harrier', generations: ['Facelift (2023+)', '1st Gen (2019-2023)'] },
      { name: 'Safari', generations: ['New Safari (2021+)', 'Storme / Dicor'] },
      { name: 'Altroz', generations: ['1st Gen (2020+)'] },
      { name: 'Tiago', generations: ['1st Gen (2016+)'] },
      { name: 'Tigor', generations: ['1st Gen (2017+)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Mahindra',
    models: [
      { name: 'Scorpio-N', generations: ['3rd Gen Scorpio-N (2022+)'] },
      { name: 'Scorpio Classic', generations: ['Classic (2022+)', 'Gen 2 (2014-2022)', 'Gen 1 (2002-2014)'] },
      { name: 'XUV700', generations: ['1st Gen (2021+)'] },
      { name: 'XUV300 / XUV 3XO', generations: ['3XO (2024+)', 'XUV300 (2019-2024)'] },
      { name: 'Thar', generations: ['2nd Gen (2020+)', '1st Gen (2010-2020)'] },
      { name: 'Bolero / Bolero Neo', generations: ['Neo (2021+)', 'Bolero Power+ (2016-2020)', 'Classic'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Kia',
    models: [
      { name: 'Seltos', generations: ['Facelift (2023+)', '1st Gen (2019-2023)'] },
      { name: 'Sonet', generations: ['Facelift (2024+)', '1st Gen (2020-2024)'] },
      { name: 'Carens', generations: ['1st Gen (2022+)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Volkswagen',
    models: [
      { name: 'Polo', generations: ['6R / 6C (2010-2022)'] },
      { name: 'Vento', generations: ['1st Gen (2010-2022)'] },
      { name: 'Taigun', generations: ['1st Gen (2021+)'] },
      { name: 'Virtus', generations: ['1st Gen (2022+)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Skoda',
    models: [
      { name: 'Kushaq', generations: ['1st Gen (2021+)'] },
      { name: 'Slavia', generations: ['1st Gen (2022+)'] },
      { name: 'Rapid', generations: ['1st Gen (2011-2021)'] },
      { name: 'Octavia', generations: ['4th Gen (2021-2023)', '3rd Gen (2013-2020)'] },
      { name: 'All Models', generations: ['All Generations'] }
    ]
  },
  {
    make: 'Universal',
    models: [
      { name: 'All Models', generations: ['All Generations'] }
    ]
  }
];

export const FUEL_TYPES = [
  'All',
  'Petrol',
  'Diesel',
  'CNG',
  'Hybrid',
  'Electric (EV)'
];

export const PART_TYPES = [
  'OEM Genuine',
  'OES / Tier-1 Quality',
  'Aftermarket',
  'Universal Consumable',
  'Performance / Heavy-Duty',
  'Reconditioned'
];

export const POPULAR_PART_BRANDS = [
  'Maruti MGP',
  'Hyundai Mobis',
  'Toyota OEM',
  'Honda OEM',
  'Tata Motors Genuine',
  'Mahindra Genuine',
  'Bosch',
  'Brembo',
  'Valeo',
  'Denso',
  'NGK',
  'TVS Girling',
  'Castrol',
  'Shell',
  'Mobil 1',
  'Wurth',
  'Mann Filter',
  'Purolator',
  'Lumax',
  'Minda',
  'Exide',
  'Amaron',
  'OEM'
];
