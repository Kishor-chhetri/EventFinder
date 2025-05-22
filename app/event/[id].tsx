import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { addAttendingEvent, removeAttendingEvent } from '../../store/slices/authSlice';
import { cancelRsvpInStorage, deleteEventFromStorage, Event, EventsState, removeHostingEvent, requestRsvpInStorage, respondToRsvpInStorage } from '../../store/slices/eventsSlice';

export default function EventDetailScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useLocalSearchParams();
  const { events } = useSelector((state: RootState) => state.events as EventsState);
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [showAttendees, setShowAttendees] = useState(false);

  useEffect(() => {
    const foundEvent = events.find((e: Event) => e.id === id);
    if (foundEvent) {
      setEvent(foundEvent);
      
      // Check if user is attending
      const isUserAttending = user?.attendingEvents?.includes(foundEvent.id) || false;
      setIsAttending(isUserAttending);
      
      // Check RSVP status
      if (user && foundEvent.rsvpRequests) {
        const userRequest = foundEvent.rsvpRequests.find(r => r.userId === user.id);
        if (userRequest) {
          setRsvpStatus(userRequest.status);
          // If request was accepted, ensure isAttending is true
          if (userRequest.status === 'accepted' && !isUserAttending) {
            dispatch(addAttendingEvent(foundEvent.id));
          }
        } else {
          setRsvpStatus('none');
        }
      } else {
        setRsvpStatus('none');
      }
    }
    setIsLoading(false);
  }, [id, events, user, dispatch]);

  const handleRsvp = async () => {
    if (!event || !user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to RSVP to events',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Sign In',
            onPress: () => router.push('/login' as any)
          }
        ]
      );
      return;
    }

    if (isAttending) {
      try {
        await dispatch(cancelRsvpInStorage(event.id, user.id));
        dispatch(removeAttendingEvent(event.id));
        setIsAttending(false);
        setRsvpStatus('none');
        Alert.alert('Success', 'You have cancelled your RSVP for this event');
      } catch (error) {
        console.error('Error cancelling RSVP:', error);
        Alert.alert('Error', 'Failed to cancel RSVP');
      }
    } else {
      if (event.currentAttendees >= (event.maxCapacity || Infinity)) {
        Alert.alert('Event Full', 'Sorry, this event has reached its maximum capacity');
        return;
      }
      try {
        await dispatch(requestRsvpInStorage({ 
          eventId: event.id, 
          userId: user.id, 
          userName: user.name 
        }));
        setRsvpStatus('pending');
        Alert.alert('Success', 'Your RSVP request has been sent to the organizer');
      } catch (error) {
        console.error('Error requesting RSVP:', error);
        Alert.alert('Error', 'Failed to send RSVP request');
      }
    }
  };

  const handleRespondToRsvp = async (userId: string, status: 'accepted' | 'rejected') => {
    if (!event) return;
    try {
      await dispatch(respondToRsvpInStorage(event.id, userId, status));
      if (status === 'accepted') {
        dispatch(addAttendingEvent(event.id));
        if (userId === user?.id) {
          setIsAttending(true);
          setRsvpStatus('accepted');
        }
      } else if (status === 'rejected' && userId === user?.id) {
        setIsAttending(false);
        setRsvpStatus('rejected');
      }
      Alert.alert('Success', `RSVP request ${status}`);
    } catch (error) {
      console.error('Error responding to RSVP:', error);
      Alert.alert('Error', 'Failed to respond to RSVP request');
    }
  };

  const handleEditEvent = () => {
    if (!event) return;
    router.push(`/edit-event?id=${event.id}` as any);
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteEventFromStorage(event.id));
              dispatch(removeHostingEvent(event.id));
              router.back();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Check out this event: ${event.title} on ${event.date} at ${event.time}!`,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const isOrganizer = user?.name === event.organizer;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          {isOrganizer && (
            <View style={styles.organizerButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditEvent}
              >
                <Ionicons name="create-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteEvent}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.eventImageContainer}>
          {event.thumbnail ? (
            <Image
              source={{ uri: event.thumbnail }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={48} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{event.date} • {event.time}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {event.currentAttendees}/{event.maxCapacity || '∞'} attending
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{event.category}</Text>
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{event.description}</Text>

          {isOrganizer && (
            <>
              <Text style={styles.sectionTitle}>Attendees ({event.currentAttendees})</Text>
              {event.attendees && event.attendees.length > 0 ? (
                event.attendees.map((attendee) => (
                  <View key={attendee} style={styles.attendeeItem}>
                    <Ionicons name="person-circle-outline" size={24} color="#666" />
                    <Text style={styles.attendeeText}>{attendee}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noAttendeesText}>No attendees yet</Text>
              )}

              {event.rsvpRequests && event.rsvpRequests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>RSVP Requests</Text>
                  {event.rsvpRequests.map((request) => (
                    <View key={request.userId} style={styles.rsvpRequest}>
                      <View style={styles.requestInfo}>
                        <Ionicons name="person-circle-outline" size={24} color="#666" />
                        <Text style={styles.requestText}>{request.userName}</Text>
                      </View>
                      {request.status === 'pending' && (
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={[styles.requestButton, styles.acceptButton]}
                            onPress={() => handleRespondToRsvp(request.userId, 'accepted')}
                          >
                            <Text style={styles.requestButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.requestButton, styles.rejectButton]}
                            onPress={() => handleRespondToRsvp(request.userId, 'rejected')}
                          >
                            <Text style={styles.requestButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {request.status !== 'pending' && (
                        <Text style={[
                          styles.requestStatus,
                          request.status === 'accepted' ? styles.acceptedStatus : styles.rejectedStatus
                        ]}>
                          {request.status}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        {!isOrganizer && (
          <TouchableOpacity
            style={[
              styles.rsvpButton,
              isAttending && styles.rsvpButtonActive,
              rsvpStatus === 'pending' && styles.rsvpButtonPending
            ]}
            onPress={handleRsvp}
            disabled={rsvpStatus === 'pending'}
          >
            <Text style={[
              styles.rsvpButtonText,
              isAttending && styles.rsvpButtonTextActive,
              rsvpStatus === 'pending' && styles.rsvpButtonTextPending
            ]}>
              {rsvpStatus === 'pending' ? 'Request Sent' :
               isAttending ? 'Cancel RSVP' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  organizerButtons: {
    flexDirection: 'row',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  eventImageContainer: {
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  attendeeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  noAttendeesText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  rsvpRequest: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requestStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  acceptedStatus: {
    color: '#34C759',
  },
  rejectedStatus: {
    color: '#FF3B30',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  shareButton: {
    padding: 12,
    marginRight: 12,
  },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rsvpButtonActive: {
    backgroundColor: '#FF3B30',
  },
  rsvpButtonPending: {
    backgroundColor: '#FF9500',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rsvpButtonTextActive: {
    color: '#fff',
  },
  rsvpButtonTextPending: {
    color: '#fff',
  },
}); 