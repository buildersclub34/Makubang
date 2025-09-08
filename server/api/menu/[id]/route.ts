import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Restaurant access required' }, { status: 403 });
    }

    const db = getDB();
    const data = await request.json();
    const { id } = params;

    const result = await db.collection('menu_items').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...data, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const updated = await db.collection('menu_items').findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Restaurant access required' }, { status: 403 });
    }

    const db = getDB();
    const { id } = params;

    const result = await db.collection('menu_items').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
