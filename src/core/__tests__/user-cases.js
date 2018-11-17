// @flow

const PubSub = require('../index.js');

describe('user-cases', () => {
  it('compute', () => {
    const pb = new PubSub();
    const SET_FIRST_NAME = 'SET_FIRST_NAME';
    const SET_LAST_NAME = 'SET_LAST_NAME';
    const SET_FULL_NAME = 'SET_FULL_NAME';
    const SET_DISPLAY_NAME = 'SET_DISPLAY_NAME';

    let firstName = 'John';
    let lastName = 'Doe';
    let fullName = 'John Doe';
    let displayName = 'John Doe';

    const reaction = jest.fn();
    const setFirstName = jest.fn(name => {
      firstName = name;
    });
    const setLastName = jest.fn(name => {
      lastName = name;
    });
    const setFullName = jest.fn(() => {
      fullName = `${firstName} ${lastName}`;
      pb.dispatch(SET_FULL_NAME);
    });
    const setDisplayName = jest.fn(() => {
      displayName = firstName.length < 10 ? fullName : firstName;
      pb.dispatch(SET_DISPLAY_NAME);
    });

    pb.subscribe(setFirstName, SET_FIRST_NAME, 0);
    pb.subscribe(setLastName, SET_LAST_NAME, 0);
    pb.subscribe(setFullName, SET_FIRST_NAME, 1);
    pb.subscribe(setFullName, SET_LAST_NAME, 1);
    pb.subscribe(setDisplayName, SET_FIRST_NAME, 2);
    pb.subscribe(setDisplayName, SET_FULL_NAME, 2);
    pb.subscribe(reaction, SET_DISPLAY_NAME);

    pb.dispatch(SET_FIRST_NAME, 'Joseph');
    expect(displayName).toBe('Joseph Doe');
    expect(setDisplayName.mock.calls.length).toBe(2);
    expect(reaction.mock.calls.length).toBe(1);

    pb.dispatch(SET_FIRST_NAME, 'Jooooooooooooooseph');
    expect(displayName).toBe('Jooooooooooooooseph');
    expect(reaction.mock.calls.length).toBe(2);
  });
});
