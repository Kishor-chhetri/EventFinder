import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { mockEvents } from './mockData';
import authReducer from './slices/authSlice';
import eventsReducer from './slices/eventsSlice';

// Load events from AsyncStorage or use mock data as fallback
const loadEvents = async () => {
  try {
    const eventsJson = await AsyncStorage.getItem('events');
    if (eventsJson) {
      const events = JSON.parse(eventsJson);
      console.log('Successfully loaded events from storage:', events.length);
      return events;
    }
  } catch (error) {
    console.error('Error loading events from AsyncStorage:', error);
  }
  return mockEvents;
};

// Sync user events with actual events in storage
const syncUserEvents = async (user: any, events: any[]) => {
  try {
    console.log('Syncing user events for:', user.name);
    
    // Get hosting events based on organizer name
    const hostingEvents = events
      .filter(event => event.organizer === user.name)
      .map(event => event.id);
    console.log('Found hosting events:', hostingEvents);

    // Get attending events based on RSVP status
    const attendingEvents = events
      .filter(event => 
        event.rsvpRequests?.some(request => 
          request.userId === user.id && request.status === 'accepted'
        )
      )
      .map(event => event.id);
    console.log('Found attending events:', attendingEvents);

    // Update user with current event lists
    const updatedUser = {
      ...user,
      createdEvents: hostingEvents,
      attendingEvents: attendingEvents
    };

    // Update user in users list
    const usersJson = await AsyncStorage.getItem('users');
    if (usersJson) {
      const users = JSON.parse(usersJson);
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? updatedUser : u
      );
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');
    }

    // Save updated user data
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
    console.log('Updated current user data in storage');

    return updatedUser;
  } catch (error) {
    console.error('Error syncing user events:', error);
    return user;
  }
};

// Load initial state from AsyncStorage or use mock data
const loadInitialState = async () => {
  try {
    console.log('Loading initial state...');
    
    // Load events
    const events = await loadEvents();
    console.log('Loaded events:', events.length);

    // Load current user
    const currentUserJson = await AsyncStorage.getItem('currentUser');
    let currentUser = null;
    
    if (currentUserJson) {
      try {
        currentUser = JSON.parse(currentUserJson);
        console.log('Loaded current user:', currentUser?.name);

        // Sync user events with actual events
        if (currentUser) {
          currentUser = await syncUserEvents(currentUser, events);
        }
      } catch (error) {
        console.error('Error parsing current user:', error);
      }
    }

    return {
      events: {
        events,
        attendingEvents: currentUser?.attendingEvents || [],
        hostingEvents: currentUser?.createdEvents || [],
        isLoading: false,
        error: null,
        filters: {
          category: 'All',
          type: 'All',
          timeWindow: 'This Week',
          locationRange: 5,
        },
      },
      auth: {
        user: currentUser || null,
        isAuthenticated: !!currentUser,
        isLoading: false,
        error: null,
      },
    };
  } catch (error) {
    console.error('Error loading initial state:', error);
    return {
      events: {
        events: mockEvents,
        attendingEvents: [],
        hostingEvents: [],
        isLoading: false,
        error: null,
        filters: {
          category: 'All',
          type: 'All',
          timeWindow: 'This Week',
          locationRange: 5,
        },
      },
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      },
    };
  }
};

// Initialize store with data from AsyncStorage
const initializeStore = async () => {
  const initialState = await loadInitialState();
  return configureStore({
    reducer: {
      auth: authReducer,
      events: eventsReducer,
    },
    preloadedState: initialState,
  });
};

// Create store with initial state
export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
  },
});

// Initialize store with data from AsyncStorage
initializeStore().then(initializedStore => {
  // Update store with loaded data
  const state = initializedStore.getState();
  
  // Update events state
  store.dispatch({ 
    type: 'events/fetchEventsSuccess', 
    payload: state.events.events 
  });
  
  // Update user events
  store.dispatch({ 
    type: 'events/setUserEvents', 
    payload: { 
      hostingEvents: state.events.hostingEvents,
      attendingEvents: state.events.attendingEvents 
    }
  });

  // Update auth state if user exists
  if (state.auth.user) {
    store.dispatch({ 
      type: 'auth/loginSuccess', 
      payload: state.auth.user 
    });
  }

  // Verify the state after initialization
  console.log('Store initialized with:');
  console.log('- Events:', store.getState().events.events.length);
  console.log('- Hosting Events:', store.getState().events.hostingEvents);
  console.log('- Attending Events:', store.getState().events.attendingEvents);
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store; 