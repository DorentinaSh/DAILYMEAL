import { greetingFor, nearbyTimes, orderOfDay } from './day';

const at = (h: number, m = 0) => new Date(2026, 9, 19, h, m);
const usual = { breakfast: '07:30', lunch: '11:30' };

describe('greetingFor', () => {
  it('says good morning from five until noon', () => {
    expect(greetingFor(at(5))).toBe('Good morning');
    expect(greetingFor(at(11, 59))).toBe('Good morning');
  });

  it('says good afternoon from noon until six', () => {
    expect(greetingFor(at(12))).toBe('Good afternoon');
    expect(greetingFor(at(17, 59))).toBe('Good afternoon');
  });

  it('says good evening from six, and through the small hours', () => {
    expect(greetingFor(at(18))).toBe('Good evening');
    expect(greetingFor(at(2))).toBe('Good evening');
  });
});

describe('orderOfDay', () => {
  it('puts breakfast first before its time, with lunch still to come', () => {
    expect(orderOfDay(usual, at(6))).toEqual({
      first: 'breakfast',
      ahead: true,
      earlier: [],
      later: ['lunch'],
    });
  });

  // The reminder fires at 07:30; opening the app at 07:45 should still show
  // the breakfast it just announced, not jump to lunch.
  it('keeps breakfast first for a while after its time', () => {
    expect(orderOfDay(usual, at(7, 45))).toEqual({
      first: 'breakfast',
      ahead: false,
      earlier: [],
      later: ['lunch'],
    });
  });

  it('is not ahead at the very minute of its time', () => {
    expect(orderOfDay(usual, at(7, 30)).ahead).toBe(false);
  });

  it('hands over to lunch halfway between the two times', () => {
    expect(orderOfDay(usual, at(9, 29)).first).toBe('breakfast');
    expect(orderOfDay(usual, at(9, 30))).toEqual({
      first: 'lunch',
      ahead: true,
      earlier: ['breakfast'],
      later: [],
    });
  });

  it('keeps the last meal first for the rest of the day', () => {
    expect(orderOfDay(usual, at(20))).toEqual({
      first: 'lunch',
      ahead: false,
      earlier: ['breakfast'],
      later: [],
    });
  });

  it('follows the times, not the order the categories are listed in', () => {
    expect(orderOfDay({ breakfast: '12:00', lunch: '08:00' }, at(7))).toEqual({
      first: 'lunch',
      ahead: true,
      earlier: [],
      later: ['breakfast'],
    });
  });

  it('keeps the listed order when two meals share a time', () => {
    const same = { breakfast: '07:30', lunch: '07:30' };
    expect(orderOfDay(same, at(8))).toEqual({
      first: 'breakfast',
      ahead: false,
      earlier: [],
      later: ['lunch'],
    });
  });
});

describe('nearbyTimes', () => {
  it('offers half an hour either side of a time', () => {
    expect(nearbyTimes('07:30')).toEqual(['07:00', '07:30', '08:00']);
    expect(nearbyTimes('11:30')).toEqual(['11:00', '11:30', '12:00']);
  });

  it('wraps around midnight both ways', () => {
    expect(nearbyTimes('00:15')).toEqual(['23:45', '00:15', '00:45']);
    expect(nearbyTimes('23:45')).toEqual(['23:15', '23:45', '00:15']);
  });
});
