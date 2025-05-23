import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch } from '../index';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdEvents: string[];
  attendingEvents: string[];
  savedEvents: string[];
  isLoggedIn: boolean;
  lastLoginAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.user = {
        ...action.payload,
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString()
      };
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    signupStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    signupSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.user = {
        ...action.payload,
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString()
      };
      state.isAuthenticated = true;
      state.error = null;
    },
    signupFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      console.log('Logout reducer called');
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    addAttendingEvent: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.attendingEvents = [...state.user.attendingEvents, action.payload];
      }
    },
    removeAttendingEvent: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.attendingEvents = state.user.attendingEvents.filter(id => id !== action.payload);
      }
    },
  },
});

export const signup = (email: string, password: string, name: string) => async (dispatch: any) => {
  dispatch(signupStart());
  try {
    
    const existingUsersJson = await AsyncStorage.getItem('users');
    const existingUsers = existingUsersJson ? JSON.parse(existingUsersJson) : [];

    if (existingUsers.some((user: any) => user.email === email)) {
      dispatch(signupFailure('Email already registered'));
      return;
    }

    
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password, 
      createdEvents: [],
      attendingEvents: [],
      savedEvents: [],
      isLoggedIn: true,
      lastLoginAt: new Date().toISOString()
    };

    // Save to users list
    await AsyncStorage.setItem('users', JSON.stringify([...existingUsers, newUser]));

    // Save current user
    await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));

    dispatch(signupSuccess(newUser));
  } catch (error: any) {
    dispatch(signupFailure(error.message));
  }
};

export const login = (email: string, password: string) => async (dispatch: any) => {
  console.log('Login action started');
  dispatch(loginStart());
  try {
    // Get all users
    const usersJson = await AsyncStorage.getItem('users');
    console.log('Retrieved users from storage:', usersJson);
    const users = usersJson ? JSON.parse(usersJson) : [];
    console.log('Parsed users:', users);

    // Find the user
    const user = users.find((u: any) => u.email === email && u.password === password);
    console.log('Found user:', user);

    if (user) {
      // Get events from storage to update user's event lists
      const eventsJson = await AsyncStorage.getItem('events');
      const events = eventsJson ? JSON.parse(eventsJson) : [];
      console.log('Loaded events from storage:', events.length);

      // Update user's event lists
      const hostingEvents = events
        .filter((event: any) => event.organizer === user.name)
        .map((event: any) => event.id);
      console.log('User hosting events:', hostingEvents);

      const attendingEvents = events
        .filter((event: any) => 
          event.rsvpRequests?.some((request: any) => 
            request.userId === user.id && request.status === 'accepted'
          )
        )
        .map((event: any) => event.id);
      console.log('User attending events:', attendingEvents);

      // Update user's login status and event lists
      const updatedUser = {
        ...user,
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString(),
        createdEvents: hostingEvents,
        attendingEvents: attendingEvents
      };

      // Update user in users list
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? updatedUser : u
      );
      await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      console.log('Updated users list in storage');

      // Save current user session
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      console.log('Saved current user to storage');
      
      // Update events in Redux store
      dispatch({ type: 'events/fetchEventsSuccess', payload: events });
      dispatch({ 
        type: 'events/setUserEvents', 
        payload: { 
          hostingEvents, 
          attendingEvents 
        } 
      });
      
      dispatch(loginSuccess(updatedUser));
      console.log('Dispatched login success');
      return updatedUser;
    } else {
      console.log('User not found or invalid credentials');
      dispatch(loginFailure('Invalid email or password'));
      return null;
    }
  } catch (error: any) {
    console.error('Login error in auth slice:', error);
    dispatch(loginFailure(error.message));
    return null;
  }
};

export const logoutUser = () => async (dispatch: AppDispatch) => {
  try {
    console.log('Starting logout process...');
    // Get current user
    const currentUserJson = await AsyncStorage.getItem('currentUser');
    console.log('Current user from storage:', currentUserJson);
    
    if (currentUserJson) {
      const currentUser = JSON.parse(currentUserJson);
      console.log('Parsed current user:', currentUser);
      
      // Update user's login status in users list
      const usersJson = await AsyncStorage.getItem('users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const updatedUsers = users.map((u: any) => 
          u.id === currentUser.id ? { 
            ...u,  // Keep all existing user data
            isLoggedIn: false, 
            lastLoginAt: null
          } : u
        );
        await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
        console.log('Updated users list in storage');
      }

      // Update current user's login status
      const updatedCurrentUser = {
        ...currentUser, // Keep all existing user data
        isLoggedIn: false,
        lastLoginAt: null
      };
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
      console.log('Updated current user in storage');
    }
    
    // Dispatch logout action to update Redux state
    console.log('Dispatching logout action...');
    dispatch(logout());
    console.log('Logout process completed');
  } catch (error: any) {
    console.error('Logout error:', error);
    throw error; // Propagate error to handle in UI
  }
};

// Add a new thunk to load stored user
export const loadStoredUser = (user: User) => async (dispatch: any) => {
  try {
    // Check if user is still logged in
    if (user.isLoggedIn) {
      // Verify the user still exists in the users list
      const usersJson = await AsyncStorage.getItem('users');
      if (usersJson) {
        const users = JSON.parse(usersJson);
        const existingUser = users.find((u: any) => u.id === user.id);
        if (existingUser) {
          dispatch(loginSuccess(existingUser));
          return;
        }
      }
    }
    // If user is not logged in or not found, clear the session
    await AsyncStorage.removeItem('currentUser');
    dispatch(logout());
  } catch (error: any) {
    console.error('Error loading stored user:', error);
    dispatch(logout());
  }
};

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  signupStart,
  signupSuccess,
  signupFailure,
  logout,
  updateUser,
  addAttendingEvent,
  removeAttendingEvent,
} = authSlice.actions;

export default authSlice.reducer; 