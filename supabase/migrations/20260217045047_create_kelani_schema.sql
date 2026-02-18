/*
  # Kelani Real Estate Database Schema

  1. New Tables
    - `projects` - Real estate development projects
      - `id` (uuid, primary key)
      - `name` (text) - Project name
      - `slug` (text, unique) - URL-friendly identifier
      - `tagline` (text) - Short marketing tagline
      - `description` (text) - Full project description
      - `location` (text) - Location name
      - `country` (text) - Country
      - `price_from` (numeric) - Starting price
      - `status` (text) - Project status (upcoming, ongoing, completed)
      - `image_url` (text) - Main image URL
      - `gallery` (text[]) - Additional image URLs
      - `bedrooms_min` (integer) - Minimum bedrooms
      - `bedrooms_max` (integer) - Maximum bedrooms
      - `area_from` (integer) - Minimum area in sqft
      - `area_to` (integer) - Maximum area in sqft
      - `amenities` (text[]) - List of amenities
      - `completion_date` (text) - Expected completion
      - `featured` (boolean) - Whether featured on homepage
      - `created_at` (timestamptz)

    - `locations` - Locations where Kelani operates
      - `id` (uuid, primary key)
      - `name` (text) - Location name
      - `slug` (text, unique) - URL-friendly identifier
      - `description` (text) - Location description
      - `image_url` (text) - Location image
      - `country` (text) - Country name
      - `city` (text) - City name
      - `projects_count` (integer) - Number of projects
      - `created_at` (timestamptz)

    - `contact_submissions` - Contact form submissions
      - `id` (uuid, primary key)
      - `full_name` (text) - Submitter name
      - `email` (text) - Submitter email
      - `phone` (text) - Phone number
      - `message` (text) - Message content
      - `project_interest` (text) - Project they're interested in
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for projects and locations (marketing site)
    - Authenticated insert for contact_submissions
    - Anonymous insert for contact_submissions (public contact form)
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text DEFAULT '',
  description text DEFAULT '',
  location text DEFAULT '',
  country text DEFAULT 'Kenya',
  price_from numeric DEFAULT 0,
  status text DEFAULT 'ongoing',
  image_url text DEFAULT '',
  gallery text[] DEFAULT '{}',
  bedrooms_min integer DEFAULT 1,
  bedrooms_max integer DEFAULT 4,
  area_from integer DEFAULT 0,
  area_to integer DEFAULT 0,
  amenities text[] DEFAULT '{}',
  completion_date text DEFAULT '',
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (status IN ('ongoing', 'completed', 'upcoming'));

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  country text DEFAULT 'Kenya',
  city text DEFAULT '',
  projects_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations"
  ON locations FOR SELECT
  TO anon, authenticated
  USING (true IS NOT false);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  message text DEFAULT '',
  project_interest text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL AND
    full_name != '' AND
    email IS NOT NULL AND
    email != ''
  );
