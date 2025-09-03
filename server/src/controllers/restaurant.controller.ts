import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { restaurants, menuItems, categories, reviews, restaurantCategories } from '../../../shared/schema';
import { and, eq, desc, sql, inArray } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/express';
import { uploadToCloudinary } from '../services/cloudinary.service';
import logger from '../utils/logger';

// Helper function to format restaurant response
const formatRestaurantResponse = (restaurant: any) => ({
  id: restaurant.id,
  name: restaurant.name,
  description: restaurant.description,
  logo: restaurant.logo,
  coverImage: restaurant.coverImage,
  address: restaurant.address,
  city: restaurant.city,
  state: restaurant.state,
  country: restaurant.country,
  postalCode: restaurant.postalCode,
  location: restaurant.location,
  cuisineType: restaurant.cuisineType,
  isVeg: restaurant.isVeg,
  isPureVeg: restaurant.isPureVeg,
  hasTableBooking: restaurant.hasTableBooking,
  hasOnlineDelivery: restaurant.hasOnlineDelivery,
  isDeliveringNow: restaurant.isDeliveringNow,
  averageCostForTwo: restaurant.averageCostForTwo,
  currency: restaurant.currency,
  highlights: restaurant.highlights || [],
  openHours: restaurant.openHours,
  contactNumber: restaurant.contactNumber,
  website: restaurant.website,
  isOpen: restaurant.isOpen,
  rating: restaurant.rating,
  ratingCount: restaurant.ratingCount,
  isFavorited: restaurant.isFavorited || false,
  categories: restaurant.categories || [],
  menu: restaurant.menu || [],
  createdAt: restaurant.createdAt,
  updatedAt: restaurant.updatedAt,
});

// Create a new restaurant
export const createRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      location,
      cuisineType,
      isVeg = false,
      isPureVeg = false,
      hasTableBooking = false,
      hasOnlineDelivery = true,
      isDeliveringNow = true,
      averageCostForTwo,
      currency = 'INR',
      highlights = [],
      openHours,
      contactNumber,
      website,
      categoryIds = [],
    } = req.body;

    // Check if user already has a restaurant
    const existingRestaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.ownerId, userId),
    });

    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        error: 'You already have a restaurant registered',
      });
    }

    // Upload logo and cover image if provided
    let logoUrl = '';
    let coverImageUrl = '';

    if (req.files?.logo) {
      const logoFile = Array.isArray(req.files.logo) ? req.files.logo[0] : req.files.logo;
      const uploadResult = await uploadToCloudinary(logoFile.path, 'restaurants/logos');
      logoUrl = uploadResult.secure_url;
    }

    if (req.files?.coverImage) {
      const coverFile = Array.isArray(req.files.coverImage) ? req.files.coverImage[0] : req.files.coverImage;
      const uploadResult = await uploadToCloudinary(coverFile.path, 'restaurants/covers');
      coverImageUrl = uploadResult.secure_url;
    }

    // Start transaction
    const [restaurant] = await db.transaction(async (tx) => {
      // Create restaurant
      const [newRestaurant] = await tx.insert(restaurants).values({
        id: uuidv4(),
        name,
        description,
        logo: logoUrl,
        coverImage: coverImageUrl,
        address,
        city,
        state,
        country,
        postalCode,
        location: location ? JSON.parse(location) : null,
        cuisineType,
        isVeg,
        isPureVeg,
        hasTableBooking,
        hasOnlineDelivery,
        isDeliveringNow,
        averageCostForTwo: parseFloat(averageCostForTwo) || 0,
        currency,
        highlights: Array.isArray(highlights) ? highlights : [],
        openHours: openHours ? JSON.parse(openHours) : {},
        contactNumber,
        website,
        ownerId: userId,
        isOpen: true,
        rating: 0,
        ratingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Add restaurant categories if provided
      if (categoryIds.length > 0) {
        const validCategoryIds = Array.isArray(categoryIds) 
          ? categoryIds 
          : typeof categoryIds === 'string' 
            ? categoryIds.split(',').map((id: string) => id.trim())
            : [];

        if (validCategoryIds.length > 0) {
          await tx.insert(restaurantCategories).values(
            validCategoryIds.map((categoryId: string) => ({
              id: uuidv4(),
              restaurantId: newRestaurant.id,
              categoryId,
              createdAt: new Date(),
            }))
          );
        }
      }

      return newRestaurant;
    });

    // Get the full restaurant with relations
    const fullRestaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, restaurant.id),
      with: {
        categories: {
          with: {
            category: true,
          },
        },
        menu: {
          where: (menuItems, { eq }) => eq(menuItems.isAvailable, true),
          orderBy: [menuItems.category, menuItems.name],
        },
      },
    });

    res.status(201).json({
      success: true,
      data: formatRestaurantResponse({
        ...fullRestaurant,
        categories: fullRestaurant.categories?.map((rc: any) => rc.category) || [],
        isFavorited: false,
      }),
    });
  } catch (error) {
    logger.error('Create restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create restaurant',
    });
  }
};

// Get restaurant by ID
export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user?.id;

    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, id),
      with: {
        categories: {
          with: {
            category: true,
          },
        },
        menu: {
          where: (menuItems, { eq }) => eq(menuItems.isAvailable, true),
          orderBy: [menuItems.category, menuItems.name],
        },
        reviews: {
          orderBy: [desc(reviews.createdAt)],
          limit: 5,
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatar: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Check if restaurant is favorited by user
    let isFavorited = false;
    if (userId) {
      const favorite = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, userId),
          eq(favorites.restaurantId, id),
          eq(favorites.type, 'restaurant')
        ),
      });
      isFavorited = !!favorite;
    }

    // Calculate average rating
    const ratingData = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.restaurantId, id))
      .then((res) => ({
        avg: parseFloat(res[0]?.avg) || 0,
        count: parseInt(res[0]?.count) || 0,
      }));

    res.status(200).json({
      success: true,
      data: formatRestaurantResponse({
        ...restaurant,
        categories: restaurant.categories?.map((rc: any) => rc.category) || [],
        rating: ratingData.avg,
        ratingCount: ratingData.count,
        isFavorited,
      }),
    });
  } catch (error) {
    logger.error('Get restaurant by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant',
    });
  }
};

// Update restaurant
export const updateRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if restaurant exists and user is the owner
    const existingRestaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, id),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to update it',
      });
    }

    // Handle file uploads if any
    let logoUrl = existingRestaurant.logo;
    let coverImageUrl = existingRestaurant.coverImage;

    if (req.files?.logo) {
      const logoFile = Array.isArray(req.files.logo) ? req.files.logo[0] : req.files.logo;
      const uploadResult = await uploadToCloudinary(logoFile.path, 'restaurants/logos');
      logoUrl = uploadResult.secure_url;
    }

    if (req.files?.coverImage) {
      const coverFile = Array.isArray(req.files.coverImage) ? req.files.coverImage[0] : req.files.coverImage;
      const uploadResult = await uploadToCloudinary(coverFile.path, 'restaurants/covers');
      coverImageUrl = uploadResult.secure_url;
    }

    // Prepare update data
    const updateValues: any = {
      ...updateData,
      logo: logoUrl,
      coverImage: coverImageUrl,
      updatedAt: new Date(),
    };

    // Handle location if provided
    if (updateData.location) {
      updateValues.location = typeof updateData.location === 'string' 
        ? JSON.parse(updateData.location) 
        : updateData.location;
    }

    // Handle openHours if provided
    if (updateData.openHours) {
      updateValues.openHours = typeof updateData.openHours === 'string'
        ? JSON.parse(updateData.openHours)
        : updateData.openHours;
    }

    // Handle highlights if provided
    if (updateData.highlights) {
      updateValues.highlights = Array.isArray(updateData.highlights)
        ? updateData.highlights
        : [updateData.highlights];
    }

    // Update restaurant
    const [updatedRestaurant] = await db
      .update(restaurants)
      .set(updateValues)
      .where(eq(restaurants.id, id))
      .returning();

    // Update categories if provided
    if (updateData.categoryIds) {
      const validCategoryIds = Array.isArray(updateData.categoryIds)
        ? updateData.categoryIds
        : typeof updateData.categoryIds === 'string'
          ? updateData.categoryIds.split(',').map((id: string) => id.trim())
          : [];

      if (validCategoryIds.length > 0) {
        // Delete existing categories
        await db
          .delete(restaurantCategories)
          .where(eq(restaurantCategories.restaurantId, id));

        // Add new categories
        await db.insert(restaurantCategories).values(
          validCategoryIds.map((categoryId: string) => ({
            id: uuidv4(),
            restaurantId: id,
            categoryId,
            createdAt: new Date(),
          }))
        );
      }
    }

    // Get the full updated restaurant with relations
    const fullRestaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, id),
      with: {
        categories: {
          with: {
            category: true,
          },
        },
        menu: {
          where: (menuItems, { eq }) => eq(menuItems.isAvailable, true),
          orderBy: [menuItems.category, menuItems.name],
        },
      },
    });

    res.status(200).json({
      success: true,
      data: formatRestaurantResponse({
        ...fullRestaurant,
        categories: fullRestaurant.categories?.map((rc: any) => rc.category) || [],
        isFavorited: await db.query.favorites.findFirst({
          where: and(
            eq(favorites.userId, userId),
            eq(favorites.restaurantId, id),
            eq(favorites.type, 'restaurant')
          ),
        }).then(fav => !!fav),
      }),
    });
  } catch (error) {
    logger.error('Update restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant',
    });
  }
};

// Delete restaurant
export const deleteRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if restaurant exists and user is the owner
    const existingRestaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, id),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to delete it',
      });
    }

    // Soft delete (mark as inactive)
    await db
      .update(restaurants)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id));

    // TODO: Optionally delete associated images from cloud storage

    res.status(200).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    logger.error('Delete restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete restaurant',
    });
  }
};

// Get all restaurants with filters and pagination
export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      cuisineType,
      minRating = 0,
      isPureVeg,
      hasOnlineDelivery,
      hasTableBooking,
      sortBy = 'rating',
      sortOrder = 'desc',
      userId,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [eq(restaurants.isActive, true)];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        sql`(${restaurants.name} ILIKE ${searchTerm} OR ${restaurants.description} ILIKE ${searchTerm} OR ${restaurants.cuisineType} ILIKE ${searchTerm} OR ${restaurants.city} ILIKE ${searchTerm})`
      );
    }

    if (cuisineType) {
      const types = Array.isArray(cuisineType) 
        ? cuisineType 
        : [cuisineType];
      conditions.push(inArray(restaurants.cuisineType, types));
    }

    if (isPureVeg === 'true') {
      conditions.push(eq(restaurants.isPureVeg, true));
    }

    if (hasOnlineDelivery === 'true') {
      conditions.push(eq(restaurants.hasOnlineDelivery, true));
    }

    if (hasTableBooking === 'true') {
      conditions.push(eq(restaurants.hasTableBooking, true));
    }

    // Build order by
    let orderBy: any[] = [];
    switch (sortBy) {
      case 'rating':
        orderBy = [sql`${restaurants.rating} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`];
        break;
      case 'deliveryTime':
        // Assuming there's a delivery_time column or similar
        orderBy = [sql`${restaurants.avgDeliveryTime} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`];
        break;
      case 'costForTwo':
        orderBy = [sql`${restaurants.averageCostForTwo} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`];
        break;
      default:
        orderBy = [desc(restaurants.createdAt)];
    }

    // Add secondary sort by rating
    if (sortBy !== 'rating') {
      orderBy.push(desc(restaurants.rating));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(restaurants)
      .where(and(...conditions))
      .then((res) => parseInt(res[0]?.count) || 0);

    // Get paginated restaurants
    const restaurantList = await db.query.restaurants.findMany({
      where: and(...conditions),
      orderBy,
      limit: Number(limit),
      offset,
      with: {
        categories: {
          with: {
            category: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    // Get user's favorite restaurants if userId is provided
    let userFavorites: string[] = [];
    if (userId) {
      const favorites = await db.query.favorites.findMany({
        where: and(
          eq(favorites.userId, userId as string),
          eq(favorites.type, 'restaurant')
        ),
        columns: {
          restaurantId: true,
        },
      });
      userFavorites = favorites.map(f => f.restaurantId);
    }

    // Format response
    const formattedRestaurants = await Promise.all(
      restaurantList.map(async (restaurant) => {
        // Calculate average rating
        const ratingData = await db
          .select({
            avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(reviews)
          .where(eq(reviews.restaurantId, restaurant.id))
          .then((res) => ({
            avg: parseFloat(res[0]?.avg) || 0,
            count: parseInt(res[0]?.count) || 0,
          }));

        return formatRestaurantResponse({
          ...restaurant,
          categories: restaurant.categories?.map((rc: any) => rc.category) || [],
          rating: ratingData.avg,
          ratingCount: ratingData.count,
          isFavorited: userFavorites.includes(restaurant.id),
        });
      })
    );

    res.status(200).json({
      success: true,
      data: formattedRestaurants,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
    });
  }
};

// Toggle restaurant favorite status
export const toggleFavoriteRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;

    // Check if restaurant exists
    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, restaurantId),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Check if already favorited
    const existingFavorite = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, userId),
        eq(favorites.restaurantId, restaurantId),
        eq(favorites.type, 'restaurant')
      ),
    });

    let isFavorited;
    
    if (existingFavorite) {
      // Remove from favorites
      await db
        .delete(favorites)
        .where(eq(favorites.id, existingFavorite.id));
      isFavorited = false;
    } else {
      // Add to favorites
      await db.insert(favorites).values({
        id: uuidv4(),
        userId,
        restaurantId,
        type: 'restaurant',
        createdAt: new Date(),
      });
      isFavorited = true;
    }

    res.status(200).json({
      success: true,
      data: {
        isFavorited,
      },
    });
  } catch (error) {
    logger.error('Toggle favorite restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update favorite status',
    });
  }
};

// Get restaurant reviews
export const getRestaurantReviews = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Check if restaurant exists
    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, restaurantId),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Get reviews with user info
    const reviewsList = await db.query.reviews.findMany({
      where: eq(reviews.restaurantId, restaurantId),
      orderBy: [desc(reviews.createdAt)],
      limit: Number(limit),
      offset,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.restaurantId, restaurantId))
      .then((res) => parseInt(res[0]?.count) || 0);

    res.status(200).json({
      success: true,
      data: reviewsList.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        user: review.user,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get restaurant reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant reviews',
    });
  }
};

// Add restaurant review
export const addRestaurantReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    // Check if restaurant exists
    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, restaurantId),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Check if user has already reviewed this restaurant
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.restaurantId, restaurantId),
        eq(reviews.userId, userId)
      ),
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this restaurant',
      });
    }

    // Create review
    const [review] = await db.insert(reviews).values({
      id: uuidv4(),
      rating: Number(rating),
      comment,
      userId,
      restaurantId,
      images: [], // Handle image uploads if needed
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Update restaurant rating
    const ratingData = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.restaurantId, restaurantId))
      .then((res) => ({
        avg: parseFloat(res[0]?.avg) || 0,
        count: parseInt(res[0]?.count) || 0,
      }));

    await db
      .update(restaurants)
      .set({
        rating: ratingData.avg,
        ratingCount: ratingData.count,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, restaurantId));

    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        avatar: true,
        username: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...review,
        user,
      },
    });
  } catch (error) {
    logger.error('Add restaurant review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add review',
    });
  }
};

// Update restaurant review
export const updateRestaurantReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    // Check if review exists and belongs to user
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.id, reviewId),
        eq(reviews.userId, userId)
      ),
      with: {
        restaurant: true,
      },
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you do not have permission to update it',
      });
    }

    // Update review
    const [updatedReview] = await db
      .update(reviews)
      .set({
        rating: rating !== undefined ? Number(rating) : existingReview.rating,
        comment: comment || existingReview.comment,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    // Update restaurant rating if rating was changed
    if (rating !== undefined) {
      const ratingData = await db
        .select({
          avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(reviews)
        .where(eq(reviews.restaurantId, existingReview.restaurantId))
        .then((res) => ({
          avg: parseFloat(res[0]?.avg) || 0,
          count: parseInt(res[0]?.count) || 0,
        }));

      await db
        .update(restaurants)
        .set({
          rating: ratingData.avg,
          ratingCount: ratingData.count,
          updatedAt: new Date(),
        })
        .where(eq(restaurants.id, existingReview.restaurantId));
    }

    res.status(200).json({
      success: true,
      data: {
        ...updatedReview,
        user: await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        }),
      },
    });
  } catch (error) {
    logger.error('Update restaurant review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review',
    });
  }
};

// Delete restaurant review
export const deleteRestaurantReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user or is admin
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.id, reviewId),
        or(
          eq(reviews.userId, userId),
          sql`${req.user.role} = 'admin'`
        )
      ),
    });

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you do not have permission to delete it',
      });
    }

    // Delete review
    await db.delete(reviews).where(eq(reviews.id, reviewId));

    // Update restaurant rating
    const ratingData = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.restaurantId, existingReview.restaurantId))
      .then((res) => ({
        avg: parseFloat(res[0]?.avg) || 0,
        count: parseInt(res[0]?.count) || 0,
      }));

    await db
      .update(restaurants)
      .set({
        rating: ratingData.avg,
        ratingCount: ratingData.count,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, existingReview.restaurantId));

    res.status(200).json({
      success: true,
      data: { id: reviewId },
    });
  } catch (error) {
    logger.error('Delete restaurant review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review',
    });
  }
};
