import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';

import { Event, EventsState, fetchEvents } from '../../store/slices/eventsSlice';

export default function MyEventsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { events } = useSelector((state: RootState) => state.events as EventsState);
  const { user } = useSelector((state: RootState) => state.auth);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        await dispatch(fetchEvents());
        if (user && events) {
          const attendingEvents = events.filter(event => 
            event.rsvpRequests?.some(request => 
              request.userId === user.id && request.status === 'accepted'
            )
          );
          setAttendingEvents(attendingEvents);
        }
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [dispatch, user]);

  const renderEventItem = ({ item }: { item: Event }) => {
    console.log('Rendering event:', item);
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/event/${item.id}` as any)}
      >
        <View style={styles.eventImageContainer}>
          {item.thumbnail ? (
            <Ionicons name="image-outline" size={40} color="#666" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={40} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDate}>{item.date} • {item.time}</Text>
          <Text style={styles.eventLocation}>{item.location}</Text>
          <View style={styles.eventMeta}>
            <View style={styles.metaLeft}>
              <Text style={styles.eventCategory}>{item.category}</Text>
              <Text style={styles.eventDistance}>
                {(item.distance || 0).toFixed(1)} km away
              </Text>
            </View>
            <Text style={styles.eventAttendees}>
              {item.currentAttendees}/{item.maxCapacity} attending
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
      </View>

      {!user ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>Please sign in</Text>
          <Text style={styles.emptySubtext}>
            Sign in to view your events
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.exploreButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : attendingEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No events yet</Text>
          <Text style={styles.emptySubtext}>
            RSVP to events to see them here
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/' as any)}
          >
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={attendingEvents}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventList: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImageContainer: {
    height: 150,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCategory: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventAttendees: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDistance: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
}); 