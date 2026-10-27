import https from 'https';
import { query } from '../database/connection';

export interface DecodedVinResult {
  vin: string;
  wmi: string;
  make: string;
  makeId?: string;
  model?: string;
  modelId?: string;
  year?: number;
  bodyType?: string;
  fuelType?: string;
  engine?: string;
  transmission?: string;
  country?: string;
  manufacturer?: string;
  suggestedModels?: Array<{ id: string; name: string; body_type?: string }>;
  suggestedVariants?: Array<{ id: string; name: string; engine_type?: string; transmission?: string }>;
  source: 'nhtsa' | 'wmi_local';
}

const WMI_MAP: Record<string, { make: string; country: string; manufacturer?: string }> = {
  // India (MA-ME)
  'MAT': { make: 'Tata', country: 'India', manufacturer: 'Tata Motors Ltd' },
  'MA3': { make: 'Maruti Suzuki', country: 'India', manufacturer: 'Maruti Suzuki India Ltd' },
  'MAL': { make: 'Hyundai', country: 'India', manufacturer: 'Hyundai Motor India' },
  'MAK': { make: 'Honda', country: 'India', manufacturer: 'Honda Cars India' },
  'MA1': { make: 'Mahindra', country: 'India', manufacturer: 'Mahindra & Mahindra' },
  'MBH': { make: 'Nissan', country: 'India', manufacturer: 'Nissan Motor India' },
  'MDH': { make: 'Kia', country: 'India', manufacturer: 'Kia India' },
  'MZB': { make: 'Toyota', country: 'India', manufacturer: 'Toyota Kirloskar Motor' },
  'MEX': { make: 'Skoda', country: 'India', manufacturer: 'Skoda Auto Volkswagen India' },
  'MAJ': { make: 'Ford', country: 'India', manufacturer: 'Ford India' },
  'ME4': { make: 'Royal Enfield', country: 'India', manufacturer: 'Eicher Motors' },
  'MBL': { make: 'Hero', country: 'India', manufacturer: 'Hero MotoCorp' },
  'MD2': { make: 'Bajaj', country: 'India', manufacturer: 'Bajaj Auto' },
  'ME3': { make: 'Royal Enfield', country: 'India', manufacturer: 'Royal Enfield' },

  // Germany
  'WVW': { make: 'Volkswagen', country: 'Germany', manufacturer: 'Volkswagen AG' },
  'WV1': { make: 'Volkswagen', country: 'Germany', manufacturer: 'Volkswagen Commercial' },
  'WV2': { make: 'Volkswagen', country: 'Germany', manufacturer: 'Volkswagen Commercial' },
  'WAU': { make: 'Audi', country: 'Germany', manufacturer: 'Audi AG' },
  'WBA': { make: 'BMW', country: 'Germany', manufacturer: 'Bayerische Motoren Werke AG' },
  'WBS': { make: 'BMW', country: 'Germany', manufacturer: 'BMW M GmbH' },
  'WDB': { make: 'Mercedes-Benz', country: 'Germany', manufacturer: 'Mercedes-Benz AG' },
  'WDC': { make: 'Mercedes-Benz', country: 'Germany', manufacturer: 'Daimler AG' },
  'WDD': { make: 'Mercedes-Benz', country: 'Germany', manufacturer: 'Mercedes-Benz Cars' },
  'WP0': { make: 'Porsche', country: 'Germany', manufacturer: 'Porsche AG' },

  // Japan
  'JHM': { make: 'Honda', country: 'Japan', manufacturer: 'Honda Motor Co' },
  'JTD': { make: 'Toyota', country: 'Japan', manufacturer: 'Toyota Motor Corp' },
  'JT2': { make: 'Toyota', country: 'Japan', manufacturer: 'Toyota Motor Corp' },
  'JN1': { make: 'Nissan', country: 'Japan', manufacturer: 'Nissan Motor Co' },
  'JM1': { make: 'Mazda', country: 'Japan', manufacturer: 'Mazda Motor Corp' },
  'JS1': { make: 'Suzuki', country: 'Japan', manufacturer: 'Suzuki Motor Corp' },
  'JF1': { make: 'Subaru', country: 'Japan', manufacturer: 'Subaru Corp' },

  // USA
  '1HG': { make: 'Honda', country: 'USA', manufacturer: 'Honda of America Mfg' },
  '4T1': { make: 'Toyota', country: 'USA', manufacturer: 'Toyota Motor Mfg Kentucky' },
  '1FA': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1FB': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1FC': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1FD': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1FM': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1FT': { make: 'Ford', country: 'USA', manufacturer: 'Ford Motor Co' },
  '1GN': { make: 'Chevrolet', country: 'USA', manufacturer: 'General Motors' },
  '1GC': { make: 'GMC', country: 'USA', manufacturer: 'General Motors' },
  '5YJ': { make: 'Tesla', country: 'USA', manufacturer: 'Tesla Inc' },
  '7SA': { make: 'Tesla', country: 'USA', manufacturer: 'Tesla Inc' },
  '1J4': { make: 'Jeep', country: 'USA', manufacturer: 'Chrysler Group LLC' },

  // UK & Europe
  'SAL': { make: 'Land Rover', country: 'UK', manufacturer: 'Jaguar Land Rover' },
  'SAJ': { make: 'Jaguar', country: 'UK', manufacturer: 'Jaguar Land Rover' },
  'VF1': { make: 'Renault', country: 'France', manufacturer: 'Renault' },
  'VF7': { make: 'Citroen', country: 'France', manufacturer: 'Citroen' },
  'VF3': { make: 'Peugeot', country: 'France', manufacturer: 'Peugeot' },
  'ZAR': { make: 'Alfa Romeo', country: 'Italy', manufacturer: 'Alfa Romeo' },
  'ZFA': { make: 'Fiat', country: 'Italy', manufacturer: 'Fiat Automobiles' },
  'ZHW': { make: 'Lamborghini', country: 'Italy', manufacturer: 'Automobili Lamborghini' },
  'ZFF': { make: 'Ferrari', country: 'Italy', manufacturer: 'Ferrari SpA' }
};

const YEAR_CODES: Record<string, number> = {
  'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
  '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
  'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
  'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
  'Y2': 2030
};

// Query NHTSA vPIC API with 3.5s timeout
const fetchFromNhtsa = async (vin: string): Promise<any | null> => {
  return new Promise((resolve) => {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
    const req = https.get(url, { timeout: 3500 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.Results && json.Results[0]) {
            resolve(json.Results[0]);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
};

export const decodeVinNumber = async (vin: string): Promise<DecodedVinResult> => {
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanVin.length < 5) {
    throw new Error('VIN must be at least 5 alphanumeric characters');
  }

  const wmi = cleanVin.substring(0, 3);
  const wmiInfo = WMI_MAP[wmi] || { make: '', country: '', manufacturer: '' };

  // 10th character is standard model year code
  let year: number | undefined;
  if (cleanVin.length >= 10) {
    const yearChar = cleanVin.charAt(9);
    year = YEAR_CODES[yearChar];
  }

  // Try NHTSA lookup first if online
  let nhtsaData: any = null;
  if (cleanVin.length >= 11) {
    try {
      nhtsaData = await fetchFromNhtsa(cleanVin);
    } catch {
      nhtsaData = null;
    }
  }

  // Determine make, model, year, and metadata
  const makeName = (nhtsaData?.Make && nhtsaData.Make.trim() !== '' ? nhtsaData.Make : wmiInfo.make) || 'Unknown';
  const modelName = nhtsaData?.Model && nhtsaData.Model.trim() !== '' ? nhtsaData.Model : undefined;
  const nhtsaYear = nhtsaData?.ModelYear ? parseInt(nhtsaData.ModelYear, 10) : undefined;
  const resolvedYear = nhtsaYear || year;
  const bodyType = nhtsaData?.BodyClass || undefined;
  const fuelType = nhtsaData?.FuelTypePrimary || undefined;
  const transmission = nhtsaData?.TransmissionStyle || undefined;
  const country = nhtsaData?.PlantCountry || wmiInfo.country || undefined;
  const manufacturer = nhtsaData?.Manufacturer || wmiInfo.manufacturer || undefined;
  const engine = nhtsaData?.DisplacementL ? `${nhtsaData.DisplacementL}L ${nhtsaData.EngineConfiguration || ''}`.trim() : undefined;

  let makeId: string | undefined;
  let modelId: string | undefined;
  let suggestedModels: Array<{ id: string; name: string; body_type?: string }> = [];
  let suggestedVariants: Array<{ id: string; name: string; engine_type?: string; transmission?: string }> = [];

  // Match against local database makes and models
  try {
    if (makeName && makeName !== 'Unknown') {
      const makeResult = await query(
        'SELECT id, name FROM vehicle_makes WHERE name ILIKE $1 OR $1 ILIKE name LIMIT 1',
        [`%${makeName}%`]
      );

      if (makeResult.rows.length > 0) {
        makeId = makeResult.rows[0].id;

        // Fetch models for this make
        const modelsResult = await query(
          'SELECT id, name, body_type FROM vehicle_models WHERE make_id = $1 AND is_active = true ORDER BY name',
          [makeId]
        );
        suggestedModels = modelsResult.rows;

        // If we also have a model name, attempt to match model
        if (modelName) {
          const matchedModel = suggestedModels.find(
            m => m.name.toLowerCase() === modelName.toLowerCase() ||
                 modelName.toLowerCase().includes(m.name.toLowerCase()) ||
                 m.name.toLowerCase().includes(modelName.toLowerCase())
          );

          if (matchedModel) {
            modelId = matchedModel.id;

            // Fetch variants for this model
            const variantsResult = await query(
              'SELECT id, name, engine_type, transmission FROM vehicle_variants WHERE model_id = $1 AND is_active = true ORDER BY name',
              [modelId]
            );
            suggestedVariants = variantsResult.rows;
          }
        }
      }
    }
  } catch (dbError) {
    console.error('VIN decoder database match error:', dbError);
  }

  return {
    vin: cleanVin,
    wmi,
    make: makeName,
    makeId,
    model: modelName,
    modelId,
    year: resolvedYear,
    bodyType,
    fuelType,
    engine,
    transmission,
    country,
    manufacturer,
    suggestedModels,
    suggestedVariants,
    source: nhtsaData?.Make ? 'nhtsa' : 'wmi_local'
  };
};
