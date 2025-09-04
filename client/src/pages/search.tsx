
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, MapPin, Clock, Star, Utensils, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import VideoCard from '../components/video-card';

interface SearchFilters {
  query: string;
  location: string;
  priceRange: [number, number];
  cuisine: string[];
  dietaryRestrictions: string[];
  rating: number;
  distance: number;
  sortBy: string;
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    priceRange: [0, 1000],
    cuisine: [],
    dietaryRestrictions: [],
    rating: 0,
    distance: 10,
    sortBy: 'relevance'
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['/api/search', filters],
    queryFn: () => fetch(`/api/search?${new URLSearchParams({
      q: filters.query,
      location: filters.location,
      minPrice: filters.priceRange[0].toString(),
      maxPrice: filters.priceRange[1].toString(),
      cuisine: filters.cuisine.join(','),
      dietary: filters.dietaryRestrictions.join(','),
      rating: filters.rating.toString(),
      distance: filters.distance.toString(),
      sort: filters.sortBy
    })}`).then(res => res.json()),
    enabled: filters.query.length > 0
  });

  const { data: popularSearches = [] } = useQuery({
    queryKey: ['/api/search/trending'],
    queryFn: () => fetch('/api/search/trending').then(res => res.json())
  });

  const cuisineTypes = [
    'Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 
    'American', 'Mediterranean', 'Korean', 'Vietnamese'
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'Dairy-Free', 'Halal', 'Kosher'
  ];

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const toggleCuisine = (cuisine: string) => {
    setFilters(prev => ({
      ...prev,
      cuisine: prev.cuisine.includes(cuisine)
        ? prev.cuisine.filter(c => c !== cuisine)
        : [...prev.cuisine, cuisine]
    }));
  };

  const toggleDietary = (dietary: string) => {
    setFilters(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(dietary)
        ? prev.dietaryRestrictions.filter(d => d !== dietary)
        : [...prev.dietaryRestrictions, dietary]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for restaurants, dishes, or creators..."
                value={filters.query}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </Button>
          </div>

          {/* Location Input */}
          <div className="mt-3 relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter your location"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b bg-muted/50">
          <div className="max-w-4xl mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Price Range */}
              <div>
                <h3 className="font-medium mb-3">Price Range</h3>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                  max={1000}
                  step={50}
                  className="mb-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>₹{filters.priceRange[0]}</span>
                  <span>₹{filters.priceRange[1]}</span>
                </div>
              </div>

              {/* Distance */}
              <div>
                <h3 className="font-medium mb-3">Distance (km)</h3>
                <Slider
                  value={[filters.distance]}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, distance: value[0] }))}
                  max={50}
                  step={1}
                  className="mb-2"
                />
                <div className="text-sm text-muted-foreground">
                  Within {filters.distance} km
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-medium mb-3">Minimum Rating</h3>
                <Select value={filters.rating.toString()} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: Number(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="font-medium mb-3">Sort By</h3>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="delivery_time">Delivery Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cuisine Filters */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Cuisine Type</h3>
              <div className="flex flex-wrap gap-2">
                {cuisineTypes.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={filters.cuisine.includes(cuisine) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCuisine(cuisine)}
                  >
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div className="mt-4">
              <h3 className="font-medium mb-3">Dietary Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((dietary) => (
                  <Badge
                    key={dietary}
                    variant={filters.dietaryRestrictions.includes(dietary) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDietary(dietary)}
                  >
                    {dietary}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {filters.query ? (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Search results for "{filters.query}"
            </h2>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-video bg-muted rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((video: any) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}

            {searchResults.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Trending Searches */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Trending Searches</h2>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search: string) => (
                  <Badge
                    key={search}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quick Categories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Fast Food', icon: '🍔', query: 'fast food' },
                { name: 'Pizza', icon: '🍕', query: 'pizza' },
                { name: 'Asian', icon: '🥢', query: 'asian cuisine' },
                { name: 'Healthy', icon: '🥗', query: 'healthy food' },
                { name: 'Desserts', icon: '🍰', query: 'desserts' },
                { name: 'Coffee', icon: '☕', query: 'coffee' },
                { name: 'Indian', icon: '🍛', query: 'indian food' },
                { name: 'Street Food', icon: '🌮', query: 'street food' }
              ].map((category) => (
                <Card
                  key={category.name}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSearch(category.query)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <h3 className="font-medium">{category.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
