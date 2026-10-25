import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DayDateItem } from '../types/task';

interface WeekDateSelectorProps {
  days: DayDateItem[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  weekOffset?: number;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onResetToday?: () => void;
}

export const WeekDateSelector: React.FC<WeekDateSelectorProps> = ({
  days,
  selectedDate,
  onSelectDate,
  weekOffset = 0,
  onPrevWeek,
  onNextWeek,
}) => {
  let weekLabel = 'This Week';
  if (weekOffset === 1) weekLabel = 'Next Week';
  else if (weekOffset === -1) weekLabel = 'Last Week';
  else if (weekOffset > 1) weekLabel = `In ${weekOffset} Weeks`;
  else if (weekOffset < -1) weekLabel = `${Math.abs(weekOffset)} Weeks Ago`;

  // Swipe gesture detection for switching weeks smoothly
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 40 && onPrevWeek) {
          onPrevWeek();
        } else if (gestureState.dx < -40 && onNextWeek) {
          onNextWeek();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Week Switcher Header Row */}
      <View style={styles.weekHeaderRow}>
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={onPrevWeek}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Previous Week"
        >
          <Ionicons name="chevron-back" size={16} color="#007aff" />
        </TouchableOpacity>

        <Text style={styles.weekTitleText}>{weekLabel}</Text>

        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={onNextWeek}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Next Week"
        >
          <Ionicons name="chevron-forward" size={16} color="#007aff" />
        </TouchableOpacity>
      </View>

      {/* 7-day cards: evenly distributed across the screen width */}
      <View style={styles.daysRow}>
        {days.map((item) => {
          const isSelected = item.fullDateString === selectedDate;
          return (
            <TouchableOpacity
              key={item.fullDateString}
              style={[
                styles.dayCard,
                isSelected ? styles.dayCardSelected : styles.dayCardUnselected,
              ]}
              onPress={() => onSelectDate(item.fullDateString)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected ? styles.dayLabelSelected : styles.dayLabelUnselected,
                ]}
                numberOfLines={1}
              >
                {item.dayLabel}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  isSelected ? styles.dateNumberSelected : styles.dateNumberUnselected,
                ]}
                numberOfLines={1}
              >
                {item.dateNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  weekNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  weekTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    width: '100%',
  },
  dayCard: {
    flex: 1,
    height: 64,
    marginHorizontal: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayCardUnselected: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#edf2f7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dayCardSelected: {
    backgroundColor: '#007aff',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayLabelUnselected: {
    color: '#94a3b8',
  },
  dayLabelSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dateNumber: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateNumberUnselected: {
    color: '#1e293b',
  },
  dateNumberSelected: {
    color: '#ffffff',
  },
});


