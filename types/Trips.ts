export interface TripFlight {
  airline: string;
  flightNumber: string;
  departureTime: string; // ISO 8601 string or HH:mm
  arrivalTime: string;   // ISO 8601 string or HH:mm
  departureAirport: string;
  arrivalAirport: string;
  segmentType?: '去程' | '回程' | '轉機' | '其他';
  departureAirportName?: string;
  arrivalAirportName?: string;
  gate?: string;
  seat?: string;
}

export interface TripItineraryItem {
  timeSlot: 'morning' | 'afternoon' | 'evening';
  timeString: string; // e.g., "09:00", "14:30"
  activity: string;
  location?: string;
  notes?: string;
}

export interface TripItineraryDay {
  date: string; // YYYY-MM-DD
  items: TripItineraryItem[];
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  summary: string | null;
  destination: string | null;
  startDate: number | null; // timestamp_ms
  endDate: number | null;   // timestamp_ms
  status: 'planning' | 'confirmed' | 'completed';
  coverImage: string | null;
  itinerary: TripItineraryDay[] | null;
  flights: TripFlight[] | null;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: number;
  updatedAt: number;
}
