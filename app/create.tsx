import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { createEventInStorage, Event } from '../store/slices/eventsSlice';

const categories = ['Culture', 'Academic', 'Sports', 'Music', 'Food', 'Other'];

export default function CreateEventScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [hasRSVP, setHasRSVP] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!date.trim()) {
      newErrors.date = 'Date is required';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        newErrors.date = 'Date must be in YYYY-MM-DD format';
      } else {
        const selectedDate = new Date(date);
        const today = new Date();
        if (selectedDate < today) {
          newErrors.date = 'Date cannot be in the past';
        }
      }
    }

    if (!time.trim()) {
      newErrors.time = 'Time is required';
    } else {
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
      if (!timeRegex.test(time)) {
        newErrors.time = 'Time must be in HH:MM AM/PM format';
      }
    }

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (hasRSVP && maxCapacity) {
      const capacity = parseInt(maxCapacity);
      if (isNaN(capacity) || capacity <= 0) {
        newErrors.maxCapacity = 'Capacity must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'Please sign in to create an event',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign In',
            onPress: () => router.push('/login' as any),
          },
        ]
      );
      return;
    }

    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    try {
      const eventData: Event = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        address: location.trim(),
        category,
        type: isPublic ? 'public' : 'private',
        maxCapacity: hasRSVP ? parseInt(maxCapacity) : undefined,
        currentAttendees: 0,
        organizer: user.name,
        rsvpRequests: []
      };

      await dispatch(createEventInStorage(eventData) as any);
      console.log('Event created successfully');
      
      Alert.alert('Success', 'Event created successfully!');
      router.back(); 
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Event</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={styles.submitText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter event title"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter event description"
            multiline
            numberOfLines={4}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={[styles.input, errors.date && styles.inputError]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Time *</Text>
          <TextInput
            style={[styles.input, errors.time && styles.inputError]}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM AM/PM"
          />
          {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={[styles.input, errors.location && styles.inputError]}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter event location"
          />
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Public Event</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Enable RSVP</Text>
            <Switch value={hasRSVP} onValueChange={setHasRSVP} />
          </View>
        </View>

        {hasRSVP && (
          <View style={styles.section}>
            <Text style={styles.label}>Maximum Capacity</Text>
            <TextInput
              style={[styles.input, errors.maxCapacity && styles.inputError]}
              value={maxCapacity}
              onChangeText={setMaxCapacity}
              placeholder="Enter maximum number of attendees"
              keyboardType="numeric"
            />
            {errors.maxCapacity && <Text style={styles.errorText}>{errors.maxCapacity}</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  submitText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 