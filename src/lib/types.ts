export interface Project {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  location: string;
  country: string;
  price_from: number;
  status: 'ongoing' | 'upcoming' | 'completed';
  image_url: string;
  gallery: string[];
  bedrooms_min: number;
  bedrooms_max: number;
  area_from: number;
  area_to: number;
  amenities: string[];
  completion_date: string;
  featured: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  country: string;
  city: string;
  projects_count: number;
  created_at: string;
}

export interface ContactSubmission {
  full_name: string;
  email: string;
  phone: string;
  message: string;
  project_interest: string;
}
