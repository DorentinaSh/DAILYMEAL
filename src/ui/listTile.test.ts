import { describeList } from './listTile';

describe('what a list tile in the add sheet says', () => {
  it('counts the meals already in the list', () => {
    expect(describeList(6, { notify: false, time: '07:30' }).count).toBe('6 meals');
  });

  it('says one meal, not one meals', () => {
    expect(describeList(1, { notify: false, time: '07:30' }).count).toBe('1 meal');
  });

  // "0 meals" reads like an error; this is just a list you have not started.
  it('says an empty list has nothing in it yet', () => {
    expect(describeList(0, { notify: false, time: '07:30' }).count).toBe('No meals yet');
  });

  it('gives the reminder time when reminders are on', () => {
    expect(describeList(4, { notify: true, time: '11:30' }).reminder).toBe('Reminder 11:30');
  });

  // A time with reminders off would promise a notification that never comes.
  it('says nothing about a time when reminders are off', () => {
    expect(describeList(4, { notify: false, time: '11:30' }).reminder).toBeNull();
  });
});
