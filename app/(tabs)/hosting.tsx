import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import EventCard from '../../components/EventCard';
import { RootState } from '../../store';
import { fetchEvents } from '../../store/slices/eventsSlice';

export default function HostingScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { events, hostingEvents } = useSelector((state: RootState) => state.events);
  const { user } = useSelector((state: RootState) => state.auth);

  // Load data when screen mounts
  useEffect(() => {
    console.log('Hosting screen mounted, loading data...');
    dispatch(fetchEvents());
  }, [dispatch]);

  const hostedEvents = events.filter(event => hostingEvents.includes(event.id));

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hosting</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.message}>Please log in to view your hosted events</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hostedEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hosting</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.message}>You haven't hosted any events yet</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/create')}
          >
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hosting</Text>
      </View>
      <FlatList
        data={hostedEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => router.push(`/event/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
}); 