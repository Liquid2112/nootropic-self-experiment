import { deviceModelLabel, type DeviceInfoReader } from '../device';

describe('deviceModelLabel', () => {
  it('prefers a precise model name with OS in parentheses', () => {
    const info: DeviceInfoReader = { os: 'ios', osVersion: '18.0', modelName: 'iPhone 15' };
    expect(deviceModelLabel(info)).toBe('iPhone 15 (ios 18.0)');
  });

  it('falls back to os + version when no model name', () => {
    const info: DeviceInfoReader = { os: 'android', osVersion: '14', modelName: null };
    expect(deviceModelLabel(info)).toBe('android 14');
  });

  it('uses os alone when version is missing', () => {
    const info: DeviceInfoReader = { os: 'web', osVersion: null, modelName: null };
    expect(deviceModelLabel(info)).toBe('web');
  });

  it('returns null when nothing is known', () => {
    const info: DeviceInfoReader = { os: '', osVersion: null, modelName: null };
    expect(deviceModelLabel(info)).toBeNull();
  });
});
