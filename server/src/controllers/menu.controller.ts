import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db';
import { menuItems, categories, menuItemVariants, menuItemAddons, addons } from '../../../shared/schema';
import { and, eq, desc, sql, inArray, isNull } from 'drizzle-orm';
import { AuthenticatedRequest } from '../types/express';
import { uploadToCloudinary } from '../services/cloudinary.service';
import logger from '../utils/logger';

// Helper function to format menu item response
const formatMenuItemResponse = (item: any) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: item.price,
  image: item.image,
  isVeg: item.isVeg,
  isBestseller: item.isBestseller,
  isAvailable: item.isAvailable,
  category: item.category,
  variants: item.variants || [],
  addons: item.addons || [],
  restaurantId: item.restaurantId,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

// Create a new menu item
export const createMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const {
      name,
      description,
      price,
      isVeg = false,
      isBestseller = false,
      isAvailable = true,
      categoryId,
      variants = [],
      addonIds = [],
    } = req.body;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to add menu items',
      });
    }

    // Check if category exists
    if (categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, categoryId),
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Category not found',
        });
      }
    }

    // Upload image if provided
    let imageUrl = null;
    if (req.files?.image) {
      const imageFile = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
      const uploadResult = await uploadToCloudinary(imageFile.path, 'menu-items');
      imageUrl = uploadResult.secure_url;
    }

    // Start transaction
    const [menuItem] = await db.transaction(async (tx) => {
      // Create menu item
      const [newItem] = await tx.insert(menuItems).values({
        id: uuidv4(),
        name,
        description: description || null,
        price: parseFloat(price) || 0,
        image: imageUrl,
        isVeg,
        isBestseller,
        isAvailable,
        categoryId: categoryId || null,
        restaurantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Add variants if provided
      if (Array.isArray(variants) && variants.length > 0) {
        const variantValues = variants.map((variant: any) => ({
          id: uuidv4(),
          name: variant.name,
          price: parseFloat(variant.price) || 0,
          menuItemId: newItem.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await tx.insert(menuItemVariants).values(variantValues);
      }

      // Add addons if provided
      if (Array.isArray(addonIds) && addonIds.length > 0) {
        const validAddonIds = await tx.query.addons
          .findMany({
            where: and(
              inArray(addons.id, addonIds),
              or(
                eq(addons.restaurantId, restaurantId),
                isNull(addons.restaurantId) // Global addons
              )
            ),
            columns: {
              id: true,
            },
          })
          .then((addons) => addons.map((a) => a.id));

        if (validAddonIds.length > 0) {
          const menuItemAddonValues = validAddonIds.map((addonId) => ({
            id: uuidv4(),
            menuItemId: newItem.id,
            addonId,
            createdAt: new Date(),
          }));

          await tx.insert(menuItemAddons).values(menuItemAddonValues);
        }
      }

      return newItem;
    });

    // Get the full menu item with relations
    const fullMenuItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, menuItem.id),
      with: {
        category: true,
        variants: true,
        addons: {
          with: {
            addon: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: formatMenuItemResponse({
        ...fullMenuItem,
        addons: fullMenuItem.addons?.map((a: any) => a.addon) || [],
      }),
    });
  } catch (error) {
    logger.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu item',
    });
  }
};

// Get menu item by ID
export const getMenuItemById = async (req: Request, res: Response) => {
  try {
    const { id, restaurantId } = req.params;

    const menuItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, id),
        eq(menuItems.restaurantId, restaurantId)
      ),
      with: {
        category: true,
        variants: true,
        addons: {
          with: {
            addon: true,
          },
        },
      },
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: formatMenuItemResponse({
        ...menuItem,
        addons: menuItem.addons?.map((a: any) => a.addon) || [],
      }),
    });
  } catch (error) {
    logger.error('Get menu item by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item',
    });
  }
};

// Update menu item
export const updateMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, restaurantId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to update menu items',
      });
    }

    // Check if menu item exists
    const existingItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, id),
        eq(menuItems.restaurantId, restaurantId)
      ),
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    // Check if category exists if being updated
    if (updateData.categoryId) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, updateData.categoryId),
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Category not found',
        });
      }
    }

    // Handle image upload if provided
    let imageUrl = existingItem.image;
    if (req.files?.image) {
      const imageFile = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
      const uploadResult = await uploadToCloudinary(imageFile.path, 'menu-items');
      imageUrl = uploadResult.secure_url;
    }

    // Prepare update data
    const updateValues: any = {
      name: updateData.name || existingItem.name,
      description: updateData.description !== undefined ? updateData.description : existingItem.description,
      price: updateData.price !== undefined ? parseFloat(updateData.price) : existingItem.price,
      image: imageUrl,
      isVeg: updateData.isVeg !== undefined ? updateData.isVeg : existingItem.isVeg,
      isBestseller: updateData.isBestseller !== undefined ? updateData.isBestseller : existingItem.isBestseller,
      isAvailable: updateData.isAvailable !== undefined ? updateData.isAvailable : existingItem.isAvailable,
      categoryId: updateData.categoryId || existingItem.categoryId,
      updatedAt: new Date(),
    };

    // Start transaction
    await db.transaction(async (tx) => {
      // Update menu item
      await tx
        .update(menuItems)
        .set(updateValues)
        .where(eq(menuItems.id, id));

      // Handle variants if provided
      if (updateData.variants) {
        // Delete existing variants
        await tx
          .delete(menuItemVariants)
          .where(eq(menuItemVariants.menuItemId, id));

        // Add new variants if any
        if (Array.isArray(updateData.variants) && updateData.variants.length > 0) {
          const variantValues = updateData.variants.map((variant: any) => ({
            id: variant.id || uuidv4(),
            name: variant.name,
            price: parseFloat(variant.price) || 0,
            menuItemId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          await tx.insert(menuItemVariants).values(variantValues);
        }
      }

      // Handle addons if provided
      if (updateData.addonIds) {
        // Delete existing addon associations
        await tx
          .delete(menuItemAddons)
          .where(eq(menuItemAddons.menuItemId, id));

        // Add new addon associations if any
        const addonIds = Array.isArray(updateData.addonIds) 
          ? updateData.addonIds 
          : [updateData.addonIds];

        if (addonIds.length > 0) {
          const validAddonIds = await tx.query.addons
            .findMany({
              where: and(
                inArray(addons.id, addonIds),
                or(
                  eq(addons.restaurantId, restaurantId),
                  isNull(addons.restaurantId) // Global addons
                )
              ),
              columns: {
                id: true,
              },
            })
            .then((addons) => addons.map((a) => a.id));

          if (validAddonIds.length > 0) {
            const menuItemAddonValues = validAddonIds.map((addonId) => ({
              id: uuidv4(),
              menuItemId: id,
              addonId,
              createdAt: new Date(),
            }));

            await tx.insert(menuItemAddons).values(menuItemAddonValues);
          }
        }
      }
    });

    // Get the updated menu item with relations
    const updatedItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, id),
      with: {
        category: true,
        variants: true,
        addons: {
          with: {
            addon: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: formatMenuItemResponse({
        ...updatedItem,
        addons: updatedItem.addons?.map((a: any) => a.addon) || [],
      }),
    });
  } catch (error) {
    logger.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu item',
    });
  }
};

// Delete menu item
export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, restaurantId } = req.params;
    const userId = req.user.id;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to delete menu items',
      });
    }

    // Check if menu item exists
    const existingItem = await db.query.menuItems.findFirst({
      where: and(
        eq(menuItems.id, id),
        eq(menuItems.restaurantId, restaurantId)
      ),
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    // Soft delete (mark as not available)
    await db
      .update(menuItems)
      .set({
        isAvailable: false,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id));

    // TODO: Optionally delete image from cloud storage

    res.status(200).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    logger.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu item',
    });
  }
};

// Get all menu items for a restaurant
export const getRestaurantMenu = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      categoryId, 
      search, 
      isVeg,
      isBestseller,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [
      eq(menuItems.restaurantId, restaurantId),
      eq(menuItems.isAvailable, true),
    ];

    if (categoryId) {
      conditions.push(eq(menuItems.categoryId, categoryId as string));
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(sql`${menuItems.name} ILIKE ${searchTerm}`);
    }

    if (isVeg === 'true') {
      conditions.push(eq(menuItems.isVeg, true));
    }

    if (isBestseller === 'true') {
      conditions.push(eq(menuItems.isBestseller, true));
    }

    // Build order by
    let orderBy: any[] = [];
    
    switch (sortBy) {
      case 'price':
        orderBy = [
          { column: menuItems.price, order: sortOrder === 'asc' ? 'asc' : 'desc' },
          { column: menuItems.name, order: 'asc' },
        ];
        break;
      case 'name':
      default:
        orderBy = [
          { column: menuItems.name, order: sortOrder === 'asc' ? 'asc' : 'desc' },
        ];
        break;
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(menuItems)
      .where(and(...conditions))
      .then((res) => parseInt(res[0]?.count) || 0);

    // Get paginated menu items
    const menuItemsList = await db.query.menuItems.findMany({
      where: and(...conditions),
      orderBy,
      limit: Number(limit),
      offset,
      with: {
        category: true,
        variants: true,
        addons: {
          with: {
            addon: true,
          },
        },
      },
    });

    // Format response
    const formattedMenuItems = menuItemsList.map((item) => 
      formatMenuItemResponse({
        ...item,
        addons: item.addons?.map((a: any) => a.addon) || [],
      })
    );

    // If no category filter, group by category for better frontend display
    let categoriesWithItems: any[] = [];
    if (!categoryId) {
      const categoriesMap = new Map();
      
      // Get all categories for this restaurant
      const categories = await db.query.categories.findMany({
        where: or(
          eq(categories.restaurantId, restaurantId),
          isNull(categories.restaurantId) // Global categories
        ),
        orderBy: [categories.name],
      });

      // Initialize categories map
      categories.forEach((cat) => {
        categoriesMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          image: cat.image,
          items: [],
        });
      });

      // Add uncategorized items
      categoriesMap.set('uncategorized', {
        id: 'uncategorized',
        name: 'Uncategorized',
        description: 'Items without a specific category',
        items: [],
      });

      // Group items by category
      formattedMenuItems.forEach((item) => {
        const categoryId = item.category?.id || 'uncategorized';
        const category = categoriesMap.get(categoryId);
        if (category) {
          category.items.push(item);
        }
      });

      // Filter out empty categories and convert to array
      categoriesWithItems = Array.from(categoriesMap.values())
        .filter((cat: any) => cat.items.length > 0);
    }

    res.status(200).json({
      success: true,
      data: categoryId ? formattedMenuItems : categoriesWithItems,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get restaurant menu error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant menu',
    });
  }
};

// Create addon
export const createAddon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const {
      name,
      description,
      price,
      isVeg = false,
      isAvailable = true,
      minSelection = 0,
      maxSelection = 1,
    } = req.body;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to add addons',
      });
    }

    // Upload image if provided
    let imageUrl = null;
    if (req.files?.image) {
      const imageFile = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
      const uploadResult = await uploadToCloudinary(imageFile.path, 'addons');
      imageUrl = uploadResult.secure_url;
    }

    // Create addon
    const [addon] = await db.insert(addons).values({
      id: uuidv4(),
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      image: imageUrl,
      isVeg,
      isAvailable,
      minSelection: parseInt(minSelection) || 0,
      maxSelection: parseInt(maxSelection) || 1,
      restaurantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json({
      success: true,
      data: addon,
    });
  } catch (error) {
    logger.error('Create addon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create addon',
    });
  }
};

// Get addons for a restaurant
export const getRestaurantAddons = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 50, isAvailable = true } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where conditions
    const conditions = [
      or(
        eq(addons.restaurantId, restaurantId),
        isNull(addons.restaurantId) // Global addons
      ),
    ];

    if (isAvailable === 'true') {
      conditions.push(eq(addons.isAvailable, true));
    }

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(addons)
      .where(and(...conditions))
      .then((res) => parseInt(res[0]?.count) || 0);

    // Get paginated addons
    const addonsList = await db.query.addons.findMany({
      where: and(...conditions),
      orderBy: [addons.name],
      limit: Number(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      data: addonsList,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    logger.error('Get restaurant addons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch addons',
    });
  }
};

// Update addon
export const updateAddon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, restaurantId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to update addons',
      });
    }

    // Check if addon exists and belongs to this restaurant (or is global)
    const existingAddon = await db.query.addons.findFirst({
      where: and(
        eq(addons.id, id),
        or(
          eq(addons.restaurantId, restaurantId),
          isNull(addons.restaurantId)
        )
      ),
    });

    if (!existingAddon) {
      return res.status(404).json({
        success: false,
        error: 'Addon not found',
      });
    }

    // Global addons can only be updated by admin
    if (!existingAddon.restaurantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update global addons',
      });
    }

    // Handle image upload if provided
    let imageUrl = existingAddon.image;
    if (req.files?.image) {
      const imageFile = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
      const uploadResult = await uploadToCloudinary(imageFile.path, 'addons');
      imageUrl = uploadResult.secure_url;
    }

    // Prepare update data
    const updateValues: any = {
      name: updateData.name || existingAddon.name,
      description: updateData.description !== undefined ? updateData.description : existingAddon.description,
      price: updateData.price !== undefined ? parseFloat(updateData.price) : existingAddon.price,
      image: imageUrl,
      isVeg: updateData.isVeg !== undefined ? updateData.isVeg : existingAddon.isVeg,
      isAvailable: updateData.isAvailable !== undefined ? updateData.isAvailable : existingAddon.isAvailable,
      minSelection: updateData.minSelection !== undefined ? parseInt(updateData.minSelection) : existingAddon.minSelection,
      maxSelection: updateData.maxSelection !== undefined ? parseInt(updateData.maxSelection) : existingAddon.maxSelection,
      updatedAt: new Date(),
    };

    // Update addon
    const [updatedAddon] = await db
      .update(addons)
      .set(updateValues)
      .where(eq(addons.id, id))
      .returning();

    res.status(200).json({
      success: true,
      data: updatedAddon,
    });
  } catch (error) {
    logger.error('Update addon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update addon',
    });
  }
};

// Delete addon
export const deleteAddon = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, restaurantId } = req.params;
    const userId = req.user.id;

    // Check if restaurant exists and user is the owner
    const restaurant = await db.query.restaurants.findFirst({
      where: and(
        eq(restaurants.id, restaurantId),
        eq(restaurants.ownerId, userId)
      ),
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found or you do not have permission to delete addons',
      });
    }

    // Check if addon exists and belongs to this restaurant (or is global)
    const existingAddon = await db.query.addons.findFirst({
      where: and(
        eq(addons.id, id),
        or(
          eq(addons.restaurantId, restaurantId),
          isNull(addons.restaurantId)
        )
      ),
    });

    if (!existingAddon) {
      return res.status(404).json({
        success: false,
        error: 'Addon not found',
      });
    }

    // Global addons can only be deleted by admin
    if (!existingAddon.restaurantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete global addons',
      });
    }

    // Check if addon is being used in any menu items
    const menuItemAddon = await db.query.menuItemAddons.findFirst({
      where: eq(menuItemAddons.addonId, id),
    });

    if (menuItemAddon) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete addon as it is being used in menu items. Please remove it from all menu items first.',
      });
    }

    // Delete addon
    await db.delete(addons).where(eq(addons.id, id));

    // TODO: Optionally delete image from cloud storage

    res.status(200).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    logger.error('Delete addon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete addon',
    });
  }
};
