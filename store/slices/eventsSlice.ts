import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch } from '../index';
import { mockEvents } from '../mockData';
import { updateUser } from './authSlice';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  category: string;
  type: 'public' | 'private';
  maxCapacity: number;
  currentAttendees: number;
  organizer: string;
  thumbnail?: string;
  distance?: number;
  attendingEvents: string[];
  attendees: string[];
  rsvpRequests: {
    userId: string;
    userName: string;
    status: 'pending' | 'accepted' | 'rejected';
  }[];
}

export interface EventsState {
  events: Event[];
  attendingEvents: string[];
  hostingEvents: string[];
  isLoading: boolean;
  error: string | null;
  filters: {
    category: string;
    type: string;
    timeWindow: string;
    locationRange: number;
  };
}

const initialState: EventsState = {
  events: [],
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
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    fetchEventsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchEventsSuccess: (state, action: PayloadAction<Event[]>) => {
      state.isLoading = false;
      state.events = action.payload;
      state.error = null;
    },
    fetchEventsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<EventsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    createEvent: (state, action: PayloadAction<Event>) => {
      state.events.push(action.payload);
      state.hostingEvents.push(action.payload.id);
    },
    updateEvent: (state, action: PayloadAction<Event>) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
    },
    deleteEvent: (state, action: PayloadAction<string>) => {
      console.log('Deleting event with ID:', action.payload);
      state.events = state.events.filter(event => event.id !== action.payload);
      state.hostingEvents = state.hostingEvents.filter(id => id !== action.payload);
      console.log('Event deleted from state');
    },
    setUserEvents: (state, action: PayloadAction<{ 
      hostingEvents: string[]; 
      attendingEvents: string[]; 
    }>) => {
      state.hostingEvents = action.payload.hostingEvents;
      state.attendingEvents = action.payload.attendingEvents;
    },
    requestRsvp: (state, action: PayloadAction<{ eventId: string; userId: string; userName: string }>) => {
      const event = state.events.find(e => e.id === action.payload.eventId);
      if (event) {
        if (!event.rsvpRequests) {
          event.rsvpRequests = [];
        }
        if (!event.attendees) {
          event.attendees = [];
        }
        const existingRequest = event.rsvpRequests.find(r => r.userId === action.payload.userId);
        if (!existingRequest) {
          event.rsvpRequests.push({
            userId: action.payload.userId,
            userName: action.payload.userName,
            status: 'pending'
          });
        }
      }
    },
    respondToRsvp: (state, action: PayloadAction<{ 
      eventId: string; 
      userId: string; 
      status: 'accepted' | 'rejected' 
    }>) => {
      const event = state.events.find(e => e.id === action.payload.eventId);
      if (event && event.rsvpRequests) {
        const request = event.rsvpRequests.find(r => r.userId === action.payload.userId);
        if (request) {
          request.status = action.payload.status;
          if (action.payload.status === 'accepted') {
            event.currentAttendees += 1;
            if (!event.attendees) {
              event.attendees = [];
            }
            if (!event.attendees.includes(request.userName)) {
              event.attendees.push(request.userName);
            }
            if (!state.attendingEvents.includes(event.id)) {
              state.attendingEvents.push(event.id);
            }
          }
        }
      }
    },
    cancelRsvp: (state, action: PayloadAction<string>) => {
      const event = state.events.find(e => e.id === action.payload);
      if (event) {
        event.currentAttendees = Math.max(0, event.currentAttendees - 1);
        if (event.rsvpRequests) {
          event.rsvpRequests = event.rsvpRequests.filter(r => r.status !== 'accepted');
        }
      }
    },
    removeHostingEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(e => e.id !== action.payload);
    },
  },
});

// Thunk actions
export const fetchEvents = () => async (dispatch: any, getState: any) => {
  dispatch(fetchEventsStart());
  try {
    console.log('Fetching events...');
    
    // Get events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    let storedEvents: Event[] = [];
    
    if (eventsJson) {
      try {
        storedEvents = JSON.parse(eventsJson);
        console.log('Successfully loaded events from storage:', storedEvents.length);
      } catch (parseError) {
        console.error('Error parsing events from storage:', parseError);
        storedEvents = [];
      }
    }
    
    // Merge mock events with stored events, avoiding duplicates
    const mockEventIds = new Set(mockEvents.map(event => event.id));
    const uniqueStoredEvents = storedEvents.filter(event => !mockEventIds.has(event.id));
    const allEvents = [...mockEvents, ...uniqueStoredEvents];
    
    console.log('Total events to load:', allEvents.length);
    console.log('Mock events:', mockEvents.length);
    console.log('Stored events:', storedEvents.length);
    console.log('Unique stored events:', uniqueStoredEvents.length);
    
    // Get current user from auth state
    const { user } = getState().auth;
    console.log('Current user:', user);
    
    if (user) {
      console.log('Updating events for user:', user.name);
      // Filter events for current user
      const hostingEvents = allEvents
        .filter((event: Event) => event.organizer === user.name)
        .map((event: Event) => event.id);
      console.log('Hosting events:', hostingEvents);

      const attendingEvents = allEvents
        .filter((event: Event) => 
          event.rsvpRequests?.some((request: { userId: string; status: string }) => 
            request.userId === user.id && request.status === 'accepted'
          )
        )
        .map((event: Event) => event.id);
      console.log('Attending events:', attendingEvents);

      // Update user's event lists in events state
      dispatch(setUserEvents({ hostingEvents, attendingEvents }));
    }
    
    // Update the events in Redux store
    dispatch(fetchEventsSuccess(allEvents));
    console.log('Events loaded successfully into Redux store');
    
    return allEvents; // Return the events data
    
  } catch (error: any) {
    console.error('Error fetching events:', error);
    dispatch(fetchEventsFailure(error.message));
    throw error;
  }
};

export const createEventInStorage = (eventData: Event) => async (dispatch: any, getState: any) => {
  try {
    console.log('Creating new event:', eventData.id);
    
    // Get current events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    let events: Event[] = [];
    
    if (eventsJson) {
      try {
        events = JSON.parse(eventsJson);
        console.log('Successfully parsed existing events:', events.length);
      } catch (parseError) {
        console.error('Error parsing events from storage:', parseError);
        events = [];
      }
    }
    
    // If no events in storage, use mock events
    if (events.length === 0) {
      events = mockEvents;
      console.log('Using mock events:', events.length);
    }
    
    console.log('Current events in storage:', events.length);
    
    // Add the new event
    const updatedEvents = [...events, eventData];
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
      console.log('Successfully saved events to storage:', updatedEvents.length);
    } catch (storageError) {
      console.error('Error saving to AsyncStorage:', storageError);
      throw storageError;
    }
    
    // Update Redux store
    dispatch(fetchEventsSuccess(updatedEvents));
    console.log('Events updated in Redux store');
    
    // Update user's hosting events
    const { user } = getState().auth;
    if (user) {
      // Get users list from storage
      const usersJson = await AsyncStorage.getItem('users');
      let users = [];
      if (usersJson) {
        try {
          users = JSON.parse(usersJson);
          console.log('Successfully loaded users list');
        } catch (parseError) {
          console.error('Error parsing users list:', parseError);
          users = [];
        }
      }

      // Update user in users list
      const updatedUsers = users.map((u: any) => {
        if (u.id === user.id) {
          return {
            ...u,
            createdEvents: [...(u.createdEvents || []), eventData.id]
          };
        }
        return u;
      });

      // Save updated users list
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');

      // Update current user
      const updatedUser = {
        ...user,
        createdEvents: [...(user.createdEvents || []), eventData.id]
      };
      
      // Save updated current user
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      console.log('Updated current user in storage');
      
      // Update Redux store
      dispatch(updateUser(updatedUser));
      console.log('User data updated with new event in Redux store');

      // Update hosting events in events state
      const hostingEvents = updatedEvents
        .filter((event: Event) => event.organizer === user.name)
        .map((event: Event) => event.id);
      
      dispatch(setUserEvents({ 
        hostingEvents, 
        attendingEvents: getState().events.attendingEvents 
      }));
      console.log('Updated hosting events in state:', hostingEvents);
    }
    
    // Verify the save
    const verifyJson = await AsyncStorage.getItem('events');
    const verifyEvents = verifyJson ? JSON.parse(verifyJson) : [];
    console.log('Verification - Events in storage after save:', verifyEvents.length);
    
    return eventData;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const updateEventInStorage = (eventId: string, eventData: Partial<Event>) => async (dispatch: any) => {
  try {
    const eventsJson = await AsyncStorage.getItem('events');
    const events = eventsJson ? JSON.parse(eventsJson) : [];
    
    const updatedEvents = events.map((event: Event) => 
      event.id === eventId ? { ...event, ...eventData } : event
    );
    
    await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
    dispatch(updateEvent({ id: eventId, ...eventData } as Event));
  } catch (error: any) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEventFromStorage = (eventId: string) => async (dispatch: AppDispatch, getState: any) => {
  try {
    console.log('Starting event deletion process for event:', eventId);
    
    // Get current events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    const events = eventsJson ? JSON.parse(eventsJson) : [];
    console.log('Current events in storage:', events.length);
    
    // Filter out the event to be deleted
    const updatedEvents = events.filter((event: Event) => event.id !== eventId);
    console.log('Events after deletion:', updatedEvents.length);
    
    // Update storage
    await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
    console.log('Updated events in storage');
    
    // Update Redux store
    dispatch(deleteEvent(eventId));
    console.log('Updated Redux store');
    
    // Update user's created events
    const { user } = getState().auth;
    if (user) {
      // Get users list
      const usersJson = await AsyncStorage.getItem('users');
      let users = [];
      if (usersJson) {
        try {
          users = JSON.parse(usersJson);
          console.log('Successfully loaded users list');
        } catch (parseError) {
          console.error('Error parsing users list:', parseError);
          users = [];
        }
      }

      // Update user in users list
      const updatedUsers = users.map((u: any) => {
        if (u.id === user.id) {
          return {
            ...u,
            createdEvents: u.createdEvents.filter((id: string) => id !== eventId)
          };
        }
        return u;
      });

      // Save updated users list
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');

      // Update current user
      const updatedUser = {
        ...user,
        createdEvents: user.createdEvents.filter(id => id !== eventId)
      };
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      dispatch(updateUser(updatedUser));
      console.log('Updated user data');

      // Update hosting events in events state
      const hostingEvents = updatedEvents
        .filter((event: Event) => event.organizer === user.name)
        .map((event: Event) => event.id);
      
      // Update both events and user events in Redux store
      dispatch(fetchEventsSuccess(updatedEvents));
      dispatch(setUserEvents({ 
        hostingEvents, 
        attendingEvents: getState().events.attendingEvents 
      }));
      console.log('Updated hosting events in state:', hostingEvents);
    }
    
    console.log('Event deletion completed successfully');
  } catch (error) {
    console.error('Error in deleteEventFromStorage:', error);
    throw error;
  }
};

export const respondToRsvpInStorage = (eventId: string, userId: string, status: 'accepted' | 'rejected') => async (dispatch: any, getState: any) => {
  try {
    console.log('Responding to RSVP:', { eventId, userId, status });
    
    // Get current events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    let events: Event[] = [];
    
    if (eventsJson) {
      try {
        events = JSON.parse(eventsJson);
        console.log('Successfully loaded events from storage');
      } catch (parseError) {
        console.error('Error parsing events from storage:', parseError);
        events = [];
      }
    }

    // Update event's RSVP status and attendees
    const updatedEvents = events.map(event => {
      if (event.id === eventId && event.rsvpRequests) {
        const updatedRequests = event.rsvpRequests.map(request => {
          if (request.userId === userId) {
            if (status === 'accepted') {
              // Add to attendees if accepted
              if (!event.attendees) {
                event.attendees = [];
              }
              if (!event.attendees.includes(request.userName)) {
                event.attendees.push(request.userName);
              }
              event.currentAttendees += 1;
            }
            return { ...request, status };
          }
          return request;
        });
        return { ...event, rsvpRequests: updatedRequests };
      }
      return event;
    });

    // Save updated events
    await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
    console.log('Updated events in storage');

    // If accepted, update user's attending events
    if (status === 'accepted') {
      // Get users list
      const usersJson = await AsyncStorage.getItem('users');
      let users = [];
      if (usersJson) {
        try {
          users = JSON.parse(usersJson);
          console.log('Successfully loaded users list');
        } catch (parseError) {
          console.error('Error parsing users list:', parseError);
          users = [];
        }
      }

      // Update user in users list
      const updatedUsers = users.map((u: any) => {
        if (u.id === userId) {
          return {
            ...u,
            attendingEvents: [...(u.attendingEvents || []), eventId]
          };
        }
        return u;
      });

      // Save updated users list
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');

      // Update current user if it's the logged-in user
      const { user } = getState().auth;
      if (user && user.id === userId) {
        const updatedUser = {
          ...user,
          attendingEvents: [...(user.attendingEvents || []), eventId]
        };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        console.log('Updated current user in storage');
        dispatch(updateUser(updatedUser));
      }
    }

    // Update Redux state
    dispatch(fetchEventsSuccess(updatedEvents));
    console.log('Updated events in Redux store');

  } catch (error) {
    console.error('Error responding to RSVP:', error);
    throw error;
  }
};

export const requestRsvpInStorage = ({ eventId, userId, userName }: { eventId: string; userId: string; userName: string }) => async (dispatch: any) => {
  try {
    console.log('Requesting RSVP:', { eventId, userId, userName });
    
    // Get current events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    let events: Event[] = [];
    
    if (eventsJson) {
      try {
        events = JSON.parse(eventsJson);
        console.log('Successfully loaded events from storage');
      } catch (parseError) {
        console.error('Error parsing events from storage:', parseError);
        events = [];
      }
    }

    // Update event with new RSVP request
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        if (!event.rsvpRequests) {
          event.rsvpRequests = [];
        }
        if (!event.attendees) {
          event.attendees = [];
        }
        
        // Check if request already exists
        const existingRequest = event.rsvpRequests.find(r => r.userId === userId);
        if (!existingRequest) {
          event.rsvpRequests.push({
            userId,
            userName,
            status: 'pending'
          });
          console.log('Added new RSVP request for user:', userName);
        }
      }
      return event;
    });

    // Save updated events to storage
    await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
    console.log('Updated events in storage with new RSVP request');

    // Update Redux store
    dispatch(requestRsvp({ eventId, userId, userName }));
    dispatch(fetchEventsSuccess(updatedEvents));
    console.log('Updated events in Redux store');

  } catch (error) {
    console.error('Error requesting RSVP:', error);
    throw error;
  }
};

export const cancelRsvpInStorage = (eventId: string, userId: string) => async (dispatch: any, getState: any) => {
  try {
    console.log('Canceling RSVP:', { eventId, userId });
    
    // Get current events from storage
    const eventsJson = await AsyncStorage.getItem('events');
    let events: Event[] = [];
    
    if (eventsJson) {
      try {
        events = JSON.parse(eventsJson);
        console.log('Successfully loaded events from storage');
      } catch (parseError) {
        console.error('Error parsing events from storage:', parseError);
        events = [];
      }
    }

    // Update event's RSVP status and attendees
    const updatedEvents = events.map(event => {
      if (event.id === eventId && event.rsvpRequests) {
        // Remove user from attendees
        if (event.attendees) {
          const request = event.rsvpRequests.find(r => r.userId === userId);
          if (request) {
            event.attendees = event.attendees.filter(name => name !== request.userName);
          }
        }
        
        // Update current attendees count
        event.currentAttendees = Math.max(0, event.currentAttendees - 1);
        
        // Remove user's RSVP request
        event.rsvpRequests = event.rsvpRequests.filter(r => r.userId !== userId);
      }
      return event;
    });

    // Save updated events
    await AsyncStorage.setItem('events', JSON.stringify(updatedEvents));
    console.log('Updated events in storage');

    // Update user's attending events
    const { user } = getState().auth;
    if (user && user.id === userId) {
      // Get users list
      const usersJson = await AsyncStorage.getItem('users');
      let users = [];
      if (usersJson) {
        try {
          users = JSON.parse(usersJson);
          console.log('Successfully loaded users list');
        } catch (parseError) {
          console.error('Error parsing users list:', parseError);
          users = [];
        }
      }

      // Update user in users list
      const updatedUsers = users.map((u: any) => {
        if (u.id === userId) {
          return {
            ...u,
            attendingEvents: u.attendingEvents.filter((id: string) => id !== eventId)
          };
        }
        return u;
      });

      // Save updated users list
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');

      // Update current user
      const updatedUser = {
        ...user,
        attendingEvents: user.attendingEvents.filter(id => id !== eventId)
      };
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      console.log('Updated current user in storage');
      dispatch(updateUser(updatedUser));
    }

    // Update Redux state
    dispatch(cancelRsvp(eventId));
    dispatch(fetchEventsSuccess(updatedEvents));
    console.log('Updated events in Redux store');

  } catch (error) {
    console.error('Error canceling RSVP:', error);
    throw error;
  }
};

export const {
  fetchEventsStart,
  fetchEventsSuccess,
  fetchEventsFailure,
  setFilters,
  createEvent,
  updateEvent,
  deleteEvent,
  setUserEvents,
  requestRsvp,
  respondToRsvp,
  cancelRsvp,
  removeHostingEvent,
} = eventsSlice.actions;

export default eventsSlice.reducer; 