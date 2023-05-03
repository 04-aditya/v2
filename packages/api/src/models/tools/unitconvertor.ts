import { Tool } from 'langchain/tools';

type UnitType = 'length' | 'temperature' | 'mass' | 'time';

type ConversionType = {
  from: string;
  to: string;
  multiplier: number;
  offset: number;
};

const CONVERSIONS: Record<UnitType, ConversionType[]> = {
  length: [
    { from: 'm', to: 'ft', multiplier: 3.28084, offset: 0 },
    { from: 'ft', to: 'm', multiplier: 0.3048, offset: 0 },
    { from: 'km', to: 'miles', multiplier: 0.621371, offset: 0 },
    { from: 'miles', to: 'km', multiplier: 1.60934, offset: 0 },
  ],
  temperature: [
    { from: 'C', to: 'F', multiplier: 1.8, offset: 32 },
    { from: 'F', to: 'C', multiplier: 1 / 1.8, offset: -32 / 1.8 },
  ],
  mass: [
    { from: 'kg', to: 'lb', multiplier: 2.20462, offset: 0 },
    { from: 'lb', to: 'kg', multiplier: 0.453592, offset: 0 },
    { from: 'g', to: 'oz', multiplier: 0.035274, offset: 0 },
    { from: 'oz', to: 'g', multiplier: 28.3495, offset: 0 },
  ],
  time: [
    { from: 'h', to: 'min', multiplier: 60, offset: 0 },
    { from: 'h', to: 'sec', multiplier: 3660, offset: 0 },
    { from: 'min', to: 'sec', multiplier: 60, offset: 0 },
    { from: 'sec', to: 'milliseconds', multiplier: 1000, offset: 0 },
  ],
};

function convertUnit(input: string): string {
  const parts = input.split(' ');

  if (parts.length !== 4) {
    throw new Error('Invalid input string');
  }

  const [value, fromUnit, _, toUnit] = parts;
  const unitType = detectUnitType(fromUnit);

  const conversions = CONVERSIONS[unitType];

  const fromConversion = conversions.find(conv => conv.from === fromUnit);
  const toConversion = conversions.find(conv => conv.to === toUnit);

  if (!fromConversion || !toConversion) {
    throw new Error('Invalid unit type or conversion not found');
  }

  const convertedValue =
    (Number(value) - (fromConversion.offset ?? 0)) * fromConversion.multiplier * (1 / toConversion.multiplier) + (toConversion.offset ?? 0);

  return convertedValue + ' ' + toUnit;
}

function detectUnitType(unit: string): UnitType {
  if (['m', 'ft', 'km', 'miles'].includes(unit)) {
    return 'length';
  } else if (['C', 'F'].includes(unit)) {
    return 'temperature';
  } else if (['kg', 'lb', 'g', 'oz'].includes(unit)) {
    return 'mass';
  } else if (['h', 'min', 'sec'].includes(unit)) {
    return 'time';
  } else {
    throw new Error('Invalid unit type');
  }
}

export class UnitConvertorTool extends Tool {
  name = 'unitconvertor';

  /** @ignore */
  async _call(input: string) {
    try {
      return convertUnit(input);
    } catch (error) {
      return "I don't know how to do that.";
    }
  }

  description = `Useful for getting the converting length unit types like m, km, ft, miles, temperature units like C, F, weight units like  kg, lb, g, oz and time units like h, min, sec. The input to this tool should be a in the format "value unittype to unittype"`;
}
