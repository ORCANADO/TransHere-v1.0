import { Model } from '@/types';

export const MOCK_MODELS: Model[] = [
  { 
    id: "1", 
    name: "Alice", 
    image_url: "https://placehold.co/600x800/png", 
    tags: ["Blonde", "Petite"], 
    slug: "alice",
    is_verified: true, 
    is_new: true, 
    is_pinned: false
  },
  { 
    id: "2", 
    name: "Luna", 
    image_url: "https://placehold.co/600x800/png", 
    tags: ["Latina"], 
    slug: "luna",
    is_verified: false, 
    is_new: false, 
    is_pinned: false
  },
  { 
    id: "3", 
    name: "Viky", 
    image_url: "https://placehold.co/600x800/png", 
    tags: ["Redhead", "Tall"], 
    slug: "viky",
    is_verified: true, 
    is_new: false, 
    is_pinned: false
  },
   { 
    id: "4", 
    name: "Sophie", 
    image_url: "https://placehold.co/600x800/png", 
    tags: ["Asian"], 
    slug: "sophie",
    is_verified: false, 
    is_new: true, 
    is_pinned: false
  }
];

