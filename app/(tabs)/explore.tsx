import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import EventCard from '../../components/EventCard';
import { AppDispatch, RootState } from '../../store';
import { Event, EventsState, fetchEvents } from '../../store/slices/eventsSlice';

type SortOption = 'popular' | 'newest' | 'distance';

export default function ExploreScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { events, isLoading, error } = useSelector((state: RootState) => state.events as EventsState);
  const { user } = useSelector((state: RootState) => state.auth);
  

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  const eventTypes = ['All', 'Public', 'Private'];
  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Most Popular', value: 'popular' },
    { label: 'Newest', value: 'newest' },
    { label: 'Distance', value: 'distance' },
  ];

  const categories = useMemo(() => {
    if (!events) return ['All'];
    const uniqueCategories = Array.from(new Set(events.map(event => event.category)));
    return ['All', ...uniqueCategories.sort()];
  }, [events]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        await dispatch(fetchEvents());
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };

    loadEvents();
  }, [dispatch]);

  useEffect(() => {
    if (events) {
      let filtered = [...events];

    
      if (searchQuery) {
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

   
      if (selectedCategory && selectedCategory !== 'All') {
        filtered = filtered.filter(event =>
          event.category === selectedCategory
        );
      }

      if (selectedType && selectedType !== 'All') {
        filtered = filtered.filter(event =>
          event.type.toLowerCase() === selectedType.toLowerCase()
        );
      }

    
      if (selectedDate) {
        filtered = filtered.filter(event =>
          event.date === selectedDate
        );
      }

     
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'popular':
            return b.currentAttendees - a.currentAttendees;
          case 'newest':
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case 'distance':
            return (a.distance || 0) - (b.distance || 0);
          default:
            return 0;
        }
      });

      setFilteredEvents(filtered);
    }
  }, [searchQuery, selectedCategory, selectedType, selectedDate, sortBy, events]);

  const renderEventItem = ({ item }: { item: Event }) => (
    <EventCard
      event={item}
      onPress={() => router.push(`/event/${item.id}` as any)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'there'}!</Text>
          <Text style={styles.title}>Explore Events</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.mapToggle}
            onPress={() => setShowMap(!showMap)}
          >
            <Ionicons
              name={showMap ? "list" : "map"}
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilters}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.quickFilterChip,
                  selectedCategory === category && styles.selectedQuickFilterChip,
                ]}
                onPress={() => {
                  setSelectedCategory(category === 'All' ? null : category);
                  setShowFilters(false);
                }}
              >
                <Text
                  style={[
                    styles.quickFilterText,
                    selectedCategory === category && styles.selectedQuickFilterText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {showFilters && (
            <View style={styles.filtersContainer}>
              <ScrollView style={styles.filtersScroll}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
                    {sortOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.sortChip,
                          sortBy === option.value && styles.selectedSortChip,
                        ]}
                        onPress={() => setSortBy(option.value)}
                      >
                        <Text
                          style={[
                            styles.sortChipText,
                            sortBy === option.value && styles.selectedSortChipText,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryChip,
                          selectedCategory === category && styles.selectedCategoryChip,
                        ]}
                        onPress={() => {
                          setSelectedCategory(category === 'All' ? null : category);
                          setShowFilters(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selectedCategory === category && styles.selectedCategoryChipText,
                          ]}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Event Type</Text>
                  <View style={styles.typeContainer}>
                    {eventTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeChip,
                          selectedType === type && styles.selectedTypeChip,
                        ]}
                        onPress={() => setSelectedType(type === 'All' ? null : type)}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            selectedType === type && styles.selectedTypeChipText,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      // TODO: Implement date picker
                      setSelectedDate('2024-04-15');
                    }}
                  >
                    <Text style={styles.dateInputText}>
                      {selectedDate || 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {showMap ? (
          <View style={styles.mapContainer}>
            <Text style={styles.mapPlaceholder}>Map View Coming Soon</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No events found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your search or browse all events
                </Text>
              </View>
            }
          />
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
  contentContainer: {
    flex: 1,
  },
  filtersWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filtersContainer: {
    maxHeight: 400,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  mapToggle: {
    padding: 8,
  },
  filterToggle: {
    padding: 8,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  quickFilters: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 48,
  },
  quickFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  selectedQuickFilterChip: {
    backgroundColor: '#007AFF',
  },
  quickFilterText: {
    color: '#666',
    fontSize: 14,
  },
  selectedQuickFilterText: {
    color: '#fff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  selectedSortChip: {
    backgroundColor: '#007AFF',
  },
  sortChipText: {
    color: '#666',
    fontSize: 14,
  },
  selectedSortChipText: {
    color: '#fff',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 14,
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  selectedTypeChip: {
    backgroundColor: '#007AFF',
  },
  typeChipText: {
    color: '#666',
    fontSize: 14,
  },
  selectedTypeChipText: {
    color: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholder: {
    fontSize: 18,
    color: '#666',
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
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
