import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDB();
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });
    }

    const menuItems = await db.collection('menu_items')
      .find({ restaurantId: new ObjectId(restaurantId) })
      .sort({ category: 1, name: 1 })
      .toArray();

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Restaurant access required' }, { status: 403 });
    }

    const db = getDB();
    const data = await request.json();
    
    const menuItem = {
      ...data,
      _id: new ObjectId(),
      restaurantId: new ObjectId(data.restaurantId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('menu_items').insertOne(menuItem);
    return NextResponse.json(menuItem, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
